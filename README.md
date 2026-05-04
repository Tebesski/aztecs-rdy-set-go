# Aztec's RDY, SET, GO!

An experimental module for signalling RP opportunities to the table without breaking immersion. I made it because I wanted to try and solve the problem of these weird moments of hesitation at online tables. The key would be prompting players to start acting in a game without breaking engagement, without long awkward pauses and without social anxiousness that you might steal someone's moment without even knowing it.

## Default hotkeys

- **Trigger Opportunity** — `Ctrl + Space`
  <img width="1897" height="511" alt="1" src="https://github.com/user-attachments/assets/3fd7ddcf-836a-4bd4-8c3b-e3fdb3926212" />

- **Trigger with Countdown** — `Shift+Space`
   - Hold `Shift + Space`, then **press** `1`–`9` (or `0` for 10s) → countdown opportunity fires immediately.
   - Hold `Shift + Space`, then **hold** a digit → fires with the cancel queued.
   - Release `Shift + Space` without pressing a digit → opens the countdown picker.
     <img width="1895" height="772" alt="2" src="https://github.com/user-attachments/assets/90a651a2-3ea1-454c-98c7-fb5b30800d8f" />

- **Snatch** — `Space`
- **Stop opportunity** — `Escape`
- **Cancel queue / Queue cancel** — `Space + Q`
- **Start Countdown on Current Opportunity** — `Shift + T`

## Scene control button

The clapperboard button on the scene controls fires an opportunity on left-click, and opens the countdown digit picker on right-click. Toggleable in module settings.

## Developer API

```javascript
const api = game.modules.get("aztecs-rdy-set-go").api

// Triggers an opportunity directly
api.trigger()

// Triggers an opportunity with an automated countdown
api.triggerWithCountdown(5) // 5 seconds

// Snatches the currently active opportunity
api.snatch()

// Manually stop or cancel the ongoing opportunity
api.stop()

// Open the UI to delegate the opportunity to another player
api.delegate()

// Delegate the opportunity directly to a specific user ID
api.delegate("USER_ID_HERE")

// Resume an opportunity after winning
api.resume()

// Declare that you have finished acting
api.stopActing()

// Update an existing countdown
api.setCountdown(10) // set remaining to 10 seconds

// Toggle queued cancellation state
api.toggleQueue()

// Open/Close the countdown picker interface
api.openCountdownPicker()
api.closeCountdownPicker()
```
