/**
 * @filedescription a contentScript (chrome extension JS code that runs inside the active browser tab rather than in every present extension code iself)
 * this contentScript simply checks for the existence of the Kuali Research HTML form that has all the text fields, date pickers, dropdowns etc
 * and it's only job is to check the action property of the form which should tell us accurately what KR module/tab like the award special review tab for example
 * is currently showing for the user - it sends the info on the action property/url of the current page as a message back to the background.js of the browser extension
 * that called this script in the first place (with the flag to have it expose the HTML/DOM for all iframes in the page)
 */

alert(`detectActiveKRModuleTabContentScript running...`);
if (document.forms["KualiForm"] && document.forms["KualiForm"].action) {
  alert(`sending document.forms["KualiForm"].action as message with theFormAction: ${document.forms["KualiForm"].action}`)
  chrome.runtime.sendMessage({theFormAction: `${document.forms["KualiForm"].action}`});
}
