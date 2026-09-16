// Status geral das licitações — fonte única da verdade
export type LicitacaoStatusGeral =
  | 'pendente_analise'
  | 'em_andamento'
  | 'finalizado'
  | 'recusado';

export interface StatusConfig {
  value: LicitacaoStatusGeral;
  label: string;
  /** classes Tailwind para Badge (bg + text) */
  badgeClass: string;
  /** cor do ponto/indicador */
  dotClass: string;
  /** classe da cor de texto pura */
  textClass: string;
  /** descrição curta para tooltips */
  description: string;
}

export const STATUS_GERAL_LIST: StatusConfig[] = [
  {
    value: 'pendente_analise',
    label: 'Pendente de Análise',
    badgeClass: 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30',
    dotClass: 'bg-red-500',
    textClass: 'text-red-600 dark:text-red-400',
    description: 'Aguardando análise inicial',
  },
  {
    value: 'em_andamento',
    label: 'Em Andamento',
    badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30',
    dotClass: 'bg-emerald-500',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    description: 'Licitação sendo trabalhada',
  },
  {
    value: 'finalizado',
    label: 'Finalizado',
    badgeClass: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30',
    dotClass: 'bg-blue-500',
    textClass: 'text-blue-600 dark:text-blue-400',
    description: 'Processo concluído',
  },
  {
    value: 'recusado',
    label: 'Recusado',
    badgeClass: 'bg-foreground/10 text-foreground dark:bg-white/10 dark:text-white border border-foreground/20',
    dotClass: 'bg-foreground dark:bg-white',
    textClass: 'text-foreground',
    description: 'Descartado ou perdido',
  },
];

export const STATUS_GERAL_MAP: Record<LicitacaoStatusGeral, StatusConfig> =
  STATUS_GERAL_LIST.reduce((acc, s) => {
    acc[s.value] = s;
    return acc;
  }, {} as Record<LicitacaoStatusGeral, StatusConfig>);

export function getStatusConfig(status: string): { label: string; color: string } {
  const cfg = STATUS_GERAL_MAP[status as LicitacaoStatusGeral];
  if (cfg) return { label: cfg.label, color: cfg.badgeClass };
  return { label: status, color: 'bg-muted text-muted-foreground' };
}
