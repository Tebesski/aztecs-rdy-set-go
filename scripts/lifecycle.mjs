import { MODULE_ID, SETTING, SNATCH_RESOLVE_WINDOW_MS } from "./constants.mjs"
import { state, resetCountdownState, closeDelegateDialog } from "./state.mjs"
import { emit, registerHandler, SOCKET_TYPE } from "./socket.mjs"
import { overlay } from "./overlay.mjs"
import { playSetting } from "./sound.mjs"
import { resolveDisplayName, resolveActorImage } from "./actor-image.mjs"
import { startCountdown } from "./countdown.mjs"

export function isGM() {
   return !!(game.user?.isGM || game.user?.role >= CONST.USER_ROLES.ASSISTANT)
}

export function broadcastOpportunity({
   initialCountdownSeconds = null,
   initialCancelQueued = null,
} = {}) {
   if (!isGM()) return
   if (state.active && !state.resolved) {
      if (initialCountdownSeconds && initialCountdownSeconds > 0) {
         startCountdown(initialCountdownSeconds, {
            withQueuedCancel: initialCancelQueued,
         })
         return
      }
      emit({
         type: SOCKET_TYPE.CANCEL,
         opportunityId: state.opportunityId,
         silent: true,
      })
   }
   closeDelegateDialog()
   const id = foundry.utils.randomID()
   emit({
      type: SOCKET_TYPE.BROADCAST,
      opportunityId: id,
      initiatorId: game.user.id,
      initialCountdownSeconds,
      initialCancelQueued,
   })
}

export function snatch() {
   if (!state.active || state.resolved) return
   emit({
      type: SOCKET_TYPE.SNATCH_ATTEMPT,
      opportunityId: state.opportunityId,
      userId: game.user.id,
   })
}

export function stopOpportunity() {
   if (!isGM()) return
   if (!state.active || state.resolved) return
   emit({ type: SOCKET_TYPE.CANCEL, opportunityId: state.opportunityId })
}

export function delegateOpen() {
   if (!state.active || !state.resolved) return
   if (state.winnerId !== game.user.id) return
   if (state.delegateDialog) return

   overlay.cancelAutoDismiss()

   let didDelegate = false
   const opportunityId = state.opportunityId
   const users = game.users.filter((u) => u.active && u.id !== game.user.id)

   if (!users.length) {
      overlay.dismiss()
      return
   }

   const buttons = users.map((u) => ({
      action: u.id,
      label: resolveDisplayName(u),
      callback: () => {
         if (state.opportunityId !== opportunityId) return
         didDelegate = true
         delegateTo(u.id)
      },
   }))

   buttons.push({
      action: "cancel",
      label: "Cancel",
      callback: () => {},
   })

   const dialog = new foundry.applications.api.DialogV2({
      window: {
         title:
            game.settings.get(MODULE_ID, SETTING.DELEGATE_DIALOG_TITLE) ||
            game.i18n.localize("ARSG.UI.DelegateDialogTitleDefault"),
      },
      content: `<p>${
         foundry.utils.escapeHTML?.(
            game.settings.get(MODULE_ID, SETTING.DELEGATE_DIALOG_PROMPT) ||
               game.i18n.localize("ARSG.UI.DelegateDialogPromptDefault"),
         ) ?? game.settings.get(MODULE_ID, SETTING.DELEGATE_DIALOG_PROMPT)
      }</p>`,
      buttons,
   })

   const origClose = dialog.close.bind(dialog)
   dialog.close = async function (options) {
      const result = await origClose(options)
      if (state.delegateDialog === dialog) state.delegateDialog = null
      if (!didDelegate && state.opportunityId === opportunityId) {
         overlay.dismiss()
      }
      return result
   }

   state.delegateDialog = dialog
   dialog.render({ force: true })
}

export function delegateTo(toUserId) {
   if (!state.active || !state.resolved) return
   if (state.winnerId !== game.user.id) return
   emit({
      type: SOCKET_TYPE.DELEGATE,
      opportunityId: state.opportunityId,
      toUserId,
   })
}

async function onBroadcast(data) {
   closeDelegateDialog()
   state.active = true
   state.resolved = false
   state.winnerId = null
   state.opportunityId = data.opportunityId
   state.initiatorId = data.initiatorId

   const promptText =
      game.settings.get(MODULE_ID, SETTING.PROMPT_TEXT) ||
      game.i18n.localize("ARSG.UI.PromptDefault")
   await overlay.showOpportunity({ promptText })
   playSetting(SETTING.SNATCH_SOUND)

   if (
      isGM() &&
      data.initialCountdownSeconds &&
      data.initialCountdownSeconds > 0
   ) {
      startCountdown(data.initialCountdownSeconds, {
         withQueuedCancel: data.initialCancelQueued,
      })
   }
}

function onSnatchAttempt(data) {
   if (!isGM()) return
   if (data.opportunityId !== state.opportunityId) return
   if (state.resolved) return
   let bucket = state.snatchContenders.get(data.opportunityId)
   if (!bucket) {
      bucket = { users: new Set() }
      state.snatchContenders.set(data.opportunityId, bucket)
      setTimeout(
         () => resolveSnatchRace(data.opportunityId),
         SNATCH_RESOLVE_WINDOW_MS,
      )
   }
   bucket.users.add(data.userId)
}

function resolveSnatchRace(opportunityId) {
   const bucket = state.snatchContenders.get(opportunityId)
   if (!bucket) return
   state.snatchContenders.delete(opportunityId)
   if (state.resolved || state.opportunityId !== opportunityId) return
   const contenders = Array.from(bucket.users)
   if (!contenders.length) return
   const winnerId = contenders[Math.floor(Math.random() * contenders.length)]
   emit({ type: SOCKET_TYPE.RESOLVE, opportunityId, winnerId, contenders })
}

async function onResolve(data) {
   if (data.opportunityId !== state.opportunityId) return
   state.resolved = true
   state.winnerId = data.winnerId
   resetCountdownState()
   const winner = game.users.get(data.winnerId)
   const others = data.contenders
      .filter((id) => id !== data.winnerId)
      .map((id) => game.users.get(id))
      .filter(Boolean)

   const isWinner = data.winnerId === game.user.id
   const actsTextTemplate = isWinner
      ? game.settings.get(MODULE_ID, SETTING.YOU_ACT_TEXT) || "You are acting!"
      : game.settings.get(MODULE_ID, SETTING.ACTS_TEXT) ||
        game.i18n.localize("ARSG.UI.ActsDefault")

   await overlay.showActs({
      user: winner,
      contenders: others,
      isWinner,
      displayName: resolveDisplayName(winner),
      image: game.settings.get(MODULE_ID, SETTING.SHOW_ACTOR_IMAGE)
         ? resolveActorImage(winner)
         : null,
      actsTextTemplate,
   })

   playSetting(SETTING.ACT_SOUND)
   panToWinnerToken(winner)
}

function panToWinnerToken(winner) {
   if (!winner) return
   if (winner.isGM) return
   if (!game.settings.get(MODULE_ID, SETTING.PAN_TO_TOKEN)) return
   const actor = winner.character
   if (!actor) return
   const scene = game.scenes?.active ?? canvas?.scene
   if (!scene || canvas?.scene?.id !== scene.id) return
   const token = canvas.tokens?.placeables?.find(
      (t) => t.actor?.id === actor.id,
   )
   if (!token) return
   try {
      canvas.animatePan({ x: token.center.x, y: token.center.y, duration: 600 })
   } catch (_e) {}
}

async function onDelegate(data) {
   closeDelegateDialog()
   const winner = game.users.get(data.toUserId)
   state.active = true
   state.resolved = true
   state.winnerId = data.toUserId
   state.opportunityId = data.opportunityId

   const isWinner = data.toUserId === game.user.id
   const actsTextTemplate = isWinner
      ? game.settings.get(MODULE_ID, SETTING.YOU_ACT_TEXT) || "You are acting!"
      : game.settings.get(MODULE_ID, SETTING.ACTS_TEXT) ||
        game.i18n.localize("ARSG.UI.ActsDefault")

   await overlay.pulseAndShowActs({
      user: winner,
      contenders: [],
      isWinner,
      displayName: resolveDisplayName(winner),
      image: game.settings.get(MODULE_ID, SETTING.SHOW_ACTOR_IMAGE)
         ? resolveActorImage(winner)
         : null,
      actsTextTemplate,
   })

   playSetting(SETTING.ACT_SOUND)
   panToWinnerToken(winner)
}

function onCancel(data) {
   if (data.opportunityId !== state.opportunityId) return
   closeDelegateDialog()
   state.resolved = true
   resetCountdownState()
   if (data.silent) {
      overlay.dismissSilent()
      return
   }
   const lostText =
      game.settings.get(MODULE_ID, SETTING.LOST_TEXT) ||
      game.i18n.localize("ARSG.UI.LostDefault")
   overlay.dismissAsLost({
      showText: game.settings.get(MODULE_ID, SETTING.SHOW_LOST_TEXT),
      lostText,
   })
   playSetting(SETTING.LOST_SOUND)
}

export function registerLifecycleHandlers() {
   registerHandler(SOCKET_TYPE.BROADCAST, onBroadcast)
   registerHandler(SOCKET_TYPE.SNATCH_ATTEMPT, onSnatchAttempt)
   registerHandler(SOCKET_TYPE.RESOLVE, onResolve)
   registerHandler(SOCKET_TYPE.DELEGATE, onDelegate)
   registerHandler(SOCKET_TYPE.CANCEL, onCancel)
}
