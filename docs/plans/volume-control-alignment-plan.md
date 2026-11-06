---
title: Volume Control Alignment & Margin Containment Plan
skip-verification: true
---

# Volume Control Alignment & Margin Containment Plan

## Objective
Prevent the floating volume popover from extending past the left edge of the video player and being cut off by `overflow-hidden`. Left-align the popover above the volume button (`left-0`), expanding safely to the right inside the video canvas. Coordinate mutual exclusion between the volume popover and playback speed dropdown so they never overlap.

## Changes
1. In `components/player/PlayerControlsBar.tsx`:
   - Replace `left-0 sm:left-1/2 sm:-translate-x-1/2` with `left-0` on the volume popover container.
   - When toggling volume open, close the speed menu if open.
   - When toggling speed menu open, close the volume popover if open.

## Verification
- Run typecheck, lint, and build (`pnpm exec tsc --noEmit && pnpm lint && pnpm build`).
- Verify manual test: Click volume button and check that the popover opens to the right of the button's left edge and is completely visible with zero clipping.
