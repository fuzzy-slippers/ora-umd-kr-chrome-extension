/**
 * @filedescription a contentScript (chrome extension JS code that runs inside the active browser tab rather than the extension central background.js code)
 * they way we load this detectActiveKRModuleTabContentScript.js content script is through the "content_scripts" property in the manifest.json and specify a "matches" property so that it is only added to *.kuali.co/* URLS, not any other pages the user opens in their browser
 * what this allows us to do is to check whether the currently open page is a KR website page without the extension needing the permission to check
 * the URL of each website the user opens (because that requires permissions that also mean the extension has access to all browser history, which we want to avoid)
 * instead, the only code here is a listener and it's only then added to KR web pages ONLY when they are loaded
 * then the background.js program can send messages to the currently open page and see if the listener (below) is present on the currently loaded page
 * if it is, we know it's a KR website and the listener will send back details of the exact form URL of the currently open page so that we can figure out which tab is open (kuali page URLs are often incorrect but the form action URLs are accurate on which KR module/tab is currently loaded)
 * by using a listener, we don't have to send this info all the time, only when it's asked from the extension/background.js
 * this contentScript simply checks for the existence of the Kuali Research HTML form that has all the text fields, date pickers, dropdowns etc
 * and it's only job is to check the action property of the form which should tell us accurately what KR module/tab like the award special review tab for example
 * is currently showing for the user - it sends the info on the action property/url of the current page as a message back to the background.js of the browser extension
 * that called this script in the first place (with the flag to have it expose the HTML/DOM for all iframes in the page)


 // INCLUDE THIS PART: after testing determined that there is no way to be sure which order the onload and message listeners will fire and because some KR pages do redirects, we could have a situation like this one:
  //  onload fires and sends "routeLog.do" -> message listener fires and sends "routeLog.do" -> onload fires and sends "timeAndMoney.do" (and no message listener due to redirect again for "timeAndMoney.do")
  //  because of the potential for the above firing of events, we unfortunately just need to send them all, we cant try to be smart and filter down which ones will fire on each page. With them all on, it seems to always be the case in testing that background.js gets a message back at the end with the final form action URL "whatever.do"
 */




 //No longer need to try to send a message immediately when the detectActiveKRModuleTabContentScript loads, instead we have set up a listener to respond with the current page's form action URL only when a message is sent from the background.js script to request it (more efficient/performant and seems to be more reliable - also fits with the model of using the manifest permissions to determine if a page is a KR page rather than checking the URL in the background.js which we don't want to ask for)
 /* seeing if we can accomplish the same thing with the _ background.js listener kicking things off */
 //                                                                      alert(`detectActiveKRModuleTabContentScript running...`);
 // if (document.forms["KualiForm"] && document.forms["KualiForm"].action) {
 //                                                                      console.info(`run immediately in detectActiveKRModuleTabContentScript - sending document.forms["KualiForm"].action as message with theFormAction: ${document.forms["KualiForm"].action}`)
 //   chrome.runtime.sendMessage({theFormAction: `${document.forms["KualiForm"].action}`});
 // }


// listeners

/**
* add a listener to listen for messages from background.js, specifically waiting for a message that is asking to send back the KualiForm action URL
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


window.onload = (event) => {
                                                                                console.group(`window.onload = (event) fired based on detectActiveKrModuleTabContent loading/refreshing - so page is fully loaded - event details: ${JSON.stringify(event)}`);
  sendMessageToBackgroundProgramWithCurrentKualiFormActionUrl();
                                                                                console.groupEnd();
};



// helper functions


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
  else {
                                                                        console.info(`chrome.runtime.onMessage.addListener|document.forms["KualiForm"].action was not found to exist in this load of detectActiveKRModuleTabContentScript (after receiving message from background.js on which KR (module/tab) form URL is currently loaded)`);
  }
}





 //listen for a message from the extension background.js with a property of initialMessage that is "sendActionPlease"
 //when we get that message send a response with the action property on the HTML form "KualiForm" on the current page
 //if one exists - if we don't find a KualiForm on the current page (such as the KR home page that does not have a form), just sent back a blank string for the fromDetectActiveKRModuleTabContentScript property/message

 // chrome.runtime.onMessage.addListener(
 //   function(request, sender, sendResponse) {
 //     alert(`detectActiveKRModuleTabContentScript recieved: ${JSON.stringify(request)}`)
 //     if (request.initialMessage == "sendActionPlease") {
 //       if (document.forms["KualiForm"] && document.forms["KualiForm"].action) {
 //         sendResponse({fromDetectActiveKRModuleTabContentScript: document.forms["KualiForm"].action});
 //       }
 //       else {
 //         sendResponse({fromDetectActiveKRModuleTabContentScript: ""});
 //       }
 //     }
 //
 //   });
