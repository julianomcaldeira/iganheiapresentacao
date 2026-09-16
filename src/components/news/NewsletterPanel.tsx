import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Save, Loader2, Send, Clock, CheckCircle, XCircle, Mail } from 'lucide-react';

export function NewsletterPanel() {
  const { user, profile, isAdmin } = useAuth();
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState('');
  const [agendamento, setAgendamento] = useState<any>(null);
  const [envios, setEnvios] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchEmpresas();
  }, [profile?.cliente_id]);

  useEffect(() => {
    if (selectedEmpresaId) {
      fetchAgendamento();
      fetchEnvios();
    }
  }, [selectedEmpresaId]);

  const fetchEmpresas = async () => {
    const clienteId = profile?.cliente_id;
    let query = supabase.from('empresas').select('id, razao_social, nome_fantasia').eq('ativo', true).order('razao_social');
    if (clienteId) query = query.eq('cliente_id', clienteId);
    const { data } = await query;
    setEmpresas(data || []);
    if (data && data.length > 0) setSelectedEmpresaId(data[0].id);
  };

  const fetchAgendamento = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('newsletter_agendamentos')
      .select('*')
      .eq('empresa_id', selectedEmpresaId)
      .maybeSingle();

    setAgendamento(data || {
      empresa_id: selectedEmpresaId,
      ativo: false,
      horario_envio: '08:00',
    });
    setLoading(false);
  };

  const fetchEnvios = async () => {
    const { data } = await supabase
      .from('newsletter_envios')
      .select('*')
      .eq('empresa_id', selectedEmpresaId)
      .order('created_at', { ascending: false })
      .limit(20);
    setEnvios(data || []);
  };

  const handleSave = async () => {
    if (!agendamento) return;
    setSaving(true);
    try {
      const payload = {
        empresa_id: selectedEmpresaId,
        ativo: agendamento.ativo,
        horario_envio: agendamento.horario_envio,
        criado_por: user?.id,
      };

      if (agendamento.id) {
        await supabase.from('newsletter_agendamentos').update(payload).eq('id', agendamento.id);
      } else {
        const { data } = await supabase.from('newsletter_agendamentos').insert(payload).select().single();
        if (data) setAgendamento(data);
      }
      toast.success('Agendamento salvo!');
    } catch {
      toast.error('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleSendNow = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('cron-newsletter', {
        body: { force_empresa_id: selectedEmpresaId },
      });
      if (error) throw error;
      toast.success('Newsletter enviada!');
      fetchEnvios();
    } catch (e: any) {
      toast.error(`Erro: ${e.message}`);
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'enviado':
        return <Badge variant="default" className="flex items-center gap-1"><CheckCircle className="h-3 w-3" />Enviado</Badge>;
      case 'erro':
        return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="h-3 w-3" />Erro</Badge>;
      default:
        return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="h-3 w-3" />Pendente</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Schedule Config */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Agendamento de Newsletter
          </CardTitle>
          <CardDescription>Configure o envio automático diário de notícias por e-mail</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label>Empresa</Label>
              <Select value={selectedEmpresaId} onValueChange={setSelectedEmpresaId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {empresas.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.nome_fantasia || e.razao_social}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {agendamento && !loading && (
            <>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={agendamento.ativo}
                    onCheckedChange={(v) => setAgendamento({ ...agendamento, ativo: v })}
                  />
                  <Label>Envio automático ativo</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Label>Horário (BRT)</Label>
                  <Input
                    type="time"
                    className="w-32"
                    value={agendamento.horario_envio?.slice(0, 5) || '08:00'}
                    onChange={(e) => setAgendamento({ ...agendamento, horario_envio: e.target.value })}
                  />
                </div>
              </div>

              {agendamento.ultimo_envio_em && (
                <p className="text-sm text-muted-foreground">
                  Último envio: {format(new Date(agendamento.ultimo_envio_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              )}

              <div className="flex gap-3">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Salvar
                </Button>
                <Button variant="outline" onClick={handleSendNow} disabled={sending}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                  Enviar Agora
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Send History */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Envios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead className="text-center">Notícias</TableHead>
                  <TableHead className="text-center">Destinatários</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {envios.map(envio => (
                  <TableRow key={envio.id}>
                    <TableCell className="text-sm">
                      {envio.periodo_inicio && envio.periodo_fim
                        ? `${format(new Date(envio.periodo_inicio), 'dd/MM', { locale: ptBR })} — ${format(new Date(envio.periodo_fim), 'dd/MM', { locale: ptBR })}`
                        : '-'}
                    </TableCell>
                    <TableCell className="text-center font-medium">{envio.total_noticias}</TableCell>
                    <TableCell className="text-center">{envio.total_destinatarios}</TableCell>
                    <TableCell>{getStatusBadge(envio.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(envio.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
                    </TableCell>
                  </TableRow>
                ))}
                {envios.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhum envio registrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
