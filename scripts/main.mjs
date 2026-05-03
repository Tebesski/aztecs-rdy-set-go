import { MODULE_ID, TEMPLATE } from "./constants.mjs";
import { registerSettings, injectSettingsUI } from "./settings.mjs";
import { registerKeybindings } from "./keybindings.mjs";
import { installSocketListener } from "./socket.mjs";
import {
  registerLifecycleHandlers,
  broadcastOpportunity,
  snatch,
  stopOpportunity,
  delegateOpen,
  delegateTo
} from "./lifecycle.mjs";
import {
  registerCountdownHandlers,
  toggleQueuedCancel,
  startCountdown
} from "./countdown.mjs";
import { overlay } from "./overlay.mjs";
import { registerSceneControl, installSceneControlContextMenu } from "./scene-control.mjs";
import { openCountdownPicker } from "./countdown-picker.mjs";

Hooks.once("init", () => {
  registerSettings();
  registerKeybindings();
  registerLifecycleHandlers();
  registerCountdownHandlers();
});

Hooks.once("setup", async () => {
  await foundry.applications.handlebars.loadTemplates([
    TEMPLATE.BANNER,
    TEMPLATE.PICKER,
    TEMPLATE.GM_TIPS,
    TEMPLATE.GM_ACTIONS,
    TEMPLATE.CONTENDERS
  ]);
});

Hooks.once("ready", async () => {
  installSocketListener();
  installSceneControlContextMenu();
  await overlay.ensureRoot();
  overlay.setSnatchHandler(snatch);
  overlay.setDelegateHandler(delegateOpen);
  overlay.setGmActionHandler((kind) => {
    if (kind === "countdown") openCountdownPicker();
    else if (kind === "queue-opportunity") toggleQueuedCancel();
    else if (kind === "cancel-queue") toggleQueuedCancel();
    else if (kind === "stop") stopOpportunity();
  });

  const api = {
    trigger: (opts = {}) => broadcastOpportunity(opts),
    triggerWithCountdown: (seconds, opts = {}) => broadcastOpportunity({ initialCountdownSeconds: seconds, ...opts }),
    snatch: () => snatch(),
    stop: () => stopOpportunity(),
    delegate: (toUserId) => {
      if (toUserId) return delegateTo(toUserId);
      return delegateOpen();
    },
    setCountdown: (seconds, opts = {}) => startCountdown(seconds, opts),
    toggleQueue: () => toggleQueuedCancel(),
    openCountdownPicker: () => openCountdownPicker()
  };
  const mod = game.modules.get(MODULE_ID);
  if (mod) mod.api = api;

  console.log(`[${MODULE_ID}] Ready.`);
});

Hooks.on("getSceneControlButtons", (controls) => registerSceneControl(controls));
Hooks.on("renderSettingsConfig", (_app, html) => injectSettingsUI(html));
