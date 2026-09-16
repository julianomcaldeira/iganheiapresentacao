import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Database,
  FileText,
  Users,
  Building2,
  FileSignature,
  FileCheck,
  ClipboardList,
  Plus,
  Trash2,
  Filter,
  Eye,
  Download,
  X,
  GripVertical,
  ChevronRight,
  Save,
  Play,
  FileSpreadsheet,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { exportReport, ExportFormat } from '@/lib/exportUtils';

// Definição das fontes de dados e seus campos
const dataSources = {
  licitacoes: {
    label: 'Licitações',
    icon: FileText,
    fields: [
      { key: 'numero', label: 'Número', type: 'text' },
      { key: 'orgao', label: 'Órgão', type: 'text' },
      { key: 'objeto', label: 'Objeto', type: 'text' },
      { key: 'valor', label: 'Valor', type: 'currency' },
      { key: 'dataAbertura', label: 'Data de Abertura', type: 'date' },
      { key: 'dataEncerramento', label: 'Data de Encerramento', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: ['nova', 'em_analise', 'aprovada', 'participando', 'ganha', 'perdida', 'cancelada'] },
      { key: 'relevancia', label: 'Relevância', type: 'select', options: ['alta', 'media', 'baixa'] },
      { key: 'modalidade', label: 'Modalidade', type: 'text' },
      { key: 'portal', label: 'Portal', type: 'text' },
    ],
  },
  clientes: {
    label: 'Clientes',
    icon: Users,
    fields: [
      { key: 'nome', label: 'Nome', type: 'text' },
      { key: 'cnpj', label: 'CNPJ', type: 'text' },
      { key: 'email', label: 'E-mail', type: 'text' },
      { key: 'telefone', label: 'Telefone', type: 'text' },
      { key: 'status', label: 'Status', type: 'select', options: ['ativo', 'inativo'] },
      { key: 'palavrasChavePositivas', label: 'Palavras-chave Positivas', type: 'array' },
      { key: 'palavrasChaveNegativas', label: 'Palavras-chave Negativas', type: 'array' },
      { key: 'totalEmpresas', label: 'Total de Empresas', type: 'number' },
    ],
  },
  empresas: {
    label: 'Empresas',
    icon: Building2,
    fields: [
      { key: 'cnpj', label: 'CNPJ', type: 'text' },
      { key: 'razaoSocial', label: 'Razão Social', type: 'text' },
      { key: 'nomeFantasia', label: 'Nome Fantasia', type: 'text' },
      { key: 'situacao', label: 'Situação', type: 'select', options: ['ativa', 'inativa'] },
      { key: 'cidade', label: 'Cidade', type: 'text' },
      { key: 'estado', label: 'Estado', type: 'text' },
      { key: 'documentosValidos', label: 'Docs Válidos', type: 'number' },
      { key: 'documentosVencidos', label: 'Docs Vencidos', type: 'number' },
      { key: 'cliente', label: 'Cliente', type: 'text' },
    ],
  },
  contratos: {
    label: 'Contratos',
    icon: FileSignature,
    fields: [
      { key: 'numero', label: 'Número', type: 'text' },
      { key: 'orgao', label: 'Órgão', type: 'text' },
      { key: 'objeto', label: 'Objeto', type: 'text' },
      { key: 'valorTotal', label: 'Valor Total', type: 'currency' },
      { key: 'dataInicio', label: 'Data Início', type: 'date' },
      { key: 'dataFim', label: 'Data Fim', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: ['ativo', 'encerrado', 'suspenso'] },
      { key: 'empresa', label: 'Empresa', type: 'text' },
      { key: 'licitacao', label: 'Licitação', type: 'text' },
    ],
  },
  documentos: {
    label: 'Documentos',
    icon: FileCheck,
    fields: [
      { key: 'nome', label: 'Nome', type: 'text' },
      { key: 'tipo', label: 'Tipo', type: 'text' },
      { key: 'empresa', label: 'Empresa', type: 'text' },
      { key: 'dataEmissao', label: 'Data de Emissão', type: 'date' },
      { key: 'dataVencimento', label: 'Data de Vencimento', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: ['valido', 'vencido', 'proximo_vencimento'] },
    ],
  },
  pendencias: {
    label: 'Pendências',
    icon: ClipboardList,
    fields: [
      { key: 'titulo', label: 'Título', type: 'text' },
      { key: 'descricao', label: 'Descrição', type: 'text' },
      { key: 'tipo', label: 'Tipo', type: 'select', options: ['workflow', 'documento', 'licitacao', 'contrato'] },
      { key: 'prioridade', label: 'Prioridade', type: 'select', options: ['alta', 'media', 'baixa'] },
      { key: 'prazo', label: 'Prazo', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: ['pendente', 'em_andamento', 'concluida'] },
    ],
  },
};

type DataSourceKey = keyof typeof dataSources;

interface SelectedField {
  key: string;
  label: string;
  type: string;
  options?: string[];
}

interface ReportFilter {
  id: string;
  field: string;
  operator: string;
  value: string;
}

interface ReportBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (report: any) => void;
}

const filterOperators = {
  text: [
    { value: 'contains', label: 'Contém' },
    { value: 'equals', label: 'É igual a' },
    { value: 'starts_with', label: 'Começa com' },
    { value: 'ends_with', label: 'Termina com' },
    { value: 'not_contains', label: 'Não contém' },
  ],
  number: [
    { value: 'equals', label: 'É igual a' },
    { value: 'greater', label: 'Maior que' },
    { value: 'less', label: 'Menor que' },
    { value: 'between', label: 'Entre' },
  ],
  currency: [
    { value: 'equals', label: 'É igual a' },
    { value: 'greater', label: 'Maior que' },
    { value: 'less', label: 'Menor que' },
    { value: 'between', label: 'Entre' },
  ],
  date: [
    { value: 'equals', label: 'É igual a' },
    { value: 'before', label: 'Antes de' },
    { value: 'after', label: 'Depois de' },
    { value: 'between', label: 'Entre' },
    { value: 'last_7_days', label: 'Últimos 7 dias' },
    { value: 'last_30_days', label: 'Últimos 30 dias' },
    { value: 'this_month', label: 'Este mês' },
    { value: 'this_year', label: 'Este ano' },
  ],
  select: [
    { value: 'equals', label: 'É igual a' },
    { value: 'not_equals', label: 'Não é igual a' },
    { value: 'in', label: 'Está em' },
  ],
  array: [
    { value: 'contains', label: 'Contém' },
    { value: 'not_contains', label: 'Não contém' },
  ],
};

// Mock data for preview
const generateMockData = (source: DataSourceKey, fields: SelectedField[]) => {
  const mockRows: Record<string, any>[] = [];
  const sampleData: Record<DataSourceKey, Record<string, any>[]> = {
    licitacoes: [
      { numero: 'PE-001/2024', orgao: 'Prefeitura de São Paulo', objeto: 'Aquisição de equipamentos de TI', valor: 150000, dataAbertura: '2024-01-15', status: 'ganha', relevancia: 'alta', modalidade: 'Pregão Eletrônico', portal: 'ComprasNet' },
      { numero: 'PE-002/2024', orgao: 'Governo do Estado', objeto: 'Serviços de manutenção', valor: 80000, dataAbertura: '2024-01-20', status: 'participando', relevancia: 'media', modalidade: 'Pregão Eletrônico', portal: 'BEC' },
      { numero: 'CC-003/2024', orgao: 'Ministério da Saúde', objeto: 'Fornecimento de medicamentos', valor: 500000, dataAbertura: '2024-02-01', status: 'em_analise', relevancia: 'alta', modalidade: 'Concorrência', portal: 'ComprasNet' },
    ],
    clientes: [
      { nome: 'Tech Solutions LTDA', cnpj: '12.345.678/0001-90', email: 'contato@tech.com', telefone: '(11) 99999-9999', status: 'ativo', totalEmpresas: 3 },
      { nome: 'ABC Comércio', cnpj: '98.765.432/0001-10', email: 'abc@comercio.com', telefone: '(21) 88888-8888', status: 'ativo', totalEmpresas: 2 },
    ],
    empresas: [
      { cnpj: '12.345.678/0001-90', razaoSocial: 'Tech Solutions LTDA', nomeFantasia: 'Tech Solutions', situacao: 'ativa', cidade: 'São Paulo', estado: 'SP', documentosValidos: 8, documentosVencidos: 1 },
      { cnpj: '11.222.333/0001-44', razaoSocial: 'Tech SP Filial', nomeFantasia: 'Tech SP', situacao: 'ativa', cidade: 'Campinas', estado: 'SP', documentosValidos: 6, documentosVencidos: 0 },
    ],
    contratos: [
      { numero: 'CT-001/2024', orgao: 'Prefeitura de São Paulo', objeto: 'Fornecimento de equipamentos', valorTotal: 150000, dataInicio: '2024-02-01', dataFim: '2025-02-01', status: 'ativo' },
      { numero: 'CT-002/2024', orgao: 'Governo do Estado', objeto: 'Serviços de TI', valorTotal: 80000, dataInicio: '2024-03-01', dataFim: '2024-09-01', status: 'ativo' },
    ],
    documentos: [
      { nome: 'Certidão Negativa Federal', tipo: 'Certidão', empresa: 'Tech Solutions', dataEmissao: '2024-01-01', dataVencimento: '2024-07-01', status: 'valido' },
      { nome: 'Alvará de Funcionamento', tipo: 'Alvará', empresa: 'Tech Solutions', dataEmissao: '2024-01-15', dataVencimento: '2025-01-15', status: 'valido' },
    ],
    pendencias: [
      { titulo: 'Renovar CND Federal', descricao: 'Certidão vence em 30 dias', tipo: 'documento', prioridade: 'alta', prazo: '2024-06-15', status: 'pendente' },
      { titulo: 'Enviar proposta PE-002', descricao: 'Prazo até amanhã', tipo: 'licitacao', prioridade: 'alta', prazo: '2024-01-21', status: 'em_andamento' },
    ],
  };

  const sourceData = sampleData[source] || [];
  return sourceData.map(row => {
    const filteredRow: Record<string, any> = {};
    fields.forEach(field => {
      filteredRow[field.key] = row[field.key] || '-';
    });
    return filteredRow;
  });
};

export function ReportBuilder({ open, onOpenChange, onSave }: ReportBuilderProps) {
  const [step, setStep] = useState(1);
  const [reportName, setReportName] = useState('');
  const [selectedSource, setSelectedSource] = useState<DataSourceKey | null>(null);
  const [selectedFields, setSelectedFields] = useState<SelectedField[]>([]);
  const [filters, setFilters] = useState<ReportFilter[]>([]);
  const [previewData, setPreviewData] = useState<Record<string, any>[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const resetBuilder = () => {
    setStep(1);
    setReportName('');
    setSelectedSource(null);
    setSelectedFields([]);
    setFilters([]);
    setPreviewData([]);
    setShowPreview(false);
  };

  const handleClose = () => {
    resetBuilder();
    onOpenChange(false);
  };

  const handleSourceSelect = (source: DataSourceKey) => {
    setSelectedSource(source);
    setSelectedFields([]);
    setFilters([]);
  };

  const handleFieldToggle = (field: SelectedField) => {
    setSelectedFields(prev => {
      const exists = prev.find(f => f.key === field.key);
      if (exists) {
        return prev.filter(f => f.key !== field.key);
      }
      return [...prev, field];
    });
  };

  const handleAddFilter = () => {
    if (selectedFields.length === 0) return;
    const newFilter: ReportFilter = {
      id: Date.now().toString(),
      field: selectedFields[0].key,
      operator: 'contains',
      value: '',
    };
    setFilters(prev => [...prev, newFilter]);
  };

  const handleUpdateFilter = (id: string, updates: Partial<ReportFilter>) => {
    setFilters(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const handleRemoveFilter = (id: string) => {
    setFilters(prev => prev.filter(f => f.id !== id));
  };

  const handlePreview = () => {
    if (!selectedSource || selectedFields.length === 0) {
      toast.error('Selecione pelo menos uma fonte de dados e um campo');
      return;
    }
    const data = generateMockData(selectedSource, selectedFields);
    setPreviewData(data);
    setShowPreview(true);
  };

  const handleSaveReport = () => {
    if (!reportName.trim()) {
      toast.error('Digite um nome para o relatório');
      return;
    }
    if (!selectedSource || selectedFields.length === 0) {
      toast.error('Configure o relatório antes de salvar');
      return;
    }

    const report = {
      id: Date.now().toString(),
      nome: reportName,
      fonte: selectedSource,
      campos: selectedFields,
      filtros: filters,
      criadoEm: new Date().toISOString(),
    };

    onSave?.(report);
    toast.success('Relatório salvo com sucesso!');
    handleClose();
  };

  const getFieldByKey = (key: string): SelectedField | undefined => {
    if (!selectedSource) return undefined;
    return dataSources[selectedSource].fields.find(f => f.key === key) as SelectedField;
  };

  const formatCellValue = (value: any, type: string) => {
    if (value === null || value === undefined || value === '-') return '-';
    switch (type) {
      case 'currency':
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
      case 'date':
        return new Date(value).toLocaleDateString('pt-BR');
      case 'array':
        return Array.isArray(value) ? value.join(', ') : value;
      default:
        return value;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            Construtor de Relatórios
          </DialogTitle>
          <DialogDescription>
            Crie relatórios personalizados selecionando fontes de dados, campos e filtros
          </DialogDescription>
        </DialogHeader>

        {/* Steps Indicator */}
        <div className="flex items-center gap-2 py-4 border-b border-border">
          {[
            { num: 1, label: 'Fonte de Dados' },
            { num: 2, label: 'Campos' },
            { num: 3, label: 'Filtros' },
            { num: 4, label: 'Finalizar' },
          ].map((s, i) => (
            <div key={s.num} className="flex items-center">
              <button
                onClick={() => s.num <= step && setStep(s.num)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors',
                  step === s.num
                    ? 'bg-primary text-primary-foreground'
                    : step > s.num
                    ? 'bg-primary/20 text-primary cursor-pointer hover:bg-primary/30'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                <span className="w-6 h-6 rounded-full bg-background/20 flex items-center justify-center text-sm font-medium">
                  {s.num}
                </span>
                <span className="text-sm font-medium hidden sm:inline">{s.label}</span>
              </button>
              {i < 3 && <ChevronRight className="w-4 h-4 text-muted-foreground mx-1" />}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 min-h-[400px]">
          <AnimatePresence mode="wait">
            {/* Step 1: Select Data Source */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h3 className="text-lg font-semibold">Selecione a Fonte de Dados</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(dataSources).map(([key, source]) => {
                    const Icon = source.icon;
                    const isSelected = selectedSource === key;
                    return (
                      <Card
                        key={key}
                        className={cn(
                          'cursor-pointer transition-all hover:shadow-md',
                          isSelected && 'border-primary ring-2 ring-primary/20'
                        )}
                        onClick={() => handleSourceSelect(key as DataSourceKey)}
                      >
                        <CardContent className="p-4 flex flex-col items-center text-center">
                          <div className={cn(
                            'w-12 h-12 rounded-xl flex items-center justify-center mb-3',
                            isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                          )}>
                            <Icon className="w-6 h-6" />
                          </div>
                          <h4 className="font-medium">{source.label}</h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            {source.fields.length} campos disponíveis
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Step 2: Select Fields */}
            {step === 2 && selectedSource && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">
                    Selecione os Campos - {dataSources[selectedSource].label}
                  </h3>
                  <Badge variant="secondary">
                    {selectedFields.length} selecionados
                  </Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {dataSources[selectedSource].fields.map((field) => {
                    const isSelected = selectedFields.some(f => f.key === field.key);
                    return (
                      <div
                        key={field.key}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                          isSelected
                            ? 'bg-primary/10 border-primary'
                            : 'bg-card border-border hover:border-primary/50'
                        )}
                        onClick={() => handleFieldToggle(field as SelectedField)}
                      >
                        <Checkbox checked={isSelected} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{field.label}</p>
                          <p className="text-xs text-muted-foreground capitalize">{field.type}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {selectedFields.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium mb-2">Ordem dos Campos (arraste para reordenar)</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedFields.map((field, index) => (
                        <Badge key={field.key} variant="secondary" className="flex items-center gap-1">
                          <GripVertical className="w-3 h-3" />
                          {index + 1}. {field.label}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFieldToggle(field);
                            }}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 3: Configure Filters */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Configure os Filtros (Opcional)</h3>
                  <Button variant="outline" size="sm" onClick={handleAddFilter}>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Filtro
                  </Button>
                </div>

                {filters.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border rounded-lg">
                    <Filter className="w-10 h-10 text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">
                      Nenhum filtro configurado
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Filtros são opcionais. Clique em "Adicionar Filtro" para refinar os dados.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filters.map((filter, index) => {
                      const field = getFieldByKey(filter.field);
                      const fieldType = field?.type || 'text';
                      const operators = filterOperators[fieldType as keyof typeof filterOperators] || filterOperators.text;

                      return (
                        <Card key={filter.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3 flex-wrap">
                              {index > 0 && (
                                <Badge variant="outline" className="bg-muted">E</Badge>
                              )}
                              <Select
                                value={filter.field}
                                onValueChange={(value) => handleUpdateFilter(filter.id, { field: value })}
                              >
                                <SelectTrigger className="w-[180px]">
                                  <SelectValue placeholder="Campo" />
                                </SelectTrigger>
                                <SelectContent>
                                  {selectedFields.map((f) => (
                                    <SelectItem key={f.key} value={f.key}>
                                      {f.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              <Select
                                value={filter.operator}
                                onValueChange={(value) => handleUpdateFilter(filter.id, { operator: value })}
                              >
                                <SelectTrigger className="w-[150px]">
                                  <SelectValue placeholder="Operador" />
                                </SelectTrigger>
                                <SelectContent>
                                  {operators.map((op) => (
                                    <SelectItem key={op.value} value={op.value}>
                                      {op.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              {field?.type === 'select' && field.options ? (
                                <Select
                                  value={filter.value}
                                  onValueChange={(value) => handleUpdateFilter(filter.id, { value })}
                                >
                                  <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Valor" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {field.options.map((opt) => (
                                      <SelectItem key={opt} value={opt}>
                                        {opt}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Input
                                  placeholder="Valor"
                                  value={filter.value}
                                  onChange={(e) => handleUpdateFilter(filter.id, { value: e.target.value })}
                                  className="w-[180px]"
                                  type={field?.type === 'date' ? 'date' : field?.type === 'number' || field?.type === 'currency' ? 'number' : 'text'}
                                />
                              )}

                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveFilter(filter.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 4: Finalize */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h3 className="text-lg font-semibold">Finalizar Relatório</h3>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="report-name">Nome do Relatório *</Label>
                    <Input
                      id="report-name"
                      placeholder="Ex: Licitações Ganhas em 2024"
                      value={reportName}
                      onChange={(e) => setReportName(e.target.value)}
                      className="mt-1.5"
                    />
                  </div>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Resumo da Configuração</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Fonte de dados:</span>
                        <Badge variant="secondary">
                          {selectedSource && dataSources[selectedSource].label}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Campos selecionados:</span>
                        <Badge variant="secondary">{selectedFields.length}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Filtros configurados:</span>
                        <Badge variant="secondary">{filters.length}</Badge>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Campos:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedFields.map((f) => (
                            <Badge key={f.key} variant="outline" className="text-xs">
                              {f.label}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={handlePreview} className="flex-1">
                      <Eye className="w-4 h-4 mr-2" />
                      Visualizar Prévia
                    </Button>
                    <Button
                      className="flex-1 gradient-primary text-primary-foreground"
                      onClick={handleSaveReport}
                      disabled={!reportName.trim()}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Salvar Relatório
                    </Button>
                  </div>
                </div>

                {/* Preview Table */}
                {showPreview && previewData.length > 0 && (
                  <Card className="mt-4">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Prévia do Relatório</CardTitle>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Download className="w-4 h-4 mr-2" />
                              Exportar
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => {
                                exportReport('csv', {
                                  filename: reportName || 'relatorio',
                                  title: reportName,
                                  columns: selectedFields,
                                  data: previewData,
                                });
                                toast.success('CSV exportado com sucesso!');
                              }}
                            >
                              <FileSpreadsheet className="w-4 h-4 mr-2" />
                              Exportar CSV
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => {
                                exportReport('excel', {
                                  filename: reportName || 'relatorio',
                                  title: reportName,
                                  columns: selectedFields,
                                  data: previewData,
                                });
                                toast.success('Excel exportado com sucesso!');
                              }}
                            >
                              <FileSpreadsheet className="w-4 h-4 mr-2" />
                              Exportar Excel
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => {
                                exportReport('pdf', {
                                  filename: reportName || 'relatorio',
                                  title: reportName,
                                  columns: selectedFields,
                                  data: previewData,
                                });
                                toast.success('PDF exportado com sucesso!');
                              }}
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              Exportar PDF
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto rounded-lg border border-border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {selectedFields.map((field) => (
                                <TableHead key={field.key}>{field.label}</TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {previewData.map((row, index) => (
                              <TableRow key={index}>
                                {selectedFields.map((field) => (
                                  <TableCell key={field.key}>
                                    {formatCellValue(row[field.key], field.type)}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        * Dados de exemplo para visualização
                      </p>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <DialogFooter className="border-t border-border pt-4">
          <div className="flex items-center justify-between w-full">
            <Button variant="ghost" onClick={handleClose}>
              Cancelar
            </Button>
            <div className="flex gap-2">
              {step > 1 && (
                <Button variant="outline" onClick={() => setStep(step - 1)}>
                  Voltar
                </Button>
              )}
              {step < 4 && (
                <Button
                  onClick={() => setStep(step + 1)}
                  disabled={
                    (step === 1 && !selectedSource) ||
                    (step === 2 && selectedFields.length === 0)
                  }
                >
                  Próximo
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
