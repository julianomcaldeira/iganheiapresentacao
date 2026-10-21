/**
 * Gravação segura em `licitacao_documentos_checklist`.
 *
 * O banco em produção foi criado pelo Lovable com um schema levemente
 * diferente do que está nas migrations do repo (por exemplo, a coluna
 * `observacoes` não existe lá). Para não quebrar a demo, o insert é
 * feito de forma adaptativa: se o banco responder que uma coluna não
 * existe, ela é removida do payload e a gravação é refeita.
 */
import { supabase } from '@/integrations/supabase/client';

export interface DocumentoChecklistPayload {
  licitacao_id: string;
  nome: string;
  categoria: string;
  descricao?: string | null;
  status?: string;
  obrigatorio?: boolean;
  data_validade?: string | null;
  observacoes?: string | null;
  verificado_por?: string | null;
  verificado_em?: string | null;
}

export interface ResultadoInsercao {
  ok: boolean;
  erro?: string;
  /** Colunas que o banco não possui e foram descartadas */
  colunasDescartadas: string[];
}

const COLUNAS_OPCIONAIS = [
  'descricao',
  'data_validade',
  'observacoes',
  'verificado_por',
  'verificado_em',
  'obrigatorio',
  'status',
  'categoria',
];

export async function inserirChecklistDocumentos(
  rows: DocumentoChecklistPayload[]
): Promise<ResultadoInsercao> {
  const descartadas: string[] = [];
  let payload: any[] = rows.map((r) => ({ ...r }));

  for (let tentativa = 0; tentativa < 5; tentativa++) {
    const { error } = await supabase.from('licitacao_documentos_checklist').insert(payload);

    if (!error) {
      return { ok: true, colunasDescartadas: descartadas };
    }

    const msg = error.message || '';
    const match = msg.match(/Could not find the '([a-z_]+)' column/);
    const coluna = match ? match[1] : null;

    if (coluna && payload.some((r) => coluna in r)) {
      // remove a coluna inexistente e tenta de novo
      payload = payload.map((r) => {
        const copy = { ...r };
        delete copy[coluna];
        return copy;
      });
      if (!descartadas.includes(coluna)) descartadas.push(coluna);
      continue;
    }

    // erro genérico: descarta progressivamente as colunas opcionais
    const proxima = COLUNAS_OPCIONAIS.find(
      (c) => !descartadas.includes(c) && payload.some((r) => c in r)
    );
    if (proxima) {
      payload = payload.map((r) => {
        const copy = { ...r };
        delete copy[proxima];
        return copy;
      });
      descartadas.push(proxima);
      continue;
    }

    return { ok: false, erro: msg, colunasDescartadas: descartadas };
  }

  return {
    ok: false,
    erro: 'Falha ao gravar documentos após várias tentativas',
    colunasDescartadas: descartadas,
  };
}

/** Busca o checklist de uma licitação usando apenas colunas que existem. */
export async function buscarChecklistDocumentos(licitacaoId: string) {
  const { data, error } = await supabase
    .from('licitacao_documentos_checklist')
    .select('*')
    .eq('licitacao_id', licitacaoId)
    .order('categoria', { ascending: true });
  if (error) return { data: [] as any[], error };
  return { data: (data || []) as any[], error: null };
}
