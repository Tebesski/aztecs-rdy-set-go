import { MODULE_ID, KEYBIND, DIGIT_HOLD_THRESHOLD_MS } from "./constants.mjs"
import { state, clearKeyHoldStates, closeDelegateDialog } from "./state.mjs"
import {
   broadcastOpportunity,
   snatch,
   stopOpportunity,
   delegateOpen,
   isGM,
} from "./lifecycle.mjs"
import { startCountdown, toggleQueuedCancel } from "./countdown.mjs"
import {
   openCountdownPicker,
   closeCountdownPicker,
} from "./countdown-picker.mjs"

let triggerCountdownDigitFired = false
let listenersReady = false

export function registerKeybindings() {
   const passthrough = () => false

   game.keybindings.register(MODULE_ID, KEYBIND.TRIGGER, {
      name: "ARSG.Keybind.Trigger",
      editable: [{ key: "Space", modifiers: ["Control"] }],
      onDown: passthrough,
      onUp: passthrough,
   })
   game.keybindings.register(MODULE_ID, KEYBIND.TRIGGER_COUNTDOWN, {
      name: "ARSG.Keybind.TriggerCountdown",
      hint: "ARSG.Keybind.TriggerCountdownHint",
      editable: [{ key: "Space", modifiers: ["Shift"] }],
      onDown: passthrough,
      onUp: passthrough,
   })
   game.keybindings.register(MODULE_ID, KEYBIND.SNATCH, {
      name: "ARSG.Keybind.Snatch",
      hint: "ARSG.Keybind.SnatchHint",
      editable: [{ key: "Space", modifiers: [] }],
      onDown: passthrough,
      onUp: passthrough,
   })
   game.keybindings.register(MODULE_ID, KEYBIND.DELEGATE, {
      name: "ARSG.Keybind.Delegate",
      hint: "ARSG.Keybind.DelegateHint",
      editable: [{ key: "Space", modifiers: [] }],
      onDown: passthrough,
      onUp: passthrough,
   })
   game.keybindings.register(MODULE_ID, KEYBIND.STOP_OPPORTUNITY, {
      name: "ARSG.Keybind.StopOpportunity",
      hint: "ARSG.Keybind.StopOpportunityHint",
      editable: [{ key: "Escape", modifiers: [] }],
      onDown: passthrough,
      onUp: passthrough,
   })
   game.keybindings.register(MODULE_ID, KEYBIND.QUEUE_CANCEL, {
      name: "ARSG.Keybind.QueueCancel",
      hint: "ARSG.Keybind.QueueCancelHint",
      editable: [{ key: "KeyQ", modifiers: ["Shift"] }],
      onDown: () => {
         if (!isGM()) return false
         if (!state.countdown.active) return false
         toggleQueuedCancel()
         return true
      },
   })
   game.keybindings.register(MODULE_ID, KEYBIND.START_COUNTDOWN, {
      name: "ARSG.Keybind.StartCountdown",
      hint: "ARSG.Keybind.StartCountdownHint",
      editable: [{ key: "KeyT", modifiers: ["Shift"] }],
      onDown: () => {
         if (!isGM()) return false
         if (!state.active || state.resolved) return false
         openCountdownPicker()
         return true
      },
   })
}

export function installRawKeyListeners() {
   if (listenersReady) return
   window.addEventListener("keydown", onWindowKeyDown, true)
   window.addEventListener("keyup", onWindowKeyUp, true)
   window.addEventListener("blur", onBlur)
   document.addEventListener("visibilitychange", onVisibilityChange)
   listenersReady = true
}

installRawKeyListeners()

function isTextInputFocused() {
   const el = document.activeElement
   if (!el) return false
   const tag = el.tagName
   if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true
   if (el.isContentEditable) return true
   return false
}

function getBinding(id) {
   const list = game.keybindings.bindings.get(`${MODULE_ID}.${id}`)
   if (!list || !list.length) return null
   return list[0]
}

function eventMatches(ev, binding) {
   if (!binding) return false
   if (ev.code !== binding.key) return false
   const mods = binding.modifiers ?? []
   const wantCtrl = mods.includes("Control")
   const wantShift = mods.includes("Shift")
   const wantAlt = mods.includes("Alt")
   return (
      ev.ctrlKey === wantCtrl &&
      ev.shiftKey === wantShift &&
      ev.altKey === wantAlt
   )
}

function userIsWinnerInActsState() {
   return state.active && state.resolved && state.winnerId === game.user.id
}

function fireCountdownTrigger(seconds) {
   if (state.active && !state.resolved) {
      startCountdown(seconds)
   } else {
      broadcastOpportunity({ initialCountdownSeconds: seconds })
   }
}

function onWindowKeyDown(ev) {
   if (
      typeof game === "undefined" ||
      !game?.user ||
      !game?.keybindings?.bindings
   )
      return
   if (isTextInputFocused()) return

   const triggerBind = getBinding(KEYBIND.TRIGGER)
   const countdownBind = getBinding(KEYBIND.TRIGGER_COUNTDOWN)
   const snatchBind = getBinding(KEYBIND.SNATCH)
   const delegateBind = getBinding(KEYBIND.DELEGATE)
   const stopBind = getBinding(KEYBIND.STOP_OPPORTUNITY)

   if (ev.code === "Space" && !ev.repeat) {
      state.physicalSpaceDown = true
   }

   if (
      eventMatches(ev, stopBind) &&
      isGM() &&
      state.active &&
      !state.resolved &&
      !document.querySelector(".arsg-picker") &&
      !state.delegateDialog
   ) {
      ev.preventDefault()
      ev.stopImmediatePropagation()
      if (ev.repeat) return
      stopOpportunity()
      return
   }

   if (eventMatches(ev, triggerBind)) {
      if (!isGM()) return
      ev.preventDefault()
      ev.stopImmediatePropagation()
      if (ev.repeat) return
      state.triggerHeld = true
      return
   }

   if (eventMatches(ev, countdownBind)) {
      if (!isGM()) return
      ev.preventDefault()
      ev.stopImmediatePropagation()
      if (ev.repeat) return
      state.triggerWithCountdownHeld = true
      triggerCountdownDigitFired = false
      return
   }

   if (eventMatches(ev, delegateBind)) {
      if (userIsWinnerInActsState()) {
         ev.preventDefault()
         ev.stopImmediatePropagation()
         if (ev.repeat) return
         delegateOpen()
         return
      }
   }

   if (eventMatches(ev, snatchBind)) {
      if (state.triggerHeld || state.triggerWithCountdownHeld) return
      if (userIsWinnerInActsState()) {
         ev.preventDefault()
         ev.stopImmediatePropagation()
         if (ev.repeat) return
         delegateOpen()
         return
      }
      if (!state.active || state.resolved) return
      ev.preventDefault()
      ev.stopImmediatePropagation()
      if (ev.repeat) return
      if (state.spaceHeld) return
      state.spaceHeld = true
      return
   }

   if (isGM() && ev.code?.startsWith("Digit")) {
      const inCountdownMode =
         state.triggerWithCountdownHeld ||
         (state.physicalSpaceDown &&
            eventMatchesCountdownModifiers(ev, countdownBind))
      if (inCountdownMode) {
         const digit = parseInt(ev.code.slice(5), 10)
         if (Number.isNaN(digit)) return
         ev.preventDefault()
         ev.stopImmediatePropagation()
         if (ev.repeat) return
         if (state.digitHoldStarts.has(ev.code)) return
         if (!state.triggerWithCountdownHeld) {
            state.triggerWithCountdownHeld = true
         }
         const seconds = digit === 0 ? 10 : digit
         const code = ev.code
         triggerCountdownDigitFired = true
         fireCountdownTrigger(seconds)
         const holdTimer = setTimeout(() => {
            if (!state.digitHoldStarts.has(code)) return
            if (!state.countdown.active) return
            if (!state.countdown.cancelQueued) toggleQueuedCancel()
         }, DIGIT_HOLD_THRESHOLD_MS)
         state.digitHoldStarts.set(code, { start: Date.now(), holdTimer })
      }
   }
}

function eventMatchesCountdownModifiers(ev, countdownBind) {
   if (!countdownBind) return false
   const mods = countdownBind.modifiers ?? []
   const wantCtrl = mods.includes("Control")
   const wantShift = mods.includes("Shift")
   const wantAlt = mods.includes("Alt")
   return (
      ev.ctrlKey === wantCtrl &&
      ev.shiftKey === wantShift &&
      ev.altKey === wantAlt
   )
}

function isModifierRelease(ev, binding) {
   if (!binding) return false
   const mods = binding.modifiers ?? []
   if (ev.code === "ControlLeft" || ev.code === "ControlRight")
      return mods.includes("Control")
   if (ev.code === "ShiftLeft" || ev.code === "ShiftRight")
      return mods.includes("Shift")
   if (ev.code === "AltLeft" || ev.code === "AltRight")
      return mods.includes("Alt")
   return false
}

function onWindowKeyUp(ev) {
   if (
      typeof game === "undefined" ||
      !game?.user ||
      !game?.keybindings?.bindings
   )
      return

   if (ev.code === "Space") {
      state.physicalSpaceDown = false
   }

   if (state.triggerWithCountdownHeld && ev.code?.startsWith("Digit")) {
      const entry = state.digitHoldStarts.get(ev.code)
      if (entry) {
         state.digitHoldStarts.delete(ev.code)
         if (entry.holdTimer) clearTimeout(entry.holdTimer)
         ev.preventDefault()
         ev.stopImmediatePropagation()
         return
      }
   }

   const triggerBind = getBinding(KEYBIND.TRIGGER)
   const countdownBind = getBinding(KEYBIND.TRIGGER_COUNTDOWN)
   const snatchBind = getBinding(KEYBIND.SNATCH)

   const releaseAffectsTrigger =
      state.triggerHeld &&
      (ev.code === triggerBind?.key || isModifierRelease(ev, triggerBind))
   const releaseAffectsCountdown =
      state.triggerWithCountdownHeld &&
      (ev.code === countdownBind?.key || isModifierRelease(ev, countdownBind))
   const releaseAffectsSnatch = state.spaceHeld && ev.code === snatchBind?.key

   if (
      !releaseAffectsTrigger &&
      !releaseAffectsCountdown &&
      !releaseAffectsSnatch
   )
      return

   ev.preventDefault()
   ev.stopImmediatePropagation()

   if (releaseAffectsTrigger) {
      state.triggerHeld = false
      if (isGM()) broadcastOpportunity()
      return
   }
   if (releaseAffectsCountdown) {
      state.triggerWithCountdownHeld = false
      for (const entry of state.digitHoldStarts.values()) {
         if (entry?.holdTimer) clearTimeout(entry.holdTimer)
      }
      state.digitHoldStarts.clear()
      if (!triggerCountdownDigitFired && isGM()) {
         openCountdownPicker()
      }
      triggerCountdownDigitFired = false
      return
   }
   if (releaseAffectsSnatch) {
      state.spaceHeld = false
      if (state.active && !state.resolved) {
         snatch()
      }
      return
   }
}

function onBlur() {
   for (const entry of state.digitHoldStarts.values()) {
      if (entry?.holdTimer) clearTimeout(entry.holdTimer)
   }
   clearKeyHoldStates()
   triggerCountdownDigitFired = false
   closeCountdownPicker()
   closeDelegateDialog()
}

function onVisibilityChange() {
   if (document.hidden) {
      for (const entry of state.digitHoldStarts.values()) {
         if (entry?.holdTimer) clearTimeout(entry.holdTimer)
      }
      clearKeyHoldStates()
      triggerCountdownDigitFired = false
   }
}
