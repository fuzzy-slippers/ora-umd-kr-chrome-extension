alert(`detectActiveKRModuleTabContentScript running...`);
if (document.forms["KualiForm"] && document.forms["KualiForm"].action) {
  alert(`sending document.forms["KualiForm"].action as message with theFormAction: ${document.forms["KualiForm"].action}`)
  chrome.runtime.sendMessage({theFormAction: `${document.forms["KualiForm"].action}`}, function(response) {
    if (response)
      alert(response);
  });
}


// //before trying to manipulate any of the form field values, etc make sure this page has a form named KualiForm
// if (document.forms["KualiForm"]) {
//
//   /* Award Document Section */
//
//   //double check that you are on a page that has the award doc notice date (award doc edit page)
//   if (document.forms["KualiForm"]["document.awardList[0].noticeDate"]) {
//     //make sure value is empty before pre-populating, we don't want to overwrite data the person just entered (and switched tabs)
//     if (!document.forms["KualiForm"]["document.awardList[0].noticeDate"].value) {
//       //set/prepopulate empty notice dates to the current date in "12/1/2019" format used by Kuali, which seems to match locale date string en-US, specifying in case someone has different settings in their browser, I believe Kuali will still require that string format
//       document.forms["KualiForm"]["document.awardList[0].noticeDate"].value = new Date().toLocaleDateString("en-US");
//       //also set the background color of the input field to a light green (similar to chromes autofill light blue) to indicate the field had been auto-filled just now (on next page refresh should go away)
//       document.forms["KualiForm"]["document.awardList[0].noticeDate"].style.backgroundColor = "#EBFFF7";
//     }
//   }
//
//
//   /* Time and Money Document Section */
//
//   //double check that you are on a page that has the t&m doc notice date (t&m doc in edit mode)
//   if (document.forms["KualiForm"]["document.awardAmountTransactions[0].noticeDate"]) {
//     //make sure value is empty before pre-populating, we don't want to overwrite data the person just entered
//     if (!document.forms["KualiForm"]["document.awardAmountTransactions[0].noticeDate"].value) {
//       //set/prepopulate empty notice dates to the current date in "12/1/2019" format used by Kuali, which seems to match locale date string en-US, specifying in case someone has different settings in their browser, I believe Kuali will still require that string format
//       document.forms["KualiForm"]["document.awardAmountTransactions[0].noticeDate"].value = new Date().toLocaleDateString("en-US");
//       //also set the background color of the input field to a light green (similar to chromes autofill light blue) to indicate the field had been auto-filled just now (on next page refresh should go away)
//       document.forms["KualiForm"]["document.awardAmountTransactions[0].noticeDate"].style.backgroundColor = "#EBFFF7";    }
//   }
//
//   //alert("document.forms[`KualiForm`] detected");
//   /* PHASE 2 - try to auto-enter zero dollars into transactions in time and money - needs more testing
//   if (document.forms["KualiForm"]["transactionBean.newPendingTransaction.obligatedAmount"])
//     document.forms["KualiForm"]["transactionBean.newPendingTransaction.obligatedAmount"].value = "0";
//   */
// }


// alert("ON - alert from contentscript.js");
// document.body.style.backgroundColor = "purple";

// const obligatedAmountSelector = document.querySelector("#transactionBean\\.newPendingTransaction\\.obligatedAmount");
// if (obligatedAmountSelector) {
//   obligatedAmountSelector.value = "7";
// }
// const explanationSelector = document.querySelector('#document\2e documentHeader\2e explanation');
// if (explanationSelector) {
//   explanationSelector.value = 'text added by KR chrome browser extension';
// }
