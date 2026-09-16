import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Plus, Wallet, Loader2, Edit, Trash2, DollarSign, TrendingUp, Paperclip } from 'lucide-react';
import { format } from 'date-fns';
import { AnexosManager } from '@/components/contratos/AnexosManager';

interface EmpenhosTabProps {
  licitacaoId: string;
  clienteId: string;
}

interface Empenho {
  id: string;
  numero: string;
  orgao_emissor: string;
  tipo: string;
  valor_empenhado: number;
  valor_utilizado: number;
  saldo_disponivel: number | null;
  data_emissao: string;
  data_vencimento: string | null;
  status: string;
  natureza_despesa: string | null;
  fonte_recurso: string | null;
  programa_trabalho: string | null;
  observacoes: string | null;
  created_at: string;
}

export function EmpenhosTab({ licitacaoId, clienteId }: EmpenhosTabProps) {
  const [empenhos, setEmpenhos] = useState<Empenho[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [anexosOpen, setAnexosOpen] = useState<Empenho | null>(null);
  const [form, setForm] = useState({
    numero: '',
    orgao_emissor: '',
    tipo: 'ordinario',
    valor_empenhado: '',
    valor_utilizado: '',
    data_emissao: '',
    data_vencimento: '',
    natureza_despesa: '',
    fonte_recurso: '',
    programa_trabalho: '',
    observacoes: '',
    status: 'ativo',
  });

  useEffect(() => {
    fetchEmpenhos();
  }, [licitacaoId]);

  const fetchEmpenhos = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('empenhos')
      .select('*')
      .eq('licitacao_id', licitacaoId)
      .neq('tipo', 'contrato')
      .order('created_at', { ascending: false });
    setEmpenhos((data as Empenho[]) || []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.numero || !form.orgao_emissor) {
      toast.error('Preencha número e órgão emissor');
      return;
    }
    try {
      const valorEmpenhado = parseFloat(form.valor_empenhado) || 0;
      const valorUtilizado = parseFloat(form.valor_utilizado) || 0;
      const payload = {
        numero: form.numero,
        orgao_emissor: form.orgao_emissor,
        tipo: form.tipo,
        valor_empenhado: valorEmpenhado,
        valor_utilizado: valorUtilizado,
        saldo_disponivel: valorEmpenhado - valorUtilizado,
        data_emissao: form.data_emissao || new Date().toISOString(),
        data_vencimento: form.data_vencimento || null,
        natureza_despesa: form.natureza_despesa || null,
        fonte_recurso: form.fonte_recurso || null,
        programa_trabalho: form.programa_trabalho || null,
        observacoes: form.observacoes || null,
        status: form.status,
        licitacao_id: licitacaoId,
        cliente_id: clienteId,
      };

      if (editingId) {
        await supabase.from('empenhos').update(payload).eq('id', editingId);
        toast.success('Empenho atualizado!');
      } else {
        await supabase.from('empenhos').insert(payload);
        toast.success('Empenho registrado!');
      }

      setShowForm(false);
      setEditingId(null);
      resetForm();
      fetchEmpenhos();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar');
    }
  };

  const handleEdit = (e: Empenho) => {
    setForm({
      numero: e.numero,
      orgao_emissor: e.orgao_emissor,
      tipo: e.tipo,
      valor_empenhado: e.valor_empenhado.toString(),
      valor_utilizado: e.valor_utilizado.toString(),
      data_emissao: e.data_emissao?.split('T')[0] || '',
      data_vencimento: e.data_vencimento?.split('T')[0] || '',
      natureza_despesa: e.natureza_despesa || '',
      fonte_recurso: e.fonte_recurso || '',
      programa_trabalho: e.programa_trabalho || '',
      observacoes: e.observacoes || '',
      status: e.status,
    });
    setEditingId(e.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('empenhos').delete().eq('id', id);
    setEmpenhos(empenhos.filter(e => e.id !== id));
    toast.success('Empenho removido');
  };

  const resetForm = () => {
    setForm({ numero: '', orgao_emissor: '', tipo: 'ordinario', valor_empenhado: '', valor_utilizado: '', data_emissao: '', data_vencimento: '', natureza_despesa: '', fonte_recurso: '', programa_trabalho: '', observacoes: '', status: 'ativo' });
  };

  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const totalEmpenhado = empenhos.reduce((s, e) => s + e.valor_empenhado, 0);
  const totalUtilizado = empenhos.reduce((s, e) => s + e.valor_utilizado, 0);
  const totalSaldo = totalEmpenhado - totalUtilizado;
  const percentUtilizado = totalEmpenhado > 0 ? Math.round((totalUtilizado / totalEmpenhado) * 100) : 0;

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { label: string; className: string }> = {
      ativo: { label: 'Ativo', className: 'bg-emerald-500/20 text-emerald-600' },
      parcialmente_utilizado: { label: 'Parcial', className: 'bg-amber-500/20 text-amber-600' },
      utilizado: { label: 'Utilizado', className: 'bg-blue-500/20 text-blue-600' },
      cancelado: { label: 'Cancelado', className: 'bg-red-500/20 text-red-600' },
      anulado: { label: 'Anulado', className: 'bg-muted text-muted-foreground' },
    };
    const config = configs[status] || configs.ativo;
    return <Badge className={`text-[10px] ${config.className}`}>{config.label}</Badge>;
  };

  const getTipoBadge = (tipo: string) => {
    const labels: Record<string, string> = { ordinario: 'Ordinário', estimativo: 'Estimativo', global: 'Global' };
    return <Badge variant="outline" className="text-[10px]">{labels[tipo] || tipo}</Badge>;
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Wallet className="h-5 w-5 text-primary" />
          <div>
            <h3 className="text-sm font-semibold">Empenhos</h3>
            <p className="text-xs text-muted-foreground">{empenhos.length} empenhos registrados</p>
          </div>
        </div>
        <Button size="sm" onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Empenho
        </Button>
      </div>

      {/* Resumo financeiro */}
      {empenhos.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total Empenhado</p>
              <p className="text-lg font-bold text-foreground">{formatCurrency(totalEmpenhado)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total Utilizado</p>
              <p className="text-lg font-bold text-foreground">{formatCurrency(totalUtilizado)}</p>
              <Progress value={percentUtilizado} className="h-1.5 mt-2" />
              <p className="text-[10px] text-muted-foreground mt-1">{percentUtilizado}% utilizado</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Saldo Disponível</p>
              <p className={`text-lg font-bold ${totalSaldo > 0 ? 'text-emerald-600' : 'text-destructive'}`}>{formatCurrency(totalSaldo)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {empenhos.length > 0 ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Órgão Emissor</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Empenhado</TableHead>
                <TableHead className="text-right">Utilizado</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {empenhos.map(e => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium text-sm">{e.numero}</TableCell>
                  <TableCell className="text-sm">{e.orgao_emissor}</TableCell>
                  <TableCell>{getTipoBadge(e.tipo)}</TableCell>
                  <TableCell className="text-right text-sm">{formatCurrency(e.valor_empenhado)}</TableCell>
                  <TableCell className="text-right text-sm">{formatCurrency(e.valor_utilizado)}</TableCell>
                  <TableCell className="text-right text-sm font-medium">
                    {formatCurrency(e.valor_empenhado - e.valor_utilizado)}
                  </TableCell>
                  <TableCell>{getStatusBadge(e.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setAnexosOpen(e)} title="Anexos">
                        <Paperclip className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleEdit(e)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDelete(e.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Wallet className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm font-medium">Nenhum empenho registrado</p>
            <p className="text-xs text-muted-foreground mt-1">Registre notas de empenho vinculadas a esta licitação</p>
          </CardContent>
        </Card>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Empenho' : 'Novo Empenho'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Número *</Label>
                <Input value={form.numero} onChange={e => setForm({ ...form, numero: e.target.value })} placeholder="NE-001/2025" />
              </div>
              <div>
                <Label>Órgão Emissor *</Label>
                <Input value={form.orgao_emissor} onChange={e => setForm({ ...form, orgao_emissor: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={v => setForm({ ...form, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ordinario">Ordinário</SelectItem>
                    <SelectItem value="estimativo">Estimativo</SelectItem>
                    <SelectItem value="global">Global</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor Empenhado</Label>
                <Input type="number" step="0.01" value={form.valor_empenhado} onChange={e => setForm({ ...form, valor_empenhado: e.target.value })} />
              </div>
              <div>
                <Label>Valor Utilizado</Label>
                <Input type="number" step="0.01" value={form.valor_utilizado} onChange={e => setForm({ ...form, valor_utilizado: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data Emissão</Label>
                <Input type="date" value={form.data_emissao} onChange={e => setForm({ ...form, data_emissao: e.target.value })} />
              </div>
              <div>
                <Label>Data Vencimento</Label>
                <Input type="date" value={form.data_vencimento} onChange={e => setForm({ ...form, data_vencimento: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Natureza da Despesa</Label>
                <Input value={form.natureza_despesa} onChange={e => setForm({ ...form, natureza_despesa: e.target.value })} placeholder="Ex: 3.3.90.30" />
              </div>
              <div>
                <Label>Fonte de Recurso</Label>
                <Input value={form.fonte_recurso} onChange={e => setForm({ ...form, fonte_recurso: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="parcialmente_utilizado">Parcialmente Utilizado</SelectItem>
                  <SelectItem value="utilizado">Utilizado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                  <SelectItem value="anulado">Anulado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editingId ? 'Salvar' : 'Registrar Empenho'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!anexosOpen} onOpenChange={(o) => !o && setAnexosOpen(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Anexos · Empenho {anexosOpen?.numero}</DialogTitle>
          </DialogHeader>
          {anexosOpen && (
            <AnexosManager parentType="empenho" parentId={anexosOpen.id} clienteId={clienteId} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
