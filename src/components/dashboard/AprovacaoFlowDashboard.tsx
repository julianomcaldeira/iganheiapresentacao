import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  X,
  Building2,
  ShieldCheck,
  CheckCircle2,
  Clock,
  XCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  UserCheck,
  AlertTriangle,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface AprovacaoItem {
  id: string;
  licitacao_id: string;
  nome_etapa: string;
  descricao: string | null;
  ordem: number;
  status: string;
  aprovador_id: string | null;
  aprovador_nome?: string;
  comentario: string | null;
  data_resposta: string | null;
}

interface LicitacaoAprovacao {
  licitacao_id: string;
  numero: string;
  objeto: string;
  orgao: string;
  cliente_id: string;
  cliente_nome?: string;
  aprovacoes: AprovacaoItem[];
}

export function AprovacaoFlowDashboard() {
  const { isAdmin, profile } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<LicitacaoAprovacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCliente, setSelectedCliente] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchData();
  }, [isAdmin, profile]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (isAdmin) {
        const { data: c } = await supabase
          .from('clientes')
          .select('id, nome')
          .eq('ativo', true)
          .order('nome');
        if (c) setClientes(c);
      }

      // Fetch all approval flows
      let query = supabase
        .from('licitacao_fluxo_aprovacao')
        .select('id, licitacao_id, nome_etapa, descricao, ordem, status, aprovador_id, comentario, data_resposta')
        .order('ordem', { ascending: true });

      const { data: aprovacoes } = await query;
      if (!aprovacoes || aprovacoes.length === 0) {
        setData([]);
        setLoading(false);
        return;
      }

      // Get unique licitacao IDs
      const licitacaoIds = [...new Set(aprovacoes.map((a) => a.licitacao_id))];

      // Fetch licitações
      let licQuery = supabase
        .from('licitacoes')
        .select('id, numero, objeto, orgao, cliente_id')
        .in('id', licitacaoIds);

      if (!isAdmin && profile?.cliente_id) {
        licQuery = licQuery.eq('cliente_id', profile.cliente_id);
      }

      const { data: licitacoes } = await licQuery;
      if (!licitacoes || licitacoes.length === 0) {
        setData([]);
        setLoading(false);
        return;
      }

      const licMap = new Map(licitacoes.map((l) => [l.id, l]));

      // Fetch aprovador names
      const aprovadorIds = [...new Set(aprovacoes.filter((a) => a.aprovador_id).map((a) => a.aprovador_id!))];
      let namesMap: Record<string, string> = {};
      if (aprovadorIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, nome')
          .in('id', aprovadorIds);
        if (profs) profs.forEach((p) => { namesMap[p.id] = p.nome || 'Usuário'; });
      }

      // Fetch client names for admin
      let clienteMap: Record<string, string> = {};
      if (isAdmin) {
        const clienteIds = [...new Set(licitacoes.map((l) => l.cliente_id))];
        const { data: cn } = await supabase
          .from('clientes')
          .select('id, nome')
          .in('id', clienteIds);
        if (cn) clienteMap = Object.fromEntries(cn.map((c) => [c.id, c.nome]));
      }

      // Group by licitacao
      const grouped: Record<string, LicitacaoAprovacao> = {};
      for (const a of aprovacoes) {
        const lic = licMap.get(a.licitacao_id);
        if (!lic) continue;

        if (!grouped[a.licitacao_id]) {
          grouped[a.licitacao_id] = {
            licitacao_id: a.licitacao_id,
            numero: lic.numero,
            objeto: lic.objeto,
            orgao: lic.orgao,
            cliente_id: lic.cliente_id,
            cliente_nome: clienteMap[lic.cliente_id],
            aprovacoes: [],
          };
        }
        grouped[a.licitacao_id].aprovacoes.push({
          ...a,
          aprovador_nome: a.aprovador_id ? namesMap[a.aprovador_id] || 'Usuário' : undefined,
        });
      }

      setData(Object.values(grouped));
    } catch (error) {
      console.error('Error fetching approval flow data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return data.filter((l) => {
      if (searchTerm) {
        const t = searchTerm.toLowerCase();
        if (!l.numero.toLowerCase().includes(t) && !l.objeto.toLowerCase().includes(t) && !l.orgao.toLowerCase().includes(t))
          return false;
      }
      if (selectedCliente !== 'all' && l.cliente_id !== selectedCliente) return false;
      if (selectedStatus !== 'all') {
        if (selectedStatus === 'com_pendente') {
          if (!l.aprovacoes.some((a) => a.status === 'pendente')) return false;
        } else if (selectedStatus === 'todas_aprovadas') {
          if (!l.aprovacoes.every((a) => a.status === 'aprovado')) return false;
        } else if (selectedStatus === 'com_recusa') {
          if (!l.aprovacoes.some((a) => a.status === 'recusado')) return false;
        }
      }
      return true;
    });
  }, [data, searchTerm, selectedCliente, selectedStatus]);

  const globalSummary = useMemo(() => {
    let total = 0, aprovadas = 0, pendentes = 0, recusadas = 0, esclarecimento = 0;
    for (const l of filtered) {
      for (const a of l.aprovacoes) {
        total++;
        if (a.status === 'aprovado') aprovadas++;
        else if (a.status === 'pendente') pendentes++;
        else if (a.status === 'recusado') recusadas++;
        else if (a.status === 'esclarecimento') esclarecimento++;
      }
    }
    return { total, aprovadas, pendentes, recusadas, esclarecimento };
  }, [filtered]);

  const hasActiveFilters = searchTerm || selectedCliente !== 'all' || selectedStatus !== 'all';

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCliente('all');
    setSelectedStatus('all');
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'aprovado': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'recusado': return <XCircle className="w-4 h-4 text-destructive" />;
      case 'esclarecimento': return <HelpCircle className="w-4 h-4 text-warning" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'aprovado': return 'Aprovado';
      case 'recusado': return 'Recusado';
      case 'esclarecimento': return 'Esclarecimento';
      default: return 'Pendente';
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl bg-card shadow-md border border-border p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-xl bg-card shadow-md border border-border overflow-hidden"
    >
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-heading font-semibold text-foreground flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Workflow de Aprovações
            </h3>
            <p className="text-sm text-muted-foreground">
              Visão consolidada das aprovações de todas as licitações
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(hasActiveFilters && 'border-primary text-primary')}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtros
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-[10px]">!</Badge>
            )}
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
          <div className="rounded-lg bg-secondary/50 p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{globalSummary.total}</p>
            <p className="text-xs text-muted-foreground">Total Etapas</p>
          </div>
          <div className="rounded-lg bg-emerald-500/10 p-3 text-center">
            <p className="text-2xl font-bold text-emerald-500">{globalSummary.aprovadas}</p>
            <p className="text-xs text-muted-foreground">Aprovadas</p>
          </div>
          <div className="rounded-lg bg-warning/10 p-3 text-center">
            <p className="text-2xl font-bold text-warning">{globalSummary.pendentes}</p>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </div>
          <div className="rounded-lg bg-destructive/10 p-3 text-center">
            <p className="text-2xl font-bold text-destructive">{globalSummary.recusadas}</p>
            <p className="text-xs text-muted-foreground">Recusadas</p>
          </div>
          <div className="rounded-lg bg-primary/10 p-3 text-center">
            <p className="text-2xl font-bold text-primary">{globalSummary.esclarecimento}</p>
            <p className="text-xs text-muted-foreground">Esclarecimento</p>
          </div>
        </div>

        {/* Progress bar */}
        {globalSummary.total > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progresso geral das aprovações</span>
              <span>{Math.round((globalSummary.aprovadas / globalSummary.total) * 100)}% concluído</span>
            </div>
            <Progress value={(globalSummary.aprovadas / globalSummary.total) * 100} className="h-2" />
          </div>
        )}

        {/* Filters */}
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="space-y-3 pt-4 mt-4 border-t border-border"
          >
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número, objeto ou órgão..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              {isAdmin && (
                <Select value={selectedCliente} onValueChange={setSelectedCliente}>
                  <SelectTrigger className="w-[200px]">
                    <Building2 className="w-4 h-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os clientes</SelectItem>
                    {clientes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Situação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as situações</SelectItem>
                  <SelectItem value="com_pendente">Com pendências</SelectItem>
                  <SelectItem value="todas_aprovadas">Todas aprovadas</SelectItem>
                  <SelectItem value="com_recusa">Com recusa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {hasActiveFilters && (
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                  <X className="mr-1 h-4 w-4" />
                  Limpar filtros
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* List */}
      <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <ShieldCheck className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">Nenhuma aprovação encontrada</p>
            <p className="text-sm text-muted-foreground/70">Não há fluxos de aprovação cadastrados</p>
          </div>
        ) : (
          filtered.map((lic, index) => {
            const isExpanded = expandedIds.has(lic.licitacao_id);
            const totalEtapas = lic.aprovacoes.length;
            const aprovadas = lic.aprovacoes.filter((a) => a.status === 'aprovado').length;
            const pendentes = lic.aprovacoes.filter((a) => a.status === 'pendente').length;
            const recusadas = lic.aprovacoes.filter((a) => a.status === 'recusado').length;
            const pct = totalEtapas > 0 ? Math.round((aprovadas / totalEtapas) * 100) : 0;

            return (
              <motion.div
                key={lic.licitacao_id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.3) }}
                className="hover:bg-secondary/20 transition-colors"
              >
                <div
                  className="p-4 cursor-pointer flex items-center gap-4"
                  onClick={() => toggleExpand(lic.licitacao_id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span
                        className="text-sm font-semibold text-primary hover:underline cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/licitacoes?id=${lic.licitacao_id}`);
                        }}
                      >
                        {lic.numero}
                      </span>
                      {isAdmin && lic.cliente_nome && (
                        <Badge variant="secondary" className="text-[10px]">
                          <Building2 className="w-3 h-3 mr-1" />
                          {lic.cliente_nome}
                        </Badge>
                      )}
                      {recusadas > 0 && (
                        <Badge variant="destructive" className="text-[10px]">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {recusadas} recusada{recusadas > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-foreground truncate">{lic.objeto}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{lic.orgao}</p>
                  </div>

                  {/* Mini approval progress */}
                  <div className="hidden md:flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-1.5 text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-foreground font-medium">{aprovadas}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <Clock className="w-3.5 h-3.5 text-warning" />
                      <span className="text-foreground font-medium">{pendentes}</span>
                    </div>
                    <div className="w-20">
                      <Progress value={pct} className="h-1.5" />
                    </div>
                    <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
                  </div>

                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="px-4 pb-4"
                  >
                    <div className="rounded-lg bg-secondary/30 p-4 space-y-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-foreground">Etapas de Aprovação</span>
                        <span className="text-xs text-muted-foreground">
                          {aprovadas}/{totalEtapas} aprovadas
                        </span>
                      </div>

                      {lic.aprovacoes.map((a) => (
                        <div
                          key={a.id}
                          className={cn(
                            'flex items-center gap-3 rounded-lg border px-3 py-2',
                            a.status === 'aprovado' && 'border-emerald-500/30 bg-emerald-500/5',
                            a.status === 'recusado' && 'border-destructive/30 bg-destructive/5',
                            a.status === 'esclarecimento' && 'border-warning/30 bg-warning/5',
                            a.status === 'pendente' && 'border-border bg-background'
                          )}
                        >
                          {statusIcon(a.status)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">{a.nome_etapa}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {a.aprovador_nome && (
                                <span className="flex items-center gap-1">
                                  <UserCheck className="w-3 h-3" />
                                  {a.aprovador_nome}
                                </span>
                              )}
                              {a.data_resposta && (
                                <span>• {new Date(a.data_resposta).toLocaleDateString('pt-BR')}</span>
                              )}
                            </div>
                            {a.comentario && (
                              <p className="text-xs text-muted-foreground mt-1 italic">"{a.comentario}"</p>
                            )}
                          </div>
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px] shrink-0',
                              a.status === 'aprovado' && 'border-emerald-500/30 text-emerald-500',
                              a.status === 'recusado' && 'border-destructive/30 text-destructive',
                              a.status === 'esclarecimento' && 'border-warning/30 text-warning',
                              a.status === 'pendente' && 'border-muted-foreground/30 text-muted-foreground'
                            )}
                          >
                            {statusLabel(a.status)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {filtered.length > 0 && (
        <div className="p-3 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            Exibindo {filtered.length} licitações com fluxo de aprovação
          </p>
        </div>
      )}
    </motion.div>
  );
}
