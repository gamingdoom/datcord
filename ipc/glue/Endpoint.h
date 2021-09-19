/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

#ifndef IPC_GLUE_ENDPOINT_H_
#define IPC_GLUE_ENDPOINT_H_

#include <utility>
#include "CrashAnnotations.h"
#include "base/process.h"
#include "base/process_util.h"
#include "mozilla/Assertions.h"
#include "mozilla/Maybe.h"
#include "mozilla/UniquePtr.h"
#include "mozilla/ipc/MessageLink.h"
#include "mozilla/ipc/Transport.h"
#include "mozilla/ipc/NodeController.h"
#include "mozilla/ipc/ScopedPort.h"
#include "nsXULAppAPI.h"
#include "nscore.h"

namespace IPC {
template <class P>
struct ParamTraits;
}

namespace mozilla {
namespace ipc {

struct PrivateIPDLInterface {};

/**
 * An endpoint represents one end of a partially initialized IPDL channel. To
 * set up a new top-level protocol:
 *
 * Endpoint<PFooParent> parentEp;
 * Endpoint<PFooChild> childEp;
 * nsresult rv;
 * rv = PFoo::CreateEndpoints(parentPid, childPid, &parentEp, &childEp);
 *
 * You're required to pass in parentPid and childPid, which are the pids of the
 * processes in which the parent and child endpoints will be used.
 *
 * Endpoints can be passed in IPDL messages or sent to other threads using
 * PostTask. Once an Endpoint has arrived at its destination process and thread,
 * you need to create the top-level actor and bind it to the endpoint:
 *
 * FooParent* parent = new FooParent();
 * bool rv1 = parentEp.Bind(parent, processActor);
 * bool rv2 = parent->SendBar(...);
 *
 * (See Bind below for an explanation of processActor.) Once the actor is bound
 * to the endpoint, it can send and receive messages.
 */
template <class PFooSide>
class Endpoint {
 public:
  using ProcessId = base::ProcessId;

  Endpoint() = default;

  Endpoint(const PrivateIPDLInterface&, ScopedPort aPort, ProcessId aMyPid,
           ProcessId aOtherPid)
      : mPort(std::move(aPort)), mMyPid(aMyPid), mOtherPid(aOtherPid) {}

  Endpoint(const Endpoint&) = delete;
  Endpoint(Endpoint&& aOther) = default;

  Endpoint& operator=(const Endpoint&) = delete;
  Endpoint& operator=(Endpoint&& aOther) = default;

  ProcessId OtherPid() const { return mOtherPid; }

  // This method binds aActor to this endpoint. After this call, the actor can
  // be used to send and receive messages. The endpoint becomes invalid.
  bool Bind(PFooSide* aActor) {
    MOZ_RELEASE_ASSERT(IsValid());
    MOZ_RELEASE_ASSERT(mMyPid == base::GetCurrentProcId());
    return aActor->Open(std::move(mPort), mOtherPid);
  }

  bool IsValid() const { return mPort.IsValid(); }

 private:
  friend struct IPC::ParamTraits<Endpoint<PFooSide>>;

  ScopedPort mPort;
  ProcessId mMyPid = 0;
  ProcessId mOtherPid = 0;
};

#if defined(XP_MACOSX)
void AnnotateCrashReportWithErrno(CrashReporter::Annotation tag, int error);
#else
inline void AnnotateCrashReportWithErrno(CrashReporter::Annotation tag,
                                         int error) {}
#endif

// This function is used internally to create a pair of Endpoints. See the
// comment above Endpoint for a description of how it might be used.
template <class PFooParent, class PFooChild>
nsresult CreateEndpoints(const PrivateIPDLInterface& aPrivate,
                         base::ProcessId aParentDestPid,
                         base::ProcessId aChildDestPid,
                         Endpoint<PFooParent>* aParentEndpoint,
                         Endpoint<PFooChild>* aChildEndpoint) {
  MOZ_RELEASE_ASSERT(aParentDestPid);
  MOZ_RELEASE_ASSERT(aChildDestPid);

  auto [parentPort, childPort] =
      NodeController::GetSingleton()->CreatePortPair();
  *aParentEndpoint = Endpoint<PFooParent>(aPrivate, std::move(parentPort),
                                          aParentDestPid, aChildDestPid);
  *aChildEndpoint = Endpoint<PFooChild>(aPrivate, std::move(childPort),
                                        aChildDestPid, aParentDestPid);
  return NS_OK;
}

/**
 * A managed endpoint represents one end of a partially initialized managed
 * IPDL actor. It is used for situations where the usual IPDL Constructor
 * methods do not give sufficient control over the construction of actors, such
 * as when constructing actors within replies, or constructing multiple related
 * actors simultaneously.
 *
 * FooParent* parent = new FooParent();
 * ManagedEndpoint<PFooChild> childEp = parentMgr->OpenPFooEndpoint(parent);
 *
 * ManagedEndpoints should be sent using IPDL messages or other mechanisms to
 * the other side of the manager channel. Once the ManagedEndpoint has arrived
 * at its destination, you can create the actor, and bind it to the endpoint.
 *
 * FooChild* child = new FooChild();
 * childMgr->BindPFooEndpoint(childEp, child);
 *
 * WARNING: If the remote side of an endpoint has not been bound before it
 * begins to receive messages, an IPC routing error will occur, likely causing
 * a browser crash.
 */
template <class PFooSide>
class ManagedEndpoint {
 public:
  ManagedEndpoint() : mId(0) {}

  ManagedEndpoint(const PrivateIPDLInterface&, int32_t aId) : mId(aId) {}

  ManagedEndpoint(ManagedEndpoint&& aOther) : mId(aOther.mId) {
    aOther.mId = 0;
  }

  ManagedEndpoint& operator=(ManagedEndpoint&& aOther) {
    mId = aOther.mId;
    aOther.mId = 0;
    return *this;
  }

  bool IsValid() const { return mId != 0; }

  Maybe<int32_t> ActorId() const { return IsValid() ? Some(mId) : Nothing(); }

  bool operator==(const ManagedEndpoint& _o) const { return mId == _o.mId; }

 private:
  friend struct IPC::ParamTraits<ManagedEndpoint<PFooSide>>;

  ManagedEndpoint(const ManagedEndpoint&) = delete;
  ManagedEndpoint& operator=(const ManagedEndpoint&) = delete;

  // The routing ID for the to-be-created endpoint.
  int32_t mId;

  // XXX(nika): Might be nice to have other info for assertions?
  // e.g. mManagerId, mManagerType, etc.
};

}  // namespace ipc
}  // namespace mozilla

#endif  // IPC_GLUE_ENDPOINT_H_
