import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from "lucide-react";

export interface RegraCampo {
  id: string;
  nome: string;
  tipo: string;
  obrigatorio: boolean;
  opcoes?: string[];
  placeholder?: string;
}

const FIELD_TYPES = [
  { value: "texto", label: "Alfanumérico (Texto)" },
  { value: "textarea", label: "Texto Longo" },
  { value: "numero", label: "Número" },
  { value: "data", label: "Data" },
  { value: "booleano", label: "Sim/Não" },
  { value: "selecao", label: "Seleção (Lista)" },
  { value: "email", label: "E-mail" },
  { value: "telefone", label: "Telefone" },
  { value: "moeda", label: "Moeda (R$)" },
  { value: "percentual", label: "Percentual (%)" },
];

interface RegraFieldsBuilderProps {
  campos: RegraCampo[];
  onChange: (campos: RegraCampo[]) => void;
}

export function RegraFieldsBuilder({ campos, onChange }: RegraFieldsBuilderProps) {
  const [newOptionText, setNewOptionText] = useState<Record<string, string>>({});

  const addCampo = () => {
    const newCampo: RegraCampo = {
      id: crypto.randomUUID(),
      nome: "",
      tipo: "texto",
      obrigatorio: false,
    };
    onChange([...campos, newCampo]);
  };

  const updateCampo = (id: string, updates: Partial<RegraCampo>) => {
    onChange(campos.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const removeCampo = (id: string) => {
    onChange(campos.filter(c => c.id !== id));
  };

  const moveCampo = (index: number, direction: "up" | "down") => {
    const newCampos = [...campos];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newCampos.length) return;
    [newCampos[index], newCampos[targetIndex]] = [newCampos[targetIndex], newCampos[index]];
    onChange(newCampos);
  };

  const addOption = (campoId: string) => {
    const text = (newOptionText[campoId] || "").trim();
    if (!text) return;
    const campo = campos.find(c => c.id === campoId);
    if (!campo) return;
    updateCampo(campoId, { opcoes: [...(campo.opcoes || []), text] });
    setNewOptionText(prev => ({ ...prev, [campoId]: "" }));
  };

  const removeOption = (campoId: string, optIndex: number) => {
    const campo = campos.find(c => c.id === campoId);
    if (!campo) return;
    updateCampo(campoId, { opcoes: (campo.opcoes || []).filter((_, i) => i !== optIndex) });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Campos do Formulário</Label>
        <Button type="button" variant="outline" size="sm" onClick={addCampo}>
          <Plus className="h-4 w-4 mr-1" />
          Adicionar Campo
        </Button>
      </div>

      {campos.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
          Nenhum campo adicionado. Clique em "Adicionar Campo" para criar campos de formulário para esta regra.
        </p>
      )}

      <div className="space-y-3">
        {campos.map((campo, index) => (
          <div key={campo.id} className="border rounded-lg p-3 space-y-3 bg-muted/30">
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-xs text-muted-foreground font-medium">Campo {index + 1}</span>
              <div className="flex-1" />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => moveCampo(index, "up")}
                disabled={index === 0}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => moveCampo(index, "down")}
                disabled={index === campos.length - 1}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive"
                onClick={() => removeCampo(campo.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Nome do Campo</Label>
                <Input
                  value={campo.nome}
                  onChange={(e) => updateCampo(campo.id, { nome: e.target.value })}
                  placeholder="Ex: Data de entrega"
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select
                  value={campo.tipo}
                  onValueChange={(value) => updateCampo(campo.id, { tipo: value, opcoes: value === "selecao" ? (campo.opcoes || []) : undefined })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((ft) => (
                      <SelectItem key={ft.value} value={ft.value}>
                        {ft.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Placeholder</Label>
                <Input
                  value={campo.placeholder || ""}
                  onChange={(e) => updateCampo(campo.id, { placeholder: e.target.value })}
                  placeholder="Texto de exemplo"
                  className="h-9"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={campo.obrigatorio}
                onCheckedChange={(checked) => updateCampo(campo.id, { obrigatorio: checked })}
              />
              <Label className="text-xs">Campo obrigatório</Label>
            </div>

            {campo.tipo === "selecao" && (
              <div className="space-y-2 pl-4 border-l-2 border-border">
                <Label className="text-xs">Opções da Lista</Label>
                <div className="flex flex-wrap gap-1">
                  {(campo.opcoes || []).map((opt, optIdx) => (
                    <Badge key={optIdx} variant="secondary" className="gap-1">
                      {opt}
                      <button
                        type="button"
                        onClick={() => removeOption(campo.id, optIdx)}
                        className="ml-1 hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newOptionText[campo.id] || ""}
                    onChange={(e) => setNewOptionText(prev => ({ ...prev, [campo.id]: e.target.value }))}
                    placeholder="Nova opção"
                    className="h-8 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addOption(campo.id);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => addOption(campo.id)}
                  >
                    Adicionar
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
