---
title: Click vs Double-Click Debounce Implementation Plan
skip-verification: true
---

# Click vs Double-Click Debounce Implementation Plan

## Objective
Prevent single-click actions (play/pause toggle in windowed mode, controls-overlay visibility toggle in fullscreen mode) from firing during a double-click action (fullscreen toggle):
- In windowed mode (`components/PlaylistView.tsx`): Double-clicking the player canvas toggles fullscreen cleanly without momentarily triggering play/pause.
- In fullscreen mode (`components/FullscreenOverlay.tsx`): Double-clicking the player backdrop exits fullscreen cleanly without rapidly toggling control overlay visibility.

## Technical Strategy
- Introduce a 220ms timer ref (`clickTimeoutRef`) in both `PlaylistView.tsx` and `FullscreenOverlay.tsx`.
- On single-click on the surface (`e.target === e.currentTarget`):
  - Clear any pending click timer.
  - Set a timer for 220ms to execute the single-click handler (play/pause toggle in `PlaylistView`, controls visibility toggle in `FullscreenOverlay`).
- On double-click (`onDoubleClick`):
  - Immediately cancel the pending timer (`clearTimeout`).
  - Set `clickTimeoutRef.current = null`.
  - Execute the double-click action (`handleToggleFullscreen` or `onExitFullscreen`).
- In `useEffect` cleanup of both components:
  - Clear `clickTimeoutRef.current` if component unmounts.

## Verification
- Run typecheck, lint, and build (`pnpm exec tsc --noEmit && pnpm lint && pnpm build`).
- Verify manual steps and test flow on port 3005.
