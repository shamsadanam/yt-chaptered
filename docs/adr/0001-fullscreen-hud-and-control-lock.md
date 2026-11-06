# Minimalist Fullscreen HUD and VLC-Style Control Lock

## Context
In fullscreen mode, the player overlay had become visually cluttered with over 11 controls, chapter metadata, and completion status packed into a single footer row. This caused touch target collisions and visual overcrowding, especially on mobile devices. Duplicate triggers also existed for opening the Chapter Drawer.

## Decision
1. **Floating Glass Dock with Two-Tier Layout**: Replace the full-bleed footer with an elevated floating dock (`rounded-2xl`, `bg-stone-950/85`, `backdrop-blur-md`). The upper tier hosts the progress scrubber, inline chapter metadata, and completion status pill; the lower tier hosts centered primary transport controls and grouped utility controls.
2. **Top-Left Chapter Trigger**: Deduplicate chapter drawer access by making the top-left header badge the canonical interactive trigger (`[📑 Chapters X/Y]`), removing the redundant duplicate list button from the bottom bar.
3. **Progressive Disclosure for Volume**: The volume slider is collapsed by default on desktop, expanding horizontally on hover or keyboard focus. Touch/mobile viewports show only a compact tap-to-mute icon to avoid mobile slider conflicts and save horizontal space.
4. **VLC-Style Control Lock**: Introduce a Control Lock button in the utility cluster. When locked, all HUD controls and background touch/click listeners are hidden and suppressed. Tapping anywhere on the screen displays a floating unlock pill (`[🔒 Locked • Tap to unlock]`) for 2.5 seconds; tapping that pill unlocks the HUD.
5. **Direct Tap-to-Toggle HUD**: Tapping on empty video canvas toggles HUD visibility immediately rather than requiring users to wait for the 3.5-second auto-hide timeout.
