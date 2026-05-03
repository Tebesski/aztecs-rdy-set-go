import {
   MODULE_ID,
   SETTING,
   ACTS_DISMISS_DELAY_MS,
   FRAME_FADE_MS,
   LOST_LINGER_MS,
   LOST_FADE_MS,
   TEMPLATE,
} from "./constants.mjs"
import { resetOpportunityState, state } from "./state.mjs"

let rootEl = null
let actsGen = 0
let actsTimeoutId = null
let onSnatchClick = null
let onDelegateClick = null
let onGmAction = null

export const overlay = {
   ensureRoot,
   applyColor,
   showOpportunity,
   showActs,
   pulseAndShowActs,
   dismiss,
   dismissAsLost,
   dismissSilent,
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
   cancelAutoDismiss() {
      actsGen += 1
      if (actsTimeoutId) {
         clearTimeout(actsTimeoutId)
         actsTimeoutId = null
      }
      if (rootEl) {
         rootEl.classList.remove("arsg-fading")
      }
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
         orLabel: "OR",
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
}

function buildHotkeyHint(action = "snatch") {
   if (!rootEl) return
   const keysEl = rootEl.querySelector(".arsg-keys")
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
               label: "+ Hold Number = Countdown",
            },
            {
               keys: hotkeyKbd("queueCancel"),
               label: "Toggle Queue",
            },
            {
               keys: hotkeyKbd("stopOpportunity"),
               label: "Stop now",
            },
         ],
      },
   )
   tipsEl.innerHTML = tipsHtml
   tipsEl.hidden = false

   const actions = []
   if (state.countdown.active) {
      if (state.countdown.cancelQueued) {
         actions.push({
            kind: "cancel-queue",
            label: "Cancel Queue",
         })
      } else {
         actions.push({
            kind: "queue-opportunity",
            label: "Queue Opportunity",
         })
      }
   } else {
      actions.push({
         kind: "countdown",
         label: "Countdown",
      })
   }
   actions.push({
      kind: "stop",
      label: "Stop",
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
   const parts = [...(b.modifiers ?? []), b.key.replace(/^Key|^Digit/, "")]
   return parts.map((p) => `<kbd>${p}</kbd>`).join("+")
}

async function showOpportunity({ promptText }) {
   actsGen += 1
   const myGen = actsGen

   await ensureRoot()
   if (actsGen !== myGen) return

   applyColor()
   buildHotkeyHint("snatch")

   const snatchBtn = rootEl.querySelector(".arsg-snatch-btn")
   if (snatchBtn)
      snatchBtn.textContent = localizedSetting(
         SETTING.SNATCH_BUTTON_TEXT,
         "ARSG.UI.SnatchDefault",
      )
   const orEl = rootEl.querySelector(".arsg-or")
   if (orEl) orEl.textContent = "OR"
   const queuedEl = rootEl.querySelector(".arsg-cancel-tag")
   if (queuedEl)
      queuedEl.textContent = localizedSetting(
         SETTING.CANCELLATION_QUEUED_TEXT,
         "ARSG.UI.LostQueuedDefault",
      )

   rootEl.querySelector(".arsg-text").textContent = promptText
   rootEl.querySelector(".arsg-actor-img").hidden = true
   rootEl.querySelector(".arsg-snatch-btn").hidden = false
   rootEl.querySelector(".arsg-delegate-btn").hidden = true
   rootEl.querySelector(".arsg-or").hidden = false
   rootEl.querySelector(".arsg-keys").hidden = false
   rootEl.querySelector(".arsg-countdown").hidden = true
   rootEl.querySelector(".arsg-cancel-tag").hidden = true
   rootEl.querySelector(".arsg-contenders").hidden = true

   rootEl.classList.remove(
      "arsg-acts",
      "arsg-converging",
      "arsg-fading",
      "arsg-lost",
      "arsg-pulse",
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

   rootEl.classList.remove("arsg-fading", "arsg-lost", "arsg-pulse")
   if (pulse) {
      rootEl.classList.add("arsg-pulse")
      setTimeout(() => {
         if (rootEl) rootEl.classList.remove("arsg-pulse")
      }, 600)
   }

   rootEl.classList.add("arsg-active", "arsg-acts", "arsg-converging")

   const delegateBtn = rootEl.querySelector(".arsg-delegate-btn")
   if (delegateBtn)
      delegateBtn.textContent = localizedSetting(
         SETTING.DELEGATE_BUTTON_TEXT,
         "ARSG.UI.DelegateDefault",
      )

   rootEl.querySelector(".arsg-text").textContent = actsTextTemplate.replace(
      /\{name\}/g,
      displayName,
   )
   rootEl.querySelector(".arsg-snatch-btn").hidden = true
   rootEl.querySelector(".arsg-delegate-btn").hidden = !isWinner
   rootEl.querySelector(".arsg-or").hidden = !isWinner
   rootEl.querySelector(".arsg-keys").hidden = !isWinner
   rootEl.querySelector(".arsg-countdown").hidden = true
   rootEl.querySelector(".arsg-cancel-tag").hidden = true
   rootEl.querySelector(".arsg-gm-tips").hidden = true
   rootEl.querySelector(".arsg-gm-actions").hidden = true

   if (isWinner) buildHotkeyHint("delegate")

   const imgEl = rootEl.querySelector(".arsg-actor-img")
   if (image) {
      imgEl.style.backgroundImage = `url("${image}")`
      imgEl.hidden = false
   } else {
      imgEl.hidden = true
   }

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

   actsTimeoutId = setTimeout(() => {
      if (actsGen === myGen) dismiss()
   }, ACTS_DISMISS_DELAY_MS)
}

async function pulseAndShowActs(payload) {
   return showActs({ ...payload, pulse: true })
}

function dismiss() {
   if (!rootEl) return
   actsGen += 1
   const myGen = actsGen
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
   )
   resetOpportunityState()
}

function dismissAsLost({ showText, lostText }) {
   if (!rootEl) return
   actsGen += 1
   const myGen = actsGen
   rootEl.classList.remove("arsg-converging", "arsg-acts", "arsg-pulse")
   rootEl.classList.add("arsg-lost")

   if (showText) {
      rootEl.querySelector(".arsg-text").textContent = lostText
      rootEl.querySelector(".arsg-snatch-btn").hidden = true
      rootEl.querySelector(".arsg-delegate-btn").hidden = true
      rootEl.querySelector(".arsg-or").hidden = true
      rootEl.querySelector(".arsg-keys").hidden = true
      rootEl.querySelector(".arsg-countdown").hidden = true
      rootEl.querySelector(".arsg-cancel-tag").hidden = true
      rootEl.querySelector(".arsg-gm-tips").hidden = true
      rootEl.querySelector(".arsg-gm-actions").hidden = true
      rootEl.querySelector(".arsg-actor-img").hidden = true
      rootEl.querySelector(".arsg-contenders").hidden = true
      setTimeout(() => {
         if (actsGen === myGen) fadeOutLost(myGen)
      }, LOST_LINGER_MS)
   } else {
      fadeOutLost(myGen)
   }
}

function fadeOutLost(myGen) {
   if (!rootEl) return
   if (myGen != null && actsGen !== myGen) return
   rootEl.classList.add("arsg-fading")
   setTimeout(() => {
      if (myGen != null && actsGen !== myGen) return
      rootEl.classList.remove("arsg-active", "arsg-fading", "arsg-lost")
      resetOpportunityState()
   }, LOST_FADE_MS)
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
