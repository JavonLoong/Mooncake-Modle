# Hand Slice Dojo

This folder started from the open-source `collidingScopes/fruit-ninja` browser hand-tracking demo and has been reworked into a full-screen webcam slicing prototype.

## What changed locally

- Full-screen game field instead of split camera/game panels.
- Small camera preview in the lower-left corner.
- Independent visual identity and page title.
- Procedural Three.js fruit and bomb visuals.
- Slash trails, juice splashes, particle bursts, combos, best score, and pointer fallback.
- Three modes: Survival, Rush, and Focus.
- Lightweight generated WebAudio feedback for slices, misses, bombs, and start.
- Tested core rules in `tests/game-core.test.mjs`.
- Input smoothing for webcam and pointer fallback to reduce jitter.
- Runtime caps for particles, splashes, and blade trails to keep long sessions stable.
- Versioned local scripts to avoid stale browser cache while iterating.
- Pause/resume and mute controls.
- Per-mode best scores.
- Start countdown before spawning fruit.
- Game-over rank and next-rank target.
- Three.js object disposal for transient fruit, bomb, and particle meshes.
- Pending wave spawns are cancelled on restart/end and blocked while paused or counting down.
- Manual `getUserMedia` camera setup with pointer fallback when camera permission is unavailable.
- Hand input state and overlay canvases are reset between runs so stale trails do not carry into the next game.
- Core run state, timer, life-penalty, spawn difficulty, and input normalization rules are tested and shared by the browser game.
- Real clock time is separated from capped physics time so countdowns and timed modes stay accurate when the browser throttles frames.
- The main game loop uses a low-frequency timeout fallback when `requestAnimationFrame` is throttled, while camera frame processing stays on animation frames.
- Slice radius, score rewards, combo state, and mode changes are guarded so noisy tracking or invalid state cannot corrupt a run.
- Best-score reads and writes sanitize persisted values so bad localStorage data cannot put `NaN` into the HUD.
- HUD timer/life formatting clamps invalid values, and no-penalty events cannot accidentally end a run.
- Camera landmarks are mapped once into mirrored screen coordinates so the preview skeleton and slicing point match the user's hand.
- Game end now clears transient scene objects and pending visual state instead of leaving frozen meshes behind.
- Remote analytics script removed.

## How to run

From the collection root:

```powershell
.\start-project.ps1 fruit-ninja
```

Open `http://127.0.0.1:8080/` if the browser does not open automatically.

## Test

```powershell
node --test tests/game-core.test.mjs
node --check game-core.js
node --check game.js
```

## Notes

Use this as an original webcam gesture prototype. Do not copy proprietary mobile game assets, code, branding, or store packaging without a license.
