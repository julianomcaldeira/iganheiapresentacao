import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { 
  CheckCircle2, ArrowLeft, Sparkles, Building2, Briefcase, 
  Target, Users, Workflow, Shield, Settings, PartyPopper
} from 'lucide-react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';

interface Props {
  clienteId: string;
  progress: any;
  steps: Array<{ id: number; title: string; icon: any; color: string }>;
  onComplete: () => void;
  onBack: () => void;
}

interface ClienteSummary {
  nome: string;
  empresas_count: number;
  palavras_positivas: number;
  palavras_negativas: number;
  concorrentes: number;
  workflows_count: number;
  usuarios_count: number;
  integracao_ativa: boolean;
}

export function OnboardingStep9Conclusao({ clienteId, progress, steps, onComplete, onBack }: Props) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ClienteSummary | null>(null);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    fetchSummary();
  }, [clienteId]);

  const fetchSummary = async () => {
    try {
      const [clienteRes, empresasRes, workflowsRes, usuariosRes] = await Promise.all([
        supabase.from('clientes').select('nome, palavras_positivas, palavras_negativas, concorrentes').eq('id', clienteId).single(),
        supabase.from('empresas').select('id', { count: 'exact', head: true }).eq('cliente_id', clienteId).eq('ativo', true),
        supabase.from('licitacao_workflows').select('id', { count: 'exact', head: true }).eq('cliente_id', clienteId).eq('ativo', true),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('cliente_id', clienteId).eq('ativo', true),
      ]);

      setSummary({
        nome: clienteRes.data?.nome || '',
        empresas_count: empresasRes.count || 0,
        palavras_positivas: clienteRes.data?.palavras_positivas?.length || 0,
        palavras_negativas: clienteRes.data?.palavras_negativas?.length || 0,
        concorrentes: clienteRes.data?.concorrentes?.length || 0,
        workflows_count: workflowsRes.count || 0,
        usuarios_count: usuariosRes.count || 0,
        integracao_ativa: false
      });
    } catch (error) {
      console.error('Erro ao buscar resumo:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    setCompleting(true);
    
    // Trigger confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0 }
      });
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1 }
      });
    }, 250);

    setTimeout(() => {
      onComplete();
    }, 1500);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando resumo...</div>;
  }

  const completedSteps = progress?.etapas_concluidas || [];
  const allStepsCompleted = completedSteps.length >= 7;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-emerald-500/20 via-green-500/10 to-background border-b">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 rounded-lg">
            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
          </div>
          <div>
            <CardTitle>Revisão e Conclusão</CardTitle>
            <CardDescription>
              Revise todas as configurações antes de finalizar o onboarding
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {/* Client Name */}
        <div className="text-center py-4">
          <h2 className="text-2xl font-bold">{summary?.nome}</h2>
          <p className="text-muted-foreground">Resumo da Implantação</p>
        </div>

        {/* Summary Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center p-4 rounded-lg bg-muted/50"
          >
            <Briefcase className="h-6 w-6 mx-auto mb-2 text-purple-500" />
            <p className="text-2xl font-bold">{summary?.empresas_count}</p>
            <p className="text-xs text-muted-foreground">Empresas</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center p-4 rounded-lg bg-muted/50"
          >
            <Target className="h-6 w-6 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold">{(summary?.palavras_positivas || 0) + (summary?.palavras_negativas || 0)}</p>
            <p className="text-xs text-muted-foreground">Palavras-Chave</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center p-4 rounded-lg bg-muted/50"
          >
            <Users className="h-6 w-6 mx-auto mb-2 text-orange-500" />
            <p className="text-2xl font-bold">{summary?.concorrentes}</p>
            <p className="text-xs text-muted-foreground">Concorrentes</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-center p-4 rounded-lg bg-muted/50"
          >
            <Shield className="h-6 w-6 mx-auto mb-2 text-cyan-500" />
            <p className="text-2xl font-bold">{summary?.usuarios_count}</p>
            <p className="text-xs text-muted-foreground">Usuários</p>
          </motion.div>
        </div>

        {/* Checklist */}
        <div className="space-y-2">
          <h3 className="font-semibold">Etapas Concluídas</h3>
          <div className="grid gap-2">
            {steps.slice(0, 7).map((step) => {
              const isCompleted = completedSteps.includes(step.id);
              return (
                <div 
                  key={step.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    isCompleted ? 'bg-green-500/5 border-green-500/20' : 'bg-muted/30'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
                  )}
                  <span className={isCompleted ? 'text-foreground' : 'text-muted-foreground'}>
                    {step.title}
                  </span>
                  {isCompleted && (
                    <Badge variant="outline" className="ml-auto bg-green-500/10 text-green-600 text-xs">
                      Concluído
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Complete Button */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center py-6"
        >
          <div className="inline-flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            <span className="text-lg font-medium">Tudo pronto para finalizar!</span>
            <Sparkles className="h-5 w-5 text-yellow-500" />
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Ao concluir, o cliente estará pronto para usar o sistema i-Ganhei
          </p>
        </motion.div>

        <div className="flex justify-between pt-4 border-t">
          <Button onClick={onBack} variant="ghost">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <Button 
            onClick={handleComplete} 
            disabled={completing}
            size="lg"
            className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600"
          >
            {completing ? (
              <>
                <PartyPopper className="h-4 w-4 mr-2 animate-bounce" />
                Finalizando...
              </>
            ) : (
              <>
                <PartyPopper className="h-4 w-4 mr-2" />
                Concluir Onboarding
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}