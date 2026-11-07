// Shared timer state for both popup.js and newtab.js.
// Both displays use the same end timestamp and phase.
const SidekickTimer = {
  async read() {
    let s = await chrome.storage.local.get([
      'sessionActive', 'sessionPaused', 'sessionPhase', 'sessionEndTime',
      'pausedRemainingTime', 'studyDuration', 'breakDurationMs', 'leafCount'
    ]);
    // Use the ORIGINAL focus deadline when starting the break, not the
    // time at which a particular page happened to notice the deadline.
    if (s.sessionActive && !s.sessionPaused && Date.now() >= s.sessionEndTime) {
      if (s.sessionPhase === 'focus') {
        const breakMs = Math.max(0, s.breakDurationMs || 0);
        if (breakMs > 0 && s.sessionEndTime + breakMs > Date.now()) {
          await chrome.storage.local.set({
            sessionPhase: 'break',
            sessionEndTime: s.sessionEndTime + breakMs,
            leafCount: 5
          });
        } else {
          await chrome.storage.local.set({sessionActive: false, sessionPhase: 'done'});
        }
      } else if (s.sessionPhase === 'break') {
        await chrome.storage.local.set({sessionActive: false, sessionPhase: 'done'});
      }
      s = await chrome.storage.local.get([
        'sessionActive', 'sessionPaused', 'sessionPhase', 'sessionEndTime',
        'pausedRemainingTime', 'studyDuration', 'breakDurationMs', 'leafCount'
      ]);
    }
    return s;
  },
  remaining(s) {
    return Math.max(0, s.sessionPaused ? (s.pausedRemainingTime || 0) : (s.sessionEndTime - Date.now()));
  },
  format(ms) {
    const seconds = Math.ceil(Math.max(0, ms) / 1000);
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  }
};
