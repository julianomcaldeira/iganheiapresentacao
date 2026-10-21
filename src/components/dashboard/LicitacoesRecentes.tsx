import { motion } from 'framer-motion';
import { ExternalLink, TrendingUp, TrendingDown, Clock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface LicitacaoRecente {
  id: string;
  numero: string;
  objeto: string;
  orgao: string;
  modalidade: string;
  status: string;
  relevancia: string;
  valor: number;
  dataEncerramento: string;
}

const getStatusConfig = (status: string) => {
  const configs: Record<string, { label: string; className: string }> = {
    nova: { label: 'Nova', className: 'bg-info/10 text-info border-info/20' },
    em_analise: { label: 'Em Análise', className: 'bg-warning/10 text-warning border-warning/20' },
    aprovada: { label: 'Aprovada', className: 'bg-success/10 text-success border-success/20' },
    participando: { label: 'Participando', className: 'bg-primary/10 text-primary border-primary/20' },
    ganha: { label: 'Ganha', className: 'bg-success/10 text-success border-success/20' },
    perdida: { label: 'Perdida', className: 'bg-destructive/10 text-destructive border-destructive/20' },
    cancelada: { label: 'Cancelada', className: 'bg-muted text-muted-foreground border-border' },
  };
  return configs[status] || configs.nova;
};

const getRelevanciaConfig = (relevancia: string) => {
  const configs: Record<string, { label: string; icon: typeof TrendingUp; className: string }> = {
    alta: { label: 'Alta', icon: TrendingUp, className: 'text-success' },
    media: { label: 'Média', icon: Clock, className: 'text-warning' },
    baixa: { label: 'Baixa', icon: TrendingDown, className: 'text-muted-foreground' },
  };
  return configs[relevancia] || configs.baixa;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export function LicitacoesRecentes() {
  const { profile, isAdmin } = useAuth();
  const [licitacoes, setLicitacoes] = useState<LicitacaoRecente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        let q = supabase
          .from('licitacoes')
          .select('id, numero, objeto, orgao, modalidade, status, relevancia, valor_estimado, data_encerramento, cliente_id')
          .order('created_at', { ascending: false })
          .limit(5);
        if (!isAdmin && profile?.cliente_id) q = q.eq('cliente_id', profile.cliente_id);
        const { data } = await q;
        setLicitacoes(
          ((data || []) as any[]).map((l) => ({
            id: l.id,
            numero: l.numero,
            objeto: l.objeto,
            orgao: l.orgao,
            modalidade: l.modalidade || 'Pregão Eletrônico',
            status: l.status,
            relevancia: l.relevancia || 'media',
            valor: Number(l.valor_estimado || 0),
            dataEncerramento: l.data_encerramento || new Date().toISOString(),
          }))
        );
      } catch (e) {
        console.error('[Dashboard] Erro ao carregar licitações recentes:', e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [profile?.cliente_id, isAdmin]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.5 }}
      className="rounded-xl bg-card shadow-md border border-border overflow-hidden"
    >
      <div className="flex items-center justify-between p-6 border-b border-border">
        <div>
          <h3 className="text-lg font-heading font-semibold text-foreground">
            Licitações Recentes
          </h3>
          <p className="text-sm text-muted-foreground">
            Últimas atualizações
          </p>
        </div>
        <Button variant="outline" size="sm">
          Ver todas
          <ExternalLink className="w-4 h-4 ml-2" />
        </Button>
      </div>

      <div className="divide-y divide-border">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {!loading && licitacoes.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma licitação cadastrada.
          </p>
        )}
        {licitacoes.map((licitacao, index) => {
          const statusConfig = getStatusConfig(licitacao.status);
          const relevanciaConfig = getRelevanciaConfig(licitacao.relevancia);
          const RelevanciaIcon = relevanciaConfig.icon;

          return (
            <motion.div
              key={licitacao.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.1 * index }}
              className="p-4 hover:bg-secondary/30 transition-colors cursor-pointer group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-primary">
                      {licitacao.numero}
                    </span>
                    <Badge variant="outline" className={cn('text-[10px]', statusConfig.className)}>
                      {statusConfig.label}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                    {licitacao.objeto}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {licitacao.orgao} • {licitacao.modalidade}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-foreground">
                    {formatCurrency(licitacao.valor)}
                  </p>
                  <div className={cn('flex items-center justify-end gap-1 text-xs mt-1', relevanciaConfig.className)}>
                    <RelevanciaIcon className="w-3 h-3" />
                    <span>{relevanciaConfig.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(licitacao.dataEncerramento).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
