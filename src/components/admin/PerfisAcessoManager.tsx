import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Edit,
  Trash2,
  MoreVertical,
  Loader2,
  Search,
  Shield,
  Eye,
  PenLine,
  Trash,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// All available modules in the system
const SYSTEM_MODULES = [
  { id: 'dashboard', label: 'Dashboard', description: 'Visão geral e métricas' },
  { id: 'licitacoes', label: 'Licitações', description: 'Gestão de licitações' },
  { id: 'contratos', label: 'Contratos', description: 'Gestão de contratos' },
  { id: 'documentos', label: 'Documentos', description: 'Gestão de documentos' },
  { id: 'tarefas', label: 'Tarefas', description: 'Gestão de tarefas' },
  { id: 'agenda', label: 'Agenda', description: 'Calendário e eventos' },
  { id: 'relatorios', label: 'Relatórios', description: 'Geração de relatórios' },
  { id: 'produtos', label: 'Produtos', description: 'Catálogo de produtos' },
  { id: 'pendencias', label: 'Pendências', description: 'Itens pendentes' },
  { id: 'importacao', label: 'Importação', description: 'Importação de dados' },
  { id: 'clientes', label: 'Clientes', description: 'Gestão de clientes' },
  { id: 'admin', label: 'Administração', description: 'Configurações do sistema' },
];

interface PerfilAcesso {
  id: string;
  cliente_id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  created_at: string;
  cliente?: { nome: string };
  permissoes?: PerfilPermissao[];
}

interface PerfilPermissao {
  id?: string;
  perfil_id: string;
  modulo: string;
  pode_visualizar: boolean;
  pode_criar: boolean;
  pode_editar: boolean;
  pode_excluir: boolean;
}

interface Cliente {
  id: string;
  nome: string;
}

export function PerfisAcessoManager() {
  const [perfis, setPerfis] = useState<PerfilAcesso[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedPerfil, setSelectedPerfil] = useState<PerfilAcesso | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCliente, setFilterCliente] = useState<string>('all');

  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    cliente_id: '',
    ativo: true,
    permissoes: SYSTEM_MODULES.map((m) => ({
      modulo: m.id,
      pode_visualizar: false,
      pode_criar: false,
      pode_editar: false,
      pode_excluir: false,
    })) as Omit<PerfilPermissao, 'id' | 'perfil_id'>[],
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch clients
      const { data: clientesData } = await supabase
        .from('clientes')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome');

      setClientes(clientesData || []);

      // Fetch profiles with permissions
      const { data: perfisData, error } = await supabase
        .from('perfis_acesso')
        .select('*, permissoes:perfil_permissoes(*)')
        .order('nome');

      if (error) throw error;

      // Get client names for each profile
      const perfisWithCliente = (perfisData || []).map((perfil: any) => ({
        ...perfil,
        cliente: clientesData?.find((c) => c.id === perfil.cliente_id),
      }));

      setPerfis(perfisWithCliente);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenDialog = (perfil?: PerfilAcesso) => {
    if (perfil) {
      setSelectedPerfil(perfil);
      const permissoes = SYSTEM_MODULES.map((m) => {
        const existingPerm = perfil.permissoes?.find((p) => p.modulo === m.id);
        return {
          modulo: m.id,
          pode_visualizar: existingPerm?.pode_visualizar || false,
          pode_criar: existingPerm?.pode_criar || false,
          pode_editar: existingPerm?.pode_editar || false,
          pode_excluir: existingPerm?.pode_excluir || false,
        };
      });
      setFormData({
        nome: perfil.nome,
        descricao: perfil.descricao || '',
        cliente_id: perfil.cliente_id,
        ativo: perfil.ativo,
        permissoes,
      });
    } else {
      setSelectedPerfil(null);
      setFormData({
        nome: '',
        descricao: '',
        cliente_id: '',
        ativo: true,
        permissoes: SYSTEM_MODULES.map((m) => ({
          modulo: m.id,
          pode_visualizar: false,
          pode_criar: false,
          pode_editar: false,
          pode_excluir: false,
        })),
      });
    }
    setIsDialogOpen(true);
  };

  const handlePermissionChange = (
    modulo: string,
    field: 'pode_visualizar' | 'pode_criar' | 'pode_editar' | 'pode_excluir',
    value: boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      permissoes: prev.permissoes.map((p) =>
        p.modulo === modulo ? { ...p, [field]: value } : p
      ),
    }));
  };

  const handleSelectAllForModule = (modulo: string, selectAll: boolean) => {
    setFormData((prev) => ({
      ...prev,
      permissoes: prev.permissoes.map((p) =>
        p.modulo === modulo
          ? {
              ...p,
              pode_visualizar: selectAll,
              pode_criar: selectAll,
              pode_editar: selectAll,
              pode_excluir: selectAll,
            }
          : p
      ),
    }));
  };

  const handleSubmit = async () => {
    if (!formData.nome || !formData.cliente_id) {
      toast.error('Nome e cliente são obrigatórios');
      return;
    }

    setIsSubmitting(true);
    try {
      if (selectedPerfil) {
        // Update profile
        const { error: updateError } = await supabase
          .from('perfis_acesso')
          .update({
            nome: formData.nome,
            descricao: formData.descricao || null,
            cliente_id: formData.cliente_id,
            ativo: formData.ativo,
          })
          .eq('id', selectedPerfil.id);

        if (updateError) throw updateError;

        // Delete existing permissions and insert new ones
        await supabase.from('perfil_permissoes').delete().eq('perfil_id', selectedPerfil.id);

        const permissoesData = formData.permissoes.map((p) => ({
          perfil_id: selectedPerfil.id,
          modulo: p.modulo,
          pode_visualizar: p.pode_visualizar,
          pode_criar: p.pode_criar,
          pode_editar: p.pode_editar,
          pode_excluir: p.pode_excluir,
        }));

        const { error: permError } = await supabase.from('perfil_permissoes').insert(permissoesData);
        if (permError) throw permError;

        toast.success('Perfil atualizado com sucesso!');
      } else {
        // Create new profile
        const { data: newPerfil, error: createError } = await supabase
          .from('perfis_acesso')
          .insert({
            nome: formData.nome,
            descricao: formData.descricao || null,
            cliente_id: formData.cliente_id,
            ativo: formData.ativo,
          })
          .select()
          .single();

        if (createError) throw createError;

        // Insert permissions
        const permissoesData = formData.permissoes.map((p) => ({
          perfil_id: newPerfil.id,
          modulo: p.modulo,
          pode_visualizar: p.pode_visualizar,
          pode_criar: p.pode_criar,
          pode_editar: p.pode_editar,
          pode_excluir: p.pode_excluir,
        }));

        const { error: permError } = await supabase.from('perfil_permissoes').insert(permissoesData);
        if (permError) throw permError;

        toast.success('Perfil criado com sucesso!');
      }

      setIsDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Error saving profile:', error);
      if (error.message?.includes('duplicate')) {
        toast.error('Já existe um perfil com este nome para o cliente selecionado');
      } else {
        toast.error(error.message || 'Erro ao salvar perfil');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPerfil) return;

    try {
      const { error } = await supabase.from('perfis_acesso').delete().eq('id', selectedPerfil.id);

      if (error) throw error;

      toast.success('Perfil excluído com sucesso');
      setIsDeleteDialogOpen(false);
      setSelectedPerfil(null);
      fetchData();
    } catch (error: any) {
      console.error('Error deleting profile:', error);
      if (error.message?.includes('violates foreign key')) {
        toast.error('Não é possível excluir um perfil com usuários vinculados');
      } else {
        toast.error('Erro ao excluir perfil');
      }
    }
  };

  const filteredPerfis = perfis.filter((p) => {
    const matchesSearch =
      p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.cliente?.nome?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCliente = filterCliente === 'all' || p.cliente_id === filterCliente;
    return matchesSearch && matchesCliente;
  });

  const countPermissions = (perfil: PerfilAcesso) => {
    return perfil.permissoes?.filter((p) => p.pode_visualizar).length || 0;
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-card border border-border shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold text-foreground">{perfis.length}</p>
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm text-emerald-600 dark:text-emerald-400">Ativos</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {perfis.filter((p) => p.ativo).length}
              </p>
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-4 rounded-xl bg-muted border border-border shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted-foreground/10">
              <XCircle className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Inativos</p>
              <p className="text-2xl font-bold text-muted-foreground">
                {perfis.filter((p) => !p.ativo).length}
              </p>
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-4 rounded-xl bg-primary/10 border border-primary/20 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Eye className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-primary">Módulos</p>
              <p className="text-2xl font-bold text-primary">{SYSTEM_MODULES.length}</p>
            </div>
          </div>
        </motion.div>
      </div>

      <Card className="border-border">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Perfis de Acesso
              </CardTitle>
              <CardDescription>
                Gerencie os perfis de acesso e permissões por cliente
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar perfil..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-48 bg-secondary border-0"
                />
              </div>
              <Select value={filterCliente} onValueChange={setFilterCliente}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os clientes</SelectItem>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Perfil
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredPerfis.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum perfil de acesso encontrado</p>
              <p className="text-sm">Clique em "Novo Perfil" para criar</p>
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Módulos Ativos</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[80px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPerfis.map((perfil) => (
                    <TableRow key={perfil.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Shield className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{perfil.nome}</p>
                            {perfil.descricao && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {perfil.descricao}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{perfil.cliente?.nome || '-'}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {countPermissions(perfil)} de {SYSTEM_MODULES.length}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            perfil.ativo
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                              : 'bg-muted text-muted-foreground'
                          }
                        >
                          {perfil.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenDialog(perfil)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedPerfil(perfil);
                                setIsDeleteDialogOpen(true);
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{selectedPerfil ? 'Editar Perfil' : 'Novo Perfil de Acesso'}</DialogTitle>
            <DialogDescription>
              Configure as permissões de acesso aos módulos do sistema
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-6 pr-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome do Perfil *</Label>
                  <Input
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: Visualizador, Editor, Gestor..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cliente *</Label>
                  <Select
                    value={formData.cliente_id}
                    onValueChange={(value) => setFormData({ ...formData, cliente_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Descrição do perfil..."
                    rows={2}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="ativo"
                    checked={formData.ativo}
                    onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                  />
                  <Label htmlFor="ativo">Perfil ativo</Label>
                </div>
              </div>

              {/* Permissions Table */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Permissões por Módulo</Label>
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">Módulo</TableHead>
                        <TableHead className="text-center w-[100px]">
                          <div className="flex items-center justify-center gap-1">
                            <Eye className="w-4 h-4" />
                            Visualizar
                          </div>
                        </TableHead>
                        <TableHead className="text-center w-[100px]">
                          <div className="flex items-center justify-center gap-1">
                            <Plus className="w-4 h-4" />
                            Criar
                          </div>
                        </TableHead>
                        <TableHead className="text-center w-[100px]">
                          <div className="flex items-center justify-center gap-1">
                            <PenLine className="w-4 h-4" />
                            Editar
                          </div>
                        </TableHead>
                        <TableHead className="text-center w-[100px]">
                          <div className="flex items-center justify-center gap-1">
                            <Trash className="w-4 h-4" />
                            Excluir
                          </div>
                        </TableHead>
                        <TableHead className="text-center w-[100px]">Todos</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {SYSTEM_MODULES.map((module) => {
                        const perm = formData.permissoes.find((p) => p.modulo === module.id);
                        const allChecked =
                          perm?.pode_visualizar &&
                          perm?.pode_criar &&
                          perm?.pode_editar &&
                          perm?.pode_excluir;

                        return (
                          <TableRow key={module.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{module.label}</p>
                                <p className="text-xs text-muted-foreground">{module.description}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Checkbox
                                checked={perm?.pode_visualizar || false}
                                onCheckedChange={(checked) =>
                                  handlePermissionChange(module.id, 'pode_visualizar', !!checked)
                                }
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <Checkbox
                                checked={perm?.pode_criar || false}
                                onCheckedChange={(checked) =>
                                  handlePermissionChange(module.id, 'pode_criar', !!checked)
                                }
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <Checkbox
                                checked={perm?.pode_editar || false}
                                onCheckedChange={(checked) =>
                                  handlePermissionChange(module.id, 'pode_editar', !!checked)
                                }
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <Checkbox
                                checked={perm?.pode_excluir || false}
                                onCheckedChange={(checked) =>
                                  handlePermissionChange(module.id, 'pode_excluir', !!checked)
                                }
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <Checkbox
                                checked={allChecked}
                                onCheckedChange={(checked) =>
                                  handleSelectAllForModule(module.id, !!checked)
                                }
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {selectedPerfil ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir perfil?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O perfil "{selectedPerfil?.nome}" será permanentemente
              excluído.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
