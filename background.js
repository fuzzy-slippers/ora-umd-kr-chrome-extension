// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @filedescription Initializes the extension's background page.
 * executes the js code to update/override the CSS of the KR page
 */



 /**** toggle chrome extension on and off based on user clicking on extension icon ****/
 /**** reference: https://stackoverflow.com/questions/16136275/how-to-make-on-off-buttons-icons-for-a-chrome-extension ***/
 // start with the extension enabled
 var extensionEnabled = true;

 /*
  * ::Listeners::
  */

 //add a listener that when the button is clicked toggles the extension off and the second time on, then off, etc
 chrome.browserAction.onClicked.addListener(function(tab) {
   extensionEnabled = !extensionEnabled;
   //default the icon to disabled or inactive depending on whether the extension is currenly on or off (later if the page one of the ones to be modified, the icon will be changed to enabled)
   setIconInactiveOrDisabled(extensionEnabled, tab);
   //start the process to determine if the extension should be turned on (make sure extension is enabled + that we are on a KR page/tab that it should be turned on)
   updatePageIfExtensionEnabled(extensionEnabled, tab);
 });


 //add a listener that when going to any new page/refreshing page, etc, if the extension is currently clicked on, default the icon to the inactive color but if it's clicked off default the icon to the disabled color
 chrome.webNavigation.onBeforeNavigate.addListener(function(tab) {
   setIconInactiveOrDisabled(extensionEnabled, tab)
}, {});

 //add a listener for each reload of the page (as the extension will need to run on each reload)
 //but only run at all if it matches specific URLs (to keep it specific looking for kuali.co /res or /dashboard...later may decide to just have it match any kuali.co URL, it's a judgement call on how specific we want to be)
 chrome.webNavigation.onCompleted.addListener(function(tab) {
   //start the process to determine if the extension should be turned on (make sure extension is enabled + that we are on a KR page/tab that it should be turned on)
   updatePageIfExtensionEnabled(extensionEnabled, tab);
   //console.log("webNavigation.onCompleted URL matched hostSuffix: kuali.co, pathContains: res");
}, {url: [{hostSuffix: "kuali.co", pathContains: "res"},{hostSuffix: "kuali.co", pathContains: "dashboard"}]});

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
      //determine the currently active tab info/object (since this is a listener, it doesn't have this info)
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        console.log(`iside the query function to get current tab: ${JSON.stringify(tabs)}`);
        //make sure it returned something when querying for the current active tab
        if (tabs[0]) {
          const currentTab = tabs[0];
          //console.log(`currentTab: ${JSON.stringify(currentTab)});

          console.log(`request.theFormAction is: ${request.theFormAction} - we put it in the variable formActionFromMsg: ${formActionFromMsg}`);
          //now that we know the current tab and the form action URL, pass these along to a function to check if its one of the valid KR modules/tabs for the extension to auto-activate
          checkIfCurrentPageInListOfKRModulesTabs(currentTab, formActionFromMsg);

        }
      });

    }


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
  function initiateMessagePassingToFigureOutWhichKRModuleTabWeAreOn(tab) {
    console.log(`calledinitiateMessagePassingToFigureOutWhichKRModuleTabWeAreOn`);
    //now that we know we are on a KR page, call the content script that will detect the KR module and tab selected by checking the KualiForm action URL/value (will have to be passed back as a message)
    chrome.tabs.executeScript(tab.id, {file: "detectActiveKRModuleTabContentScript.js", allFrames: true});
  }

 /**
  * based on whether the extension is currently enabled (using flag), either set to the inactive color if clicked on or the disabled color if clicked off (turning it green will happen at a later stage right along with the code to actually modify the page, if thats the case)
  */
  function setIconInactiveOrDisabled(extensionEnabled, tab) {
    if (extensionEnabled){
      setExtensionIconInactiveColor(tab);
    }
    else{
      setExtensionIconDisabledColor(tab);
    }
  }

 /**
  * check if the extension is currently on (using global flag keeping history of on/off),
  * if so set to inactive icon initially
  * and have it further check if it's a module/tab that should have changes made to the page (if not will still show disabled)
  * if extension determined to be clicked off by the user, dont need to do anything as the icon shows the off colors by default until it is explicitly turned on based on the KR module, etc
  */
  function updatePageIfExtensionEnabled(extensionEnabled, tab) {
    if (extensionEnabled){
      console.log(`called updatePageIfExtensionEnabled and determined extensionEnabled=true`);
      initiateMessagePassingToFigureOutWhichKRModuleTabWeAreOn(tab);
    }
  }



/*
 * change the extension icon to green to indicate its active on the current page
 */
 function setExtensionIconActiveColor(tab) {
   console.log(`about to set icon to green (inside setExtensionIconActiveColor)`);
   chrome.browserAction.setIcon({path: "ora_icon_128.png", tabId:tab.id});
 }

 /*
  * change the extension icon to yellow to indicate we are on a KR page, but it's not doing anything to the current page
  */
  function setExtensionIconInactiveColor(tab) {
    chrome.browserAction.setIcon({path: "ora_icon_off_yellow_128.png", tabId:tab.id});
  }

  /*
   * change the extension icon to dark to indicate we are on a non-KR page or it's been disabled
   */
   function setExtensionIconDisabledColor(tab) {
     chrome.browserAction.setIcon({path: "ora_icon_off_dark_128.png", tabId:tab.id});
   }



  /**
  * check via a regex what the current page name is (i.e. "awardHome.do") and check if it is one that is in the list of KR pages we plan to modify
  * (we are using data from the external file (kind of like json config file) modulesTabsInKRToActivateExtension.js to load in which KR tabs/modules should be customized and the css/js files to use)
  *
  */
  function checkIfCurrentPageInListOfKRModulesTabs(tab, actionStr) {
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
                     // alert(`regexFirstResultArr[1] found something, it is: ${JSON.stringify(regexFirstResultArr[1])}`);
          //because the properties on the modulesTabsInKRToActivateExtension object are "awardHome.do", "awardContacts.do", etc we can just check if the current page name matches any of the properties defined since these would be the pages we want to load css, js for, otherwise it must not be one of them to do something for
          if (modulesTabsInKRToActivateExtension[doFileName]) {
                     // alert(`modulesTabsInKRToActivateExtension[doFileName].cssFile: ${modulesTabsInKRToActivateExtension[doFileName].cssFile}`);
                     // alert(`modulesTabsInKRToActivateExtension[doFileName].jsFile: ${modulesTabsInKRToActivateExtension[doFileName].jsFile}`);
            makeCustomizationsToCurrentPage(tab, modulesTabsInKRToActivateExtension[doFileName].cssFile, modulesTabsInKRToActivateExtension[doFileName].jsFile);
          }
        }
    }
  }


  /**
  * makes the customizations specific to the currently load tab (using the passed in css and js files/paths to use) as well as change the icon to indicate the extension is actively making changes
  * overlay the css and run the custom javascript to modify the current page (if the form elements to change, etc are present)
  * we want to change the icon to show active right before we actually load the css and js so that we can be sure that we aren't showing someone that the extension is active when nothing is being done or showing them its not active when something is actually being customized on the current page - for this reason, this function is the only place in the extension code that will both 1) make customizations to the current page or 2) make the icon show the active color (initially decided on green)
  */
  function makeCustomizationsToCurrentPage(tab, relativeCssFilePath, relativeJsFilePath) {
    setExtensionIconActiveColor(tab);
    if (relativeCssFilePath) {
      chrome.tabs.insertCSS(tab.id, {file: relativeCssFilePath, allFrames: true});
    }
    if (relativeJsFilePath) {
      chrome.tabs.executeScript(tab.id, {file: relativeJsFilePath, allFrames: true});
    }
  }
