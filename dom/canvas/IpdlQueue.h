/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * vim: sw=2 ts=4 et :
 */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef IPDLQUEUE_H_
#define IPDLQUEUE_H_ 1

#include <atomic>
#include <tuple>
#include <vector>
#include <unordered_map>
#include "ipc/IPCMessageUtilsSpecializations.h"
#include "mozilla/dom/QueueParamTraits.h"
#include "mozilla/ipc/SharedMemoryBasic.h"
#include "mozilla/Assertions.h"
#include "mozilla/ipc/Shmem.h"
#include "mozilla/ipc/ProtocolUtils.h"
#include "mozilla/Logging.h"
#include "mozilla/ScopeExit.h"
#include "mozilla/TimeStamp.h"
#include "mozilla/TypeTraits.h"
#include "nsString.h"
#include "mozilla/WeakPtr.h"

namespace IPC {
template <typename T>
struct ParamTraits;
}  // namespace IPC

namespace mozilla {
namespace dom {

using mozilla::webgl::QueueStatus;

extern LazyLogModule gIpdlQueueLog;
#define IPDLQUEUE_LOG_(lvl, ...) \
  MOZ_LOG(mozilla::dom::gIpdlQueueLog, lvl, (__VA_ARGS__))
#define IPDLQUEUE_LOGD(...) IPDLQUEUE_LOG_(LogLevel::Debug, __VA_ARGS__)
#define IPDLQUEUE_LOGE(...) IPDLQUEUE_LOG_(LogLevel::Error, __VA_ARGS__)

template <typename ActorP, typename ActorC>
class IpdlQueue;
template <typename Derived>
class SyncConsumerActor;

enum IpdlQueueProtocol {
  /**
   * Sends the message immediately.  Does not wait for a response.
   */
  kAsync,
  /**
   * Sends the message immediately or caches it for a later batch
   * send.  Messages may be sent at any point in the future but
   * will always be processed in order.  kSync messages always force
   * a flush of the cache but other mechanisms (e.g. periodic tasks)
   * can do this as well.
   */
  kBufferedAsync,
  /**
   * Sends the message immediately.  Waits for any response message,
   * which can immediately be read upon completion of the send.
   */
  kSync
};

constexpr uint64_t kIllegalQueueId = 0;
inline uint64_t NewIpdlQueueId() {
  static std::atomic<uint64_t> sNextIpdlQueueId = 1;
  return sNextIpdlQueueId++;
}

struct IpdlQueueBuffer {
  uint64_t id = kIllegalQueueId;
  nsTArray<uint8_t> data;

  IpdlQueueBuffer() = default;
  IpdlQueueBuffer(const IpdlQueueBuffer&) = delete;
  IpdlQueueBuffer(IpdlQueueBuffer&&) = default;
  IpdlQueueBuffer(uint64_t aId, nsTArray<uint8_t>&& aData)
      : id(aId), data(std::move(aData)) {}
};

using IpdlQueueBuffers = nsTArray<IpdlQueueBuffer>;

static constexpr uint32_t kAsyncFlushWaitMs = 4;  // 4ms

template <typename Derived>
class AsyncProducerActor {
 public:
  virtual bool TransmitIpdlQueueData(IpdlQueueProtocol aProtocol,
                                     IpdlQueueBuffer&& aData) {
    MOZ_ASSERT((aProtocol == IpdlQueueProtocol::kAsync) ||
               (aProtocol == IpdlQueueProtocol::kBufferedAsync));

    if (mResponseBuffers || (aProtocol == IpdlQueueProtocol::kBufferedAsync)) {
      // Always use response buffer if set.
      auto& buffers = mResponseBuffers ? *mResponseBuffers : mAsyncBuffers;

      // We are in the middle of a sync transaction.  Store the data so
      // that we can return it with the response.
      const uint64_t id = aData.id;
      for (auto& elt : buffers) {
        if (elt.id == id) {
          elt.data.AppendElements(aData.data);
          return true;
        }
      }
      buffers.AppendElement(std::move(aData));

      if (!mResponseBuffers) {
        PostFlushAsyncCache(kAsyncFlushWaitMs);
      }
      return true;
    }

    // We are not inside of a transaction.  Send normally, but first send any
    // cached messages.
    FlushAsyncCache();

    Derived* self = static_cast<Derived*>(this);
    return self->SendTransmitIpdlQueueData(std::move(aData));
  }

  // This can be called at any time to flush all queued async messages.
  bool FlushAsyncCache() {
    Derived* self = static_cast<Derived*>(this);
    for (auto& elt : mAsyncBuffers) {
      if (!elt.data.IsEmpty()) {
        if (!self->SendTransmitIpdlQueueData(std::move(elt))) {
          return false;
        }
      }
    }
    mAsyncBuffers.Clear();
    return true;
  }

  bool PostFlushAsyncCache(uint32_t aEstWaitTimeMs) {
    if (mPostedFlushRunnable) {
      // Already scheduled a flush for later.
      return true;
    }

    MOZ_ASSERT(GetCurrentSerialEventTarget(),
               "No message loop for IpdlQueue flush task");

    Derived* self = static_cast<Derived*>(this);
    // IpdlProducer/IpdlConsumer guarantees the actor supports WeakPtr.
    auto weak = WeakPtr<Derived>(self);
    already_AddRefed<mozilla::Runnable> flushRunnable =
        NS_NewRunnableFunction("FlushAsyncCache", [weak] {
          auto strong = RefPtr<Derived>(weak);
          if (!strong) {
            return;
          }
          strong->FlushAsyncCache();
          strong->ClearFlushRunnable();
        });

    NS_ENSURE_SUCCESS(GetCurrentSerialEventTarget()->DelayedDispatch(
                          std::move(flushRunnable), aEstWaitTimeMs),
                      false);
    mPostedFlushRunnable = true;
    return true;
  }

  void ClearFlushRunnable() { mPostedFlushRunnable = false; }

  template <typename... Args>
  IpdlQueueProtocol GetIpdlQueueProtocol(const Args&...) {
    return IpdlQueueProtocol::kAsync;
  }

 protected:
  friend SyncConsumerActor<Derived>;

  void SetResponseBuffers(IpdlQueueBuffers* aResponse) {
    MOZ_ASSERT(!mResponseBuffers);
    mResponseBuffers = aResponse;

    // Response should include any cached async transmissions.
    *mResponseBuffers = std::move(mAsyncBuffers);
  }

  void ClearResponseBuffers() {
    MOZ_ASSERT(mResponseBuffers);
    mResponseBuffers = nullptr;
  }

  // Stores response when inside of a kSync transaction.
  IpdlQueueBuffers* mResponseBuffers = nullptr;
  // For kBufferedAsync transmissions that occur outside of a response to a
  // kSync message.
  IpdlQueueBuffers mAsyncBuffers;

  bool mPostedFlushRunnable = false;
};

template <typename Derived>
class SyncProducerActor : public AsyncProducerActor<Derived> {
 public:
  bool TransmitIpdlQueueData(IpdlQueueProtocol aProtocol,
                             IpdlQueueBuffer&& aData) override {
    Derived* self = static_cast<Derived*>(this);
    if (mResponseBuffers || (aProtocol != IpdlQueueProtocol::kSync)) {
      return AsyncProducerActor<Derived>::TransmitIpdlQueueData(
          aProtocol, std::forward<IpdlQueueBuffer>(aData));
    }

    IpdlQueueBuffers responses;
    if (!self->SendExchangeIpdlQueueData(std::forward<IpdlQueueBuffer>(aData),
                                         &responses)) {
      return false;
    }

    for (auto& buf : responses) {
      if (!self->StoreIpdlQueueData(std::move(buf))) {
        return false;
      }
    }
    return true;
  }

 protected:
  using AsyncProducerActor<Derived>::mResponseBuffers;
};

template <typename Derived>
class AsyncConsumerActor {
 public:
  // Returns the ipdlQueue contents that were Recv'ed in a prior IPDL
  // transmission.  No new data is received via IPDL during this operation.
  nsTArray<uint8_t> TakeIpdlQueueData(uint64_t aId) {
    auto it = mIpdlQueueBuffers.find(aId);
    if (it != mIpdlQueueBuffers.end()) {
      return std::move(it->second.data);
    }
    return nsTArray<uint8_t>();
  }

 protected:
  friend SyncProducerActor<Derived>;

  // Store data received from the producer, to be read by local IpdlConsumers.
  bool StoreIpdlQueueData(IpdlQueueBuffer&& aBuffer) {
    auto it = mIpdlQueueBuffers.find(aBuffer.id);
    if (it == mIpdlQueueBuffers.end()) {
      return mIpdlQueueBuffers.insert({aBuffer.id, std::move(aBuffer)}).second;
    }
    return it->second.data.AppendElements(aBuffer.data, fallible);
  }

  mozilla::ipc::IPCResult RecvTransmitIpdlQueueData(IpdlQueueBuffer&& aBuffer) {
    if (StoreIpdlQueueData(std::forward<IpdlQueueBuffer>(aBuffer))) {
      return IPC_OK();
    }
    return IPC_FAIL_NO_REASON(static_cast<Derived*>(this));
  }

  std::unordered_map<uint64_t, IpdlQueueBuffer> mIpdlQueueBuffers;
};

template <typename Derived>
class SyncConsumerActor : public AsyncConsumerActor<Derived> {
 protected:
  using AsyncConsumerActor<Derived>::StoreIpdlQueueData;

  mozilla::ipc::IPCResult RecvExchangeIpdlQueueData(
      IpdlQueueBuffer&& aBuffer, IpdlQueueBuffers* aResponse) {
    uint64_t id = aBuffer.id;
    if (!StoreIpdlQueueData(std::forward<IpdlQueueBuffer>(aBuffer))) {
      return IPC_FAIL_NO_REASON(static_cast<Derived*>(this));
    }

    // Mark the actor as in a sync operation, then calls handler.
    // During handler, if actor is used as producer (for ALL queues)
    // then instead of immediately sending, it writes the data into
    // aResponse.  When handler is done, we unmark the actor.
    // Note that we must buffer for _all_ queues associated with the
    // actor as the intended response queue is indistinguishable from
    //  the rest from our vantage point.
    Derived* actor = static_cast<Derived*>(this);
    actor->SetResponseBuffers(aResponse);
    auto clearResponseBuffer =
        MakeScopeExit([&] { actor->ClearResponseBuffers(); });

#if defined(DEBUG)
    // Response now includes any cached async transmissions.  It is
    // illegal to have a response queue also used for other purposes
    // so the cache for that queue must be empty.
    DebugOnly<bool> responseBufferIsEmpty = [&] {
      for (auto& elt : *aResponse) {
        if (elt.id == id) {
          return elt.data.IsEmpty();
        }
      }
      return true;
    }();
    MOZ_ASSERT(responseBufferIsEmpty);
#endif

    return actor->RunQueue(id) ? IPC_OK() : IPC_FAIL_NO_REASON(actor);
  }
};

template <typename _Actor>
class IpdlProducer final : public SupportsWeakPtr {
  nsTArray<uint8_t> mSerializedData;
  WeakPtr<_Actor> mActor;
  uint64_t mId;

 public:
  using Actor = _Actor;
  using SelfType = IpdlProducer<Actor>;

  // For IPDL:
  IpdlProducer() : mId(kIllegalQueueId) {}

  /**
   * Insert aArgs into the queue.  If the operation does not succeed then
   * the queue is unchanged.
   */
  template <typename... Args>
  QueueStatus TryInsert(Args&&... aArgs) {
    MOZ_ASSERT(mId != kIllegalQueueId);
    if (!mActor) {
      NS_WARNING("TryInsert with actor that was already freed.");
      return QueueStatus::kFatalError;
    }

    // Fill mSerializedData with the data to send.  Clear it when done.
    MOZ_ASSERT(mSerializedData.IsEmpty());
    auto self = *this;
    auto clearData = MakeScopeExit([&] { self.mSerializedData.Clear(); });
    const IpdlQueueProtocol protocol = mActor->GetIpdlQueueProtocol(aArgs...);
    QueueStatus status = SerializeAllArgs(std::forward<Args>(aArgs)...);
    if (status != QueueStatus::kSuccess) {
      return status;
    }
    return mActor->TransmitIpdlQueueData(
               protocol, IpdlQueueBuffer(mId, std::move(mSerializedData)))
               ? QueueStatus::kSuccess
               : QueueStatus::kFatalError;
  }

  /**
   * Same as TryInsert.  IPDL send failures are considered fatal to the
   * IpdlQueue.
   */
  template <typename... Args>
  QueueStatus TryWaitInsert(const Maybe<TimeDuration>&, Args&&... aArgs) {
    return TryInsert(std::forward<Args>(aArgs)...);
  }

  QueueStatus AllocShmem(mozilla::ipc::Shmem* aShmem, size_t aBufferSize,
                         const void* aBuffer = nullptr) {
    if (!mActor) {
      return QueueStatus::kFatalError;
    }

    if (!mActor->AllocShmem(
            aBufferSize,
            mozilla::ipc::SharedMemory::SharedMemoryType::TYPE_BASIC, aShmem)) {
      return QueueStatus::kOOMError;
    }

    if (aBuffer) {
      memcpy(aShmem->get<uint8_t>(), aBuffer, aBufferSize);
    }
    return QueueStatus::kSuccess;
  }

 protected:
  template <typename T1, typename T2>
  friend class IpdlQueue;
  friend struct mozilla::ipc::IPDLParamTraits<SelfType>;

  explicit IpdlProducer(uint64_t aId, Actor* aActor = nullptr)
      : mActor(aActor), mId(aId) {}

  template <typename... Args>
  QueueStatus SerializeAllArgs(Args&&... aArgs) {
    size_t read = 0;
    size_t write = 0;
    mozilla::webgl::ProducerView<SelfType> view(this, read, &write);
    size_t bytesNeeded = MinSizeofArgs(view, aArgs...);
    if (!mSerializedData.SetLength(bytesNeeded, fallible)) {
      return QueueStatus::kOOMError;
    }

    return SerializeArgs(view, aArgs...);
  }

  QueueStatus SerializeArgs(mozilla::webgl::ProducerView<SelfType>& aView) {
    return QueueStatus::kSuccess;
  }

  template <typename Arg, typename... Args>
  QueueStatus SerializeArgs(mozilla::webgl::ProducerView<SelfType>& aView,
                            const Arg& aArg, const Args&... aArgs) {
    QueueStatus status = SerializeArg(aView, aArg);
    if (!IsSuccess(status)) {
      return status;
    }
    return SerializeArgs(aView, aArgs...);
  }

  template <typename Arg>
  QueueStatus SerializeArg(mozilla::webgl::ProducerView<SelfType>& aView,
                           const Arg& aArg) {
    return mozilla::webgl::QueueParamTraits<
        typename std::remove_volatile<Arg>::type>::Write(aView, aArg);
  }

 public:
  template <typename Arg>
  QueueStatus WriteObject(size_t aRead, size_t* aWrite, const Arg& arg,
                          size_t aArgSize) {
    if (mSerializedData.Length() < (*aWrite) + aArgSize) {
      // Previous MinSizeOfArgs estimate was insufficient.  Resize the
      // buffer to accomodate our real needs.
      mSerializedData.SetLength(*aWrite + aArgSize);
    }
    return mozilla::webgl::Marshaller::WriteObject(
        mSerializedData.Elements(), mSerializedData.Length() + 1, aRead, aWrite,
        arg, aArgSize);
  }

  base::ProcessId OtherPid() { return mActor ? mActor->OtherPid() : 0; }

 protected:
  size_t MinSizeofArgs(mozilla::webgl::ProducerView<SelfType>& aView) {
    return 0;
  }

  template <typename Arg, typename... Args>
  size_t MinSizeofArgs(mozilla::webgl::ProducerView<SelfType>& aView,
                       const Arg& aArg, const Args&... aArgs) {
    return aView.MinSizeParam(aArg) + MinSizeofArgs(aView, aArgs...);
  }
};

template <typename _Actor>
class IpdlConsumer final : public SupportsWeakPtr {
 public:
  using Actor = _Actor;
  using SelfType = IpdlConsumer<Actor>;

  // For IPDL
  IpdlConsumer() : mId(kIllegalQueueId) {}

  /**
   * Attempts to copy and remove aArgs from the queue.  If the operation does
   * not succeed then the queue is unchanged.  If the operation returns
   * kQueueNotReady then the consumer does not yet have enough data to satisfy
   * the request.  In this case, the IPDL MessageQueue should be given the
   * opportunity to run, at which point TryRemove can be attempted again.
   */
  template <typename... Args>
  QueueStatus TryRemove(Args&... aArgs) {
    MOZ_ASSERT(mId != kIllegalQueueId);
    if (!mActor) {
      NS_WARNING("TryRemove with actor that was already freed.");
      return QueueStatus::kFatalError;
    }
    mBuf.AppendElements(mActor->TakeIpdlQueueData(mId));
    return DeserializeAllArgs(aArgs...);
  }

  /**
   * Equivalent to TryRemove.  Duration is ignored as it would need to
   * allow the IPDL queue to run to be useful.
   */
  template <typename... Args>
  QueueStatus TryWaitRemove(const Maybe<TimeDuration>&, Args&... aArgs) {
    return TryRemove(aArgs...);
  }

  mozilla::ipc::Shmem::SharedMemory* LookupSharedMemory(uint32_t aId) {
    return mActor ? mActor->LookupSharedMemory(aId) : nullptr;
  }

 protected:
  template <typename T1, typename T2>
  friend class IpdlQueue;
  friend struct mozilla::ipc::IPDLParamTraits<SelfType>;

  explicit IpdlConsumer(uint64_t aId, Actor* aActor = nullptr)
      : mActor(aActor), mId(aId) {}

  template <typename... Args>
  QueueStatus DeserializeAllArgs(Args&... aArgs) {
    size_t read = 0;
    size_t write = mBuf.Length();
    mozilla::webgl::ConsumerView<SelfType> view(this, &read, write);

    QueueStatus status = DeserializeArgs(view, aArgs...);
    if (IsSuccess(status) && (read > 0)) {
      mBuf.RemoveElementsAt(0, read);
    }
    return status;
  }

  QueueStatus DeserializeArgs(mozilla::webgl::ConsumerView<SelfType>& aView) {
    return QueueStatus::kSuccess;
  }

  template <typename Arg, typename... Args>
  QueueStatus DeserializeArgs(mozilla::webgl::ConsumerView<SelfType>& aView,
                              Arg& aArg, Args&... aArgs) {
    QueueStatus status = DeserializeArg(aView, aArg);
    if (!IsSuccess(status)) {
      return status;
    }
    return DeserializeArgs(aView, aArgs...);
  }

  template <typename Arg>
  QueueStatus DeserializeArg(mozilla::webgl::ConsumerView<SelfType>& aView,
                             Arg& aArg) {
    return mozilla::webgl::
        QueueParamTraits<typename mozilla::webgl::RemoveCVR<Arg>::Type>::Read(
            aView, const_cast<std::remove_cv_t<Arg>*>(&aArg));
  }

 public:
  template <typename Arg>
  QueueStatus ReadObject(size_t* aRead, size_t aWrite, Arg* arg,
                         size_t aArgSize) {
    // TODO: Queue needs one extra byte for PCQ (fixme).
    return mozilla::webgl::Marshaller::ReadObject(
        mBuf.Elements(), mBuf.Length() + 1, aRead, aWrite, arg, aArgSize);
  }

  base::ProcessId OtherPid() { return mActor ? mActor->OtherPid() : 0; }

 protected:
  WeakPtr<Actor> mActor;
  uint64_t mId;
  nsTArray<uint8_t> mBuf;
};

/**
 * An IpdlQueue is a queue that uses an actor of type ActorP to send data and
 * its reciprocal (i.e. child to its parent or vice-versa) to receive data.
 * ActorP must derive from one of:
 *   AsyncProducerActor, SyncProducerActor
 * ActorC must derive from one of:
 *   AsyncConsumerActor, SyncConsumerActor
 */
template <typename _ActorP, typename _ActorC>
class IpdlQueue final {
 public:
  using ActorP = _ActorP;
  using ActorC = _ActorC;
  using Producer = IpdlProducer<ActorP>;
  using Consumer = IpdlConsumer<ActorC>;

  UniquePtr<Producer> TakeProducer() { return std::move(mProducer); }
  UniquePtr<Consumer> TakeConsumer() { return std::move(mConsumer); }

  /**
   * Create an IpdlQueue where the given actor is a producer and its
   * reciprocal is the consumer.
   * The reciprocal actor type must be typedefed in ActorC as OtherSideActor.
   * For example, WebGLChild::OtherSideActor is WebGLParent.
   */
  static UniquePtr<IpdlQueue<ActorP, ActorC>> Create(ActorP* aProducerActor) {
    static_assert(std::is_same<typename ActorP::OtherSideActor, ActorC>::value,
                  "ActorP's reciprocal must be ActorC");
    static_assert(std::is_same<typename ActorC::OtherSideActor, ActorP>::value,
                  "ActorC's reciprocal must be ActorP");

    auto id = NewIpdlQueueId();
    return WrapUnique(new IpdlQueue<ActorP, ActorC>(
        std::move(WrapUnique(new Producer(id, aProducerActor))),
        std::move(WrapUnique(new Consumer(id)))));
  }

  /**
   * Create an IpdlQueue where the given actor is a consumer and its
   * reciprocal is the producer.
   * The reciprocal actor type must be typedefed in ActorC as OtherSideActor.
   * For example, WebGLChild::OtherSideActor is WebGLParent.
   */
  static UniquePtr<IpdlQueue<ActorP, ActorC>> Create(ActorC* aConsumerActor) {
    static_assert(std::is_same<typename ActorP::OtherSideActor, ActorC>::value,
                  "ActorP's reciprocal must be ActorC");
    static_assert(std::is_same<typename ActorC::OtherSideActor, ActorP>::value,
                  "ActorC's reciprocal must be ActorP");

    auto id = NewIpdlQueueId();
    return WrapUnique(new IpdlQueue<ActorP, ActorC>(
        std::move(WrapUnique(new Producer(id))),
        std::move(WrapUnique(new Consumer(id, aConsumerActor)))));
  }

 private:
  IpdlQueue(UniquePtr<Producer>&& aProducer, UniquePtr<Consumer>&& aConsumer)
      : mProducer(std::move(aProducer)), mConsumer(std::move(aConsumer)) {}

  UniquePtr<Producer> mProducer;
  UniquePtr<Consumer> mConsumer;
};

}  // namespace dom

namespace ipc {

template <typename Actor>
struct IPDLParamTraits<mozilla::dom::IpdlProducer<Actor>> {
  using paramType = mozilla::dom::IpdlProducer<Actor>;

  static void Write(IPC::Message* aMsg, IProtocol* aActor,
                    const paramType& aParam) {
    MOZ_ASSERT(aParam.mActor == nullptr);
    WriteIPDLParam(aMsg, aActor, aParam.mId);
  }

  static bool Read(const IPC::Message* aMsg, PickleIterator* aIter,
                   IProtocol* aActor, paramType* aResult) {
    aResult->mActor = static_cast<Actor*>(aActor);
    return ReadIPDLParam(aMsg, aIter, aActor, &aResult->mId);
  }
};

template <typename Actor>
struct IPDLParamTraits<mozilla::dom::IpdlConsumer<Actor>> {
  using paramType = mozilla::dom::IpdlConsumer<Actor>;

  static void Write(IPC::Message* aMsg, IProtocol* aActor,
                    const paramType& aParam) {
    MOZ_ASSERT(aParam.mActor == nullptr);
    WriteIPDLParam(aMsg, aActor, aParam.mId);
    WriteIPDLParam(aMsg, aActor, aParam.mBuf);
  }

  static bool Read(const IPC::Message* aMsg, PickleIterator* aIter,
                   IProtocol* aActor, paramType* aResult) {
    aResult->mActor = static_cast<Actor*>(aActor);
    return ReadIPDLParam(aMsg, aIter, aActor, &aResult->mId) &&
           ReadIPDLParam(aMsg, aIter, aActor, &aResult->mBuf);
  }
};

template <>
struct IPDLParamTraits<mozilla::dom::IpdlQueueBuffer> {
  using paramType = mozilla::dom::IpdlQueueBuffer;

  static void Write(IPC::Message* aMsg, IProtocol* aActor,
                    const paramType& aParam) {
    WriteParam(aMsg, aParam.id);
    WriteParam(aMsg, aParam.data);
  }

  static bool Read(const IPC::Message* aMsg, PickleIterator* aIter,
                   IProtocol* aActor, paramType* aResult) {
    return ReadParam(aMsg, aIter, &aResult->id) &&
           ReadParam(aMsg, aIter, &aResult->data);
  }
};

}  // namespace ipc
}  // namespace mozilla

#endif  // IPDLQUEUE_H_
