import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { sortEtapasForDisplay } from '@/lib/etapasOrder';
import { ensureEtapasInicializadas, type EtapaExecucaoRow } from '@/lib/ensureEtapas';
import { toast } from 'sonner';
import {
  Scale, CheckCircle, FolderOpen, DollarSign, Swords, Trophy, Layers, Loader2, 
  Brain, Users, Package, ListTodo, FileSignature, Receipt, Gavel, AlertTriangle
} from 'lucide-react';

const ETAPAS_INFO: Record<string, {
  nome: string;
  icon: typeof Scale;
}> = {
  analise_edital: { nome: 'Análise IA', icon: Brain },
  esclarecimento_impugnacao: { nome: 'Peças Jurídicas', icon: Scale },
  impugnacao_contrarrazao: { nome: 'Impugnação', icon: Gavel },
  aprovacoes: { nome: 'Aprovações', icon: CheckCircle },
  concorrentes: { nome: 'Concorrentes', icon: Users },
  preparacao_documentos: { nome: 'Documentos', icon: FolderOpen },
  produtos: { nome: 'Produtos', icon: Package },
  proposta: { nome: 'Proposta', icon: DollarSign },
  tarefas: { nome: 'Tarefas', icon: ListTodo },
  disputa_pregao: { nome: 'Disputa', icon: Swords },
  resultado: { nome: 'Resultado', icon: Trophy },
  contratos: { nome: 'Contratos', icon: FileSignature },
  empenhos: { nome: 'Empenhos', icon: Receipt },
};

interface Props {
  licitacaoId: string;
  clienteId: string;
}

export function LicitacaoProcessFlow({ licitacaoId, clienteId }: Props) {
  const [etapas, setEtapas] = useState<EtapaExecucaoRow[]>([]);
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [semConfig, setSemConfig] = useState(false);
  const [erroPermissao, setErroPermissao] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetch = async () => {
      const cfgRes = await supabase
        .from('licitacao_etapas_config')
        .select('*')
        .eq('cliente_id', clienteId)
        .eq('ativo', true)
        .order('ordem');
      if (cancelled) return;
      const cfgs = cfgRes.data || [];
      setConfigs(cfgs);

      const init = await ensureEtapasInicializadas(licitacaoId, clienteId);
      if (cancelled) return;
      setSemConfig(init.origem === 'semConfig');
      setErroPermissao(init.origem === 'erro' ? (init.permissaoBloqueada ?? 'Erro ao inicializar etapas') : null);
      if (init.origem === 'rpc') {
        toast.success('Etapas da licitação inicializadas');
      }
      if (init.origem === 'erro') {
        toast.error(`Falha ao inicializar etapas: ${init.permissaoBloqueada}`);
      }

      // Ordem configurada do cliente (a query já vem em ordem por `ordem`)
      const orderMap = new Map(cfgs.map((c: any, i: number) => [c.etapa_codigo, i]));
      // Mostra todas as etapas ativas configuradas para o cliente
      const raw = init.etapas || [];
      const sorted = sortEtapasForDisplay(
        raw,
        (e: any) => e.etapa_codigo,
        (e: any) => orderMap.get(e.etapa_codigo) ?? 999
      );
      setEtapas(sorted);
      setLoading(false);
    };
    fetch();
    return () => { cancelled = true; };
  }, [licitacaoId, clienteId]);

  const isCompleted = (status: string) =>
    ['edital_analisado', 'finalizada', 'concluido', 'documentos_analisados', 'proposta_finalizada', 'disputa_finalizada', 'resultado_finalizado', 'custom_concluida'].includes(status);

  const isActive = (status: string) =>
    status !== 'nao_iniciada' && !isCompleted(status);

  if (loading) {
    return <div className="flex justify-center py-2"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>;
  }

  if (etapas.length === 0 && (semConfig || erroPermissao)) {
    return (
      <div className="flex items-center gap-2 py-3 px-4 rounded-lg border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span className="text-sm">
          {semConfig
            ? 'Este cliente não possui etapas ativas em Etapas & Regras. Configure em Clientes → Etapas & Regras para exibir a esteira.'
            : `Não foi possível inicializar as etapas: ${erroPermissao}`}
        </span>
      </div>
    );
  }

  if (etapas.length === 0) return null;

  return (
    <div className="flex items-center py-3 px-4 rounded-lg border bg-card">
      <div className="flex items-center flex-1 justify-between">
        {etapas.map((etapa, idx) => {
          const info = ETAPAS_INFO[etapa.etapa_codigo];
          const config = configs.find((c: any) => c.etapa_codigo === etapa.etapa_codigo);
          const customName = config?.configuracoes?.nome_customizado;
          const Icon = info?.icon || Layers;
          const completed = isCompleted(etapa.status);
          const active = isActive(etapa.status);
          const nome = customName || info?.nome || etapa.etapa_codigo;

          return (
            <div key={etapa.id} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center gap-1 min-w-0 flex-shrink-0">
                <div
                  className={cn(
                    'flex items-center justify-center w-7 h-7 rounded-full transition-all',
                    completed
                      ? 'bg-emerald-500 text-white'
                      : active
                      ? 'ring-2 ring-primary text-primary bg-primary/10'
                      : 'bg-muted border border-border text-muted-foreground'
                  )}
                >
                  {completed ? (
                    <CheckCircle className="h-3.5 w-3.5" />
                  ) : (
                    <Icon className="h-3.5 w-3.5" />
                  )}
                </div>
                <span className={cn(
                  'text-[9px] leading-tight text-center whitespace-nowrap',
                  completed ? 'text-emerald-600 font-medium' : active ? 'text-foreground font-semibold' : 'text-muted-foreground'
                )}>
                  {nome}
                </span>
                {active && (
                  <span className="relative flex h-1.5 w-1.5 -mt-0.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
                  </span>
                )}
              </div>

              {idx < etapas.length - 1 && (
                <div className="flex-1 h-px mx-2 min-w-[8px]">
                  <div className={cn('h-full', completed ? 'bg-emerald-500' : 'bg-border')} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
