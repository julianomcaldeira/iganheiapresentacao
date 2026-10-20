import jsPDF from 'jspdf';
import { drawTimbradoTop, drawTimbradoLogo, drawTimbradoBottom, LOGO_TOP } from './timbradoPdf';

interface PdfBlock {
  type: 'title' | 'subtitle' | 'paragraph' | 'spacer' | 'signature';
  text?: string;
}

function buildPdf(
  titulo: string,
  blocks: PdfBlock[],
  logo?: { dataUrl: string | null; ratio?: number } | null
): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 20;
  const maxWidth = pageWidth - marginX * 2;
  const contentBottom = pageHeight - 22;

  // Cabeçalho em papel timbrado padrão i-Ganhei + logo do cliente (quando informado)
  drawTimbradoTop(doc);
  const logoEndY = drawTimbradoLogo(doc, logo?.dataUrl ?? null, LOGO_TOP, 70, 20, logo?.ratio ?? 3);
  const titleY = (logo?.dataUrl ? logoEndY + 8 : 24);
  doc.setTextColor(30, 30, 30);
  doc.setFont('times', 'bold');
  doc.setFontSize(14);
  doc.text(titulo, pageWidth / 2, titleY, { align: 'center' });

  let y = titleY + 8;

  const ensureSpace = (needed: number) => {
    if (y + needed > contentBottom) {
      doc.addPage();
      drawTimbradoTop(doc);
      y = contentTop;
    }
  };

  blocks.forEach(block => {
    if (block.type === 'spacer') {
      y += 4;
      return;
    }
    if (block.type === 'title') {
      ensureSpace(10);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(block.text || '', marginX, y);
      y += 7;
      return;
    }
    if (block.type === 'subtitle') {
      ensureSpace(8);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(block.text || '', marginX, y);
      y += 6;
      return;
    }
    if (block.type === 'signature') {
      ensureSpace(20);
      y += 10;
      doc.setDrawColor(0);
      doc.line(marginX, y, marginX + 70, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(block.text || '', marginX, y);
      y += 6;
      return;
    }
    // paragraph
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(block.text || '', maxWidth);
    lines.forEach((line: string) => {
      ensureSpace(6);
      doc.text(line, marginX, y);
      y += 5;
    });
    y += 2;
  });

  // Rodapé timbrado em todas as páginas
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    drawTimbradoBottom(doc);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(
      `Documento de demonstração • Página ${i} de ${pageCount}`,
      pageWidth / 2,
      pageHeight - 9,
      { align: 'center' }
    );
  }

  return doc;
}

export interface LicitacaoCtx {
  numero?: string;
  objeto?: string;
  orgao?: string;
  /** Logo do cliente (data URL) para o timbrado; proporção real opcional. */
  logoDataUrl?: string | null;
  logoRatio?: number;
}

function logoFromCtx(ctx: LicitacaoCtx): { dataUrl: string | null; ratio?: number } | null {
  if (!ctx.logoDataUrl) return null;
  return { dataUrl: ctx.logoDataUrl, ratio: ctx.logoRatio };
}

/**
 * Nome do arquivo ao salvar: "<número da licitação> <nome da peça>.pdf".
 * Ex.: "PE 014-2026 Pedido de Esclarecimento.pdf".
 * Caracteres inválidos em nome de arquivo (/, :, etc.) viram "-".
 */
export function nomeArquivoPeca(numero: string | undefined | null, titulo: string): string {
  const sanitize = (s: string) => s.trim().replace(/[/:*?"<>|\\]/g, '-').replace(/\s+/g, ' ');
  const num = sanitize(numero || '');
  const tit = sanitize(titulo || '');
  const base = [num, tit].filter(Boolean).join(' ');
  return `${base || 'peca-juridica'}.pdf`;
}

export type ModeloPecaKey = 'esclarecimento' | 'impugnacao' | 'recurso' | 'contrarrazoes';

export function getPecaExemploTitulo(key: ModeloPecaKey): string {
  switch (key) {
    case 'esclarecimento': return 'PEDIDO DE ESCLARECIMENTO';
    case 'impugnacao': return 'IMPUGNAÇÃO AO EDITAL';
    case 'recurso': return 'RECURSO ADMINISTRATIVO';
    case 'contrarrazoes': return 'CONTRARRAZÕES AO RECURSO';
  }
}

/** Blocos de exemplo do modelo (mesmo conteúdo usado no PDF). */
export function getPecaExemploBlocks(key: ModeloPecaKey, ctx: LicitacaoCtx): PdfBlock[] {
  switch (key) {
    case 'esclarecimento':
      return [
        { type: 'paragraph', text: `Ao Sr(a). Pregoeiro(a) do ${ctx.orgao || 'Órgão Licitante'}` },
        { type: 'paragraph', text: `Referente: Licitação nº ${ctx.numero || '___/____'}` },
        { type: 'paragraph', text: `Objeto: ${ctx.objeto || 'objeto da licitação'}` },
        { type: 'spacer' },
        { type: 'title', text: 'I — DAS PRELIMINARES' },
        { type: 'paragraph', text: 'A empresa peticionária, devidamente qualificada nos autos da licitação em epígrafe, vem, respeitosamente, à presença de Vossa Senhoria, com fundamento no art. 23 da Lei nº 14.133/2021 e no item correspondente do instrumento convocatório, apresentar PEDIDO DE ESCLARECIMENTO em face dos itens a seguir indicados.' },
        { type: 'title', text: 'II — DOS QUESTIONAMENTOS' },
        { type: 'subtitle', text: '1. Especificação técnica do item 3.2' },
        { type: 'paragraph', text: 'Solicita-se confirmação se será aceito equipamento com certificação equivalente (INMETRO ou IEC 60601-1) ou exclusivamente a indicada no edital, considerando o princípio da ampla concorrência.' },
        { type: 'subtitle', text: '2. Prazo de entrega e logística' },
        { type: 'paragraph', text: 'O Anexo I prevê prazo de 30 dias corridos. Considerando a logística para itens importados, indaga-se se há possibilidade de cronograma escalonado, com entregas parciais previamente acordadas.' },
        { type: 'subtitle', text: '3. Habilitação técnica' },
        { type: 'paragraph', text: 'Quanto ao atestado de capacidade técnica, requer-se esclarecimento se serão aceitos atestados emitidos por empresas privadas, desde que comprovem objeto compatível em características, quantidades e prazos.' },
        { type: 'title', text: 'III — DO PEDIDO' },
        { type: 'paragraph', text: 'Diante do exposto, requer-se que os esclarecimentos sejam prestados em tempo hábil, com publicação no portal oficial, para que todos os interessados possam reformular suas propostas, se assim entenderem necessário, garantindo a isonomia e a competitividade do certame.' },
        { type: 'paragraph', text: 'Termos em que pede deferimento.' },
        { type: 'signature', text: 'Representante Legal — Empresa Licitante' },
      ];
    case 'impugnacao':
      return [
        { type: 'paragraph', text: `Ao Sr(a). Pregoeiro(a) do ${ctx.orgao || 'Órgão Licitante'}` },
        { type: 'paragraph', text: `Referente: Licitação nº ${ctx.numero || '___/____'} — ${ctx.objeto || ''}` },
        { type: 'spacer' },
        { type: 'title', text: 'I — TEMPESTIVIDADE' },
        { type: 'paragraph', text: 'A presente impugnação é apresentada dentro do prazo legal previsto no art. 164 da Lei nº 14.133/2021, sendo, portanto, plenamente tempestiva.' },
        { type: 'title', text: 'II — DOS FATOS' },
        { type: 'paragraph', text: 'O edital em comento traz exigência de comprovação de capital social mínimo em percentual superior ao admitido pela jurisprudência consolidada do Tribunal de Contas da União, configurando restrição injustificada à competitividade.' },
        { type: 'title', text: 'III — DO DIREITO' },
        { type: 'paragraph', text: 'Conforme Acórdão TCU nº 1.214/2013 — Plenário, a Administração não pode estabelecer exigências de habilitação econômico-financeira que extrapolem o estritamente necessário à execução contratual, sob pena de ferir o princípio da isonomia (CF/88, art. 37, XXI).' },
        { type: 'title', text: 'IV — DO PEDIDO' },
        { type: 'paragraph', text: 'Requer-se o acolhimento da presente impugnação para que seja revisto o item ora questionado, com posterior republicação do edital e reabertura do prazo legal de publicidade.' },
        { type: 'signature', text: 'Representante Legal' },
      ];
    case 'recurso':
      return [
        { type: 'paragraph', text: `Ao Sr(a). Pregoeiro(a) do ${ctx.orgao || 'Órgão Licitante'}` },
        { type: 'paragraph', text: `Pregão Eletrônico nº ${ctx.numero || '___/____'}` },
        { type: 'spacer' },
        { type: 'title', text: 'I — DA TEMPESTIVIDADE E CABIMENTO' },
        { type: 'paragraph', text: 'Apresenta-se o presente recurso administrativo nos termos do art. 165 da Lei nº 14.133/2021, no prazo legal de 3 (três) dias úteis a contar da intimação do ato.' },
        { type: 'title', text: 'II — DAS RAZÕES' },
        { type: 'paragraph', text: 'A empresa declarada vencedora não atendeu integralmente às exigências de habilitação técnica, conforme item 9.3 do edital, posto que o atestado apresentado não comprova execução de objeto similar em quantitativos compatíveis.' },
        { type: 'paragraph', text: 'Ademais, a proposta vencedora apresenta indícios de inexequibilidade, nos termos do art. 59, §4º da NLLC, sem que tenha sido oportunizada diligência específica para comprovação de exequibilidade.' },
        { type: 'title', text: 'III — DOS PEDIDOS' },
        { type: 'paragraph', text: 'a) Conhecimento e provimento do presente recurso;\nb) Reforma da decisão recorrida;\nc) Desclassificação da licitante vencedora;\nd) Convocação da segunda colocada para apresentação de proposta ajustada.' },
        { type: 'signature', text: 'Representante Legal — Recorrente' },
      ];
    case 'contrarrazoes':
      return [
        { type: 'paragraph', text: `Ao Sr(a). Pregoeiro(a) do ${ctx.orgao || 'Órgão Licitante'}` },
        { type: 'paragraph', text: `Pregão Eletrônico nº ${ctx.numero || '___/____'}` },
        { type: 'spacer' },
        { type: 'title', text: 'I — DA TEMPESTIVIDADE' },
        { type: 'paragraph', text: 'As presentes contrarrazões são apresentadas no prazo legal, em estrita observância ao art. 165, §2º da Lei nº 14.133/2021.' },
        { type: 'title', text: 'II — DO MÉRITO' },
        { type: 'paragraph', text: 'O recurso interposto não merece prosperar. A empresa recorrida cumpriu integralmente todos os requisitos editalícios, tendo apresentado documentação habilitatória pertinente e proposta plenamente exequível, conforme planilha de composição de custos juntada aos autos.' },
        { type: 'paragraph', text: 'Os argumentos do recorrente carecem de comprovação objetiva, configurando mera tentativa protelatória do certame, em prejuízo ao interesse público e à eficiência administrativa.' },
        { type: 'title', text: 'III — DO PEDIDO' },
        { type: 'paragraph', text: 'Requer-se o NÃO PROVIMENTO do recurso interposto, com a manutenção da decisão que declarou a recorrida vencedora do certame e o prosseguimento regular do processo licitatório.' },
        { type: 'signature', text: 'Representante Legal' },
      ];
  }
}

/** Converte os blocos de exemplo em texto puro para exibição em tela. */
export function blocosParaTexto(blocks: PdfBlock[]): string {
  const text = blocks
    .map((block) => {
      switch (block.type) {
        case 'title':
          return `\n${block.text}\n`;
        case 'subtitle':
          return `\n${block.text}`;
        case 'paragraph':
          return block.text || '';
        case 'signature':
          return `\n\n${block.text}`;
        default:
          return '';
      }
    })
    .join('\n');
  return text.replace(/\n{3,}/g, '\n\n').trim();
}

/** Monta o PDF da peça no timbrado e devolve o documento (sem baixar). */
export function buildPecaPdfDoc(key: ModeloPecaKey, ctx: LicitacaoCtx): jsPDF {
  return buildPdf(getPecaExemploTitulo(key), getPecaExemploBlocks(key, ctx), logoFromCtx(ctx));
}

/** Gera o PDF no timbrado a partir do conteúdo da peça criada (texto livre). */
export function gerarPdfTextoLivre(
  titulo: string,
  conteudo: string,
  ctx: LicitacaoCtx,
  fileName = 'peca-juridica-timbrado.pdf'
) {
  const doc = buildPdf(titulo.toUpperCase(), [{ type: 'paragraph', text: conteudo }], logoFromCtx(ctx));
  doc.save(fileName);
}

export function gerarPdfEsclarecimento(ctx: LicitacaoCtx, fileName = 'pedido-esclarecimento.pdf') {
  buildPecaPdfDoc('esclarecimento', ctx).save(fileName);
}

export function gerarPdfImpugnacao(ctx: LicitacaoCtx, fileName = 'impugnacao-edital.pdf') {
  buildPecaPdfDoc('impugnacao', ctx).save(fileName);
}

export function gerarPdfRecurso(ctx: LicitacaoCtx, fileName = 'recurso-administrativo.pdf') {
  buildPecaPdfDoc('recurso', ctx).save(fileName);
}

export function gerarPdfContrarrazao(ctx: LicitacaoCtx, fileName = 'contrarrazao.pdf') {
  buildPecaPdfDoc('contrarrazoes', ctx).save(fileName);
}

export function gerarPdfProposta(ctx: LicitacaoCtx & { valorEstimado?: number }, fileName = 'proposta-comercial.pdf') {
  const valor = ctx.valorEstimado ?? 0;
  const desconto = valor * 0.08;
  const valorFinal = valor - desconto;
  const fmt = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const doc = buildPdf('PROPOSTA COMERCIAL', [
    { type: 'paragraph', text: `Ao ${ctx.orgao || 'Órgão Licitante'}` },
    { type: 'paragraph', text: `Referência: Licitação nº ${ctx.numero || '___/____'}` },
    { type: 'paragraph', text: `Objeto: ${ctx.objeto || ''}` },
    { type: 'spacer' },
    { type: 'title', text: 'I — DADOS DA PROPONENTE' },
    { type: 'paragraph', text: 'Razão Social: Empresa Licitante Ltda.\nCNPJ: 00.000.000/0001-00\nEndereço: Av. Paulista, 1000 — São Paulo/SP\nRepresentante Legal: Diretor Comercial' },
    { type: 'title', text: 'II — CONDIÇÕES COMERCIAIS' },
    { type: 'paragraph', text: `Valor estimado do edital: ${fmt(valor)}` },
    { type: 'paragraph', text: `Desconto ofertado: 8,00% (${fmt(desconto)})` },
    { type: 'paragraph', text: `VALOR GLOBAL DA PROPOSTA: ${fmt(valorFinal)}` },
    { type: 'paragraph', text: 'Prazo de validade da proposta: 60 (sessenta) dias corridos.\nPrazo de entrega: conforme cronograma do edital.\nCondições de pagamento: conforme edital, mediante medição e atesto.' },
    { type: 'title', text: 'III — DECLARAÇÕES' },
    { type: 'paragraph', text: 'a) Declaramos que nos valores ofertados estão inclusos todos os custos diretos e indiretos, tributos, encargos sociais e trabalhistas, frete, seguros e demais despesas que possam incidir sobre o objeto contratado.\nb) Declaramos pleno conhecimento e aceitação de todas as condições estabelecidas no edital e seus anexos.\nc) Declaramos disponibilidade de equipe técnica qualificada para execução do objeto.' },
    { type: 'title', text: 'IV — GARANTIA E SUPORTE' },
    { type: 'paragraph', text: 'Garantia mínima de 12 (doze) meses sobre os produtos/serviços fornecidos, com suporte técnico em horário comercial e SLA de atendimento conforme termo de referência.' },
    { type: 'signature', text: 'Representante Legal — Empresa Licitante' },
  ], logoFromCtx(ctx));
  doc.save(fileName);
}
