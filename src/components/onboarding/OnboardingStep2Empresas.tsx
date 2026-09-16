import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Briefcase, ArrowRight, ArrowLeft, Plus, Trash2, Building2 } from 'lucide-react';
import { useCNPJLookup } from '@/hooks/useCNPJLookup';

interface Props {
  clienteId: string;
  onComplete: () => void;
  onBack: () => void;
}

interface Empresa {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string | null;
  ativo: boolean;
}

export function OnboardingStep2Empresas({ clienteId, onComplete, onBack }: Props) {
  const [loading, setLoading] = useState(true);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const { lookupCNPJ, isLoading: loadingCNPJ } = useCNPJLookup();
  const [formData, setFormData] = useState({
    razao_social: '',
    nome_fantasia: '',
    cnpj: '',
    email: '',
    telefone: '',
    endereco: '',
    cidade: '',
    estado: '',
    cep: ''
  });

  useEffect(() => {
    fetchEmpresas();
  }, [clienteId]);

  const fetchEmpresas = async () => {
    const { data } = await supabase
      .from('empresas')
      .select('id, razao_social, nome_fantasia, cnpj, ativo')
      .eq('cliente_id', clienteId)
      .eq('ativo', true);

    setEmpresas(data || []);
    setLoading(false);
  };

  const handleCNPJLookup = async () => {
    const cleanCNPJ = formData.cnpj.replace(/\D/g, '');
    if (cleanCNPJ.length !== 14) {
      toast.error('CNPJ deve ter 14 dígitos');
      return;
    }

    const data = await lookupCNPJ(cleanCNPJ);
    if (data) {
      setFormData(prev => ({
        ...prev,
        razao_social: data.razaoSocial || prev.razao_social,
        nome_fantasia: data.nomeFantasia || prev.nome_fantasia,
        email: data.email || prev.email,
        telefone: data.telefone || prev.telefone,
        endereco: data.logradouro ? `${data.logradouro}, ${data.numero}` : prev.endereco,
        cidade: data.cidade || prev.cidade,
        estado: data.estado || prev.estado,
        cep: data.cep || prev.cep
      }));
      toast.success('Dados preenchidos automaticamente!');
    }
  };

  const handleSaveEmpresa = async () => {
    if (!formData.razao_social.trim()) {
      toast.error('Razão Social é obrigatória');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('empresas')
        .insert({
          cliente_id: clienteId,
          ...formData
        });

      if (error) throw error;

      toast.success('Empresa cadastrada!');
      setShowForm(false);
      setFormData({
        razao_social: '',
        nome_fantasia: '',
        cnpj: '',
        email: '',
        telefone: '',
        endereco: '',
        cidade: '',
        estado: '',
        cep: ''
      });
      fetchEmpresas();
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEmpresa = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover esta empresa?')) return;

    await supabase
      .from('empresas')
      .update({ ativo: false })
      .eq('id', id);

    toast.success('Empresa removida');
    fetchEmpresas();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Briefcase className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <CardTitle>Empresas Participantes</CardTitle>
              <CardDescription>
                Cadastre as empresas do cliente que participarão das licitações.
                É possível ter múltiplas empresas por cliente.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* List */}
          <div className="space-y-3">
            {empresas.map((empresa) => (
              <div 
                key={empresa.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{empresa.razao_social}</p>
                    <p className="text-sm text-muted-foreground">
                      {empresa.nome_fantasia || empresa.cnpj || 'Sem dados adicionais'}
                    </p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => handleDeleteEmpresa(empresa.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}

            {empresas.length === 0 && (
              <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                <Briefcase className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma empresa cadastrada</p>
                <p className="text-sm">Adicione pelo menos uma empresa para continuar</p>
              </div>
            )}
          </div>

          <Button onClick={() => setShowForm(true)} variant="outline" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Empresa
          </Button>

          <div className="flex justify-between pt-4 border-t">
            <Button onClick={onBack} variant="ghost">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <Button onClick={onComplete} size="lg">
              Continuar
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nova Empresa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* CNPJ with auto-fill */}
            <div className="p-4 bg-muted/50 rounded-lg border-2 border-dashed">
              <Label>CNPJ (busca automática)</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={formData.cnpj}
                  onChange={(e) => setFormData(prev => ({ ...prev, cnpj: e.target.value }))}
                  placeholder="00.000.000/0000-00"
                  className="flex-1"
                />
                <Button onClick={handleCNPJLookup} disabled={loadingCNPJ} variant="secondary">
                  {loadingCNPJ ? 'Buscando...' : 'Buscar'}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Razão Social *</Label>
                <Input
                  value={formData.razao_social}
                  onChange={(e) => setFormData(prev => ({ ...prev, razao_social: e.target.value }))}
                  placeholder="Razão social da empresa"
                />
              </div>

              <div className="col-span-2">
                <Label>Nome Fantasia</Label>
                <Input
                  value={formData.nome_fantasia}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome_fantasia: e.target.value }))}
                  placeholder="Nome fantasia"
                />
              </div>

              <div>
                <Label>Email</Label>
                <Input
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@empresa.com"
                />
              </div>

              <div>
                <Label>Telefone</Label>
                <Input
                  value={formData.telefone}
                  onChange={(e) => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveEmpresa} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar Empresa'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}