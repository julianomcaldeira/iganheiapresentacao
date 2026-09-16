import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, Eye, Mail, CheckCircle, XCircle, Clock, MousePointer, MailOpen, RefreshCw } from 'lucide-react';
import { PaginationControls } from '@/components/ui/pagination-controls';

interface EmailEnvio {
  id: string;
  destinatario_email: string;
  destinatario_nome: string | null;
  assunto: string;
  conteudo_html: string;
  status: string;
  erro: string | null;
  enviado_em: string | null;
  created_at: string;
  template?: {
    nome: string;
  } | null;
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any }> = {
  pendente: { label: 'Pendente', variant: 'secondary', icon: Clock },
  enviado: { label: 'Enviado', variant: 'default', icon: Mail },
  falha: { label: 'Falha', variant: 'destructive', icon: XCircle },
  entregue: { label: 'Entregue', variant: 'outline', icon: CheckCircle },
  aberto: { label: 'Aberto', variant: 'outline', icon: MailOpen },
  clicado: { label: 'Clicado', variant: 'outline', icon: MousePointer },
};

export function EmailEnviosTab() {
  const { profile, isAdmin } = useAuth();
  const [envios, setEnvios] = useState<EmailEnvio[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [selectedEnvio, setSelectedEnvio] = useState<EmailEnvio | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([]);
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(profile?.cliente_id || null);

  useEffect(() => {
    if (isAdmin && !profile?.cliente_id) {
      fetchClientes();
    }
  }, [isAdmin, profile?.cliente_id]);

  useEffect(() => {
    const clienteId = profile?.cliente_id || selectedClienteId;
    if (clienteId) {
      fetchEnvios(clienteId);
    } else {
      setLoading(false);
    }
  }, [profile?.cliente_id, selectedClienteId, currentPage, itemsPerPage, statusFilter]);

  const fetchClientes = async () => {
    const { data } = await supabase
      .from('clientes')
      .select('id, nome')
      .eq('ativo', true)
      .order('nome');
    setClientes(data || []);
    if (data && data.length > 0 && !selectedClienteId) {
      setSelectedClienteId(data[0].id);
    }
  };

  const fetchEnvios = async (clienteId: string) => {
    setLoading(true);
    try {
      let query = supabase
        .from('email_envios')
        .select(`
          *,
          template:email_templates(nome)
        `, { count: 'exact' })
        .eq('cliente_id', clienteId)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'todos') {
        query = query.eq('status', statusFilter);
      }

      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;
      setEnvios((data as EmailEnvio[]) || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Erro ao buscar envios:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentClienteId = profile?.cliente_id || selectedClienteId;

  const filteredEnvios = envios.filter(e =>
    e.destinatario_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.assunto.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.destinatario_nome?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.pendente;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  // Stats
  const stats = {
    total: totalCount,
    enviados: envios.filter(e => ['enviado', 'entregue', 'aberto', 'clicado'].includes(e.status)).length,
    falhas: envios.filter(e => e.status === 'falha').length,
    pendentes: envios.filter(e => e.status === 'pendente').length,
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const startIndex = totalCount > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endIndex = Math.min(currentPage * itemsPerPage, totalCount);

  if (loading && envios.length === 0) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total de Envios</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.enviados}</p>
                <p className="text-sm text-muted-foreground">Enviados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{stats.falhas}</p>
                <p className="text-sm text-muted-foreground">Falhas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{stats.pendentes}</p>
                <p className="text-sm text-muted-foreground">Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle>Histórico de Envios</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="enviado">Enviado</SelectItem>
                  <SelectItem value="entregue">Entregue</SelectItem>
                  <SelectItem value="aberto">Aberto</SelectItem>
                  <SelectItem value="clicado">Clicado</SelectItem>
                  <SelectItem value="falha">Falha</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => currentClienteId && fetchEnvios(currentClienteId)}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Destinatário</TableHead>
                  <TableHead>Assunto</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEnvios.map((envio) => (
                  <TableRow key={envio.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{envio.destinatario_nome || '-'}</p>
                        <p className="text-sm text-muted-foreground">{envio.destinatario_email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {envio.assunto}
                    </TableCell>
                    <TableCell>
                      {envio.template?.nome || '-'}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(envio.status)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(envio.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedEnvio(envio)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredEnvios.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum envio encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalCount}
            itemsPerPage={itemsPerPage}
            startIndex={startIndex}
            endIndex={endIndex}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(count) => { setItemsPerPage(count); setCurrentPage(1); }}
          />
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedEnvio} onOpenChange={() => setSelectedEnvio(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Envio</DialogTitle>
          </DialogHeader>
          {selectedEnvio && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Destinatário</p>
                  <p className="font-medium">{selectedEnvio.destinatario_email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(selectedEnvio.status)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data de Criação</p>
                  <p>{format(new Date(selectedEnvio.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data de Envio</p>
                  <p>{selectedEnvio.enviado_em ? format(new Date(selectedEnvio.enviado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '-'}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Assunto</p>
                <p className="font-medium">{selectedEnvio.assunto}</p>
              </div>

              {selectedEnvio.erro && (
                <div className="bg-destructive/10 border border-destructive/20 rounded p-3">
                  <p className="text-sm text-destructive font-medium">Erro:</p>
                  <p className="text-sm">{selectedEnvio.erro}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground mb-2">Conteúdo</p>
                <div
                  className="border rounded p-4 bg-white dark:bg-background max-h-[300px] overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: selectedEnvio.conteudo_html }}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
