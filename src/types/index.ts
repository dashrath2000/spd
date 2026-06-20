export type MetalType = string;
export type PurityType = '24K' | '22K' | '21K' | '20K' | '18K' | '14K' | '9K' | '925' | '950' | 'Other';
export type Category = string;
export type UserRole = 'admin' | 'manager' | 'cashier';

export interface StoreBranch {
  id: string;
  name: string;
  address: string;
  phone: string;
  isPrimary: boolean;
}

export interface UserProfile {
  uid: string;
  tenantId: string;
  assignedBranchId?: string; // If undefined, user has access to all branches
  role: UserRole;
  name: string;
  email: string;
  plan?: string;
  planExpiry?: string;
  createdAt: string;
  phone?: string;
  lastLoginAt?: string;
}
export interface Product {
  id: string;
  branchId?: string; // Links stock to a specific physical branch
  name: string;
  sku: string;
  category: Category;
  metalType: MetalType;
  purity: PurityType;
  weight: number;         // grams
  makingCharges: number;  // amount per gram
  makingChargePercent: number; // % of metal value
  isPercentageMakingCharge: boolean;
  stoneCharges: number;
  wastagePercent: number;
  basePrice: number;
  sellingPrice: number;
  stock: number;
  lowStockThreshold: number;
  barcode: string;
  images: string[];
  description: string;
  hsnCode: string;
  huid?: string;
  isActive: boolean;
  isRateSensitive: boolean;
  stockType: 'Raw' | 'Fine' | 'Wholesale';
  createdAt: string;
  updatedAt: string;
  /** Marks a product copy that has been temporarily customized in the active cart. NOT persisted. */
  _cartOverridden?: boolean;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  gstin: string;
  panNumber: string;
  loyaltyPoints: number;
  totalPurchases: number;
  totalSpent: number;
  totalPaid: number;
  outstandingBalance: number;
  createdAt: string;
  notes: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  discountPercent: number;
  discountAmount: number;
  finalPrice: number;
}

export interface PaymentEntry {
  date: string;       // ISO timestamp
  amount: number;
  method: string;
  note?: string;
}

export interface OldGoldItem {
  id: string;
  description: string;
  metalType: string;
  purity: string;
  grossWeight: number;
  netWeight: number;
  melting: number; // percentage (touch)
  fineWeight: number;
  rate: number;
  value: number;
}

export interface Sale {
  id: string;
  branchId?: string; // Tracks which branch processed the sale
  invoiceNumber: string;
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  items: CartItem[];
  oldGoldItems?: OldGoldItem[];
  subtotal: number;
  discountTotal: number;
  oldGoldTotal?: number;
  cgst: number;
  sgst: number;
  igst: number;
  taxTotal: number;
  grandTotal: number;
  amountPaid: number;
  outstandingBalance?: number;
  change: number;
  paymentMethod: 'Cash' | 'Card' | 'UPI' | 'EMI' | 'Split';
  paymentDetails: {
    cash?: number;
    card?: number;
    upi?: number;
    upiRef?: string;
    cardLast4?: string;
    emiMonths?: number;
    emiBank?: string;
  };
  goldRate: number;
  silverRate: number;
  platinumRate: number;
  status: 'Completed' | 'Refunded' | 'Partial Refund' | 'Outstanding' | 'Partially Paid';
  notes: string;
  createdAt: string;
  createdBy: string;
  /** Chronological log of every payment made against this bill */
  paymentHistory?: PaymentEntry[];
}

export interface ShopSettings {
  shopName: string;
  ownerName: string;
  country: string;
  state: string;
  district: string;
  address: string;
  phone: string;
  email: string;
  gstin: string;
  logo: string;
  currency: string;
  goldApiKey?: string;
  branches?: StoreBranch[];
  metalRates: Record<string, number>;
  goldRate?: number;
  silverRate?: number;
  platinumRate?: number;
  cgstPercent: number;
  sgstPercent: number;
  igstPercent: number;
  enableLoyalty: boolean;
  loyaltyPointsPerRupee: number;
  loyaltyRedemptionRate: number;
  invoicePrefix: string;
  invoiceCounter: number;
  receiptFooter: string;
  termsAndConditions?: string;
  theme: 'dark' | 'light';
  girviDefaultPeriodMonths: number;
  categories: string[];
  billShowMakingCharges?: boolean;
  billShowStoneCharges?: boolean;
  billShowWeight?: boolean;
  billShowHSN?: boolean;
}

export interface DashboardStats {
  totalRevenue: number;
  totalTransactions: number;
  avgTransactionValue: number;
  totalItemsSold: number;
  newCustomers: number;
}

export interface DaybookEntry {
  id: string;
  branchId?: string;
  date: string;
  type: 'IN' | 'OUT';
  category: 'Expense' | 'Capital' | 'Withdrawal' | 'Other';
  amount: number;
  paymentMethod: 'Cash' | 'Card' | 'UPI' | 'Bank';
  description: string;
  createdBy: string;
}

export interface GirviPayment {
  id: string;
  amount: number;
  date: string;
  type: 'Interest' | 'Principal' | 'Top-up' | 'Settlement';
  note?: string;
  method?: 'Cash' | 'Bank' | 'UPI' | 'Card';
}

export interface GirviItem {
  id: string;
  description: string;
  weight: number;
  purity: PurityType;
  category?: string;
}

export interface Girvi {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  girviNumber: string;
  items: GirviItem[];
  totalWeight: number;
  loanAmount: number;
  interestRate: number; // Monthly percentage
  isCompoundInterest: boolean;
  enableLiveValuation: boolean;
  loanDate: string;
  status: 'Active' | 'Closed' | 'Defaulted';
  payoutMethod?: 'Cash' | 'Bank' | 'UPI' | 'Card';
  payments: GirviPayment[];
  images?: string[];
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  gstin: string;
  panNumber: string;
  outstandingBalance: number;
  totalPurchases: number;
  createdAt: string;
  notes: string;
}

export interface SalesOrder extends Omit<Sale, 'status' | 'invoiceNumber'> {
  orderNumber: string;
  advancePaid: number;
  balanceDue: number;
  dueDate: string;
  orderStatus: 'Pending' | 'Processing' | 'Ready' | 'Completed' | 'Cancelled';
}

export interface PurchaseOrderItem {
  productId?: string;
  description: string; // Used as name for retail, or description for wholesale
  sku?: string; // Retail only
  category?: string; // Retail only
  metalType: MetalType;
  purity: PurityType;
  weight: number;
  wastage?: number; // Wholesale only
  isWastageAmount?: boolean; // Wholesale only
  quantity: number;
  rate: number;
  makingCharge?: number;
  isMakingChargePercent?: boolean;
  total: number;
  stockType: 'Wholesale' | 'Raw' | 'Fine';
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseOrderItem[];
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  amountPaid: number;
  orderDate: string;
  expectedDate: string;
  status: 'Ordered' | 'Partial' | 'Received' | 'Cancelled';
  paymentMethod: string;
  notes: string;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
}

export interface MetalIssueRecord {
  metalType: string;
  purity: string;
  issuedWeight: number;
  issuedDate: string;
}

export interface MetalReturnRecord {
  finishedWeight: number;
  scrapWeight?: number;
  wastageGrams?: number;
  wastagePercent?: number;
  returnDate: string;
}

export interface QCRecord {
  result: 'pass' | 'rework' | 'reject';
  reason?: string;
  reassignedKarigarId?: string;
  debitAmount?: number;
  qcDate: string;
}

export interface ValuationRecord {
  metalRate: number;
  makingChargeType: 'flat' | 'perGram';
  makingChargeAmount: number;
  salePrice: number;
  metalPurchaseAmount?: number;
  valuationDate: string;
}

export interface JobOrderPaymentRecord {
  wageAmount: number;
  metalPurchaseAmount?: number;
  advanceDeduction: number;
  netPayable: number;
  paymentMode: 'Cash' | 'UPI' | 'Bank';
  transactionRef?: string;
  paymentDate: string;
}

export type JobOrderStatus = 'draft' | 'metalIssued' | 'wip' | 'returned' | 'qc' | 'valued' | 'completed';

export interface JobOrder {
  id: string;
  karigarId: string;
  karigarName: string;
  itemType: string;
  description: string;
  quantity: number;
  estimatedWeight: number;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  metalSource: 'shop' | 'karigar';
  status: JobOrderStatus;
  reworkCount: number;
  rejectFlag: boolean;
  reworkReason?: string;
  rejectReason?: string;
  debitAmount?: number;
  metalIssue?: MetalIssueRecord;
  metalReturn?: MetalReturnRecord;
  qc?: QCRecord;
  valuation?: ValuationRecord;
  payment?: JobOrderPaymentRecord;
  createdAt: string;
  updatedAt: string;
}

export interface Karigar {
  id: string;
  name: string;
  phone: string;
  address: string;
  specialization: string;
  metalBalances: Record<string, number>; // metalType -> fineWeight (g)
  cashBalance: number; // unpaid labor charges
  createdAt: string;
  skill?: string;
  contact?: string;
  aadhaarLast4?: string;
  wageType?: 'perPiece' | 'perGram' | 'daily';
  wageRate?: number;
  isActive?: boolean;
  advanceBalance?: number;
}

export interface KarigarTransaction {
  id: string;
  karigarId: string;
  type: 'ISSUE' | 'RECEIVE' | 'LABOR_PAYMENT' | 'WASTAGE_ADJUST';
  status?: 'Pending' | 'Completed';
  date: string;
  metalType?: MetalType;
  purity?: PurityType;
  grossWeight?: number;
  fineWeight?: number;
  wastagePercent?: number;
  makingCharges?: number;
  amount?: number; // For cash payments
  description: string;
  sourceProductId?: string; // Product issued from stock
  targetProductId?: string; // Product created or updated in stock
  inventoryType?: 'Raw' | 'Fine';
  addToInventory?: boolean;
  linkedTransactionId?: string; // Links RECEIVE to ISSUE
  createdBy: string;
}

export interface RefinedItem {
  originalItemId: string;   // links to OldGoldItem.id
  receivedWeight: number;   // weight after melting (grams)
  wastageWeight: number;    // weight lost during melting
  finalPurity: string;      // purity after refining
  fineWeight: number;       // pure metal weight
}

export interface OldGoldPurchase {
  id: string;
  purchaseNumber: string;
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  kycType: string;
  kycNumber: string;
  items: OldGoldItem[];
  subtotal: number;
  payoutAmount: number;
  paymentMethod: 'Cash' | 'Bank' | 'UPI';
  goldRate: number;
  silverRate: number;
  platinumRate: number;
  declarationSigned: boolean;
  notes?: string;
  branchId?: string;
  createdAt: string;
  createdBy: string;
  status?: 'Purchased' | 'Sent to Refinery' | 'Refined' | 'Added to Stock';
  refineryDetails?: {
    sentDate: string;
    refineryName?: string;
    receivedDate?: string;
    refinedItems?: RefinedItem[];
    notes?: string;
  };
}

export interface OwnerLoanPayment {
  id: string;
  amount: number;
  date: string;
  type: 'Interest' | 'Principal' | 'Top-up';
  note?: string;
  method?: 'Cash' | 'Bank' | 'UPI' | 'Card';
}

export interface OwnerLoanItem {
  id: string;
  description: string;
  weight: number;
  purity: PurityType;
  category?: string;
  sourceType: 'manual' | 'inventory' | 'customer_girvi';
  productId?: string;
  productSku?: string;
  customerGirviId?: string;
  customerGirviNumber?: string;
  customerName?: string;
  customerGirviItemId?: string;
}

export interface OwnerLoan {
  id: string;
  branchId?: string;
  lenderName: string;
  lenderPhone: string;
  loanNumber: string;
  items: OwnerLoanItem[];
  totalWeight: number;
  loanAmount: number;
  interestRate: number;
  isCompoundInterest: boolean;
  loanDate: string;
  status: 'Active' | 'Closed';
  payoutMethod?: 'Cash' | 'Bank' | 'UPI' | 'Card';
  payments: OwnerLoanPayment[];
  images?: string[];
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}
