
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

document.getElementById("start").addEventListener("click", startTimer);

// implement the blocklist functionality 
document.getElementById('saveBtn').addEventListener('click', () => {
    const siteInput = document.getElementById('siteInput');
    const siteToBlock = siteInput.value.trim();
    
    if (siteToBlock) {
        // Retrieve the current blocklist, add the new site, and save it back to storage
        chrome.storage.local.get(['blockedSites'], (result) => {
            let sites = result.blockedSites || [];
            // Ensure the site isn't already in the blocklist
            if (!sites.includes(siteToBlock)) {
                sites.push(siteToBlock);
                chrome.storage.local.set({ 'blockedSites': sites }, () => {
                    const status = document.getElementById('saveStatus');
                    status.style.display = 'block';
                    siteInput.value = '';
                    
                    setTimeout(() => {
                        status.style.display = 'none';
                    }, 2000);
                });
            }
        });
    }
});


updateTimer();
setInterval(updateTimer, 1000);
