import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type TableDensity = 'compact' | 'normal' | 'comfortable';

interface DensityContextValue {
  density: TableDensity;
  setDensity: (d: TableDensity) => void;
  /** Tailwind class for cell padding mapped from density. Use on TableCell/TableHead. */
  rowPaddingClass: string;
  /** Tailwind class for row text size. */
  textSizeClass: string;
}

const DensityContext = createContext<DensityContextValue | null>(null);

const STORAGE_KEY = 'app-table-density';

const PADDING: Record<TableDensity, string> = {
  compact: 'py-1.5',
  normal: 'py-3',
  comfortable: 'py-4',
};
const TEXT: Record<TableDensity, string> = {
  compact: 'text-[13px]',
  normal: 'text-sm',
  comfortable: 'text-sm',
};

export function DensityProvider({ children }: { children: ReactNode }) {
  const [density, setDensityState] = useState<TableDensity>(() => {
    if (typeof window === 'undefined') return 'normal';
    const saved = localStorage.getItem(STORAGE_KEY) as TableDensity | null;
    return saved && ['compact', 'normal', 'comfortable'].includes(saved) ? saved : 'normal';
  });

  useEffect(() => {
    document.documentElement.dataset.tableDensity = density;
    localStorage.setItem(STORAGE_KEY, density);
  }, [density]);

  const setDensity = (d: TableDensity) => setDensityState(d);

  return (
    <DensityContext.Provider
      value={{
        density,
        setDensity,
        rowPaddingClass: PADDING[density],
        textSizeClass: TEXT[density],
      }}
    >
      {children}
    </DensityContext.Provider>
  );
}

export function useDensity() {
  const ctx = useContext(DensityContext);
  if (!ctx) throw new Error('useDensity must be used inside DensityProvider');
  return ctx;
}
