import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-auth-token, x-webhook-secret',
};

/*
================================================================================
  PROXY COM IP FIXO - DOCUMENTAÇÃO DE INTEGRAÇÃO
================================================================================

Este webhook recebe dados de licitações de um servidor proxy externo (com IP fixo)
que consulta a API do ConLicitacao.

** URL do Webhook **
POST https://xufjhduntcdmejrjwoqj.supabase.co/functions/v1/conlicitacao-webhook

** Autenticação **
Header obrigatório:
  x-webhook-secret: <TOKEN_DO_CLIENTE>

O token deve ser o mesmo cadastrado em conlicitacao_config.token para o cliente.

** Payload esperado **
Formato 1 - Boletim completo (padrão ConLicitacao):
{
  "boletim": {
    "id": 12345,
    "datahora_fechamento": "2024-01-15 18:00:00",
    "cliente": {
      "id": 1,
      "razao_social": "Empresa XYZ",
      "filtro": { "id": 100, "descricao": "TI" }
    },
    "quantidade_licitacoes": 5,
    "quantidade_acompanhamentos": 2
  },
  "licitacoes": [...],
  "acompanhamentos": [...]
}

Formato 2 - Simplificado (mais fácil para proxy):
{
  "cliente_id": "uuid-do-cliente",  // OU "filtro_id": 100
  "licitacoes": [
    {
      "id": 12345,
      "orgao": { "nome": "Prefeitura X", "cidade": "São Paulo", "uf": "SP" },
      "objeto": "Contratação de serviços de TI",
      "situacao": "Nova",
      "datahora_abertura": "2024-01-20 10:00:00",
      "edital": "PE-001/2024",
      "documento": [{ "filename": "edital.pdf", "url": "/docs/12345.pdf" }]
    }
  ]
}

** Resposta de sucesso **
{
  "success": true,
  "licitacoes_recebidas": 5,
  "licitacoes_novas": 3,
  "licitacoes_atualizadas": 2
}

** Exemplo de chamada (curl) **
curl -X POST https://xufjhduntcdmejrjwoqj.supabase.co/functions/v1/conlicitacao-webhook \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: SEU_TOKEN_CONLICITACAO" \
  -d '{"cliente_id":"...","licitacoes":[...]}'

================================================================================
*/

// Types based on ConLicitacao API documentation
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

interface BoletimResponse {
  boletim?: Boletim;
  licitacoes: LicitacaoConlicitacao[];
  acompanhamentos?: AcompanhamentoConlicitacao[];
  // Campos para formato simplificado
  cliente_id?: string;
  filtro_id?: number;
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

// Parse date from ConLicitacao format (Y-m-d H:i:s)
function parseConlicitacaoDate(dateStr?: string): string | null {
  if (!dateStr || dateStr.trim() === '') return null;
  
  try {
    // Handle format: "2020-11-26 08:30:00" or "2020-11-26 08:30:00 -03:00"
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
  // Construct full URL if relative
  return `https://consultaonline.conlicitacao.com.br${doc.url}`;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json() as BoletimResponse;
    
    // Autenticação via header ou token no body (opcional mas recomendado)
    const webhookSecret = req.headers.get('x-webhook-secret')?.trim();
    
    console.log('=== ConLicitacao Webhook Received ===');
    console.log('Has webhook secret:', !!webhookSecret);
    console.log('Boletim ID:', body.boletim?.id);
    console.log('Cliente ID (simplificado):', body.cliente_id);
    console.log('Filtro ID (simplificado):', body.filtro_id);
    console.log('Licitações:', body.licitacoes?.length || 0);

    // Determinar cliente_id e filtro_id (suporta formato completo e simplificado)
    let clienteId: string | null = null;
    let filtroId: number | null = null;
    let boletimId: number | null = null;

    // Formato simplificado: cliente_id ou filtro_id direto no body
    if (body.cliente_id) {
      clienteId = body.cliente_id;
    }
    if (body.filtro_id) {
      filtroId = body.filtro_id;
    }

    // Formato completo: extrair do boletim
    if (body.boletim) {
      boletimId = body.boletim.id;
      if (!filtroId && body.boletim.cliente?.filtro?.id) {
        filtroId = body.boletim.cliente.filtro.id;
      }
    }

    // Buscar configuração do cliente
    let configData: any = null;

    // Prioridade 1: cliente_id direto
    if (clienteId) {
      const { data } = await supabase
        .from('conlicitacao_config')
        .select('*, clientes(*)')
        .eq('cliente_id', clienteId)
        .eq('ativo', true)
        .single();
      configData = data;
    }
    
    // Prioridade 2: filtro_id
    if (!configData && filtroId) {
      const { data } = await supabase
        .from('conlicitacao_config')
        .select('*, clientes(*)')
        .eq('filtro_id', filtroId)
        .eq('ativo', true)
        .single();
      configData = data;
    }

    // Prioridade 3: webhook_secret (token)
    if (!configData && webhookSecret) {
      const { data } = await supabase
        .from('conlicitacao_config')
        .select('*, clientes(*)')
        .eq('token', webhookSecret)
        .eq('ativo', true)
        .single();
      configData = data;
    }

    if (!configData) {
      console.log('No active config found');
      
      // Log the webhook anyway
      await supabase.from('conlicitacao_logs').insert({
        boletim_id: boletimId,
        filtro_id: filtroId,
        tipo: 'webhook',
        licitacoes_recebidas: body.licitacoes?.length || 0,
        acompanhamentos_recebidos: body.acompanhamentos?.length || 0,
        sucesso: false,
        erro: `Nenhuma configuração ativa encontrada. cliente_id: ${clienteId}, filtro_id: ${filtroId}`,
        dados_brutos: body as unknown as Record<string, unknown>,
      });

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `No active configuration found. Provide cliente_id, filtro_id, or x-webhook-secret header.` 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Usar cliente_id da config
    clienteId = configData.cliente_id;
    if (!filtroId) filtroId = configData.filtro_id;
    
    // Get default workflow for the client
    const { data: workflowData } = await supabase
      .from('licitacao_workflows')
      .select('id')
      .eq('cliente_id', clienteId)
      .eq('ativo', true)
      .limit(1)
      .single();

    const workflowId = workflowData?.id;

    if (!workflowId) {
      console.warn('No active workflow found for client:', clienteId);
    }

    let licitacoesNovas = 0;
    let licitacoesAtualizadas = 0;

    // Campos relevantes para detectar mudanças (label amigável)
    const TRACKED_FIELDS: Record<string, string> = {
      situacao_conlicitacao: 'Situação',
      objeto: 'Objeto',
      orgao: 'Órgão',
      data_abertura: 'Data de abertura',
      data_encerramento: 'Data de encerramento',
      data_prazo: 'Prazo',
      data_documento: 'Entrega de documentação',
      data_visita: 'Visita técnica',
      edital_url: 'URL do edital',
      processo: 'Processo',
      preco_edital: 'Preço do edital',
      valor_estimado: 'Valor estimado',
      observacoes: 'Observações',
      cidade_orgao: 'Cidade',
      uf_orgao: 'UF',
    };

    function diffLicitacao(prev: Record<string, any>, next: Record<string, any>) {
      const changes: Array<{ campo: string; label: string; de: any; para: any }> = [];
      for (const [key, label] of Object.entries(TRACKED_FIELDS)) {
        const a = prev?.[key] ?? null;
        const b = next?.[key] ?? null;
        const aS = a == null ? '' : String(a);
        const bS = b == null ? '' : String(b);
        if (aS !== bS) changes.push({ campo: key, label, de: a, para: b });
      }
      return changes;
    }

    // Process each licitação
    for (const lic of body.licitacoes || []) {
      console.log('Processing licitação:', lic.id, lic.edital);

      // Check if licitação already exists (regra de ouro: mesmo conlicitacao_id = atualização)
      const { data: existingLic } = await supabase
        .from('licitacoes')
        .select('*')
        .eq('conlicitacao_id', lic.id)
        .eq('cliente_id', clienteId)
        .maybeSingle();

      const licitacaoData = {
        cliente_id: clienteId,
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
        boletim_id: boletimId,
        filtro_id: filtroId,
        portal: 'ConLicitacao',
        relevancia: 'media',
      };

      if (existingLic) {
        // ATUALIZAÇÃO — calcula diff, gera nova versão, atualiza registro
        const mudancas = diffLicitacao(existingLic, licitacaoData);
        const novaVersao = (existingLic.versao_atual || 1) + 1;

        // 1. Snapshot da versão ANTERIOR (apenas se ainda não existir versão 1)
        const { data: hasV1 } = await supabase
          .from('licitacao_versoes')
          .select('id')
          .eq('licitacao_id', existingLic.id)
          .eq('versao', 1)
          .maybeSingle();
        if (!hasV1) {
          await supabase.from('licitacao_versoes').insert({
            licitacao_id: existingLic.id,
            versao: 1,
            conlicitacao_id: existingLic.conlicitacao_id,
            boletim_id: existingLic.boletim_id,
            situacao_conlicitacao: existingLic.situacao_conlicitacao,
            snapshot: existingLic,
            campos_alterados: [],
            total_mudancas: 0,
          });
        }

        // 2. Snapshot da NOVA versão (com diff)
        if (mudancas.length > 0) {
          await supabase.from('licitacao_versoes').insert({
            licitacao_id: existingLic.id,
            versao: novaVersao,
            conlicitacao_id: lic.id,
            boletim_id: boletimId,
            situacao_conlicitacao: lic.situacao || null,
            snapshot: licitacaoData,
            campos_alterados: mudancas,
            total_mudancas: mudancas.length,
          });
        }

        // 3. Atualiza registro principal
        const { error: updateError } = await supabase
          .from('licitacoes')
          .update({
            ...licitacaoData,
            versao_atual: mudancas.length > 0 ? novaVersao : existingLic.versao_atual,
            ultima_atualizacao_conlicitacao: mudancas.length > 0 ? new Date().toISOString() : existingLic.ultima_atualizacao_conlicitacao,
            ultimas_mudancas: mudancas.length > 0 ? mudancas : existingLic.ultimas_mudancas,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingLic.id);

        if (updateError) {
          console.error('Error updating licitação:', updateError);
        } else {
          licitacoesAtualizadas++;
          console.log(`Updated licitação ${existingLic.id} — ${mudancas.length} mudança(s)`);
        }
      } else {
        // INSERÇÃO NOVA
        const { data: inserted, error: insertError } = await supabase
          .from('licitacoes')
          .insert({ ...licitacaoData, versao_atual: 1 })
          .select('id')
          .single();

        if (insertError) {
          console.error('Error inserting licitação:', insertError);
        } else {
          // Snapshot v1
          if (inserted) {
            await supabase.from('licitacao_versoes').insert({
              licitacao_id: inserted.id,
              versao: 1,
              conlicitacao_id: lic.id,
              boletim_id: boletimId,
              situacao_conlicitacao: lic.situacao || null,
              snapshot: licitacaoData,
              campos_alterados: [],
              total_mudancas: 0,
            });
          }
          licitacoesNovas++;
          console.log('Inserted new licitação for conlicitacao_id:', lic.id);
        }
      }
    }

    // Update config with last boletim info
    await supabase
      .from('conlicitacao_config')
      .update({
        ultimo_boletim_id: boletimId,
        ultimo_sync: new Date().toISOString(),
      })
      .eq('id', configData.id);

    // Log the successful webhook
    await supabase.from('conlicitacao_logs').insert({
      cliente_id: clienteId,
      boletim_id: boletimId,
      filtro_id: filtroId,
      tipo: 'webhook',
      licitacoes_recebidas: body.licitacoes?.length || 0,
      licitacoes_novas: licitacoesNovas,
      licitacoes_atualizadas: licitacoesAtualizadas,
      acompanhamentos_recebidos: body.acompanhamentos?.length || 0,
      sucesso: true,
      dados_brutos: body as unknown as Record<string, unknown>,
    });

    console.log('=== Webhook Processed Successfully ===');
    console.log('Novas:', licitacoesNovas, 'Atualizadas:', licitacoesAtualizadas);

    return new Response(
      JSON.stringify({
        success: true,
        boletim_id: boletimId,
        licitacoes_recebidas: body.licitacoes?.length || 0,
        licitacoes_novas: licitacoesNovas,
        licitacoes_atualizadas: licitacoesAtualizadas,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('ConLicitacao webhook error:', errorMessage);

    // Try to log the error
    try {
      await supabase.from('conlicitacao_logs').insert({
        tipo: 'webhook',
        sucesso: false,
        erro: errorMessage,
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
