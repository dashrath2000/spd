/* eslint-disable @typescript-eslint/no-explicit-any */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from './calculations';
import type { PurchaseOrder, ShopSettings, Supplier } from '../types';

export const generatePurchaseBill = (po: PurchaseOrder, settings: ShopSettings, supplier: Supplier | null) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Helper for right alignment
  const rightAlign = (text: string, y: number) => {
    const textWidth = doc.getTextWidth(text);
    doc.text(text, pageWidth - 25 - textWidth, y);
  };

  // --- Header ---
  doc.setFillColor(18, 18, 18); // Luxury Charcoal
  doc.rect(0, 0, pageWidth, 40, 'F');

  // Logo or Shop Name
  if (settings.logo) {
    try {
      doc.addImage(settings.logo, 'PNG', 20, 10, 20, 20);
      doc.setTextColor(201, 168, 76);
      doc.setFont('times', 'bold');
      doc.setFontSize(22);
      doc.text(settings.shopName.toUpperCase(), 45, 25);
    } catch {
      doc.setTextColor(201, 168, 76);
      doc.setFont('times', 'bold');
      doc.setFontSize(28);
      doc.text(settings.shopName.toUpperCase(), 20, 25);
    }
  } else {
    doc.setTextColor(201, 168, 76);
    doc.setFont('times', 'bold');
    doc.setFontSize(28);
    doc.text(settings.shopName.toUpperCase(), 20, 25);
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  rightAlign('PURCHASE ORDER / BILL', 30);

  // --- Shop Details (Purchaser) ---
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(9);
  doc.text(settings.address, 20, 50, { maxWidth: 80 });
  doc.text(`GSTIN: ${settings.gstin}`, 20, 65);
  doc.text(`Phone: ${settings.phone}`, 20, 70);

  // --- Bill Details ---
  doc.setFont('helvetica', 'bold');
  rightAlign(`PO #: ${po.poNumber}`, 50);
  doc.setFont('helvetica', 'normal');
  rightAlign(`Date: ${new Date(po.createdAt).toLocaleDateString('en-IN')}`, 55);
  rightAlign(`Status: ${po.status.toUpperCase()}`, 60);

  // --- Supplier Details ---
  doc.setFillColor(245, 245, 245);
  doc.rect(20, 85, pageWidth - 40, 30, 'F');
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('SUPPLIER:', 25, 92);
  doc.setFontSize(11);
  doc.text(po.supplierName, 25, 100);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Contact: ${supplier?.contactPerson || 'N/A'}`, 25, 105);
  if (supplier?.gstin) doc.text(`GSTIN: ${supplier.gstin}`, 25, 110);

  // --- Items Table ---
  const tableData = po.items.map((item, index) => [
    index + 1,
    item.description,
    Number(item.weight).toFixed(3) + 'g',
    item.stockType === 'Wholesale' ? '-' : item.quantity,
    formatCurrency(item.rate),
    formatCurrency(item.total)
  ]);

  autoTable(doc, {
    startY: 125,
    head: [['#', 'Item Specification', 'Weight', 'Qty', 'Rate/g', 'Total']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [18, 18, 18],
      textColor: [201, 168, 76],
      fontSize: 10,
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 80 },
      4: { halign: 'right' },
      5: { halign: 'right', fontStyle: 'bold' }
    },
    styles: { fontSize: 9 }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // Left Side: Terms & Notes
  doc.setFontSize(10);
  doc.setTextColor(18, 18, 18);
  doc.setFont('helvetica', 'bold');
  doc.text('Purchase Notes:', 20, finalY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(po.notes || 'No special instructions for this order.', 20, finalY + 8, { maxWidth: 80 });

  // Payment Method
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Mode:', 20, finalY + 30);
  doc.setFont('helvetica', 'normal');
  doc.text(po.paymentMethod, 50, finalY + 30);

  // Right Side: Totals Summary
  const summaryX = 130;
  doc.setFontSize(10);
  doc.setTextColor(18, 18, 18);
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', summaryX, finalY);
  rightAlign(formatCurrency(po.subtotal), finalY);

  let currentY = finalY + 8;
  doc.text('GST (3%):', summaryX, currentY);
  rightAlign(formatCurrency(po.taxTotal), currentY);
  currentY += 10;

  // Grand Total Box
  doc.setFillColor(18, 18, 18);
  doc.rect(summaryX - 10, currentY - 5, pageWidth - (summaryX - 10) - 25, 15, 'F');
  doc.setTextColor(201, 168, 76);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Total Value:', summaryX - 5, currentY + 5);
  rightAlign(formatCurrency(po.grandTotal), currentY + 5);

  // --- Footer ---
  const footerY = 280;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('This is a computer generated document for Aurum Luxury Management.', pageWidth / 2, footerY, { align: 'center' });

  // Finalizing PDF
  const pdfBlob = doc.output('blob');
  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `PurchaseBill_${po.poNumber}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
