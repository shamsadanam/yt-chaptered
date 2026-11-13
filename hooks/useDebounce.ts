import { useState, useEffect, startTransition } from 'react';

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const update = () => {
      // Use React transition so <ViewTransition> boundaries animate smoothly
      startTransition(() => {
        setDebouncedValue(value);
      });
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
