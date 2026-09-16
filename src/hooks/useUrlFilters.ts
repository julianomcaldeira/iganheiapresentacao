import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Sync a piece of state with the URL search params.
 * Values equal to defaultValue are removed from the URL to keep it clean.
 */
export function useUrlState(key: string, defaultValue: string = '') {
  const [params, setParams] = useSearchParams();
  const value = params.get(key) ?? defaultValue;

  const setValue = useCallback(
    (next: string) => {
      setParams(
        (prev) => {
          const np = new URLSearchParams(prev);
          if (!next || next === defaultValue) np.delete(key);
          else np.set(key, next);
          return np;
        },
        { replace: true }
      );
    },
    [key, defaultValue, setParams]
  );

  return [value, setValue] as const;
}

/**
 * Manage many filter values in the URL with a single hook.
 * Shape of `defaults` defines the schema; missing keys fall back to defaults.
 */
export function useUrlFilters<T extends Record<string, string>>(defaults: T) {
  const [params, setParams] = useSearchParams();

  const filters = useMemo(() => {
    const out = { ...defaults } as T;
    for (const k of Object.keys(defaults) as (keyof T)[]) {
      const v = params.get(k as string);
      if (v != null) (out as any)[k] = v;
    }
    return out;
  }, [params, defaults]);

  const setFilter = useCallback(
    <K extends keyof T>(key: K, value: T[K]) => {
      setParams(
        (prev) => {
          const np = new URLSearchParams(prev);
          if (!value || value === defaults[key]) np.delete(key as string);
          else np.set(key as string, String(value));
          return np;
        },
        { replace: true }
      );
    },
    [defaults, setParams]
  );

  const reset = useCallback(() => {
    setParams(
      (prev) => {
        const np = new URLSearchParams(prev);
        for (const k of Object.keys(defaults)) np.delete(k);
        return np;
      },
      { replace: true }
    );
  }, [defaults, setParams]);

  return { filters, setFilter, reset };
}
