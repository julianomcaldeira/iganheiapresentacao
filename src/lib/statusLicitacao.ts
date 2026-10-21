/**
 * Gravação do status geral da licitação, tolerante ao schema real do banco.
 *
 * O banco de produção (criado pelo Lovable) pode aceitar apenas um
 * conjunto de valores de `status` — e não os que a primeira versão do
 * app usava ('finalizado', 'recusado', 'pendente_analise'). Nestes casos
 * há CHECK constraint ou política que rejeita a gravação.
 *
 * A estratégia é simples: grava o valor desejado, relê do banco e, se não
 * persistiu, tenta as variações equivalentes até uma ser aceita.
 */
import { supabase } from '@/integrations/supabase/client';

/** Equivalências por status desejado, na ordem de tentativa. */
export const STATUS_EQUIVALENTES: Record<string, string[]> = {
  finalizado: ['finalizado', 'concluida'],
  recusado: ['recusado', 'cancelada', 'perdida'],
  pendente_analise: ['pendente_analise', 'rascunho', 'aguardando_aprovacao'],
  em_andamento: ['em_andamento', 'aguardando_aprovacao'],
  rascunho: ['rascunho', 'pendente_analise'],
  aguardando_aprovacao: ['aguardando_aprovacao', 'em_andamento', 'pendente_analise'],
};

export interface ResultadoGravacaoStatus {
  ok: boolean;
  /** Valor efetivamente gravado no banco */
  valor: string | null;
  /** Valor que o app desejava */
  desejado: string;
  erro?: string;
  /** Tentativas realizadas (valor → resultado) */
  tentativas: Array<{ valor: string; ok: boolean; erro?: string }>;
}

export async function gravarStatusLicitacao(
  licitacaoId: string,
  statusDesejado: string
): Promise<ResultadoGravacaoStatus> {
  const candidatos = STATUS_EQUIVALENTES[statusDesejado] ?? [statusDesejado];
  const tentativas: Array<{ valor: string; ok: boolean; erro?: string }> = [];
  let ultimoErro: string | undefined;

  for (const valor of candidatos) {
    const { error } = await supabase
      .from('licitacoes')
      .update({ status: valor })
      .eq('id', licitacaoId);

    if (error) {
      ultimoErro = error.message;
      tentativas.push({ valor, ok: false, erro: error.message });
      continue;
    }

    // confirma persistência (protege contra triggers que reescrevem o valor)
    const { data: leitura } = await supabase
      .from('licitacoes')
      .select('status')
      .eq('id', licitacaoId)
      .maybeSingle();

    if (leitura?.status === valor) {
      tentativas.push({ valor, ok: true });
      return { ok: true, valor, desejado: statusDesejado, tentativas };
    }

    tentativas.push({ valor, ok: false, erro: `valor não persistiu (ficou ${leitura?.status ?? 'nulo'})` });
  }

  return {
    ok: false,
    valor: null,
    desejado: statusDesejado,
    erro: ultimoErro || 'nenhum valor de status foi aceito',
    tentativas,
  };
}
