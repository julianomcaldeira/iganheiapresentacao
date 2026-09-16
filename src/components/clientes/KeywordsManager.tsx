import { useState } from 'react';
import { Plus, X, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface KeywordsManagerProps {
  palavrasPositivas: string[];
  palavrasNegativas: string[];
  onPalavrasPositivasChange: (palavras: string[]) => void;
  onPalavrasNegativasChange: (palavras: string[]) => void;
}

export function KeywordsManager({
  palavrasPositivas,
  palavrasNegativas,
  onPalavrasPositivasChange,
  onPalavrasNegativasChange,
}: KeywordsManagerProps) {
  const [newPositiva, setNewPositiva] = useState('');
  const [newNegativa, setNewNegativa] = useState('');

  const handleAddPositiva = () => {
    const palavra = newPositiva.trim().toLowerCase();
    if (palavra && !palavrasPositivas.includes(palavra)) {
      onPalavrasPositivasChange([...palavrasPositivas, palavra]);
      setNewPositiva('');
    }
  };

  const handleAddNegativa = () => {
    const palavra = newNegativa.trim().toLowerCase();
    if (palavra && !palavrasNegativas.includes(palavra)) {
      onPalavrasNegativasChange([...palavrasNegativas, palavra]);
      setNewNegativa('');
    }
  };

  const handleRemovePositiva = (palavra: string) => {
    onPalavrasPositivasChange(palavrasPositivas.filter((p) => p !== palavra));
  };

  const handleRemoveNegativa = (palavra: string) => {
    onPalavrasNegativasChange(palavrasNegativas.filter((p) => p !== palavra));
  };

  const handleKeyDownPositiva = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddPositiva();
    }
  };

  const handleKeyDownNegativa = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddNegativa();
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Palavras Positivas */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2 text-success">
          <ThumbsUp className="w-4 h-4" />
          Palavras Positivas
        </Label>
        <p className="text-xs text-muted-foreground">
          Palavras-chave que indicam oportunidades relevantes para este cliente
        </p>
        <div className="flex gap-2">
          <Input
            value={newPositiva}
            onChange={(e) => setNewPositiva(e.target.value)}
            onKeyDown={handleKeyDownPositiva}
            placeholder="Digite uma palavra..."
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleAddPositiva}
            disabled={!newPositiva.trim()}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 min-h-[60px] p-3 rounded-lg bg-success/5 border border-success/20">
          {palavrasPositivas.length === 0 ? (
            <span className="text-sm text-muted-foreground">Nenhuma palavra positiva</span>
          ) : (
            palavrasPositivas.map((palavra) => (
              <Badge
                key={palavra}
                variant="outline"
                className="bg-success/10 text-success border-success/30 pr-1"
              >
                {palavra}
                <button
                  type="button"
                  onClick={() => handleRemovePositiva(palavra)}
                  className="ml-1 p-0.5 rounded-full hover:bg-success/20"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))
          )}
        </div>
      </div>

      {/* Palavras Negativas */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2 text-destructive">
          <ThumbsDown className="w-4 h-4" />
          Palavras Negativas
        </Label>
        <p className="text-xs text-muted-foreground">
          Palavras-chave que indicam oportunidades não relevantes para este cliente
        </p>
        <div className="flex gap-2">
          <Input
            value={newNegativa}
            onChange={(e) => setNewNegativa(e.target.value)}
            onKeyDown={handleKeyDownNegativa}
            placeholder="Digite uma palavra..."
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleAddNegativa}
            disabled={!newNegativa.trim()}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 min-h-[60px] p-3 rounded-lg bg-destructive/5 border border-destructive/20">
          {palavrasNegativas.length === 0 ? (
            <span className="text-sm text-muted-foreground">Nenhuma palavra negativa</span>
          ) : (
            palavrasNegativas.map((palavra) => (
              <Badge
                key={palavra}
                variant="outline"
                className="bg-destructive/10 text-destructive border-destructive/30 pr-1"
              >
                {palavra}
                <button
                  type="button"
                  onClick={() => handleRemoveNegativa(palavra)}
                  className="ml-1 p-0.5 rounded-full hover:bg-destructive/20"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
