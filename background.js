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