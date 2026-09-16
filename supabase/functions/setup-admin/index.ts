import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SetupAdminRequest {
  email: string;
  password: string;
  nome: string;
  setupKey: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
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

    const { email, password, nome, setupKey }: SetupAdminRequest = await req.json();

    // Validate setup key from environment variable
    const validSetupKey = Deno.env.get("SETUP_ADMIN_KEY");
    if (!validSetupKey || setupKey !== validSetupKey) {
      return new Response(
        JSON.stringify({ error: "Chave de configuração inválida" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if any admin already exists
    const { data: existingAdmins, error: checkError } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("role", "admin")
      .limit(1);

    if (checkError) throw checkError;

    if (existingAdmins && existingAdmins.length > 0) {
      return new Response(
        JSON.stringify({ error: "Já existe um administrador no sistema. Use o painel de admin para criar novos usuários." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate input
    if (!email || !password || !nome) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios: email, password, nome" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome },
    });

    if (createError) {
      console.error("Error creating admin:", createError);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update profile
    if (newUser.user) {
      await supabaseAdmin
        .from("profiles")
        .update({ nome, cargo: "Administrador do Sistema" })
        .eq("id", newUser.user.id);

      // Set admin role
      await supabaseAdmin
        .from("user_roles")
        .update({ role: "admin" })
        .eq("user_id", newUser.user.id);
    }

    console.log("Admin created successfully:", newUser.user?.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Administrador criado com sucesso! Você já pode fazer login."
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in setup-admin function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
