---
title: Code Review Remediation for Click Handling and Accessibility
skip-verification: true
---

# Code Review Remediation Plan

## Objective
Remediate the findings from the Standards and Spec reviews across commits `10e3b36...HEAD`:
1. **Accessibility (`PlayerControlsBar.tsx`)**:
   - Add `inert={!isVolumeOpen || undefined}` and `tabIndex={isVolumeOpen ? 0 : -1}` to the volume popup container so hidden controls are pruned from assistive technology trees in React 19.
2. **Duplication & Clean Code (`useDoubleClickHandler.ts`)**:
   - Extract the shared click vs. double-click debounce infrastructure into a reusable hook `hooks/useDoubleClickHandler.ts`.
   - Export named constant `DOUBLE_CLICK_DELAY_MS = 220` to eliminate magic number literals.
   - Refactor `PlaylistView.tsx` and `FullscreenOverlay.tsx` to use `useDoubleClickHandler`.
3. **Spec Fix (`FullscreenOverlay.tsx`)**:
   - When `isLocked` is true, double-clicking should trigger the "Screen is locked" pill notification so users receive immediate visual feedback.

## Verification
- Run typecheck, lint, and build (`pnpm exec tsc --noEmit && pnpm lint && pnpm build`).
- Verify volume inert behavior and lock pill feedback.
