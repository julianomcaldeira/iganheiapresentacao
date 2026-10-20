/**
 * Simula o chat da sessão pública (monitoramento do pregão) com base nos
 * dados reais da licitação: número, órgão, objeto e valor estimado.
 * Usado quando ainda não há mensagens capturadas na base (demo/ambiente novo).
 */

export interface MensagemMonitoramento {
  id: string;
  licitacao_id: string;
  autor_tipo: 'pregoeiro' | 'sistema' | 'licitante';
  autor_nome: string | null;
  mensagem: string;
  data_mensagem: string;
  origem: string;
}

interface Ctx {
  licitacaoId: string;
  numero?: string;
  objeto?: string;
  orgao?: string;
  valorEstimado?: number;
}

/** Hash simples e determinístico a partir do id da licitação. */
function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** PRNG determinístico (mulberry32) — mesma licitação => mesmo chat. */
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

const NOMES_FANTASIA = [
  'MedTech Solutions',
  'Prime Hospitalar',
  'Nova Fronteira Equipamentos',
  'Alpha Insumos Médicos',
  'Conecta Saúde LTDA',
  'Vanguarda Comercial',
];

const CNPJS_FANTASIA = [
  '12.345.678/0001-90',
  '98.765.432/0001-10',
  '45.678.901/0001-23',
  '32.109.876/0001-45',
];

function fmtBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function gerarMensagensMonitoramento(ctx: Ctx): MensagemMonitoramento[] {
  const rand = mulberry32(hashSeed(ctx.licitacaoId));
  const numero = ctx.numero || '___/____';
  const objeto = ctx.objeto || 'objeto da licitação';
  const orgao = ctx.orgao || 'Órgão Licitante';
  const valorInicial = ctx.valorEstimado && ctx.valorEstimado > 0
    ? ctx.valorEstimado
    : 850000 + Math.floor(rand() * 2_000_000);

  const nLicitantes = 2 + Math.floor(rand() * 3); // 2 a 4
  const licitantes = Array.from({ length: nLicitantes }, (_, i) => ({
    nome: NOMES_FANTASIA[i % NOMES_FANTASIA.length],
    cnpj: CNPJS_FANTASIA[i % CNPJS_FANTASIA.length],
  }));

  // Horário-base: hoje às 09:00, mensagens a cada 1–4 min
  const base = new Date();
  base.setHours(9, 0, 0, 0);
  let minutos = 0;
  const nextTime = (stepMin = 1 + Math.floor(rand() * 3)) => {
    minutos += stepMin;
    const d = new Date(base.getTime() + minutos * 60_000);
    return d.toISOString();
  };

  const msgs: Omit<MensagemMonitoramento, 'id' | 'licitacao_id'>[] = [];

  const push = (
    autor_tipo: MensagemMonitoramento['autor_tipo'],
    autor_nome: string | null,
    mensagem: string,
    stepMin?: number
  ) => {
    msgs.push({
      autor_tipo,
      autor_nome,
      mensagem,
      data_mensagem: nextTime(stepMin),
      origem: 'simulado',
    });
  };

  // Abertura
  push(
    'sistema',
    null,
    `Sessão pública iniciada — Pregão Eletrônico nº ${numero} (${orgao}). Objeto: ${objeto}.`,
    0
  );
  push(
    'pregoeiro',
    'Pregoeiro(a)',
    `Damos início à sessão pública de julgamento do Pregão Eletrônico nº ${numero}, tendo por objeto ${objeto}. Valor estimado: ${fmtBRL(valorInicial)}.`,
    2
  );
  push(
    'pregoeiro',
    'Pregoeiro(a)',
    'Verificada a regularidade de habilitação das licitantes presentes, declaro aberta a fase de lances. Lances serão aceitos apenas pelo sistema.',
    2
  );

  // Propostas iniciais (lances acima do estimado, como no pregão real)
  let melhorLance = valorInicial * (1.02 + rand() * 0.08);
  licitantes.forEach((l, i) => {
    const lance = melhorLance * (0.97 + rand() * 0.05) * (i === 0 ? 1 : 1);
    if (i === 0) melhorLance = lance;
    else melhorLance = Math.min(melhorLance, lance);
    push(
      'licitante',
      l.nome,
      `Proposta registrada — ${l.nome} (CNPJ ${l.cnpj}): ${fmtBRL(lance)}.`,
      2
    );
    push(
      'sistema',
      null,
      `Lance registrado: ${fmtBRL(lance)}. Melhor lance atual: ${fmtBRL(melhorLance)}.`,
      1
    );
  });

  // Fase de disputa: reduções
  const rodadas = 3 + Math.floor(rand() * 3);
  for (let r = 0; r < rodadas; r++) {
    const reducao = 0.02 + rand() * 0.05; // 2% a 7%
    melhorLance = melhorLance * (1 - reducao);
    const empresa = licitantes[Math.floor(rand() * licitantes.length)];
    push(
      'pregoeiro',
      'Pregoeiro(a)',
      r === 0
        ? 'Fase de lances. Aceito propostas melhores que o melhor lance atual.'
        : `Novo lance registrado por ${empresa.nome}. Continuo aberto para lances melhores.`,
      2
    );
    push(
      'licitante',
      empresa.nome,
      `Lance: ${fmtBRL(melhorLance)}.`,
      1
    );
    push(
      'sistema',
      null,
      `Lance aceito — ${empresa.nome}: ${fmtBRL(melhorLance)}. Encerramento automático em 10 minutos sem novos lances.`,
      1
    );
  }

  // Encerramento e resultado
  push('pregoeiro', 'Pregoeiro(a)', 'Encerrado o tempo de lances. Verificando o registro de melhor proposta no sistema…', 3);
  const vencedora = licitantes[Math.floor(rand() * licitantes.length)];
  push(
    'sistema',
    null,
    `Resultado provisório: ${vencedora.nome} — melhor lance ${fmtBRL(melhorLance)} (${((melhorLance / valorInicial - 1) * 100).toFixed(1)}% sobre o valor estimado).`,
    2
  );
  push(
    'pregoeiro',
    'Pregoeiro(a)',
    `Declaro ${vencedora.nome} vencedora provisória do certame, nos termos do art. 56 da Lei nº 14.133/2021. Fica aberto o prazo de 10 minutos para interposição de recurso e apresentação de diligências.`,
    2
  );
  push(
    'sistema',
    null,
    'Sessão encerrada. Ata de registro de lances disponibilizada no portal.',
    5
  );

  return msgs.map((m, i) => ({
    ...m,
    id: `sim-${ctx.licitacaoId.slice(0, 8)}-${i}`,
    licitacao_id: ctx.licitacaoId,
  }));
}
