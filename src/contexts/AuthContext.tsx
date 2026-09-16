import { useEffect, useState, ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { AuthContext, type AppRole, type Profile, type ModulePermission } from './auth-context';

export { useAuth } from './auth-context';



export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [permissions, setPermissions] = useState<ModulePermission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (!error && data) {
      setProfile(data as Profile);

      if (data.perfil_acesso_id) {
        await fetchPermissions(data.perfil_acesso_id);
      } else {
        setPermissions([]);
      }
    }
  };

  const fetchPermissions = async (perfilAcessoId: string) => {
    const { data, error } = await supabase
      .from('perfil_permissoes')
      .select('modulo, pode_visualizar, pode_criar, pode_editar, pode_excluir')
      .eq('perfil_id', perfilAcessoId);

    if (!error && data) {
      setPermissions(data as ModulePermission[]);
    } else {
      setPermissions([]);
    }
  };

  const fetchRole = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (!error && data) {
      setRole(data.role as AppRole);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setLoading(true);
          // Defer to avoid deadlock; await both before clearing loading
          setTimeout(async () => {
            await Promise.all([
              fetchProfile(session.user.id),
              fetchRole(session.user.id),
            ]);
            setLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setRole(null);
          setPermissions([]);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await Promise.all([
          fetchProfile(session.user.id),
          fetchRole(session.user.id),
        ]);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };


  const signOut = async () => {
    // Limpa estado local imediatamente para garantir logout visual
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
    setPermissions([]);

    try {
      // scope 'local' evita erro 403 quando a sessão já não existe no servidor
      await supabase.auth.signOut({ scope: 'local' });
    } catch (err) {
      console.warn('[Auth] signOut server error (ignorado):', err);
    }

    // Garante limpeza completa de qualquer token remanescente
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('sb-') && k.endsWith('-auth-token'))
        .forEach((k) => localStorage.removeItem(k));
    } catch {}
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('Usuário não autenticado') };

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (!error) {
      setProfile((prev) => prev ? { ...prev, ...updates } : null);
    }

    return { error };
  };

  const hasRole = (checkRole: AppRole): boolean => {
    if (!role) return false;
    if (role === 'admin') return true; // Admin tem acesso a tudo
    if (role === 'gerente' && checkRole !== 'admin') return true; // Gerente tem acesso exceto admin
    return role === checkRole;
  };

  const getModulePermissions = (modulo: string): ModulePermission | null => {
    return permissions.find(p => p.modulo === modulo) || null;
  };

  const hasPermission = (modulo: string, action: 'visualizar' | 'criar' | 'editar' | 'excluir'): boolean => {
    // Admin sempre tem todas as permissões
    if (role === 'admin') return true;
    
    // Se o usuário tem um perfil de acesso configurado, usa as permissões dele
    if (profile?.perfil_acesso_id && permissions.length > 0) {
      const modulePermission = getModulePermissions(modulo);
      
      if (!modulePermission) {
        // Módulo não configurado no perfil - sem acesso
        return false;
      }
      
      switch (action) {
        case 'visualizar':
          return modulePermission.pode_visualizar;
        case 'criar':
          return modulePermission.pode_criar;
        case 'editar':
          return modulePermission.pode_editar;
        case 'excluir':
          return modulePermission.pode_excluir;
        default:
          return false;
      }
    }
    
    // Se não tem perfil de acesso configurado, fallback baseado em role
    // Gerente tem todas as permissões por padrão (quando não tem perfil)
    if (role === 'gerente') return true;
    
    // Usuário comum sem perfil configurado - acesso básico apenas visualização
    return action === 'visualizar';
  };

  const isAdmin = role === 'admin';
  const isGerente = role === 'gerente' || role === 'admin';
  const isAtendente = role === 'atendente' || role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        permissions,
        loading,
        signIn,
        signOut,
        updateProfile,
        hasRole,
        hasPermission,
        getModulePermissions,
        isAdmin,
        isGerente,
        isAtendente,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

