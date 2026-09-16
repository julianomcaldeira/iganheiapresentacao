import { useState } from 'react';
import { toast } from 'sonner';

export interface CNPJData {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  telefone: string;
  email: string;
  situacao: 'ativa' | 'inativa';
  atividadePrincipal: string;
}

export function useCNPJLookup() {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<CNPJData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const formatCNPJ = (cnpj: string) => {
    return cnpj.replace(/\D/g, '');
  };

  const lookupCNPJ = async (cnpj: string): Promise<CNPJData | null> => {
    const cleanCNPJ = formatCNPJ(cnpj);
    
    if (cleanCNPJ.length !== 14) {
      setError('CNPJ deve ter 14 dígitos');
      toast.error('CNPJ inválido. Deve ter 14 dígitos.');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Using BrasilAPI - free public API for CNPJ lookup
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('CNPJ não encontrado na base da Receita Federal');
        }
        throw new Error('Erro ao consultar CNPJ');
      }

      const apiData = await response.json();
      
      const cnpjData: CNPJData = {
        cnpj: apiData.cnpj || cleanCNPJ,
        razaoSocial: apiData.razao_social || '',
        nomeFantasia: apiData.nome_fantasia || apiData.razao_social || '',
        logradouro: apiData.logradouro || '',
        numero: apiData.numero || '',
        bairro: apiData.bairro || '',
        cidade: apiData.municipio || '',
        estado: apiData.uf || '',
        cep: apiData.cep || '',
        telefone: apiData.ddd_telefone_1 || '',
        email: apiData.email || '',
        situacao: apiData.descricao_situacao_cadastral?.toLowerCase() === 'ativa' ? 'ativa' : 'inativa',
        atividadePrincipal: apiData.cnae_fiscal_descricao || '',
      };

      setData(cnpjData);
      toast.success('Dados carregados da Receita Federal!');
      return cnpjData;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao consultar CNPJ';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setData(null);
    setError(null);
  };

  return {
    lookupCNPJ,
    isLoading,
    data,
    error,
    reset,
  };
}
