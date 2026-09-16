import { useState } from 'react';
import { Mic, MicOff, X, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVoiceCommands } from '@/hooks/useVoiceCommands';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export function VoiceCommandButton() {
  const { 
    isListening, 
    isSupported, 
    transcript, 
    toggleListening,
    lastCommand,
    confidence
  } = useVoiceCommands();
  const [showHelp, setShowHelp] = useState(false);

  if (!isSupported) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {/* Transcript display */}
      {isListening && (
        <div className="bg-background/95 backdrop-blur border rounded-lg p-3 shadow-lg max-w-xs animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
            </span>
            Ouvindo...
          </div>
          {transcript && (
            <p className="text-sm font-medium">{transcript}</p>
          )}
        </div>
      )}

      {/* Last command result */}
      {!isListening && lastCommand && (
        <div className="bg-background/95 backdrop-blur border rounded-lg p-2 shadow-lg max-w-xs text-xs text-muted-foreground">
          Último: "{lastCommand}"
          {confidence > 0 && (
            <span className="ml-1 text-green-600">({Math.round(confidence * 100)}%)</span>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        {/* Help popover */}
        <Popover open={showHelp} onOpenChange={setShowHelp}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full shadow-lg"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72" align="end">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Comandos de Voz</h4>
              <div className="text-xs space-y-1 text-muted-foreground">
                <p><strong>"Criar tarefa [título]"</strong> - Cria nova tarefa</p>
                <p><strong>"Buscar licitação [termo]"</strong> - Pesquisa licitações</p>
                <p><strong>"Ir para [página]"</strong> - Navega para uma página</p>
                <p><strong>"Listar tarefas"</strong> - Abre lista de tarefas</p>
                <p><strong>"Ajuda"</strong> - Mostra comandos</p>
              </div>
              <div className="pt-2 border-t text-xs text-muted-foreground">
                <p>Páginas disponíveis: dashboard, licitações, tarefas, agenda, clientes, produtos, configurações, atendimento, relatórios</p>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Main voice button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={toggleListening}
                size="icon"
                className={cn(
                  "h-14 w-14 rounded-full shadow-lg transition-all duration-300",
                  isListening 
                    ? "bg-destructive hover:bg-destructive/90 animate-pulse" 
                    : "bg-primary hover:bg-primary/90"
                )}
              >
                {isListening ? (
                  <MicOff className="h-6 w-6" />
                ) : (
                  <Mic className="h-6 w-6" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              {isListening ? 'Parar de ouvir' : 'Comando de voz (clique para falar)'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
