chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url) {
        chrome.storage.local.get(['blockedSites'], (result) => {
            const blockedSites = result.blockedSites || [];
            
            // Convert both the current URL and the saved sites to lowercase for a guaranteed match
            const isBlocked = blockedSites.some(site => {
                const urlLower = changeInfo.url.toLowerCase();
                const siteLower = site.toLowerCase();
                return urlLower.includes(siteLower);
            });
            
            if (isBlocked) {
                const blockedPageUrl = chrome.runtime.getURL("blocked/blocked.html");
                chrome.tabs.update(tabId, { url: blockedPageUrl });
            }
        });
    }
});