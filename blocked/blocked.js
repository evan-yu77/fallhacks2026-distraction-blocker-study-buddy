document.addEventListener('DOMContentLoaded', () => {
    const closeBtn = document.getElementById('closeBtn');
    
    closeBtn.addEventListener('click', () => {
        // Attempts to go back to the previous safe page
        if (window.history.length > 1) {
            window.history.back();
        } else {
            // If they opened the blocked site in a new tab, close the tab entirely
            window.close();
        }
    });
});

// add close button functionality to popup.html
document.addEventListener('DOMContentLoaded', () => {
    const closeBtn = document.getElementById('closeBtn');
    
    closeBtn.addEventListener('click', () => {
        // Query the extension for the current tab and remove it
        chrome.tabs.getCurrent((tab) => {
            chrome.tabs.remove(tab.id);
        });
    });
});