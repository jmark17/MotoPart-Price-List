import { MotorPart } from './motorPart';

export interface WholesaleEstimateItem {
  partId: string;
  partNumber: string;
  itemName: string;
  brand: string;
  srpPrice: number;
  shopPrice: number;
  quantity: number;
  customWholesalePrice?: number; // Override if user sets specific unit price
  note?: string;
}

export interface CompletedPurchaseItem {
  partId: string;
  partNumber: string;
  itemName: string;
  brand: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  srpPrice?: number;
  shopPriceMargin?: number;
}

export interface CompletedPurchase {
  id: string; // e.g. "PUR-20261014-4192"
  timestamp: string; // ISO String
  dateFormatted: string; // "Oct 14, 2026"
  timeFormatted: string; // "12:21 AM"
  buyerName: string;
  items: CompletedPurchaseItem[];
  totalUnits: number;
  grandTotal: number;
  totalSrp?: number;
  shopPriceMargin?: number;
}

export interface WholesaleExtraFee {
  id: string;
  name: string;
  amount: number;
}

export type WholesalePricingMode = 
  | 'discount-srp'    // Percentage discount off SRP
  | 'markup-shop'      // Percentage markup over Shop Price
  | 'custom-rates';    // Custom or per-item pricing

export interface WholesaleEstimate {
  id: string;
  estimateNumber: string;
  createdAt: string;
  clientName: string;
  clientContact?: string;
  clientNotes?: string;
  pricingMode: WholesalePricingMode;
  discountOrMarkupPercent: number; // e.g. 10 for 10%
  items: WholesaleEstimateItem[];
  extraFees: WholesaleExtraFee[];
}
