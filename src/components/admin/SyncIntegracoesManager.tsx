import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RefreshCw, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function SyncIntegracoesManager() {
  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5" />
          Sincronização de Licitações
        </CardTitle>
        <CardDescription>
          Status das integrações de captura de licitações por cliente.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            As integrações de captura externa estão sendo gerenciadas diretamente pela equipe técnica. Para incluir novas fontes ou solicitar uma sincronização manual, abra um ticket pelo módulo de Atendimento.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
