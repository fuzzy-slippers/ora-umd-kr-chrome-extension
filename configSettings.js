/******************************************************************************
          Configurable settings for this chrome browser extension
 The goal was to try to centralize settings into the equivalent of a properties
 file for those things that may need to be configured/changed later as time
 goes on. Originally I had looked at a json properties file, but loading
 equivalent objects/settings via a javascript file is apparently an easier
 option with chrome extensions.
 The configurations changable here so far are:
 - modulesTabsInKRToActivateExtension: which KR modules and tabs should the extension automatically active for based on the form action URL inside the page html (all other KR pages the extension will be inactive)
 - allIconImages: instead of hard coding the actual image file names directly into the main code allows us to use "activeImgName", etc which is more readable
 - userMessages: configure the text for messages to the user, so far just a pop up message when you click to turn off the extension
 *****************************************************************************/
const configSettings = {
  "modulesTabsInKRToActivateExtension": {
    "awardHome.do": {
      "cssFile": "/awdModule/awardTabStyles.css",
      "jsFile": "/awdModule/awardTabContentScript.js"
    },
    "timeAndMoney.do": {
      "cssFile": "/tnmModule/timeAndMoneyTabContentScript.css",
      "jsFile": "/tnmModule/timeAndMoneyTabContentScript.js"
    },
    "NOTSETYET2.do": {
      "cssFile": "/whichone/whatever.css",
      "jsFile": "/whichone/whatever.js"
    },
  },

  "allIconImages": {
    "activeImgName": "ora_icon_128.png",
    "inactiveImgName": "ora_icon_off_yellow_128.png",
    "disabledImgName": "ora_icon_off_dark_128.png"
  },

  "userMessages": {
    "extensionDisabledPopUpMsg": `has been disabled.\n\nPLEASE NOTE: Changes to the current page may not be reflected until you navigate to a new tab or page in Kuali Research.`
  }

}
