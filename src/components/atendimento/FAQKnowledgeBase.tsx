import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Search, BookOpen, Tag, HelpCircle } from "lucide-react";

interface FAQEntry {
  id: string;
  titulo: string;
  conteudo: string;
  categoria: string;
  assunto: string;
  tags: string[] | null;
}

interface FAQKnowledgeBaseProps {
  onNeedSupport?: () => void;
}

const FAQKnowledgeBase = ({ onNeedSupport }: FAQKnowledgeBaseProps) => {
  const [entries, setEntries] = useState<FAQEntry[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFAQEntries();
  }, []);

  const fetchFAQEntries = async () => {
    try {
      const { data, error } = await supabase
        .from("ia_conhecimento")
        .select("id, titulo, conteudo, categoria, assunto, tags")
        .eq("ativo", true)
        .order("relevancia", { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error("Erro ao buscar FAQ:", error);
    } finally {
      setLoading(false);
    }
  };

  const categories = [...new Set(entries.map((e) => e.categoria))];

  const filteredEntries = entries.filter((entry) => {
    const matchesSearch =
      search === "" ||
      entry.titulo.toLowerCase().includes(search.toLowerCase()) ||
      entry.conteudo.toLowerCase().includes(search.toLowerCase()) ||
      entry.assunto.toLowerCase().includes(search.toLowerCase()) ||
      entry.tags?.some((tag) => tag.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory = !selectedCategory || entry.categoria === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="h-5 w-5 text-primary" />
            Base de Conhecimento
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Encontre respostas para as dúvidas mais frequentes antes de abrir um ticket
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por palavra-chave..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Categories */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={selectedCategory === null ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSelectedCategory(null)}
              >
                Todas
              </Badge>
              {categories.map((cat) => (
                <Badge
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </Badge>
              ))}
            </div>
          )}

          {/* FAQ List */}
          {filteredEntries.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <HelpCircle className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <div>
                <p className="text-muted-foreground">
                  {search || selectedCategory
                    ? "Nenhum resultado encontrado para sua busca."
                    : "Nenhuma pergunta frequente cadastrada."}
                </p>
                {onNeedSupport && (
                  <button
                    onClick={onNeedSupport}
                    className="text-primary hover:underline text-sm mt-2"
                  >
                    Não encontrou o que procurava? Abra um ticket
                  </button>
                )}
              </div>
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {filteredEntries.map((entry) => (
                <AccordionItem key={entry.id} value={entry.id}>
                  <AccordionTrigger className="text-left hover:no-underline">
                    <div className="flex flex-col items-start gap-1">
                      <span className="font-medium">{entry.titulo}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {entry.categoria}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {entry.assunto}
                        </span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">
                      {entry.conteudo}
                    </div>
                    {entry.tags && entry.tags.length > 0 && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                        <Tag className="h-3 w-3 text-muted-foreground" />
                        <div className="flex flex-wrap gap-1">
                          {entry.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}

          {/* CTA to open ticket */}
          {filteredEntries.length > 0 && onNeedSupport && (
            <div className="text-center pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">
                Não encontrou o que procurava?
              </p>
              <button
                onClick={onNeedSupport}
                className="text-primary hover:underline text-sm font-medium"
              >
                Abrir um ticket de suporte
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FAQKnowledgeBase;
