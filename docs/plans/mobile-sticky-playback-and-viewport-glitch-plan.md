---
title: "Plan 3: Mobile Sticky Playback & Viewport Glitch Resolution"
status: proposed
skip-verification: true
---

# Plan 3: Mobile Sticky Playback & Viewport Glitch Resolution

## Context & Motivation
1. **Mobile Playback Disconnect**: In mobile windowed view, only the 16:9 video iframe is sticky (`sticky top-14`). As users scroll down through long chapter lists, the playback controls scroll off-screen, forcing users to scroll all the way back to the top just to pause, seek, or check playback time.
2. **Mobile Viewport "Desktop Mode" Zoom Glitch**: On mobile devices, returning to the website from a screen lock or PWA minimize sometimes causes the layout to render in a zoomed-out "desktop mode". The root cause is the portrait fullscreen CSS transform (`width: 100vh, height: 100vw, rotate(90deg)`), which creates an 800–900px wide element; on device lock/restore, the browser snapshots this wide element and expands the layout viewport to 900px.

---

## Architecture & Layout Changes

### 1. Sticky Mobile Playback Header
In [`PlaylistView.tsx`](../../components/PlaylistView.tsx):
- Bundle the 16:9 video container and a slim, compact playback bar into the sticky header (`sticky top-14 z-20` on `< sm` viewports).
- **Sticky Bar Components**:
  - Full-width micro progress scrubber.
  - Quick transport actions: Rewind 10s, circular Play/Pause, Forward 10s, current chapter timestamp.
- Allows seamless scrolling through chapters 1–50+ without ever losing touch access to video playback.

### 2. Viewport Anchor & Glitch Prevention
- **Root Containment**: Add `overflow-x-clip` and `max-w-full` on `html`, `body`, and page containers to strictly forbid horizontal expansion.
- **Background State Cleanup**: Add a `visibilitychange` listener in [`PlaylistView.tsx`](../../components/PlaylistView.tsx). When `document.visibilityState === 'hidden'` (device lock, app switcher, PWA minimize), immediately reset fullscreen orientation transforms to ensure the browser never snapshots an expanded dimension.
- **Viewport Anchor**: In [`app/layout.tsx`](../../app/layout.tsx), configure viewport with `interactiveWidget: 'resizes-visual'` to ensure stable mobile viewport scaling across lock cycles.

---

## Files to Modify
- [`components/PlaylistView.tsx`](../../components/PlaylistView.tsx)
- [`app/layout.tsx`](../../app/layout.tsx)
- [`app/globals.css`](../../app/globals.css)

## Verification
- On mobile viewport: scroll down 20 chapters; verify video and compact playback bar stay cleanly pinned at top.
- Test play, pause, seek from the sticky bar while scrolled down.
- Enter fullscreen on mobile portrait, lock the device/switch apps, unlock/re-open: verify the page returns cleanly to standard 100% mobile viewport scale without zooming out to desktop mode.
