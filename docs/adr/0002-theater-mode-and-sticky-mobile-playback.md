# Fullscreen Top Header Context, Desktop Theater Mode, and Sticky Mobile Playback

## Context
Following initial fullscreen overlay implementation, several ergonomic and responsiveness challenges emerged:
1. Placing chapter metadata and completion toggle inside the bottom dock inflated its vertical height to ~120px, obstructing video subtitles and content.
2. The windowed desktop layout restricted the player to a 7/8 column split with no wide viewing option short of OS fullscreen.
3. Scrolling through chapters on mobile scrolled the playback controls out of view under the sticky video.
4. Mobile browser viewport snapshots during device lock in portrait fullscreen caused pages to reopen in zoomed-out "desktop mode".

## Decision
1. **Top Header for Chapter Context**: Relocate current chapter title, timestamp, and the completion toggle to the Top Header. The bottom dock becomes an ultra-thin single-tier floating pill (~58px) with a 3-column symmetrical grid (`[1fr_auto_1fr]`), guaranteeing mathematical centering and zero layout shifts.
2. **Desktop Theater Mode**: Introduce Theater Mode (`T` shortcut, `Tv` / `RectangleHorizontal` icon), expanding the player column to full container width (`lg:col-span-12`) and stacking the chapter index underneath.
3. **Sticky Mobile Playback Bar**: Bundle the mobile 16:9 video container and a slim playback bar together at `sticky top-14`, allowing users to control playback while scrolling through long chapter lists.
4. **Viewport Containment Guards**: Add `overflow-x-clip` containment, `interactiveWidget: 'resizes-visual'`, and cancel portrait rotation transforms on `visibilitychange` to permanently prevent the mobile viewport zoom glitch.
