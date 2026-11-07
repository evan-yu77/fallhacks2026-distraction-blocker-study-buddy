document.addEventListener("DOMContentLoaded", async () => {
  const startBtn = document.getElementById("startBtn");
  const pauseBtn = document.getElementById("pauseBtn");

  // Check initial state
  const initData = await chrome.storage.local.get(["sessionActive", "sessionPaused"]);
  if (initData.sessionActive) {
    startBtn.textContent = "Stop";
    pauseBtn.style.display = "inline-block";
    pauseBtn.textContent = initData.sessionPaused ? "Resume" : "Pause";
  }

  // START / STOP LOGIC
  async function toggleTimer() {
    const data = await chrome.storage.local.get(["sessionActive"]);

    if (data.sessionActive) {
      // STOP
      await chrome.storage.local.set({ sessionActive: false, sessionPaused: false, leafCount: 0 });
      startBtn.textContent = "Start";
      pauseBtn.style.display = "none";
      pauseBtn.textContent = "Pause";
      
      document.getElementById("timer").textContent = "00:00";
      document.getElementById("leaves").textContent = "Leaves collected: 0 🍃";
      chrome.runtime.sendMessage({ action: "stop" }); 
      
    } else {
      // START 
      const minutes = Number(document.getElementById("minutes")?.value || 0);
      const seconds = Number(document.getElementById("seconds")?.value || 0);
      const breakMins = Number(document.getElementById("breakMinutes")?.value || 0);
      const breakSecs = Number(document.getElementById("breakSeconds")?.value || 0);

      if (minutes === 0 && seconds === 0) return;

      const totalMinutes = minutes + (seconds / 60);
      const durationMs = (minutes * 60 * 1000) + (seconds * 1000);
      const breakDurationMs = (breakMins * 60 * 1000) + (breakSecs * 1000);
      
      const endTime = Date.now() + durationMs;

      await chrome.storage.local.set({
        sessionActive: true,
        sessionPaused: false,
        sessionPhase: "focus", // Tracks whether we are studying or resting
        sessionEndTime: endTime,
        studyDuration: totalMinutes,
        breakDurationMs: breakDurationMs,
        pausedRemainingTime: 0,
        leafCount: 0 
      });

      startBtn.textContent = "Stop";
      pauseBtn.style.display = "inline-block";
      pauseBtn.textContent = "Pause";
      
      chrome.runtime.sendMessage({ action: "start", duration: totalMinutes, remaining: totalMinutes });
      updateTimer();
    }
  }

  // PAUSE / RESUME LOGIC
  async function togglePause() {
    const data = await chrome.storage.local.get([
      "sessionActive", "sessionPaused", "sessionEndTime", "studyDuration", "sessionPhase", "breakDurationMs"
    ]);

    if (!data.sessionActive) return;

    if (data.sessionPaused) {
      // RESUME
      const dataPaused = await chrome.storage.local.get(["pausedRemainingTime"]);
      const newEndTime = Date.now() + dataPaused.pausedRemainingTime;

      await chrome.storage.local.set({ sessionPaused: false, sessionEndTime: newEndTime });
      pauseBtn.textContent = "Pause";
      
      const remainingMins = dataPaused.pausedRemainingTime / 60000;
      const totalMins = data.sessionPhase === "focus" ? data.studyDuration : (data.breakDurationMs / 60000);
      chrome.runtime.sendMessage({ action: "start", duration: totalMins, remaining: remainingMins });

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
      "sessionActive", "sessionPaused", "sessionEndTime", "studyDuration", "pausedRemainingTime", "sessionPhase", "breakDurationMs"
    ]);

    if (!data.sessionActive) return;

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

    document.getElementById("timer").textContent = minutesLeft + ":" + String(secondsLeft).padStart(2, "0");

    // UI Updates based on Phase
    if (data.sessionPhase === "break") {
        document.getElementById("leaves").textContent = "☕ Break Time!";
    } else {
        const totalDurationSeconds = (data.studyDuration || 25) * 60;
        const elapsedSeconds = Math.max(0, totalDurationSeconds - totalSecondsLeft);
        
        const secondsPerLeaf = totalDurationSeconds / 5;
        let leaves = Math.floor(elapsedSeconds / secondsPerLeaf);
        leaves = Math.max(0, Math.min(leaves, 5));
        
        document.getElementById("leaves").textContent = `Leaves collected: ${leaves} 🍃`;
        chrome.storage.local.set({ leafCount: leaves });
    }

    // END OF SESSION CHECK
    if (remainingMs <= 0 && !data.sessionPaused) {
      const alarm = document.getElementById("alarmSound");
      if (alarm) alarm.play().catch(e => console.log("Audio blocked:", e));

      if (data.sessionPhase === "focus" && data.breakDurationMs > 0) {
        // Automatically switch to Break Timer!
        const newEndTime = Date.now() + data.breakDurationMs;
        await chrome.storage.local.set({ sessionPhase: "break", sessionEndTime: newEndTime });
        
        const breakMins = data.breakDurationMs / 60000;
        chrome.runtime.sendMessage({ action: "start", duration: breakMins, remaining: breakMins });
        
      } else {
        // Completely Done
        await chrome.storage.local.set({ sessionActive: false, sessionPaused: false });
        document.getElementById("timer").textContent = "Done!";
        startBtn.textContent = "Start";
        pauseBtn.style.display = "none";
      }
    }
  }

  startBtn.addEventListener("click", toggleTimer);
  pauseBtn.addEventListener("click", togglePause);

  // Blocklist logic remains untouched below
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

  updateTimer();
  setInterval(updateTimer, 100);
});