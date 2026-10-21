import { motion } from 'framer-motion';
import { AlertCircle, Clock, FileText, Workflow, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Pendencia {
  id: string;
  titulo: string;
  descricao: string;
  tipo: 'workflow' | 'documento' | 'licitacao';
  prioridade: 'alta' | 'media' | 'baixa';
  prazo: string;
}

const getTypeIcon = (tipo: string) => {
  switch (tipo) {
    case 'workflow':
      return Workflow;
    case 'documento':
      return FileText;
    case 'licitacao':
      return FileText;
    default:
      return AlertCircle;
  }
};

const getPriorityColor = (prioridade: string) => {
  switch (prioridade) {
    case 'alta':
      return 'bg-destructive/10 text-destructive border-destructive/20';
    case 'media':
      return 'bg-warning/10 text-warning border-warning/20';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
};

export function PendenciasCard() {
  const { profile, isAdmin } = useAuth();
  const [pendencias, setPendencias] = useState<Pendencia[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        // Tarefas reais do cliente
        let q = supabase
          .from('tarefas')
          .select('id, titulo, descricao, prioridade, data_vencimento, status')
          .in('status', ['pendente', 'em_andamento'])
          .order('data_vencimento', { ascending: true })
          .limit(20);
        if (!isAdmin && profile?.cliente_id) q = q.eq('cliente_id', profile.cliente_id);
        const { data: tarefas } = await q;

        const lista: Pendencia[] = (tarefas || []).map((t: any) => ({
          id: t.id,
          titulo: t.titulo,
          descricao: t.descricao || 'Tarefa do plano de ação da licitação',
          tipo: 'workflow',
          prioridade: (t.prioridade as Pendencia['prioridade']) || 'media',
          prazo: t.data_vencimento || new Date().toISOString(),
        }));

        // Documentos pendentes de habilitação
        let licQ = supabase.from('licitacoes').select('id, numero, cliente_id');
        if (!isAdmin && profile?.cliente_id) licQ = licQ.eq('cliente_id', profile.cliente_id);
        const { data: lics } = await licQ;
        const licIds = (lics || []).map((l: any) => l.id);
        if (licIds.length > 0) {
          const { data: docs } = await supabase
            .from('licitacao_documentos_checklist')
            .select('id, nome, licitacao_id, status, data_validade')
            .in('licitacao_id', licIds)
            .neq('status', 'concluido')
            .limit(10);
          const numeroPorLic = new Map((lics || []).map((l: any) => [l.id, l.numero]));
          (docs || []).forEach((d: any) => {
            lista.push({
              id: d.id,
              titulo: `Providenciar: ${d.nome}`,
              descricao: `Licitação ${numeroPorLic.get(d.licitacao_id) || ''} — documento de habilitação pendente`,
              tipo: 'documento',
              prioridade: 'alta',
              prazo: d.data_validade || new Date().toISOString(),
            });
          });
        }

        setPendencias(lista);
      } catch (e) {
        console.error('[Dashboard] Erro ao carregar pendências:', e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [profile?.cliente_id, isAdmin]);

  const pendenciasAltas = pendencias.filter((p) => p.prioridade === 'alta');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4 }}
      className="rounded-xl bg-card p-6 shadow-md border border-border"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-heading font-semibold text-foreground">
            Pendências Urgentes
          </h3>
          <p className="text-sm text-muted-foreground">
            {pendenciasAltas.length} itens prioritários
          </p>
        </div>
        <Badge variant="destructive" className="animate-pulse">
          {pendencias.length} total
        </Badge>
      </div>

      <div className="space-y-3">
        {loading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {!loading && pendencias.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            Nenhuma pendência no momento.
          </p>
        )}
        {pendencias.slice(0, 4).map((pendencia, index) => {
          const Icon = getTypeIcon(pendencia.tipo);
          
          return (
            <motion.div
              key={pendencia.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.1 * index }}
              className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer group"
            >
              <div className={cn(
                'flex items-center justify-center w-8 h-8 rounded-lg shrink-0',
                pendencia.prioridade === 'alta' ? 'bg-destructive/10' : 'bg-primary/10'
              )}>
                <Icon className={cn(
                  'w-4 h-4',
                  pendencia.prioridade === 'alta' ? 'text-destructive' : 'text-primary'
                )} />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                  {pendencia.titulo}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {pendencia.descricao}
                </p>
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(pendencia.prazo).toLocaleDateString('pt-BR')}</span>
                </div>
                <Badge
                  variant="outline"
                  className={cn('text-[10px] capitalize', getPriorityColor(pendencia.prioridade))}
                >
                  {pendencia.prioridade}
                </Badge>
              </div>
            </motion.div>
          );
        })}
      </div>

      <button className="w-full mt-4 py-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors">
        Ver todas as pendências →
      </button>
    </motion.div>
  );
}
