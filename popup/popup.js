document.addEventListener("DOMContentLoaded", async () => {
  const startBtn = document.getElementById("startBtn");
  const pauseBtn = document.getElementById("pauseBtn");

  // Check initial state
  const initData = await chrome.storage.local.get(["sessionActive", "sessionPaused"]);
  if (initData.sessionActive) {
    startBtn.textContent = "Stop Studying";
    pauseBtn.style.display = "inline-block";
    pauseBtn.textContent = initData.sessionPaused ? "Resume" : "Pause";
  }

  // START / STOP LOGIC
  async function toggleTimer() {
    const data = await chrome.storage.local.get(["sessionActive"]);

    if (data.sessionActive) {
      // STOP
      await chrome.storage.local.set({ 
        sessionActive: false,
        sessionPaused: false,
        leafCount: 0 
      });
      
      startBtn.textContent = "Start Studying";
      pauseBtn.style.display = "none";
      pauseBtn.textContent = "Pause";
      
      document.getElementById("timer").textContent = "00:00";
      document.getElementById("leaves").textContent = "Leaves collected: 0 🍃";
      
      chrome.runtime.sendMessage({ action: "stop" }); 
      
    } else {
      // START (Now handles both minutes and seconds)
      const minutesInput = document.getElementById("minutes");
      const secondsInput = document.getElementById("seconds");
      
      const minutes = Number(minutesInput ? minutesInput.value : 0) || 0;
      const seconds = Number(secondsInput ? secondsInput.value : 0) || 0;

      // Prevent starting a timer for 0 minutes and 0 seconds
      if (minutes === 0 && seconds === 0) return;

      // Combine minutes and seconds into a single variable
      const totalMinutes = minutes + (seconds / 60);
      const durationMs = (minutes * 60 * 1000) + (seconds * 1000);
      const endTime = Date.now() + durationMs;

      await chrome.storage.local.set({
        sessionActive: true,
        sessionPaused: false,
        sessionEndTime: endTime,
        studyDuration: totalMinutes, // Saves the exact fraction for leaf math
        pausedRemainingTime: 0,
        leafCount: 0 
      });

      startBtn.textContent = "Stop Studying";
      pauseBtn.style.display = "inline-block";
      pauseBtn.textContent = "Pause";
      
      chrome.runtime.sendMessage({ action: "start", duration: totalMinutes, remaining: totalMinutes });
      updateTimer();
    }
  }

  // PAUSE / RESUME LOGIC
  async function togglePause() {
    const data = await chrome.storage.local.get([
      "sessionActive", "sessionPaused", "sessionEndTime", "studyDuration"
    ]);

    if (!data.sessionActive) return;

    if (data.sessionPaused) {
      // RESUME
      const dataPaused = await chrome.storage.local.get(["pausedRemainingTime"]);
      const newEndTime = Date.now() + dataPaused.pausedRemainingTime;

      await chrome.storage.local.set({ sessionPaused: false, sessionEndTime: newEndTime });
      pauseBtn.textContent = "Pause";
      
      const remainingMinutes = dataPaused.pausedRemainingTime / 60000;
      chrome.runtime.sendMessage({ action: "start", duration: data.studyDuration, remaining: remainingMinutes });

    } else {
      // PAUSE
      const remainingTime = Math.max(0, data.sessionEndTime - Date.now());

      await chrome.storage.local.set({ sessionPaused: true, pausedRemainingTime: remainingTime });
      pauseBtn.textContent = "Resume";
      chrome.runtime.sendMessage({ action: "stop" });
    }
  }

  // TIMER & LEAF MATH
  async function updateTimer() {
    const data = await chrome.storage.local.get([
      "sessionActive", "sessionPaused", "sessionEndTime", "studyDuration", "pausedRemainingTime"
    ]);

    if (!data.sessionActive) return;

    // 1. Calculate how many seconds are remaining
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

    // Update Clock UI
    document.getElementById("timer").textContent =
      minutesLeft + ":" + String(secondsLeft).padStart(2, "0");

    // 2. Bulletproof Leaf Math (Based strictly on seconds)
    const totalDurationSeconds = (data.studyDuration || 25) * 60;
    const elapsedSeconds = Math.max(0, totalDurationSeconds - totalSecondsLeft);
    
    // Calculates exactly which 1/5th interval we are in
    const secondsPerLeaf = totalDurationSeconds / 5;
    let leaves = Math.floor(elapsedSeconds / secondsPerLeaf);
    
    // Clamp the leaves between 0 and 5 just to be safe
    leaves = Math.max(0, Math.min(leaves, 5));

    // Update Leaves UI and Storage
    document.getElementById("leaves").textContent = `Leaves collected: ${leaves} 🍃`;
    chrome.storage.local.set({ leafCount: leaves });

    // 3. End of Session
    if (remainingMs <= 0 && !data.sessionPaused) {
      // Play the alarm sound!
      const alarm = document.getElementById("alarmSound");
      if (alarm) alarm.play().catch(e => console.log("Audio blocked:", e));

      await chrome.storage.local.set({ sessionActive: false, sessionPaused: false });
      document.getElementById("timer").textContent = "Done!";
      startBtn.textContent = "Start Studying";
      pauseBtn.style.display = "none";
    }
  }

  // EVENT LISTENERS
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
      if (chrome.runtime.lastError) return;
      const sites = result.blockedSites || [];
      if (sites.includes(hostname)) return;

      chrome.storage.local.set({ blockedSites: [...sites, hostname] }, () => {
        if (chrome.runtime.lastError) return;
        status.textContent = `${hostname} added to blocklist.`;
        status.style.color = "green";
        status.style.display = "block";
        siteInput.value = "";
        setTimeout(() => { status.style.display = "none"; }, 2000);
      });
    });
  });

  // START LOOP
  updateTimer();
  setInterval(updateTimer, 1000);
});