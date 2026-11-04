'use client';

import { useEffect, useRef } from 'react';

export function useSearchShortcut(onOpen: () => void, onToggle?: () => void) {
  const callbacksRef = useRef({ onOpen, onToggle });

  useEffect(() => {
    callbacksRef.current = { onOpen, onToggle };
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditable =
        target?.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName || '');

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const { onOpen: openCb, onToggle: toggleCb } = callbacksRef.current;
        if (toggleCb) {
          toggleCb();
        } else {
          openCb();
        }
        return;
      }

      if (e.key === '/' && !isEditable) {
        e.preventDefault();
        callbacksRef.current.onOpen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
