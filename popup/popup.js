
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
    });
  });
});

updateTimer();
setInterval(updateTimer, 1000);

