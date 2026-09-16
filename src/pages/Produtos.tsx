import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Search,
  Plus,
  Package,
  Wrench,
  Edit,
  Trash2,
  Upload,
  Download,
  Loader2,
  Building2,
  ImagePlus,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/ui/pagination-controls';
import {
  ColumnCustomizer,
  ColumnConfig,
  loadColumnsFromStorage,
} from '@/components/licitacoes/ColumnCustomizer';
import {
  SortState,
  compareValues,
  nextSortState,
} from '@/components/ui/sortable-table-head';
import {
  ColumnFilterHead,
  ColumnFilterValue,
  EMPTY_COLUMN_FILTER,
} from '@/components/ui/column-filter-head';

const PRODUTOS_DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'codigo', label: 'Código', visible: true, order: 0, width: '120px' },
  { id: 'nome', label: 'Nome', visible: true, order: 1, width: '260px' },
  { id: 'cliente', label: 'Cliente', visible: true, order: 2, width: '180px' },
  { id: 'tipo', label: 'Tipo', visible: true, order: 3, width: '120px' },
  { id: 'unidade_negocio', label: 'Unidade de Negócio', visible: true, order: 4, width: '180px' },
  { id: 'unidade', label: 'Unidade', visible: true, order: 5, width: '100px' },
  { id: 'preco', label: 'Preço', visible: true, order: 6, width: '140px' },
  { id: 'acoes', label: 'Ações', visible: true, order: 7, width: '120px' },
];

interface Produto {
  id: string;
  cliente_id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  tipo: string;
  unidade_negocio: string | null;
  unidade: string | null;
  preco: number;
  imagem_url: string | null;
  ativo: boolean;
  created_at: string;
  cliente?: { nome: string };
}

interface Cliente {
  id: string;
  nome: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export default function Produtos() {
  const { profile, isAdmin } = useAuth();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState('todos');
  const [unidadeNegocioFilter, setUnidadeNegocioFilter] = useState('todos');
  const [clienteFilter, setClienteFilter] = useState('todos');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [columns, setColumns] = useState<ColumnConfig[]>(() =>
    loadColumnsFromStorage('produtos-columns', PRODUTOS_DEFAULT_COLUMNS)
  );
  const [sort, setSort] = useState<SortState>({ column: null, direction: null });
  const [columnFilters, setColumnFilters] = useState<Record<string, ColumnFilterValue>>({});

  const handleColumnFilterChange = (columnId: string, value: ColumnFilterValue) => {
    setColumnFilters(prev => ({ ...prev, [columnId]: value }));
  };
  const clearColumnFilters = () => setColumnFilters({});

  // Form state
  const [formData, setFormData] = useState({
    cliente_id: '',
    codigo: '',
    nome: '',
    descricao: '',
    tipo: 'produto',
    unidade_negocio: '',
    unidade: 'UN',
    preco: '',
  });

  // Fetch data
  useEffect(() => {
    fetchProdutos();
    if (isAdmin) {
      fetchClientes();
    }
  }, [isAdmin, profile]);

  const fetchProdutos = async () => {
    try {
      let query = supabase
        .from('produtos')
        .select('*, cliente:clientes(nome)')
        .eq('ativo', true)
        .order('nome');

      const { data, error } = await query;
      if (error) throw error;
      setProdutos(data || []);
    } catch (error) {
      console.error('Error fetching produtos:', error);
      toast.error('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  const fetchClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome');
      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error('Error fetching clientes:', error);
    }
  };

  // Get unique categories
  const unidadesNegocio = [...new Set(produtos.map((p) => p.unidade_negocio).filter(Boolean))];

  // Value of a product for a given column (used by per-column filters)
  const getColumnValue = (p: Produto, colId: string): string => {
    switch (colId) {
      case 'codigo': return p.codigo ?? '';
      case 'nome': return p.nome ?? '';
      case 'descricao': return p.descricao ?? '';
      case 'cliente': return p.cliente?.nome ?? '';
      case 'tipo': return p.tipo === 'servico' ? 'Serviço' : 'Produto';
      case 'unidade_negocio': return p.unidade_negocio ?? '';
      case 'unidade': return p.unidade ?? '';
      case 'preco': return formatCurrency(p.preco);
      default: return '';
    }
  };

  // Filter products
  const filteredProdutos = produtos.filter((produto) => {
    const matchesSearch =
      produto.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      produto.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (produto.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    const matchesTipo = tipoFilter === 'todos' || produto.tipo === tipoFilter;
    const matchesUnidadeNegocio = unidadeNegocioFilter === 'todos' || produto.unidade_negocio === unidadeNegocioFilter;
    const matchesCliente = !isAdmin || clienteFilter === 'todos' || produto.cliente_id === clienteFilter;
    const matchesColumnFilters = Object.entries(columnFilters).every(([colId, f]) => {
      if (!f) return true;
      const value = getColumnValue(produto, colId);
      if (f.text.trim() && !value.toLowerCase().includes(f.text.trim().toLowerCase())) return false;
      if (f.values.length > 0 && !f.values.includes(value)) return false;
      return true;
    });
    return matchesSearch && matchesTipo && matchesUnidadeNegocio && matchesCliente && matchesColumnFilters;
  });

  // Distinct values per column for the Excel-like value pickers
  const columnOptions = (colId: string): string[] =>
    [...new Set(produtos.map(p => getColumnValue(p, colId)))]
      .filter(v => v !== '')
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));

  const activeColumnFilters = Object.values(columnFilters).filter(
    f => f && (f.text.trim() !== '' || f.values.length > 0)
  ).length;

  // Sorting
  const sortedProdutos = [...filteredProdutos].sort((a, b) => {
    if (!sort.column || !sort.direction) return 0;
    const get = (p: Produto): unknown => {
      switch (sort.column) {
        case 'codigo': return p.codigo;
        case 'nome': return p.nome;
        case 'cliente': return p.cliente?.nome;
        case 'tipo': return p.tipo;
        case 'unidade_negocio': return p.unidade_negocio;
        case 'unidade': return p.unidade;
        case 'preco': return p.preco;
        default: return null;
      }
    };
    return compareValues(get(a), get(b), sort.direction);
  });

  const handleSort = (columnId: string) => setSort(prev => nextSortState(prev, columnId));
  const visibleColumns = columns
    .filter(c => c.visible)
    .filter(c => isAdmin || c.id !== 'cliente') // hide cliente column for non-admin
    .sort((a, b) => a.order - b.order);

  // Pagination
  const pagination = usePagination<Produto>({ items: sortedProdutos, itemsPerPage: 10 });

  // Stats
  const stats = {
    total: produtos.length,
    produtos: produtos.filter((p) => p.tipo === 'produto').length,
    servicos: produtos.filter((p) => p.tipo === 'servico').length,
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem válido');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem deve ter no máximo 5MB');
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;
    const clienteId = isAdmin ? formData.cliente_id : profile?.cliente_id;
    if (!clienteId) {
      toast.error('Cliente não definido para upload da imagem');
      return null;
    }
    setIsUploadingImage(true);
    try {
      const ext = imageFile.name.split('.').pop();
      const fileName = `${clienteId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      const { error } = await supabase.storage
        .from('produtos-imagens')
        .upload(fileName, imageFile);
      if (error) throw error;
      const { data: urlData } = supabase.storage
        .from('produtos-imagens')
        .getPublicUrl(fileName);
      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Erro ao fazer upload da imagem');
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleOpenDialog = (produto?: Produto) => {
    if (produto) {
      setSelectedProduto(produto);
      setFormData({
        cliente_id: produto.cliente_id,
        codigo: produto.codigo,
        nome: produto.nome,
        descricao: produto.descricao || '',
        tipo: produto.tipo,
        unidade_negocio: produto.unidade_negocio || '',
        unidade: produto.unidade || 'UN',
        preco: produto.preco.toString(),
      });
      setImagePreview(produto.imagem_url || null);
    } else {
      setSelectedProduto(null);
      setFormData({
        cliente_id: isAdmin ? '' : (profile?.cliente_id || ''),
        codigo: '',
        nome: '',
        descricao: '',
        tipo: 'produto',
        unidade_negocio: '',
        unidade: 'UN',
        preco: '',
      });
      setImagePreview(null);
    }
    setImageFile(null);
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.codigo.trim() || !formData.nome.trim()) {
      toast.error('Código e Nome são obrigatórios');
      return;
    }

    const clienteId = isAdmin ? formData.cliente_id : profile?.cliente_id;
    if (!clienteId) {
      toast.error('Selecione um cliente');
      return;
    }

    setIsSubmitting(true);
    try {
      let imagemUrl: string | null | undefined = undefined;
      if (imageFile) {
        imagemUrl = await uploadImage();
      } else if (imagePreview === null && selectedProduto?.imagem_url) {
        imagemUrl = null; // user removed the image
      }

      const produtoData: Record<string, any> = {
        cliente_id: clienteId,
        codigo: formData.codigo.trim(),
        nome: formData.nome.trim(),
        descricao: formData.descricao.trim() || null,
        tipo: formData.tipo,
        categoria: null,
        unidade_negocio: formData.unidade_negocio.trim() || null,
        unidade: formData.unidade.trim() || 'UN',
        preco: parseFloat(formData.preco) || 0,
      };
      if (imagemUrl !== undefined) {
        produtoData.imagem_url = imagemUrl;
      } else if (!selectedProduto && !imageFile) {
        produtoData.imagem_url = null;
      }

      if (selectedProduto) {
        const { error } = await supabase
          .from('produtos')
          .update(produtoData as any)
          .eq('id', selectedProduto.id);
        if (error) throw error;
        toast.success('Produto atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('produtos')
          .insert(produtoData as any);
        if (error) throw error;
        toast.success('Produto cadastrado com sucesso!');
      }

      setIsDialogOpen(false);
      fetchProdutos();
    } catch (error: any) {
      console.error('Error saving produto:', error);
      if (error.code === '23505') {
        toast.error('Código já existe para este cliente');
      } else {
        toast.error('Erro ao salvar produto');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProduto) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('produtos')
        .update({ ativo: false })
        .eq('id', selectedProduto.id);
      if (error) throw error;
      toast.success('Produto removido com sucesso!');
      setIsDeleteDialogOpen(false);
      setSelectedProduto(null);
      fetchProdutos();
    } catch (error) {
      console.error('Error deleting produto:', error);
      toast.error('Erro ao remover produto');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteDialog = (produto: Produto) => {
    setSelectedProduto(produto);
    setIsDeleteDialogOpen(true);
  };

  if (loading) {
    return (
      <MainLayout title="Produtos e Serviços" subtitle="Catálogo de itens oferecidos">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Produtos e Serviços" subtitle="Catálogo de itens oferecidos">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
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
          className="p-4 rounded-xl bg-primary/10 border border-primary/20 shadow-sm"
        >
          <p className="text-sm text-primary">Produtos</p>
          <p className="text-2xl font-bold text-primary">{stats.produtos}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-4 rounded-xl bg-info/10 border border-info/20 shadow-sm"
        >
          <p className="text-sm text-info">Serviços</p>
          <p className="text-2xl font-bold text-info">{stats.servicos}</p>
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
            placeholder="Buscar por código, nome ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-secondary border-0"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <Select value={tipoFilter} onValueChange={setTipoFilter}>
            <SelectTrigger className="w-[140px] bg-secondary border-0">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="produto">Produtos</SelectItem>
              <SelectItem value="servico">Serviços</SelectItem>
            </SelectContent>
          </Select>

          <Select value={unidadeNegocioFilter} onValueChange={setUnidadeNegocioFilter}>
            <SelectTrigger className="w-[200px] bg-secondary border-0">
              <SelectValue placeholder="Unidade de Negócio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas</SelectItem>
              {unidadesNegocio.map((un) => (
                <SelectItem key={un} value={un!}>
                  {un}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isAdmin && (
            <Select value={clienteFilter} onValueChange={setClienteFilter}>
              <SelectTrigger className="w-[220px] bg-secondary border-0">
                <SelectValue placeholder="Cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os clientes</SelectItem>
                {clientes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex gap-2">
          <ColumnCustomizer
            columns={columns}
            onColumnsChange={setColumns}
            storageKey="produtos-columns"
            defaultColumns={PRODUTOS_DEFAULT_COLUMNS}
            lockedColumns={['acoes']}
          />
          <Button variant="outline" size="icon">
            <Upload className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon">
            <Download className="w-4 h-4" />
          </Button>
          <Button
            className="gradient-primary text-primary-foreground shadow-glow"
            onClick={() => handleOpenDialog()}
            data-page-new-action
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Item
          </Button>
        </div>
      </motion.div>

      {activeColumnFilters > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary">
            {activeColumnFilters} filtro{activeColumnFilters > 1 ? 's' : ''} de coluna ativo{activeColumnFilters > 1 ? 's' : ''}
          </Badge>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={clearColumnFilters}>
            <X className="h-3 w-3 mr-1" />
            Limpar filtros
          </Button>
        </div>
      )}

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
                <ColumnFilterHead
                  key={col.id}
                  columnId={col.id}
                  label={col.label}
                  sort={sort}
                  onSort={handleSort}
                  options={col.id === 'acoes' ? [] : columnOptions(col.id)}
                  filter={columnFilters[col.id] ?? EMPTY_COLUMN_FILTER}
                  onFilterChange={handleColumnFilterChange}
                  align={col.id === 'acoes' || col.id === 'preco' ? 'right' : col.id === 'unidade' ? 'center' : 'left'}
                  sortable={col.id !== 'acoes'}
                  filterable={col.id !== 'acoes'}
                />
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagination.paginatedItems.map((produto, index) => {
              const renderCell = (colId: string) => {
                switch (colId) {
                  case 'codigo':
                    return <TableCell key={colId} className="font-mono text-sm">{produto.codigo}</TableCell>;
                  case 'nome':
                    return (
                      <TableCell key={colId}>
                        <div>
                          <p className="font-medium">{produto.nome}</p>
                          {produto.descricao && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {produto.descricao}
                            </p>
                          )}
                        </div>
                      </TableCell>
                    );
                  case 'cliente':
                    return (
                      <TableCell key={colId}>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-3 h-3 text-muted-foreground" />
                          <span className="text-sm">{produto.cliente?.nome}</span>
                        </div>
                      </TableCell>
                    );
                  case 'tipo':
                    return (
                      <TableCell key={colId}>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs capitalize',
                            produto.tipo === 'produto'
                              ? 'bg-primary/10 text-primary border-primary/20'
                              : 'bg-info/10 text-info border-info/20'
                          )}
                        >
                          {produto.tipo === 'produto' ? (
                            <Package className="w-3 h-3 mr-1" />
                          ) : (
                            <Wrench className="w-3 h-3 mr-1" />
                          )}
                          {produto.tipo}
                        </Badge>
                      </TableCell>
                    );
                  case 'unidade_negocio':
                    return (
                      <TableCell key={colId}>
                        {produto.unidade_negocio && (
                          <Badge variant="outline" className="text-xs">
                            {produto.unidade_negocio}
                          </Badge>
                        )}
                      </TableCell>
                    );
                  case 'unidade':
                    return <TableCell key={colId} className="text-center">{produto.unidade}</TableCell>;
                  case 'preco':
                    return (
                      <TableCell key={colId} className="text-right font-bold">
                        {formatCurrency(produto.preco)}
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
                            onClick={() => handleOpenDialog(produto)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => openDeleteDialog(produto)}
                          >
                            <Trash2 className="w-4 h-4" />
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
                  key={produto.id}
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

      {/* Pagination */}
      {filteredProdutos.length > 0 && (
        <div className="mt-4">
          <PaginationControls
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            onPageChange={pagination.goToPage}
            totalItems={pagination.totalItems}
            itemsPerPage={pagination.itemsPerPage}
            startIndex={pagination.startIndex}
            endIndex={pagination.endIndex}
          />
        </div>
      )}

      {filteredProdutos.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Package className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Nenhum item encontrado
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Cadastre um novo produto ou serviço ou ajuste os filtros de busca.
          </p>
        </motion.div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedProduto ? 'Editar Produto/Serviço' : 'Novo Produto/Serviço'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Client selector for admin */}
            {isAdmin && (
              <div className="space-y-2">
                <Label htmlFor="cliente">Cliente *</Label>
                <Select 
                  value={formData.cliente_id} 
                  onValueChange={(value) => setFormData({ ...formData, cliente_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((cliente) => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        {cliente.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="codigo">Código *</Label>
                <Input 
                  id="codigo" 
                  placeholder="PROD-XXX"
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo</Label>
                <Select 
                  value={formData.tipo}
                  onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="produto">Produto</SelectItem>
                    <SelectItem value="servico">Serviço</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input 
                id="nome" 
                placeholder="Nome do item"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea 
                id="descricao" 
                placeholder="Descrição detalhada"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unidade">Unidade</Label>
                <Input 
                  id="unidade" 
                  placeholder="UN"
                  value={formData.unidade}
                  onChange={(e) => setFormData({ ...formData, unidade: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="preco">Preço</Label>
                <Input 
                  id="preco" 
                  type="number" 
                  step="0.01"
                  placeholder="0,00"
                  value={formData.preco}
                  onChange={(e) => setFormData({ ...formData, preco: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unidade_negocio">Unidade de Negócio</Label>
                <Input 
                  id="unidade_negocio" 
                  placeholder="Ex: Saúde, TI, Infraestrutura..."
                  value={formData.unidade_negocio}
                  onChange={(e) => setFormData({ ...formData, unidade_negocio: e.target.value })}
                />
              </div>
            </div>

            {/* Image upload */}
            <div className="space-y-2">
              <Label>Imagem do Produto</Label>
              {imagePreview ? (
                <div className="relative w-32 h-32 rounded-lg border border-border overflow-hidden group">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setImageFile(null); setImagePreview(null); }}
                    className="absolute top-1 right-1 p-1 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-3 p-4 rounded-lg border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors">
                  <ImagePlus className="w-8 h-8 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Clique para anexar imagem</p>
                    <p className="text-xs text-muted-foreground">PNG, JPG ou WEBP (máx. 5MB)</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                </label>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                className="gradient-primary text-primary-foreground"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o produto "{selectedProduto?.nome}"?
              Esta ação pode ser revertida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
