import {
   MODULE_ID,
   SETTING,
   KEYBIND,
   ACTS_DISMISS_DELAY_MS,
   FRAME_FADE_MS,
   LOST_LINGER_MS,
   TEMPLATE,
} from "./constants.mjs"
import { resetOpportunityState, state } from "./state.mjs"

let rootEl = null
let actsGen = 0
let actsTimeoutId = null
let onSnatchClick = null
let onDelegateClick = null
let onGmAction = null
let onResumeClick = null
let onStopActingClick = null

export const overlay = {
   ensureRoot,
   applyColor,
   showOpportunity,
   showActs,
   pulseAndShowActs,
   dismiss,
   dismissAsLost,
   dismissSilent,
   showStoppedActing,
   showCountdownNumber,
   updateCountdownNumber,
   hideCountdownNumber,
   setCancelQueued,
   refreshGmButtons,
   buildHotkeyHint,
   setSnatchHandler(fn) {
      onSnatchClick = fn
   },
   setDelegateHandler(fn) {
      onDelegateClick = fn
   },
   setGmActionHandler(fn) {
      onGmAction = fn
   },
   setResumeHandler(fn) {
      onResumeClick = fn
   },
   setStopActingHandler(fn) {
      onStopActingClick = fn
   },
   cancelAutoDismiss() {
      actsGen += 1
      if (actsTimeoutId) {
         clearTimeout(actsTimeoutId)
         actsTimeoutId = null
      }
      if (rootEl) rootEl.classList.remove("arsg-fading")
   },
}

function localizedSetting(key, fallbackKey) {
   const v = game.settings.get(MODULE_ID, key)
   if (v) return v
   return fallbackKey ? game.i18n.localize(fallbackKey) : ""
}

async function ensureRoot() {
   if (rootEl && document.body.contains(rootEl)) return rootEl
   const html = await foundry.applications.handlebars.renderTemplate(
      TEMPLATE.BANNER,
      {
         snatchLabel: localizedSetting(
            SETTING.SNATCH_BUTTON_TEXT,
            "ARSG.UI.SnatchDefault",
         ),
         delegateLabel: localizedSetting(
            SETTING.DELEGATE_BUTTON_TEXT,
            "ARSG.UI.DelegateDefault",
         ),
         resumeLabel: localizedSetting(
            SETTING.RESUME_OPPORTUNITY_BUTTON_TEXT,
            "ARSG.UI.ResumeOpportunityDefault",
         ),
         stopActingLabel: localizedSetting(
            SETTING.STOP_ACTING_BUTTON_TEXT,
            "ARSG.UI.StopActingDefault",
         ),
         orLabel: game.i18n.localize("ARSG.UI.OrLabel"),
         queuedLabel: localizedSetting(
            SETTING.CANCELLATION_QUEUED_TEXT,
            "ARSG.UI.LostQueuedDefault",
         ),
      },
   )
   const el = document.createElement("div")
   el.id = "arsg-root"
   el.innerHTML = html
   document.body.appendChild(el)
   rootEl = el

   const bannerEl = el.querySelector(".arsg-banner")
   bannerEl.addEventListener("mouseenter", () => {
      if (rootEl?.classList.contains("arsg-acts-lingering"))
         rootEl.classList.add("arsg-linger-hover")
   })
   bannerEl.addEventListener("mouseleave", () => {
      rootEl?.classList.remove("arsg-linger-hover")
   })

   el.addEventListener("click", (ev) => {
      const snatchBtn = ev.target.closest(".arsg-snatch-btn")
      if (snatchBtn) {
         ev.preventDefault()
         ev.stopPropagation()
         if (onSnatchClick) onSnatchClick()
         return
      }
      const delegateBtn = ev.target.closest(".arsg-delegate-btn")
      if (delegateBtn) {
         ev.preventDefault()
         ev.stopPropagation()
         if (onDelegateClick) onDelegateClick()
         return
      }
      const resumeBtn = ev.target.closest(".arsg-resume-btn")
      if (resumeBtn) {
         ev.preventDefault()
         ev.stopPropagation()
         if (onResumeClick) onResumeClick()
         return
      }
      const stopActingBtn = ev.target.closest(".arsg-stop-acting-btn")
      if (stopActingBtn) {
         ev.preventDefault()
         ev.stopPropagation()
         if (onStopActingClick) onStopActingClick()
         return
      }
      const gmBtn = ev.target.closest(".arsg-gm-btn")
      if (gmBtn && onGmAction) {
         ev.preventDefault()
         ev.stopPropagation()
         onGmAction(gmBtn.dataset.action)
      }
   })

   return el
}

function applyColor() {
   if (!rootEl) return
   rootEl.style.setProperty(
      "--arsg-color",
      String(game.settings.get(MODULE_ID, SETTING.FRAME_COLOR)),
   )
   const glowEnabled = game.settings.get(MODULE_ID, SETTING.ENABLE_SCREEN_GLOW)
   rootEl.classList.toggle("arsg-no-glow", !glowEnabled)
}

function buildHotkeyHint(action = "snatch") {
   if (!rootEl) return
   const keysEl = rootEl.querySelector(
      ".arsg-keys:not(.arsg-delegate-keys):not(.arsg-stop-keys)",
   )
   if (!keysEl) return
   const binding = game.keybindings.bindings.get(`${MODULE_ID}.${action}`)?.[0]
   if (!binding) {
      keysEl.textContent = "—"
      return
   }
   const parts = [
      ...(binding.modifiers ?? []),
      binding.key.replace(/^Key|^Digit/, ""),
   ]
   keysEl.innerHTML = parts
      .map((p) => `<kbd>${p}</kbd>`)
      .join('<span class="arsg-plus">+</span>')
}

function _buildKeyHintInto(selector, keybindId) {
   const el = rootEl?.querySelector(selector)
   if (!el) return
   const binding = game.keybindings.bindings.get(
      `${MODULE_ID}.${keybindId}`,
   )?.[0]
   if (!binding) {
      el.textContent = ""
      return
   }
   const parts = [
      ...(binding.modifiers ?? []),
      binding.key.replace(/^Key|^Digit/, ""),
   ]
   el.innerHTML = parts
      .map((p) => `<kbd>${p}</kbd>`)
      .join('<span class="arsg-plus">+</span>')
}

function buildActsKeyHints() {
   if (!rootEl) return
   buildHotkeyHint(KEYBIND.RESUME_OPPORTUNITY)
   _buildKeyHintInto(".arsg-delegate-keys", KEYBIND.DELEGATE)
   _buildKeyHintInto(".arsg-stop-keys", KEYBIND.STOP_ACTING)
}

async function refreshGmButtons() {
   if (!rootEl) return
   const isElevated =
      game.user.isGM || game.user.role >= CONST.USER_ROLES.ASSISTANT
   const tipsEl = rootEl.querySelector(".arsg-gm-tips")
   const actionsEl = rootEl.querySelector(".arsg-gm-actions")
   if (!isElevated) {
      tipsEl.hidden = true
      actionsEl.hidden = true
      return
   }

   const tipsHtml = await foundry.applications.handlebars.renderTemplate(
      TEMPLATE.GM_TIPS,
      {
         tips: [
            {
               keys: hotkeyKbd("triggerCountdown"),
               label: game.i18n.localize("ARSG.UI.GmTipHoldNumber"),
            },
            {
               keys: hotkeyKbd("queueCancel"),
               label: game.i18n.localize("ARSG.UI.GmTipToggleQueue"),
            },
            {
               keys: hotkeyKbd("stopOpportunity"),
               label: game.i18n.localize("ARSG.UI.GmTipStopNow"),
            },
         ],
      },
   )
   tipsEl.innerHTML = tipsHtml
   tipsEl.hidden = false

   const actions = []
   if (state.countdown.active) {
      actions.push(
         state.countdown.cancelQueued
            ? {
                 kind: "cancel-queue",
                 label: game.i18n.localize("ARSG.UI.GmActionCancelQueue"),
              }
            : {
                 kind: "queue-opportunity",
                 label: game.i18n.localize("ARSG.UI.GmActionQueueOpportunity"),
              },
      )
   } else {
      actions.push({
         kind: "countdown",
         label: game.i18n.localize("ARSG.UI.GmActionCountdown"),
      })
   }
   actions.push({
      kind: "stop",
      label: game.i18n.localize("ARSG.UI.GmActionStop"),
   })

   const actionsHtml = await foundry.applications.handlebars.renderTemplate(
      TEMPLATE.GM_ACTIONS,
      { actions },
   )
   actionsEl.innerHTML = actionsHtml
   actionsEl.hidden = false
}

function hotkeyKbd(id) {
   const b = game.keybindings.bindings.get(`${MODULE_ID}.${id}`)?.[0]
   if (!b) return "—"
   return [...(b.modifiers ?? []), b.key.replace(/^Key|^Digit/, "")]
      .map((p) => `<kbd>${p}</kbd>`)
      .join("+")
}

function _hideActsActions() {
   if (!rootEl) return
   rootEl.querySelector(".arsg-acts-actions").hidden = true
   rootEl.querySelector(".arsg-delegate-btn").hidden = true
   rootEl.querySelector(".arsg-delegate-or").hidden = true
   rootEl.querySelector(".arsg-delegate-keys").hidden = true
   rootEl.querySelector(".arsg-acts-actions-sep").hidden = true
   rootEl.querySelector(".arsg-stop-acting-btn").hidden = true
   rootEl.querySelector(".arsg-stop-or").hidden = true
   rootEl.querySelector(".arsg-stop-keys").hidden = true
}

function _hideAllInteractive() {
   if (!rootEl) return
   rootEl.querySelector(".arsg-snatch-btn").hidden = true
   rootEl.querySelector(".arsg-resume-btn").hidden = true
   rootEl.querySelector(".arsg-or").hidden = true
   rootEl.querySelector(
      ".arsg-keys:not(.arsg-delegate-keys):not(.arsg-stop-keys)",
   ).hidden = true
   rootEl.querySelector(".arsg-countdown").hidden = true
   rootEl.querySelector(".arsg-cancel-tag").hidden = true
   rootEl.querySelector(".arsg-gm-tips").hidden = true
   rootEl.querySelector(".arsg-gm-actions").hidden = true
   rootEl.querySelector(".arsg-actor-img").hidden = true
   rootEl.querySelector(".arsg-contenders").hidden = true
   _hideActsActions()
}

async function showOpportunity({ promptText }) {
   actsGen += 1
   const myGen = actsGen

   await ensureRoot()
   if (actsGen !== myGen) return

   applyColor()
   buildHotkeyHint("snatch")

   rootEl.querySelector(".arsg-snatch-btn").textContent = localizedSetting(
      SETTING.SNATCH_BUTTON_TEXT,
      "ARSG.UI.SnatchDefault",
   )
   rootEl.querySelector(".arsg-or").textContent =
      game.i18n.localize("ARSG.UI.OrLabel")
   rootEl.querySelector(".arsg-cancel-tag").textContent = localizedSetting(
      SETTING.CANCELLATION_QUEUED_TEXT,
      "ARSG.UI.LostQueuedDefault",
   )

   rootEl.querySelector(".arsg-text").textContent = promptText
   rootEl.querySelector(".arsg-actor-img").hidden = true
   rootEl.querySelector(".arsg-snatch-btn").hidden = false
   rootEl.querySelector(".arsg-resume-btn").hidden = true
   rootEl.querySelector(".arsg-or").hidden = false
   rootEl.querySelector(
      ".arsg-keys:not(.arsg-delegate-keys):not(.arsg-stop-keys)",
   ).hidden = false
   rootEl.querySelector(".arsg-countdown").hidden = true
   rootEl.querySelector(".arsg-cancel-tag").hidden = true
   rootEl.querySelector(".arsg-contenders").hidden = true
   _hideActsActions()

   rootEl.classList.remove(
      "arsg-acts",
      "arsg-converging",
      "arsg-fading",
      "arsg-lost",
      "arsg-pulse",
      "arsg-acts-lingering",
      "arsg-linger-hover",
   )
   void rootEl.offsetWidth
   rootEl.classList.add("arsg-active")
   await refreshGmButtons()
}

async function showActs({
   user,
   contenders = [],
   isWinner = false,
   displayName,
   image,
   actsTextTemplate,
   pulse = false,
}) {
   actsGen += 1
   const myGen = actsGen

   await ensureRoot()
   if (actsGen !== myGen) return

   rootEl.classList.remove(
      "arsg-fading",
      "arsg-lost",
      "arsg-pulse",
      "arsg-acts-lingering",
      "arsg-linger-hover",
   )
   if (pulse) {
      rootEl.classList.add("arsg-pulse")
      setTimeout(() => {
         if (rootEl) rootEl.classList.remove("arsg-pulse")
      }, 600)
   }
   rootEl.classList.add("arsg-active", "arsg-acts", "arsg-converging")

   const delegateEnabled = game.settings.get(MODULE_ID, SETTING.ENABLE_DELEGATE)

   rootEl.querySelector(".arsg-resume-btn").textContent = localizedSetting(
      SETTING.RESUME_OPPORTUNITY_BUTTON_TEXT,
      "ARSG.UI.ResumeOpportunityDefault",
   )
   rootEl.querySelector(".arsg-delegate-btn").textContent = localizedSetting(
      SETTING.DELEGATE_BUTTON_TEXT,
      "ARSG.UI.DelegateDefault",
   )
   rootEl.querySelector(".arsg-stop-acting-btn").textContent = localizedSetting(
      SETTING.STOP_ACTING_BUTTON_TEXT,
      "ARSG.UI.StopActingDefault",
   )
   rootEl.querySelectorAll(".arsg-or").forEach((el) => {
      el.textContent = game.i18n.localize("ARSG.UI.OrLabel")
   })

   rootEl.querySelector(".arsg-text").textContent = actsTextTemplate.replace(
      /\{name\}/g,
      displayName,
   )

   rootEl.querySelector(".arsg-snatch-btn").hidden = true
   rootEl.querySelector(".arsg-resume-btn").hidden = !isWinner
   rootEl.querySelector(".arsg-or").hidden = !isWinner
   rootEl.querySelector(
      ".arsg-keys:not(.arsg-delegate-keys):not(.arsg-stop-keys)",
   ).hidden = !isWinner
   rootEl.querySelector(".arsg-countdown").hidden = true
   rootEl.querySelector(".arsg-cancel-tag").hidden = true
   rootEl.querySelector(".arsg-gm-tips").hidden = true
   rootEl.querySelector(".arsg-gm-actions").hidden = true

   if (isWinner) {
      buildActsKeyHints()
      const showDelegate = delegateEnabled
      rootEl.querySelector(".arsg-acts-actions").hidden = false
      rootEl.querySelector(".arsg-delegate-btn").hidden = !showDelegate
      rootEl.querySelector(".arsg-delegate-or").hidden = !showDelegate
      rootEl.querySelector(".arsg-delegate-keys").hidden = !showDelegate
      rootEl.querySelector(".arsg-acts-actions-sep").hidden = !showDelegate
      rootEl.querySelector(".arsg-stop-acting-btn").hidden = false
      rootEl.querySelector(".arsg-stop-or").hidden = false
      rootEl.querySelector(".arsg-stop-keys").hidden = false
   } else {
      _hideActsActions()
   }

   const imgEl = rootEl.querySelector(".arsg-actor-img")
   if (image) {
      imgEl.style.backgroundImage = `url("${image}")`
      imgEl.hidden = false
   } else imgEl.hidden = true

   const cEl = rootEl.querySelector(".arsg-contenders")
   if (contenders.length) {
      const html = await foundry.applications.handlebars.renderTemplate(
         TEMPLATE.CONTENDERS,
         {
            alsoTriedLabel: localizedSetting(
               SETTING.ALSO_TRIED_TEXT,
               "ARSG.UI.AlsoTriedDefault",
            ),
            contenders: contenders.map((u) => ({
               name: u?.name ?? "?",
               color: u?.color ?? "#888",
            })),
         },
      )
      if (actsGen !== myGen) return
      cEl.innerHTML = html
      cEl.hidden = false
   } else {
      cEl.hidden = true
   }

   if (actsTimeoutId) {
      clearTimeout(actsTimeoutId)
      actsTimeoutId = null
   }

   if (isWinner) {
      const autoDismiss = game.settings.get(
         MODULE_ID,
         SETTING.ACTS_AUTO_DISMISS,
      )
      if (autoDismiss) {
         const dismissMs = Math.max(
            500,
            game.settings.get(MODULE_ID, SETTING.ACTS_AUTO_DISMISS_MS) || 5000,
         )
         actsTimeoutId = setTimeout(() => {
            if (actsGen === myGen) dismiss()
         }, dismissMs)
      } else {
         actsTimeoutId = setTimeout(() => {
            if (actsGen === myGen) _enterLingerState(myGen)
         }, ACTS_DISMISS_DELAY_MS)
      }
   } else {
      actsTimeoutId = setTimeout(() => {
         if (actsGen === myGen) dismiss()
      }, ACTS_DISMISS_DELAY_MS)
   }
}

function _enterLingerState(myGen) {
   if (!rootEl || actsGen !== myGen) return
   rootEl.classList.add("arsg-acts-lingering")
   actsTimeoutId = null
}

async function pulseAndShowActs(payload) {
   return showActs({ ...payload, pulse: true })
}

async function showStoppedActing({ text, image }) {
   actsGen += 1
   const myGen = actsGen

   await ensureRoot()
   if (actsGen !== myGen) return

   rootEl.classList.remove(
      "arsg-fading",
      "arsg-lost",
      "arsg-pulse",
      "arsg-acts-lingering",
      "arsg-linger-hover",
   )
   rootEl.classList.add("arsg-active", "arsg-acts", "arsg-converging")

   rootEl.querySelector(".arsg-text").textContent = text
   rootEl.querySelector(".arsg-snatch-btn").hidden = true
   rootEl.querySelector(".arsg-resume-btn").hidden = true
   rootEl.querySelector(".arsg-or").hidden = true
   rootEl.querySelector(
      ".arsg-keys:not(.arsg-delegate-keys):not(.arsg-stop-keys)",
   ).hidden = true
   rootEl.querySelector(".arsg-countdown").hidden = true
   rootEl.querySelector(".arsg-cancel-tag").hidden = true
   rootEl.querySelector(".arsg-gm-tips").hidden = true
   rootEl.querySelector(".arsg-gm-actions").hidden = true
   rootEl.querySelector(".arsg-contenders").hidden = true
   _hideActsActions()

   const imgEl = rootEl.querySelector(".arsg-actor-img")
   if (image) {
      imgEl.style.backgroundImage = `url("${image}")`
      imgEl.hidden = false
   } else imgEl.hidden = true

   if (actsTimeoutId) {
      clearTimeout(actsTimeoutId)
      actsTimeoutId = null
   }
   actsTimeoutId = setTimeout(() => {
      if (actsGen === myGen) dismiss()
   }, ACTS_DISMISS_DELAY_MS)
}

function dismiss() {
   if (!rootEl) return
   actsGen += 1
   const myGen = actsGen
   rootEl.classList.remove("arsg-linger-hover")
   rootEl.classList.add("arsg-fading")
   setTimeout(() => {
      if (actsGen !== myGen) return
      rootEl.classList.remove(
         "arsg-active",
         "arsg-acts",
         "arsg-converging",
         "arsg-fading",
         "arsg-lost",
         "arsg-pulse",
         "arsg-acts-lingering",
      )
      resetOpportunityState()
   }, FRAME_FADE_MS)
}

function dismissSilent() {
   if (!rootEl) return
   actsGen += 1
   rootEl.classList.remove(
      "arsg-active",
      "arsg-acts",
      "arsg-converging",
      "arsg-fading",
      "arsg-lost",
      "arsg-pulse",
      "arsg-acts-lingering",
      "arsg-linger-hover",
   )
   resetOpportunityState()
}

function dismissAsLost({ showText, lostText }) {
   if (!rootEl) return
   actsGen += 1
   const myGen = actsGen
   rootEl.classList.remove(
      "arsg-converging",
      "arsg-acts",
      "arsg-pulse",
      "arsg-acts-lingering",
      "arsg-linger-hover",
   )
   rootEl.classList.add("arsg-lost")

   if (showText) {
      _hideAllInteractive()
      rootEl.querySelector(".arsg-text").textContent = lostText
      rootEl.querySelector(".arsg-actor-img").hidden = true
      rootEl.classList.add("arsg-active")
      setTimeout(() => {
         if (actsGen === myGen) _fadeOutLost(myGen)
      }, LOST_LINGER_MS)
   } else {
      _fadeOutLost(myGen)
   }
}

function _fadeOutLost(myGen) {
   if (!rootEl || (myGen != null && actsGen !== myGen)) return
   rootEl.classList.add("arsg-fading")
   setTimeout(() => {
      if (myGen != null && actsGen !== myGen) return
      rootEl.classList.remove("arsg-active", "arsg-fading", "arsg-lost")
      resetOpportunityState()
   }, 1300)
}

function showCountdownNumber(seconds) {
   if (!rootEl) return
   if (
      rootEl.classList.contains("arsg-acts") ||
      rootEl.classList.contains("arsg-fading")
   )
      return
   const el = rootEl.querySelector(".arsg-countdown")
   el.hidden = false
   el.textContent = String(seconds)
   el.classList.remove("arsg-tick")
   void el.offsetWidth
   el.classList.add("arsg-tick")
}

function updateCountdownNumber(remaining) {
   if (!rootEl) return
   if (
      rootEl.classList.contains("arsg-acts") ||
      rootEl.classList.contains("arsg-fading")
   )
      return
   const el = rootEl.querySelector(".arsg-countdown")
   if (remaining <= 0) {
      el.hidden = true
      return
   }
   el.textContent = String(remaining)
   el.classList.remove("arsg-tick")
   void el.offsetWidth
   el.classList.add("arsg-tick")
}

function hideCountdownNumber() {
   if (!rootEl) return
   rootEl.querySelector(".arsg-countdown").hidden = true
   rootEl.querySelector(".arsg-cancel-tag").hidden = true
}

function setCancelQueued(queued) {
   if (!rootEl) return
   if (
      rootEl.classList.contains("arsg-acts") ||
      rootEl.classList.contains("arsg-fading")
   )
      return
   rootEl.querySelector(".arsg-cancel-tag").hidden = !queued
}
