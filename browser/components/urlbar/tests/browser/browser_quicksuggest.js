/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Tests browser quick suggestions.
 */

XPCOMUtils.defineLazyModuleGetters(this, {
  UrlbarQuickSuggest: "resource:///modules/UrlbarQuickSuggest.jsm",
});

const TEST_URL =
  "http://mochi.test:8888/browser/browser/components/urlbar/tests/browser/quicksuggest.sjs";

const TEST_DATA = [
  {
    id: 1,
    url: `${TEST_URL}?q=frabbits`,
    title: "frabbits",
    keywords: ["fra", "frab"],
    click_url: "http://click.reporting.test.com/",
    impression_url: "http://impression.reporting.test.com/",
    advertiser: "TestAdvertiser",
  },
  {
    id: 2,
    url: `${TEST_URL}?q=nonsponsored`,
    title: "Non-Sponsored",
    keywords: ["nonspon"],
    click_url: "http://click.reporting.test.com/nonsponsored",
    impression_url: "http://impression.reporting.test.com/nonsponsored",
    advertiser: "TestAdvertiserNonSponsored",
    iab_category: "5 - Education",
  },
];

const ABOUT_BLANK = "about:blank";
const TEST_ENGINE_BASENAME = "searchSuggestionEngine.xml";
const SUGGESTIONS_PREF = "browser.search.suggest.enabled";
const PRIVATE_SUGGESTIONS_PREF = "browser.search.suggest.enabled.private";
const SEEN_DIALOG_PREF = "browser.urlbar.quicksuggest.showedOnboardingDialog";
const SUGGESTIONS_FIRST_PREF = "browser.urlbar.showSearchSuggestionsFirst";

function sleep(ms) {
  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Asserts that a result is a Quick Suggest result.
 *
 * @param {number} [index]
 *   The expected index of the Quick Suggest result.  Pass -1 to use the index
 *   of the last result.
 * @param {boolean} [isSponsored]
 *   True if the result is expected to be sponsored and false if non-sponsored
 *   (i.e., "Firefox Suggest").
 * @param {object} [win]
 *   The window in which to read the results from.
 * @returns {result}
 *   The result at the given index.
 */
async function assertIsQuickSuggest({
  index = -1,
  isSponsored = true,
  win = window,
} = {}) {
  if (index < 0) {
    index = UrlbarTestUtils.getResultCount(win) - 1;
    Assert.greater(index, -1, "Sanity check: Result count should be > 0");
  }

  let result = await UrlbarTestUtils.getDetailsOfResultAt(win, index);
  Assert.equal(result.type, UrlbarUtils.RESULT_TYPE.URL);

  // Confusingly, `isSponsored` is set on the result payload for all quick
  // suggest results, even non-sponsored ones.  It's just a marker of whether
  // the result is a quick suggest.
  Assert.ok(result.isSponsored, "Result isSponsored");

  let url;
  let actionText;
  if (isSponsored) {
    url = `${TEST_URL}?q=frabbits`;
    actionText = "Sponsored";
  } else {
    url = `${TEST_URL}?q=nonsponsored`;
    actionText = "Firefox Suggest";
  }
  Assert.equal(result.url, url, "Result URL");
  Assert.equal(
    result.element.row._elements.get("action").textContent,
    actionText,
    "Result action text"
  );

  let helpButton = result.element.row._elements.get("helpButton");
  Assert.ok(helpButton, "The help button should be present");

  return result;
}

/**
 * Asserts that none of the results are Quick Suggest results.
 *
 * @param {window} [win]
 */
async function assertNoQuickSuggestResults(win = window) {
  for (let i = 0; i < UrlbarTestUtils.getResultCount(win); i++) {
    let r = await UrlbarTestUtils.getDetailsOfResultAt(win, i);
    Assert.ok(
      r.type != UrlbarUtils.RESULT_TYPE.URL ||
        !r.url.includes(TEST_URL) ||
        !r.isSponsored,
      `Result at index ${i} should not be a QuickSuggest result`
    );
  }
}

/**
 * Adds a search engine that provides suggestions, calls your callback, and then
 * remove the engine.
 *
 * @param {function} callback
 *   Your callback function.
 */
async function withSuggestions(callback) {
  await SpecialPowers.pushPrefEnv({
    set: [[SUGGESTIONS_PREF, true]],
  });
  let engine = await SearchTestUtils.promiseNewSearchEngine(
    getRootDirectory(gTestPath) + TEST_ENGINE_BASENAME
  );
  let oldDefaultEngine = await Services.search.getDefault();
  await Services.search.setDefault(engine);
  try {
    await callback(engine);
  } finally {
    await Services.search.setDefault(oldDefaultEngine);
    await Services.search.removeEngine(engine);
    await SpecialPowers.popPrefEnv();
  }
}

add_task(async function init() {
  await PlacesUtils.history.clear();
  await UrlbarTestUtils.formHistory.clear();
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.urlbar.suggest.searches", true],
      ["browser.startup.upgradeDialog.version", 89],
    ],
  });

  Services.prefs.clearUserPref(SEEN_DIALOG_PREF);
  Services.prefs.clearUserPref("browser.urlbar.quicksuggest.seenRestarts");

  let doExperimentCleanup = await UrlbarTestUtils.enrollExperiment({
    valueOverrides: {
      quickSuggestEnabled: true,
      quickSuggestShouldShowOnboardingDialog: true,
    },
  });

  // Add a mock engine so we don't hit the network loading the SERP.
  await SearchTestUtils.installSearchExtension();
  let oldDefaultEngine = await Services.search.getDefault();
  await Services.search.setDefault(Services.search.getEngineByName("Example"));

  await UrlbarQuickSuggest.init();
  await UrlbarQuickSuggest._processSuggestionsJSON(TEST_DATA);
  let onEnabled = UrlbarQuickSuggest.onEnabledUpdate;
  UrlbarQuickSuggest.onEnabledUpdate = () => {};

  registerCleanupFunction(async function() {
    Services.search.setDefault(oldDefaultEngine);
    await PlacesUtils.history.clear();
    await UrlbarTestUtils.formHistory.clear();
    await doExperimentCleanup();
    UrlbarQuickSuggest.onEnabledUpdate = onEnabled;
  });
});

add_task(async function test_onboarding() {
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "fra",
  });
  await assertNoQuickSuggestResults();
  await UrlbarTestUtils.promisePopupClose(window);

  let dialogPromise = BrowserTestUtils.promiseAlertDialog(
    "accept",
    "chrome://browser/content/urlbar/quicksuggestOnboarding.xhtml",
    { isSubDialog: true }
  ).then(() => info("Saw dialog"));
  let prefPromise = TestUtils.waitForPrefChange(
    SEEN_DIALOG_PREF,
    value => value === true
  ).then(() => info("Saw pref change"));

  // Simulate 3 restarts. this function is only called by BrowserGlue
  // on startup, the first restart would be where MR1 was shown then
  // we will show onboarding the 2nd restart after that.
  for (let i = 0; i < 3; i++) {
    info(`Simulating restart ${i + 1}`);
    await UrlbarQuickSuggest.maybeShowOnboardingDialog();
  }

  info("Waiting for dialog and pref change");
  await Promise.all([dialogPromise, prefPromise]);
});

add_task(async function basic_test() {
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "fra",
  });
  await assertIsQuickSuggest({ index: 1 });
  let row = await UrlbarTestUtils.waitForAutocompleteResultAt(window, 1);
  Assert.equal(
    row.querySelector(".urlbarView-title").firstChild.textContent,
    "fra",
    "The part of the keyword that matches users input is not bold."
  );
  Assert.equal(
    row.querySelector(".urlbarView-title > strong").textContent,
    "b",
    "The auto completed section of the keyword is bolded."
  );
  await UrlbarTestUtils.promisePopupClose(window);
});

add_task(async function test_case_insensitive() {
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: " Frab",
  });
  await assertIsQuickSuggest(1);
  await UrlbarTestUtils.promisePopupClose(window);
});

add_task(async function test_suggestions_disabled() {
  await SpecialPowers.pushPrefEnv({ set: [[SUGGESTIONS_PREF, false]] });
  await BrowserTestUtils.openNewForegroundTab(gBrowser, ABOUT_BLANK);
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "frab",
  });
  // We can't waitForResultAt because we don't want a result, give enough time
  // that a result would most likely have appeared.
  await sleep(100);
  Assert.ok(
    window.gURLBar.view._rows.children.length == 1,
    "There are no additional suggestions"
  );
  BrowserTestUtils.removeTab(gBrowser.selectedTab);
  await SpecialPowers.popPrefEnv();
});

// Neither sponsored nor non-sponsored results should appear in private windows
// even when suggestions in private windows are enabled.
add_task(async function test_suggestions_private() {
  await SpecialPowers.pushPrefEnv({ set: [[SUGGESTIONS_PREF, true]] });
  let win = await BrowserTestUtils.openNewBrowserWindow({
    private: true,
  });

  // Test with private suggestions enabled and disabled.
  for (let privateSuggestionsEnabled of [true, false]) {
    await SpecialPowers.pushPrefEnv({
      set: [[PRIVATE_SUGGESTIONS_PREF, privateSuggestionsEnabled]],
    });
    // Test both sponsored and non-sponsored results.
    for (let value of ["frab", "nonspon"]) {
      info(
        "Private window test: " +
          JSON.stringify({ privateSuggestionsEnabled, value })
      );
      await UrlbarTestUtils.promiseAutocompleteResultPopup({
        window: win,
        value,
      });
      await sleep(100);
      Assert.ok(
        win.gURLBar.view._rows.children.length == 1,
        "There are no additional suggestions"
      );
      await assertNoQuickSuggestResults(win);
      await UrlbarTestUtils.promisePopupClose(win);
    }
    await SpecialPowers.popPrefEnv();
  }

  await BrowserTestUtils.closeWindow(win);
  await SpecialPowers.popPrefEnv();
});

// Tests a non-sponsored result.
add_task(async function nonSponsored() {
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "nonspon",
  });
  await assertIsQuickSuggest({ index: 1, isSponsored: false });
  await UrlbarTestUtils.promisePopupClose(window);
});

// When general results are shown before search suggestions and the only general
// result is a quick suggest result, it should be shown before suggestions.
add_task(async function generalBeforeSuggestions_only() {
  await SpecialPowers.pushPrefEnv({
    set: [[SUGGESTIONS_FIRST_PREF, false]],
  });
  await withSuggestions(async () => {
    await UrlbarTestUtils.promiseAutocompleteResultPopup({
      window,
      value: "fra",
    });
    Assert.equal(
      UrlbarTestUtils.getResultCount(window),
      4,
      "Heuristic + quick suggest + 2 suggestions = 4 results"
    );
    await assertIsQuickSuggest({ index: 1 });
    await UrlbarTestUtils.promisePopupClose(window);
  });
});

// When general results are shown before search suggestions and there are other
// general results besides quick suggest, the quick suggest result should be the
// last general result.
add_task(async function generalBeforeSuggestions_others() {
  await SpecialPowers.pushPrefEnv({
    set: [[SUGGESTIONS_FIRST_PREF, false]],
  });

  // Add some history that will match our query below.
  let maxResults = UrlbarPrefs.get("maxRichResults");
  for (let i = 0; i < maxResults; i++) {
    await PlacesTestUtils.addVisits("http://example.com/frabbits" + i);
  }

  await withSuggestions(async () => {
    await UrlbarTestUtils.promiseAutocompleteResultPopup({
      window,
      value: "fra",
    });
    Assert.equal(
      UrlbarTestUtils.getResultCount(window),
      maxResults,
      "Result count is max result count"
    );
    // The quick suggest result should come before the 2 suggestions at the end.
    await assertIsQuickSuggest({ index: maxResults - 3 });
    await UrlbarTestUtils.promisePopupClose(window);
  });

  await PlacesUtils.history.clear();
});
