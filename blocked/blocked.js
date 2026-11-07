document.addEventListener('DOMContentLoaded', () => {
    const closeBtn = document.getElementById('closeBtn');
  
    closeBtn.addEventListener('click', () => {
      // 1. Try to close via Chrome Extension Tabs API first
      if (chrome && chrome.tabs && chrome.tabs.getCurrent) {
        chrome.tabs.getCurrent((tab) => {
          if (tab && tab.id) {
            chrome.tabs.remove(tab.id);
            return;
          }
          fallbackClose();
        });
      } else {
        fallbackClose();
      }
    });
  
    function fallbackClose() {
      // 2. If blocked page was reached via navigation, go back. Otherwise close.
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.close();
      }
    }
  });