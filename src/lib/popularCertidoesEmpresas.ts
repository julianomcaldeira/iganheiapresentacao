/**
 * Popula a base de CERTIDÕES de cada empresa (tabela idocumentei_documentos,
 * a mesma que alimenta a aba "CNDs — i-Documentei").
 *
 * Cada empresa recebe um conjunto próprio de certidões, com datas coerentes:
 *   - maioria válidas (vencimento no futuro);
 *   - uma ou duas vencendo em breve (próximos 30 dias);
 *   - pelo menos uma VENCIDA (validade no passado) — para demonstrar o
 *     tratamento de documento vencido.
 *
 * Idempotente: as certidões de demonstração anteriores da empresa são
 * removidas antes de gravar as novas.
 */
import { supabase } from '@/integrations/supabase/client';

export interface RelatorioCertidoes {
  empresas: number;
  certidoes: number;
  vencidas: number;
  vencendo: number;
  erros: string[];
}

interface ModeloCertidao {
  slug: string;
  nome: string;
  tipo: string;
  /** dias até o vencimento (negativo = vencida) */
  diasValidade: number;
  status: 'valido' | 'proximo_vencimento' | 'vencido';
}

const MODELOS: ModeloCertidao[] = [
  { slug: 'cnd-federal', nome: 'Certidão Negativa de Dívidos com a União (Federal)', tipo: 'CND Federal', diasValidade: 120, status: 'valido' },
  { slug: 'cnd-estadual', nome: 'Certidão Negativa de Dívidos com o Estado', tipo: 'CND Estadual', diasValidade: 90, status: 'valido' },
  { slug: 'cnd-municipal', nome: 'Certidão Negativa de Dívidos com o Município', tipo: 'CND Municipal', diasValidade: -12, status: 'vencido' },
  { slug: 'fgts', nome: 'Certidão de Regularidade do FGTS (CRF)', tipo: 'FGTS', diasValidade: 60, status: 'valido' },
  { slug: 'inss', nome: 'Certidão Negativa de Débitos do INSS (CNDT)', tipo: 'CND INSS', diasValidade: 18, status: 'proximo_vencimento' },
  { slug: 'tst', nome: 'Certidão Negativa de Débitos Trabalhistas (TST)', tipo: 'CND TST', diasValidade: 45, status: 'valido' },
  { slug: 'simples', nome: 'Certidão de Débitos com o Simples Nacional', tipo: 'CG Simples', diasValidade: 180, status: 'valido' },
  { slug: 'prf', nome: 'Prova de Regularidade Fiscal (PRF)', tipo: 'PRF', diasValidade: 90, status: 'valido' },
  { slug: 'cnd-municipal-2', nome: 'Certidão de Dívidas Mobiliárias e Imobiliárias', tipo: 'CND Imobiliária', diasValidade: 210, status: 'valido' },
  { slug: 'fiscal-estadual', nome: 'Certidão de Situação Cadastral Estadual', tipo: 'Cadastro Estadual', diasValidade: 150, status: 'valido' },
];

function dataRelativa(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString();
}

/**
 * Popula as certidões de demonstração das empresas.
 * @param opts.clienteId limita a um cliente específico
 */
export async function popularCertidoesEmpresas(
  opts: { clienteId?: string; porEmpresa?: number; incluirVencida?: boolean } = {}
): Promise<RelatorioCertidoes> {
  const relatorio: RelatorioCertidoes = {
    empresas: 0,
    certidoes: 0,
    vencidas: 0,
    vencendo: 0,
    erros: [],
  };

  let empQuery = supabase
    .from('empresas')
    .select('id, cliente_id, razao_social, nome_fantasia')
    .eq('ativo', true);
  if (opts.clienteId) empQuery = empQuery.eq('cliente_id', opts.clienteId);
  const { data: empresas, error } = await empQuery;

  if (error) {
    relatorio.erros.push(`empresas: ${error.message}`);
    return relatorio;
  }
  if (!empresas || empresas.length === 0) {
    relatorio.erros.push('nenhuma empresa encontrada');
    return relatorio;
  }

  const porEmpresa = opts.porEmpresa || MODELOS.length;

  for (const empresa of empresas as any[]) {
    relatorio.empresas++;
    const nomeEmpresa = empresa.nome_fantasia || empresa.razao_social;

    // remove as certidões de demonstração anteriores desta empresa
    const { data: antigas } = await supabase
      .from('idocumentei_documentos')
      .select('id, dados_raw')
      .eq('empresa_id', empresa.id);
    const idsDemo = (antigas || [])
      .filter((d: any) => (d.dados_raw as any)?.origem === 'demo')
      .map((d: any) => d.id);
    if (idsDemo.length > 0) {
      await supabase.from('idocumentei_documentos').delete().in('id', idsDemo);
    }

    const modelos = MODELOS.slice(0, porEmpresa).filter((m) =>
      opts.incluirVencida === false ? m.status !== 'vencido' : true
    );
    const rows = modelos.map((m) => {
      const validade = dataRelativa(m.diasValidade);
      const emissao = dataRelativa(m.diasValidade - 60);
      return {
        empresa_id: empresa.id,
        idocumentei_empresa_id: `demo-${empresa.id}-${m.slug}`,
        tipo: m.tipo,
        nome: `${m.nome} — ${nomeEmpresa}`,
        status: m.status,
        data_emissao: emissao,
        data_validade: validade,
        dados_raw: { origem: 'demo', slug: m.slug, status: m.status },
      };
    });

    const { error: insErr } = await supabase.from('idocumentei_documentos').insert(rows);
    if (insErr) {
      relatorio.erros.push(`${nomeEmpresa}: ${insErr.message}`);
    } else {
      relatorio.certidoes += rows.length;
      relatorio.vencidas += rows.filter((r) => r.status === 'vencido').length;
      relatorio.vencendo += rows.filter((r) => r.status === 'proximo_vencimento').length;
    }
  }

  return relatorio;
}
