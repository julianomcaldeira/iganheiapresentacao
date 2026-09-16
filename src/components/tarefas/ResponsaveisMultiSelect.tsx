import { useState } from 'react';
import { Check, ChevronsUpDown, X, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

interface Profile {
  id: string;
  nome: string;
}

interface Props {
  profiles: Profile[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
}

export function ResponsaveisMultiSelect({ profiles, selectedIds, onChange, placeholder = 'Selecionar responsáveis' }: Props) {
  const [open, setOpen] = useState(false);

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((s) => s !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const remove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedIds.filter((s) => s !== id));
  };

  const selected = profiles.filter((p) => selectedIds.includes(p.id));

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            <span className="flex items-center gap-2 truncate">
              <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
              {selected.length > 0
                ? `${selected.length} ${selected.length === 1 ? 'responsável' : 'responsáveis'}`
                : <span className="text-muted-foreground">{placeholder}</span>}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-popover" align="start">
          <Command>
            <CommandInput placeholder="Buscar usuário..." />
            <CommandList>
              <CommandEmpty>Nenhum usuário encontrado.</CommandEmpty>
              <CommandGroup>
                {profiles.map((p) => {
                  const isSelected = selectedIds.includes(p.id);
                  return (
                    <CommandItem key={p.id} value={p.nome} onSelect={() => toggle(p.id)}>
                      <Check className={cn('mr-2 h-4 w-4', isSelected ? 'opacity-100' : 'opacity-0')} />
                      {p.nome}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((p) => (
            <Badge key={p.id} variant="secondary" className="gap-1 pr-1">
              {p.nome}
              <button
                type="button"
                onClick={(e) => remove(p.id, e)}
                className="rounded-sm hover:bg-muted-foreground/20 p-0.5"
                aria-label={`Remover ${p.nome}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
