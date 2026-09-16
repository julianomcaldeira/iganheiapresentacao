import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
  Users,
  Building2,
  Package,
  FileCheck,
  History,
  RefreshCw,
  Info,
  ArrowRight,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as XLSX from 'xlsx';

interface ImportHistory {
  id: string;
  tipo: string;
  nome_arquivo: string;
  total_registros: number;
  registros_sucesso: number;
  registros_erro: number;
  status: string;
  erros: any;
  created_at: string;
}

interface ImportConfig {
  type: string;
  label: string;
  icon: any;
  description: string;
  requiredFields: string[];
  optionalFields: string[];
  sampleData: any[];
}

const importConfigs: ImportConfig[] = [
  {
    type: 'licitacoes',
    label: 'Licitações',
    icon: FileText,
    description: 'Importe licitações com dados do processo',
    requiredFields: ['numero', 'orgao', 'objeto'],
    optionalFields: ['modalidade', 'portal', 'valor_estimado', 'data_abertura', 'data_encerramento', 'status', 'relevancia', 'observacoes'],
    sampleData: [
      { numero: 'PE-001/2024', orgao: 'Prefeitura de São Paulo', objeto: 'Aquisição de equipamentos de informática', modalidade: 'Pregão Eletrônico', valor_estimado: '150000.00', data_abertura: '2024-12-20', status: 'em_andamento' },
      { numero: 'TP-002/2024', orgao: 'Governo do Estado', objeto: 'Serviços de consultoria', modalidade: 'Tomada de Preços', valor_estimado: '80000.00', data_abertura: '2024-12-25', status: 'rascunho' },
    ],
  },
  {
    type: 'tarefas',
    label: 'Tarefas',
    icon: FileCheck,
    description: 'Importe tarefas e atividades',
    requiredFields: ['titulo'],
    optionalFields: ['descricao', 'status', 'prioridade', 'data_vencimento', 'tags'],
    sampleData: [
      { titulo: 'Tarefa 1', descricao: 'Descrição da tarefa', status: 'pendente', prioridade: 'alta', data_vencimento: '2024-12-31' },
      { titulo: 'Tarefa 2', descricao: 'Outra tarefa', status: 'em_andamento', prioridade: 'media', data_vencimento: '2024-12-15' },
    ],
  },
  {
    type: 'documentos',
    label: 'Documentos',
    icon: FileText,
    description: 'Importe documentos e certidões',
    requiredFields: ['nome', 'tipo'],
    optionalFields: ['descricao', 'data_validade', 'arquivo_url', 'status'],
    sampleData: [
      { nome: 'Certidão Negativa', tipo: 'Certidão', descricao: 'Certidão negativa de débitos', data_validade: '2025-06-30', status: 'vigente' },
      { nome: 'Atestado de Capacidade', tipo: 'Atestado', descricao: 'Atestado de capacidade técnica', status: 'vigente' },
    ],
  },
  {
    type: 'contratos',
    label: 'Contratos',
    icon: FileCheck,
    description: 'Importe contratos firmados',
    requiredFields: ['numero', 'objeto'],
    optionalFields: ['valor', 'data_inicio', 'data_fim', 'status', 'orgao_contratante', 'observacoes'],
    sampleData: [
      { numero: 'CT-001/2024', objeto: 'Fornecimento de equipamentos', valor: '250000.00', data_inicio: '2024-01-01', data_fim: '2024-12-31', status: 'vigente', orgao_contratante: 'Prefeitura Municipal' },
      { numero: 'CT-002/2024', objeto: 'Prestação de serviços', valor: '120000.00', data_inicio: '2024-06-01', data_fim: '2025-05-31', status: 'vigente', orgao_contratante: 'Governo Estadual' },
    ],
  },
  {
    type: 'empenhos',
    label: 'Empenhos',
    icon: Users,
    description: 'Importe notas de empenho',
    requiredFields: ['numero', 'valor'],
    optionalFields: ['contrato_numero', 'data_emissao', 'data_vencimento', 'status', 'descricao', 'orgao_emissor'],
    sampleData: [
      { numero: 'NE-001/2024', valor: '50000.00', contrato_numero: 'CT-001/2024', data_emissao: '2024-02-15', data_vencimento: '2024-03-15', status: 'pago', orgao_emissor: 'Prefeitura Municipal' },
      { numero: 'NE-002/2024', valor: '30000.00', contrato_numero: 'CT-001/2024', data_emissao: '2024-04-10', data_vencimento: '2024-05-10', status: 'a_receber', orgao_emissor: 'Prefeitura Municipal' },
    ],
  },
  {
    type: 'clientes',
    label: 'Clientes',
    icon: Building2,
    description: 'Importe clientes com CNPJ, endereço e contatos',
    requiredFields: ['nome'],
    optionalFields: ['cnpj', 'email', 'telefone', 'endereco', 'cidade', 'estado', 'cep'],
    sampleData: [
      { nome: 'Empresa ABC', cnpj: '12.345.678/0001-90', email: 'contato@abc.com', telefone: '(11) 99999-9999', cidade: 'São Paulo', estado: 'SP' },
      { nome: 'Empresa XYZ', cnpj: '98.765.432/0001-10', email: 'contato@xyz.com', telefone: '(21) 88888-8888', cidade: 'Rio de Janeiro', estado: 'RJ' },
    ],
  },
  {
    type: 'produtos',
    label: 'Produtos',
    icon: Package,
    description: 'Importe produtos e serviços oferecidos',
    requiredFields: ['nome'],
    optionalFields: ['descricao', 'codigo', 'categoria', 'preco', 'unidade'],
    sampleData: [
      { nome: 'Produto A', codigo: 'PROD-001', categoria: 'Eletrônicos', preco: '199.99', unidade: 'UN' },
      { nome: 'Serviço B', codigo: 'SERV-001', categoria: 'Consultoria', preco: '500.00', unidade: 'HR' },
    ],
  },
];

export default function Importacao() {
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole('admin');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedType, setSelectedType] = useState<string>('clientes');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [mappedFields, setMappedFields] = useState<Record<string, string>>({});
  const [importHistory, setImportHistory] = useState<ImportHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [fileName, setFileName] = useState<string>('');
  const [step, setStep] = useState<'select' | 'preview' | 'mapping' | 'importing' | 'complete'>('select');
  const [importResult, setImportResult] = useState<{ success: number; errors: number; errorDetails: any[] }>({ success: 0, errors: 0, errorDetails: [] });

  const currentConfig = importConfigs.find(c => c.type === selectedType)!;

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('importacoes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setImportHistory(data || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsUploading(true);
    setUploadProgress(20);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      setUploadProgress(50);

      if (jsonData.length < 2) {
        toast.error('O arquivo deve ter pelo menos uma linha de cabeçalho e uma de dados');
        return;
      }

      const headers = jsonData[0].map((h: any) => String(h || '').trim().toLowerCase());
      const rows = jsonData.slice(1).filter(row => row.some(cell => cell !== undefined && cell !== ''));

      setPreviewHeaders(headers);
      setPreviewData(rows.slice(0, 10).map(row => {
        const obj: any = {};
        headers.forEach((h, i) => {
          obj[h] = row[i];
        });
        return obj;
      }));

      // Auto-map fields
      const autoMap: Record<string, string> = {};
      const allFields = [...currentConfig.requiredFields, ...currentConfig.optionalFields];
      headers.forEach(header => {
        const match = allFields.find(f => 
          f.toLowerCase() === header || 
          header.includes(f.toLowerCase()) ||
          f.includes(header)
        );
        if (match) {
          autoMap[header] = match;
        }
      });
      setMappedFields(autoMap);

      setUploadProgress(100);
      setStep('mapping');
    } catch (error) {
      console.error('Error reading file:', error);
      toast.error('Erro ao ler o arquivo. Certifique-se de que é um arquivo Excel válido.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleImport = async () => {
    if (!previewData.length) return;

    // Validate required fields are mapped
    const mappedRequired = currentConfig.requiredFields.every(f => 
      Object.values(mappedFields).includes(f)
    );
    
    if (!mappedRequired) {
      toast.error(`Mapeie os campos obrigatórios: ${currentConfig.requiredFields.join(', ')}`);
      return;
    }

    setStep('importing');
    setImportResult({ success: 0, errors: 0, errorDetails: [] });

    try {
      // Re-read full file for import
      const file = fileInputRef.current?.files?.[0];
      let allData = previewData;
      
      // For full import, we'd re-parse the file here
      // For now, using preview data

      const results = { success: 0, errors: 0, errorDetails: [] as any[] };
      
      // Map import types to table names
      const tableMap: Record<string, string | null> = {
        clientes: 'clientes',
        tarefas: 'tarefas',
        produtos: 'produtos',
        licitacoes: 'licitacoes',
        documentos: null, // TODO: Create table
        contratos: null, // TODO: Create table
        empenhos: null, // TODO: Create table
      };
      
      const tableName = tableMap[selectedType];

      if (!tableName) {
        toast.error('Este tipo de importação requer uma tabela que ainda não foi criada. Por favor, contate o administrador.');
        setStep('select');
        return;
      }

      // Get user's profile to get cliente_id
      const { data: profileData } = await supabase
        .from('profiles')
        .select('cliente_id')
        .eq('id', user?.id)
        .single();

      for (let i = 0; i < allData.length; i++) {
        const row = allData[i];
        const record: any = {};

        // Map fields
        Object.entries(mappedFields).forEach(([sourceField, targetField]) => {
          if (row[sourceField] !== undefined && row[sourceField] !== '') {
            record[targetField] = row[sourceField];
          }
        });

        // Add required fields based on type
        if (tableName === 'tarefas') {
          record.criado_por = user?.id;
          if (!record.status) record.status = 'pendente';
          if (!record.prioridade) record.prioridade = 'media';
        }
        
        if (tableName === 'licitacoes') {
          record.created_by = user?.id;
          if (profileData?.cliente_id) {
            record.cliente_id = profileData.cliente_id;
          }
          if (!record.status) record.status = 'rascunho';
          // Will need workflow_id - use first active workflow or skip
          const { data: workflow } = await supabase
            .from('licitacao_workflows')
            .select('id')
            .eq('cliente_id', profileData?.cliente_id)
            .eq('ativo', true)
            .limit(1)
            .single();
          if (workflow) {
            record.workflow_id = workflow.id;
          } else {
            results.errors++;
            results.errorDetails.push({ row: i + 2, error: 'Nenhum workflow ativo encontrado para este cliente', data: record });
            continue;
          }
        }
        
        if (tableName === 'produtos') {
          if (profileData?.cliente_id) {
            record.cliente_id = profileData.cliente_id;
          }
          if (!record.tipo) record.tipo = 'produto';
          if (!record.codigo) record.codigo = `PROD-${Date.now()}-${i}`;
        }

        try {
          const { error } = await supabase.from(tableName as any).insert(record);
          if (error) {
            results.errors++;
            results.errorDetails.push({ row: i + 2, error: error.message, data: record });
          } else {
            results.success++;
          }
        } catch (err: any) {
          results.errors++;
          results.errorDetails.push({ row: i + 2, error: err.message, data: record });
        }

        setUploadProgress(Math.round((i / allData.length) * 100));
      }

      // Save import history
      await supabase.from('importacoes').insert({
        tipo: selectedType,
        nome_arquivo: fileName,
        total_registros: allData.length,
        registros_sucesso: results.success,
        registros_erro: results.errors,
        status: results.errors === 0 ? 'concluido' : results.success === 0 ? 'erro' : 'concluido',
        erros: results.errorDetails.length > 0 ? results.errorDetails : null,
        importado_por: user?.id,
      });

      setImportResult(results);
      setStep('complete');
      fetchHistory();

      if (results.errors === 0) {
        toast.success(`${results.success} registros importados com sucesso!`);
      } else {
        toast.warning(`Importação concluída com ${results.errors} erros`);
      }
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error('Erro durante a importação');
      setStep('select');
    }
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet(currentConfig.sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, `template_${selectedType}.xlsx`);
    toast.success('Template baixado!');
  };

  const resetImport = () => {
    setStep('select');
    setPreviewData([]);
    setPreviewHeaders([]);
    setMappedFields({});
    setFileName('');
    setUploadProgress(0);
  };

  return (
    <MainLayout title="Importação de Dados" subtitle="Importe dados de planilhas para o sistema">
      <Tabs defaultValue="importar">
        <TabsList className="mb-6">
          <TabsTrigger value="importar">
            <Upload className="w-4 h-4 mr-2" />
            Importar
          </TabsTrigger>
          <TabsTrigger value="historico">
            <History className="w-4 h-4 mr-2" />
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="importar">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left - Type Selection */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg">Tipo de Dados</CardTitle>
                <CardDescription>Selecione o que deseja importar</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {importConfigs.map((config) => (
                  <button
                    key={config.type}
                    onClick={() => {
                      setSelectedType(config.type);
                      resetImport();
                    }}
                    className={cn(
                      "w-full p-4 rounded-lg border text-left transition-all",
                      selectedType === config.type 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        selectedType === config.type ? "bg-primary/10" : "bg-muted"
                      )}>
                        <config.icon className={cn(
                          "w-5 h-5",
                          selectedType === config.type ? "text-primary" : "text-muted-foreground"
                        )} />
                      </div>
                      <div>
                        <p className="font-medium">{config.label}</p>
                        <p className="text-xs text-muted-foreground">{config.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Right - Import Area */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      Importar {currentConfig.label}
                    </CardTitle>
                    <CardDescription>
                      Campos obrigatórios: {currentConfig.requiredFields.join(', ')}
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={downloadTemplate}>
                    <Download className="w-4 h-4 mr-2" />
                    Template
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {step === 'select' && (
                  <div className="space-y-4">
                    <div 
                      className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <FileSpreadsheet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <p className="font-medium">Clique para selecionar um arquivo</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Suporta arquivos .xlsx, .xls ou .csv
                      </p>
                    </div>

                    {isUploading && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Processando arquivo...</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <Progress value={uploadProgress} />
                      </div>
                    )}

                    <div className="bg-muted/50 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium mb-1">Dicas para importação:</p>
                          <ul className="list-disc list-inside text-muted-foreground space-y-1">
                            <li>A primeira linha deve conter os nomes das colunas</li>
                            <li>Baixe o template para ver o formato esperado</li>
                            <li>Campos com data devem estar no formato YYYY-MM-DD</li>
                            <li>Você poderá mapear os campos antes de importar</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {step === 'mapping' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{fileName}</p>
                        <p className="text-sm text-muted-foreground">{previewData.length} registros encontrados</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={resetImport}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Cancelar
                      </Button>
                    </div>

                    <div className="border rounded-lg p-4 space-y-3">
                      <p className="font-medium text-sm">Mapeamento de Campos</p>
                      <div className="grid grid-cols-2 gap-3">
                        {previewHeaders.map((header) => (
                          <div key={header} className="flex items-center gap-2">
                            <span className="text-sm font-mono bg-muted px-2 py-1 rounded truncate flex-1">
                              {header}
                            </span>
                            <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                            <Select
                              value={mappedFields[header] || ''}
                              onValueChange={(value) => setMappedFields({ ...mappedFields, [header]: value })}
                            >
                              <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Ignorar" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">Ignorar</SelectItem>
                                {[...currentConfig.requiredFields, ...currentConfig.optionalFields].map((f) => (
                                  <SelectItem key={f} value={f}>
                                    {f} {currentConfig.requiredFields.includes(f) && '*'}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="border rounded-lg overflow-hidden">
                      <p className="font-medium text-sm p-3 bg-muted">Preview (primeiros 5 registros)</p>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {previewHeaders.map((h) => (
                                <TableHead key={h} className="text-xs">{h}</TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {previewData.slice(0, 5).map((row, i) => (
                              <TableRow key={i}>
                                {previewHeaders.map((h) => (
                                  <TableCell key={h} className="text-xs">{row[h] || '-'}</TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3">
                      <Button variant="outline" onClick={resetImport}>Cancelar</Button>
                      <Button onClick={handleImport} className="gradient-primary text-primary-foreground">
                        <Upload className="w-4 h-4 mr-2" />
                        Importar {previewData.length} registros
                      </Button>
                    </div>
                  </div>
                )}

                {step === 'importing' && (
                  <div className="text-center py-8">
                    <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                    <p className="font-medium">Importando dados...</p>
                    <p className="text-sm text-muted-foreground">Por favor, aguarde</p>
                    <Progress value={uploadProgress} className="mt-4" />
                  </div>
                )}

                {step === 'complete' && (
                  <div className="space-y-4">
                    <div className="text-center py-4">
                      {importResult.errors === 0 ? (
                        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                      ) : (
                        <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
                      )}
                      <p className="font-medium text-lg">Importação Concluída</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-emerald-500/10 rounded-lg p-4 text-center">
                        <p className="text-3xl font-bold text-emerald-600">{importResult.success}</p>
                        <p className="text-sm text-emerald-600">Sucessos</p>
                      </div>
                      <div className="bg-red-500/10 rounded-lg p-4 text-center">
                        <p className="text-3xl font-bold text-red-600">{importResult.errors}</p>
                        <p className="text-sm text-red-600">Erros</p>
                      </div>
                    </div>

                    {importResult.errorDetails.length > 0 && (
                      <div className="border rounded-lg overflow-hidden">
                        <p className="font-medium text-sm p-3 bg-red-500/10 text-red-600">Detalhes dos Erros</p>
                        <div className="max-h-40 overflow-y-auto">
                          {importResult.errorDetails.slice(0, 10).map((err, i) => (
                            <div key={i} className="p-2 border-b text-xs">
                              <span className="font-medium">Linha {err.row}:</span> {err.error}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <Button onClick={resetImport} className="w-full">
                      Nova Importação
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="historico">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Histórico de Importações</CardTitle>
                  <CardDescription>Últimas importações realizadas</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={fetchHistory}>
                  <RefreshCw className={cn("w-4 h-4 mr-2", isLoadingHistory && "animate-spin")} />
                  Atualizar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : importHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma importação realizada ainda
                </div>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Arquivo</TableHead>
                        <TableHead>Registros</TableHead>
                        <TableHead>Sucesso</TableHead>
                        <TableHead>Erros</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importHistory.map((imp) => (
                        <TableRow key={imp.id}>
                          <TableCell className="text-sm">
                            {format(new Date(imp.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{imp.tipo}</Badge>
                          </TableCell>
                          <TableCell className="text-sm truncate max-w-[150px]">
                            {imp.nome_arquivo}
                          </TableCell>
                          <TableCell>{imp.total_registros}</TableCell>
                          <TableCell className="text-emerald-600">{imp.registros_sucesso}</TableCell>
                          <TableCell className="text-red-600">{imp.registros_erro}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                imp.status === 'concluido' && "bg-emerald-500/10 text-emerald-600",
                                imp.status === 'erro' && "bg-red-500/10 text-red-600",
                                imp.status === 'processando' && "bg-blue-500/10 text-blue-600"
                              )}
                            >
                              {imp.status === 'concluido' ? 'Concluído' : 
                               imp.status === 'erro' ? 'Erro' : 'Processando'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
