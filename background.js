chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    const currentUrl = changeInfo.url || tab.url;

    if (!currentUrl) return;

    let hostname;
    try {
        const url = new URL(currentUrl);
        if (url.protocol !== "http:" && url.protocol !== "https:") return;
        hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    } catch {
        return;
    }

    chrome.storage.local.get(["blockedSites"], (result) => {
        if (chrome.runtime.lastError) {
            console.error("Could not read the blocked sites list:", chrome.runtime.lastError.message);
            return;
        }

        const blockedSites = result.blockedSites || [];
        const isBlocked = blockedSites.some((site) => {
            if (typeof site !== "string") return false;

            try {
                const siteUrl = new URL(site.includes("://") ? site : `https://${site}`);
                const blockedHostname = siteUrl.hostname.toLowerCase().replace(/^www\./, "");
                return hostname === blockedHostname || hostname.endsWith(`.${blockedHostname}`);
            } catch {
                return false;
            }
        });

        if (isBlocked) {
            chrome.tabs.update(tabId, { url: chrome.runtime.getURL("blocked/blocked.html") }, () => {
                if (chrome.runtime.lastError) {
                    console.error("Could not redirect the blocked tab:", chrome.runtime.lastError.message);
                }
            });
        }
    });
});

// Listen for messages from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "start") {
        // For the hackathon MVP, drop 5 leaves evenly across the study time
        // (You can plug in your prime number math function here)
        const leafInterval = request.minutes / 5; 
        
        chrome.alarms.create('leafDrop', { periodInMinutes: leafInterval });
        chrome.alarms.create('sessionEnd', { delayInMinutes: request.minutes });
        
    } else if (request.action === "stop") {
        // Kills the timer immediately
        chrome.alarms.clearAll();
    }
});

// Handle the alarms when they trigger
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'leafDrop') {
        // Increment the leaf counter in storage
        chrome.storage.local.get(['leafCount'], (result) => {
            let count = (result.leafCount || 0) + 1;
            chrome.storage.local.set({ 'leafCount': count });
        });
        
    } else if (alarm.name === 'sessionEnd') {
        chrome.alarms.clearAll();
        chrome.storage.local.set({ isStudying: false });
        // Optional: Trigger break time animation logic here
    }
});

// Listen for messages from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "start") {
        // Use total duration to keep the interval consistent even after pausing
        const leafInterval = request.duration / 5; 
        
        chrome.alarms.create('leafDrop', { periodInMinutes: leafInterval });
        // Use remaining time for the actual end of session
        chrome.alarms.create('sessionEnd', { delayInMinutes: request.remaining });
        
    } else if (request.action === "stop") {
        chrome.alarms.clearAll();
    }
});

// Handle the alarms when they trigger
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'leafDrop') {
        
        // The popup is now handling the math. This alarm is strictly to tell 
        // active browser tabs to run the falling leaf CSS animation!
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs.length > 0) {
                chrome.tabs.sendMessage(tabs[0].id, { action: "animateLeaf" });
            }
        });
        
    } else if (alarm.name === 'sessionEnd') {
        chrome.alarms.clearAll();
        chrome.storage.local.set({ isStudying: false });
        
        // Tell active tabs to scatter the leaves for the break!
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs.length > 0) {
                chrome.tabs.sendMessage(tabs[0].id, { action: "scatterLeaves" });
            }
        });
    }
});