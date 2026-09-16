import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function getBRTDate(): Date {
  const now = new Date();
  const brtOffset = -3 * 60;
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcTime + brtOffset * 60000);
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("pt-BR");
}

const eventIcons: Record<string, string> = {
  trabalhista: "⚠️",
  operacional: "🏭",
  regulatorio: "📋",
  financeiro: "💰",
  oportunidade: "🚀",
  outro: "📰",
};

const eventColors: Record<string, string> = {
  trabalhista: "#ef4444",
  operacional: "#f59e0b",
  regulatorio: "#3b82f6",
  financeiro: "#8b5cf6",
  oportunidade: "#10b981",
  outro: "#6b7280",
};

function buildEmailHtml(
  empresaNome: string,
  logoUrl: string | null,
  periodoInicio: string,
  periodoFim: string,
  events: any[]
): string {
  // Group by tipo_evento
  const grouped: Record<string, any[]> = {};
  for (const ev of events) {
    const tipo = ev.tipo_evento || "outro";
    if (!grouped[tipo]) grouped[tipo] = [];
    grouped[tipo].push(ev);
  }

  let sectionsHtml = "";
  for (const [tipo, items] of Object.entries(grouped)) {
    const icon = eventIcons[tipo] || "📰";
    const color = eventColors[tipo] || "#6b7280";
    const label = tipo.charAt(0).toUpperCase() + tipo.slice(1);

    let rowsHtml = "";
    for (const item of items) {
      const titleLink = item.url
        ? `<a href="${item.url}" target="_blank" style="color:#1d4ed8;text-decoration:none;font-weight:600;">${item.titulo_noticia}</a>`
        : item.titulo_noticia;
      rowsHtml += `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${titleLink}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${item.fonte || "-"}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-weight:bold;color:${item.score_relevancia >= 70 ? "#059669" : item.score_relevancia >= 40 ? "#d97706" : "#6b7280"}">${item.score_relevancia}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${item.razao_social || item.cidade || "-"}</td>
        </tr>`;
    }

    sectionsHtml += `
      <div style="margin-bottom:24px;">
        <h3 style="color:${color};margin-bottom:8px;">${icon} ${label} (${items.length})</h3>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <thead>
            <tr style="background:#f3f4f6;">
              <th style="padding:8px 12px;text-align:left;">Notícia</th>
              <th style="padding:8px 12px;text-align:center;">Fonte</th>
              <th style="padding:8px 12px;text-align:center;">Score</th>
              <th style="padding:8px 12px;text-align:left;">Empresa</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>`;
  }

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:700px;margin:0 auto;background:white;border-radius:8px;overflow:hidden;margin-top:20px;margin-bottom:20px;">
    <div style="background:linear-gradient(135deg,#059669,#0d9488);padding:24px 32px;color:white;">
      ${logoUrl ? `<img src="${logoUrl}" alt="" style="height:40px;margin-bottom:12px;" />` : ""}
      <h1 style="margin:0;font-size:22px;">📡 Radar de Inteligência</h1>
      <p style="margin:4px 0 0;opacity:0.9;font-size:14px;">${empresaNome} — ${periodoInicio} a ${periodoFim}</p>
    </div>
    <div style="padding:24px 32px;">
      <p style="color:#374151;margin-bottom:20px;">Encontramos <strong>${events.length}</strong> notícias relevantes no período.</p>
      ${sectionsHtml}
    </div>
    <div style="padding:16px 32px;background:#f9fafb;text-align:center;font-size:12px;color:#9ca3af;">
      Radar GI — Sistema de Inteligência i-Ganhei
    </div>
  </div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const brt = getBRTDate();
    const currentHH = String(brt.getHours()).padStart(2, "0");
    const currentMM = String(brt.getMinutes()).padStart(2, "0");
    const currentTime = `${currentHH}:${currentMM}`;

    // Fetch active schedules matching current time
    const { data: agendamentos, error: agErr } = await supabase
      .from("newsletter_agendamentos")
      .select("*, empresa:empresas(id, razao_social, nome_fantasia, logo_url:clientes(logo_url), cliente_id)")
      .eq("ativo", true);

    if (agErr) throw agErr;

    const matchingSchedules = (agendamentos || []).filter((a: any) => {
      const schedTime = a.horario_envio?.slice(0, 5);
      return schedTime === currentTime;
    });

    if (matchingSchedules.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhum agendamento para este horário", time: currentTime }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const todayBrt = `${brt.getFullYear()}-${String(brt.getMonth() + 1).padStart(2, "0")}-${String(brt.getDate()).padStart(2, "0")}`;

    const sendResults: any[] = [];

    for (const schedule of matchingSchedules) {
      try {
        // Check if already sent today
        if (schedule.ultimo_envio_em) {
          const lastSendBrt = new Date(schedule.ultimo_envio_em);
          const lastSendDate = `${lastSendBrt.getFullYear()}-${String(lastSendBrt.getMonth() + 1).padStart(2, "0")}-${String(lastSendBrt.getDate()).padStart(2, "0")}`;
          if (lastSendDate === todayBrt) {
            sendResults.push({ empresa_id: schedule.empresa_id, skipped: "already_sent_today" });
            continue;
          }
        }

        // Determine period
        const yesterday = new Date(brt);
        yesterday.setDate(yesterday.getDate() - 1);
        let periodoInicio: Date;

        if (!schedule.ultimo_envio_em) {
          // First send: last 5 days
          periodoInicio = new Date(brt);
          periodoInicio.setDate(periodoInicio.getDate() - 5);
        } else {
          periodoInicio = yesterday;
        }

        const startDate = `${periodoInicio.getFullYear()}-${String(periodoInicio.getMonth() + 1).padStart(2, "0")}-${String(periodoInicio.getDate()).padStart(2, "0")}`;
        const endDate = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;

        // Fetch events
        const { data: events } = await supabase
          .from("empresa_news_events")
          .select("*")
          .eq("empresa_id", schedule.empresa_id)
          .gte("created_at", `${startDate}T00:00:00`)
          .lte("created_at", `${endDate}T23:59:59`)
          .order("score_relevancia", { ascending: false });

        if (!events || events.length === 0) {
          sendResults.push({ empresa_id: schedule.empresa_id, skipped: "no_events" });
          continue;
        }

        // Get recipients (all active profiles for this empresa's client)
        const empresa = schedule.empresa as any;
        const clienteId = empresa?.cliente_id;
        if (!clienteId) continue;

        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, nome, email:id")
          .eq("cliente_id", clienteId);

        // Get actual emails from auth
        const recipientEmails: string[] = [];
        for (const p of profiles || []) {
          const { data: userData } = await supabase.auth.admin.getUserById(p.id);
          if (userData?.user?.email) {
            recipientEmails.push(userData.user.email);
          }
        }

        if (recipientEmails.length === 0) {
          sendResults.push({ empresa_id: schedule.empresa_id, skipped: "no_recipients" });
          continue;
        }

        const empresaNome = empresa?.nome_fantasia || empresa?.razao_social || "Empresa";
        const logoUrl = null; // Could be fetched from client
        const emailHtml = buildEmailHtml(empresaNome, logoUrl, formatDate(periodoInicio), formatDate(yesterday), events);

        // Create envio record
        const { data: envioRecord } = await supabase.from("newsletter_envios").insert({
          empresa_id: schedule.empresa_id,
          total_destinatarios: recipientEmails.length,
          total_noticias: events.length,
          periodo_inicio: startDate,
          periodo_fim: endDate,
          status: "pendente",
        }).select("id").single();

        // Send via Resend
        let sendSuccess = true;
        let sendError = "";
        for (const email of recipientEmails) {
          try {
            const resendResp = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
              body: JSON.stringify({
                from: "Radar GI <noreply@iganheicrm.com.br>",
                to: [email],
                subject: `📡 Radar de Inteligência — ${empresaNome} — ${formatDate(yesterday)}`,
                html: emailHtml,
              }),
            });
            if (!resendResp.ok) {
              const errBody = await resendResp.text();
              console.error(`Resend error for ${email}:`, errBody);
              sendSuccess = false;
              sendError = errBody;
            }
            await delay(600);
          } catch (e) {
            console.error(`Send error for ${email}:`, e);
            sendSuccess = false;
            sendError = String(e);
          }
        }

        // Update envio record
        if (envioRecord?.id) {
          await supabase.from("newsletter_envios").update({
            status: sendSuccess ? "enviado" : "erro",
            enviado_em: new Date().toISOString(),
            erro_mensagem: sendSuccess ? null : sendError,
          }).eq("id", envioRecord.id);
        }

        // Update schedule
        await supabase.from("newsletter_agendamentos").update({
          ultimo_envio_em: new Date().toISOString(),
        }).eq("id", schedule.id);

        sendResults.push({ empresa_id: schedule.empresa_id, sent: sendSuccess, recipients: recipientEmails.length, events: events.length });
      } catch (e) {
        console.error(`Error processing schedule ${schedule.id}:`, e);
        sendResults.push({ empresa_id: schedule.empresa_id, error: String(e) });
      }
    }

    return new Response(JSON.stringify({ success: true, time: currentTime, results: sendResults }), {
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
