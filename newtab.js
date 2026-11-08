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

    // Show the completed pile before Jepi jumps into it.
    updateLeafPile(5);

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

    // C. After the celebration, show Zen mode using the SHARED break timer.
    // The break countdown started when focus ended, not after the animation.
    setTimeout(() => {
      groundMascot.classList.remove("leaf-dive");
      leafPile.classList.remove("splash");
      if (leafBurst) leafBurst.classList.remove("active");
      isDiving = false;
      syncDashboard();
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

  // 5. MAIN SYNC LOOP - same phase and deadline as the popup.
  let previousPhase = null;
  let lastSessionEndTime = null;
  let lastCelebratedFocusDeadline = null;

  async function syncDashboard() {
    // The shared helper transitions focus -> break -> done and reads storage.
    const data = await SidekickTimer.read();
    const phase = data.sessionActive ? data.sessionPhase : (data.sessionPhase || "idle");
    const remainingMs = data.sessionActive ? SidekickTimer.remaining(data) : 0;

    // Only celebrate when this open page observes a focus -> break change.
    // A newly opened tab midway through a break should show Zen immediately.
    if (phase === "break") {
      // Celebrate once per completed focus session, on the visible New Tab.
      // The break deadline is focus deadline + saved break duration.
      const focusDeadline = data.sessionEndTime - (data.breakDurationMs || 0);
      if (previousPhase === "focus" &&
          lastCelebratedFocusDeadline !== focusDeadline &&
          !isDiving) {
        lastCelebratedFocusDeadline = focusDeadline;
        previousPhase = "break";
        triggerLeafDiveCelebration();
      }
      if (isDiving) return;
      const totalSec = Math.ceil(remainingMs / 1000);
      setZenBreakMode(true, Math.floor(totalSec / 60), totalSec % 60);
      previousPhase = "break";
      return;
    }

    if (isDiving) return;
    setZenBreakMode(false);

    if (!data.sessionActive) {
      if (timerElement) timerElement.textContent = phase === "done" ? "Done!" : "00:00";
      if (leavesDisplay) leavesDisplay.textContent = phase === "done" ? "Session complete! 🍃" : "Leaves collected: 0 🍃";
      if (phase !== "done") updateLeafPile(0);
      lastKnownLeaves = phase === "done" ? 5 : 0;
      previousPhase = phase;
      return;
    }

    if (timerElement) timerElement.textContent = SidekickTimer.format(remainingMs);
    const durationMs = (data.studyDuration || 25) * 60000;
    const elapsedMs = Math.max(0, durationMs - remainingMs);
    const currentLeaves = Math.min(5, Math.floor(elapsedMs / (durationMs / 5)));
    if (leavesDisplay) leavesDisplay.textContent = `Leaves collected: ${currentLeaves} 🍃`;

    if (previousPhase !== "focus" || lastSessionEndTime !== data.sessionEndTime) {
      lastKnownLeaves = currentLeaves;
      updateLeafPile(currentLeaves);
    } else if (currentLeaves > lastKnownLeaves) {
      triggerPickupAnimation(currentLeaves);
      lastKnownLeaves = currentLeaves;
    } else if (currentLeaves < lastKnownLeaves) {
      lastKnownLeaves = currentLeaves;
      updateLeafPile(currentLeaves);
    }
    lastSessionEndTime = data.sessionEndTime;
    previousPhase = "focus";
  }

  // 6. "LOCK BACK IN" (End Break Button)
  if (endBreakBtn) {
    endBreakBtn.addEventListener("click", async () => {
      await chrome.storage.local.set({
        sessionActive: false,
        sessionPaused: false,
        sessionPhase: "idle",
        leafCount: 0
      });
      previousPhase = "idle";
      lastCelebratedFocusDeadline = null;
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