'use client';

import { useEffect } from 'react';

let lockCount = 0;
let originalBodyOverflow = '';
let originalHtmlOverflow = '';
let originalBodyPaddingRight = '';

export function lockScroll() {
  if (typeof window === 'undefined') return;

  if (lockCount === 0) {
    originalBodyOverflow = document.body.style.overflow;
    originalHtmlOverflow = document.documentElement.style.overflow;
    originalBodyPaddingRight = document.body.style.paddingRight;

    // Measure the vertical scrollbar width before locking
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    if (scrollbarWidth > 0) {
      const currentPadding = parseInt(window.getComputedStyle(document.body).paddingRight || '0', 10);
      document.body.style.paddingRight = `${currentPadding + scrollbarWidth}px`;
      document.documentElement.style.setProperty('--scrollbar-compensation', `${scrollbarWidth}px`);
    } else {
      document.documentElement.style.setProperty('--scrollbar-compensation', '0px');
    }
  }

  lockCount++;
}

export function unlockScroll() {
  if (typeof window === 'undefined') return;

  lockCount = Math.max(0, lockCount - 1);

  if (lockCount === 0) {
    document.body.style.overflow = originalBodyOverflow;
    document.documentElement.style.overflow = originalHtmlOverflow;
    document.body.style.paddingRight = originalBodyPaddingRight;
    document.documentElement.style.removeProperty('--scrollbar-compensation');
  }
}

export function useScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) return;

    lockScroll();

    return () => {
      unlockScroll();
    };
  }, [isLocked]);
}
