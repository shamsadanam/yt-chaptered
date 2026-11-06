---
title: Volume Slider Smooth Transition Implementation Plan
skip-verification: true
---

# Volume Slider Smooth Transition Implementation Plan

## Objective
Implement a smooth opening and closing transition for the floating volume slider in `PlayerControlsBar.tsx`. The float should bloom smoothly from the speaker button (`origin-bottom-left`) with a 200ms ease-out enter transition (fade in, glide up 6px, scale from 95% to 100%) and a 150ms ease-in exit transition (fade out, glide down 6px, scale to 95%).

## Changes
1. In `components/player/PlayerControlsBar.tsx`:
   - Keep the volume float container mounted in the DOM to enable bidirectional CSS transitions.
   - Apply dynamic transition classes:
     - Open: `opacity-100 scale-100 translate-y-0 pointer-events-auto duration-200 ease-out`
     - Closed: `opacity-0 scale-95 translate-y-1.5 pointer-events-none duration-150 ease-in`
   - Set `origin-bottom-left` and `motion-reduce:transition-none`.
   - Apply `aria-hidden={!isVolumeOpen}` and `tabIndex={isVolumeOpen ? 0 : -1}` on the container and inner controls so hidden controls cannot be focused or read by assistive technology when closed.

## Verification
- Test in Playwright:
  - Verify smooth transition when opening and closing.
  - Verify controls are interactive when open and inert when closed.
- Run typecheck, lint, and build (`pnpm exec tsc --noEmit && pnpm lint && pnpm build`).
- Commit changes.
