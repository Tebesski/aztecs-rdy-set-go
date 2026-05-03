import { MODULE_ID, SETTING } from "./constants.mjs"

export function resolveDisplayName(user) {
   if (!user) return "GM"
   const actor = user.character
   const mode = game.settings.get(MODULE_ID, SETTING.NAME_DISPLAY_MODE)
   const playerName = user.name
   const actorName = actor?.name
   if (!actorName) return playerName
   switch (mode) {
      case "player":
         return playerName
      case "actor":
         return actorName
      case "player-paren-actor":
         return `${playerName} (${actorName})`
      case "player-slash-actor":
         return `${playerName} / ${actorName}`
      case "actor-paren-player":
         return `${actorName} (${playerName})`
      case "actor-slash-player":
         return `${actorName} / ${playerName}`
      default:
         return `${playerName} / ${actorName}`
   }
}

export function resolveActorImage(user) {
   if (!user)
      return game.settings.get(MODULE_ID, SETTING.DEFAULT_ACTOR_IMAGE) || null
   const mode = game.settings.get(MODULE_ID, SETTING.ACTOR_IMAGE_MODE)
   const actor = user.character
   if (!actor) {
      const fallback = game.settings.get(MODULE_ID, SETTING.DEFAULT_ACTOR_IMAGE)
      return fallback || user.avatar
   }
   if (mode === "token") return actor.prototypeToken?.texture?.src ?? actor.img
   return actor.img
}
