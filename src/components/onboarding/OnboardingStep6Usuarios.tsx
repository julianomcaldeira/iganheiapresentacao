import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Shield, ArrowRight, ArrowLeft, Plus, User, Trash2 } from 'lucide-react';

interface Props {
  clienteId: string;
  onComplete: () => void;
  onBack: () => void;
}

interface Usuario {
  id: string;
  nome: string;
  cargo: string | null;
  ativo: boolean;
  email?: string;
}

interface PerfilAcesso {
  id: string;
  nome: string;
}

export function OnboardingStep6Usuarios({ clienteId, onComplete, onBack }: Props) {
  const [loading, setLoading] = useState(true);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [perfis, setPerfis] = useState<PerfilAcesso[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    cargo: '',
    perfil_acesso_id: '',
    senha: ''
  });

  useEffect(() => {
    fetchData();
  }, [clienteId]);

  const fetchData = async () => {
    // Fetch users for this client
    const { data: usersData } = await supabase
      .from('profiles')
      .select('id, nome, cargo, ativo')
      .eq('cliente_id', clienteId)
      .eq('ativo', true);

    // Fetch access profiles for this client
    const { data: perfisData } = await supabase
      .from('perfis_acesso')
      .select('id, nome')
      .eq('cliente_id', clienteId)
      .eq('ativo', true);

    setUsuarios(usersData || []);
    setPerfis(perfisData || []);
    setLoading(false);
  };

  const createDefaultProfile = async () => {
    // Create a default access profile if none exists
    const { data, error } = await supabase
      .from('perfis_acesso')
      .insert({
        cliente_id: clienteId,
        nome: 'Usuário Padrão',
        descricao: 'Perfil padrão com acesso básico ao sistema'
      })
      .select()
      .single();

    if (error) {
      toast.error('Erro ao criar perfil padrão');
      return null;
    }

    // Create basic permissions
    const modulos = ['licitacoes', 'tarefas', 'documentos', 'dashboard'];
    await supabase
      .from('perfil_permissoes')
      .insert(
        modulos.map(modulo => ({
          perfil_id: data.id,
          modulo,
          pode_visualizar: true,
          pode_criar: modulo !== 'dashboard',
          pode_editar: modulo !== 'dashboard',
          pode_excluir: false
        }))
      );

    return data;
  };

  const handleCreateUser = async () => {
    if (!formData.nome.trim() || !formData.email.trim() || !formData.senha) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setSaving(true);
    try {
      let perfilId = formData.perfil_acesso_id;

      // Create default profile if needed
      if (!perfilId && perfis.length === 0) {
        const newPerfil = await createDefaultProfile();
        if (newPerfil) {
          perfilId = newPerfil.id;
        }
      }

      // Call edge function to create user
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: formData.email,
          password: formData.senha,
          nome: formData.nome,
          cargo: formData.cargo,
          cliente_id: clienteId,
          perfil_acesso_id: perfilId || null,
          role: 'usuario'
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Usuário criado com sucesso!');
      setShowForm(false);
      setFormData({ nome: '', email: '', cargo: '', perfil_acesso_id: '', senha: '' });
      fetchData();
    } catch (error: any) {
      toast.error('Erro ao criar usuário: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <Shield className="h-6 w-6 text-cyan-500" />
            </div>
            <div>
              <CardTitle>Usuários do Cliente</CardTitle>
              <CardDescription>
                Crie os acessos para os colaboradores do cliente. Cada usuário pode ter 
                um perfil de acesso diferente.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {usuarios.length > 0 ? (
            <div className="space-y-3">
              {usuarios.map((usuario) => (
                <div 
                  key={usuario.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{usuario.nome}</p>
                      <p className="text-sm text-muted-foreground">
                        {usuario.cargo || 'Sem cargo definido'}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-green-500/10">
                    Ativo
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
              <Shield className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum usuário cadastrado</p>
              <p className="text-sm">Crie pelo menos um usuário para o cliente</p>
            </div>
          )}

          <Button onClick={() => setShowForm(true)} variant="outline" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Criar Usuário
          </Button>

          <div className="flex justify-between pt-4 border-t">
            <Button onClick={onBack} variant="ghost">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <Button onClick={onComplete} size="lg">
              {usuarios.length === 0 ? 'Pular' : 'Continuar'}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome Completo *</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Nome do usuário"
              />
            </div>
            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@empresa.com"
              />
            </div>
            <div>
              <Label>Senha *</Label>
              <Input
                type="password"
                value={formData.senha}
                onChange={(e) => setFormData(prev => ({ ...prev, senha: e.target.value }))}
                placeholder="Senha de acesso"
              />
            </div>
            <div>
              <Label>Cargo</Label>
              <Input
                value={formData.cargo}
                onChange={(e) => setFormData(prev => ({ ...prev, cargo: e.target.value }))}
                placeholder="Ex: Analista de Licitações"
              />
            </div>
            {perfis.length > 0 && (
              <div>
                <Label>Perfil de Acesso</Label>
                <Select
                  value={formData.perfil_acesso_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, perfil_acesso_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    {perfis.map((perfil) => (
                      <SelectItem key={perfil.id} value={perfil.id}>
                        {perfil.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateUser} disabled={saving}>
                {saving ? 'Criando...' : 'Criar Usuário'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}