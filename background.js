// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
* @filedescription Initializes the extension's background page.
* executes the js code to update/override the CSS of the KR page
*/

/*
 * Note: we are importing the object "configSettings" with properties file like configs from the file configSettings.js, which is imported prior to this background.js file in the manifest.json, so in effect all the variables in that file have already been loaded and are accessible here (as if they appeared above in this file)
 */

// making the choice to store state about the extension (like if it's enabled/disabled by the user) in a global object/variable in background.js - later we may decide to use the asyncronous storage API but for now the performance seems to work well enough and it avoids needing to make much of the code asynchronous as a result of incorporating the chrome storage API
//initially default the extension to on/enabled (extensionEnabled property) since the extension should be active when it is first installed or the chrome browser is restarted
//also initially default the cache of the last icon image name/state to an empty name because when the extension first starts up there is no cached last icon - nothing would be cached initially
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
 //setIconInactiveOrDisabled();
 //altVersionInitiallySetIconInactiveOrDisabledThenEnableOnlyIfSpecifiedKRModuleTab();
 initiallySetIconInactiveOrDisabledThenEnableOnlyIfSpecificKRModuleTab();
});




/**
 * add a listener for switching between tabs - we basically run the same function/code that we do when the page is refreshed - however this will likely just have the effect of determining the correct icon/color to load as a refresh is typically needed for css changes to take effect - maybe JS changes would in the right circumstances, since we do caching for icons that are not changing, hopefully the performance shouldn't be too bad
 */
 chrome.tabs.onActivated.addListener(function(activeInfo) {
   console.log(`inside chrome.tabs.onActivated.addListener (called when switching tabs)`);
   //altVersionInitiallySetIconInactiveOrDisabledThenEnableOnlyIfSpecifiedKRModuleTab();
   initiallySetIconInactiveOrDisabledThenEnableOnlyIfSpecificKRModuleTab();
});


/* may not need if things are kicked off by the detectActiveKRModuleTabContentScript.js scripts
*/
/**
 * add a listener for each reload of the page (as the extension will need to run on each reload)
 * each time we load/reload any URLs it calls the function that determines the appropriate icon color to show for this page and customize the page if its determined to be one of the KR modules/tabs in our list to customize
 * tested using chrome.tabs.onUpdated.addListener instead so that we could avoid the webNavigation permission entirely but it wasn't handling redirect well in my testing, such as after a document is submitted (it was detecting just the form action URL from the interim page and not the final page) so webnavidation oncompleted which supposedly only fires when the page is totally done refreshing seems to be more reliable
 */
// chrome.webNavigation.onCompleted.addListener(function(tab) {
//   // initiallySetIconInactiveOrDisabledThenEnableOnlyIfSpecificKRModuleTab(["https://*.kuali.co/res/*","https://*.kuali.co/dashboard/*"]);
//     setIconInactiveOrDisabled();
//
// }, {});


// may not need now that we are checking for the readystatechange event for the top level window/iframe and sending an initialize page extension to disabled initially message (which replaces this for tab load/refreshes)
// // new URL loaded in either new or existing tab - because this often fires after the onload in detectActiveKRModuleTabContentScript we need both (will try to prevent both happening in that scenario on the detectActiveKRModuleTabContentScript side)
// chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
//
//   console.log(`chrome.tabs.onUpdated.addListener (new url loaded new or existing tab reloaded) - tab info: ${JSON.stringify(tab)}`);
//   initiallySetIconInactiveOrDisabledThenEnableOnlyIfSpecificKRModuleTab();
//
//  });



/////// may be able to remove this listener if we do 2-way communication with detectActiveKRModuleTabContentScript.js when we first send the message*/
// listen for messages from content scripts
// the message
// currently we are listening for a specific "theFormAction" property on the request that should be coming from the detectActiveKRModuleTabContentScript.js script
// it should be simpy sending along the KualiForm <form> action property/url on the currently loaded page, so we can figure out which KR module/tab such as the Award Module Special Review tab is currently loaded in the active tab in the browser
// we will need this info to decide whether to have the extension update the current KR page or now (if its one of the KR pages we have decided to change/update)

// chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
//   console.log(`chrome.runtime.onMessage.addListener returned some message`);
//   //check the type of message received based on the response property - also make sure a valid form action URL was sent to us (not a blank string/null) before proceeding
//   if (request.theFormAction) {
//     const formActionFromMsg = request.theFormAction;
//     checkIfCurrentPageInListOfKRModulesTabs(formActionFromMsg);
//   }
// });



// /**
//  * add a listener for whenever the user switches tabs (clicking between already open tabs in the browser is not the same listener as loading a page and requires it's own listener)
//  * each time we switch tabs it calls the function that determines the appropriate icon color to show for this page and customize the page if its determined to be one of the KR modules/tabs in our list to customize
//  */
// chrome.tabs.onActivated.addListener(function(activeInfo) {
//   initiallySetIconInactiveOrDisabledThenEnableOnlyIfSpecificKRModuleTab(["https://*.kuali.co/res/*","https://*.kuali.co/dashboard/*"]);
// });


/**
 * listener to handle situation where we are getting multiple responses back from different iframes on the KR page that have each loaded the detectActiveKRModuleTabContentScript listener and are each sending back messages with form action URL info (2 way chrome message passing used in initiateMessagePassingToFigureOutWhichKRModuleTabWeAreOn() doesnt handle when there are multiple responses coming back)
 * in addition to the initiateMessagePassingToFigureOutWhichKRModuleTabWeAreOn() function below which sends a 2-way request to ask for the form action URL of the currently loaded KR page and gets a response back from the contentScript, because KR pages can have multiple iframes, for example one KR "page" can have 3 KualiForms loading each with a different URL and only one is the frame that relates to the actual page and because Chromes 2 way message/response system only picks up the first
 * response and discards the other 2+, we need this listener to be actively listening for messages from the content script with "theFormAction" properties so that if we get other messages that the 2 way communication would have discarded, for example saw this with the TimeAndMoney.do URL where the Routing.do was coming back as the first response but then one of the others is TimeAndMoney.do that we are actually looking for
 * this listener will check all three and check if ANY of the three are URLs that should flag the current page as active (it would have already been set inactive earlier before this step runs, so then if any of the three flag it active, it should stay active for this page load)
 */
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
                                                    console.group("background.js chrome.runtime.onMessage.addListener");
                                                      console.log(`background.js chrome.runtime.onMessage.addListener received a message`);
                                                      console.log(`background.js chrome.runtime.onMessage.addListener received request: ${JSON.stringify(request)} sender: ${JSON.stringify(sender)} sendResponse: ${JSON.stringify(sendResponse)}`);

  // //filter out messages from KR tabs/iframes that are "loading", chrome will send messages when tabs/iframes are still loading, we don't care about these interim messages
  // if (sender.tab.status === "complete") {

  /**
   * to try to get around chrome.tabs.onUpdated.addListener above not working for KR page redirects,
   * having the detectActiveKRModuleTabContentScript.js have a listener for window.onload events
   * and have that pass a message to let the background.js know when the page has been updated WHEN
   * A REDIRECT HAPPENED! (otherwise we cant do it without the webnavigation API which requires
   * priviledges to track URLs which we don't want to do)
   */
  //look for messages that contain a "theFormAction" property, which indicate the message is coming from detectActiveKRModuleTabContentScript.js specifically - also make sure a valid form action URL was sent to us (not a blank string/null) before proceeding to try to parse the URL
  if (request.theFormAction) {
                                                    console.log(`message received with request.theFormAction via chrome.runtime.onMessage.addListener (will run checkIfCurrentPageInListOfKRModulesTabs on it): ${JSON.stringify(request)}`);
    const formActionFromMsg = request.theFormAction;
    //instead of calling initiallySetIconInactiveOrDisabledThenEnableOnlyIfSpecificKRModuleTab() which will be changing the icon color back to yellow/gray with each iframe in the KR page (sometimes the last one to send a message is a routing iframe that would trigger the extension to show as off), call checkIfCurrentPageInListOfKRModulesTabs as that skips the step of determining if the icon needs to be turned inactive/disabled and goes right to determining if it needs to be enabled (if one
    //of the four iframes in a page has a URL that indicates we are on a KR module/tab that should enable the extension and show the active icon even if other iframes on the current KR page have other random names like "RouteLog.do")
    if (getExtensionCurrentlyTurnedOn()) {
      checkIfCurrentPageInListOfKRModulesTabs(formActionFromMsg);
                                                                        console.log(`got message back to background.js and since extension currently showing enabled will next call checkIfCurrentPageInListOfKRModulesTabs(onloadFormActionFromMsg)`);
    }
    else {
                                                                        console.log(`got message back to background.js that page BUT since extension looks to be currently DISABLED will not check if this is a KR module/tab that we might enabled the extension for`);
    }
    
  }
  // }
  // else {
  //   console.log(`status showing as not complete for request: ${JSON.stringify(request)} sender: ${JSON.stringify(sender)} sendResponse: ${JSON.stringify(sendResponse)}`);
  // }


  //Look for messages that contain a "setExtensionInactiveDisabled" property, this message is sent when a tab is loaded/reloaded to indicate the extension should be initialized back to inactive for the current page until later it's determined if it should be activated for this particular KR tab/module (after the below message comes through)
  if (request.setExtensionInactiveDisabled) {
                                                    console.log(`message came in with request.setExtensionInactiveDisabled property, so setting the current pages extension icon, etc back to inactive/disabled to initialize it before we determine if it should be set to active`);
    setIconInactiveOrDisabled();
  }

  // /**
  //  * to try to get around chrome.tabs.onUpdated.addListener above not working for KR page redirects,
  //  * having the detectActiveKRModuleTabContentScript.js have a listener for window.onload events
  //  * and have that pass a message to let the background.js know when the page has been updated WHEN
  //  * A REDIRECT HAPPENED! (otherwise we cant do it without the webnavigation API which requires
  //  * priviledges to track URLs which we don't want to do)
  //  */
  // if (request.onloadTheFormAction) {
  //                     console.log(`status both complete or loading: message from detectActiveKRModuleTabContentScript.js detected by window.onload (will run checkIfCurrentPageInListOfKRModulesTabs on it): ${JSON.stringify(request)}`);
  //   const onloadFormActionFromMsg = request.onloadTheFormAction;
  //   //instead of calling initiallySetIconInactiveOrDisabledThenEnableOnlyIfSpecificKRModuleTab() which will be changing the icon color back to yellow/gray with each iframe in the KR page (sometimes the last one to send a message is a routing iframe that would trigger the extension to show as off), call checkIfCurrentPageInListOfKRModulesTabs as that skips the step of determining if the icon needs to be turned inactive/disabled and goes right to determining if it needs to be enabled (if one of   //the four iframes in a page has a URL that indicates we are on a KR module/tab that should enable the extension and show the active icon even if other iframes on the current KR page have other random names like "RouteLog.do")
  // //TODO try checking if exention is enabled...or try to find a function that does this without causing everything not to work
  //   if (getExtensionCurrentlyTurnedOn()) {
  //     checkIfCurrentPageInListOfKRModulesTabs(onloadFormActionFromMsg);
  //                                                                       console.log(`got message back to background.js that page was refreshed/loaded and since extension currently showing enabled will next call checkIfCurrentPageInListOfKRModulesTabs(onloadFormActionFromMsg)`);
  //   }
  //   else {
  //                                                                       console.log(`got message back to background.js that page was refreshed/loaded but since extension looks to be currently DISABLED will not check if this is a KR module/tab that we might enabled the extension for`);
  //   }
  // }
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
     updateCurrentTabIfKRAndExtensionEnabled();
   }

  //!!!given issues with clicking extension off still updating css etc regardless here is what I think would be needed:
  // 1. may not need the updateCurrentTabIfKRAndExtensionEnabled step since im not sure we need to check the url pattern since the manifest is doing it and we arent getting URL data with the permissions we have set right now anyway
  // 2. but we do need to use updatePageIfExtensionEnabled(); function and then
  // 3. change initiateMessagePassingToFigureOutWhichKRModuleTabWeAreOn() to do the below message sending the new way...versus just loading the detectActiveKRModuleTabContentScript.js script...this also means we can get rid of the code that just send the form action back when that js file loaded and instead ONLY have a listener in the detectActiveKRModuleTabContentScript.js file to send the form action URL only when it recieves a message
  // function altVersionInitiallySetIconInactiveOrDisabledThenEnableOnlyIfSpecifiedKRModuleTab() {
  //   setIconInactiveOrDisabled();
  //   initiateMessagePassingToFigureOutWhichKRModuleTabWeAreOn();
  // }


/**
* helps determine which module/tab in KR the user is currently viewing in the active browser tab in Google chrome (since we don't want to request the permisison to view the URLs of all the pages a user is using for security reasons, doing it this round about way with messages and a contentscript that is only loaded by manifest.js for KR URLs only - this way we can send a message and if the listener has been added via that contentscript we know we are on a KR page and if not we its not)
*initiates a message to detectActiveKRModuleTabContentScript.js to instruct it to do the same thing as when a new page is loaded...send the message with the current KR module/tab action name to kick off the events that determine if this is a KR page that should have the extension activated...
*when this tab is not KR (yahoo.com, etc) then the content script would not have been loaded since it doesnt match the URL pattern specified in manifest.json and so our message just wont get picked up and will die, just what we want for non-KR pages
*the tab number is required by the background.js sendmessage - so we have to do the below step to figure out which is the the current/active tab the person is viewing
*/
function initiateMessagePassingToFigureOutWhichKRModuleTabWeAreOn() {
                                                                      console.log(`calledinitiateMessagePassingToFigureOutWhichKRModuleTabWeAreOn`);
  // //now that we know we are on a KR page, call the content script that will detect the KR module and tab selected by checking the KualiForm action URL/value (will have to be passed back as a message)
  // chrome.tabs.executeScript({file: "detectActiveKRModuleTabContentScript.js", allFrames: true});

  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {msgForDetectActiveKRModuleTabContentScript: "please send KR kualiform action URL"}


    // , function(response) {
    //   //chrome requires that we check that an error did not happen sending this type of message, so we have to check for the chrome.runtime.lastError property or else it throws a Unchecked runtime.lastError error (I think they are trying to be helpful making sure your program is taking that situation into account, in our case we don't care because if the detectActiveKRModuleTabContentScript.js doesn't exist it just means we are not currently looking at a KR page
    //   //this is how we are telling if we are currently on a KR page because the detectActiveKRModuleTabContentScript.js listener would have been added
    //   if (chrome.runtime.lastError) {
    //     console.info(`message to the detectActiveKRModuleTabContentScript.js listener added to the current browser tab did not go through, probably because its a non-KR page and therefore did not match the URL rules to allow a contentscript to be loaded - this is what we want as this is how we are determining if its a non KR page and we can ignore it, chrome.runtime.lastError shows: ${JSON.stringify(chrome.runtime.lastError)}`);
    //   }
    //   else {
    //     //otherwise message looks like it made it to the detectActiveKRModuleTabContentScript.js listener without error
    //     if (response && response.theFormAction) {
    //         console.log(`response (second half of 2-way) back from detectActiveKRModuleTabContentScript.js to background.js: ${JSON.stringify(response)}`);
    //         const formActionFromMsg = response.theFormAction;
    //         checkIfCurrentPageInListOfKRModulesTabs(formActionFromMsg);
    //     }
    //   }
    // }


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
 */
function updateCurrentTabIfKRAndExtensionEnabled() {
  chrome.tabs.query({
  "active":        true,
  "currentWindow": true,
  "status":        "complete",
  "windowType":    "normal"
  }, function(tabs) {
   //if the url pattern doesnt match KR as specified in the url property above, this function will run but with an empty array, so don't do anything for these pages - this makes sure it returned something when querying for the current active tab
   if (tabs && tabs[0]) {
     updatePageIfExtensionEnabled();
   }
  });
}


/**
 * check if the extension is currently on (using global flag keeping history of on/off),
 * if so kick off the code to try to determine if this is a KR page matching a tab/module we should enable the extension/icon/customizations on
 * if extension determined to be clicked off by the user, dont need to do anything because the icon should already be set disabled or inactive initially before we get to this stage
 */
function updatePageIfExtensionEnabled() {
  if (getExtensionCurrentlyTurnedOn()){
                                                                      console.log(`called updatePageIfExtensionEnabled and determined extensionEnabled=true`);
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
                                                                console.log(`configSettings.modulesTabsInKRToActivateExtension[doFileName].cssFile: ${configSettings.modulesTabsInKRToActivateExtension[doFileName].cssFile}`);
                                                                console.log(`configSettings.modulesTabsInKRToActivateExtension[doFileName].jsFile: ${configSettings.modulesTabsInKRToActivateExtension[doFileName].jsFile}`);
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
