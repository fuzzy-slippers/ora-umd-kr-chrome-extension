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
   updatePageIfExtensionEnabled(extensionEnabled, tab);
 });


 //add a listener that when going to any new page/refreshing page, etc, if the extension is currently clicked on, default the icon to the inactive color but if it's clicked off default the icon to the disabled color
 chrome.webNavigation.onBeforeNavigate.addListener(function(tab) {
   setIconInactiveOrDisabled(extensionEnabled, tab)
}, {});

 //add a listener for each reload of the page (as the extension will need to run on each reload)
 //but only run at all if it matches specific URLs (to keep it specific looking for kuali.co /res or /dashboard...later may decide to just have it match any kuali.co URL, it's a judgement call on how specific we want to be)
 chrome.webNavigation.onCompleted.addListener(function(tab) {
   //now that we know we are on a KR page, call the content script that will detect the KR module and tab selected by checking the KualiForm action URL/value (will have to be passed back as a message)
   chrome.tabs.executeScript(tab.id, {file: "detectActiveKRModuleTabContentScript.js", allFrames: true});
   //alert("webNavigation.onCompleted URL matched hostSuffix: kuali.co, pathContains: res");
   updatePageIfExtensionEnabled(extensionEnabled, tab);
}, {url: [{hostSuffix: "kuali.co", pathContains: "res"},{hostSuffix: "kuali.co", pathContains: "dashboard"}]});


chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    alert(`request.theFormAction is: ${request.theFormAction}`)
    alert(sender.tab ?
                "from a content script:" + sender.tab.url :
                "from the extension");
    // if (request.greeting == "hello")
    //   sendResponse({farewell: "goodbye"});
  });

/*
 * ::Functions::
 */


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
  * check if the extension is currently on (using global flag keeping history of on/off), if so set to inactive icon initially and have it further check if it's a module/tab that should have changes made to the page, otherwise if off set the icon to the disabled color
  */
  function updatePageIfExtensionEnabled(extensionEnabled, tab) {
  if (extensionEnabled){
    detectKRModuleUpdateAccordingly(tab);
  }
}



/*
 * change the extension icon to green to indicate its active on the current page
 */
 function setExtensionIconActiveColor(tab) {
   alert(`about to set icon to green (inside setExtensionIconActiveColor)`);
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
  function detectKRModuleUpdateAccordingly(tab) {
    if (document.forms["KualiForm"]) {
        if (document.forms["KualiForm"].action)
          alert(`document.forms["KualiForm"].action is showing: ${document.forms["KualiForm"].action}`);
        else
          alert(`document.forms["KualiForm"].action not found (found to be FALSY)`);
    }
    else
      alert(`document.forms["KualiForm"] itself not found (found to be FALSY)`);

    //make sure the tab.url is not undefined before using it to check which module the page is on
    if (tab.url) {
      if (/\/award/.test(tab.url)) {
        alert(`detected this page has "/award" in the URL which is: ${tab.url} `);
        awdModuleDetectTabAndUpdateAccordingly(tab);
      }
      else if (/\/time/.test(tab.url)) {
            //TODO: Need to separate out the Time and Money CSS and Javascript into separate files and a function to detect the tab chosen needs to be created so its only imported on the one tab that needs it to run
            alert(`detected this page has "\time" in the URL which is: ${tab.url} `);
      }
      //institutional
      else if (/\/institutional/.test(tab.url)) {
            alert(`detected this page has "\institutional" in the URL which is: ${tab.url} `);
      }
      else if (/\/proposalDevelopment/.test(tab.url)) {
            alert(`detected this page has "\proposalDevelopment" in the URL which is: ${tab.url} `);
      }
      else if (/\/sub/.test(tab.url)) {
            alert(`detected this page has "\sub" in the URL which is: ${tab.url} `);
      }
      else {
        alert(`did not detect anything, but tab.url is: ${tab.url}`);
      }

    }
  }



    /**
    * makes the customizations specific to the award module as well as change the icon to indicate the extension is actively making changes
    * overlay the css and run the custom javascript to modify the current page (if the form elements to change, etc are present)
    *
    */
    function awdModuleDetectTabAndUpdateAccordingly(tab) {
       //TODO: determine tab inside award module and based on that call function to update icon color and css/js based on tab selected (do nothing including leave icon yellow for tabs that do not have any custom overlays)
       setExtensionIconActiveColor(tab);
       chrome.tabs.insertCSS(tab.id, {file: "myStyles.css", allFrames: true});
       chrome.tabs.executeScript(tab.id, {file: "contentScript.js", allFrames: true});
    }





//var nav = new NavigationCollector();


/*
  chrome.webNavigation.onCompleted.addListener(function(data) {
    //alert("alerting webNavigation.onCompleted for" + JSON.stringify(data));

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
  //   alert("inside updateCss()");
  //
  //   const querySelectorWiki = document.querySelector('#mp-topbanner > div > div:nth-child(1)');
  //   if (querySelectorWiki) {
  //     alert(`querySelectorWiki: ${querySelectorWiki.innerHTML}`);
  //     querySelectorWiki.style.color = "green";
  //   }
  //
  //   const querySelectorHead = document.querySelector('head');
  //   if (querySelectorHead) {
  //     alert(`querySelectorHead: ${querySelectorHead.innerHTML}`);
  //   }
  //
  //   document.querySelector('body').style.backgroundColor = "purple";
  //   document.body.style.backgroundColor = "purple";
  //   document.bgColor = "orange";
  //   alert("just tried to switch the background to purple, got here");
  //
  //
  //
  //
  //
  //   // var mainHeader = document.querySelector('#main-header');
  //   // alert(`mainHeader: ${mainHeader.innerText}`);
  //
  //
  //
  //
  //   // alert(`document: ${document.innerText}`);
  //
  //   // const footer = document.querySelector("#Uif-GlobalApplicationFooter");
  //   // alert(`footer: ${footer.innerText}`);
  //   // if (footer) {
  //   //   footer.style.backgroundColor = "red";
  //   // }
  //   //
  //   // const footerStyle2 = document.querySelector('div#footer-copyright');
  //   // alert(`footerStyle2: ${JSON.stringify(footerStyle2)}`);
  //   // if (footerStyle2) {
  //   //   footerStyle2.style.backgroundColor = "red";
  //   // }
  //   //
  //   //
  //   //
  //   // const anticipatedAmtRow = document.querySelector("#tab-DetailsDates\\:TimeMoney-div > table > tbody > tr:nth-child(5)");
  //   // alert(`anticipatedAmtRow: ${JSON.stringify(anticipatedAmtRow)}`);
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
