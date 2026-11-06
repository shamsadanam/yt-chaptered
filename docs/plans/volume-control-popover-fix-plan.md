---
title: Volume Control Popover Click-Only Fix Plan
skip-verification: true
---

# Volume Control Popover Click-Only Fix Plan

## Objective
Fix the volume control behavior in `PlayerControlsBar.tsx` where hovering over the speaker icon reveals the floating slider, but moving the cursor toward the slider causes it to disappear due to crossing a hover dead-zone. Replace the hover-trigger with a click-only popover that stays open until explicitly dismissed, clicked outside, or when the player overlay auto-hides.

## Changes
1. In `components/player/PlayerControlsBar.tsx`:
   - Remove `group/volume`, `group-hover/volume:...`, and `group-focus-within/volume:...` CSS classes.
   - Render the floating volume slider conditionally based strictly on `isVolumeOpen`.
   - Add Escape key listener when `isVolumeOpen` is true to dismiss the slider.
   - Add effect to dismiss `isVolumeOpen` when `visible` becomes false (i.e., when player controls auto-hide after 3.5s of inactivity).
   - Style the speaker button with an active highlight state (`bg-stone-800 text-white border-white/30`) when `isVolumeOpen` is true.

## Verification
- Run typecheck, lint, and build (`pnpm exec tsc --noEmit && pnpm lint && pnpm build`).
- Verify manual test flow: click speaker button to open slider, verify moving cursor to slider never closes it, verify outside click, Escape, and overlay auto-hide dismiss it.
