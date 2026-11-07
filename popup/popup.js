document.addEventListener("DOMContentLoaded", async () => {
  const startBtn = document.getElementById("startBtn");
  const pauseBtn = document.getElementById("pauseBtn");

  // 1. Check if the timer is already running/paused when popup opens
  const initData = await chrome.storage.local.get(["sessionActive", "sessionPaused"]);
  if (initData.sessionActive) {
    startBtn.textContent = "Stop Studying";
    pauseBtn.style.display = "inline-block";
    if (initData.sessionPaused) {
      pauseBtn.textContent = "Resume";
    } else {
      pauseBtn.textContent = "Pause";
    }
  }

  // 2. Toggle function for Start/Stop
  async function toggleTimer() {
    const data = await chrome.storage.local.get(["sessionActive"]);

    if (data.sessionActive) {
      // --- STOP LOGIC ---
      await chrome.storage.local.set({ 
        sessionActive: false,
        sessionPaused: false
      });
      
      startBtn.textContent = "Start Studying";
      pauseBtn.style.display = "none";
      pauseBtn.textContent = "Pause";
      
      document.getElementById("timer").textContent = "00:00";
      document.getElementById("leaves").textContent = "Leaves collected: 0 🍃";
      
      chrome.runtime.sendMessage({ action: "stop" }); 
      
    } else {
      // --- START LOGIC ---
      const minutes = Number(document.getElementById("minutes").value);
      if (minutes < 1 || !Number.isFinite(minutes)) return;

      const duration = minutes * 60 * 1000;
      const startTime = Date.now();
      const endTime = startTime + duration;

      await chrome.storage.local.set({
        sessionActive: true,
        sessionPaused: false,
        sessionEndTime: endTime,
        studyDuration: minutes,
        pausedRemainingTime: 0
      });

      startBtn.textContent = "Stop Studying";
      pauseBtn.style.display = "inline-block";
      pauseBtn.textContent = "Pause";
      
      chrome.runtime.sendMessage({ action: "start", minutes: minutes });
      
      updateTimer();
    }
  }

  // 3. Toggle function for Pause/Resume
  async function togglePause() {
    const data = await chrome.storage.local.get([
      "sessionActive", 
      "sessionPaused", 
      "sessionEndTime"
    ]);

    if (!data.sessionActive) return;

    if (data.sessionPaused) {
      // --- RESUME LOGIC ---
      const dataPaused = await chrome.storage.local.get(["pausedRemainingTime"]);
      const newEndTime = Date.now() + dataPaused.pausedRemainingTime;

      await chrome.storage.local.set({
        sessionPaused: false,
        sessionEndTime: newEndTime
      });

      pauseBtn.textContent = "Pause";
      
      // Tell background to resume alarms using the remaining time
      const remainingMinutes = dataPaused.pausedRemainingTime / (60 * 1000);
      chrome.runtime.sendMessage({ action: "start", minutes: remainingMinutes });

    } else {
      // --- PAUSE LOGIC ---
      const remainingTime = Math.max(0, data.sessionEndTime - Date.now());

      await chrome.storage.local.set({
        sessionPaused: true,
        pausedRemainingTime: remainingTime
      });

      pauseBtn.textContent = "Resume";
      
      // Tell background to stop alarms so leaves don't drop while paused
      chrome.runtime.sendMessage({ action: "stop" });
    }
  }

  // 4. Update the visual timer and leaf count
  async function updateTimer() {
    const data = await chrome.storage.local.get([
      "sessionActive",
      "sessionPaused",
      "sessionEndTime",
      "studyDuration",
      "pausedRemainingTime"
    ]);

    if (!data.sessionActive) return;

    let remaining;
    if (data.sessionPaused) {
      // If paused, freeze the clock using the saved remaining time
      remaining = data.pausedRemainingTime;
    } else {
      // If running, calculate dynamically based on the target end time
      remaining = Math.max(0, data.sessionEndTime - Date.now());
    }

    const totalSeconds = Math.ceil(remaining / 1000);
    const minutesLeft = Math.floor(totalSeconds / 60);
    const secondsLeft = totalSeconds % 60;

    document.getElementById("timer").textContent =
      minutesLeft + ":" + String(secondsLeft).padStart(2, "0");

    // Calculate leaves based on total time minus remaining time
    // This perfectly handles pauses because 'remaining' is frozen while paused
    const durationMs = data.studyDuration * 60 * 1000;
    const elapsed = durationMs - remaining;
    const leaves = Math.min(5, Math.floor(elapsed / (durationMs / 5)));

    document.getElementById("leaves").textContent =
      "Leaves collected: " + leaves + " 🍃";

    if (remaining === 0 && !data.sessionPaused) {
      await chrome.storage.local.set({ sessionActive: false, sessionPaused: false });
      document.getElementById("timer").textContent = "Done!";
      startBtn.textContent = "Start Studying";
      pauseBtn.style.display = "none";
    }
  }

  // 5. Attach Event Listeners
  startBtn.addEventListener("click", toggleTimer);
  pauseBtn.addEventListener("click", togglePause);

  document.getElementById("saveBtn").addEventListener("click", () => {
    const siteInput = document.getElementById("siteInput");
    const status = document.getElementById("saveStatus");
    let hostname;

    try {
      const value = siteInput.value.trim();
      if (!value) throw new Error("Enter a website to block.");

      const url = new URL(value.includes("://") ? value : `https://${value}`);
      hostname = url.hostname.toLowerCase().replace(/^www\./, "");
      if (!hostname) throw new Error("Enter a valid website.");
    } catch (error) {
      status.textContent = error.message || "Enter a valid website.";
      status.style.color = "red";
      status.style.display = "block";
      return;
    }

    chrome.storage.local.get(["blockedSites"], (result) => {
      if (chrome.runtime.lastError) {
        status.textContent = "Could not read the blocklist.";
        status.style.color = "red";
        status.style.display = "block";
        return;
      }

      const sites = result.blockedSites || [];
      if (sites.includes(hostname)) {
        status.textContent = `${hostname} is already blocked.`;
        status.style.color = "red";
        status.style.display = "block";
        return;
      }

      chrome.storage.local.set({ blockedSites: [...sites, hostname] }, () => {
        if (chrome.runtime.lastError) {
          status.textContent = "Could not save the blocklist.";
          status.style.color = "red";
          status.style.display = "block";
          return;
        }

        status.textContent = `${hostname} added to blocklist.`;
        status.style.color = "green";
        status.style.display = "block";
        siteInput.value = "";
        setTimeout(() => {
          status.style.display = "none";
        }, 2000);
      });
    });
  });

  // 6. Start the interval loop
  updateTimer();
  setInterval(updateTimer, 1000);
});