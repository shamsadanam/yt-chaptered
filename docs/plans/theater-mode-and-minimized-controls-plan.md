---
title: "Plan 2: Theater Mode & Minimized Controls Unification"
status: proposed
skip-verification: true
---

# Plan 2: Theater Mode & Minimized Controls Unification

## Context & Motivation
1. **Design System Consistency**: The player controls in the windowed (minimized) view in [`PlaylistView.tsx`](file:///Users/anam/Projects/yt-chaptered/components/PlaylistView.tsx) still use legacy rectangular "Play/Pause" text buttons and a static 140px volume slider, contrasting with the new fullscreen design system.
2. **Theater Mode for Desktop/Tablet**: Non-mobile users currently have only two display options: a constrained 7/8 column split with the sidebar pinned on the right, or true OS fullscreen. A "Theater Mode" expands the player to 12 columns across the container with the chapter list neatly stacked below.

---

## Architecture & Layout Changes

### 1. Minimized Player Controls Unification
Update the control bar section in [`PlaylistView.tsx`](file:///Users/anam/Projects/yt-chaptered/components/PlaylistView.tsx#L870-L1022) to inherit the fullscreen design language:
- **Play/Pause Button**: Modern circular primary hero button (`w-11 h-11 rounded-full bg-primary hover:bg-primary-hover text-white shadow-md active:scale-98`).
- **Volume Control**: Tap-to-mute icon with hover/focus-expanding horizontal slider on desktop (`group-hover/volume:max-w-28 group-focus-within/volume:max-w-28 transition-all`).
- **Button Geometry**: Standardize all icon buttons to canonical `rounded-xl` and 44px touch targets (`min-h-11 min-w-11`).

### 2. Theater Mode Implementation
- **State**: `isTheaterMode: boolean` (toggled via button or `T` keyboard shortcut, active only on `lg+` viewports).
- **Control Button**: Place a Theater Mode button (`RectangleHorizontal` or `Tv` icon, tooltip `Theater Mode (T)`) beside the Fullscreen button in the control bar.
- **Layout Adaptation**:
  - **Normal Mode**:
    - Left column: `lg:col-span-7 xl:col-span-8` (video player + controls).
    - Right column: `lg:col-span-5 xl:col-span-4` (chapter sidebar).
  - **Theater Mode**:
    - Player container: `lg:col-span-12` (full-width wide cinematic container).
    - Chapter sidebar: Dynamically wraps below the wide player section as a clean, full-width course index.

---

## Files to Modify
- [`components/PlaylistView.tsx`](file:///Users/anam/Projects/yt-chaptered/components/PlaylistView.tsx)
- [`DESIGN.md`](file:///Users/anam/Projects/yt-chaptered/DESIGN.md) (documenting Theater Mode token alignment)

## Verification
- Load course on desktop (`>= 1024px`).
- Observe unified player controls matching the fullscreen aesthetic.
- Press `T` or click the Theater Mode button: verify player expands to full container width (`col-span-12`).
- Verify chapter list smoothly flows beneath the expanded player.
- Test responsive resize down to mobile: verify Theater Mode button is hidden or gracefully bypassed on small screens.
