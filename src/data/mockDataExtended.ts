import { Cliente, Documento, Contrato, Empenho, Pendencia, Empresa } from '@/types';

export const mockClientes: Cliente[] = [
  {
    id: '1',
    nome: 'Tech Solutions Group',
    email: 'contato@techsolutions.com.br',
    telefone: '(11) 3456-7890',
    palavrasChavePositivas: ['tecnologia', 'software', 'TI', 'sistemas', 'computadores', 'equipamentos'],
    palavrasChaveNegativas: ['construção', 'obras', 'alimentação'],
    status: 'ativo',
    empresas: [
      {
        id: '1',
        cnpj: '12.345.678/0001-90',
        razaoSocial: 'Tech Solutions Ltda',
        nomeFantasia: 'Tech Solutions',
        situacao: 'ativa',
        cidade: 'São Paulo',
        estado: 'SP',
        documentosValidos: 18,
        documentosVencidos: 2,
        clienteId: '1',
      },
      {
        id: '2',
        cnpj: '12.345.678/0002-71',
        razaoSocial: 'Tech Solutions Nordeste Ltda',
        nomeFantasia: 'Tech Solutions NE',
        situacao: 'ativa',
        cidade: 'Recife',
        estado: 'PE',
        documentosValidos: 15,
        documentosVencidos: 0,
        clienteId: '1',
      },
    ],
  },
  {
    id: '2',
    nome: 'Grupo ABC Construções',
    email: 'licitacoes@abcconstrucoes.com.br',
    telefone: '(21) 2345-6789',
    palavrasChavePositivas: ['construção', 'obras', 'engenharia', 'infraestrutura', 'reforma'],
    palavrasChaveNegativas: ['TI', 'software', 'alimentação'],
    status: 'ativo',
    empresas: [
      {
        id: '3',
        cnpj: '98.765.432/0001-10',
        razaoSocial: 'Construtora ABC S.A.',
        nomeFantasia: 'ABC Construções',
        situacao: 'ativa',
        cidade: 'Rio de Janeiro',
        estado: 'RJ',
        documentosValidos: 22,
        documentosVencidos: 0,
        clienteId: '2',
      },
      {
        id: '4',
        cnpj: '98.765.432/0002-00',
        razaoSocial: 'ABC Infraestrutura Ltda',
        nomeFantasia: 'ABC Infra',
        situacao: 'ativa',
        cidade: 'Belo Horizonte',
        estado: 'MG',
        documentosValidos: 19,
        documentosVencidos: 1,
        clienteId: '2',
      },
      {
        id: '5',
        cnpj: '98.765.432/0003-91',
        razaoSocial: 'ABC Manutenção Predial ME',
        nomeFantasia: 'ABC Manutenção',
        situacao: 'inativa',
        cidade: 'Vitória',
        estado: 'ES',
        documentosValidos: 8,
        documentosVencidos: 5,
        clienteId: '2',
      },
    ],
  },
  {
    id: '3',
    nome: 'SG Serviços',
    email: 'contato@sgservicos.com.br',
    telefone: '(31) 3456-7890',
    palavrasChavePositivas: ['limpeza', 'manutenção', 'conservação', 'serviços gerais'],
    palavrasChaveNegativas: ['equipamentos', 'veículos'],
    status: 'ativo',
    empresas: [
      {
        id: '6',
        cnpj: '45.678.901/0001-23',
        razaoSocial: 'Serviços Gerais ME',
        nomeFantasia: 'SG Serviços',
        situacao: 'ativa',
        cidade: 'Belo Horizonte',
        estado: 'MG',
        documentosValidos: 15,
        documentosVencidos: 3,
        clienteId: '3',
      },
    ],
  },
];

export const mockDocumentosCompleto: Documento[] = [
  {
    id: '1',
    nome: 'Certidão Negativa Federal',
    tipo: 'Certidão',
    empresaId: '1',
    dataEmissao: '2024-10-15',
    dataVencimento: '2025-01-15',
    status: 'valido',
  },
  {
    id: '2',
    nome: 'CND INSS',
    tipo: 'Certidão',
    empresaId: '1',
    dataEmissao: '2024-09-01',
    dataVencimento: '2024-12-15',
    status: 'proximo_vencimento',
  },
  {
    id: '3',
    nome: 'Certidão FGTS',
    tipo: 'Certidão',
    empresaId: '1',
    dataEmissao: '2024-06-15',
    dataVencimento: '2024-11-30',
    status: 'vencido',
  },
  {
    id: '4',
    nome: 'Contrato Social',
    tipo: 'Documento Societário',
    empresaId: '1',
    dataEmissao: '2020-01-10',
    dataVencimento: '2030-01-10',
    status: 'valido',
  },
  {
    id: '5',
    nome: 'Certidão Estadual',
    tipo: 'Certidão',
    empresaId: '3',
    dataEmissao: '2024-11-01',
    dataVencimento: '2025-02-01',
    status: 'valido',
  },
  {
    id: '6',
    nome: 'Atestado de Capacidade Técnica',
    tipo: 'Atestado',
    empresaId: '3',
    dataEmissao: '2024-08-20',
    dataVencimento: '2025-08-20',
    status: 'valido',
  },
  {
    id: '7',
    nome: 'Certidão Municipal',
    tipo: 'Certidão',
    empresaId: '6',
    dataEmissao: '2024-10-01',
    dataVencimento: '2024-12-20',
    status: 'proximo_vencimento',
  },
];

export const mockContratosCompleto: Contrato[] = [
  {
    id: '1',
    numero: 'CT-2024-001',
    licitacaoId: '5',
    empresaId: '1',
    orgao: 'Tribunal Regional Federal',
    objeto: 'Locação de veículos executivos com motorista',
    valorTotal: 680000,
    dataInicio: '2024-11-01',
    dataFim: '2025-10-31',
    status: 'ativo',
  },
  {
    id: '2',
    numero: 'CT-2024-002',
    licitacaoId: '3',
    empresaId: '3',
    orgao: 'Governo do Estado do RJ',
    objeto: 'Construção de unidade básica de saúde',
    valorTotal: 4200000,
    dataInicio: '2024-10-15',
    dataFim: '2025-12-31',
    status: 'ativo',
  },
  {
    id: '3',
    numero: 'CT-2024-003',
    licitacaoId: '2',
    empresaId: '6',
    orgao: 'Prefeitura de São Paulo',
    objeto: 'Serviços de manutenção predial e limpeza',
    valorTotal: 850000,
    dataInicio: '2024-09-01',
    dataFim: '2025-08-31',
    status: 'ativo',
  },
  {
    id: '4',
    numero: 'CT-2023-045',
    licitacaoId: '10',
    empresaId: '1',
    orgao: 'Ministério da Educação',
    objeto: 'Fornecimento de equipamentos de informática',
    valorTotal: 1250000,
    dataInicio: '2023-06-01',
    dataFim: '2024-05-31',
    status: 'encerrado',
  },
];

export const mockEmpenhosCompleto: Empenho[] = [
  {
    id: '1',
    numero: 'NE-2024-0001',
    contratoId: '1',
    valor: 340000,
    saldoUtilizado: 170000,
    dataEmissao: '2024-11-01',
    status: 'ativo',
  },
  {
    id: '2',
    numero: 'NE-2024-0002',
    contratoId: '1',
    valor: 340000,
    saldoUtilizado: 0,
    dataEmissao: '2024-11-01',
    status: 'ativo',
  },
  {
    id: '3',
    numero: 'NE-2024-0003',
    contratoId: '2',
    valor: 1400000,
    saldoUtilizado: 560000,
    dataEmissao: '2024-10-15',
    status: 'ativo',
  },
  {
    id: '4',
    numero: 'NE-2024-0004',
    contratoId: '3',
    valor: 425000,
    saldoUtilizado: 212500,
    dataEmissao: '2024-09-01',
    status: 'ativo',
  },
];

export const mockPendenciasCompleto: Pendencia[] = [
  {
    id: '1',
    titulo: 'Aprovar participação em licitação',
    descricao: 'Pregão PE-2024-0156 - Ministério da Saúde aguardando aprovação do gerente',
    tipo: 'workflow',
    prioridade: 'alta',
    prazo: '2024-12-14',
    status: 'pendente',
  },
  {
    id: '2',
    titulo: 'Renovar CND INSS',
    descricao: 'Documento próximo do vencimento - Tech Solutions Ltda',
    tipo: 'documento',
    prioridade: 'alta',
    prazo: '2024-12-10',
    status: 'pendente',
  },
  {
    id: '3',
    titulo: 'Enviar proposta',
    descricao: 'Pregão PE-2024-0892 - Proposta pendente de envio para Prefeitura de São Paulo',
    tipo: 'licitacao',
    prioridade: 'media',
    prazo: '2024-12-18',
    status: 'em_andamento',
  },
  {
    id: '4',
    titulo: 'Atualizar Certidão FGTS',
    descricao: 'Documento vencido - Tech Solutions Ltda - Precisa de renovação urgente',
    tipo: 'documento',
    prioridade: 'alta',
    prazo: '2024-12-05',
    status: 'pendente',
  },
  {
    id: '5',
    titulo: 'Revisar contrato CT-2024-001',
    descricao: 'Contrato com Tribunal Regional Federal - Verificar aditivo necessário',
    tipo: 'contrato',
    prioridade: 'media',
    prazo: '2024-12-20',
    status: 'pendente',
  },
  {
    id: '6',
    titulo: 'Analisar edital PE-2024-1234',
    descricao: 'INSS - Fornecimento de material de escritório - Análise de viabilidade',
    tipo: 'licitacao',
    prioridade: 'baixa',
    prazo: '2024-12-17',
    status: 'pendente',
  },
  {
    id: '7',
    titulo: 'Aprovar proposta comercial',
    descricao: 'Workflow de aprovação - Licitação Governo do Estado RJ - Etapa 3/5',
    tipo: 'workflow',
    prioridade: 'alta',
    prazo: '2024-12-12',
    status: 'em_andamento',
  },
];

export interface Produto {
  id: string;
  codigo: string;
  nome: string;
  descricao: string;
  tipo: 'produto' | 'servico';
  unidade: string;
  preco: number;
  categoria: string;
  codigoAnvisa?: string;
}

export const mockProdutos: Produto[] = [
  {
    id: '1',
    codigo: 'PROD-001',
    nome: 'Computador Desktop Core i7',
    descricao: 'Computador desktop com processador Intel Core i7, 16GB RAM, SSD 512GB',
    tipo: 'produto',
    unidade: 'UN',
    preco: 4500,
    categoria: 'Equipamentos de TI',
  },
  {
    id: '2',
    codigo: 'PROD-002',
    nome: 'Monitor LED 24"',
    descricao: 'Monitor LED Full HD 24 polegadas com suporte ajustável',
    tipo: 'produto',
    unidade: 'UN',
    preco: 850,
    categoria: 'Equipamentos de TI',
  },
  {
    id: '3',
    codigo: 'SERV-001',
    nome: 'Manutenção Preventiva de TI',
    descricao: 'Serviço de manutenção preventiva mensal em equipamentos de informática',
    tipo: 'servico',
    unidade: 'MÊS',
    preco: 2500,
    categoria: 'Serviços de TI',
  },
  {
    id: '4',
    codigo: 'PROD-003',
    nome: 'Notebook Empresarial',
    descricao: 'Notebook corporativo Intel Core i5, 8GB RAM, SSD 256GB',
    tipo: 'produto',
    unidade: 'UN',
    preco: 3800,
    categoria: 'Equipamentos de TI',
  },
  {
    id: '5',
    codigo: 'SERV-002',
    nome: 'Consultoria em Licitações',
    descricao: 'Serviço de consultoria especializada em processos licitatórios',
    tipo: 'servico',
    unidade: 'HORA',
    preco: 350,
    categoria: 'Consultoria',
  },
];

export interface Conquista {
  id: string;
  nome: string;
  descricao: string;
  icone: string;
  pontos: number;
  desbloqueada: boolean;
  dataDesbloqueio?: string;
}

export interface NivelUsuario {
  nivel: number;
  nome: string;
  icone: string;
  pontosMinimos: number;
  pontosMaximos: number;
}

export const niveis: NivelUsuario[] = [
  { nivel: 1, nome: 'Iniciante', icone: '🌱', pontosMinimos: 0, pontosMaximos: 99 },
  { nivel: 2, nome: 'Analista Jr', icone: '⭐', pontosMinimos: 100, pontosMaximos: 299 },
  { nivel: 3, nome: 'Analista Pleno', icone: '🌟', pontosMinimos: 300, pontosMaximos: 599 },
  { nivel: 4, nome: 'Analista Sênior', icone: '💫', pontosMinimos: 600, pontosMaximos: 999 },
  { nivel: 5, nome: 'Especialista', icone: '🏆', pontosMinimos: 1000, pontosMaximos: 1999 },
  { nivel: 6, nome: 'Mestre', icone: '👑', pontosMinimos: 2000, pontosMaximos: 4999 },
  { nivel: 7, nome: 'Lenda', icone: '🔱', pontosMinimos: 5000, pontosMaximos: 999999 },
];

export const mockConquistas: Conquista[] = [
  {
    id: '1',
    nome: 'Primeira Análise',
    descricao: 'Realizou sua primeira análise de edital',
    icone: '📋',
    pontos: 50,
    desbloqueada: true,
    dataDesbloqueio: '2024-09-15',
  },
  {
    id: '2',
    nome: 'Analista Dedicado',
    descricao: 'Analisou 10 editais',
    icone: '📊',
    pontos: 100,
    desbloqueada: true,
    dataDesbloqueio: '2024-10-20',
  },
  {
    id: '3',
    nome: 'Mestre dos Documentos',
    descricao: 'Manteve todos os documentos atualizados por 30 dias',
    icone: '📁',
    pontos: 150,
    desbloqueada: false,
  },
  {
    id: '4',
    nome: 'Vencedor',
    descricao: 'Ganhou sua primeira licitação',
    icone: '🏆',
    pontos: 200,
    desbloqueada: true,
    dataDesbloqueio: '2024-11-05',
  },
  {
    id: '5',
    nome: 'Estrategista',
    descricao: 'Utilizou análise preditiva em 5 editais',
    icone: '🎯',
    pontos: 100,
    desbloqueada: true,
    dataDesbloqueio: '2024-11-10',
  },
  {
    id: '6',
    nome: 'Pontual',
    descricao: 'Nunca perdeu um prazo',
    icone: '⏰',
    pontos: 150,
    desbloqueada: false,
  },
  {
    id: '7',
    nome: 'Networking',
    descricao: 'Participou de 10 licitações diferentes',
    icone: '🤝',
    pontos: 100,
    desbloqueada: true,
    dataDesbloqueio: '2024-11-20',
  },
  {
    id: '8',
    nome: 'Super Analista',
    descricao: 'Analisou 50 editais',
    icone: '🚀',
    pontos: 250,
    desbloqueada: false,
  },
];

export const mockUsuarioGamificacao = {
  id: '1',
  nome: 'Carlos Oliveira',
  pontos: 1250,
  nivel: 5,
  ranking: 3,
  licitacoesAnalisadas: 45,
  licitacoesGanhas: 12,
  taxaSucesso: 67,
};

export const mockRanking = [
  { id: '1', nome: 'Maria Santos', pontos: 2150, nivel: 6 },
  { id: '2', nome: 'João Silva', pontos: 1890, nivel: 5 },
  { id: '3', nome: 'Carlos Oliveira', pontos: 1250, nivel: 5 },
  { id: '4', nome: 'Ana Costa', pontos: 980, nivel: 4 },
  { id: '5', nome: 'Pedro Alves', pontos: 720, nivel: 4 },
];
