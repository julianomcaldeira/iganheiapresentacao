import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Building2, Calendar, Eye, MoreVertical, Loader2,
  Star, ArrowUp, ArrowDown, ArrowUpDown, FileText, Sparkles
} from 'lucide-react';
import { format } from 'date-fns';
import { ColumnConfig } from './ColumnCustomizer';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ColumnFilterPopover, ColumnFilterValue, EMPTY_COLUMN_FILTER } from '@/components/ui/column-filter-head';

const COLUMN_DESCRIPTIONS: Record<string, string> = {
  status: 'Status geral da licitação no sistema (Pendente de Análise, Em Andamento, Finalizado ou Recusado).',
  situacao: 'Situação atual informada pela fonte oficial da licitação (ex.: aberta, suspensa, homologada).',
  numero: 'Número/identificador da licitação publicado pelo órgão.',
  objeto: 'Descrição completa do objeto que será contratado pela licitação.',
  orgao: 'Órgão público responsável pela publicação e condução da licitação.',
  modalidade: 'Modalidade da licitação (Pregão Eletrônico, Concorrência, Tomada de Preços etc.).',
  valor_estimado: 'Valor estimado/orçado pelo órgão para a contratação.',
  data_abertura: 'Data em que a licitação foi publicada/aberta para consulta.',
  data_encerramento: 'Data limite para envio de propostas ou abertura da sessão pública.',
  relevancia: 'Pontuação de relevância calculada pela IA com base nas regras do cliente.',
  portal: 'Portal eletrônico onde a licitação está sendo conduzida.',
  etapa_atual: 'Etapa atual do fluxo de trabalho interno em que a licitação se encontra.',
  cliente: 'Cliente da plataforma ao qual esta licitação pertence.',
  empresa: 'Empresa do cliente que está licitando (razão social / nome fantasia).',
  acoes: 'Ações disponíveis para esta licitação (visualizar, analisar com IA, etc.).',
};

interface Licitacao {
  id: string;
  numero: string;
  objeto: string;
  orgao: string;
  modalidade: string;
  valor_estimado: number;
  data_encerramento: string;
  data_abertura: string;
  status: string;
  relevancia: string;
  portal: string;
  workflow_id: string | null;
  etapa_atual_id: string | null;
  cliente_id: string;
  empresa_id: string | null;
  situacao_conlicitacao?: string | null;
  versao_atual?: number | null;
  ultima_atualizacao_conlicitacao?: string | null;
  ultimas_mudancas?: any;
  workflow?: { nome: string };
  etapa_atual?: { nome: string; cor: string };
  cliente?: { nome: string };
  empresa?: { razao_social: string; nome_fantasia: string | null } | null;
  analise_ia?: any;
  analise_ia_status?: string | null;
  analise_ia_data?: string | null;
}

export type SortDirection = 'asc' | 'desc' | null;

export interface SortConfig {
  column: string | null;
  direction: SortDirection;
}

interface LicitacoesListProps {
  licitacoes: Licitacao[];
  columns: ColumnConfig[];
  isAdmin: boolean;
  analyzingLicitacao: string | null;
  sortConfig?: SortConfig;
  onSortChange?: (config: SortConfig) => void;
  onRowClick: (lic: Licitacao) => void;
  onViewClick: (lic: Licitacao) => void;
  onAnalyzeClick: (lic: Licitacao) => void;
  onColumnResize?: (columnId: string, width: number) => void;
  onColumnsReorder?: (columns: ColumnConfig[]) => void;
  formatCurrency: (value: number) => string;
  getStatusConfig: (status: string) => { label: string; color: string };
  columnFilters?: Record<string, ColumnFilterValue>;
  onColumnFilterChange?: (columnId: string, value: ColumnFilterValue) => void;
  columnOptions?: Record<string, string[]>;
}

export function LicitacoesList({
  licitacoes,
  columns,
  isAdmin,
  analyzingLicitacao,
  sortConfig,
  onSortChange,
  onRowClick,
  onViewClick,
  onAnalyzeClick,
  onColumnResize,
  onColumnsReorder,
  formatCurrency,
  getStatusConfig,
  columnFilters = {},
  onColumnFilterChange,
  columnOptions = {}
}: LicitacoesListProps) {
  
  const { toast } = useToast();
  const [resumoDialog, setResumoDialog] = useState<{ open: boolean; titulo: string; conteudo: string; loading: boolean }>({
    open: false, titulo: '', conteudo: '', loading: false,
  });

  const visibleColumns = columns
    .filter(c => c.visible)
    .sort((a, b) => a.order - b.order);

  const handleResumoIA = async (lic: Licitacao) => {
    setResumoDialog({ open: true, titulo: `${lic.numero} - ${lic.objeto}`, conteudo: '', loading: true });
    
    const { data, error } = await supabase
      .from('licitacao_analises')
      .select('resultado')
      .eq('licitacao_id', lic.id)
      .eq('status', 'concluida')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data?.resultado) {
      setResumoDialog(prev => ({ ...prev, loading: false, conteudo: '' }));
      toast({ title: 'Nenhuma análise IA encontrada para esta licitação', variant: 'destructive' });
      return;
    }

    const resultado = data.resultado as any;
    setResumoDialog(prev => ({
      ...prev,
      loading: false,
      conteudo: resultado?.conteudo || 'Análise sem conteúdo disponível.',
    }));
  };

  const [resizing, setResizing] = useState<string | null>(null);
  const [draggedColId, setDraggedColId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const widths: Record<string, number> = {};
    columns.forEach(col => {
      widths[col.id] = parseInt(col.width || '150');
    });
    return widths;
  });

  // Keep local widths in sync when columns prop changes (e.g., after reload from storage)
  useEffect(() => {
    setColumnWidths(prev => {
      const next = { ...prev };
      let changed = false;
      columns.forEach(col => {
        const w = parseInt(col.width || '150');
        if (next[col.id] !== w && !resizing) {
          next[col.id] = w;
          changed = true;
        } else if (next[col.id] === undefined) {
          next[col.id] = w;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [columns, resizing]);

  const startX = useRef(0);
  const startWidth = useRef(0);
  const latestWidth = useRef(0);
  const tableRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent, columnId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setResizing(columnId);
    startX.current = e.clientX;
    startWidth.current = columnWidths[columnId] || 150;
    latestWidth.current = startWidth.current;

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - startX.current;
      const newWidth = Math.max(80, Math.min(500, startWidth.current + diff));
      latestWidth.current = newWidth;
      setColumnWidths(prev => ({ ...prev, [columnId]: newWidth }));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      setResizing(null);

      if (onColumnResize) {
        // Use ref to avoid stale closure — guarantees latest width is persisted
        onColumnResize(columnId, latestWidth.current);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [columnWidths, onColumnResize]);

  const handleDoubleClick = useCallback((e: React.MouseEvent, columnId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!tableRef.current) return;

    // Find all cells in this column and measure their content
    const cells = tableRef.current.querySelectorAll(`[data-column-id="${columnId}"]`);
    let maxWidth = 80; // Minimum width
    
    cells.forEach(cell => {
      const content = cell.querySelector('.cell-content');
      if (content) {
        const scrollWidth = (content as HTMLElement).scrollWidth;
        maxWidth = Math.max(maxWidth, scrollWidth + 24); // Add padding
      }
    });

    // Also check header width
    const header = tableRef.current.querySelector(`[data-header-id="${columnId}"]`);
    if (header) {
      const headerWidth = (header as HTMLElement).scrollWidth + 32;
      maxWidth = Math.max(maxWidth, headerWidth);
    }

    // Clamp to reasonable bounds
    maxWidth = Math.min(400, maxWidth);

    setColumnWidths(prev => ({ ...prev, [columnId]: maxWidth }));
    
    if (onColumnResize) {
      onColumnResize(columnId, maxWidth);
    }
  }, [onColumnResize]);

  // Column drag-and-drop reorder handlers
  const handleColDragStart = useCallback((e: React.DragEvent, colId: string) => {
    if (resizing) return;
    setDraggedColId(colId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/column-id', colId);
  }, [resizing]);

  const handleColDragOver = useCallback((e: React.DragEvent, colId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedColId && colId !== draggedColId) {
      setDragOverColId(colId);
    }
  }, [draggedColId]);

  const handleColDrop = useCallback((e: React.DragEvent, dropColId: string) => {
    e.preventDefault();
    if (!draggedColId || draggedColId === dropColId || !onColumnsReorder) {
      setDraggedColId(null);
      setDragOverColId(null);
      return;
    }

    const allCols = [...columns].sort((a, b) => a.order - b.order);
    const dragIndex = allCols.findIndex(c => c.id === draggedColId);
    const dropIndex = allCols.findIndex(c => c.id === dropColId);

    if (dragIndex === -1 || dropIndex === -1) return;

    const [moved] = allCols.splice(dragIndex, 1);
    allCols.splice(dropIndex, 0, moved);
    const reordered = allCols.map((col, i) => ({ ...col, order: i }));

    onColumnsReorder(reordered);
    setDraggedColId(null);
    setDragOverColId(null);
  }, [draggedColId, columns, onColumnsReorder]);

  const handleColDragEnd = useCallback(() => {
    setDraggedColId(null);
    setDragOverColId(null);
  }, []);

  const getDiasRestantes = (date: string) => {
    if (!date) return null;
    const diff = new Date(date).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getTableMinWidth = () => {
    return visibleColumns.reduce((acc, col) => {
      return acc + (columnWidths[col.id] || parseInt(col.width || '150'));
    }, 0);
  };

  const renderCell = (lic: Licitacao, columnId: string) => {
    const st = getStatusConfig(lic.status);
    const dias = getDiasRestantes(lic.data_encerramento);

    switch (columnId) {
      case 'status':
        return <Badge className={`shrink-0 whitespace-nowrap ${st.color}`}>{st.label}</Badge>;

      case 'situacao': {
        const sit = lic.situacao_conlicitacao;
        if (!sit) return <span className="text-xs text-muted-foreground">—</span>;
        return (
          <Badge variant="outline" className="text-xs whitespace-nowrap font-medium">
            {sit}
          </Badge>
        );
      }

      case 'numero': {
        // Badge "Atualizada" se houve mudança nos últimos 7 dias
        const isUpdated =
          (lic.versao_atual || 1) > 1 &&
          lic.ultima_atualizacao_conlicitacao &&
          (Date.now() - new Date(lic.ultima_atualizacao_conlicitacao).getTime()) < 7 * 24 * 60 * 60 * 1000;
        const totalMudancas = Array.isArray(lic.ultimas_mudancas) ? lic.ultimas_mudancas.length : 0;
        return (
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-sm font-bold text-primary whitespace-nowrap">{lic.numero}</p>
              {isUpdated && (
                <Badge
                  className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-[10px] h-4 px-1.5 font-medium"
                  title={totalMudancas > 0 ? `${totalMudancas} campo(s) alterado(s)` : 'Atualizada recentemente'}
                >
                  ⟳ Atualizada{totalMudancas > 0 ? ` (${totalMudancas})` : ''}
                </Badge>
              )}
            </div>
            {isAdmin && lic.cliente && (
              <p className="text-xs text-muted-foreground truncate">{lic.cliente.nome}</p>
            )}
          </div>
        );
      }
      
      case 'objeto':
        return (
          <p className="text-sm font-medium text-foreground line-clamp-2 leading-tight" title={lic.objeto}>
            {lic.objeto}
          </p>
        );
      
      case 'orgao':
        return (
          <div className="flex items-center gap-1.5 min-w-0">
            <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground truncate" title={lic.orgao}>{lic.orgao}</span>
          </div>
        );
      
      case 'modalidade':
        return (
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {lic.modalidade || '-'}
          </span>
        );
      
      case 'valor_estimado':
        return (
          <p className="text-sm font-bold text-foreground whitespace-nowrap text-right">
            {lic.valor_estimado ? formatCurrency(lic.valor_estimado) : '-'}
          </p>
        );
      
      case 'data_abertura':
        return (
          <div className="text-right">
            {lic.data_abertura ? (
              <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground whitespace-nowrap">
                <Calendar className="w-3 h-3" />
                {format(new Date(lic.data_abertura), 'dd/MM/yyyy')}
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">-</span>
            )}
          </div>
        );
      
      case 'data_encerramento':
        return (
          <div className="flex flex-col items-end gap-0.5">
            {lic.data_encerramento && (
              <>
                <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(lic.data_encerramento), 'dd/MM/yyyy')}
                </div>
                {dias !== null && (
                  dias > 0 ? (
                    <span className={`text-xs font-medium whitespace-nowrap ${dias <= 3 ? 'text-red-500' : dias <= 7 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                      {dias}d restantes
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-red-500 whitespace-nowrap">Encerrado</span>
                  )
                )}
              </>
            )}
          </div>
        );
      
      case 'relevancia':
        const relevanciaColors: Record<string, string> = {
          alta: 'text-emerald-500',
          media: 'text-amber-500',
          baixa: 'text-muted-foreground'
        };
        return (
          <div className="flex items-center gap-1 justify-end">
            <Star className={`w-4 h-4 ${relevanciaColors[lic.relevancia] || 'text-muted-foreground'}`} />
            <span className={`text-xs font-medium capitalize whitespace-nowrap ${relevanciaColors[lic.relevancia] || ''}`}>
              {lic.relevancia || '-'}
            </span>
          </div>
        );
      
      case 'portal':
        return (
          <span className="text-sm text-muted-foreground truncate">
            {lic.portal || '-'}
          </span>
        );
      
      case 'etapa_atual':
        return (
          <div className="flex justify-end">
            {lic.etapa_atual ? (
              <span 
                className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap truncate max-w-full"
                style={{ 
                  backgroundColor: `${lic.etapa_atual.cor}15`,
                  borderColor: `${lic.etapa_atual.cor}40`,
                  color: lic.etapa_atual.cor
                }}
                title={lic.etapa_atual.nome}
              >
                {lic.etapa_atual.nome}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </div>
        );
      
      case 'cliente':
        return (
          <span className="text-sm text-muted-foreground truncate" title={lic.cliente?.nome}>
            {lic.cliente?.nome || '-'}
          </span>
        );

      case 'empresa':
        return (
          <span
            className="text-sm text-muted-foreground truncate"
            title={lic.empresa?.razao_social}
          >
            {lic.empresa?.nome_fantasia || lic.empresa?.razao_social || '-'}
          </span>
        );
      
      case 'acoes':
        return (
          <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0 text-primary" 
              title="Resumo IA do Edital"
              onClick={() => handleResumoIA(lic)}
            >
              <Sparkles className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0" 
              title="Ver detalhes"
              onClick={() => onViewClick(lic)}
            >
              <Eye className="w-4 h-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onRowClick(lic)}>Ver detalhes</DropdownMenuItem>
                <DropdownMenuItem>Baixar edital</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onAnalyzeClick(lic)}
                  disabled={analyzingLicitacao === lic.id}
                >
                  {analyzingLicitacao === lic.id ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analisando...
                    </>
                  ) : (
                    <>Analisar com IA</>
                  )}
                </DropdownMenuItem>
                {lic.analise_ia && (
                  <DropdownMenuItem onClick={() => onViewClick(lic)}>
                    Ver Análise IA
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      
      default:
        return null;
    }
  };

  const getHeaderLabel = (columnId: string) => {
    const col = columns.find(c => c.id === columnId);
    return col?.label || columnId;
  };

  const getHeaderAlign = (columnId: string) => {
    const rightAligned = ['valor_estimado', 'data_encerramento', 'data_abertura', 'etapa_atual', 'acoes', 'relevancia'];
    return rightAligned.includes(columnId) ? 'text-right' : '';
  };

  const sortableColumns = ['numero', 'objeto', 'orgao', 'modalidade', 'valor_estimado', 'data_abertura', 'data_encerramento', 'status', 'relevancia', 'portal', 'cliente'];

  const handleSort = (columnId: string) => {
    if (!sortableColumns.includes(columnId) || !onSortChange) return;
    
    let newDirection: SortDirection = 'asc';
    if (sortConfig?.column === columnId) {
      if (sortConfig.direction === 'asc') newDirection = 'desc';
      else if (sortConfig.direction === 'desc') newDirection = null;
    }
    
    onSortChange({
      column: newDirection ? columnId : null,
      direction: newDirection
    });
  };

  const getSortIcon = (columnId: string) => {
    if (!sortableColumns.includes(columnId)) return null;
    
    if (sortConfig?.column === columnId) {
      if (sortConfig.direction === 'asc') {
        return <ArrowUp className="w-3 h-3 text-primary" />;
      }
      if (sortConfig.direction === 'desc') {
        return <ArrowDown className="w-3 h-3 text-primary" />;
      }
    }
    return <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />;
  };

  const getCellTooltipText = (lic: Licitacao, columnId: string): string => {
    const dias = getDiasRestantes(lic.data_encerramento);
    const fmtDate = (d?: string | null) =>
      d ? format(new Date(d), 'dd/MM/yyyy') : '—';
    switch (columnId) {
      case 'status':
        return getStatusConfig(lic.status).label;
      case 'situacao':
        return lic.situacao_conlicitacao || 'Sem situação informada';
      case 'numero':
        return lic.numero || '—';
      case 'objeto':
        return lic.objeto || '—';
      case 'orgao':
        return lic.orgao || '—';
      case 'modalidade':
        return lic.modalidade || '—';
      case 'valor_estimado':
        return lic.valor_estimado ? formatCurrency(lic.valor_estimado) : 'Não informado';
      case 'data_abertura':
        return fmtDate(lic.data_abertura);
      case 'data_encerramento':
        return `${fmtDate(lic.data_encerramento)}${
          dias !== null
            ? dias > 0
              ? ` • ${dias} dia(s) restante(s)`
              : ' • Prazo encerrado'
            : ''
        }`;
      case 'relevancia':
        return lic.relevancia ? `Relevância ${lic.relevancia}` : 'Sem relevância';
      case 'portal':
        return lic.portal || '—';
      case 'etapa_atual':
        return lic.etapa_atual?.nome || 'Sem etapa definida';
      case 'cliente':
        return lic.cliente?.nome || '—';
      case 'acoes':
        return 'Resumo IA, Ver detalhes ou Mais ações';
      default:
        return '—';
    }
  };

  const tableMinWidth = getTableMinWidth();

  return (
    <>
    <div className="rounded-lg border border-border bg-card overflow-hidden" ref={tableRef}>
      <ScrollArea className="w-full">
        <div style={{ minWidth: `${tableMinWidth}px` }}>
          {/* Header */}
          <div className="flex items-center bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <TooltipProvider delayDuration={300}>
            {visibleColumns.map((col, index) => (
              <div 
                key={col.id}
                data-header-id={col.id}
                draggable={col.id !== 'acoes' && !resizing}
                onDragStart={(e) => handleColDragStart(e, col.id)}
                onDragOver={(e) => handleColDragOver(e, col.id)}
                onDragLeave={() => setDragOverColId(null)}
                onDrop={(e) => handleColDrop(e, col.id)}
                onDragEnd={handleColDragEnd}
                className={`relative shrink-0 px-6 py-3 ${getHeaderAlign(col.id)} select-none group transition-all ${
                  sortableColumns.includes(col.id) ? 'cursor-pointer hover:bg-accent/50' : ''
                } ${col.id !== 'acoes' && !resizing ? 'cursor-grab active:cursor-grabbing' : ''} ${
                  draggedColId === col.id ? 'opacity-40 bg-primary/10' : ''
                } ${dragOverColId === col.id ? 'bg-primary/20 border-l-2 border-primary' : ''}`}
                style={{ width: `${columnWidths[col.id] || parseInt(col.width || '150')}px` }}
                onClick={() => !draggedColId && handleSort(col.id)}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={`flex items-center gap-1.5 ${getHeaderAlign(col.id) === 'text-right' ? 'justify-end' : ''}`}>
                      <span className="truncate">{getHeaderLabel(col.id)}</span>
                      {getSortIcon(col.id)}
                      {col.id !== 'acoes' && onColumnFilterChange && (
                        <ColumnFilterPopover
                          label={getHeaderLabel(col.id)}
                          options={columnOptions[col.id] || []}
                          filter={columnFilters[col.id] || EMPTY_COLUMN_FILTER}
                          onFilterChange={(value) => onColumnFilterChange(col.id, value)}
                        />
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs normal-case tracking-normal text-xs">
                    <p className="font-semibold mb-1">{getHeaderLabel(col.id)}</p>
                    <p className="text-muted-foreground">
                      {COLUMN_DESCRIPTIONS[col.id] || 'Coluna da listagem de licitações.'}
                    </p>
                  </TooltipContent>
                </Tooltip>
                
                {/* Resize Handle */}
                {index < visibleColumns.length - 1 && (
                  <div
                    className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize group hover:bg-primary/50 transition-colors ${
                      resizing === col.id ? 'bg-primary' : ''
                    }`}
                    onMouseDown={(e) => handleMouseDown(e, col.id)}
                    onDoubleClick={(e) => handleDoubleClick(e, col.id)}
                    title="Arraste para redimensionar, duplo-clique para ajustar ao conteúdo"
                  >
                    <div className="absolute inset-y-0 -left-1 -right-1" />
                  </div>
                )}
              </div>
            ))}
            </TooltipProvider>
          </div>
          
          {/* List Items */}
          <AnimatePresence>
            {licitacoes.map((lic, i) => (
              <motion.div
                key={lic.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15, delay: i * 0.02 }}
                className="flex items-center border-b border-border last:border-b-0 hover:bg-accent/30 cursor-pointer transition-colors"
                onClick={() => onRowClick(lic)}
              >
                <TooltipProvider delayDuration={400}>
                  {visibleColumns.map(col => (
                    <Tooltip key={col.id}>
                      <TooltipTrigger asChild>
                        <div
                          data-column-id={col.id}
                          className="shrink-0 px-6 py-5 overflow-hidden"
                          style={{ width: `${columnWidths[col.id] || parseInt(col.width || '150')}px` }}
                        >
                          <div className="cell-content">
                            {renderCell(lic, col.id)}
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        className="max-w-2xl px-4 py-3 shadow-lg"
                      >
                        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">
                          {getHeaderLabel(col.id)}
                        </p>
                        <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap break-words">
                          {getCellTooltipText(lic, col.id)}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </TooltipProvider>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>

    {/* Resumo IA Dialog */}
    <Dialog open={resumoDialog.open} onOpenChange={(open) => setResumoDialog(prev => ({ ...prev, open }))}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Resumo IA do Edital
          </DialogTitle>
          <p className="text-sm text-muted-foreground truncate">{resumoDialog.titulo}</p>
        </DialogHeader>
        {resumoDialog.loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Carregando resumo...</span>
          </div>
        ) : resumoDialog.conteudo ? (
          <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap text-sm leading-relaxed">
            {resumoDialog.conteudo}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhuma análise IA disponível para esta licitação.</p>
            <p className="text-xs mt-1">Execute a análise com IA primeiro através do menu de ações.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}
