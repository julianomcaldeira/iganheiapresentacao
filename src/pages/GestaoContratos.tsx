import { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveProfile } from '@/hooks/useEffectiveProfile';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  FileSignature, Plus, Search, Eye, AlertCircle, ShieldCheck, FileText, Layers,
  Receipt, CalendarClock, Banknote, Building2, Loader2, Edit, Trash2, XCircle,
  Activity, GitBranch, TrendingUp, FileCheck, DollarSign, Sparkles, Wallet, Paperclip,
} from 'lucide-react';
import { AnexosManager } from '@/components/contratos/AnexosManager';
import { ptBR } from 'date-fns/locale';
import { formatDistanceToNow } from 'date-fns';

type Contrato = {
  id: string;
  cliente_id: string;
  numero: string;
  orgao: string;
  uf: string | null;
  objeto: string | null;
  modalidade: string | null;
  fornecedor: string | null;
  valor_original: number;
  valor_atual: number;
  valor_executado: number;
  data_assinatura: string | null;
  data_inicio_vigencia: string | null;
  data_fim_vigencia: string | null;
  fiscal_nome: string | null;
  gestor_nome: string | null;
  indice_reajuste: string | null;
  status: string;
  observacoes: string | null;
};

const STATUS_OPTIONS = ['vigente', 'em_execucao', 'aditado', 'em_renovacao', 'encerrado', 'rescindido', 'suspenso'];
const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  vigente: { label: 'Vigente', cls: 'bg-emerald-500/15 text-emerald-600' },
  em_execucao: { label: 'Em execução', cls: 'bg-blue-500/15 text-blue-600' },
  aditado: { label: 'Aditado', cls: 'bg-amber-500/15 text-amber-600' },
  em_renovacao: { label: 'Em renovação', cls: 'bg-violet-500/15 text-violet-600' },
  encerrado: { label: 'Encerrado', cls: 'bg-muted text-muted-foreground' },
  rescindido: { label: 'Rescindido', cls: 'bg-red-500/15 text-red-600' },
  suspenso: { label: 'Suspenso', cls: 'bg-orange-500/15 text-orange-600' },
};

const fmtBRL = (v: number | null | undefined) =>
  (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (d: string | null | undefined) => (d ? format(new Date(d), 'dd/MM/yyyy') : '—');
const diasAte = (d: string | null | undefined) => {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
};

export default function GestaoContratos() {
  const { isAdmin } = useAuth();
  const { effectiveClienteId } = useEffectiveProfile();
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<string>('all');
  const [selected, setSelected] = useState<Contrato | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Contrato | null>(null);

  const fetchContratos = async () => {
    setLoading(true);
    let q = supabase.from('contratos').select('*').order('created_at', { ascending: false });
    if (!isAdmin && effectiveClienteId) q = q.eq('cliente_id', effectiveClienteId);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setContratos((data as Contrato[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchContratos(); }, [effectiveClienteId, isAdmin]);

  const filtered = useMemo(() => contratos.filter(c => {
    if (statusFiltro !== 'all' && c.status !== statusFiltro) return false;
    if (busca && !`${c.numero} ${c.orgao} ${c.objeto || ''}`.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  }), [contratos, busca, statusFiltro]);

  const totais = useMemo(() => ({
    total: filtered.length,
    valor: filtered.reduce((s, c) => s + Number(c.valor_atual || 0), 0),
    executado: filtered.reduce((s, c) => s + Number(c.valor_executado || 0), 0),
    vencendo: filtered.filter(c => {
      const d = diasAte(c.data_fim_vigencia);
      return d !== null && d > 0 && d <= 60 && ['vigente', 'em_execucao', 'aditado'].includes(c.status);
    }).length,
  }), [filtered]);

  return (
    <MainLayout title="Gestão de Contratos">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileSignature className="h-6 w-6 text-primary" /> Gestão de Contratos
            </h1>
            <p className="text-sm text-muted-foreground">Ciclo de vida completo e execução financeira</p>
          </div>
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Novo Contrato
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KPI label="Contratos" value={totais.total.toString()} icon={FileSignature} />
          <KPI label="Valor total" value={fmtBRL(totais.valor)} icon={Banknote} />
          <KPI label="Executado" value={fmtBRL(totais.executado)} icon={Receipt}
            sub={totais.valor > 0 ? `${((totais.executado / totais.valor) * 100).toFixed(1)}% do total` : undefined} />
          <KPI label="Vencendo em 60d" value={totais.vencendo.toString()} icon={AlertCircle}
            highlight={totais.vencendo > 0 ? 'amber' : undefined} />
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="py-4 flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por número, órgão ou objeto…" className="pl-9"
                value={busca} onChange={e => setBusca(e.target.value)} />
            </div>
            <Select value={statusFiltro} onValueChange={setStatusFiltro}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{STATUS_CFG[s].label}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Órgão</TableHead>
                <TableHead>Objeto</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Execução</TableHead>
                <TableHead>Vigência</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="py-12 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                </TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                  Nenhum contrato encontrado
                </TableCell></TableRow>
              ) : filtered.map(c => {
                const pct = c.valor_atual > 0 ? Math.min(100, (c.valor_executado / c.valor_atual) * 100) : 0;
                const dias = diasAte(c.data_fim_vigencia);
                return (
                  <TableRow key={c.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setSelected(c)}>
                    <TableCell className="font-medium text-sm">{c.numero}</TableCell>
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-1"><Building2 className="h-3 w-3 text-muted-foreground" />{c.orgao}</div>
                      <div className="text-xs text-muted-foreground">{c.uf || ''} • {c.modalidade || '—'}</div>
                    </TableCell>
                    <TableCell className="text-xs max-w-xs truncate">{c.objeto || '—'}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{fmtBRL(c.valor_atual)}</TableCell>
                    <TableCell className="min-w-[140px]">
                      <Progress value={pct} className="h-2" />
                      <div className="text-[10px] text-muted-foreground mt-0.5">{pct.toFixed(0)}%</div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {fmtDate(c.data_fim_vigencia)}
                      {dias !== null && dias > 0 && dias <= 60 && (
                        <div className="text-amber-600 font-medium">{dias}d restantes</div>
                      )}
                    </TableCell>
                    <TableCell><Badge className={`text-[10px] ${STATUS_CFG[c.status]?.cls || ''}`}>{STATUS_CFG[c.status]?.label || c.status}</Badge></TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); setSelected(c); }}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Detalhe drawer */}
      {selected && (
        <ContratoDetalheDrawer
          contrato={selected}
          open={!!selected}
          onClose={() => setSelected(null)}
          onEdit={() => { setEditing(selected); setFormOpen(true); setSelected(null); }}
          onChanged={() => fetchContratos()}
        />
      )}

      {/* Form */}
      <ContratoFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        contrato={editing}
        clienteId={effectiveClienteId}
        onSaved={() => { setFormOpen(false); fetchContratos(); }}
      />
    </MainLayout>
  );
}

// =========================================================
// KPI
// =========================================================
function KPI({ label, value, sub, icon: Icon, highlight }: { label: string; value: string; sub?: string; icon: any; highlight?: 'amber' | 'red' }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2 rounded-lg ${highlight === 'amber' ? 'bg-amber-500/15 text-amber-600' : 'bg-primary/10 text-primary'}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold truncate">{value}</p>
          {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// =========================================================
// Form Dialog (criar/editar contrato)
// =========================================================
function ContratoFormDialog({ open, onOpenChange, contrato, clienteId, onSaved }: {
  open: boolean; onOpenChange: (v: boolean) => void; contrato: Contrato | null; clienteId: string | null; onSaved: () => void;
}) {
  const [f, setF] = useState<any>({});

  useEffect(() => {
    if (contrato) {
      setF({
        numero: contrato.numero, orgao: contrato.orgao, uf: contrato.uf || '', objeto: contrato.objeto || '',
        modalidade: contrato.modalidade || '', fornecedor: contrato.fornecedor || '',
        valor_original: contrato.valor_original, valor_atual: contrato.valor_atual,
        data_assinatura: contrato.data_assinatura?.split('T')[0] || '',
        data_inicio_vigencia: contrato.data_inicio_vigencia?.split('T')[0] || '',
        data_fim_vigencia: contrato.data_fim_vigencia?.split('T')[0] || '',
        fiscal_nome: contrato.fiscal_nome || '', gestor_nome: contrato.gestor_nome || '',
        indice_reajuste: contrato.indice_reajuste || 'IPCA', status: contrato.status,
      });
    } else {
      setF({ status: 'vigente', indice_reajuste: 'IPCA', valor_original: 0, valor_atual: 0 });
    }
  }, [contrato, open]);

  const save = async () => {
    if (!f.numero || !f.orgao) { toast.error('Número e órgão são obrigatórios'); return; }
    if (!clienteId && !contrato) { toast.error('Selecione um cliente'); return; }
    const payload: any = { ...f, cliente_id: contrato?.cliente_id || clienteId };
    Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null; });
    payload.valor_original = Number(payload.valor_original) || 0;
    payload.valor_atual = Number(payload.valor_atual) || payload.valor_original;

    const res = contrato
      ? await supabase.from('contratos').update(payload).eq('id', contrato.id)
      : await supabase.from('contratos').insert(payload);
    if (res.error) return toast.error(res.error.message);
    toast.success(contrato ? 'Contrato atualizado' : 'Contrato criado');
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{contrato ? 'Editar contrato' : 'Novo contrato'}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Número *"><Input value={f.numero || ''} onChange={e => setF({ ...f, numero: e.target.value })} /></Field>
          <Field label="Órgão *"><Input value={f.orgao || ''} onChange={e => setF({ ...f, orgao: e.target.value })} /></Field>
          <Field label="UF"><Input maxLength={2} value={f.uf || ''} onChange={e => setF({ ...f, uf: e.target.value.toUpperCase() })} /></Field>
          <Field label="Modalidade"><Input value={f.modalidade || ''} onChange={e => setF({ ...f, modalidade: e.target.value })} /></Field>
          <div className="col-span-2">
            <Field label="Objeto"><Textarea rows={2} value={f.objeto || ''} onChange={e => setF({ ...f, objeto: e.target.value })} /></Field>
          </div>
          <Field label="Fornecedor"><Input value={f.fornecedor || ''} onChange={e => setF({ ...f, fornecedor: e.target.value })} /></Field>
          <Field label="Status">
            <Select value={f.status} onValueChange={v => setF({ ...f, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{STATUS_CFG[s].label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Valor original (R$)"><Input type="number" step="0.01" value={f.valor_original ?? ''} onChange={e => setF({ ...f, valor_original: e.target.value })} /></Field>
          <Field label="Valor atual (R$)"><Input type="number" step="0.01" value={f.valor_atual ?? ''} onChange={e => setF({ ...f, valor_atual: e.target.value })} /></Field>
          <Field label="Data assinatura"><Input type="date" value={f.data_assinatura || ''} onChange={e => setF({ ...f, data_assinatura: e.target.value })} /></Field>
          <Field label="Início vigência"><Input type="date" value={f.data_inicio_vigencia || ''} onChange={e => setF({ ...f, data_inicio_vigencia: e.target.value })} /></Field>
          <Field label="Fim vigência"><Input type="date" value={f.data_fim_vigencia || ''} onChange={e => setF({ ...f, data_fim_vigencia: e.target.value })} /></Field>
          <Field label="Índice de reajuste">
            <Select value={f.indice_reajuste || 'IPCA'} onValueChange={v => setF({ ...f, indice_reajuste: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['IPCA', 'IGP-M', 'INPC', 'IPC-FIPE', 'SELIC', 'Outro'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Fiscal"><Input value={f.fiscal_nome || ''} onChange={e => setF({ ...f, fiscal_nome: e.target.value })} /></Field>
          <Field label="Gestor"><Input value={f.gestor_nome || ''} onChange={e => setF({ ...f, gestor_nome: e.target.value })} /></Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save}>{contrato ? 'Salvar' : 'Criar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="text-xs">{label}</Label>{children}</div>;
}

// =========================================================
// Drawer de detalhe com sub-módulos
// =========================================================
function ContratoDetalheDrawer({ contrato, open, onClose, onEdit, onChanged }: {
  contrato: Contrato; open: boolean; onClose: () => void; onEdit: () => void; onChanged: () => void;
}) {
  const pct = contrato.valor_atual > 0 ? (contrato.valor_executado / contrato.valor_atual) * 100 : 0;
  const dias = diasAte(contrato.data_fim_vigencia);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-5xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <SheetTitle className="text-lg">{contrato.numero}</SheetTitle>
              <p className="text-sm text-muted-foreground">{contrato.orgao} • {contrato.uf || '—'}</p>
            </div>
            <div className="flex gap-2">
              <Badge className={STATUS_CFG[contrato.status]?.cls || ''}>{STATUS_CFG[contrato.status]?.label || contrato.status}</Badge>
              <Button size="sm" variant="outline" onClick={onEdit}><Edit className="h-3.5 w-3.5 mr-1" />Editar</Button>
            </div>
          </div>
        </SheetHeader>

        {/* Resumo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-4">
          <Mini label="Valor atual" value={fmtBRL(contrato.valor_atual)} />
          <Mini label="Executado" value={fmtBRL(contrato.valor_executado)} sub={`${pct.toFixed(1)}%`} />
          <Mini label="Saldo" value={fmtBRL(contrato.valor_atual - contrato.valor_executado)} />
          <Mini label="Fim vigência" value={fmtDate(contrato.data_fim_vigencia)} sub={dias !== null ? `${dias}d` : undefined} highlight={dias !== null && dias <= 60 ? 'amber' : undefined} />
        </div>

        <Tabs defaultValue="timeline">
          <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto">
            <TabsTrigger value="timeline"><Activity className="h-3.5 w-3.5 mr-1" />Linha do tempo</TabsTrigger>
            <TabsTrigger value="resumo">Resumo</TabsTrigger>
            <TabsTrigger value="aditivos">Aditivos</TabsTrigger>
            <TabsTrigger value="apostilamentos">Apostilamentos</TabsTrigger>
            <TabsTrigger value="garantias">Garantias</TabsTrigger>
            <TabsTrigger value="subcontratacoes">Subcontratações</TabsTrigger>
            <TabsTrigger value="medicoes">Medições</TabsTrigger>
            <TabsTrigger value="cronograma">Cronograma</TabsTrigger>
            <TabsTrigger value="faturas">Faturamento</TabsTrigger>
            <TabsTrigger value="rescisao">Rescisão</TabsTrigger>
            <TabsTrigger value="anexos"><Paperclip className="h-3.5 w-3.5 mr-1" />Anexos</TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="pt-4">
            <ContratoTimeline contrato={contrato} />
          </TabsContent>

          <TabsContent value="resumo" className="space-y-3 pt-4">
            <Card><CardContent className="p-4 space-y-2 text-sm">
              <Row k="Objeto" v={contrato.objeto || '—'} />
              <Row k="Modalidade" v={contrato.modalidade || '—'} />
              <Row k="Fornecedor" v={contrato.fornecedor || '—'} />
              <Row k="Assinatura" v={fmtDate(contrato.data_assinatura)} />
              <Row k="Vigência" v={`${fmtDate(contrato.data_inicio_vigencia)} → ${fmtDate(contrato.data_fim_vigencia)}`} />
              <Row k="Índice de reajuste" v={contrato.indice_reajuste || '—'} />
              <Row k="Fiscal" v={contrato.fiscal_nome || '—'} />
              <Row k="Gestor" v={contrato.gestor_nome || '—'} />
              {contrato.observacoes && <Row k="Observações" v={contrato.observacoes} />}
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="aditivos"><AditivosSection contrato={contrato} onChanged={onChanged} /></TabsContent>
          <TabsContent value="apostilamentos"><ApostilamentosSection contrato={contrato} onChanged={onChanged} /></TabsContent>
          <TabsContent value="garantias"><GarantiasSection contrato={contrato} /></TabsContent>
          <TabsContent value="subcontratacoes"><SubcontratacoesSection contrato={contrato} /></TabsContent>
          <TabsContent value="medicoes"><MedicoesSection contrato={contrato} /></TabsContent>
          <TabsContent value="cronograma"><CronogramaSection contrato={contrato} /></TabsContent>
          <TabsContent value="faturas"><FaturasSection contrato={contrato} onChanged={onChanged} /></TabsContent>
          <TabsContent value="rescisao"><RescisaoSection contrato={contrato} onChanged={onChanged} /></TabsContent>
          <TabsContent value="anexos" className="pt-4">
            <AnexosManager parentType="contrato" parentId={contrato.id} clienteId={contrato.cliente_id} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function Mini({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: 'amber' }) {
  return (
    <div className={`rounded-lg border p-3 ${highlight === 'amber' ? 'border-amber-500/40 bg-amber-500/5' : ''}`}>
      <p className="text-[10px] text-muted-foreground uppercase">{label}</p>
      <p className="text-sm font-semibold truncate">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex gap-3 border-b pb-1.5 last:border-0"><span className="text-xs font-medium text-muted-foreground w-32 shrink-0">{k}</span><span className="text-xs">{v}</span></div>;
}

// =========================================================
// Genérico: lista + form para sub-tabelas
// =========================================================
function useSubList<T extends { id: string }>(table: string, contratoId: string) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).from(table).select('*').eq('contrato_id', contratoId).order('created_at', { ascending: false });
    if (error) toast.error(error.message); else setItems(data || []);
    setLoading(false);
  };
  useEffect(() => { refresh(); }, [contratoId]);
  return { items, loading, refresh };
}

async function deleteRow(table: string, id: string, refresh: () => void) {
  if (!confirm('Excluir este registro?')) return;
  const { error } = await (supabase as any).from(table).delete().eq('id', id);
  if (error) toast.error(error.message); else { toast.success('Excluído'); refresh(); }
}

function SubHeader({ title, icon: Icon, count, onAdd }: { title: string; icon: any; count: number; onAdd: () => void }) {
  return (
    <div className="flex items-center justify-between mb-3 pt-4">
      <div className="flex items-center gap-2"><Icon className="h-4 w-4 text-primary" /><span className="text-sm font-semibold">{title}</span><Badge variant="outline" className="text-[10px]">{count}</Badge></div>
      <Button size="sm" onClick={onAdd}><Plus className="h-3.5 w-3.5 mr-1" />Adicionar</Button>
    </div>
  );
}

// ---------- ADITIVOS ----------
function AditivosSection({ contrato, onChanged }: { contrato: Contrato; onChanged: () => void }) {
  const { items, loading, refresh } = useSubList<any>('contrato_aditivos', contrato.id);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<any>({});

  const save = async () => {
    if (!f.numero_termo || !f.tipo) return toast.error('Número e tipo obrigatórios');
    const payload: any = {
      contrato_id: contrato.id, cliente_id: contrato.cliente_id,
      numero_termo: f.numero_termo, tipo: f.tipo, data_assinatura: f.data_assinatura || null,
      data_publicacao: f.data_publicacao || null, valor_alteracao: Number(f.valor_alteracao) || 0,
      novo_valor_contrato: f.novo_valor_contrato ? Number(f.novo_valor_contrato) : null,
      prazo_adicional_dias: Number(f.prazo_adicional_dias) || 0,
      nova_data_fim_vigencia: f.nova_data_fim_vigencia || null,
      justificativa: f.justificativa || null,
    };
    const { error } = await supabase.from('contrato_aditivos').insert(payload);
    if (error) return toast.error(error.message);

    // Aplica efeito ao contrato
    const updates: any = { status: 'aditado' };
    if (payload.novo_valor_contrato) updates.valor_atual = payload.novo_valor_contrato;
    if (payload.nova_data_fim_vigencia) updates.data_fim_vigencia = payload.nova_data_fim_vigencia;
    await supabase.from('contratos').update(updates).eq('id', contrato.id);

    toast.success('Aditivo criado');
    setOpen(false); setF({}); refresh(); onChanged();
  };

  return (
    <div>
      <SubHeader title="Termos aditivos" icon={Layers} count={items.length} onAdd={() => { setF({ tipo: 'prazo' }); setOpen(true); }} />
      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : items.length === 0 ? <Empty msg="Nenhum aditivo registrado" /> : (
        <Card><Table>
          <TableHeader><TableRow><TableHead>Termo</TableHead><TableHead>Tipo</TableHead><TableHead>Valor</TableHead><TableHead>Prazo</TableHead><TableHead>Publicação</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>{items.map(a => (
            <TableRow key={a.id}>
              <TableCell className="text-sm font-medium">{a.numero_termo}</TableCell>
              <TableCell><Badge variant="outline" className="text-[10px] capitalize">{a.tipo}</Badge></TableCell>
              <TableCell className="text-xs">{a.valor_alteracao ? fmtBRL(a.valor_alteracao) : '—'}</TableCell>
              <TableCell className="text-xs">{a.prazo_adicional_dias ? `+${a.prazo_adicional_dias}d` : '—'}</TableCell>
              <TableCell className="text-xs">{fmtDate(a.data_publicacao)}</TableCell>
              <TableCell><Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteRow('contrato_aditivos', a.id, refresh)}><Trash2 className="h-3.5 w-3.5" /></Button></TableCell>
            </TableRow>
          ))}</TableBody>
        </Table></Card>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo termo aditivo</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Número do termo *"><Input value={f.numero_termo || ''} onChange={e => setF({ ...f, numero_termo: e.target.value })} /></Field>
            <Field label="Tipo *">
              <Select value={f.tipo} onValueChange={v => setF({ ...f, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['prazo', 'valor', 'acrescimo', 'supressao', 'qualitativo', 'misto'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Data assinatura"><Input type="date" value={f.data_assinatura || ''} onChange={e => setF({ ...f, data_assinatura: e.target.value })} /></Field>
            <Field label="Data publicação"><Input type="date" value={f.data_publicacao || ''} onChange={e => setF({ ...f, data_publicacao: e.target.value })} /></Field>
            <Field label="Valor alteração (R$)"><Input type="number" step="0.01" value={f.valor_alteracao || ''} onChange={e => setF({ ...f, valor_alteracao: e.target.value })} /></Field>
            <Field label="Novo valor total (R$)"><Input type="number" step="0.01" value={f.novo_valor_contrato || ''} onChange={e => setF({ ...f, novo_valor_contrato: e.target.value })} /></Field>
            <Field label="Prazo adicional (dias)"><Input type="number" value={f.prazo_adicional_dias || ''} onChange={e => setF({ ...f, prazo_adicional_dias: e.target.value })} /></Field>
            <Field label="Nova data fim"><Input type="date" value={f.nova_data_fim_vigencia || ''} onChange={e => setF({ ...f, nova_data_fim_vigencia: e.target.value })} /></Field>
            <div className="col-span-2"><Field label="Justificativa"><Textarea rows={2} value={f.justificativa || ''} onChange={e => setF({ ...f, justificativa: e.target.value })} /></Field></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save}>Criar aditivo</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------- APOSTILAMENTOS ----------
function ApostilamentosSection({ contrato, onChanged }: { contrato: Contrato; onChanged: () => void }) {
  const { items, loading, refresh } = useSubList<any>('contrato_apostilamentos', contrato.id);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<any>({});

  const save = async () => {
    if (!f.numero || !f.percentual) return toast.error('Número e percentual obrigatórios');
    const valorAnterior = Number(contrato.valor_atual);
    const valorNovo = valorAnterior * (1 + Number(f.percentual) / 100);
    const { error } = await supabase.from('contrato_apostilamentos').insert({
      contrato_id: contrato.id, cliente_id: contrato.cliente_id,
      numero: f.numero, tipo: f.tipo || 'reajuste', indice: f.indice || contrato.indice_reajuste,
      percentual: Number(f.percentual), data_aplicacao: f.data_aplicacao || null,
      valor_anterior: valorAnterior, valor_novo: valorNovo, justificativa: f.justificativa || null,
    });
    if (error) return toast.error(error.message);
    await supabase.from('contratos').update({ valor_atual: valorNovo }).eq('id', contrato.id);
    toast.success('Apostilamento aplicado'); setOpen(false); setF({}); refresh(); onChanged();
  };

  return (
    <div>
      <SubHeader title="Reajustes / Apostilamentos" icon={CalendarClock} count={items.length} onAdd={() => { setF({ tipo: 'reajuste', indice: contrato.indice_reajuste || 'IPCA' }); setOpen(true); }} />
      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : items.length === 0 ? <Empty msg="Nenhum apostilamento" /> : (
        <Card><Table>
          <TableHeader><TableRow><TableHead>Número</TableHead><TableHead>Tipo</TableHead><TableHead>Índice</TableHead><TableHead>%</TableHead><TableHead>Valor anterior</TableHead><TableHead>Valor novo</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>{items.map(a => (
            <TableRow key={a.id}>
              <TableCell className="text-sm font-medium">{a.numero}</TableCell>
              <TableCell className="capitalize text-xs">{a.tipo}</TableCell>
              <TableCell className="text-xs">{a.indice || '—'}</TableCell>
              <TableCell className="text-xs">{Number(a.percentual).toFixed(2)}%</TableCell>
              <TableCell className="text-xs">{fmtBRL(a.valor_anterior)}</TableCell>
              <TableCell className="text-xs font-medium">{fmtBRL(a.valor_novo)}</TableCell>
              <TableCell><Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteRow('contrato_apostilamentos', a.id, refresh)}><Trash2 className="h-3.5 w-3.5" /></Button></TableCell>
            </TableRow>
          ))}</TableBody>
        </Table></Card>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo apostilamento</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Número *"><Input value={f.numero || ''} onChange={e => setF({ ...f, numero: e.target.value })} /></Field>
            <Field label="Tipo">
              <Select value={f.tipo} onValueChange={v => setF({ ...f, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['reajuste', 'repactuacao', 'revisao'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Índice">
              <Select value={f.indice} onValueChange={v => setF({ ...f, indice: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['IPCA', 'IGP-M', 'INPC', 'IPC-FIPE', 'SELIC'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Percentual (%) *"><Input type="number" step="0.0001" value={f.percentual || ''} onChange={e => setF({ ...f, percentual: e.target.value })} /></Field>
            <Field label="Data aplicação"><Input type="date" value={f.data_aplicacao || ''} onChange={e => setF({ ...f, data_aplicacao: e.target.value })} /></Field>
            <div className="col-span-2"><Field label="Justificativa"><Textarea rows={2} value={f.justificativa || ''} onChange={e => setF({ ...f, justificativa: e.target.value })} /></Field></div>
            <div className="col-span-2 text-xs text-muted-foreground p-2 rounded bg-muted">
              Valor atual: <span className="font-medium">{fmtBRL(contrato.valor_atual)}</span> →
              Novo valor estimado: <span className="font-medium text-primary">{fmtBRL(Number(contrato.valor_atual) * (1 + (Number(f.percentual) || 0) / 100))}</span>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save}>Aplicar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------- GARANTIAS ----------
function GarantiasSection({ contrato }: { contrato: Contrato }) {
  const { items, loading, refresh } = useSubList<any>('contrato_garantias', contrato.id);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<any>({});

  const save = async () => {
    if (!f.tipo || !f.valor) return toast.error('Tipo e valor obrigatórios');
    const { error } = await supabase.from('contrato_garantias').insert({
      contrato_id: contrato.id, cliente_id: contrato.cliente_id,
      tipo: f.tipo, valor: Number(f.valor), percentual_contrato: f.percentual_contrato ? Number(f.percentual_contrato) : null,
      emissor: f.emissor || null, numero_apolice: f.numero_apolice || null,
      data_emissao: f.data_emissao || null, data_vigencia_inicio: f.data_vigencia_inicio || null,
      data_vigencia_fim: f.data_vigencia_fim || null, status: f.status || 'ativa', observacoes: f.observacoes || null,
    });
    if (error) return toast.error(error.message);
    toast.success('Garantia registrada'); setOpen(false); setF({}); refresh();
  };

  return (
    <div>
      <SubHeader title="Garantias contratuais" icon={ShieldCheck} count={items.length} onAdd={() => { setF({ tipo: 'seguro_garantia', status: 'ativa' }); setOpen(true); }} />
      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : items.length === 0 ? <Empty msg="Nenhuma garantia" /> : (
        <Card><Table>
          <TableHeader><TableRow><TableHead>Tipo</TableHead><TableHead>Emissor</TableHead><TableHead>Apólice</TableHead><TableHead>Valor</TableHead><TableHead>Vigência</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>{items.map(g => {
            const d = diasAte(g.data_vigencia_fim);
            return (
              <TableRow key={g.id}>
                <TableCell className="text-xs capitalize">{g.tipo.replace(/_/g, ' ')}</TableCell>
                <TableCell className="text-xs">{g.emissor || '—'}</TableCell>
                <TableCell className="text-xs">{g.numero_apolice || '—'}</TableCell>
                <TableCell className="text-xs font-medium">{fmtBRL(g.valor)}</TableCell>
                <TableCell className="text-xs">{fmtDate(g.data_vigencia_fim)}{d !== null && d > 0 && d <= 30 && <div className="text-amber-600">{d}d</div>}</TableCell>
                <TableCell><Badge variant="outline" className="text-[10px] capitalize">{g.status}</Badge></TableCell>
                <TableCell><Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteRow('contrato_garantias', g.id, refresh)}><Trash2 className="h-3.5 w-3.5" /></Button></TableCell>
              </TableRow>
            );
          })}</TableBody>
        </Table></Card>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova garantia</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo *">
              <Select value={f.tipo} onValueChange={v => setF({ ...f, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['caucao_dinheiro', 'titulos_divida_publica', 'seguro_garantia', 'fianca_bancaria'].map(v => <SelectItem key={v} value={v}>{v.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Valor *"><Input type="number" step="0.01" value={f.valor || ''} onChange={e => setF({ ...f, valor: e.target.value })} /></Field>
            <Field label="% do contrato"><Input type="number" step="0.01" value={f.percentual_contrato || ''} onChange={e => setF({ ...f, percentual_contrato: e.target.value })} /></Field>
            <Field label="Status">
              <Select value={f.status} onValueChange={v => setF({ ...f, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['ativa', 'vencida', 'executada', 'devolvida'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Emissor (seguradora/banco)"><Input value={f.emissor || ''} onChange={e => setF({ ...f, emissor: e.target.value })} /></Field>
            <Field label="Nº apólice"><Input value={f.numero_apolice || ''} onChange={e => setF({ ...f, numero_apolice: e.target.value })} /></Field>
            <Field label="Emissão"><Input type="date" value={f.data_emissao || ''} onChange={e => setF({ ...f, data_emissao: e.target.value })} /></Field>
            <Field label="Vig. início"><Input type="date" value={f.data_vigencia_inicio || ''} onChange={e => setF({ ...f, data_vigencia_inicio: e.target.value })} /></Field>
            <Field label="Vig. fim"><Input type="date" value={f.data_vigencia_fim || ''} onChange={e => setF({ ...f, data_vigencia_fim: e.target.value })} /></Field>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------- SUBCONTRATAÇÕES ----------
function SubcontratacoesSection({ contrato }: { contrato: Contrato }) {
  const { items, loading, refresh } = useSubList<any>('contrato_subcontratacoes', contrato.id);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<any>({});

  const save = async () => {
    if (!f.cnpj || !f.razao_social) return toast.error('CNPJ e razão social obrigatórios');
    const { error } = await supabase.from('contrato_subcontratacoes').insert({
      contrato_id: contrato.id, cliente_id: contrato.cliente_id,
      cnpj: f.cnpj, razao_social: f.razao_social, objeto_subcontratado: f.objeto_subcontratado || null,
      percentual: f.percentual ? Number(f.percentual) : null, valor: Number(f.valor) || 0,
      data_aprovacao: f.data_aprovacao || null, data_inicio: f.data_inicio || null, data_fim: f.data_fim || null,
      status: f.status || 'ativa',
    });
    if (error) return toast.error(error.message);
    toast.success('Subcontratação registrada'); setOpen(false); setF({}); refresh();
  };

  return (
    <div>
      <SubHeader title="Subcontratações" icon={Building2} count={items.length} onAdd={() => { setF({ status: 'ativa' }); setOpen(true); }} />
      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : items.length === 0 ? <Empty msg="Nenhuma subcontratação" /> : (
        <Card><Table>
          <TableHeader><TableRow><TableHead>CNPJ</TableHead><TableHead>Razão social</TableHead><TableHead>Objeto</TableHead><TableHead>%</TableHead><TableHead>Valor</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>{items.map(s => (
            <TableRow key={s.id}>
              <TableCell className="text-xs">{s.cnpj}</TableCell>
              <TableCell className="text-xs font-medium">{s.razao_social}</TableCell>
              <TableCell className="text-xs max-w-xs truncate">{s.objeto_subcontratado || '—'}</TableCell>
              <TableCell className="text-xs">{s.percentual ? `${s.percentual}%` : '—'}</TableCell>
              <TableCell className="text-xs">{fmtBRL(s.valor)}</TableCell>
              <TableCell><Badge variant="outline" className="text-[10px] capitalize">{s.status}</Badge></TableCell>
              <TableCell><Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteRow('contrato_subcontratacoes', s.id, refresh)}><Trash2 className="h-3.5 w-3.5" /></Button></TableCell>
            </TableRow>
          ))}</TableBody>
        </Table></Card>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova subcontratação</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Field label="CNPJ *"><Input value={f.cnpj || ''} onChange={e => setF({ ...f, cnpj: e.target.value })} /></Field>
            <Field label="Razão social *"><Input value={f.razao_social || ''} onChange={e => setF({ ...f, razao_social: e.target.value })} /></Field>
            <div className="col-span-2"><Field label="Objeto subcontratado"><Textarea rows={2} value={f.objeto_subcontratado || ''} onChange={e => setF({ ...f, objeto_subcontratado: e.target.value })} /></Field></div>
            <Field label="% do contrato"><Input type="number" step="0.01" value={f.percentual || ''} onChange={e => setF({ ...f, percentual: e.target.value })} /></Field>
            <Field label="Valor (R$)"><Input type="number" step="0.01" value={f.valor || ''} onChange={e => setF({ ...f, valor: e.target.value })} /></Field>
            <Field label="Aprovação"><Input type="date" value={f.data_aprovacao || ''} onChange={e => setF({ ...f, data_aprovacao: e.target.value })} /></Field>
            <Field label="Início"><Input type="date" value={f.data_inicio || ''} onChange={e => setF({ ...f, data_inicio: e.target.value })} /></Field>
            <Field label="Fim"><Input type="date" value={f.data_fim || ''} onChange={e => setF({ ...f, data_fim: e.target.value })} /></Field>
            <Field label="Status">
              <Select value={f.status} onValueChange={v => setF({ ...f, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['ativa', 'encerrada', 'rejeitada'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------- MEDIÇÕES ----------
function MedicoesSection({ contrato }: { contrato: Contrato }) {
  const { items, loading, refresh } = useSubList<any>('contrato_medicoes', contrato.id);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<any>({});

  const save = async () => {
    if (!f.numero || !f.periodo_inicio || !f.periodo_fim) return toast.error('Número e período obrigatórios');
    const acumulado = items.reduce((s, i) => s + Number(i.percentual_fisico || 0), 0) + Number(f.percentual_fisico || 0);
    const { error } = await supabase.from('contrato_medicoes').insert({
      contrato_id: contrato.id, cliente_id: contrato.cliente_id,
      numero: f.numero, periodo_inicio: f.periodo_inicio, periodo_fim: f.periodo_fim,
      valor_medido: Number(f.valor_medido) || 0,
      percentual_fisico: Number(f.percentual_fisico) || 0,
      percentual_acumulado: Math.min(100, acumulado),
      status: f.status || 'rascunho', observacoes: f.observacoes || null,
      fiscal_aprovador_nome: f.fiscal_aprovador_nome || null,
    });
    if (error) return toast.error(error.message);
    toast.success('Medição registrada'); setOpen(false); setF({}); refresh();
  };

  return (
    <div>
      <SubHeader title="Medições" icon={Receipt} count={items.length} onAdd={() => { setF({ status: 'rascunho' }); setOpen(true); }} />
      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : items.length === 0 ? <Empty msg="Nenhuma medição" /> : (
        <Card><Table>
          <TableHeader><TableRow><TableHead>Nº</TableHead><TableHead>Período</TableHead><TableHead>Valor</TableHead><TableHead>% físico</TableHead><TableHead>% acum.</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>{items.map(m => (
            <TableRow key={m.id}>
              <TableCell className="text-xs font-medium">{m.numero}</TableCell>
              <TableCell className="text-xs">{fmtDate(m.periodo_inicio)} → {fmtDate(m.periodo_fim)}</TableCell>
              <TableCell className="text-xs font-medium">{fmtBRL(m.valor_medido)}</TableCell>
              <TableCell className="text-xs">{Number(m.percentual_fisico).toFixed(1)}%</TableCell>
              <TableCell className="text-xs">{Number(m.percentual_acumulado).toFixed(1)}%</TableCell>
              <TableCell><Badge variant="outline" className="text-[10px] capitalize">{m.status}</Badge></TableCell>
              <TableCell><Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteRow('contrato_medicoes', m.id, refresh)}><Trash2 className="h-3.5 w-3.5" /></Button></TableCell>
            </TableRow>
          ))}</TableBody>
        </Table></Card>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova medição</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Número *"><Input value={f.numero || ''} onChange={e => setF({ ...f, numero: e.target.value })} /></Field>
            <Field label="Status">
              <Select value={f.status} onValueChange={v => setF({ ...f, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['rascunho', 'enviada', 'atestada', 'paga', 'glosada'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Período início *"><Input type="date" value={f.periodo_inicio || ''} onChange={e => setF({ ...f, periodo_inicio: e.target.value })} /></Field>
            <Field label="Período fim *"><Input type="date" value={f.periodo_fim || ''} onChange={e => setF({ ...f, periodo_fim: e.target.value })} /></Field>
            <Field label="Valor medido (R$)"><Input type="number" step="0.01" value={f.valor_medido || ''} onChange={e => setF({ ...f, valor_medido: e.target.value })} /></Field>
            <Field label="% físico do período"><Input type="number" step="0.01" value={f.percentual_fisico || ''} onChange={e => setF({ ...f, percentual_fisico: e.target.value })} /></Field>
            <Field label="Fiscal aprovador"><Input value={f.fiscal_aprovador_nome || ''} onChange={e => setF({ ...f, fiscal_aprovador_nome: e.target.value })} /></Field>
            <div className="col-span-2"><Field label="Observações"><Textarea rows={2} value={f.observacoes || ''} onChange={e => setF({ ...f, observacoes: e.target.value })} /></Field></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------- CRONOGRAMA ----------
function CronogramaSection({ contrato }: { contrato: Contrato }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<any>({});

  const refresh = async () => {
    setLoading(true);
    const { data } = await supabase.from('contrato_cronograma').select('*').eq('contrato_id', contrato.id).order('mes_referencia');
    setItems(data || []); setLoading(false);
  };
  useEffect(() => { refresh(); }, [contrato.id]);

  const save = async () => {
    if (!f.etapa || !f.mes_referencia) return toast.error('Etapa e mês obrigatórios');
    const { error } = await supabase.from('contrato_cronograma').insert({
      contrato_id: contrato.id, cliente_id: contrato.cliente_id,
      ordem: items.length, etapa: f.etapa, descricao: f.descricao || null,
      mes_referencia: f.mes_referencia,
      percentual_previsto: Number(f.percentual_previsto) || 0,
      percentual_realizado: Number(f.percentual_realizado) || 0,
      valor_previsto: Number(f.valor_previsto) || 0,
      valor_realizado: Number(f.valor_realizado) || 0,
      status: f.status || 'previsto',
    });
    if (error) return toast.error(error.message);
    toast.success('Etapa adicionada'); setOpen(false); setF({}); refresh();
  };

  return (
    <div>
      <SubHeader title="Cronograma físico-financeiro" icon={CalendarClock} count={items.length} onAdd={() => { setF({ status: 'previsto' }); setOpen(true); }} />
      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : items.length === 0 ? <Empty msg="Cronograma não cadastrado" /> : (
        <Card><Table>
          <TableHeader><TableRow><TableHead>Mês</TableHead><TableHead>Etapa</TableHead><TableHead>% prev.</TableHead><TableHead>% real.</TableHead><TableHead>R$ prev.</TableHead><TableHead>R$ real.</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>{items.map(c => (
            <TableRow key={c.id}>
              <TableCell className="text-xs">{format(new Date(c.mes_referencia), 'MM/yyyy')}</TableCell>
              <TableCell className="text-xs font-medium">{c.etapa}</TableCell>
              <TableCell className="text-xs">{Number(c.percentual_previsto).toFixed(1)}%</TableCell>
              <TableCell className="text-xs">{Number(c.percentual_realizado).toFixed(1)}%</TableCell>
              <TableCell className="text-xs">{fmtBRL(c.valor_previsto)}</TableCell>
              <TableCell className="text-xs">{fmtBRL(c.valor_realizado)}</TableCell>
              <TableCell><Badge variant="outline" className="text-[10px] capitalize">{c.status}</Badge></TableCell>
              <TableCell><Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteRow('contrato_cronograma', c.id, refresh)}><Trash2 className="h-3.5 w-3.5" /></Button></TableCell>
            </TableRow>
          ))}</TableBody>
        </Table></Card>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova etapa do cronograma</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Etapa *"><Input value={f.etapa || ''} onChange={e => setF({ ...f, etapa: e.target.value })} /></Field>
            <Field label="Mês referência *"><Input type="month" value={f.mes_referencia ? f.mes_referencia.substring(0, 7) : ''} onChange={e => setF({ ...f, mes_referencia: e.target.value + '-01' })} /></Field>
            <div className="col-span-2"><Field label="Descrição"><Textarea rows={2} value={f.descricao || ''} onChange={e => setF({ ...f, descricao: e.target.value })} /></Field></div>
            <Field label="% previsto"><Input type="number" step="0.01" value={f.percentual_previsto || ''} onChange={e => setF({ ...f, percentual_previsto: e.target.value })} /></Field>
            <Field label="% realizado"><Input type="number" step="0.01" value={f.percentual_realizado || ''} onChange={e => setF({ ...f, percentual_realizado: e.target.value })} /></Field>
            <Field label="Valor previsto"><Input type="number" step="0.01" value={f.valor_previsto || ''} onChange={e => setF({ ...f, valor_previsto: e.target.value })} /></Field>
            <Field label="Valor realizado"><Input type="number" step="0.01" value={f.valor_realizado || ''} onChange={e => setF({ ...f, valor_realizado: e.target.value })} /></Field>
            <Field label="Status">
              <Select value={f.status} onValueChange={v => setF({ ...f, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['previsto', 'em_andamento', 'concluido', 'atrasado'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------- FATURAS / NFs ----------
function FaturasSection({ contrato, onChanged }: { contrato: Contrato; onChanged: () => void }) {
  const { items, loading, refresh } = useSubList<any>('contrato_faturas', contrato.id);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<any>({});

  const save = async () => {
    if (!f.numero_nf || !f.data_emissao || !f.valor_bruto) return toast.error('NF, emissão e valor bruto obrigatórios');
    const { error } = await supabase.from('contrato_faturas').insert({
      contrato_id: contrato.id, cliente_id: contrato.cliente_id,
      numero_nf: f.numero_nf, serie: f.serie || null,
      data_emissao: f.data_emissao, data_vencimento: f.data_vencimento || null,
      data_atesto: f.data_atesto || null, data_pagamento: f.data_pagamento || null,
      valor_bruto: Number(f.valor_bruto),
      retencao_iss: Number(f.retencao_iss) || 0,
      retencao_inss: Number(f.retencao_inss) || 0,
      retencao_ir: Number(f.retencao_ir) || 0,
      retencao_pis_cofins_csll: Number(f.retencao_pis_cofins_csll) || 0,
      retencao_garantia: Number(f.retencao_garantia) || 0,
      outras_retencoes: Number(f.outras_retencoes) || 0,
      status: f.status || 'emitida',
    });
    if (error) return toast.error(error.message);
    if (f.status === 'paga' || f.data_pagamento) {
      const novoExec = Number(contrato.valor_executado) + Number(f.valor_bruto);
      await supabase.from('contratos').update({ valor_executado: novoExec }).eq('id', contrato.id);
      onChanged();
    }
    toast.success('Fatura registrada'); setOpen(false); setF({}); refresh();
  };

  const totalBruto = items.reduce((s, i) => s + Number(i.valor_bruto || 0), 0);
  const totalLiquido = items.reduce((s, i) => s + Number(i.valor_liquido || 0), 0);
  const totalPago = items.filter(i => i.status === 'paga').reduce((s, i) => s + Number(i.valor_bruto || 0), 0);

  return (
    <div>
      <SubHeader title="Faturamento (NFs)" icon={Banknote} count={items.length} onAdd={() => { setF({ status: 'emitida' }); setOpen(true); }} />
      <div className="grid grid-cols-3 gap-3 mb-3">
        <Mini label="Bruto" value={fmtBRL(totalBruto)} />
        <Mini label="Líquido" value={fmtBRL(totalLiquido)} />
        <Mini label="Pago" value={fmtBRL(totalPago)} />
      </div>
      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : items.length === 0 ? <Empty msg="Nenhuma NF lançada" /> : (
        <Card><Table>
          <TableHeader><TableRow><TableHead>NF</TableHead><TableHead>Emissão</TableHead><TableHead>Bruto</TableHead><TableHead>Retenções</TableHead><TableHead>Líquido</TableHead><TableHead>Pagamento</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>{items.map(n => {
            const retencoes = Number(n.retencao_iss || 0) + Number(n.retencao_inss || 0) + Number(n.retencao_ir || 0) + Number(n.retencao_pis_cofins_csll || 0) + Number(n.retencao_garantia || 0) + Number(n.outras_retencoes || 0);
            return (
              <TableRow key={n.id}>
                <TableCell className="text-xs font-medium">{n.numero_nf}{n.serie && `/${n.serie}`}</TableCell>
                <TableCell className="text-xs">{fmtDate(n.data_emissao)}</TableCell>
                <TableCell className="text-xs">{fmtBRL(n.valor_bruto)}</TableCell>
                <TableCell className="text-xs text-red-600">{fmtBRL(retencoes)}</TableCell>
                <TableCell className="text-xs font-medium">{fmtBRL(n.valor_liquido)}</TableCell>
                <TableCell className="text-xs">{fmtDate(n.data_pagamento)}</TableCell>
                <TableCell><Badge variant="outline" className="text-[10px] capitalize">{n.status}</Badge></TableCell>
                <TableCell><Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteRow('contrato_faturas', n.id, refresh)}><Trash2 className="h-3.5 w-3.5" /></Button></TableCell>
              </TableRow>
            );
          })}</TableBody>
        </Table></Card>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Nova nota fiscal</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Número NF *"><Input value={f.numero_nf || ''} onChange={e => setF({ ...f, numero_nf: e.target.value })} /></Field>
            <Field label="Série"><Input value={f.serie || ''} onChange={e => setF({ ...f, serie: e.target.value })} /></Field>
            <Field label="Emissão *"><Input type="date" value={f.data_emissao || ''} onChange={e => setF({ ...f, data_emissao: e.target.value })} /></Field>
            <Field label="Vencimento"><Input type="date" value={f.data_vencimento || ''} onChange={e => setF({ ...f, data_vencimento: e.target.value })} /></Field>
            <Field label="Atesto"><Input type="date" value={f.data_atesto || ''} onChange={e => setF({ ...f, data_atesto: e.target.value })} /></Field>
            <Field label="Pagamento"><Input type="date" value={f.data_pagamento || ''} onChange={e => setF({ ...f, data_pagamento: e.target.value })} /></Field>
            <Field label="Valor bruto *"><Input type="number" step="0.01" value={f.valor_bruto || ''} onChange={e => setF({ ...f, valor_bruto: e.target.value })} /></Field>
            <Field label="Status">
              <Select value={f.status} onValueChange={v => setF({ ...f, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['emitida', 'atestada', 'paga', 'cancelada', 'glosada'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="ISS"><Input type="number" step="0.01" value={f.retencao_iss || ''} onChange={e => setF({ ...f, retencao_iss: e.target.value })} /></Field>
            <Field label="INSS"><Input type="number" step="0.01" value={f.retencao_inss || ''} onChange={e => setF({ ...f, retencao_inss: e.target.value })} /></Field>
            <Field label="IR"><Input type="number" step="0.01" value={f.retencao_ir || ''} onChange={e => setF({ ...f, retencao_ir: e.target.value })} /></Field>
            <Field label="PIS/COFINS/CSLL"><Input type="number" step="0.01" value={f.retencao_pis_cofins_csll || ''} onChange={e => setF({ ...f, retencao_pis_cofins_csll: e.target.value })} /></Field>
            <Field label="Garantia"><Input type="number" step="0.01" value={f.retencao_garantia || ''} onChange={e => setF({ ...f, retencao_garantia: e.target.value })} /></Field>
            <Field label="Outras"><Input type="number" step="0.01" value={f.outras_retencoes || ''} onChange={e => setF({ ...f, outras_retencoes: e.target.value })} /></Field>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save}>Lançar NF</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------- RESCISÃO ----------
function RescisaoSection({ contrato, onChanged }: { contrato: Contrato; onChanged: () => void }) {
  const { items, loading, refresh } = useSubList<any>('contrato_rescisoes', contrato.id);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<any>({});

  const save = async () => {
    if (!f.tipo || !f.data_rescisao) return toast.error('Tipo e data obrigatórios');
    const { error } = await supabase.from('contrato_rescisoes').insert({
      contrato_id: contrato.id, cliente_id: contrato.cliente_id,
      tipo: f.tipo, motivo: f.motivo || null, data_rescisao: f.data_rescisao,
      saldo_remanescente: Number(f.saldo_remanescente) || (Number(contrato.valor_atual) - Number(contrato.valor_executado)),
      multa_aplicada: Number(f.multa_aplicada) || 0,
      responsavel_orgao: f.responsavel_orgao || null, observacoes: f.observacoes || null,
    });
    if (error) return toast.error(error.message);
    await supabase.from('contratos').update({ status: 'rescindido' }).eq('id', contrato.id);
    toast.success('Rescisão registrada'); setOpen(false); setF({}); refresh(); onChanged();
  };

  return (
    <div>
      <SubHeader title="Rescisão" icon={XCircle} count={items.length} onAdd={() => { setF({ tipo: 'amigavel', data_rescisao: new Date().toISOString().split('T')[0] }); setOpen(true); }} />
      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : items.length === 0 ? <Empty msg="Contrato sem rescisão" /> : (
        <Card><CardContent className="p-4 space-y-2">
          {items.map(r => (
            <div key={r.id} className="border rounded-lg p-3 text-sm space-y-1">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="capitalize">{r.tipo}</Badge>
                <span className="text-xs text-muted-foreground">{fmtDate(r.data_rescisao)}</span>
              </div>
              <div className="text-xs"><span className="text-muted-foreground">Motivo:</span> {r.motivo || '—'}</div>
              <div className="text-xs flex gap-4">
                <span><span className="text-muted-foreground">Saldo:</span> {fmtBRL(r.saldo_remanescente)}</span>
                <span><span className="text-muted-foreground">Multa:</span> {fmtBRL(r.multa_aplicada)}</span>
              </div>
              {r.observacoes && <div className="text-xs"><span className="text-muted-foreground">Obs:</span> {r.observacoes}</div>}
              <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive" onClick={() => deleteRow('contrato_rescisoes', r.id, refresh)}><Trash2 className="h-3 w-3 mr-1" />Remover</Button>
            </div>
          ))}
        </CardContent></Card>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar rescisão</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo *">
              <Select value={f.tipo} onValueChange={v => setF({ ...f, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['unilateral', 'amigavel', 'judicial'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Data *"><Input type="date" value={f.data_rescisao || ''} onChange={e => setF({ ...f, data_rescisao: e.target.value })} /></Field>
            <Field label="Saldo remanescente"><Input type="number" step="0.01" value={f.saldo_remanescente || ''} onChange={e => setF({ ...f, saldo_remanescente: e.target.value })} placeholder={String(Number(contrato.valor_atual) - Number(contrato.valor_executado))} /></Field>
            <Field label="Multa aplicada"><Input type="number" step="0.01" value={f.multa_aplicada || ''} onChange={e => setF({ ...f, multa_aplicada: e.target.value })} /></Field>
            <Field label="Responsável (órgão)"><Input value={f.responsavel_orgao || ''} onChange={e => setF({ ...f, responsavel_orgao: e.target.value })} /></Field>
            <div className="col-span-2"><Field label="Motivo"><Textarea rows={2} value={f.motivo || ''} onChange={e => setF({ ...f, motivo: e.target.value })} /></Field></div>
            <div className="col-span-2"><Field label="Observações"><Textarea rows={2} value={f.observacoes || ''} onChange={e => setF({ ...f, observacoes: e.target.value })} /></Field></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save} variant="destructive">Confirmar rescisão</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return <Card className="border-dashed"><CardContent className="py-8 text-center text-sm text-muted-foreground">{msg}</CardContent></Card>;
}

// =========================================================
// Linha do tempo — agrega eventos de todas as sub-tabelas
// =========================================================
type TLEvent = {
  date: string;
  kind: 'assinatura' | 'aditivo' | 'apostilamento' | 'garantia' | 'medicao' | 'fatura_emit' | 'fatura_pago' | 'subcontratacao' | 'rescisao' | 'cronograma';
  title: string;
  description?: string;
  amount?: number;
  badge?: string;
};

const KIND_CFG: Record<TLEvent['kind'], { icon: any; cls: string; ring: string; label: string }> = {
  assinatura:      { icon: FileSignature, cls: 'bg-primary/15 text-primary',                ring: 'ring-primary/30',         label: 'Assinatura' },
  aditivo:         { icon: Layers,        cls: 'bg-amber-500/15 text-amber-600',            ring: 'ring-amber-500/30',       label: 'Aditivo' },
  apostilamento:   { icon: TrendingUp,    cls: 'bg-violet-500/15 text-violet-600',          ring: 'ring-violet-500/30',      label: 'Apostilamento' },
  garantia:        { icon: ShieldCheck,   cls: 'bg-emerald-500/15 text-emerald-600',        ring: 'ring-emerald-500/30',     label: 'Garantia' },
  medicao:         { icon: Receipt,       cls: 'bg-blue-500/15 text-blue-600',              ring: 'ring-blue-500/30',        label: 'Medição' },
  fatura_emit:     { icon: FileText,      cls: 'bg-sky-500/15 text-sky-600',                ring: 'ring-sky-500/30',         label: 'NF emitida' },
  fatura_pago:     { icon: Wallet,        cls: 'bg-emerald-500/15 text-emerald-600',        ring: 'ring-emerald-500/30',     label: 'Pagamento' },
  subcontratacao:  { icon: Building2,     cls: 'bg-indigo-500/15 text-indigo-600',          ring: 'ring-indigo-500/30',      label: 'Subcontratação' },
  rescisao:        { icon: XCircle,       cls: 'bg-red-500/15 text-red-600',                ring: 'ring-red-500/30',         label: 'Rescisão' },
  cronograma:      { icon: CalendarClock, cls: 'bg-muted text-muted-foreground',            ring: 'ring-border',              label: 'Cronograma' },
};

function ContratoTimeline({ contrato }: { contrato: Contrato }) {
  const [events, setEvents] = useState<TLEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<string>('all');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [ad, ap, ga, me, fa, su, re] = await Promise.all([
        supabase.from('contrato_aditivos').select('*').eq('contrato_id', contrato.id),
        supabase.from('contrato_apostilamentos').select('*').eq('contrato_id', contrato.id),
        supabase.from('contrato_garantias').select('*').eq('contrato_id', contrato.id),
        supabase.from('contrato_medicoes').select('*').eq('contrato_id', contrato.id),
        supabase.from('contrato_faturas').select('*').eq('contrato_id', contrato.id),
        supabase.from('contrato_subcontratacoes').select('*').eq('contrato_id', contrato.id),
        supabase.from('contrato_rescisoes').select('*').eq('contrato_id', contrato.id),
      ]);

      const evts: TLEvent[] = [];

      if (contrato.data_assinatura) {
        evts.push({
          date: contrato.data_assinatura, kind: 'assinatura',
          title: `Contrato ${contrato.numero} assinado`,
          description: `${contrato.orgao}${contrato.fornecedor ? ' • ' + contrato.fornecedor : ''}`,
          amount: contrato.valor_original,
        });
      }

      (ad.data || []).forEach((a: any) => evts.push({
        date: a.data_publicacao || a.data_assinatura || a.created_at,
        kind: 'aditivo',
        title: `Termo aditivo ${a.numero_termo}`,
        description: `Tipo: ${a.tipo}${a.prazo_adicional_dias ? ` • +${a.prazo_adicional_dias} dias` : ''}${a.justificativa ? ` — ${a.justificativa}` : ''}`,
        amount: a.valor_alteracao || undefined,
        badge: a.tipo,
      }));

      (ap.data || []).forEach((a: any) => evts.push({
        date: a.data_aplicacao || a.created_at,
        kind: 'apostilamento',
        title: `Apostilamento ${a.numero} (${a.tipo})`,
        description: `${a.indice || '—'} • ${Number(a.percentual).toFixed(2)}% • ${fmtBRL(a.valor_anterior)} → ${fmtBRL(a.valor_novo)}`,
        badge: `${Number(a.percentual).toFixed(2)}%`,
      }));

      (ga.data || []).forEach((g: any) => evts.push({
        date: g.data_emissao || g.data_vigencia_inicio || g.created_at,
        kind: 'garantia',
        title: `Garantia: ${String(g.tipo).replace(/_/g, ' ')}`,
        description: `${g.emissor || 'Emissor não informado'}${g.numero_apolice ? ' • Apólice ' + g.numero_apolice : ''} • vig. até ${fmtDate(g.data_vigencia_fim)}`,
        amount: g.valor,
        badge: g.status,
      }));

      (me.data || []).forEach((m: any) => evts.push({
        date: m.periodo_fim || m.created_at,
        kind: 'medicao',
        title: `Medição ${m.numero}`,
        description: `${fmtDate(m.periodo_inicio)} → ${fmtDate(m.periodo_fim)} • físico ${Number(m.percentual_fisico).toFixed(1)}% (acum. ${Number(m.percentual_acumulado).toFixed(1)}%)`,
        amount: m.valor_medido,
        badge: m.status,
      }));

      (fa.data || []).forEach((nf: any) => {
        evts.push({
          date: nf.data_emissao,
          kind: 'fatura_emit',
          title: `NF ${nf.numero_nf}${nf.serie ? '-' + nf.serie : ''} emitida`,
          description: `Vencimento ${fmtDate(nf.data_vencimento)} • líquido ${fmtBRL(nf.valor_liquido)}`,
          amount: nf.valor_bruto,
          badge: nf.status,
        });
        if (nf.data_pagamento) {
          evts.push({
            date: nf.data_pagamento,
            kind: 'fatura_pago',
            title: `Pagamento NF ${nf.numero_nf} recebido`,
            description: `Líquido após retenções`,
            amount: nf.valor_liquido,
          });
        }
      });

      (su.data || []).forEach((s: any) => evts.push({
        date: s.data_aprovacao || s.data_inicio || s.created_at,
        kind: 'subcontratacao',
        title: `Subcontratação aprovada: ${s.razao_social}`,
        description: `${s.cnpj}${s.objeto_subcontratado ? ' • ' + s.objeto_subcontratado : ''}${s.percentual ? ' • ' + s.percentual + '%' : ''}`,
        amount: s.valor,
        badge: s.status,
      }));

      (re.data || []).forEach((r: any) => evts.push({
        date: r.data_rescisao,
        kind: 'rescisao',
        title: `Rescisão ${r.tipo}`,
        description: r.motivo || 'Sem motivo registrado',
        amount: r.multa_aplicada || undefined,
      }));

      evts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setEvents(evts);
      setLoading(false);
    })();
  }, [contrato.id]);

  const filtered = filtro === 'all' ? events : events.filter(e => e.kind === filtro);

  // Agrupa por mês
  const groups: Record<string, TLEvent[]> = {};
  for (const e of filtered) {
    const key = format(new Date(e.date), 'yyyy-MM');
    (groups[key] ||= []).push(e);
  }
  const groupKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  const counts = events.reduce((acc, e) => { acc[e.kind] = (acc[e.kind] || 0) + 1; return acc; }, {} as Record<string, number>);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  if (events.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          <Activity className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium text-foreground/80">Sem eventos registrados</p>
          <p className="text-xs mt-1">À medida que aditivos, medições, faturas e garantias forem criados, eles aparecerão aqui.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFiltro('all')}
          className={`text-xs px-2.5 py-1 rounded-full border transition ${filtro === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted'}`}
        >
          Todos <span className="opacity-70">({events.length})</span>
        </button>
        {Object.keys(KIND_CFG).map((k) => {
          const cfg = KIND_CFG[k as TLEvent['kind']];
          const c = counts[k] || 0;
          if (c === 0) return null;
          return (
            <button
              key={k}
              onClick={() => setFiltro(k)}
              className={`text-xs px-2.5 py-1 rounded-full border transition flex items-center gap-1.5 ${filtro === k ? cfg.cls + ' border-transparent' : 'bg-background hover:bg-muted'}`}
            >
              <cfg.icon className="h-3 w-3" />
              {cfg.label} <span className="opacity-70">({c})</span>
            </button>
          );
        })}
      </div>

      {/* Timeline */}
      <div className="space-y-6">
        {groupKeys.map((k) => {
          const items = groups[k];
          const groupDate = new Date(k + '-01T00:00:00');
          return (
            <div key={k}>
              <div className="flex items-center gap-3 mb-3">
                <Badge variant="outline" className="text-xs font-medium gap-1.5 capitalize">
                  <CalendarClock className="h-3 w-3" />
                  {format(groupDate, "MMMM 'de' yyyy", { locale: ptBR })}
                </Badge>
                <div className="h-px flex-1 bg-border" />
                <span className="text-[11px] text-muted-foreground">{items.length} evento(s)</span>
              </div>

              <div className="relative pl-9 space-y-3 before:content-[''] before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-px before:bg-border">
                {items.map((e, idx) => {
                  const cfg = KIND_CFG[e.kind];
                  const Icon = cfg.icon;
                  return (
                    <div key={idx} className="relative">
                      <span className={`absolute -left-[26px] top-3 h-6 w-6 rounded-full ring-4 ring-background flex items-center justify-center ${cfg.cls}`}>
                        <Icon className="h-3 w-3" />
                      </span>
                      <Card className="hover:shadow-md transition-shadow">
                        <CardContent className="p-3 flex items-start justify-between gap-3 flex-wrap">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className={`text-[10px] gap-1 ${cfg.cls} border-transparent`}>
                                {cfg.label}
                              </Badge>
                              {e.badge && (
                                <Badge variant="outline" className="text-[10px] capitalize">{e.badge}</Badge>
                              )}
                              <span className="text-[11px] text-muted-foreground tabular-nums">
                                {format(new Date(e.date), "dd/MM/yyyy", { locale: ptBR })}
                                {' • '}
                                {formatDistanceToNow(new Date(e.date), { locale: ptBR, addSuffix: true })}
                              </span>
                            </div>
                            <p className="text-sm font-medium mt-1">{e.title}</p>
                            {e.description && (
                              <p className="text-xs text-muted-foreground mt-0.5">{e.description}</p>
                            )}
                          </div>
                          {e.amount != null && e.amount !== 0 && (
                            <div className="text-right shrink-0">
                              <div className="text-[10px] text-muted-foreground uppercase">Valor</div>
                              <div className="text-sm font-bold tabular-nums">{fmtBRL(e.amount)}</div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
