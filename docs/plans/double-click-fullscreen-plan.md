---
title: Double-Click Fullscreen Toggle Implementation Plan
skip-verification: true
---

# Double-Click Fullscreen Toggle Implementation Plan

## Objective
Enable double-click on the video canvas overlay to toggle fullscreen bidirectionally:
- In windowed mode (`components/PlaylistView.tsx`): Double-clicking the player canvas enters fullscreen.
- In fullscreen mode (`components/FullscreenOverlay.tsx`): Double-clicking the player canvas exits fullscreen.
- Single-click continues to toggle play/pause immediately without latency (standard native YouTube UX).

## Changes
1. `components/PlaylistView.tsx`:
   - Add `onDoubleClick={(e) => { if (e.target === e.currentTarget) { handleToggleFullscreen(); } }}` to the video surface div.
2. `components/FullscreenOverlay.tsx`:
   - Add `onDoubleClick={(e) => { if (e.target === e.currentTarget && !isLocked) { onExitFullscreen(); } }}` to the video surface div.

## Verification
- Test in Playwright on port 3005 (double-click to enter fullscreen, double-click to exit fullscreen, single-click to play/pause).
- Run typecheck, lint, and build (`pnpm exec tsc --noEmit && pnpm lint && pnpm build`).
- Commit changes.
