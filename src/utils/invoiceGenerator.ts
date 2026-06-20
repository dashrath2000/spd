/* eslint-disable @typescript-eslint/no-explicit-any */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, calculateProductPrice } from './calculations';
import type { Sale, ShopSettings, Customer, OldGoldPurchase } from '../types';

/** Reliable cross-browser PDF download using blob URL */
const savePDF = (doc: jsPDF, filename: string) => {
  const electronAPI = (window as any).electronAPI;
  if (electronAPI?.app?.savePDF) {
    const base64 = doc.output('datauristring').split(',')[1];
    electronAPI.app.savePDF(base64, filename);
    return;
  }
  try {
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (e) {
    console.error('PDF download failed, falling back to doc.save:', e);
    doc.save(filename);
  }
};

export const generateInvoice = (sale: Sale, settings: ShopSettings, customer: Customer | null) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Helper for right alignment
  const rightAlign = (text: string, y: number) => {
    const textWidth = doc.getTextWidth(text);
    doc.text(text, pageWidth - 20 - textWidth, y);
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
  rightAlign('TAX INVOICE / BILL OF SUPPLY', 30); // Lowered from 25 to avoid overlap

  // --- Shop Details ---
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(9);
  doc.text(settings.address, 20, 50, { maxWidth: 80 });
  doc.text(`GSTIN: ${settings.gstin}`, 20, 65);
  doc.text(`Phone: ${settings.phone}`, 20, 70);

  // --- Invoice Details ---
  doc.setFont('helvetica', 'bold');
  rightAlign(`Invoice #: ${sale.invoiceNumber}`, 50);
  doc.setFont('helvetica', 'normal');
  rightAlign(`Date: ${new Date(sale.createdAt).toLocaleDateString('en-IN')}`, 55);
  rightAlign(`Place of Supply: ${settings.address.split(',').pop()?.trim() || 'Local'}`, 60);

  // --- Customer Details ---
  doc.setFillColor(245, 245, 245);
  doc.rect(20, 85, pageWidth - 40, 30, 'F');
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO:', 25, 92);
  doc.setFontSize(11);
  doc.text(customer?.name || 'Walk-in Customer', 25, 100);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Phone: ${customer?.phone || 'N/A'}`, 25, 105);
  if (customer?.gstin) doc.text(`GSTIN: ${customer.gstin}`, 25, 110);

  const totalTaxRate = settings.cgstPercent + settings.sgstPercent;

  const formatDecimals = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // --- Items Table ---
  const headers = ['#', 'Item Description'];
  if (settings.billShowWeight !== false) headers.push('Weight');
  if (settings.billShowMakingCharges) headers.push('Making');
  if (settings.billShowStoneCharges) headers.push('Stone');
  headers.push('Qty', 'Unit Price', 'Disc. Amt', 'Total');

  const tableData = sale.items.map((item, index) => {
    const unitPriceExclusive = item.product.sellingPrice / (1 + totalTaxRate / 100);
    const lineTotalExclusive = item.finalPrice / (1 + totalTaxRate / 100);
    const discAmountExclusive = (unitPriceExclusive * item.quantity) - lineTotalExclusive;
    const priceDetails = calculateProductPrice(item.product, settings);

    const isHsnVisible = settings.billShowHSN !== false;
    const descText = `${item.product.name}\nSKU: ${item.product.sku}${isHsnVisible ? ` | HSN: ${item.product.hsnCode || '7113'}` : ''}${item.product.huid ? ` | HUID: ${item.product.huid}` : ''}`;

    const row: any[] = [
      index + 1,
      descText
    ];

    if (settings.billShowWeight !== false) {
      row.push(Number(item.product.weight).toFixed(3) + 'g');
    }
    if (settings.billShowMakingCharges) {
      row.push(formatCurrency(priceDetails.makingCharges));
    }
    if (settings.billShowStoneCharges) {
      row.push(formatCurrency(item.product.stoneCharges || 0));
    }

    row.push(
      item.quantity,
      formatCurrency(unitPriceExclusive),
      discAmountExclusive > 0 ? `Rs. ${formatDecimals(discAmountExclusive)}` : '0.00',
      formatCurrency(lineTotalExclusive)
    );

    return row;
  });

  const columnStyles: Record<number, any> = {
    0: { cellWidth: 10 },
    1: { cellWidth: 70 }
  };

  headers.forEach((h, idx) => {
    if (h === 'Making' || h === 'Stone' || h === 'Unit Price' || h === 'Disc. Amt') {
      columnStyles[idx] = { halign: 'right' };
    } else if (h === 'Total') {
      columnStyles[idx] = { halign: 'right', fontStyle: 'bold' };
    } else if (h === 'Weight') {
      columnStyles[idx] = { halign: 'right' };
    } else if (h === 'Qty') {
      columnStyles[idx] = { halign: 'center' };
    }
  });

  autoTable(doc, {
    startY: 125,
    head: [headers],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [18, 18, 18],
      textColor: [201, 168, 76],
      fontSize: 10,
      fontStyle: 'bold'
    },
    columnStyles,
    styles: { fontSize: 9 }
  });

  // --- Old Gold Items Table (If any) ---
  let finalY = (doc as any).lastAutoTable.finalY + 10;
  if (sale.oldGoldItems && sale.oldGoldItems.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('OLD GOLD BUYBACK (CREDIT):', 20, finalY);

    const oldGoldData = sale.oldGoldItems.map((item, index) => [
      index + 1,
      `${item.description} (${item.metalType} ${item.purity})`,
      Number(item.grossWeight).toFixed(3) + 'g',
      item.melting + '%',
      Number(item.fineWeight).toFixed(3) + 'g',
      formatCurrency(item.rate),
      formatCurrency(item.value)
    ]);

    autoTable(doc, {
      startY: finalY + 5,
      head: [['#', 'Description', 'Weight', 'Touch', 'Fine', 'Rate', 'Credit']],
      body: oldGoldData,
      theme: 'grid',
      headStyles: {
        fillColor: [60, 60, 60],
        textColor: [255, 255, 255],
        fontSize: 8
      },
      styles: { fontSize: 8 },
      columnStyles: {
        6: { halign: 'right', fontStyle: 'bold' }
      }
    });
    finalY = (doc as any).lastAutoTable.finalY + 10;
  }

  // Left Side: Terms & Payment Info
  doc.setFontSize(10);
  doc.setTextColor(18, 18, 18);
  doc.setFont('helvetica', 'bold');
  doc.text('Terms & Conditions:', 20, finalY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);

  let termsOffset = 10;
  if (settings.termsAndConditions) {
    const terms = settings.termsAndConditions.split('\n').filter((t: string) => t.trim() !== '');
    terms.forEach((term: string, idx: number) => {
      doc.text(term, 20, finalY + 11 + (idx * 5));
    });
    termsOffset = 11 + (terms.length * 5);
  } else {
    doc.text('1. Weight variations up to 0.01g are standard.', 20, finalY + 11);
    doc.text('2. Subject to jurisdiction of local courts.', 20, finalY + 16);
    termsOffset = 21;
  }

  // Payment Info below Terms
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Method:', 20, finalY + termsOffset + 10);
  doc.setFont('helvetica', 'normal');
  doc.text(sale.paymentMethod, 60, finalY + termsOffset + 10);

  let currentPaymentY = finalY + termsOffset + 10;

  // Split payment breakdown
  if (sale.paymentMethod === 'Split' && sale.paymentDetails) {
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    const details = sale.paymentDetails;
    if (details.cash) {
      currentPaymentY += 5;
      doc.text(`- Cash: ${formatCurrency(details.cash)}`, 65, currentPaymentY);
    }
    if (details.card) {
      currentPaymentY += 5;
      doc.text(`- Card: ${formatCurrency(details.card)}`, 65, currentPaymentY);
    }
    if (details.upi) {
      currentPaymentY += 5;
      doc.text(`- UPI: ${formatCurrency(details.upi)}`, 65, currentPaymentY);
    }
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
  }

  doc.setFont('helvetica', 'bold');
  doc.text('Amount Received:', 20, currentPaymentY + 7);
  doc.setFont('helvetica', 'normal');
  doc.text(formatCurrency(sale.amountPaid), 60, currentPaymentY + 7);

  const balance = sale.grandTotal - sale.amountPaid;
  if (balance > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 0, 0);
    doc.text('Balance Due:', 20, currentPaymentY + 13);
    doc.setFont('helvetica', 'normal');
    doc.text(formatCurrency(balance), 60, currentPaymentY + 13);
    doc.setTextColor(60, 60, 60);
  }

  // Right Side: Totals Summary
  const summaryX = 130;
  doc.setFontSize(10);
  doc.setTextColor(18, 18, 18);
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', summaryX, finalY);
  rightAlign(formatCurrency(sale.subtotal), finalY);

  let currentY = finalY + 8;
  if (sale.discountTotal > 0) {
    doc.setTextColor(180, 0, 0);
    doc.text('Discount:', summaryX, currentY);
    rightAlign(`-Rs. ${formatDecimals(sale.discountTotal)}`, currentY);
    doc.setTextColor(18, 18, 18);
    currentY += 8;
  }

  doc.setFontSize(9);
  doc.text(`CGST (${settings.cgstPercent}%):`, summaryX, currentY);
  rightAlign(formatCurrency(sale.cgst), currentY);
  currentY += 8;

  doc.text(`SGST (${settings.sgstPercent}%):`, summaryX, currentY);
  rightAlign(formatCurrency(sale.sgst), currentY);
  currentY += 8;

  if (sale.oldGoldTotal && sale.oldGoldTotal > 0) {
    doc.setTextColor(180, 0, 0);
    doc.text('Old Gold Credited:', summaryX, currentY);
    rightAlign(`-${formatCurrency(sale.oldGoldTotal)}`, currentY);
    doc.setTextColor(18, 18, 18);
    currentY += 8;
  }
  currentY += 2;

  // Grand Total Box
  doc.setFillColor(18, 18, 18);
  doc.rect(summaryX - 10, currentY - 5, pageWidth - (summaryX - 10) - 20, 15, 'F');
  doc.setTextColor(201, 168, 76);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Grand Total:', summaryX - 5, currentY + 5);
  rightAlign(formatCurrency(sale.grandTotal), currentY + 5);

  const grandTotalBottomY = currentY + 10;

  if (balance > 0) {
    currentY += 20;
    doc.setTextColor(180, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Remaining Balance:', summaryX, currentY);
    rightAlign(formatCurrency(balance), currentY);
  }

  // --- Signature Area ---
  const sigY = Math.max(finalY + 60, currentPaymentY + 25, (balance > 0 ? currentY : grandTotalBottomY) + 20);
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(9);
  doc.text('Customer Signature', 20, sigY);
  doc.text('Authorized Signatory', pageWidth - 60, sigY);
  doc.setDrawColor(200, 200, 200);
  doc.line(20, sigY - 5, 60, sigY - 5);
  doc.line(pageWidth - 60, sigY - 5, pageWidth - 20, sigY - 5);

  // --- Footer ---
  const footerY = 280;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(settings.receiptFooter || 'Thank you for choosing Aurum Luxury.', pageWidth / 2, footerY, { align: 'center' });

  // Finalizing PDF
  savePDF(doc, `Invoice_${sale.invoiceNumber}.pdf`);
};

export const generateOrderReceipt = (order: any, settings: ShopSettings, customer: Customer | null) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  const rightAlign = (text: string, y: number) => {
    const textWidth = doc.getTextWidth(text);
    doc.text(text, pageWidth - 20 - textWidth, y);
  };

  // --- Header ---
  doc.setFillColor(18, 18, 18);
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setTextColor(201, 168, 76);
  doc.setFont('times', 'bold');
  doc.setFontSize(26);
  doc.text(settings.shopName.toUpperCase(), 20, 25);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  rightAlign('SALES ORDER / ESTIMATE', 30);

  // --- Details ---
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(9);
  doc.text(settings.address, 20, 50, { maxWidth: 80 });
  doc.text(`Phone: ${settings.phone}`, 20, 65);

  doc.setFont('helvetica', 'bold');
  rightAlign(`Order #: ${order.orderNumber}`, 50);
  doc.setFont('helvetica', 'normal');
  rightAlign(`Date: ${new Date(order.createdAt).toLocaleDateString('en-IN')}`, 55);
  rightAlign(`Due Date: ${new Date(order.dueDate).toLocaleDateString('en-IN')}`, 60);

  // --- Bill To ---
  doc.setFillColor(245, 245, 245);
  doc.rect(20, 80, pageWidth - 40, 25, 'F');
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('CUSTOMER DETAILS:', 25, 87);
  doc.setFontSize(11);
  doc.text(customer?.name || order.customerName, 25, 94);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Phone: ${customer?.phone || order.customerPhone}`, 25, 99);

  // --- Items Table ---
  const headers = ['#', 'Item Description'];
  if (settings.billShowWeight !== false) headers.push('Weight');
  if (settings.billShowMakingCharges) headers.push('Making');
  if (settings.billShowStoneCharges) headers.push('Stone');
  headers.push('Qty', 'Rate', 'Total');

  const tableData = order.items.map((item: any, index: number) => {
    const priceDetails = calculateProductPrice(item.product, settings);
    
    const row = [
      index + 1,
      `${item.product.name}\n${item.product.category} | ${item.product.purity}${item.product.huid ? ` | HUID: ${item.product.huid}` : ''}`
    ];
    if (settings.billShowWeight !== false) {
      row.push(Number(item.product.weight).toFixed(3) + 'g');
    }
    if (settings.billShowMakingCharges) {
      row.push(formatCurrency(priceDetails.makingCharges));
    }
    if (settings.billShowStoneCharges) {
      row.push(formatCurrency(item.product.stoneCharges || 0));
    }
    row.push(
      item.quantity,
      formatCurrency(item.product.sellingPrice),
      formatCurrency(item.finalPrice)
    );
    return row;
  });

  const columnStyles: Record<number, any> = {
    0: { cellWidth: 10 },
    1: { cellWidth: 70 }
  };

  headers.forEach((h, idx) => {
    if (h === 'Making' || h === 'Stone' || h === 'Rate') {
      columnStyles[idx] = { halign: 'right' };
    } else if (h === 'Total') {
      columnStyles[idx] = { halign: 'right', fontStyle: 'bold' };
    } else if (h === 'Weight') {
      columnStyles[idx] = { halign: 'right' };
    } else if (h === 'Qty') {
      columnStyles[idx] = { halign: 'center' };
    }
  });

  autoTable(doc, {
    startY: 115,
    head: [headers],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [18, 18, 18], textColor: [201, 168, 76] },
    columnStyles,
  });

  const finalY = (doc as any).lastAutoTable.finalY + 15;

  // --- Totals ---
  const summaryX = 130;
  doc.setFontSize(10);
  doc.text('Order Subtotal:', summaryX, finalY);
  rightAlign(formatCurrency(order.grandTotal), finalY);

  doc.setFillColor(18, 18, 18);
  doc.rect(summaryX - 5, finalY + 5, pageWidth - summaryX - 10, 12, 'F');
  doc.setTextColor(201, 168, 76);
  doc.setFont('helvetica', 'bold');
  doc.text('ADVANCE PAID:', summaryX, finalY + 13);
  rightAlign(formatCurrency(order.advancePaid), finalY + 13);

  doc.setTextColor(180, 0, 0);
  doc.setFontSize(11);
  doc.text('BALANCE DUE:', summaryX, finalY + 25);
  rightAlign(formatCurrency(order.balanceDue), finalY + 25);

  // --- Signature Area ---
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(9);
  doc.text('Customer Signature', 20, finalY + 50);
  doc.text('Authorized Signatory', pageWidth - 60, finalY + 50);

  // --- Footer ---
  doc.setFontSize(8);
  doc.text('This is a booking estimate and not a tax invoice.', pageWidth / 2, 280, { align: 'center' });

  // Download
  savePDF(doc, `Order_${order.orderNumber}.pdf`);
};

export const generateBuybackVoucher = (purchase: OldGoldPurchase, settings: ShopSettings) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  const rightAlign = (text: string, y: number) => {
    const textWidth = doc.getTextWidth(text);
    doc.text(text, pageWidth - 20 - textWidth, y);
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
  rightAlign('OLD GOLD PURCHASE VOUCHER', 30);

  // --- Voucher Info ---
  doc.setTextColor(18, 18, 18);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Voucher No: ${purchase.purchaseNumber}`, 20, 50);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${new Date(purchase.createdAt).toLocaleString()}`, 20, 55);

  // --- Customer / Seller Info ---
  doc.setFont('helvetica', 'bold');
  doc.text('SELLER / CUSTOMER PORTFOLIO', 20, 65);
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${purchase.customerName}`, 20, 70);
  doc.text(`Phone: ${purchase.customerPhone}`, 20, 75);
  doc.text(`KYC Document: ${purchase.kycType} - ${purchase.kycNumber}`, 20, 80);

  // --- Store Details ---
  doc.setFont('helvetica', 'bold');
  rightAlign(settings.shopName, 50);
  doc.setFont('helvetica', 'normal');
  rightAlign(settings.address || '', 55);
  rightAlign(`Phone: ${settings.phone || ''}`, 60);
  if (settings.gstin) {
    rightAlign(`GSTIN: ${settings.gstin}`, 65);
  }

  // --- Asset Details Table ---
  const tableData = purchase.items.map((item, idx) => [
    idx + 1,
    item.description,
    `${item.grossWeight} g`,
    `${item.melting} %`,
    `${Number(item.fineWeight).toFixed(3)} g`,
    formatCurrency(item.rate),
    formatCurrency(item.value)
  ]);

  autoTable(doc, {
    startY: 90,
    head: [['S.No', 'Description', 'Gross Weight', 'Touch / Melting', 'Fine Weight', 'Rate / g', 'Net Value']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [18, 18, 18], textColor: [201, 168, 76], fontSize: 9, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, textColor: [30, 30, 30] },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 60 },
      2: { cellWidth: 25 },
      3: { cellWidth: 25 },
      4: { cellWidth: 25 },
      5: { cellWidth: 20 },
      6: { cellWidth: 20 }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 15;

  // --- Payout Summary ---
  const summaryX = 130;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Valuation Subtotal:', summaryX, finalY);
  rightAlign(formatCurrency(purchase.subtotal), finalY);

  doc.setFillColor(18, 18, 18);
  doc.rect(summaryX - 5, finalY + 5, pageWidth - summaryX - 10, 12, 'F');
  doc.setTextColor(201, 168, 76);
  doc.setFont('helvetica', 'bold');
  doc.text('NET PAYOUT:', summaryX, finalY + 13);
  rightAlign(formatCurrency(purchase.payoutAmount), finalY + 13);

  doc.setTextColor(18, 18, 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Payment Method: ${purchase.paymentMethod}`, 20, finalY + 10);

  // --- Seller Declaration ---
  const decY = finalY + 30;
  doc.setFont('helvetica', 'bold');
  doc.text('SELLER DECLARATION & TERMS:', 20, decY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  const declarationText =
    "1. I hereby declare that I am the sole and lawful owner of the precious metals/ornaments described above and have absolute right to sell them.\n" +
    "2. I confirm that the weights and melting touch assessments have been done in my presence and are correct.\n" +
    "3. The payout received is in full and final settlement of this trade-in/buyback transaction.";
  doc.text(declarationText, 20, decY + 5);

  // --- Signature Area ---
  const sigY = decY + 35;
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(9);
  doc.text('Customer Signature', 20, sigY);
  doc.text('Authorized Signatory', pageWidth - 60, sigY);
  doc.setDrawColor(200, 200, 200);
  doc.line(20, sigY - 5, 60, sigY - 5);
  doc.line(pageWidth - 60, sigY - 5, pageWidth - 20, sigY - 5);

  // Download
  savePDF(doc, `Buyback_${purchase.purchaseNumber}.pdf`);
};
