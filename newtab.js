document.addEventListener("DOMContentLoaded", () => {
  const timerElement = document.getElementById("timer");
  const leavesDisplay = document.getElementById("leaves");
  const leafPile = document.getElementById("leafPile");
  const groundMascot = document.getElementById("groundMascot");
  const groundLeaf = document.getElementById("groundLeaf");

  let lastKnownLeaves = null;
  let isGathering = false;

  function updateLeafPile(count) {
    if (!leafPile) return;
    // Set stage-0 to stage-5
    leafPile.className = `leaf-pile stage-${count}`;
  }

  function triggerPickupAnimation(newCount) {
    if (isGathering || !groundMascot || !groundLeaf) return;
    isGathering = true;

    // 1. Drop a leaf on the ground
    groundLeaf.classList.add("active");

    // 2. Mascot runs toward the leaf
    groundMascot.classList.remove("has-leaf");
    groundMascot.classList.add("gathering");

    // 3. At 1.1s: Mascot scoops up the leaf
    setTimeout(() => {
      groundLeaf.classList.remove("active");
      groundMascot.classList.add("has-leaf");
    }, 1100);

    // 4. At 2.5s: Mascot arrives at pile and deposits leaf
    setTimeout(() => {
      groundMascot.classList.remove("has-leaf");
      updateLeafPile(newCount);

      // Bounce leaf pile & show floating +1 text
      leafPile.classList.remove("bounce");
      void leafPile.offsetWidth; // trigger reflow
      leafPile.classList.add("bounce");

      showFloatingPlusOne();
    }, 2500);

    // 5. At 3.2s: Sequence finishes, resume regular walk
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

    setTimeout(() => {
      floatText.remove();
    }, 1400);
  }

  async function syncDashboard() {
    const data = await chrome.storage.local.get([
      "sessionActive",
      "sessionPaused",
      "sessionEndTime",
      "studyDuration",
      "pausedRemainingTime",
      "leafCount"
    ]);

    // Handle Inactive / Reset state
    if (!data.sessionActive) {
      if (timerElement) timerElement.textContent = "00:00";
      if (leavesDisplay) leavesDisplay.textContent = "Leaves collected: 0 🍃";
      updateLeafPile(0);
      lastKnownLeaves = 0;
      return;
    }

    // 1. Calculate Timer
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

    if (timerElement) {
      timerElement.textContent =
        minutesLeft + ":" + String(secondsLeft).padStart(2, "0");
    }

    // 2. Leaf Calculation (0 - 5)
    let currentLeaves = data.leafCount ?? 0;

    if (leavesDisplay) {
      leavesDisplay.textContent = `Leaves collected: ${currentLeaves} 🍃`;
    }

    // First load: sync pile immediately without playing animation
    if (lastKnownLeaves === null) {
      lastKnownLeaves = currentLeaves;
      updateLeafPile(currentLeaves);
      return;
    }

    // Trigger animation when a new leaf is awarded
    if (currentLeaves > lastKnownLeaves) {
      triggerPickupAnimation(currentLeaves);
      lastKnownLeaves = currentLeaves;
    } else if (currentLeaves < lastKnownLeaves) {
      // If timer was reset
      lastKnownLeaves = currentLeaves;
      updateLeafPile(currentLeaves);
    }
  }

  syncDashboard();
  setInterval(syncDashboard, 1000);
  chrome.storage.onChanged.addListener(syncDashboard);
});