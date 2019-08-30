// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @filedescription Initializes the extension's background page.
 */


 /**
  * executes the js code to update/override the CSS of the KR page
  *
  */



 /**** toggle chrome extension on and off based on user clicking on extension icon ****/
 /**** reference: https://stackoverflow.com/questions/16136275/how-to-make-on-off-buttons-icons-for-a-chrome-extension ***/
 // start with the extension enabled
 var extensionEnabled = true;


 //add a listener that when the button is clicked toggles the extension off and the second time on, then off, etc
 chrome.browserAction.onClicked.addListener(function(tab) {
   //to avoid being able to enable/disable the extension on non-kr pages by clicking the icon, double check via a regular expression that the url has kuali.co, otherwise ignore the button click on unrelated sites and leave it dark gray
   if (tab.url && /kuali.co/.test(tab.url))
   {
     extensionEnabled = !extensionEnabled;
     updatePageIfExtensionEnabled(extensionEnabled, tab);
   }
 });


 //add a listener that when going to any new page/refreshing page, etc, sets the ora icon to gray (then only for times when the plugin is actually active will it be turned to green by the next listener) - couldn't figure out another way to do it because the other listener only fires when the URL matches KR, otherwise nothing happens
 chrome.webNavigation.onBeforeNavigate.addListener(function(tab) {
   chrome.browserAction.setIcon({path: "ora_icon_off_dark_128.png", tabId:tab.id});
}, {});

 //add a listener for each reload of the page (as the extension will need to run on each reload)
 //but only run at all if it matches specific URLs (to keep it specific looking for kuali.co /res or /dashboard...later may decide to just have it match any kuali.co URL, it's a judgement call on how specific we want to be)
 chrome.webNavigation.onCompleted.addListener(function(tab) {
    //alert("webNavigation.onCompleted URL matched hostSuffix: kuali.co, pathContains: res");
    updatePageIfExtensionEnabled(extensionEnabled, tab);
}, {url: [{hostSuffix: "kuali.co", pathContains: "res"},{hostSuffix: "kuali.co", pathContains: "dashboard"}]});

// chrome.webNavigation.onCompleted.addListener(function(tab) {
//    //alert("webNavigation.onCompleted URL matched hostSuffix: kuali.co, pathContains: res");
//    updatePageIfExtensionEnabled(extensionEnabled, tab);
// }, {url: [{hostSuffix: "kuali.co", pathContains: "res"},{hostSuffix: "kuali.co", pathContains: "dashboard"}]});

 /**
  * actually loads the css and javascript to hide/update the page, if the exension is currently enabled
  *
  */
  function updatePageIfExtensionEnabled(extensionEnabled, tab) {
    if (extensionEnabled){
      chrome.browserAction.setIcon({path: "ora_icon_128.png", tabId:tab.id});
      chrome.tabs.insertCSS(tab.id, {file: "myStyles.css", allFrames: true});
      chrome.tabs.executeScript(tab.id, {file: "contentScript.js", allFrames: true});
      //  chrome.tabs.executeScript(tab.id, {code:"alert('on')"});
    }
    else{
      // if the user clicks to turn the extension off on a valid KR page, show the yellow disabled icon, not the dark gray icon
      chrome.browserAction.setIcon({path: "ora_icon_off_yellow_128.png", tabId:tab.id});
      //TODO alert("the ORA plugin has been disabled but you may need to navigate to a new tab or page for all changes to take effect");
    }
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
