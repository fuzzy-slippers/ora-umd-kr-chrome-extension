// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @filedescription a contentScript (chrome extension JS code that runs inside the active browser tab rather than the extension central background.js code)
 * the way we load this detectActiveKRModuleTabContentScript.js content script is through the "content_scripts" property in the manifest.json and specify a "matches" property so that it is only added to KR (*.kuali.co/res/* and *.kuali.co/dashboard/*) URLS, not any other pages/tabs the user opens in their browser.
 * What this allows us to do is to check whether the currently open page is a KR website page without the extension needing the permission to check
 * the URL of each website the user opens (because that requires permissions that also mean the extension has access to all browser history, which we want to avoid)
 * instead, the only code added to the KR pages are listeners for specific message and page refresh events.  Because of the way the manifest loads this content script only for specific KR pages,
 * the below code is onlyadded to KR web pages ONLY.
 * These listeners are designed to handle the following situations (both very similar):
 * 1) Listener to detect when a KR page is loaded/refreshed (we are using a listener here instead of in the extension code because the chrome.tabs.onUpdated.addListener code did not fire for the final page of some of the KR redirects and the chrome.webNavigation.onCompleted.addListener that did work consistently required the permission to record user history that we are trying to avoid - luckily the onload event here seems to also work consistently and is only being added to KR pages if we add it here)
 * 2) Listener to detect a message from background.js when the user switches tabs or clicks the extension on/off
 * In both of the above situations, what we need the listeners code here to do is send a message back to background.js to tell it which KR module/tab is currently loaded (awardHome.do, awardContact.do, etc)
 * we do this by sending the action URL property of the KualiForm - we have found this to be the most accurate indicator of the current KR module/tab.
 * Unfortunately, in testing I found that the actual URL of the iframes in KR are often wrong, indicating the last page you were on before this one and not the current KR tab loaded but the KualiForm does indicate the accurate KR module/tab currently loaded in my testing
 * Basically background.js is waiting for the message described before it will ever activate the extension (change the color of the icon to active and load the CSS and js overrides to customize the current page) unless it gets a message from the listeners here
 * and because the listeners here are only loaded for KR pages based on the config in the manifest.json file, the extension should only even be considering turning on for KR pages and for no other sites/pages as the listener code to send a message wouldn't even exist
 * to give a high level overview of the coordination of the two messages sent when a page is refreshed/loaded here is a timeline of the events/messages:
 * We follow the following process flow:
 * Detect that page is starting to load -> send message to background.js to initialize the extension icon back to inactive/disabled color -> Detect the page has completely finished loading including all iframes -> send a message to background.js with the currently loaded page info so it can determine if the extension should be switched on for the current page and also which CSS/JS to load to customize the current KR tab/module page
 */

 /*
 * ::Listeners::
 */

/**
* add a listener to listen for messages from background.js and these messages are only send by background.js when the user either switches tabs or clicks the extension off or back on (not for page loads/reloads, that is the listener below)
* It is specifically waiting for a message that is asking to send back the KualiForm action URL
* this can be detected by the detectActiveKRModuleTabContentScript.js code because it is injected into the current active tab...BUT ONLY for KR URLS (this is accomplished by loading it via the manifest.json "contentScript" property and saying to only load it for *.kuali.co/res/ etc pages only)
* currently we are listening for a specific "msgForDetectActiveKRModuleTabContentScript" property on the request that should be coming from background.js and only when it needs the form action info on the current site/page
* this function should be simpy sending along the KualiForm <form> action property/url on the currently loaded page, so we can figure out which KR module/tab such as the Award Module Special Review tab is currently loaded in the active tab in the browser
* we will need this info to decide whether to have the extension update the current KR page or now (if its one of the KR pages we have decided to change/update)
* this is how we are now determining which KR page we are currently on (without the actual extension needing to be able to check the URL of every page the user has open)
*/
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
                                                                                console.group(`chrome.runtime.onMessage.addListener detected a message to detectActiveKrModuleTabContent script sent from background.js`);
  if (request.msgForDetectActiveKRModuleTabContentScript) {
    sendMessageToBackgroundProgramWithCurrentKualiFormActionUrl();
  }
                                                                                console.groupEnd();
});


/**
* This listener detects when KR pages are loaded or refreshed in a currently open browser tab, but specifically looking for the "readystatechange" even which happens when the page has partially loaded (it actually can happen multiple times with different amounts of the page partially loading)
* when a page is refreshed, this listener is triggered which sends a message to background.js to initialize the extension back to inactive/disabled for the current page as the page is first loading (before later determining if it should be enabled based on the current Tab) - see https://developer.mozilla.org/en-US/docs/Web/API/Document/readyState for more background
* we only want to send a message when the top level window is being loaded and not each time an iframe inside is being loaded - by checking that the parent of the window is window.top, we are confirming this is the top level iframe/window
* note that for KR pages that do redirects, we can still have several readystatechange events happen with each one being a top level window/iframe - but in testing this still always happens before the onload code runs for the iframe/window we care about, so this should still work to initialize the extension back to disabled (and then have that stuff run after to potentially activiate it for those KR modules/tabs that should have that happen)
* in practice, what I have found is that as long as we are only looking at the readystatechange events for the topmost window/document/iframe then this will happen before the onload event below that fires when all the iframes have all been fully reloaded
*
* background: what we are trying to avoid is a situation where the top page loads and we send a message to initialize the extension to inactive, then we determine the extension should be enabled for this page next, then another iframe loads AFTERWARD and so we send another event to initialize the extension icon back to inactive (and this iframe may be routing.do, so it will not set the extension back to active - so we see yellow, flash of green, back to yellow for a page that should be active)
* by only sending the readystatechange events for just the topmost page/iframe we have found this to avoid that situation
*/
document.addEventListener('readystatechange', event => {
                                                                                console.group(`document.addEventListener('readystatechange'...`);
  if (window.parent === window.top) {
    chrome.runtime.sendMessage({setExtensionInactiveDisabled: true});
                                                                                console.log(`window.parent === window.top so send message to background.js to reset extension icon for this page back to inactive as an initial starting point`); (event.target ? console.log(`event.target: ${JSON.stringify(event.target)}`) : console.log(`event.target not found`) ); (event.target.readyState ? console.log(`event.target.readyState: ${JSON.stringify(event.target.readyState)}`): console.log(`event.target.readyState not found`) );
  }
                                                                                console.groupEnd();
});

/**
* This listener detects when KR pages are loaded or refreshed in a currently open browser tab, but specifically looking for when the page has totally/fully/completely loaded all resources including all the sub-iframes
* We send a message to background.js with info on the currently loaded KR module/tab so it can determine if this is one in our list of pages to enable the extension for and customize or not
*
* background: according to MDN this is equivalent to the extension chrome.webNavigation.onCompleted.addListener event which requires permission to see browsing history since its for all pages (https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webNavigation/onCompleted)*/
//all page resources fully loaded -
window.onload = (event) => {
                                                                                console.group(`window.onload = (event) fired based on detectActiveKrModuleTabContent loading/refreshing - so page is fully loaded - event details: ${JSON.stringify(event)}`);
  sendMessageToBackgroundProgramWithCurrentKualiFormActionUrl();
                                                                                console.groupEnd();
};


/*
 * ::Functions:: (in this case just a helper function to avoid repeating the same code in some of the above listeners)
 */


/**
* this helper function (called by the listeners above) looks in the currently loaded KR page for a "KualiForm" form and then looks for the action property/URL on that form
* we have found this is the most accurate way to determine which page is currently loaded (which we need to know to decide if we are currently on one of the KR pages/modules/tabs that the extension should be enabled on)
* basically, the Kuali URL often shows the wrong URL for the current page, such as showing awardContacts.do when we just left that page and are now on the awardHome.do page - the URL property of the kualiForm fortunately seems to be accurate though, so we are using that one to detect the current KR module/tab we are on
* so this is making sure the kualiForm html form is present on the current page and if so, sending a message back to background.js with that URL of the form (if there are multiple such as with certain KR pages with multiple iframes, sends each of them)
*/
function sendMessageToBackgroundProgramWithCurrentKualiFormActionUrl() {
  if (document.forms["KualiForm"] && document.forms["KualiForm"].action) {
                                                                                console.info(`chrome.runtime.onMessage.addListener|run only because hello message received by detectActiveKRModuleTabContentScript - sending document.forms["KualiForm"].action as message with theFormAction: ${document.forms["KualiForm"].action}`)
    chrome.runtime.sendMessage({theFormAction: `${document.forms["KualiForm"].action}`});
  }
                                                                                else {console.info(`chrome.runtime.onMessage.addListener|document.forms["KualiForm"].action was not found to exist in this load of detectActiveKRModuleTabContentScript (after receiving message from background.js on which KR (module/tab) form URL is currently loaded)`);}
}
