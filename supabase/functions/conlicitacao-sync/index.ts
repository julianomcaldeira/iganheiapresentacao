import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ConLicitacao API Base URL
const CONLICITACAO_API_URL = 'https://consultaonline.conlicitacao.com.br/api';

const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

type ConlicitacaoApiResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; errorText: string };

async function conlicitacaoGet<T>(path: string, token: string): Promise<ConlicitacaoApiResult<T>> {
  const tokenClean = (token || '').trim();
  const res = await fetch(`${CONLICITACAO_API_URL}${path}`, {
    headers: {
      accept: 'application/json',
      // ConLicitacao usa token por header
      'x-auth-token': tokenClean,
    },
  });

  const text = await res.text();
  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      errorText: text || `HTTP ${res.status}`,
    };
  }

  try {
    return { ok: true, status: res.status, data: (text ? JSON.parse(text) : null) as T };
  } catch {
    // Se veio vazio ou não-JSON
    return { ok: true, status: res.status, data: null as T };
  }
}

function parseConlicitacaoError(errorText: string): { request_ip: string | null; message: string | null } {
  // Formato típico: {"errors":[{"error":"...","request_ip":"..."}]}
  try {
    const parsed = JSON.parse(errorText);
    const first = parsed?.errors?.[0];
    return {
      request_ip: typeof first?.request_ip === 'string' ? first.request_ip : null,
      message: typeof first?.error === 'string' ? first.error : null,
    };
  } catch {
    // fallback: tenta extrair por regex
    try {
      const ipMatch = errorText.match(/"request_ip"\s*:\s*"([^"]+)"/);
      const msgMatch = errorText.match(/"error"\s*:\s*"([^"]+)"/);
      return {
        request_ip: ipMatch ? ipMatch[1] : null,
        message: msgMatch ? msgMatch[1] : null,
      };
    } catch {
      return { request_ip: null, message: null };
    }
  }
}

interface OrgaoTelefone {
  ddd: string;
  numero: string;
  ramal?: string;
}

interface Orgao {
  nome: string;
  codigo?: string;
  cidade?: string;
  uf?: string;
  endereco?: string;
  telefone?: OrgaoTelefone[];
  site?: string;
}

interface Documento {
  filename: string;
  url: string;
}

interface LicitacaoConlicitacao {
  id: number;
  orgao: Orgao;
  objeto: string;
  situacao: string;
  datahora_abertura?: string;
  datahora_documento?: string;
  datahora_retirada?: string;
  datahora_visita?: string;
  datahora_prazo?: string;
  edital?: string;
  documento?: Documento[];
  processo?: string;
  observacao?: string;
  preco_edital?: number;
  valor_estimado?: number;
}

interface AcompanhamentoConlicitacao {
  id: number;
  licitacao_id?: number;
  orgao: Orgao;
  objeto: string;
  sintese?: string;
  data_fonte?: string;
  edital?: string;
  processo?: string;
}

interface ClienteFiltro {
  id: number;
  descricao: string;
}

interface Cliente {
  id: number;
  razao_social: string;
  filtro?: ClienteFiltro;
}

interface Boletim {
  id: number;
  datahora_fechamento: string;
  numero_edicao?: number;
  cliente: Cliente;
  quantidade_licitacoes: number;
  quantidade_acompanhamentos: number;
}

interface BoletimListItem {
  id: number;
  filtro_id: number;
  numero_edicao: number;
  datahora_fechamento: string;
}

interface FiltrosResponse {
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

interface BoletinsResponse {
  cliente: string;
  total_boletins: number;
  boletins: BoletimListItem[];
}

interface BoletimResponse {
  boletim: Boletim;
  licitacoes: LicitacaoConlicitacao[];
  acompanhamentos?: AcompanhamentoConlicitacao[];
}

// Map ConLicitacao situacao to our internal status
function mapSituacaoToStatus(situacao: string): string {
  const situacaoLower = situacao?.toLowerCase() || '';
  
  if (situacaoLower.includes('nova') || situacaoLower.includes('aberta')) {
    return 'nova';
  }
  if (situacaoLower.includes('andamento') || situacaoLower.includes('em curso')) {
    return 'em_analise';
  }
  if (situacaoLower.includes('adjudicad') || situacaoLower.includes('homologad')) {
    return 'participando';
  }
  if (situacaoLower.includes('cancelad') || situacaoLower.includes('revogad') || situacaoLower.includes('anulad')) {
    return 'cancelada';
  }
  if (situacaoLower.includes('deserta') || situacaoLower.includes('fracassada')) {
    return 'cancelada';
  }
  if (situacaoLower.includes('suspend') || situacaoLower.includes('adiada')) {
    return 'em_analise';
  }
  
  return 'nova';
}

// Parse date from ConLicitacao format
function parseConlicitacaoDate(dateStr?: string): string | null {
  if (!dateStr || dateStr.trim() === '') return null;
  
  try {
    const cleanDate = dateStr.replace(/\s-\d{2}:\d{2}$/, '');
    const date = new Date(cleanDate);
    
    if (isNaN(date.getTime())) return null;
    
    return date.toISOString();
  } catch {
    return null;
  }
}

// Format telefone array to string
function formatTelefone(telefones?: OrgaoTelefone[]): string | null {
  if (!telefones || telefones.length === 0) return null;
  
  return telefones.map(t => {
    let tel = '';
    if (t.ddd) tel += `(${t.ddd}) `;
    tel += t.numero || '';
    if (t.ramal) tel += ` R: ${t.ramal}`;
    return tel;
  }).join(', ');
}

// Get first document URL
function getEditalUrl(documentos?: Documento[]): string | null {
  if (!documentos || documentos.length === 0) return null;
  
  const doc = documentos[0];
  if (doc.url.startsWith('http')) {
    return doc.url;
  }
  return `https://consultaonline.conlicitacao.com.br${doc.url}`;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate authentication
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  const supabaseAuthCheck = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
  const { data: claimsData, error: claimsError } = await supabaseAuthCheck.auth.getUser();
  if (claimsError || !claimsData?.user) {
    return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { cliente_id, action, token: providedToken } = await req.json();

    console.log('=== ConLicitacao Sync ===');
    console.log('Action:', action);
    console.log('Cliente ID:', cliente_id);

    // Action: test - Test API connection with provided token
    if (action === 'test') {
      const testToken = (providedToken || '').trim();
      
      if (!testToken) {
        return new Response(
          JSON.stringify({ success: false, error: 'Token não fornecido' }),
          { headers: jsonHeaders }
        );
      }

      const result = await conlicitacaoGet<FiltrosResponse>('/filtros', testToken);

      if (!result.ok) {
        const parsedErr = parseConlicitacaoError(result.errorText);
        return new Response(
          JSON.stringify({
            success: false,
            // Mantém mensagem curta para UI; detalhes continuam no errorText original
            error: parsedErr.message || result.errorText,
            status: result.status,
            request_ip: parsedErr.request_ip,
            is_ip_error: Boolean(parsedErr.request_ip),
            raw_error: result.errorText,
          }),
          { headers: jsonHeaders }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Conexão realizada com sucesso!',
          cliente: result.data?.cliente ?? null,
          filtros: result.data?.filtros ?? [],
        }),
        { headers: jsonHeaders }
      );
    }

    // Get client's ConLicitacao config for other actions
    const { data: configData, error: configError } = await supabase
      .from('conlicitacao_config')
      .select('*')
      .eq('cliente_id', cliente_id)
      .eq('ativo', true)
      .single();

    if (configError || !configData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Configuração ConLicitacao não encontrada' }),
        { headers: jsonHeaders }
      );
    }
    const token = (configData.token || '').trim();

    // Action: list_filtros - List available filters
    if (action === 'list_filtros') {
      const result = await conlicitacaoGet<FiltrosResponse>('/filtros', token);

      if (!result.ok) {
        const parsedErr = parseConlicitacaoError(result.errorText);
        return new Response(
          JSON.stringify({
            success: false,
            error: `ConLicitacao API error: ${result.status} - ${result.errorText}`,
            status: result.status,
            request_ip: parsedErr.request_ip,
            is_ip_error: Boolean(parsedErr.request_ip),
          }),
          { headers: jsonHeaders }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          cliente: result.data?.cliente ?? null,
          filtros: result.data?.filtros ?? [],
        }),
        { headers: jsonHeaders }
      );
    }
    // Action: list_boletins - List bulletins for the configured filter
    if (action === 'list_boletins') {
      const filtroId = configData.filtro_id;

      if (!filtroId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Filtro não configurado' }),
          { headers: jsonHeaders }
        );
      }

      const result = await conlicitacaoGet<BoletinsResponse>(
        `/filtro/${filtroId}/boletins?per_page=20&order=desc`,
        token
      );

      if (!result.ok) {
        const parsedErr = parseConlicitacaoError(result.errorText);
        return new Response(
          JSON.stringify({
            success: false,
            error: `ConLicitacao API error: ${result.status} - ${result.errorText}`,
            status: result.status,
            request_ip: parsedErr.request_ip,
            is_ip_error: Boolean(parsedErr.request_ip),
          }),
          { headers: jsonHeaders }
        );
      }

      return new Response(
        JSON.stringify({ success: true, boletins: result.data }),
        { headers: jsonHeaders }
      );
    }
    // Action: sync - Sync new bulletins
    if (action === 'sync') {
      const filtroId = configData.filtro_id;
      const ultimoBoletimId = configData.ultimo_boletim_id || 0;

      if (!filtroId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Filtro não configurado' }),
          { headers: jsonHeaders }
        );
      }
      // Get default workflow for the client
      const { data: workflowData } = await supabase
        .from('licitacao_workflows')
        .select('id')
        .eq('cliente_id', cliente_id)
        .eq('ativo', true)
        .limit(1)
        .single();

      const workflowId = workflowData?.id;

      // List recent bulletins
      const boletinsResult = await conlicitacaoGet<BoletinsResponse>(
        `/filtro/${filtroId}/boletins?per_page=10&order=desc`,
        token
      );

      if (!boletinsResult.ok) {
        const parsedErr = parseConlicitacaoError(boletinsResult.errorText);
        return new Response(
          JSON.stringify({
            success: false,
            error: `ConLicitacao API error: ${boletinsResult.status} - ${boletinsResult.errorText}`,
            status: boletinsResult.status,
            request_ip: parsedErr.request_ip,
            is_ip_error: Boolean(parsedErr.request_ip),
          }),
          { headers: jsonHeaders }
        );
      }

      const boletinsData = boletinsResult.data;
      // Filter new bulletins
      const newBoletins = boletinsData.boletins.filter(b => b.id > ultimoBoletimId);
      
      console.log('New boletins to process:', newBoletins.length);

      let totalNovas = 0;
      let totalAtualizadas = 0;
      let lastBoletimId = ultimoBoletimId;

      for (const boletimItem of newBoletins) {
        console.log('Processing boletim:', boletimItem.id);

        // Get boletim details
        const boletimResponse = await fetch(
          `${CONLICITACAO_API_URL}/boletim/${boletimItem.id}`,
          { headers: { 'x-auth-token': token } }
        );

        if (!boletimResponse.ok) {
          console.error('Failed to fetch boletim:', boletimItem.id);
          continue;
        }

        const boletimData = await boletimResponse.json() as BoletimResponse;
        
        // Process licitações
        for (const lic of boletimData.licitacoes || []) {
          const { data: existingLic } = await supabase
            .from('licitacoes')
            .select('id')
            .eq('conlicitacao_id', lic.id)
            .eq('cliente_id', cliente_id)
            .single();

          const licitacaoData = {
            cliente_id: cliente_id,
            workflow_id: workflowId,
            conlicitacao_id: lic.id,
            numero: lic.edital || `CL-${lic.id}`,
            objeto: lic.objeto || '',
            orgao: lic.orgao?.nome || 'Não informado',
            uasg: lic.orgao?.codigo || null,
            cidade_orgao: lic.orgao?.cidade || null,
            uf_orgao: lic.orgao?.uf || null,
            endereco_orgao: lic.orgao?.endereco || null,
            telefone_orgao: formatTelefone(lic.orgao?.telefone),
            site_orgao: lic.orgao?.site || null,
            situacao_conlicitacao: lic.situacao || null,
            status: mapSituacaoToStatus(lic.situacao),
            data_abertura: parseConlicitacaoDate(lic.datahora_abertura),
            data_encerramento: parseConlicitacaoDate(lic.datahora_prazo) || parseConlicitacaoDate(lic.datahora_abertura),
            data_documento: parseConlicitacaoDate(lic.datahora_documento),
            data_retirada: parseConlicitacaoDate(lic.datahora_retirada),
            data_visita: parseConlicitacaoDate(lic.datahora_visita),
            data_prazo: parseConlicitacaoDate(lic.datahora_prazo),
            edital_url: getEditalUrl(lic.documento),
            processo: lic.processo || null,
            observacoes: lic.observacao || null,
            preco_edital: lic.preco_edital || null,
            valor_estimado: lic.valor_estimado || lic.preco_edital || null,
            boletim_id: boletimItem.id,
            filtro_id: filtroId,
            portal: 'ConLicitacao',
            relevancia: 'media',
          };

          if (existingLic) {
            await supabase
              .from('licitacoes')
              .update({ ...licitacaoData, updated_at: new Date().toISOString() })
              .eq('id', existingLic.id);
            totalAtualizadas++;
          } else {
            await supabase.from('licitacoes').insert(licitacaoData);
            totalNovas++;
          }
        }

        // Track last processed boletim
        if (boletimItem.id > lastBoletimId) {
          lastBoletimId = boletimItem.id;
        }

        // Log the sync
        await supabase.from('conlicitacao_logs').insert({
          cliente_id,
          boletim_id: boletimItem.id,
          filtro_id: filtroId,
          tipo: 'sync',
          licitacoes_recebidas: boletimData.licitacoes?.length || 0,
          licitacoes_novas: totalNovas,
          licitacoes_atualizadas: totalAtualizadas,
          acompanhamentos_recebidos: boletimData.acompanhamentos?.length || 0,
          sucesso: true,
        });
      }

      // Update config with last boletim
      if (lastBoletimId > ultimoBoletimId) {
        await supabase
          .from('conlicitacao_config')
          .update({
            ultimo_boletim_id: lastBoletimId,
            ultimo_sync: new Date().toISOString(),
          })
          .eq('id', configData.id);
      }

      return new Response(
        JSON.stringify({
          success: true,
          boletins_processados: newBoletins.length,
          licitacoes_novas: totalNovas,
          licitacoes_atualizadas: totalAtualizadas,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Ação inválida' }),
      { headers: jsonHeaders }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('ConLicitacao sync error:', errorMessage);

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: jsonHeaders }
    );
  }
});
