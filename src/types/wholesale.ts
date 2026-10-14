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
