import { MODULE_ID, SETTING } from "./constants.mjs"
import { previewSetting, playPath } from "./sound.mjs"

const SECTION = {
   TEXT: "ARSG.Settings.Section.Text",
   VISUALS: "ARSG.Settings.Section.Visuals",
   SOUNDS: "ARSG.Settings.Section.Sounds",
   BEHAVIOR: "ARSG.Settings.Section.Behavior",
}

const SOUND_GROUPS = [
   {
      sound: SETTING.SNATCH_SOUND,
      volume: SETTING.SNATCH_VOLUME,
      defaultFile: "snatched.ogg",
      labelKey: "ARSG.Settings.SnatchSound",
   },
   {
      sound: SETTING.ACT_SOUND,
      volume: SETTING.ACT_VOLUME,
      defaultFile: "",
      labelKey: "ARSG.Settings.ActSound",
   },
   {
      sound: SETTING.LOST_SOUND,
      volume: SETTING.LOST_VOLUME,
      defaultFile: "lost.ogg",
      labelKey: "ARSG.Settings.LostSound",
   },
   {
      sound: SETTING.TICK_SOUND,
      volume: SETTING.TICK_VOLUME,
      defaultFile: "tick.ogg",
      labelKey: "ARSG.Settings.CountdownTickSound",
   },
   {
      sound: SETTING.THREE_SOUND,
      volume: SETTING.THREE_VOLUME,
      defaultFile: "3.ogg",
      labelKey: "ARSG.Settings.CountdownThreeSound",
   },
   {
      sound: SETTING.TWO_SOUND,
      volume: SETTING.TWO_VOLUME,
      defaultFile: "2.ogg",
      labelKey: "ARSG.Settings.CountdownTwoSound",
   },
   {
      sound: SETTING.ONE_SOUND,
      volume: SETTING.ONE_VOLUME,
      defaultFile: "1.ogg",
      labelKey: "ARSG.Settings.CountdownOneSound",
   },
]

const TEXT_SETTINGS = [
   {
      key: SETTING.PROMPT_TEXT,
      defaultText: "Snatch an RP opportunity!",
      labelKey: "ARSG.Settings.PromptText",
   },
   {
      key: SETTING.ACTS_TEXT,
      defaultText: "{name} acts!",
      labelKey: "ARSG.Settings.ActsText",
   },
   {
      key: SETTING.YOU_ACT_TEXT,
      defaultText: "You are acting!",
      labelKey: "ARSG.Settings.YouActText",
   },
   {
      key: SETTING.LOST_TEXT,
      defaultText: "Opportunity lost",
      labelKey: "ARSG.Settings.LostText",
   },
   {
      key: SETTING.CANCELLATION_QUEUED_TEXT,
      defaultText: "Cancellation queued",
      labelKey: "ARSG.Settings.CancellationQueuedText",
   },
   {
      key: SETTING.SNATCH_BUTTON_TEXT,
      defaultText: "Snatch",
      labelKey: "ARSG.Settings.SnatchButtonText",
   },
   {
      key: SETTING.DELEGATE_BUTTON_TEXT,
      defaultText: "Delegate",
      labelKey: "ARSG.Settings.DelegateButtonText",
   },
   {
      key: SETTING.ALSO_TRIED_TEXT,
      defaultText: "Also tried:",
      labelKey: "ARSG.Settings.AlsoTriedText",
   },
   {
      key: SETTING.DELEGATE_DIALOG_TITLE,
      defaultText: "Delegate to whom?",
      labelKey: "ARSG.Settings.DelegateDialogTitle",
   },
   {
      key: SETTING.DELEGATE_DIALOG_PROMPT,
      defaultText: "Choose a player to hand the opportunity to.",
      labelKey: "ARSG.Settings.DelegateDialogPrompt",
   },
]

const SETTING_SECTIONS = new Map()
function tag(settingKey, sectionLabel) {
   SETTING_SECTIONS.set(settingKey, sectionLabel)
}

export function getSettingSections() {
   return SETTING_SECTIONS
}
export function getSoundGroups() {
   return SOUND_GROUPS
}

export function registerSettings() {
   for (const t of TEXT_SETTINGS) {
      game.settings.register(MODULE_ID, t.key, {
         name: `${t.labelKey}.Name`,
         hint: `${t.labelKey}.Hint`,
         scope: "world",
         config: true,
         type: String,
         default: t.defaultText,
      })
      tag(t.key, SECTION.TEXT)
   }

   game.settings.register(MODULE_ID, SETTING.SHOW_LOST_TEXT, {
      name: "ARSG.Settings.ShowLostText.Name",
      scope: "world",
      config: true,
      type: Boolean,
      default: true,
   })
   tag(SETTING.SHOW_LOST_TEXT, SECTION.TEXT)

   game.settings.register(MODULE_ID, SETTING.FRAME_COLOR, {
      name: "ARSG.Settings.FrameColor.Name",
      hint: "ARSG.Settings.FrameColor.Hint",
      scope: "world",
      config: true,
      type: new foundry.data.fields.ColorField({
         required: true,
         nullable: false,
      }),
      default: "#22d3ee",
   })
   tag(SETTING.FRAME_COLOR, SECTION.VISUALS)

   game.settings.register(MODULE_ID, SETTING.SHOW_ACTOR_IMAGE, {
      name: "ARSG.Settings.ShowActorImage.Name",
      hint: "ARSG.Settings.ShowActorImage.Hint",
      scope: "world",
      config: true,
      type: Boolean,
      default: true,
   })
   tag(SETTING.SHOW_ACTOR_IMAGE, SECTION.VISUALS)

   game.settings.register(MODULE_ID, SETTING.ACTOR_IMAGE_MODE, {
      name: "ARSG.Settings.ActorImageMode.Name",
      hint: "ARSG.Settings.ActorImageMode.Hint",
      scope: "world",
      config: true,
      type: String,
      choices: {
         portrait: "ARSG.Settings.ActorImageMode.Portrait",
         token: "ARSG.Settings.ActorImageMode.Token",
      },
      default: "portrait",
   })
   tag(SETTING.ACTOR_IMAGE_MODE, SECTION.VISUALS)

   game.settings.register(MODULE_ID, SETTING.DEFAULT_ACTOR_IMAGE, {
      name: "ARSG.Settings.DefaultActorImage.Name",
      hint: "ARSG.Settings.DefaultActorImage.Hint",
      scope: "world",
      config: true,
      type: String,
      default: "",
      filePicker: "image",
   })
   tag(SETTING.DEFAULT_ACTOR_IMAGE, SECTION.VISUALS)

   game.settings.register(MODULE_ID, SETTING.NAME_DISPLAY_MODE, {
      name: "ARSG.Settings.NameDisplayMode.Name",
      hint: "ARSG.Settings.NameDisplayMode.Hint",
      scope: "world",
      config: true,
      type: String,
      choices: {
         player: "ARSG.Settings.NameDisplayMode.Player",
         actor: "ARSG.Settings.NameDisplayMode.Actor",
         "player-paren-actor": "ARSG.Settings.NameDisplayMode.PlayerParenActor",
         "player-slash-actor": "ARSG.Settings.NameDisplayMode.PlayerSlashActor",
         "actor-paren-player": "ARSG.Settings.NameDisplayMode.ActorParenPlayer",
         "actor-slash-player": "ARSG.Settings.NameDisplayMode.ActorSlashPlayer",
      },
      default: "player-slash-actor",
   })
   tag(SETTING.NAME_DISPLAY_MODE, SECTION.VISUALS)

   game.settings.register(MODULE_ID, SETTING.SHOW_SCENE_CONTROL, {
      name: "ARSG.Settings.ShowSceneControl.Name",
      hint: "ARSG.Settings.ShowSceneControl.Hint",
      scope: "world",
      config: true,
      type: Boolean,
      default: true,
      onChange: () => ui.controls?.render(true),
   })
   tag(SETTING.SHOW_SCENE_CONTROL, SECTION.VISUALS)

   for (const group of SOUND_GROUPS) {
      const defaultPath = group.defaultFile
         ? `modules/${MODULE_ID}/assets/sfx/${group.defaultFile}`
         : ""
      game.settings.register(MODULE_ID, group.sound, {
         name: `${group.labelKey}.Name`,
         hint: `${group.labelKey}.Hint`,
         scope: "world",
         config: true,
         type: String,
         default: defaultPath,
         filePicker: "audio",
      })
      tag(group.sound, SECTION.SOUNDS)

      game.settings.register(MODULE_ID, group.volume, {
         scope: "world",
         config: false,
         type: Number,
         default: 60,
         range: { min: 0, max: 100, step: 1 },
      })
   }

   game.settings.register(MODULE_ID, SETTING.COUNTDOWN_DEFAULT_QUEUED, {
      name: "ARSG.Settings.CountdownDefaultQueued.Name",
      hint: "ARSG.Settings.CountdownDefaultQueued.Hint",
      scope: "world",
      config: true,
      type: Boolean,
      default: false,
   })
   tag(SETTING.COUNTDOWN_DEFAULT_QUEUED, SECTION.BEHAVIOR)

   game.settings.register(MODULE_ID, SETTING.PAN_TO_TOKEN, {
      name: "ARSG.Settings.PanToToken.Name",
      hint: "ARSG.Settings.PanToToken.Hint",
      scope: "world",
      config: true,
      type: Boolean,
      default: false,
   })
   tag(SETTING.PAN_TO_TOKEN, SECTION.BEHAVIOR)
}

export function injectSettingsUI(html) {
   const root = html instanceof HTMLElement ? html : html?.[0]
   if (!root) return

   const moduleSection =
      root.querySelector(`section[data-tab="${MODULE_ID}"]`) ??
      root.querySelector(`.tab[data-tab="${MODULE_ID}"]`) ??
      root.querySelector(`section.${MODULE_ID}`) ??
      root

   injectVolumeSliders(root)
   groupIntoAccordions(root, moduleSection)
}

function injectVolumeSliders(root) {
   for (const group of SOUND_GROUPS) {
      const settingName = `${MODULE_ID}.${group.sound}`
      const input = root.querySelector(`[name="${settingName}"]`)
      if (!input) continue
      const formGroup = input.closest(".form-group")
      if (!formGroup) continue
      if (formGroup.querySelector(".arsg-volume-wrap")) continue
      formGroup.dataset.arsgSetting = group.sound

      const wrap = document.createElement("div")
      wrap.className = "arsg-volume-wrap"

      const previewBtn = document.createElement("button")
      previewBtn.type = "button"
      previewBtn.className = "arsg-preview-btn"
      previewBtn.title = game.i18n.localize("ARSG.Settings.PreviewSound")
      previewBtn.innerHTML = `<i class="fas fa-volume-up"></i>`
      previewBtn.addEventListener("click", (ev) => {
         ev.preventDefault()
         ev.stopPropagation()
         const slider = wrap.querySelector(".arsg-volume-slider")
         const path = input.value
         if (slider && path) {
            playPath(
               path,
               Math.max(0, Math.min(1, parseFloat(slider.value) / 100)),
            )
         } else {
            previewSetting(group.sound)
         }
      })

      const slider = document.createElement("input")
      slider.type = "range"
      slider.min = "0"
      slider.max = "100"
      slider.step = "1"
      slider.className = "arsg-volume-slider"
      const currentVolume = game.settings.get(MODULE_ID, group.volume)
      slider.value = String(currentVolume)
      slider.name = `${MODULE_ID}.${group.volume}`
      slider.dataset.arsgVolume = group.volume

      const valueLabel = document.createElement("span")
      valueLabel.className = "arsg-volume-value"
      valueLabel.textContent = String(currentVolume)
      slider.addEventListener("input", () => {
         valueLabel.textContent = slider.value
      })
      slider.addEventListener("change", () => {
         game.settings.set(MODULE_ID, group.volume, parseInt(slider.value, 10))
      })

      wrap.appendChild(previewBtn)
      wrap.appendChild(slider)
      wrap.appendChild(valueLabel)

      const fields = formGroup.querySelector(".form-fields") ?? formGroup
      fields.appendChild(wrap)
   }
}

function groupIntoAccordions(root, moduleSection) {
   const scope = moduleSection ?? root
   if (scope.querySelector("details.arsg-section")) return

   const formGroups = Array.from(scope.querySelectorAll(".form-group"))
   if (!formGroups.length) return

   const groupsBySection = new Map()
   for (const fg of formGroups) {
      const settingFullName = fg.querySelector("[name]")?.getAttribute("name")
      if (!settingFullName?.startsWith(`${MODULE_ID}.`)) continue
      const settingKey = settingFullName.slice(MODULE_ID.length + 1)
      let section = SETTING_SECTIONS.get(settingKey) ?? SECTION.BEHAVIOR
      if (!groupsBySection.has(section)) groupsBySection.set(section, [])
      groupsBySection.get(section).push(fg)
   }

   if (!groupsBySection.size) return

   const order = [
      SECTION.TEXT,
      SECTION.VISUALS,
      SECTION.SOUNDS,
      SECTION.BEHAVIOR,
   ]
   let firstFG = null
   for (const [, list] of groupsBySection) {
      if (list.length) {
         firstFG = list[0]
         break
      }
   }
   if (!firstFG?.parentNode) return
   const parent = firstFG.parentNode

   const created = []
   for (const sectionKey of order) {
      const list = groupsBySection.get(sectionKey)
      if (!list || !list.length) continue
      const details = document.createElement("details")
      details.className = "arsg-section"
      details.dataset.arsgSection = sectionKey
      const summary = document.createElement("summary")
      summary.className = "arsg-section-summary"
      summary.textContent = game.i18n.localize(sectionKey)
      details.appendChild(summary)
      for (const fg of list) {
         details.appendChild(fg)
      }
      created.push(details)
   }
   for (const details of created.reverse()) {
      parent.insertBefore(details, parent.firstChild)
   }
}
