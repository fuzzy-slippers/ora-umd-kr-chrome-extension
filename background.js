// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
* @filedescription Initializes the extension's background page.
* executes the js code to update/override the CSS of the KR page
*/


// making the choice to store state about the extension (like if it's enabled/disabled by the user) in a global object/variable in background.js - later we may decide to use the asyncronous storage API but for now the performance seems to work well enough and it avoids needing to make much of the code asynchronous as a result of incorporating the chrome storage API
//we want to initially default the extension to on/enabled (extensionEnabled property) since the extension should be active when it is first installed or the chrome browser is restarted
var extensionBackgroundStateObj = {
  extensionEnabled: true
};

//var extensionEnabled = true;

/*
* ::Listeners::
*/

/**
 * add a listener that when the button is clicked toggles the extension off and the second time on, then off, etc (we call code each time that will figure out the right icon color to display based on the enabled/disabled status and which page we are currently on)
 */
chrome.browserAction.onClicked.addListener(function(tab) {
                                                                      console.log(`click on icon detected via chrome.browserAction.onClicked.addListener`);
 toggleExtensionOnOff();
 initiallySetIconInactiveOrDisabledThenEnableOnlyIfSpecificKRModuleTab(["https://*.kuali.co/res/*","https://*.kuali.co/dashboard/*"])
});

/**
 * add a listener for each reload of the page (as the extension will need to run on each reload)
 * each time we load/reload any URLs it calls the function that determines the appropriate icon color to show for this page and customize the page if its determined to be one of the KR modules/tabs in our list to customize
 * tested using chrome.tabs.onUpdated.addListener instead so that we could avoid the webNavigation permission entirely but it wasn't handling redirect well in my testing, such as after a document is submitted (it was detecting just the form action URL from the interim page and not the final page) so webnavidation oncompleted which supposedly only fires when the page is totally done refreshing seems to be more reliable
 */
chrome.webNavigation.onCompleted.addListener(function(tab) {
  initiallySetIconInactiveOrDisabledThenEnableOnlyIfSpecificKRModuleTab(["https://*.kuali.co/res/*","https://*.kuali.co/dashboard/*"])
}, {});


/**
 * add a listener for whenever the user switches tabs (clicking between already open tabs in the browser is not the same listener as loading a page and requires it's own listener)
 * each time we switch tabs it calls the function that determines the appropriate icon color to show for this page and customize the page if its determined to be one of the KR modules/tabs in our list to customize
 */
chrome.tabs.onActivated.addListener(function(activeInfo) {
  initiallySetIconInactiveOrDisabledThenEnableOnlyIfSpecificKRModuleTab(["https://*.kuali.co/res/*","https://*.kuali.co/dashboard/*"])
});


/**
 * add a listener to listen for messages from content scripts that are part of this extension
 * currently we are listening for a specific "theFormAction" property on the request that should be coming from the detectActiveKRModuleTabContentScript.js script
 * it should be simpy sending along the KualiForm <form> action property/url on the currently loaded page, so we can figure out which KR module/tab such as the Award Module Special Review tab is currently loaded in the active tab in the browser
 * we will need this info to decide whether to have the extension update the current KR page or now (if its one of the KR pages we have decided to change/update)
 * this is the last step [part 2)] in the process of determining which KR page we are currently on
 */
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
                                                                        console.log(`chrome.runtime.onMessage.addListener returned some message`);
  //look for messages that contain a "theFormAction" property, which indicate the message is coming from detectActiveKRModuleTabContentScript.js specifically - also make sure a valid form action URL was sent to us (not a blank string/null) before proceeding to try to parse the URL
  if (request.theFormAction) {
    const formActionFromMsg = request.theFormAction;
    checkIfCurrentPageInListOfKRModulesTabs(formActionFromMsg);
  }
});



/*
 * ::Functions::
 */

 /**
  * A high level function that 1) defaults the icon to disabled/inactive initial as a base color/state then 2) checks if the extension should be
  */
   function initiallySetIconInactiveOrDisabledThenEnableOnlyIfSpecificKRModuleTab(urlPatterns) {
     //default the icon to disabled or inactive depending on whether the extension is currenly on or off (later if the page one of the ones to be modified, the icon will be changed to enabled)
     setIconInactiveOrDisabled();
     //start the process to determine if the extension should be turned on (check that extension is enabled, that we are on a KR page and that the current KR module/tab being displayed is one in the list that should have the exention enabled)
     updateCurrentTabIfKRAndExtensionEnabled(urlPatterns);
   }


/**
* helps determine which module/tab in KR the user is currently viewing in the active browser tab in Google chrome
* due to some limitations of background.js only being able to figure out the URL but not the content/DOM/form elements of the active tab in the browser
* we need to do this in 2 parts...this function is part one and kicks off the sequence of events
* This function does part 1) it loads the special content script we created that just reads the HTML <form> element with the name "KualiForm" of the current page and sends back the URL of the "action" property of that form (with the flag set for the content script to allow it access)
* then for the second part of actually doing something with action property which tells us the current KR module/tab being viewed, see the _ listener function above which is fired when we actually get the information back in the form of a message sent from the content script, which at that point things can keep going and we can use that info to decide if we turn the extension on based on the current KR page/tab
*/
function initiateMessagePassingToFigureOutWhichKRModuleTabWeAreOn() {
                                                                      console.log(`calledinitiateMessagePassingToFigureOutWhichKRModuleTabWeAreOn`);
  //now that we know we are on a KR page, call the content script that will detect the KR module and tab selected by checking the KualiForm action URL/value (will have to be passed back as a message)
  chrome.tabs.executeScript({file: "detectActiveKRModuleTabContentScript.js", allFrames: true});
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
 * confirm if the current tab/page loaded is a KR page (based on the urlPatterns passed in that match Kuali Research URL patterns - note it doesn't look at which KR module/tab is loaded, ONLY that the URL matches a potential KR page), if it does, run the next step to confirm the extension is also currently enabled
 */
function updateCurrentTabIfKRAndExtensionEnabled(urlPatterns) {
  chrome.tabs.query({
  "active":        true,
  "currentWindow": true,
  "status":        "complete",
  "windowType":    "normal",
  "url": urlPatterns
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
 */
 function setExtensionIconActiveColor() {
                                                                      console.log(`setExtensionIconActiveColor() called, setting icon color to green`);
   chrome.browserAction.setIcon({path: "ora_icon_128.png"});
 }

 /*
  * change the extension icon to yellow to indicate we are on a KR page, but it's not doing anything to the current page
  */
  function setExtensionIconInactiveColor() {
                                                                      console.log(`about to set icon to yellow (inside setExtensionIconInactiveColor)`);
    chrome.browserAction.setIcon({path: "ora_icon_off_yellow_128.png"});
  }

  /*
   * change the extension icon to dark to indicate we are on a non-KR page or it's been disabled
   */
   function setExtensionIconDisabledColor() {
                                                                      console.log(`setExtensionIconDisabledColor() called, setting icon color to dark gray`);
     chrome.browserAction.setIcon({path: "ora_icon_off_dark_128.png"});
   }



  /**
  * check via a regex what the current page name is (i.e. "awardHome.do") and check if it is one that is in the list of KR pages we plan to modify
  * (we are using data from the external file (kind of like json config file) modulesTabsInKRToActivateExtension.js to load in which KR tabs/modules should be customized and the css/js files to use)
  *
  */
  function checkIfCurrentPageInListOfKRModulesTabs(actionStr) {
    // use the modulesTabsInKRToActivateExtension.js data/listing (imported in manifest.json) of KR Modules and Tabs that we want to "turn on" this extension automatically when we go to that page - decided it would be cleaner to keep this in a separate file so we could easily add KR modules/tabs in the future without having to change anything else in the code
    // first make sure the modulesTabsInKRToActivateExtension object from modulesTabsInKRToActivateExtension.js was successfully loaded
    if (modulesTabsInKRToActivateExtension) {
        //use a js regular expression to pull out just the .do page name from the KualiForms action URL, for example awardHome.do or awardContacts.do
        const pullOutPageNameWithDoFromActionUrlRegex = new RegExp('\/([a-zA-Z]{2,100}.do)', 'ig');
        //no advantages in looking for multiple matches, there should be only one [htmlpage].do in the action URL so using exec
        const regexFirstResultArr = pullOutPageNameWithDoFromActionUrlRegex.exec(actionStr);
        //since we don't want the match to include the slash before it, just for example "awardHome.do", we are using the array position 1 always, which corresponds to just the part in the regex in the parenthese, which should be the page name .do without the preceeding slash
        if (regexFirstResultArr !== null  && regexFirstResultArr[1]) {
          const doFileName = regexFirstResultArr[1];
                     console.log(`regexFirstResultArr[1] found something, it is: ${JSON.stringify(regexFirstResultArr[1])}`);
          //because the properties on the modulesTabsInKRToActivateExtension object are "awardHome.do", "awardContacts.do", etc we can just check if the current page name matches any of the properties defined since these would be the pages we want to load css, js for, otherwise it must not be one of them to do something for
          if (modulesTabsInKRToActivateExtension[doFileName]) {
                     console.log(`modulesTabsInKRToActivateExtension[doFileName].cssFile: ${modulesTabsInKRToActivateExtension[doFileName].cssFile}`);
                     console.log(`modulesTabsInKRToActivateExtension[doFileName].jsFile: ${modulesTabsInKRToActivateExtension[doFileName].jsFile}`);
            makeCustomizationsToCurrentPage(modulesTabsInKRToActivateExtension[doFileName].cssFile, modulesTabsInKRToActivateExtension[doFileName].jsFile);
          }
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
    }
    if (relativeJsFilePath) {
      chrome.tabs.executeScript({file: relativeJsFilePath, allFrames: true});
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
  * Toggle the extension off and on when the user clicks on the itcon - if it was on it will be turned off, if it is off it will be turned on (updating the parsisted state of the extension)
  * reference for strategy of keeping state in flag that is flipped on/off: https://stackoverflow.com/questions/16136275/how-to-make-on-off-buttons-icons-for-a-chrome-extension
  */
  function toggleExtensionOnOff() {
    //set it to the NOT/opposite of whet the getter currently returns as the current state - when someone clicks the extension icon
    setExtensionCurrentlyTurnedOn(!getExtensionCurrentlyTurnedOn());
  }
