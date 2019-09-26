/******************************************************************************
          Configurable settings for this chrome browser extension
 The goal was to try to centralize settings into the equivalent of a properties
 file for those things that may need to be configured/changed later as time
 goes on. Originally I had looked at a json properties file, but loading
 equivalent objects/settings via a javascript file is apparently an easier
 option with chrome extensions.
 The configurations changable here so far are:
 - modulesTabsInKRToActivateExtension: which KR modules and tabs should the extension automatically active for based on the form action URL inside the page html (all other KR pages the extension will be inactive)
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
  }

}