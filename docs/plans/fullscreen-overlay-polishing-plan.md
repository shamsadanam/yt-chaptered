---
title: "Plan 1: Fullscreen Overlay Polishing & Stabilization"
status: proposed
skip-verification: true
---

# Plan 1: Fullscreen Overlay Polishing & Stabilization

## Context & Motivation
The fullscreen HUD layout has made significant progress, but three refinements are needed:
1. **Mathematical Centering & Zero Shift**: In Tier 2, the 5 playback controls lean slightly left under `justify-between`, and changing playback speed causes horizontal layout shifts.
2. **Vertical Height Reduction**: The bottom dock currently has an upper tier for chapter title, timestamp, and Mark Complete button, making the dock ~120px tall. Moving chapter context and completion into the Top Header cuts the dock's height to ~58px.
3. **Unlock Button Repositioning**: The VLC-style unlock pill is currently dead-center on screen, obstructing the video; it should float in the bottom-center area above the dock.

---

## Architecture & Layout Changes

### 1. Top Header Reorganization
Move Chapter Context and Completion Toggle from the bottom dock to [`FullscreenOverlay.tsx`](file:///Users/anam/Projects/yt-chaptered/components/FullscreenOverlay.tsx):
- **Left**: `[📑 Chapters 1/14]` interactive drawer toggle pill.
- **Center**: Current chapter info: `Ch {index}/{total} • {currentTime} / {duration}` and truncated active chapter title.
- **Right**: Sleek `[✓ Complete]` / `[Mark Complete]` status toggle pill.

```
┌────────────────────────────────────────────────────────────────────────┐
│ [📑 Chapters 1/14]   Ch 1 • 04:12 / 45:12 | "Intro..."     [✓ Done]    │
└────────────────────────────────────────────────────────────────────────┘
```

### 2. Single-Tier Ultra-Thin Floating Dock
Transform [`FullscreenBottomBar.tsx`](file:///Users/anam/Projects/yt-chaptered/components/fullscreen/FullscreenBottomBar.tsx) into a single-tier dock:
- **Top Edge**: Full-width progress scrubber with chapter split notches and hover timestamp preview.
- **Control Row**: Symmetrical 3-column CSS Grid (`grid grid-cols-[1fr_auto_1fr] items-center w-full`):
  - **Column 1 (Left)**: Volume icon button with hover/focus-expanding slider (`justify-self-start`).
  - **Column 2 (Center)**: 5 primary transport controls strictly centered relative to the dock (`justify-self-center`):
    `[⏮ Prev Chapter] [⏪ -10s] [ ▶ Circular Play/Pause ] [⏩ +10s] [⏭ Next Chapter]`
  - **Column 3 (Right)**: Utility controls (`justify-self-end`):
    - Speed menu with fixed tabular width (`min-w-16 font-tnum text-center`) to eliminate layout shift on speed change.
    - Captions toggle (`CC`).
    - Control Lock toggle (`Lock`).
    - Exit Fullscreen button (`Minimize2`).

### 3. Unlock Pill Placement
Relocate the unlock trigger in [`FullscreenOverlay.tsx`](file:///Users/anam/Projects/yt-chaptered/components/FullscreenOverlay.tsx):
- Position: `bottom-12 sm:bottom-16 left-1/2 -translate-x-1/2` (bottom-center area).
- Clean fade animation and 2.5s auto-hide on tap.

---

## Files to Modify
- [`components/FullscreenOverlay.tsx`](file:///Users/anam/Projects/yt-chaptered/components/FullscreenOverlay.tsx)
- [`components/fullscreen/FullscreenBottomBar.tsx`](file:///Users/anam/Projects/yt-chaptered/components/fullscreen/FullscreenBottomBar.tsx)

## Verification
- Enter fullscreen on desktop and mobile.
- Verify playback controls are mathematically centered in the dock.
- Change playback speed between 0.75x and 2x: verify zero horizontal shifting.
- Verify Chapter title and Completion button are situated in the Top Header.
- Engage Control Lock, tap screen: verify unlock pill appears at bottom-center.
