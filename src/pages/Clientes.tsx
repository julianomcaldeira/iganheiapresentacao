import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Building2,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Power,
  PowerOff,
  Loader2,
  RefreshCw,
  MapPin,
  Phone,
  Mail,
  Users,
  CheckCircle2,
  XCircle,
  Building,
  Tag,
  Key,
  Handshake,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCNPJLookup } from '@/hooks/useCNPJLookup';
import { ClienteLogoUpload } from '@/components/clientes/ClienteLogoUpload';
import { EmpresasManager } from '@/components/clientes/EmpresasManager';
import { KeywordsManager } from '@/components/clientes/KeywordsManager';
import { ConcorrentesManager } from '@/components/clientes/ConcorrentesManager';
import { WebhookLogsViewer } from '@/components/clientes/WebhookLogsViewer';
import { ClienteRegrasManager } from '@/components/clientes/ClienteRegrasManager';
import { EtapasConfigManager } from '@/components/clientes/EtapasConfigManager';
import { AprovacaoConfigManager } from '@/components/clientes/AprovacaoConfigManager';
import { ClienteIAManager } from '@/components/clientes/ClienteIAManager';

interface Cliente {
  id: string;
  nome: string;
  cnpj: string | null;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  ativo: boolean;
  logo_url: string | null;
  palavras_positivas: string[];
  palavras_negativas: string[];
  terceirizacao: boolean;
  token: string | null;
  concorrentes: string[];
  webhook_url: string | null;
  webhook_ativo: boolean;
  created_at: string;
  updated_at: string;
  _count?: { usuarios: number; empresas: number };
}

export default function Clientes() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole('admin');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('dados');
  
  const [formData, setFormData] = useState({
    nome: '',
    cnpj: '',
    email: '',
    telefone: '',
    endereco: '',
    cidade: '',
    estado: '',
    cep: '',
    logo_url: null as string | null,
    palavras_positivas: [] as string[],
    palavras_negativas: [] as string[],
    terceirizacao: false,
    token: '',
    concorrentes: [] as string[],
    webhook_url: '',
    webhook_ativo: false,
  });

  const { lookupCNPJ, isLoading: isCNPJLoading } = useCNPJLookup();

  const fetchClientes = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('nome');

      if (error) throw error;

      // Get user count per cliente
      const { data: profiles } = await supabase
        .from('profiles')
        .select('cliente_id');

      // Get empresas count per cliente
      const { data: empresas } = await supabase
        .from('empresas')
        .select('cliente_id');

      const clientesWithCount = (data || []).map((cliente: any) => ({
        ...cliente,
        palavras_positivas: cliente.palavras_positivas || [],
        palavras_negativas: cliente.palavras_negativas || [],
        _count: {
          usuarios: profiles?.filter(p => p.cliente_id === cliente.id).length || 0,
          empresas: empresas?.filter(e => e.cliente_id === cliente.id).length || 0
        }
      }));

      setClientes(clientesWithCount);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Erro ao carregar clientes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  const filteredClientes = clientes.filter(
    (c) =>
      c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cnpj?.includes(searchTerm) ||
      c.cidade?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pagination = usePagination<Cliente>({ items: filteredClientes, itemsPerPage: 10 });

  const handleCNPJBlur = async () => {
    if (formData.cnpj && formData.cnpj.replace(/\D/g, '').length >= 14) {
      const data = await lookupCNPJ(formData.cnpj);
      if (data) {
        setFormData(prev => ({
          ...prev,
          nome: data.razaoSocial || prev.nome,
          email: data.email || prev.email,
          telefone: data.telefone || prev.telefone,
          endereco: data.logradouro ? `${data.logradouro}, ${data.numero}` : prev.endereco,
          cidade: data.cidade || prev.cidade,
          estado: data.estado || prev.estado,
          cep: data.cep || prev.cep,
        }));
      }
    }
  };

  const handleOpenDialog = (cliente?: Cliente) => {
    if (cliente) {
      setSelectedCliente(cliente);
      setFormData({
        nome: cliente.nome,
        cnpj: cliente.cnpj || '',
        email: cliente.email || '',
        telefone: cliente.telefone || '',
        endereco: cliente.endereco || '',
        cidade: cliente.cidade || '',
        estado: cliente.estado || '',
        cep: cliente.cep || '',
        logo_url: cliente.logo_url,
        palavras_positivas: cliente.palavras_positivas || [],
        palavras_negativas: cliente.palavras_negativas || [],
        terceirizacao: cliente.terceirizacao || false,
        token: cliente.token || '',
        concorrentes: cliente.concorrentes || [],
        webhook_url: cliente.webhook_url || '',
        webhook_ativo: cliente.webhook_ativo || false,
      });
      setActiveTab('dados');
    } else {
      setSelectedCliente(null);
      setFormData({
        nome: '',
        cnpj: '',
        email: '',
        telefone: '',
        endereco: '',
        cidade: '',
        estado: '',
        cep: '',
        logo_url: null,
        palavras_positivas: [],
        palavras_negativas: [],
        terceirizacao: false,
        token: '',
        concorrentes: [],
        webhook_url: '',
        webhook_ativo: false,
      });
      setActiveTab('dados');
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.nome) {
      toast.error('O nome é obrigatório');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        nome: formData.nome,
        cnpj: formData.cnpj || null,
        email: formData.email || null,
        telefone: formData.telefone || null,
        endereco: formData.endereco || null,
        cidade: formData.cidade || null,
        estado: formData.estado || null,
        cep: formData.cep || null,
        logo_url: formData.logo_url,
        palavras_positivas: formData.palavras_positivas,
        palavras_negativas: formData.palavras_negativas,
        terceirizacao: formData.terceirizacao,
        token: formData.token || null,
        concorrentes: formData.concorrentes,
        webhook_url: formData.webhook_url || null,
        webhook_ativo: formData.webhook_ativo,
      };

      if (selectedCliente) {
        const { error } = await supabase
          .from('clientes')
          .update(payload)
          .eq('id', selectedCliente.id);

        if (error) throw error;
        toast.success('Cliente atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('clientes')
          .insert(payload);

        if (error) throw error;
        toast.success('Cliente criado com sucesso!');
      }

      setIsDialogOpen(false);
      fetchClientes();
    } catch (error: any) {
      console.error('Error saving client:', error);
      if (error.message?.includes('duplicate')) {
        toast.error('Já existe um cliente com este CNPJ');
      } else {
        toast.error(error.message || 'Erro ao salvar cliente');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (cliente: Cliente) => {
    try {
      const { error } = await supabase
        .from('clientes')
        .update({ ativo: !cliente.ativo })
        .eq('id', cliente.id);

      if (error) throw error;
      
      toast.success(cliente.ativo ? 'Cliente desativado' : 'Cliente ativado');
      fetchClientes();
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error('Erro ao alterar status');
    }
  };

  const handleDelete = async () => {
    if (!selectedCliente) return;

    try {
      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', selectedCliente.id);

      if (error) throw error;
      
      toast.success('Cliente excluído com sucesso');
      setIsDeleteDialogOpen(false);
      setSelectedCliente(null);
      fetchClientes();
    } catch (error: any) {
      console.error('Error deleting client:', error);
      if (error.message?.includes('violates foreign key')) {
        toast.error('Não é possível excluir um cliente com usuários vinculados');
      } else {
        toast.error('Erro ao excluir cliente');
      }
    }
  };

  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .slice(0, 18);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <MainLayout title="Clientes" subtitle="Gerenciamento de clientes do sistema">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-card border border-border shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold text-foreground">{clientes.length}</p>
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
                {clientes.filter(c => c.ativo).length}
              </p>
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-4 rounded-xl bg-primary/10 border border-primary/20 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Building className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-primary">Empresas</p>
              <p className="text-2xl font-bold text-primary">
                {clientes.reduce((acc, c) => acc + (c._count?.empresas || 0), 0)}
              </p>
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-4 rounded-xl bg-muted border border-border shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted-foreground/10">
              <Users className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Usuários</p>
              <p className="text-2xl font-bold text-muted-foreground">
                {clientes.reduce((acc, c) => acc + (c._count?.usuarios || 0), 0)}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      <Card className="border-border">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Gerenciar Clientes</CardTitle>
              <CardDescription>Adicione, edite ou remova clientes do sistema</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64 bg-secondary border-0"
                />
              </div>
              <Button variant="outline" size="icon" onClick={fetchClientes}>
                <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              </Button>
              {isAdmin && (
                <Button onClick={() => handleOpenDialog()} className="gradient-primary text-primary-foreground" data-page-new-action>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Cliente
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>CNPJ</TableHead>
                      <TableHead>Localização</TableHead>
                      <TableHead>Empresas</TableHead>
                      <TableHead>Palavras-chave</TableHead>
                      <TableHead>Concorrentes</TableHead>
                      <TableHead>Status</TableHead>
                      {isAdmin && <TableHead className="w-[80px]">Ações</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagination.paginatedItems.map((cliente) => (
                      <TableRow key={cliente.id} className={cn(!cliente.ativo && "opacity-60")}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border border-border">
                              <AvatarImage src={cliente.logo_url || undefined} alt={cliente.nome} />
                              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                {getInitials(cliente.nome)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-foreground">{cliente.nome}</p>
                              {cliente.email && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {cliente.email}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-mono">{cliente.cnpj || '-'}</span>
                        </TableCell>
                        <TableCell>
                          {cliente.cidade ? (
                            <span className="text-sm flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-muted-foreground" />
                              {cliente.cidade}{cliente.estado && `, ${cliente.estado}`}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-normal">
                            <Building className="w-3 h-3 mr-1" />
                            {cliente._count?.empresas || 0}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {(cliente.palavras_positivas?.length || 0) > 0 && (
                              <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-xs">
                                +{cliente.palavras_positivas.length}
                              </Badge>
                            )}
                            {(cliente.palavras_negativas?.length || 0) > 0 && (
                              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-xs">
                                -{cliente.palavras_negativas.length}
                              </Badge>
                            )}
                            {(cliente.palavras_positivas?.length || 0) === 0 && (cliente.palavras_negativas?.length || 0) === 0 && (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {(cliente.concorrentes?.length || 0) > 0 ? (
                            <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/30 text-xs">
                              <Users className="w-3 h-3 mr-1" />
                              {cliente.concorrentes.length}
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              cliente.ativo
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {cliente.ativo ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOpenDialog(cliente)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleToggleStatus(cliente)}>
                                  {cliente.ativo ? (
                                    <>
                                      <PowerOff className="w-4 h-4 mr-2" />
                                      Desativar
                                    </>
                                  ) : (
                                    <>
                                      <Power className="w-4 h-4 mr-2" />
                                      Ativar
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedCliente(cliente);
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
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              <PaginationControls 
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                onPageChange={pagination.goToPage}
                startIndex={pagination.startIndex + 1}
                endIndex={pagination.endIndex}
                totalItems={pagination.totalItems}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedCliente ? 'Editar Cliente' : 'Novo Cliente'}
            </DialogTitle>
            <DialogDescription>
              {selectedCliente 
                ? 'Atualize as informações do cliente' 
                : 'Preencha os dados para criar um novo cliente'}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="w-full overflow-x-auto">
              <TabsList className="inline-flex w-max h-10 p-1 gap-1">
                <TabsTrigger value="dados">Dados</TabsTrigger>
                <TabsTrigger value="empresas" disabled={!selectedCliente}>
                  Empresas
                </TabsTrigger>
                <TabsTrigger value="keywords">Keywords</TabsTrigger>
                <TabsTrigger value="concorrentes">Concorrentes</TabsTrigger>
                <TabsTrigger value="etapas" disabled={!selectedCliente}>
                  Etapas & Regras
                </TabsTrigger>
                <TabsTrigger value="aprovacoes" disabled={!selectedCliente}>
                  Aprovações
                </TabsTrigger>
                <TabsTrigger value="ia" disabled={!selectedCliente}>
                  IA
                </TabsTrigger>
                <TabsTrigger value="webhooks" disabled={!selectedCliente}>
                  Webhooks
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="mt-4 max-h-[60vh] overflow-y-auto pr-4">
              <TabsContent value="dados" className="space-y-4">
                {/* Logo Upload */}
                <div className="space-y-2">
                  <Label>Logo do Cliente</Label>
                  <ClienteLogoUpload
                    logoUrl={formData.logo_url}
                    clienteId={selectedCliente?.id}
                    clienteNome={formData.nome || 'Cliente'}
                    onLogoChange={(url) => setFormData({ ...formData, logo_url: url })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label>CNPJ</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        value={formData.cnpj}
                        onChange={(e) => setFormData({ ...formData, cnpj: formatCNPJ(e.target.value) })}
                        onBlur={handleCNPJBlur}
                        placeholder="00.000.000/0000-00"
                      />
                      {isCNPJLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    </div>
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Nome *</Label>
                    <Input
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      placeholder="Nome do cliente"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>E-mail</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input
                      value={formData.telefone}
                      onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>CEP</Label>
                    <Input
                      value={formData.cep}
                      onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                      placeholder="00000-000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Input
                      value={formData.estado}
                      onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                      maxLength={2}
                      placeholder="UF"
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Cidade</Label>
                    <Input
                      value={formData.cidade}
                      onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                      placeholder="Nome da cidade"
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Endereço</Label>
                    <Input
                      value={formData.endereco}
                      onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                      placeholder="Rua, número, complemento"
                    />
                  </div>
                  </div>

                {/* Integração */}
                <div className="mt-6 pt-4 border-t border-border">
                  <h4 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
                    <Key className="w-4 h-4" />
                    Configurações de Integração
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Handshake className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Cliente de Terceirização</Label>
                          <p className="text-xs text-muted-foreground">
                            Marque se este cliente opera como terceirização
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={formData.terceirizacao}
                        onCheckedChange={(checked) => setFormData({ ...formData, terceirizacao: checked })}
                      />
                    </div>
                  </div>
                  {/* Webhook Section */}
                  <div className="mt-4 p-4 rounded-lg bg-muted/50 border border-border">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Handshake className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Webhook de Integração Externa</Label>
                          <p className="text-xs text-muted-foreground">
                            Receba notificações automáticas de tickets em sistemas externos (TaskGi, n8n, Zapier, etc.)
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={formData.webhook_ativo}
                        onCheckedChange={(checked) => setFormData({ ...formData, webhook_ativo: checked })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">URL do Webhook</Label>
                      <Input
                        value={formData.webhook_url}
                        onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
                        placeholder="https://seu-sistema.com/webhook/tickets"
                        className="font-mono text-sm"
                        disabled={!formData.webhook_ativo}
                      />
                      <p className="text-xs text-muted-foreground">
                        Enviaremos um POST com dados do ticket quando ele for resolvido ou receber uma correção
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="empresas" className="pr-4">
                {selectedCliente && (
                  <EmpresasManager
                    clienteId={selectedCliente.id}
                    clienteNome={selectedCliente.nome}
                  />
                )}
              </TabsContent>

              <TabsContent value="keywords" className="pr-4">
                <KeywordsManager
                  palavrasPositivas={formData.palavras_positivas}
                  palavrasNegativas={formData.palavras_negativas}
                  onPalavrasPositivasChange={(palavras) => 
                    setFormData({ ...formData, palavras_positivas: palavras })
                  }
                  onPalavrasNegativasChange={(palavras) => 
                    setFormData({ ...formData, palavras_negativas: palavras })
                  }
                />
              </TabsContent>

              <TabsContent value="concorrentes" className="pr-4">
                <ConcorrentesManager
                  concorrentes={formData.concorrentes}
                  onConcorrentesChange={(concorrentes) => 
                    setFormData({ ...formData, concorrentes })
                  }
                />
              </TabsContent>

              <TabsContent value="etapas" className="pr-4 space-y-6">
                {selectedCliente && (
                  <>
                    <EtapasConfigManager clienteId={selectedCliente.id} />
                    <div className="border-t pt-6">
                      <ClienteRegrasManager clienteId={selectedCliente.id} />
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="aprovacoes" className="pr-4">
                {selectedCliente && (
                  <AprovacaoConfigManager clienteId={selectedCliente.id} />
                )}
              </TabsContent>

              <TabsContent value="ia" className="pr-4">
                {selectedCliente && (
                  <ClienteIAManager clienteId={selectedCliente.id} />
                )}
              </TabsContent>

              <TabsContent value="webhooks" className="pr-4">
                {selectedCliente && (
                  <WebhookLogsViewer clienteId={selectedCliente.id} />
                )}
              </TabsContent>
            </div>
          </Tabs>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {selectedCliente ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O cliente "{selectedCliente?.nome}" e todas as suas
              empresas vinculadas serão permanentemente excluídos.
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
    </MainLayout>
  );
}
