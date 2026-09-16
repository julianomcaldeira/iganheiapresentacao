import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { IAConfigBadge } from '../IAConfigBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  Plus, Clock, CheckCircle, Loader2, FileText, Brain, 
  Trash2, Copy, Scale, Shield
} from 'lucide-react';
import { format } from 'date-fns';

interface ImpugnacaoContrarrazaoTabProps {
  licitacaoId: string;
  clienteId: string;
  licitacaoData?: {
    numero: string;
    objeto: string;
    orgao: string;
  };
}

interface Peca {
  id: string;
  tipo: string;
  titulo: string;
  descricao_solicitacao: string;
  conteudo_gerado: string | null;
  status: string;
  created_at: string;
}

export function ImpugnacaoContrarrazaoTab({ licitacaoId, clienteId, licitacaoData }: ImpugnacaoContrarrazaoTabProps) {
  const [pecas, setPecas] = useState<Peca[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedPeca, setSelectedPeca] = useState<Peca | null>(null);
  const [form, setForm] = useState({ tipo: 'impugnacao', titulo: '', descricao: '' });

  const tipoLabels: Record<string, string> = {
    impugnacao: 'Impugnação ao Edital',
    contrarrazoes: 'Contrarrazões',
  };

  useEffect(() => {
    fetchPecas();
  }, [licitacaoId]);

  const fetchPecas = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('licitacao_pecas')
      .select('*')
      .eq('licitacao_id', licitacaoId)
      .in('tipo', ['impugnacao', 'contrarrazoes', 'pecas_impugnacao', 'pecas_contrarrazoes'])
      .order('created_at', { ascending: false });
    setPecas(data || []);
    setLoading(false);
  };

  const handleGenerate = async () => {
    if (!form.titulo || !form.descricao) {
      toast.error('Preencha todos os campos');
      return;
    }
    setGenerating(true);
    try {
      const { data: newPeca, error: insertError } = await supabase
        .from('licitacao_pecas')
        .insert({
          licitacao_id: licitacaoId,
          cliente_id: clienteId,
          tipo: form.tipo,
          titulo: form.titulo,
          descricao_solicitacao: form.descricao,
          status: 'processando',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const { error: fnError } = await supabase.functions.invoke('generate-peca', {
        body: {
          pecaId: newPeca.id,
          licitacaoId,
          clienteId,
          tipo: `pecas_${form.tipo}`,
          titulo: form.titulo,
          descricao: form.descricao,
        },
      });

      if (fnError) throw fnError;

      toast.success('Peça gerada com sucesso!');
      setShowForm(false);
      setForm({ tipo: 'impugnacao', titulo: '', descricao: '' });
      fetchPecas();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao gerar peça');
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('licitacao_pecas').delete().eq('id', id);
    setPecas(pecas.filter(p => p.id !== id));
    if (selectedPeca?.id === id) setSelectedPeca(null);
    toast.success('Peça removida');
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Copiado!');
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Scale className="h-5 w-5 text-primary" />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">Impugnações & Contrarrazões</h3>
              <IAConfigBadge clienteId={clienteId} tipo="pecas_impugnacao" />
            </div>
            <p className="text-xs text-muted-foreground">
              {pecas.length} peças • Use para contestar o edital ou responder a recursos
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Peça
        </Button>
      </div>

      {/* Orientação sobre prazos */}
      <div className="p-3 rounded-lg bg-muted/50 border flex items-start gap-2">
        <Shield className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <div className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Prazos legais (Lei 14.133/2021):</span>{' '}
          Impugnação ao edital deve ser apresentada até 3 dias úteis antes da abertura (art. 164). 
          Contrarrazões ao recurso devem ser apresentadas em até 3 dias úteis após a intimação (art. 165, §1º).
        </div>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={v => setForm({ ...form, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="impugnacao">Impugnação ao Edital</SelectItem>
                    <SelectItem value="contrarrazoes">Contrarrazões</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Título</Label>
                <Input value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} placeholder="Ex: Impugnação ao item 5.1 do Edital" />
              </div>
            </div>
            <div>
              <Label>Fundamentação / Descrição detalhada</Label>
              <Textarea 
                value={form.descricao} 
                onChange={e => setForm({ ...form, descricao: e.target.value })} 
                placeholder="Descreva os pontos de impugnação ou os argumentos das contrarrazões..."
                rows={5}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button size="sm" onClick={handleGenerate} disabled={generating}>
                {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Brain className="h-4 w-4 mr-2" />}
                {generating ? 'Gerando...' : 'Gerar com IA'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-2">
          {pecas.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <Scale className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">Nenhuma peça criada</p>
              </CardContent>
            </Card>
          ) : pecas.map(peca => (
            <Card 
              key={peca.id} 
              className={`cursor-pointer transition-all hover:shadow-sm ${selectedPeca?.id === peca.id ? 'ring-1 ring-primary' : ''}`}
              onClick={() => setSelectedPeca(peca)}
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{peca.titulo}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {tipoLabels[peca.tipo] || peca.tipo}
                    </p>
                  </div>
                  <Badge className={`text-[9px] shrink-0 ${
                    peca.status === 'concluido' ? 'bg-emerald-500/20 text-emerald-600' :
                    peca.status === 'processando' ? 'bg-blue-500/20 text-blue-600' :
                    'bg-red-500/20 text-red-600'
                  }`}>
                    {peca.status === 'concluido' ? 'Concluído' : peca.status === 'processando' ? 'Processando' : 'Erro'}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(new Date(peca.created_at), 'dd/MM/yyyy HH:mm')}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="lg:col-span-2">
          {selectedPeca ? (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-semibold">{selectedPeca.titulo}</h4>
                    <p className="text-xs text-muted-foreground">{tipoLabels[selectedPeca.tipo] || selectedPeca.tipo}</p>
                  </div>
                  <div className="flex gap-1">
                    {selectedPeca.conteudo_gerado && (
                      <Button size="sm" variant="ghost" onClick={() => handleCopy(selectedPeca.conteudo_gerado!)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(selectedPeca.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {selectedPeca.conteudo_gerado ? (
                  <div className="prose prose-sm max-w-none text-sm whitespace-pre-wrap bg-muted/30 rounded-lg p-4 max-h-[500px] overflow-y-auto">
                    {selectedPeca.conteudo_gerado}
                  </div>
                ) : selectedPeca.status === 'processando' ? (
                  <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Gerando conteúdo...
                  </div>
                ) : (
                  <p className="text-sm text-destructive p-4">Erro na geração</p>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">Selecione uma peça para visualizar</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
