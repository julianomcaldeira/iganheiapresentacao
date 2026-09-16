import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Search,
  ExternalLink,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  Building,
  Scale,
  DollarSign,
  Rocket,
  Newspaper,
  MapPin,
  Clock,
  Star,
  Loader2,
  LayoutGrid,
  List,
  Bookmark,
  Share2,
  Eye,
} from 'lucide-react';

const EVENT_ICONS: Record<string, React.ElementType> = {
  trabalhista: AlertTriangle,
  operacional: Building,
  regulatorio: Scale,
  financeiro: DollarSign,
  oportunidade: Rocket,
  outro: Newspaper,
};

const EVENT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  trabalhista: { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', border: 'border-red-500/20' },
  operacional: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/20' },
  regulatorio: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/20' },
  financeiro: { bg: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-500/20' },
  oportunidade: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/20' },
  outro: { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border' },
};

const PLACEHOLDER_IMAGES = [
  'https://images.unsplash.com/photo-1504711434969-e33886168d6c?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop',
];

function getEventImage(event: any, index: number): string {
  // Use a deterministic placeholder based on event id hash
  const hash = event.id?.charCodeAt(0) || index;
  return PLACEHOLDER_IMAGES[hash % PLACEHOLDER_IMAGES.length];
}

function getTimeAgo(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ptBR });
  } catch {
    return '';
  }
}

function ScoreBar({ score }: { score: number }) {
  const getColor = () => {
    if (score >= 70) return 'bg-emerald-500';
    if (score >= 40) return 'bg-amber-500';
    return 'bg-muted-foreground/30';
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full rounded-full ${getColor()}`}
        />
      </div>
      <span className="text-xs font-bold tabular-nums w-6 text-right">{score}</span>
    </div>
  );
}

// ====== News Card Component ======
function NewsCard({ event, index }: { event: any; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const colors = EVENT_COLORS[event.tipo_evento] || EVENT_COLORS.outro;
  const Icon = EVENT_ICONS[event.tipo_evento] || Newspaper;
  const imageUrl = getEventImage(event, index);
  const dateStr = event.data_publicacao || event.created_at;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="group rounded-xl border border-border bg-card overflow-hidden hover:shadow-lg hover:border-primary/20 transition-all duration-300"
    >
      {/* Image Header */}
      <div className="relative aspect-[16/9] overflow-hidden bg-muted">
        {!imageError ? (
          <img
            src={imageUrl}
            alt={event.titulo_noticia}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
            <Newspaper className="h-12 w-12 text-muted-foreground/30" />
          </div>
        )}

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Top badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
          <Badge className={`${colors.bg} ${colors.text} ${colors.border} border backdrop-blur-sm gap-1 text-[11px]`}>
            <Icon className="h-3 w-3" />
            {event.tipo_evento}
          </Badge>
          {event.score_relevancia >= 70 && (
            <Badge className="bg-emerald-500/90 text-white gap-1 text-[11px] backdrop-blur-sm">
              <Star className="h-3 w-3" />
              Destaque
            </Badge>
          )}
        </div>

        {/* Bottom info on image */}
        <div className="absolute bottom-3 left-3 right-3">
          <div className="flex items-center gap-2 text-white/80 text-[11px]">
            {event.fonte && (
              <span className="flex items-center gap-1 bg-black/30 backdrop-blur-sm rounded-full px-2 py-0.5">
                <Newspaper className="h-3 w-3" />
                {event.fonte}
              </span>
            )}
            {dateStr && (
              <span className="flex items-center gap-1 bg-black/30 backdrop-blur-sm rounded-full px-2 py-0.5">
                <Clock className="h-3 w-3" />
                {getTimeAgo(dateStr)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <h3
          className="font-semibold text-sm leading-snug text-foreground line-clamp-2 cursor-pointer hover:text-primary transition-colors"
          onClick={() => event.url && window.open(event.url, '_blank')}
          title={event.titulo_noticia}
        >
          {event.titulo_noticia}
        </h3>

        {/* Description */}
        {event.descricao_noticia && (
          <p
            className={`text-xs text-muted-foreground leading-relaxed ${expanded ? '' : 'line-clamp-3'} cursor-pointer`}
            onClick={() => setExpanded(!expanded)}
          >
            {event.descricao_noticia}
          </p>
        )}

        {/* Relevance score */}
        <ScoreBar score={event.score_relevancia} />

        {/* Meta info */}
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          {event.razao_social && (
            <span className="flex items-center gap-1 truncate">
              <Building className="h-3 w-3 shrink-0" />
              {event.razao_social}
            </span>
          )}
          {(event.cidade || event.uf) && (
            <span className="flex items-center gap-1 shrink-0">
              <MapPin className="h-3 w-3" />
              {[event.cidade, event.uf].filter(Boolean).join(' - ')}
            </span>
          )}
        </div>

        {/* Keywords */}
        {event.palavras_chave_encontradas && event.palavras_chave_encontradas.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {event.palavras_chave_encontradas.slice(0, 4).map((kw: string, i: number) => (
              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
                {kw}
              </span>
            ))}
            {event.palavras_chave_encontradas.length > 4 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
                +{event.palavras_chave_encontradas.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-1">
            {event.url && (
              <a href={event.url} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 text-primary hover:text-primary">
                  <Eye className="h-3.5 w-3.5" />
                  Ler mais
                </Button>
              </a>
            )}
          </div>
          <div className="flex items-center gap-0.5">
            {event.url && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => {
                  navigator.clipboard.writeText(event.url);
                }}
                title="Copiar link"
              >
                <Share2 className="h-3.5 w-3.5" />
              </Button>
            )}
            {event.url && (
              <a href={event.url} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Abrir original">
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </a>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ====== Main Panel ======
export function NewsEventsPanel() {
  const { profile } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState('');
  const itemsPerPage = 12;

  useEffect(() => {
    fetchEmpresas();
  }, [profile?.cliente_id]);

  useEffect(() => {
    if (selectedEmpresaId) {
      setCurrentPage(1);
      fetchEvents();
    }
  }, [selectedEmpresaId, tipoFilter]);

  useEffect(() => {
    if (selectedEmpresaId) fetchEvents();
  }, [currentPage]);

  const fetchEmpresas = async () => {
    const clienteId = profile?.cliente_id;
    let query = supabase.from('empresas').select('id, razao_social, nome_fantasia').eq('ativo', true).order('razao_social');
    if (clienteId) query = query.eq('cliente_id', clienteId);
    const { data } = await query;
    setEmpresas(data || []);
    if (data && data.length > 0) setSelectedEmpresaId(data[0].id);
  };

  const fetchEvents = async () => {
    if (!selectedEmpresaId) return;
    setLoading(true);

    let query = supabase
      .from('empresa_news_events')
      .select('*', { count: 'exact' })
      .eq('empresa_id', selectedEmpresaId)
      .order('data_publicacao', { ascending: false, nullsFirst: false });

    if (tipoFilter !== 'todos') query = query.eq('tipo_evento', tipoFilter);

    const from = (currentPage - 1) * itemsPerPage;
    query = query.range(from, from + itemsPerPage - 1);

    const { data, count } = await query;
    setEvents(data || []);
    setTotalCount(count || 0);
    setLoading(false);
  };

  const filteredEvents = events.filter(e =>
    !searchTerm ||
    e.titulo_noticia?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.descricao_noticia?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.fonte?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // Stats
  const altaRelevancia = events.filter(e => e.score_relevancia >= 70).length;

  return (
    <div className="space-y-5">
      {/* Stats Bar */}
      <div className="flex items-center gap-6 px-1">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Newspaper className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">{totalCount}</p>
            <p className="text-[11px] text-muted-foreground leading-none">notícias</p>
          </div>
        </div>
        {altaRelevancia > 0 && (
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{altaRelevancia}</p>
              <p className="text-[11px] text-muted-foreground leading-none">destaques</p>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-card border border-border"
      >
        <Select value={selectedEmpresaId} onValueChange={setSelectedEmpresaId}>
          <SelectTrigger className="w-[200px] bg-secondary border-0">
            <SelectValue placeholder="Empresa" />
          </SelectTrigger>
          <SelectContent>
            {empresas.map(e => (
              <SelectItem key={e.id} value={e.id}>
                {e.nome_fantasia || e.razao_social}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar notícias..."
            className="pl-10 bg-secondary border-0"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <Select value={tipoFilter} onValueChange={setTipoFilter}>
          <SelectTrigger className="w-[160px] bg-secondary border-0">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os Tipos</SelectItem>
            <SelectItem value="trabalhista">Trabalhista</SelectItem>
            <SelectItem value="operacional">Operacional</SelectItem>
            <SelectItem value="regulatorio">Regulatório</SelectItem>
            <SelectItem value="financeiro">Financeiro</SelectItem>
            <SelectItem value="oportunidade">Oportunidade</SelectItem>
            <SelectItem value="outro">Outro</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="icon"
          onClick={fetchEvents}
          className="shrink-0"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </motion.div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredEvents.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Newspaper className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            Nenhuma notícia encontrada
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Ajuste os filtros ou aguarde novas notícias serem coletadas automaticamente.
          </p>
        </motion.div>
      ) : (
        <>
          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <AnimatePresence mode="popLayout">
              {filteredEvents.map((event, i) => (
                <NewsCard key={event.id} event={event} index={i} />
              ))}
            </AnimatePresence>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pt-4">
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalCount}
                itemsPerPage={itemsPerPage}
                startIndex={totalCount > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}
                endIndex={Math.min(currentPage * itemsPerPage, totalCount)}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
