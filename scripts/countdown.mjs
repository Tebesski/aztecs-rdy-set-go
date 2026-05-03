import { MODULE_ID, SETTING } from "./constants.mjs";
import { state, resetCountdownState } from "./state.mjs";
import { emit, registerHandler, SOCKET_TYPE } from "./socket.mjs";
import { overlay } from "./overlay.mjs";
import { playSetting } from "./sound.mjs";

export function startCountdown(seconds, { withQueuedCancel = null } = {}) {
  if (!game.user.isGM && game.user.role < CONST.USER_ROLES.ASSISTANT) return;
  if (!state.active || state.resolved) return;
  const queued = withQueuedCancel == null
    ? !!game.settings.get(MODULE_ID, SETTING.COUNTDOWN_DEFAULT_QUEUED)
    : !!withQueuedCancel;
  state.lastCountdownSeconds = seconds;
  emit({
    type: SOCKET_TYPE.COUNTDOWN_START,
    opportunityId: state.opportunityId,
    seconds,
    withQueuedCancel: queued
  });
}

export function toggleQueuedCancel() {
  if (!game.user.isGM && game.user.role < CONST.USER_ROLES.ASSISTANT) return;
  if (!state.countdown.active) return;
  if (state.countdown.remaining <= 1 && !state.countdown.cancelQueued) return;
  emit({
    type: SOCKET_TYPE.QUEUE_TOGGLE,
    opportunityId: state.opportunityId,
    queued: !state.countdown.cancelQueued
  });
}

function onQueueToggle(data) {
  if (data.opportunityId !== state.opportunityId) return;
  if (!state.countdown.active) return;
  state.countdown.cancelQueued = !!data.queued;
  overlay.setCancelQueued(state.countdown.cancelQueued);
  overlay.refreshGmButtons();
}

async function onCountdownStart(data) {
  if (data.opportunityId !== state.opportunityId) return;
  resetCountdownState();
  state.countdown.active = true;
  state.countdown.seconds = data.seconds;
  state.countdown.remaining = data.seconds;
  state.countdown.cancelQueued = !!data.withQueuedCancel;
  state.lastCountdownSeconds = data.seconds;
  overlay.showCountdownNumber(data.seconds);
  overlay.setCancelQueued(state.countdown.cancelQueued);
  await overlay.refreshGmButtons();
  if (game.user.isGM || game.user.role >= CONST.USER_ROLES.ASSISTANT) {
    state.countdown.intervalHandle = setInterval(() => {
      const next = state.countdown.remaining - 1;
      emit({
        type: SOCKET_TYPE.COUNTDOWN_TICK,
        opportunityId: state.opportunityId,
        remaining: next
      });
    }, 1000);
  }
}

async function onCountdownTick(data) {
  if (data.opportunityId !== state.opportunityId) return;
  state.countdown.remaining = data.remaining;

  if (data.remaining > 0) {
    overlay.updateCountdownNumber(data.remaining);
    if (data.remaining === 3) playSetting(SETTING.THREE_SOUND, SETTING.TICK_SOUND);
    else if (data.remaining === 2) playSetting(SETTING.TWO_SOUND, SETTING.TICK_SOUND);
    else if (data.remaining === 1) playSetting(SETTING.ONE_SOUND, SETTING.TICK_SOUND);
    else playSetting(SETTING.TICK_SOUND);
    return;
  }

  if (game.user.isGM || game.user.role >= CONST.USER_ROLES.ASSISTANT) {
    if (state.countdown.intervalHandle) {
      clearInterval(state.countdown.intervalHandle);
      state.countdown.intervalHandle = null;
    }
    if (state.countdown.cancelQueued && !state.resolved) {
      emit({ type: SOCKET_TYPE.CANCEL, opportunityId: state.opportunityId });
      return;
    }
  }

  state.countdown.active = false;
  state.countdown.cancelQueued = false;
  overlay.hideCountdownNumber();
  await overlay.refreshGmButtons();
}

export function registerCountdownHandlers() {
  registerHandler(SOCKET_TYPE.COUNTDOWN_START, onCountdownStart);
  registerHandler(SOCKET_TYPE.COUNTDOWN_TICK, onCountdownTick);
  registerHandler(SOCKET_TYPE.QUEUE_TOGGLE, onQueueToggle);
}
