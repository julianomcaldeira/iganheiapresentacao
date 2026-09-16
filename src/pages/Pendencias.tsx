import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, AlertTriangle, Calendar, FileText, Clock, Settings, Plus,
  Trash2, GripVertical, Eye, CheckCircle, AlertCircle, Building2,
  Users, Workflow, ShieldAlert, TrendingUp, Edit, RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, React.ElementType> = {
  search: Search,
  alert: AlertTriangle,
  calendar: Calendar,
  file: FileText,
  clock: Clock,
  check: CheckCircle,
  warning: AlertCircle,
  building: Building2,
  users: Users,
  workflow: Workflow,
  shield: ShieldAlert,
  trending: TrendingUp,
  eye: Eye,
};

const COR_GRADIENT_MAP: Record<string, string> = {
  green: 'from-emerald-500/10 via-emerald-500/5 to-transparent',
  blue: 'from-blue-500/10 via-blue-500/5 to-transparent',
  red: 'from-red-500/10 via-red-500/5 to-transparent',
  yellow: 'from-amber-500/10 via-amber-500/5 to-transparent',
  purple: 'from-purple-500/10 via-purple-500/5 to-transparent',
  gray: 'from-muted/50 via-muted/20 to-transparent',
};

const COR_ICON_BG_MAP: Record<string, string> = {
  green: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20',
  blue: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 ring-blue-500/20',
  red: 'bg-red-500/15 text-red-600 dark:text-red-400 ring-red-500/20',
  yellow: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-amber-500/20',
  purple: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 ring-purple-500/20',
  gray: 'bg-muted text-muted-foreground ring-border',
};

const COR_ICON_MAP: Record<string, string> = {
  green: 'text-emerald-600 dark:text-emerald-400',
  blue: 'text-blue-600 dark:text-blue-400',
  red: 'text-red-600 dark:text-red-400',
  yellow: 'text-amber-600 dark:text-amber-400',
  purple: 'text-purple-600 dark:text-purple-400',
  gray: 'text-muted-foreground',
};

const COR_ACCENT_MAP: Record<string, string> = {
  green: 'bg-emerald-500',
  blue: 'bg-blue-500',
  red: 'bg-red-500',
  yellow: 'bg-amber-500',
  purple: 'bg-purple-500',
  gray: 'bg-muted-foreground',
};

const COR_VALUE_MAP: Record<string, string> = {
  green: 'text-emerald-600 dark:text-emerald-400',
  blue: 'text-blue-600 dark:text-blue-400',
  red: 'text-red-600 dark:text-red-400',
  yellow: 'text-amber-600 dark:text-amber-400',
  purple: 'text-purple-600 dark:text-purple-400',
  gray: 'text-foreground',
};

interface KanbanCard {
  id: string;
  titulo: string;
  descricao: string | null;
  secao: string;
  icone: string;
  cor: string;
  fonte_dados: string;
  filtro_status: string | null;
  filtro_data_inicio_offset_dias: number | null;
  filtro_data_fim_offset_dias: number | null;
  filtro_data_campo: string | null;
  filtro_responsavel_atual: boolean | null;
  ordem: number;
  ativo: boolean;
}

interface CardCount {
  cardId: string;
  count: number;
}

const DATE_FIELD_OPTIONS: Record<string, { label: string; fields: { value: string; label: string }[] }> = {
  licitacoes: {
    label: 'Coluna de data',
    fields: [
      { value: 'data_abertura', label: 'Data de abertura' },
      { value: 'data_publicacao', label: 'Data de publicação' },
      { value: 'created_at', label: 'Data de criação' },
      { value: 'updated_at', label: 'Última atualização' },
    ],
  },
  empenhos: {
    label: 'Coluna de data',
    fields: [
      { value: 'data_emissao', label: 'Data de emissão' },
      { value: 'data_vencimento', label: 'Data de vencimento' },
      { value: 'created_at', label: 'Data de criação' },
    ],
  },
};

const defaultFormData = {
  titulo: '',
  descricao: '',
  secao: 'licitacoes',
  icone: 'search',
  cor: 'green',
  fonte_dados: 'licitacoes',
  filtro_status: '',
  filtro_data_inicio_offset_dias: '',
  filtro_data_fim_offset_dias: '',
  filtro_data_campo: 'data_abertura',
  filtro_responsavel_atual: false,
};

export default function Pendencias() {
  const { profile, hasRole } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAdmin = hasRole('admin');

  const handleCardClick = (card: KanbanCard) => {
    if (card.fonte_dados !== 'licitacoes') return;
    const params = new URLSearchParams();
    if (card.filtro_status) params.set('status', card.filtro_status);
    if (isAdmin && selectedCliente) params.set('cliente', selectedCliente);
    navigate(`/licitacoes?${params.toString()}`);
  };
  const [selectedCliente, setSelectedCliente] = useState<string>('');
  const [showConfig, setShowConfig] = useState(false);
  const [editingCard, setEditingCard] = useState<KanbanCard | null>(null);
  const [showCardDialog, setShowCardDialog] = useState(false);
  const [formData, setFormData] = useState(defaultFormData);

  const { data: clientes } = useQuery({
    queryKey: ['clientes-pendencias'],
    queryFn: async () => {
      const { data, error } = await supabase.from('clientes').select('id, nome').eq('ativo', true).order('nome');
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  useEffect(() => {
    if (profile?.cliente_id && !selectedCliente) {
      setSelectedCliente(profile.cliente_id);
    } else if (isAdmin && clientes?.length && !selectedCliente) {
      setSelectedCliente(clientes[0].id);
    }
  }, [profile, clientes, selectedCliente, isAdmin]);

  const { data: kanbanCards, isLoading: loadingCards } = useQuery({
    queryKey: ['kanban-config', selectedCliente],
    queryFn: async () => {
      if (!selectedCliente) return [];
      const { data, error } = await supabase
        .from('pendencias_kanban_config')
        .select('*')
        .eq('cliente_id', selectedCliente)
        .eq('ativo', true)
        .order('secao')
        .order('ordem');
      if (error) throw error;
      return data as KanbanCard[];
    },
    enabled: !!selectedCliente,
  });

  // Fetch counts for each card
  const { data: cardCounts, isLoading: loadingCounts, refetch: refetchCounts } = useQuery({
    queryKey: ['kanban-counts', selectedCliente, kanbanCards?.map(c => c.id).join(',')],
    queryFn: async () => {
      if (!selectedCliente || !kanbanCards?.length) return [];
      const counts: CardCount[] = [];

      for (const card of kanbanCards) {
        let count = 0;
        try {
          let query = supabase.from(card.fonte_dados as any).select('id', { count: 'exact', head: true });
          
          // Apply client filter if table has cliente_id
          if (['licitacoes', 'licitacao_etapas', 'licitacao_documentos_checklist', 'empenhos'].includes(card.fonte_dados)) {
            query = query.eq('cliente_id', selectedCliente);
          }

          if (card.filtro_status) {
            query = query.eq('status', card.filtro_status);
          }
          const dateField = card.filtro_data_campo || 'data_abertura';
          if (card.filtro_data_inicio_offset_dias !== null && card.filtro_data_inicio_offset_dias !== undefined) {
            const start = new Date();
            start.setDate(start.getDate() + card.filtro_data_inicio_offset_dias);
            start.setHours(0, 0, 0, 0);
            query = query.gte(dateField, start.toISOString());
          }
          if (card.filtro_data_fim_offset_dias !== null && card.filtro_data_fim_offset_dias !== undefined) {
            const end = new Date();
            end.setDate(end.getDate() + card.filtro_data_fim_offset_dias);
            end.setHours(23, 59, 59, 999);
            query = query.lte(dateField, end.toISOString());
          }
          if (card.filtro_responsavel_atual && profile?.id) {
            query = query.eq('responsavel_id', profile.id);
          }

          const { count: resultCount } = await query;
          count = resultCount || 0;
        } catch (e) {
          console.error(`Error counting for card ${card.titulo}:`, e);
        }
        counts.push({ cardId: card.id, count });
      }
      return counts;
    },
    enabled: !!selectedCliente && !!kanbanCards?.length,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      const payload: any = {
        cliente_id: selectedCliente,
        titulo: data.titulo,
        descricao: data.descricao || null,
        secao: data.secao,
        icone: data.icone,
        cor: data.cor,
        fonte_dados: data.fonte_dados,
        filtro_status: data.filtro_status || null,
        filtro_data_inicio_offset_dias: data.filtro_data_inicio_offset_dias !== '' ? parseInt(data.filtro_data_inicio_offset_dias) : null,
        filtro_data_fim_offset_dias: data.filtro_data_fim_offset_dias !== '' ? parseInt(data.filtro_data_fim_offset_dias) : null,
        filtro_data_campo: data.filtro_data_campo || null,
        filtro_responsavel_atual: data.filtro_responsavel_atual,
        ordem: kanbanCards?.length || 0,
      };

      if (data.id) {
        const { error } = await supabase.from('pendencias_kanban_config').update(payload).eq('id', data.id);
        if (error) throw error;
      } else {
        payload.created_by = profile?.id;
        const { error } = await supabase.from('pendencias_kanban_config').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingCard ? 'Card atualizado!' : 'Card criado!');
      queryClient.invalidateQueries({ queryKey: ['kanban-config'] });
      queryClient.invalidateQueries({ queryKey: ['kanban-counts'] });
      setShowCardDialog(false);
      setEditingCard(null);
      setFormData(defaultFormData);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('pendencias_kanban_config').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Card removido!');
      queryClient.invalidateQueries({ queryKey: ['kanban-config'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const openNewCard = () => {
    setEditingCard(null);
    setFormData(defaultFormData);
    setShowCardDialog(true);
  };

  const openEditCard = (card: KanbanCard) => {
    setEditingCard(card);
    setFormData({
      titulo: card.titulo,
      descricao: card.descricao || '',
      secao: card.secao,
      icone: card.icone,
      cor: card.cor,
      fonte_dados: card.fonte_dados,
      filtro_status: card.filtro_status || '',
      filtro_data_inicio_offset_dias: card.filtro_data_inicio_offset_dias?.toString() ?? '',
      filtro_data_fim_offset_dias: card.filtro_data_fim_offset_dias?.toString() ?? '',
      filtro_data_campo: card.filtro_data_campo || 'data_abertura',
      filtro_responsavel_atual: card.filtro_responsavel_atual || false,
    });
    setShowCardDialog(true);
  };

  const getCount = (cardId: string) => cardCounts?.find(c => c.cardId === cardId)?.count ?? 0;

  // Group cards by section
  const sections = kanbanCards?.reduce((acc, card) => {
    if (!acc[card.secao]) acc[card.secao] = [];
    acc[card.secao].push(card);
    return acc;
  }, {} as Record<string, KanbanCard[]>) || {};

  const sectionLabels: Record<string, string> = {
    licitacoes: 'LICITAÇÕES',
    documentos: 'DOCUMENTOS',
    workflow: 'WORKFLOW',
    geral: 'GERAL',
  };

  return (
    <MainLayout title="Pendências" subtitle="Painel de acompanhamento de atividades">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {isAdmin && (
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
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetchCounts()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          {isAdmin && (
            <>
              <Button variant="outline" size="sm" onClick={() => setShowConfig(!showConfig)}>
                <Settings className="h-4 w-4 mr-2" />
                {showConfig ? 'Visualizar' : 'Configurar'}
              </Button>
              {showConfig && (
                <Button size="sm" onClick={openNewCard}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Card
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      {loadingCards ? (
        <div className="space-y-8">
          {[1, 2].map(i => (
            <div key={i}>
              <Skeleton className="h-6 w-32 mb-4" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(j => <Skeleton key={j} className="h-36" />)}
              </div>
            </div>
          ))}
        </div>
      ) : Object.keys(sections).length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Painel não configurado</h3>
            <p className="text-muted-foreground mb-4">
              {isAdmin
                ? 'Configure os cards do painel Kanban clicando em "Configurar" e adicionando novos cards.'
                : 'O administrador ainda não configurou o painel de pendências para este cliente.'}
            </p>
            {isAdmin && (
              <Button onClick={() => { setShowConfig(true); openNewCard(); }}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Card
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(sections).map(([secao, cards]) => (
            <motion.div
              key={secao}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center justify-center gap-3 mb-6">
                <div className="h-px flex-1 bg-border/60" />
                <h2 className="text-sm font-bold text-muted-foreground tracking-[0.2em] uppercase">
                  {sectionLabels[secao] || secao.toUpperCase()}
                </h2>
                <div className="h-px flex-1 bg-border/60" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {cards.map((card, idx) => {
                  const IconComponent = ICON_MAP[card.icone] || Search;
                  const count = getCount(card.id);
                  const gradient = COR_GRADIENT_MAP[card.cor] || COR_GRADIENT_MAP.blue;
                  const iconBg = COR_ICON_BG_MAP[card.cor] || COR_ICON_BG_MAP.blue;
                  const accent = COR_ACCENT_MAP[card.cor] || COR_ACCENT_MAP.blue;
                  const corValue = COR_VALUE_MAP[card.cor] || COR_VALUE_MAP.blue;

                  return (
                    <motion.div
                      key={card.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.06, type: 'spring', stiffness: 300, damping: 25 }}
                      className="relative group"
                    >
                      <div
                        onClick={() => !showConfig && handleCardClick(card)}
                        className={cn(
                          'relative overflow-hidden rounded-xl border border-border/50 bg-card',
                          'shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300',
                          'backdrop-blur-sm',
                          !showConfig && card.fonte_dados === 'licitacoes' && 'cursor-pointer'
                        )}>
                        {/* Gradient background */}
                        <div className={cn('absolute inset-0 bg-gradient-to-br opacity-60 pointer-events-none', gradient)} />
                        
                        {/* Top accent bar */}
                        <div className={cn('h-1 w-full', accent)} />

                        <div className="relative p-5">
                          {/* Admin overlay */}
                          {showConfig && isAdmin && (
                            <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                              <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full" onClick={() => openEditCard(card)}>
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 rounded-full text-destructive hover:text-destructive"
                                onClick={() => deleteMutation.mutate(card.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}

                          {/* Icon */}
                          <div className="flex justify-center mb-3">
                            <div className={cn('flex items-center justify-center w-12 h-12 rounded-xl ring-1', iconBg)}>
                              <IconComponent className="h-6 w-6" />
                            </div>
                          </div>

                          {/* Title */}
                          <p className="text-sm font-semibold text-center text-foreground leading-tight min-h-[2.5rem] flex items-center justify-center">
                            {card.titulo}
                          </p>
                          {card.descricao && (
                            <p className="text-[11px] text-muted-foreground text-center mt-1 line-clamp-1">{card.descricao}</p>
                          )}

                          {/* Count */}
                          <div className="mt-4 pt-3 border-t border-border/50 text-center">
                            {loadingCounts ? (
                              <Skeleton className="h-9 w-20 mx-auto rounded-lg" />
                            ) : (
                              <p className={cn('text-3xl font-extrabold tabular-nums tracking-tight', corValue)}>
                                {count.toLocaleString('pt-BR')}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Card Config Dialog */}
      <Dialog open={showCardDialog} onOpenChange={setShowCardDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCard ? 'Editar Card' : 'Novo Card'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Título *</Label>
                <Input
                  value={formData.titulo}
                  onChange={e => setFormData(f => ({ ...f, titulo: e.target.value }))}
                  placeholder="Ex: Avisos Pendentes de Análise"
                />
              </div>
              <div>
                <Label>Seção</Label>
                <Select value={formData.secao} onValueChange={v => setFormData(f => ({ ...f, secao: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="licitacoes">Licitações</SelectItem>
                    <SelectItem value="documentos">Documentos</SelectItem>
                    <SelectItem value="workflow">Workflow</SelectItem>
                    <SelectItem value="geral">Geral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Descrição</Label>
              <Input
                value={formData.descricao}
                onChange={e => setFormData(f => ({ ...f, descricao: e.target.value }))}
                placeholder="Descrição breve (opcional)"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ícone</Label>
                <Select value={formData.icone} onValueChange={v => setFormData(f => ({ ...f, icone: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ICON_MAP).map(([key, Icon]) => (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-2">
                          <Icon className="h-4 w-4" /> {key}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cor</Label>
                <Select value={formData.cor} onValueChange={v => setFormData(f => ({ ...f, cor: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="green">🟢 Verde</SelectItem>
                    <SelectItem value="blue">🔵 Azul</SelectItem>
                    <SelectItem value="red">🔴 Vermelho</SelectItem>
                    <SelectItem value="yellow">🟡 Amarelo</SelectItem>
                    <SelectItem value="purple">🟣 Roxo</SelectItem>
                    <SelectItem value="gray">⚪ Cinza</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Fonte de Dados (Tabela)</Label>
              <Select value={formData.fonte_dados} onValueChange={v => setFormData(f => ({ ...f, fonte_dados: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="licitacoes">Licitações</SelectItem>
                  <SelectItem value="licitacao_etapas">Etapas de Licitação</SelectItem>
                  <SelectItem value="licitacao_etapa_execucao">Execução de Etapas</SelectItem>
                  <SelectItem value="licitacao_documentos_checklist">Documentos Checklist</SelectItem>
                  <SelectItem value="licitacao_aprovacoes">Aprovações</SelectItem>
                  <SelectItem value="licitacao_fluxo_aprovacao">Fluxo Aprovação</SelectItem>
                  <SelectItem value="empenhos">Empenhos</SelectItem>
                  <SelectItem value="notificacoes">Notificações</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Filtro: Status Geral</Label>
                <Select
                  value={formData.filtro_status || 'all'}
                  onValueChange={v => setFormData(f => ({ ...f, filtro_status: v === 'all' ? '' : v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Qualquer</SelectItem>
                    <SelectItem value="pendente_analise">🔴 Pendente de Análise</SelectItem>
                    <SelectItem value="em_andamento">🟢 Em Andamento</SelectItem>
                    <SelectItem value="finalizado">🔵 Finalizado</SelectItem>
                    <SelectItem value="recusado">⚫ Recusado</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Card abrirá /licitacoes filtrado por este status
                </p>
              </div>
              <div>
                <Label>Coluna de data</Label>
                <Select
                  value={formData.filtro_data_campo}
                  onValueChange={v => setFormData(f => ({ ...f, filtro_data_campo: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(DATE_FIELD_OPTIONS[formData.fonte_dados]?.fields ?? [
                      { value: 'created_at', label: 'Data de criação' },
                      { value: 'updated_at', label: 'Última atualização' },
                    ]).map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data início (dias a partir de hoje)</Label>
                <Input
                  type="number"
                  value={formData.filtro_data_inicio_offset_dias}
                  onChange={e => setFormData(f => ({ ...f, filtro_data_inicio_offset_dias: e.target.value }))}
                  placeholder="Ex: 0 (hoje) ou -7 (7 dias atrás)"
                />
              </div>
              <div>
                <Label>Data fim (dias a partir de hoje)</Label>
                <Input
                  type="number"
                  value={formData.filtro_data_fim_offset_dias}
                  onChange={e => setFormData(f => ({ ...f, filtro_data_fim_offset_dias: e.target.value }))}
                  placeholder="Ex: 10 (próximos 10 dias)"
                />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground -mt-2">
              Use 0 para "hoje", valores positivos para o futuro e negativos para o passado. Ex: início=0 e fim=10 → próximos 10 dias.
            </p>

            <div className="flex items-center gap-3">
              <Switch
                checked={formData.filtro_responsavel_atual}
                onCheckedChange={v => setFormData(f => ({ ...f, filtro_responsavel_atual: v }))}
              />
              <Label>Filtrar apenas registros do usuário atual</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCardDialog(false)}>Cancelar</Button>
            <Button
              onClick={() => saveMutation.mutate({ ...formData, id: editingCard?.id })}
              disabled={!formData.titulo || saveMutation.isPending}
            >
              {saveMutation.isPending ? 'Salvando...' : editingCard ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
