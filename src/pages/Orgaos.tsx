import { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Building2, MapPin, Search, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useImpersonation } from '@/contexts/ImpersonationContext';

interface Orgao {
  nome: string;
  uf: string | null;
  cidade: string | null;
  cliente_id: string | null;
  cliente_nome: string;
  total_licitacoes: number;
  total_ganhas: number;
  valor_total: number;
  ultima_participacao: string | null;
  status: 'ativo' | 'inativo';
}

const formatCurrency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const formatDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('pt-BR') : '—';

export default function Orgaos() {
  const { profile, role } = useAuth();
  const { impersonatedUser } = useImpersonation();
  const [orgaos, setOrgaos] = useState<Orgao[]>([]);
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterUf, setFilterUf] = useState<string>('all');
  const [filterCliente, setFilterCliente] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'ativo' | 'inativo'>('all');

  const clienteScope =
    role === 'admin'
      ? impersonatedUser?.cliente_id ?? null
      : profile?.cliente_id ?? null;


  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data: clientesData } = await supabase
          .from('clientes')
          .select('id, nome')
          .eq('ativo', true)
          .order('nome');
        setClientes(clientesData || []);
        const clienteMap = new Map((clientesData || []).map((c) => [c.id, c.nome]));

        let query = supabase
          .from('licitacoes')
          .select('orgao, uf_orgao, cidade_orgao, cliente_id, valor_estimado, status, data_abertura, created_at');

        if (clienteScope) query = query.eq('cliente_id', clienteScope);

        const { data, error } = await query;
        if (error) throw error;

        // 12 months ago for active status
        const cutoff = new Date();
        cutoff.setMonth(cutoff.getMonth() - 12);

        const map = new Map<string, Orgao>();
        for (const row of data || []) {
          if (!row.orgao) continue;
          const key = `${row.cliente_id}::${row.orgao}`;
          const ref = row.data_abertura || row.created_at;
          const existing = map.get(key);
          if (existing) {
            existing.total_licitacoes += 1;
            if (row.status === 'ganha' || row.status === 'concluida_ganha') existing.total_ganhas += 1;
            existing.valor_total += Number(row.valor_estimado || 0);
            if (ref && (!existing.ultima_participacao || ref > existing.ultima_participacao)) {
              existing.ultima_participacao = ref;
            }
          } else {
            map.set(key, {
              nome: row.orgao,
              uf: row.uf_orgao,
              cidade: row.cidade_orgao,
              cliente_id: row.cliente_id,
              cliente_nome: clienteMap.get(row.cliente_id) || '—',
              total_licitacoes: 1,
              total_ganhas: row.status === 'ganha' || row.status === 'concluida_ganha' ? 1 : 0,
              valor_total: Number(row.valor_estimado || 0),
              ultima_participacao: ref,
              status: 'inativo',
            });
          }
        }

        const list = Array.from(map.values()).map((o) => ({
          ...o,
          status: (o.ultima_participacao && new Date(o.ultima_participacao) >= cutoff
            ? 'ativo'
            : 'inativo') as 'ativo' | 'inativo',
        }));
        list.sort((a, b) => b.total_licitacoes - a.total_licitacoes);
        setOrgaos(list);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [clienteScope]);

  const ufs = useMemo(
    () => Array.from(new Set(orgaos.map((o) => o.uf).filter(Boolean))).sort() as string[],
    [orgaos]
  );

  const filtered = useMemo(
    () =>
      orgaos.filter((o) => {
        if (search && !o.nome.toLowerCase().includes(search.toLowerCase())) return false;
        if (filterUf !== 'all' && o.uf !== filterUf) return false;
        if (filterCliente !== 'all' && o.cliente_id !== filterCliente) return false;
        if (filterStatus !== 'all' && o.status !== filterStatus) return false;
        return true;
      }),
    [orgaos, search, filterUf, filterCliente, filterStatus]
  );

  const kpis = useMemo(() => {
    const ativos = orgaos.filter((o) => o.status === 'ativo').length;
    const inativos = orgaos.filter((o) => o.status === 'inativo').length;
    const totalValor = orgaos.reduce((s, o) => s + o.valor_total, 0);
    return { total: orgaos.length, ativos, inativos, totalValor };
  }, [orgaos]);

  return (
    <MainLayout title="Órgãos Públicos" subtitle="Catálogo de órgãos do cliente">
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Building2 className="h-7 w-7 text-primary" />
              Órgãos Públicos
            </h1>
            <p className="text-sm text-muted-foreground">
              Catálogo de órgãos com quem o cliente já participou ou participa atualmente.
            </p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total de Órgãos</p>
                  <p className="text-2xl font-bold">{kpis.total}</p>
                </div>
                <Building2 className="h-8 w-8 text-primary opacity-60" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ativos (12m)</p>
                  <p className="text-2xl font-bold text-emerald-600">{kpis.ativos}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-emerald-500 opacity-60" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Inativos</p>
                  <p className="text-2xl font-bold text-yellow-600">{kpis.inativos}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-yellow-500 opacity-60" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Volume Histórico</p>
                  <p className="text-2xl font-bold">{formatCurrency(kpis.totalValor)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-primary opacity-60" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar órgão..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={filterUf} onValueChange={setFilterUf}>
                <SelectTrigger>
                  <SelectValue placeholder="UF" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as UFs</SelectItem>
                  {ufs.map((uf) => (
                    <SelectItem key={uf} value={uf}>
                      {uf}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!clienteScope && (
                <Select value={filterCliente} onValueChange={setFilterCliente}>
                  <SelectTrigger>
                    <SelectValue placeholder="Cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os clientes</SelectItem>
                    {clientes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="ativo">Ativos</SelectItem>
                  <SelectItem value="inativo">Inativos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="todos">
          <TabsList>
            <TabsTrigger value="todos">Todos ({filtered.length})</TabsTrigger>
            <TabsTrigger value="ativos">
              Ativos ({filtered.filter((o) => o.status === 'ativo').length})
            </TabsTrigger>
            <TabsTrigger value="inativos">
              Inativos ({filtered.filter((o) => o.status === 'inativo').length})
            </TabsTrigger>
          </TabsList>

          {(['todos', 'ativos', 'inativos'] as const).map((tab) => {
            const rows =
              tab === 'todos' ? filtered : filtered.filter((o) => o.status === tab.slice(0, -1));
            return (
              <TabsContent key={tab} value={tab}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Lista de Órgãos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <p className="text-sm text-muted-foreground">Carregando...</p>
                    ) : rows.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-8 text-center">
                        Nenhum órgão encontrado com os filtros atuais.
                      </p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Órgão</TableHead>
                            <TableHead>Localização</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead className="text-right">Licitações</TableHead>
                            <TableHead className="text-right">Ganhas</TableHead>
                            <TableHead className="text-right">Volume</TableHead>
                            <TableHead>Última participação</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rows.map((o, idx) => (
                            <TableRow key={`${o.cliente_id}-${o.nome}-${idx}`}>
                              <TableCell className="font-medium max-w-[280px]">
                                <div className="flex items-start gap-2">
                                  <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                  <span className="line-clamp-2">{o.nome}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <MapPin className="h-3 w-3" />
                                  {[o.cidade, o.uf].filter(Boolean).join(' / ') || '—'}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">{o.cliente_nome}</TableCell>
                              <TableCell className="text-right tabular-nums">
                                {o.total_licitacoes}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                <Badge variant="secondary">{o.total_ganhas}</Badge>
                              </TableCell>
                              <TableCell className="text-right text-sm tabular-nums">
                                {formatCurrency(o.valor_total)}
                              </TableCell>
                              <TableCell className="text-sm">
                                {formatDate(o.ultima_participacao)}
                              </TableCell>
                              <TableCell>
                                {o.status === 'ativo' ? (
                                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/15">
                                    Ativo
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="border-yellow-500/40 text-yellow-700 dark:text-yellow-500">
                                    Inativo
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </MainLayout>
  );
}
