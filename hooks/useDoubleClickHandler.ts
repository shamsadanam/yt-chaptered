'use client';

import { useRef, useEffect, useCallback } from 'react';

// 220ms threshold distinguishes single-click from double-click without introducing noticeable latency
export const DOUBLE_CLICK_DELAY_MS = 220;

interface UseDoubleClickHandlerOptions {
  onSingleClick: () => void;
  onDoubleClick: () => void;
  delayMs?: number;
}

export function useDoubleClickHandler({
  onSingleClick,
  onDoubleClick,
  delayMs = DOUBLE_CLICK_DELAY_MS,
}: UseDoubleClickHandlerOptions) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const singleClickRef = useRef(onSingleClick);
  const doubleClickRef = useRef(onDoubleClick);

  useEffect(() => {
    singleClickRef.current = onSingleClick;
    doubleClickRef.current = onDoubleClick;
  }, [onSingleClick, onDoubleClick]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (e.target !== e.currentTarget) return;

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        singleClickRef.current();
      }, delayMs);
    },
    [delayMs]
  );

  const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (e.target !== e.currentTarget) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    doubleClickRef.current();
  }, []);

  return {
    handleClick,
    handleDoubleClick,
  };
}
