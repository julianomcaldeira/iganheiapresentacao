/**
 * Gera conteúdo de EXAMPLE (demonstração) para o Processo Licitatório.
 *
 * Tudo aqui é conteúdo fictício de demonstração, gerado de forma
 * determinística a partir dos dados reais da licitação (número, objeto,
 * órgão, modalidade e valor estimado), para que cada etapa do processo
 * appear preenchida com exemplos coerentes entre si.
 *
 * Nenhuma chamada de IA é feita: o texto simula o que a IA teria
 * devolvido (análise do edital, respostas às perguntas do edital,
 * proposta e peças jurídicas).
 */

export interface ContextoExemplo {
  licitacaoId: string;
  numero: string;
  objeto: string;
  orgao: string;
  modalidade: string;
  portal: string;
  valorEstimado: number;
  clienteNome: string;
  ano: number;
}

export function fmtBRL(v: number): string {
  return (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function iso(base: Date, diasDeslocamento: number, horas = 9): string {
  const d = new Date(base.getTime());
  d.setDate(d.getDate() + diasDeslocamento);
  d.setHours(horas, Math.floor(Math.random() * 50), 0, 0);
  return d.toISOString();
}

/** Itens de exemplo derivados do objeto da licitação. */
export function gerarItensExemplo(ctx: ContextoExemplo): Array<{
  item_numero: number;
  descricao: string;
  unidade: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  marca: string;
  modelo: string;
}> {
  const rand = mulberry32(hashSeed(ctx.licitacaoId + 'itens'));
  const n = 3 + Math.floor(rand() * 2);
  const base = ctx.valorEstimado / n;

  const nomes = [
    'Kit básico com 1 unidade por fornecedor',
    'Lote complementar para reposição',
    'Item principal do objeto',
    'Acessório de apoio ao lote principal',
  ];
  const marcas = ['MedTech', 'VitalCare', 'BioLine', 'ProMed', 'Hospitalar Plus'];
  const modelos = ['MOD-100', 'MOD-220', 'MOD-350', 'MOD-475', 'MOD-500'];

  return Array.from({ length: n }, (_, i) => {
    const qtd = 10 + Math.floor(rand() * 90);
    const unit = Number((base / qtd).toFixed(2));
    return {
      item_numero: i + 1,
      descricao: `${nomes[i % nomes.length]} — ${ctx.objeto.slice(0, 60)}`,
      unidade: 'UN',
      quantidade: qtd,
      valor_unitario: unit,
      valor_total: Number((unit * qtd).toFixed(2)),
      marca: marcas[i % marcas.length],
      modelo: modelos[i % modelos.length],
    };
  });
}

// ===== Análise do edital (simula a resposta da IA) =====

export function gerarAnaliseEdital(ctx: ContextoExemplo, itens: ReturnType<typeof gerarItensExemplo>): string {
  const valor = fmtBRL(ctx.valorEstimado);
  const desconto = 12.4;
  const proposta = ctx.valorEstimado * (1 - desconto / 100);

  return `## 1. Resumo executivo

Licitação **${ctx.numero}**, de modalidade **${ctx.modalidade}**, publicada pelo **${ctx.orgao}**.
Objeto: ${ctx.objeto}.

A estimativa de valor é de **${valor}**, distribuída em **${itens.length} itens**. O processo exige
certidão de habilitação completa (fiscal, trabalhista e técnica), comprovação de regularidade junto ao
FGTS, previdência social e declaração de que a licitante não possui vínculo empregatício com o
órgão licitante. **Nível de risco estimado: médio**, com maior atenção ao cronograma de
impugnação/habilitação e à composição do preço estimado.

## 2. Objeto e itemização

${itens.map(i => `- **Item ${i.item_numero}** — ${i.descricao} | ${i.quantidade} ${i.unidade} | Unitário ${fmtBRL(i.valor_unitario)} | Total ${fmtBRL(i.valor_total)}`).join('\n')}

## 3. Estimativa de preços

- Valor estimado total: **${valor}**
- Média por item: **${fmtBRL(ctx.valorEstimado / itens.length)}**
- O lote de maior valor representa **${Math.round(
    (Math.max(...itens.map(i => i.valor_total)) / ctx.valorEstimado) * 100
  )}%** do valor total — é o principal ponto de atenção da negociação.

## 4. Prazos e marcos

| Marco | Prazo (dias) | Observação |
| --- | --- | --- |
| Impugnação ao edital | 8 | Prazo usual para Pregão Eletrônico |
| Impugnação das propostas | 5 | Após a abertura da disputa |
| Interposição de recurso | 10 | Contados da declaração de vencedor |
| Entrega dos itens | 30 | Contados do empenho |
| Validade da proposta | 90 | Recomendado manter acima do mínimo |

## 5. Habilitação exigida

1. **Habilitação jurídica** — registro ativo, CNPJ e contrato social.
2. **Habilitação técnica** — atestado de capacidade técnica nos últimos 5 anos.
3. **Habilitação fiscal** — CNDT, CGSN, CPF e federal, estadual e municipal.
4. **Habilitação financeira** — índices de liquidez ≥ 1,0 e endividamento ≤ 0,5.
5. **Habilitação técnica específica** — registro ANVISA quando o objeto exigir.

## 6. Pontos de atenção e riscos

- **Prazo curto de impugnação**: prazo de 8 dias exige leitura do edital ainda na etapa de análise.
- **Exigência de atestado**: confirmar se o atestado apresentado cobre o objeto ofertado.
- **Estimativa desdobrada em lotes**: há risco de proposta concentrada; recomenda-se composição de proposta por item.
- **Sanções**: há previsão de sanção para não manutenção da proposta e para atraso na entrega.

## 7. Estratégia recomendada

- Elaborar proposta com desconto-alvo de **${desconto}%** sobre o estimado, concentrando desconto no item de maior valor.
- Protocolar pedido de esclarecimento sobre a exigência de atestado **antes** da data limite de impugnação.
- Anexar prova de regularidade fiscal atualizada há menos de 30 dias.
- Confirmar disponibilidade de estoque para entrega em até 30 dias corridos.

## 8. Perguntas do edital respondidas pela IA

As perguntas cadastradas pelo cliente foram respondidas automaticamente com base no edital
(ver aba **Perguntas do Edital**). Nenhum ponto ficou pendente de confirmação humana.
`;
}

// ===== Resposta simulada da IA às perguntas do edital =====

export function gerarRespostaPergunta(
  ctx: ContextoExemplo,
  pergunta: string,
  titulo: string
): string {
  const valor = fmtBRL(ctx.valorEstimado);
  return `**${titulo}**

- **Licitação**: ${ctx.numero} — ${ctx.objeto}
- **Órgão**: ${ctx.orgao}
- **Modalidade**: ${ctx.modalidade}
- **Valor estimado**: ${valor}

**Análise do ponto "${pergunta.slice(0, 160)}${pergunta.length > 160 ? '…' : ''}":**

1. O edital **não impõe restrição de participação** a este requisito — a condição é atendida por
   qualquer licitante que comprove a documentação exigida no item de habilitação correspondente.
2. A documentação comprobatória deve ser apresentada **via plataforma do órgão**, com validade
mínima de ${ctx.modalidade.includes('Pregão') ? '30 dias' : '60 dias'} e deve estar
emitida após a data de publicação do aviso.
3. Não há exigência de apresentação de amostra ou demonstração, o que dispensa a produção prévia
   de lote piloto.
4. O custo estimado de atendimento a este requisito corresponde a aproximadamente **1,5%** do
   valor estimado da licitação, já embutido na composição de preço proposta.

**Conclusão:** o requisito é de atendimento routineiro, sem risco de inabilitação, desde que a
documentação esteja válida na data de entrega. **Recomendação:** incluir o documento no checklist
de habilitação e conferir a validade 5 dias antes do protocolo.

*Resposta gerada por IA com base no edital ${ctx.numero}.*
`;
}

// ===== Proposta comercial =====

export function gerarConteudoProposta(
  ctx: ContextoExemplo,
  itens: ReturnType<typeof gerarItensExemplo>
): string {
  const desconto = 12.4;
  const total = ctx.valorEstimado * (1 - desconto / 100);
  return `PROPOSTA COMERCIAL — Pregão Eletrônico nº ${ctx.numero}

Órgão Licitante: ${ctx.orgao}
Objeto: ${ctx.objeto}
Modalidade: ${ctx.modalidade}

1. IDENTIFICAÇÃO
Razão Social: ${ctx.clienteNome}
Validade da proposta: 90 (noventa) dias corridos, contados da data de entrega.
Prazo de entrega: 30 (trinta) dias corridos após o empenho.
Condição de pagamento: 30 dias após a apresentação da nota fiscal.

2. COMPOSIÇÃO DE PREÇOS

${itens.map(i => `Item ${i.item_numero} — ${i.descricao}\n  Quantidade: ${i.quantidade} ${i.unidade} | Preço unitário: ${fmtBRL(i.valor_unitario * (1 - desconto / 100))} | Total: ${fmtBRL(i.valor_total * (1 - desconto / 100))}`).join('\n')}

3. TOTAL DA PROPOSTA
Valor total ofertado: ${fmtBRL(total)}
Desconto médio sobre o valor estimado: ${desconto}%
(Valor estimado de referência: ${fmtBRL(ctx.valorEstimado)})

4. GARANTIA
Garantia de 5% (cinco por cento) do valor total da proposta, na modalidade carta de fiança bancária,
com validade de 120 dias, a ser apresentada no momento da homologação.

5. DECLARAÇÃO
Declaramos que os preços acima são válidos e comprometem esta empresa, que aceitamos
as condições do edital e que os itens ofertados atendem integralmente às especificações
técnicas, com registro ANVISA regular quando aplicável.

${ctx.clienteNome}
${new Date().toLocaleDateString('pt-BR')}
`;
}

// ===== Peças jurídicas =====

export function gerarConteudoPeca(
  tipo: string,
  ctx: ContextoExemplo,
  motivo: string
): string {
  const tituloMap: Record<string, string> = {
    pecas_esclarecimento: 'PEDIDO DE ESCLARECIMENTO',
    pecas_impugnacao: 'IMPUGNAÇÃO AO EDITAL',
    pecas_recurso: 'RECURSO ADMINISTRATIVO',
    pecas_contrarrazoes: 'CONTRARRAZÕES',
  };
  return `${tituloMap[tipo] || 'PEÇA JURÍDICA'}

À Pregoeiro(a) da Licitação nº ${ctx.numero}
Órgão: ${ctx.orgao}
Interessada: ${ctx.clienteNome}

1. DO OBJETO
${motivo}

2. DOS FATOS
A licitante, após análise detalhada do edital e de seus anexos, identificou a inconsistência
descrita acima, que pode restringir a participação de licitantes e comprometer a isonomia do
certame.

3. DO DIREITO
O art. 164, §1º, da Lei nº 14.133/2021 assegura o direito ao esclarecimento e à impugnação
de pontos que obstem a interpretação do edital, devendo o órgão licitante fornecer resposta
motivada e tempestiva.

4. DO PEDIDO
Diante do exposto, requer-se:
a) o acolhimento da presente peça, com a devida retificação do edital; ou
b) resposta fundamentada no prazo legal, para os fins de composição de recurso.

${ctx.clienteNome}
${new Date().toLocaleDateString('pt-BR')}
`;
}

// ===== Dados das etapas =====

export function gerarMotivoDisputa(ctx: ContextoExemplo): string {
  return (
    `Sessão pública encerrada após rodadas de lances. Adjudicado o item 1 a ${ctx.clienteNome} ` +
    `pelo valor de ${fmtBRL(ctx.valorEstimado * 0.876)}, 12,4% abaixo do estimado. ` +
    `Os itens 2 e 3 foram declarados fracassados por ausência de propostas válidas. ` +
    `Não houve interposição de recurso no prazo de 10 dias.`
  );
}

export function gerarLinkPortal(ctx: ContextoExemplo): string {
  const base = ctx.portal && ctx.portal.startsWith('http')
    ? ctx.portal
    : 'https://comprasnet.gov.br/';
  return base.replace(/\/$/, '') + `/licitacao/${ctx.numero.replace(/\D/g, '')}`;
}

export function gerarConcorrentes(ctx: ContextoExemplo): Array<{
  nome_concorrente: string;
  participou: boolean;
  ganhou: boolean;
  valor_proposta: number;
  observacoes: string;
}> {
  const rand = mulberry32(hashSeed(ctx.licitacaoId + 'conc'));
  const nomes = [
    'MedTech Solutions Comércio de Equipamentos Ltda',
    'Prime Hospitalar Suprimentos S.A.',
    'Nova Fronteira Distribuidora de Insumos',
    'Alpha Insumos Médicos e Serviços Ltda',
    'Conecta Saúde Distribuidora ME',
  ];
  const n = 3 + Math.floor(rand() * 3);
  return Array.from({ length: n }, (_, i) => {
    const won = i === 0;
    const fator = won ? 0.876 : 0.9 + rand() * 0.12;
    return {
      nome_concorrente: nomes[i % nomes.length],
      participou: true,
      ganhou: won,
      valor_proposta: Number((ctx.valorEstimado * fator).toFixed(2)),
      observacoes: won
        ? 'Adjudicada no item 1 — melhor lance da fase de disputa.'
        : 'Proposta aceita, não adjudicada (valor superior ao lance vencedor).',
    };
  });
}

export interface DocumentoExemplo {
  categoria: string;
  nome: string;
  descricao: string;
  status: string;
  obrigatorio: boolean;
  data_validade: string;
  observacoes: string;
}

/**
 * Documentos de exemplo por SEÇÃO do i-Ganhei (aba Documentos da licitação).
 * As categorias são exatamente as controladas pela UI:
 *   cnd        -> CNDs (Certidões Negativas)
 *   atestado   -> Atestados de Capacidade Técnica
 *   declaracao -> Declarações
 *   outro      -> Outros Documentos
 */
export function gerarDocumentosChecklist(
  ctx: ContextoExemplo,
  templatesDeclaracao: string[] = []
): DocumentoExemplo[] {
  const base = new Date();
  const val = (dias: number) => iso(base, dias).slice(0, 10);

  const cnd: DocumentoExemplo[] = [
    {
      categoria: 'cnd',
      nome: 'Certidão Negativa de Dívidos com a União (Federal)',
      descricao: 'CND Federal emitida pela Receita Federal, com código de controle validado.',
      status: 'concluido',
      obrigatorio: true,
      data_validade: val(45),
      observacoes: 'Emitida via consulta e-CAC em 08/10/2026.',
    },
    {
      categoria: 'cnd',
      nome: 'Certidão Negativa de Dívidos com o Estado',
      descricao: 'CND Estadual — Secretaria da Fazenda do Estado.',
      status: 'concluido',
      obrigatorio: true,
      data_validade: val(45),
      observacoes: 'Válida para o CNPJ da licitante e suas filiais.',
    },
    {
      categoria: 'cnd',
      nome: 'Certidão Negativa de Dívidos com o Município',
      descricao: 'CND Municipal emitida pela Prefeitura do município do órgão licitante.',
      status: 'pendente',
      obrigatorio: true,
      data_validade: val(20),
      observacoes: 'Pendente: emissão depende do protocolo no portal da prefeitura.',
    },
    {
      categoria: 'cnd',
      nome: 'Certidão de Regularidade do FGTS (CRF)',
      descricao: 'CRF emitida pela Caixa Econômica Federal.',
      status: 'concluido',
      obrigatorio: true,
      data_validade: val(45),
      observacoes: 'Compatível com o CNPJ da licitante.',
    },
    {
      categoria: 'cnd',
      nome: 'Certidão Negativa de Débitos do INSS (CNDT)',
      descricao: 'CNDT emitida pelo portal e-CAC da Receita Federal.',
      status: 'concluido',
      obrigatorio: true,
      data_validade: val(30),
      observacoes: 'Segunda via gerada em 09/10/2026.',
    },
    {
      categoria: 'cnd',
      nome: 'Certidão Negativa de Débitos Trabalhistas (TST)',
      descricao: 'CNDT do Tribunal Superior do Trabalho, com autenticação no portal do TST.',
      status: 'pendente',
      obrigatorio: true,
      data_validade: val(30),
      observacoes: 'Pendente: consulta ao portal do TST retornou pendência de homologação.',
    },
    {
      categoria: 'cnd',
      nome: 'Certidão de Débitos com o Simples Nacional (CG Simples)',
      descricao: 'Comprovante de situação cadastral no Regime Especial de Simplificação.',
      status: 'concluido',
      obrigatorio: false,
      data_validade: val(180),
      observacoes: 'Licitante optante pelo Simples Nacional — validade até 04/2027.',
    },
  ];

  const atestado: DocumentoExemplo[] = [
    {
      categoria: 'atestado',
      nome: 'Atestado de Capacidade Técnica — Fornecimento de Material Hospitalar',
      descricao: 'Atestado emitido por órgão público, compatível com o objeto ofertado, nos últimos 5 anos.',
      status: 'concluido',
      obrigatorio: true,
      data_validade: val(365),
      observacoes: 'Atestado nº 118/2024 — compatibilidade de objeto confirmada pela análise.',
    },
    {
      categoria: 'atestado',
      nome: 'Atestado de Capacidade Técnica — Fornecimento de Equipamentos com Registro ANVISA',
      descricao: 'Comprovante de fornecimento anterior de equipamentos com registro ANVISA vigente.',
      status: 'concluido',
      obrigatorio: true,
      data_validade: val(365),
      observacoes: 'Atestado nº 042/2025 — anexado registro ANVISA do lote ofertado.',
    },
    {
      categoria: 'atestado',
      nome: 'Atestado de Capacidade Técnica — Serviços de Manutenção e Instalação',
      descricao: 'Atestado de execução de serviços afins ao contrato, quando exigido pelo edital.',
      status: 'pendente',
      obrigatorio: false,
      data_validade: val(365),
      observacoes: 'Pendente: só será exigido caso o edital acrescente serviço de instalação ao objeto.',
    },
    {
      categoria: 'atestado',
      nome: 'Declaração de Equivalência de Objeto Ofertado',
      descricao: 'Declaração de que o produto ofertado é equivalente ao exigido, com mapeamento item a item.',
      status: 'pendente',
      obrigatorio: true,
      data_validade: val(90),
      observacoes: 'Pendente: aguardando validação do responsável técnico.',
    },
  ];

  const nomesDeclaracao = templatesDeclaracao.length > 0
    ? templatesDeclaracao
    : [
        'Declaração de Inexistência de Vínculo Empregatício',
        'Declaração de Optante pelo Simples Nacional',
        'Declaração de Idoneidade',
        'Declaração de Compromisso de Entrega',
      ];

  const declaracao: DocumentoExemplo[] = nomesDeclaracao.slice(0, 5).map((nome, i) => ({
    categoria: 'declaracao',
    nome,
    descricao: 'Declaração assinada digitalmente pelo representante legal da licitante.',
    status: i === nomesDeclaracao.slice(0, 5).length - 1 ? 'pendente' : 'concluido',
    obrigatorio: true,
    data_validade: val(90),
    observacoes:
      i === nomesDeclaracao.slice(0, 5).length - 1
        ? 'Pendente: assinar digitalmente antes do protocolo.'
        : 'Gerada a partir do template do cliente e assinada.',
  }));

  const outro: DocumentoExemplo[] = [
    {
      categoria: 'outro',
      nome: 'Procuração do Representante Legal',
      descricao: 'Instrumento de procuração outorgada à pessoa que assinará a proposta.',
      status: 'concluido',
      obrigatorio: true,
      data_validade: val(180),
      observacoes: 'Publicada em Diário Oficial, com firma reconhecida.',
    },
    {
      categoria: 'outro',
      nome: 'Documento de Identificação do Representante Legal',
      descricao: 'Copia do documento de identidade do signatário da proposta.',
      status: 'concluido',
      obrigatorio: true,
      data_validade: val(1825),
      observacoes: 'Conferido com o cadastro da empresa.',
    },
    {
      categoria: 'outro',
      nome: 'Comprovante de Inscrição e Situação Cadastral',
      descricao: 'Comprovante de Inscrição e de Situação Cadastral (Carta Cadastro) da Receita Federal.',
      status: 'concluido',
      obrigatorio: true,
      data_validade: val(180),
      observacoes: 'Nome legal conferido com a razão social usada na proposta.',
    },
    {
      categoria: 'outro',
      nome: 'Registro ANVISA dos Produtos Ofertados',
      descricao: 'Comprovante de registro ou cadastro de cada item ofertado junto à ANVISA.',
      status: 'pendente',
      obrigatorio: true,
      data_validade: val(180),
      observacoes: 'Pendente: depende do registro de 1 item do lote. Responsável: Coordenação Farmacêutica.',
    },
  ];

  return [...cnd, ...atestado, ...declaracao, ...outro];
}

/** Templates de declaração padrão (usados quando o cliente não tem nenhum). */
export function gerarTemplatesDeclaracaoPadrao(ctx: ContextoExemplo): Array<{
  nome: string;
  titulo: string;
  conteudo: string;
  variaveis: string[];
}> {
  return [
    {
      nome: 'Declaração de Inexistência de Vínculo Empregatício',
      titulo: 'Declaração de Inexistência de Vínculo Empregatício',
      conteudo:
        `DECLARAÇÃO DE INEXISTÊNCIA DE VÍNCULO EMPREGATÍCIO\n\n` +
        `Eu, ______________________, portador(a) do RG nº ______________ e CPF nº ______________________, ` +
        `na qualidade de representante legal da empresa {empresa_razao_social}, inscrita no CNPJ nº {empresa_cnpj}, ` +
        `declaro, para os fins da Licitação nº {licitacao_numero}, promovida pelo {licitacao_orgao}, que a empresa ` +
        `não mantém vínculo empregatício com o órgão licitante, não Sendo-lhe aplicável a vedação do art. 9º da Lei nº 14.133/2021.\n\n` +
        `Local e data: {data_atual}.`,
      variaveis: ['{empresa_razao_social}', '{empresa_cnpj}', '{licitacao_numero}', '{licitacao_orgao}', '{data_atual}'],
    },
    {
      nome: 'Declaração de Optante pelo Simples Nacional',
      titulo: 'Declaração de Optante pelo Simples Nacional',
      conteudo:
        `DECLARAÇÃO DE OPÇÃO PELO SIMPLES NACIONAL\n\n` +
        `A empresa {empresa_razao_social}, inscrita no CNPJ nº {empresa_cnpj}, declara estar enquadrada no Regime ` +
        `Especial de Simplificação Tributária (Simples Nacional), nos termos do art. 30 da Lei nº 14.133/2021, ` +
        `para fins de participação na Licitação nº {licitacao_numero} ({licitacao_orgao}).\n\n` +
        `Local e data: {data_atual}.`,
      variaveis: ['{empresa_razao_social}', '{empresa_cnpj}', '{licitacao_numero}', '{licitacao_orgao}', '{data_atual}'],
    },
    {
      nome: 'Declaração de Idoneidade',
      titulo: 'Declaração de Idoneidade',
      conteudo:
        `DECLARAÇÃO DE IDONEIDADE\n\n` +
        `Eu, ______________________, portador(a) do RG nº ______________ e CPF nº ______________________, ` +
        `na qualidade de representante legal da empresa {empresa_razao_social}, inscrita no CNPJ nº {empresa_cnpj}, ` +
        `declaro, para os fins da Licitação nº {licitacao_numero}, promovida pelo {licitacao_orgao}, que a empresa: ` +
        `(a) não possui insanidade, falência ou liquidação; (b) não está incursa em penalidade; ` +
        `(c) não possui vínculo empregatício com o órgão licitante; e (d) possui registros (cadastro) de ` +
        `regularidade fiscal, trabalhista e técnica de habilitação.\n\n` +
        `Local e data: {data_atual}.`,
      variaveis: ['{empresa_razao_social}', '{empresa_cnpj}', '{licitacao_numero}', '{licitacao_orgao}', '{data_atual}'],
    },
    {
      nome: 'Declaração de Compromisso de Entrega',
      titulo: 'Declaração de Compromisso de Entrega',
      conteudo:
        `DECLARAÇÃO DE COMPROMISSO DE ENTREGA\n\n` +
        `A empresa {empresa_razao_social}, inscrita no CNPJ nº {empresa_cnpj}, declara compromisso com o ` +
        `prazo de entrega de 30 (trinta) dias corridos contado do empenho, para todos os itens ofertados na ` +
        `Licitação nº {licitacao_numero}, promovida pelo {licitacao_orgao}, mantendo a validade da proposta por ` +
        `90 (noventa) dias.\n\n` +
        `Local e data: {data_atual}.`,
      variaveis: ['{empresa_razao_social}', '{empresa_cnpj}', '{licitacao_numero}', '{licitacao_orgao}', '{data_atual}'],
    },
  ];
}

export function gerarFluxoAprovacao(
  ctx: ContextoExemplo,
  aprovadores: Array<{ id: string; nome: string }>
): Array<{
  nome_etapa: string;
  descricao: string;
  ordem: number;
  aprovador_id: string | null;
  status: string;
  comentario: string;
}> {
  const passos = [
    { nome: 'Análise técnica', descricao: 'Validação das especificações técnicas e da composição de preço.' },
    { nome: 'Análise jurídica', descricao: 'Revisão das condições de habilitação e do risco jurídico.' },
    { nome: 'Aprovação comercial', descricao: 'Análise de margem, prazo de entrega e risco de não adjudicação.' },
    { nome: 'Aprovação final', descricao: 'Liberação para protocol da proposta no portal.' },
  ];
  return passos.map((p, i) => {
    const aprov = aprovadores[i % Math.max(aprovadores.length, 1)];
    return {
      nome_etapa: p.nome,
      descricao: p.descricao,
      ordem: i + 1,
      aprovador_id: aprov?.id ?? null,
      status: 'aprovado',
      comentario:
        i === 0
          ? 'Especificações e custos compatíveis com o mercado. Sugestão de acompanhamento: monitorar o registro ANVISA.'
          : 'Aprovado sem ressalvas.',
    };
  });
}

export function gerarMensagensInternas(
  ctx: ContextoExemplo,
  autores: string[]
): Array<{ autor_id: string; conteudo: string }> {
  const [a, b, c] = autores;
  const textos = [
    `Análise do edital ${ctx.numero} concluída. Resumo enviado para validação.`,
    'Vi a análise. A exigência de atestado é o ponto mais sensível — vamos pedir esclarecimento antes de protocolar.',
    'Concordo. Já deixei o rascunho do pedido de esclarecimento na aba Peças Jurídicas.',
    'Perfeito. Assim que o pregoeiro responder, seguimos para a proposta e a aprovação.',
  ];
  return textos
    .filter((_, i) => autores[i % autores.length])
    .map((conteudo, i) => ({ autor_id: autores[i % autores.length], conteudo }));
}

export function gerarTarefas(
  ctx: ContextoExemplo,
  perfis: Array<{ id: string; nome: string }>
): Array<{
  titulo: string;
  descricao: string;
  prioridade: string;
  status: string;
  responsavel_id: string | null;
  data_vencimento: string;
}> {
  const base = new Date();
  const p = perfis[0]?.id ?? null;
  return [
    {
      titulo: `Protocolar pedido de esclarecimento — ${ctx.numero}`,
      descricao: 'Enviar o pedido de esclarecimento sobre a exigência de atestado de capacidade técnica.',
      prioridade: 'alta',
      status: 'concluida',
      responsavel_id: p,
      data_vencimento: iso(base, 3).slice(0, 10),
    },
    {
      titulo: `Validar registro ANVISA dos itens ofertados`,
      descricao: 'Conferir o registro de cada item do lote na base da ANVISA e anexar ao checklist.',
      prioridade: 'urgente',
      status: 'em_andamento',
      responsavel_id: p,
      data_vencimento: iso(base, 5).slice(0, 10),
    },
    {
      titulo: `Consolidar proposta final — ${ctx.numero}`,
      descricao: 'Ajustar a composição de preço com base no desconto aprovado e gerar a proposta assinada.',
      prioridade: 'media',
      status: 'pendente',
      responsavel_id: p,
      data_vencimento: iso(base, 9).slice(0, 10),
    },
  ];
}
