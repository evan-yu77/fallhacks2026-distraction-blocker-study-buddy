
const mascot = document.createElement("div");
mascot.id = "sidekick";

const image = document.createElement("img");
image.src = chrome.runtime.getURL("assets/mascot.png");
image.alt = "Digital Side-Kick mascot";

mascot.appendChild(image);
document.documentElement.appendChild(mascot);

// Check whether the study timer is running
async function updateMascot() {
  const data = await chrome.storage.local.get([
    "sessionActive",
    "sessionEndTime"
  ]);

  const isStudying =
    data.sessionActive &&
    data.sessionEndTime > Date.now();

  if (isStudying) {
    mascot.style.display = "block";
  } else {
    mascot.style.display = "none";
  }
}

// Run when webpage opens
updateMascot();

// React when the popup starts or stops a session
chrome.storage.onChanged.addListener(() => {
  updateMascot();
});

// Also check whether the end time has passed
setInterval(updateMascot, 1000); 
