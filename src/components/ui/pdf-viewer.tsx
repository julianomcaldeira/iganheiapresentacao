import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.mjs?url";

// Configure worker once
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(pdfjsLib as any).GlobalWorkerOptions.workerSrc = workerSrc;

interface PdfViewerProps {
  url: string;
  className?: string;
}

const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];
const DEFAULT_ZOOM_INDEX = 3; // 1.25

export function PdfViewer({ url, className }: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pdf, setPdf] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scale = ZOOM_LEVELS[zoomIndex];
  const canPrev = pageNumber > 1;
  const canNext = pageNumber < numPages;
  const canZoomOut = zoomIndex > 0;
  const canZoomIn = zoomIndex < ZOOM_LEVELS.length - 1;

  const loadKey = useMemo(() => url, [url]);

  useEffect(() => {
    let cancelled = false;
    let loadingTask: any;

    async function load() {
      setLoading(true);
      setRendering(false);
      setError(null);
      setPdf(null);
      setNumPages(0);
      setPageNumber(1);
      setZoomIndex(DEFAULT_ZOOM_INDEX);

      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("Não foi possível carregar o PDF");
        const data = await res.arrayBuffer();
        loadingTask = (pdfjsLib as any).getDocument({ data });
        const pdfDoc = await loadingTask.promise;
        if (cancelled) return;
        setPdf(pdfDoc);
        setNumPages(pdfDoc.numPages || 0);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Erro ao carregar PDF");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
      try {
        loadingTask?.destroy?.();
      } catch {
        // ignore
      }
    };
  }, [loadKey, url]);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      if (!pdf || !canvasRef.current) return;

      setRendering(true);
      try {
        const page = await pdf.getPage(pageNumber);
        if (cancelled) return;

        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        await page.render({ canvasContext: ctx, viewport }).promise;
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Erro ao renderizar PDF");
        }
      } finally {
        if (!cancelled) setRendering(false);
      }
    }

    render();

    return () => {
      cancelled = true;
    };
  }, [pdf, pageNumber, scale]);

  const handleZoomIn = () => {
    if (canZoomIn) setZoomIndex((i) => i + 1);
  };

  const handleZoomOut = () => {
    if (canZoomOut) setZoomIndex((i) => i - 1);
  };

  const handleResetZoom = () => {
    setZoomIndex(DEFAULT_ZOOM_INDEX);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          {numPages > 0 ? `Página ${pageNumber} de ${numPages}` : ""}
        </div>
        <div className="flex items-center gap-1">
          {/* Zoom controls */}
          <Button 
            variant="outline" 
            size="sm" 
            disabled={!canZoomOut || loading || rendering} 
            onClick={handleZoomOut}
            title="Diminuir zoom"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetZoom}
            disabled={loading || rendering}
            className="min-w-[60px] text-xs"
            title="Resetar zoom"
          >
            {Math.round(scale * 100)}%
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            disabled={!canZoomIn || loading || rendering} 
            onClick={handleZoomIn}
            title="Aumentar zoom"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>

          <div className="w-px h-5 bg-border mx-1" />

          {/* Page navigation */}
          <Button 
            variant="outline" 
            size="sm" 
            disabled={!canPrev || loading || rendering} 
            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
            title="Página anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            disabled={!canNext || loading || rendering} 
            onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
            title="Próxima página"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-background overflow-auto max-h-[60vh]">
        {loading ? (
          <div className="p-10 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="p-6 text-sm text-muted-foreground">
            {error}
          </div>
        ) : (
          <div className="p-3 flex justify-center min-w-fit">
            <canvas ref={canvasRef} className="rounded-md shadow-sm" />
          </div>
        )}
      </div>
    </div>
  );
}
