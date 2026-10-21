import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { NovoDocumentoDialog } from '@/components/documentos/NovoDocumentoDialog';
import { IDocumenteiPanel } from '@/components/documentos/IDocumenteiPanel';
import { Documento } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Search,
  Plus,
  FileCheck,
  FileX,
  AlertTriangle,
  Upload,
  Download,
  Eye,
  RefreshCw,
  Calendar,
  FileText,
  ExternalLink,
  Check,
  ChevronsUpDown,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  ColumnCustomizer,
  ColumnConfig,
  loadColumnsFromStorage,
} from '@/components/licitacoes/ColumnCustomizer';
import {
  SortableTableHead,
  SortState,
  compareValues,
  nextSortState,
} from '@/components/ui/sortable-table-head';

const DOCUMENTOS_DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'nome', label: 'Documento', visible: true, order: 0, width: '240px' },
  { id: 'tipo', label: 'Tipo', visible: true, order: 1, width: '140px' },
  { id: 'empresa', label: 'Empresa', visible: true, order: 2, width: '180px' },
  { id: 'dataEmissao', label: 'Emissão', visible: true, order: 3, width: '120px' },
  { id: 'dataVencimento', label: 'Vencimento', visible: true, order: 4, width: '180px' },
  { id: 'status', label: 'Status', visible: true, order: 5, width: '120px' },
  { id: 'acoes', label: 'Ações', visible: true, order: 6, width: '120px' },
];

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'valido':
      return { label: 'Válido', icon: FileCheck, className: 'bg-success/10 text-success border-success/20' };
    case 'vencido':
      return { label: 'Vencido', icon: FileX, className: 'bg-destructive/10 text-destructive border-destructive/20' };
    case 'proximo_vencimento':
      return { label: 'Vencendo', icon: AlertTriangle, className: 'bg-warning/10 text-warning border-warning/20' };
    default:
      return { label: status, icon: FileCheck, className: 'bg-muted text-muted-foreground' };
  }
};

const getDaysUntilExpiry = (date: string) => {
  const today = new Date();
  const expiry = new Date(date);
  const diffTime = expiry.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export default function Documentos() {
  const { profile, role } = useAuth();
  const isAdmin = role === 'admin';
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [tipoFilter, setTipoFilter] = useState('todos');
  const [empresaFilter, setEmpresaFilter] = useState('todos');
  const [empresaPopoverOpen, setEmpresaPopoverOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<Documento | null>(null);
  const [activeTab, setActiveTab] = useState('documentos');
  const [selectedClienteId, setSelectedClienteId] = useState<string>('');
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([]);
  const [empresas, setEmpresas] = useState<
    Array<{ id: string; cliente_id: string; razao_social: string; nome_fantasia: string | null; cnpj: string | null }>
  >([]);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [carregando, setCarregando] = useState(false);

  const effectiveClienteId = isAdmin ? selectedClienteId : profile?.cliente_id;

  useEffect(() => {
    if (isAdmin) {
      supabase.from('clientes').select('id, nome').eq('ativo', true).then(({ data }) => {
        if (data) {
          setClientes(data);
          if (data.length > 0 && !selectedClienteId) setSelectedClienteId(data[0].id);
        }
      });
    }
  }, [isAdmin]);

  /**
   * Carrega empresas REAIS do cliente e a base de documentos:
   * - CNDs do i-Documentei (por empresa);
   * - documentos do checklist das licitações do cliente (base de habilitação).
   */
  const carregarBase = async () => {
    if (!effectiveClienteId) {
      setEmpresas([]);
      setDocumentos([]);
      return;
    }
    setCarregando(true);
    try {
      const { data: emp } = await supabase
        .from('empresas')
        .select('id, cliente_id, razao_social, nome_fantasia, cnpj')
        .eq('cliente_id', effectiveClienteId)
        .eq('ativo', true)
        .order('razao_social');
      const listaEmpresas = (emp || []) as any[];
      setEmpresas(listaEmpresas);

      const empresaIds = listaEmpresas.map((e) => e.id);
      const { data: licitacoes } = await supabase
        .from('licitacoes')
        .select('id')
        .eq('cliente_id', effectiveClienteId);
      const licIds = (licitacoes || []).map((l: any) => l.id);

      const [idocRes, checklistRes] = await Promise.all([
        empresaIds.length > 0
          ? supabase
              .from('idocumentei_documentos')
              .select('id, empresa_id, tipo, nome, status, data_emissao, data_validade')
              .in('empresa_id', empresaIds)
          : Promise.resolve({ data: [], error: null } as any),
        licIds.length > 0
          ? supabase
              .from('licitacao_documentos_checklist')
              .select('id, licitacao_id, nome, categoria, status, data_validade, observacoes')
              .in('licitacao_id', licIds)
          : Promise.resolve({ data: [], error: null } as any),
      ]);

      const hoje = new Date();
      const statusDe = (validade: string | null, statusBruto?: string | null) => {
        if (statusBruto) {
          const s = statusBruto.toLowerCase();
          if (['vencida', 'vencido', 'expirado'].includes(s)) return 'vencido' as const;
          if (['processando', 'pendente', 'aguardando'].includes(s)) return 'vencido' as const;
        }
        if (!validade) return 'valido' as const;
        const dias = Math.ceil(
          (new Date(validade).getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (dias < 0) return 'vencido' as const;
        if (dias <= 30) return 'proximo_vencimento' as const;
        return 'valido' as const;
      };

      const docs: Documento[] = [];

      // CNDs do i-Documentei
      (idocRes.data || []).forEach((d: any) => {
        docs.push({
          id: d.id,
          nome: d.nome,
          tipo: d.tipo || 'CND',
          empresaId: d.empresa_id,
          dataEmissao: d.data_emissao || hoje.toISOString(),
          dataVencimento: d.data_validade || hoje.toISOString(),
          status: statusDe(d.data_validade, d.status),
        });
      });

      // Base de documentos do cliente (checklist das licitações)
      const vistos = new Set<string>();
      (checklistRes.data || []).forEach((d: any) => {
        const chave = `${d.nome}`.toLowerCase();
        if (vistos.has(chave)) return;
        vistos.add(chave);
        docs.push({
          id: d.id,
          nome: d.nome,
          tipo: d.categoria === 'cnd' ? 'CND' : d.categoria === 'atestado' ? 'Atestado' : d.categoria === 'declaracao' ? 'Declaração' : 'Outro',
          empresaId: listaEmpresas[0]?.id || '',
          dataEmissao: hoje.toISOString(),
          dataVencimento: d.data_validade || hoje.toISOString(),
          status: d.status === 'concluido' ? 'valido' : 'proximo_vencimento',
        });
      });

      setDocumentos(docs);
    } catch (e) {
      console.error('[Documentos] Erro ao carregar base:', e);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarBase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveClienteId]);

  const [columns, setColumns] = useState<ColumnConfig[]>(() =>
    loadColumnsFromStorage('documentos-columns', DOCUMENTOS_DEFAULT_COLUMNS)
  );
  const [sort, setSort] = useState<SortState>({ column: null, direction: null });

  const todasEmpresas = empresas.map((e) => ({
    id: e.id,
    nomeFantasia: e.nome_fantasia || e.razao_social,
    razaoSocial: e.razao_social,
    cnpj: e.cnpj,
  }));

  const tipos = [...new Set(documentos.map((d) => d.tipo))];

  const getEmpresaNomeById = (empresaId: string) => {
    const empresa = empresas.find((e) => e.id === empresaId);
    return empresa ? empresa.nome_fantasia || empresa.razao_social : 'N/A';
  };

  const filteredDocumentos = documentos.filter((doc) => {
    const matchesSearch =
      doc.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.tipo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'todos' || doc.status === statusFilter;
    const matchesTipo = tipoFilter === 'todos' || doc.tipo === tipoFilter;
    const matchesEmpresa = empresaFilter === 'todos' || doc.empresaId === empresaFilter;
    return matchesSearch && matchesStatus && matchesTipo && matchesEmpresa;
  });

  const sortedDocumentos = [...filteredDocumentos].sort((a, b) => {
    if (!sort.column || !sort.direction) return 0;
    const get = (d: typeof a): unknown => {
      switch (sort.column) {
        case 'nome': return d.nome;
        case 'tipo': return d.tipo;
        case 'empresa': return getEmpresaNomeById(d.empresaId);
        case 'dataEmissao': return d.dataEmissao;
        case 'dataVencimento': return d.dataVencimento;
        case 'status': return d.status;
        default: return null;
      }
    };
    return compareValues(get(a), get(b), sort.direction);
  });

  const stats = {
    total: documentos.length,
    validos: documentos.filter((d) => d.status === 'valido').length,
    vencidos: documentos.filter((d) => d.status === 'vencido').length,
    vencendo: documentos.filter((d) => d.status === 'proximo_vencimento').length,
  };

  const getEmpresaNome = getEmpresaNomeById;
  const handleSort = (columnId: string) => setSort(prev => nextSortState(prev, columnId));
  const visibleColumns = columns.filter(c => c.visible).sort((a, b) => a.order - b.order);

  return (
    <MainLayout title="Documentos" subtitle="Controle de certidões e atestados">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
          <TabsTrigger value="idocumentei">CNDs — i-Documentei</TabsTrigger>
        </TabsList>

        <TabsContent value="documentos">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-card border border-border shadow-sm"
        >
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-4 rounded-xl bg-success/10 border border-success/20 shadow-sm"
        >
          <p className="text-sm text-success">Válidos</p>
          <p className="text-2xl font-bold text-success">{stats.validos}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-4 rounded-xl bg-warning/10 border border-warning/20 shadow-sm"
        >
          <p className="text-sm text-warning">Vencendo</p>
          <p className="text-2xl font-bold text-warning">{stats.vencendo}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 shadow-sm"
        >
          <p className="text-sm text-destructive">Vencidos</p>
          <p className="text-2xl font-bold text-destructive">{stats.vencidos}</p>
        </motion.div>
      </div>

      {/* Toolbar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row gap-4 mb-6 p-4 rounded-xl bg-card border border-border shadow-sm"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar documentos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-secondary border-0"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <Popover open={empresaPopoverOpen} onOpenChange={setEmpresaPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={empresaPopoverOpen}
                className="w-[280px] justify-between bg-secondary border-0 font-normal"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Building2 className="w-4 h-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">
                    {empresaFilter === 'todos'
                      ? 'Todas as empresas'
                      : (() => {
                          const sel = todasEmpresas.find((e) => e.id === empresaFilter);
                          return sel ? sel.nomeFantasia || sel.razaoSocial : 'Empresa';
                        })()}
                  </span>
                </div>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[360px] p-0" align="start">
              <Command
                filter={(value, search) => {
                  if (!search) return 1;
                  return value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
                }}
              >
                <CommandInput placeholder="Buscar por nome ou CNPJ..." />
                <CommandList className="max-h-[320px]">
                  <CommandEmpty>Nenhuma empresa encontrada.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="todas as empresas"
                      onSelect={() => {
                        setEmpresaFilter('todos');
                        setEmpresaPopoverOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          empresaFilter === 'todos' ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      Todas as empresas
                    </CommandItem>
                    {todasEmpresas.map((emp) => {
                      const label = emp.nomeFantasia || emp.razaoSocial;
                      const searchValue = `${label} ${emp.razaoSocial || ''} ${emp.cnpj || ''}`.trim();
                      return (
                        <CommandItem
                          key={emp.id}
                          value={searchValue}
                          onSelect={() => {
                            setEmpresaFilter(emp.id);
                            setEmpresaPopoverOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4 shrink-0',
                              empresaFilter === emp.id ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="font-medium truncate">{label}</span>
                            {emp.cnpj && (
                              <span className="text-xs text-muted-foreground">
                                CNPJ: {emp.cnpj}
                              </span>
                            )}
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] bg-secondary border-0">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="valido">Válidos</SelectItem>
              <SelectItem value="proximo_vencimento">Vencendo</SelectItem>
              <SelectItem value="vencido">Vencidos</SelectItem>
            </SelectContent>
          </Select>

          <Select value={tipoFilter} onValueChange={setTipoFilter}>
            <SelectTrigger className="w-[180px] bg-secondary border-0">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              {tipos.map((tipo) => (
                <SelectItem key={tipo} value={tipo}>
                  {tipo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <ColumnCustomizer
            columns={columns}
            onColumnsChange={setColumns}
            storageKey="documentos-columns"
            defaultColumns={DOCUMENTOS_DEFAULT_COLUMNS}
            lockedColumns={['acoes']}
          />
          <Button variant="outline" size="icon" onClick={() => carregarBase()} disabled={carregando}>
            <RefreshCw className={cn('w-4 h-4', carregando && 'animate-spin')} />
          </Button>
          <Button
            className="gradient-primary text-primary-foreground shadow-glow"
            onClick={() => setDialogOpen(true)}
            data-page-new-action
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Documento
          </Button>
        </div>
      </motion.div>

      <NovoDocumentoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        empresas={todasEmpresas}
        onSuccess={() => carregarBase()}
      />

      {/* Preview Dialog */}
      <Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              {previewDoc?.nome}
            </DialogTitle>
          </DialogHeader>
          {previewDoc && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Tipo</p>
                  <p className="text-sm font-medium text-foreground">{previewDoc.tipo}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Empresa</p>
                  <p className="text-sm font-medium text-foreground">{getEmpresaNome(previewDoc.empresaId)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Data de Emissão</p>
                  <p className="text-sm font-medium text-foreground">
                    {new Date(previewDoc.dataEmissao).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Data de Vencimento</p>
                  <p className="text-sm font-medium text-foreground">
                    {new Date(previewDoc.dataVencimento).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Status</p>
                  {(() => {
                    const sc = getStatusConfig(previewDoc.status);
                    const Icon = sc.icon;
                    return (
                      <Badge variant="outline" className={cn('flex items-center gap-1 w-fit', sc.className)}>
                        <Icon className="w-3 h-3" />
                        {sc.label}
                      </Badge>
                    );
                  })()}
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Dias até Vencimento</p>
                  {(() => {
                    const days = getDaysUntilExpiry(previewDoc.dataVencimento);
                    return (
                      <p className={cn(
                        'text-sm font-medium',
                        days <= 0 ? 'text-destructive' : days <= 30 ? 'text-warning' : 'text-success'
                      )}>
                        {days <= 0 ? `Vencido há ${Math.abs(days)} dias` : `${days} dias restantes`}
                      </p>
                    );
                  })()}
                </div>
              </div>

              {previewDoc.arquivoUrl ? (
                <div className="border border-border rounded-lg overflow-hidden">
                  <iframe
                    src={previewDoc.arquivoUrl}
                    className="w-full h-[400px]"
                    title={previewDoc.nome}
                  />
                  <div className="flex justify-end p-2 bg-secondary/50 border-t border-border">
                    <Button variant="outline" size="sm" asChild>
                      <a href={previewDoc.arquivoUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Abrir em nova aba
                      </a>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 rounded-lg bg-secondary/30 border border-dashed border-border">
                  <FileText className="w-12 h-12 text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground font-medium">Nenhum arquivo anexado</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Faça upload de um arquivo para visualizá-lo aqui
                  </p>
                  <Button variant="outline" size="sm" className="mt-4">
                    <Upload className="w-4 h-4 mr-2" />
                    Anexar Arquivo
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl bg-card border border-border shadow-md overflow-hidden"
      >
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50">
              {visibleColumns.map(col => (
                <SortableTableHead
                  key={col.id}
                  columnId={col.id}
                  label={col.label}
                  sort={sort}
                  onSort={handleSort}
                  align={col.id === 'acoes' ? 'right' : 'left'}
                  sortable={col.id !== 'acoes'}
                  className={col.width ? `w-[${col.width}]` : undefined}
                />
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedDocumentos.map((doc, index) => {
              const statusConfig = getStatusConfig(doc.status);
              const StatusIcon = statusConfig.icon;
              const daysUntil = getDaysUntilExpiry(doc.dataVencimento);

              const renderCell = (colId: string) => {
                switch (colId) {
                  case 'nome':
                    return <TableCell key={colId} className="font-medium">{doc.nome}</TableCell>;
                  case 'tipo':
                    return (
                      <TableCell key={colId}>
                        <Badge variant="outline" className="text-xs">{doc.tipo}</Badge>
                      </TableCell>
                    );
                  case 'empresa':
                    return (
                      <TableCell key={colId} className="text-muted-foreground">
                        {getEmpresaNome(doc.empresaId)}
                      </TableCell>
                    );
                  case 'dataEmissao':
                    return (
                      <TableCell key={colId} className="text-muted-foreground">
                        {new Date(doc.dataEmissao).toLocaleDateString('pt-BR')}
                      </TableCell>
                    );
                  case 'dataVencimento':
                    return (
                      <TableCell key={colId}>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span>{new Date(doc.dataVencimento).toLocaleDateString('pt-BR')}</span>
                          {daysUntil <= 30 && daysUntil > 0 && (
                            <span className="text-xs text-warning">({daysUntil} dias)</span>
                          )}
                          {daysUntil <= 0 && (
                            <span className="text-xs text-destructive">(Vencido)</span>
                          )}
                        </div>
                      </TableCell>
                    );
                  case 'status':
                    return (
                      <TableCell key={colId}>
                        <Badge
                          variant="outline"
                          className={cn('flex items-center gap-1 w-fit', statusConfig.className)}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                    );
                  case 'acoes':
                    return (
                      <TableCell key={colId}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setPreviewDoc(doc)}
                            title="Visualizar documento"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Upload className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    );
                  default:
                    return null;
                }
              };

              return (
                <motion.tr
                  key={doc.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.03 * index }}
                  className="group hover:bg-secondary/30 transition-colors"
                >
                  {visibleColumns.map(col => renderCell(col.id))}
                </motion.tr>
              );
            })}
          </TableBody>
        </Table>
      </motion.div>

      {sortedDocumentos.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <FileCheck className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Nenhum documento encontrado
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Cadastre um novo documento ou ajuste os filtros de busca.
          </p>
        </motion.div>
       )}
        </TabsContent>

        <TabsContent value="idocumentei">
          {isAdmin && (
            <div className="mb-4">
              <label className="text-sm font-medium mb-1.5 block">Cliente</label>
              <Select value={selectedClienteId} onValueChange={setSelectedClienteId}>
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {effectiveClienteId ? (
            <IDocumenteiPanel clienteId={effectiveClienteId} />
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              {isAdmin ? 'Selecione um cliente acima.' : 'Nenhum cliente associado ao seu perfil.'}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
