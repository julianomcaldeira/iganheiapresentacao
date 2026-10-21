/**
 * Cenários de demonstração por cliente.
 *
 * Cada cliente da base recebe um cenário distinto — combinação própria de
 * etapas, regras (perguntas do edital), templates de declaração, palavras-chave
 * e perfil de documentos — para que a demonstração mostre clientes com
 * estruturas diferentes entre si.
 *
 * O cenário é determinístico: deriva do id/nome do cliente e do perfil
 * setorial, de forma que a mesma base sempre produza o mesmo resultado.
 */
import { supabase } from '@/integrations/supabase/client';

export type PerfilSetorial =
  | 'saude'
  | 'construcao'
  | 'servicos'
  | 'tecnologia'
  | 'industria'
  | 'educacao'
  | 'geral';

export interface CenarioCliente {
  perfil: PerfilSetorial;
  etapas: Array<{ etapa_codigo: string; ordem: number }>;
  regras: Array<{ titulo: string; descricao: string; categoria: string }>;
  templates: Array<{ nome: string; titulo: string; conteudo: string; variaveis: string[] }>;
  palavrasPositivas: string[];
  palavrasNegativas: string[];
}

const ETAPAS_SAUDE: Array<{ etapa_codigo: string; ordem: number }> = [
  { etapa_codigo: 'analise_edital', ordem: 1 },
  { etapa_codigo: 'esclarecimento_impugnacao', ordem: 2 },
  { etapa_codigo: 'aprovacoes', ordem: 3 },
  { etapa_codigo: 'preparacao_documentos', ordem: 4 },
  { etapa_codigo: 'proposta', ordem: 5 },
  { etapa_codigo: 'disputa_pregao', ordem: 6 },
  { etapa_codigo: 'resultado', ordem: 7 },
  { etapa_codigo: 'impugnacao_contrarrazao', ordem: 8 },
];

const ETAPAS_CONSTRUCAO: Array<{ etapa_codigo: string; ordem: number }> = [
  { etapa_codigo: 'analise_edital', ordem: 1 },
  { etapa_codigo: 'aprovacoes', ordem: 2 },
  { etapa_codigo: 'esclarecimento_impugnacao', ordem: 3 },
  { etapa_codigo: 'preparacao_documentos', ordem: 4 },
  { etapa_codigo: 'concorrentes', ordem: 5 },
  { etapa_codigo: 'proposta', ordem: 6 },
  { etapa_codigo: 'disputa_pregao', ordem: 7 },
  { etapa_codigo: 'resultado', ordem: 8 },
  { etapa_codigo: 'contratos', ordem: 9 },
  { etapa_codigo: 'empenhos', ordem: 10 },
];

const ETAPAS_SERVICOS: Array<{ etapa_codigo: string; ordem: number }> = [
  { etapa_codigo: 'analise_edital', ordem: 1 },
  { etapa_codigo: 'esclarecimento_impugnacao', ordem: 2 },
  { etapa_codigo: 'preparacao_documentos', ordem: 3 },
  { etapa_codigo: 'aprovacoes', ordem: 4 },
  { etapa_codigo: 'produtos', ordem: 5 },
  { etapa_codigo: 'tarefas', ordem: 6 },
  { etapa_codigo: 'proposta', ordem: 7 },
  { etapa_codigo: 'resultado', ordem: 8 },
];

const ETAPAS_TECNOLOGIA: Array<{ etapa_codigo: string; ordem: number }> = [
  { etapa_codigo: 'analise_edital', ordem: 1 },
  { etapa_codigo: 'esclarecimento_impugnacao', ordem: 2 },
  { etapa_codigo: 'aprovacoes', ordem: 3 },
  { etapa_codigo: 'preparacao_documentos', ordem: 4 },
  { etapa_codigo: 'tarefas', ordem: 5 },
  { etapa_codigo: 'proposta', ordem: 6 },
  { etapa_codigo: 'disputa_pregao', ordem: 7 },
  { etapa_codigo: 'resultado', ordem: 8 },
  { etapa_codigo: 'contratos', ordem: 9 },
];

const ETAPAS_INDUSTRIA: Array<{ etapa_codigo: string; ordem: number }> = [
  { etapa_codigo: 'analise_edital', ordem: 1 },
  { etapa_codigo: 'esclarecimento_impugnacao', ordem: 2 },
  { etapa_codigo: 'preparacao_documentos', ordem: 3 },
  { etapa_codigo: 'aprovacoes', ordem: 4 },
  { etapa_codigo: 'produtos', ordem: 5 },
  { etapa_codigo: 'concorrentes', ordem: 6 },
  { etapa_codigo: 'proposta', ordem: 7 },
  { etapa_codigo: 'disputa_pregao', ordem: 8 },
  { etapa_codigo: 'impugnacao_contrarrazao', ordem: 9 },
  { etapa_codigo: 'resultado', ordem: 10 },
  { etapa_codigo: 'empenhos', ordem: 11 },
];

const ETAPAS_EDUCACAO: Array<{ etapa_codigo: string; ordem: number }> = [
  { etapa_codigo: 'analise_edital', ordem: 1 },
  { etapa_codigo: 'esclarecimento_impugnacao', ordem: 2 },
  { etapa_codigo: 'aprovacoes', ordem: 3 },
  { etapa_codigo: 'preparacao_documentos', ordem: 4 },
  { etapa_codigo: 'tarefas', ordem: 5 },
  { etapa_codigo: 'proposta', ordem: 6 },
  { etapa_codico: '', ordem: 0 } as any,
  { etapa_codigo: 'disputa_pregao', ordem: 7 },
  { etapa_codigo: 'resultado', ordem: 8 },
].filter((e) => e.etapa_codigo) as Array<{ etapa_codigo: string; ordem: number }>;

const PERFIS: Record<PerfilSetorial, {
  etapas: Array<{ etapa_codigo: string; ordem: number }>;
  positivas: string[];
  negativas: string[];
  regras: Array<{ titulo: string; descricao: string; categoria: string }>;
  templates: Array<{ nome: string; titulo: string; conteudo: string; variaveis: string[] }>;
  docsExtras: Array<{ categoria: string; nome: string; descricao: string; obrigatorio: boolean }>;
}> = {
  saude: {
    etapas: ETAPAS_SAUDE,
    positivas: ['hospitalar', 'medicamento', 'insumo', 'saúde', 'equipamento', 'laboratório', 'hospital'],
    negativas: ['obras', 'construção', 'locação de veículos'],
    regras: [
      { titulo: 'Registro ANVISA dos itens', descricao: 'Os itens ofertados exigem registro ativo na ANVISA? Qual documento deve ser apresentado?', categoria: 'Habilitação técnica' },
      { titulo: 'Certidões sanitárias', descricao: 'É exigida licença sanitária ou alvará de funcionamento para o fornecimento objeto deste edital?', categoria: 'Habilitação' },
      { titulo: 'Prazo de entrega em ambiente hospitalar', descricao: 'Qual o prazo de entrega e a janela de recebimento dos insumos no almoxarifado do hospital?', categoria: 'Execução' },
      { titulo: 'Consumo estimado e lote mínimo', descricao: 'O edital define consumo estimado ou lote mínimo por item? Como isso afeta a proposta?', categoria: 'Objeto' },
    ],
    templates: [
      { nome: 'Declaração de Inexistência de Vínculo Empregatício', titulo: 'Declaração de Inexistência de Vínculo Empregatício', conteudo: 'DECLARAÇÃO DE INEXISTÊNCIA DE VÍNCULO EMPREGATÍCIO\n\nEu, ______________________, CPF nº ______________________, na qualidade de representante legal da empresa {empresa_razao_social}, CNPJ {empresa_cnpj}, declaro, para a Licitação nº {licitacao_numero} ({licitacao_orgao}), que a empresa não mantém vínculo empregatício com o órgão licitante, nos termos do art. 9º da Lei nº 14.133/2021.\n\nLocal e data: {data_atual}.', variaveis: ['{empresa_razao_social}', '{empresa_cnpj}', '{licitacao_numero}', '{licitacao_orgao}', '{data_atual}'] },
      { nome: 'Declaração de Regularidade ANVISA', titulo: 'Declaração de Regularidade ANVISA', conteudo: 'DECLARAÇÃO DE REGULARIDADE ANVISA\n\nA empresa {empresa_razao_social}, CNPJ {empresa_cnpj}, declara que os produtos ofertados na Licitação nº {licitacao_numero} ({licitacao_orgao}) possuem registro ou cadastro regular na ANVISA, vigente na data de apresentação da proposta.\n\nLocal e data: {data_atual}.', variaveis: ['{empresa_razao_social}', '{empresa_cnpj}', '{licitacao_numero}', '{licitacao_orgao}', '{data_atual}'] },
      { nome: 'Declaração de Capacidade de Fornecimento', titulo: 'Declaração de Capacidade de Fornecimento', conteudo: 'DECLARAÇÃO DE CAPACIDADE DE FORNECIMENTO\n\nA empresa {empresa_razao_social} declara dispor de estrutura logística e estoque suficiente para o fornecimento objeto da Licitação nº {licitacao_numero} ({licitacao_orgao}), no prazo de 30 (trinta) dias corridos.\n\nLocal e data: {data_atual}.', variaveis: ['{empresa_razao_social}', '{licitacao_cnpj}', '{licitacao_numero}', '{licitacao_orgao}', '{data_atual}'] },
      { nome: 'Declaração de Ausência de Fato Gerador', titulo: 'Declaração de Ausência de Fato Gerador', conteudo: 'DECLARAÇÃO DE AUSÊNCIA DE FATO GERADOR\n\nA empresa {empresa_razao_social}, CNPJ {empresa_cnpj}, declara não estar incursa em fato gerador de inexecução, nos termos do art. 156 da Lei nº 14.133/2021.\n\nLocal e data: {data_atual}.', variaveis: ['{empresa_razao_social}', '{empresa_cnpj}', '{licitacao_numero}', '{licitacao_orgao}', '{data_atual}'] },
    ],
    docsExtras: [
      { categoria: 'atestado', nome: 'Atestado de Fornecimento de Material Hospitalar com Registro ANVISA', descricao: 'Atestado de fornecimento anterior de insumos hospitalares com registro ANVISA vigente.', obrigatorio: true },
      { categoria: 'outro', nome: 'Certificado de Boas Práticas de Distribuição (CBP)', descricao: 'Comprovante de CBP válido para o armazenamento e distribuição de insumos.', obrigatorio: false },
      { categoria: 'outro', nome: 'Laudo de Calibração de Equipamentos', descricao: 'Laudo de calibração vigente dos equipamentos de aferição utilizados no fornecimento.', obrigatorio: false },
    ],
  },
  construcao: {
    etapas: ETAPAS_CONSTRUCAO,
    positivas: ['obra', 'construção', 'reforma', 'engenharia', 'manutenção predial', 'pavimentação', 'saneamento'],
    negativas: ['medicamento', 'equipamento de informática', 'software'],
    regras: [
      { titulo: 'Qualificação técnica da empresa', descricao: 'Quais atestados de capacidade técnica de obra são exigidos e qual o prazo de referência?', categoria: 'Habilitação técnica' },
      { titulo: 'Registro professional (CREA/CAU)', descricao: 'É exigida a apresentação de ART e do registro do responsável técnico pela obra?', categoria: 'Habilitação técnica' },
      { titulo: 'Garantia da obra', descricao: 'Qual o prazo de garantia exigido para os serviços ofertados e como ela será fiscalizada?', categoria: 'Execução' },
      { titulo: 'Medição e pagamento', descricao: 'Como será feita a medição dos serviços executados e o pagamento das medições?', categoria: 'Execução' },
    ],
    templates: [
      { nome: 'Declaração de Elenco de Equipe Técnica', titulo: 'Declaração de Elenco de Equipe Técnica', conteudo: 'DECLARAÇÃO DE ELENCO DE EQUIPE TÉCNICA\n\nA empresa {empresa_razao_social}, CNPJ {empresa_cnpj}, declara que disponibilizará a equipe técnica necessária à execução da Licitação nº {licitacao_numero} ({licitacao_orgao}), com registro profissional regular.\n\nLocal e data: {data_atual}.', variaveis: ['{empresa_razao_social}', '{empresa_cnpj}', '{licitacao_numero}', '{licitacao_orgao}', '{data_atual}'] },
      { nome: 'Declaração de Garantia da Obra', titulo: 'Declaração de Garantia da Obra', conteudo: 'DECLARAÇÃO DE GARANTIA DA OBRA\n\nA empresa {empresa_razao_social} declara que garante os serviços ofertados na Licitação nº {licitacao_numero} ({licitacao_orgao}) pelo prazo de 5 (cinco) anos, nos termos do art. 26 da Lei nº 14.133/2021.\n\nLocal e data: {data_atual}.', variaveis: ['{empresa_razao_social}', '{empresa_cnpj}', '{licitacao_numero}', '{licitacao_orgao}', '{data_atual}'] },
      { nome: 'Declaração de Optante pelo Simples Nacional', titulo: 'Declaração de Optante pelo Simples Nacional', conteudo: 'DECLARAÇÃO DE OPÇÃO PELO SIMPLES NACIONAL\n\nA empresa {empresa_razao_social}, CNPJ {empresa_cnpj}, declara estar enquadrada no Simples Nacional, para fins de participação na Licitação nº {licitacao_numero}.\n\nLocal e data: {data_atual}.', variaveis: ['{empresa_razao_social}', '{empresa_cnpj}', '{licitacao_numero}', '{licitacao_orgao}', '{data_atual}'] },
    ],
    docsExtras: [
      { categoria: 'atestado', nome: 'Atestado de Capacidade Técnica de Obra', descricao: 'Atestado de execução de obra compatível com o objeto, com ARTs anexas.', obrigatorio: true },
      { categoria: 'atestado', nome: 'Atestado de Capacidade Técnica de Manutenção Predial', descricao: 'Atestado de serviços de manutenção compatíveis com o objeto ofertado.', obrigatorio: false },
      { categoria: 'outro', nome: 'Registro CREA/CAU da Empresa', descricao: 'Registro da empresa no conselho profissional e certidão de региode seus responsáveis técnicos.', obrigatorio: true },
      { categoria: 'outro', nome: 'Apólice de Seguro de Responsabilidade Civil', descricao: 'Apólice de seguro de responsabilidade civil que cobre os riscos da obra.', obrigatorio: false },
    ],
  },
  servicos: {
    etapas: ETAPAS_SERVICOS,
    positivas: ['serviço', 'limpeza', 'conservação', 'manutenção', 'portaria', 'copeira'],
    negativas: ['medicamento', 'material de construção', 'software'],
    regras: [
      { titulo: 'Dimensionamento da equipe', descricao: 'O edital exige relação nominal da equipe alocada ou apenas o dimensionamento por posto?', categoria: 'Execução' },
      { titulo: 'Cobrança por posto de trabalho', descricao: 'A remuneração é vinculada ao número de postos ou ao preço global do contrato?', categoria: 'Objeto' },
      { titulo: 'Fiscalização do contrato', descricao: 'Quais mecanismos de fiscalização e glosa estão previstos no edital?', categoria: 'Execução' },
    ],
    templates: [
      { nome: 'Declaração de Compromisso de Atendimento', titulo: 'Declaração de Compromisso de Atendimento', conteudo: 'DECLARAÇÃO DE COMPROMISSO DE ATENDIMENTO\n\nA empresa {empresa_razao_social}, CNPJ {empresa_cnpj}, compromete-se a alocar a equipe necessária para o atendimento da Licitação nº {licitacao_numero} ({licitacao_orgao}), com início na data de autorização de início dos serviços.\n\nLocal e data: {data_atual}.', variaveis: ['{empresa_razao_social}', '{empresa_cnpj}', '{licitacao_numero}', '{licitacao_orgao}', '{data_atual}'] },
      { nome: 'Declaração de Idoneidade', titulo: 'Declaração de Idoneidade', conteudo: 'DECLARAÇÃO DE IDONEIDADE\n\nA empresa {empresa_razao_social}, CNPJ {empresa_cnpj}, declara, para a Licitação nº {licitacao_numero} ({licitacao_orgao}), não possuir insanidade, falência ou liquidação, e estar em situação regular perante os órgãos fiscalizadores.\n\nLocal e data: {data_atual}.', variaveis: ['{empresa_razao_social}', '{empresa_cnpj}', '{licitacao_numero}', '{licitacao_orgao}', '{data_atual}'] },
    ],
    docsExtras: [
      { categoria: 'atestado', nome: 'Atestado de Capacidade Técnica de Serviços Gerais', descricao: 'Atestado de execução de serviços compatíveis com o objeto.', obrigatorio: true },
      { categoria: 'outro', nome: 'Relatório de Capacidade Operacional', descricao: 'Relatório com a estrutura de atendimento e logística disponível.', obrigatorio: false },
    ],
  },
  tecnologia: {
    etapas: ETAPAS_TECNOLOGIA,
    positivas: ['software', 'licença', 'hardware', 'equipamento de informática', 'serviço de TI', 'rede', 'dados'],
    negativas: ['obra', 'medicamento', 'material de construção'],
    regras: [
      { titulo: 'Compatibilidade com o parque instalado', descricao: 'É exigida compatibilidade com equipamentos já instalados no órgão? Quais versões?', categoria: 'Objeto' },
      { titulo: 'Suporte e garantia técnica', descricao: 'Qual o prazo de garantia e a SLA de atendimento exigidos?', categoria: 'Execução' },
      { titulo: 'Licenciamento e propriedade intelectual', descricao: 'As licenças oferecidas são próprias ou de terceiros? Quem responde pela regularidade?', categoria: 'Habilitação' },
      { titulo: 'Transferência de dados', descricao: 'Há exigência de plano de transição ou descarte seguro de dados ao final do contrato?', categoria: 'Execução' },
    ],
    templates: [
      { nome: 'Declaração de Compatibilidade de Produtos', titulo: 'Declaração de Compatibilidade de Produtos', conteudo: 'DECLARAÇÃO DE COMPATIBILIDADE\n\nA empresa {empresa_razao_social}, CNPJ {empresa_cnpj}, declara que os produtos e serviços ofertados na Licitação nº {licitacao_numero} ({licitacao_orgao}) são compatíveis com o parque tecnológico do órgão licitante.\n\nLocal e data: {data_atual}.', variaveis: ['{empresa_razao_social}', '{empresa_cnpj}', '{licitacao_numero}', '{licitacao_orgao}', '{data_atual}'] },
      { nome: 'Declaração de Propriedade Intelectual', titulo: 'Declaração de Propriedade Intelectual', conteudo: 'DECLARAÇÃO DE PROPRIEDADE INTELECTUAL\n\nA empresa {empresa_razao_social} declara ser titular dos direitos de propriedade intelectual dos conteúdos ofertados na Licitação nº {licitacao_numero}, e que os softwares licenciados são de uso regular e adequado à finalidade do contrato.\n\nLocal e data: {data_atual}.', variaveis: ['{empresa_razao_social}', '{empresa_cnpj}', '{licitacao_numero}', '{licitacao_orgao}', '{data_atual}'] },
      { nome: 'Declaração de Ausência de Vínculo', titulo: 'Declaração de Ausência de Vínculo', conteudo: 'DECLARAÇÃO DE INEXISTÊNCIA DE VÍNCULO EMPREGATÍCIO\n\nA empresa {empresa_razao_social}, CNPJ {empresa_cnpj}, declara, para a Licitação nº {licitacao_numero} ({licitacao_orgao}), a inexistência de vínculo empregatício com o órgão licitante.\n\nLocal e data: {data_atual}.', variaveis: ['{empresa_razao_social}', '{empresa_cnpj}', '{licitacao_numero}', '{licitacao_orgao}', '{data_atual}'] },
    ],
    docsExtras: [
      { categoria: 'atestado', nome: 'Atestado de Compatibilidade e Implantação', descricao: 'Atestado de implantação de solução equivalente em órgão público.', obrigatorio: true },
      { categoria: 'atestado', nome: 'Certificado de Garantia do Fabricante', descricao: 'Certificado do fabricante com vigência de garantia dos equipamentos ofertados.', obrigatorio: false },
      { categoria: 'outro', nome: 'Relatório de Segurança da Informação', descricao: 'Relatório de controles de segurança aplicados à solução ofertada.', obrigatorio: false },
    ],
  },
  industria: {
    etapas: ETAPAS_INDUSTRIA,
    positivas: ['equipamento industrial', 'manutenção industrial', 'peça', 'automação', 'insumo industrial', 'usina'],
    negativas: ['serviço de limpeza', 'software', 'material escolar'],
    regras: [
      { titulo: 'Inspeção e ensaios', descricao: 'É exigida certificação de inspeção ou ensaio de desempenho dos equipamentos ofertados?', categoria: 'Habilitação técnica' },
      { titulo: 'Assistência técnica', descricao: 'Qual o prazo de atendimento da assistência técnica após a entrega?', categoria: 'Execução' },
      { titulo: 'Suprimento de peças', descricao: 'Há exigência de garantia de disponibilidade de peças de reposição?', categoria: 'Execução' },
    ],
    templates: [
      { nome: 'Declaração de Garantia de Assistência Técnica', titulo: 'Declaração de Garantia de Assistência Técnica', conteudo: 'DECLARAÇÃO DE GARANTIA DE ASSISTÊNCIA TÉCNICA\n\nA empresa {empresa_razao_social}, CNPJ {empresa_cnpj}, declara dispor de assistência técnica própria ou credenciada, com prazo de atendimento de 48 (quarenta e oito) horas, para os equipamentos ofertados na Licitação nº {licitacao_numero} ({licitacao_orgao}).\n\nLocal e data: {data_atual}.', variaveis: ['{empresa_razao_social}', '{empresa_cnpj}', '{licitacao_numero}', '{licitacao_orgao}', '{data_atual}'] },
      { nome: 'Declaração de Controle de Qualidade', titulo: 'Declaração de Controle de Qualidade', conteudo: 'DECLARAÇÃO DE CONTROLE DE QUALIDADE\n\nA empresa {empresa_razao_social} declara que seu processo de controle de qualidade atende às normas exigidas para o fornecimento objeto da Licitação nº {licitacao_numero}.\n\nLocal e data: {data_atual}.', variaveis: ['{empresa_razao_social}', '{empresa_cnpj}', '{licitacao_numero}', '{licitacao_orgao}', '{data_atual}'] },
    ],
    docsExtras: [
      { categoria: 'atestado', nome: 'Atestado de Fornecimento Industrial', descricao: 'Atestado de fornecimento de equipamentos/insumos industriais compatíveis com o objeto.', obrigatorio: true },
      { categoria: 'outro', nome: 'Certificado de Inspeção de Equipamentos', descricao: 'Certificado de inspeção e ensaio dos equipamentos ofertados.', obrigatorio: true },
    ],
  },
  educacao: {
    etapas: ETAPAS_EDUCACAO,
    positivas: ['material didático', 'equipamento de informática', 'merenda', 'uniforme', 'manutenção escolar'],
    negativas: ['insumo hospitalar', 'obra civil de grande porte'],
    regras: [
      { titulo: 'Entrega por unidade escolar', descricao: 'A entrega deve ser fracionada por unidade de ensino? Quais prazos por lote?', categoria: 'Execução' },
      { titulo: 'Habilitação para fornecimento a schools', descricao: 'Há exigência de comprovação de fornecimento anterior a escolas da rede?', categoria: 'Habilitação técnica' },
    ],
    templates: [
      { nome: 'Declaração de Compromisso de Entrega por Unidade', titulo: 'Declaração de Compromisso de Entrega por Unidade', conteudo: 'DECLARAÇÃO DE COMPROMISSO DE ENTREGA POR UNIDADE\n\nA empresa {empresa_razao_social}, CNPJ {empresa_cnpj}, compromete-se a entregar os itens ofertados na Licitação nº {licitacao_numero} ({licitacao_orgao}) em cada unidade de ensino, respeitando o cronograma do edital.\n\nLocal e data: {data_atual}.', variaveis: ['{empresa_razao_social}', '{empresa_cnpj}', '{licitacao_numero}', '{licitacao_orgao}', '{data_atual}'] },
      { nome: 'Declaração de Idoneidade', titulo: 'Declaração de Idoneidade', conteudo: 'DECLARAÇÃO DE IDONEIDADE\n\nA empresa {empresa_razao_social}, CNPJ {empresa_cnpj}, declara, para a Licitação nº {licitacao_numero} ({licitacao_orgao}), que está em situação regular e não possui dívidas ou restos.\n\nLocal e data: {data_atual}.', variaveis: ['{empresa_razao_social}', '{empresa_cnpj}', '{licitacao_numero}', '{licitacao_orgao}', '{data_atual}'] },
    ],
    docsExtras: [
      { categoria: 'atestado', nome: 'Atestado de Fornecimento à Rede de Ensino', descricao: 'Atestado de fornecimento anterior a instituição de ensino da mesma rede.', obrigatorio: false },
      { categoria: 'outro', nome: 'Relação de Unidades Atendidas', descricao: 'Relação das unidades de ensino atendidas pela empresa com respectivos endereços.', obrigatorio: false },
    ],
  },
  geral: {
    etapas: ETAPAS_SAUDE,
    positivas: [],
    negativas: [],
    regras: [
      { titulo: 'Documentação de habilitação', descricao: 'Quais documentos são exigidos para a habilitação e qual a validade mínima de cada um?', categoria: 'Habilitação' },
      { titulo: 'Prazo de resposta a esclarecimentos', descricao: 'Qual o prazo para apresentação de esclarecimentos e impugnações e o regime de resposta do órgão?', categoria: 'Prazo' },
      { titulo: 'Critérios de julgamento', descricao: 'O critério de julgamento é o menor preço ou o menor custo, e como se trata o empate de propostas?', categoria: 'Objeto' },
    ],
    templates: [
      { nome: 'Declaração de Idoneidade', titulo: 'Declaração de Idoneidade', conteudo: 'DECLARAÇÃO DE IDONEIDADE\n\nA empresa {empresa_razao_social}, CNPJ {empresa_cnpj}, declara, para a Licitação nº {licitacao_numero} ({licitacao_orgao}), que está em situação regular e não possui insanidade, falência ou liquidação.\n\nLocal e data: {data_atual}.', variaveis: ['{empresa_razao_social}', '{empresa_cnpj}', '{licitacao_numero}', '{licitacao_orgao}', '{data_atual}'] },
      { nome: 'Declaração de Optante pelo Simples Nacional', titulo: 'Declaração de Optante pelo Simples Nacional', conteudo: 'DECLARAÇÃO DE OPÇÃO PELO SIMPLES NACIONAL\n\nA empresa {empresa_razao_social}, CNPJ {empresa_cnpj}, declara estar enquadrada no Simples Nacional, para fins de participação na Licitação nº {licitacao_numero}.\n\nLocal e data: {data_atual}.', variaveis: ['{empresa_razao_social}', '{empresa_cnpj}', '{licitacao_numero}', '{licitacao_orgao}', '{data_atual}'] },
    ],
    docsExtras: [
      { categoria: 'atestado', nome: 'Atestado de Capacidade Técnica', descricao: 'Atestado de capacidade técnica compatível com o objeto ofertado.', obrigatorio: true },
      { categoria: 'outro', nome: 'Comprovante de Inscrição e Situação Cadastral', descricao: 'Comprovante de Inscrição e de Situação Cadastral da Receita Federal.', obrigatorio: true },
    ],
  },
};

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Documentos extras do perfil setorial (usados na base de cada cliente). */
export function docsExtrasDoPerfil(perfil: PerfilSetorial) {
  return PERFIS[perfil]?.docsExtras || [];
}

/** Inferir o perfil setorial do cliente pelo nome e pelas palavras-chave. */
export function inferirPerfil(cliente: { nome: string; palavras_positivas?: string[] | null }): PerfilSetorial {
  const texto = `${cliente.nome} ${(cliente.palavras_positivas || []).join(' ')}`.toLowerCase();
  if (/cl[ií]nica|hospital|sa[uú]de|medic|vida plena|farm/.test(texto)) return 'saude';
  if (/constr|obras|engenharia|reforma|abc|incorp/.test(texto)) return 'construcao';
  if (/servi[cç]o|limpeza|conserva|facil|organiza/.test(texto)) return 'servicos';
  if (/tech|tecnolog|software|ti |inform[aá]tica|dados|digital/.test(texto)) return 'tecnologia';
  if (/ind[uú]stri|metal|qu[ií]mica|m[aá]quina|pecas|autom/.test(texto)) return 'industria';
  if (/educa|escola|institui|ensino|coleg/.test(texto)) return 'educacao';
  // fallback: distribuição determinística pelos perfis disponíveis
  const perfis: PerfilSetorial[] = ['saude', 'construcao', 'servicos', 'tecnologia', 'industria', 'educacao', 'geral'];
  return perfis[hash(cliente.nome) % perfis.length];
}

/** Monta o cenário do cliente. */
export function definirCenario(cliente: {
  id: string;
  nome: string;
  palavras_positivas?: string[] | null;
}): CenarioCliente {
  const perfil = inferirPerfil(cliente);
  const p = PERFIS[perfil];
  const positivas = cliente.palavras_positivas && cliente.palavras_positivas.length > 0
    ? cliente.palavras_positivas
    : p.positivas;
  return {
    perfil,
    etapas: p.etapas,
    regras: p.regras,
    templates: p.templates,
    palavrasPositivas: positivas,
    palavrasNegativas: p.negativas,
  };
}

export interface RelatorioCenarios {
  clientes: number;
  etapas: number;
  regras: number;
  templates: number;
  perfis: Record<string, string[]>;
  erros: string[];
}

/** Aplica os cenários a todos os clientes ativos. */
export async function aplicarCenariosAClientes(): Promise<RelatorioCenarios> {  const relatorio: RelatorioCenarios = {
    clientes: 0,
    etapas: 0,
    regras: 0,
    templates: 0,
    perfis: {},
    erros: [],
  };

  const { data: clientes, error } = await supabase
    .from('clientes')
    .select('id, nome, palavras_positivas')
    .eq('ativo', true);
  if (error) {
    relatorio.erros.push(`clientes: ${error.message}`);
    return relatorio;
  }
  if (!clientes || clientes.length === 0) {
    relatorio.erros.push('nenhum cliente ativo encontrado');
    return relatorio;
  }

  for (const c of clientes as any[]) {
    const cenario = definirCenario(c);
    relatorio.clientes++;
    relatorio.perfis[cenario.perfil] = [...(relatorio.perfis[cenario.perfil] || []), c.nome];

    // etapas ativas do cliente
    const { data: atuais } = await supabase
      .from('licitacao_etapas_config')
      .select('id, etapa_codigo')
      .eq('cliente_id', c.id);
    const codigosAtuais = new Set(((atuais || []) as any[]).map((a) => a.etapa_codigo as string));
    const manter = cenario.etapas.map((e) => e.etapa_codigo);
    for (const a of (atuais || []) as any[]) {
      if (!manter.includes(a.etapa_codigo)) {
        await supabase.from('licitacao_etapas_config').update({ ativo: false }).eq('id', a.id);
      }
    }
    const { error: eErr } = await supabase.from('licitacao_etapas_config').upsert(
      cenario.etapas.map((e) => ({
        cliente_id: c.id,
        etapa_codigo: e.etapa_codigo,
        ativo: true,
        ordem: e.ordem,
      })),
      { onConflict: 'cliente_id,etapa_codigo', ignoreDuplicates: true }
    );
    if (eErr) relatorio.erros.push(`etapas ${c.nome}: ${eErr.message}`);
    else relatorio.etapas += cenario.etapas.length;

    // regras (perguntas do edital) do cliente
    await supabase.from('cliente_regras').delete().eq('cliente_id', c.id);
    const { error: rErr } = await supabase.from('cliente_regras').insert(
      cenario.regras.map((r) => ({
        cliente_id: c.id,
        titulo: r.titulo,
        descricao: r.descricao,
        categoria: r.categoria,
        ativo: true,
        ordem: 0,
      }))
    );
    if (rErr) relatorio.erros.push(`regras ${c.nome}: ${rErr.message}`);
    else relatorio.regras += cenario.regras.length;

    // templates de declaração do cliente
    await supabase.from('declaracoes_templates').delete().eq('cliente_id', c.id);
    const { error: tErr } = await supabase.from('declaracoes_templates').insert(
      cenario.templates.map((t) => ({
        cliente_id: c.id,
        nome: t.nome,
        titulo: t.titulo,
        conteudo: t.conteudo,
        variaveis: t.variaveis,
        ativo: true,
      }))
    );
    if (tErr) relatorio.erros.push(`templates ${c.nome}: ${tErr.message}`);
    else relatorio.templates += cenario.templates.length;

    // palavras-chave (mantém as do cliente se já existirem)
    if (!c.nome || true) {
      const { data: clienteAtual } = await supabase
        .from('clientes')
        .select('palavras_positivas')
        .eq('id', c.id)
        .single();
      const tem = (clienteAtual?.palavras_positivas || []).length > 0;
      if (!tem) {
        const { error: kErr } = await supabase
          .from('clientes')
          .update({
            palavras_positivas: cenario.palavrasPositivas,
            palavras_negativas: cenario.palavrasNegativas,
          })
          .eq('id', c.id);
        if (kErr) relatorio.erros.push(`palavras-chave ${c.nome}: ${kErr.message}`);
      }
    }
  }

  return relatorio;
}
