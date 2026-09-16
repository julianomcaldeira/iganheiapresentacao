import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Bot, Settings2, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface IAConfigBadgeProps {
  clienteId: string;
  tipo: string;
  navigateTo?: string;
}

interface PromptConfig {
  nome: string;
  modelo: string;
  temperatura: number;
}

const TIPO_LABELS: Record<string, string> = {
  analise_edital: 'Análise de Edital',
  
  monitor_pregao: 'Monitor Pregão',
  analise_estrategica: 'Análise Estratégica',
  pecas_impugnacao: 'Impugnação',
  pecas_recurso: 'Recurso',
  pecas_esclarecimento: 'Esclarecimento',
  pecas_contrarrazoes: 'Contrarrazões',
};

const TIPO_ROUTES: Record<string, string> = {
  analise_edital: '/ia/analise-edital',
  
  monitor_pregao: '/ia/monitor',
  analise_estrategica: '/ia/analise-estrategica',
  pecas_impugnacao: '/ia/pecas',
  pecas_recurso: '/ia/pecas',
  pecas_esclarecimento: '/ia/pecas',
  pecas_contrarrazoes: '/ia/pecas',
};

export function IAConfigBadge({ clienteId, tipo, navigateTo }: IAConfigBadgeProps) {
  const [config, setConfig] = useState<PromptConfig | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!clienteId) return;
    supabase
      .from('ia_prompts')
      .select('nome, modelo, temperatura')
      .eq('cliente_id', clienteId)
      .eq('tipo', tipo)
      .eq('ativo', true)
      .limit(1)
      .single()
      .then(({ data }) => {
        setConfig(data as PromptConfig | null);
      });
  }, [clienteId, tipo]);

  const route = navigateTo || TIPO_ROUTES[tipo];
  const modelShort = config?.modelo?.split('/').pop()?.split('-').slice(0, 2).join('-') || '';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant={config ? 'default' : 'outline'}
          className={`text-[10px] cursor-pointer gap-1 ${
            config 
              ? 'bg-primary/10 text-primary hover:bg-primary/20' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => route && navigate(route)}
        >
          <Bot className="h-3 w-3" />
          {config ? modelShort : 'Sem config IA'}
          <ExternalLink className="h-2.5 w-2.5" />
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        {config ? (
          <div className="space-y-1">
            <p className="font-medium text-xs">{TIPO_LABELS[tipo] || tipo}</p>
            <p className="text-xs">Config: {config.nome}</p>
            <p className="text-xs">Modelo: {config.modelo}</p>
            <p className="text-xs">Temp: {config.temperatura}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Clique para editar configuração</p>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="font-medium text-xs">{TIPO_LABELS[tipo] || tipo}</p>
            <p className="text-xs">Nenhuma configuração personalizada</p>
            <p className="text-[10px] text-muted-foreground">Usando prompt padrão. Clique para configurar.</p>
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
