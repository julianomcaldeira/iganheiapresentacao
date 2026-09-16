import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ExportColumn {
  key: string;
  label: string;
  type?: string;
}

interface ExportOptions {
  filename: string;
  title?: string;
  columns: ExportColumn[];
  data: Record<string, any>[];
}

// Formata valores para exibição
const formatValue = (value: any, type?: string): string => {
  if (value === null || value === undefined || value === '-') return '-';
  
  switch (type) {
    case 'currency':
      return new Intl.NumberFormat('pt-BR', { 
        style: 'currency', 
        currency: 'BRL' 
      }).format(value);
    case 'date':
      try {
        return new Date(value).toLocaleDateString('pt-BR');
      } catch {
        return String(value);
      }
    case 'array':
      return Array.isArray(value) ? value.join(', ') : String(value);
    default:
      return String(value);
  }
};

// Exporta para CSV
export const exportToCSV = ({ filename, columns, data }: ExportOptions): void => {
  // Header
  const header = columns.map(col => col.label).join(';');
  
  // Rows
  const rows = data.map(row => 
    columns.map(col => {
      const value = formatValue(row[col.key], col.type);
      // Escape quotes and wrap in quotes if contains separator
      const escapedValue = value.replace(/"/g, '""');
      return `"${escapedValue}"`;
    }).join(';')
  );
  
  // Combine
  const csvContent = [header, ...rows].join('\n');
  
  // Add BOM for UTF-8 support in Excel
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // Download
  downloadBlob(blob, `${filename}.csv`);
};

// Exporta para Excel (XLSX)
export const exportToExcel = ({ filename, title, columns, data }: ExportOptions): void => {
  // Prepara dados formatados
  const formattedData = data.map(row => {
    const formattedRow: Record<string, string> = {};
    columns.forEach(col => {
      formattedRow[col.label] = formatValue(row[col.key], col.type);
    });
    return formattedRow;
  });

  // Cria workbook e worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(formattedData);

  // Ajusta largura das colunas
  const colWidths = columns.map(col => {
    const maxLength = Math.max(
      col.label.length,
      ...data.map(row => formatValue(row[col.key], col.type).length)
    );
    return { wch: Math.min(maxLength + 2, 50) };
  });
  ws['!cols'] = colWidths;

  // Adiciona worksheet ao workbook
  XLSX.utils.book_append_sheet(wb, ws, title || 'Relatório');

  // Gera arquivo
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

// Exporta para PDF
export const exportToPDF = ({ filename, title, columns, data }: ExportOptions): void => {
  const doc = new jsPDF({
    orientation: columns.length > 5 ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Título
  if (title) {
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 14, 20);
  }

  // Data de geração
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 14, title ? 28 : 20);

  // Headers da tabela
  const headers = columns.map(col => col.label);

  // Dados formatados
  const tableData = data.map(row => 
    columns.map(col => formatValue(row[col.key], col.type))
  );

  // Gera tabela
  autoTable(doc, {
    head: [headers],
    body: tableData,
    startY: title ? 35 : 25,
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [79, 70, 229], // Indigo
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 250],
    },
    margin: { top: 10, right: 14, bottom: 20, left: 14 },
    didDrawPage: (data) => {
      // Rodapé com número da página
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.text(
        `Página ${data.pageNumber} de ${pageCount}`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    },
  });

  // Salva
  doc.save(`${filename}.pdf`);
};

// Helper para download de blob
const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Exporta todos os formatos disponíveis
export type ExportFormat = 'csv' | 'excel' | 'pdf';

export const exportReport = (format: ExportFormat, options: ExportOptions): void => {
  switch (format) {
    case 'csv':
      exportToCSV(options);
      break;
    case 'excel':
      exportToExcel(options);
      break;
    case 'pdf':
      exportToPDF(options);
      break;
  }
};
