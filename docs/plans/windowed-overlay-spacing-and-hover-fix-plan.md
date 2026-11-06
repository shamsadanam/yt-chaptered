---
title: Windowed Player Controls Spacing & Hover Fix Plan
skip-verification: true
---

# Windowed Player Controls Spacing & Hover Fix Plan

## Objective
1. Eliminate the issue where the windowed player controls overlay touches the left of the player with no spacing. Increase inset spacing to `left-4 sm:left-6 right-4 sm:right-6 bottom-3 sm:bottom-4` so the floating controls bar has generous 24px margin on desktop and 16px on mobile.
2. Provide a transparent click-and-pointermove surface over the video iframe in windowed mode (matching fullscreen mode) so moving the mouse anywhere over the video wakes up the auto-hidden controls overlay, and clicking the video canvas toggles play/pause.

## Changes
1. `components/player/PlayerControlsBar.tsx`:
   - Update windowed mode container classes from `bottom-2 sm:bottom-3 left-2 sm:left-3 right-2 sm:right-3` to `bottom-3 sm:bottom-4 left-4 sm:left-6 right-4 sm:right-6`.
2. `components/PlaylistView.tsx`:
   - Wrap windowed `PlayerControlsBar` in a transparent overlay with an interactive video surface that listens for `onPointerMove` and click-to-play/pause when `isReady && !playerError`.

## Verification
- Test in Playwright:
  - Verify `offsetFromPlayerLeft` is >= 24px on desktop.
  - Verify pointermove over the video activates the controls overlay.
  - Verify clicking video toggles play/pause.
  - Verify volume popover opens cleanly without clipping.
- Run typecheck, lint, and build (`pnpm exec tsc --noEmit && pnpm lint && pnpm build`).
- Run Vercel best practices review and code-review skill.
