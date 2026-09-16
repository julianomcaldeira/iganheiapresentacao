import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Database,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Building2,
  Search,
  Brain,
  BookOpen,
  Tag,
  TrendingUp,
  Globe,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/ui/pagination-controls';

interface IAConhecimento {
  id: string;
  cliente_id: string | null;
  categoria: string;
  assunto: string;
  titulo: string;
  conteudo: string;
  fonte: string | null;
  tags: string[] | null;
  relevancia: number;
  uso_count: number;
  ativo: boolean;
  created_at: string;
  cliente?: { nome: string } | null;
}

interface Cliente {
  id: string;
  nome: string;
}

const CATEGORIAS = [
  'Jurisprudência',
  'Legislação',
  'Doutrina',
  'Editais',
  'Respostas',
  'Técnico',
  'Processos',
  'Outros',
];

export default function IAConhecimento() {
  const { isAdmin } = useAuth();
  const [conhecimentos, setConhecimentos] = useState<IAConhecimento[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedConhecimento, setSelectedConhecimento] = useState<IAConhecimento | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState<string>('all');
  const [selectedCliente, setSelectedCliente] = useState<string>('all');

  const [formData, setFormData] = useState({
    cliente_id: '',
    categoria: 'Outros',
    assunto: '',
    titulo: '',
    conteudo: '',
    fonte: '',
    tags: '',
    relevancia: 5,
  });

  useEffect(() => {
    fetchConhecimentos();
    if (isAdmin) fetchClientes();
  }, [isAdmin]);

  const fetchConhecimentos = async () => {
    try {
      const { data, error } = await supabase
        .from('ia_conhecimento')
        .select('*, cliente:clientes(nome)')
        .eq('ativo', true)
        .order('relevancia', { ascending: false });

      if (error) throw error;
      setConhecimentos((data as unknown as IAConhecimento[]) || []);
    } catch (error) {
      console.error('Error fetching conhecimentos:', error);
      toast.error('Erro ao carregar base de conhecimento');
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

  const filteredConhecimentos = conhecimentos.filter(c => {
    const matchesSearch = 
      c.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.assunto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.conteudo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.tags?.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategoria = selectedCategoria === 'all' || c.categoria === selectedCategoria;
    const matchesCliente = selectedCliente === 'all' || 
      (selectedCliente === 'global' && !c.cliente_id) ||
      c.cliente_id === selectedCliente;
    return matchesSearch && matchesCategoria && matchesCliente;
  });

  const pagination = usePagination<IAConhecimento>({ items: filteredConhecimentos, itemsPerPage: 10 });

  const handleOpenDialog = (conhecimento?: IAConhecimento) => {
    if (conhecimento) {
      setSelectedConhecimento(conhecimento);
      setFormData({
        cliente_id: conhecimento.cliente_id || '',
        categoria: conhecimento.categoria,
        assunto: conhecimento.assunto,
        titulo: conhecimento.titulo,
        conteudo: conhecimento.conteudo,
        fonte: conhecimento.fonte || '',
        tags: conhecimento.tags?.join(', ') || '',
        relevancia: conhecimento.relevancia,
      });
    } else {
      setSelectedConhecimento(null);
      setFormData({
        cliente_id: selectedCliente !== 'all' && selectedCliente !== 'global' ? selectedCliente : '',
        categoria: 'Outros',
        assunto: '',
        titulo: '',
        conteudo: '',
        fonte: '',
        tags: '',
        relevancia: 5,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.titulo || !formData.conteudo || !formData.assunto) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    setIsSubmitting(true);
    try {
      const tagsArray = formData.tags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      const conhecimentoData = {
        cliente_id: formData.cliente_id || null,
        categoria: formData.categoria,
        assunto: formData.assunto.trim(),
        titulo: formData.titulo.trim(),
        conteudo: formData.conteudo.trim(),
        fonte: formData.fonte.trim() || null,
        tags: tagsArray.length > 0 ? tagsArray : null,
        relevancia: formData.relevancia,
      };

      if (selectedConhecimento) {
        const { error } = await supabase
          .from('ia_conhecimento')
          .update(conhecimentoData)
          .eq('id', selectedConhecimento.id);
        if (error) throw error;
        toast.success('Conhecimento atualizado!');
      } else {
        const { error } = await supabase
          .from('ia_conhecimento')
          .insert(conhecimentoData);
        if (error) throw error;
        toast.success('Conhecimento adicionado!');
      }

      setIsDialogOpen(false);
      fetchConhecimentos();
    } catch (error) {
      console.error('Error saving conhecimento:', error);
      toast.error('Erro ao salvar conhecimento');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (conhecimento: IAConhecimento) => {
    if (!confirm('Deseja remover este conhecimento?')) return;

    try {
      const { error } = await supabase
        .from('ia_conhecimento')
        .update({ ativo: false })
        .eq('id', conhecimento.id);
      if (error) throw error;
      toast.success('Conhecimento removido!');
      fetchConhecimentos();
    } catch (error) {
      console.error('Error deleting conhecimento:', error);
      toast.error('Erro ao remover conhecimento');
    }
  };

  // Stats
  const stats = {
    total: conhecimentos.length,
    global: conhecimentos.filter(c => !c.cliente_id).length,
    categorias: new Set(conhecimentos.map(c => c.categoria)).size,
    maisUsado: conhecimentos.reduce((max, c) => c.uso_count > (max?.uso_count || 0) ? c : max, conhecimentos[0]),
  };

  if (loading) {
    return (
      <MainLayout title="Base de Conhecimento" subtitle="Aprendizado contínuo da IA">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Base de Conhecimento" subtitle="Aprendizado contínuo da IA">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-14 h-14 rounded-2xl gradient-primary shadow-glow">
                  <Brain className="w-7 h-7 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Banco de Conhecimento</h3>
                  <p className="text-sm text-muted-foreground">
                    Armazene aprendizados por assunto para melhorar a performance da IA continuamente
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">Base de Dados</Badge>
                    <span className="text-xs text-muted-foreground">→</span>
                    <Badge variant="secondary" className="text-xs">
                      Enriquece: Análise de Edital, Chat IA, Peças Jurídicas
                    </Badge>
                  </div>
                </div>
              </div>
              {isAdmin && (
                <Button onClick={() => handleOpenDialog()} className="gradient-primary text-primary-foreground">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Conhecimento
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Database className="w-8 h-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total de Registros</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Globe className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{stats.global}</p>
              <p className="text-xs text-muted-foreground">Conhecimentos Globais</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{stats.categorias}</p>
              <p className="text-xs text-muted-foreground">Categorias</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-orange-500" />
            <div>
              <p className="text-2xl font-bold">{stats.maisUsado?.uso_count || 0}</p>
              <p className="text-xs text-muted-foreground">Maior Uso</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título, assunto, conteúdo ou tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategoria} onValueChange={setSelectedCategoria}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {CATEGORIAS.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedCliente} onValueChange={setSelectedCliente}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="global">Global (Todos Clientes)</SelectItem>
            {clientes.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título / Assunto</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead className="text-center">Relevância</TableHead>
              <TableHead className="text-center">Usos</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagination.paginatedItems.map((conhecimento) => (
              <TableRow key={conhecimento.id} className="group">
                <TableCell>
                  <div>
                    <p className="font-medium">{conhecimento.titulo}</p>
                    <p className="text-xs text-muted-foreground">{conhecimento.assunto}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{conhecimento.categoria}</Badge>
                </TableCell>
                <TableCell>
                  {conhecimento.cliente ? (
                    <div className="flex items-center gap-1 text-sm">
                      <Building2 className="w-3 h-3" />
                      {conhecimento.cliente.nome}
                    </div>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      <Globe className="w-3 h-3 mr-1" />
                      Global
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {conhecimento.tags?.slice(0, 3).map((tag, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        <Tag className="w-2 h-2 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                    {(conhecimento.tags?.length || 0) > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{conhecimento.tags!.length - 3}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={conhecimento.relevancia >= 7 ? 'default' : 'secondary'}>
                    {conhecimento.relevancia}/10
                  </Badge>
                </TableCell>
                <TableCell className="text-center font-medium">
                  {conhecimento.uso_count}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenDialog(conhecimento)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(conhecimento)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      {filteredConhecimentos.length > 0 && (
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

      {filteredConhecimentos.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Database className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Nenhum conhecimento encontrado</h3>
          <p className="text-sm text-muted-foreground max-w-sm mb-4">
            Adicione conhecimentos para melhorar a performance da IA.
          </p>
          {isAdmin && (
            <Button onClick={() => handleOpenDialog()} className="gradient-primary text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Conhecimento
            </Button>
          )}
        </motion.div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              {selectedConhecimento ? 'Editar Conhecimento' : 'Novo Conhecimento'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cliente (deixe vazio para global)</Label>
                <Select
                  value={formData.cliente_id || "global"}
                  onValueChange={(v) => setFormData({ ...formData, cliente_id: v === "global" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Global (todos clientes)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global (todos clientes)</SelectItem>
                    {clientes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Categoria *</Label>
                <Select
                  value={formData.categoria}
                  onValueChange={(v) => setFormData({ ...formData, categoria: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Assunto *</Label>
              <Input
                value={formData.assunto}
                onChange={(e) => setFormData({ ...formData, assunto: e.target.value })}
                placeholder="Ex: Habilitação técnica, Recursos em pregão..."
              />
            </div>

            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                placeholder="Título descritivo do conhecimento"
              />
            </div>

            <div className="space-y-2">
              <Label>Conteúdo *</Label>
              <Textarea
                value={formData.conteudo}
                onChange={(e) => setFormData({ ...formData, conteudo: e.target.value })}
                placeholder="Conhecimento completo que a IA deve aprender..."
                rows={8}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fonte</Label>
                <Input
                  value={formData.fonte}
                  onChange={(e) => setFormData({ ...formData, fonte: e.target.value })}
                  placeholder="Origem do conhecimento (opcional)"
                />
              </div>

              <div className="space-y-2">
                <Label>Relevância (1-10)</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={formData.relevancia}
                  onChange={(e) => setFormData({ ...formData, relevancia: parseInt(e.target.value) || 5 })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tags (separadas por vírgula)</Label>
              <Input
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="habilitação, técnica, capacidade..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="gradient-primary text-primary-foreground">
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
