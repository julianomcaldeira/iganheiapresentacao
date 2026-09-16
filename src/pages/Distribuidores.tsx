import { useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import {
  Truck,
  Package,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Search,
  Plus,
  MapPin,
  Star,
  ShieldCheck,
  ShieldAlert,
  ThumbsUp,
  ThumbsDown,
  Award,
  Target,
} from 'lucide-react';

type Regiao = 'Norte' | 'Nordeste' | 'Centro-Oeste' | 'Sudeste' | 'Sul';
type Classificacao = 'pendente' | 'excelente' | 'bom' | 'regular' | 'ruim';

interface Distribuidor {
  id: string;
  nome: string;
  cliente: string;
  uf: string;
  regiao: Regiao;
  contato: string;
  licitacoesEnviadas: number;
  licitacoesTratadas: number;
  licitacoesPendentes: number;
  licitacoesAtrasadas: number;
  valorTotal: number;
  taxaSucesso: number;
  status: 'ativo' | 'inativo';
}

const UF_REGIAO: Record<string, Regiao> = {
  AC: 'Norte', AP: 'Norte', AM: 'Norte', PA: 'Norte', RO: 'Norte', RR: 'Norte', TO: 'Norte',
  AL: 'Nordeste', BA: 'Nordeste', CE: 'Nordeste', MA: 'Nordeste', PB: 'Nordeste', PE: 'Nordeste', PI: 'Nordeste', RN: 'Nordeste', SE: 'Nordeste',
  DF: 'Centro-Oeste', GO: 'Centro-Oeste', MT: 'Centro-Oeste', MS: 'Centro-Oeste',
  ES: 'Sudeste', MG: 'Sudeste', RJ: 'Sudeste', SP: 'Sudeste',
  PR: 'Sul', RS: 'Sul', SC: 'Sul',
};

const MOCK: Distribuidor[] = [
  // STARTGI
  { id: '1', nome: 'TechDistrib Brasil Ltda', cliente: 'STARTGI', uf: 'SP', regiao: 'Sudeste', contato: 'comercial@techdistrib.com.br', licitacoesEnviadas: 48, licitacoesTratadas: 39, licitacoesPendentes: 6, licitacoesAtrasadas: 3, valorTotal: 4_820_000, taxaSucesso: 71, status: 'ativo' },
  { id: '2', nome: 'Nacional TI Distribuição S.A.', cliente: 'STARTGI', uf: 'RJ', regiao: 'Sudeste', contato: 'licitacoes@nacionalti.com.br', licitacoesEnviadas: 32, licitacoesTratadas: 30, licitacoesPendentes: 2, licitacoesAtrasadas: 0, valorTotal: 2_310_000, taxaSucesso: 84, status: 'ativo' },
  { id: '3', nome: 'Sul Tecnologia Distrib.', cliente: 'STARTGI', uf: 'RS', regiao: 'Sul', contato: 'gov@sultec.com.br', licitacoesEnviadas: 19, licitacoesTratadas: 11, licitacoesPendentes: 4, licitacoesAtrasadas: 4, valorTotal: 980_000, taxaSucesso: 54, status: 'ativo' },
  { id: '4', nome: 'Paraná Soluções TI', cliente: 'STARTGI', uf: 'PR', regiao: 'Sul', contato: 'editais@paranasolucoes.com.br', licitacoesEnviadas: 23, licitacoesTratadas: 19, licitacoesPendentes: 3, licitacoesAtrasadas: 1, valorTotal: 1_540_000, taxaSucesso: 76, status: 'ativo' },
  { id: '5', nome: 'CentroTec Distribuidora', cliente: 'STARTGI', uf: 'DF', regiao: 'Centro-Oeste', contato: 'gov@centrotec.com.br', licitacoesEnviadas: 36, licitacoesTratadas: 28, licitacoesPendentes: 5, licitacoesAtrasadas: 3, valorTotal: 3_210_000, taxaSucesso: 69, status: 'ativo' },
  { id: '6', nome: 'Goiás Tech Distrib.', cliente: 'STARTGI', uf: 'GO', regiao: 'Centro-Oeste', contato: 'comercial@goiastech.com.br', licitacoesEnviadas: 14, licitacoesTratadas: 9, licitacoesPendentes: 3, licitacoesAtrasadas: 2, valorTotal: 720_000, taxaSucesso: 58, status: 'ativo' },
  { id: '7', nome: 'Nordeste Digital', cliente: 'STARTGI', uf: 'PE', regiao: 'Nordeste', contato: 'licitacoes@nedigital.com.br', licitacoesEnviadas: 21, licitacoesTratadas: 14, licitacoesPendentes: 5, licitacoesAtrasadas: 2, valorTotal: 1_120_000, taxaSucesso: 61, status: 'ativo' },
  { id: '8', nome: 'Bahia Tech Soluções', cliente: 'STARTGI', uf: 'BA', regiao: 'Nordeste', contato: 'gov@bahiatech.com.br', licitacoesEnviadas: 17, licitacoesTratadas: 12, licitacoesPendentes: 3, licitacoesAtrasadas: 2, valorTotal: 890_000, taxaSucesso: 64, status: 'ativo' },
  { id: '9', nome: 'Amazonia IT Distrib.', cliente: 'STARTGI', uf: 'AM', regiao: 'Norte', contato: 'editais@amazoniait.com.br', licitacoesEnviadas: 9, licitacoesTratadas: 5, licitacoesPendentes: 3, licitacoesAtrasadas: 1, valorTotal: 430_000, taxaSucesso: 52, status: 'ativo' },
  { id: '10', nome: 'Pará Tecnologia', cliente: 'STARTGI', uf: 'PA', regiao: 'Norte', contato: 'comercial@paratec.com.br', licitacoesEnviadas: 7, licitacoesTratadas: 3, licitacoesPendentes: 2, licitacoesAtrasadas: 2, valorTotal: 280_000, taxaSucesso: 45, status: 'inativo' },

  // ABC EQUIPAMENTOS
  { id: '11', nome: 'MediHealth Equipamentos', cliente: 'ABC', uf: 'SP', regiao: 'Sudeste', contato: 'gov@medihealth.com.br', licitacoesEnviadas: 61, licitacoesTratadas: 52, licitacoesPendentes: 5, licitacoesAtrasadas: 4, valorTotal: 18_750_000, taxaSucesso: 78, status: 'ativo' },
  { id: '12', nome: 'HospitalMed Distribuidora', cliente: 'ABC', uf: 'MG', regiao: 'Sudeste', contato: 'editais@hospitalmed.com.br', licitacoesEnviadas: 27, licitacoesTratadas: 18, licitacoesPendentes: 7, licitacoesAtrasadas: 2, valorTotal: 6_420_000, taxaSucesso: 62, status: 'ativo' },
  { id: '13', nome: 'Rio Medical Solutions', cliente: 'ABC', uf: 'RJ', regiao: 'Sudeste', contato: 'licitacoes@riomedical.com.br', licitacoesEnviadas: 34, licitacoesTratadas: 27, licitacoesPendentes: 4, licitacoesAtrasadas: 3, valorTotal: 9_840_000, taxaSucesso: 74, status: 'ativo' },
  { id: '14', nome: 'NorteMed Equipamentos', cliente: 'ABC', uf: 'PE', regiao: 'Nordeste', contato: 'contato@nortemed.com.br', licitacoesEnviadas: 14, licitacoesTratadas: 9, licitacoesPendentes: 3, licitacoesAtrasadas: 2, valorTotal: 3_120_000, taxaSucesso: 67, status: 'inativo' },
  { id: '15', nome: 'Ceará Hospitalar', cliente: 'ABC', uf: 'CE', regiao: 'Nordeste', contato: 'gov@cearaht.com.br', licitacoesEnviadas: 19, licitacoesTratadas: 13, licitacoesPendentes: 4, licitacoesAtrasadas: 2, valorTotal: 4_310_000, taxaSucesso: 65, status: 'ativo' },
  { id: '16', nome: 'Bahia MedTech', cliente: 'ABC', uf: 'BA', regiao: 'Nordeste', contato: 'editais@bahiamedtech.com.br', licitacoesEnviadas: 22, licitacoesTratadas: 17, licitacoesPendentes: 3, licitacoesAtrasadas: 2, valorTotal: 5_680_000, taxaSucesso: 72, status: 'ativo' },
  { id: '17', nome: 'Sul Hospitalar Distrib.', cliente: 'ABC', uf: 'RS', regiao: 'Sul', contato: 'gov@sulhospitalar.com.br', licitacoesEnviadas: 26, licitacoesTratadas: 21, licitacoesPendentes: 3, licitacoesAtrasadas: 2, valorTotal: 7_120_000, taxaSucesso: 73, status: 'ativo' },
  { id: '18', nome: 'SC Medical Equipamentos', cliente: 'ABC', uf: 'SC', regiao: 'Sul', contato: 'comercial@scmedical.com.br', licitacoesEnviadas: 15, licitacoesTratadas: 12, licitacoesPendentes: 2, licitacoesAtrasadas: 1, valorTotal: 3_450_000, taxaSucesso: 75, status: 'ativo' },
  { id: '19', nome: 'Brasília Health Distrib.', cliente: 'ABC', uf: 'DF', regiao: 'Centro-Oeste', contato: 'licitacoes@brasiliahealth.com.br', licitacoesEnviadas: 41, licitacoesTratadas: 33, licitacoesPendentes: 5, licitacoesAtrasadas: 3, valorTotal: 12_980_000, taxaSucesso: 76, status: 'ativo' },
  { id: '20', nome: 'Mato Grosso Med', cliente: 'ABC', uf: 'MT', regiao: 'Centro-Oeste', contato: 'gov@mtmed.com.br', licitacoesEnviadas: 11, licitacoesTratadas: 7, licitacoesPendentes: 2, licitacoesAtrasadas: 2, valorTotal: 1_980_000, taxaSucesso: 60, status: 'ativo' },
  { id: '21', nome: 'Amazonas Hospitalar', cliente: 'ABC', uf: 'AM', regiao: 'Norte', contato: 'editais@amhospitalar.com.br', licitacoesEnviadas: 8, licitacoesTratadas: 5, licitacoesPendentes: 2, licitacoesAtrasadas: 1, valorTotal: 1_240_000, taxaSucesso: 58, status: 'ativo' },
  { id: '22', nome: 'Pará Saúde Distrib.', cliente: 'ABC', uf: 'PA', regiao: 'Norte', contato: 'gov@parasaude.com.br', licitacoesEnviadas: 10, licitacoesTratadas: 6, licitacoesPendentes: 3, licitacoesAtrasadas: 1, valorTotal: 1_860_000, taxaSucesso: 55, status: 'ativo' },

  // MOTORBRAS VEÍCULOS — rede de concessionárias
  { id: '23', nome: 'Auto Paulista Veículos', cliente: 'MOTORBRAS', uf: 'SP', regiao: 'Sudeste', contato: 'licitacoes@autopaulista.com.br', licitacoesEnviadas: 54, licitacoesTratadas: 49, licitacoesPendentes: 4, licitacoesAtrasadas: 1, valorTotal: 42_860_000, taxaSucesso: 81, status: 'ativo' },
  { id: '24', nome: 'Rio Motors Concessionária', cliente: 'MOTORBRAS', uf: 'RJ', regiao: 'Sudeste', contato: 'gov@riomotors.com.br', licitacoesEnviadas: 38, licitacoesTratadas: 33, licitacoesPendentes: 3, licitacoesAtrasadas: 2, valorTotal: 28_450_000, taxaSucesso: 74, status: 'ativo' },
  { id: '25', nome: 'Minas Auto Center', cliente: 'MOTORBRAS', uf: 'MG', regiao: 'Sudeste', contato: 'frotas@minasauto.com.br', licitacoesEnviadas: 31, licitacoesTratadas: 24, licitacoesPendentes: 5, licitacoesAtrasadas: 2, valorTotal: 19_720_000, taxaSucesso: 68, status: 'ativo' },
  { id: '26', nome: 'Capital Veículos Brasília', cliente: 'MOTORBRAS', uf: 'DF', regiao: 'Centro-Oeste', contato: 'editais@capitalveiculos.com.br', licitacoesEnviadas: 46, licitacoesTratadas: 40, licitacoesPendentes: 4, licitacoesAtrasadas: 2, valorTotal: 36_180_000, taxaSucesso: 77, status: 'ativo' },
  { id: '27', nome: 'Goiás Motors', cliente: 'MOTORBRAS', uf: 'GO', regiao: 'Centro-Oeste', contato: 'comercial@goiasmotors.com.br', licitacoesEnviadas: 22, licitacoesTratadas: 15, licitacoesPendentes: 4, licitacoesAtrasadas: 3, valorTotal: 9_640_000, taxaSucesso: 59, status: 'ativo' },
  { id: '28', nome: 'Mato Grosso Veículos', cliente: 'MOTORBRAS', uf: 'MT', regiao: 'Centro-Oeste', contato: 'gov@mtveiculos.com.br', licitacoesEnviadas: 17, licitacoesTratadas: 11, licitacoesPendentes: 4, licitacoesAtrasadas: 2, valorTotal: 6_280_000, taxaSucesso: 57, status: 'ativo' },
  { id: '29', nome: 'Nordeste Auto Recife', cliente: 'MOTORBRAS', uf: 'PE', regiao: 'Nordeste', contato: 'licitacoes@nordesteauto.com.br', licitacoesEnviadas: 29, licitacoesTratadas: 22, licitacoesPendentes: 4, licitacoesAtrasadas: 3, valorTotal: 14_920_000, taxaSucesso: 66, status: 'ativo' },
  { id: '30', nome: 'Bahia Veículos', cliente: 'MOTORBRAS', uf: 'BA', regiao: 'Nordeste', contato: 'frotas@bahiaveiculos.com.br', licitacoesEnviadas: 26, licitacoesTratadas: 21, licitacoesPendentes: 3, licitacoesAtrasadas: 2, valorTotal: 16_340_000, taxaSucesso: 70, status: 'ativo' },
  { id: '31', nome: 'Ceará Motors', cliente: 'MOTORBRAS', uf: 'CE', regiao: 'Nordeste', contato: 'gov@cearamotors.com.br', licitacoesEnviadas: 24, licitacoesTratadas: 16, licitacoesPendentes: 4, licitacoesAtrasadas: 4, valorTotal: 8_910_000, taxaSucesso: 53, status: 'ativo' },
  { id: '32', nome: 'Sul Veículos Porto Alegre', cliente: 'MOTORBRAS', uf: 'RS', regiao: 'Sul', contato: 'editais@sulveiculos.com.br', licitacoesEnviadas: 33, licitacoesTratadas: 30, licitacoesPendentes: 2, licitacoesAtrasadas: 1, valorTotal: 21_470_000, taxaSucesso: 83, status: 'ativo' },
  { id: '33', nome: 'Paraná Auto Curitiba', cliente: 'MOTORBRAS', uf: 'PR', regiao: 'Sul', contato: 'licitacoes@paranaauto.com.br', licitacoesEnviadas: 28, licitacoesTratadas: 24, licitacoesPendentes: 3, licitacoesAtrasadas: 1, valorTotal: 17_860_000, taxaSucesso: 75, status: 'ativo' },
  { id: '34', nome: 'Santa Catarina Motors', cliente: 'MOTORBRAS', uf: 'SC', regiao: 'Sul', contato: 'comercial@scmotors.com.br', licitacoesEnviadas: 19, licitacoesTratadas: 14, licitacoesPendentes: 4, licitacoesAtrasadas: 1, valorTotal: 11_230_000, taxaSucesso: 69, status: 'ativo' },
  { id: '35', nome: 'Amazônia Veículos', cliente: 'MOTORBRAS', uf: 'AM', regiao: 'Norte', contato: 'gov@amazoniaveiculos.com.br', licitacoesEnviadas: 13, licitacoesTratadas: 9, licitacoesPendentes: 3, licitacoesAtrasadas: 1, valorTotal: 5_120_000, taxaSucesso: 64, status: 'ativo' },
  { id: '36', nome: 'Pará Auto Belém', cliente: 'MOTORBRAS', uf: 'PA', regiao: 'Norte', contato: 'frotas@paraauto.com.br', licitacoesEnviadas: 11, licitacoesTratadas: 6, licitacoesPendentes: 3, licitacoesAtrasadas: 2, valorTotal: 3_740_000, taxaSucesso: 48, status: 'inativo' },
];

// ===== Resultados lançados por cada concessionária/distribuidor =====
type ResultadoRede = 'ganho' | 'perdido' | 'parcial' | 'em_disputa' | 'aguardando';

interface ResultadoLancado {
  id: string;
  distribuidorId: string;
  licitacao: string;
  orgao: string;
  uf: string;
  itens: string;
  valorLancado: number;
  valorVencedor: number;
  vencedor: string;
  resultado: ResultadoRede;
  margem: number | null;
  observacao: string;
}

const RESULTADOS_REDE: ResultadoLancado[] = [
  { id: 'r1', distribuidorId: '23', licitacao: 'PE 001/2026', orgao: 'Secretaria da Fazenda - SP', uf: 'SP', itens: '120 sedans 1.6 flex', valorLancado: 13_188_000, valorVencedor: 13_188_000, vencedor: 'MOTORBRAS - Auto Paulista', resultado: 'ganho', margem: 16.4, observacao: 'Venceu com 2,7% abaixo da Volksmotors.' },
  { id: 'r2', distribuidorId: '23', licitacao: 'PE 209/2025', orgao: 'Universidade de São Paulo', uf: 'SP', itens: '18 hatch 1.0', valorLancado: 1_612_800, valorVencedor: 1_612_800, vencedor: 'MOTORBRAS - Auto Paulista', resultado: 'ganho', margem: 14.1, observacao: 'Entrega antecipada em 22 dias.' },
  { id: 'r3', distribuidorId: '24', licitacao: 'PE 014/2026 - item 1', orgao: 'Polícia Militar - RJ', uf: 'RJ', itens: '40 viaturas caracterizadas', valorLancado: 10_880_000, valorVencedor: 10_880_000, vencedor: 'MOTORBRAS - Rio Motors', resultado: 'ganho', margem: 12.8, observacao: 'Disputa acirrada com Chevromax nos 3 últimos lances.' },
  { id: 'r4', distribuidorId: '24', licitacao: 'PE 014/2026 - item 2', orgao: 'Polícia Militar - RJ', uf: 'RJ', itens: '5 viaturas descaracterizadas', valorLancado: 1_205_000, valorVencedor: 1_148_000, vencedor: 'Renaultec Veículos', resultado: 'perdido', margem: null, observacao: 'Proposta desclassificada por divergência de blindagem no anexo técnico.' },
  { id: 'r5', distribuidorId: '25', licitacao: 'PE 032/2026', orgao: 'Secretaria de Saúde - Belo Horizonte', uf: 'MG', itens: '30 ambulâncias tipo A', valorLancado: 9_555_000, valorVencedor: 0, vencedor: '—', resultado: 'aguardando', margem: 13.2, observacao: 'Proposta em elaboração; prazo final em 5 dias.' },
  { id: 'r6', distribuidorId: '26', licitacao: 'PE 077/2026', orgao: 'Ministério da Agricultura e Pecuária', uf: 'DF', itens: '60 pickups 4x4', valorLancado: 17_124_000, valorVencedor: 0, vencedor: '—', resultado: 'em_disputa', margem: 15.7, observacao: 'Sessão de disputa agendada; limite de desconto aprovado em 6%.' },
  { id: 'r7', distribuidorId: '26', licitacao: 'PE 052/2025', orgao: 'Tribunal de Contas da União', uf: 'DF', itens: '24 sedans 1.6', valorLancado: 2_664_000, valorVencedor: 2_664_000, vencedor: 'MOTORBRAS - Capital Veículos', resultado: 'ganho', margem: 15.9, observacao: 'Contrato renovado por 12 meses de manutenção.' },
  { id: 'r8', distribuidorId: '30', licitacao: 'PE 105/2026', orgao: 'Secretaria de Educação - Salvador', uf: 'BA', itens: '25 vans escolares', valorLancado: 7_362_500, valorVencedor: 7_362_500, vencedor: 'MOTORBRAS - Bahia Veículos', resultado: 'parcial', margem: 11.3, observacao: 'Venceu 18 de 25 unidades; 7 foram para FiatCar por prazo de entrega.' },
  { id: 'r9', distribuidorId: '29', licitacao: 'PE 118/2026', orgao: 'Secretaria de Turismo - PE', uf: 'PE', itens: '12 micro-ônibus 24 lugares', valorLancado: 5_508_000, valorVencedor: 0, vencedor: '—', resultado: 'aguardando', margem: 12.6, observacao: 'Habilitação em análise; CND estadual vence em 9 dias.' },
  { id: 'r10', distribuidorId: '31', licitacao: 'PE 133/2026', orgao: 'Secretaria de Infraestrutura - Fortaleza', uf: 'CE', itens: '20 caminhões basculantes', valorLancado: 10_580_000, valorVencedor: 10_358_000, vencedor: 'Chevromax Brasil', resultado: 'perdido', margem: null, observacao: 'Perdeu por 2,1%. Concessionária não usou o limite de desconto liberado.' },
  { id: 'r11', distribuidorId: '31', licitacao: 'PE 088/2025', orgao: 'Prefeitura de Sobral', uf: 'CE', itens: '8 caminhões 3/4', valorLancado: 3_312_000, valorVencedor: 3_180_000, vencedor: 'Toyomax Motores', resultado: 'perdido', margem: null, observacao: 'Segunda perda consecutiva na mesma linha de produto.' },
  { id: 'r12', distribuidorId: '32', licitacao: 'PE 149/2026', orgao: 'Receita Estadual - RS', uf: 'RS', itens: '80 hatch 1.0 flex', valorLancado: 7_008_000, valorVencedor: 7_008_000, vencedor: 'MOTORBRAS - Sul Veículos POA', resultado: 'ganho', margem: 13.9, observacao: 'Venceu integralmente, 5,1% abaixo do estimado.' },
  { id: 'r13', distribuidorId: '33', licitacao: 'PE 156/2026', orgao: 'Consórcio Intermunicipal de Saúde - PR', uf: 'PR', itens: '15 UTIs móveis tipo D', valorLancado: 8_880_000, valorVencedor: 0, vencedor: '—', resultado: 'aguardando', margem: 10.4, observacao: 'Aguardando aprovação de margem pela matriz.' },
  { id: 'r14', distribuidorId: '34', licitacao: 'PE 168/2026', orgao: 'Secretaria de Mobilidade - Joinville', uf: 'SC', itens: '10 ônibus urbanos', valorLancado: 7_810_000, valorVencedor: 0, vencedor: '—', resultado: 'aguardando', margem: 9.8, observacao: 'Pedido de esclarecimento sobre elevador de acessibilidade.' },
  { id: 'r15', distribuidorId: '35', licitacao: 'DL 021/2026', orgao: 'Instituto de Proteção Ambiental - AM', uf: 'AM', itens: '6 SUVs 2.0 AWD', valorLancado: 1_428_000, valorVencedor: 1_428_000, vencedor: 'MOTORBRAS - Amazônia Veículos', resultado: 'ganho', margem: 17.2, observacao: 'Dispensa eletrônica (Lei 14.133/21), 4,2% de desconto.' },
  { id: 'r16', distribuidorId: '36', licitacao: 'PE 174/2026', orgao: 'Secretaria de Saúde Pública - PA', uf: 'PA', itens: '35 caminhões 3/4 baú', valorLancado: 14_280_000, valorVencedor: 0, vencedor: '—', resultado: 'aguardando', margem: 11.1, observacao: 'Concessionária inativa — reatribuir para Amazônia Veículos.' },
  { id: 'r17', distribuidorId: '28', licitacao: 'PE 181/2026', orgao: 'Tribunal de Justiça - MT', uf: 'MT', itens: 'Locação de 50 veículos', valorLancado: 4_110_000, valorVencedor: 0, vencedor: '—', resultado: 'aguardando', margem: 8.6, observacao: 'Edital em análise pela matriz.' },
  { id: 'r18', distribuidorId: '27', licitacao: 'PE 141/2025', orgao: 'Prefeitura de Anápolis', uf: 'GO', itens: '14 vans escolares', valorLancado: 4_186_000, valorVencedor: 4_060_000, vencedor: 'Volksmotors do Brasil', resultado: 'perdido', margem: null, observacao: 'Lance final enviado após o fechamento da sessão.' },
];

const RESULTADO_LABEL: Record<ResultadoRede, { label: string; className: string }> = {
  ganho: { label: 'Ganho', className: 'bg-emerald-500 text-white' },
  parcial: { label: 'Parcial', className: 'bg-blue-500 text-white' },
  perdido: { label: 'Perdido', className: 'bg-red-500 text-white' },
  em_disputa: { label: 'Em disputa', className: 'bg-amber-500 text-white' },
  aguardando: { label: 'Aguardando', className: 'bg-slate-500 text-white' },
};


const REGIOES: Regiao[] = ['Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'];
const REGIAO_COLORS: Record<Regiao, string> = {
  Norte: 'hsl(142 70% 45%)',
  Nordeste: 'hsl(38 92% 50%)',
  'Centro-Oeste': 'hsl(280 70% 55%)',
  Sudeste: 'hsl(221 83% 53%)',
  Sul: 'hsl(0 72% 51%)',
};

const fmtMoeda = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

// ===== Score & Gaps helpers =====
// Indicadores adicionais simulados (SLA, qualidade docs, NPS) — gerados de forma determinística por id
function extra(id: string) {
  const seed = parseInt(id, 10);
  const slaResposta = 65 + ((seed * 7) % 33); // 65-97%
  const qualidadeDocs = 60 + ((seed * 11) % 38); // 60-97%
  const nps = 40 + ((seed * 13) % 55); // 40-94
  const prazoMedio = 2 + ((seed * 5) % 9); // 2-10 dias
  return { slaResposta, qualidadeDocs, nps, prazoMedio };
}

function calcularScore(d: Distribuidor) {
  const e = extra(d.id);
  const tratamento = d.licitacoesEnviadas > 0 ? (d.licitacoesTratadas / d.licitacoesEnviadas) * 100 : 0;
  const atrasoPct = d.licitacoesEnviadas > 0 ? (d.licitacoesAtrasadas / d.licitacoesEnviadas) * 100 : 0;
  // Score 0-100 ponderado
  const score =
    d.taxaSucesso * 0.30 +
    tratamento * 0.20 +
    e.slaResposta * 0.15 +
    e.qualidadeDocs * 0.15 +
    e.nps * 0.10 +
    Math.max(0, 100 - atrasoPct * 4) * 0.10;
  return { ...e, tratamento, atrasoPct, score: Math.round(score) };
}

function classificacaoAuto(score: number): Exclude<Classificacao, 'pendente'> {
  if (score >= 80) return 'excelente';
  if (score >= 70) return 'bom';
  if (score >= 55) return 'regular';
  return 'ruim';
}

const CLASS_COLORS: Record<Exclude<Classificacao, 'pendente'>, string> = {
  excelente: 'bg-emerald-500 text-white',
  bom: 'bg-blue-500 text-white',
  regular: 'bg-amber-500 text-white',
  ruim: 'bg-red-500 text-white',
};

function identificarGaps(d: Distribuidor) {
  const c = calcularScore(d);
  const gaps: { titulo: string; severidade: 'alta' | 'media' | 'baixa'; detalhe: string }[] = [];
  if (d.licitacoesAtrasadas >= 3) gaps.push({ titulo: 'Licitações atrasadas', severidade: 'alta', detalhe: `${d.licitacoesAtrasadas} editais sem resposta no prazo.` });
  else if (d.licitacoesAtrasadas > 0) gaps.push({ titulo: 'Atrasos pontuais', severidade: 'media', detalhe: `${d.licitacoesAtrasadas} edital(is) atrasado(s).` });
  if (d.taxaSucesso < 60) gaps.push({ titulo: 'Taxa de sucesso baixa', severidade: 'alta', detalhe: `Apenas ${d.taxaSucesso}% de aproveitamento.` });
  else if (d.taxaSucesso < 70) gaps.push({ titulo: 'Taxa de sucesso abaixo da meta', severidade: 'media', detalhe: `${d.taxaSucesso}% (meta interna: 70%).` });
  if (c.tratamento < 70) gaps.push({ titulo: 'Baixo índice de tratamento', severidade: 'media', detalhe: `${Math.round(c.tratamento)}% das licitações enviadas foram efetivamente tratadas.` });
  if (c.slaResposta < 75) gaps.push({ titulo: 'SLA de resposta abaixo do esperado', severidade: 'media', detalhe: `Tempo médio de resposta inicial em ${c.slaResposta}%.` });
  if (c.qualidadeDocs < 75) gaps.push({ titulo: 'Qualidade documental insuficiente', severidade: 'alta', detalhe: `${c.qualidadeDocs}% — pendências recorrentes em CNDs/atestados.` });
  if (c.nps < 60) gaps.push({ titulo: 'NPS interno baixo', severidade: 'baixa', detalhe: `NPS = ${c.nps}.` });
  if (d.status === 'inativo') gaps.push({ titulo: 'Distribuidor inativo', severidade: 'alta', detalhe: 'Parceiro fora de operação no período.' });
  if (gaps.length === 0) gaps.push({ titulo: 'Sem gaps relevantes', severidade: 'baixa', detalhe: 'Indicadores dentro do esperado.' });
  return gaps;
}

const SEV_COLORS = {
  alta: 'bg-red-100 text-red-700 border-red-200',
  media: 'bg-amber-100 text-amber-700 border-amber-200',
  baixa: 'bg-slate-100 text-slate-700 border-slate-200',
};

export default function Distribuidores() {
  const [busca, setBusca] = useState('');
  const [clienteFiltro, setClienteFiltro] = useState<string>('todos');
  const [regiaoFiltro, setRegiaoFiltro] = useState<string>('todas');
  const [classificacoes, setClassificacoes] = useState<Record<string, Classificacao>>({});

  const clientesDisponiveis = useMemo(
    () => Array.from(new Set(MOCK.map((d) => d.cliente))).sort(),
    [],
  );

  const distribuidores = useMemo(() => {
    return MOCK.filter((d) => {
      const matchBusca =
        !busca ||
        d.nome.toLowerCase().includes(busca.toLowerCase()) ||
        d.cliente.toLowerCase().includes(busca.toLowerCase()) ||
        d.uf.toLowerCase().includes(busca.toLowerCase());
      const matchCliente = clienteFiltro === 'todos' || d.cliente === clienteFiltro;
      const matchRegiao = regiaoFiltro === 'todas' || d.regiao === regiaoFiltro;
      return matchBusca && matchCliente && matchRegiao;
    });
  }, [busca, clienteFiltro, regiaoFiltro]);

  // Resultados lançados por cada concessionária/distribuidor (respeita os filtros da tela)
  const resultadosRede = useMemo(() => {
    const idsVisiveis = new Set(distribuidores.map((d) => d.id));
    const linhas = RESULTADOS_REDE.filter((r) => idsVisiveis.has(r.distribuidorId)).map((r) => ({
      ...r,
      distribuidor: MOCK.find((d) => d.id === r.distribuidorId)!,
    }));
    const resumo = distribuidores
      .map((d) => {
        const rs = linhas.filter((r) => r.distribuidorId === d.id);
        const ganhos = rs.filter((r) => r.resultado === 'ganho' || r.resultado === 'parcial');
        const perdidos = rs.filter((r) => r.resultado === 'perdido');
        const emAberto = rs.filter((r) => r.resultado === 'em_disputa' || r.resultado === 'aguardando');
        const margens = rs.map((r) => r.margem).filter((m): m is number => m !== null);
        return {
          d,
          total: rs.length,
          ganhos: ganhos.length,
          perdidos: perdidos.length,
          emAberto: emAberto.length,
          valorGanho: ganhos.reduce((s, r) => s + r.valorVencedor, 0),
          valorEmAberto: emAberto.reduce((s, r) => s + r.valorLancado, 0),
          margemMedia: margens.length ? margens.reduce((s, m) => s + m, 0) / margens.length : null,
          aproveitamento: rs.length ? Math.round((ganhos.length / rs.length) * 100) : 0,
        };
      })
      .filter((x) => x.total > 0)
      .sort((a, b) => b.valorGanho - a.valorGanho);
    return { linhas, resumo };
  }, [distribuidores]);



  const totais = useMemo(() => {
    return distribuidores.reduce(
      (acc, d) => {
        acc.enviadas += d.licitacoesEnviadas;
        acc.tratadas += d.licitacoesTratadas;
        acc.pendentes += d.licitacoesPendentes;
        acc.atrasadas += d.licitacoesAtrasadas;
        acc.valor += d.valorTotal;
        return acc;
      },
      { enviadas: 0, tratadas: 0, pendentes: 0, atrasadas: 0, valor: 0 },
    );
  }, [distribuidores]);

  const porRegiao = useMemo(() => {
    const map = new Map<Regiao, any>();
    REGIOES.forEach((r) =>
      map.set(r, { regiao: r, distribuidores: 0, enviadas: 0, tratadas: 0, pendentes: 0, atrasadas: 0, valor: 0, taxaSucesso: 0 }),
    );
    distribuidores.forEach((d) => {
      const r = map.get(d.regiao)!;
      r.distribuidores += 1;
      r.enviadas += d.licitacoesEnviadas;
      r.tratadas += d.licitacoesTratadas;
      r.pendentes += d.licitacoesPendentes;
      r.atrasadas += d.licitacoesAtrasadas;
      r.valor += d.valorTotal;
    });
    return Array.from(map.values())
      .map((r) => ({ ...r, taxaSucesso: r.enviadas > 0 ? Math.round((r.tratadas / r.enviadas) * 100) : 0 }))
      .filter((r) => r.distribuidores > 0);
  }, [distribuidores]);

  const dadosBarrasRegiao = porRegiao.map((r) => ({
    regiao: r.regiao,
    Tratadas: r.tratadas,
    Pendentes: r.pendentes,
    Atrasadas: r.atrasadas,
  }));

  const dadosPizzaRegiao = porRegiao.map((r) => ({ name: r.regiao, value: r.enviadas }));

  // ====== Score & Gaps ======
  const scoreboard = useMemo(() => {
    return distribuidores
      .map((d) => {
        const c = calcularScore(d);
        const auto = classificacaoAuto(c.score);
        const classificacao = classificacoes[d.id] ?? 'pendente';
        const gaps = identificarGaps(d);
        const gapsAltos = gaps.filter((g) => g.severidade === 'alta').length;
        return { d, ...c, auto, classificacao, gaps, gapsAltos };
      })
      .sort((a, b) => b.score - a.score);
  }, [distribuidores, classificacoes]);

  const totalGapsAltos = scoreboard.reduce((s, r) => s + r.gapsAltos, 0);
  const mediaScore = scoreboard.length
    ? Math.round(scoreboard.reduce((s, r) => s + r.score, 0) / scoreboard.length)
    : 0;
  const topPerformer = scoreboard[0];
  const piorPerformer = scoreboard[scoreboard.length - 1];

  return (
    <MainLayout
      title="Distribuidores"
      subtitle="Gerenciamento, performance e classificação dos distribuidores parceiros"
    >
      <div className="space-y-6">
        {/* Filtros globais */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar distribuidor, cliente, UF..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="pl-8 md:w-64"
                  />
                </div>
                <Select value={clienteFiltro} onValueChange={setClienteFiltro}>
                  <SelectTrigger className="md:w-44"><SelectValue placeholder="Cliente" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os clientes</SelectItem>
                    {clientesDisponiveis.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={regiaoFiltro} onValueChange={setRegiaoFiltro}>
                  <SelectTrigger className="md:w-44"><SelectValue placeholder="Região" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as regiões</SelectItem>
                    {REGIOES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo distribuidor
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="visao-geral">
          <TabsList>
            <TabsTrigger value="visao-geral">Visão geral</TabsTrigger>
            <TabsTrigger value="regioes">Por região</TabsTrigger>
            <TabsTrigger value="score-gaps">
              <Star className="h-4 w-4 mr-1.5" /> Score & Gaps
            </TabsTrigger>
            <TabsTrigger value="resultados">Resultados da rede</TabsTrigger>
            <TabsTrigger value="cadastro">Cadastro</TabsTrigger>
          </TabsList>

          {/* ==== Visão geral ==== */}
          <TabsContent value="visao-geral" className="space-y-6 mt-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Distribuidores</CardTitle>
                  <Truck className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold">{distribuidores.length}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Licitações enviadas</CardTitle>
                  <Package className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold">{totais.enviadas}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Tratadas</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-success" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold text-success">{totais.tratadas}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Pendentes</CardTitle>
                  <Clock className="h-4 w-4 text-warning" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold text-warning">{totais.pendentes}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Atrasadas</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold text-destructive">{totais.atrasadas}</div></CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader><CardTitle>Volume por região</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={dadosBarrasRegiao}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="regiao" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Tratadas" stackId="a" fill="hsl(var(--success))" />
                      <Bar dataKey="Pendentes" stackId="a" fill="hsl(var(--warning))" />
                      <Bar dataKey="Atrasadas" stackId="a" fill="hsl(var(--destructive))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Distribuição regional</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={dadosPizzaRegiao} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                        {dadosPizzaRegiao.map((d, i) => (
                          <Cell key={i} fill={REGIAO_COLORS[d.name as Regiao]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ==== Por região ==== */}
          <TabsContent value="regioes" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Indicadores por região
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
                  {porRegiao.map((r) => (
                    <div
                      key={r.regiao}
                      className="rounded-lg border bg-card p-3 space-y-2 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setRegiaoFiltro(r.regiao)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: REGIAO_COLORS[r.regiao] }} />
                        <Badge variant="outline" className="text-xs">{r.distribuidores} distrib.</Badge>
                      </div>
                      <div className="font-semibold text-sm">{r.regiao}</div>
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        <div className="text-muted-foreground">Enviadas</div><div className="text-right font-medium">{r.enviadas}</div>
                        <div className="text-muted-foreground">Tratadas</div><div className="text-right font-medium text-success">{r.tratadas}</div>
                        <div className="text-muted-foreground">Pendentes</div><div className="text-right font-medium text-warning">{r.pendentes}</div>
                        <div className="text-muted-foreground">Atrasadas</div><div className="text-right font-medium text-destructive">{r.atrasadas}</div>
                      </div>
                      <div className="pt-2 border-t flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Sucesso</span>
                        <span className="flex items-center gap-1 font-semibold text-success">
                          <TrendingUp className="h-3 w-3" />{r.taxaSucesso}%
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground truncate" title={fmtMoeda(r.valor)}>
                        {fmtMoeda(r.valor)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ==== Score & Gaps ==== */}
          <TabsContent value="score-gaps" className="space-y-6 mt-4">
            {/* KPIs */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Score médio</CardTitle>
                  <Star className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{mediaScore}<span className="text-sm text-muted-foreground">/100</span></div>
                  <Progress value={mediaScore} className="mt-2" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Gaps críticos</CardTitle>
                  <ShieldAlert className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">{totalGapsAltos}</div>
                  <p className="text-xs text-muted-foreground">Em {scoreboard.length} distribuidores</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Top performer</CardTitle>
                  <Award className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-sm font-semibold truncate">{topPerformer?.d.nome}</div>
                  <div className="text-xs text-muted-foreground">Score {topPerformer?.score}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Requer atenção</CardTitle>
                  <Target className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-sm font-semibold truncate">{piorPerformer?.d.nome}</div>
                  <div className="text-xs text-muted-foreground">Score {piorPerformer?.score}</div>
                </CardContent>
              </Card>
            </div>

            {/* Radar do top 5 + ranking */}
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle>Perfil — Top performer</CardTitle>
                  <CardDescription>{topPerformer?.d.nome}</CardDescription>
                </CardHeader>
                <CardContent>
                  {topPerformer && (
                    <ResponsiveContainer width="100%" height={260}>
                      <RadarChart
                        data={[
                          { ind: 'Sucesso', v: topPerformer.d.taxaSucesso },
                          { ind: 'Tratamento', v: Math.round(topPerformer.tratamento) },
                          { ind: 'SLA', v: topPerformer.slaResposta },
                          { ind: 'Docs', v: topPerformer.qualidadeDocs },
                          { ind: 'NPS', v: topPerformer.nps },
                          { ind: 'Prazo', v: Math.max(0, 100 - topPerformer.atrasoPct * 4) },
                        ]}
                      >
                        <PolarGrid />
                        <PolarAngleAxis dataKey="ind" fontSize={11} />
                        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar dataKey="v" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.4} />
                      </RadarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Ranking de distribuidores</CardTitle>
                  <CardDescription>Score composto: sucesso (30%), tratamento (20%), SLA (15%), qualidade docs (15%), NPS (10%), prazo (10%)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>Distribuidor</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead className="text-center">Score</TableHead>
                          <TableHead className="text-center">Sugestão</TableHead>
                          <TableHead>Classificação manual</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {scoreboard.map((row, i) => (
                          <TableRow key={row.d.id}>
                            <TableCell className="font-mono text-xs">{i + 1}</TableCell>
                            <TableCell>
                              <div className="font-medium text-sm">{row.d.nome}</div>
                              <div className="text-xs text-muted-foreground">{row.d.uf} · {row.d.regiao}</div>
                            </TableCell>
                            <TableCell><Badge variant="outline">{row.d.cliente}</Badge></TableCell>
                            <TableCell className="text-center">
                              <div className="flex flex-col items-center gap-1">
                                <span className="font-bold">{row.score}</span>
                                <Progress value={row.score} className="h-1 w-16" />
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className={CLASS_COLORS[row.auto]}>{row.auto}</Badge>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={row.classificacao}
                                onValueChange={(v) =>
                                  setClassificacoes((s) => ({ ...s, [row.d.id]: v as Classificacao }))
                                }
                              >
                                <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pendente">— sem avaliação —</SelectItem>
                                  <SelectItem value="excelente">⭐ Excelente</SelectItem>
                                  <SelectItem value="bom">👍 Bom</SelectItem>
                                  <SelectItem value="regular">⚠️ Regular</SelectItem>
                                  <SelectItem value="ruim">👎 Ruim</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Controle efetivo de Gaps */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-destructive" />
                  Controle efetivo de gaps por distribuidor
                </CardTitle>
                <CardDescription>
                  Diagnóstico automático dos pontos de atenção em cada parceiro — atrasos, SLA, qualidade documental, NPS e produtividade.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {scoreboard.map((row) => (
                    <div key={row.d.id} className="rounded-lg border p-4 space-y-3 bg-card">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold text-sm truncate">{row.d.nome}</div>
                          <div className="text-xs text-muted-foreground">{row.d.cliente} · {row.d.uf}</div>
                        </div>
                        <Badge className={CLASS_COLORS[row.auto]}>{row.score}</Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="rounded bg-muted/40 p-2 text-center">
                          <div className="text-muted-foreground">SLA</div>
                          <div className="font-semibold">{row.slaResposta}%</div>
                        </div>
                        <div className="rounded bg-muted/40 p-2 text-center">
                          <div className="text-muted-foreground">Docs</div>
                          <div className="font-semibold">{row.qualidadeDocs}%</div>
                        </div>
                        <div className="rounded bg-muted/40 p-2 text-center">
                          <div className="text-muted-foreground">NPS</div>
                          <div className="font-semibold">{row.nps}</div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        {row.gaps.map((g, i) => (
                          <div
                            key={i}
                            className={`flex items-start gap-2 rounded border px-2 py-1.5 text-xs ${SEV_COLORS[g.severidade]}`}
                          >
                            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                            <div className="min-w-0">
                              <div className="font-medium">{g.titulo}</div>
                              <div className="opacity-80">{g.detalhe}</div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t text-xs">
                        <span className="text-muted-foreground">Avaliação do cliente:</span>
                        {row.classificacao === 'pendente' ? (
                          <span className="text-muted-foreground italic">não classificado</span>
                        ) : (
                          <Badge className={CLASS_COLORS[row.classificacao as Exclude<Classificacao, 'pendente'>]}>
                            {row.classificacao}
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-7"
                          onClick={() => setClassificacoes((s) => ({ ...s, [row.d.id]: 'bom' }))}
                        >
                          <ThumbsUp className="h-3 w-3 mr-1" /> Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-7"
                          onClick={() => setClassificacoes((s) => ({ ...s, [row.d.id]: 'ruim' }))}
                        >
                          <ThumbsDown className="h-3 w-3 mr-1" /> Reprovar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ==== Resultados lançados pela rede ==== */}
          <TabsContent value="resultados" className="space-y-6 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Desempenho por parceiro da rede</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Consolidação dos resultados que cada concessionária/distribuidor lançou nas licitações.
                </p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Parceiro</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>UF</TableHead>
                        <TableHead className="text-right">Disputas</TableHead>
                        <TableHead className="text-right">Ganhas</TableHead>
                        <TableHead className="text-right">Perdidas</TableHead>
                        <TableHead className="text-right">Em aberto</TableHead>
                        <TableHead className="text-right">Valor ganho</TableHead>
                        <TableHead className="text-right">Margem média</TableHead>
                        <TableHead className="text-right">Aproveitamento</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resultadosRede.resumo.map((r) => (
                        <TableRow key={r.d.id}>
                          <TableCell className="font-medium">{r.d.nome}</TableCell>
                          <TableCell><Badge variant="outline">{r.d.cliente}</Badge></TableCell>
                          <TableCell>{r.d.uf}</TableCell>
                          <TableCell className="text-right">{r.total}</TableCell>
                          <TableCell className="text-right text-success font-medium">{r.ganhos}</TableCell>
                          <TableCell className="text-right text-destructive font-medium">{r.perdidos}</TableCell>
                          <TableCell className="text-right text-warning font-medium">{r.emAberto}</TableCell>
                          <TableCell className="text-right">{fmtMoeda(r.valorGanho)}</TableCell>
                          <TableCell className="text-right">
                            {r.margemMedia !== null ? `${r.margemMedia.toFixed(1)}%` : '—'}
                          </TableCell>
                          <TableCell className="text-right font-semibold">{r.aproveitamento}%</TableCell>
                        </TableRow>
                      ))}
                      {resultadosRede.resumo.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                            Nenhum resultado lançado para os filtros aplicados.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resultados lançados licitação por licitação</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Licitação</TableHead>
                        <TableHead>Órgão</TableHead>
                        <TableHead>Parceiro</TableHead>
                        <TableHead>Itens</TableHead>
                        <TableHead className="text-right">Valor lançado</TableHead>
                        <TableHead className="text-right">Valor vencedor</TableHead>
                        <TableHead>Vencedor</TableHead>
                        <TableHead>Resultado</TableHead>
                        <TableHead>Observação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resultadosRede.linhas.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium whitespace-nowrap">{r.licitacao}</TableCell>
                          <TableCell className="text-sm">{r.orgao}</TableCell>
                          <TableCell className="text-sm">
                            <div>{r.distribuidor.nome}</div>
                            <div className="text-xs text-muted-foreground">{r.distribuidor.cliente} · {r.uf}</div>
                          </TableCell>
                          <TableCell className="text-sm">{r.itens}</TableCell>
                          <TableCell className="text-right">{fmtMoeda(r.valorLancado)}</TableCell>
                          <TableCell className="text-right">
                            {r.valorVencedor > 0 ? fmtMoeda(r.valorVencedor) : '—'}
                          </TableCell>
                          <TableCell className="text-sm">{r.vencedor}</TableCell>
                          <TableCell>
                            <Badge className={RESULTADO_LABEL[r.resultado].className}>
                              {RESULTADO_LABEL[r.resultado].label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[280px]">{r.observacao}</TableCell>
                        </TableRow>
                      ))}
                      {resultadosRede.linhas.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                            Nenhum resultado lançado para os filtros aplicados.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>



          {/* ==== Cadastro (tabela existente) ==== */}
          <TabsContent value="cadastro" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Distribuidores cadastrados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Distribuidor</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Região</TableHead>
                        <TableHead>UF</TableHead>
                        <TableHead className="text-right">Enviadas</TableHead>
                        <TableHead className="text-right">Tratadas</TableHead>
                        <TableHead className="text-right">Pendentes</TableHead>
                        <TableHead className="text-right">Atrasadas</TableHead>
                        <TableHead className="text-right">Valor total</TableHead>
                        <TableHead className="text-right">Sucesso</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {distribuidores.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell>
                            <div className="font-medium">{d.nome}</div>
                            <div className="text-xs text-muted-foreground">{d.contato}</div>
                          </TableCell>
                          <TableCell><Badge variant="outline">{d.cliente}</Badge></TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: REGIAO_COLORS[d.regiao] }} />
                              <span className="text-sm">{d.regiao}</span>
                            </div>
                          </TableCell>
                          <TableCell>{d.uf}</TableCell>
                          <TableCell className="text-right">{d.licitacoesEnviadas}</TableCell>
                          <TableCell className="text-right text-success font-medium">{d.licitacoesTratadas}</TableCell>
                          <TableCell className="text-right text-warning font-medium">{d.licitacoesPendentes}</TableCell>
                          <TableCell className="text-right text-destructive font-medium">{d.licitacoesAtrasadas}</TableCell>
                          <TableCell className="text-right">{fmtMoeda(d.valorTotal)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <TrendingUp className="h-3 w-3 text-success" />
                              {d.taxaSucesso}%
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={d.status === 'ativo' ? 'default' : 'secondary'}>{d.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {distribuidores.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                            Nenhum distribuidor encontrado com os filtros aplicados.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
