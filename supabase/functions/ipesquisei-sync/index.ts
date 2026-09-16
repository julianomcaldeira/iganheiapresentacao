import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const IPESQUISEI_BASE_URL = "https://eiksdfobghixofsxskke.supabase.co/functions/v1/public-api";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const IPESQUISEI_API_KEY = Deno.env.get("IPESQUISEI_API_KEY");
    if (!IPESQUISEI_API_KEY) {
      throw new Error("IPESQUISEI_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Determine if this is a manual or cron call
    const url = new URL(req.url);
    const clienteId = url.searchParams.get("cliente_id");
    const tipo = url.searchParams.get("tipo") || "manual";

    // If manual, require auth
    if (tipo === "manual") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
      if (claimsError || !claimsData?.claims) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Get clients to sync
    let clientesQuery = supabase.from("clientes").select("id, cnpj, nome, concorrentes").eq("ativo", true);
    if (clienteId) {
      clientesQuery = clientesQuery.eq("id", clienteId);
    }
    const { data: clientes, error: clientesError } = await clientesQuery;
    if (clientesError) throw clientesError;

    const results: any[] = [];

    for (const cliente of clientes || []) {
      const logData: any = {
        cliente_id: cliente.id,
        tipo,
        sucesso: false,
        total_licitacoes: 0,
        total_sancoes: 0,
      };

      try {
        // Collect all CNPJs to monitor (client + competitors)
        const cnpjs: { cnpj: string; tipo: string; nome: string }[] = [];
        
        if (cliente.cnpj) {
          cnpjs.push({ cnpj: cliente.cnpj.replace(/\D/g, ""), tipo: "cliente", nome: cliente.nome });
        }

        if (cliente.concorrentes && Array.isArray(cliente.concorrentes)) {
          for (const conc of cliente.concorrentes) {
            const cleanCnpj = conc.replace(/\D/g, "");
            if (cleanCnpj.length >= 11) {
              cnpjs.push({ cnpj: cleanCnpj, tipo: "concorrente", nome: conc });
            }
          }
        }

        // Also get empresas CNPJs
        const { data: empresas } = await supabase
          .from("empresas")
          .select("cnpj, razao_social")
          .eq("cliente_id", cliente.id)
          .eq("ativo", true);

        for (const emp of empresas || []) {
          if (emp.cnpj) {
            const cleanCnpj = emp.cnpj.replace(/\D/g, "");
            if (cleanCnpj.length >= 11 && !cnpjs.find(c => c.cnpj === cleanCnpj)) {
              cnpjs.push({ cnpj: cleanCnpj, tipo: "cliente", nome: emp.razao_social });
            }
          }
        }

        for (const item of cnpjs) {
          // Upsert the monitored entity
          const { data: dadoRecord } = await supabase
            .from("ipesquisei_dados")
            .upsert(
              { cliente_id: cliente.id, cnpj: item.cnpj, tipo_entidade: item.tipo, nome_entidade: item.nome },
              { onConflict: "cliente_id,cnpj" }
            )
            .select("id")
            .single();

          if (!dadoRecord) continue;

          // Fetch licitações from iPesquisei (search by CNPJ as winner)
          try {
            const licRes = await fetch(
              `${IPESQUISEI_BASE_URL}/empresas-vencedoras?search=${item.cnpj}&limit=100`,
              { headers: { "x-api-key": IPESQUISEI_API_KEY } }
            );
            if (licRes.ok) {
              const licData = await licRes.json();
              const records = licData.data || licData || [];
              if (Array.isArray(records)) {
                for (const lic of records) {
                  await supabase.from("ipesquisei_licitacoes").upsert(
                    {
                      ipesquisei_dado_id: dadoRecord.id,
                      ipesquisei_id: String(lic.id || lic.licitacao_id || ""),
                      numero: lic.numero || lic.numero_licitacao || "",
                      objeto: lic.objeto || lic.descricao || "",
                      orgao: lic.orgao || lic.nome_orgao || "",
                      modalidade: lic.modalidade || "",
                      uf: lic.uf || "",
                      cidade: lic.cidade || lic.municipio || "",
                      valor_estimado: lic.valor_estimado || null,
                      vencedor_cnpj: lic.cnpj_vencedor || lic.cnpj || item.cnpj,
                      vencedor_nome: lic.nome_vencedor || lic.razao_social || "",
                      valor_vencedor: lic.valor_vencedor || lic.valor || null,
                      ganhou: (lic.cnpj_vencedor || lic.cnpj || "").replace(/\D/g, "") === item.cnpj,
                      dados_completos: lic,
                    },
                    { onConflict: "id", ignoreDuplicates: true }
                  );
                  logData.total_licitacoes++;
                }
              }
            }
          } catch (e) {
            console.error(`Error fetching licitacoes for ${item.cnpj}:`, e);
          }

          // Also fetch general licitacoes where this CNPJ participated
          try {
            const licSearchRes = await fetch(
              `${IPESQUISEI_BASE_URL}/licitacoes?search=${item.cnpj}&com_vencedor=true&limit=100`,
              { headers: { "x-api-key": IPESQUISEI_API_KEY } }
            );
            if (licSearchRes.ok) {
              const licSearchData = await licSearchRes.json();
              const records = licSearchData.data || licSearchData || [];
              if (Array.isArray(records)) {
                for (const lic of records) {
                  await supabase.from("ipesquisei_licitacoes").upsert(
                    {
                      ipesquisei_dado_id: dadoRecord.id,
                      ipesquisei_id: String(lic.id || ""),
                      numero: lic.numero || "",
                      objeto: lic.objeto || "",
                      orgao: lic.orgao || "",
                      modalidade: lic.modalidade || "",
                      uf: lic.uf || "",
                      cidade: lic.cidade || "",
                      valor_estimado: lic.valor_estimado || null,
                      data_abertura: lic.data_abertura || null,
                      vencedor_cnpj: lic.vencedor_cnpj || "",
                      vencedor_nome: lic.vencedor_nome || "",
                      valor_vencedor: lic.valor_vencedor || null,
                      ganhou: (lic.vencedor_cnpj || "").replace(/\D/g, "") === item.cnpj,
                      dados_completos: lic,
                    },
                    { onConflict: "id", ignoreDuplicates: true }
                  );
                  logData.total_licitacoes++;
                }
              }
            }
          } catch (e) {
            console.error(`Error fetching licitacoes search for ${item.cnpj}:`, e);
          }

          // Fetch sanctions
          try {
            const sancRes = await fetch(
              `${IPESQUISEI_BASE_URL}/check-sancionada/${item.cnpj}`,
              { headers: { "x-api-key": IPESQUISEI_API_KEY } }
            );
            if (sancRes.ok) {
              const sancData = await sancRes.json();
              // Also fetch detailed sanctions
              const sancDetailRes = await fetch(
                `${IPESQUISEI_BASE_URL}/sancionadas?search=${item.cnpj}&limit=50`,
                { headers: { "x-api-key": IPESQUISEI_API_KEY } }
              );
              if (sancDetailRes.ok) {
                const sancDetailData = await sancDetailRes.json();
                const records = sancDetailData.data || sancDetailData || [];
                if (Array.isArray(records)) {
                  for (const sanc of records) {
                    await supabase.from("ipesquisei_sancoes").insert({
                      ipesquisei_dado_id: dadoRecord.id,
                      tipo_cadastro: sanc.tipo_cadastro || sanc.cadastro || "",
                      orgao_sancionador: sanc.orgao_sancionador || sanc.orgao || "",
                      tipo_sancao: sanc.tipo_sancao || sanc.sancao || "",
                      fundamentacao: sanc.fundamentacao || "",
                      data_inicio: sanc.data_inicio || sanc.data_inicio_sancao || null,
                      data_fim: sanc.data_fim || sanc.data_final_sancao || null,
                      vigente: sanc.vigente ?? true,
                      dados_completos: sanc,
                    });
                    logData.total_sancoes++;
                  }
                }
              }
            }
          } catch (e) {
            console.error(`Error fetching sanctions for ${item.cnpj}:`, e);
          }
        }

        logData.sucesso = true;
      } catch (err: any) {
        logData.erro = err.message || String(err);
      }

      await supabase.from("ipesquisei_sync_logs").insert(logData);
      results.push({ cliente_id: cliente.id, ...logData });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("iPesquisei sync error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
