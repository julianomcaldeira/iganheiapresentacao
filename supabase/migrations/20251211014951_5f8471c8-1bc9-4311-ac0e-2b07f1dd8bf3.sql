-- Create access profiles table
CREATE TABLE IF NOT EXISTS public.perfis_acesso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(cliente_id, nome)
);

-- Create profile permissions table (which modules/screens the profile can access)
CREATE TABLE IF NOT EXISTS public.perfil_permissoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id uuid NOT NULL REFERENCES public.perfis_acesso(id) ON DELETE CASCADE,
  modulo text NOT NULL,
  pode_visualizar boolean NOT NULL DEFAULT false,
  pode_criar boolean NOT NULL DEFAULT false,
  pode_editar boolean NOT NULL DEFAULT false,
  pode_excluir boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(perfil_id, modulo)
);

-- Add perfil_acesso_id to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS perfil_acesso_id uuid REFERENCES public.perfis_acesso(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.perfis_acesso ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfil_permissoes ENABLE ROW LEVEL SECURITY;

-- RLS policies for perfis_acesso
CREATE POLICY "Admins can manage all access profiles"
ON public.perfis_acesso
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view access profiles"
ON public.perfis_acesso
FOR SELECT
USING (has_role(auth.uid(), 'gerente'::app_role));

CREATE POLICY "Users can view their own access profile"
ON public.perfis_acesso
FOR SELECT
USING (
  id IN (SELECT perfil_acesso_id FROM profiles WHERE id = auth.uid())
);

-- RLS policies for perfil_permissoes
CREATE POLICY "Admins can manage all permissions"
ON public.perfil_permissoes
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view permissions"
ON public.perfil_permissoes
FOR SELECT
USING (has_role(auth.uid(), 'gerente'::app_role));

CREATE POLICY "Users can view their own permissions"
ON public.perfil_permissoes
FOR SELECT
USING (
  perfil_id IN (SELECT perfil_acesso_id FROM profiles WHERE id = auth.uid())
);

-- Trigger for updated_at on perfis_acesso
CREATE TRIGGER update_perfis_acesso_updated_at
BEFORE UPDATE ON public.perfis_acesso
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();