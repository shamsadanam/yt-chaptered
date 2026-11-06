---
title: In-Player Controls Overlay and Balanced Layout Implementation Plan
skip-verification: true
---

# In-Player Controls Overlay & Balanced Layout Implementation Plan

## Objective
1. Move the windowed player controls inside the video player as a floating overlay with auto-hide behavior (matching the fullscreen overlay experience).
2. Distribute action buttons symmetrically around the 5 playback transport controls:
   - **Left Group**: Volume control (button + floating popover) + Playback Speed dropdown
   - **Center Cluster**: 5 transport buttons (`Prev`, `Rewind 10s`, `Play/Pause`, `Forward 10s`, `Next`) strictly centered at the 50% midpoint
   - **Right Group**: Closed Captions (CC) + Mode toggle (Theater mode in windowed / Screen lock in fullscreen) + Fullscreen toggle (`Maximize2` in windowed / `Minimize2` in fullscreen)
3. Remove the duplicate time duration display from the controls area.
4. Streamline the card below the video player in windowed mode to focus purely on active chapter metadata, chapter time range, and the "Mark Complete" toggle.

## Architecture & Seams
- **Unified Component**: Refactor `components/fullscreen/FullscreenBottomBar.tsx` into `components/player/PlayerControlsBar.tsx` (re-exporting from the old path for backward compatibility) supporting both `mode="windowed"` and `mode="fullscreen"`.
- **Windowed Overlay Integration**: In `components/PlaylistView.tsx`, mount the overlay inside the video container (`relative aspect-video`) with mouseover/activity detection and 3.5s auto-hide timer on playback.
- **Streamlined Metadata Card**: Update the `<section>` panel below the player to remove the redundant button row and duplicate time display.

## Verification
- Run TypeScript check: `pnpm exec tsc --noEmit`
- Run Linter: `pnpm lint`
- Run Turbo build: `pnpm build`
- Run Skill verification: `vercel-react-best-practices` and `code-review`
