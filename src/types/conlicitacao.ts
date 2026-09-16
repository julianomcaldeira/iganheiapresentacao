// Types based on ConLicitacao API documentation
// API URL: https://consultaonline.conlicitacao.com.br/api

// Authentication: Header 'x-auth-token' with client token
// IP whitelist required (up to 10 IPs per client)

// ====== BOLETINS (Bulletins) ======

export interface BoletimHeader {
  /** ID do boletim */
  id: number;
  /** Data e hora do fechamento do boletim (Y-m-d H:i:s -03:00) */
  datahora_fechamento: string;
  /** Número do cadastro do cliente no CRM do ConLicitação */
  cliente: {
    id: number;
    razao_social: string;
    filtro: {
      id: number;
      descricao: string;
    };
  };
  /** Total de avisos de licitação contidos no boletim */
  quantidade_licitacoes: number;
  /** Total de avisos de acompanhamentos contidos no boletim */
  quantidade_acompanhamentos: number;
}

// ====== LICITAÇÕES ======

export interface OrgaoTelefone {
  ddd: string;
  numero: string;
  ramal?: string;
}

export interface Orgao {
  /** Unidade licitante responsável pela licitação */
  nome: string;
  /** Código UASG da unidade licitante */
  codigo?: string;
  /** Cidade da unidade licitante */
  cidade?: string;
  /** UF da unidade licitante */
  uf?: string;
  /** Endereço da unidade licitante */
  endereco?: string;
  /** Telefone da unidade licitante */
  telefone?: OrgaoTelefone[];
  /** Site de compras da unidade licitante */
  site?: string;
}

export interface Documento {
  filename: string;
  url: string;
}

export interface LicitacaoConlicitacao {
  /** Número identificador da licitação na plataforma ConLicitação */
  id: number;
  /** Dados do órgão licitante */
  orgao: Orgao;
  /** Objeto/escopo da licitação */
  objeto: string;
  /** Situação da licitação (NOVA, etc.) */
  situacao: string;
  /** Data e hora da abertura da licitação (Y-m-d H:i:s) */
  datahora_abertura?: string;
  /** Data e hora de entrega da documentação da licitação (Y-m-d H:i:s) */
  datahora_documento?: string;
  /** Data e hora da retirada do Edital da licitação (Y-m-d H:i:s) */
  datahora_retirada?: string;
  /** Data e hora da realização da visita técnica (Y-m-d H:i:s) */
  datahora_visita?: string;
  /** Data e hora do prazo da licitação (Y-m-d H:i:s) */
  datahora_prazo?: string;
  /** Código do certame */
  edital?: string;
  /** URLs para consulta do edital */
  documento?: Documento[];
  /** Número do processo */
  processo?: string;
  /** Observações gerais do edital */
  observacao?: string;
  /** Valor estimado do edital */
  preco_edital?: number;
  /** Valor estimado da licitação */
  valor_estimado?: number;
}

// ====== ACOMPANHAMENTOS ======

export interface AcompanhamentoConlicitacao {
  /** Número identificador da licitação na plataforma ConLicitação */
  id: number;
  /** Número ConLicitação referente ao aviso da licitação */
  licitacao_id?: number;
  /** Dados do órgão */
  orgao: {
    nome: string;
    cidade?: string;
    uf?: string;
  };
  /** Objeto/escopo da licitação */
  objeto: string;
  /** Explicações sobre o resultado */
  sintese?: string;
  /** Data da divulgação na fonte (Y-m-d) */
  data_fonte?: string;
  /** Código do certame */
  edital?: string;
  /** Número do processo */
  processo?: string;
}

// ====== API RESPONSES ======

export interface FiltrosResponse {
  cliente: {
    id: number;
    razao_social: string;
  };
  filtros: Array<{
    id: number;
    descricao: string;
    periodos: {
      manha: boolean;
      tarde: boolean;
      noite: boolean;
    };
    ultimo_boletim: {
      id: number;
      datahora_fechamento: string;
      numero_edicao: number;
    };
  }>;
}

export interface BoletinsListResponse {
  cliente: string;
  total_boletins: number;
  boletins: Array<{
    id: number;
    filtro_id: number;
    numero_edicao: number;
    datahora_fechamento: string;
  }>;
}

export interface BoletimResponse {
  boletim: BoletimHeader;
  licitacoes: LicitacaoConlicitacao[];
  acompanhamentos?: AcompanhamentoConlicitacao[];
}

// ====== API ENDPOINTS ======

/**
 * ConLicitacao API Endpoints:
 * 
 * 1. Listagem de Filtros:
 *    GET https://consultaonline.conlicitacao.com.br/api/filtros
 *    Header: x-auth-token: {token}
 * 
 * 2. Listagem de Boletins de um Filtro:
 *    GET https://consultaonline.conlicitacao.com.br/api/filtro/{ID_DO_FILTRO}/boletins
 *    Query params: page, per_page (default 100), order (asc|desc)
 *    Header: x-auth-token: {token}
 * 
 * 3. Detalhes de um Boletim (Licitações e Acompanhamentos):
 *    GET https://consultaonline.conlicitacao.com.br/api/boletim/{ID_DO_BOLETIM}
 *    Header: x-auth-token: {token}
 * 
 * BOLETIM SCHEDULE (default):
 *   - Manhã: 09h45
 *   - Tarde: 13h00
 *   - Noite: 18h30
 */

// ====== LOCAL CONFIG ======

export interface ConlicitacaoConfig {
  id: string;
  cliente_id: string;
  token: string;
  filtro_id?: number;
  filtro_descricao?: string;
  ativo: boolean;
  ultimo_boletim_id?: number;
  ultimo_sync?: string;
  created_at: string;
  updated_at: string;
}

export interface ConlicitacaoLog {
  id: string;
  cliente_id?: string;
  boletim_id?: number;
  filtro_id?: number;
  tipo: 'webhook' | 'sync' | 'manual';
  licitacoes_recebidas: number;
  licitacoes_novas: number;
  licitacoes_atualizadas: number;
  acompanhamentos_recebidos: number;
  sucesso: boolean;
  erro?: string;
  dados_brutos?: Record<string, unknown>;
  created_at: string;
}
