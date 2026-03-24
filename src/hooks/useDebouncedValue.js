import { useEffect, useState } from 'react';

/**
 * Purpose: Reusable value debouncer hook.
 * Why: Debouncing inputs reduces unnecessary URL updates and expensive list recalculations.
 */
/**
 * @template T
 * @param {T} value
 * @param {number} [delay=350]
 * @returns {T}
 */
export default function useDebouncedValue(value, delay = 350) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [value, delay]);

  return debouncedValue;
}
