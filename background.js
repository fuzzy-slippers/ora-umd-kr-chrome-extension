// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
* @filedescription Initializes the extension's background page which keeps track of state info about the extension such as whether the user has clicked the extension off or on (if turned off we want it to stay off as we switch between tabs, pages, etc)
* This extension can/will load css or js to override parts of select Kuali Research pages that we have listed in the configSettings.js file so that we can hide specific form fields or prepopulate a form field with todays date, etc
* At a high level, the extension (via the manifest.json settings) adds a small amount of javascript (just listeners) only when the currently loaded page is part of Kuali Research - matches a (*.kuali.co/res/*|*.kuali.co/dashboard/*) url pattern.
* This works in two ways:
* When a new page is loaded/refreshed the listener is added to the KR pages to listen for the page being loaded/refreshed (but as noted, since this is only added to KR pages, only the loading/refreshing of KR pages kicks off this process).
* When the user switches between already open tabs or clicks on the extension icon the background.js listeners detect this and send a message to the listener on the KR page (again if its not a KR page then the listeners would not have been added and even if we send messages they are never received by any other type of non-KR page and therefore nothing happens)
*
* To give a high level overview of the coordination of the two messages sent when a page is refreshed/loaded here is a timeline of the events/messages:
* For new page loads/reloads we follow the following process flow:
* Detect that page is starting to load -> send message to background.js to initialize the extension icon back to inactive/disabled color -> Detect the page has completely finished loading including all iframes -> send a message to background.js with the currently loaded page info so it can determine if the extension should be switched on for the current page and also which CSS/JS to load to customize the current KR tab/module page, changing the extension icon to indicate its active
*
* for swtiching between existing open tabs without refreshing we follow the following process flow:
* Detect that user changed tabs via background.js listener -> send message to KR page to ask for the current tabs KR module/tab, if not a KR page this message will go nowhere -> KR page sends back the current URL (from KualiForm action URL property) of the currently loaded tab -> background.js then checks if that KR page is in our list of ones to customize and if so, load the css and js we have for that specific KR module/tab and turn the extension icon to the active color/icon
*
* if the background.js determines the extension icon was clicked we follow the following process flow:
* detect that the user clicked on the extension icon to toggle the extension on off via background.js -> if the extension state is off turn it on, if on turn it off and then if it was switched to on send a message to the KR page to ask for the KR module/tab currently loaded -> the KR page sends back the URL of the KualiForm form action URL property (if current page is not KR page there will be no listener to get the message) -> the background.js checks if the current KR module/tab is in our
* list of the current modules/tabs for the extension to customize, if so then it loads the css/js to override on the current KR page and turns the extension icon to active to show the current page was modified with the customization by the extension
*
* the above process will repeat for each new page refresh/load or any time you switch tabs or click on the extension icon
*
* note: using the content script (detectActiveKRModuleTabContentScript.js) listener for window.onload events
* and have that pass a message to let the background.js know when the page has been updated worked even for KR redirects which the chrome.tabs.onUpdated.addListener does not detect the final reload for
* (so otherwise we cant do it without the webnavigation API which requires priviledges to track URLs which we don't want to do)
*/

/*
 * Note: we are importing the object "configSettings" with properties file like configs from the file configSettings.js, which is imported prior to this background.js file in the manifest.json, so in effect all the variables in that file have already been loaded and are accessible here (as if they appeared above in this file)
 */

// making the choice to store state about the extension (like if it's enabled/disabled by the user) in a global object/variable in background.js - later we may decide to use the asyncronous storage API but for now the performance seems to work well enough and it avoids needing to make much of the code asynchronous as a result of incorporating the chrome storage API
// initially default the extension to on/enabled (extensionEnabled property) since the extension should be active when it is first installed or the chrome browser is restarted
// also initially default the cache of the last icon image name/state to an empty name because when the extension first starts up there is no cached last icon - nothing would be cached initially
var extensionBackgroundStateObj = {
  extensionEnabled: true,
  cacheLastIconImgName: ""
};


/*
* ::Listeners::
*/

/**
 * add a listener that when the button is clicked toggles the extension off and the second time on, then off, etc (we call code each time that will figure out the right icon color to display based on the enabled/disabled status and which page we are currently on)
 */
chrome.browserAction.onClicked.addListener(function(tab) {
                                                                                console.log(`click on icon detected via chrome.browserAction.onClicked.addListener`);
 toggleExtensionOnOff();
 initiallySetIconInactiveOrDisabledThenEnableOnlyIfSpecificKRModuleTab();
});

/**
 * add a listener for switching between tabs - we basically run the same function/code that we do when the page is refreshed - however this will likely just have the effect of determining the correct icon/color to load as a refresh is typically needed for css changes to take effect - maybe JS changes would in the right circumstances, since we do caching for icons that are not changing, hopefully the performance shouldn't be too bad
 */
 chrome.tabs.onActivated.addListener(function(activeInfo) {
                                                                                console.log(`inside chrome.tabs.onActivated.addListener (called when switching tabs)`);
   initiallySetIconInactiveOrDisabledThenEnableOnlyIfSpecificKRModuleTab();
});

/**
 * listener for any time the background.js (main extension) recieves a message from a content script, which in our case is only the detectActiveKRModuleTabContentScript.js
 * there are a few different messages the background.js program might receive:
 * 1) a message indicating the extension icon should be initialized to the inactive/disabled state
 * 2) a message with the url of the currently loaded KR page (if we get this message we know its a KR page) that we should use to determine based on this URL if we should activate the extension icon and override css/js for this KR module/tab
 */
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
                                                                                console.group("background.js chrome.runtime.onMessage.addListener");
  //Look for messages that contain a "setExtensionInactiveDisabled" property, this message is sent when a tab is loaded/reloaded to indicate the extension should be initialized back to inactive for the current page until later it's determined if it should be activated for this particular KR tab/module (after the below message comes through)
  if (request.setExtensionInactiveDisabled) {
                                                                                console.log(`message came in with request.setExtensionInactiveDisabled property, so setting the current pages extension icon, etc back to inactive/disabled to initialize it before we determine if it should be set to active`);
    setIconInactiveOrDisabled();
  }
  //look for messages that contain a "theFormAction" property, which indicate the message is coming from detectActiveKRModuleTabContentScript.js specifically - also make sure a valid form action URL was sent to us (not a blank string/null) before proceeding to try to parse the URL
  else if (request.theFormAction) {
    ifAlreadyKnowCurrentFormUrlUpdateCurrentTabIfKRAndExtensionEnabled(request.theFormAction);
                                                                                console.log(`message received with request.theFormAction via chrome.runtime.onMessage.addListener (will run checkIfCurrentPageInListOfKRModulesTabs on it): ${JSON.stringify(request)}`);
  }

                                                                                console.groupEnd();
});

/*
 * ::Functions::
 */

 /**
  * A high level function that 1) defaults the icon to disabled/inactive initial as a base color/state then 2) checks if the extension should be enabled
  */
   function initiallySetIconInactiveOrDisabledThenEnableOnlyIfSpecificKRModuleTab() {
     //default the icon to disabled or inactive depending on whether the extension is currenly on or off (later if the page one of the ones to be modified, the icon will be changed to enabled)
     setIconInactiveOrDisabled();
     //start the process to determine if the extension should be turned on (check that extension is enabled, that we are on a KR page and that the current KR module/tab being displayed is one in the list that should have the exention enabled)
     //updatePageIfExtensionEnabled();
     updateCurrentTabBySendingMsgIfKRAndExtensionEnabled();
   }

/**
* helps determine which module/tab in KR the user is currently viewing in the active browser tab in Google chrome (since we don't want to request the permisison to view the URLs of all the pages a user is using for security reasons, doing it this round about way with messages and a contentscript that is only loaded by manifest.js for KR URLs only - this way we can send a message and if the listener has been added via that contentscript we know we are on a KR page and if not we its not)
*initiates a message to detectActiveKRModuleTabContentScript.js to instruct it to do the same thing as when a new page is loaded...send the message with the current KR module/tab action name to kick off the events that determine if this is a KR page that should have the extension activated...
*when this tab is not KR (yahoo.com, etc) then the content script would not have been loaded since it doesnt match the URL pattern specified in manifest.json and so our message just wont get picked up and will die, just what we want for non-KR pages
*the tab number is required by the background.js sendmessage - so we have to do the below step to figure out which is the the current/active tab the person is viewing
*/
function initiateMessagePassingToFigureOutWhichKRModuleTabWeAreOn() {
                                                                                console.log(`calledinitiateMessagePassingToFigureOutWhichKRModuleTabWeAreOn`);
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {msgForDetectActiveKRModuleTabContentScript: "please send KR kualiform action URL"}
    );
  });
}

/**
 * based on whether the extension is currently enabled (using flag), either set to the inactive color if clicked on or the disabled color if clicked off (turning it green will happen at a later stage right along with the code to actually modify the page, if thats the case)
 */
function setIconInactiveOrDisabled() {
  if (getExtensionCurrentlyTurnedOn()){
                                                                                console.log(`setIconInactiveOrDisabled called and extensionEnabled=true so setting icon color to yellow via call to setExtensionIconInactiveColor func`);
    setExtensionIconInactiveColor();
  }
  else{
                                                                                console.log(`extensionEnabled=false so setting icon color to dark gray`);
    setExtensionIconDisabledColor();
  }
}

/**
 * wait until the current page in the browser is fully loaded before going on to the next step (of sending a message to the content script to check the form action URL of the currently loaded page)
 * had founds that without this step, the time and money first tab for example was sending back the RouteLog.do URL instead of the timeAndMoney.do URL which is the one we care about and want to check - unfortunately, it looks like without this, we get back responses from the KualiForm iframes that we dont want but not the one we do want (timeAndMoney.do) presumably because that iframe hasnt finished loading yet...waiting until the page fully loads before sending the message to ask for
 * that info from the detectActiveKRModuleTabContentScript.js listeners prevents that issue
 * instead of calling initiallySetIconInactiveOrDisabledThenEnableOnlyIfSpecificKRModuleTab() which will be changing the icon color back to yellow/gray with each iframe in the KR page (sometimes the last one to send a message is a routing iframe that would trigger the extension to show as off), call checkIfCurrentPageInListOfKRModulesTabs as that skips the step of determining if the icon needs to be turned inactive/disabled and goes right to determining if it needs to be enabled (if one
 * of the four iframes in a page has a URL that indicates we are on a KR module/tab that should enable the extension and show the active icon even if other iframes on the current KR page have other random names like "RouteLog.do")
 */
function ifAlreadyKnowCurrentFormUrlUpdateCurrentTabIfKRAndExtensionEnabled(formActionUrlFromMsg) {
  if (getExtensionCurrentlyTurnedOn()) {
    checkIfCurrentPageInListOfKRModulesTabs(formActionUrlFromMsg);
                                                                                console.log(`got message back to background.js and since extension currently showing enabled will next call checkIfCurrentPageInListOfKRModulesTabs(onloadFormActionFromMsg)`);
  }
                                                                                else {console.log(`got message back to background.js that page BUT since extension looks to be currently DISABLED will not check if this is a KR module/tab that we might enabled the extension for`);}
}

/**
 * wait until the current page in the browser is fully loaded before going on to the next step (of sending a message to the content script to check the form action URL of the currently loaded page)
 * had founds that without this step, the time and money first tab for example was sending back the RouteLog.do URL instead of the timeAndMoney.do URL which is the one we care about and want to check - unfortunately, it looks like without this, we get back responses from the KualiForm iframes that we dont want but not the one we do want (timeAndMoney.do) presumably because that iframe hasnt finished loading yet...waiting until the page fully loads before sending the message to ask for
 * that info from the detectActiveKRModuleTabContentScript.js listeners prevents that issue
 */
function updateCurrentTabBySendingMsgIfKRAndExtensionEnabled() {
  chrome.tabs.query({
  "active":        true,
  "currentWindow": true,
  "status":        "complete",
  "windowType":    "normal"
  }, function(tabs) {
   //if the url pattern doesnt match KR as specified in the url property above, this function will run but with an empty array, so don't do anything for these pages - this makes sure it returned something when querying for the current active tab
   if (tabs && tabs[0]) {
     updatePageBySendingMsgIfExtensionEnabled();
   }
  });
}

/**
 * check if the extension is currently on (using global flag keeping history of on/off),
 * if so kick off the code to try to determine if this is a KR page matching a tab/module we should enable the extension/icon/customizations on
 * if extension determined to be clicked off by the user, dont need to do anything because the icon should already be set disabled or inactive initially before we get to this stage
 */
function updatePageBySendingMsgIfExtensionEnabled() {
  if (getExtensionCurrentlyTurnedOn()){
                                                                                console.log(`called updatePageBySendingMsgIfExtensionEnabled and determined extensionEnabled=true`);
    initiateMessagePassingToFigureOutWhichKRModuleTabWeAreOn();
  }
}

/*
 * change the extension icon to green to indicate its active on the current page
 * uses caching to avoid updating the image if it's showing the right icon already
 */
function setExtensionIconActiveColor() {
                                                                                console.log(`setExtensionIconActiveColor() called...`);
  //only update the icon image if it isn't already showing the active image currently (no reason to use the resources to update the icon image if there will be no change)
  if (getCachedLastIconImgName() !== configSettings.allIconImages.activeImgName) {
                                                                                console.log(`setExtensionIconActiveColor() called, about to set icon to green - configSettings.allIconImages.activeImgName: ${configSettings.allIconImages.activeImgName}`);
    chrome.browserAction.setIcon({path: configSettings.allIconImages.activeImgName});
    //update the cache to reflect the icon image name that was just set/updated
    setCachedLastIconImgName(configSettings.allIconImages.activeImgName);
  }
}

/*
 * change the extension icon to yellow to indicate we are on a KR page, but it's not doing anything to the current page
 * uses caching to avoid updating the image if it's showing the right icon already
 */
function setExtensionIconInactiveColor() {
                                                                                console.log(`setExtensionIconInctiveColor() called...`);
  //only update the icon image if it isn't already showing the inactive image currently (no reason to use the resources to update the icon image if there will be no change)
  if (getCachedLastIconImgName() !== configSettings.allIconImages.inactiveImgName) {
                                                                                console.log(`about to set icon to yellow (inside setExtensionIconInactiveColor) - configSettings.allIconImages.inactiveImgName: ${configSettings.allIconImages.inactiveImgName}`);
    chrome.browserAction.setIcon({path: configSettings.allIconImages.inactiveImgName});
    //update the cache to reflect the icon image name that was just set/updated
    setCachedLastIconImgName(configSettings.allIconImages.inactiveImgName);
  }
}

/*
 * change the extension icon to dark to indicate we are on a non-KR page or it's been disabled
 * uses caching to avoid updating the image if it's showing the right icon already
 * also pops up a message to the user when the plugin is initially disabled to remind them not to refresh the browser but go to a new tab if they want the extension changes to be fully disabled
 */
function setExtensionIconDisabledColor() {
                                                                                console.log(`setExtensionIconDisabledColor() called...`);
  //only update the icon image if it isn't already showing the disabled image currently (no reason to use the resources to update the icon image if there will be no change)
  if (getCachedLastIconImgName() !== configSettings.allIconImages.disabledImgName) {
                                                                                console.log(`setExtensionIconDisabledColor() called, about to set icon to dark gray - configSettings.allIconImages.disabledImgName: ${configSettings.allIconImages.disabledImgName}`);
    chrome.browserAction.setIcon({path: configSettings.allIconImages.disabledImgName});
    //update the cache to reflect the icon image name that was just set/updated
    setCachedLastIconImgName(configSettings.allIconImages.disabledImgName);
    //pop up a message when the user first clicks to disable the extension to let them know they wont see all changes until they switch KR tabs (which in terms of this function logic cooincides with when the icon cache needs to be updated to the disabled icon img - if it already shows disabled, do not pop up msg)
    popMessageAboutChangingTabsForExtensionChangesToBeRemoved();
  }
}

/**
* check via a regex what the current page name is (i.e. "awardHome.do") and check if it is one that is in the list of KR pages we plan to modify
* (we are using data from the external file (kind of like json config file) configSettings.js to load in which KR tabs/modules should be customized and the css/js files to use)
*
*/
function checkIfCurrentPageInListOfKRModulesTabs(actionStr) {
                                                                                console.log(`checkIfCurrentPageInListOfKRModulesTabs called with actionStr: ${actionStr}`);
  // use the configSettings.js data/listing (imported in manifest.json) of KR Modules and Tabs that we want to "turn on" this extension automatically when we go to that page - decided it would be cleaner to keep this in a separate file so we could easily add KR modules/tabs in the future without having to change anything else in the code
  //use a js regular expression to pull out just the .do page name from the KualiForms action URL, for example awardHome.do or awardContacts.do
  const pullOutPageNameWithDoFromActionUrlRegex = new RegExp('\/([a-zA-Z]{2,100}.do)', 'ig');
  //no advantages in looking for multiple matches, there should be only one [htmlpage].do in the action URL so using exec
  const regexFirstResultArr = pullOutPageNameWithDoFromActionUrlRegex.exec(actionStr);
  //since we don't want the match to include the slash before it, just for example "awardHome.do", we are using the array position 1 always, which corresponds to just the part in the regex in the parenthese, which should be the page name .do without the preceeding slash
  if (regexFirstResultArr !== null  && regexFirstResultArr[1]) {
    const doFileName = regexFirstResultArr[1];
                                                                                console.log(`regexFirstResultArr[1] found something, it is: ${JSON.stringify(regexFirstResultArr[1])}`);
    //because the properties on the configSettings.modulesTabsInKRToActivateExtension object are "awardHome.do", "awardContacts.do", etc we can just check if the current page name matches any of the properties defined since these would be the pages we want to load css, js for, otherwise it must not be one of them to do something for
    if (configSettings.modulesTabsInKRToActivateExtension[doFileName]) {
                                                                                console.log(`configSettings.modulesTabsInKRToActivateExtension[doFileName].cssFile: ${configSettings.modulesTabsInKRToActivateExtension[doFileName].cssFile}`); console.log(`configSettings.modulesTabsInKRToActivateExtension[doFileName].jsFile: ${configSettings.modulesTabsInKRToActivateExtension[doFileName].jsFile}`);
      makeCustomizationsToCurrentPage(configSettings.modulesTabsInKRToActivateExtension[doFileName].cssFile, configSettings.modulesTabsInKRToActivateExtension[doFileName].jsFile);
    }
  }
}

/**
* makes the customizations specific to the currently loaded tab (using the passed in css and js files/paths to use) as well as change the icon to indicate the extension is actively making changes
* overlay the css and run the custom javascript to modify the current page (if the form elements to change, etc are present)
* we want to change the icon to show active right before we actually load the css and js so that we can be sure that we aren't showing someone that the extension is active when nothing is being done or showing them its not active when something is actually being customized on the current page - for this reason, this function is the only place in the extension code that will both 1) make customizations to the current page or 2) make the icon show the active color (initially decided on green)
*/
function makeCustomizationsToCurrentPage(relativeCssFilePath, relativeJsFilePath) {
                                                                                console.log(`makeCustomizationsToCurrentPage`);
  setExtensionIconActiveColor();
  if (relativeCssFilePath) {
    chrome.tabs.insertCSS({file: relativeCssFilePath, allFrames: true});
                                                                                console.log(`called chrome.tabs.insertCSS({file: ${relativeCssFilePath}, allFrames: true})`);
  }
  if (relativeJsFilePath) {
    chrome.tabs.executeScript({file: relativeJsFilePath, allFrames: true});
                                                                                console.log(`called chrome.tabs.executeScript({file: ${relativeJsFilePath}, allFrames: true})`);
  }
}

/**
 * getter for a flag to keep track of whether the extension is currently enabled or disabled by the user (clicking on the extension icon to toggle it on/off) - we are currently using a global state object (within background.js) to store extension state, but in the future we may decide to move over to the async storage API, although this introduces complexity and may not be warrented for background.js state
 * specifically, it returns true if the extension is currently turned on by the user or false if the extension is currently turned off by the user
 */
 function getExtensionCurrentlyTurnedOn() {
   return extensionBackgroundStateObj.extensionEnabled;
 }

/**
* setter for a flag to keep track of whether the extension is currently enabled or disabled by the user (clicking on the extension icon to toggle it on/off) - - we are currently using a global state object (within background.js) to store extension state, but in the future we may decide to move over to the async storage API, although this introduces complexity and may not be warrented for background.js state
*/
function setExtensionCurrentlyTurnedOn(isExtensionNowEnabled) {
  extensionBackgroundStateObj.extensionEnabled = isExtensionNowEnabled;
}

/**
* getter for a flag to cache the icon (image name) that is currently set - this is useful because we don't want to go through the presumably slow operation of updating the icon image to the same image that it is already showing, since chrome does not appear to have a way to check the current icon image before updating it, we are doing our own caching
*/
function getCachedLastIconImgName() {
 return extensionBackgroundStateObj.cacheLastIconImgName;
}

/**
* setter to update the cache with the image name for the icon that is currently being set - this is useful because we don't want to go through the presumably slow operation of updating the icon image to the same image that it is already showing, since chrome does not appear to have a way to check the current icon image before updating it, we are doing our own caching
*/
function setCachedLastIconImgName(newIconImgName) {
  extensionBackgroundStateObj.cacheLastIconImgName = newIconImgName;
}

/**
* Toggle the extension off and on when the user clicks on the itcon - if it was on it will be turned off, if it is off it will be turned on (updating the parsisted state of the extension)
* reference for strategy of keeping state in flag that is flipped on/off: https://stackoverflow.com/questions/16136275/how-to-make-on-off-buttons-icons-for-a-chrome-extension
*/
function toggleExtensionOnOff() {
  //set it to the NOT/opposite of whet the getter currently returns as the current state - when someone clicks the extension icon
  setExtensionCurrentlyTurnedOn(!getExtensionCurrentlyTurnedOn());
}

/**
 * Pops up a message to the user to let them know the extension changes wont be fully disabled until the go to a new tab (and remind them not to refresh)
 */
function popMessageAboutChangingTabsForExtensionChangesToBeRemoved() {
 alert(configSettings.userMessages.extensionDisabledPopUpMsg);
}
