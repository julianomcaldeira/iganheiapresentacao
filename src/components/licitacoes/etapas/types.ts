export interface EtapaComponentProps {
  etapa: {
    id: string;
    licitacao_id: string;
    etapa_codigo: string;
    status: string;
    dados: Record<string, any>;
    observacoes: string | null;
    data_inicio: string | null;
    data_conclusao: string | null;
  };
  licitacaoId: string;
  clienteId: string;
  licitacaoData?: {
    numero: string;
    objeto: string;
    orgao: string;
    modalidade?: string;
    valor_estimado?: number;
    data_encerramento?: string;
    data_abertura?: string;
    edital_url?: string;
  };
  onStatusChange: (etapaCodigo: string, newStatus: string, dados?: Record<string, any>) => Promise<void>;
  onRefresh: () => void;
}
