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
      await chrome.storage.local.set({ sessionActive: false, sessionPaused: false, sessionPhase: "idle", leafCount: 0 });
      startBtn.textContent = "Start";
      pauseBtn.style.display = "none";
      pauseBtn.textContent = "Pause";
      
      document.getElementById("timer").textContent = "00:00";
      document.getElementById("leaves").textContent = "Leaves collected: 0 🍃";
      chrome.runtime.sendMessage({ action: "stop" }).catch(() => {}); 
      
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
        leafCount: 0,
        isBreakActive: false,
        breakEndTime: null
      });

      startBtn.textContent = "Stop";
      pauseBtn.style.display = "inline-block";
      pauseBtn.textContent = "Pause";
      
      chrome.runtime.sendMessage({ action: "start", duration: totalMinutes, remaining: totalMinutes }).catch(() => {});
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
      chrome.runtime.sendMessage({ action: "start", duration: totalMins, remaining: remainingMins }).catch(() => {});

    } else {
      // PAUSE
      const remainingTime = Math.max(0, data.sessionEndTime - Date.now());
      await chrome.storage.local.set({ sessionPaused: true, pausedRemainingTime: remainingTime });
      pauseBtn.textContent = "Resume";
      chrome.runtime.sendMessage({ action: "stop" }).catch(() => {});
    }
  }

  // Both views read exactly the same stored focus/break phase.
  let previousPhase = null;
  async function updateTimer() {
    const data = await SidekickTimer.read();
    const active = Boolean(data.sessionActive);
    startBtn.textContent = active ? "Stop" : "Start";
    pauseBtn.style.display = active ? "inline-block" : "none";
    pauseBtn.textContent = data.sessionPaused ? "Resume" : "Pause";
    if (!active) {
      document.getElementById("timer").textContent = data.sessionPhase === 'done' ? "Done!" : "00:00";
      document.getElementById("leaves").textContent = data.sessionPhase === 'done' ? "Session complete! 🍃" : "Leaves collected: 0 🍃";
      previousPhase = data.sessionPhase;
      return;
    }
    document.getElementById("timer").textContent = SidekickTimer.format(SidekickTimer.remaining(data));
    if (data.sessionPhase === 'break') {
      document.getElementById("leaves").textContent = "☕ Break Time!";
      if (previousPhase === 'focus') {
        const alarm = document.getElementById('alarmSound');
        if (alarm) alarm.play().catch(() => {});
      }
    } else {
      const durationMs = (data.studyDuration || 25) * 60000;
      const elapsedMs = Math.max(0, durationMs - SidekickTimer.remaining(data));
      const leaves = Math.min(5, Math.floor(elapsedMs / (durationMs / 5)));
      document.getElementById("leaves").textContent = `Leaves collected: ${leaves} 🍃`;
      if (data.leafCount !== leaves) await chrome.storage.local.set({leafCount: leaves});
    }
    previousPhase = data.sessionPhase;
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
  setInterval(updateTimer, 500);
});