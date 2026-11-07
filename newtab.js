document.addEventListener("DOMContentLoaded", () => {
  const timerElement = document.getElementById("timer");
  const leavesDisplay = document.getElementById("leaves");
  const leafPile = document.getElementById("leafPile");
  const groundMascot = document.getElementById("groundMascot");
  const groundLeaf = document.getElementById("groundLeaf");
  const pageTitle = document.getElementById("pageTitle");
  const hudStatus = document.getElementById("hudStatus");
  const endBreakBtn = document.getElementById("endBreakBtn");
  const alarmSound = document.getElementById("alarmSound");

  let lastKnownLeaves = null;
  let isGathering = false;
  let alarmPlayed = false;

  // 1. UPDATE PILE VISUAL STAGE
  function updateLeafPile(count) {
    if (!leafPile) return;
    leafPile.className = `leaf-pile stage-${count}`;
  }

  // 2. LEAF PICKUP CUTSCENE
  function triggerPickupAnimation(newCount) {
    if (isGathering || !groundMascot || !groundLeaf) return;
    isGathering = true;

    groundLeaf.classList.add("active");
    groundMascot.classList.remove("has-leaf");
    groundMascot.classList.add("gathering");

    setTimeout(() => {
      groundLeaf.classList.remove("active");
      groundMascot.classList.add("has-leaf");
    }, 1100);

    setTimeout(() => {
      groundMascot.classList.remove("has-leaf");
      updateLeafPile(newCount);

      leafPile.classList.remove("bounce");
      void leafPile.offsetWidth;
      leafPile.classList.add("bounce");

      showFloatingPlusOne();
    }, 2500);

    setTimeout(() => {
      groundMascot.classList.remove("gathering");
      isGathering = false;
    }, 3200);
  }

  function showFloatingPlusOne() {
    const floatText = document.createElement("div");
    floatText.className = "leaf-popup-text";
    floatText.textContent = "+1 🍂";
    document.body.appendChild(floatText);
    setTimeout(() => floatText.remove(), 1400);
  }

  // 3. ENTER / EXIT ZEN BREAK
  function setZenBreakMode(active, minutesLeft, secondsLeft) {
    if (active) {
      document.body.classList.add("is-break");
      if (pageTitle) pageTitle.textContent = "Jepi Zen Mode";
      if (hudStatus) hudStatus.textContent = "Break Time";
      if (timerElement) {
        timerElement.textContent = `${minutesLeft}:${String(secondsLeft).padStart(2, "0")}`;
      }
      if (leavesDisplay) {
        leavesDisplay.textContent = "Chill out for a bit";
      }
    } else {
      document.body.classList.remove("is-break");
      if (pageTitle) pageTitle.textContent = "Jepi's Always Watching....";
      if (hudStatus) hudStatus.textContent = "Focus Timer";
    }
  }

  // 4. MAIN SYNC LOOP - uses shared state with popup.
  async function syncDashboard() {
    const data = await SidekickTimer.read();

    // --- NEW: THE MISSING END OF SESSION & HISTORY CHECK ---
    if (data.sessionActive && !data.sessionPaused && SidekickTimer.remaining(data) <= 0) {
      if (data.sessionPhase === "focus") {
        
        // Log History (with 5-second cooldown to prevent double-logging with popup)
        const histData = await chrome.storage.local.get(["studyHistory"]);
        const history = histData.studyHistory || [];
        const now = Date.now();
        
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

        // Switch to Break Timer OR Complete Session
        if (data.breakDurationMs > 0) {
            const newEndTime = Date.now() + data.breakDurationMs;
            await chrome.storage.local.set({ sessionPhase: "break", sessionEndTime: newEndTime });
            const breakMins = data.breakDurationMs / 60000;
            chrome.runtime.sendMessage({ action: "start", duration: breakMins, remaining: breakMins }).catch(() => {});
        } else {
            await chrome.storage.local.set({ sessionActive: false, sessionPaused: false, sessionPhase: "done" });
        }
      } else if (data.sessionPhase === "break") {
        // End the break
        await chrome.storage.local.set({ sessionActive: false, sessionPaused: false, sessionPhase: "done" });
      }
      return; // Exit this loop tick and wait for the new state to load
    }
    // --------------------------------------------------

    const isBreak = data.sessionActive && data.sessionPhase === 'break';
    const remainingMs = data.sessionActive ? SidekickTimer.remaining(data) : 0;
    const totalSecs = Math.ceil(remainingMs / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;

    if (isBreak) {
      setZenBreakMode(true, mins, secs);
      if (!alarmPlayed && alarmSound) {
        alarmSound.play().catch(() => {});
        alarmPlayed = true;
      }
      return;
    }
    
    alarmPlayed = false;
    setZenBreakMode(false);
    
    if (!data.sessionActive) {
      if (timerElement) timerElement.textContent = data.sessionPhase === 'done' ? 'Done!' : '00:00';
      if (leavesDisplay) leavesDisplay.textContent = data.sessionPhase === 'done' ? 'Session complete! 🍃' : 'Leaves collected: 0 🍃';
      if (data.sessionPhase !== 'done') updateLeafPile(0);
      lastKnownLeaves = data.sessionPhase === 'done' ? 5 : 0;
      return;
    }
    
    if (timerElement) timerElement.textContent = SidekickTimer.format(remainingMs);
    const durationMs = (data.studyDuration || 25) * 60000;
    const currentLeaves = Math.min(5, Math.floor(Math.max(0, durationMs - remainingMs) / (durationMs / 5)));
    if (leavesDisplay) leavesDisplay.textContent = `Leaves collected: ${currentLeaves} 🍃`;
    
    if (lastKnownLeaves === null) {
      lastKnownLeaves = currentLeaves;
      updateLeafPile(currentLeaves);
    } else if (currentLeaves > lastKnownLeaves) {
      triggerPickupAnimation(currentLeaves);
      lastKnownLeaves = currentLeaves;
    } else if (currentLeaves < lastKnownLeaves) {
      lastKnownLeaves = currentLeaves;
      updateLeafPile(currentLeaves);
    }
  }

  // 5. "READY TO STUDY" (End Break Button)
  if (endBreakBtn) {
    endBreakBtn.addEventListener("click", async () => {
      await chrome.storage.local.set({
        sessionPhase: "idle",
        sessionActive: false,
        sessionPaused: false,
        leafCount: 0
      });
      alarmPlayed = false;
      setZenBreakMode(false);
      if (timerElement) timerElement.textContent = "00:00";
      if (leavesDisplay) leavesDisplay.textContent = "Leaves collected: 0 🍃";
      updateLeafPile(0);
    });
  }

  syncDashboard();
  setInterval(syncDashboard, 500);
  chrome.storage.onChanged.addListener(syncDashboard);
});
