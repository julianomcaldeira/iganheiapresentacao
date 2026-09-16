import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const IDOCUMENTEI_BASE_URL = "https://api.idocumentei.com.br/api";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const idocumenteiApiKey = Deno.env.get("IDOCUMENTEI_API_KEY");

    if (!idocumenteiApiKey) {
      return new Response(JSON.stringify({ error: "IDOCUMENTEI_API_KEY não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Usuário não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, empresa_id, idocumentei_id } = await req.json();

    const headers = {
      Authorization: `Bearer ${idocumenteiApiKey}`,
      "Content-Type": "application/json",
    };

    // Action: list companies from i-Documentei
    if (action === "listar_empresas") {
      const response = await fetch(`${IDOCUMENTEI_BASE_URL}/empresas`, { headers });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`i-Documentei API error [${response.status}]: ${errText}`);
      }
      const data = await response.json();
      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: list documents for a company
    if (action === "listar_documentos") {
      if (!idocumentei_id) {
        return new Response(JSON.stringify({ error: "idocumentei_id é obrigatório" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const response = await fetch(`${IDOCUMENTEI_BASE_URL}/empresas/${idocumentei_id}/documentos`, { headers });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`i-Documentei API error [${response.status}]: ${errText}`);
      }
      const documentos = await response.json();

      // Save documents to our database
      if (empresa_id && Array.isArray(documentos)) {
        for (const doc of documentos) {
          await supabase.from("idocumentei_documentos").upsert(
            {
              empresa_id,
              idocumentei_empresa_id: idocumentei_id,
              tipo: doc.tipo || doc.type || "CND",
              nome: doc.nome || doc.name || doc.descricao || "Documento",
              status: doc.status || "pendente",
              data_emissao: doc.data_emissao || doc.emissao || null,
              data_validade: doc.data_validade || doc.validade || null,
              arquivo_url: doc.arquivo_url || doc.url || null,
              dados_raw: doc,
            },
            { onConflict: "id" }
          );
        }

        // Update last sync
        await supabase
          .from("idocumentei_empresas")
          .update({ ultimo_processamento: new Date().toISOString(), status_sync: "sincronizado" })
          .eq("empresa_id", empresa_id);
      }

      return new Response(JSON.stringify({ success: true, data: documentos }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: trigger document processing
    if (action === "processar") {
      if (!idocumentei_id) {
        return new Response(JSON.stringify({ error: "idocumentei_id é obrigatório" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const response = await fetch(`${IDOCUMENTEI_BASE_URL}/empresas/${idocumentei_id}/processar`, {
        method: "POST",
        headers,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`i-Documentei API error [${response.status}]: ${errText}`);
      }

      const result = await response.json();

      if (empresa_id) {
        await supabase
          .from("idocumentei_empresas")
          .update({ status_sync: "processando", ultimo_processamento: new Date().toISOString() })
          .eq("empresa_id", empresa_id);
      }

      return new Response(JSON.stringify({ success: true, data: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: sync - map i-Documentei companies with local empresas
    if (action === "sincronizar_empresas") {
      const { cliente_id } = await req.json().catch(() => ({}));

      // List i-Documentei companies
      const response = await fetch(`${IDOCUMENTEI_BASE_URL}/empresas`, { headers });
      if (!response.ok) {
        throw new Error(`i-Documentei API error [${response.status}]`);
      }
      const idocEmpresas = await response.json();

      return new Response(JSON.stringify({ success: true, data: idocEmpresas }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: `Ação desconhecida: ${action}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("idocumentei-sync error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
