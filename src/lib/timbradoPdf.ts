import jsPDF from 'jspdf';

/**
 * Papel timbrado padrão i-Ganhei (modelo único para todas as empresas).
 * - Faixa superior: filete fino + faixa cinza com detalhes diagonais.
 * - Logo do cliente (cadastrado na plataforma): centralizado no cabeçalho,
 *   logo abaixo da faixa.
 * - Rodapé: filete fino com extremidades espessas.
 *
 * Desenhado vetorialmente (sem imagem de fundo): nítido em qualquer resolução.
 */

export const TIMBRADO_MARGIN = 20;
const BAND_TOP = 12;
const BAND_HEIGHT = 4.5;
/** Espaço (margem) entre a faixa do cabeçalho e o logo do cliente. */
export const LOGO_TOP = 25;

export interface TimbradoClienteInfo {
  nome?: string | null;
  cnpj?: string | null;
}

/** Faixa superior do timbrado. */
export function drawTimbradoTop(doc: jsPDF): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const x0 = TIMBRADO_MARGIN;
  const x1 = pageWidth - TIMBRADO_MARGIN;

  // Filete fino acima da faixa
  doc.setDrawColor(60, 60, 60);
  doc.setLineWidth(0.4);
  doc.line(x0, BAND_TOP, x1, BAND_TOP);

  // Faixa cinza clara
  const bandY = BAND_TOP + 1;
  doc.setFillColor(232, 232, 232);
  doc.rect(x0, bandY, x1 - x0, BAND_HEIGHT, 'F');

  // Detalhes diagonais — esquerda (duas barras inclinadas)
  const slant = 4;
  doc.setFillColor(176, 176, 176);
  // barra 1 (mais escura)
  doc.triangle(x0, bandY, x0 + 10, bandY, x0 + 10 - slant, bandY + BAND_HEIGHT, 'F');
  doc.triangle(x0, bandY, x0 + 10 - slant, bandY + BAND_HEIGHT, x0, bandY + BAND_HEIGHT, 'F');
  // barra 2 (mais clara, ao lado)
  doc.setFillColor(208, 208, 208);
  doc.triangle(x0 + 12, bandY, x0 + 19, bandY, x0 + 19 - slant, bandY + BAND_HEIGHT, 'F');
  doc.triangle(x0 + 12, bandY, x0 + 19 - slant, bandY + BAND_HEIGHT, x0 + 12, bandY + BAND_HEIGHT, 'F');

  // Detalhes diagonais — direita (espelho)
  doc.setFillColor(176, 176, 176);
  doc.triangle(x1, bandY, x1 - 10, bandY, x1 - 10 + slant, bandY + BAND_HEIGHT, 'F');
  doc.triangle(x1, bandY, x1 - 10 + slant, bandY + BAND_HEIGHT, x1, bandY + BAND_HEIGHT, 'F');
  doc.setFillColor(208, 208, 208);
  doc.triangle(x1 - 12, bandY, x1 - 19, bandY, x1 - 19 + slant, bandY + BAND_HEIGHT, 'F');
  doc.triangle(x1 - 12, bandY, x1 - 19 + slant, bandY + BAND_HEIGHT, x1 - 12, bandY + BAND_HEIGHT, 'F');
}

/** Filete inferior do timbrado. */
export function drawTimbradoBottom(doc: jsPDF): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const x0 = TIMBRADO_MARGIN;
  const x1 = pageWidth - TIMBRADO_MARGIN;
  const lineY = pageHeight - 14;

  // Linha fina principal
  doc.setDrawColor(90, 90, 90);
  doc.setLineWidth(0.4);
  doc.line(x0, lineY, x1, lineY);

  // Extremidades espessas
  doc.setLineWidth(1.4);
  doc.setDrawColor(120, 120, 120);
  doc.line(x0, lineY, x0 + 14, lineY);
  doc.line(x1 - 14, lineY, x1, lineY);

  // Sombra clara abaixo
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(x0, lineY + 1.6, x1, lineY + 1.6);
}

/** Formato da imagem a partir do data URL (para o jsPDF). */
export function imageFormatFromDataUrl(dataUrl: string): 'PNG' | 'JPEG' {
  return dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
}

/** Baixa o logo (URL pública do Storage) e converte para data URL + proporção. */
export async function loadLogoForPdf(
  logoUrl: string | null | undefined
): Promise<{ dataUrl: string; ratio: number } | null> {
  if (!logoUrl) return null;
  try {
    const res = await fetch(logoUrl);
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const size = await getDataUrlImageSize(dataUrl);
    return { dataUrl, ratio: size.w > 0 && size.h > 0 ? size.w / size.h : 3 };
  } catch {
    return null;
  }
}

/** Dimensões naturais de um data URL de imagem (para preservar proporção). */
export function getDataUrlImageSize(dataUrl: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        resolve({ w: img.naturalWidth, h: img.naturalHeight });
      } else {
        resolve({ w: 3, h: 1 });
      }
    };
    img.onerror = () => resolve({ w: 3, h: 1 });
    img.src = dataUrl;
  });
}

/**
 * Desenha o logo do cliente centralizado abaixo da faixa superior.
 * `ratio` = largura/altura real do logo (use getDataUrlImageSize); padrão 3:1.
 * Retorna a coordenada Y livre logo após o logo.
 */
export function drawTimbradoLogo(
  doc: jsPDF,
  logoDataUrl: string | null,
  topY: number,
  maxW = 70,
  maxH = 20,
  ratio = 3
): number {
  if (!logoDataUrl) return topY;
  try {
    const safeRatio = ratio > 0 ? ratio : 3;
    let w = maxW;
    let h = w / safeRatio;
    if (h > maxH) {
      h = maxH;
      w = h * safeRatio;
    }
    const pageWidth = doc.internal.pageSize.getWidth();
    const x = (pageWidth - w) / 2;
    doc.addImage(logoDataUrl, imageFormatFromDataUrl(logoDataUrl), x, topY, w, h);
    return topY + h;
  } catch {
    return topY;
  }
}

/** Rodapé do timbrado com dados do cliente e paginação. */
export function drawTimbradoFooter(
  doc: jsPDF,
  pageNumber: number,
  totalPages: number,
  cliente?: TimbradoClienteInfo | null,
  extra?: string | null
): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  drawTimbradoBottom(doc);

  doc.setTextColor(110, 110, 110);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const baseY = pageHeight - 9;

  const parts: string[] = [];
  if (cliente?.nome) parts.push(cliente.nome);
  if (cliente?.cnpj) parts.push(`CNPJ: ${cliente.cnpj}`);
  if (extra) parts.push(extra);
  if (parts.length > 0) {
    doc.text(parts.join('  •  '), pageWidth / 2, baseY, { align: 'center' });
  }
  doc.text(
    `Página ${pageNumber} de ${totalPages}`,
    pageWidth - TIMBRADO_MARGIN,
    baseY,
    { align: 'right' }
  );
}
