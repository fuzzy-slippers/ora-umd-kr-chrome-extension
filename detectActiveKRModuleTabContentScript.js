/**
 * @filedescription a contentScript (chrome extension JS code that runs inside the active browser tab rather than in every present extension code iself)
 * this contentScript simply checks for the existence of the Kuali Research HTML form that has all the text fields, date pickers, dropdowns etc
 * and it's only job is to check the action property of the form which should tell us accurately what KR module/tab like the award special review tab for example
 * is currently showing for the user - it sends the info on the action property/url of the current page as a message back to the background.js of the browser extension
 * that called this script in the first place (with the flag to have it expose the HTML/DOM for all iframes in the page)
 */

 console.info(`detectActiveKRModuleTabContentScript running...`);
 if (document.forms["KualiForm"] && document.forms["KualiForm"].action) {
   console.info(`sending document.forms["KualiForm"].action as message with theFormAction: ${document.forms["KualiForm"].action}`)
   chrome.runtime.sendMessage({theFormAction: `${document.forms["KualiForm"].action}`});
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
