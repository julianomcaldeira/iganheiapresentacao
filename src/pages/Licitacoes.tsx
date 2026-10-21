import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { usePagination } from '@/hooks/usePagination';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { exportToExcel, exportToPDF } from '@/lib/exportUtils';
import { FilePreview } from '@/components/ui/file-preview';
import { LicitacaoPecasModal } from '@/components/licitacoes/LicitacaoPecasModal';
import { ColumnCustomizer, ColumnConfig, loadColumnsFromStorage, saveColumnsToStorage } from '@/components/licitacoes/ColumnCustomizer';
import { LicitacoesList, SortConfig } from '@/components/licitacoes/LicitacoesList';
import { ColumnFilterValue, EMPTY_COLUMN_FILTER, isColumnFilterActive } from '@/components/ui/column-filter-head';
import { LicitacaoEtapasTimeline } from '@/components/licitacoes/LicitacaoEtapasTimeline';
import { LicitacaoProcessFlow } from '@/components/licitacoes/LicitacaoProcessFlow';
import { ensureEtapasEmLote } from '@/lib/ensureEtapas';
import { popularProcessoLicitatorio, popularExemplosPendentes } from '@/lib/popularProcessoLicitatorio';
import { garantirDocumentosDeTodosOsClientes } from '@/lib/garantirDocumentosLicitacao';
import {
  simularOrganizacaoBase,
  aplicarOrganizacaoBase,
  type SimulacaoOrganizacao,
} from '@/lib/organizarBaseLicitacoes';
import { 
  Plus, Search, Trash2, Play, CheckCircle, Clock, AlertCircle, FileText, 
  Building2, Calendar, DollarSign, ChevronRight, X, Download, ThumbsUp, 
  ThumbsDown, Eye, ExternalLink, TrendingUp, TrendingDown, MoreVertical,
  Filter, Upload, Loader2, FileSpreadsheet, SlidersHorizontal, ChevronDown,
  Brain, Sparkles, RefreshCw, Maximize2, Minimize2, MessageCircle, Trophy, Users
} from 'lucide-react';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface AnaliseIA {
  conteudo: string;
  arquivos_analisados: string[];
  data_analise: string;
  modelo: string;
}

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
  uf_orgao?: string | null;
  workflow?: { nome: string };
  etapa_atual?: { nome: string; cor: string };
  cliente?: { nome: string };
  analise_ia?: AnaliseIA | null;
  analise_ia_status?: string | null;
  analise_ia_data?: string | null;
}

interface Etapa { id: string; nome: string; ordem: number; cor: string; prazo_dias: number | null; descricao: string | null; }
interface Campo { id: string; nome: string; label: string; tipo: string; obrigatorio: boolean; opcoes: string[] | null; valor_padrao: string | null; }
interface LicitacaoEtapa { id: string; etapa_id: string; status: string; }
interface Empresa { id: string; razao_social: string; cnpj: string; }
interface Produto { id: string; codigo: string; nome: string; unidade: string; preco: number; }
interface LicitacaoProduto { id: string; item_numero: number; descricao: string; unidade: string; quantidade: number; valor_unitario: number; valor_total: number; marca: string; }
interface Aprovacao { id: string; nome: string; tipo: string; aprovadores_minimos: number; }
interface LicitacaoAprovacao { id: string; aprovacao_config_id: string; status: string; comentario: string | null; aprovacao_config?: Aprovacao; }
interface DeclaracaoTemplate { id: string; nome: string; conteudo: string; }

import { STATUS_GERAL_LIST, getStatusConfig as getStatusConfigShared } from '@/lib/licitacaoStatus';

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos os Status', color: '' },
  ...STATUS_GERAL_LIST.map(s => ({ value: s.value, label: s.label, color: s.badgeClass })),
];

export default function LicitacoesPage() {
  const { profile, isAdmin } = useAuth();
  const [licitacoes, setLicitacoes] = useState<Licitacao[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [declaracaoTemplates, setDeclaracaoTemplates] = useState<DeclaracaoTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clienteFilter, setClienteFilter] = useState('all');
  const [resultadoFilter, setResultadoFilter] = useState<'all' | 'ganhos' | 'perdidos' | 'parciais' | 'sem_resultado'>('all');
  const [licitacoesResultados, setLicitacoesResultados] = useState<Record<string, { ganhos: number; perdidos: number; total: number }>>({});
  const [clientes, setClientes] = useState<{id: string; nome: string}[]>([]);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedLicitacao, setSelectedLicitacao] = useState<Licitacao | null>(null);
  const [licitacaoEtapas, setLicitacaoEtapas] = useState<LicitacaoEtapa[]>([]);
  const [workflowEtapas, setWorkflowEtapas] = useState<Etapa[]>([]);
  const [etapaCampos, setEtapaCampos] = useState<Campo[]>([]);
  const [etapaAprovacoes, setEtapaAprovacoes] = useState<Aprovacao[]>([]);
  const [licitacaoAprovacoes, setLicitacaoAprovacoes] = useState<LicitacaoAprovacao[]>([]);
  const [camposValores, setCamposValores] = useState<Record<string, string>>({});
  const [selectedEtapaId, setSelectedEtapaId] = useState<string | null>(null);
  const [populando, setPopulando] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const autoPopularRef = useRef(false);
  const [showOrganizarDialog, setShowOrganizarDialog] = useState(false);
  const [simulacao, setSimulacao] = useState<SimulacaoOrganizacao | null>(null);
  const [organizando, setOrganizando] = useState(false);
  
  const [licitacaoProdutos, setLicitacaoProdutos] = useState<LicitacaoProduto[]>([]);
  const [showAddProduto, setShowAddProduto] = useState(false);
  const [newProduto, setNewProduto] = useState({ produto_id: '', descricao: '', unidade: 'UN', quantidade: '1', valor_unitario: '', marca: '' });
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [selectedAprovacao, setSelectedAprovacao] = useState<LicitacaoAprovacao | null>(null);
  const [approvalComment, setApprovalComment] = useState('');
  const [newLicitacao, setNewLicitacao] = useState({
    numero: '', objeto: '', orgao: '', modalidade: '', valor_estimado: '',
    data_abertura: '', data_encerramento: '', data_documento: '', data_retirada: '', data_visita: '', data_prazo: '',
    workflow_id: '', empresa_id: '', relevancia: 'media', portal: '',
    uasg: '', cidade_orgao: '', uf_orgao: '', endereco_orgao: '', telefone_orgao: '', site_orgao: '',
    processo: '', preco_edital: '', situacao: '', observacoes: '',
  });
  const [novoEditalFile, setNovoEditalFile] = useState<File | null>(null);
  const [uploadingNovoEdital, setUploadingNovoEdital] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, boolean>>({});
  const [arquivosUrls, setArquivosUrls] = useState<Record<string, string>>({});
  
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [analyzingLicitacao, setAnalyzingLicitacao] = useState<string | null>(null);
  const [columns, setColumns] = useState<ColumnConfig[]>(() => loadColumnsFromStorage('licitacoes-columns'));
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: null, direction: null });
  const [columnFilters, setColumnFilters] = useState<Record<string, ColumnFilterValue>>({});
  const [showPecasModal, setShowPecasModal] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    numero: '',
    objeto: '',
    orgao: '',
    modalidade: '',
    relevancia: 'all',
    uf: 'all',
    valorMin: '',
    valorMax: '',
    dataInicio: '',
    dataFim: ''
  });
  
  const [clienteKeywords, setClienteKeywords] = useState<{ positivas: string[]; negativas: string[] }>({ positivas: [], negativas: [] });
  
  // Dialog size presets
  type DialogSizePreset = 'md' | 'lg' | 'xl' | 'full';
  const [dialogSizePreset, setDialogSizePreset] = useState<DialogSizePreset>('xl');
  
  const dialogSizeConfig: Record<DialogSizePreset, { className: string; label: string }> = {
    md: { className: 'max-w-3xl h-[65vh]', label: 'M' },
    lg: { className: 'max-w-5xl h-[75vh]', label: 'G' },
    xl: { className: 'max-w-6xl h-[85vh]', label: 'XG' },
    full: {
      className: '!left-0 !top-0 !translate-x-0 !translate-y-0 !max-w-none w-screen h-screen rounded-none sm:rounded-none',
      label: 'Max'
    },
  };

  const isFullScreenDialog = dialogSizePreset === 'full';

  const ALLOWED_FILE_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ];
  const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'gif', 'webp'];
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  const MODALIDADES = ['Pregão Eletrônico', 'Pregão Presencial', 'Concorrência', 'Tomada de Preços', 'Convite', 'Leilão', 'Concurso', 'Dispensa', 'Inexigibilidade'];

  // Excel-style per-column filters: maps each column id to its string value
  const getColumnValue = useCallback((l: any, columnId: string): string => {
    const fmtDate = (d?: string | null) => d ? format(new Date(d), 'dd/MM/yyyy') : '';
    switch (columnId) {
      case 'status': return getStatusConfigShared(l.status).label;
      case 'situacao': return l.situacao_conlicitacao || '';
      case 'numero': return l.numero || '';
      case 'objeto': return l.objeto || '';
      case 'orgao': return l.orgao || '';
      case 'modalidade': return l.modalidade || '';
      case 'valor_estimado': return l.valor_estimado ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(l.valor_estimado) : '';
      case 'data_abertura': return fmtDate(l.data_abertura);
      case 'data_encerramento': return fmtDate(l.data_encerramento);
      case 'relevancia': return l.relevancia || '';
      case 'portal': return l.portal || '';
      case 'etapa_atual': return l.etapa_atual?.nome || '';
      case 'cliente': return l.cliente?.nome || '';
      default: return '';
    }
  }, []);

  const handleColumnFilterChange = useCallback((columnId: string, value: ColumnFilterValue) => {
    setColumnFilters(prev => ({ ...prev, [columnId]: value }));
  }, []);

  const activeColumnFilterCount = useMemo(
    () => Object.values(columnFilters).filter(isColumnFilterActive).length,
    [columnFilters]
  );

  const columnOptions = useMemo(() => {
    const optionColumns = ['status', 'situacao', 'numero', 'objeto', 'orgao', 'modalidade', 'valor_estimado', 'data_abertura', 'data_encerramento', 'relevancia', 'portal', 'etapa_atual', 'cliente'];
    const result: Record<string, string[]> = {};
    optionColumns.forEach(colId => {
      const values = new Set<string>();
      licitacoes.forEach(l => values.add(getColumnValue(l, colId)));
      result[colId] = Array.from(values).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    });
    return result;
  }, [licitacoes, getColumnValue]);

  const filteredLicitacoes = licitacoes.filter(l => {
    // Basic search
    const matchesSearch = searchTerm === '' || (l.numero + l.objeto + l.orgao).toLowerCase().includes(searchTerm.toLowerCase());

    // Per-column (Excel-style) filters
    const matchesColumns = Object.entries(columnFilters).every(([colId, filter]) => {
      if (!isColumnFilterActive(filter)) return true;
      const value = getColumnValue(l, colId).toLowerCase();
      if (filter.text.trim() !== '' && !value.includes(filter.text.trim().toLowerCase())) return false;
      if (filter.values.length > 0 && !filter.values.some(v => v.toLowerCase() === value)) return false;
      return true;
    });
    if (!matchesColumns) return false;
    const matchesStatus = statusFilter === 'all' || l.status === statusFilter;
    const matchesCliente = clienteFilter === 'all' || l.cliente_id === clienteFilter;
    
    // Advanced filters
    const matchesNumero = advancedFilters.numero === '' || l.numero.toLowerCase().includes(advancedFilters.numero.toLowerCase());
    const matchesObjeto = advancedFilters.objeto === '' || l.objeto.toLowerCase().includes(advancedFilters.objeto.toLowerCase());
    const matchesOrgao = advancedFilters.orgao === '' || l.orgao.toLowerCase().includes(advancedFilters.orgao.toLowerCase());
    const matchesModalidade = advancedFilters.modalidade === '' || l.modalidade?.toLowerCase().includes(advancedFilters.modalidade.toLowerCase());
    const matchesRelevancia = advancedFilters.relevancia === 'all' || l.relevancia === advancedFilters.relevancia;
    const matchesUf = advancedFilters.uf === 'all' || (l.uf_orgao || '').toUpperCase() === advancedFilters.uf;
    const valorMin = advancedFilters.valorMin ? parseFloat(advancedFilters.valorMin) : null;
    const valorMax = advancedFilters.valorMax ? parseFloat(advancedFilters.valorMax) : null;
    const matchesValor = (valorMin === null || (l.valor_estimado || 0) >= valorMin) && (valorMax === null || (l.valor_estimado || 0) <= valorMax);
    
    // Date range filter
    let matchesDateRange = true;
    if (advancedFilters.dataInicio && l.data_encerramento) {
      matchesDateRange = new Date(l.data_encerramento) >= new Date(advancedFilters.dataInicio);
    }
    if (advancedFilters.dataFim && l.data_encerramento && matchesDateRange) {
      matchesDateRange = new Date(l.data_encerramento) <= new Date(advancedFilters.dataFim);
    }
    
    // Resultado filter (itens ganhos/perdidos)
    let matchesResultado = true;
    if (resultadoFilter !== 'all') {
      const r = licitacoesResultados[l.id];
      if (resultadoFilter === 'sem_resultado') {
        matchesResultado = !r || r.total === 0;
      } else if (resultadoFilter === 'ganhos') {
        matchesResultado = !!r && r.ganhos > 0;
      } else if (resultadoFilter === 'perdidos') {
        matchesResultado = !!r && r.perdidos > 0;
      } else if (resultadoFilter === 'parciais') {
        matchesResultado = !!r && r.ganhos > 0 && r.perdidos > 0;
      }
    }

    return matchesSearch && matchesStatus && matchesCliente && matchesNumero && matchesObjeto && matchesOrgao && matchesModalidade && matchesRelevancia && matchesUf && matchesValor && matchesDateRange && matchesResultado;
  });

  // Sort filtered licitacoes
  const sortedLicitacoes = [...filteredLicitacoes].sort((a, b) => {
    if (!sortConfig.column || !sortConfig.direction) return 0;
    
    const column = sortConfig.column;
    const direction = sortConfig.direction === 'asc' ? 1 : -1;
    
    let aVal: any;
    let bVal: any;
    
    switch (column) {
      case 'numero':
        aVal = a.numero?.toLowerCase() || '';
        bVal = b.numero?.toLowerCase() || '';
        break;
      case 'objeto':
        aVal = a.objeto?.toLowerCase() || '';
        bVal = b.objeto?.toLowerCase() || '';
        break;
      case 'orgao':
        aVal = a.orgao?.toLowerCase() || '';
        bVal = b.orgao?.toLowerCase() || '';
        break;
      case 'modalidade':
        aVal = a.modalidade?.toLowerCase() || '';
        bVal = b.modalidade?.toLowerCase() || '';
        break;
      case 'valor_estimado':
        aVal = a.valor_estimado || 0;
        bVal = b.valor_estimado || 0;
        break;
      case 'data_abertura':
        aVal = a.data_abertura ? new Date(a.data_abertura).getTime() : 0;
        bVal = b.data_abertura ? new Date(b.data_abertura).getTime() : 0;
        break;
      case 'data_encerramento':
        aVal = a.data_encerramento ? new Date(a.data_encerramento).getTime() : 0;
        bVal = b.data_encerramento ? new Date(b.data_encerramento).getTime() : 0;
        break;
      case 'status':
        aVal = a.status?.toLowerCase() || '';
        bVal = b.status?.toLowerCase() || '';
        break;
      case 'relevancia':
        const relevanciaOrder: Record<string, number> = { alta: 3, media: 2, baixa: 1 };
        aVal = relevanciaOrder[a.relevancia] || 0;
        bVal = relevanciaOrder[b.relevancia] || 0;
        break;
      case 'portal':
        aVal = a.portal?.toLowerCase() || '';
        bVal = b.portal?.toLowerCase() || '';
        break;
      case 'cliente':
        aVal = a.cliente?.nome?.toLowerCase() || '';
        bVal = b.cliente?.nome?.toLowerCase() || '';
        break;
      default:
        return 0;
    }
    
    if (aVal < bVal) return -1 * direction;
    if (aVal > bVal) return 1 * direction;
    return 0;
  });

  const clearAdvancedFilters = () => {
    setAdvancedFilters({
      numero: '',
      objeto: '',
      orgao: '',
      modalidade: '',
      relevancia: 'all',
      uf: 'all',
      valorMin: '',
      valorMax: '',
      dataInicio: '',
      dataFim: ''
    });
  };

  const hasActiveFilters = advancedFilters.numero || advancedFilters.objeto || advancedFilters.orgao || advancedFilters.modalidade || advancedFilters.relevancia !== 'all' || advancedFilters.uf !== 'all' || advancedFilters.valorMin || advancedFilters.valorMax || advancedFilters.dataInicio || advancedFilters.dataFim;

  const handleExportExcel = () => {
    const exportData = filteredLicitacoes.map(l => ({
      numero: l.numero,
      objeto: l.objeto,
      orgao: l.orgao,
      modalidade: l.modalidade || '-',
      valor_estimado: l.valor_estimado,
      data_encerramento: l.data_encerramento,
      status: getStatusConfig(l.status).label,
      relevancia: l.relevancia === 'alta' ? 'Alta' : l.relevancia === 'media' ? 'Média' : 'Baixa',
      etapa: l.etapa_atual?.nome || '-',
      cliente: l.cliente?.nome || '-'
    }));

    exportToExcel({
      filename: `licitacoes_${format(new Date(), 'yyyy-MM-dd')}`,
      title: 'Licitações',
      columns: [
        { key: 'numero', label: 'Número' },
        { key: 'objeto', label: 'Objeto' },
        { key: 'orgao', label: 'Órgão' },
        { key: 'modalidade', label: 'Modalidade' },
        { key: 'valor_estimado', label: 'Valor Estimado', type: 'currency' },
        { key: 'data_encerramento', label: 'Encerramento', type: 'date' },
        { key: 'status', label: 'Status' },
        { key: 'relevancia', label: 'Relevância' },
        { key: 'etapa', label: 'Etapa Atual' },
        ...(isAdmin ? [{ key: 'cliente', label: 'Cliente' }] : [])
      ],
      data: exportData
    });
    toast.success('Arquivo Excel exportado com sucesso!');
  };

  const handleExportPDF = () => {
    const exportData = filteredLicitacoes.map(l => ({
      numero: l.numero,
      objeto: l.objeto.substring(0, 50) + (l.objeto.length > 50 ? '...' : ''),
      orgao: l.orgao,
      valor_estimado: l.valor_estimado,
      data_encerramento: l.data_encerramento,
      status: getStatusConfig(l.status).label
    }));

    exportToPDF({
      filename: `licitacoes_${format(new Date(), 'yyyy-MM-dd')}`,
      title: 'Relatório de Licitações',
      columns: [
        { key: 'numero', label: 'Número' },
        { key: 'objeto', label: 'Objeto' },
        { key: 'orgao', label: 'Órgão' },
        { key: 'valor_estimado', label: 'Valor', type: 'currency' },
        { key: 'data_encerramento', label: 'Encerramento', type: 'date' },
        { key: 'status', label: 'Status' }
      ],
      data: exportData
    });
    toast.success('Arquivo PDF exportado com sucesso!');
  };
  
  const { currentPage, totalPages, paginatedItems, goToPage, itemsPerPage, startIndex, endIndex, totalItems } = usePagination({ items: sortedLicitacoes, itemsPerPage: 15 });

  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => { 
    fetchData(); 
  }, [profile?.cliente_id]);

  // Auto-open licitação from URL param ?id=xxx + apply filters from query string
  useEffect(() => {
    const openId = searchParams.get('id');
    if (openId && licitacoes.length > 0 && !selectedLicitacao) {
      const found = licitacoes.find(l => l.id === openId);
      if (found) {
        fetchLicitacaoDetail(found);
        setShowDetailDialog(true);
        searchParams.delete('id');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [licitacoes, searchParams]);

  // Apply incoming filters from query params (?status=, ?relevancia=, ?data_de=, ?data_ate=, ?cliente=, ?valor_min=, ?valor_max=)
  useEffect(() => {
    const statusQ = searchParams.get('status');
    if (statusQ) setStatusFilter(statusQ);
    const clienteQ = searchParams.get('cliente');
    if (clienteQ && isAdmin) setClienteFilter(clienteQ);
    const relQ = searchParams.get('relevancia');
    const numQ = searchParams.get('numero') || '';
    const objQ = searchParams.get('objeto') || '';
    const orgQ = searchParams.get('orgao') || '';
    const modQ = searchParams.get('modalidade') || '';
    const deQ = searchParams.get('data_de') || '';
    const ateQ = searchParams.get('data_ate') || '';
    if (relQ || numQ || objQ || orgQ || modQ || deQ || ateQ) {
      setShowAdvancedSearch(true);
      setAdvancedFilters(prev => ({
        ...prev,
        numero: numQ,
        objeto: objQ,
        orgao: orgQ,
        modalidade: modQ,
        relevancia: relQ || 'all',
        dataInicio: deQ,
        dataFim: ateQ,
      }));
    }
  }, [searchParams, isAdmin]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (!profile?.cliente_id && !isAdmin) {
        setLoading(false);
        return;
      }
      
      const clienteId = profile?.cliente_id;
      
      // Build queries
      let licitacoesQuery = supabase
        .from('licitacoes')
        .select('*, workflow:licitacao_workflows(nome), etapa_atual:workflow_etapas!licitacoes_etapa_atual_id_fkey(nome, cor), cliente:clientes(nome)');
      
      let empresasQuery = supabase.from('empresas').select('id, razao_social, cnpj').eq('ativo', true);
      let produtosQuery = supabase.from('produtos').select('*').eq('ativo', true);
      let templatesQuery = supabase.from('declaracoes_templates').select('*').eq('ativo', true);
      
      // Apply cliente filter for non-admin users
      if (clienteId && !isAdmin) {
        licitacoesQuery = licitacoesQuery.eq('cliente_id', clienteId);
        empresasQuery = empresasQuery.eq('cliente_id', clienteId);
        produtosQuery = produtosQuery.eq('cliente_id', clienteId);
        templatesQuery = templatesQuery.eq('cliente_id', clienteId);
      }
      
      const [lRes, eRes, pRes, dRes] = await Promise.all([
        licitacoesQuery.order('created_at', { ascending: false }),
        empresasQuery,
        produtosQuery,
        templatesQuery,
      ]);
      
      if (lRes.data) setLicitacoes(lRes.data as unknown as Licitacao[]);
      if (eRes.data) setEmpresas(eRes.data);
      if (pRes.data) setProdutos(pRes.data as Produto[]);
      if (dRes.data) setDeclaracaoTemplates(dRes.data as DeclaracaoTemplate[]);

      // Load resultado itens para filtro de Ganhos/Perdidos
      const licIds = (lRes.data || []).map((l: any) => l.id);
      if (licIds.length > 0) {
        const { data: itensData } = await supabase
          .from('licitacao_resultado_itens')
          .select('licitacao_id, resultado')
          .in('licitacao_id', licIds);
        const agg: Record<string, { ganhos: number; perdidos: number; total: number }> = {};
        (itensData || []).forEach((it: any) => {
          if (!agg[it.licitacao_id]) agg[it.licitacao_id] = { ganhos: 0, perdidos: 0, total: 0 };
          agg[it.licitacao_id].total++;
          // aceita as duas grafias usadas no sistema: 'ganho'/'ganhou' e 'perdido'/'perdeu'
          if (it.resultado === 'ganho' || it.resultado === 'ganhou') agg[it.licitacao_id].ganhos++;
          if (it.resultado === 'perdido' || it.resultado === 'perdeu') agg[it.licitacao_id].perdidos++;
        });
        setLicitacoesResultados(agg);
      } else {
        setLicitacoesResultados({});
      }

      // Inicializa/completa a esteira de etapas das licitações
      // (usa só a config ativa do cliente; não inventa etapas)
      if (licIds.length > 0) {
        try {
          const pendentes = (lRes.data || []).map((l: any) => ({
            id: l.id,
            cliente_id: l.cliente_id as string | null,
          }));
          const report = await ensureEtapasEmLote(pendentes);
          console.info('[Etapas] Relatório de inicialização em lote:', {
            totalLicitacoes: pendentes.length,
            populadas: report.populadas.length,
            semConfig: report.semConfig.length,
            bloqueadas: report.bloqueadas,
            detalhe: report,
          });
          if (report.populadas.length > 0) {
            toast.success(
              `${report.populadas.length} licitação(ões) tiveram a esteira de etapas completada`
            );
          }
          if (report.semConfig.length > 0) {
            toast.warning(
              `${report.semConfig.length} licitação(ões) sem etapas ativas no cliente — configure em Clientes → Etapas & Regras`
            );
          }
          if (report.bloqueadas.length > 0) {
            toast.error(
              `${report.bloqueadas.length} licitação(ões) com falha de permissão ao gravar etapas (ver console)`
            );
          }
        } catch (e) {
          console.warn('[Etapas] Erro no batch de inicialização:', e);
        }
      }
      
      // Garante a listagem de documentos nas seções da aba Documentos
      // (CNDs, Atestados, Declarações, Outros) para TODOS os clientes
      if (licIds.length > 0) {
        try {
          const relDocs = await garantirDocumentosDeTodosOsClientes();
          console.info('[Documentos] Relatório:', {
            clientes: relDocs.clientes,
            licitacoes: relDocs.licitacoes,
            basePorCliente: relDocs.basePorCliente,
            documentosInseridos: relDocs.documentosInseridos,
            documentosReclassificados: relDocs.documentosReclassificados,
            etapasAtualizadas: relDocs.etapasAtualizadas,
            erros: relDocs.erros,
          });
          if (relDocs.documentosInseridos > 0 || relDocs.documentosReclassificados > 0 || relDocs.etapasAtualizadas > 0) {
            setRefreshToken((t) => t + 1);
          }
          if (relDocs.erros.length > 0) {
            console.warn('[Documentos] Erros:', relDocs.erros);
          }
        } catch (e) {
          console.warn('[Documentos] Erro ao garantir documentos:', e);
        }
      }

      // Load clientes for admin filter
      if (isAdmin) {
        const { data: clientesData } = await supabase.from('clientes').select('id, nome').eq('ativo', true);
        if (clientesData) setClientes(clientesData);
      }

      // Popula automaticamente as licitações de exemplo que ainda não
      // foram populadas (marcador: licitacao_analises.resultado.demo)
      const lista = (lRes.data || []) as Array<{ id: string; numero: string }>;
      if (lista.length > 0 && !autoPopularRef.current) {
        autoPopularRef.current = true;
        setPopulando(true);
        void popularExemplosPendentes(lista, profile?.id)
          .then((rel) => {
            if (rel.populadas.length === 0) return;
            console.info('[Popular Exemplo] Relatório automático:', rel);
            if (rel.erros.length > 0) {
              toast.error(
                `${rel.populadas.length} licitação(ões) populada(s) com ${rel.erros.length} erro(s). Veja o console.`
              );
            } else {
              toast.success(
                `${rel.populadas.length} licitação(ões) de exemplo populada(s) — ${rel.etapas} etapas, ${rel.perguntas} perguntas respondidas pela IA, ${rel.documentos} documentos`
              );
            }
            setRefreshToken((t) => t + 1);
          })
          .finally(() => {
            autoPopularRef.current = false;
            setPopulando(false);
          });
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
    setLoading(false);
  };


  /**
   * Organiza a base: distribui as licitações entre os clientes e garante
   * a estrutura mínima (etapas, templates de declaração, empresas).
   */
  const handleAbrirOrganizacao = async () => {
    setOrganizando(true);
    try {
      const sim = await simularOrganizacaoBase();
      setSimulacao(sim);
      setShowOrganizarDialog(true);
    } catch (e: any) {
      console.error('[Organizar Base] Erro na simulação:', e);
      toast.error(e?.message || 'Erro ao simular a organização da base');
    } finally {
      setOrganizando(false);
    }
  };

  const handleAplicarOrganizacao = async () => {
    if (!simulacao) return;
    setOrganizando(true);
    try {
      const rel = await aplicarOrganizacaoBase(simulacao);
      console.info('[Organizar Base] Relatório:', rel);
      setShowOrganizarDialog(false);
      setSimulacao(null);

      // base de documentos + exemplos para os clientes reorganizados
      const relDocs = await garantirDocumentosDeTodosOsClientes();
      console.info('[Organizar Base] Documentos:', relDocs);

      if (rel.erros.length > 0) {
        toast.error(
          `Base reorganizada (${rel.aplicadas} reatribuições) com ${rel.erros.length} erro(s) — ${rel.erros[0]}`
        );
      } else {
        toast.success(
          `Base reorganizada — ${rel.aplicadas} licit(ão) reatribuída(s), ${rel.etapasCriadas.length} cliente(s) com etapas, ${rel.templatesCriados.length} com templates, ${rel.empresasCriadas.length} com empresa`
        );
      }
      await fetchData();
      setRefreshToken((t) => t + 1);
    } catch (e: any) {
      console.error('[Organizar Base] Erro ao aplicar:', e);
      toast.error(e?.message || 'Erro ao reorganizar a base');
    } finally {
      setOrganizando(false);
    }
  };

  /**
   * Sincroniza a base de documentos (CNDs, Atestados, Declarações, Outros)
   * de TODOS os clientes da plataforma para as suas licitações.
   */
  const handleSincronizarBaseDocumentos = async () => {
    setPopulando(true);
    try {
      const rel = await garantirDocumentosDeTodosOsClientes();
      console.info('[Documentos] Sincronização de todos os clientes:', rel);
      if (rel.erros.length > 0) {
        toast.error(
          `Base sincronizada com ${rel.erros.length} erro(s) — ${rel.erros[0]}`
        );
      } else {
        toast.success(
          `Base sincronizada — ${rel.clientes} cliente(s), ${rel.licitacoes} licitação(ões), ${rel.documentosInseridos} documento(s) inserido(s), ${rel.documentosReclassificados} reclassificado(s)`
        );
      }
      setRefreshToken((t) => t + 1);
      await fetchData();
    } catch (e: any) {
      console.error('[Documentos] Erro ao sincronizar base:', e);
      toast.error(e?.message || 'Erro ao sincronizar a base de documentos');
    } finally {
      setPopulando(false);
    }
  };

  /**
   * Popula o Processo Licitatório com dados de exemplo (todas as etapas
   * ativas do cliente + conteúdo de apoio, incluindo as perguntas do
   * edital respondidas pela IA).
   */
  const handlePopularExemplo = async (licitacaoId?: string) => {
    const alvos = licitacaoId
      ? licitacoes.filter((l) => l.id === licitacaoId)
      : licitacoes;
    if (alvos.length === 0) {
      toast.error('Nenhuma licitação para popular');
      return;
    }
    setPopulando(true);
    try {
      const totais = { etapas: 0, perguntas: 0, tabelas: 0 };
      const secoes: Record<string, number> = {};
      const erros: string[] = [];
      for (const lic of alvos) {
        const rel = await popularProcessoLicitatorio(lic.id, profile?.id);
        totais.etapas += rel.etapasPopuladas.length;
        totais.perguntas += rel.perguntasRespondidas;
        totais.tabelas += Object.values(rel.tabelas).reduce((a, b) => a + b, 0);
        Object.entries(rel.documentosPorSecao || {}).forEach(([k, v]) => {
          secoes[k] = (secoes[k] || 0) + v;
        });
        erros.push(...rel.erros.map((e) => `${lic.numero}: ${e}`));
      }
      console.info('[Popular Exemplo] Relatório:', {
        alvos: alvos.length,
        ...totais,
        documentosPorSecao: secoes,
        erros,
      });
      if (erros.length > 0) {
        toast.error(`${erros.length} erro(s) ao popular. Veja o console.`);
      } else {
        toast.success(
          `${alvos.length} licitação(ões) populada(s) — ${totais.etapas} etapas, ${totais.perguntas} perguntas respondidas pela IA, ${secoes.cnd || 0} CNDs, ${secoes.atestado || 0} atestados, ${secoes.declaracao || 0} declarações, ${secoes.outro || 0} outros`
        );
      }
      await fetchData();
      // força a recarga da esteira e das abas (dados mudaram no banco)
      setRefreshToken((t) => t + 1);
      if (licitacaoId && selectedLicitacao?.id === licitacaoId) {
        await fetchLicitacaoDetail(selectedLicitacao);
      }
    } catch (e: any) {
      console.error('[Popular Exemplo] Erro:', e);
      toast.error(e?.message || 'Erro ao popular o processo licitatório');
    } finally {
      setPopulando(false);
    }
  };

  const fetchLicitacaoDetail = async (lic: Licitacao) => {    setSelectedLicitacao(lic);
    
    setSelectedEtapaId(null);
    
    const [eRes, leRes, pRes, kwRes] = await Promise.all([
      lic.workflow_id
        ? supabase.from('workflow_etapas').select('*').eq('workflow_id', lic.workflow_id).order('ordem')
        : Promise.resolve({ data: [] as unknown[] }),
      supabase.from('licitacao_etapas').select('*').eq('licitacao_id', lic.id),
      supabase.from('licitacao_produtos').select('*').eq('licitacao_id', lic.id).order('item_numero'),
      supabase.from('clientes').select('palavras_positivas, palavras_negativas').eq('id', lic.cliente_id).single(),
    ]);
    
    if (eRes.data) setWorkflowEtapas(eRes.data);
    if (leRes.data) setLicitacaoEtapas(leRes.data as LicitacaoEtapa[]);
    if (pRes.data) setLicitacaoProdutos(pRes.data as LicitacaoProduto[]);
    if (kwRes.data) setClienteKeywords({
      positivas: (kwRes.data.palavras_positivas as string[]) || [],
      negativas: (kwRes.data.palavras_negativas as string[]) || [],
    });
    setShowDetailDialog(true);
  };

  const highlightKeywords = (text: string): React.ReactNode[] => {
    if (!text) return [text];
    const allKeywords = [
      ...clienteKeywords.positivas.map(k => ({ word: k, type: 'positive' as const })),
      ...clienteKeywords.negativas.map(k => ({ word: k, type: 'negative' as const })),
    ].filter(k => k.word && k.word.length > 0);
    
    if (allKeywords.length === 0) return [text];

    const pattern = allKeywords.map(k => k.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const regex = new RegExp(`(${pattern})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) => {
      const match = allKeywords.find(k => k.word.toLowerCase() === part.toLowerCase());
      if (match) {
        return (
          <span
            key={i}
            className={match.type === 'positive' 
              ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300 px-1 rounded font-medium' 
              : 'bg-red-500/20 text-red-700 dark:text-red-300 px-1 rounded font-medium'
            }
          >
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  const fetchEtapaDetails = async (etapaId: string) => {
    setSelectedEtapaId(etapaId);
    const [cRes, aRes] = await Promise.all([
      supabase.from('workflow_campos').select('*').eq('etapa_id', etapaId).order('ordem'),
      supabase.from('workflow_aprovacoes').select('*').eq('etapa_id', etapaId),
    ]);
    if (cRes.data) setEtapaCampos(cRes.data.map((c: any) => ({ ...c, opcoes: Array.isArray(c.opcoes) ? c.opcoes : null })) as Campo[]);
    if (aRes.data) setEtapaAprovacoes(aRes.data);
    
    const le = licitacaoEtapas.find(l => l.etapa_id === etapaId);
    if (le) {
      const [vRes, laRes] = await Promise.all([
        supabase.from('licitacao_campos_valores').select('campo_id, valor').eq('licitacao_etapa_id', le.id),
        supabase.from('licitacao_aprovacoes').select('*, aprovacao_config:workflow_aprovacoes(*)').eq('licitacao_etapa_id', le.id),
      ]);
      if (vRes.data) {
        const v: Record<string, string> = {};
        vRes.data.forEach(x => v[x.campo_id] = x.valor || '');
        setCamposValores(v);
      }
      if (laRes.data) setLicitacaoAprovacoes(laRes.data as LicitacaoAprovacao[]);
    } else {
      setCamposValores({});
      setLicitacaoAprovacoes([]);
    }
  };

  const handleCreateLicitacao = async () => {
    if (!newLicitacao.numero || !newLicitacao.objeto || !newLicitacao.orgao) {
      toast.error('Preencha campos obrigatórios');
      return;
    }

    if (!profile?.cliente_id) {
      toast.error('Perfil sem cliente associado. Não é possível criar licitação.');
      return;
    }

    setUploadingNovoEdital(true);

    // Upload edital file if provided
    let editalUrl: string | null = null;
    if (novoEditalFile) {
      const allowed = ['application/pdf', 'application/zip', 'application/x-zip-compressed', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      const ext = novoEditalFile.name.split('.').pop()?.toLowerCase();
      const allowedExt = ['pdf', 'zip', 'doc', 'docx'];
      if (!allowed.includes(novoEditalFile.type) && !allowedExt.includes(ext || '')) {
        toast.error('Formato inválido. Use PDF, ZIP, DOC ou DOCX.');
        setUploadingNovoEdital(false);
        return;
      }
      const filePath = `${profile?.cliente_id}/manual/${Date.now()}-${novoEditalFile.name}`;
      const { error: upErr } = await supabase.storage.from('editais').upload(filePath, novoEditalFile);
      if (upErr) {
        toast.error('Erro ao enviar edital: ' + upErr.message);
        setUploadingNovoEdital(false);
        return;
      }
      const { data: signed } = await supabase.storage.from('editais').createSignedUrl(filePath, 60 * 60 * 24 * 365);
      editalUrl = signed?.signedUrl || null;
    }

    // Atribui automaticamente o primeiro workflow ativo do cliente (compatibilidade legada)
    let workflowId = newLicitacao.workflow_id || null;
    if (!workflowId) {
      const { data: wf } = await supabase
        .from('licitacao_workflows')
        .select('id')
        .eq('cliente_id', profile.cliente_id)
        .eq('ativo', true)
        .order('created_at')
        .limit(1)
        .maybeSingle();
      workflowId = wf?.id || null;
    }

    // Primeira etapa legada (compatibilidade com detalhe antigo)
    let primeiraEtapaId: string | null = null;
    if (workflowId) {
      const { data: pe } = await supabase
        .from('workflow_etapas')
        .select('id')
        .eq('workflow_id', workflowId)
        .order('ordem')
        .limit(1)
        .maybeSingle();
      primeiraEtapaId = pe?.id || null;
    }

    const { data, error } = await supabase.from('licitacoes').insert({
      cliente_id: profile.cliente_id,
      numero: newLicitacao.numero,
      objeto: newLicitacao.objeto,
      orgao: newLicitacao.orgao,
      modalidade: newLicitacao.modalidade || null,
      valor_estimado: newLicitacao.valor_estimado ? parseFloat(newLicitacao.valor_estimado) : null,
      preco_edital: newLicitacao.preco_edital ? parseFloat(newLicitacao.preco_edital) : null,
      data_abertura: newLicitacao.data_abertura || null,
      data_encerramento: newLicitacao.data_encerramento || null,
      data_documento: newLicitacao.data_documento || null,
      data_retirada: newLicitacao.data_retirada || null,
      data_visita: newLicitacao.data_visita || null,
      data_prazo: newLicitacao.data_prazo || null,
      workflow_id: workflowId,
      empresa_id: newLicitacao.empresa_id || null,
      etapa_atual_id: primeiraEtapaId,
      relevancia: newLicitacao.relevancia,
      portal: newLicitacao.portal || 'Manual',
      uasg: newLicitacao.uasg || null,
      cidade_orgao: newLicitacao.cidade_orgao || null,
      uf_orgao: newLicitacao.uf_orgao || null,
      endereco_orgao: newLicitacao.endereco_orgao || null,
      telefone_orgao: newLicitacao.telefone_orgao || null,
      site_orgao: newLicitacao.site_orgao || null,
      processo: newLicitacao.processo || null,
      situacao_conlicitacao: newLicitacao.situacao || null,
      observacoes: newLicitacao.observacoes || null,
      edital_url: editalUrl,
      status: 'pendente_analise',
      created_by: profile?.id
    }).select().single();

    if (error) {
      toast.error(error.message);
      setUploadingNovoEdital(false);
    } else {
      // Etapas legadas (compatibilidade com detalhe antigo)
      if (workflowId && data) {
        const { data: ae } = await supabase.from('workflow_etapas').select('id').eq('workflow_id', workflowId).order('ordem');
        if (ae && ae.length > 0) {
          await supabase.from('licitacao_etapas').insert(ae.map((e, i) => ({
            licitacao_id: data.id,
            etapa_id: e.id,
            status: i === 0 ? 'em_andamento' : 'pendente'
          })));
        }
      }
      // Etapas do novo modelo (LicitacaoProcessFlow / LicitacaoEtapasTimeline)
      await supabase.rpc('inicializar_etapas_licitacao', {
        p_licitacao_id: data.id,
        p_cliente_id: profile.cliente_id,
      });
      toast.success('Licitação criada! Status: Pendente de Análise');
      fetchData();
      setShowNewDialog(false);
      setNovoEditalFile(null);
      setUploadingNovoEdital(false);
      setNewLicitacao({
        numero: '', objeto: '', orgao: '', modalidade: '', valor_estimado: '',
        data_abertura: '', data_encerramento: '', data_documento: '', data_retirada: '', data_visita: '', data_prazo: '',
        workflow_id: '', empresa_id: '', relevancia: 'media', portal: '',
        uasg: '', cidade_orgao: '', uf_orgao: '', endereco_orgao: '', telefone_orgao: '', site_orgao: '',
        processo: '', preco_edital: '', situacao: '', observacoes: '',
      });
    }
  };

  const handleSaveCampos = async () => {
    if (!selectedLicitacao || !selectedEtapaId) return;
    let le = licitacaoEtapas.find(l => l.etapa_id === selectedEtapaId);
    if (!le) {
      const { data } = await supabase.from('licitacao_etapas').insert({
        licitacao_id: selectedLicitacao.id,
        etapa_id: selectedEtapaId,
        status: 'em_andamento'
      }).select().single();
      if (data) le = data as LicitacaoEtapa;
    }
    if (!le) return;
    
    for (const c of etapaCampos) {
      const v = camposValores[c.id] || null;
      const { data: ex } = await supabase.from('licitacao_campos_valores').select('id').eq('licitacao_etapa_id', le.id).eq('campo_id', c.id).maybeSingle();
      if (ex) await supabase.from('licitacao_campos_valores').update({ valor: v }).eq('id', ex.id);
      else if (v) await supabase.from('licitacao_campos_valores').insert({ licitacao_etapa_id: le.id, campo_id: c.id, valor: v });
    }
    toast.success('Campos salvos!');
  };

  const handleConcluirEtapa = async () => {
    if (!selectedLicitacao || !selectedEtapaId) return;
    const le = licitacaoEtapas.find(l => l.etapa_id === selectedEtapaId);
    if (!le) return;
    
    const faltando = etapaCampos.filter(c => c.obrigatorio && !camposValores[c.id]);
    if (faltando.length) {
      toast.error(`Preencha: ${faltando.map(c => c.label).join(', ')}`);
      return;
    }
    if (licitacaoAprovacoes.some(a => a.status === 'pendente')) {
      toast.error('Aprovações pendentes');
      return;
    }
    
    await supabase.from('licitacao_etapas').update({ status: 'concluida' }).eq('id', le.id);
    const cur = workflowEtapas.find(e => e.id === selectedEtapaId);
    if (cur) {
      const next = workflowEtapas.find(e => e.ordem === cur.ordem + 1);
      if (next) {
        const nle = licitacaoEtapas.find(l => l.etapa_id === next.id);
        if (nle) await supabase.from('licitacao_etapas').update({ status: 'em_andamento' }).eq('id', nle.id);
        await supabase.from('licitacoes').update({ etapa_atual_id: next.id, status: 'em_andamento' }).eq('id', selectedLicitacao.id);
      } else {
        await supabase.from('licitacoes').update({ status: 'finalizado' }).eq('id', selectedLicitacao.id);
      }
    }
    toast.success('Etapa concluída!');
    fetchLicitacaoDetail(selectedLicitacao);
    fetchData();
  };

  const handleAddProduto = async () => {
    if (!selectedLicitacao || !newProduto.descricao) {
      toast.error('Descrição obrigatória');
      return;
    }
    const q = parseFloat(newProduto.quantidade) || 1;
    const u = parseFloat(newProduto.valor_unitario) || 0;
    await supabase.from('licitacao_produtos').insert({
      licitacao_id: selectedLicitacao.id,
      item_numero: licitacaoProdutos.length + 1,
      descricao: newProduto.descricao,
      unidade: newProduto.unidade,
      quantidade: q,
      valor_unitario: u,
      valor_total: q * u,
      marca: newProduto.marca || null
    });
    const { data } = await supabase.from('licitacao_produtos').select('*').eq('licitacao_id', selectedLicitacao.id).order('item_numero');
    if (data) setLicitacaoProdutos(data as LicitacaoProduto[]);
    toast.success('Produto adicionado!');
    setShowAddProduto(false);
    setNewProduto({ produto_id: '', descricao: '', unidade: 'UN', quantidade: '1', valor_unitario: '', marca: '' });
  };

  const handleSolicitarAprovacao = async (ap: Aprovacao) => {
    const le = licitacaoEtapas.find(l => l.etapa_id === selectedEtapaId);
    if (!le) return;
    await supabase.from('licitacao_aprovacoes').insert({ licitacao_etapa_id: le.id, aprovacao_config_id: ap.id, status: 'pendente' });
    toast.success('Aprovação solicitada!');
    if (selectedEtapaId) fetchEtapaDetails(selectedEtapaId);
  };

  const handleResponderAprovacao = async (aprovado: boolean) => {
    if (!selectedAprovacao) return;
    await supabase.from('licitacao_aprovacoes').update({
      status: aprovado ? 'aprovado' : 'rejeitado',
      aprovador_id: profile?.id,
      comentario: approvalComment || null,
      data_resposta: new Date().toISOString()
    }).eq('id', selectedAprovacao.id);
    toast.success(aprovado ? 'Aprovado!' : 'Rejeitado!');
    setShowApprovalDialog(false);
    setSelectedAprovacao(null);
    setApprovalComment('');
    if (selectedEtapaId) fetchEtapaDetails(selectedEtapaId);
  };

  const generateDeclaracao = (t: DeclaracaoTemplate) => {
    if (!selectedLicitacao) return '';
    const emp = empresas.find(e => e.id === selectedLicitacao.empresa_id);
    return t.conteudo
      .replace(/{empresa_razao_social}/g, emp?.razao_social || '')
      .replace(/{empresa_cnpj}/g, emp?.cnpj || '')
      .replace(/{data_atual}/g, format(new Date(), 'dd/MM/yyyy'))
      .replace(/{licitacao_numero}/g, selectedLicitacao.numero)
      .replace(/{licitacao_orgao}/g, selectedLicitacao.orgao);
  };

  const generateProposta = () => {
    if (!selectedLicitacao || !licitacaoProdutos.length) return;
    const total = licitacaoProdutos.reduce((s, p) => s + (p.valor_total || 0), 0);
    const content = `PROPOSTA - ${selectedLicitacao.numero}\n\n${licitacaoProdutos.map(p => 
      `${p.item_numero}. ${p.descricao} - ${p.quantidade} ${p.unidade} x R$ ${p.valor_unitario?.toFixed(2)} = R$ ${p.valor_total?.toFixed(2)}`
    ).join('\n')}\n\nTOTAL: R$ ${total.toFixed(2)}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `proposta_${selectedLicitacao.numero}.txt`;
    a.click();
    toast.success('Proposta gerada!');
  };

  const getStatusConfig = (s: string) => getStatusConfigShared(s);

  const getRelevanciaConfig = (r: string) => ({
    alta: { label: 'Alta', icon: TrendingUp, color: 'text-emerald-500' },
    media: { label: 'Média', icon: Clock, color: 'text-yellow-500' },
    baixa: { label: 'Baixa', icon: TrendingDown, color: 'text-muted-foreground' }
  }[r] || { label: r, icon: Clock, color: 'text-muted-foreground' });

  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
  
  const getProgress = () => licitacaoEtapas.length ? Math.round((licitacaoEtapas.filter(l => l.status === 'concluida').length / workflowEtapas.length) * 100) : 0;

  const getDiasRestantes = (dataEnc: string) => {
    if (!dataEnc) return null;
    return Math.ceil((new Date(dataEnc).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  };

  const handleAnalyzeWithAI = async (lic: Licitacao) => {
    setAnalyzingLicitacao(lic.id);
    toast.info('Iniciando análise com IA...');
    
    try {
      const response = await supabase.functions.invoke('analyze-licitacao', {
        body: {
          licitacaoId: lic.id,
          licitacaoData: {
            numero: lic.numero,
            objeto: lic.objeto,
            orgao: lic.orgao,
            modalidade: lic.modalidade,
            valor_estimado: lic.valor_estimado,
            data_encerramento: lic.data_encerramento
          }
        }
      });
      
      if (response.error) {
        console.error('Error analyzing:', response.error);
        toast.error(response.error.message || 'Erro ao analisar licitação');
        return;
      }
      
      toast.success('Análise concluída com sucesso!');
      fetchData();
      
      // If viewing this licitacao in detail, update it
      if (selectedLicitacao?.id === lic.id) {
        const { data: updatedLic } = await supabase
          .from('licitacoes')
          .select('*, workflow:licitacao_workflows(nome), etapa_atual:workflow_etapas!licitacoes_etapa_atual_id_fkey(nome, cor), cliente:clientes(nome)')
          .eq('id', lic.id)
          .single();
        if (updatedLic) setSelectedLicitacao(updatedLic as unknown as Licitacao);
      }
    } catch (error) {
      console.error('Error analyzing:', error);
      toast.error('Erro ao analisar licitação');
    } finally {
      setAnalyzingLicitacao(null);
    }
  };

  if (loading) {
    return (
      <MainLayout title="Licitações" subtitle="Gerencie suas licitações">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!profile?.cliente_id && !isAdmin) {
    return (
      <MainLayout title="Licitações" subtitle="Gerencie suas licitações">
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold text-lg mb-2">Acesso Restrito</h3>
            <p className="text-muted-foreground">
              Você precisa estar vinculado a um cliente para acessar as licitações.
            </p>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Licitações" subtitle="Gerencie suas licitações">
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por número, objeto ou órgão..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                className="pl-10" 
              />
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-44">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        {opt.color && <span className={`w-2 h-2 rounded-full ${opt.color.split(' ')[0]}`} />}
                        {opt.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {isAdmin && clientes.length > 0 && (
                <Select value={clienteFilter} onValueChange={setClienteFilter}>
                  <SelectTrigger className="w-48">
                    <Building2 className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Clientes</SelectItem>
                    {clientes.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Select value={resultadoFilter} onValueChange={(v) => setResultadoFilter(v as typeof resultadoFilter)}>
                <SelectTrigger className="w-48">
                  <Trophy className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Resultado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os resultados</SelectItem>
                  <SelectItem value="ganhos">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Com itens ganhos
                    </span>
                  </SelectItem>
                  <SelectItem value="perdidos">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      Com itens perdidos
                    </span>
                  </SelectItem>
                  <SelectItem value="parciais">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      Parciais (ganhos + perdidos)
                    </span>
                  </SelectItem>
                  <SelectItem value="sem_resultado">Sem resultado registrado</SelectItem>
                </SelectContent>
              </Select>

              <Button 
                variant={showAdvancedSearch ? "secondary" : "outline"} 
                onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                className="relative"
              >
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Busca Avançada
                {hasActiveFilters && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full" />
                )}
              </Button>

              <ColumnCustomizer
                columns={columns}
                onColumnsChange={setColumns}
                storageKey="licitacoes-columns"
              />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Exportar
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportExcel}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Exportar Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportPDF}>
                    <FileText className="h-4 w-4 mr-2" />
                    Exportar PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" disabled={populando}>
                    {populando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                    Popular Exemplo
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handlePopularExemplo()}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Popular todas as licitações da lista
                  </DropdownMenuItem>
                  {selectedLicitacao && (
                    <DropdownMenuItem onClick={() => handlePopularExemplo(selectedLicitacao.id)}>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Popular {selectedLicitacao.numero}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleAbrirOrganizacao}>
                    <Users className="h-4 w-4 mr-2" />
                    Organizar base: distribuir licitações entre os clientes
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSincronizarBaseDocumentos}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sincronizar base de documentos (todos os clientes)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button onClick={() => setShowNewDialog(true)} data-page-new-action>
                <Plus className="h-4 w-4 mr-2" />Nova Licitação
              </Button>
            </div>
          </div>

          {/* Advanced Search Panel */}
          <Collapsible open={showAdvancedSearch} onOpenChange={setShowAdvancedSearch}>
            <CollapsibleContent>
              <Card className="border-dashed">
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Número</Label>
                      <Input
                        placeholder="Buscar por número..."
                        value={advancedFilters.numero}
                        onChange={e => setAdvancedFilters({...advancedFilters, numero: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Objeto</Label>
                      <Input
                        placeholder="Buscar por objeto..."
                        value={advancedFilters.objeto}
                        onChange={e => setAdvancedFilters({...advancedFilters, objeto: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Órgão</Label>
                      <Input
                        placeholder="Buscar por órgão..."
                        value={advancedFilters.orgao}
                        onChange={e => setAdvancedFilters({...advancedFilters, orgao: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Modalidade</Label>
                      <Select 
                        value={advancedFilters.modalidade} 
                        onValueChange={v => setAdvancedFilters({...advancedFilters, modalidade: v === 'all' ? '' : v})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          {MODALIDADES.map(m => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Relevância</Label>
                      <Select 
                        value={advancedFilters.relevancia} 
                        onValueChange={v => setAdvancedFilters({...advancedFilters, relevancia: v})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          <SelectItem value="alta">Alta</SelectItem>
                          <SelectItem value="media">Média</SelectItem>
                          <SelectItem value="baixa">Baixa</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">UF</Label>
                      <Select
                        value={advancedFilters.uf}
                        onValueChange={v => setAdvancedFilters({...advancedFilters, uf: v})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todas" />
                        </SelectTrigger>
                        <SelectContent className="max-h-72">
                          <SelectItem value="all">Todas</SelectItem>
                          {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => (
                            <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Valor Mín (R$)</Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={advancedFilters.valorMin}
                        onChange={e => setAdvancedFilters({...advancedFilters, valorMin: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Valor Máx (R$)</Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="Sem limite"
                        value={advancedFilters.valorMax}
                        onChange={e => setAdvancedFilters({...advancedFilters, valorMax: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Encerramento De</Label>
                      <Input
                        type="date"
                        value={advancedFilters.dataInicio}
                        onChange={e => setAdvancedFilters({...advancedFilters, dataInicio: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Encerramento Até</Label>
                      <Input
                        type="date"
                        value={advancedFilters.dataFim}
                        onChange={e => setAdvancedFilters({...advancedFilters, dataFim: e.target.value})}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button variant="ghost" onClick={clearAdvancedFilters} className="w-full">
                        <X className="h-4 w-4 mr-2" />
                        Limpar Filtros
                      </Button>
                    </div>
                  </div>
                  {hasActiveFilters && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-sm text-muted-foreground">
                        {filteredLicitacoes.length} licitação(ões) encontrada(s) com os filtros aplicados
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Indicador de filtros de coluna */}
        {activeColumnFilterCount > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {activeColumnFilterCount} filtro(s) de coluna ativo(s)
            </Badge>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setColumnFilters({})}>
              <X className="h-3 w-3 mr-1" />
              Limpar filtros de coluna
            </Button>
          </div>
        )}

        {/* Lista de Licitações */}
        <LicitacoesList
          licitacoes={paginatedItems}
          columns={columns}
          isAdmin={isAdmin}
          analyzingLicitacao={analyzingLicitacao}
          sortConfig={sortConfig}
          onSortChange={setSortConfig}
          onRowClick={fetchLicitacaoDetail}
          onViewClick={fetchLicitacaoDetail}
          onAnalyzeClick={handleAnalyzeWithAI}
          columnFilters={columnFilters}
          onColumnFilterChange={handleColumnFilterChange}
          columnOptions={columnOptions}
          onColumnResize={(columnId, width) => {
            const updated = columns.map(col => 
              col.id === columnId ? { ...col, width: `${width}px` } : col
            );
            setColumns(updated);
            saveColumnsToStorage('licitacoes-columns', updated);
          }}
          onColumnsReorder={(reordered) => {
            setColumns(reordered);
            saveColumnsToStorage('licitacoes-columns', reordered);
          }}
          formatCurrency={formatCurrency}
          getStatusConfig={getStatusConfig}
        />

        {filteredLicitacoes.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="font-medium">Nenhuma licitação encontrada</p>
              <p className="text-sm text-muted-foreground mt-1">As licitações aparecerão aqui quando forem importadas via API</p>
            </CardContent>
          </Card>
        )}

        <PaginationControls 
          currentPage={currentPage} 
          totalPages={totalPages} 
          onPageChange={goToPage} 
          startIndex={startIndex} 
          endIndex={endIndex} 
          totalItems={totalItems} 
          itemsPerPage={itemsPerPage} 
        />
      </div>

      {/* Dialog Organizar Base */}
      <Dialog open={showOrganizarDialog} onOpenChange={setShowOrganizarDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Organizar base de licitações</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Distribui as {simulacao?.totalLicitacoes ?? 0} licitações da base entre os{' '}
              {simulacao?.clientes.length ?? 0} clientes ativos, priorizando o encaixe pelas
              palavras-chave de cada cliente. Clientes que ficarem sem etapas, templates de
              declaração ou empresa também são completados.
            </p>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-2">
            {simulacao && (
              <>
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead className="text-right">Hoje</TableHead>
                        <TableHead className="text-right">Depois</TableHead>
                        <TableHead className="text-right">Reatribuições</TableHead>
                        <TableHead>Palavras-chave</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {simulacao.clientes.map((c) => {
                        const reatribuicoes = simulacao.mudancas.filter(
                          (m) => m.clienteNovo === c.nome
                        ).length;
                        return (
                          <TableRow key={c.id}>
                            <TableCell className="font-medium">
                              {c.nome}
                              {c.novas && (
                                <Badge variant="outline" className="ml-2 text-[10px]">
                                  novo
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">{c.licitacoesAtuais}</TableCell>
                            <TableCell className="text-right font-semibold">{c.alvo}</TableCell>
                            <TableCell className="text-right">
                              {reatribuicoes > 0 ? (
                                <span className="text-amber-600 font-medium">{reatribuicoes}</span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {c.palavras_positivas.length > 0
                                ? c.palavras_positivas.slice(0, 5).join(', ')
                                : 'sem palavras-chave'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {simulacao.mudancas.length > 0 && (
                  <div className="rounded-lg border">
                    <div className="p-3 border-b bg-muted/30">
                      <p className="text-sm font-semibold">
                        Reatribuições ({simulacao.mudancas.length})
                      </p>
                    </div>
                    <div className="max-h-56 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Licitação</TableHead>
                            <TableHead>Objeto</TableHead>
                            <TableHead>De</TableHead>
                            <TableHead>Para</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {simulacao.mudancas.map((m) => (
                            <TableRow key={m.licitacaoId}>
                              <TableCell className="font-mono text-xs">{m.numero}</TableCell>
                              <TableCell className="text-xs max-w-[280px] truncate">
                                {m.objeto}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {m.clienteAtual || '—'}
                              </TableCell>
                              <TableCell className="text-xs font-medium">{m.clienteNovo}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOrganizarDialog(false)} disabled={organizando}>
              Cancelar
            </Button>
            <Button onClick={handleAplicarOrganizacao} disabled={organizando}>
              {organizando ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Aplicando...
                </>
              ) : (
                <>
                  <Users className="h-4 w-4 mr-2" /> Aplicar organização
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Nova Licitação */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Nova Licitação</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
            {/* Identificação */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">Identificação</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Número / Edital *</Label>
                  <Input value={newLicitacao.numero} onChange={e => setNewLicitacao({...newLicitacao, numero: e.target.value})} />
                </div>
                <div>
                  <Label>Processo</Label>
                  <Input value={newLicitacao.processo} onChange={e => setNewLicitacao({...newLicitacao, processo: e.target.value})} />
                </div>
                <div>
                  <Label>Modalidade</Label>
                  <Input value={newLicitacao.modalidade} onChange={e => setNewLicitacao({...newLicitacao, modalidade: e.target.value})} placeholder="Ex: Pregão Eletrônico" />
                </div>
                <div>
                  <Label>Portal</Label>
                  <Input value={newLicitacao.portal} onChange={e => setNewLicitacao({...newLicitacao, portal: e.target.value})} placeholder="Ex: ComprasNet" />
                </div>
                <div>
                  <Label>Situação</Label>
                  <Input value={newLicitacao.situacao} onChange={e => setNewLicitacao({...newLicitacao, situacao: e.target.value})} placeholder="Ex: Aberta" />
                </div>
              </div>
              <div className="mt-4">
                <Label>Objeto *</Label>
                <Textarea value={newLicitacao.objeto} onChange={e => setNewLicitacao({...newLicitacao, objeto: e.target.value})} rows={3} />
              </div>
            </div>

            {/* Órgão */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">Órgão</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nome do Órgão *</Label>
                  <Input value={newLicitacao.orgao} onChange={e => setNewLicitacao({...newLicitacao, orgao: e.target.value})} />
                </div>
                <div>
                  <Label>UASG / Código</Label>
                  <Input value={newLicitacao.uasg} onChange={e => setNewLicitacao({...newLicitacao, uasg: e.target.value})} />
                </div>
                <div>
                  <Label>Cidade</Label>
                  <Input value={newLicitacao.cidade_orgao} onChange={e => setNewLicitacao({...newLicitacao, cidade_orgao: e.target.value})} />
                </div>
                <div>
                  <Label>UF</Label>
                  <Input value={newLicitacao.uf_orgao} onChange={e => setNewLicitacao({...newLicitacao, uf_orgao: e.target.value})} maxLength={2} />
                </div>
                <div className="col-span-2">
                  <Label>Endereço</Label>
                  <Input value={newLicitacao.endereco_orgao} onChange={e => setNewLicitacao({...newLicitacao, endereco_orgao: e.target.value})} />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input value={newLicitacao.telefone_orgao} onChange={e => setNewLicitacao({...newLicitacao, telefone_orgao: e.target.value})} />
                </div>
                <div>
                  <Label>Site</Label>
                  <Input value={newLicitacao.site_orgao} onChange={e => setNewLicitacao({...newLicitacao, site_orgao: e.target.value})} />
                </div>
              </div>
            </div>

            {/* Datas e Valores */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">Datas e Valores</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data de Abertura</Label>
                  <Input type="datetime-local" value={newLicitacao.data_abertura} onChange={e => setNewLicitacao({...newLicitacao, data_abertura: e.target.value})} />
                </div>
                <div>
                  <Label>Data de Encerramento</Label>
                  <Input type="datetime-local" value={newLicitacao.data_encerramento} onChange={e => setNewLicitacao({...newLicitacao, data_encerramento: e.target.value})} />
                </div>
                <div>
                  <Label>Entrega de Documentação</Label>
                  <Input type="datetime-local" value={newLicitacao.data_documento} onChange={e => setNewLicitacao({...newLicitacao, data_documento: e.target.value})} />
                </div>
                <div>
                  <Label>Data de Retirada</Label>
                  <Input type="datetime-local" value={newLicitacao.data_retirada} onChange={e => setNewLicitacao({...newLicitacao, data_retirada: e.target.value})} />
                </div>
                <div>
                  <Label>Visita Técnica</Label>
                  <Input type="datetime-local" value={newLicitacao.data_visita} onChange={e => setNewLicitacao({...newLicitacao, data_visita: e.target.value})} />
                </div>
                <div>
                  <Label>Prazo Final</Label>
                  <Input type="datetime-local" value={newLicitacao.data_prazo} onChange={e => setNewLicitacao({...newLicitacao, data_prazo: e.target.value})} />
                </div>
                <div>
                  <Label>Valor Estimado (R$)</Label>
                  <Input type="number" step="0.01" value={newLicitacao.valor_estimado} onChange={e => setNewLicitacao({...newLicitacao, valor_estimado: e.target.value})} />
                </div>
                <div>
                  <Label>Preço do Edital (R$)</Label>
                  <Input type="number" step="0.01" value={newLicitacao.preco_edital} onChange={e => setNewLicitacao({...newLicitacao, preco_edital: e.target.value})} />
                </div>
              </div>
            </div>

            {/* Empresa e relevância */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">Configuração</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Empresa Participante</Label>
                  <Select value={newLicitacao.empresa_id} onValueChange={v => setNewLicitacao({...newLicitacao, empresa_id: v})}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{empresas.map(e => <SelectItem key={e.id} value={e.id}>{e.razao_social}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Relevância</Label>
                  <Select value={newLicitacao.relevancia} onValueChange={v => setNewLicitacao({...newLicitacao, relevancia: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="baixa">Baixa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-4">
                <Label>Observações</Label>
                <Textarea value={newLicitacao.observacoes} onChange={e => setNewLicitacao({...newLicitacao, observacoes: e.target.value})} rows={2} />
              </div>
            </div>

            {/* Edital upload */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">Edital</h4>
              <Label>Anexar arquivo do edital (PDF, ZIP, DOC, DOCX)</Label>
              <Input
                type="file"
                accept=".pdf,.zip,.doc,.docx,application/pdf,application/zip,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => setNovoEditalFile(e.target.files?.[0] || null)}
              />
              {novoEditalFile && (
                <p className="text-xs text-muted-foreground mt-2">
                  Selecionado: <span className="font-medium">{novoEditalFile.name}</span> ({(novoEditalFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              Após criada, a licitação entrará automaticamente como <span className="font-semibold text-foreground">Pendente de Análise</span> e seguirá o fluxo padrão configurado.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)} disabled={uploadingNovoEdital}>Cancelar</Button>
            <Button onClick={handleCreateLicitacao} disabled={uploadingNovoEdital}>
              {uploadingNovoEdital ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Criando...</> : 'Criar Licitação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Detalhe da Licitação */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent 
          className={cn(
            "overflow-hidden flex flex-col p-0 gap-0",
            dialogSizeConfig[dialogSizePreset].className
          )}
        >
          {selectedLicitacao && (
            <>
              {/* Header */}
              <div className="p-6 border-b bg-muted/30">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                     <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge className={getStatusConfig(selectedLicitacao.status).color}>
                        {getStatusConfig(selectedLicitacao.status).label}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{selectedLicitacao.modalidade}</span>
                      {(() => {
                        const rel = (selectedLicitacao.relevancia || 'media') as 'alta' | 'media' | 'baixa';
                        const pct = rel === 'alta' ? 90 : rel === 'media' ? 60 : 30;
                        const label = rel === 'alta' ? 'Alta' : rel === 'media' ? 'Média' : 'Baixa';
                        const cls = rel === 'alta'
                          ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                          : rel === 'media'
                          ? 'bg-amber-100 text-amber-700 border-amber-200'
                          : 'bg-gray-100 text-gray-600 border-gray-200';
                        const bar = rel === 'alta' ? 'bg-emerald-500' : rel === 'media' ? 'bg-amber-500' : 'bg-gray-400';
                        return (
                          <div className={cn('inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs font-semibold', cls)}>
                            <TrendingUp className="h-3.5 w-3.5" />
                            <span>Relevância {label}</span>
                            <div className="w-16 h-1.5 rounded-full bg-white/60 overflow-hidden">
                              <div className={cn('h-full rounded-full', bar)} style={{ width: `${pct}%` }} />
                            </div>
                            <span className="tabular-nums">{pct}%</span>
                          </div>
                        );
                      })()}
                    </div>
                    <h2 className="text-xl font-bold">{selectedLicitacao.numero}</h2>
                    <p className="text-sm text-muted-foreground line-clamp-2">{selectedLicitacao.objeto}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Building2 className="h-4 w-4" />{selectedLicitacao.orgao}</span>
                      {selectedLicitacao.valor_estimado && (
                        <span className="flex items-center gap-1"><DollarSign className="h-4 w-4" />{formatCurrency(selectedLicitacao.valor_estimado)}</span>
                      )}
                      {selectedLicitacao.data_encerramento && (
                        <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{format(new Date(selectedLicitacao.data_encerramento), 'dd/MM/yyyy HH:mm')}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePopularExemplo(selectedLicitacao.id)}
                      disabled={populando}
                      title="Preencher todas as etapas do processo com dados de exemplo"
                    >
                      {populando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                      Popular Exemplo
                    </Button>
                    {/* Size presets */}
                    <div className="flex items-center gap-1 border rounded-lg p-0.5 bg-muted/50">
                      {(Object.entries(dialogSizeConfig) as [DialogSizePreset, typeof dialogSizeConfig[DialogSizePreset]][]).map(([key, config]) => (
                        <button
                          key={key}
                          onClick={() => setDialogSizePreset(key)}
                          className={cn(
                            'px-2 py-1 text-xs font-medium rounded-md transition-colors',
                            dialogSizePreset === key 
                              ? 'bg-primary text-primary-foreground shadow-sm' 
                              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                          )}
                        >
                          {config.label}
                        </button>
                      ))}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground mb-1">Progresso</p>
                      <div className="flex items-center gap-2">
                        <Progress value={getProgress()} className="h-2 w-32" />
                        <span className="text-sm font-medium">{getProgress()}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Process Flow */}
              <div className={cn(isFullScreenDialog ? 'px-8 mt-4' : 'mx-6 mt-4')}>
                <LicitacaoProcessFlow
                  licitacaoId={selectedLicitacao.id}
                  clienteId={selectedLicitacao.cliente_id}
                  refreshToken={refreshToken}
                />
              </div>

              {/* Step-based content */}
              <div className={cn('flex-1 overflow-y-auto min-h-0', isFullScreenDialog ? 'px-8 py-4' : 'px-6 py-4')}>
                <LicitacaoEtapasTimeline
                  licitacaoId={selectedLicitacao.id}
                  clienteId={selectedLicitacao.cliente_id}
                  licitacaoData={{
                    numero: selectedLicitacao.numero,
                    objeto: selectedLicitacao.objeto,
                    orgao: selectedLicitacao.orgao,
                    modalidade: selectedLicitacao.modalidade,
                    valor_estimado: selectedLicitacao.valor_estimado,
                    data_encerramento: selectedLicitacao.data_encerramento,
                    data_abertura: selectedLicitacao.data_abertura,
                    relevancia: selectedLicitacao.relevancia,
                  }}
                  onRefresh={fetchData}
                  declaracaoTemplates={declaracaoTemplates}
                  generateDeclaracao={generateDeclaracao}
                  showChat={true}
                  refreshToken={refreshToken}
                />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Adicionar Produto */}
      <Dialog open={showAddProduto} onOpenChange={setShowAddProduto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Produto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Catálogo</Label>
              <Select onValueChange={v => {
                const p = produtos.find(x => x.id === v);
                if (p) setNewProduto({...newProduto, descricao: p.nome, unidade: p.unidade || 'UN', valor_unitario: p.preco?.toString() || ''});
              }}>
                <SelectTrigger><SelectValue placeholder="Buscar no catálogo..." /></SelectTrigger>
                <SelectContent>{produtos.map(p => <SelectItem key={p.id} value={p.id}>{p.codigo} - {p.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descrição *</Label>
              <Textarea value={newProduto.descricao} onChange={e => setNewProduto({...newProduto, descricao: e.target.value})} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Unid.</Label>
                <Input value={newProduto.unidade} onChange={e => setNewProduto({...newProduto, unidade: e.target.value})} />
              </div>
              <div>
                <Label>Qtd</Label>
                <Input type="number" value={newProduto.quantidade} onChange={e => setNewProduto({...newProduto, quantidade: e.target.value})} />
              </div>
              <div>
                <Label>Valor Unit.</Label>
                <Input type="number" step="0.01" value={newProduto.valor_unitario} onChange={e => setNewProduto({...newProduto, valor_unitario: e.target.value})} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddProduto(false)}>Cancelar</Button>
            <Button onClick={handleAddProduto}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Aprovação */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Responder Aprovação</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Comentário</Label>
            <Textarea value={approvalComment} onChange={e => setApprovalComment(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => handleResponderAprovacao(false)}>
              <ThumbsDown className="h-4 w-4 mr-2" />Rejeitar
            </Button>
            <Button onClick={() => handleResponderAprovacao(true)}>
              <ThumbsUp className="h-4 w-4 mr-2" />Aprovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>



      {/* Modal de Peças Jurídicas */}
      {selectedLicitacao && (
        <LicitacaoPecasModal
          open={showPecasModal}
          onOpenChange={setShowPecasModal}
          licitacaoId={selectedLicitacao.id}
          licitacaoNumero={selectedLicitacao.numero}
          clienteId={selectedLicitacao.cliente_id}
        />
      )}
    </MainLayout>
  );
}
