import { motion } from 'framer-motion';
import { Calendar, Building2, TrendingUp, TrendingDown, Clock, Eye, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Licitacao {
  id: string;
  numero: string;
  objeto: string;
  orgao: string;
  modalidade: string;
  valor_estimado: number;
  data_encerramento: string;
  status: string;
  relevancia: string;
  etapa_atual?: { nome: string; cor: string };
  empresa?: { razao_social: string };
}

interface LicitacaoListItemProps {
  licitacao: Licitacao;
  index?: number;
  onClick?: () => void;
}

const getStatusConfig = (status: string) => {
  const configs: Record<string, { label: string; className: string }> = {
    nova: { label: 'Nova', className: 'bg-blue-100 text-blue-700 border-blue-200' },
    em_analise: { label: 'Em Análise', className: 'bg-amber-100 text-amber-700 border-amber-200' },
    rascunho: { label: 'Rascunho', className: 'bg-gray-100 text-gray-600 border-gray-200' },
    em_andamento: { label: 'Em Andamento', className: 'bg-blue-100 text-blue-700 border-blue-200' },
    participando: { label: 'Participando', className: 'bg-purple-100 text-purple-700 border-purple-200' },
    ganha: { label: 'Ganha', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    perdida: { label: 'Perdida', className: 'bg-red-100 text-red-700 border-red-200' },
    concluida: { label: 'Concluída', className: 'bg-green-100 text-green-700 border-green-200' },
    cancelada: { label: 'Cancelada', className: 'bg-gray-100 text-gray-500 border-gray-200' },
  };
  return configs[status] || configs.nova;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export function LicitacaoListItem({ licitacao, index = 0, onClick }: LicitacaoListItemProps) {
  const statusConfig = getStatusConfig(licitacao.status);

  const diasRestantes = licitacao.data_encerramento 
    ? Math.ceil((new Date(licitacao.data_encerramento).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <TooltipProvider delayDuration={300}>
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, delay: 0.02 * index }}
      onClick={onClick}
      className="group grid grid-cols-[110px_1fr_180px_150px_130px_140px_100px] items-center gap-4 px-5 py-4 bg-card border-b border-border hover:bg-accent/30 cursor-pointer transition-colors"
    >
      {/* Status Badge */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div>
            <span className={cn(
              'inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap',
              statusConfig.className
            )}>
              {statusConfig.label}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-sm px-4 py-3 text-base shadow-lg">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">Status</p>
          <p className="text-base font-semibold">{statusConfig.label}</p>
        </TooltipContent>
      </Tooltip>

      {/* Número, Objeto, Empresa */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="min-w-0 space-y-0.5">
            <p className="text-xs font-bold text-primary truncate">{licitacao.numero}</p>
            <p className="text-sm font-medium text-foreground truncate leading-tight">{licitacao.objeto}</p>
            {licitacao.empresa?.razao_social && (
              <p className="text-xs text-muted-foreground truncate">{licitacao.empresa.razao_social}</p>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-2xl px-4 py-3 text-base shadow-lg">
          <div className="space-y-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Número</p>
              <p className="text-base font-bold text-primary">{licitacao.numero}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Objeto</p>
              <p className="text-base leading-relaxed">{licitacao.objeto}</p>
            </div>
            {licitacao.empresa?.razao_social && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Empresa</p>
                <p className="text-sm">{licitacao.empresa.razao_social}</p>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>

      {/* Órgão */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 min-w-0">
            <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground truncate">{licitacao.orgao}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xl px-4 py-3 text-base shadow-lg">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">Órgão</p>
          <p className="text-base font-semibold leading-relaxed">{licitacao.orgao}</p>
        </TooltipContent>
      </Tooltip>

      {/* Valor */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="text-right">
            <p className="text-sm font-bold text-foreground whitespace-nowrap">
              {formatCurrency(licitacao.valor_estimado || 0)}
            </p>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="px-4 py-3 text-base shadow-lg">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">Valor estimado</p>
          <p className="text-lg font-bold">{formatCurrency(licitacao.valor_estimado || 0)}</p>
        </TooltipContent>
      </Tooltip>

      {/* Data e dias restantes */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex flex-col items-end gap-0.5">
            {licitacao.data_encerramento && (
              <>
                <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                  <Calendar className="w-3 h-3" />
                  {new Date(licitacao.data_encerramento).toLocaleDateString('pt-BR')}
                </div>
                {diasRestantes !== null && (
                  diasRestantes > 0 ? (
                    <span className={cn(
                      'text-xs font-medium whitespace-nowrap',
                      diasRestantes <= 3 ? 'text-red-500' : diasRestantes <= 7 ? 'text-amber-500' : 'text-muted-foreground'
                    )}>
                      {diasRestantes}d restantes
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-red-500 whitespace-nowrap">Encerrado</span>
                  )
                )}
              </>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="px-4 py-3 text-base shadow-lg">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">Data de encerramento</p>
          {licitacao.data_encerramento ? (
            <>
              <p className="text-base font-semibold">{new Date(licitacao.data_encerramento).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
              {diasRestantes !== null && (
                <p className="text-sm mt-1">
                  {diasRestantes > 0 ? `${diasRestantes} dia(s) restante(s)` : 'Prazo encerrado'}
                </p>
              )}
            </>
          ) : (
            <p className="text-base">Não definida</p>
          )}
        </TooltipContent>
      </Tooltip>

      {/* Etapa Atual */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex justify-end">
            {licitacao.etapa_atual ? (
              <span 
                className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap max-w-[130px] truncate"
                style={{ 
                  backgroundColor: `${licitacao.etapa_atual.cor}15`,
                  borderColor: `${licitacao.etapa_atual.cor}40`,
                  color: licitacao.etapa_atual.cor
                }}
              >
                {licitacao.etapa_atual.nome}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-sm px-4 py-3 text-base shadow-lg">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">Etapa atual</p>
          <p className="text-base font-semibold">{licitacao.etapa_atual?.nome || 'Sem etapa definida'}</p>
        </TooltipContent>
      </Tooltip>

      {/* Actions */}
      <div className="flex items-center justify-end gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
              onClick={(e) => { e.stopPropagation(); }}
            >
              {diasRestantes !== null && diasRestantes > 0 ? (
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-muted-foreground" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{diasRestantes !== null && diasRestantes > 0 ? 'Tendência positiva' : 'Tendência negativa'}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
              onClick={(e) => { e.stopPropagation(); onClick?.(); }}
            >
              <Eye className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Ver detalhes</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Ver detalhes</DropdownMenuItem>
                <DropdownMenuItem>Analisar com IA</DropdownMenuItem>
                <DropdownMenuItem>Baixar edital</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TooltipTrigger>
          <TooltipContent>
            <p>Mais ações</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </motion.div>
    </TooltipProvider>
  );
}
