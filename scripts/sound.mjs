import { MODULE_ID, SETTING } from "./constants.mjs";

const VOLUME_BY_SOUND_KEY = {
  [SETTING.SNATCH_SOUND]: SETTING.SNATCH_VOLUME,
  [SETTING.ACT_SOUND]: SETTING.ACT_VOLUME,
  [SETTING.LOST_SOUND]: SETTING.LOST_VOLUME,
  [SETTING.TICK_SOUND]: SETTING.TICK_VOLUME,
  [SETTING.THREE_SOUND]: SETTING.THREE_VOLUME,
  [SETTING.TWO_SOUND]: SETTING.TWO_VOLUME,
  [SETTING.ONE_SOUND]: SETTING.ONE_VOLUME
};

export function playSetting(soundKey, fallbackKey = null) {
  let path = game.settings.get(MODULE_ID, soundKey);
  let volumeKey = VOLUME_BY_SOUND_KEY[soundKey];
  if (!path && fallbackKey) {
    path = game.settings.get(MODULE_ID, fallbackKey);
    volumeKey = VOLUME_BY_SOUND_KEY[fallbackKey];
  }
  if (!path) return;
  const volume = volumeKey ? game.settings.get(MODULE_ID, volumeKey) / 100 : 0.6;
  playPath(path, volume);
}

export function playPath(path, volume = 0.6) {
  if (!path) return;
  try {
    foundry.audio.AudioHelper.play(
      { src: path, volume: Math.max(0, Math.min(1, volume)), autoplay: true, loop: false },
      false
    );
  } catch (err) {
    console.warn(`[${MODULE_ID}] Failed to play sound`, path, err);
  }
}

export function previewSetting(soundKey) {
  const path = game.settings.get(MODULE_ID, soundKey);
  const volumeKey = VOLUME_BY_SOUND_KEY[soundKey];
  const volume = volumeKey ? game.settings.get(MODULE_ID, volumeKey) / 100 : 0.6;
  playPath(path, volume);
}
