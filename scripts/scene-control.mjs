import { MODULE_ID, SETTING } from "./constants.mjs";
import { broadcastOpportunity, isGM } from "./lifecycle.mjs";
import { openCountdownPicker } from "./countdown-picker.mjs";

export function registerSceneControl(controls) {
  if (!isGM()) return;
  if (!game.settings.get(MODULE_ID, SETTING.SHOW_SCENE_CONTROL)) return;

  const tool = {
    name: "arsg-trigger",
    title: game.i18n.localize("ARSG.UI.SceneControlTooltip"),
    icon: "fas fa-clapperboard",
    button: true,
    onChange: () => broadcastOpportunity(),
    onClick: () => broadcastOpportunity()
  };

  if (Array.isArray(controls)) {
    let group = controls.find((c) => c.name === "tokens") ?? controls[0];
    if (group) {
      group.tools = group.tools ?? [];
      if (!group.tools.find((t) => t.name === "arsg-trigger")) group.tools.push(tool);
    }
    return;
  }

  const tokens = controls.tokens;
  if (tokens) {
    tokens.tools = tokens.tools ?? {};
    tokens.tools[tool.name] = tool;
  }
}

export function installSceneControlContextMenu() {
  document.addEventListener("contextmenu", (ev) => {
    const btn = ev.target.closest('[data-tool="arsg-trigger"], [data-control="arsg-trigger"]');
    if (!btn) return;
    if (!isGM()) return;
    ev.preventDefault();
    ev.stopPropagation();
    openCountdownPicker();
  }, true);
}
