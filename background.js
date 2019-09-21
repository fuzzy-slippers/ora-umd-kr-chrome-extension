// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @filedescription Initializes the extension's background page.
 * executes the js code to update/override the CSS of the KR page
 */



 /**** toggle chrome extension on and off based on user clicking on extension icon with global background.js var ****/
 /**** reference: https://stackoverflow.com/questions/16136275/how-to-make-on-off-buttons-icons-for-a-chrome-extension ***/
 // start with the extension enabled
 var extensionEnabled = true;

 /*
  * ::Listeners::
  */

 //add a listener that when the button is clicked toggles the extension off and the second time on, then off, etc
 chrome.browserAction.onClicked.addListener(function(tab) {
   console.log(`click on icon detected via chrome.browserAction.onClicked.addListener`);
   extensionEnabled = !extensionEnabled;
   //default the icon to disabled or inactive depending on whether the extension is currenly on or off (later if the page one of the ones to be modified, the icon will be changed to enabled)
   setIconInactiveOrDisabled(extensionEnabled);
   //start the process to determine if the extension should be turned on (make sure extension is enabled + that we are on a KR page/tab that it should be turned on)
   updateCurrentTabIfKRAndExtensionEnabled(extensionEnabled, ["https://*.kuali.co/res/*","https://*.kuali.co/dashboard/*"]);
 });

//add a listener for each reload of the page (as the extension will need to run on each reload)
//but only run at all if it matches specific URLs (to keep it specific looking for kuali.co /res or /dashboard...later may decide to just have it match any kuali.co URL, it's a judgement call on how specific we want to be)
chrome.webNavigation.onCompleted.addListener(function(tab) {
  setIconInactiveOrDisabled(extensionEnabled);
  updateCurrentTabIfKRAndExtensionEnabled(extensionEnabled, ["https://*.kuali.co/res/*","https://*.kuali.co/dashboard/*"]);
}, {});


  // listen for messages from content scripts
  // the message
  // currently we are listening for a specific "theFormAction" property on the request that should be coming from the detectActiveKRModuleTabContentScript.js script
  // it should be simpy sending along the KualiForm <form> action property/url on the currently loaded page, so we can figure out which KR module/tab such as the Award Module Special Review tab is currently loaded in the active tab in the browser
  // we will need this info to decide whether to have the extension update the current KR page or now (if its one of the KR pages we have decided to change/update)
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log(`chrome.runtime.onMessage.addListener returned some message`);
    //check the type of message received based on the response property - also make sure a valid form action URL was sent to us (not a blank string/null) before proceeding
    if (request.theFormAction) {
      const formActionFromMsg = request.theFormAction;
      checkIfCurrentPageInListOfKRModulesTabs(formActionFromMsg);
    }
  });

  // switch tabs - may posssibly use ['*://*/*foo.bar', '*://*/*foo.bar?*'] see: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Match_patterns
  chrome.tabs.onActivated.addListener(function(activeInfo) {
      //alert(`chrome.tabs.onActivated listener triggered for: ${JSON.stringify(activeInfo)}, so setting icon yellow/gray first`);
      setIconInactiveOrDisabled(extensionEnabled);
      updateCurrentTabIfKRAndExtensionEnabled(extensionEnabled, ["https://*.kuali.co/res/*","https://*.kuali.co/dashboard/*"]);
  });

/*
 * ::Functions::
 */


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
  function setIconInactiveOrDisabled(extensionEnabled) {
    if (extensionEnabled){
      console.log(`setIconInactiveOrDisabled called and extensionEnabled=true so setting icon color to yellow via call to setExtensionIconInactiveColor func`);
      setExtensionIconInactiveColor();
    }
    else{
      //alert(`extensionEnabled=false so setting icon color to dark gray`);
      setExtensionIconDisabledColor();
    }
  }

 /**
  * check if the extension is currently on (using global flag keeping history of on/off),
  * if so set to inactive icon initially
  * and have it further check if it's a module/tab that should have changes made to the page (if not will still show disabled)
  * if extension determined to be clicked off by the user, dont need to do anything as the icon shows the off colors by default until it is explicitly turned on based on the KR module, etc
  */
  function updatePageIfExtensionEnabled(extensionEnabled) {
    if (extensionEnabled){
      console.log(`called updatePageIfExtensionEnabled and determined extensionEnabled=true`);
      initiateMessagePassingToFigureOutWhichKRModuleTabWeAreOn();
    }
  }

  function updateCurrentTabIfKRAndExtensionEnabled(extensionEnabled, urlPatterns) {
    chrome.tabs.query({
    "active":        true,
    "currentWindow": true,
    "status":        "complete",
    "windowType":    "normal",
    "url": urlPatterns
    }, function(tabs) {
     //if the url pattern doesnt match KR as specified in the url property above, this function will run but with an empty array, so don't do anything for these pages - this makes sure it returned something when querying for the current active tab
     if (tabs && tabs[0]) {
       updatePageIfExtensionEnabled(extensionEnabled);
     }
    });
  }


/*
 * change the extension icon to green to indicate its active on the current page
 */
 function setExtensionIconActiveColor() {
   chrome.browserAction.setIcon({path: "ora_icon_128.png"});
 }

 /*
  * change the extension icon to yellow to indicate we are on a KR page, but it's not doing anything to the current page
  */
  function setExtensionIconInactiveColor() {
    //console.log(`inside setExtensionIconInactiveColor the tab passed in shows: ${JSON.stringify(tab)} and also the getTabId(tab) being used is showing: ${getTabId(tab)}`);
    console.log(`about to set icon to yellow (inside setExtensionIconInactiveColor)`);
    chrome.browserAction.setIcon({path: "ora_icon_off_yellow_128.png"});
  }

  /*
   * change the extension icon to dark to indicate we are on a non-KR page or it's been disabled
   */
   function setExtensionIconDisabledColor() {
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
  * makes the customizations specific to the currently load tab (using the passed in css and js files/paths to use) as well as change the icon to indicate the extension is actively making changes
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
   * Pull out the tab id of a tab oject regardless of the different types of tab objects generated by chrome extension functions that keep the tab ids in different places. This is a simple utility but we were having "tab" objects passed into functions that contained different properties for the tab ids, so to keep things simple this utility function should look for the various properties that might contain the tab id for various different tab object types
   *
   */
   function getTabId(tab) {
     // make sure something was passed in
     if (tab) {
       //look for the tab.id property, which seems to be used by the chrome object depicting actual browser tabs
       if (tab.id) {
         return tab.id
       }
       //look for the tab.tabId property, which seems to be used by the chrome object depicting iframes
       else if (tab.tabId) {
         return tab.tabId;
       }
       //no properties in any of the formats we know of for tab Ids, so just returning undefined to indicate we couldnt find the info
       else {
         return undefined;
       }
     }
     //if the object is invalid, return undefined
     else {
       return undefined;
     }
   }
