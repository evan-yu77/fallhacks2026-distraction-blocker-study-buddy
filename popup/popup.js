let timerInterval;

<<<<<<< HEAD
let endTime = 0;
let startTime = 0;
let duration = 0;

async function startTimer() {
  const minutes = Number(document.getElementById("minutes").value);

  if (minutes < 1 || !Number.isFinite(minutes)) {
    return;
  }

  duration = minutes * 60 * 1000;
  startTime = Date.now();
  endTime = startTime + duration;

  await chrome.storage.local.set({
    sessionActive: true,
    sessionStartTime: startTime,
    sessionEndTime: endTime,
    studyDuration: minutes
  });

  updateTimer();
}

async function updateTimer() {
  const data = await chrome.storage.local.get([
    "sessionActive",
    "sessionStartTime",
    "sessionEndTime",
    "studyDuration"
  ]);

  if (!data.sessionActive) return;

  const remaining = Math.max(0, data.sessionEndTime - Date.now());
  const totalSeconds = Math.ceil(remaining / 1000);

  const minutesLeft = Math.floor(totalSeconds / 60);
  const secondsLeft = totalSeconds % 60;

  document.getElementById("timer").textContent =
    minutesLeft + ":" + String(secondsLeft).padStart(2, "0");

  const elapsed = Date.now() - data.sessionStartTime;
  const leaves = Math.min(5, Math.floor(elapsed / (data.studyDuration * 60 * 1000 / 5)));

  document.getElementById("leaves").textContent =
    "Leaves collected: " + leaves + " 🍃";

  if (remaining === 0) {
    await chrome.storage.local.set({ sessionActive: false });
    document.getElementById("timer").textContent = "Done!";
  }
}

document.getElementById("startBtn").addEventListener("click", startTimer);

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
      console.error(chrome.runtime.lastError.message);
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
        console.error(chrome.runtime.lastError.message);
        return;
      }

      status.textContent = `${hostname} added to blocklist.`;
      status.style.color = "green";
      status.style.display = "block";
      siteInput.value = "";
      setTimeout(() => {
        status.style.display = "none";
      }, 2000);
=======
// 1. Core function to update the timer text and leaf count
function updateDisplay() {
    chrome.storage.local.get(['isStudying', 'startTime', 'endTime', 'studyDuration'], (data) => {
        if (!data.isStudying || !data.endTime) return;

        const now = Date.now();
        const remainingTime = Math.max(0, data.endTime - now);

        // If timer hits zero
        if (remainingTime <= 0) {
            clearInterval(timerInterval);
            document.getElementById('timerDisplay').innerText = "00:00";
            document.getElementById('startBtn').innerText = "Start Studying";
            chrome.storage.local.set({ isStudying: false });
            return;
        }

        // Calculate time formats
        const totalSeconds = Math.ceil(remainingTime / 1000);
        const minutesLeft = Math.floor(totalSeconds / 60);
        const secondsLeft = totalSeconds % 60;

        document.getElementById('timerDisplay').innerText = 
            `${minutesLeft.toString().padStart(2, '0')}:${secondsLeft.toString().padStart(2, '0')}`;

        // Calculate leaves based on elapsed time (assuming 5 total leaves per session)
        const elapsed = now - data.startTime;
        const leaves = Math.min(5, Math.floor(elapsed / (data.studyDuration * 60 * 1000 / 5)));
        
        const leafElement = document.getElementById("leafCount");
        if (leafElement) leafElement.textContent = leaves;
>>>>>>> 0bb4c2575ec643b1aca916bba9d893c7353ad683
    });
}

<<<<<<< HEAD
updateTimer();
setInterval(updateTimer, 1000);
=======
// 2. Wait for the HTML to fully load before attaching listeners
document.addEventListener('DOMContentLoaded', () => {
    
    // Check if a session is currently active when the user opens the popup
    chrome.storage.local.get(['isStudying'], (result) => {
        if (result.isStudying) {
            document.getElementById('startBtn').innerText = "Stop Studying";
            updateDisplay(); // Run once immediately to prevent 1-second delay
            timerInterval = setInterval(updateDisplay, 1000);
        }
    });

    // Handle the Start/Stop button click
    document.getElementById('startBtn').addEventListener('click', () => {
        const btn = document.getElementById('startBtn');
        
        if (btn.innerText === "Start Studying") {
            // Start Logic
            const timeInput = document.getElementById('timeInput');
            const minutes = parseInt(timeInput ? timeInput.value : 25) || 25;
            if (minutes < 1 || !Number.isFinite(minutes)) return;

            const startTime = Date.now();
            const duration = minutes * 60 * 1000;
            const endTime = startTime + duration;
            
            chrome.storage.local.set({ 
                isStudying: true, 
                startTime: startTime,
                endTime: endTime,
                studyDuration: minutes
            });
            
            btn.innerText = "Stop Studying";
            updateDisplay();
            timerInterval = setInterval(updateDisplay, 1000);
            
            // Tell the background script to start the alarms
            chrome.runtime.sendMessage({ action: "start", minutes: minutes });
            
        } else {
            // Stop Logic
            clearInterval(timerInterval);
            chrome.storage.local.set({ isStudying: false, endTime: null });
            
            document.getElementById('timerDisplay').innerText = "00:00";
            const leafElement = document.getElementById('leafCount');
            if (leafElement) leafElement.innerText = "0";
            
            btn.innerText = "Start Studying";
            
            // Tell the background script to kill all alarms
            chrome.runtime.sendMessage({ action: "stop" });
        }
    });

    // Handle saving blocked websites
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

});
>>>>>>> 0bb4c2575ec643b1aca916bba9d893c7353ad683
