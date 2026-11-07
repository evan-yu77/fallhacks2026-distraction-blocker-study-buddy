
async function updateTimer() {
    const data = await chrome.storage.local.get([
      "sessionActive",
      "sessionStartTime",
      "sessionEndTime",
      "studyDuration"
    ]);
  
    const timer = document.getElementById("timer");
    const leavesDisplay = document.getElementById("leaves");
  
    if (!timer || !leavesDisplay) return;
  
    if (!data.sessionActive) {
      timer.textContent = "Ready to study!";
      return;
    }
  
    const remaining = Math.max(
      0,
      data.sessionEndTime - Date.now()
    );
  
    const totalSeconds = Math.ceil(remaining / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
  
    timer.textContent =
      minutes + ":" + String(seconds).padStart(2, "0");
  
    const duration = data.studyDuration * 60 * 1000;
    const elapsed = Math.max(
      0,
      Date.now() - data.sessionStartTime
    );
  
    const leaves = Math.min(
      5,
      Math.floor(elapsed / (duration / 5))
    );
  
    leavesDisplay.textContent =
      "🍃 Leaves collected: " + leaves;
  
    if (remaining === 0) {
      timer.textContent = "Break time! 🎉";
  
      await chrome.storage.local.set({
        sessionActive: false
      });
    }
  }
  
  updateTimer();
  setInterval(updateTimer, 1000);
  
  chrome.storage.onChanged.addListener(updateTimer);
  
document.addEventListener("DOMContentLoaded", () => {
    
    function syncDashboard() {
        chrome.storage.local.get([
            "sessionActive", 
            "sessionPaused", 
            "sessionEndTime", 
            "pausedRemainingTime", 
            "leafCount"
        ], (data) => {
            
            // 1. Sync the Leaves
            const leaves = data.leafCount || 0;
            const leafElement = document.getElementById("leaves"); 
            
            if (leafElement) {
                leafElement.textContent = `Leaves collected: ${leaves} 🍃`;
            }

            // 2. Sync the Timer display
            const timerElement = document.getElementById("timer");
            if (!timerElement) return;

            if (!data.sessionActive) {
                timerElement.textContent = "00:00";
                return;
            }

            let remainingMs = 0;
            if (data.sessionPaused) {
                remainingMs = data.pausedRemainingTime || 0;
            } else {
                const targetEnd = data.sessionEndTime || Date.now();
                remainingMs = Math.max(0, targetEnd - Date.now());
            }

            const totalSecondsLeft = Math.ceil(remainingMs / 1000);
            const minutesLeft = Math.floor(totalSecondsLeft / 60);
            const secondsLeft = totalSecondsLeft % 60;

            timerElement.textContent = minutesLeft + ":" + String(secondsLeft).padStart(2, "0");
        });
    }

    // Run immediately, then check storage every second
    syncDashboard();
    setInterval(syncDashboard, 1000);
  });