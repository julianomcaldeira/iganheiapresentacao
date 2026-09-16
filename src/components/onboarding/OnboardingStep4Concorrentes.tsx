import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Users, ArrowRight, ArrowLeft, Plus, X, Building2 } from 'lucide-react';

interface Props {
  clienteId: string;
  onComplete: () => void;
  onBack: () => void;
}

export function OnboardingStep4Concorrentes({ clienteId, onComplete, onBack }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [concorrentes, setConcorrentes] = useState<string[]>([]);
  const [novoConcorrente, setNovoConcorrente] = useState('');

  useEffect(() => {
    fetchConcorrentes();
  }, [clienteId]);

  const fetchConcorrentes = async () => {
    const { data } = await supabase
      .from('clientes')
      .select('concorrentes')
      .eq('id', clienteId)
      .single();

    if (data) {
      setConcorrentes(data.concorrentes || []);
    }
    setLoading(false);
  };

  const addConcorrente = () => {
    if (!novoConcorrente.trim()) return;
    if (concorrentes.includes(novoConcorrente.trim())) {
      toast.error('Este concorrente já existe');
      return;
    }
    setConcorrentes(prev => [...prev, novoConcorrente.trim()]);
    setNovoConcorrente('');
  };

  const removeConcorrente = (concorrente: string) => {
    setConcorrentes(prev => prev.filter(c => c !== concorrente));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('clientes')
        .update({ concorrentes })
        .eq('id', clienteId);

      if (error) throw error;

      toast.success('Concorrentes salvos!');
      onComplete();
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
          <div className="p-2 bg-orange-500/20 rounded-lg">
            <Users className="h-6 w-6 text-orange-500" />
          </div>
          <div>
            <CardTitle>Concorrentes</CardTitle>
            <CardDescription>
              Mapeie os principais concorrentes do cliente. Isso permitirá análises 
              competitivas e acompanhamento de participações em licitações.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 bg-orange-500/5 rounded-lg border border-orange-500/20">
          <p className="text-sm text-muted-foreground mb-4">
            <strong>Dica:</strong> Adicione o nome das empresas concorrentes como aparecem 
            em licitações. O sistema usará esses nomes para identificar participações.
          </p>
          
          <div className="flex gap-2">
            <Input
              value={novoConcorrente}
              onChange={(e) => setNovoConcorrente(e.target.value)}
              placeholder="Nome do concorrente..."
              onKeyDown={(e) => e.key === 'Enter' && addConcorrente()}
            />
            <Button onClick={addConcorrente}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {concorrentes.map((concorrente, index) => (
            <div 
              key={index}
              className="flex items-center justify-between p-4 rounded-lg border bg-muted/30"
            >
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">{concorrente}</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => removeConcorrente(concorrente)}
              >
                <X className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}

          {concorrentes.length === 0 && (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum concorrente cadastrado</p>
              <p className="text-sm">Este passo é opcional, mas recomendado</p>
            </div>
          )}
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button onClick={onBack} variant="ghost">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <Button onClick={handleSave} disabled={saving} size="lg">
            {saving ? 'Salvando...' : (
              <>
                {concorrentes.length === 0 ? 'Pular' : 'Salvar e Continuar'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}