document.addEventListener("DOMContentLoaded", () => {
    
    function syncDashboard() {
        chrome.storage.local.get([
            "sessionActive", 
            "sessionPaused", 
            "sessionEndTime", 
            "studyDuration",
            "pausedRemainingTime"
        ], (data) => {
            
            const timerElement = document.getElementById("timer");
            const leafElement = document.getElementById("leaves");

            // If no session is running, reset to 0
            if (!data.sessionActive) {
                if (timerElement) timerElement.textContent = "00:00";
                if (leafElement) leafElement.textContent = "Leaves collected: 0 🍃";
                return;
            }

            // 1. Calculate Time Remaining
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
                timerElement.textContent = minutesLeft + ":" + String(secondsLeft).padStart(2, "0");
            }

            // 2. Self-Sufficient Bulletproof Leaf Math
            // (Calculates safely based on remaining time so it never flashes 5)
            const totalDurationSeconds = (data.studyDuration || 25) * 60;
            const elapsedSeconds = Math.max(0, totalDurationSeconds - totalSecondsLeft);
            
            const secondsPerLeaf = totalDurationSeconds / 5;
            let leaves = Math.floor(elapsedSeconds / secondsPerLeaf);
            
            // Clamp the leaves between 0 and 5
            leaves = Math.max(0, Math.min(leaves, 5));

            if (leafElement) {
                leafElement.textContent = `Leaves collected: ${leaves} 🍃`;
            }
        });
    }

    // Run immediately, then check storage every second
    syncDashboard();
    setInterval(syncDashboard, 1000);
});