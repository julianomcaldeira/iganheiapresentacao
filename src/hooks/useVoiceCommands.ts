import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface VoiceCommand {
  patterns: string[];
  action: (params: string) => void;
  description: string;
}

interface UseVoiceCommandsReturn {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
  lastCommand: string | null;
  confidence: number;
}

// Type declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
  length: number;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionInterface extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart: ((this: SpeechRecognitionInterface, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognitionInterface, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognitionInterface, ev: SpeechRecognitionErrorEvent) => any) | null;
  onend: ((this: SpeechRecognitionInterface, ev: Event) => any) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInterface;
    webkitSpeechRecognition: new () => SpeechRecognitionInterface;
  }
}

export function useVoiceCommands(): UseVoiceCommandsReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [isSupported, setIsSupported] = useState(false);
  
  const recognitionRef = useRef<SpeechRecognitionInterface | null>(null);
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  // Define voice commands
  const commands: VoiceCommand[] = [
    {
      patterns: ['criar tarefa', 'nova tarefa', 'adicionar tarefa'],
      action: async (params) => {
        if (!user || !profile?.cliente_id) {
          toast.error('Você precisa estar logado para criar tarefas');
          return;
        }
        
        const titulo = params.trim() || 'Nova tarefa por voz';
        
        try {
          const { error } = await supabase.from('tarefas').insert({
            titulo,
            criado_por: user.id,
            cliente_id: profile.cliente_id,
            status: 'pendente',
            prioridade: 'media'
          });
          
          if (error) throw error;
          
          toast.success(`Tarefa criada: "${titulo}"`);
          navigate('/tarefas');
        } catch (error) {
          toast.error('Erro ao criar tarefa');
          console.error(error);
        }
      },
      description: 'Criar uma nova tarefa'
    },
    {
      patterns: ['buscar licitação', 'pesquisar licitação', 'procurar licitação', 'encontrar licitação'],
      action: (params) => {
        const searchTerm = params.trim();
        if (searchTerm) {
          navigate(`/licitacoes?search=${encodeURIComponent(searchTerm)}`);
          toast.info(`Buscando licitações: "${searchTerm}"`);
        } else {
          navigate('/licitacoes');
          toast.info('Abrindo lista de licitações');
        }
      },
      description: 'Buscar licitações'
    },
    {
      patterns: ['ir para', 'abrir', 'navegar para', 'mostrar'],
      action: (params) => {
        const normalize = (s: string) =>
          s.toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^\w\s]/g, '')
            .replace(/^(o |a |os |as )/, '')
            .trim();
        const page = normalize(params);
        const routes: Record<string, string> = {
          'dashboard': '/',
          'painel': '/',
          'inicio': '/',
          'home': '/',
          'principal': '/',
          'tela inicial': '/',
          'licitacoes': '/licitacoes',
          'tarefas': '/tarefas',
          'agenda': '/agenda',
          'clientes': '/clientes',
          'empresas': '/clientes',
          'produtos': '/produtos',
          'empenhos': '/dashboard/empenhos',
          'contratos': '/dashboard/contratos',
          'configuracoes': '/configuracoes',
          'atendimento': '/atendimento',
          'suporte': '/atendimento',
          'relatorios': '/relatorios',
          'documentos': '/documentos',
          'pendencias': '/pendencias',
          'concorrentes': '/concorrentes',
          'analise': '/analise-estrategica',
          'analise estrategica': '/analise-estrategica',
        };
        
        const route = routes[page];
        if (route) {
          navigate(route);
          toast.info(`Navegando para ${page}`);
        } else {
          toast.warning(`Página "${page}" não encontrada`);
        }
      },
      description: 'Navegar para uma página'
    },
    {
      patterns: ['listar tarefas', 'minhas tarefas', 'ver tarefas'],
      action: () => {
        navigate('/tarefas');
        toast.info('Abrindo lista de tarefas');
      },
      description: 'Ver lista de tarefas'
    },
    {
      patterns: ['ajuda', 'comandos', 'o que você pode fazer'],
      action: () => {
        toast.info(
          'Comandos disponíveis:\n' +
          '• "Criar tarefa [título]"\n' +
          '• "Buscar licitação [termo]"\n' +
          '• "Ir para [página]"\n' +
          '• "Listar tarefas"',
          { duration: 8000 }
        );
      },
      description: 'Mostrar comandos disponíveis'
    }
  ];

  // Process voice command
  const processCommand = useCallback((text: string) => {
    const lowerText = text.toLowerCase().trim();
    setLastCommand(lowerText);
    
    for (const command of commands) {
      for (const pattern of command.patterns) {
        if (lowerText.startsWith(pattern)) {
          const params = lowerText.slice(pattern.length);
          command.action(params);
          return true;
        }
      }
    }
    
    toast.warning(`Comando não reconhecido: "${text}". Diga "ajuda" para ver os comandos disponíveis.`);
    return false;
  }, [navigate, user, profile]);

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognitionConstructor) {
      setIsSupported(false);
      return;
    }
    
    setIsSupported(true);
    
    const recognition = new SpeechRecognitionConstructor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'pt-BR';
    recognition.maxAlternatives = 1;
    
    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
    };
    
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      let finalTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
          setConfidence(result[0].confidence);
        } else {
          interimTranscript += result[0].transcript;
        }
      }
      
      setTranscript(finalTranscript || interimTranscript);
      
      if (finalTranscript) {
        processCommand(finalTranscript);
      }
    };
    
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      
      if (event.error === 'no-speech') {
        toast.info('Nenhuma fala detectada. Tente novamente.');
      } else if (event.error === 'not-allowed') {
        toast.error('Permissão de microfone negada. Habilite nas configurações do navegador.');
      } else {
        toast.error(`Erro no reconhecimento de voz: ${event.error}`);
      }
    };
    
    recognition.onend = () => {
      setIsListening(false);
    };
    
    recognitionRef.current = recognition;
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [processCommand]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
        toast.info('Ouvindo... Fale seu comando', { duration: 2000 });
      } catch (error) {
        console.error('Error starting recognition:', error);
      }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    isSupported,
    transcript,
    startListening,
    stopListening,
    toggleListening,
    lastCommand,
    confidence
  };
}
