import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, ArrowRight, ArrowLeft, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface Props {
  clienteId: string;
  onComplete: () => void;
  onBack: () => void;
}

export function OnboardingStep7Integracao({ onComplete, onBack }: Props) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-500/20 rounded-lg">
            <Settings className="h-6 w-6 text-yellow-500" />
          </div>
          <div>
            <CardTitle>Captura de licitações</CardTitle>
            <CardDescription>
              Defina como as licitações chegam até este cliente.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Captura disponível por múltiplos canais</AlertTitle>
          <AlertDescription className="space-y-2 mt-2">
            <p>O cliente pode receber licitações por:</p>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>Cadastro manual diretamente na plataforma</li>
              <li>Importação em lote por planilha</li>
              <li>Integrações externas configuradas pela equipe técnica</li>
            </ul>
            <p className="text-sm text-muted-foreground pt-2">
              Esta etapa é opcional no onboarding. As integrações específicas podem ser ativadas a qualquer momento pela área de Administração.
            </p>
          </AlertDescription>
        </Alert>

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
  );
}
