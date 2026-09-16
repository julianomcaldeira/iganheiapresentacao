import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ManageUserRequest {
  action: "deactivate" | "activate" | "delete" | "reset-password" | "update";
  user_id: string;
  updates?: {
    nome?: string;
    cargo?: string | null;
    telefone?: string | null;
    cliente_id?: string | null;
    perfil_acesso_id?: string | null;
  };
  new_role?: string;
}

const generatePassword = (length = 12) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: requestingUser }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id)
      .single();

    if (roleError || roleData?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Apenas administradores podem gerenciar usuários" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, user_id, updates, new_role }: ManageUserRequest = await req.json();

    if (!action || !user_id) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios: action, user_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (user_id === requestingUser.id && (action === "delete" || action === "deactivate")) {
      return new Response(
        JSON.stringify({ error: "Você não pode desativar ou excluir sua própria conta" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result: any = { success: true };

    switch (action) {
      case "activate":
        const { error: activateError } = await supabaseAdmin
          .from("profiles")
          .update({ ativo: true })
          .eq("id", user_id);
        if (activateError) throw activateError;
        break;

      case "deactivate":
        const { error: deactivateError } = await supabaseAdmin
          .from("profiles")
          .update({ ativo: false })
          .eq("id", user_id);
        if (deactivateError) throw deactivateError;
        break;

      case "delete":
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);
        if (deleteError) throw deleteError;
        break;

      case "reset-password":
        const newPassword = generatePassword();
        const { error: resetError } = await supabaseAdmin.auth.admin.updateUserById(
          user_id,
          { password: newPassword }
        );
        if (resetError) throw resetError;
        result.newPassword = newPassword;
        break;

      case "update":
        if (updates) {
          const { error: updateError } = await supabaseAdmin
            .from("profiles")
            .update({
              ...(updates.nome !== undefined && { nome: updates.nome }),
              ...(updates.cargo !== undefined && { cargo: updates.cargo }),
              ...(updates.telefone !== undefined && { telefone: updates.telefone }),
              ...(updates.cliente_id !== undefined && { cliente_id: updates.cliente_id }),
              ...(updates.perfil_acesso_id !== undefined && { perfil_acesso_id: updates.perfil_acesso_id }),
            })
            .eq("id", user_id);
          if (updateError) throw updateError;
        }

        if (new_role) {
          const { error: roleUpdateError } = await supabaseAdmin
            .from("user_roles")
            .update({ role: new_role })
            .eq("user_id", user_id);
          if (roleUpdateError) throw roleUpdateError;
        }

        console.log(`User ${user_id} updated`);
        break;

      default:
        return new Response(
          JSON.stringify({ error: "Ação inválida" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in manage-user function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
