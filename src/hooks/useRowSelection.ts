import { useCallback, useMemo, useState } from 'react';

/**
 * Generic checkbox-row selection state for tables/lists.
 * Pass current page items so "select all" only toggles what's visible.
 */
export function useRowSelection<T extends { id: string }>(items: T[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const allSelected = items.length > 0 && items.every((i) => selected.has(i.id));
  const someSelected = !allSelected && items.some((i) => selected.has(i.id));

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      const next = new Set(prev);
      const allHere = items.every((i) => next.has(i.id));
      if (allHere) items.forEach((i) => next.delete(i.id));
      else items.forEach((i) => next.add(i.id));
      return next;
    });
  }, [items]);

  const clear = useCallback(() => setSelected(new Set()), []);

  const selectedItems = useMemo(
    () => items.filter((i) => selected.has(i.id)),
    [items, selected]
  );

  const isSelected = useCallback((id: string) => selected.has(id), [selected]);

  return {
    selected,
    selectedIds: Array.from(selected),
    selectedItems,
    selectedCount: selected.size,
    isSelected,
    toggle,
    toggleAll,
    clear,
    allSelected,
    someSelected,
  };
}
