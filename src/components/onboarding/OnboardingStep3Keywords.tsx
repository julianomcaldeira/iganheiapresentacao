import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Target, ArrowRight, ArrowLeft, Plus, X, ThumbsUp, ThumbsDown } from 'lucide-react';

interface Props {
  clienteId: string;
  onComplete: (data: Record<string, any>) => void;
  onBack: () => void;
}

export function OnboardingStep3Keywords({ clienteId, onComplete, onBack }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [palavrasPositivas, setPalavrasPositivas] = useState<string[]>([]);
  const [palavrasNegativas, setPalavrasNegativas] = useState<string[]>([]);
  const [novaPalavraPositiva, setNovaPalavraPositiva] = useState('');
  const [novaPalavraNegativa, setNovaPalavraNegativa] = useState('');

  useEffect(() => {
    fetchKeywords();
  }, [clienteId]);

  const fetchKeywords = async () => {
    const { data } = await supabase
      .from('clientes')
      .select('palavras_positivas, palavras_negativas')
      .eq('id', clienteId)
      .single();

    if (data) {
      setPalavrasPositivas(data.palavras_positivas || []);
      setPalavrasNegativas(data.palavras_negativas || []);
    }
    setLoading(false);
  };

  const addPalavraPositiva = () => {
    if (!novaPalavraPositiva.trim()) return;
    if (palavrasPositivas.includes(novaPalavraPositiva.trim().toLowerCase())) {
      toast.error('Esta palavra já existe');
      return;
    }
    setPalavrasPositivas(prev => [...prev, novaPalavraPositiva.trim().toLowerCase()]);
    setNovaPalavraPositiva('');
  };

  const addPalavraNegativa = () => {
    if (!novaPalavraNegativa.trim()) return;
    if (palavrasNegativas.includes(novaPalavraNegativa.trim().toLowerCase())) {
      toast.error('Esta palavra já existe');
      return;
    }
    setPalavrasNegativas(prev => [...prev, novaPalavraNegativa.trim().toLowerCase()]);
    setNovaPalavraNegativa('');
  };

  const removePalavraPositiva = (palavra: string) => {
    setPalavrasPositivas(prev => prev.filter(p => p !== palavra));
  };

  const removePalavraNegativa = (palavra: string) => {
    setPalavrasNegativas(prev => prev.filter(p => p !== palavra));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('clientes')
        .update({
          palavras_positivas: palavrasPositivas,
          palavras_negativas: palavrasNegativas
        })
        .eq('id', clienteId);

      if (error) throw error;

      toast.success('Palavras-chave salvas!');
      onComplete({ palavras_positivas: palavrasPositivas, palavras_negativas: palavrasNegativas });
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-500/20 rounded-lg">
            <Target className="h-6 w-6 text-green-500" />
          </div>
          <div>
            <CardTitle>Palavras-Chave</CardTitle>
            <CardDescription>
              Configure as palavras que filtram as licitações. Palavras positivas aumentam 
              a relevância, negativas excluem licitações.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Positive Keywords */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ThumbsUp className="h-5 w-5 text-green-500" />
              <Label className="text-base font-medium">Palavras Positivas</Label>
            </div>
            <p className="text-sm text-muted-foreground">
              Licitações com estas palavras terão maior relevância
            </p>
            
            <div className="flex gap-2">
              <Input
                value={novaPalavraPositiva}
                onChange={(e) => setNovaPalavraPositiva(e.target.value)}
                placeholder="Ex: tecnologia, software..."
                onKeyDown={(e) => e.key === 'Enter' && addPalavraPositiva()}
              />
              <Button onClick={addPalavraPositiva} variant="secondary">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 min-h-[100px] p-3 bg-green-500/5 rounded-lg border border-green-500/20">
              {palavrasPositivas.map((palavra) => (
                <Badge 
                  key={palavra} 
                  variant="secondary"
                  className="bg-green-500/20 text-green-700 hover:bg-green-500/30"
                >
                  {palavra}
                  <button onClick={() => removePalavraPositiva(palavra)} className="ml-1">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {palavrasPositivas.length === 0 && (
                <span className="text-sm text-muted-foreground">
                  Nenhuma palavra positiva adicionada
                </span>
              )}
            </div>
          </div>

          {/* Negative Keywords */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ThumbsDown className="h-5 w-5 text-red-500" />
              <Label className="text-base font-medium">Palavras Negativas</Label>
            </div>
            <p className="text-sm text-muted-foreground">
              Licitações com estas palavras serão excluídas
            </p>
            
            <div className="flex gap-2">
              <Input
                value={novaPalavraNegativa}
                onChange={(e) => setNovaPalavraNegativa(e.target.value)}
                placeholder="Ex: construção, obras..."
                onKeyDown={(e) => e.key === 'Enter' && addPalavraNegativa()}
              />
              <Button onClick={addPalavraNegativa} variant="secondary">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 min-h-[100px] p-3 bg-red-500/5 rounded-lg border border-red-500/20">
              {palavrasNegativas.map((palavra) => (
                <Badge 
                  key={palavra} 
                  variant="secondary"
                  className="bg-red-500/20 text-red-700 hover:bg-red-500/30"
                >
                  {palavra}
                  <button onClick={() => removePalavraNegativa(palavra)} className="ml-1">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {palavrasNegativas.length === 0 && (
                <span className="text-sm text-muted-foreground">
                  Nenhuma palavra negativa adicionada
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button onClick={onBack} variant="ghost">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <Button onClick={handleSave} disabled={saving} size="lg">
            {saving ? 'Salvando...' : (
              <>
                Salvar e Continuar
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}