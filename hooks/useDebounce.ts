import { useState, useEffect, useRef } from 'react';

interface ViewTransition {
  ready: Promise<void>;
  finished: Promise<void>;
  updateCallbackDone: Promise<void>;
  skipTransition: () => void;
}

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const activeTransitionRef = useRef<ViewTransition | null>(null);

  useEffect(() => {
    const update = () => {
      // Use View Transitions API when available for smooth hardware-accelerated state transitions
      if (typeof document !== 'undefined' && 'startViewTransition' in document) {
        // Gracefully cancel any ongoing transition before starting a new one
        if (activeTransitionRef.current) {
          try {
            activeTransitionRef.current.skipTransition();
          } catch {
            // Ignore if already completed/aborted
          }
        }

        try {
          const transition = (document as unknown as {
            startViewTransition: (cb: () => void) => ViewTransition;
          }).startViewTransition(() => {
            setDebouncedValue(value);
          });

          activeTransitionRef.current = transition;

          // Catch expected AbortError when superseded by a newer transition or tab visibility change
          transition.ready?.catch(() => {});
          transition.updateCallbackDone?.catch(() => {});
          transition.finished
            ?.catch(() => {})
            .finally(() => {
              if (activeTransitionRef.current === transition) {
                activeTransitionRef.current = null;
              }
            });
        } catch {
          setDebouncedValue(value);
        }
      } else {
        setDebouncedValue(value);
      }
    };

    // If string value is cleared, update immediately to remove search filter without delay
    if (typeof value === 'string' && value.trim() === '') {
      update();
      return;
    }

    const timer = setTimeout(update, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
