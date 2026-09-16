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
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart,
} from 'recharts';
import {
  FileSignature, DollarSign, Calendar, TrendingUp, AlertCircle, Clock, CheckCircle2,
  Search, Download, Plus, Building2, FileText, BarChart3, ShieldAlert, Layers,
} from 'lucide-react';

// ============ MOCK DATA ============
type StatusContrato = 'vigente' | 'em_execucao' | 'aditado' | 'encerrado' | 'rescindido' | 'em_renovacao';

interface Contrato {
  id: string;
  numero: string;
  cliente: 'STARTGI' | 'ABC';
  orgao: string;
  uf: string;
  objeto: string;
  modalidade: string;
  valorOriginal: number;
  valorAtual: number;
  valorExecutado: number;
  dataAssinatura: string;
  dataFimVigencia: string;
  status: StatusContrato;
  aditivos: number;
  empenhosAtivos: number;
  responsavel: string;
  garantia: number;
}

const CONTRATOS: Contrato[] = [
  { id: '1', numero: 'CT-2025/118', cliente: 'STARTGI', orgao: 'Tribunal Regional Federal 3ª Região', uf: 'SP', objeto: 'Fornecimento de servidores rack Dell PowerEdge R760', modalidade: 'Pregão Eletrônico', valorOriginal: 4_280_000, valorAtual: 4_280_000, valorExecutado: 3_120_000, dataAssinatura: '2025-03-12', dataFimVigencia: '2026-03-11', status: 'em_execucao', aditivos: 0, empenhosAtivos: 4, responsavel: 'Camila Souza', garantia: 214_000 },
  { id: '2', numero: 'CT-2025/094', cliente: 'STARTGI', orgao: 'Ministério da Justiça', uf: 'DF', objeto: 'Solução de backup corporativo Veeam — 36 meses', modalidade: 'Pregão Eletrônico SRP', valorOriginal: 1_870_000, valorAtual: 2_120_000, valorExecutado: 980_000, dataAssinatura: '2025-01-22', dataFimVigencia: '2028-01-21', status: 'aditado', aditivos: 1, empenhosAtivos: 2, responsavel: 'Ricardo Lima', garantia: 106_000 },
  { id: '3', numero: 'CT-2024/342', cliente: 'STARTGI', orgao: 'Banco do Brasil S.A.', uf: 'DF', objeto: 'Licenciamento Microsoft 365 E5 — 5.200 estações', modalidade: 'Inexigibilidade', valorOriginal: 8_960_000, valorAtual: 8_960_000, valorExecutado: 6_720_000, dataAssinatura: '2024-09-03', dataFimVigencia: '2026-09-02', status: 'em_execucao', aditivos: 0, empenhosAtivos: 6, responsavel: 'Camila Souza', garantia: 448_000 },
  { id: '4', numero: 'CT-2025/061', cliente: 'STARTGI', orgao: 'Prefeitura de Campinas', uf: 'SP', objeto: 'Switches Cisco Catalyst e implantação', modalidade: 'Pregão Eletrônico', valorOriginal: 1_240_000, valorAtual: 1_240_000, valorExecutado: 1_240_000, dataAssinatura: '2025-02-18', dataFimVigencia: '2025-12-15', status: 'vigente', aditivos: 0, empenhosAtivos: 1, responsavel: 'André Pires', garantia: 62_000 },
  { id: '5', numero: 'CT-2025/207', cliente: 'ABC', orgao: 'Hospital das Clínicas FMUSP', uf: 'SP', objeto: 'Monitores multiparâmetros IntelliVue MX750 — 48 un.', modalidade: 'Pregão Eletrônico', valorOriginal: 6_540_000, valorAtual: 6_540_000, valorExecutado: 2_180_000, dataAssinatura: '2025-04-30', dataFimVigencia: '2026-04-29', status: 'em_execucao', aditivos: 0, empenhosAtivos: 3, responsavel: 'Mariana Castro', garantia: 327_000 },
  { id: '6', numero: 'CT-2024/411', cliente: 'ABC', orgao: 'Secretaria Estadual de Saúde RJ', uf: 'RJ', objeto: 'Tomógrafo Ingenuity Elite 128 canais + manutenção 60m', modalidade: 'Pregão Eletrônico', valorOriginal: 12_800_000, valorAtual: 13_400_000, valorExecutado: 7_100_000, dataAssinatura: '2024-11-15', dataFimVigencia: '2029-11-14', status: 'aditado', aditivos: 2, empenhosAtivos: 5, responsavel: 'Felipe Andrade', garantia: 670_000 },
  { id: '7', numero: 'CT-2025/038', cliente: 'ABC', orgao: 'Hospital Albert Einstein (PROADI-SUS)', uf: 'SP', objeto: 'Ultrassom EPIQ Elite — cardiologia (6 un.)', modalidade: 'Dispensa de Licitação', valorOriginal: 3_420_000, valorAtual: 3_420_000, valorExecutado: 2_960_000, dataAssinatura: '2025-01-08', dataFimVigencia: '2025-12-30', status: 'em_execucao', aditivos: 0, empenhosAtivos: 2, responsavel: 'Mariana Castro', garantia: 171_000 },
  { id: '8', numero: 'CT-2024/289', cliente: 'ABC', orgao: 'Ministério da Saúde', uf: 'DF', objeto: 'Desfibriladores HeartStart FRx — Programa Nacional', modalidade: 'Pregão Eletrônico SRP', valorOriginal: 5_120_000, valorAtual: 5_120_000, valorExecutado: 5_120_000, dataAssinatura: '2024-06-20', dataFimVigencia: '2025-06-19', status: 'encerrado', aditivos: 0, empenhosAtivos: 0, responsavel: 'Felipe Andrade', garantia: 0 },
  { id: '9', numero: 'CT-2025/152', cliente: 'STARTGI', orgao: 'Tribunal de Justiça MG', uf: 'MG', objeto: 'Notebooks Latitude 5450 — 800 un. + suporte 36m', modalidade: 'Pregão Eletrônico SRP', valorOriginal: 6_240_000, valorAtual: 6_240_000, valorExecutado: 1_870_000, dataAssinatura: '2025-05-14', dataFimVigencia: '2028-05-13', status: 'em_execucao', aditivos: 0, empenhosAtivos: 3, responsavel: 'Ricardo Lima', garantia: 312_000 },
  { id: '10', numero: 'CT-2024/198', cliente: 'STARTGI', orgao: 'INSS', uf: 'DF', objeto: 'Storage HPE Primera A650 + 5 anos suporte', modalidade: 'Pregão Eletrônico', valorOriginal: 3_780_000, valorAtual: 3_780_000, valorExecutado: 3_780_000, dataAssinatura: '2024-04-10', dataFimVigencia: '2029-04-09', status: 'em_execucao', aditivos: 0, empenhosAtivos: 1, responsavel: 'André Pires', garantia: 189_000 },
  { id: '11', numero: 'CT-2025/221', cliente: 'ABC', orgao: 'SES Bahia', uf: 'BA', objeto: 'Respiradores V60 — UTI adulto/pediátrica (24 un.)', modalidade: 'Pregão Eletrônico', valorOriginal: 2_980_000, valorAtual: 2_980_000, valorExecutado: 740_000, dataAssinatura: '2025-06-02', dataFimVigencia: '2026-06-01', status: 'em_execucao', aditivos: 0, empenhosAtivos: 2, responsavel: 'Felipe Andrade', garantia: 149_000 },
  { id: '12', numero: 'CT-2023/501', cliente: 'STARTGI', orgao: 'Polícia Federal', uf: 'DF', objeto: 'Plataforma de cibersegurança SOC — 24 meses', modalidade: 'Pregão Eletrônico', valorOriginal: 4_120_000, valorAtual: 4_650_000, valorExecutado: 4_650_000, dataAssinatura: '2023-08-30', dataFimVigencia: '2025-08-29', status: 'em_renovacao', aditivos: 1, empenhosAtivos: 0, responsavel: 'Camila Souza', garantia: 232_500 },
];

const STATUS_LABEL: Record<StatusContrato, { label: string; cls: string }> = {
  vigente: { label: 'Vigente', cls: 'bg-emerald-500/15 text-emerald-600' },
  em_execucao: { label: 'Em execução', cls: 'bg-blue-500/15 text-blue-600' },
  aditado: { label: 'Aditado', cls: 'bg-violet-500/15 text-violet-600' },
  encerrado: { label: 'Encerrado', cls: 'bg-muted text-muted-foreground' },
  rescindido: { label: 'Rescindido', cls: 'bg-red-500/15 text-red-600' },
  em_renovacao: { label: 'Em renovação', cls: 'bg-amber-500/15 text-amber-600' },
};

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const fmtBRLk = (v: number) => v >= 1e6 ? `R$ ${(v / 1e6).toFixed(1)}M` : `R$ ${(v / 1e3).toFixed(0)}k`;
const diasAte = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);

// Série mensal sintética de execução financeira (jul/25 → jun/26)
const EXECUCAO_MENSAL = [
  { mes: 'Jul', faturado: 2_140_000, recebido: 1_980_000, empenhado: 3_200_000 },
  { mes: 'Ago', faturado: 2_540_000, recebido: 2_300_000, empenhado: 3_800_000 },
  { mes: 'Set', faturado: 3_120_000, recebido: 2_840_000, empenhado: 4_100_000 },
  { mes: 'Out', faturado: 2_980_000, recebido: 2_720_000, empenhado: 3_650_000 },
  { mes: 'Nov', faturado: 3_640_000, recebido: 3_120_000, empenhado: 4_400_000 },
  { mes: 'Dez', faturado: 4_120_000, recebido: 3_780_000, empenhado: 5_100_000 },
  { mes: 'Jan', faturado: 3_240_000, recebido: 2_980_000, empenhado: 4_700_000 },
  { mes: 'Fev', faturado: 3_580_000, recebido: 3_320_000, empenhado: 4_200_000 },
  { mes: 'Mar', faturado: 3_960_000, recebido: 3_620_000, empenhado: 4_800_000 },
  { mes: 'Abr', faturado: 4_280_000, recebido: 3_840_000, empenhado: 5_300_000 },
  { mes: 'Mai', faturado: 4_510_000, recebido: 4_120_000, empenhado: 5_600_000 },
  { mes: 'Jun', faturado: 4_780_000, recebido: 4_280_000, empenhado: 5_900_000 },
];

export default function ContratosDashboard() {
  const [clienteFilter, setClienteFilter] = useState<'todos' | 'STARTGI' | 'ABC'>('todos');
  const [statusFilter, setStatusFilter] = useState<'todos' | StatusContrato>('todos');
  const [search, setSearch] = useState('');

  const filtrados = useMemo(() => CONTRATOS.filter(c => {
    if (clienteFilter !== 'todos' && c.cliente !== clienteFilter) return false;
    if (statusFilter !== 'todos' && c.status !== statusFilter) return false;
    if (search && !`${c.numero} ${c.orgao} ${c.objeto}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [clienteFilter, statusFilter, search]);

  const kpis = useMemo(() => {
    const carteiraTotal = filtrados.reduce((s, c) => s + c.valorAtual, 0);
    const executado = filtrados.reduce((s, c) => s + c.valorExecutado, 0);
    const saldo = carteiraTotal - executado;
    const ativos = filtrados.filter(c => c.status !== 'encerrado' && c.status !== 'rescindido').length;
    const vencendo90 = filtrados.filter(c => {
      const d = diasAte(c.dataFimVigencia);
      return d > 0 && d <= 90 && c.status !== 'encerrado';
    }).length;
    const aditivos = filtrados.reduce((s, c) => s + c.aditivos, 0);
    const garantias = filtrados.reduce((s, c) => s + c.garantia, 0);
    const taxaExecucao = carteiraTotal ? (executado / carteiraTotal) * 100 : 0;
    return { carteiraTotal, executado, saldo, ativos, vencendo90, aditivos, garantias, taxaExecucao };
  }, [filtrados]);

  const porStatus = useMemo(() => {
    const map = new Map<string, { name: string; value: number; count: number }>();
    filtrados.forEach(c => {
      const label = STATUS_LABEL[c.status].label;
      const cur = map.get(label) || { name: label, value: 0, count: 0 };
      cur.value += c.valorAtual;
      cur.count += 1;
      map.set(label, cur);
    });
    return Array.from(map.values());
  }, [filtrados]);

  const porOrgao = useMemo(() => {
    const map = new Map<string, number>();
    filtrados.forEach(c => map.set(c.orgao, (map.get(c.orgao) || 0) + c.valorAtual));
    return Array.from(map.entries())
      .map(([orgao, valor]) => ({ orgao: orgao.length > 28 ? orgao.slice(0, 26) + '…' : orgao, valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 8);
  }, [filtrados]);

  const porUF = useMemo(() => {
    const map = new Map<string, number>();
    filtrados.forEach(c => map.set(c.uf, (map.get(c.uf) || 0) + c.valorAtual));
    return Array.from(map.entries()).map(([uf, valor]) => ({ uf, valor }));
  }, [filtrados]);

  const vencendo = useMemo(() =>
    filtrados
      .filter(c => c.status !== 'encerrado' && c.status !== 'rescindido')
      .map(c => ({ ...c, dias: diasAte(c.dataFimVigencia) }))
      .filter(c => c.dias <= 180)
      .sort((a, b) => a.dias - b.dias)
      .slice(0, 8),
    [filtrados]);

  return (
    <MainLayout title="Dashboard de Contratos" subtitle="Gestão da carteira de contratos públicos">
      <div className="space-y-6">
        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar por número, órgão ou objeto…" value={search} onChange={e => setSearch(e.target.value)} />
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
            <Button size="sm"><Plus className="h-4 w-4 mr-2" />Novo contrato</Button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard icon={DollarSign} color="text-blue-600" bg="bg-blue-500/10" label="Carteira ativa" value={fmtBRL(kpis.carteiraTotal)} sub={`${kpis.ativos} contratos ativos`} />
          <KpiCard icon={TrendingUp} color="text-emerald-600" bg="bg-emerald-500/10" label="Executado" value={fmtBRL(kpis.executado)} sub={`${kpis.taxaExecucao.toFixed(1)}% da carteira`} />
          <KpiCard icon={Layers} color="text-violet-600" bg="bg-violet-500/10" label="Saldo a executar" value={fmtBRL(kpis.saldo)} sub={`${kpis.aditivos} aditivos no período`} />
          <KpiCard icon={AlertCircle} color="text-amber-600" bg="bg-amber-500/10" label="Vencendo em 90d" value={kpis.vencendo90.toString()} sub={`Garantias: ${fmtBRL(kpis.garantias)}`} />
        </div>

        <Tabs defaultValue="visao" className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="visao"><BarChart3 className="h-4 w-4 mr-2" />Visão geral</TabsTrigger>
            <TabsTrigger value="execucao"><TrendingUp className="h-4 w-4 mr-2" />Execução</TabsTrigger>
            <TabsTrigger value="vigencia"><Clock className="h-4 w-4 mr-2" />Vigência</TabsTrigger>
            <TabsTrigger value="lista"><FileText className="h-4 w-4 mr-2" />Contratos</TabsTrigger>
          </TabsList>

          <TabsContent value="visao" className="space-y-4 mt-4">
            <div className="grid lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2">
                <CardHeader><CardTitle className="text-sm">Top órgãos por valor contratado</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={porOrgao} layout="vertical" margin={{ left: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis type="number" tickFormatter={fmtBRLk} fontSize={11} />
                      <YAxis type="category" dataKey="orgao" fontSize={10} width={180} />
                      <Tooltip formatter={(v: number) => fmtBRL(v)} />
                      <Bar dataKey="valor" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-sm">Composição por status</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
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
            </div>
            <Card>
              <CardHeader><CardTitle className="text-sm">Carteira por UF</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={porUF}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="uf" fontSize={11} />
                    <YAxis tickFormatter={fmtBRLk} fontSize={11} />
                    <Tooltip formatter={(v: number) => fmtBRL(v)} />
                    <Bar dataKey="valor" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="execucao" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Empenhado × Faturado × Recebido (12 meses)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <ComposedChart data={EXECUCAO_MENSAL}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="mes" fontSize={11} />
                    <YAxis tickFormatter={fmtBRLk} fontSize={11} />
                    <Tooltip formatter={(v: number) => fmtBRL(v)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="empenhado" name="Empenhado" fill="#c4b5fd" radius={[4, 4, 0, 0]} />
                    <Line dataKey="faturado" name="Faturado" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} />
                    <Line dataKey="recebido" name="Recebido" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-sm">Curva acumulada de faturamento</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={EXECUCAO_MENSAL.map((m, i, arr) => ({ mes: m.mes, acumulado: arr.slice(0, i + 1).reduce((s, x) => s + x.faturado, 0) }))}>
                      <defs>
                        <linearGradient id="acc" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="mes" fontSize={11} />
                      <YAxis tickFormatter={fmtBRLk} fontSize={11} />
                      <Tooltip formatter={(v: number) => fmtBRL(v)} />
                      <Area type="monotone" dataKey="acumulado" stroke="#3b82f6" fill="url(#acc)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-sm">Top contratos por execução</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {[...filtrados].sort((a, b) => b.valorExecutado - a.valorExecutado).slice(0, 5).map(c => {
                    const pct = (c.valorExecutado / c.valorAtual) * 100;
                    return (
                      <div key={c.id} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium truncate max-w-[60%]">{c.numero} · {c.orgao}</span>
                          <span className="text-muted-foreground">{pct.toFixed(0)}%</span>
                        </div>
                        <Progress value={pct} className="h-1.5" />
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>{fmtBRL(c.valorExecutado)}</span>
                          <span>{fmtBRL(c.valorAtual)}</span>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="vigencia" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500" /> Contratos próximos do vencimento (180 dias)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contrato</TableHead>
                      <TableHead>Cliente / Órgão</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead className="w-[140px]">Janela</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vencendo.map(c => {
                      const urgencia = c.dias <= 30 ? 'bg-red-500' : c.dias <= 90 ? 'bg-amber-500' : 'bg-blue-500';
                      const txtUrgencia = c.dias <= 30 ? 'text-red-600' : c.dias <= 90 ? 'text-amber-600' : 'text-blue-600';
                      return (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium text-xs">{c.numero}</TableCell>
                          <TableCell className="text-xs">
                            <Badge variant="outline" className="mr-2 text-[10px]">{c.cliente}</Badge>
                            {c.orgao}
                          </TableCell>
                          <TableCell className="text-right text-xs">{fmtBRL(c.valorAtual)}</TableCell>
                          <TableCell className="text-xs">{new Date(c.dataFimVigencia).toLocaleDateString('pt-BR')}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-muted rounded">
                                <div className={`h-full rounded ${urgencia}`} style={{ width: `${Math.max(5, Math.min(100, 100 - (c.dias / 180) * 100))}%` }} />
                              </div>
                              <span className={`text-[10px] font-semibold ${txtUrgencia}`}>{c.dias}d</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <div className="grid md:grid-cols-3 gap-3">
              <MiniStat icon={ShieldAlert} color="text-red-600" bg="bg-red-500/10" label="Vencendo ≤ 30 dias" value={vencendo.filter(v => v.dias <= 30).length.toString()} />
              <MiniStat icon={Clock} color="text-amber-600" bg="bg-amber-500/10" label="31 – 90 dias" value={vencendo.filter(v => v.dias > 30 && v.dias <= 90).length.toString()} />
              <MiniStat icon={Calendar} color="text-blue-600" bg="bg-blue-500/10" label="91 – 180 dias" value={vencendo.filter(v => v.dias > 90).length.toString()} />
            </div>
          </TabsContent>

          <TabsContent value="lista" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contrato</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Órgão</TableHead>
                      <TableHead className="text-right">Valor atual</TableHead>
                      <TableHead className="w-[180px]">Execução</TableHead>
                      <TableHead>Vigência</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtrados.map(c => {
                      const pct = (c.valorExecutado / c.valorAtual) * 100;
                      return (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium text-xs">{c.numero}</TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px]">{c.cliente}</Badge></TableCell>
                          <TableCell className="text-xs">{c.orgao} <span className="text-muted-foreground">/ {c.uf}</span></TableCell>
                          <TableCell className="text-right text-xs font-medium">{fmtBRL(c.valorAtual)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={pct} className="h-1.5 flex-1" />
                              <span className="text-[10px] text-muted-foreground w-8">{pct.toFixed(0)}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">{new Date(c.dataFimVigencia).toLocaleDateString('pt-BR')}</TableCell>
                          <TableCell><Badge className={`text-[10px] ${STATUS_LABEL[c.status].cls}`}>{STATUS_LABEL[c.status].label}</Badge></TableCell>
                        </TableRow>
                      );
                    })}
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
          <div className={`p-2 rounded-lg ${bg}`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MiniStat({ icon: Icon, color, bg, label, value }: any) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2 rounded-lg ${bg}`}><Icon className={`h-5 w-5 ${color}`} /></div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
