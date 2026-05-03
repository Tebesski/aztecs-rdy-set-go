import { MODULE_ID, SETTING, TEMPLATE } from "./constants.mjs"
import { broadcastOpportunity } from "./lifecycle.mjs"

let pickerEl = null
let pickerKeyHandler = null
let pickerKeyUpHandler = null
let pickerHoldStarts = new Map()
const PICKER_HOLD_THRESHOLD_MS = 220

function isElevated() {
   return !!(game.user?.isGM || game.user?.role >= CONST.USER_ROLES.ASSISTANT)
}

function settingOr(key, fallbackKey) {
   const v = game.settings.get(MODULE_ID, key)
   if (v) return v
   return fallbackKey ? game.i18n.localize(fallbackKey) : ""
}

export async function openCountdownPicker() {
   if (pickerEl) return
   if (!game?.ready) return
   if (!isElevated()) return
   await buildPicker()
}

export function closeCountdownPicker() {
   if (!pickerEl) return
   removeKeyHandlers()
   pickerEl.classList.add("arsg-picker-closing")
   const el = pickerEl
   pickerEl = null
   setTimeout(() => el.remove(), 250)
}

function removeKeyHandlers() {
   if (pickerKeyHandler) {
      window.removeEventListener("keydown", pickerKeyHandler, true)
      pickerKeyHandler = null
   }
   if (pickerKeyUpHandler) {
      window.removeEventListener("keyup", pickerKeyUpHandler, true)
      pickerKeyUpHandler = null
   }
   pickerHoldStarts.clear()
}

async function buildPicker() {
   const digits = []
   for (let i = 1; i <= 9; i++) digits.push({ label: i, seconds: i })
   digits.push({ label: 10, seconds: 10 })

   const html = await foundry.applications.handlebars.renderTemplate(
      TEMPLATE.PICKER,
      {
         digits,
         title: "Pick a countdown length:",
         hint: "Press 1-9 for seconds, 0 for 10 seconds. Esc to cancel.",
         foot: "Right-click a digit to fire with the cancel queued.",
      },
   )
   const el = document.createElement("div")
   el.className = "arsg-picker"
   el.innerHTML = html
   document.body.appendChild(el)
   pickerEl = el

   el.addEventListener("click", (ev) => {
      if (ev.target.closest(".arsg-picker-close")) {
         ev.preventDefault()
         ev.stopPropagation()
         closeCountdownPicker()
         return
      }
      const digitBtn = ev.target.closest(".arsg-picker-digit")
      if (digitBtn) {
         ev.preventDefault()
         ev.stopPropagation()
         const seconds = parseInt(digitBtn.dataset.seconds, 10)
         fire(seconds, false)
      }
   })

   el.addEventListener("contextmenu", (ev) => {
      const digitBtn = ev.target.closest(".arsg-picker-digit")
      if (!digitBtn) return
      ev.preventDefault()
      ev.stopPropagation()
      const seconds = parseInt(digitBtn.dataset.seconds, 10)
      fire(seconds, true)
   })

   pickerKeyHandler = (ev) => {
      if (ev.code === "Escape") {
         ev.preventDefault()
         ev.stopPropagation()
         closeCountdownPicker()
         return
      }
      if (!ev.code?.startsWith("Digit")) return
      if (ev.repeat) return
      ev.preventDefault()
      ev.stopPropagation()
      pickerHoldStarts.set(ev.code, Date.now())
   }
   pickerKeyUpHandler = (ev) => {
      if (!ev.code?.startsWith("Digit")) return
      const start = pickerHoldStarts.get(ev.code)
      if (start == null) return
      pickerHoldStarts.delete(ev.code)
      ev.preventDefault()
      ev.stopPropagation()
      const digit = parseInt(ev.code.slice(5), 10)
      if (Number.isNaN(digit)) return
      const seconds = digit === 0 ? 10 : digit
      const heldLong = Date.now() - start >= PICKER_HOLD_THRESHOLD_MS
      fire(seconds, heldLong)
   }
   window.addEventListener("keydown", pickerKeyHandler, true)
   window.addEventListener("keyup", pickerKeyUpHandler, true)

   requestAnimationFrame(() => el.classList.add("arsg-picker-visible"))
}

function fire(seconds, withQueuedCancel) {
   closeCountdownPicker()
   const queued = withQueuedCancel ? true : null
   broadcastOpportunity({
      initialCountdownSeconds: seconds,
      initialCancelQueued: queued,
   })
}
