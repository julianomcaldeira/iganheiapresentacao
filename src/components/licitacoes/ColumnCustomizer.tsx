import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Columns3, GripVertical, RotateCcw, Save, Trash2, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';

export interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  order: number;
  width?: string;
}

export interface SavedLayout {
  id: string;
  name: string;
  columns: ColumnConfig[];
  createdAt: string;
}

interface ColumnCustomizerProps {
  columns: ColumnConfig[];
  onColumnsChange: (columns: ColumnConfig[]) => void;
  storageKey: string;
  /** Optional default column set. Defaults to the licitações set for backwards-compat. */
  defaultColumns?: ColumnConfig[];
  /** Column IDs that cannot be hidden (e.g. "actions"). */
  lockedColumns?: string[];
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'status', label: 'Status', visible: true, order: 0, width: '100px' },
  { id: 'situacao', label: 'Situação', visible: true, order: 1, width: '140px' },
  { id: 'numero', label: 'Número', visible: true, order: 2, width: '160px' },
  { id: 'objeto', label: 'Objeto', visible: true, order: 3, width: '280px' },
  { id: 'orgao', label: 'Órgão', visible: true, order: 4, width: '180px' },
  { id: 'modalidade', label: 'Modalidade', visible: false, order: 5, width: '140px' },
  { id: 'valor_estimado', label: 'Valor Estimado', visible: true, order: 6, width: '140px' },
  { id: 'data_abertura', label: 'Data Abertura', visible: false, order: 7, width: '120px' },
  { id: 'data_encerramento', label: 'Encerramento', visible: true, order: 8, width: '130px' },
  { id: 'relevancia', label: 'Relevância', visible: false, order: 9, width: '100px' },
  { id: 'portal', label: 'Portal', visible: false, order: 10, width: '140px' },
  { id: 'etapa_atual', label: 'Etapa Atual', visible: true, order: 11, width: '140px' },
  { id: 'cliente', label: 'Cliente', visible: false, order: 12, width: '140px' },
  { id: 'acoes', label: 'Ações', visible: true, order: 13, width: '100px' },
];

export function getDefaultColumns(defaults?: ColumnConfig[]): ColumnConfig[] {
  return (defaults ?? DEFAULT_COLUMNS).map(col => ({ ...col }));
}

export function loadColumnsFromStorage(storageKey: string, defaults?: ColumnConfig[]): ColumnConfig[] {
  const base = getDefaultColumns(defaults);
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      const mergedColumns = base.map(defaultCol => {
        const savedCol = parsed.find((c: ColumnConfig) => c.id === defaultCol.id);
        if (savedCol) {
          return {
            ...defaultCol,
            visible: savedCol.visible,
            order: savedCol.order,
            width: savedCol.width || defaultCol.width,
          };
        }
        return defaultCol;
      });
      return mergedColumns.sort((a, b) => a.order - b.order);
    }
  } catch (e) {
    console.error('Error loading columns from storage:', e);
  }
  return base;
}

export function saveColumnsToStorage(storageKey: string, columns: ColumnConfig[]) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(columns));
  } catch (e) {
    console.error('Error saving columns to storage:', e);
  }
}

function loadSavedLayouts(storageKey: string): SavedLayout[] {
  try {
    const saved = localStorage.getItem(`${storageKey}-layouts`);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Error loading layouts:', e);
  }
  return [];
}

function saveSavedLayouts(storageKey: string, layouts: SavedLayout[]) {
  try {
    localStorage.setItem(`${storageKey}-layouts`, JSON.stringify(layouts));
  } catch (e) {
    console.error('Error saving layouts:', e);
  }
}

export function ColumnCustomizer({ columns, onColumnsChange, storageKey, defaultColumns, lockedColumns }: ColumnCustomizerProps) {
  const [localColumns, setLocalColumns] = useState<ColumnConfig[]>(columns);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [savedLayouts, setSavedLayouts] = useState<SavedLayout[]>([]);
  const [newLayoutName, setNewLayoutName] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [activeTab, setActiveTab] = useState<'columns' | 'layouts'>('columns');
  const dragItem = useRef<number | null>(null);

  useEffect(() => {
    setLocalColumns(columns);
  }, [columns]);

  useEffect(() => {
    setSavedLayouts(loadSavedLayouts(storageKey));
  }, [storageKey]);

  const handleToggleColumn = (columnId: string) => {
    const updated = localColumns.map(col =>
      col.id === columnId ? { ...col, visible: !col.visible } : col
    );
    setLocalColumns(updated);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    dragItem.current = index;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = dragItem.current;
    
    if (dragIndex === null || dragIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newColumns = [...localColumns];
    const [draggedItem] = newColumns.splice(dragIndex, 1);
    newColumns.splice(dropIndex, 0, draggedItem);
    
    const reorderedColumns = newColumns.map((col, i) => ({ ...col, order: i }));
    setLocalColumns(reorderedColumns);
    setDraggedIndex(null);
    setDragOverIndex(null);
    dragItem.current = null;
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    dragItem.current = null;
  };

  const handleApply = () => {
    onColumnsChange(localColumns);
    saveColumnsToStorage(storageKey, localColumns);
    setIsOpen(false);
  };

  const handleReset = () => {
    const defaultCols = getDefaultColumns(defaultColumns);
    setLocalColumns(defaultCols);
    onColumnsChange(defaultCols);
    saveColumnsToStorage(storageKey, defaultCols);
  };

  const handleSaveLayout = () => {
    if (!newLayoutName.trim()) {
      toast.error('Digite um nome para o layout');
      return;
    }

    const newLayout: SavedLayout = {
      id: Date.now().toString(),
      name: newLayoutName.trim(),
      columns: localColumns.map(col => ({ ...col })),
      createdAt: new Date().toISOString(),
    };

    const updatedLayouts = [...savedLayouts, newLayout];
    setSavedLayouts(updatedLayouts);
    saveSavedLayouts(storageKey, updatedLayouts);
    setNewLayoutName('');
    setShowSaveInput(false);
    toast.success(`Layout "${newLayout.name}" salvo!`);
  };

  const handleLoadLayout = (layout: SavedLayout) => {
    const loadedColumns = getDefaultColumns(defaultColumns).map(defaultCol => {
      const savedCol = layout.columns.find(c => c.id === defaultCol.id);
      if (savedCol) {
        return {
          ...defaultCol,
          visible: savedCol.visible,
          order: savedCol.order,
          width: savedCol.width || defaultCol.width,
        };
      }
      return defaultCol;
    }).sort((a, b) => a.order - b.order);

    setLocalColumns(loadedColumns);
    onColumnsChange(loadedColumns);
    saveColumnsToStorage(storageKey, loadedColumns);
    toast.success(`Layout "${layout.name}" aplicado!`);
  };



  const handleDeleteLayout = (layoutId: string) => {
    const updatedLayouts = savedLayouts.filter(l => l.id !== layoutId);
    setSavedLayouts(updatedLayouts);
    saveSavedLayouts(storageKey, updatedLayouts);
    toast.success('Layout excluído');
  };

  const visibleCount = localColumns.filter(c => c.visible).length;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Columns3 className="h-4 w-4" />
          Colunas ({visibleCount})
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex gap-1">
              <Button
                variant={activeTab === 'columns' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('columns')}
                className="h-8 text-xs"
              >
                Colunas
              </Button>
              <Button
                variant={activeTab === 'layouts' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('layouts')}
                className="h-8 text-xs gap-1"
              >
                <FolderOpen className="h-3 w-3" />
                Layouts ({savedLayouts.length})
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={handleReset} className="h-8 gap-1 text-xs">
              <RotateCcw className="h-3 w-3" />
              Restaurar
            </Button>
          </div>

          {activeTab === 'columns' && (
            <>
              <p className="text-xs text-muted-foreground">
                Selecione e arraste para reordenar as colunas.
              </p>

              <ScrollArea className="h-[280px] pr-2">
                <div className="space-y-1">
                  {localColumns.map((column, index) => (
                    <div
                      key={column.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center gap-2 p-2 rounded-md border transition-all cursor-grab active:cursor-grabbing ${
                        draggedIndex === index 
                          ? 'opacity-50 bg-primary/10 border-primary' 
                          : dragOverIndex === index
                          ? 'bg-accent border-primary'
                          : 'bg-background border-border hover:bg-accent/50'
                      }`}
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                      <Checkbox
                        id={column.id}
                        checked={column.visible}
                        onCheckedChange={() => handleToggleColumn(column.id)}
                        disabled={(lockedColumns ?? ['acoes']).includes(column.id)}
                      />
                      <Label 
                        htmlFor={column.id} 
                        className="flex-1 text-sm cursor-pointer select-none"
                      >
                        {column.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Save Layout Section */}
              <div className="border-t pt-3 space-y-2">
                {showSaveInput ? (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nome do layout"
                      value={newLayoutName}
                      onChange={(e) => setNewLayoutName(e.target.value)}
                      className="h-8 text-sm"
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveLayout()}
                    />
                    <Button size="sm" className="h-8" onClick={handleSaveLayout}>
                      <Save className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8" onClick={() => setShowSaveInput(false)}>
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full gap-2 h-8"
                    onClick={() => setShowSaveInput(true)}
                  >
                    <Save className="h-3 w-3" />
                    Salvar como Layout
                  </Button>
                )}
              </div>
            </>
          )}

          {activeTab === 'layouts' && (
            <ScrollArea className="h-[320px] pr-2">
              {savedLayouts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhum layout salvo</p>
                  <p className="text-xs">Configure suas colunas e salve para uso futuro</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {savedLayouts.map((layout) => (
                    <div
                      key={layout.id}
                      className="flex items-center gap-2 p-3 rounded-md border bg-background hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{layout.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {layout.columns.filter(c => c.visible).length} colunas visíveis
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2"
                        onClick={() => handleLoadLayout(layout)}
                      >
                        Aplicar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteLayout(layout.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleApply}>
              Aplicar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
