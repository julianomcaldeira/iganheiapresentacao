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
import { toast } from 'sonner';
import { Plus, FileSignature, Loader2, Calendar, DollarSign, Clock, Edit, Trash2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface ContratosTabProps {
  licitacaoId: string;
  clienteId: string;
}

interface Contrato {
  id: string;
  numero: string;
  objeto: string;
  valor: number;
  data_assinatura: string;
  data_inicio_vigencia: string;
  data_fim_vigencia: string;
  status: string;
  fornecedor: string;
  observacoes: string | null;
  aditivos: number;
  created_at: string;
}

// Using licitacoes table itself to store contract reference since contratos table doesn't exist yet
// We'll store contract data in a JSONB field or create dedicated storage

export function ContratosTab({ licitacaoId, clienteId }: ContratosTabProps) {
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    numero: '',
    objeto: '',
    valor: '',
    data_assinatura: '',
    data_inicio_vigencia: '',
    data_fim_vigencia: '',
    fornecedor: '',
    observacoes: '',
    status: 'vigente',
  });

  useEffect(() => {
    fetchContratos();
  }, [licitacaoId]);

  const fetchContratos = async () => {
    setLoading(true);
    // Store contracts as empenhos with tipo='contrato' to reuse existing table
    const { data } = await supabase
      .from('empenhos')
      .select('*')
      .eq('licitacao_id', licitacaoId)
      .eq('tipo', 'contrato')
      .order('created_at', { ascending: false });

    const mapped: Contrato[] = (data || []).map(e => ({
      id: e.id,
      numero: e.numero,
      objeto: e.objeto || '',
      valor: e.valor_empenhado,
      data_assinatura: e.data_emissao,
      data_inicio_vigencia: e.data_emissao,
      data_fim_vigencia: e.data_vencimento || '',
      status: e.status,
      fornecedor: e.orgao_emissor,
      observacoes: e.observacoes,
      aditivos: 0,
      created_at: e.created_at,
    }));
    setContratos(mapped);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.numero || !form.fornecedor) {
      toast.error('Preencha número e fornecedor');
      return;
    }
    try {
      const payload = {
        numero: form.numero,
        objeto: form.objeto,
        valor_empenhado: parseFloat(form.valor) || 0,
        data_emissao: form.data_assinatura || new Date().toISOString(),
        data_vencimento: form.data_fim_vigencia || null,
        orgao_emissor: form.fornecedor,
        observacoes: form.observacoes || null,
        status: form.status,
        tipo: 'contrato',
        licitacao_id: licitacaoId,
        cliente_id: clienteId,
      };

      if (editingId) {
        await supabase.from('empenhos').update(payload).eq('id', editingId);
        toast.success('Contrato atualizado!');
      } else {
        await supabase.from('empenhos').insert(payload);
        toast.success('Contrato criado!');
      }

      setShowForm(false);
      setEditingId(null);
      resetForm();
      fetchContratos();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar');
    }
  };

  const handleEdit = (c: Contrato) => {
    setForm({
      numero: c.numero,
      objeto: c.objeto,
      valor: c.valor.toString(),
      data_assinatura: c.data_assinatura?.split('T')[0] || '',
      data_inicio_vigencia: c.data_inicio_vigencia?.split('T')[0] || '',
      data_fim_vigencia: c.data_fim_vigencia?.split('T')[0] || '',
      fornecedor: c.fornecedor,
      observacoes: c.observacoes || '',
      status: c.status,
    });
    setEditingId(c.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('empenhos').delete().eq('id', id);
    setContratos(contratos.filter(c => c.id !== id));
    toast.success('Contrato removido');
  };

  const resetForm = () => {
    setForm({ numero: '', objeto: '', valor: '', data_assinatura: '', data_inicio_vigencia: '', data_fim_vigencia: '', fornecedor: '', observacoes: '', status: 'vigente' });
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { label: string; className: string }> = {
      vigente: { label: 'Vigente', className: 'bg-emerald-500/20 text-emerald-600' },
      encerrado: { label: 'Encerrado', className: 'bg-muted text-muted-foreground' },
      aditado: { label: 'Aditado', className: 'bg-blue-500/20 text-blue-600' },
      rescindido: { label: 'Rescindido', className: 'bg-red-500/20 text-red-600' },
      em_execucao: { label: 'Em Execução', className: 'bg-amber-500/20 text-amber-600' },
    };
    const config = configs[status] || configs.vigente;
    return <Badge className={`text-[10px] ${config.className}`}>{config.label}</Badge>;
  };

  const getDiasVigencia = (dataFim: string) => {
    if (!dataFim) return null;
    const dias = Math.ceil((new Date(dataFim).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return dias;
  };

  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileSignature className="h-5 w-5 text-primary" />
          <div>
            <h3 className="text-sm font-semibold">Contratos</h3>
            <p className="text-xs text-muted-foreground">
              {contratos.length} contratos vinculados
              {contratos.length > 0 && ` • Total: ${formatCurrency(contratos.reduce((s, c) => s + c.valor, 0))}`}
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Contrato
        </Button>
      </div>

      {/* Alertas de vigência */}
      {contratos.filter(c => {
        const dias = getDiasVigencia(c.data_fim_vigencia);
        return dias !== null && dias > 0 && dias <= 30 && c.status === 'vigente';
      }).map(c => (
        <div key={c.id} className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 text-xs">
          <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
          <span>Contrato <span className="font-semibold">{c.numero}</span> vence em {getDiasVigencia(c.data_fim_vigencia)} dias</span>
        </div>
      ))}

      {contratos.length > 0 ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Vigência</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contratos.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium text-sm">{c.numero}</TableCell>
                  <TableCell className="text-sm">{c.fornecedor}</TableCell>
                  <TableCell className="text-right text-sm font-medium">{formatCurrency(c.valor)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {c.data_assinatura ? format(new Date(c.data_assinatura), 'dd/MM/yyyy') : '-'}
                    {c.data_fim_vigencia && ` → ${format(new Date(c.data_fim_vigencia), 'dd/MM/yyyy')}`}
                  </TableCell>
                  <TableCell>{getStatusBadge(c.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleEdit(c)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDelete(c.id)}>
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
            <FileSignature className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm font-medium">Nenhum contrato vinculado</p>
            <p className="text-xs text-muted-foreground mt-1">Crie contratos após o resultado da licitação</p>
          </CardContent>
        </Card>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Contrato' : 'Novo Contrato'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Número do Contrato *</Label>
                <Input value={form.numero} onChange={e => setForm({ ...form, numero: e.target.value })} placeholder="CT-001/2025" />
              </div>
              <div>
                <Label>Fornecedor *</Label>
                <Input value={form.fornecedor} onChange={e => setForm({ ...form, fornecedor: e.target.value })} placeholder="Razão social" />
              </div>
            </div>
            <div>
              <Label>Objeto</Label>
              <Textarea value={form.objeto} onChange={e => setForm({ ...form, objeto: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valor (R$)</Label>
                <Input type="number" step="0.01" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vigente">Vigente</SelectItem>
                    <SelectItem value="em_execucao">Em Execução</SelectItem>
                    <SelectItem value="aditado">Aditado</SelectItem>
                    <SelectItem value="encerrado">Encerrado</SelectItem>
                    <SelectItem value="rescindido">Rescindido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data Assinatura</Label>
                <Input type="date" value={form.data_assinatura} onChange={e => setForm({ ...form, data_assinatura: e.target.value })} />
              </div>
              <div>
                <Label>Fim Vigência</Label>
                <Input type="date" value={form.data_fim_vigencia} onChange={e => setForm({ ...form, data_fim_vigencia: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editingId ? 'Salvar' : 'Criar Contrato'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
