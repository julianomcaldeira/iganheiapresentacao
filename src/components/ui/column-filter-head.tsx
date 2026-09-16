import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Search, X, Filter } from 'lucide-react';
import { TableHead } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { SortState } from '@/components/ui/sortable-table-head';

export interface ColumnFilterValue {
  /** free text contains-search */
  text: string;
  /** selected distinct values; empty = all */
  values: string[];
}

export const EMPTY_COLUMN_FILTER: ColumnFilterValue = { text: '', values: [] };

export function isColumnFilterActive(filter?: ColumnFilterValue): boolean {
  return !!filter && (filter.text.trim() !== '' || filter.values.length > 0);
}

interface ColumnFilterPopoverProps {
  label: string;
  /** all distinct values available for this column (already stringified) */
  options?: string[];
  filter?: ColumnFilterValue;
  onFilterChange: (value: ColumnFilterValue) => void;
  className?: string;
}

/** Standalone Excel-style filter button (lupa) + popover, usable inside any header. */
export function ColumnFilterPopover({
  label,
  options = [],
  filter = EMPTY_COLUMN_FILTER,
  onFilterChange,
  className,
}: ColumnFilterPopoverProps) {
  const [open, setOpen] = useState(false);
  const [optionSearch, setOptionSearch] = useState('');

  const isFiltered = isColumnFilterActive(filter);

  const visibleOptions = useMemo(() => {
    const q = optionSearch.trim().toLowerCase();
    const list = q ? options.filter(o => o.toLowerCase().includes(q)) : options;
    return list.slice(0, 300);
  }, [options, optionSearch]);

  const toggleValue = (value: string) => {
    const next = filter.values.includes(value)
      ? filter.values.filter(v => v !== value)
      : [...filter.values, value];
    onFilterChange({ ...filter, values: next });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={`Filtrar ${label}`}
          onClick={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
          className={cn(
            'shrink-0 rounded-md p-1 transition-colors hover:bg-muted',
            isFiltered ? 'text-primary bg-primary/10' : 'text-muted-foreground/60',
            className
          )}
        >
          {isFiltered ? <Filter className="h-3.5 w-3.5" /> : <Search className="h-3.5 w-3.5" />}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-3 space-y-3" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-foreground">{label}</p>
          {isFiltered && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[11px]"
              onClick={() => onFilterChange({ text: '', values: [] })}
            >
              <X className="h-3 w-3 mr-1" />
              Limpar
            </Button>
          )}
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Contém..."
            className="h-8 pl-8 text-xs"
            value={filter.text}
            onChange={e => onFilterChange({ ...filter, text: e.target.value })}
          />
        </div>

        {options.length > 0 && (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar valores"
                className="h-8 pl-8 text-xs"
                value={optionSearch}
                onChange={e => setOptionSearch(e.target.value)}
              />
            </div>
            <ScrollArea className="h-44 pr-2">
              <div className="space-y-1.5">
                {visibleOptions.length === 0 && (
                  <p className="text-[11px] text-muted-foreground py-2">Nenhum valor</p>
                )}
                {visibleOptions.map(opt => (
                  <label
                    key={opt}
                    className="flex items-center gap-2 text-xs cursor-pointer rounded px-1 py-0.5 hover:bg-muted/60"
                  >
                    <Checkbox
                      checked={filter.values.includes(opt)}
                      onCheckedChange={() => toggleValue(opt)}
                    />
                    <span className="truncate" title={opt}>{opt || '(vazio)'}</span>
                  </label>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

interface ColumnFilterHeadProps {
  columnId: string;
  label: string;
  sort: SortState;
  onSort: (columnId: string) => void;
  /** all distinct values available for this column (already stringified) */
  options?: string[];
  filter?: ColumnFilterValue;
  onFilterChange: (columnId: string, value: ColumnFilterValue) => void;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
  filterable?: boolean;
  className?: string;
}

export function ColumnFilterHead({
  columnId,
  label,
  sort,
  onSort,
  options = [],
  filter = EMPTY_COLUMN_FILTER,
  onFilterChange,
  align = 'left',
  sortable = true,
  filterable = true,
  className,
}: ColumnFilterHeadProps) {
  const isSorted = sort.column === columnId && sort.direction !== null;
  const SortIcon = !isSorted ? ArrowUpDown : sort.direction === 'asc' ? ArrowUp : ArrowDown;

  if (!filterable) {
    return (
      <TableHead
        className={cn(
          'font-semibold',
          align === 'right' && 'text-right',
          align === 'center' && 'text-center',
          className
        )}
      >
        {label}
      </TableHead>
    );
  }

  return (
    <TableHead className={cn('font-semibold p-0', className)}>
      <div
        className={cn(
          'flex items-center h-12 pl-4 pr-1 gap-1',
          align === 'right' && 'justify-end',
          align === 'center' && 'justify-center'
        )}
      >
        <button
          type="button"
          onClick={() => sortable && onSort(columnId)}
          disabled={!sortable}
          className={cn(
            'flex items-center gap-1.5 select-none transition-colors',
            sortable && 'hover:text-primary'
          )}
        >
          <span>{label}</span>
          {sortable && (
            <SortIcon
              className={cn(
                'h-3.5 w-3.5 shrink-0',
                isSorted ? 'text-primary' : 'text-muted-foreground/50'
              )}
            />
          )}
        </button>

        <ColumnFilterPopover
          label={label}
          options={options}
          filter={filter}
          onFilterChange={value => onFilterChange(columnId, value)}
        />
      </div>
    </TableHead>
  );
}
