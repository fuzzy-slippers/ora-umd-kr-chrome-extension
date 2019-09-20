//before trying to manipulate any of the form field values, etc make sure this page has a form named KualiForm
if (document.forms["KualiForm"]) {

  /* Award Document Section */

  //double check that you are on a page that has the award doc notice date (award doc edit page)
  if (document.forms["KualiForm"]["document.awardList[0].noticeDate"]) {
    //make sure value is empty before pre-populating, we don't want to overwrite data the person just entered (and switched tabs)
    if (!document.forms["KualiForm"]["document.awardList[0].noticeDate"].value) {
      //set/prepopulate empty notice dates to the current date in "12/1/2019" format used by Kuali, which seems to match locale date string en-US, specifying in case someone has different settings in their browser, I believe Kuali will still require that string format
      document.forms["KualiForm"]["document.awardList[0].noticeDate"].value = new Date().toLocaleDateString("en-US");
      //also set the background color of the input field to a light green (similar to chromes autofill light blue) to indicate the field had been auto-filled just now (on next page refresh should go away)
      document.forms["KualiForm"]["document.awardList[0].noticeDate"].style.backgroundColor = "#EBFFF7";
    }
  }
}
