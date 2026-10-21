/**
 * Configuração da base de demonstração.
 *
 * Fica salva no navegador (localStorage) e é aplicada pela seção
 * "Base Demo" das Configurações. Permite definir, entre outras coisas,
 * quantas licitações devem ficar em cada status.
 */
import type { PerfilEmpresa } from '@/lib/cenariosEmpresa';

export const STATUS_DISPONIVEIS = [
  'finalizado',
  'em_andamento',
  'recusado',
  'pendente_analise',
] as const;

export type StatusConfiguravel = (typeof STATUS_DISPONIVEIS)[number];

export interface ConfigBaseDemo {
  /** Quantidade de licitações por status geral */
  porStatus: Record<string, number>;
  /** Quantidade de certidões geradas por empresa */
  certidoesPorEmpresa: number;
  /** Gerar ao menos uma certidão vencida por empresa */
  incluirCertidaoVencida: boolean;
  /** Aplicar cenário de etapas distinto por empresa */
  cenariosPorEmpresa: boolean;
  /** Popular o processo licitatório (etapas, IA, peças, resultado) */
  popularProcesso: boolean;
  /** Replicar a base de documentos nas licitações */
  sincronizarDocumentos: boolean;
  /** Gerar cenários distintos por cliente (etapas/regras/templates) */
  cenariosPorCliente: boolean;
  /** Perfil manual por empresa (vazio = automático) */
  perfisPorEmpresa: Record<string, PerfilEmpresa>;
  /** Distribuir as licitações por empresa antes de aplicar os status */
  vincularEmpresas: boolean;
}

export const CONFIG_PADRAO: ConfigBaseDemo = {
  porStatus: {
    finalizado: 3,
    em_andamento: 3,
    recusado: 2,
    pendente_analise: 2,
  },
  certidoesPorEmpresa: 10,
  incluirCertidaoVencida: true,
  cenariosPorEmpresa: true,
  popularProcesso: true,
  sincronizarDocumentos: true,
  cenariosPorCliente: false,
  perfisPorEmpresa: {},
  vincularEmpresas: true,
};

const CHAVE = 'iganhei.config.base-demo';

export function carregarConfigBaseDemo(): ConfigBaseDemo {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return { ...CONFIG_PADRAO };
    const salvo = JSON.parse(bruto);
    return {
      ...CONFIG_PADRAO,
      ...salvo,
      porStatus: { ...CONFIG_PADRAO.porStatus, ...(salvo.porStatus || {}) },
      perfisPorEmpresa: { ...(salvo.perfisPorEmpresa || {}) },
    };
  } catch {
    return { ...CONFIG_PADRAO };
  }
}

export function salvarConfigBaseDemo(config: ConfigBaseDemo): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(config));
  } catch {
    // ignora falha de storage (modo privado etc.)
  }
}

export function restaurarConfigBaseDemo(): ConfigBaseDemo {
  const cfg = { ...CONFIG_PADRAO, porStatus: { ...CONFIG_PADRAO.porStatus }, perfisPorEmpresa: {} };
  salvarConfigBaseDemo(cfg);
  return cfg;
}

/** Total de licitações que a configuração exige. */
export function totalConfigurado(config: ConfigBaseDemo): number {
  return Object.values(config.porStatus).reduce((s, n) => s + (Number(n) || 0), 0);
}
