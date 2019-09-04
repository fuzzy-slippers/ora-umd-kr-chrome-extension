// Copyright (c) 2012 The Chromium Authors. All rights reserved.
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

 //add a listener that when the button is clicked toggles the extension off and the second time on, then off, etc
 chrome.browserAction.onClicked.addListener(function(tab) {
   extensionEnabled = !extensionEnabled;
   updatePageIfExtensionEnabled(extensionEnabled, tab);
 });


 //add a listener that when going to any new page/refreshing page, etc, sets the ora icon to gray (then only for times when the plugin is actually active will it be turned to green by the next listener) - couldn't figure out another way to do it because the other listener only fires when the URL matches KR, otherwise nothing happens
 chrome.webNavigation.onBeforeNavigate.addListener(function(tab) {
   chrome.browserAction.setIcon({path: "ora_icon_off_128.png", tabId:tab.id});
}, {});

 //add a listener for each reload of the page (as the extension will need to run on each reload)
 //but only run at all if it matches specific URLs (to keep it specific looking for kuali.co /res or /dashboard...later may decide to just have it match any kuali.co URL, it's a judgement call on how specific we want to be)
 chrome.webNavigation.onCompleted.addListener(function(tab) {
    //alert("webNavigation.onCompleted URL matched hostSuffix: kuali.co, pathContains: res");
    updatePageIfExtensionEnabled(extensionEnabled, tab);
}, {url: [{hostSuffix: "kuali.co", pathContains: "res"},{hostSuffix: "kuali.co", pathContains: "dashboard"}]});


 /**
  * check if the extension (using global flag keeping history) currently shows the extension was clicked on, if so show on icon and make page changes, if not show off icon
  *
  */
  function updatePageIfExtensionEnabled(extensionEnabled, tab) {
    if (extensionEnabled){
      chrome.browserAction.setIcon({path: "ora_icon_128.png", tabId:tab.id});
      changePageOverlayCssAndJs(tab);
                checkIfCurrentPageInListOfPagesWeModify(tab);
      //  chrome.tabs.executeScript(tab.id, {code:"alert('on')"});
    }
    else{
      chrome.browserAction.setIcon({path: "ora_icon_off_dark_128.png", tabId:tab.id});
      //chrome.tabs.executeScript(tab.id, {code:"alert('off')"});
      //chrome.tabs.insertCSS(tab.id, {file: "empty.css", allFrames: true});
    }
}

/**
 * actually overlay the css and run the custom javascript to modify the current page (if the form elements to change, etc are present)
 *
 */
 function changePageOverlayCssAndJs(tab) {
     chrome.tabs.insertCSS(tab.id, {file: "myStyles.css", allFrames: true});
     chrome.tabs.executeScript(tab.id, {file: "contentScript.js", allFrames: true});
}

//awardHome.do

/**
 * check if the page being loaded is one that is in the list of KR pages we plan to modify
 * (will allow us at the above level to skip trying to load any changes/code if we know we dont plan to modify this module/tab/page in KR)
 *
 */
  function checkIfCurrentPageInListOfPagesWeModify(tab) {
    if (tab.url && /\/award/.test(tab.url)) {
      alert(`detected this page has "/award" in the URL`);
    }
    else if (tab.url && /\time/.test(tab.url)) {
          alert(`detected this page has "\time" in the URL`);
    }


    return true;
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
