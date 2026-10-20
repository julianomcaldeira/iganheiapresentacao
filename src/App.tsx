import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ImpersonationProvider } from "@/contexts/ImpersonationContext";
import { ShortcutsProvider } from "@/contexts/ShortcutsContext";
import { DensityProvider } from "@/contexts/DensityContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { VoiceCommandButton } from "@/components/voice/VoiceCommandButton";
import Index from "./pages/Index";
import Licitacoes from "./pages/Licitacoes";
import Clientes from "./pages/Clientes";
import Documentos from "./pages/Documentos";
import Pendencias from "./pages/Pendencias";
import Produtos from "./pages/Produtos";
import Agenda from "./pages/Agenda";
import Relatorios from "./pages/Relatorios";
import Admin from "./pages/Admin";
import Auditoria from "./pages/Auditoria";
import Configuracoes from "./pages/Configuracoes";
import Auth from "./pages/Auth";
import SetupAdmin from "./pages/SetupAdmin";
import Tarefas from "./pages/Tarefas";
import Importacao from "./pages/Importacao";
import IAConfiguracao from "./pages/IAConfiguracao";
import IAPecas from "./pages/IAPecas";
import IAConhecimento from "./pages/IAConhecimento";
import Placeholder from "./pages/Placeholder";
import Concorrentes from "./pages/Concorrentes";
import AnaliseEstrategica from "./pages/AnaliseEstrategica";
import Distribuidores from "./pages/Distribuidores";
import ContratosDashboard from "./pages/ContratosDashboard";
import EmpenhosDashboard from "./pages/EmpenhosDashboard";
import GestaoContratos from "./pages/GestaoContratos";
import Atendimento from "./pages/Atendimento";
import MinhasRegras from "./pages/MinhasRegras";

import NotFound from "./pages/NotFound";
import TesteEmail from "./pages/TesteEmail";
import Mensageria from "./pages/Mensageria";
import Onboarding from "./pages/Onboarding";
import NewsIntelligence from "./pages/NewsIntelligence";
import InteligenciaPesquisei from "./pages/InteligenciaPesquisei";
import Orgaos from "./pages/Orgaos";
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <ImpersonationProvider>
        <DensityProvider>
        <ShortcutsProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <VoiceCommandButton />
          <Routes>
            {/* Public Routes */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/setup" element={<SetupAdmin />} />
            
            {/* Protected Routes */}
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/licitacoes" element={<ProtectedRoute><Licitacoes /></ProtectedRoute>} />
            <Route path="/concorrentes" element={<ProtectedRoute><Concorrentes /></ProtectedRoute>} />
            <Route path="/analise-estrategica" element={<ProtectedRoute><AnaliseEstrategica /></ProtectedRoute>} />
            <Route path="/distribuidores" element={<ProtectedRoute><Distribuidores /></ProtectedRoute>} />
            <Route path="/orgaos" element={<ProtectedRoute><Orgaos /></ProtectedRoute>} />
            <Route path="/dashboard/contratos" element={<ProtectedRoute><ContratosDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/empenhos" element={<ProtectedRoute><EmpenhosDashboard /></ProtectedRoute>} />
            <Route path="/contratos" element={<ProtectedRoute><GestaoContratos /></ProtectedRoute>} />
            <Route path="/clientes" element={<ProtectedRoute><Clientes /></ProtectedRoute>} />
            <Route path="/documentos" element={<ProtectedRoute><Documentos /></ProtectedRoute>} />
            
            <Route path="/produtos" element={<ProtectedRoute><Produtos /></ProtectedRoute>} />
            <Route path="/pendencias" element={<ProtectedRoute><Pendencias /></ProtectedRoute>} />
            <Route path="/agenda" element={<ProtectedRoute><Agenda /></ProtectedRoute>} />
            <Route path="/relatorios" element={<ProtectedRoute><Relatorios /></ProtectedRoute>} />
            
            {/* IA Routes */}
            <Route path="/ia" element={<ProtectedRoute><Placeholder title="IA i-Ganhei" subtitle="Inteligência artificial" /></ProtectedRoute>} />
            <Route path="/ia/analise-edital" element={
              <ProtectedRoute>
                <IAConfiguracao 
                  tipo="analise_edital" 
                  title="Análise de Edital" 
                  subtitle="Configuração de prompts para análise de editais"
                  description="Configure como a IA analisa editais de licitação para cada cliente"
                />
              </ProtectedRoute>
            } />
            <Route path="/ia/analise-estrategica" element={
              <ProtectedRoute>
                <IAConfiguracao 
                  tipo="analise_estrategica" 
                  title="Análise Estratégica" 
                  subtitle="Configuração de prompts para análise estratégica"
                  description="Configure como a IA analisa indicadores estratégicos e operacionais das licitações para cada cliente"
                />
              </ProtectedRoute>
            } />
            <Route path="/ia/monitor" element={
              <ProtectedRoute>
                <IAConfiguracao 
                  tipo="monitor_pregao" 
                  title="Monitor de Pregão" 
                  subtitle="Configuração do monitoramento em tempo real"
                  description="Configure alertas e análises em tempo real durante pregões"
                />
              </ProtectedRoute>
            } />
            <Route path="/ia/pecas" element={<ProtectedRoute><IAPecas /></ProtectedRoute>} />
            <Route path="/ia/conhecimento" element={<ProtectedRoute><IAConhecimento /></ProtectedRoute>} />
            
            {/* Admin Only Routes */}
            <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><Admin /></ProtectedRoute>} />
            <Route path="/auditoria" element={<ProtectedRoute requiredRole="admin"><Auditoria /></ProtectedRoute>} />
            <Route path="/importacao" element={<ProtectedRoute requiredRole="admin"><Importacao /></ProtectedRoute>} />
            
            <Route path="/teste-email" element={<ProtectedRoute requiredRole="admin"><TesteEmail /></ProtectedRoute>} />
            <Route path="/onboarding" element={<ProtectedRoute requiredRole="admin"><Onboarding /></ProtectedRoute>} />
            
            
            {/* Protected Routes - All Users */}
            <Route path="/tarefas" element={<ProtectedRoute><Tarefas /></ProtectedRoute>} />
            <Route path="/atendimento" element={<ProtectedRoute><Atendimento /></ProtectedRoute>} />
            <Route path="/minhas-regras" element={<ProtectedRoute><MinhasRegras /></ProtectedRoute>} />
            <Route path="/mensageria" element={<ProtectedRoute><Mensageria /></ProtectedRoute>} />
            <Route path="/news-intelligence" element={<ProtectedRoute><NewsIntelligence /></ProtectedRoute>} />
            <Route path="/inteligencia-pesquisei" element={<ProtectedRoute><InteligenciaPesquisei /></ProtectedRoute>} />
            
            {/* User Settings */}
            <Route path="/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
        </ShortcutsProvider>
        </DensityProvider>
        </ImpersonationProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
