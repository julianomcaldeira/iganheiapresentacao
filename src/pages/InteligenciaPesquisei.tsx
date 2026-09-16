import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Search, RefreshCw, AlertTriangle, Trophy, TrendingUp, TrendingDown,
  ShieldAlert, Building2, Eye, BarChart3, Calendar, FileText
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface IPesquiseiDado {
  id: string;
  cnpj: string;
  tipo_entidade: string;
  nome_entidade: string | null;
}

interface IPesquiseiLicitacao {
  id: string;
  ipesquisei_dado_id: string;
  ipesquisei_id: string | null;
  numero: string | null;
  objeto: string | null;
  orgao: string | null;
  modalidade: string | null;
  uf: string | null;
  cidade: string | null;
  valor_estimado: number | null;
  data_abertura: string | null;
  vencedor_cnpj: string | null;
  vencedor_nome: string | null;
  valor_vencedor: number | null;
  ganhou: boolean | null;
  created_at: string;
}

interface IPesquiseiSancao {
  id: string;
  ipesquisei_dado_id: string;
  tipo_cadastro: string | null;
  orgao_sancionador: string | null;
  tipo_sancao: string | null;
  fundamentacao: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  vigente: boolean | null;
  created_at: string;
}

export default function InteligenciaPesquisei() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [selectedCliente, setSelectedCliente] = useState<string>('');

  const { data: clientes } = useQuery({
    queryKey: ['clientes-ipesquisei'],
    queryFn: async () => {
      const { data, error } = await supabase.from('clientes').select('id, nome').eq('ativo', true).order('nome');
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (profile?.cliente_id && !selectedCliente) {
      setSelectedCliente(profile.cliente_id);
    } else if (clientes?.length && !selectedCliente) {
      setSelectedCliente(clientes[0].id);
    }
  }, [profile, clientes, selectedCliente]);

  const { data: dados, isLoading: loadingDados } = useQuery({
    queryKey: ['ipesquisei-dados', selectedCliente],
    queryFn: async () => {
      if (!selectedCliente) return [];
      const { data, error } = await supabase
        .from('ipesquisei_dados')
        .select('*')
        .eq('cliente_id', selectedCliente);
      if (error) throw error;
      return data as IPesquiseiDado[];
    },
    enabled: !!selectedCliente,
  });

  const dadoIds = dados?.map(d => d.id) || [];

  const { data: licitacoes, isLoading: loadingLic } = useQuery({
    queryKey: ['ipesquisei-licitacoes', dadoIds],
    queryFn: async () => {
      if (!dadoIds.length) return [];
      const { data, error } = await supabase
        .from('ipesquisei_licitacoes')
        .select('*')
        .in('ipesquisei_dado_id', dadoIds)
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as IPesquiseiLicitacao[];
    },
    enabled: dadoIds.length > 0,
  });

  const { data: sancoes, isLoading: loadingSanc } = useQuery({
    queryKey: ['ipesquisei-sancoes', dadoIds],
    queryFn: async () => {
      if (!dadoIds.length) return [];
      const { data, error } = await supabase
        .from('ipesquisei_sancoes')
        .select('*')
        .in('ipesquisei_dado_id', dadoIds)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as IPesquiseiSancao[];
    },
    enabled: dadoIds.length > 0,
  });

  const { data: lastSync } = useQuery({
    queryKey: ['ipesquisei-last-sync', selectedCliente],
    queryFn: async () => {
      if (!selectedCliente) return null;
      const { data } = await supabase
        .from('ipesquisei_sync_logs')
        .select('*')
        .eq('cliente_id', selectedCliente)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      return data;
    },
    enabled: !!selectedCliente,
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/ipesquisei-sync?cliente_id=${selectedCliente}&tipo=manual`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro na sincronização');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Sincronização iPesquisei concluída!');
      queryClient.invalidateQueries({ queryKey: ['ipesquisei-dados'] });
      queryClient.invalidateQueries({ queryKey: ['ipesquisei-licitacoes'] });
      queryClient.invalidateQueries({ queryKey: ['ipesquisei-sancoes'] });
      queryClient.invalidateQueries({ queryKey: ['ipesquisei-last-sync'] });
    },
    onError: (err: Error) => {
      toast.error(`Erro: ${err.message}`);
    },
  });

  const getDadoNome = (dadoId: string) => dados?.find(d => d.id === dadoId)?.nome_entidade || 'N/A';
  const getDadoTipo = (dadoId: string) => dados?.find(d => d.id === dadoId)?.tipo_entidade || 'cliente';
  const getDadoCnpj = (dadoId: string) => dados?.find(d => d.id === dadoId)?.cnpj || '';

  // Stats
  const clienteDados = dados?.filter(d => d.tipo_entidade === 'cliente') || [];
  const concorrenteDados = dados?.filter(d => d.tipo_entidade === 'concorrente') || [];

  const clienteDadoIds = clienteDados.map(d => d.id);
  const concorrenteDadoIds = concorrenteDados.map(d => d.id);

  const clienteLics = licitacoes?.filter(l => clienteDadoIds.includes(l.ipesquisei_dado_id)) || [];
  const concorrenteLics = licitacoes?.filter(l => concorrenteDadoIds.includes(l.ipesquisei_dado_id)) || [];

  const clienteWins = clienteLics.filter(l => l.ganhou).length;
  const concorrenteWins = concorrenteLics.filter(l => l.ganhou).length;

  const clienteSancoes = sancoes?.filter(s => clienteDadoIds.includes(s.ipesquisei_dado_id)) || [];
  const concorrenteSancoes = sancoes?.filter(s => concorrenteDadoIds.includes(s.ipesquisei_dado_id)) || [];

  const concorrenteSancoesVigentes = concorrenteSancoes.filter(s => s.vigente);

  const formatCurrency = (val: number | null) => {
    if (!val) return '-';
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (d: string | null) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('pt-BR');
  };

  const formatCnpj = (cnpj: string) => {
    if (cnpj.length === 14) {
      return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    }
    return cnpj;
  };

  const isLoading = loadingDados || loadingLic || loadingSanc;

  return (
    <MainLayout title="Inteligência iPesquisei" subtitle="Dados estratégicos de licitações e sanções">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Search className="h-6 w-6 text-primary" />
              Inteligência iPesquisei
            </h1>
            <p className="text-muted-foreground">Dados estratégicos de licitações e sanções para tomada de decisão</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedCliente} onValueChange={setSelectedCliente}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Selecionar cliente" />
              </SelectTrigger>
              <SelectContent>
                {clientes?.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending || !selectedCliente}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
              Sincronizar
            </Button>
          </div>
        </div>

        {/* Last sync info */}
        {lastSync && (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Última sincronização: {formatDate(lastSync.created_at)} às{' '}
            {new Date(lastSync.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            {lastSync.sucesso ? (
              <Badge variant="outline" className="text-green-600 border-green-300 ml-2">Sucesso</Badge>
            ) : (
              <Badge variant="destructive" className="ml-2">Erro</Badge>
            )}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Licitações (Empresa)</p>
                  <p className="text-2xl font-bold">{clienteLics.length}</p>
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <Trophy className="h-3 w-3" /> {clienteWins} vitórias
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-primary/30" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Licitações (Concorrentes)</p>
                  <p className="text-2xl font-bold">{concorrenteLics.length}</p>
                  <p className="text-xs text-blue-600 flex items-center gap-1">
                    <Trophy className="h-3 w-3" /> {concorrenteWins} vitórias
                  </p>
                </div>
                <TrendingDown className="h-8 w-8 text-orange-400/30" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Sanções (Empresa)</p>
                  <p className="text-2xl font-bold">{clienteSancoes.length}</p>
                  {clienteSancoes.filter(s => s.vigente).length > 0 && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> {clienteSancoes.filter(s => s.vigente).length} vigentes
                    </p>
                  )}
                </div>
                <ShieldAlert className="h-8 w-8 text-red-400/30" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Sanções (Concorrentes)</p>
                  <p className="text-2xl font-bold">{concorrenteSancoes.length}</p>
                  {concorrenteSancoesVigentes.length > 0 && (
                    <p className="text-xs text-amber-600 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> {concorrenteSancoesVigentes.length} vigentes
                    </p>
                  )}
                </div>
                <ShieldAlert className="h-8 w-8 text-amber-400/30" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alert: concorrentes sancionados */}
        {concorrenteSancoesVigentes.length > 0 && (
          <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-800 dark:text-amber-200">
                    Concorrentes com sanções vigentes detectados!
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    {concorrenteSancoesVigentes.length} sanção(ões) ativa(s) encontrada(s) em concorrentes.
                    Isso pode representar uma vantagem competitiva em futuras licitações.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="visao-geral">
          <TabsList>
            <TabsTrigger value="visao-geral">
              <BarChart3 className="h-4 w-4 mr-2" />Visão Geral
            </TabsTrigger>
            <TabsTrigger value="licitacoes">
              <FileText className="h-4 w-4 mr-2" />Histórico Licitações
            </TabsTrigger>
            <TabsTrigger value="sancoes">
              <ShieldAlert className="h-4 w-4 mr-2" />Sanções
            </TabsTrigger>
          </TabsList>

          {/* Visão Geral */}
          <TabsContent value="visao-geral">
            {isLoading ? (
              <div className="space-y-4">
                {[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
              </div>
            ) : !dados?.length ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold">Nenhum dado encontrado</h3>
                  <p className="text-muted-foreground mb-4">
                    Clique em "Sincronizar" para buscar dados do iPesquisei para este cliente.
                  </p>
                  <Button onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                    Primeira Sincronização
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* CNPJs Monitorados */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      CNPJs Monitorados
                    </CardTitle>
                    <CardDescription>{dados.length} CNPJ(s) sendo monitorados</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {dados.map(d => {
                        const lics = licitacoes?.filter(l => l.ipesquisei_dado_id === d.id) || [];
                        const sancs = sancoes?.filter(s => s.ipesquisei_dado_id === d.id) || [];
                        const wins = lics.filter(l => l.ganhou).length;
                        return (
                          <div key={d.id} className="flex items-center justify-between p-3 rounded-lg border">
                            <div>
                              <p className="font-medium text-sm">{d.nome_entidade || formatCnpj(d.cnpj)}</p>
                              <p className="text-xs text-muted-foreground">{formatCnpj(d.cnpj)}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={d.tipo_entidade === 'cliente' ? 'default' : 'secondary'}>
                                {d.tipo_entidade === 'cliente' ? 'Empresa' : 'Concorrente'}
                              </Badge>
                              <span className="text-xs text-muted-foreground">{lics.length} lic.</span>
                              {wins > 0 && (
                                <Badge variant="outline" className="text-green-600 border-green-300 text-xs">
                                  {wins} 🏆
                                </Badge>
                              )}
                              {sancs.filter(s => s.vigente).length > 0 && (
                                <Badge variant="destructive" className="text-xs">
                                  {sancs.filter(s => s.vigente).length} sanção
                                </Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Top licitações recentes */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Licitações Recentes
                    </CardTitle>
                    <CardDescription>Últimas licitações encontradas</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(licitacoes || []).slice(0, 8).map(lic => (
                        <div key={lic.id} className="p-3 rounded-lg border text-sm">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium truncate flex-1">{lic.numero || 'S/N'}</span>
                            <Badge variant={lic.ganhou ? 'default' : 'outline'} className="text-xs ml-2">
                              {lic.ganhou ? '🏆 Venceu' : 'Participou'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1">{lic.objeto || '-'}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span>{lic.orgao || '-'}</span>
                            {lic.uf && <Badge variant="outline" className="text-[10px] px-1">{lic.uf}</Badge>}
                            {lic.valor_vencedor && (
                              <span className="font-medium text-foreground">{formatCurrency(lic.valor_vencedor)}</span>
                            )}
                          </div>
                        </div>
                      ))}
                      {(!licitacoes || licitacoes.length === 0) && (
                        <p className="text-muted-foreground text-sm text-center py-4">Nenhuma licitação encontrada</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Histórico Licitações */}
          <TabsContent value="licitacoes">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Entidade</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Número</TableHead>
                      <TableHead>Objeto</TableHead>
                      <TableHead>Órgão</TableHead>
                      <TableHead>UF</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Resultado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array(5).fill(0).map((_, i) => (
                        <TableRow key={i}>
                          {Array(8).fill(0).map((_, j) => (
                            <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (licitacoes || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          Nenhuma licitação encontrada. Sincronize os dados.
                        </TableCell>
                      </TableRow>
                    ) : (
                      (licitacoes || []).map(lic => (
                        <TableRow key={lic.id}>
                          <TableCell className="font-medium text-xs">
                            {getDadoNome(lic.ipesquisei_dado_id)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getDadoTipo(lic.ipesquisei_dado_id) === 'cliente' ? 'default' : 'secondary'} className="text-xs">
                              {getDadoTipo(lic.ipesquisei_dado_id) === 'cliente' ? 'Empresa' : 'Concorrente'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">{lic.numero || '-'}</TableCell>
                          <TableCell className="text-xs max-w-[200px] truncate">{lic.objeto || '-'}</TableCell>
                          <TableCell className="text-xs max-w-[150px] truncate">{lic.orgao || '-'}</TableCell>
                          <TableCell className="text-xs">{lic.uf || '-'}</TableCell>
                          <TableCell className="text-xs">{formatCurrency(lic.valor_vencedor || lic.valor_estimado)}</TableCell>
                          <TableCell>
                            <Badge variant={lic.ganhou ? 'default' : 'outline'} className="text-xs">
                              {lic.ganhou ? '🏆 Venceu' : 'Participou'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sanções */}
          <TabsContent value="sancoes">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Entidade</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Cadastro</TableHead>
                      <TableHead>Órgão Sancionador</TableHead>
                      <TableHead>Tipo Sanção</TableHead>
                      <TableHead>Início</TableHead>
                      <TableHead>Fim</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array(3).fill(0).map((_, i) => (
                        <TableRow key={i}>
                          {Array(8).fill(0).map((_, j) => (
                            <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (sancoes || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          Nenhuma sanção encontrada. Boa notícia! 🎉
                        </TableCell>
                      </TableRow>
                    ) : (
                      (sancoes || []).map(sanc => (
                        <TableRow key={sanc.id}>
                          <TableCell className="font-medium text-xs">
                            {getDadoNome(sanc.ipesquisei_dado_id)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getDadoTipo(sanc.ipesquisei_dado_id) === 'cliente' ? 'default' : 'secondary'} className="text-xs">
                              {getDadoTipo(sanc.ipesquisei_dado_id) === 'cliente' ? 'Empresa' : 'Concorrente'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">{sanc.tipo_cadastro || '-'}</TableCell>
                          <TableCell className="text-xs max-w-[200px] truncate">{sanc.orgao_sancionador || '-'}</TableCell>
                          <TableCell className="text-xs">{sanc.tipo_sancao || '-'}</TableCell>
                          <TableCell className="text-xs">{formatDate(sanc.data_inicio)}</TableCell>
                          <TableCell className="text-xs">{formatDate(sanc.data_fim)}</TableCell>
                          <TableCell>
                            {sanc.vigente ? (
                              <Badge variant="destructive" className="text-xs">Vigente</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">Encerrada</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
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
