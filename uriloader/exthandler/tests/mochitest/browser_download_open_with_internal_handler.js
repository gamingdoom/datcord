/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { Downloads } = ChromeUtils.import(
  "resource://gre/modules/Downloads.jsm"
);
const { DownloadIntegration } = ChromeUtils.import(
  "resource://gre/modules/DownloadIntegration.jsm"
);

const TEST_PATH = getRootDirectory(gTestPath).replace(
  "chrome://mochitests/content",
  "https://example.com"
);

function waitForAcceptButtonToGetEnabled(doc) {
  let dialog = doc.querySelector("#unknownContentType");
  let button = dialog.getButton("accept");
  return TestUtils.waitForCondition(
    () => !button.disabled,
    "Wait for Accept button to get enabled"
  );
}

async function waitForPdfJS(browser, url) {
  await SpecialPowers.pushPrefEnv({
    set: [["pdfjs.eventBusDispatchToDOM", true]],
  });
  // Runs tests after all "load" event handlers have fired off
  let loadPromise = BrowserTestUtils.waitForContentEvent(
    browser,
    "documentloaded",
    false,
    null,
    true
  );
  await SpecialPowers.spawn(browser, [url], contentUrl => {
    content.location = contentUrl;
  });
  return loadPromise;
}

add_task(async function setup() {
  // Remove the security delay for the dialog during the test.
  await SpecialPowers.pushPrefEnv({
    set: [
      ["security.dialog_enable_delay", 0],
      ["browser.helperApps.showOpenOptionForPdfJS", true],
      ["browser.helperApps.showOpenOptionForViewableInternally", true],
    ],
  });

  // Restore handlers after the whole test has run
  const mimeSvc = Cc["@mozilla.org/mime;1"].getService(Ci.nsIMIMEService);
  const handlerSvc = Cc["@mozilla.org/uriloader/handler-service;1"].getService(
    Ci.nsIHandlerService
  );
  const registerRestoreHandler = function(type, ext) {
    const mimeInfo = mimeSvc.getFromTypeAndExtension(type, ext);
    const existed = handlerSvc.exists(mimeInfo);
    registerCleanupFunction(() => {
      if (existed) {
        handlerSvc.store(mimeInfo);
      } else {
        handlerSvc.remove(mimeInfo);
      }
    });
  };
  registerRestoreHandler("application/pdf", "pdf");
  registerRestoreHandler("binary/octet-stream", "pdf");
  registerRestoreHandler("application/unknown", "pdf");
});

/**
 * Check that loading a PDF file with content-disposition: attachment
 * shows an option to open with the internal handler, and that the
 * internal option handler is not present when the download button
 * is clicked from pdf.js.
 */
add_task(async function test_check_open_with_internal_handler() {
  for (let file of [
    "file_pdf_application_pdf.pdf",
    "file_pdf_binary_octet_stream.pdf",
  ]) {
    info("Testing with " + file);
    let publicList = await Downloads.getList(Downloads.PUBLIC);
    registerCleanupFunction(async () => {
      await publicList.removeFinished();
    });
    let dialogWindowPromise = BrowserTestUtils.domWindowOpenedAndLoaded();
    let loadingTab = await BrowserTestUtils.openNewForegroundTab(
      gBrowser,
      TEST_PATH + file
    );
    // Add an extra tab after the loading tab so we can test that
    // pdf.js is opened in the adjacent tab and not at the end of
    // the tab strip.
    let extraTab = await BrowserTestUtils.addTab(gBrowser, "about:blank");
    let dialogWindow = await dialogWindowPromise;
    is(
      dialogWindow.location.href,
      "chrome://mozapps/content/downloads/unknownContentType.xhtml",
      "Should have seen the unknown content dialogWindow."
    );
    let doc = dialogWindow.document;
    let internalHandlerRadio = doc.querySelector("#handleInternally");

    await waitForAcceptButtonToGetEnabled(doc);

    ok(!internalHandlerRadio.hidden, "The option should be visible for PDF");
    ok(internalHandlerRadio.selected, "The option should be selected");

    let downloadFinishedPromise = promiseDownloadFinished(publicList);
    let newTabPromise = BrowserTestUtils.waitForNewTab(gBrowser);
    let dialog = doc.querySelector("#unknownContentType");
    let button = dialog.getButton("accept");
    button.disabled = false;
    dialog.acceptDialog();
    info("waiting for new tab to open");
    let newTab = await newTabPromise;

    is(
      newTab._tPos - 1,
      loadingTab._tPos,
      "pdf.js should be opened in an adjacent tab"
    );

    await ContentTask.spawn(newTab.linkedBrowser, null, async () => {
      await ContentTaskUtils.waitForCondition(
        () => content.document.readyState == "complete"
      );
    });

    let publicDownloads = await publicList.getAll();
    is(
      publicDownloads.length,
      1,
      "download should appear in publicDownloads list"
    );

    let download = await downloadFinishedPromise;

    let subdialogPromise = BrowserTestUtils.domWindowOpenedAndLoaded();
    // Current tab has file: URI and TEST_PATH is http uri, so uri will be different
    BrowserTestUtils.loadURI(newTab.linkedBrowser, TEST_PATH + file);
    let subDialogWindow = await subdialogPromise;
    let subDoc = subDialogWindow.document;
    // Prevent racing with initialization of the dialog and make sure that
    // the final state of the dialog has the correct visibility of the internal-handler option.
    await waitForAcceptButtonToGetEnabled(subDoc);
    let subInternalHandlerRadio = subDoc.querySelector("#handleInternally");
    ok(
      !subInternalHandlerRadio.hidden,
      "This option should be shown when the dialog is shown for another PDF"
    );
    // Cancel dialog
    subDoc.querySelector("#unknownContentType").cancelDialog();

    subdialogPromise = BrowserTestUtils.domWindowOpenedAndLoaded();
    await SpecialPowers.spawn(newTab.linkedBrowser, [], async () => {
      let downloadButton;
      await ContentTaskUtils.waitForCondition(() => {
        downloadButton = content.document.querySelector("#download");
        return !!downloadButton;
      });
      ok(downloadButton, "Download button should be present in pdf.js");
      downloadButton.click();
    });
    info(
      "Waiting for unknown content type dialog to appear from pdf.js download button click"
    );
    subDialogWindow = await subdialogPromise;
    subDoc = subDialogWindow.document;
    // Prevent racing with initialization of the dialog and make sure that
    // the final state of the dialog has the correct visibility of the internal-handler option.
    await waitForAcceptButtonToGetEnabled(subDoc);
    subInternalHandlerRadio = subDoc.querySelector("#handleInternally");
    ok(
      subInternalHandlerRadio.hidden,
      "The option should be hidden when the dialog is opened from pdf.js"
    );
    subDoc.querySelector("#open").click();

    let tabOpenListener = () => {
      ok(
        false,
        "A new tab should not be opened when accepting the dialog with 'open-with-external-app' chosen"
      );
    };
    gBrowser.tabContainer.addEventListener("TabOpen", tabOpenListener);

    let oldLaunchFile = DownloadIntegration.launchFile;
    let waitForLaunchFileCalled = new Promise(resolve => {
      DownloadIntegration.launchFile = async () => {
        ok(true, "The file should be launched with an external application");
        resolve();
      };
    });

    downloadFinishedPromise = promiseDownloadFinished(publicList);

    info("Accepting the dialog");
    subDoc.querySelector("#unknownContentType").acceptDialog();
    info("Waiting until DownloadIntegration.launchFile is called");
    await waitForLaunchFileCalled;
    DownloadIntegration.launchFile = oldLaunchFile;

    // Remove the first file (can't do this sooner or the second load fails):
    if (download?.target.exists) {
      try {
        info("removing " + download.target.path);
        await IOUtils.remove(download.target.path);
      } catch (ex) {
        /* ignore */
      }
    }

    gBrowser.tabContainer.removeEventListener("TabOpen", tabOpenListener);
    BrowserTestUtils.removeTab(loadingTab);
    BrowserTestUtils.removeTab(newTab);
    BrowserTestUtils.removeTab(extraTab);

    // Remove the remaining file once complete.
    download = await downloadFinishedPromise;
    if (download?.target.exists) {
      try {
        info("removing " + download.target.path);
        await IOUtils.remove(download.target.path);
      } catch (ex) {
        /* ignore */
      }
    }
    await publicList.removeFinished();
  }
});

/**
 * Test that choosing to open in an external application doesn't
 * open the PDF into pdf.js
 */
add_task(async function test_check_open_with_external_application() {
  for (let file of [
    "file_pdf_application_pdf.pdf",
    "file_pdf_binary_octet_stream.pdf",
  ]) {
    info("Testing with " + file);
    let publicList = await Downloads.getList(Downloads.PUBLIC);
    registerCleanupFunction(async () => {
      await publicList.removeFinished();
    });
    let dialogWindowPromise = BrowserTestUtils.domWindowOpenedAndLoaded();
    let loadingTab = await BrowserTestUtils.openNewForegroundTab(
      gBrowser,
      TEST_PATH + file
    );
    let dialogWindow = await dialogWindowPromise;
    is(
      dialogWindow.location.href,
      "chrome://mozapps/content/downloads/unknownContentType.xhtml",
      "Should have seen the unknown content dialogWindow."
    );

    let oldLaunchFile = DownloadIntegration.launchFile;
    let waitForLaunchFileCalled = new Promise(resolve => {
      DownloadIntegration.launchFile = () => {
        ok(true, "The file should be launched with an external application");
        resolve();
      };
    });

    let doc = dialogWindow.document;
    await waitForAcceptButtonToGetEnabled(doc);
    let dialog = doc.querySelector("#unknownContentType");
    doc.querySelector("#open").click();
    let button = dialog.getButton("accept");
    button.disabled = false;
    info("Accepting the dialog");
    dialog.acceptDialog();
    info("Waiting until DownloadIntegration.launchFile is called");
    await waitForLaunchFileCalled;
    DownloadIntegration.launchFile = oldLaunchFile;

    let publicDownloads = await publicList.getAll();
    is(
      publicDownloads.length,
      1,
      "download should appear in publicDownloads list"
    );
    let download = publicDownloads[0];
    ok(
      !download.launchWhenSucceeded,
      "launchWhenSucceeded should be false after launchFile is called"
    );

    BrowserTestUtils.removeTab(loadingTab);
    if (download?.target.exists) {
      try {
        info("removing " + download.target.path);
        await IOUtils.remove(download.target.path);
      } catch (ex) {
        /* ignore */
      }
    }
    await publicList.removeFinished();
  }
});

/**
 * Test that choosing to open a PDF with an external application works and
 * then downloading the same file again and choosing Open with Firefox opens
 * the download in Firefox.
 */
add_task(async function test_check_open_with_external_then_internal() {
  // This test only runs on Windows because appPicker.xhtml is only used on Windows.
  if (AppConstants.platform != "win") {
    return;
  }

  // This test covers a bug that only occurs when the mimeInfo is set to Always Ask
  const mimeSvc = Cc["@mozilla.org/mime;1"].getService(Ci.nsIMIMEService);
  const handlerSvc = Cc["@mozilla.org/uriloader/handler-service;1"].getService(
    Ci.nsIHandlerService
  );
  const mimeInfo = mimeSvc.getFromTypeAndExtension("application/pdf", "pdf");
  mimeInfo.preferredAction = mimeInfo.alwaysAsk;
  mimeInfo.alwaysAskBeforeHandling = true;
  handlerSvc.store(mimeInfo);

  for (let [file, mimeType] of [
    ["file_pdf_application_pdf.pdf", "application/pdf"],
    ["file_pdf_binary_octet_stream.pdf", "binary/octet-stream"],
    ["file_pdf_application_unknown.pdf", "application/unknown"],
  ]) {
    info("Testing with " + file);
    let originalMimeInfo = mimeSvc.getFromTypeAndExtension(mimeType, "pdf");

    let publicList = await Downloads.getList(Downloads.PUBLIC);
    registerCleanupFunction(async () => {
      await publicList.removeFinished();
    });
    let dialogWindowPromise = BrowserTestUtils.domWindowOpenedAndLoaded();
    // Open a new tab to the PDF file which will trigger the Unknown Content Type dialog
    // and choose to open the PDF with an external application.
    let loadingTab = await BrowserTestUtils.openNewForegroundTab(
      gBrowser,
      TEST_PATH + file
    );
    let dialogWindow = await dialogWindowPromise;
    is(
      dialogWindow.location.href,
      "chrome://mozapps/content/downloads/unknownContentType.xhtml",
      "Should have seen the unknown content dialogWindow."
    );

    let oldLaunchFile = DownloadIntegration.launchFile;
    let waitForLaunchFileCalled = new Promise(resolve => {
      DownloadIntegration.launchFile = () => {
        ok(true, "The file should be launched with an external application");
        resolve();
      };
    });

    let doc = dialogWindow.document;
    await waitForAcceptButtonToGetEnabled(doc);
    let dialog = doc.querySelector("#unknownContentType");
    let openHandlerMenulist = doc.querySelector("#openHandler");
    let originalDefaultHandler = openHandlerMenulist.label;
    doc.querySelector("#open").click();
    doc.querySelector("#openHandlerPopup").click();
    let oldOpenDialog = dialogWindow.openDialog;
    dialogWindow.openDialog = (location, unused2, unused3, params) => {
      is(location, "chrome://global/content/appPicker.xhtml", "app picker");
      let handlerApp = params.mimeInfo.possibleLocalHandlers.queryElementAt(
        0,
        Ci.nsILocalHandlerApp
      );
      ok(handlerApp.executable, "handlerApp should be executable");
      ok(handlerApp.executable.isFile(), "handlerApp should be a file");
      params.handlerApp = handlerApp;
    };
    doc.querySelector("#choose").click();
    dialogWindow.openDialog = oldOpenDialog;
    await TestUtils.waitForCondition(
      () => originalDefaultHandler != openHandlerMenulist.label,
      "waiting for openHandler to get updated"
    );
    let newDefaultHandler = openHandlerMenulist.label;
    info(`was ${originalDefaultHandler}, now ${newDefaultHandler}`);
    let button = dialog.getButton("accept");
    button.disabled = false;
    info("Accepting the dialog");
    dialog.acceptDialog();
    info("Waiting until DownloadIntegration.launchFile is called");
    await waitForLaunchFileCalled;
    BrowserTestUtils.removeTab(loadingTab);

    // Now, open a new tab to the PDF file which will trigger the Unknown Content Type dialog
    // and choose to open the PDF internally. The previously used external application should be shown as
    // the external option.
    dialogWindowPromise = BrowserTestUtils.domWindowOpenedAndLoaded();
    loadingTab = await BrowserTestUtils.openNewForegroundTab(
      gBrowser,
      TEST_PATH + file
    );
    dialogWindow = await dialogWindowPromise;
    is(
      dialogWindow.location.href,
      "chrome://mozapps/content/downloads/unknownContentType.xhtml",
      "Should have seen the unknown content dialogWindow."
    );

    DownloadIntegration.launchFile = () => {
      ok(false, "The file should not be launched with an external application");
    };

    doc = dialogWindow.document;
    await waitForAcceptButtonToGetEnabled(doc);
    openHandlerMenulist = doc.querySelector("#openHandler");
    is(openHandlerMenulist.label, newDefaultHandler, "'new' handler");
    dialog = doc.querySelector("#unknownContentType");
    doc.querySelector("#handleInternally").click();
    info("Accepting the dialog");
    button = dialog.getButton("accept");
    button.disabled = false;
    let newTabPromise = BrowserTestUtils.waitForNewTab(gBrowser);
    dialog.acceptDialog();

    info("waiting for new tab to open");
    let newTab = await newTabPromise;

    await ContentTask.spawn(newTab.linkedBrowser, null, async () => {
      await ContentTaskUtils.waitForCondition(
        () => content.document.readyState == "complete"
      );
    });

    is(
      newTab.linkedBrowser.contentPrincipal.origin,
      "resource://pdf.js",
      "PDF should be opened with pdf.js"
    );

    BrowserTestUtils.removeTab(loadingTab);
    BrowserTestUtils.removeTab(newTab);

    // Now trigger the dialog again and select the system
    // default option to reset the state for the next iteration of the test.
    // Reset the state for the next iteration of the test.
    handlerSvc.store(originalMimeInfo);
    DownloadIntegration.launchFile = oldLaunchFile;
    let [download] = await publicList.getAll();
    if (download?.target.exists) {
      try {
        info("removing " + download.target.path);
        await IOUtils.remove(download.target.path);
      } catch (ex) {
        /* ignore */
      }
    }
    await publicList.removeFinished();
  }
});

/**
 * Check that the "Open with internal handler" option is presented
 * for other viewable internally types.
 */
add_task(
  async function test_internal_handler_hidden_with_viewable_internally_type() {
    for (let [file, checkDefault] of [
      // The default for binary/octet-stream is changed by the PDF tests above,
      // this may change given bug 1659008, so I'm just ignoring the default for now.
      ["file_xml_attachment_binary_octet_stream.xml", false],
      ["file_xml_attachment_test.xml", true],
    ]) {
      let dialogWindowPromise = BrowserTestUtils.domWindowOpenedAndLoaded();
      let loadingTab = await BrowserTestUtils.openNewForegroundTab(
        gBrowser,
        TEST_PATH + file
      );
      let dialogWindow = await dialogWindowPromise;
      is(
        dialogWindow.location.href,
        "chrome://mozapps/content/downloads/unknownContentType.xhtml",
        "Should have seen the unknown content dialogWindow."
      );
      let doc = dialogWindow.document;
      let internalHandlerRadio = doc.querySelector("#handleInternally");

      // Prevent racing with initialization of the dialog and make sure that
      // the final state of the dialog has the correct visibility of the internal-handler option.
      await waitForAcceptButtonToGetEnabled(doc);

      ok(!internalHandlerRadio.hidden, "The option should be visible for XML");
      if (checkDefault) {
        ok(internalHandlerRadio.selected, "The option should be selected");
      }

      let dialog = doc.querySelector("#unknownContentType");
      dialog.cancelDialog();
      BrowserTestUtils.removeTab(loadingTab);
    }
  }
);

/**
 * Check that the "Open with internal handler" option is not presented
 * for non-PDF, non-viewable-internally types.
 */
add_task(async function test_internal_handler_hidden_with_other_type() {
  let dialogWindowPromise = BrowserTestUtils.domWindowOpenedAndLoaded();
  let loadingTab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    TEST_PATH + "file_txt_attachment_test.txt"
  );
  let dialogWindow = await dialogWindowPromise;
  is(
    dialogWindow.location.href,
    "chrome://mozapps/content/downloads/unknownContentType.xhtml",
    "Should have seen the unknown content dialogWindow."
  );
  let doc = dialogWindow.document;

  // Prevent racing with initialization of the dialog and make sure that
  // the final state of the dialog has the correct visibility of the internal-handler option.
  await waitForAcceptButtonToGetEnabled(doc);

  let internalHandlerRadio = doc.querySelector("#handleInternally");
  ok(
    internalHandlerRadio.hidden,
    "The option should be hidden for unknown file type"
  );

  let dialog = doc.querySelector("#unknownContentType");
  dialog.cancelDialog();
  BrowserTestUtils.removeTab(loadingTab);
});

/**
 * Check that the "Open with internal handler" option is not presented
 * when the feature is disabled for PDFs.
 */
add_task(async function test_internal_handler_hidden_with_pdf_pref_disabled() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.helperApps.showOpenOptionForPdfJS", false]],
  });
  for (let file of [
    "file_pdf_application_pdf.pdf",
    "file_pdf_binary_octet_stream.pdf",
  ]) {
    let dialogWindowPromise = BrowserTestUtils.domWindowOpenedAndLoaded();
    let loadingTab = await BrowserTestUtils.openNewForegroundTab(
      gBrowser,
      TEST_PATH + file
    );
    let dialogWindow = await dialogWindowPromise;
    is(
      dialogWindow.location.href,
      "chrome://mozapps/content/downloads/unknownContentType.xhtml",
      "Should have seen the unknown content dialogWindow."
    );
    let doc = dialogWindow.document;

    await waitForAcceptButtonToGetEnabled(doc);

    let internalHandlerRadio = doc.querySelector("#handleInternally");
    ok(
      internalHandlerRadio.hidden,
      "The option should be hidden for PDF when the pref is false"
    );

    let dialog = doc.querySelector("#unknownContentType");
    dialog.cancelDialog();
    BrowserTestUtils.removeTab(loadingTab);
  }
});

/**
 * Check that the "Open with internal handler" option is not presented
 * for other viewable internally types when disabled.
 */
add_task(
  async function test_internal_handler_hidden_with_viewable_internally_pref_disabled() {
    await SpecialPowers.pushPrefEnv({
      set: [["browser.helperApps.showOpenOptionForViewableInternally", false]],
    });
    let dialogWindowPromise = BrowserTestUtils.domWindowOpenedAndLoaded();
    let loadingTab = await BrowserTestUtils.openNewForegroundTab(
      gBrowser,
      TEST_PATH + "file_xml_attachment_test.xml"
    );
    let dialogWindow = await dialogWindowPromise;
    is(
      dialogWindow.location.href,
      "chrome://mozapps/content/downloads/unknownContentType.xhtml",
      "Should have seen the unknown content dialogWindow."
    );
    let doc = dialogWindow.document;

    await waitForAcceptButtonToGetEnabled(doc);

    let internalHandlerRadio = doc.querySelector("#handleInternally");
    ok(
      internalHandlerRadio.hidden,
      "The option should be hidden for XML when the pref is false"
    );

    let dialog = doc.querySelector("#unknownContentType");
    dialog.cancelDialog();
    BrowserTestUtils.removeTab(loadingTab);
  }
);
