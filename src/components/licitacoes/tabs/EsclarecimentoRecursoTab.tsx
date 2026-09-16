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
  Plus, Send, MessageSquare, Clock, CheckCircle, Loader2, 
  FileText, Brain, Trash2, Download, Copy
} from 'lucide-react';
import { format } from 'date-fns';

interface EsclarecimentoRecursoTabProps {
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

export function EsclarecimentoRecursoTab({ licitacaoId, clienteId, licitacaoData }: EsclarecimentoRecursoTabProps) {
  const [pecas, setPecas] = useState<Peca[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedPeca, setSelectedPeca] = useState<Peca | null>(null);
  const [form, setForm] = useState({ tipo: 'esclarecimento', titulo: '', descricao: '' });

  const tipoLabels: Record<string, string> = {
    esclarecimento: 'Pedido de Esclarecimento',
    recurso: 'Recurso Administrativo',
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
      .in('tipo', ['esclarecimento', 'recurso', 'pecas_esclarecimento', 'pecas_recurso'])
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
      setForm({ tipo: 'esclarecimento', titulo: '', descricao: '' });
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
          <MessageSquare className="h-5 w-5 text-primary" />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">Esclarecimentos & Recursos</h3>
              <IAConfigBadge clienteId={clienteId} tipo="pecas_esclarecimento" />
            </div>
            <p className="text-xs text-muted-foreground">{pecas.length} peças geradas</p>
          </div>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Peça
        </Button>
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
                    <SelectItem value="esclarecimento">Pedido de Esclarecimento</SelectItem>
                    <SelectItem value="recurso">Recurso Administrativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Título</Label>
                <Input value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} placeholder="Ex: Esclarecimento sobre item 3.2" />
              </div>
            </div>
            <div>
              <Label>Descrição detalhada</Label>
              <Textarea 
                value={form.descricao} 
                onChange={e => setForm({ ...form, descricao: e.target.value })} 
                placeholder="Descreva o esclarecimento ou recurso desejado com o máximo de detalhes..."
                rows={4}
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
        {/* Lista */}
        <div className="space-y-2">
          {pecas.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
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

        {/* Preview */}
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
