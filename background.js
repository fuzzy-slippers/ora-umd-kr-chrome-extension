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
  * check if the page being loaded is one that is in the list of KR pages we plan to modify
  * (will allow us at the above level to skip trying to load any changes/code if we know we dont plan to modify this module/tab/page in KR)
  *
  */
  function checkIfCurrentPageInListOfKRModulesTabs(tab, actionStr) {
    console.log(`passed to checkIfCurrentPageInListOfKRModulesTabs, tab.id: ${tab.id} and actionStr: ${actionStr}`);
    const krAwardModuleAwardTabRegex = /\/awardHome.do/;

    if (krAwardModuleAwardTabRegex.test(actionStr)) {
      alert(`determined we are on the award tab of the KR award module...`);
      makeKRAwardModuleAwardTabRelatedChanges(tab);
    }
  }


  /**
  * makes the customizations specific to the award module as well as change the icon to indicate the extension is actively making changes
  * overlay the css and run the custom javascript to modify the current page (if the form elements to change, etc are present)
  *
  */
  function makeKRAwardModuleAwardTabRelatedChanges(tab) {
     //TODO: determine tab inside award module and based on that call function to update icon color and css/js based on tab selected (do nothing including leave icon yellow for tabs that do not have any custom overlays)
     setExtensionIconActiveColor(tab);
     chrome.tabs.insertCSS(tab.id, {file: "/awdModule/awardTabStyles.css", allFrames: true});
     chrome.tabs.executeScript(tab.id, {file: "/awdModule/awardTabContentScript.js", allFrames: true});
  }


    // make sure the tab.url is not undefined before using it to check which module the page is on
    //
    // /* wont be using tab.URL
    // if (tab.url) {
    //   if (/\/award/.test(tab.url)) {
    //     console.log(`detected this page has /award in the URL which is: ${tab.url} `);
    //     awdModuleDetectTabAndUpdateAccordingly(tab);
    //   }
    //   else if (/\/time/.test(tab.url)) {
    //         //TODO: Need to separate out the Time and Money CSS and Javascript into separate files and a function to detect the tab chosen needs to be created so its only imported on the one tab that needs it to run
    //         console.log(`detected this page has "\time" in the URL which is: ${tab.url} `);
    //   }
    //   //institutional
    //   else if (/\/institutional/.test(tab.url)) {
    //         console.log(`detected this page has "\institutional" in the URL which is: ${tab.url} `);
    //   }
    //   else if (/\/proposalDevelopment/.test(tab.url)) {
    //         console.log(`detected this page has "\proposalDevelopment" in the URL which is: ${tab.url} `);
    //   }
    //   else if (/\/sub/.test(tab.url)) {
    //         console.log(`detected this page has "\sub" in the URL which is: ${tab.url} `);
    //   }
    //   else {
    //     console.log(`did not detect anything, but tab.url is: ${tab.url}`);
    //   }
    // }
    // */










//var nav = new NavigationCollector();


/*
  chrome.webNavigation.onCompleted.addListener(function(data) {
    //console.log("alerting webNavigation.onCompleted for" + JSON.stringify(data));

    //const retVal = updateCss();

    if (typeof data)
      console.log("data: " + JSON.stringify(data));
    else
      console.error("looks like an error, data: " + JSON.stringify(data));
  });
  */



  // /**
  //  * executes the js code to update/override the CSS of the KR page
  //  *
  //  */
  // function updateCss() {
  //   console.log("inside updateCss()");
  //
  //   const querySelectorWiki = document.querySelector('#mp-topbanner > div > div:nth-child(1)');
  //   if (querySelectorWiki) {
  //     console.log(`querySelectorWiki: ${querySelectorWiki.innerHTML}`);
  //     querySelectorWiki.style.color = "green";
  //   }
  //
  //   const querySelectorHead = document.querySelector('head');
  //   if (querySelectorHead) {
  //     console.log(`querySelectorHead: ${querySelectorHead.innerHTML}`);
  //   }
  //
  //   document.querySelector('body').style.backgroundColor = "purple";
  //   document.body.style.backgroundColor = "purple";
  //   document.bgColor = "orange";
  //   console.log("just tried to switch the background to purple, got here");
  //
  //
  //
  //
  //
  //   // var mainHeader = document.querySelector('#main-header');
  //   // console.log(`mainHeader: ${mainHeader.innerText}`);
  //
  //
  //
  //
  //   // console.log(`document: ${document.innerText}`);
  //
  //   // const footer = document.querySelector("#Uif-GlobalApplicationFooter");
  //   // console.log(`footer: ${footer.innerText}`);
  //   // if (footer) {
  //   //   footer.style.backgroundColor = "red";
  //   // }
  //   //
  //   // const footerStyle2 = document.querySelector('div#footer-copyright');
  //   // console.log(`footerStyle2: ${JSON.stringify(footerStyle2)}`);
  //   // if (footerStyle2) {
  //   //   footerStyle2.style.backgroundColor = "red";
  //   // }
  //   //
  //   //
  //   //
  //   // const anticipatedAmtRow = document.querySelector("#tab-DetailsDates\\:TimeMoney-div > table > tbody > tr:nth-child(5)");
  //   // console.log(`anticipatedAmtRow: ${JSON.stringify(anticipatedAmtRow)}`);
  //   // if (anticipatedAmtRow) {
  //   //   anticipatedAmtRow.style.visibility = "hidden";
  //   // }
  //   // //document.querySelector("#tab-DetailsDates\\:TimeMoney-div > table > tbody > tr:nth-child(5)").style.visibility = "hidden";
  //   // document.body.style.backgroundColor = "lightgray";
  //
  // }

// Reset the navigation state on startup. We only want to collect data within a
// session.
// chrome.runtime.onStartup.addListener(function() {
//   nav.resetDataStorage();
// });
