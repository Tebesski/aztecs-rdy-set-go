export const state = {
  active: false,
  opportunityId: null,
  initiatorId: null,
  resolved: false,
  winnerId: null,
  countdown: {
    active: false,
    seconds: 0,
    remaining: 0,
    cancelQueued: false,
    intervalHandle: null
  },
  snatchContenders: new Map(),
  triggerHeld: false,
  triggerWithCountdownHeld: false,
  physicalSpaceDown: false,
  spaceHeld: false,
  digitHoldStarts: new Map(),
  lastCountdownSeconds: 5,
  delegateDialog: null
};

export function resetOpportunityState() {
  state.active = false;
  state.opportunityId = null;
  state.initiatorId = null;
  state.resolved = false;
  state.winnerId = null;
  closeDelegateDialog();
  resetCountdownState();
}

export function resetCountdownState() {
  if (state.countdown.intervalHandle) {
    clearInterval(state.countdown.intervalHandle);
    state.countdown.intervalHandle = null;
  }
  state.countdown.active = false;
  state.countdown.seconds = 0;
  state.countdown.remaining = 0;
  state.countdown.cancelQueued = false;
}

export function clearKeyHoldStates() {
  state.triggerHeld = false;
  state.triggerWithCountdownHeld = false;
  state.physicalSpaceDown = false;
  state.spaceHeld = false;
  state.digitHoldStarts.clear();
}

export function closeDelegateDialog() {
  if (state.delegateDialog) {
    try { state.delegateDialog.close({ animate: false }); } catch (_e) {}
    state.delegateDialog = null;
  }
}
