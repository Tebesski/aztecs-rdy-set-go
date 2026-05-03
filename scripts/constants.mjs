export const MODULE_ID = "aztecs-rdy-set-go"
export const SOCKET = `module.${MODULE_ID}`
export const SNATCH_RESOLVE_WINDOW_MS = 250
export const ACTS_DISMISS_DELAY_MS = 1800
export const FRAME_FADE_MS = 700
export const LOST_LINGER_MS = 1200
export const LOST_FADE_MS = 1300
export const DIGIT_HOLD_THRESHOLD_MS = 220
export const DOUBLE_PRESS_WINDOW_MS = 400

export const TEMPLATE = {
   BANNER: `modules/aztecs-rdy-set-go/templates/banner.hbs`,
   PICKER: `modules/aztecs-rdy-set-go/templates/countdown-picker.hbs`,
   GM_TIPS: `modules/aztecs-rdy-set-go/templates/gm-tips.hbs`,
   GM_ACTIONS: `modules/aztecs-rdy-set-go/templates/gm-actions.hbs`,
   CONTENDERS: `modules/aztecs-rdy-set-go/templates/contenders.hbs`,
}

export const SETTING = {
   PROMPT_TEXT: "promptText",
   ACTS_TEXT: "actsText",
   YOU_ACT_TEXT: "youActText",
   LOST_TEXT: "lostText",
   SHOW_LOST_TEXT: "showLostText",
   CANCELLATION_QUEUED_TEXT: "cancellationQueuedText",
   SNATCH_BUTTON_TEXT: "snatchButtonText",
   DELEGATE_BUTTON_TEXT: "delegateButtonText",
   ALSO_TRIED_TEXT: "alsoTriedText",
   DELEGATE_DIALOG_TITLE: "delegateDialogTitle",
   DELEGATE_DIALOG_PROMPT: "delegateDialogPrompt",

   FRAME_COLOR: "frameColor",

   SNATCH_SOUND: "snatchSound",
   SNATCH_VOLUME: "snatchVolume",
   ACT_SOUND: "actSound",
   ACT_VOLUME: "actVolume",
   LOST_SOUND: "lostSound",
   LOST_VOLUME: "lostVolume",
   TICK_SOUND: "countdownTickSound",
   TICK_VOLUME: "countdownTickVolume",
   THREE_SOUND: "countdownThreeSound",
   THREE_VOLUME: "countdownThreeVolume",
   TWO_SOUND: "countdownTwoSound",
   TWO_VOLUME: "countdownTwoVolume",
   ONE_SOUND: "countdownOneSound",
   ONE_VOLUME: "countdownOneVolume",

   SHOW_ACTOR_IMAGE: "showActorImage",
   ACTOR_IMAGE_MODE: "actorImageMode",
   DEFAULT_ACTOR_IMAGE: "defaultActorImage",
   NAME_DISPLAY_MODE: "nameDisplayMode",
   SHOW_SCENE_CONTROL: "showSceneControl",
   COUNTDOWN_DEFAULT_QUEUED: "countdownDefaultQueued",
   PAN_TO_TOKEN: "panToToken",
}

export const KEYBIND = {
   TRIGGER: "trigger",
   TRIGGER_COUNTDOWN: "triggerCountdown",
   SNATCH: "snatch",
   DELEGATE: "delegate",
   START_COUNTDOWN: "startCountdown",
   QUEUE_CANCEL: "queueCancel",
   STOP_OPPORTUNITY: "stopOpportunity",
}

export const SOCKET_TYPE = {
   BROADCAST: "broadcast",
   SNATCH_ATTEMPT: "snatch-attempt",
   RESOLVE: "resolve",
   DELEGATE: "delegate",
   CANCEL: "cancel",
   COUNTDOWN_START: "countdown-start",
   COUNTDOWN_TICK: "countdown-tick",
   QUEUE_TOGGLE: "queue-toggle",
}
