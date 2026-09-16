import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  Mail,
  Smartphone,
  Key,
  Save,
  Camera,
  Moon,
  Sun,
  Monitor,
  Volume2,
  Eye,
  Clock,
  Languages,
  FileText,
  Lock,
  Loader2,
  Workflow,
  RefreshCw,
  Link2,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { WorkflowBuilder } from '@/components/workflows/WorkflowBuilder';
import { AprovacaoConfigManager } from '@/components/clientes/AprovacaoConfigManager';
import { useTaskGISync } from '@/hooks/useTaskGISync';

export default function Configuracoes() {
  const { user, profile, updateProfile, role, isAdmin } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([]);
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null);
  const [taskgiEnabled, setTaskgiEnabled] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const { fullSync } = useTaskGISync({ 
    enabled: taskgiEnabled,
    onSyncComplete: () => setIsSyncing(false)
  });

  useEffect(() => {
    if (isAdmin) {
      fetchClientes();
    } else if (profile?.cliente_id) {
      setSelectedClienteId(profile.cliente_id);
    }
  }, [isAdmin, profile?.cliente_id]);

  const fetchClientes = async () => {
    const { data } = await supabase.from('clientes').select('id, nome').eq('ativo', true).order('nome');
    if (data) setClientes(data);
  };

  const [perfil, setPerfil] = useState({
    nome: '',
    email: '',
    telefone: '',
    cargo: '',
    bio: '',
    avatar_url: '',
  });

  useEffect(() => {
    if (profile) {
      setPerfil({
        nome: profile.nome || '',
        email: user?.email || '',
        telefone: profile.telefone || '',
        cargo: profile.cargo || '',
        bio: '',
        avatar_url: profile.avatar_url || '',
      });
    }
  }, [profile, user]);

  const [notificacoes, setNotificacoes] = useState({
    emailNovasLicitacoes: true,
    emailVencimentos: true,
    emailResumo: false,
    pushNovasLicitacoes: true,
    pushAlertas: true,
    pushMensagens: false,
    smsUrgentes: false,
  });

  const [aparencia, setAparencia] = useState({
    tema: 'system',
    idioma: 'pt-BR',
    compacto: false,
    animacoes: true,
    sons: false,
  });

  const [privacidade, setPrivacidade] = useState({
    perfilPublico: false,
    mostrarAtividade: true,
    autenticacaoDoisFatores: false,
  });

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2MB');
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      await updateProfile({ avatar_url: publicUrl });
      setPerfil((prev) => ({ ...prev, avatar_url: publicUrl }));
      toast.success('Avatar atualizado com sucesso');
    } catch (error) {
      toast.error('Erro ao fazer upload do avatar');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSavePerfil = async () => {
    setIsSaving(true);
    const { error } = await updateProfile({
      nome: perfil.nome,
      telefone: perfil.telefone,
      cargo: perfil.cargo,
    });
    setIsSaving(false);

    if (error) {
      toast.error('Erro ao atualizar perfil');
    } else {
      toast.success('Perfil atualizado com sucesso');
    }
  };

  const handleSaveNotificacoes = () => {
    toast.success('Preferências de notificação salvas');
  };

  const handleSaveAparencia = () => {
    toast.success('Configurações de aparência aplicadas');
  };

  const handleSavePrivacidade = () => {
    toast.success('Configurações de privacidade atualizadas');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    gerente: 'Gerente',
    usuario: 'Usuário',
  };

  const temaIcons = {
    light: Sun,
    dark: Moon,
    system: Monitor,
  };

  return (
    <MainLayout title="Configurações" subtitle="Preferências do usuário">
      <Tabs defaultValue="perfil" className="space-y-6">
        <TabsList className="bg-secondary p-1 rounded-xl flex-wrap h-auto">
          <TabsTrigger value="perfil" className="rounded-lg data-[state=active]:bg-background">
            <User className="w-4 h-4 mr-2" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="notificacoes" className="rounded-lg data-[state=active]:bg-background">
            <Bell className="w-4 h-4 mr-2" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="aparencia" className="rounded-lg data-[state=active]:bg-background">
            <Palette className="w-4 h-4 mr-2" />
            Aparência
          </TabsTrigger>
          <TabsTrigger value="privacidade" className="rounded-lg data-[state=active]:bg-background">
            <Shield className="w-4 h-4 mr-2" />
            Privacidade
          </TabsTrigger>
          <TabsTrigger value="workflows" className="rounded-lg data-[state=active]:bg-background">
            <Workflow className="w-4 h-4 mr-2" />
            Workflows
          </TabsTrigger>
          <TabsTrigger value="aprovacoes" className="rounded-lg data-[state=active]:bg-background">
            <ShieldCheck className="w-4 h-4 mr-2" />
            Aprovações
          </TabsTrigger>
          <TabsTrigger value="integracoes" className="rounded-lg data-[state=active]:bg-background">
            <Link2 className="w-4 h-4 mr-2" />
            Integrações
          </TabsTrigger>
        </TabsList>

        {/* Perfil Tab */}
        <TabsContent value="perfil">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="border-border lg:col-span-1">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 relative">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={perfil.avatar_url || undefined} />
                    <AvatarFallback className="gradient-primary text-2xl font-bold text-primary-foreground">
                      {perfil.nome ? getInitials(perfil.nome) : user?.email?.[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute bottom-0 right-0 rounded-full w-8 h-8"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <CardTitle>{perfil.nome || 'Usuário'}</CardTitle>
                <CardDescription>{role ? roleLabels[role] : 'Usuário'}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">E-mail</span>
                  </div>
                  <span className="text-sm text-foreground truncate max-w-[150px]">{perfil.email}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Telefone</span>
                  </div>
                  <span className="text-sm text-foreground">{perfil.telefone || '-'}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Cargo</span>
                  </div>
                  <span className="text-sm text-foreground">{perfil.cargo || '-'}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border lg:col-span-2">
              <CardHeader>
                <CardTitle>Informações Pessoais</CardTitle>
                <CardDescription>Atualize seus dados de perfil</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome Completo</Label>
                    <Input
                      value={perfil.nome}
                      onChange={(e) => setPerfil({ ...perfil, nome: e.target.value })}
                      className="bg-secondary border-0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cargo</Label>
                    <Input
                      value={perfil.cargo}
                      onChange={(e) => setPerfil({ ...perfil, cargo: e.target.value })}
                      className="bg-secondary border-0"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>E-mail</Label>
                    <Input
                      type="email"
                      value={perfil.email}
                      onChange={(e) => setPerfil({ ...perfil, email: e.target.value })}
                      className="bg-secondary border-0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input
                      value={perfil.telefone}
                      onChange={(e) => setPerfil({ ...perfil, telefone: e.target.value })}
                      className="bg-secondary border-0"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Bio</Label>
                  <Textarea
                    value={perfil.bio}
                    onChange={(e) => setPerfil({ ...perfil, bio: e.target.value })}
                    className="bg-secondary border-0 min-h-[100px]"
                    placeholder="Conte um pouco sobre você..."
                  />
                </div>
                <div className="flex justify-end">
                  <Button 
                    onClick={handleSavePerfil} 
                    className="gradient-primary text-primary-foreground shadow-glow"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Salvar Alterações
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border lg:col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-primary" />
                  Alterar Senha
                </CardTitle>
                <CardDescription>Mantenha sua conta segura atualizando sua senha regularmente</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Senha Atual</Label>
                    <Input type="password" placeholder="••••••••" className="bg-secondary border-0" />
                  </div>
                  <div className="space-y-2">
                    <Label>Nova Senha</Label>
                    <Input type="password" placeholder="••••••••" className="bg-secondary border-0" />
                  </div>
                  <div className="space-y-2">
                    <Label>Confirmar Nova Senha</Label>
                    <Input type="password" placeholder="••••••••" className="bg-secondary border-0" />
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <Button variant="outline">Atualizar Senha</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Notificações Tab */}
        <TabsContent value="notificacoes">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-primary" />
                  Notificações por E-mail
                </CardTitle>
                <CardDescription>Configure quais e-mails deseja receber</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                  <div>
                    <p className="text-sm font-medium text-foreground">Novas Licitações</p>
                    <p className="text-xs text-muted-foreground">Receba alertas de novas oportunidades</p>
                  </div>
                  <Switch
                    checked={notificacoes.emailNovasLicitacoes}
                    onCheckedChange={(checked) => setNotificacoes({ ...notificacoes, emailNovasLicitacoes: checked })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                  <div>
                    <p className="text-sm font-medium text-foreground">Vencimentos</p>
                    <p className="text-xs text-muted-foreground">Alertas de documentos e contratos</p>
                  </div>
                  <Switch
                    checked={notificacoes.emailVencimentos}
                    onCheckedChange={(checked) => setNotificacoes({ ...notificacoes, emailVencimentos: checked })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                  <div>
                    <p className="text-sm font-medium text-foreground">Resumo Diário</p>
                    <p className="text-xs text-muted-foreground">Receba um resumo das atividades</p>
                  </div>
                  <Switch
                    checked={notificacoes.emailResumo}
                    onCheckedChange={(checked) => setNotificacoes({ ...notificacoes, emailResumo: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-primary" />
                  Notificações Push
                </CardTitle>
                <CardDescription>Notificações no navegador e aplicativo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                  <div>
                    <p className="text-sm font-medium text-foreground">Novas Licitações</p>
                    <p className="text-xs text-muted-foreground">Push imediato para novas oportunidades</p>
                  </div>
                  <Switch
                    checked={notificacoes.pushNovasLicitacoes}
                    onCheckedChange={(checked) => setNotificacoes({ ...notificacoes, pushNovasLicitacoes: checked })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                  <div>
                    <p className="text-sm font-medium text-foreground">Alertas Urgentes</p>
                    <p className="text-xs text-muted-foreground">Prazos e pendências críticas</p>
                  </div>
                  <Switch
                    checked={notificacoes.pushAlertas}
                    onCheckedChange={(checked) => setNotificacoes({ ...notificacoes, pushAlertas: checked })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                  <div>
                    <p className="text-sm font-medium text-foreground">Mensagens</p>
                    <p className="text-xs text-muted-foreground">Notificações de mensagens da equipe</p>
                  </div>
                  <Switch
                    checked={notificacoes.pushMensagens}
                    onCheckedChange={(checked) => setNotificacoes({ ...notificacoes, pushMensagens: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-primary" />
                  Notificações SMS
                </CardTitle>
                <CardDescription>Alertas críticos via mensagem de texto</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                  <div>
                    <p className="text-sm font-medium text-foreground">Alertas Urgentes por SMS</p>
                    <p className="text-xs text-muted-foreground">Receba SMS apenas para situações críticas</p>
                  </div>
                  <Switch
                    checked={notificacoes.smsUrgentes}
                    onCheckedChange={(checked) => setNotificacoes({ ...notificacoes, smsUrgentes: checked })}
                  />
                </div>
                <div className="flex justify-end mt-4">
                  <Button onClick={handleSaveNotificacoes} className="gradient-primary text-primary-foreground shadow-glow">
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Preferências
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Aparência Tab */}
        <TabsContent value="aparencia">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5 text-primary" />
                  Tema
                </CardTitle>
                <CardDescription>Escolha como o sistema deve aparecer</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {(['light', 'dark', 'system'] as const).map((tema) => {
                    const Icon = temaIcons[tema];
                    const labels = { light: 'Claro', dark: 'Escuro', system: 'Sistema' };
                    return (
                      <motion.div
                        key={tema}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          aparencia.tema === tema
                            ? 'border-primary bg-primary/10'
                            : 'border-border bg-secondary hover:border-primary/50'
                        }`}
                        onClick={() => setAparencia({ ...aparencia, tema })}
                      >
                        <div className="flex flex-col items-center gap-2">
                          <Icon className={`w-6 h-6 ${aparencia.tema === tema ? 'text-primary' : 'text-muted-foreground'}`} />
                          <span className={`text-sm font-medium ${aparencia.tema === tema ? 'text-primary' : 'text-foreground'}`}>
                            {labels[tema]}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Languages className="w-5 h-5 text-primary" />
                  Idioma e Região
                </CardTitle>
                <CardDescription>Configure idioma e formato de data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Idioma</Label>
                  <Select
                    value={aparencia.idioma}
                    onValueChange={(value) => setAparencia({ ...aparencia, idioma: value })}
                  >
                    <SelectTrigger className="bg-secondary border-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                      <SelectItem value="en-US">English (US)</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Fuso Horário</Label>
                  <Select defaultValue="America/Sao_Paulo">
                    <SelectTrigger className="bg-secondary border-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/Sao_Paulo">Brasília (GMT-3)</SelectItem>
                      <SelectItem value="America/Manaus">Manaus (GMT-4)</SelectItem>
                      <SelectItem value="America/Belem">Belém (GMT-3)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-primary" />
                  Preferências de Exibição
                </CardTitle>
                <CardDescription>Personalize a interface do sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                    <div>
                      <p className="text-sm font-medium text-foreground">Modo Compacto</p>
                      <p className="text-xs text-muted-foreground">Reduz espaçamentos</p>
                    </div>
                    <Switch
                      checked={aparencia.compacto}
                      onCheckedChange={(checked) => setAparencia({ ...aparencia, compacto: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                    <div>
                      <p className="text-sm font-medium text-foreground">Animações</p>
                      <p className="text-xs text-muted-foreground">Transições suaves</p>
                    </div>
                    <Switch
                      checked={aparencia.animacoes}
                      onCheckedChange={(checked) => setAparencia({ ...aparencia, animacoes: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Sons</p>
                        <p className="text-xs text-muted-foreground">Efeitos sonoros</p>
                      </div>
                    </div>
                    <Switch
                      checked={aparencia.sons}
                      onCheckedChange={(checked) => setAparencia({ ...aparencia, sons: checked })}
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <Button onClick={handleSaveAparencia} className="gradient-primary text-primary-foreground shadow-glow">
                    <Save className="w-4 h-4 mr-2" />
                    Aplicar Configurações
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Privacidade Tab */}
        <TabsContent value="privacidade">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-primary" />
                  Visibilidade do Perfil
                </CardTitle>
                <CardDescription>Controle quem pode ver suas informações</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                  <div>
                    <p className="text-sm font-medium text-foreground">Perfil Público</p>
                    <p className="text-xs text-muted-foreground">Outros usuários podem ver seu perfil</p>
                  </div>
                  <Switch
                    checked={privacidade.perfilPublico}
                    onCheckedChange={(checked) => setPrivacidade({ ...privacidade, perfilPublico: checked })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                  <div>
                    <p className="text-sm font-medium text-foreground">Mostrar Atividade</p>
                    <p className="text-xs text-muted-foreground">Exibir status online e última atividade</p>
                  </div>
                  <Switch
                    checked={privacidade.mostrarAtividade}
                    onCheckedChange={(checked) => setPrivacidade({ ...privacidade, mostrarAtividade: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-primary" />
                  Segurança da Conta
                </CardTitle>
                <CardDescription>Proteja sua conta com recursos adicionais</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                  <div>
                    <p className="text-sm font-medium text-foreground">Autenticação de Dois Fatores</p>
                    <p className="text-xs text-muted-foreground">Adicione uma camada extra de segurança</p>
                  </div>
                  <Switch
                    checked={privacidade.autenticacaoDoisFatores}
                    onCheckedChange={(checked) => setPrivacidade({ ...privacidade, autenticacaoDoisFatores: checked })}
                  />
                </div>
                <Button variant="outline" className="w-full">
                  <Key className="w-4 h-4 mr-2" />
                  Gerenciar Sessões Ativas
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Dados e Exportação
                </CardTitle>
                <CardDescription>Gerencie seus dados pessoais</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <Button variant="outline">
                    <FileText className="w-4 h-4 mr-2" />
                    Exportar Meus Dados
                  </Button>
                  <Button variant="outline">
                    <Clock className="w-4 h-4 mr-2" />
                    Histórico de Atividades
                  </Button>
                  <Button variant="outline" className="text-destructive hover:text-destructive">
                    Excluir Minha Conta
                  </Button>
                </div>
                <div className="flex justify-end mt-4">
                  <Button onClick={handleSavePrivacidade} className="gradient-primary text-primary-foreground shadow-glow">
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Configurações
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Workflows Tab */}
        <TabsContent value="workflows">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Workflow className="w-5 h-5 text-primary" />
                Configuração de Workflows
              </CardTitle>
              <CardDescription>Configure o passo a passo das licitações</CardDescription>
            </CardHeader>
            <CardContent>
              {isAdmin && clientes.length > 0 && (
                <div className="mb-6">
                  <Label>Selecione o Cliente</Label>
                  <Select value={selectedClienteId || ''} onValueChange={setSelectedClienteId}>
                    <SelectTrigger className="w-full md:w-80 mt-2">
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {selectedClienteId ? (
                <WorkflowBuilder 
                  clienteId={selectedClienteId} 
                  clienteNome={clientes.find(c => c.id === selectedClienteId)?.nome || profile?.nome || ''}
                  onClose={() => {}}
                />
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  {isAdmin ? 'Selecione um cliente para configurar os workflows' : 'Você precisa estar vinculado a um cliente para configurar workflows'}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aprovações Tab */}
        <TabsContent value="aprovacoes">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                Fluxo de Aprovação
              </CardTitle>
              <CardDescription>Configure as etapas e aprovadores padrão para licitações</CardDescription>
            </CardHeader>
            <CardContent>
              {isAdmin && clientes.length > 0 && (
                <div className="mb-6">
                  <Label>Selecione o Cliente</Label>
                  <Select value={selectedClienteId || ''} onValueChange={setSelectedClienteId}>
                    <SelectTrigger className="w-full md:w-80 mt-2">
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {selectedClienteId ? (
                <AprovacaoConfigManager clienteId={selectedClienteId} />
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  {isAdmin ? 'Selecione um cliente para configurar as aprovações' : 'Você precisa estar vinculado a um cliente para configurar aprovações'}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrações Tab */}
        <TabsContent value="integracoes">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="w-5 h-5 text-primary" />
                  TaskGI
                </CardTitle>
                <CardDescription>
                  Sincronização bidirecional de tarefas com o TaskGI
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                  <div>
                    <p className="text-sm font-medium text-foreground">Sincronização Ativa</p>
                    <p className="text-xs text-muted-foreground">
                      Sincroniza tarefas em tempo real entre os sistemas
                    </p>
                  </div>
                  <Switch
                    checked={taskgiEnabled}
                    onCheckedChange={setTaskgiEnabled}
                  />
                </div>

                <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                  <p className="text-sm text-muted-foreground mb-2">
                    Quando ativado, as tarefas criadas, atualizadas ou excluídas serão automaticamente 
                    sincronizadas com o TaskGI em tempo real.
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Tarefas locais → TaskGI (exportação)</li>
                    <li>• TaskGI → Tarefas locais (importação via webhook)</li>
                    <li>• Resolução automática de conflitos por timestamp</li>
                  </ul>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    disabled={isSyncing}
                    onClick={async () => {
                      setIsSyncing(true);
                      await fullSync();
                      setIsSyncing(false);
                    }}
                  >
                    {isSyncing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Sincronizar Agora
                  </Button>
                </div>

                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-xs text-primary font-medium mb-1">Webhook URL</p>
                  <code className="text-xs text-muted-foreground break-all">
                    {import.meta.env.VITE_SUPABASE_URL}/functions/v1/taskgi-webhook
                  </code>
                  <p className="text-xs text-muted-foreground mt-2">
                    Configure esta URL no TaskGI para receber atualizações em tempo real.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
