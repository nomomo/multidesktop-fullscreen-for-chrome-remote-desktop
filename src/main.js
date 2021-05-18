/*
    Copyright 2016, SAP SE

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at
    
       http://www.apache.org/licenses/LICENSE-2.0
    
    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

/**
 *
 * Listens for the app launching, then opens the web page to view in full screen across all desktops.
 *
 * @see https://developer.chrome.com/apps/first_app
 * @see http://developer.chrome.com/apps/app.runtime.html
 * @see http://developer.chrome.com/apps/app.window.html
 * @see app.html
 */
chrome.app.runtime.onLaunched.addListener(function () {
    var isNumeric = function(n) {
       return !isNaN(parseFloat(n)) && isFinite(n);
    }
  
    console.info("Start application");

    // Screen info.
    console.info("Screen:" +
                 "\n  top:    " + screen.availTop + " pixels" +
                 "\n  left:   " + screen.availLeft + " pixels" +
                 "\n  width:  " + screen.availWidth + " pixels" +
                 "\n  height: " + screen.availHeight + " pixels"
                 );

    // The app options amd default options.
    var defaultOptions = {
        url: "https://remotedesktop.google.com/access/",
        resWidthAuto:true,
        resWidth:3840,
        resHeightAuto:true,
        resHeight:1080,
        posTopAuto:true,
        posTop:0,
        posLeftAuto:true,
        posLeft:0
    };
    var options = {
        url:defaultOptions.url,
        resWidthAuto:defaultOptions.resWidthAuto,
        resWidth:defaultOptions.resWidth,
        resHeightAuto:defaultOptions.resHeightAuto,
        resHeight:defaultOptions.resHeight,
        posTopAuto:defaultOptions.posTopAuto,
        posTop:defaultOptions.posTop,
        posLeftAuto:defaultOptions.posLeftAuto,
        posLeft:defaultOptions.posLeft
    };

    // App info including the desktop size.
    var appInfo = {
        displayOriginalWidth: 0,
        displayOriginalHeight: 0,
        displayCount: 0,
        displayWidth: 0,
        displayHeight: 0,
        defaultUrl: defaultOptions.url
    };

    // Add the app manifest info to the manifest file.
    var manifest = chrome.runtime.getManifest();
    appInfo.appVersion = manifest.version;

    // Calculate the bounds of all displays "full screen" and then create the frameless "app.html" window.
    var createAppWindowFullScreen = function () {
        console.log("createAppWindowFullScreen started");
        // Callback to detect the Windows displays and resize the "app.html" window to go across all of them.
        // @see: https://developer.chrome.com/apps/system_display#method-getInfo
        chrome.system.display.getInfo(function (displayInfo) {
            console.info("Displays: " + displayInfo.length);

            // Split the displays into primary vs extended displays.
            var primaryDisplay = undefined;
            var extendedDisplays = [];
            for (var i = 0; i < displayInfo.length; i++) {
                var di = displayInfo[i];
                var friendlyName = di.name;
                var isPrimary = di.isPrimary;
                var diWidth = di.bounds.width;
                var diHeight = di.bounds.height;
                var isEnabled = di.isEnabled;
                console.info("Display " + (i + 1) + " " + (isPrimary ? "(Primary)" : "") + ":" +
                    "\n  Name: " + friendlyName +
                    "\n  Enabled: " + isEnabled +
                    "\n  Width:  " + diWidth + " pixels" +
                    "\n  Height: " + diHeight + " pixels");

                // If the display is not enabled skip it.
                if (!isEnabled) {
                    continue;
                }

                // Keep track of the primary display vs the other displays.
                if (isPrimary) {
                    primaryDisplay = di;
                } else {
                    extendedDisplays.push(di);
                }
            }

            // Default size is the primary display.
            var appWidth = primaryDisplay.bounds.width;
            var appHeight = primaryDisplay.bounds.height;

            // Include the other displays in the overall width.
            for (var i = 0; i < extendedDisplays.length; i++) {
                var di = extendedDisplays[i];
                appWidth += di.bounds.width;
                appHeight = Math.min(appHeight, di.bounds.height);
            }
            
            appInfo.displayOriginalWidth = appWidth;
            appInfo.displayOriginalHeight = appHeight;
            
            if(!options.resWidthAuto && isNumeric(options.resWidth)){
                appWidth = Number(options.resWidth);
            }
            else if(!isNumeric(options.resWidth)){
              console.log("resWidth is not number", options.resWidth);
            }
            
            if(!options.resHeightAuto && isNumeric(options.resHeight)){
                appHeight = Number(options.resHeight);
            }
            else if(!isNumeric(options.resHeight)){
              console.log("resHeight is not number", options.resHeight);
            }
            var posTop = 0;
            var posLeft = 0;
            if(!options.posTopAuto && isNumeric(options.posTop)){
                posTop = Number(options.resHeight);
            }
            else if(!isNumeric(options.posTop)){
              console.log("posTop is not number", options.posTop);
            }
            
            if(!options.posLeftAuto && isNumeric(options.posLeft)){
                posLeft = Number(options.posLeft);
            }
            else if(!isNumeric(options.posLeft)){
              console.log("posLeft is not number", options.posLeft);
            }
            
            console.info("Full Screen size:" +
                "\n  Width:  " + appWidth + " pixels" +
                "\n  Height: " + appHeight + " pixels" +
                "\n  Top: " + posTop + " pixels" +
                "\n  Left: " + posLeft + " pixels" );

            // Store the desktop info so we can pass that to "app.html".
            appInfo.displayCount = 1 + extendedDisplays.length;  // Number of displays we are using.
            appInfo.displayWidth = appWidth;  // App width.
            appInfo.displayHeight = appHeight;  // App height.

            // Create the frameless "app.html" window using full screen bounds.
            // @see: https://developer.chrome.com/apps/app_window
            var bounds = {"top": posTop, "left": posLeft, "width": appWidth, "height": appHeight};
            chrome.app.window.create("app.html", {
                id: "app-window",
                "frame": {
                    type: "none"
                },
                "resizable": false,
                "focused": true,
                "state": "normal",
                "hidden": true,
                "alwaysOnTop": false,
                "visibleOnAllWorkspaces": true
            }, function (win) {
                // Now the frameless window is created set the bounds.
                win.setBounds(bounds);
                console.log("Full screen app window created");
            });
        });
    };

    // Get the "app.html" window.
    var getAppWindow = function () {
        return chrome.app.window.get("app-window");
    }

    // Reset options.
    var resetOptions = function () {
        // Clear the options.
        chrome.storage.sync.clear(function () {
            var error = chrome.runtime.lastError;
            if (error) {
                console.error(error);
            }

            console.log("Options cleared");

            // Now load the settings (which will use defaults as we have no settings saved).
            loadOptions();
        });

    };

    // Save options.
    var saveOptions = function () {
        chrome.storage.sync.set(options, function () {
            var error = chrome.runtime.lastError;
            if (error) {
                console.error(error);
            }

            console.log("Options saved:\n" + JSON.stringify(options));
        });
    };
    
    // Load options (if settings have not been saved uses the default options).
    async function asyncLoadOptions(key) {
        return new Promise((resolve, reject) => {
            try {
                chrome.storage.sync.get(key, function (value) {
                    resolve(value);
                })
            }
            catch (ex) {
                reject(ex);
            }
        });
    }
    
    var loadOptions = function () {
        chrome.storage.sync.get(defaultOptions, function (newOptions) {
            var error = chrome.runtime.lastError;
            if (error) {
                console.error(error);
            }

            // Copy over the settings.
            for(key in newOptions){
              options[key] = newOptions[key];
            }
            //options.url = newOptions.url;

            console.log("Options loaded:\n" + JSON.stringify(options));

            // Notify that we changed the app settings.
            notifyOptionsChanged();
        });
    };
    
    // Notify that the app options have been changed.
    var notifyOptionsChanged = function () {
        chrome.runtime.sendMessage({
            method: "optionsChanged",
            options: options
        }, function (response) {
            console.info("Notified options changed");
        });
    };

    var alertKeyDownCall = function (request) {
        chrome.runtime.sendMessage({
            method: "keydownfrommain",
            keyInfo: request.keyInfo
        });
    };

    // Callback handler from "app.js".
    chrome.runtime.onMessage.addListener(
        function (request, sender, sendResponse) {
            console.log("Received message: " + request.method);

            if (request.method === "resetOptions") {
                resetOptions();
            } else if (request.method === "setOptions") {
                options = request.options;
                saveOptions();
            } else if (request.method === "appReadyToNavigate") {
                // App window is ready to navigate so show the window and load the options.
                var win = getAppWindow();
                win.show();
                loadOptions();

                // Send the app info.
                chrome.runtime.sendMessage({
                    method: "appInfoChanged",
                    appInfo: appInfo
                }, function (response) {
                    console.info("Notified app info changed");
                });
            } else if (request.method === "appExit") {
                console.info("Exit application");
                try {
                    // Close the app window which ends this app.
                    var appWindow = getAppWindow();
                    appWindow.close();
                } catch (ex) {}
            } else if (request.method === 'keydown') {
                alertKeyDownCall(request);
            }

            // Respond back to the message.
            sendResponse({});
        });

    // Create the full screen app window.
    console.info("Application ready");

    loadOptions();
    console.log("loadOptions from main.js line 288", options);
    
    setTimeout(function(){
        createAppWindowFullScreen();
    }, 100);
});