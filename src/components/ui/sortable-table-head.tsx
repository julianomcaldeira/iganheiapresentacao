import { TableHead } from '@/components/ui/table';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SortDirection = 'asc' | 'desc' | null;

export interface SortState {
  column: string | null;
  direction: SortDirection;
}

interface SortableTableHeadProps {
  columnId: string;
  label: string;
  sort: SortState;
  onSort: (columnId: string) => void;
  className?: string;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
}

export function SortableTableHead({
  columnId,
  label,
  sort,
  onSort,
  className,
  align = 'left',
  sortable = true,
}: SortableTableHeadProps) {
  const isActive = sort.column === columnId && sort.direction !== null;
  const Icon = !isActive ? ArrowUpDown : sort.direction === 'asc' ? ArrowUp : ArrowDown;

  if (!sortable) {
    return (
      <TableHead className={cn('font-semibold', className, align === 'right' && 'text-right', align === 'center' && 'text-center')}>
        {label}
      </TableHead>
    );
  }

  return (
    <TableHead className={cn('font-semibold p-0', className)}>
      <button
        type="button"
        onClick={() => onSort(columnId)}
        className={cn(
          'flex items-center gap-1.5 w-full h-12 px-4 hover:bg-muted/40 transition-colors select-none',
          align === 'right' && 'justify-end',
          align === 'center' && 'justify-center',
        )}
      >
        <span>{label}</span>
        <Icon
          className={cn(
            'h-3.5 w-3.5 shrink-0 transition-colors',
            isActive ? 'text-primary' : 'text-muted-foreground/50'
          )}
        />
      </button>
    </TableHead>
  );
}

/** Generic sort comparator for primitive values. */
export function compareValues(a: unknown, b: unknown, direction: SortDirection): number {
  if (direction === null) return 0;
  const dir = direction === 'asc' ? 1 : -1;
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return (a - b) * dir;
  // Try date
  const da = typeof a === 'string' ? Date.parse(a) : NaN;
  const db = typeof b === 'string' ? Date.parse(b) : NaN;
  if (!isNaN(da) && !isNaN(db)) return (da - db) * dir;
  return String(a).localeCompare(String(b), 'pt-BR', { sensitivity: 'base', numeric: true }) * dir;
}

/** Cycle a column through asc → desc → none. */
export function nextSortState(current: SortState, columnId: string): SortState {
  if (current.column !== columnId) return { column: columnId, direction: 'asc' };
  if (current.direction === 'asc') return { column: columnId, direction: 'desc' };
  if (current.direction === 'desc') return { column: null, direction: null };
  return { column: columnId, direction: 'asc' };
}
