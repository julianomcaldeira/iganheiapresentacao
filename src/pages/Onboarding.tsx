import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  Building2, Users, FileText, Settings, Workflow, 
  Mail, Shield, CheckCircle2, ArrowRight, ArrowLeft,
  Sparkles, Target, Briefcase, ListChecks, Play, RotateCcw,
  MessageCircle
} from 'lucide-react';
import { OnboardingStep1Cliente } from '@/components/onboarding/OnboardingStep1Cliente';
import { OnboardingStep2Empresas } from '@/components/onboarding/OnboardingStep2Empresas';
import { OnboardingStep3Keywords } from '@/components/onboarding/OnboardingStep3Keywords';
import { OnboardingStep4Concorrentes } from '@/components/onboarding/OnboardingStep4Concorrentes';
import { OnboardingStep5Workflow } from '@/components/onboarding/OnboardingStep5Workflow';
import { OnboardingStep6Usuarios } from '@/components/onboarding/OnboardingStep6Usuarios';
import { OnboardingStep7Integracao } from '@/components/onboarding/OnboardingStep7Integracao';
import { OnboardingStep8Mensageria } from '@/components/onboarding/OnboardingStep8Mensageria';
import { OnboardingStep9Conclusao } from '@/components/onboarding/OnboardingStep9Conclusao';
import { motion, AnimatePresence } from 'framer-motion';

interface OnboardingProgress {
  id: string;
  cliente_id: string;
  etapa_atual: number;
  etapas_concluidas: number[];
  dados_coletados: Record<string, any>;
  concluido: boolean;
}

interface Cliente {
  id: string;
  nome: string;
  cnpj: string | null;
}

const ONBOARDING_STEPS = [
  { 
    id: 1, 
    title: 'Dados do Cliente', 
    description: 'Informações básicas da empresa',
    icon: Building2,
    color: 'text-blue-500'
  },
  { 
    id: 2, 
    title: 'Empresas', 
    description: 'Cadastre as empresas participantes',
    icon: Briefcase,
    color: 'text-purple-500'
  },
  { 
    id: 3, 
    title: 'Palavras-Chave', 
    description: 'Configure filtros de licitações',
    icon: Target,
    color: 'text-green-500'
  },
  { 
    id: 4, 
    title: 'Concorrentes', 
    description: 'Mapeie a concorrência',
    icon: Users,
    color: 'text-orange-500'
  },
  { 
    id: 5, 
    title: 'Workflow', 
    description: 'Configure o fluxo de trabalho',
    icon: Workflow,
    color: 'text-pink-500'
  },
  { 
    id: 6, 
    title: 'Usuários', 
    description: 'Crie os acessos do cliente',
    icon: Shield,
    color: 'text-cyan-500'
  },
  { 
    id: 7, 
    title: 'Integração', 
    description: 'Configure a captura de licitações',
    icon: Settings,
    color: 'text-yellow-500'
  },
  { 
    id: 8, 
    title: 'Mensageria', 
    description: 'Configure comunicação e emails',
    icon: MessageCircle,
    color: 'text-violet-500'
  },
  { 
    id: 9, 
    title: 'Conclusão', 
    description: 'Revise e finalize',
    icon: CheckCircle2,
    color: 'text-emerald-500'
  },
];

export default function Onboarding() {
  const { profile, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clientesEmOnboarding, setClientesEmOnboarding] = useState<OnboardingProgress[]>([]);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [currentProgress, setCurrentProgress] = useState<OnboardingProgress | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch clients without completed onboarding
      const { data: clientesData } = await supabase
        .from('clientes')
        .select('id, nome, cnpj')
        .eq('ativo', true)
        .order('nome');

      // Fetch onboarding progress
      const { data: onboardingData } = await supabase
        .from('cliente_onboarding')
        .select('*');

      setClientes(clientesData || []);
      setClientesEmOnboarding((onboardingData || []).map(o => ({
        ...o,
        etapas_concluidas: Array.isArray(o.etapas_concluidas) ? o.etapas_concluidas as number[] : [],
        dados_coletados: (typeof o.dados_coletados === 'object' && o.dados_coletados !== null) 
          ? o.dados_coletados as Record<string, any> 
          : {}
      })));
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const startOnboarding = async (cliente: Cliente) => {
    // Check if there's existing progress
    const existing = clientesEmOnboarding.find(o => o.cliente_id === cliente.id);
    
    if (existing) {
      setCurrentProgress(existing);
      setCurrentStep(existing.etapa_atual);
    } else {
      // Create new onboarding record
      const { data, error } = await supabase
        .from('cliente_onboarding')
        .insert({
          cliente_id: cliente.id,
          iniciado_por: profile?.id,
          etapa_atual: 1,
          etapas_concluidas: []
        })
        .select()
        .single();

      if (error) {
        toast.error('Erro ao iniciar onboarding');
        return;
      }

      setCurrentProgress({
        ...data,
        etapas_concluidas: [],
        dados_coletados: {}
      });
      setCurrentStep(1);
    }

    setSelectedCliente(cliente);
    setShowOnboarding(true);
  };

  const resetOnboarding = async (clienteId: string) => {
    if (!confirm('Tem certeza que deseja reiniciar o onboarding? Todo o progresso será perdido.')) return;

    await supabase
      .from('cliente_onboarding')
      .delete()
      .eq('cliente_id', clienteId);

    toast.success('Onboarding reiniciado');
    fetchData();
  };

  const updateProgress = async (step: number, data?: Record<string, any>) => {
    if (!currentProgress) return;

    const newEtapasConcluidas = currentProgress.etapas_concluidas.includes(step)
      ? currentProgress.etapas_concluidas
      : [...currentProgress.etapas_concluidas, step];

    const newDados = data 
      ? { ...currentProgress.dados_coletados, [`step${step}`]: data }
      : currentProgress.dados_coletados;

    const { error } = await supabase
      .from('cliente_onboarding')
      .update({
        etapa_atual: step + 1,
        etapas_concluidas: newEtapasConcluidas,
        dados_coletados: newDados
      })
      .eq('id', currentProgress.id);

    if (error) {
      toast.error('Erro ao salvar progresso');
      return;
    }

    setCurrentProgress(prev => prev ? {
      ...prev,
      etapa_atual: step + 1,
      etapas_concluidas: newEtapasConcluidas,
      dados_coletados: newDados
    } : null);

    if (step < 9) {
      setCurrentStep(step + 1);
    }
  };

  const completeOnboarding = async () => {
    if (!currentProgress) return;

    const { error } = await supabase
      .from('cliente_onboarding')
      .update({
        concluido: true,
        concluido_em: new Date().toISOString()
      })
      .eq('id', currentProgress.id);

    if (error) {
      toast.error('Erro ao finalizar onboarding');
      return;
    }

    toast.success('🎉 Onboarding concluído com sucesso!');
    setShowOnboarding(false);
    fetchData();
  };

  const goToStep = (step: number) => {
    // Permite navegação livre entre todas as etapas
    setCurrentStep(step);
  };

  const getClienteOnboardingStatus = (clienteId: string) => {
    return clientesEmOnboarding.find(o => o.cliente_id === clienteId);
  };

  const progressPercent = currentProgress 
    ? (currentProgress.etapas_concluidas.length / ONBOARDING_STEPS.length) * 100
    : 0;

  if (loading) {
    return (
      <MainLayout title="Onboarding" subtitle="Implantação de novos clientes">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  if (!isAdmin) {
    return (
      <MainLayout title="Onboarding" subtitle="Implantação de novos clientes">
        <Card className="max-w-md mx-auto mt-12">
          <CardContent className="pt-6 text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Apenas administradores podem acessar o onboarding de clientes.
            </p>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  if (showOnboarding && selectedCliente) {
    return (
      <MainLayout 
        title={`Onboarding: ${selectedCliente.nome}`} 
        subtitle="Siga o passo a passo para implantar o cliente"
      >
        <div className="space-y-6">
          {/* Progress Header */}
          <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-primary/20">
            <CardContent className="py-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold">{selectedCliente.nome}</h2>
                  <p className="text-sm text-muted-foreground">
                    Etapa {currentStep} de {ONBOARDING_STEPS.length}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-bold text-primary">{Math.round(progressPercent)}%</span>
                  <p className="text-sm text-muted-foreground">concluído</p>
                </div>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </CardContent>
          </Card>

          {/* Steps Navigation */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {ONBOARDING_STEPS.map((step) => {
              const isCompleted = currentProgress?.etapas_concluidas.includes(step.id);
              const isCurrent = currentStep === step.id;

              return (
                <button
                  key={step.id}
                  onClick={() => goToStep(step.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all min-w-fit ${
                    isCurrent
                      ? 'bg-primary text-primary-foreground border-primary shadow-lg scale-105'
                      : isCompleted
                      ? 'bg-green-500/10 border-green-500/30 text-green-600'
                      : 'hover:bg-muted border-border'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <step.icon className={`h-4 w-4 ${isCurrent ? '' : step.color}`} />
                  )}
                  <span className="text-sm font-medium whitespace-nowrap">{step.title}</span>
                </button>
              );
            })}
          </div>

          {/* Step Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {currentStep === 1 && (
                <OnboardingStep1Cliente 
                  clienteId={selectedCliente.id}
                  onComplete={(data) => updateProgress(1, data)}
                />
              )}
              {currentStep === 2 && (
                <OnboardingStep2Empresas 
                  clienteId={selectedCliente.id}
                  onComplete={() => updateProgress(2)}
                  onBack={() => setCurrentStep(1)}
                />
              )}
              {currentStep === 3 && (
                <OnboardingStep3Keywords 
                  clienteId={selectedCliente.id}
                  onComplete={(data) => updateProgress(3, data)}
                  onBack={() => setCurrentStep(2)}
                />
              )}
              {currentStep === 4 && (
                <OnboardingStep4Concorrentes 
                  clienteId={selectedCliente.id}
                  onComplete={() => updateProgress(4)}
                  onBack={() => setCurrentStep(3)}
                />
              )}
              {currentStep === 5 && (
                <OnboardingStep5Workflow 
                  clienteId={selectedCliente.id}
                  onComplete={() => updateProgress(5)}
                  onBack={() => setCurrentStep(4)}
                />
              )}
              {currentStep === 6 && (
                <OnboardingStep6Usuarios 
                  clienteId={selectedCliente.id}
                  onComplete={() => updateProgress(6)}
                  onBack={() => setCurrentStep(5)}
                />
              )}
              {currentStep === 7 && (
                <OnboardingStep7Integracao 
                  clienteId={selectedCliente.id}
                  onComplete={() => updateProgress(7)}
                  onBack={() => setCurrentStep(6)}
                />
              )}
              {currentStep === 8 && (
                <OnboardingStep8Mensageria 
                  clienteId={selectedCliente.id}
                  onComplete={() => updateProgress(8)}
                  onBack={() => setCurrentStep(7)}
                />
              )}
              {currentStep === 9 && (
                <OnboardingStep9Conclusao 
                  clienteId={selectedCliente.id}
                  progress={currentProgress}
                  steps={ONBOARDING_STEPS}
                  onComplete={completeOnboarding}
                  onBack={() => setCurrentStep(8)}
                />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Back to List */}
          <div className="flex justify-center">
            <Button 
              variant="ghost" 
              onClick={() => setShowOnboarding(false)}
              className="text-muted-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para lista de clientes
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Onboarding" subtitle="Implantação de novos clientes">
      <div className="space-y-6">
        {/* Welcome Card */}
        <Card className="bg-gradient-to-br from-primary/20 via-primary/10 to-background border-primary/30">
          <CardContent className="py-8">
            <div className="flex items-center gap-6">
              <div className="p-4 bg-primary/20 rounded-2xl">
                <Sparkles className="h-12 w-12 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">Central de Onboarding</h2>
                <p className="text-muted-foreground max-w-xl">
                  Implante novos clientes de forma guiada e organizada. Siga o passo a passo 
                  para garantir que todas as configurações essenciais sejam realizadas corretamente.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Steps Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5" />
              Etapas do Onboarding
            </CardTitle>
            <CardDescription>
              Cada cliente passa por 8 etapas essenciais para uma implantação completa
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {ONBOARDING_STEPS.map((step) => (
                <div 
                  key={step.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
                >
                  <div className={`p-2 rounded-lg bg-background ${step.color}`}>
                    <step.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{step.title}</p>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Clients List */}
        <Card>
          <CardHeader>
            <CardTitle>Clientes</CardTitle>
            <CardDescription>
              Selecione um cliente para iniciar ou continuar o onboarding
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {clientes.map((cliente) => {
                const status = getClienteOnboardingStatus(cliente.id);
                const isCompleted = status?.concluido;
                const progress = status 
                  ? (status.etapas_concluidas.length / ONBOARDING_STEPS.length) * 100
                  : 0;

                return (
                  <div 
                    key={cliente.id}
                    className={`flex items-center justify-between p-4 rounded-lg border transition-all hover:shadow-md ${
                      isCompleted ? 'bg-green-500/5 border-green-500/20' : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${isCompleted ? 'bg-green-500/20' : 'bg-muted'}`}>
                        {isCompleted ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium">{cliente.nome}</h4>
                        <p className="text-sm text-muted-foreground">
                          {cliente.cnpj || 'CNPJ não cadastrado'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {status && !isCompleted && (
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            <Progress value={progress} className="w-24 h-2" />
                            <span className="text-sm font-medium">{Math.round(progress)}%</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Etapa {status.etapa_atual} de {ONBOARDING_STEPS.length}
                          </p>
                        </div>
                      )}

                      {isCompleted ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Concluído
                          </Badge>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => resetOnboarding(cliente.id)}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : status ? (
                        <Button onClick={() => startOnboarding(cliente)}>
                          <Play className="h-4 w-4 mr-2" />
                          Continuar
                        </Button>
                      ) : (
                        <Button onClick={() => startOnboarding(cliente)}>
                          <ArrowRight className="h-4 w-4 mr-2" />
                          Iniciar
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}

              {clientes.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum cliente cadastrado</p>
                  <p className="text-sm">Cadastre um cliente primeiro para iniciar o onboarding</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}