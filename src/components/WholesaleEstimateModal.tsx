import React, { useState, useMemo } from 'react';
import {
  X,
  Plus,
  Trash2,
  Printer,
  Copy,
  Check,
  Calculator,
  Search,
  Package,
  RotateCcw,
  User as UserIcon,
} from 'lucide-react';
import { MotorPart } from '../types/motorPart';
import { WholesaleEstimateItem } from '../types/wholesale';
import { formatPHP } from '../utils/formatCurrency';

interface WholesaleEstimateModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalogParts: MotorPart[];
  estimateItems: WholesaleEstimateItem[];
  onUpdateItems: (items: WholesaleEstimateItem[]) => void;
  onClearItems: () => void;
  onAddItem: (part: MotorPart, qty?: number) => void;
}

export const WholesaleEstimateModal: React.FC<WholesaleEstimateModalProps> = ({
  isOpen,
  onClose,
  catalogParts,
  estimateItems,
  onUpdateItems,
  onClearItems,
  onAddItem,
}) => {
  const [buyerName, setBuyerName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [copied, setCopied] = useState(false);

  // Filter catalog for quick adder
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return catalogParts
      .filter(
        (p) =>
          p.itemName.toLowerCase().includes(query) ||
          p.partNumber.toLowerCase().includes(query) ||
          p.brand.toLowerCase().includes(query)
      )
      .slice(0, 6);
  }, [catalogParts, searchQuery]);

  // Calculations
  const calculations = useMemo(() => {
    let totalUnits = 0;
    let grandTotal = 0;

    const lineItems = estimateItems.map((item) => {
      const unitPrice =
        item.customWholesalePrice !== undefined && item.customWholesalePrice > 0
          ? item.customWholesalePrice
          : item.shopPrice;
      const subtotal = unitPrice * item.quantity;

      totalUnits += item.quantity;
      grandTotal += subtotal;

      return {
        ...item,
        unitPrice,
        subtotal,
      };
    });

    return {
      lineItems,
      totalUnits,
      grandTotal,
    };
  }, [estimateItems]);

  const handleQtyChange = (partId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(partId);
      return;
    }
    const updated = estimateItems.map((item) =>
      item.partId === partId ? { ...item, quantity: newQty } : item
    );
    onUpdateItems(updated);
  };

  const handlePriceChange = (partId: string, newPriceStr: string) => {
    const val = parseFloat(newPriceStr);
    const updated = estimateItems.map((item) => {
      if (item.partId === partId) {
        return {
          ...item,
          customWholesalePrice: isNaN(val) ? undefined : Math.max(0, val),
        };
      }
      return item;
    });
    onUpdateItems(updated);
  };

  const handleRemoveItem = (partId: string) => {
    onUpdateItems(estimateItems.filter((i) => i.partId !== partId));
  };

  const handleCopyList = () => {
    const lines: string[] = [];
    lines.push(`🛵 *BUYER PURCHASE ESTIMATE*`);
    lines.push(`Date: ${new Date().toLocaleDateString('en-PH', { dateStyle: 'medium' })}`);
    if (buyerName.trim()) {
      lines.push(`Buyer: ${buyerName.trim()}`);
    }
    lines.push(`----------------------------------------`);
    lines.push(`*PURCHASED ITEMS:*`);

    calculations.lineItems.forEach((item, idx) => {
      lines.push(
        `${idx + 1}. [${item.brand}] ${item.itemName} (${item.partNumber})\n` +
        `   Qty: ${item.quantity} pcs @ ${formatPHP(item.unitPrice)} = ${formatPHP(item.subtotal)}`
      );
    });

    lines.push(`----------------------------------------`);
    lines.push(`*TOTAL QUANTITY: ${calculations.totalUnits} pcs*`);
    lines.push(`*TOTAL PURCHASE: ${formatPHP(calculations.grandTotal)}*`);

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4">
      {/* Unified Single Slip Modal - 100% full screen on mobile, centered card on desktop */}
      <div className="bg-slate-900 border-0 sm:border border-slate-700/80 rounded-none sm:rounded-2xl w-full max-w-2xl h-full sm:h-auto sm:max-h-[92vh] shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* 1. Header (Mobile-optimized with responsive layout) */}
        <div className="px-3.5 sm:px-4 py-2.5 sm:py-3 bg-slate-950 border-b border-slate-800 shrink-0 space-y-2">
          {/* Top Line: Title + Date + Close */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold shrink-0">
                <Calculator className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h2 className="text-xs sm:text-sm font-extrabold text-white truncate">
                    Purchase Estimator
                  </h2>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    PHP ₱
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  {new Date().toLocaleDateString('en-PH', { dateStyle: 'medium' })}
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition shrink-0 ml-2"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Bottom Line: Buyer Name Input (Full width, fits any phone) */}
          <div className="relative w-full">
            <UserIcon className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Buyer / Customer Name (optional)"
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 focus:border-amber-500 text-white text-xs pl-8 pr-3 py-1.5 rounded-lg outline-none placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* 2. Quick Item Search Bar */}
        <div className="px-3.5 sm:px-4 py-2 bg-slate-900 shrink-0">
          <div className="relative w-full">
            <div className="flex items-center bg-slate-950 border border-slate-700/80 focus-within:border-amber-500 rounded-xl px-2.5 py-1.5 transition">
              <Search className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
              <input
                type="text"
                placeholder="Search part to add (name, #, brand)..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearching(true);
                }}
                onFocus={() => setIsSearching(true)}
                className="w-full bg-transparent text-xs text-white placeholder-slate-500 outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setIsSearching(false);
                  }}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Autocomplete Dropdown */}
            {isSearching && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-slate-950 border border-slate-700 rounded-xl shadow-2xl z-30 max-h-52 overflow-y-auto divide-y divide-slate-800">
                {searchResults.map((part) => {
                  return (
                    <div
                      key={part.id}
                      className="p-2 hover:bg-slate-800 transition flex items-center justify-between cursor-pointer"
                      onClick={() => {
                        onAddItem(part, 1);
                        setSearchQuery('');
                        setIsSearching(false);
                      }}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-bold text-white truncate">
                          {part.itemName}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                          <span className="font-mono text-amber-400">{part.partNumber}</span>
                          <span>•</span>
                          <span className="uppercase">{part.brand}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-extrabold text-emerald-400">
                          {formatPHP(part.shopPrice)}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-bold flex items-center gap-0.5">
                          <Plus className="w-3 h-3" /> Add
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 3. The Unified Purchase Slip & Total (Single Seamless Box) */}
        <div className="flex-1 overflow-y-auto px-3.5 sm:px-4 py-1.5">
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950 flex flex-col w-full">
            
            {/* Desktop Table Header (>= sm) */}
            <div className="hidden sm:grid grid-cols-12 bg-slate-900/90 text-[10px] text-slate-400 uppercase tracking-wider font-bold border-b border-slate-800 px-3 py-2">
              <div className="col-span-6">Item Description</div>
              <div className="col-span-2 text-right">Price</div>
              <div className="col-span-2 text-center">Qty</div>
              <div className="col-span-2 text-right">Subtotal</div>
            </div>

            {/* Empty State */}
            {calculations.lineItems.length === 0 ? (
              <div className="text-center py-12 px-4 text-slate-500 text-xs">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-40 text-amber-500" />
                <p className="font-medium text-slate-300">No items added yet</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Search above or tap &quot;+ Wholesale&quot; on any catalog item to add it here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {calculations.lineItems.map((item) => (
                  <div key={item.partId} className="hover:bg-slate-900/50 transition">
                    
                    {/* MOBILE CARD VIEW (< sm) - Fits 100% on phones without any side-scroll */}
                    <div className="block sm:hidden p-2.5 space-y-1.5">
                      {/* Line 1: Part Name + Tags + Delete */}
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-white text-xs leading-snug">
                            {item.itemName}
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-amber-400 font-semibold">{item.partNumber}</span>
                            <span>•</span>
                            <span className="uppercase text-slate-300 font-bold">{item.brand}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleRemoveItem(item.partId)}
                          className="text-slate-500 hover:text-rose-400 p-1 transition shrink-0"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Line 2: Price × Qty Controls = Subtotal */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-900">
                        {/* Unit Price */}
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400">Price:</span>
                          <input
                            type="number"
                            step="any"
                            value={item.unitPrice}
                            onChange={(e) => handlePriceChange(item.partId, e.target.value)}
                            className="w-16 bg-slate-900 border border-slate-700/80 focus:border-amber-500 rounded px-1.5 py-0.5 text-right font-bold text-emerald-400 text-xs outline-none"
                          />
                        </div>

                        {/* Qty Stepper */}
                        <div className="inline-flex items-center rounded-lg bg-slate-900 border border-slate-700/80 p-0.5 shrink-0">
                          <button
                            onClick={() => handleQtyChange(item.partId, item.quantity - 1)}
                            className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white rounded font-bold text-sm"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              handleQtyChange(item.partId, parseInt(e.target.value) || 1)
                            }
                            className="w-7 bg-transparent text-center font-bold text-white text-xs outline-none"
                          />
                          <button
                            onClick={() => handleQtyChange(item.partId, item.quantity + 1)}
                            className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white rounded font-bold text-sm"
                          >
                            +
                          </button>
                        </div>

                        {/* Subtotal */}
                        <div className="text-right shrink-0">
                          <span className="text-[9px] text-slate-400 block">Total</span>
                          <span className="font-extrabold text-white text-xs">
                            {formatPHP(item.subtotal)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* DESKTOP ROW VIEW (>= sm) */}
                    <div className="hidden sm:grid grid-cols-12 items-center px-3 py-2.5 text-xs">
                      {/* Item & Brand */}
                      <div className="col-span-6 pr-2">
                        <div className="font-bold text-white text-xs leading-snug truncate">
                          {item.itemName}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <span className="font-mono text-amber-400">{item.partNumber}</span>
                          <span>•</span>
                          <span className="uppercase text-slate-300 font-semibold">{item.brand}</span>
                        </div>
                      </div>

                      {/* Unit Price */}
                      <div className="col-span-2 text-right">
                        <input
                          type="number"
                          step="any"
                          value={item.unitPrice}
                          onChange={(e) => handlePriceChange(item.partId, e.target.value)}
                          className="w-20 bg-slate-900 border border-slate-700/80 focus:border-amber-500 rounded px-1.5 py-0.5 text-right font-bold text-emerald-400 text-xs outline-none"
                          title="Click to edit unit price"
                        />
                      </div>

                      {/* Quantity Controls */}
                      <div className="col-span-2 flex items-center justify-center">
                        <div className="inline-flex items-center rounded-lg bg-slate-900 border border-slate-700/80 p-0.5">
                          <button
                            onClick={() => handleQtyChange(item.partId, item.quantity - 1)}
                            className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white rounded font-bold"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              handleQtyChange(item.partId, parseInt(e.target.value) || 1)
                            }
                            className="w-8 bg-transparent text-center font-bold text-white text-xs outline-none"
                          />
                          <button
                            onClick={() => handleQtyChange(item.partId, item.quantity + 1)}
                            className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white rounded font-bold"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Subtotal & Delete */}
                      <div className="col-span-2 flex items-center justify-end gap-2 pl-1">
                        <span className="font-extrabold text-white text-xs sm:text-sm">
                          {formatPHP(item.subtotal)}
                        </span>
                        <button
                          onClick={() => handleRemoveItem(item.partId)}
                          className="text-slate-500 hover:text-rose-400 p-0.5 transition"
                          title="Remove"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            )}

            {/* UNIFIED TOTAL PURCHASE FOOTER (Directly attached as one piece, 100% mobile fit) */}
            <div className="bg-slate-900 border-t-2 border-slate-800 px-3.5 py-2.5 sm:px-4 sm:py-3 flex items-center justify-between shrink-0">
              <div>
                <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                  Total Purchase
                </span>
                <span className="text-xs font-bold text-slate-300">
                  {calculations.totalUnits} {calculations.totalUnits === 1 ? 'item' : 'items'} ({estimateItems.length} unique)
                </span>
              </div>

              <div className="text-right">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-amber-500/90 block">
                  Grand Total (PHP)
                </span>
                <span className="text-lg sm:text-2xl font-black text-amber-400 tracking-tight">
                  {formatPHP(calculations.grandTotal)}
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* 4. Bottom Actions Toolbar (Always fits on mobile) */}
        <div className="px-3.5 sm:px-4 py-2.5 sm:py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            {estimateItems.length > 0 && (
              <button
                onClick={onClearItems}
                className="p-2 sm:px-2.5 sm:py-1.5 rounded-lg text-slate-400 hover:text-rose-400 bg-slate-900 sm:bg-transparent border border-slate-800 sm:border-0 text-xs font-semibold flex items-center gap-1 transition"
                title="Clear list"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Clear</span>
              </button>
            )}

            <button
              onClick={handleCopyList}
              disabled={estimateItems.length === 0}
              className="flex items-center space-x-1 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition disabled:opacity-40 active:scale-95"
              title="Copy list to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 text-[11px] sm:text-xs">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[11px] sm:text-xs">Copy</span>
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              disabled={estimateItems.length === 0}
              className="flex items-center space-x-1 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition disabled:opacity-40 active:scale-95"
              title="Print purchase slip"
            >
              <Printer className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] sm:text-xs">Print</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-4 sm:px-5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-extrabold shadow-md shadow-orange-500/20 transition active:scale-95 shrink-0"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
