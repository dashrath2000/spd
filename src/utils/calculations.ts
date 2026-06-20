import type { Product, ShopSettings, Karigar, JobOrder } from '../types';

export const calculateProductPrice = (product: Product, settings: ShopSettings) => {
  const cgstPercent = settings.cgstPercent || 0;
  const sgstPercent = settings.sgstPercent || 0;
  const totalTaxPercent = cgstPercent + sgstPercent;

  const isRateSensitive = product.isRateSensitive;
  const sellingPrice = Number(product.sellingPrice) || 0;
  const weight = Number(product.weight) || 0;
  const wastagePercent = Number(product.wastagePercent) || 0;
  const makingChargePercent = Number(product.makingChargePercent) || 0;
  const makingChargesVal = Number(product.makingCharges) || 0;
  const stoneCharges = Number(product.stoneCharges) || 0;

  if (!isRateSensitive) {
    const finalPrice = sellingPrice;
    // Reverse calculate subtotal from tax-inclusive final price
    const subtotal = finalPrice / (1 + totalTaxPercent / 100);
    const cgst = subtotal * (cgstPercent / 100);
    const sgst = subtotal * (sgstPercent / 100);
    const totalGst = cgst + sgst;

    return {
      metalValue: 0,
      wastageValue: 0,
      totalMetalValue: 0,
      makingCharges: 0,
      subtotal,
      cgst,
      sgst,
      totalGst,
      finalPrice
    };
  }

  const baseRate = settings.metalRates?.[product.metalType] || 0;
  let purityModifier = 1;

  if (product.metalType.includes('Gold')) {
    switch (product.purity) {
      case '22K': purityModifier = 22 / 24; break;
      case '21K': purityModifier = 21 / 24; break;
      case '20K': purityModifier = 20 / 24; break;
      case '18K': purityModifier = 18 / 24; break;
      case '14K': purityModifier = 14 / 24; break;
      case '9K': purityModifier = 9 / 24; break;
      case '24K':
      default: purityModifier = 1; break;
    }
  } else if (product.metalType.includes('Silver')) {
    switch (product.purity) {
      case '925': purityModifier = 0.925; break;
      case '950': purityModifier = 0.95; break;
      default: purityModifier = 1; break;
    }
  }

  const metalRate = baseRate * purityModifier;

  const metalValue = weight * metalRate;
  const wastageValue = metalValue * (wastagePercent / 100);
  const totalMetalValue = metalValue + wastageValue;

  let makingCharges = 0;
  if (product.isPercentageMakingCharge) {
    makingCharges = metalValue * (makingChargePercent / 100);
  } else {
    makingCharges = makingChargesVal * weight;
  }

  const subtotal = totalMetalValue + makingCharges + stoneCharges;

  const cgst = subtotal * (cgstPercent / 100);
  const sgst = subtotal * (sgstPercent / 100);
  const totalGst = cgst + sgst;

  return {
    metalValue,
    wastageValue,
    totalMetalValue,
    makingCharges,
    subtotal,
    cgst,
    sgst,
    totalGst,
    finalPrice: Math.round(subtotal + totalGst)
  };
};

export const formatCurrency = (amount: number, symbol: string = '₹') => {
  const formattedAmount = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(amount);
  return `${symbol === '₹' ? 'Rs.' : symbol} ${formattedAmount}`;
};

export const generateInvoiceNumber = (prefix: string, counter: number) => {
  return `${prefix}${counter.toString().padStart(4, '0')}`;
};

export const calculateGirviInterest = (
  loanAmount: number,
  interestRate: number,
  loanDate: string,
  isCompound: boolean,
  interestPaid: number = 0
) => {
  const start = new Date(loanDate);
  const now = new Date();

  // Calculate months difference
  const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  const effectiveMonths = Math.max(0, months);

  if (isCompound) {
    const r = interestRate / 100;
    const totalAmount = loanAmount * Math.pow(1 + r, effectiveMonths);
    return Math.max(0, totalAmount - loanAmount - interestPaid);
  } else {
    const interest = loanAmount * (interestRate / 100) * effectiveMonths;
    return Math.max(0, interest - interestPaid);
  }
};

export const calculateDailyInterest = (
  loanAmount: number,
  interestRate: number, // Monthly rate
  loanDate: string,
  isCompound: boolean,
  interestPaid: number = 0
) => {
  const start = new Date(loanDate);
  const now = new Date();
  
  // Calculate exact day difference using UTC to avoid timezone issues
  const startMs = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const nowMs = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const diffTime = nowMs - startMs;
  const days = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
  
  if (isCompound) {
    // Compounding daily at daily rate: rDaily = (interestRate / 100) / 30
    const rDaily = (interestRate / 100) / 30;
    const totalAmount = loanAmount * Math.pow(1 + rDaily, days);
    return Math.max(0, totalAmount - loanAmount - interestPaid);
  } else {
    // Simple interest: interest = loanAmount * (interestRate / 100) * (days / 30)
    const interest = loanAmount * (interestRate / 100) * (days / 30);
    return Math.max(0, interest - interestPaid);
  }
};

export const calculateOldGoldValue = (weight: number, melting: number, rate: number) => {
  const fineWeight = (weight * melting) / 100;
  return Math.round(fineWeight * rate);
};

export const calculateFineWeight = (weight: number, purity: string, meltingPercent?: number) => {
  if (meltingPercent) {
    return (weight * meltingPercent) / 100;
  }

  switch (purity) {
    case '24K': return weight * 0.995; // Standard pure gold purity for accounting
    case '22K': return weight * 0.9167;
    case '21K': return weight * 0.875;
    case '20K': return weight * 0.8333;
    case '18K': return weight * 0.75;
    case '14K': return weight * 0.5833;
    case '9K': return weight * 0.375;
    case '925': return weight * 0.925; // Sterling silver
    case '999': return weight * 0.999; // Pure silver
    default: return weight;
  }
};

export const getAutomatedHSN = (category: string | undefined, metalType: string | undefined): string => {
  const cat = category || 'Other';
  const metal = metalType || 'Gold';
  if (cat === 'Raw Material') {
    switch (metal.toLowerCase()) {
      case 'gold': return '7108';
      case 'silver': return '7106';
      case 'platinum': return '7110';
      case 'diamond': return '7102';
      default: return '7108';
    }
  } else {
    switch (metal.toLowerCase()) {
      case 'silver': return '71131120';
      case 'platinum': return '71131950';
      case 'gold':
      case 'diamond':
      default: return '71131910';
    }
  }
};

export const generateAutoSKU = (
  category: string | undefined,
  metalType: string | undefined,
  purity: string | undefined,
  existingProducts: { sku: string }[]
): string => {
  const shopPrefix = 'AUR';

  // Category mapping
  const categoryMap: Record<string, string> = {
    'ring': 'RN',
    'necklace': 'NC',
    'bracelet': 'BR',
    'earring': 'ER',
    'pendant': 'PD',
    'bangles': 'BG',
    'chain': 'CH',
    'anklet': 'AK',
    'brooch': 'BC',
    'watch': 'WT',
    'raw material': 'RM',
    'other': 'OT'
  };
  const catCode = categoryMap[(category || 'other').toLowerCase()] || (category ? category.substring(0, 2).toUpperCase() : 'OT');

  // Metal type mapping
  let metalCode = 'O';
  const metal = (metalType || 'Gold').toLowerCase();
  if (metal.includes('gold')) metalCode = 'G';
  else if (metal.includes('silver')) metalCode = 'S';
  else if (metal.includes('platinum')) metalCode = 'P';
  else if (metal.includes('diamond')) metalCode = 'D';

  // Purity mapping
  const purityVal = purity || '22K';
  let purityCode = purityVal.replace(/[^0-9]/g, ''); // Extract digits e.g. 22K -> 22, 925 -> 92
  if (!purityCode) {
    purityCode = purityVal.substring(0, 2).toUpperCase();
  }

  const prefix = `${shopPrefix}-${catCode}-${metalCode}${purityCode}-`;

  // Find next counter
  let maxNum = 0;
  existingProducts.forEach(p => {
    if (p.sku && p.sku.startsWith(prefix)) {
      const parts = p.sku.split('-');
      const numPart = parts[parts.length - 1];
      const num = parseInt(numPart, 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  });

  const nextNum = maxNum + 1;
  const numString = nextNum.toString().padStart(3, '0');

  return `${prefix}${numString}`;
};

// Wastage
export function calcWastage(issued: number, finished: number, scrap: number) {
  const wastageGrams = issued - finished - scrap;
  const wastagePercent = (wastageGrams / issued) * 100;
  return { wastageGrams, wastagePercent, flag: wastagePercent > 2 };
}

// Wage
export function calcWage(karigar: Karigar, order: JobOrder, daysWorked?: number): number {
  if (karigar.wageType === 'perPiece') return (karigar.wageRate || 0) * order.quantity;
  if (karigar.wageType === 'perGram') return (karigar.wageRate || 0) * (order.estimatedWeight);
  if (karigar.wageType === 'daily') return (karigar.wageRate || 0) * (daysWorked ?? 1);
  return 0;
}

// Valuation
export function calcSalePrice(weight: number, rate: number, makingType: 'flat' | 'perGram', making: number): number {
  return weight * rate + (makingType === 'perGram' ? weight * making : making);
}


