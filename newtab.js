document.addEventListener("DOMContentLoaded", () => {
  const timerElement = document.getElementById("timer");
  const leavesDisplay = document.getElementById("leaves");
  const leafPile = document.getElementById("leafPile");
  const groundMascot = document.getElementById("groundMascot");
  const groundLeaf = document.getElementById("groundLeaf");
  const leafBurst = document.getElementById("leafBurst");
  const pageTitle = document.getElementById("pageTitle");
  const hudStatus = document.getElementById("hudStatus");
  const endBreakBtn = document.getElementById("endBreakBtn");
  const alarmSound = document.getElementById("alarmSound");

  let lastKnownLeaves = null;
  let isGathering = false;
  let isDiving = false;
  let alarmPlayed = false;

  // 1. UPDATE PILE VISUAL STAGE
  function updateLeafPile(count) {
    if (!leafPile) return;
    leafPile.className = `leaf-pile stage-${count}`;
  }

  // 2. INCREMENTAL LEAF PICKUP (DURING STUDY)
  function triggerPickupAnimation(newCount) {
    if (isGathering || isDiving || !groundMascot || !groundLeaf) return;
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

      showFloatingBadge("+1 🍂", "leaf-popup-text");
    }, 2500);

    setTimeout(() => {
      groundMascot.classList.remove("gathering");
      isGathering = false;
    }, 3200);
  }

  function showFloatingBadge(text, className) {
    const floatText = document.createElement("div");
    floatText.className = className;
    floatText.textContent = text;
    document.body.appendChild(floatText);
    setTimeout(() => floatText.remove(), 1800);
  }

  // 3. JOYFUL LEAF DIVE & EXPLOSION BEFORE ZEN BREAK
  function triggerLeafDiveCelebration() {
    if (isDiving || !groundMascot || !leafPile) return;
    isDiving = true;

    // Play alarm chime
    if (!alarmPlayed && alarmSound) {
      alarmSound.play().catch(() => {});
      alarmPlayed = true;
    }

    if (timerElement) timerElement.textContent = "DONE! 🎉";
    if (hudStatus) hudStatus.textContent = "Session Complete!";

    // A. Start mascot sprint & leap
    groundMascot.classList.remove("gathering", "has-leaf");
    groundMascot.classList.add("leaf-dive");

    // B. At 1.4s: Mascot lands in the pile -> LEAVES EXPLODE!
    setTimeout(() => {
      // Squash the leaf pile on impact
      leafPile.classList.add("splash");

      // Trigger multi-directional flying leaf burst
      if (leafBurst) {
        leafBurst.classList.remove("active");
        void leafBurst.offsetWidth;
        leafBurst.classList.add("active");
      }

      showFloatingBadge("BREAK TIME! 🍂", "dive-popup-text");
    }, 1400);

    // C. At 3.2s: Celebration finishes -> Transition to Zen Garden Sanctuary
    setTimeout(async () => {
      groundMascot.classList.remove("leaf-dive");
      leafPile.classList.remove("splash");
      if (leafBurst) leafBurst.classList.remove("active");
      isDiving = false;

      // Launch 5-minute Zen Break
      const breakDuration = 5 * 60 * 1000;
      await chrome.storage.local.set({
        sessionActive: false,
        isBreakActive: true,
        breakEndTime: Date.now() + breakDuration
      });

      setZenBreakMode(true, 5, 0);
    }, 3200);
  }

  // 4. ENTER / EXIT ZEN BREAK
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

  // 5. MAIN SYNC LOOP
  async function syncDashboard() {
    const data = await chrome.storage.local.get([
      "sessionActive",
      "sessionPaused",
      "sessionEndTime",
      "pausedRemainingTime",
      "leafCount",
      "isBreakActive",
      "breakEndTime"
    ]);

    // CHECK A: Is Break Active?
    if (data.isBreakActive) {
      const breakRemaining = Math.max(0, (data.breakEndTime || Date.now()) - Date.now());
      const totalSec = Math.ceil(breakRemaining / 1000);
      const mins = Math.floor(totalSec / 60);
      const secs = totalSec % 60;

      if (breakRemaining > 0) {
        setZenBreakMode(true, mins, secs);
        return;
      } else {
        // Break ended
        await chrome.storage.local.set({ isBreakActive: false });
        setZenBreakMode(false);
        alarmPlayed = false;
      }
    }

    // CHECK B: Inactive / Idle Timer
    if (!data.sessionActive) {
      if (!isDiving) {
        setZenBreakMode(false);
        if (timerElement) timerElement.textContent = "00:00";
        if (leavesDisplay) leavesDisplay.textContent = "Leaves collected: 0 🍃";
        updateLeafPile(0);
        lastKnownLeaves = 0;
      }
      return;
    }

    // CHECK C: Active Session Countdown
    setZenBreakMode(false);

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

    // TIME'S UP! TRIGGER DIVE CELEBRATION
    if (remainingMs <= 0 && !data.sessionPaused) {
      if (!isDiving) {
        triggerLeafDiveCelebration();
      }
      return;
    }

    if (timerElement && !isDiving) {
      timerElement.textContent = `${minutesLeft}:${String(secondsLeft).padStart(2, "0")}`;
    }

    // Leaves Management
    const currentLeaves = data.leafCount ?? 0;
    if (leavesDisplay) {
      leavesDisplay.textContent = `Leaves collected: ${currentLeaves} 🍃`;
    }

    if (lastKnownLeaves === null) {
      lastKnownLeaves = currentLeaves;
      updateLeafPile(currentLeaves);
      return;
    }

    if (currentLeaves > lastKnownLeaves) {
      triggerPickupAnimation(currentLeaves);
      lastKnownLeaves = currentLeaves;
    } else if (currentLeaves < lastKnownLeaves) {
      lastKnownLeaves = currentLeaves;
      updateLeafPile(currentLeaves);
    }
  }

  // 6. "LOCK BACK IN" (End Break Button)
  if (endBreakBtn) {
    endBreakBtn.addEventListener("click", async () => {
      await chrome.storage.local.set({
        isBreakActive: false,
        sessionActive: false,
        leafCount: 0
      });
      alarmPlayed = false;
      isDiving = false;
      setZenBreakMode(false);
      if (timerElement) timerElement.textContent = "00:00";
      if (leavesDisplay) leavesDisplay.textContent = "Leaves collected: 0 🍃";
      updateLeafPile(0);
    });
  }

  syncDashboard();
  setInterval(syncDashboard, 1000);
  chrome.storage.onChanged.addListener(syncDashboard);
});