import { createContext, useContext } from 'react';
import type { User, Session } from '@supabase/supabase-js';

export type AppRole = 'admin' | 'gerente' | 'usuario' | 'atendente';

export interface Profile {
  id: string;
  nome: string;
  telefone: string | null;
  cargo: string | null;
  avatar_url: string | null;
  cliente_id: string | null;
  perfil_acesso_id: string | null;
}

export interface ModulePermission {
  modulo: string;
  pode_visualizar: boolean;
  pode_criar: boolean;
  pode_editar: boolean;
  pode_excluir: boolean;
}

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  permissions: ModulePermission[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>;
  hasRole: (role: AppRole) => boolean;
  hasPermission: (modulo: string, action: 'visualizar' | 'criar' | 'editar' | 'excluir') => boolean;
  getModulePermissions: (modulo: string) => ModulePermission | null;
  isAdmin: boolean;
  isGerente: boolean;
  isAtendente: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
