import { useDensity, TableDensity } from '@/contexts/DensityContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Rows3, Check } from 'lucide-react';

const OPTIONS: { value: TableDensity; label: string; description: string }[] = [
  { value: 'compact', label: 'Compacto', description: 'Mais linhas visíveis' },
  { value: 'normal', label: 'Normal', description: 'Padrão equilibrado' },
  { value: 'comfortable', label: 'Confortável', description: 'Mais respiração' },
];

export function DensityToggle() {
  const { density, setDensity } = useDensity();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Densidade da tabela" title="Densidade da tabela">
          <Rows3 className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Densidade da tabela</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {OPTIONS.map((opt) => (
          <DropdownMenuItem
            key={opt.value}
            onClick={() => setDensity(opt.value)}
            className="flex items-start gap-2 py-2"
          >
            <Check
              className={`w-4 h-4 mt-0.5 shrink-0 ${density === opt.value ? 'text-primary opacity-100' : 'opacity-0'}`}
            />
            <div className="flex flex-col">
              <span className="text-sm font-medium">{opt.label}</span>
              <span className="text-xs text-muted-foreground">{opt.description}</span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
