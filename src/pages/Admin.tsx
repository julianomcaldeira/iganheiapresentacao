import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  Users,
  Shield,
  Settings,
  Activity,
  MoreVertical,
  Plus,
  Search,
  UserPlus,
  Edit,
  Loader2,
  RefreshCw,
  Copy,
  Building2,
  Power,
  PowerOff,
  Trash2,
  KeyRound,
  CheckCircle2,
  XCircle,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PerfisAcessoManager } from '@/components/admin/PerfisAcessoManager';
import { LicitacaoStatusRegrasManager } from '@/components/admin/LicitacaoStatusRegrasManager';
import { SyncIntegracoesManager } from '@/components/admin/SyncIntegracoesManager';
import { useImpersonation } from '@/contexts/ImpersonationContext';

type AppRole = 'admin' | 'gerente' | 'usuario';

interface Usuario {
  id: string;
  nome: string;
  email: string;
  cargo: string | null;
  telefone: string | null;
  avatar_url: string | null;
  role: AppRole;
  cliente_id: string | null;
  perfil_acesso_id: string | null;
  ativo: boolean;
  created_at: string;
  perfil_acesso?: { nome: string } | null;
}

interface Cliente {
  id: string;
  nome: string;
  cnpj: string | null;
}

interface PerfilAcesso {
  id: string;
  nome: string;
  cliente_id: string;
}

const roleConfig: Record<AppRole, { label: string; color: string }> = {
  admin: { label: 'Administrador', color: 'bg-destructive/10 text-destructive border-destructive/20' },
  gerente: { label: 'Gerente', color: 'bg-primary/10 text-primary border-primary/20' },
  usuario: { label: 'Usuário', color: 'bg-muted text-muted-foreground border-border' },
};

// Generate a secure random password
const generatePassword = (length = 12) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

export default function Admin() {
  const { session, user } = useAuth();
  const { startImpersonation } = useImpersonation();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [perfisAcesso, setPerfisAcesso] = useState<PerfilAcesso[]>([]);
  const [filteredPerfis, setFilteredPerfis] = useState<PerfilAcesso[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdUserPassword, setCreatedUserPassword] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState<string | null>(null);
  
  const [newUser, setNewUser] = useState({
    nome: '',
    email: '',
    cargo: '',
    telefone: '',
    role: 'usuario' as AppRole,
    cliente_id: '',
    perfil_acesso_id: '',
  });

  const [editUser, setEditUser] = useState({
    nome: '',
    cargo: '',
    telefone: '',
    role: 'usuario' as AppRole,
    cliente_id: '',
    perfil_acesso_id: '',
  });
  const [editFilteredPerfis, setEditFilteredPerfis] = useState<PerfilAcesso[]>([]);

  const fetchClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome, cnpj')
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchPerfisAcesso = async () => {
    try {
      const { data, error } = await supabase
        .from('perfis_acesso')
        .select('id, nome, cliente_id')
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setPerfisAcesso(data || []);
    } catch (error) {
      console.error('Error fetching perfis:', error);
    }
  };

  const fetchUsuarios = async () => {
    setIsLoading(true);
    try {
      // Fetch profiles with their roles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Fetch perfis for names
      const { data: perfis } = await supabase
        .from('perfis_acesso')
        .select('id, nome');

      // Merge profiles with roles
      const usuariosComRoles: Usuario[] = (profiles || []).map((profile: any) => {
        const userRole = roles?.find((r) => r.user_id === profile.id);
        const perfil = perfis?.find((p) => p.id === profile.perfil_acesso_id);
        return {
          id: profile.id,
          nome: profile.nome,
          email: '',
          cargo: profile.cargo,
          telefone: profile.telefone,
          avatar_url: profile.avatar_url,
          role: (userRole?.role as AppRole) || 'usuario',
          cliente_id: profile.cliente_id,
          perfil_acesso_id: profile.perfil_acesso_id,
          ativo: profile.ativo ?? true,
          created_at: profile.created_at,
          perfil_acesso: perfil ? { nome: perfil.nome } : null,
        };
      });

      setUsuarios(usuariosComRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsuarios();
    fetchClientes();
    fetchPerfisAcesso();
  }, []);

  // Filter perfis when cliente changes
  useEffect(() => {
    if (newUser.cliente_id) {
      const filtered = perfisAcesso.filter((p) => p.cliente_id === newUser.cliente_id);
      setFilteredPerfis(filtered);
      // Reset perfil if not valid for new cliente
      if (newUser.perfil_acesso_id && !filtered.find((p) => p.id === newUser.perfil_acesso_id)) {
        setNewUser((prev) => ({ ...prev, perfil_acesso_id: '' }));
      }
    } else {
      setFilteredPerfis([]);
    }
  }, [newUser.cliente_id, perfisAcesso]);

  const filteredUsuarios = usuarios.filter(
    (u) =>
      u.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.cargo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pagination = usePagination<Usuario>({ items: filteredUsuarios, itemsPerPage: 10 });

  const handleAddUser = async () => {
    if (!newUser.nome || !newUser.email || !newUser.cliente_id) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    // Validate perfil_acesso_id for non-admin users
    if (newUser.role !== 'admin' && !newUser.perfil_acesso_id) {
      toast.error('O perfil de acesso é obrigatório para usuários não administradores');
      return;
    }

    const generatedPassword = generatePassword();
    
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: newUser.email,
          password: generatedPassword,
          nome: newUser.nome,
          cargo: newUser.cargo || null,
          telefone: newUser.telefone || null,
          role: newUser.role,
          cliente_id: newUser.cliente_id,
          perfil_acesso_id: newUser.perfil_acesso_id || null,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setCreatedUserPassword(generatedPassword);
      toast.success('Usuário criado com sucesso!');
      fetchUsuarios();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error.message || 'Erro ao criar usuário');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseAddDialog = () => {
    setIsAddUserOpen(false);
    setCreatedUserPassword(null);
    setNewUser({ nome: '', email: '', cargo: '', telefone: '', role: 'usuario', cliente_id: '', perfil_acesso_id: '' });
  };

  const copyPasswordToClipboard = () => {
    if (createdUserPassword) {
      navigator.clipboard.writeText(createdUserPassword);
      toast.success('Senha copiada para a área de transferência');
    }
  };

  const getClienteName = (clienteId: string | null) => {
    if (!clienteId) return '-';
    const cliente = clientes.find(c => c.id === clienteId);
    return cliente?.nome || '-';
  };

  const handleEditUser = async (user: Usuario) => {
    await fetchPerfisAcesso();
    setSelectedUser(user);
    setEditUser({
      nome: user.nome || '',
      cargo: user.cargo || '',
      telefone: user.telefone || '',
      role: user.role,
      cliente_id: user.cliente_id || '',
      perfil_acesso_id: user.perfil_acesso_id || '',
    });
    const filtered = perfisAcesso.filter((p) => p.cliente_id === user.cliente_id);
    setEditFilteredPerfis(filtered);
    setIsEditUserOpen(true);
  };

  // Filter perfis for edit dialog when cliente changes
  useEffect(() => {
    if (editUser.cliente_id) {
      const filtered = perfisAcesso.filter((p) => p.cliente_id === editUser.cliente_id);
      setEditFilteredPerfis(filtered);
      if (editUser.perfil_acesso_id && !filtered.find((p) => p.id === editUser.perfil_acesso_id)) {
        setEditUser((prev) => ({ ...prev, perfil_acesso_id: '' }));
      }
    } else {
      setEditFilteredPerfis([]);
    }
  }, [editUser.cliente_id, perfisAcesso]);

  const handleSaveEditUser = async () => {
    if (!selectedUser) return;
    if (!editUser.nome.trim()) {
      toast.error('O nome é obrigatório');
      return;
    }
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-user', {
        body: {
          action: 'update',
          user_id: selectedUser.id,
          updates: {
            nome: editUser.nome,
            cargo: editUser.cargo || null,
            telefone: editUser.telefone || null,
            cliente_id: editUser.cliente_id || null,
            perfil_acesso_id: editUser.perfil_acesso_id || null,
          },
          new_role: editUser.role !== selectedUser.role ? editUser.role : undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Usuário atualizado com sucesso!');
      setIsEditUserOpen(false);
      setSelectedUser(null);
      fetchUsuarios();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar usuário');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: AppRole) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;

      setUsuarios(usuarios.map(u => 
        u.id === userId ? { ...u, role: newRole } : u
      ));
      toast.success('Permissão atualizada');
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Erro ao atualizar permissão');
    }
  };

  const handleManageUser = async (action: 'activate' | 'deactivate' | 'delete' | 'reset-password', userId: string) => {
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-user', {
        body: { action, user_id: userId },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      switch (action) {
        case 'activate':
          toast.success('Usuário ativado com sucesso');
          setUsuarios(usuarios.map(u => u.id === userId ? { ...u, ativo: true } : u));
          break;
        case 'deactivate':
          toast.success('Usuário desativado com sucesso');
          setUsuarios(usuarios.map(u => u.id === userId ? { ...u, ativo: false } : u));
          break;
        case 'delete':
          toast.success('Usuário excluído com sucesso');
          setUsuarios(usuarios.filter(u => u.id !== userId));
          setIsDeleteDialogOpen(false);
          break;
        case 'reset-password':
          setResetPassword(data.newPassword);
          setIsPasswordDialogOpen(true);
          break;
      }
      setSelectedUser(null);
    } catch (error: any) {
      console.error(`Error ${action} user:`, error);
      toast.error(error.message || `Erro ao ${action === 'delete' ? 'excluir' : action === 'reset-password' ? 'redefinir senha do' : action === 'activate' ? 'ativar' : 'desativar'} usuário`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyResetPassword = () => {
    if (resetPassword) {
      navigator.clipboard.writeText(resetPassword);
      toast.success('Nova senha copiada para a área de transferência');
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <MainLayout title="Administração" subtitle="Gerenciamento de usuários do sistema">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-card border border-border shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Usuários</p>
              <p className="text-2xl font-bold text-foreground">{usuarios.length}</p>
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/20">
              <Shield className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-destructive">Administradores</p>
              <p className="text-2xl font-bold text-destructive">
                {usuarios.filter((u) => u.role === 'admin').length}
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
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-primary">Gerentes</p>
              <p className="text-2xl font-bold text-primary">
                {usuarios.filter((u) => u.role === 'gerente').length}
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
                {usuarios.filter((u) => u.role === 'usuario').length}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      <Tabs defaultValue="usuarios" className="space-y-6">
        <TabsList className="bg-secondary p-1 rounded-xl">
          <TabsTrigger value="usuarios" className="rounded-lg data-[state=active]:bg-background">
            <Users className="w-4 h-4 mr-2" />
            Usuários
          </TabsTrigger>
          <TabsTrigger value="perfis" className="rounded-lg data-[state=active]:bg-background">
            <Shield className="w-4 h-4 mr-2" />
            Perfis de Acesso
          </TabsTrigger>
          <TabsTrigger value="status-regras" className="rounded-lg data-[state=active]:bg-background">
            <Activity className="w-4 h-4 mr-2" />
            Regras de Status
          </TabsTrigger>
          <TabsTrigger value="integracoes" className="rounded-lg data-[state=active]:bg-background">
            <RefreshCw className="w-4 h-4 mr-2" />
            Integrações
          </TabsTrigger>
          <TabsTrigger value="configuracoes" className="rounded-lg data-[state=active]:bg-background">
            <Settings className="w-4 h-4 mr-2" />
            Configurações
          </TabsTrigger>
        </TabsList>

        {/* Usuários Tab */}
        <TabsContent value="usuarios">
          <Card className="border-border">
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle>Gerenciar Usuários</CardTitle>
                  <CardDescription>Adicione, edite ou remova usuários do sistema</CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar usuário..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64 bg-secondary border-0"
                    />
                  </div>
                  <Button variant="outline" size="icon" onClick={fetchUsuarios}>
                    <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                  </Button>
                  <Button onClick={() => { fetchPerfisAcesso(); setIsAddUserOpen(true); }} className="gradient-primary text-primary-foreground">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Novo Usuário
                  </Button>
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
                          <TableHead>Usuário</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Perfil</TableHead>
                          <TableHead>Cargo</TableHead>
                          <TableHead>Permissão</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-[80px]">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pagination.paginatedItems.map((usuario) => (
                          <TableRow key={usuario.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="w-8 h-8">
                                  <AvatarImage src={usuario.avatar_url || undefined} />
                                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                    {getInitials(usuario.nome || 'U')}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-foreground">{usuario.nome || 'Sem nome'}</p>
                                  <p className="text-xs text-muted-foreground">{usuario.telefone || '-'}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm flex items-center gap-1">
                                <Building2 className="w-3 h-3 text-muted-foreground" />
                                {getClienteName(usuario.cliente_id)}
                              </span>
                            </TableCell>
                            <TableCell>
                              {usuario.perfil_acesso ? (
                                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                                  {usuario.perfil_acesso.nome}
                                </Badge>
                              ) : (
                                <span className="text-sm text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">{usuario.cargo || '-'}</span>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={usuario.role}
                                onValueChange={(value) => handleUpdateRole(usuario.id, value as AppRole)}
                              >
                                <SelectTrigger className="w-[140px] h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">Administrador</SelectItem>
                                  <SelectItem value="gerente">Gerente</SelectItem>
                                  <SelectItem value="usuario">Usuário</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={cn(
                                  usuario.ativo
                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                    : "bg-muted text-muted-foreground"
                                )}
                              >
                                {usuario.ativo ? 'Ativo' : 'Inativo'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground">
                                {new Date(usuario.created_at).toLocaleDateString('pt-BR')}
                              </span>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEditUser(usuario)}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                  {usuario.id !== user?.id && (
                                    <DropdownMenuItem onClick={() => startImpersonation(usuario.id)}>
                                      <Eye className="w-4 h-4 mr-2" />
                                      Espiar Usuário
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setSelectedUser(usuario);
                                      handleManageUser('reset-password', usuario.id);
                                    }}
                                  >
                                    <KeyRound className="w-4 h-4 mr-2" />
                                    Redefinir Senha
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {usuario.ativo ? (
                                    <DropdownMenuItem onClick={() => handleManageUser('deactivate', usuario.id)}>
                                      <PowerOff className="w-4 h-4 mr-2" />
                                      Desativar
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem onClick={() => handleManageUser('activate', usuario.id)}>
                                      <Power className="w-4 h-4 mr-2" />
                                      Ativar
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedUser(usuario);
                                      setIsDeleteDialogOpen(true);
                                    }}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Excluir
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                        {pagination.paginatedItems.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                              Nenhum usuário encontrado
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {pagination.totalPages > 1 && (
                    <div className="mt-4">
                      <PaginationControls
                        currentPage={pagination.currentPage}
                        totalPages={pagination.totalPages}
                        onPageChange={pagination.goToPage}
                        startIndex={pagination.startIndex}
                        endIndex={pagination.endIndex}
                        totalItems={pagination.totalItems}
                      />
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Perfis de Acesso Tab */}
        <TabsContent value="perfis">
          <PerfisAcessoManager />
        </TabsContent>

        {/* Regras de Status Tab */}
        <TabsContent value="status-regras">
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Regras Automáticas de Status</CardTitle>
              <CardDescription>
                Configure como o status geral (Pendente de Análise, Em Andamento, Finalizado, Recusado) é atribuído
                automaticamente a cada licitação. Regras são avaliadas em ordem — a primeira que casa vence.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LicitacaoStatusRegrasManager />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrações Tab */}
        <TabsContent value="integracoes">
          <SyncIntegracoesManager />
        </TabsContent>

        {/* Configurações Tab */}
        <TabsContent value="configuracoes">
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Configurações do Sistema</CardTitle>
              <CardDescription>Ajuste as configurações gerais do sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <Settings className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">
                  Configurações avançadas em breve
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add User Dialog */}
      <Dialog open={isAddUserOpen} onOpenChange={handleCloseAddDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              {createdUserPassword ? 'Usuário Criado' : 'Novo Usuário'}
            </DialogTitle>
            <DialogDescription>
              {createdUserPassword 
                ? 'O usuário foi criado com sucesso. Copie a senha gerada abaixo.'
                : 'Preencha os dados para criar um novo usuário no sistema'
              }
            </DialogDescription>
          </DialogHeader>
          
          {createdUserPassword ? (
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Senha gerada</p>
                    <p className="font-mono text-lg font-bold text-foreground">{createdUserPassword}</p>
                  </div>
                  <Button variant="outline" size="icon" onClick={copyPasswordToClipboard}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                <strong>Importante:</strong> Esta senha só será exibida uma vez. 
                Certifique-se de copiá-la e enviá-la ao usuário de forma segura.
              </p>
              <DialogFooter>
                <Button onClick={handleCloseAddDialog} className="w-full gradient-primary text-primary-foreground">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Concluído
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="cliente">Cliente *</Label>
                  <Select
                    value={newUser.cliente_id}
                    onValueChange={(value) => setNewUser({ ...newUser, cliente_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cliente">
                        {newUser.cliente_id && (
                          <span className="flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            {clientes.find(c => c.id === newUser.cliente_id)?.nome}
                          </span>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map((cliente) => (
                        <SelectItem key={cliente.id} value={cliente.id}>
                          <div className="flex flex-col">
                            <span>{cliente.nome}</span>
                            {cliente.cnpj && (
                              <span className="text-xs text-muted-foreground">{cliente.cnpj}</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                      {clientes.length === 0 && (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          Nenhum cliente cadastrado
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                {/* Perfil de Acesso - logo após Cliente para visibilidade */}
                {newUser.role !== 'admin' && (
                  <div className="space-y-2">
                    <Label htmlFor="perfil">Perfil de Acesso *</Label>
                    <Select
                      value={newUser.perfil_acesso_id}
                      onValueChange={(value) => setNewUser({ ...newUser, perfil_acesso_id: value })}
                      disabled={!newUser.cliente_id}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={newUser.cliente_id ? "Selecione o perfil (ex: Distribuidor)" : "Selecione um cliente primeiro"} />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredPerfis.map((perfil) => (
                          <SelectItem key={perfil.id} value={perfil.id}>
                            <div className="flex items-center gap-2">
                              <Shield className="w-4 h-4 text-primary" />
                              {perfil.nome}
                            </div>
                          </SelectItem>
                        ))}
                        {filteredPerfis.length === 0 && newUser.cliente_id && (
                          <div className="p-2 text-sm text-muted-foreground text-center">
                            Nenhum perfil cadastrado para este cliente. Crie um na aba "Perfis de Acesso".
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Define os módulos que o usuário acessa (ex.: Distribuidor, Auditoria, Operador).
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome Completo *</Label>
                    <Input
                      id="nome"
                      value={newUser.nome}
                      onChange={(e) => setNewUser({ ...newUser, nome: e.target.value })}
                      placeholder="Nome do usuário"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cargo">Cargo</Label>
                    <Input
                      id="cargo"
                      value={newUser.cargo}
                      onChange={(e) => setNewUser({ ...newUser, cargo: e.target.value })}
                      placeholder="Ex: Analista"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input
                      id="telefone"
                      value={newUser.telefone}
                      onChange={(e) => setNewUser({ ...newUser, telefone: e.target.value })}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Permissão</Label>
                  <Select
                    value={newUser.role}
                    onValueChange={(value) => setNewUser({ ...newUser, role: value as AppRole })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a permissão" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="usuario">Usuário</SelectItem>
                      <SelectItem value="gerente">Gerente</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <p className="text-xs text-muted-foreground">
                  * A senha será gerada automaticamente pelo sistema
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={handleCloseAddDialog}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleAddUser}
                  disabled={isSubmitting}
                  className="gradient-primary text-primary-foreground"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Criar Usuário
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o usuário <strong>{selectedUser?.nome}</strong>?
              Esta ação não pode ser desfeita e removerá permanentemente o usuário do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedUser(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedUser && handleManageUser('delete', selectedUser.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Password Reset Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={(open) => {
        setIsPasswordDialogOpen(open);
        if (!open) {
          setResetPassword(null);
          setSelectedUser(null);
        }
      }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" />
              Senha Redefinida
            </DialogTitle>
            <DialogDescription>
              A senha do usuário <strong>{selectedUser?.nome}</strong> foi redefinida com sucesso.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Nova senha</p>
                  <p className="font-mono text-lg font-bold text-foreground">{resetPassword}</p>
                </div>
                <Button variant="outline" size="icon" onClick={copyResetPassword}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              <strong>Importante:</strong> Esta senha só será exibida uma vez. 
              Certifique-se de copiá-la e enviá-la ao usuário de forma segura.
            </p>
          </div>
          <DialogFooter>
            <Button 
              onClick={() => {
                setIsPasswordDialogOpen(false);
                setResetPassword(null);
                setSelectedUser(null);
              }}
              className="w-full gradient-primary text-primary-foreground"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Concluído
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditUserOpen} onOpenChange={(open) => {
        setIsEditUserOpen(open);
        if (!open) setSelectedUser(null);
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-primary" />
              Editar Usuário
            </DialogTitle>
            <DialogDescription>
              Atualize os dados de <strong>{selectedUser?.nome}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select
                value={editUser.cliente_id}
                onValueChange={(value) => setEditUser({ ...editUser, cliente_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente">
                    {editUser.cliente_id && (
                      <span className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        {clientes.find(c => c.id === editUser.cliente_id)?.nome}
                      </span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      <div className="flex flex-col">
                        <span>{cliente.nome}</span>
                        {cliente.cnpj && (
                          <span className="text-xs text-muted-foreground">{cliente.cnpj}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome Completo *</Label>
                <Input
                  value={editUser.nome}
                  onChange={(e) => setEditUser({ ...editUser, nome: e.target.value })}
                  placeholder="Nome do usuário"
                />
              </div>
              <div className="space-y-2">
                <Label>Cargo</Label>
                <Input
                  value={editUser.cargo}
                  onChange={(e) => setEditUser({ ...editUser, cargo: e.target.value })}
                  placeholder="Ex: Analista"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={editUser.telefone}
                  onChange={(e) => setEditUser({ ...editUser, telefone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="space-y-2">
                <Label>Permissão</Label>
                <Select
                  value={editUser.role}
                  onValueChange={(value) => setEditUser({ ...editUser, role: value as AppRole })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="usuario">Usuário</SelectItem>
                    <SelectItem value="gerente">Gerente</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {editUser.role !== 'admin' && (
              <div className="space-y-2">
                <Label>Perfil de Acesso</Label>
                <Select
                  value={editUser.perfil_acesso_id}
                  onValueChange={(value) => setEditUser({ ...editUser, perfil_acesso_id: value })}
                  disabled={!editUser.cliente_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={editUser.cliente_id ? "Selecione o perfil" : "Selecione um cliente primeiro"} />
                  </SelectTrigger>
                  <SelectContent>
                    {editFilteredPerfis.map((perfil) => (
                      <SelectItem key={perfil.id} value={perfil.id}>
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-primary" />
                          {perfil.nome}
                        </div>
                      </SelectItem>
                    ))}
                    {editFilteredPerfis.length === 0 && editUser.cliente_id && (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        Nenhum perfil cadastrado para este cliente
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditUserOpen(false); setSelectedUser(null); }}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveEditUser}
              disabled={isSubmitting}
              className="gradient-primary text-primary-foreground"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
