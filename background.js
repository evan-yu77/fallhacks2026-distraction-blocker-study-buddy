chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Grab the URL from either changeInfo or the tab object itself
    const currentUrl = changeInfo.url || tab.url; 
    
    // Only proceed if a valid HTTP/HTTPS URL exists (ignores chrome:// pages)
    if (currentUrl && currentUrl.startsWith('http')) {
        chrome.storage.local.get(['blockedSites'], (result) => {
            const blockedSites = result.blockedSites || [];
            
            const isBlocked = blockedSites.some(site => {
                const urlLower = currentUrl.toLowerCase();
                const siteLower = site.toLowerCase();
                return urlLower.includes(siteLower);
            });
            
            if (isBlocked) {
                const blockedPageUrl = chrome.runtime.getURL("blocked/blocked.html");
                // Redirect the tab immediately
                chrome.tabs.update(tabId, { url: blockedPageUrl });
            }
        });
    }
});