import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TaskRecord } from '../types';

export function formatCurrency(amount: number, symbol = 'Rs.'): string {
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${symbol} ${formatted}`;
}

export function exportToCSV(taskName: string, records: TaskRecord[], symbol = 'Rs.') {
  const headers = [
    '#',
    'Customer Name',
    'Item',
    'Quantity',
    `Price (${symbol})`,
    `Total (${symbol})`,
    `Paid Amount (${symbol})`,
    'Payment Status',
    `Remaining (${symbol})`,
    'Date',
  ];

  const rows = records.map((r, index) => [
    index + 1,
    `"${(r.customer_name || '').replace(/"/g, '""')}"`,
    `"${(r.item || '').replace(/"/g, '""')}"`,
    r.quantity,
    r.price,
    r.total,
    r.paid_amount || 0,
    r.payment_status || 'UNPAID',
    r.remaining_amount ?? Math.max(0, (r.total || 0) - (r.paid_amount || 0)),
    `"${r.date || ''}"`,
  ]);

  const grandTotal = records.reduce((sum, r) => sum + Number(r.total || 0), 0);
  const totalPaid = records.reduce((sum, r) => sum + Number(r.paid_amount || 0), 0);
  const totalRemaining = records.reduce(
    (sum, r) => sum + Number(r.remaining_amount ?? Math.max(0, (r.total || 0) - (r.paid_amount || 0))),
    0
  );
  const totalQty = records.reduce((sum, r) => sum + Number(r.quantity || 0), 0);

  rows.push([
    '',
    '"TOTAL"',
    '""',
    totalQty,
    '""',
    grandTotal,
    totalPaid,
    '""',
    totalRemaining,
    '""',
  ]);

  const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${taskName.replace(/[^a-zA-Z0-9_-]/g, '_')}_records.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToPDF(taskName: string, records: TaskRecord[], symbol = 'Rs.', grandTotal: number) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
  });

  const totalPaid = records.reduce((sum, r) => sum + Number(r.paid_amount || 0), 0);
  const totalRemaining = records.reduce(
    (sum, r) => sum + Number(r.remaining_amount ?? Math.max(0, (r.total || 0) - (r.paid_amount || 0))),
    0
  );

  // Header styling
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42);
  doc.text('LEDGER FLOW', 40, 42);

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Private Digital Business Ledger & Khata Statement', 40, 56);

  // Task Name Banner
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(40, 68, 762, 54, 6, 6, 'F');

  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(taskName, 55, 92);

  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  const dateStr = new Date().toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  doc.text(`Generated: ${dateStr}   |   Entries: ${records.length}`, 55, 108);

  // Summary Metrics Banner
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('Grand Total:', 420, 90);
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(formatCurrency(grandTotal, symbol), 420, 108);

  doc.setFontSize(9);
  doc.setTextColor(5, 150, 105); // Green
  doc.text('Total Received:', 540, 90);
  doc.setFontSize(11);
  doc.setTextColor(5, 150, 105);
  doc.text(formatCurrency(totalPaid, symbol), 540, 108);

  doc.setFontSize(9);
  doc.setTextColor(225, 29, 72); // Rose/Red
  doc.text('Total Remaining:', 670, 90);
  doc.setFontSize(11);
  doc.setTextColor(225, 29, 72);
  doc.text(formatCurrency(totalRemaining, symbol), 670, 108);

  // Table
  const tableData = records.map((r, index) => [
    index + 1,
    r.customer_name || '-',
    r.item || '-',
    r.quantity || 0,
    formatCurrency(r.price || 0, symbol),
    formatCurrency(r.total || 0, symbol),
    formatCurrency(r.paid_amount || 0, symbol),
    r.payment_status || 'UNPAID',
    formatCurrency(r.remaining_amount ?? Math.max(0, (r.total || 0) - (r.paid_amount || 0)), symbol),
    r.date || '-',
  ]);

  autoTable(doc, {
    startY: 135,
    head: [
      [
        '#',
        'Customer Name',
        'Item',
        'Qty',
        'Price',
        'Total',
        'Paid Amount',
        'Payment Status',
        'Remaining',
        'Date',
      ],
    ],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 8.5,
      cellPadding: 5,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 25, halign: 'center' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right', fontStyle: 'bold' },
      6: { halign: 'right', textColor: [5, 150, 105] },
      7: { halign: 'center', fontStyle: 'bold' },
      8: { halign: 'right', textColor: [225, 29, 72], fontStyle: 'bold' },
      9: { halign: 'center' },
    },
    foot: [
      [
        '',
        'TOTAL SUMMARY',
        '',
        records.reduce((s, r) => s + (Number(r.quantity) || 0), 0),
        '',
        formatCurrency(grandTotal, symbol),
        formatCurrency(totalPaid, symbol),
        '',
        formatCurrency(totalRemaining, symbol),
        '',
      ],
    ],
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
    },
    margin: { left: 40, right: 40 },
  });

  // Footer note
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Ledger Flow — Confidential Private Business Record   •   Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 20,
      { align: 'center' }
    );
  }

  doc.save(`${taskName.replace(/[^a-zA-Z0-9_-]/g, '_')}_ledger.pdf`);
}
