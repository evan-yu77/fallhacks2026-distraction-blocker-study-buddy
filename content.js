const mascot = document.createElement("div");
mascot.id = "sidekick";
mascot.style.cursor = "pointer"; // Force pointer cursor

const image = document.createElement("img");
image.src = chrome.runtime.getURL("assets/mascot.svg");
image.alt = "Jeppy sidekick";
// Prevent the image itself from dragging or intercepting the click
image.style.pointerEvents = "none"; 

mascot.appendChild(image);
document.documentElement.appendChild(mascot);

let logModal = null;

mascot.addEventListener('click', (e) => {
    // Stop the website from intercepting or ignoring the click
    e.preventDefault();
    e.stopPropagation();

    // If it's already open, close it
    if (logModal) {
        logModal.remove();
        logModal = null;
        return;
    }

    // Build the UI
    logModal = document.createElement('div');
    logModal.id = 'sidekick-log-modal';
    
    // Hackathon trick: Apply critical CSS directly via JS so no website can override it
    logModal.style.cssText = `
        position: fixed !important;
        bottom: 110px !important;
        right: 20px !important;
        width: 260px !important;
        background: #fff0d4 !important;
        border: 4px solid #27140b !important;
        box-shadow: 4px 4px 0px rgba(0,0,0,0.4) !important;
        padding: 15px !important;
        z-index: 2147483647 !important;
        font-family: 'Courier New', monospace !important;
        color: #27140b !important;
        display: block !important;
    `;
    
    const header = document.createElement('h3');
    header.textContent = "📖 Study History";
    header.style.cssText = "margin: 0 0 10px 0; font-size: 14px; font-weight: bold; border-bottom: 2px dashed #d5a575; padding-bottom: 8px;";
    logModal.appendChild(header);

    const list = document.createElement('ul');
    list.style.cssText = "list-style: none; padding: 0; margin: 0; max-height: 150px; overflow-y: auto;";
    
    // Fetch the history we just saved in popup.js
    chrome.storage.local.get(['studyHistory'], (result) => {
        const history = result.studyHistory || [];
        
        if (history.length === 0) {
            list.innerHTML = "<li style='font-size: 12px; padding: 8px 0;'>No sessions completed yet.</li>";
        } else {
            history.forEach(session => {
                const li = document.createElement('li');
                li.style.cssText = "font-size: 12px; font-weight: bold; padding: 8px 0; border-bottom: 1px dashed #d5a575;";
                li.textContent = `${session.time} | ${session.duration}m | ${session.leaves}🍃`;
                list.appendChild(li);
            });
        }
    });

    logModal.appendChild(list);
    
    // Append to body instead of documentElement for better compatibility
    document.body.appendChild(logModal);
});



async function updateMascot() {
  const data = await chrome.storage.local.get([
    "sessionActive",
    "sessionEndTime",
    "sessionPhase",
    "studyDuration",
    "leafCount",
    "breakDurationMs",
    "sessionPaused"
  ]);

  const now = Date.now();

  // THE BACKUP WATCHER: If the popup is closed, the mascot handles the end of the session
  if (data.sessionActive && data.sessionPhase === "focus" && !data.sessionPaused && data.sessionEndTime <= now) {
      const histData = await chrome.storage.local.get(["studyHistory"]);
      const history = histData.studyHistory || [];
      
      // The 5-second cooldown prevents duplicates if you have multiple tabs open
      if (history.length === 0 || now - (history[0].timestamp || 0) > 5000) {
          history.unshift({
              date: new Date().toLocaleDateString(),
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              duration: Math.round(data.studyDuration || 0),
              leaves: data.leafCount || 5,
              timestamp: now
          });
          if (history.length > 10) history.pop();
          await chrome.storage.local.set({ studyHistory: history });
      }

      // Advance to break or end session
      if (data.breakDurationMs > 0) {
          await chrome.storage.local.set({ 
              sessionPhase: "break", 
              sessionEndTime: now + data.breakDurationMs 
          });
          const alarm = new Audio(chrome.runtime.getURL("assets/alarm.mp3"));
          alarm.play().catch(()=>{});
      } else {
          await chrome.storage.local.set({ sessionActive: false, sessionPhase: "done" });
      }
  }

  // Read fresh data in case the watcher just updated it
  const freshData = await chrome.storage.local.get(["sessionActive", "sessionPhase", "sessionEndTime"]);
  const isStudying = freshData.sessionActive && freshData.sessionPhase === "focus" && freshData.sessionEndTime > Date.now();
  
  mascot.style.display = "block"; 
  
  // Clean up the modal if the timer stops
  if (!isStudying && logModal) {
      logModal.remove();
      logModal = null;
  }
}

updateMascot();
chrome.storage.onChanged.addListener(updateMascot);
setInterval(updateMascot, 1000);