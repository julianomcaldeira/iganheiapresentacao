import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  FileText, Scale, CheckCircle, FolderOpen, DollarSign, Swords, Trophy,
  Loader2, AlertCircle, Clock, Layers, Brain, Users, Package,
  ListTodo, FileSignature, Receipt, Gavel, MessageCircle, Plus, Radio
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { ResponsaveisMultiSelect } from '@/components/tarefas/ResponsaveisMultiSelect';
import { createTarefaWithNotifications } from '@/lib/tarefasService';
import { sortEtapasForDisplay } from '@/lib/etapasOrder';
import { EtapaEsclarecimento } from './etapas/EtapaEsclarecimento';
import { EtapaAprovacoes } from './etapas/EtapaAprovacoes';
import { EtapaDocumentos } from './etapas/EtapaDocumentos';
import { EtapaProposta } from './etapas/EtapaProposta';
import { EtapaDisputa } from './etapas/EtapaDisputa';
import { EtapaResultado } from './etapas/EtapaResultado';
import { EtapaAnaliseEdital } from './etapas/EtapaAnaliseEdital';
import { LicitacaoHistorico } from './LicitacaoHistorico';
import { LicitacaoMonitoramento } from './LicitacaoMonitoramento';

// Lazy-loaded tab components used as step content
import { ConcorrentesAnalysis } from './ConcorrentesAnalysis';
import { AprovacaoTab } from './tabs/AprovacaoTab';
import { ImpugnacaoContrarrazaoTab } from './tabs/ImpugnacaoContrarrazaoTab';
import { ContratosTab } from './tabs/ContratosTab';
import { EmpenhosTab } from './tabs/EmpenhosTab';
import { DocumentosTab } from './tabs/DocumentosTab';
import { ChatInternoTab } from './tabs/ChatInternoTab';

const ETAPAS_INFO: Record<string, {
  nome: string;
  icon: typeof FileText;
  cor: string;
  statusLabels: Record<string, { label: string; color: string }>;
}> = {
  analise_edital: {
    nome: 'Análise IA',
    icon: Brain,
    cor: '#6366F1',
    statusLabels: {
      nao_iniciada: { label: 'Não Iniciada', color: 'bg-muted text-muted-foreground' },
      edital_pendente_analise: { label: 'Pendente Análise', color: 'bg-yellow-500/20 text-yellow-600' },
      edital_analisado: { label: 'Analisado', color: 'bg-emerald-500/20 text-emerald-600' },
    },
  },
  esclarecimento_impugnacao: {
    nome: 'Peças Jurídicas',
    icon: Scale,
    cor: '#8B5CF6',
    statusLabels: {
      nao_iniciada: { label: 'Não Iniciada', color: 'bg-muted text-muted-foreground' },
      pendente: { label: 'Pendente', color: 'bg-yellow-500/20 text-yellow-600' },
      elaborando_peca: { label: 'Elaborando Peça', color: 'bg-blue-500/20 text-blue-600' },
      peca_enviada: { label: 'Peça Enviada', color: 'bg-purple-500/20 text-purple-600' },
      finalizada: { label: 'Finalizada', color: 'bg-emerald-500/20 text-emerald-600' },
    },
  },
  impugnacao_contrarrazao: {
    nome: 'Impugnação / Contra-Razão',
    icon: Gavel,
    cor: '#7C3AED',
    statusLabels: {
      nao_iniciada: { label: 'Não Iniciada', color: 'bg-muted text-muted-foreground' },
      pendente: { label: 'Pendente', color: 'bg-yellow-500/20 text-yellow-600' },
      elaborando_peca: { label: 'Elaborando Peça', color: 'bg-blue-500/20 text-blue-600' },
      peca_enviada: { label: 'Peça Enviada', color: 'bg-purple-500/20 text-purple-600' },
      finalizada: { label: 'Finalizada', color: 'bg-emerald-500/20 text-emerald-600' },
    },
  },
  aprovacoes: {
    nome: 'Aprovações',
    icon: CheckCircle,
    cor: '#10B981',
    statusLabels: {
      nao_iniciada: { label: 'Não Iniciada', color: 'bg-muted text-muted-foreground' },
      aguardando_aprovacoes: { label: 'Aguardando', color: 'bg-yellow-500/20 text-yellow-600' },
      concluido: { label: 'Concluído', color: 'bg-emerald-500/20 text-emerald-600' },
    },
  },
  concorrentes: {
    nome: 'Concorrentes',
    icon: Users,
    cor: '#0EA5E9',
    statusLabels: {
      nao_iniciada: { label: 'Não Iniciada', color: 'bg-muted text-muted-foreground' },
      em_andamento: { label: 'Em Andamento', color: 'bg-blue-500/20 text-blue-600' },
      concluido: { label: 'Concluído', color: 'bg-emerald-500/20 text-emerald-600' },
    },
  },
  preparacao_documentos: {
    nome: 'Preparação de Documentos',
    icon: FolderOpen,
    cor: '#F59E0B',
    statusLabels: {
      nao_iniciada: { label: 'Não Iniciada', color: 'bg-muted text-muted-foreground' },
      em_analise: { label: 'Em Análise', color: 'bg-yellow-500/20 text-yellow-600' },
      documentos_analisados: { label: 'Analisados', color: 'bg-emerald-500/20 text-emerald-600' },
    },
  },
  produtos: {
    nome: 'Produtos',
    icon: Package,
    cor: '#F97316',
    statusLabels: {
      nao_iniciada: { label: 'Não Iniciada', color: 'bg-muted text-muted-foreground' },
      em_andamento: { label: 'Em Andamento', color: 'bg-blue-500/20 text-blue-600' },
      concluido: { label: 'Concluído', color: 'bg-emerald-500/20 text-emerald-600' },
    },
  },
  proposta: {
    nome: 'Proposta',
    icon: DollarSign,
    cor: '#EC4899',
    statusLabels: {
      nao_iniciada: { label: 'Não Iniciada', color: 'bg-muted text-muted-foreground' },
      pendente: { label: 'Pendente', color: 'bg-yellow-500/20 text-yellow-600' },
      elaborando_proposta: { label: 'Elaborando', color: 'bg-blue-500/20 text-blue-600' },
      proposta_finalizada: { label: 'Finalizada', color: 'bg-emerald-500/20 text-emerald-600' },
    },
  },
  tarefas: {
    nome: 'Tarefas',
    icon: ListTodo,
    cor: '#06B6D4',
    statusLabels: {
      nao_iniciada: { label: 'Não Iniciada', color: 'bg-muted text-muted-foreground' },
      em_andamento: { label: 'Em Andamento', color: 'bg-blue-500/20 text-blue-600' },
      concluido: { label: 'Concluído', color: 'bg-emerald-500/20 text-emerald-600' },
    },
  },
  disputa_pregao: {
    nome: 'Disputa do Pregão',
    icon: Swords,
    cor: '#EF4444',
    statusLabels: {
      nao_iniciada: { label: 'Não Iniciada', color: 'bg-muted text-muted-foreground' },
      pendente: { label: 'Pendente', color: 'bg-yellow-500/20 text-yellow-600' },
      em_disputa: { label: 'Em Disputa', color: 'bg-red-500/20 text-red-600' },
      recurso_contrarrazao: { label: 'Recurso', color: 'bg-orange-500/20 text-orange-600' },
      disputa_finalizada: { label: 'Finalizada', color: 'bg-emerald-500/20 text-emerald-600' },
    },
  },
  resultado: {
    nome: 'Resultado',
    icon: Trophy,
    cor: '#14B8A6',
    statusLabels: {
      nao_iniciada: { label: 'Não Iniciada', color: 'bg-muted text-muted-foreground' },
      pendente: { label: 'Pendente', color: 'bg-yellow-500/20 text-yellow-600' },
      aguardando_resultado: { label: 'Aguardando', color: 'bg-blue-500/20 text-blue-600' },
      resultado_finalizado: { label: 'Finalizado', color: 'bg-emerald-500/20 text-emerald-600' },
    },
  },
  contratos: {
    nome: 'Contratos',
    icon: FileSignature,
    cor: '#0D9488',
    statusLabels: {
      nao_iniciada: { label: 'Não Iniciada', color: 'bg-muted text-muted-foreground' },
      em_andamento: { label: 'Em Andamento', color: 'bg-blue-500/20 text-blue-600' },
      concluido: { label: 'Concluído', color: 'bg-emerald-500/20 text-emerald-600' },
    },
  },
  empenhos: {
    nome: 'Empenhos',
    icon: Receipt,
    cor: '#84CC16',
    statusLabels: {
      nao_iniciada: { label: 'Não Iniciada', color: 'bg-muted text-muted-foreground' },
      em_andamento: { label: 'Em Andamento', color: 'bg-blue-500/20 text-blue-600' },
      concluido: { label: 'Concluído', color: 'bg-emerald-500/20 text-emerald-600' },
    },
  },
};

interface EtapaConfig {
  id: string;
  etapa_codigo: string;
  ativo: boolean;
  ordem: number;
  configuracoes: Record<string, unknown>;
}

interface EtapaExecucao {
  id: string;
  licitacao_id: string;
  etapa_codigo: string;
  status: string;
  dados: Record<string, unknown>;
  observacoes: string | null;
  data_inicio: string | null;
  data_conclusao: string | null;
}

interface LicitacaoEtapasTimelineProps {
  licitacaoId: string;
  clienteId: string;
  licitacaoData?: {
    numero: string;
    objeto: string;
    orgao: string;
    modalidade?: string;
    valor_estimado?: number;
    data_encerramento?: string;
    data_abertura?: string;
    edital_url?: string;
    relevancia?: string;
  };
  onRefresh?: () => void;
  declaracaoTemplates?: any[];
  generateDeclaracao?: (template: any) => string;
  showChat?: boolean;
}

export function LicitacaoEtapasTimeline({ licitacaoId, clienteId, licitacaoData, onRefresh, declaracaoTemplates, generateDeclaracao, showChat }: LicitacaoEtapasTimelineProps) {
  const [etapas, setEtapas] = useState<EtapaExecucao[]>([]);
  const [configs, setConfigs] = useState<EtapaConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEtapa, setSelectedEtapa] = useState<string | null>(null);
  const [showChatPanel, setShowChatPanel] = useState(false);

  useEffect(() => {
    fetchEtapas();
  }, [licitacaoId, clienteId]);

  const fetchEtapas = async () => {
    setLoading(true);

    const { data: clientConfigs } = await supabase
      .from('licitacao_etapas_config')
      .select('*')
      .eq('cliente_id', clienteId)
      .eq('ativo', true)
      .order('ordem');

    const parsedConfigs: EtapaConfig[] = (clientConfigs || []).map(c => ({
      ...c,
      configuracoes: (c.configuracoes as Record<string, unknown>) || {},
    }));
    setConfigs(parsedConfigs);

    const { data: existingEtapas } = await supabase
      .from('licitacao_etapa_execucao')
      .select('*')
      .eq('licitacao_id', licitacaoId);

    if (!existingEtapas || existingEtapas.length === 0) {
      await supabase.rpc('inicializar_etapas_licitacao', {
        p_licitacao_id: licitacaoId,
        p_cliente_id: clienteId,
      });

      const { data } = await supabase
        .from('licitacao_etapa_execucao')
        .select('*')
        .eq('licitacao_id', licitacaoId);

      if (data) {
        const mapped = sortByConfig(data, parsedConfigs);
        setEtapas(mapped);
        if (mapped.length > 0) setSelectedEtapa(mapped[0].etapa_codigo);
      }
    } else {
      const mapped = sortByConfig(existingEtapas, parsedConfigs);
      setEtapas(mapped);
      const first = mapped.find(e => !isCompleted(e.status));
      if (first) setSelectedEtapa(first.etapa_codigo);
      else if (mapped.length > 0) setSelectedEtapa(mapped[0].etapa_codigo);
    }

    setLoading(false);
  };

  const sortByConfig = (data: any[], cfgs: EtapaConfig[]): EtapaExecucao[] => {
    const orderMap = new Map(cfgs.map(c => [c.etapa_codigo, c.ordem]));
    const mapped = data
      .filter(d => d.etapa_codigo !== 'disputa_pregao')
      .map(d => ({ ...d, dados: (d.dados as Record<string, unknown>) || {} }));
    // Normaliza exibição para a ordem canônica quando o banco ainda tem a legada
    return sortEtapasForDisplay(
      mapped,
      (d) => d.etapa_codigo,
      (d) => orderMap.get(d.etapa_codigo) ?? 999
    );
  };

  const getEtapaNome = (codigo: string): string => {
    const config = configs.find(c => c.etapa_codigo === codigo);
    const customName = config?.configuracoes?.nome_customizado as string;
    if (customName) return customName;
    return ETAPAS_INFO[codigo]?.nome || codigo;
  };

  const isCompleted = (status: string) => {
    return ['edital_analisado', 'finalizada', 'concluido', 'documentos_analisados', 'proposta_finalizada', 'disputa_finalizada', 'resultado_finalizado', 'custom_concluida'].includes(status);
  };

  const isActive = (status: string) => {
    return status !== 'nao_iniciada' && !isCompleted(status);
  };

  const updateEtapaStatus = async (etapaCodigo: string, newStatus: string, dados?: Record<string, unknown>) => {
    const etapa = etapas.find(e => e.etapa_codigo === etapaCodigo);
    if (!etapa) return;

    const updatePayload: any = { status: newStatus };
    if (dados) updatePayload.dados = { ...etapa.dados, ...dados };
    if (newStatus !== 'nao_iniciada' && !etapa.data_inicio) updatePayload.data_inicio = new Date().toISOString();
    if (isCompleted(newStatus)) updatePayload.data_conclusao = new Date().toISOString();

    const { error } = await supabase
      .from('licitacao_etapa_execucao')
      .update(updatePayload)
      .eq('id', etapa.id);

    if (error) {
      toast.error('Erro ao atualizar etapa');
      return;
    }

    toast.success('Etapa atualizada!');
    fetchEtapas();
    onRefresh?.();
  };

  const getProgress = () => {
    if (etapas.length === 0) return 0;
    const completed = etapas.filter(e => isCompleted(e.status)).length;
    return Math.round((completed / etapas.length) * 100);
  };

  const renderEtapaContent = (etapa: EtapaExecucao) => {
    const commonProps = {
      etapa,
      licitacaoId,
      clienteId,
      licitacaoData,
      onStatusChange: updateEtapaStatus,
      onRefresh: fetchEtapas,
    };

    switch (etapa.etapa_codigo) {
      case 'analise_edital':
        return <EtapaAnaliseEdital {...commonProps} />;
      case 'esclarecimento_impugnacao':
        return <EtapaEsclarecimento {...commonProps} />;
      case 'impugnacao_contrarrazao':
        return (
          <ImpugnacaoContrarrazaoTab
            licitacaoId={licitacaoId}
            clienteId={clienteId}
            licitacaoData={licitacaoData ? { numero: licitacaoData.numero, objeto: licitacaoData.objeto, orgao: licitacaoData.orgao } : undefined}
          />
        );
      case 'aprovacoes':
        return <AprovacaoTab licitacaoId={licitacaoId} />;
      case 'concorrentes':
        return (
          <ConcorrentesAnalysis
            clienteId={clienteId}
            licitacaoId={licitacaoId}
            licitacaoObjeto={licitacaoData?.objeto || ''}
          />
        );
      case 'preparacao_documentos':
        return (
          <DocumentosTab
            licitacaoId={licitacaoId}
            clienteId={clienteId}
            declaracaoTemplates={declaracaoTemplates || []}
            generateDeclaracao={generateDeclaracao || ((_t: any) => '')}
          />
        );
      case 'produtos':
        return <EtapaProdutos licitacaoId={licitacaoId} clienteId={clienteId} />;
      case 'proposta':
        return <EtapaProposta {...commonProps} />;
      case 'tarefas':
        return <EtapaTarefas licitacaoId={licitacaoId} clienteId={clienteId} />;
      case 'disputa_pregao':
        return <EtapaDisputa {...commonProps} />;
      case 'resultado':
        return <EtapaResultado {...commonProps} />;
      case 'contratos':
        return <ContratosTab licitacaoId={licitacaoId} clienteId={clienteId} />;
      case 'empenhos':
        return <EmpenhosTab licitacaoId={licitacaoId} clienteId={clienteId} />;
      default: {
        const isCustomCompleted = isCompleted(etapa.status);
        const isCustomActive = isActive(etapa.status);
        return (
          <div className="space-y-4">
            {etapa.status === 'nao_iniciada' && (
              <Button size="sm" onClick={() => updateEtapaStatus(etapa.etapa_codigo, 'em_andamento')}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Iniciar Etapa
              </Button>
            )}
            {isCustomActive && (
              <div className="flex gap-2">
                <Button size="sm" onClick={() => updateEtapaStatus(etapa.etapa_codigo, 'custom_concluida')}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Concluir Etapa
                </Button>
              </div>
            )}
            {isCustomCompleted && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                <span className="text-sm text-emerald-600 font-medium">Etapa concluída</span>
              </div>
            )}
            {etapa.observacoes && (
              <div className="p-3 rounded-lg bg-muted/50 border">
                <p className="text-xs text-muted-foreground mb-1">Observações</p>
                <p className="text-sm">{etapa.observacoes}</p>
              </div>
            )}
          </div>
        );
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (etapas.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="font-medium">Nenhuma etapa configurada</p>
          <p className="text-sm text-muted-foreground mt-1">
            Configure as etapas da licitação no cadastro do cliente
          </p>
        </CardContent>
      </Card>
    );
  }

  const selectedEtapaData = etapas.find(e => e.etapa_codigo === selectedEtapa);

  const defaultTab = selectedEtapa || (etapas.length > 0 ? etapas[0].etapa_codigo : 'chat');

  return (
    <Tabs defaultValue={defaultTab} value={selectedEtapa || 'chat'} onValueChange={(v) => {
      if (v === 'chat') {
        setSelectedEtapa(null);
        setShowChatPanel(true);
      } else {
        setSelectedEtapa(v);
        setShowChatPanel(false);
      }
    }} className="space-y-4">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${getProgress()}%` }}
          />
        </div>
        <span className="text-xs font-semibold text-muted-foreground">{getProgress()}%</span>
      </div>

      {/* Tabs navigation */}
      <ScrollArea className="w-full">
        <TabsList className="inline-flex h-auto p-1 gap-1 bg-muted w-max">
          {etapas.map((etapa) => {
            const info = ETAPAS_INFO[etapa.etapa_codigo];
            const Icon = info?.icon || Layers;
            const completed = isCompleted(etapa.status);
            const active = isActive(etapa.status);

            return (
              <TabsTrigger
                key={etapa.id}
                value={etapa.etapa_codigo}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap data-[state=active]:shadow-sm',
                  completed && 'data-[state=active]:text-emerald-700'
                )}
              >
                {completed ? (
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Icon className={cn('h-3.5 w-3.5', active && 'text-primary')} />
                )}
                {getEtapaNome(etapa.etapa_codigo)}
                {active && (
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
                  </span>
                )}
              </TabsTrigger>
            );
          })}
          {showChat !== false && (
            <TabsTrigger value="chat" className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap">
              <MessageCircle className="h-3.5 w-3.5" />
              Chat Interno
            </TabsTrigger>
          )}
          <TabsTrigger value="monitoramento" className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap">
            <Radio className="h-3.5 w-3.5" />
            Monitoramento
          </TabsTrigger>
          <TabsTrigger value="historico-atualizacoes" className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap">
            <Clock className="h-3.5 w-3.5" />
            Histórico
          </TabsTrigger>
        </TabsList>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Tab contents */}
      {etapas.map((etapa) => {
        const info = ETAPAS_INFO[etapa.etapa_codigo];
        const config = configs.find(c => c.etapa_codigo === etapa.etapa_codigo);
        const etapaColor = (config?.configuracoes?.cor_customizada as string) || info?.cor || '#6366F1';
        const Icon = info?.icon || Layers;
        const completed = isCompleted(etapa.status);

        const defaultLabels: Record<string, { label: string; color: string }> = {
          nao_iniciada: { label: 'Não Iniciada', color: 'bg-muted text-muted-foreground' },
          em_andamento: { label: 'Em Andamento', color: 'bg-blue-500/20 text-blue-600' },
          custom_concluida: { label: 'Concluída', color: 'bg-emerald-500/20 text-emerald-600' },
        };
        const labels = info?.statusLabels || defaultLabels;
        const statusInfo = labels[etapa.status] || defaultLabels.nao_iniciada;

        return (
          <TabsContent key={etapa.id} value={etapa.etapa_codigo} className="mt-0">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b">
              <div
                className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-xl',
                  completed ? 'bg-emerald-500/15' : 'bg-primary/10'
                )}
              >
                <Icon className="h-5 w-5" style={{ color: completed ? '#10B981' : etapaColor }} />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold">{getEtapaNome(etapa.etapa_codigo)}</h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {etapa.data_inicio && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Início: {new Date(etapa.data_inicio).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                  {etapa.data_conclusao && (
                    <span>• Concluída: {new Date(etapa.data_conclusao).toLocaleDateString('pt-BR')}</span>
                  )}
                </div>
              </div>
              <Badge className={cn('text-xs', statusInfo.color)}>
                {statusInfo.label}
              </Badge>
            </div>
            {renderEtapaContent(etapa)}
          </TabsContent>
        );
      })}

      {showChat !== false && (
        <TabsContent value="chat" className="mt-0">
          <div className="flex items-center gap-3 mb-4 pb-3 border-b">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
              <MessageCircle className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold">Chat Interno</h3>
              <p className="text-xs text-muted-foreground">Comunicação da equipe sobre esta licitação</p>
            </div>
          </div>
          <ChatInternoTab licitacaoId={licitacaoId} />
        </TabsContent>
      )}

      <TabsContent value="monitoramento" className="mt-0">
        <div className="flex items-center gap-3 mb-4 pb-3 border-b">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
            <Radio className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold">Monitoramento do Pregão</h3>
            <p className="text-xs text-muted-foreground">
              {licitacaoData?.objeto
                ? `Objeto: ${licitacaoData.objeto}`
                : 'Mensagens do chat da sessão pública capturadas em tempo real'}
            </p>
          </div>
        </div>
        <LicitacaoMonitoramento
          licitacaoId={licitacaoId}
          licitacaoNumero={licitacaoData?.numero}
          licitacaoObjeto={licitacaoData?.objeto}
          licitacaoOrgao={licitacaoData?.orgao}
          licitacaoValorEstimado={licitacaoData?.valor_estimado}
        />
      </TabsContent>

      <TabsContent value="historico-atualizacoes" className="mt-0">
        <div className="flex items-center gap-3 mb-4 pb-3 border-b">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold">Histórico de atualizações</h3>
            <p className="text-xs text-muted-foreground">Versões e mudanças desta licitação ao longo do tempo</p>
          </div>
        </div>
        <div className="max-h-[65vh] overflow-y-auto pr-2 -mr-2">
          <LicitacaoHistorico licitacaoId={licitacaoId} />
        </div>
      </TabsContent>
    </Tabs>
  );
}

// ===== Inline Step Components for Produtos and Tarefas =====

function EtapaProdutos({ licitacaoId, clienteId }: { licitacaoId: string; clienteId: string }) {
  const [produtos, setProdutos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('licitacao_produtos')
        .select('*')
        .eq('licitacao_id', licitacaoId)
        .order('item_numero');
      setProdutos(data || []);
      setLoading(false);
    };
    fetch();
  }, [licitacaoId]);

  if (loading) return <Loader2 className="h-5 w-5 animate-spin mx-auto" />;

  const formatCurrency = (v: number | null) => {
    if (!v) return 'R$ 0,00';
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="h-5 w-5 text-primary" />
          <div>
            <h3 className="text-sm font-semibold">Produtos da Licitação</h3>
            <p className="text-xs text-muted-foreground">{produtos.length} itens • Total: {formatCurrency(produtos.reduce((s, p) => s + (p.valor_total || 0), 0))}</p>
          </div>
        </div>
      </div>
      {produtos.length > 0 ? (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-2 w-16">Item</th>
                <th className="text-left p-2">Descrição</th>
                <th className="text-right p-2 w-20">Qtd</th>
                <th className="text-right p-2 w-28">Unit.</th>
                <th className="text-right p-2 w-28">Total</th>
              </tr>
            </thead>
            <tbody>
              {produtos.map(p => (
                <tr key={p.id} className="border-t">
                  <td className="p-2 font-medium">{p.item_numero}</td>
                  <td className="p-2">{p.descricao}</td>
                  <td className="p-2 text-right">{p.quantidade}</td>
                  <td className="p-2 text-right">{formatCurrency(p.valor_unitario)}</td>
                  <td className="p-2 text-right font-semibold">{formatCurrency(p.valor_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <Package className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm font-medium">Nenhum produto adicionado</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function EtapaTarefas({ licitacaoId, clienteId }: { licitacaoId: string; clienteId: string }) {
  const { user, profile } = useAuth();
  const [tarefas, setTarefas] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<{ id: string; nome: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    titulo: '',
    descricao: '',
    prioridade: 'media' as 'baixa' | 'media' | 'alta' | 'urgente',
    data_vencimento: '',
    responsaveis_ids: [] as string[],
  });

  const fetchTarefas = async () => {
    const { data } = await supabase
      .from('tarefas')
      .select('*, responsavel:profiles!tarefas_responsavel_id_fkey(nome)')
      .eq('licitacao_id', licitacaoId)
      .order('created_at', { ascending: false });
    setTarefas(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchTarefas();
    supabase.from('profiles').select('id, nome').eq('ativo', true).order('nome')
      .then(({ data }) => setProfiles(data || []));
  }, [licitacaoId]);

  const handleCreate = async () => {
    if (!form.titulo.trim()) {
      toast.error('Informe o título da tarefa');
      return;
    }
    if (!user?.id || !profile) return;
    setSaving(true);
    try {
      await createTarefaWithNotifications({
        titulo: form.titulo,
        descricao: form.descricao || null,
        prioridade: form.prioridade,
        data_vencimento: form.data_vencimento ? new Date(form.data_vencimento).toISOString() : null,
        responsaveis_ids: form.responsaveis_ids,
        licitacao_id: licitacaoId,
        criador_id: user.id,
        criador_nome: profile.nome || user.email || 'Usuário',
        cliente_id: clienteId,
      });
      toast.success('Tarefa criada!');
      setOpenDialog(false);
      setForm({ titulo: '', descricao: '', prioridade: 'media', data_vencimento: '', responsaveis_ids: [] });
      fetchTarefas();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao criar tarefa');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader2 className="h-5 w-5 animate-spin mx-auto" />;

  const statusColors: Record<string, string> = {
    pendente: 'bg-yellow-500/20 text-yellow-700',
    em_andamento: 'bg-blue-500/20 text-blue-700',
    concluida: 'bg-emerald-500/20 text-emerald-700',
    cancelada: 'bg-muted text-muted-foreground',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ListTodo className="h-5 w-5 text-primary" />
          <div>
            <h3 className="text-sm font-semibold">Tarefas da Licitação</h3>
            <p className="text-xs text-muted-foreground">{tarefas.length} tarefas</p>
          </div>
        </div>
        <Button size="sm" onClick={() => setOpenDialog(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> Nova Tarefa
        </Button>
      </div>
      {tarefas.length > 0 ? (
        <div className="space-y-2">
          {tarefas.map(t => (
            <div key={t.id} className="p-3 rounded-lg border flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{t.titulo}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={cn('text-[10px]', statusColors[t.status] || 'bg-muted text-muted-foreground')}>
                    {t.status === 'em_andamento' ? 'Em Andamento' : t.status === 'concluida' ? 'Concluída' : t.status === 'cancelada' ? 'Cancelada' : 'Pendente'}
                  </Badge>
                  {t.responsavel?.nome && (
                    <span className="text-[10px] text-muted-foreground">{t.responsavel.nome}</span>
                  )}
                </div>
              </div>
              {t.data_vencimento && (
                <span className="text-xs text-muted-foreground shrink-0 ml-2">
                  {new Date(t.data_vencimento).toLocaleDateString('pt-BR')}
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <ListTodo className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm font-medium">Nenhuma tarefa vinculada</p>
            <p className="text-xs text-muted-foreground mt-1">Use o botão "Nova Tarefa" acima para criar uma vinculada a esta licitação.</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Nova Tarefa para esta Licitação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 overflow-y-auto flex-1 pr-2">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} placeholder="Título da tarefa" />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} placeholder="Descrição detalhada" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select value={form.prioridade} onValueChange={v => setForm({ ...form, prioridade: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgente">Urgente</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="baixa">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data de Vencimento</Label>
                <Input type="date" value={form.data_vencimento} onChange={e => setForm({ ...form, data_vencimento: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Responsáveis</Label>
              <ResponsaveisMultiSelect
                profiles={profiles}
                selectedIds={form.responsaveis_ids}
                onChange={(ids) => setForm({ ...form, responsaveis_ids: ids })}
                placeholder="Selecionar um ou mais responsáveis"
              />
              <p className="text-xs text-muted-foreground">Os responsáveis selecionados receberão uma notificação no sistema.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Criar Tarefa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
