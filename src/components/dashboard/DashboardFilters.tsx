import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { DashboardFilters as Filters } from '@/hooks/useDashboardData';

interface DashboardFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  clientes: { id: string; nome: string }[];
}

export function DashboardFilters({ filters, onFiltersChange, clientes }: DashboardFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleClearFilters = () => {
    onFiltersChange({
      startDate: null,
      endDate: null,
      clienteId: null,
    });
  };

  const hasActiveFilters = filters.startDate || filters.endDate || filters.clienteId;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Date Range Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'justify-start text-left font-normal',
              !filters.startDate && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {filters.startDate ? (
              filters.endDate ? (
                <>
                  {format(filters.startDate, 'dd/MM/yy', { locale: ptBR })} -{' '}
                  {format(filters.endDate, 'dd/MM/yy', { locale: ptBR })}
                </>
              ) : (
                format(filters.startDate, 'dd/MM/yyyy', { locale: ptBR })
              )
            ) : (
              'Período'
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={filters.startDate || new Date()}
            selected={{
              from: filters.startDate || undefined,
              to: filters.endDate || undefined,
            }}
            onSelect={(range) => {
              onFiltersChange({
                ...filters,
                startDate: range?.from || null,
                endDate: range?.to || null,
              });
            }}
            numberOfMonths={2}
            locale={ptBR}
          />
        </PopoverContent>
      </Popover>

      {/* Client Filter */}
      <Select
        value={filters.clienteId || 'all'}
        onValueChange={(value) => {
          onFiltersChange({
            ...filters,
            clienteId: value === 'all' ? null : value,
          });
        }}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Todos os clientes" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os clientes</SelectItem>
          {clientes.map((cliente) => (
            <SelectItem key={cliente.id} value={cliente.id}>
              {cliente.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearFilters}
          className="text-muted-foreground"
        >
          <X className="mr-1 h-4 w-4" />
          Limpar filtros
        </Button>
      )}
    </div>
  );
}
