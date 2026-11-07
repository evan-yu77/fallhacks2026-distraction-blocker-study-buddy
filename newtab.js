
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
  