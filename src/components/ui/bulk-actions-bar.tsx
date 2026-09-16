import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BulkActionsBarProps {
  count: number;
  onClear: () => void;
  /** Action buttons (e.g. <Button>...</Button>). */
  children: ReactNode;
  itemLabel?: { singular: string; plural: string };
  className?: string;
}

/**
 * Floating bar that appears when one or more rows are selected.
 * Place it inside a relatively positioned container or at the page level.
 */
export function BulkActionsBar({
  count,
  onClear,
  children,
  itemLabel = { singular: 'item', plural: 'itens' },
  className,
}: BulkActionsBarProps) {
  if (count === 0) return null;
  return (
    <div
      className={cn(
        'sticky bottom-4 z-30 mx-auto w-fit max-w-[95%] flex items-center gap-3 px-4 py-2.5',
        'rounded-full border border-border bg-card/95 backdrop-blur-md shadow-xl shadow-primary/10',
        'animate-in fade-in slide-in-from-bottom-4 duration-200',
        className
      )}
    >
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7 rounded-full"
        onClick={onClear}
        aria-label="Limpar seleção"
      >
        <X className="w-4 h-4" />
      </Button>
      <span className="text-sm font-medium">
        <span className="text-primary font-bold">{count}</span>{' '}
        {count === 1 ? itemLabel.singular : itemLabel.plural} selecionado{count > 1 ? 's' : ''}
      </span>
      <div className="h-5 w-px bg-border" />
      <div className="flex items-center gap-1.5">{children}</div>
    </div>
  );
}
