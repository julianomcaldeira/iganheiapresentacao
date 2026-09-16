import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Building2, ArrowRight, Upload, CheckCircle2 } from 'lucide-react';
import { useCNPJLookup } from '@/hooks/useCNPJLookup';

interface Props {
  clienteId: string;
  onComplete: (data: Record<string, any>) => void;
}

export function OnboardingStep1Cliente({ clienteId, onComplete }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { lookupCNPJ, isLoading: loadingCNPJ } = useCNPJLookup();
  const [formData, setFormData] = useState({
    nome: '',
    cnpj: '',
    email: '',
    telefone: '',
    endereco: '',
    cidade: '',
    estado: '',
    cep: ''
  });

  useEffect(() => {
    fetchCliente();
  }, [clienteId]);

  const fetchCliente = async () => {
    const { data } = await supabase
      .from('clientes')
      .select('*')
      .eq('id', clienteId)
      .single();

    if (data) {
      setFormData({
        nome: data.nome || '',
        cnpj: data.cnpj || '',
        email: data.email || '',
        telefone: data.telefone || '',
        endereco: data.endereco || '',
        cidade: data.cidade || '',
        estado: data.estado || '',
        cep: data.cep || ''
      });
    }
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
        nome: data.razaoSocial || prev.nome,
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

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('clientes')
        .update(formData)
        .eq('id', clienteId);

      if (error) throw error;

      toast.success('Dados salvos com sucesso!');
      onComplete(formData);
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Building2 className="h-6 w-6 text-blue-500" />
          </div>
          <div>
            <CardTitle>Dados do Cliente</CardTitle>
            <CardDescription>
              Preencha as informações básicas da empresa. Use o CNPJ para buscar dados automaticamente.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* CNPJ with auto-fill */}
        <div className="p-4 bg-muted/50 rounded-lg border-2 border-dashed">
          <Label className="text-sm font-medium">CNPJ (busca automática)</Label>
          <div className="flex gap-2 mt-2">
            <Input
              value={formData.cnpj}
              onChange={(e) => setFormData(prev => ({ ...prev, cnpj: e.target.value }))}
              placeholder="00.000.000/0000-00"
              className="flex-1"
            />
            <Button 
              onClick={handleCNPJLookup} 
              disabled={loadingCNPJ}
              variant="secondary"
            >
              {loadingCNPJ ? 'Buscando...' : 'Buscar'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Digite o CNPJ e clique em buscar para preencher automaticamente os dados da Receita Federal
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label>Nome / Razão Social *</Label>
            <Input
              value={formData.nome}
              onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
              placeholder="Nome da empresa"
            />
          </div>

          <div>
            <Label>Email</Label>
            <Input
              type="email"
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

          <div className="md:col-span-2">
            <Label>Endereço</Label>
            <Input
              value={formData.endereco}
              onChange={(e) => setFormData(prev => ({ ...prev, endereco: e.target.value }))}
              placeholder="Rua, número, complemento"
            />
          </div>

          <div>
            <Label>Cidade</Label>
            <Input
              value={formData.cidade}
              onChange={(e) => setFormData(prev => ({ ...prev, cidade: e.target.value }))}
              placeholder="Cidade"
            />
          </div>

          <div>
            <Label>Estado</Label>
            <Input
              value={formData.estado}
              onChange={(e) => setFormData(prev => ({ ...prev, estado: e.target.value }))}
              placeholder="UF"
              maxLength={2}
            />
          </div>

          <div>
            <Label>CEP</Label>
            <Input
              value={formData.cep}
              onChange={(e) => setFormData(prev => ({ ...prev, cep: e.target.value }))}
              placeholder="00000-000"
            />
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleSave} disabled={saving} size="lg">
            {saving ? 'Salvando...' : (
              <>
                Salvar e Continuar
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}