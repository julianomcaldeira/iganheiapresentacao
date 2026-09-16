import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ImpersonatedUser {
  id: string;
  nome: string;
  cliente_id: string | null;
  perfil_acesso_id: string | null;
  cargo: string | null;
  avatar_url: string | null;
}

interface ImpersonationContextType {
  isImpersonating: boolean;
  impersonatedUser: ImpersonatedUser | null;
  startImpersonation: (userId: string) => Promise<void>;
  stopImpersonation: () => void;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [impersonatedUser, setImpersonatedUser] = useState<ImpersonatedUser | null>(null);

  const startImpersonation = useCallback(async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, nome, cliente_id, perfil_acesso_id, cargo, avatar_url')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      if (!profile) {
        toast.error('Perfil do usuário não encontrado');
        return;
      }

      setImpersonatedUser(profile as ImpersonatedUser);
      toast.success(`Modo espião ativado para ${profile.nome || 'usuário'}`);
    } catch (error) {
      console.error('Error starting impersonation:', error);
      toast.error('Erro ao ativar modo espião');
    }
  }, []);

  const stopImpersonation = useCallback(() => {
    setImpersonatedUser(null);
    toast.info('Modo espião desativado');
  }, []);

  return (
    <ImpersonationContext.Provider
      value={{
        isImpersonating: !!impersonatedUser,
        impersonatedUser,
        startImpersonation,
        stopImpersonation,
      }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  const context = useContext(ImpersonationContext);
  if (context === undefined) {
    throw new Error('useImpersonation must be used within an ImpersonationProvider');
  }
  return context;
}
