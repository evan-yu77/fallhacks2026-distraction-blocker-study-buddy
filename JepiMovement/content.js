const mascot = document.createElement("div");
mascot.id = "sidekick";

const image = document.createElement("img");
// Uses the SVG pixel mascot
image.src = chrome.runtime.getURL("assets/mascot.svg");
image.alt = "Jeppy sidekick";

mascot.appendChild(image);
document.documentElement.appendChild(mascot);

async function updateMascot() {
  const data = await chrome.storage.local.get([
    "sessionActive",
    "sessionEndTime"
  ]);

  const isStudying = data.sessionActive && data.sessionEndTime > Date.now();
  mascot.style.display = isStudying ? "block" : "none";
}

updateMascot();
chrome.storage.onChanged.addListener(updateMascot);
setInterval(updateMascot, 1000);