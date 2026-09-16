import { useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart, AreaChart, Area, RadialBarChart, RadialBar,
} from 'recharts';
import {
  Wallet, DollarSign, FileCheck, Clock, AlertTriangle, CheckCircle2,
  Search, Download, Plus, TrendingDown, TrendingUp, BarChart3, FileText, Receipt, ListChecks,
} from 'lucide-react';

type StatusEmpenho = 'emitido' | 'liquidado' | 'pago' | 'cancelado' | 'anulado_parcial' | 'a_liquidar';
type TipoEmpenho = 'ordinario' | 'estimativo' | 'global';

interface Empenho {
  id: string;
  numero: string;
  cliente: 'STARTGI' | 'ABC';
  contratoNumero: string;
  orgao: string;
  uf: string;
  ng: string; // Natureza da despesa (ex.: 33.90.30)
  fonte: string; // Fonte de recurso
  tipo: TipoEmpenho;
  valorEmpenhado: number;
  valorLiquidado: number;
  valorPago: number;
  saldoUtilizado: number;
  dataEmissao: string;
  dataLiquidacao?: string;
  dataPagamento?: string;
  dataVencimento: string;
  status: StatusEmpenho;
  notaFiscal?: string;
}

const EMPENHOS: Empenho[] = [
  { id: '1', numero: '2025NE000341', cliente: 'STARTGI', contratoNumero: 'CT-2025/118', orgao: 'TRF 3ª Região', uf: 'SP', ng: '44.90.52', fonte: '0100 — Tesouro', tipo: 'ordinario', valorEmpenhado: 1_280_000, valorLiquidado: 1_280_000, valorPago: 1_280_000, saldoUtilizado: 100, dataEmissao: '2025-03-20', dataLiquidacao: '2025-04-10', dataPagamento: '2025-04-25', dataVencimento: '2025-04-30', status: 'pago', notaFiscal: 'NF 18.420' },
  { id: '2', numero: '2025NE000412', cliente: 'STARTGI', contratoNumero: 'CT-2025/118', orgao: 'TRF 3ª Região', uf: 'SP', ng: '44.90.52', fonte: '0100 — Tesouro', tipo: 'ordinario', valorEmpenhado: 980_000, valorLiquidado: 980_000, valorPago: 980_000, saldoUtilizado: 100, dataEmissao: '2025-05-15', dataLiquidacao: '2025-06-05', dataPagamento: '2025-06-18', dataVencimento: '2025-06-20', status: 'pago' },
  { id: '3', numero: '2025NE000587', cliente: 'STARTGI', contratoNumero: 'CT-2025/118', orgao: 'TRF 3ª Região', uf: 'SP', ng: '44.90.52', fonte: '0100 — Tesouro', tipo: 'ordinario', valorEmpenhado: 860_000, valorLiquidado: 860_000, valorPago: 0, saldoUtilizado: 100, dataEmissao: '2026-05-02', dataLiquidacao: '2026-06-12', dataVencimento: '2026-06-25', status: 'liquidado', notaFiscal: 'NF 19.118' },
  { id: '4', numero: '2025NE000601', cliente: 'STARTGI', contratoNumero: 'CT-2025/094', orgao: 'Min. da Justiça', uf: 'DF', ng: '33.90.40', fonte: '0151 — Recursos Próprios', tipo: 'estimativo', valorEmpenhado: 530_000, valorLiquidado: 480_000, valorPago: 480_000, saldoUtilizado: 90, dataEmissao: '2025-04-08', dataLiquidacao: '2025-05-02', dataPagamento: '2025-05-20', dataVencimento: '2025-05-25', status: 'pago' },
  { id: '5', numero: '2025NE000714', cliente: 'STARTGI', contratoNumero: 'CT-2024/342', orgao: 'Banco do Brasil S.A.', uf: 'DF', ng: '33.90.40', fonte: '0250 — Operação', tipo: 'global', valorEmpenhado: 2_240_000, valorLiquidado: 2_240_000, valorPago: 2_240_000, saldoUtilizado: 100, dataEmissao: '2025-02-28', dataLiquidacao: '2025-03-20', dataPagamento: '2025-04-05', dataVencimento: '2025-04-10', status: 'pago' },
  { id: '6', numero: '2026NE000118', cliente: 'STARTGI', contratoNumero: 'CT-2024/342', orgao: 'Banco do Brasil S.A.', uf: 'DF', ng: '33.90.40', fonte: '0250 — Operação', tipo: 'global', valorEmpenhado: 2_240_000, valorLiquidado: 0, valorPago: 0, saldoUtilizado: 0, dataEmissao: '2026-02-15', dataVencimento: '2026-07-15', status: 'a_liquidar' },
  { id: '7', numero: '2025NE001207', cliente: 'STARTGI', contratoNumero: 'CT-2025/152', orgao: 'TJ-MG', uf: 'MG', ng: '44.90.52', fonte: '0100 — Tesouro', tipo: 'ordinario', valorEmpenhado: 1_870_000, valorLiquidado: 1_870_000, valorPago: 1_870_000, saldoUtilizado: 100, dataEmissao: '2025-06-10', dataLiquidacao: '2025-07-04', dataPagamento: '2025-07-20', dataVencimento: '2025-07-25', status: 'pago' },
  { id: '8', numero: '2025NE000089', cliente: 'STARTGI', contratoNumero: 'CT-2024/198', orgao: 'INSS', uf: 'DF', ng: '44.90.52', fonte: '0153 — Seguridade', tipo: 'global', valorEmpenhado: 3_780_000, valorLiquidado: 3_780_000, valorPago: 3_780_000, saldoUtilizado: 100, dataEmissao: '2024-05-22', dataLiquidacao: '2024-06-30', dataPagamento: '2024-08-12', dataVencimento: '2024-08-15', status: 'pago' },
  { id: '9', numero: '2025NE000932', cliente: 'ABC', contratoNumero: 'CT-2025/207', orgao: 'HC FMUSP', uf: 'SP', ng: '44.90.52', fonte: '0102 — Seguridade', tipo: 'ordinario', valorEmpenhado: 1_090_000, valorLiquidado: 1_090_000, valorPago: 1_090_000, saldoUtilizado: 100, dataEmissao: '2025-05-12', dataLiquidacao: '2025-06-08', dataPagamento: '2025-06-22', dataVencimento: '2025-06-25', status: 'pago' },
  { id: '10', numero: '2025NE001088', cliente: 'ABC', contratoNumero: 'CT-2025/207', orgao: 'HC FMUSP', uf: 'SP', ng: '44.90.52', fonte: '0102 — Seguridade', tipo: 'ordinario', valorEmpenhado: 1_090_000, valorLiquidado: 1_090_000, valorPago: 0, saldoUtilizado: 100, dataEmissao: '2026-04-15', dataLiquidacao: '2026-05-30', dataVencimento: '2026-06-15', status: 'liquidado' },
  { id: '11', numero: '2024NE000503', cliente: 'ABC', contratoNumero: 'CT-2024/411', orgao: 'SES-RJ', uf: 'RJ', ng: '44.90.52', fonte: '0151 — Estadual', tipo: 'global', valorEmpenhado: 3_550_000, valorLiquidado: 3_550_000, valorPago: 3_550_000, saldoUtilizado: 100, dataEmissao: '2024-12-05', dataLiquidacao: '2025-01-30', dataPagamento: '2025-03-20', dataVencimento: '2025-02-15', status: 'pago' },
  { id: '12', numero: '2025NE000844', cliente: 'ABC', contratoNumero: 'CT-2024/411', orgao: 'SES-RJ', uf: 'RJ', ng: '33.90.39', fonte: '0151 — Estadual', tipo: 'estimativo', valorEmpenhado: 1_800_000, valorLiquidado: 1_200_000, valorPago: 1_200_000, saldoUtilizado: 67, dataEmissao: '2025-06-18', dataLiquidacao: '2025-08-04', dataPagamento: '2025-08-22', dataVencimento: '2025-09-01', status: 'pago' },
  { id: '13', numero: '2025NE001311', cliente: 'ABC', contratoNumero: 'CT-2025/038', orgao: 'H. Albert Einstein', uf: 'SP', ng: '44.90.52', fonte: '0181 — PROADI', tipo: 'ordinario', valorEmpenhado: 1_480_000, valorLiquidado: 1_480_000, valorPago: 1_480_000, saldoUtilizado: 100, dataEmissao: '2025-02-10', dataLiquidacao: '2025-03-05', dataPagamento: '2025-03-25', dataVencimento: '2025-04-01', status: 'pago' },
  { id: '14', numero: '2026NE000201', cliente: 'ABC', contratoNumero: 'CT-2025/038', orgao: 'H. Albert Einstein', uf: 'SP', ng: '44.90.52', fonte: '0181 — PROADI', tipo: 'ordinario', valorEmpenhado: 1_480_000, valorLiquidado: 0, valorPago: 0, saldoUtilizado: 0, dataEmissao: '2026-05-20', dataVencimento: '2026-07-10', status: 'a_liquidar' },
  { id: '15', numero: '2024NE000777', cliente: 'ABC', contratoNumero: 'CT-2024/289', orgao: 'Min. da Saúde', uf: 'DF', ng: '44.90.52', fonte: '0153 — Saúde', tipo: 'global', valorEmpenhado: 5_120_000, valorLiquidado: 5_120_000, valorPago: 5_120_000, saldoUtilizado: 100, dataEmissao: '2024-07-15', dataLiquidacao: '2024-09-04', dataPagamento: '2024-10-22', dataVencimento: '2024-10-25', status: 'pago' },
  { id: '16', numero: '2025NE001445', cliente: 'ABC', contratoNumero: 'CT-2025/221', orgao: 'SES-BA', uf: 'BA', ng: '44.90.52', fonte: '0151 — Estadual', tipo: 'ordinario', valorEmpenhado: 740_000, valorLiquidado: 740_000, valorPago: 0, saldoUtilizado: 100, dataEmissao: '2025-06-10', dataLiquidacao: '2025-08-04', dataVencimento: '2025-09-01', status: 'liquidado' },
  { id: '17', numero: '2025NE000302', cliente: 'STARTGI', contratoNumero: 'CT-2025/061', orgao: 'Pref. Campinas', uf: 'SP', ng: '44.90.52', fonte: '0100 — Tesouro', tipo: 'ordinario', valorEmpenhado: 1_240_000, valorLiquidado: 1_240_000, valorPago: 1_240_000, saldoUtilizado: 100, dataEmissao: '2025-03-04', dataLiquidacao: '2025-04-22', dataPagamento: '2025-05-15', dataVencimento: '2025-05-20', status: 'pago' },
  { id: '18', numero: '2023NE002104', cliente: 'STARTGI', contratoNumero: 'CT-2023/501', orgao: 'Polícia Federal', uf: 'DF', ng: '33.90.40', fonte: '0151 — Segurança', tipo: 'estimativo', valorEmpenhado: 280_000, valorLiquidado: 0, valorPago: 0, saldoUtilizado: 0, dataEmissao: '2025-01-12', dataVencimento: '2025-04-15', status: 'cancelado' },
];

const STATUS_LABEL: Record<StatusEmpenho, { label: string; cls: string }> = {
  emitido: { label: 'Emitido', cls: 'bg-blue-500/15 text-blue-600' },
  a_liquidar: { label: 'A liquidar', cls: 'bg-cyan-500/15 text-cyan-600' },
  liquidado: { label: 'Liquidado', cls: 'bg-amber-500/15 text-amber-600' },
  pago: { label: 'Pago', cls: 'bg-emerald-500/15 text-emerald-600' },
  anulado_parcial: { label: 'Anulado parcial', cls: 'bg-orange-500/15 text-orange-600' },
  cancelado: { label: 'Cancelado', cls: 'bg-red-500/15 text-red-600' },
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const fmtBRLk = (v: number) => v >= 1e6 ? `R$ ${(v / 1e6).toFixed(1)}M` : `R$ ${(v / 1e3).toFixed(0)}k`;
const diasEntre = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);

const FLUXO_MENSAL = [
  { mes: 'Jul/25', emitido: 2_800_000, liquidado: 2_100_000, pago: 1_960_000 },
  { mes: 'Ago/25', emitido: 3_200_000, liquidado: 2_640_000, pago: 2_410_000 },
  { mes: 'Set/25', emitido: 3_900_000, liquidado: 3_120_000, pago: 2_890_000 },
  { mes: 'Out/25', emitido: 3_450_000, liquidado: 2_980_000, pago: 2_710_000 },
  { mes: 'Nov/25', emitido: 4_200_000, liquidado: 3_780_000, pago: 3_220_000 },
  { mes: 'Dez/25', emitido: 4_980_000, liquidado: 4_320_000, pago: 3_980_000 },
  { mes: 'Jan/26', emitido: 4_120_000, liquidado: 3_640_000, pago: 3_140_000 },
  { mes: 'Fev/26', emitido: 4_380_000, liquidado: 3_920_000, pago: 3_420_000 },
  { mes: 'Mar/26', emitido: 4_710_000, liquidado: 4_180_000, pago: 3_780_000 },
  { mes: 'Abr/26', emitido: 5_120_000, liquidado: 4_620_000, pago: 4_120_000 },
  { mes: 'Mai/26', emitido: 5_480_000, liquidado: 4_810_000, pago: 4_310_000 },
  { mes: 'Jun/26', emitido: 5_840_000, liquidado: 5_120_000, pago: 4_580_000 },
];

export default function EmpenhosDashboard() {
  const [clienteFilter, setClienteFilter] = useState<'todos' | 'STARTGI' | 'ABC'>('todos');
  const [statusFilter, setStatusFilter] = useState<'todos' | StatusEmpenho>('todos');
  const [search, setSearch] = useState('');

  const filtrados = useMemo(() => EMPENHOS.filter(e => {
    if (clienteFilter !== 'todos' && e.cliente !== clienteFilter) return false;
    if (statusFilter !== 'todos' && e.status !== statusFilter) return false;
    if (search && !`${e.numero} ${e.orgao} ${e.contratoNumero}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [clienteFilter, statusFilter, search]);

  const kpis = useMemo(() => {
    const empenhado = filtrados.reduce((s, e) => s + e.valorEmpenhado, 0);
    const liquidado = filtrados.reduce((s, e) => s + e.valorLiquidado, 0);
    const pago = filtrados.reduce((s, e) => s + e.valorPago, 0);
    const aReceber = liquidado - pago;
    const aLiquidar = empenhado - liquidado;
    const totalAtivos = filtrados.filter(e => e.status !== 'cancelado').length;
    const vencidos = filtrados.filter(e =>
      e.status === 'liquidado' && new Date(e.dataVencimento).getTime() < Date.now()
    ).length;
    // Prazo médio de pagamento (emissão → pagamento, em dias) p/ pagos
    const pagos = filtrados.filter(e => e.status === 'pago' && e.dataPagamento);
    const prazoMedio = pagos.length
      ? Math.round(pagos.reduce((s, e) => s + diasEntre(e.dataEmissao, e.dataPagamento!), 0) / pagos.length)
      : 0;
    return { empenhado, liquidado, pago, aReceber, aLiquidar, totalAtivos, vencidos, prazoMedio };
  }, [filtrados]);

  const porStatus = useMemo(() => {
    const map = new Map<string, { name: string; value: number }>();
    filtrados.forEach(e => {
      const label = STATUS_LABEL[e.status].label;
      const cur = map.get(label) || { name: label, value: 0 };
      cur.value += e.valorEmpenhado;
      map.set(label, cur);
    });
    return Array.from(map.values());
  }, [filtrados]);

  const porFonte = useMemo(() => {
    const map = new Map<string, number>();
    filtrados.forEach(e => map.set(e.fonte, (map.get(e.fonte) || 0) + e.valorEmpenhado));
    return Array.from(map.entries())
      .map(([fonte, valor]) => ({ fonte: fonte.length > 22 ? fonte.slice(0, 20) + '…' : fonte, valor }))
      .sort((a, b) => b.valor - a.valor);
  }, [filtrados]);

  const porNG = useMemo(() => {
    const map = new Map<string, number>();
    filtrados.forEach(e => map.set(e.ng, (map.get(e.ng) || 0) + e.valorEmpenhado));
    return Array.from(map.entries()).map(([ng, valor]) => ({ ng, valor }));
  }, [filtrados]);

  // Funil de execução
  const funil = [
    { etapa: 'Empenhado', valor: kpis.empenhado, fill: '#3b82f6' },
    { etapa: 'Liquidado', valor: kpis.liquidado, fill: '#f59e0b' },
    { etapa: 'Pago', valor: kpis.pago, fill: '#10b981' },
  ];

  return (
    <MainLayout title="Dashboard de Empenhos" subtitle="Gestão financeira e fluxo de execução orçamentária">
      <div className="space-y-6">
        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar por NE, órgão ou contrato…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={clienteFilter} onValueChange={(v: any) => setClienteFilter(v)}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os clientes</SelectItem>
              <SelectItem value="STARTGI">STARTGI</SelectItem>
              <SelectItem value="ABC">ABC EQUIPAMENTOS</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              {Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Exportar</Button>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" />Novo empenho</Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard icon={Wallet} color="text-blue-600" bg="bg-blue-500/10" label="Empenhado" value={fmtBRL(kpis.empenhado)} sub={`${kpis.totalAtivos} NE ativas`} />
          <KpiCard icon={FileCheck} color="text-amber-600" bg="bg-amber-500/10" label="Liquidado" value={fmtBRL(kpis.liquidado)} sub={`A liquidar: ${fmtBRL(kpis.aLiquidar)}`} />
          <KpiCard icon={CheckCircle2} color="text-emerald-600" bg="bg-emerald-500/10" label="Pago" value={fmtBRL(kpis.pago)} sub={`A receber: ${fmtBRL(kpis.aReceber)}`} />
          <KpiCard icon={Clock} color="text-violet-600" bg="bg-violet-500/10" label="Prazo médio pagto" value={`${kpis.prazoMedio} dias`} sub={`${kpis.vencidos} liquidados em atraso`} />
        </div>

        <Tabs defaultValue="visao" className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="visao"><BarChart3 className="h-4 w-4 mr-2" />Visão geral</TabsTrigger>
            <TabsTrigger value="fluxo"><TrendingUp className="h-4 w-4 mr-2" />Fluxo</TabsTrigger>
            <TabsTrigger value="orcamentario"><Receipt className="h-4 w-4 mr-2" />Orçamentário</TabsTrigger>
            <TabsTrigger value="lista"><ListChecks className="h-4 w-4 mr-2" />Empenhos</TabsTrigger>
          </TabsList>

          <TabsContent value="visao" className="space-y-4 mt-4">
            <div className="grid lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-sm">Funil de execução</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadialBarChart innerRadius="25%" outerRadius="100%" data={funil}>
                      <RadialBar dataKey="valor" cornerRadius={6} />
                      <Tooltip formatter={(v: number) => fmtBRL(v)} />
                      <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-2">
                    {funil.map(f => {
                      const pct = (f.valor / kpis.empenhado) * 100;
                      return (
                        <div key={f.etapa} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-medium">{f.etapa}</span>
                            <span>{fmtBRL(f.valor)} <span className="text-muted-foreground">({pct.toFixed(0)}%)</span></span>
                          </div>
                          <Progress value={pct} className="h-1.5" />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
              <Card className="lg:col-span-2">
                <CardHeader><CardTitle className="text-sm">Empenhos por fonte de recurso</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={porFonte} layout="vertical" margin={{ left: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis type="number" tickFormatter={fmtBRLk} fontSize={11} />
                      <YAxis type="category" dataKey="fonte" fontSize={10} width={170} />
                      <Tooltip formatter={(v: number) => fmtBRL(v)} />
                      <Bar dataKey="valor" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-sm">Distribuição por status</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={porStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2}>
                        {porStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => fmtBRL(v)} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-sm">Por natureza de despesa</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={porNG}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="ng" fontSize={11} />
                      <YAxis tickFormatter={fmtBRLk} fontSize={11} />
                      <Tooltip formatter={(v: number) => fmtBRL(v)} />
                      <Bar dataKey="valor" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="fluxo" className="space-y-4 mt-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Fluxo de execução orçamentária — 12 meses</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={340}>
                  <ComposedChart data={FLUXO_MENSAL}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="mes" fontSize={11} />
                    <YAxis tickFormatter={fmtBRLk} fontSize={11} />
                    <Tooltip formatter={(v: number) => fmtBRL(v)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="emitido" name="Empenhado" fill="#bfdbfe" radius={[4, 4, 0, 0]} />
                    <Line dataKey="liquidado" name="Liquidado" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} />
                    <Line dataKey="pago" name="Pago" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-sm">Gap empenhado → pago (acumulado)</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={230}>
                    <AreaChart data={FLUXO_MENSAL.map((m, i, a) => {
                      const acc = (k: keyof typeof m) => a.slice(0, i + 1).reduce((s, x) => s + (x[k] as number), 0);
                      return { mes: m.mes, gap: acc('emitido') - acc('pago') };
                    })}>
                      <defs>
                        <linearGradient id="gap" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ef4444" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="mes" fontSize={11} />
                      <YAxis tickFormatter={fmtBRLk} fontSize={11} />
                      <Tooltip formatter={(v: number) => fmtBRL(v)} />
                      <Area type="monotone" dataKey="gap" stroke="#ef4444" fill="url(#gap)" name="Saldo pendente" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-sm">Indicadores de prazo</CardTitle></CardHeader>
                <CardContent className="space-y-4 py-6">
                  <PrazoMetric label="Emissão → Liquidação" dias={32} max={60} color="bg-amber-500" />
                  <PrazoMetric label="Liquidação → Pagamento" dias={18} max={30} color="bg-emerald-500" />
                  <PrazoMetric label="Emissão → Pagamento (ciclo total)" dias={kpis.prazoMedio} max={90} color="bg-blue-500" />
                  <div className="pt-2 border-t flex items-center justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <TrendingDown className="h-3.5 w-3.5 text-emerald-600" /> Redução vs. trimestre anterior
                    </span>
                    <span className="font-semibold text-emerald-600">−12 dias</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="orcamentario" className="space-y-4 mt-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Saldo de empenho por contrato</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contrato</TableHead>
                      <TableHead>Órgão</TableHead>
                      <TableHead className="text-right">Empenhado</TableHead>
                      <TableHead className="text-right">Liquidado</TableHead>
                      <TableHead className="text-right">Pago</TableHead>
                      <TableHead className="w-[140px]">Execução</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.values(filtrados.reduce<Record<string, any>>((acc, e) => {
                      const key = e.contratoNumero;
                      if (!acc[key]) acc[key] = { contrato: e.contratoNumero, orgao: e.orgao, empenhado: 0, liquidado: 0, pago: 0 };
                      acc[key].empenhado += e.valorEmpenhado;
                      acc[key].liquidado += e.valorLiquidado;
                      acc[key].pago += e.valorPago;
                      return acc;
                    }, {})).map((r: any) => {
                      const pct = r.empenhado ? (r.pago / r.empenhado) * 100 : 0;
                      return (
                        <TableRow key={r.contrato}>
                          <TableCell className="font-medium text-xs">{r.contrato}</TableCell>
                          <TableCell className="text-xs">{r.orgao}</TableCell>
                          <TableCell className="text-right text-xs">{fmtBRL(r.empenhado)}</TableCell>
                          <TableCell className="text-right text-xs">{fmtBRL(r.liquidado)}</TableCell>
                          <TableCell className="text-right text-xs font-medium text-emerald-600">{fmtBRL(r.pago)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={pct} className="h-1.5 flex-1" />
                              <span className="text-[10px] w-8">{pct.toFixed(0)}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="lista" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nº Empenho</TableHead>
                      <TableHead>Contrato</TableHead>
                      <TableHead>Órgão / UF</TableHead>
                      <TableHead>ND / Fonte</TableHead>
                      <TableHead className="text-right">Empenhado</TableHead>
                      <TableHead className="text-right">Pago</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtrados.map(e => (
                      <TableRow key={e.id}>
                        <TableCell className="font-mono text-xs">{e.numero}</TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="outline" className="text-[10px] mr-1">{e.cliente}</Badge>
                          {e.contratoNumero}
                        </TableCell>
                        <TableCell className="text-xs">{e.orgao} <span className="text-muted-foreground">/{e.uf}</span></TableCell>
                        <TableCell className="text-[10px] text-muted-foreground">{e.ng}<br/>{e.fonte}</TableCell>
                        <TableCell className="text-right text-xs">{fmtBRL(e.valorEmpenhado)}</TableCell>
                        <TableCell className="text-right text-xs font-medium text-emerald-600">{fmtBRL(e.valorPago)}</TableCell>
                        <TableCell className="text-xs">{new Date(e.dataVencimento).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell><Badge className={`text-[10px] ${STATUS_LABEL[e.status].cls}`}>{STATUS_LABEL[e.status].label}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

function KpiCard({ icon: Icon, color, bg, label, value, sub }: any) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>
          </div>
          <div className={`p-2 rounded-lg ${bg}`}><Icon className={`h-5 w-5 ${color}`} /></div>
        </div>
      </CardContent>
    </Card>
  );
}

function PrazoMetric({ label, dias, max, color }: { label: string; dias: number; max: number; color: string }) {
  const pct = Math.min(100, (dias / max) * 100);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{dias} / {max} dias</span>
      </div>
      <div className="h-2 bg-muted rounded">
        <div className={`h-full rounded ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
