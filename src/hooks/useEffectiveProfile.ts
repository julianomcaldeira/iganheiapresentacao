import { useAuth } from '@/contexts/AuthContext';
import { useImpersonation } from '@/contexts/ImpersonationContext';

/**
 * Returns the effective user profile considering impersonation.
 * When in spy mode, returns the impersonated user's data.
 * Components should use this for data fetching instead of useAuth directly.
 */
export function useEffectiveProfile() {
  const { profile, role, isAdmin } = useAuth();
  const { isImpersonating, impersonatedUser } = useImpersonation();

  if (isImpersonating && impersonatedUser) {
    return {
      effectiveProfile: {
        id: impersonatedUser.id,
        nome: impersonatedUser.nome,
        cliente_id: impersonatedUser.cliente_id,
        perfil_acesso_id: impersonatedUser.perfil_acesso_id,
        cargo: impersonatedUser.cargo,
        avatar_url: impersonatedUser.avatar_url,
        telefone: null,
      },
      effectiveClienteId: impersonatedUser.cliente_id,
      isImpersonating: true,
      isReadOnly: true,
    };
  }

  return {
    effectiveProfile: profile,
    effectiveClienteId: profile?.cliente_id ?? null,
    isImpersonating: false,
    isReadOnly: false,
  };
}
