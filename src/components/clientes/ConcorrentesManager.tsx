import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Building2, Users } from 'lucide-react';

interface ConcorrentesManagerProps {
  concorrentes: string[];
  onConcorrentesChange: (concorrentes: string[]) => void;
}

export function ConcorrentesManager({
  concorrentes,
  onConcorrentesChange,
}: ConcorrentesManagerProps) {
  const [newConcorrente, setNewConcorrente] = useState('');

  const handleAddConcorrente = () => {
    if (newConcorrente.trim() && !concorrentes.includes(newConcorrente.trim())) {
      onConcorrentesChange([...concorrentes, newConcorrente.trim()]);
      setNewConcorrente('');
    }
  };

  const handleRemoveConcorrente = (concorrente: string) => {
    onConcorrentesChange(concorrentes.filter(c => c !== concorrente));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddConcorrente();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-primary" />
        <h3 className="text-sm font-medium text-foreground">Concorrentes</h3>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Adicione os nomes das empresas concorrentes deste cliente. Estas informações podem ser úteis para análise de mercado e estratégias de licitação.
      </p>

      <div className="flex gap-2">
        <Input
          value={newConcorrente}
          onChange={(e) => setNewConcorrente(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Nome da empresa concorrente"
          className="flex-1"
        />
        <Button 
          type="button" 
          onClick={handleAddConcorrente}
          disabled={!newConcorrente.trim()}
          size="sm"
        >
          <Plus className="w-4 h-4 mr-1" />
          Adicionar
        </Button>
      </div>

      {concorrentes.length > 0 ? (
        <div className="mt-4 space-y-2">
          <p className="text-sm text-muted-foreground">
            {concorrentes.length} concorrente{concorrentes.length > 1 ? 's' : ''} cadastrado{concorrentes.length > 1 ? 's' : ''}
          </p>
          <div className="flex flex-wrap gap-2">
            {concorrentes.map((concorrente, index) => (
              <Badge
                key={index}
                variant="outline"
                className="bg-orange-500/10 text-orange-600 border-orange-500/30 px-3 py-1.5 flex items-center gap-2"
              >
                <Building2 className="w-3 h-3" />
                {concorrente}
                <button
                  type="button"
                  onClick={() => handleRemoveConcorrente(concorrente)}
                  className="ml-1 hover:text-destructive transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-4 p-6 rounded-lg border border-dashed border-border bg-muted/30 text-center">
          <Users className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Nenhum concorrente cadastrado
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Adicione os concorrentes usando o campo acima
          </p>
        </div>
      )}
    </div>
  );
}
