import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_KEYWORDS = [
  "acidente trabalho industrial",
  "multa ambiental empresa",
  "recuperação judicial empresa",
  "nova fábrica inauguração",
  "interdição empresa brasil",
];

async function resolveGoogleNewsUrl(googleUrl: string): Promise<string> {
  try {
    // Follow the redirect chain to get the actual article URL
    const resp = await fetch(googleUrl, {
      method: "HEAD",
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; IGanheiBot/1.0)",
      },
    });
    const finalUrl = resp.url;
    // If we got a non-Google URL, use it
    if (finalUrl && !finalUrl.includes("news.google.com") && !finalUrl.includes("consent.google.com")) {
      return finalUrl;
    }

    // Fallback: try GET with manual redirect follow
    const resp2 = await fetch(googleUrl, {
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    const finalUrl2 = resp2.url;
    if (finalUrl2 && !finalUrl2.includes("news.google.com") && !finalUrl2.includes("consent.google.com")) {
      return finalUrl2;
    }

    // Last resort: try to extract from the HTML body
    const html = await resp2.text();
    const match = html.match(/data-redirect-url="([^"]+)"/);
    if (match) return decodeHtmlEntities(match[1]);

    const jsMatch = html.match(/window\.location\.replace\("([^"]+)"\)/);
    if (jsMatch) return decodeHtmlEntities(jsMatch[1]);

    return googleUrl;
  } catch {
    return googleUrl;
  }
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/<[^>]*>/g, "");
}

function parseRssItems(xml: string): Array<{ title: string; link: string; description: string; pubDate: string; source: string }> {
  const items: Array<{ title: string; link: string; description: string; pubDate: string; source: string }> = [];
  const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];

  for (const itemXml of itemMatches) {
    const title = decodeHtmlEntities((itemXml.match(/<title>([\s\S]*?)<\/title>/)?.[1] || "").trim());
    const link = (itemXml.match(/<link>([\s\S]*?)<\/link>/)?.[1] || "").trim();
    const description = decodeHtmlEntities((itemXml.match(/<description>([\s\S]*?)<\/description>/)?.[1] || "").trim());
    const pubDate = (itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || "").trim();
    const source = decodeHtmlEntities((itemXml.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] || "").trim());

    if (title) {
      items.push({ title, link, description, pubDate, source });
    }
  }
  return items;
}

async function fetchNewsForQuery(query: string): Promise<Array<{ title: string; link: string; description: string; pubDate: string; source: string }>> {
  const encoded = encodeURIComponent(query);
  const url = `https://news.google.com/rss/search?q=${encoded}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;

  try {
    const resp = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; IGanheiBot/1.0)",
        Accept: "application/rss+xml",
      },
    });
    if (!resp.ok) return [];
    const xml = await resp.text();
    return parseRssItems(xml);
  } catch {
    return [];
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const supabaseAuth = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getUser();
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const targetEmpresaId = body.empresa_id || null;

    // Fetch configs
    let configQuery = supabase.from("empresa_news_config").select("*, empresa:empresas(id, razao_social, nome_fantasia, cnpj, cidade, estado, cliente_id)").eq("ativo", true);
    if (targetEmpresaId) configQuery = configQuery.eq("empresa_id", targetEmpresaId);

    const { data: configs, error: configErr } = await configQuery;
    if (configErr) throw configErr;
    if (!configs || configs.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhuma config ativa encontrada" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const results: any[] = [];

    for (const config of configs) {
      try {
        const keywords = config.palavras_chave?.length > 0 ? config.palavras_chave : DEFAULT_KEYWORDS;
        const ufs = config.ufs_monitoradas?.length > 0 ? config.ufs_monitoradas : [""];

        // Build queries: keywords × ufs (max 10)
        const queries: string[] = [];
        for (const kw of keywords) {
          for (const uf of ufs) {
            queries.push(uf ? `${kw} ${uf}` : kw);
            if (queries.length >= 10) break;
          }
          if (queries.length >= 10) break;
        }

        // Fetch in batches of 2
        let allArticles: Array<{ title: string; link: string; description: string; pubDate: string; source: string }> = [];
        for (let i = 0; i < queries.length; i += 2) {
          const batch = queries.slice(i, i + 2);
          const batchResults = await Promise.all(batch.map(fetchNewsForQuery));
          allArticles.push(...batchResults.flat());
          if (i + 2 < queries.length) await delay(1500);
        }

        // Dedup level 1: same title (first 80 chars)
        const seen = new Set<string>();
        allArticles = allArticles.filter((a) => {
          const key = a.title.toLowerCase().slice(0, 80);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        // Dedup level 2+3: check DB for existing URLs and titles (last 7 days)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data: existingEvents } = await supabase
          .from("empresa_news_events")
          .select("url, titulo_noticia")
          .eq("empresa_id", config.empresa_id)
          .gte("created_at", sevenDaysAgo);

        const existingUrls = new Set((existingEvents || []).map((e: any) => e.url).filter(Boolean));
        const existingTitles = new Set((existingEvents || []).map((e: any) => e.titulo_noticia?.toLowerCase().slice(0, 80)).filter(Boolean));

        allArticles = allArticles.filter((a) => {
          if (a.link && existingUrls.has(a.link)) return false;
          if (existingTitles.has(a.title.toLowerCase().slice(0, 80))) return false;
          return true;
        });

        if (allArticles.length === 0) {
          results.push({ empresa_id: config.empresa_id, new_events: 0 });
          continue;
        }

        // Classify with AI (max 20 articles per call)
        const articlesToClassify = allArticles.slice(0, 20);
        let classifiedResults: any[] = [];

        try {
          const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${lovableKey}` },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                {
                  role: "system",
                  content: `Você é um analista de inteligência empresarial brasileiro. Classifique cada notícia abaixo quanto a:
- tipo_evento: trabalhista | operacional | regulatorio | financeiro | oportunidade | outro
- relevancia: 0-100 (quanto maior, mais relevante para monitoramento empresarial)
- resumo: resumo em uma frase
- empresas: lista de empresas mencionadas com nome, cidade e uf

Palavras-chave de interesse: ${keywords.join(", ")}
Regiões de interesse: ${ufs.join(", ") || "Brasil todo"}`,
                },
                {
                  role: "user",
                  content: `Classifique estas notícias:\n${articlesToClassify.map((a, i) => `[${i}] ${a.title}\n${a.description}`).join("\n\n")}`,
                },
              ],
              tools: [
                {
                  type: "function",
                  function: {
                    name: "classify_news",
                    description: "Classificar notícias coletadas",
                    parameters: {
                      type: "object",
                      properties: {
                        results: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              article_index: { type: "number" },
                              empresas: {
                                type: "array",
                                items: {
                                  type: "object",
                                  properties: { nome: { type: "string" }, cidade: { type: "string" }, uf: { type: "string" } },
                                },
                              },
                              tipo_evento: { type: "string", enum: ["trabalhista", "operacional", "regulatorio", "financeiro", "oportunidade", "outro"] },
                              relevancia: { type: "number" },
                              resumo: { type: "string" },
                            },
                            required: ["article_index", "tipo_evento", "relevancia", "resumo"],
                          },
                        },
                      },
                      required: ["results"],
                    },
                  },
                },
              ],
              tool_choice: { type: "function", function: { name: "classify_news" } },
            }),
          });

          if (aiResp.ok) {
            const aiData = await aiResp.json();
            const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
            if (toolCall?.function?.arguments) {
              const parsed = JSON.parse(toolCall.function.arguments);
              classifiedResults = parsed.results || [];
            }
          }
        } catch (e) {
          console.error("AI classification failed:", e);
        }

        // Resolve Google News URLs to actual article URLs (batch of 5)
        for (let i = 0; i < articlesToClassify.length; i += 5) {
          const batch = articlesToClassify.slice(i, i + 5);
          const resolved = await Promise.all(
            batch.map(async (a) => {
              if (a.link && a.link.includes("news.google.com")) {
                (a as any).resolvedUrl = await resolveGoogleNewsUrl(a.link);
              } else {
                (a as any).resolvedUrl = a.link;
              }
            })
          );
          if (i + 5 < articlesToClassify.length) await delay(500);
        }

        // Insert events
        const eventsToInsert: any[] = [];
        for (let i = 0; i < articlesToClassify.length; i++) {
          const article = articlesToClassify[i];
          const classification = classifiedResults.find((r: any) => r.article_index === i);

          // Keyword matching for score
          const titleLower = article.title.toLowerCase();
          const descLower = article.description.toLowerCase();
          const matchedKeywords = keywords.filter((kw) => titleLower.includes(kw.toLowerCase()) || descLower.includes(kw.toLowerCase()));

          let pubDate: string | null = null;
          try {
            pubDate = article.pubDate ? new Date(article.pubDate).toISOString() : null;
          } catch {}

          // Calculate score
          let score = 0;
          if (classification) {
            const aiRelevancia = classification.relevancia || 0;
            const kwBonus = matchedKeywords.length * 10;
            let recencyBonus = 0;
            if (pubDate) {
              const daysDiff = (Date.now() - new Date(pubDate).getTime()) / (1000 * 60 * 60 * 24);
              if (daysDiff <= 3) recencyBonus = 15;
              else if (daysDiff <= 7) recencyBonus = 10;
            }
            score = Math.min(100, Math.round(aiRelevancia * 0.6 + kwBonus + recencyBonus));
          } else {
            // Fallback
            score = Math.min(100, matchedKeywords.length * 20);
          }

          // Match with CNPJ database
          let cnpj: string | null = null;
          let razaoSocial: string | null = null;
          let cidadeMatch: string | null = null;
          let ufMatch: string | null = null;
          let cnaeMatch: string | null = null;

          if (classification?.empresas?.length > 0) {
            const firstEmp = classification.empresas[0];
            if (firstEmp.nome) {
              const { data: matchedEmpresas } = await supabase
                .from("empresas")
                .select("cnpj, razao_social, cidade, estado")
                .or(`razao_social.ilike.%${firstEmp.nome}%,nome_fantasia.ilike.%${firstEmp.nome}%`)
                .limit(2);

              if (matchedEmpresas && matchedEmpresas.length > 0) {
                cnpj = matchedEmpresas[0].cnpj;
                razaoSocial = matchedEmpresas[0].razao_social;
                cidadeMatch = matchedEmpresas[0].cidade;
                ufMatch = matchedEmpresas[0].estado;
              } else {
                cidadeMatch = firstEmp.cidade;
                ufMatch = firstEmp.uf;
              }
            }
          }

          eventsToInsert.push({
            empresa_id: config.empresa_id,
            cnpj,
            razao_social: razaoSocial,
            tipo_evento: classification?.tipo_evento || "outro",
            titulo_noticia: article.title.slice(0, 500),
            descricao_noticia: classification?.resumo || article.description?.slice(0, 1000) || null,
            fonte: article.source || null,
            url: article.resolvedUrl || article.link || null,
            data_publicacao: pubDate,
            score_relevancia: score,
            cidade: cidadeMatch,
            uf: ufMatch,
            cnae: cnaeMatch,
            palavras_chave_encontradas: matchedKeywords.length > 0 ? matchedKeywords : null,
            entidades_extraidas: classification?.empresas ? { empresas: classification.empresas, cnpj_match: !!cnpj } : null,
          });
        }

        if (eventsToInsert.length > 0) {
          const { error: insertErr } = await supabase.from("empresa_news_events").insert(eventsToInsert);
          if (insertErr) console.error("Insert error:", insertErr);
        }

        results.push({ empresa_id: config.empresa_id, new_events: eventsToInsert.length });

        // Delay between companies
        if (configs.indexOf(config) < configs.length - 1) await delay(2000);
      } catch (e) {
        console.error(`Error processing empresa ${config.empresa_id}:`, e);
        results.push({ empresa_id: config.empresa_id, error: String(e) });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
