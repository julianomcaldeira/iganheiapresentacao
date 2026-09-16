import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, Edit, Play, Loader2, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';
import { STATUS_GERAL_LIST } from '@/lib/licitacaoStatus';
import { cn } from '@/lib/utils';

interface Cliente { id: string; nome: string; }

interface Regra {
  id: string;
  cliente_id: string;
  nome: string;
  descricao: string | null;
  status_destino: string;
  ordem: number;
  ativo: boolean;
  condicao_sem_analise_ia: boolean | null;
  condicao_dias_sem_analise: number | null;
  condicao_etapa_workflow_id: string | null;
  condicao_etapa_finalizada: boolean | null;
  condicao_dias_apos_encerramento: number | null;
  condicao_valor_minimo: number | null;
  condicao_valor_maximo: number | null;
}

const emptyForm = {
  nome: '',
  descricao: '',
  status_destino: 'pendente_analise',
  ativo: true,
  condicao_sem_analise_ia: false,
  condicao_dias_sem_analise: '',
  condicao_etapa_workflow_id: '',
  condicao_etapa_finalizada: false,
  condicao_dias_apos_encerramento: '',
  condicao_valor_minimo: '',
  condicao_valor_maximo: '',
};

export function LicitacaoStatusRegrasManager() {
  const qc = useQueryClient();
  const [selectedCliente, setSelectedCliente] = useState<string>('');
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Regra | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [applying, setApplying] = useState(false);

  const { data: clientes } = useQuery({
    queryKey: ['clientes-status-regras'],
    queryFn: async () => {
      const { data } = await supabase.from('clientes').select('id, nome').eq('ativo', true).order('nome');
      return (data || []) as Cliente[];
    },
  });

  useEffect(() => {
    if (clientes && clientes.length && !selectedCliente) setSelectedCliente(clientes[0].id);
  }, [clientes, selectedCliente]);

  const { data: regras, isLoading } = useQuery({
    queryKey: ['status-regras', selectedCliente],
    queryFn: async () => {
      if (!selectedCliente) return [];
      const { data, error } = await supabase
        .from('licitacao_status_regras')
        .select('*')
        .eq('cliente_id', selectedCliente)
        .order('ordem');
      if (error) throw error;
      return (data || []) as Regra[];
    },
    enabled: !!selectedCliente,
  });

  const { data: workflowEtapas } = useQuery({
    queryKey: ['workflow-etapas-cliente', selectedCliente],
    queryFn: async () => {
      if (!selectedCliente) return [];
      const { data: ws } = await supabase
        .from('licitacao_workflows')
        .select('id')
        .eq('cliente_id', selectedCliente);
      const ids = (ws || []).map((w: any) => w.id);
      if (!ids.length) return [];
      const { data } = await supabase
        .from('workflow_etapas')
        .select('id, nome, workflow_id')
        .in('workflow_id', ids)
        .order('ordem');
      return data || [];
    },
    enabled: !!selectedCliente,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        cliente_id: selectedCliente,
        nome: form.nome,
        descricao: form.descricao || null,
        status_destino: form.status_destino,
        ativo: form.ativo,
        condicao_sem_analise_ia: form.condicao_sem_analise_ia,
        condicao_dias_sem_analise: form.condicao_dias_sem_analise ? parseInt(form.condicao_dias_sem_analise) : null,
        condicao_etapa_workflow_id: form.condicao_etapa_workflow_id || null,
        condicao_etapa_finalizada: form.condicao_etapa_finalizada,
        condicao_dias_apos_encerramento: form.condicao_dias_apos_encerramento ? parseInt(form.condicao_dias_apos_encerramento) : null,
        condicao_valor_minimo: form.condicao_valor_minimo ? parseFloat(form.condicao_valor_minimo) : null,
        condicao_valor_maximo: form.condicao_valor_maximo ? parseFloat(form.condicao_valor_maximo) : null,
      };
      if (editing) {
        const { error } = await supabase.from('licitacao_status_regras').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        payload.ordem = regras?.length || 0;
        const { error } = await supabase.from('licitacao_status_regras').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? 'Regra atualizada' : 'Regra criada');
      qc.invalidateQueries({ queryKey: ['status-regras'] });
      setShowDialog(false);
      setEditing(null);
      setForm(emptyForm);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('licitacao_status_regras').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Regra removida');
      qc.invalidateQueries({ queryKey: ['status-regras'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowDialog(true);
  };

  const openEdit = (r: Regra) => {
    setEditing(r);
    setForm({
      nome: r.nome,
      descricao: r.descricao || '',
      status_destino: r.status_destino,
      ativo: r.ativo,
      condicao_sem_analise_ia: !!r.condicao_sem_analise_ia,
      condicao_dias_sem_analise: r.condicao_dias_sem_analise?.toString() || '',
      condicao_etapa_workflow_id: r.condicao_etapa_workflow_id || '',
      condicao_etapa_finalizada: !!r.condicao_etapa_finalizada,
      condicao_dias_apos_encerramento: r.condicao_dias_apos_encerramento?.toString() || '',
      condicao_valor_minimo: r.condicao_valor_minimo?.toString() || '',
      condicao_valor_maximo: r.condicao_valor_maximo?.toString() || '',
    });
    setShowDialog(true);
  };

  const applyRules = async () => {
    setApplying(true);
    try {
      const { data, error } = await supabase.functions.invoke('apply-status-rules', {
        body: { cliente_id: selectedCliente },
      });
      if (error) throw error;
      toast.success(`${data?.atualizadas || 0} licitação(ões) atualizada(s)`);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao aplicar regras');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Select value={selectedCliente} onValueChange={setSelectedCliente}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Selecionar cliente" />
            </SelectTrigger>
            <SelectContent>
              {clientes?.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <Badge variant="outline" className="text-xs">
            Regras avaliadas em ordem (1ª que casa vence)
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={applyRules} disabled={applying || !selectedCliente}>
            {applying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
            Aplicar agora
          </Button>
          <Button onClick={openNew} disabled={!selectedCliente}>
            <Plus className="h-4 w-4 mr-2" /> Nova Regra
          </Button>
        </div>
      </div>

      {/* Status disponíveis (referência visual) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Status Geral disponíveis</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {STATUS_GERAL_LIST.map(s => (
            <Badge key={s.value} className={cn('font-medium', s.badgeClass)}>{s.label}</Badge>
          ))}
        </CardContent>
      </Card>

      {/* Lista de regras */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : !regras?.length ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-muted-foreground">
            Nenhuma regra configurada. Crie a primeira regra para que o status seja atribuído automaticamente.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {regras.map((r, idx) => {
            const cfg = STATUS_GERAL_LIST.find(s => s.value === r.status_destino);
            return (
              <Card key={r.id} className={!r.ativo ? 'opacity-60' : ''}>
                <CardContent className="p-4 flex items-start gap-4">
                  <div className="flex flex-col items-center gap-1 pt-1">
                    <span className="text-xs font-bold text-muted-foreground">#{idx + 1}</span>
                    {idx < regras.length - 1 && <ArrowDown className="h-3 w-3 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{r.nome}</span>
                      {cfg && <Badge className={cfg.badgeClass}>→ {cfg.label}</Badge>}
                      {!r.ativo && <Badge variant="outline">Inativa</Badge>}
                    </div>
                    {r.descricao && <p className="text-sm text-muted-foreground mt-1">{r.descricao}</p>}
                    <div className="text-xs text-muted-foreground mt-2 flex flex-wrap gap-x-3 gap-y-1">
                      {r.condicao_sem_analise_ia && <span>• sem análise IA</span>}
                      {r.condicao_dias_sem_analise != null && <span>• ≥ {r.condicao_dias_sem_analise}d sem análise</span>}
                      {r.condicao_etapa_workflow_id && <span>• etapa específica</span>}
                      {r.condicao_dias_apos_encerramento != null && <span>• ≥ {r.condicao_dias_apos_encerramento}d após encerramento</span>}
                      {r.condicao_valor_minimo != null && <span>• valor ≥ R$ {r.condicao_valor_minimo}</span>}
                      {r.condicao_valor_maximo != null && <span>• valor ≤ R$ {r.condicao_valor_maximo}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Edit className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteMutation.mutate(r.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Regra' : 'Nova Regra de Status'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: Marcar como Pendente quando não houver análise IA" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea rows={2} value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
            </div>
            <div>
              <Label>Status destino *</Label>
              <Select value={form.status_destino} onValueChange={v => setForm(f => ({ ...f, status_destino: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_GERAL_LIST.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-semibold">Condições (todas devem ser atendidas)</p>

              <div className="flex items-center justify-between">
                <Label className="text-sm font-normal">Sem análise IA concluída</Label>
                <Switch checked={form.condicao_sem_analise_ia}
                  onCheckedChange={v => setForm(f => ({ ...f, condicao_sem_analise_ia: v }))} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-normal">Dias sem análise (≥)</Label>
                  <Input type="number" value={form.condicao_dias_sem_analise}
                    onChange={e => setForm(f => ({ ...f, condicao_dias_sem_analise: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-sm font-normal">Dias após encerramento (≥)</Label>
                  <Input type="number" value={form.condicao_dias_apos_encerramento}
                    onChange={e => setForm(f => ({ ...f, condicao_dias_apos_encerramento: e.target.value }))} />
                </div>
              </div>

              <div>
                <Label className="text-sm font-normal">Etapa atual do workflow</Label>
                <Select value={form.condicao_etapa_workflow_id || 'none'}
                  onValueChange={v => setForm(f => ({ ...f, condicao_etapa_workflow_id: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Qualquer" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Qualquer etapa</SelectItem>
                    {(workflowEtapas as any[])?.map((e: any) => (
                      <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-normal">Valor mín. (R$)</Label>
                  <Input type="number" value={form.condicao_valor_minimo}
                    onChange={e => setForm(f => ({ ...f, condicao_valor_minimo: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-sm font-normal">Valor máx. (R$)</Label>
                  <Input type="number" value={form.condicao_valor_maximo}
                    onChange={e => setForm(f => ({ ...f, condicao_valor_maximo: e.target.value }))} />
                </div>
              </div>

              <div className="flex items-center justify-between border-t pt-3">
                <Label className="text-sm font-normal">Regra ativa</Label>
                <Switch checked={form.ativo}
                  onCheckedChange={v => setForm(f => ({ ...f, ativo: v }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.nome || saveMutation.isPending}>
              {saveMutation.isPending ? 'Salvando…' : editing ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
