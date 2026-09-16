export interface Licitacao {
  id: string;
  numero: string;
  orgao: string;
  objeto: string;
  valor: number;
  dataAbertura: string;
  dataEncerramento: string;
  status: 'nova' | 'em_analise' | 'aprovada' | 'participando' | 'ganha' | 'perdida' | 'cancelada';
  relevancia: 'alta' | 'media' | 'baixa';
  modalidade: string;
  portal: string;
}

export interface Empresa {
  id: string;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  situacao: 'ativa' | 'inativa';
  cidade: string;
  estado: string;
  documentosValidos: number;
  documentosVencidos: number;
  clienteId: string;
}

export interface Documento {
  id: string;
  nome: string;
  tipo: string;
  empresaId: string;
  dataEmissao: string;
  dataVencimento: string;
  status: 'valido' | 'vencido' | 'proximo_vencimento';
  arquivoUrl?: string;
  arquivoNome?: string;
}

export interface Contrato {
  id: string;
  numero: string;
  licitacaoId: string;
  empresaId: string;
  orgao: string;
  objeto: string;
  valorTotal: number;
  dataInicio: string;
  dataFim: string;
  status: 'ativo' | 'encerrado' | 'suspenso';
}

export interface Empenho {
  id: string;
  numero: string;
  contratoId: string;
  valor: number;
  saldoUtilizado: number;
  dataEmissao: string;
  status: 'ativo' | 'encerrado' | 'cancelado';
}

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  cargo: string;
  nivel: string;
  pontos: number;
  avatar?: string;
}

export interface Pendencia {
  id: string;
  titulo: string;
  descricao: string;
  tipo: 'workflow' | 'documento' | 'licitacao' | 'contrato';
  prioridade: 'alta' | 'media' | 'baixa';
  prazo: string;
  status: 'pendente' | 'em_andamento' | 'concluida';
}

export interface Workflow {
  id: string;
  nome: string;
  licitacaoId: string;
  etapaAtual: number;
  totalEtapas: number;
  status: 'em_andamento' | 'concluido' | 'cancelado';
  responsavel: string;
}

export interface MetricaDashboard {
  label: string;
  value: number | string;
  change?: number;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: string;
}

export interface Cliente {
  id: string;
  nome: string;
  cnpj?: string;
  email: string;
  telefone: string;
  palavrasChavePositivas: string[];
  palavrasChaveNegativas: string[];
  status: 'ativo' | 'inativo';
  empresas: Empresa[];
}
