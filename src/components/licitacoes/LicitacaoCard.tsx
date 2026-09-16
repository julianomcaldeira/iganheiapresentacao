import { motion } from 'framer-motion';
import { Calendar, Building2, TrendingUp, TrendingDown, Clock, ExternalLink, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Licitacao } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface LicitacaoCardProps {
  licitacao: Licitacao;
  index?: number;
}

const getStatusConfig = (status: string) => {
  const configs: Record<string, { label: string; className: string }> = {
    nova: { label: 'Nova', className: 'bg-info text-info-foreground' },
    em_analise: { label: 'Em Análise', className: 'bg-warning text-warning-foreground' },
    aprovada: { label: 'Aprovada', className: 'bg-success text-success-foreground' },
    participando: { label: 'Participando', className: 'gradient-primary text-primary-foreground' },
    ganha: { label: 'Ganha', className: 'gradient-success text-success-foreground' },
    perdida: { label: 'Perdida', className: 'bg-destructive text-destructive-foreground' },
    cancelada: { label: 'Cancelada', className: 'bg-muted text-muted-foreground' },
  };
  return configs[status] || configs.nova;
};

const getRelevanciaConfig = (relevancia: string) => {
  const configs: Record<string, { label: string; icon: typeof TrendingUp; className: string; bg: string }> = {
    alta: { label: 'Alta', icon: TrendingUp, className: 'text-success', bg: 'bg-success/10' },
    media: { label: 'Média', icon: Clock, className: 'text-warning', bg: 'bg-warning/10' },
    baixa: { label: 'Baixa', icon: TrendingDown, className: 'text-muted-foreground', bg: 'bg-muted' },
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

export function LicitacaoCard({ licitacao, index = 0 }: LicitacaoCardProps) {
  const statusConfig = getStatusConfig(licitacao.status);
  const relevanciaConfig = getRelevanciaConfig(licitacao.relevancia);
  const RelevanciaIcon = relevanciaConfig.icon;

  const diasRestantes = Math.ceil(
    (new Date(licitacao.dataEncerramento).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.05 * index }}
      className="group rounded-xl bg-card border border-border shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className={cn('px-3 py-1.5 rounded-lg text-xs font-bold', statusConfig.className)}>
            {statusConfig.label}
          </div>
          <div className={cn('flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium', relevanciaConfig.bg, relevanciaConfig.className)}>
            <RelevanciaIcon className="w-3 h-3" />
            Relevância {relevanciaConfig.label}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Ver detalhes</DropdownMenuItem>
            <DropdownMenuItem>Analisar com IA</DropdownMenuItem>
            <DropdownMenuItem>Iniciar workflow</DropdownMenuItem>
            <DropdownMenuItem>Baixar edital</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-primary mb-1">{licitacao.numero}</p>
            <h3 className="text-base font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
              {licitacao.objeto}
            </h3>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-muted-foreground">Valor estimado</p>
            <p className="text-lg font-bold text-foreground">{formatCurrency(licitacao.valor)}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1.5">
            <Building2 className="w-4 h-4" />
            <span className="truncate max-w-[150px]">{licitacao.orgao}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            <span>{new Date(licitacao.dataEncerramento).toLocaleDateString('pt-BR')}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {licitacao.modalidade}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {licitacao.portal}
            </Badge>
          </div>
          {diasRestantes > 0 ? (
            <span className={cn(
              'text-xs font-medium',
              diasRestantes <= 3 ? 'text-destructive' : diasRestantes <= 7 ? 'text-warning' : 'text-muted-foreground'
            )}>
              {diasRestantes} {diasRestantes === 1 ? 'dia' : 'dias'} restantes
            </span>
          ) : (
            <span className="text-xs font-medium text-destructive">Encerrado</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex border-t border-border">
        <Button
          variant="ghost"
          className="flex-1 rounded-none py-3 text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/5"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Ver Edital
        </Button>
        <div className="w-px bg-border" />
        <Button
          variant="ghost"
          className="flex-1 rounded-none py-3 text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/5"
        >
          Participar
        </Button>
      </div>
    </motion.div>
  );
}
