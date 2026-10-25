import React, { useState, useEffect, useMemo } from 'react';
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
  Clock,
  History,
  FileDown,
  ChevronRight,
  Receipt,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Minimize2,
  AlertTriangle,
} from 'lucide-react';
import { MotorPart } from '../types/motorPart';
import { WholesaleEstimateItem, CompletedPurchase } from '../types/wholesale';
import { formatPHP } from '../utils/formatCurrency';
import {
  exportSinglePurchasePdf,
  exportAllPurchaseHistoryPdf,
  exportEstimateQuotationPdf,
} from '../utils/exportPdf';
import { printPurchaseReceipt, printAllPurchaseHistory } from '../utils/printHelper';

export const STORAGE_PURCHASE_HISTORY_KEY = 'motoparts_wholesale_purchase_history_v1';

interface WholesaleEstimateModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalogParts: MotorPart[];
  estimateItems: WholesaleEstimateItem[];
  onUpdateItems: (items: WholesaleEstimateItem[]) => void;
  onClearItems: () => void;
  onAddItem: (part: MotorPart, qty?: number) => void;
  onNotify?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const WholesaleEstimateModal: React.FC<WholesaleEstimateModalProps> = ({
  isOpen,
  onClose,
  catalogParts,
  estimateItems,
  onUpdateItems,
  onClearItems,
  onAddItem,
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<'estimator' | 'history'>('estimator');
  const [buyerName, setBuyerName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [copied, setCopied] = useState(false);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

  // In-UI confirmations to avoid blocked window.confirm in iframes
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isConfirmingClearAll, setIsConfirmingClearAll] = useState(false);

  // Live real-time clock
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Purchase History state from localStorage
  const [purchaseHistory, setPurchaseHistory] = useState<CompletedPurchase[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_PURCHASE_HISTORY_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load purchase history:', e);
    }
    return [];
  });

  // Save history to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PURCHASE_HISTORY_KEY, JSON.stringify(purchaseHistory));
    } catch (e) {
      console.warn('Failed to save purchase history:', e);
    }
  }, [purchaseHistory]);

  // Catalog search results for quick adder
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

  // Calculations for active estimate
  const calculations = useMemo(() => {
    let totalUnits = 0;
    let grandTotal = 0;
    let totalSrp = 0;

    const lineItems = estimateItems.map((item) => {
      const unitPrice =
        item.customWholesalePrice !== undefined && item.customWholesalePrice > 0
          ? item.customWholesalePrice
          : item.shopPrice;
      const subtotal = unitPrice * item.quantity;
      const srpSubtotal = item.srpPrice * item.quantity;
      const itemMargin = srpSubtotal - subtotal;
      const itemMarginPercent =
        subtotal > 0 ? ((itemMargin / subtotal) * 100).toFixed(0) : '0';

      totalUnits += item.quantity;
      grandTotal += subtotal;
      totalSrp += srpSubtotal;

      return {
        ...item,
        unitPrice,
        subtotal,
        srpSubtotal,
        itemMargin,
        itemMarginPercent,
      };
    });

    const shopPriceMargin = Math.max(0, totalSrp - grandTotal);
    const shopPriceMarginPercent =
      grandTotal > 0 ? ((shopPriceMargin / grandTotal) * 100).toFixed(0) : '0';

    return {
      lineItems,
      totalUnits,
      grandTotal,
      totalSrp,
      shopPriceMargin,
      shopPriceMarginPercent,
    };
  }, [estimateItems]);

  // History Summary Metrics
  const historySummary = useMemo(() => {
    const totalPurchases = purchaseHistory.length;
    const totalItemsSold = purchaseHistory.reduce((sum, p) => sum + p.totalUnits, 0);
    const totalRevenue = purchaseHistory.reduce((sum, p) => sum + p.grandTotal, 0);
    return { totalPurchases, totalItemsSold, totalRevenue };
  }, [purchaseHistory]);

  // Filtered Purchase History by search query
  const filteredHistory = useMemo(() => {
    if (!historySearchQuery.trim()) return purchaseHistory;
    const q = historySearchQuery.toLowerCase();
    return purchaseHistory.filter((p) => {
      if (p.id.toLowerCase().includes(q)) return true;
      if (p.buyerName.toLowerCase().includes(q)) return true;
      if (p.dateFormatted.toLowerCase().includes(q)) return true;
      return p.items.some(
        (i) =>
          i.itemName.toLowerCase().includes(q) ||
          i.partNumber.toLowerCase().includes(q) ||
          i.brand.toLowerCase().includes(q)
      );
    });
  }, [purchaseHistory, historySearchQuery]);

  const toggleOrderExpand = (orderId: string) => {
    setExpandedOrders((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

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

  // Close or Minimize modal WITHOUT saving to history and WITHOUT clearing items
  // Allows user to browse catalog and find other items
  const handleMinimize = () => {
    onClose();
    if (estimateItems.length > 0 && onNotify) {
      onNotify(
        `Wholesale estimate minimized (${estimateItems.length} items). Browse catalog and add more parts anytime!`,
        'info'
      );
    }
  };

  // ONLY when the user clicks "Done", save the purchase to history, clear recent items, and close
  const handleDone = () => {
    if (estimateItems.length > 0) {
      const now = new Date();
      const dateFormatted = now.toLocaleDateString('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      const timeFormatted = now.toLocaleTimeString('en-PH', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
      const rand = Math.floor(1000 + Math.random() * 9000);
      const purchaseId = `PUR-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${rand}`;

      const completedPurchase: CompletedPurchase = {
        id: purchaseId,
        timestamp: now.toISOString(),
        dateFormatted,
        timeFormatted,
        buyerName: buyerName.trim() || 'Walk-in Buyer',
        items: calculations.lineItems.map((i) => ({
          partId: i.partId,
          partNumber: i.partNumber,
          itemName: i.itemName,
          brand: i.brand,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          subtotal: i.subtotal,
          srpPrice: i.srpPrice,
          shopPriceMargin: i.itemMargin,
        })),
        totalUnits: calculations.totalUnits,
        grandTotal: calculations.grandTotal,
        totalSrp: calculations.totalSrp,
        shopPriceMargin: calculations.shopPriceMargin,
      };

      setPurchaseHistory((prev) => [completedPurchase, ...prev]);

      if (onNotify) {
        onNotify(`Purchase ${purchaseId} completed and saved to History!`, 'success');
      }
    }

    onClearItems();
    setBuyerName('');
    onClose();
  };

  // Safe in-UI single item delete (no window.confirm)
  const confirmAndDeleteSingleItem = (id: string) => {
    setPurchaseHistory((prev) => prev.filter((p) => p.id !== id));
    setConfirmDeleteId(null);
    if (onNotify) {
      onNotify('Purchase record deleted from history', 'info');
    }
  };

  // Safe in-UI clear all history (no window.confirm)
  const confirmAndClearAllHistory = () => {
    setPurchaseHistory([]);
    try {
      localStorage.removeItem(STORAGE_PURCHASE_HISTORY_KEY);
    } catch (e) {
      console.warn(e);
    }
    setIsConfirmingClearAll(false);
    if (onNotify) {
      onNotify('All purchase history has been deleted', 'info');
    }
  };

  const handleReloadToEstimator = (purchase: CompletedPurchase) => {
    const itemsToLoad: WholesaleEstimateItem[] = purchase.items.map((i) => ({
      partId: i.partId,
      partNumber: i.partNumber,
      itemName: i.itemName,
      brand: i.brand,
      srpPrice: i.unitPrice,
      shopPrice: i.unitPrice,
      quantity: i.quantity,
      customWholesalePrice: i.unitPrice,
    }));
    onUpdateItems(itemsToLoad);
    setBuyerName(purchase.buyerName === 'Walk-in Buyer' ? '' : purchase.buyerName);
    setActiveTab('estimator');
    if (onNotify) {
      onNotify(`Re-loaded ${purchase.items.length} items into estimator`, 'info');
    }
  };

  const handleCopyList = () => {
    const formattedDate = currentTime.toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const formattedTime = currentTime.toLocaleTimeString('en-PH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    const lines: string[] = [];
    lines.push(`🛵 *MOTOPARTS WHOLESALE ESTIMATE*`);
    lines.push(`Date: ${formattedDate} | Time: ${formattedTime}`);
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

  // Direct PDF Download for Current Active Estimate
  const handleExportCurrentEstimatePdf = () => {
    if (estimateItems.length === 0) return;
    const dateFormatted = currentTime.toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const timeFormatted = currentTime.toLocaleTimeString('en-PH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    exportEstimateQuotationPdf({
      buyerName,
      items: calculations.lineItems.map((i) => ({
        partId: i.partId,
        partNumber: i.partNumber,
        itemName: i.itemName,
        brand: i.brand,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        subtotal: i.subtotal,
      })),
      totalUnits: calculations.totalUnits,
      grandTotal: calculations.grandTotal,
      dateFormatted,
      timeFormatted,
    });

    if (onNotify) {
      onNotify('Estimate PDF generated and downloaded!', 'success');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4 animate-in fade-in">
      {/* Main Unified Modal - 100% full screen on mobile, elegant card on desktop */}
      <div className="bg-slate-900 border-0 sm:border border-slate-700/80 rounded-none sm:rounded-2xl w-full max-w-2xl h-full sm:h-auto sm:max-h-[92vh] shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* 1. Header with Tab Switcher & Live Clock */}
        <div className="px-3.5 sm:px-4 py-2.5 sm:py-3 bg-slate-950 border-b border-slate-800 shrink-0 space-y-2">
          {/* Top Line: Title + Live Clock + Minimize/Close (X) Button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg overflow-hidden border border-amber-500/40 bg-slate-950 flex items-center justify-center shrink-0">
                <img src="/logo.jpg" alt="MotoParts" className="w-full h-full object-cover scale-105" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h2 className="text-xs sm:text-sm font-extrabold text-white truncate">
                    Wholesale Estimator
                  </h2>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    PHP ₱
                  </span>
                </div>
                {/* Live Real-time Clock & Date Display */}
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                  <Clock className="w-3 h-3 text-amber-400/90 shrink-0" />
                  <span>
                    {currentTime.toLocaleDateString('en-PH', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                  <span>•</span>
                  <span className="font-mono text-amber-300 font-semibold">
                    {currentTime.toLocaleTimeString('en-PH', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: true,
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Tabs: Estimator vs Purchase History */}
            <div className="flex items-center gap-1.5">
              <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-xs">
                <button
                  onClick={() => setActiveTab('estimator')}
                  className={`px-2.5 py-1 rounded-md font-bold transition flex items-center gap-1 ${
                    activeTab === 'estimator'
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>Estimator</span>
                  {estimateItems.length > 0 && (
                    <span
                      className={`text-[9px] px-1 rounded-full font-black ${
                        activeTab === 'estimator'
                          ? 'bg-slate-950 text-amber-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {estimateItems.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`px-2.5 py-1 rounded-md font-bold transition flex items-center gap-1 ${
                    activeTab === 'history'
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>History</span>
                  <span
                    className={`text-[9px] px-1 rounded-full font-black ${
                      activeTab === 'history'
                        ? 'bg-slate-950 text-amber-400'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {purchaseHistory.length}
                  </span>
                </button>
              </div>

              {/* The X / Minimize Button: Minimizes modal so user can choose more items from catalog */}
              <button
                onClick={handleMinimize}
                className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition shrink-0 flex items-center gap-1"
                title="Minimize & choose more items from catalog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Buyer Name Input (Visible in Estimator mode) */}
          {activeTab === 'estimator' && (
            <div className="relative w-full">
              <UserIcon className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Buyer / Customer Name (optional, defaults to Walk-in)"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 focus:border-amber-500 text-white text-xs pl-8 pr-3 py-1.5 rounded-lg outline-none placeholder:text-slate-500"
              />
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: ESTIMATOR MODE */}
        {/* ========================================================================= */}
        {activeTab === 'estimator' && (
          <>
            {/* Quick Item Search Bar */}
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
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Autocomplete Dropdown */}
                {isSearching && searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-slate-950 border border-slate-700 rounded-xl shadow-2xl z-30 max-h-52 overflow-y-auto divide-y divide-slate-800">
                    {searchResults.map((part) => (
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
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* The Unified Purchase Slip & Total (Single Seamless Box, fits 100% on Mobile) */}
            <div className="flex-1 overflow-y-auto px-3.5 sm:px-4 py-1.5">
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950 flex flex-col w-full">
                {/* Desktop Table Header (>= sm) */}
                <div className="hidden sm:grid grid-cols-12 bg-slate-900/90 text-[10px] text-slate-400 uppercase tracking-wider font-bold border-b border-slate-800 px-3 py-2">
                  <div className="col-span-6">Item Description</div>
                  <div className="col-span-2 text-right">Shop Price (₱)</div>
                  <div className="col-span-2 text-center">Qty</div>
                  <div className="col-span-2 text-right">Subtotal</div>
                </div>

                {/* Empty State */}
                {calculations.lineItems.length === 0 ? (
                  <div className="text-center py-12 px-4 text-slate-500 text-xs">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-40 text-amber-500" />
                    <p className="font-medium text-slate-300">No items added yet</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Search above or click the &quot;X&quot; above to minimize and tap &quot;+ Wholesale&quot; on parts in the catalog.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800/80">
                    {calculations.lineItems.map((item) => (
                      <div key={item.partId} className="hover:bg-slate-900/50 transition">
                        {/* MOBILE CARD VIEW (< sm) */}
                        <div className="block sm:hidden p-2.5 space-y-1.5">
                          {/* Line 1: Part Name + Tags + Delete */}
                          <div className="flex items-start justify-between gap-1.5">
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-white text-xs leading-snug">
                                {item.itemName}
                              </div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                <span className="font-mono text-amber-400 font-semibold">
                                  {item.partNumber}
                                </span>
                                <span>•</span>
                                <span className="uppercase text-slate-300 font-bold">
                                  {item.brand}
                                </span>
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

                          {/* Line 2: Shop Price × Qty Controls = Subtotal */}
                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-900">
                            {/* Shop Price */}
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-400">Shop Price:</span>
                              <input
                                type="number"
                                step="any"
                                value={item.unitPrice}
                                onChange={(e) => handlePriceChange(item.partId, e.target.value)}
                                className="w-16 bg-slate-900 border border-slate-700/80 focus:border-amber-500 rounded px-1.5 py-0.5 text-right font-bold text-emerald-400 text-xs outline-none"
                                title="Shop Price"
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
                              <span className="uppercase text-slate-300 font-semibold">
                                {item.brand}
                              </span>
                            </div>
                          </div>

                          {/* Shop Price */}
                          <div className="col-span-2 text-right">
                            <input
                              type="number"
                              step="any"
                              value={item.unitPrice}
                              onChange={(e) => handlePriceChange(item.partId, e.target.value)}
                              className="w-20 bg-slate-900 border border-slate-700/80 focus:border-amber-500 rounded px-1.5 py-0.5 text-right font-bold text-emerald-400 text-xs outline-none"
                              title="Shop Price (editable)"
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

                {/* UNIFIED TOTAL PURCHASE FOOTER */}
                <div className="bg-slate-900 border-t-2 border-slate-800 px-3.5 py-2.5 sm:px-4 sm:py-3 flex items-center justify-between shrink-0">
                  <div>
                    <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                      Total Purchase
                    </span>
                    <span className="text-xs font-bold text-slate-300">
                      {calculations.totalUnits}{' '}
                      {calculations.totalUnits === 1 ? 'item' : 'items'} ({estimateItems.length}{' '}
                      unique)
                    </span>
                    {calculations.shopPriceMargin > 0 && (
                      <div className="text-[10px] text-emerald-400 font-bold mt-0.5">
                        Shop Price Margin: +{formatPHP(calculations.shopPriceMargin)} ({calculations.shopPriceMarginPercent}%)
                      </div>
                    )}
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

            {/* Bottom Actions Toolbar */}
            <div className="px-3.5 sm:px-4 py-2.5 sm:py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                {/* Minimize Button so user knows they can minimize and find another item */}
                <button
                  onClick={handleMinimize}
                  className="flex items-center space-x-1 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition active:scale-95"
                  title="Minimize wholesale estimator to find more items in the catalog"
                >
                  <Minimize2 className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden xs:inline">Find More Parts</span>
                </button>

                {estimateItems.length > 0 && (
                  <button
                    onClick={onClearItems}
                    className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-slate-400 hover:text-rose-400 bg-slate-900 sm:bg-transparent border border-slate-800 sm:border-0 text-xs font-semibold flex items-center gap-1 transition"
                    title="Clear list"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Clear</span>
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

                {/* Direct PDF Download of Active Estimate */}
                <button
                  onClick={handleExportCurrentEstimatePdf}
                  disabled={estimateItems.length === 0}
                  className="flex items-center space-x-1 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition disabled:opacity-40 active:scale-95"
                  title="Download Current Estimate as PDF"
                >
                  <FileDown className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[11px] sm:text-xs">Export PDF</span>
                </button>
              </div>

              {/* Done button: ONLY THIS saves purchase to history, removes listed purchases, and closes */}
              <button
                onClick={handleDone}
                disabled={estimateItems.length === 0}
                className="px-4 sm:px-5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:from-slate-700 disabled:to-slate-800 disabled:text-slate-500 text-slate-950 text-xs font-extrabold shadow-md shadow-orange-500/20 transition active:scale-95 shrink-0 flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                title="Save purchase to history and complete"
              >
                <span>Done</span>
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </button>
            </div>
          </>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: PURCHASE HISTORY & ALL HISTORY PDF EXPORT */}
        {/* ========================================================================= */}
        {activeTab === 'history' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* History Summary Header */}
            <div className="px-3.5 sm:px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0">
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2 flex-1">
                <div className="bg-slate-900 border border-slate-800 px-2 py-1.5 rounded-lg">
                  <div className="text-[9px] uppercase font-bold text-slate-400">Total Orders</div>
                  <div className="text-xs sm:text-sm font-extrabold text-white">
                    {historySummary.totalPurchases}
                  </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 px-2 py-1.5 rounded-lg">
                  <div className="text-[9px] uppercase font-bold text-slate-400">Items Sold</div>
                  <div className="text-xs sm:text-sm font-extrabold text-amber-300">
                    {historySummary.totalItemsSold} pcs
                  </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 px-2 py-1.5 rounded-lg">
                  <div className="text-[9px] uppercase font-bold text-slate-400">Total Sales</div>
                  <div className="text-xs sm:text-sm font-extrabold text-emerald-400 truncate">
                    {formatPHP(historySummary.totalRevenue)}
                  </div>
                </div>
              </div>

              {/* Action Buttons: Export All PDF + Print All */}
              {purchaseHistory.length > 0 && (
                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                  <button
                    onClick={() => {
                      exportAllPurchaseHistoryPdf(purchaseHistory);
                      onNotify?.(`Exported ${purchaseHistory.length} purchase history records to PDF!`, 'success');
                    }}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-extrabold shadow-md shadow-orange-500/20 transition active:scale-95 cursor-pointer"
                    title="Export all completed purchase history to PDF file"
                  >
                    <FileDown className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Export All PDF</span>
                  </button>

                  <button
                    onClick={() => printAllPurchaseHistory(purchaseHistory)}
                    className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition text-xs font-semibold"
                    title="Print complete history report"
                  >
                    <Printer className="w-3.5 h-3.5 text-amber-400" />
                    <span>Print</span>
                  </button>
                </div>
              )}
            </div>

            {/* Clear All Confirmation Banner (In-UI, never blocked by iframes) */}
            {isConfirmingClearAll && (
              <div className="bg-rose-950/90 border-b border-rose-500/40 p-3 flex items-center justify-between gap-3 text-xs text-rose-200 shrink-0">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Permanently delete all {purchaseHistory.length} purchase records?</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setIsConfirmingClearAll(false)}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmAndClearAllHistory}
                    className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
                  >
                    Yes, Clear All
                  </button>
                </div>
              </div>
            )}

            {/* History Search Filter */}
            {purchaseHistory.length > 0 && (
              <div className="px-3.5 sm:px-4 py-2 bg-slate-900/90 border-b border-slate-800 shrink-0">
                <div className="relative w-full">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search history by buyer, order ID, or item..."
                    value={historySearchQuery}
                    onChange={(e) => setHistorySearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 text-white text-xs pl-8 pr-8 py-1.5 rounded-lg outline-none placeholder:text-slate-500"
                  />
                  {historySearchQuery && (
                    <button
                      onClick={() => setHistorySearchQuery('')}
                      className="absolute right-2 top-2 p-0.5 text-slate-400 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Purchase History List */}
            <div className="flex-1 overflow-y-auto px-3.5 sm:px-4 py-2.5 space-y-2.5">
              {purchaseHistory.length === 0 ? (
                <div className="text-center py-16 px-4 bg-slate-950/60 rounded-xl border border-slate-800">
                  <Receipt className="w-10 h-10 text-slate-600 mx-auto mb-2 opacity-50" />
                  <h4 className="text-sm font-bold text-slate-300">No purchase history yet</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    Every time you click &quot;Done&quot; in the Wholesale Estimator, the purchase is
                    automatically saved here and can be printed or exported as PDF.
                  </p>
                  <button
                    onClick={() => setActiveTab('estimator')}
                    className="mt-4 px-3.5 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 shadow"
                  >
                    <span>Create New Purchase</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : filteredHistory.length === 0 ? (
                <div className="text-center py-10 px-4 text-slate-500 text-xs">
                  <p>No purchases found matching &quot;{historySearchQuery}&quot;</p>
                  <button
                    onClick={() => setHistorySearchQuery('')}
                    className="mt-2 text-amber-400 underline font-semibold"
                  >
                    Clear search
                  </button>
                </div>
              ) : (
                filteredHistory.map((purchase) => {
                  const isExpanded = Boolean(expandedOrders[purchase.id]);
                  const isDeletingThis = confirmDeleteId === purchase.id;

                  return (
                    <div
                      key={purchase.id}
                      className="bg-slate-950 border border-slate-800 rounded-xl p-3 hover:border-slate-700 transition space-y-2"
                    >
                      {/* Delete Confirmation Inline Banner */}
                      {isDeletingThis && (
                        <div className="bg-rose-950/90 border border-rose-500/40 rounded-lg p-2 flex items-center justify-between gap-2 text-xs text-rose-200">
                          <span>Delete order <strong>{purchase.id}</strong>?</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => confirmAndDeleteSingleItem(purchase.id)}
                              className="px-2.5 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Purchase Card Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                              {purchase.id}
                            </span>
                            <span className="text-xs font-bold text-white truncate">
                              {purchase.buyerName}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            <span>{purchase.dateFormatted}</span>
                            <span>•</span>
                            <span className="font-mono">{purchase.timeFormatted}</span>
                          </div>
                        </div>

                        {/* Grand Total */}
                        <div className="text-right shrink-0">
                          <div className="text-[9px] uppercase font-bold text-slate-400">
                            Total Purchase
                          </div>
                          <div className="text-sm sm:text-base font-black text-amber-400">
                            {formatPHP(purchase.grandTotal)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {purchase.totalUnits} pcs total ({purchase.items.length} items)
                          </div>
                        </div>
                      </div>

                      {/* Items Summary & Toggle */}
                      <div className="bg-slate-900/80 rounded-lg p-2 text-xs divide-y divide-slate-800">
                        {!isExpanded ? (
                          <div
                            className="flex items-center justify-between cursor-pointer py-0.5"
                            onClick={() => toggleOrderExpand(purchase.id)}
                          >
                            <div className="text-slate-300 text-[11px] truncate pr-2">
                              {purchase.items
                                .slice(0, 2)
                                .map((i) => `${i.itemName} (${i.quantity}x)`)
                                .join(', ')}
                              {purchase.items.length > 2 &&
                                ` +${purchase.items.length - 2} more...`}
                            </div>
                            <div className="text-[10px] text-amber-400 font-bold flex items-center gap-0.5 shrink-0">
                              <span>Details</span>
                              <ChevronDown className="w-3 h-3" />
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="space-y-1.5 pb-1">
                              {purchase.items.map((item, idx) => (
                                <div
                                  key={`${item.partId}-${idx}`}
                                  className="flex items-center justify-between text-[11px]"
                                >
                                  <div className="truncate pr-2">
                                    <span className="font-bold text-slate-200">
                                      {item.itemName}
                                    </span>{' '}
                                    <span className="text-[10px] text-slate-500 font-mono">
                                      [{item.partNumber}]
                                    </span>
                                  </div>
                                  <div className="text-slate-300 whitespace-nowrap shrink-0 text-right">
                                    <span className="text-[10px] text-slate-400">
                                      {item.quantity}x @ {formatPHP(item.unitPrice)} ={' '}
                                    </span>
                                    <strong className="text-white">
                                      {formatPHP(item.subtotal)}
                                    </strong>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div
                              className="pt-1 flex justify-center cursor-pointer text-[10px] text-slate-400 hover:text-white"
                              onClick={() => toggleOrderExpand(purchase.id)}
                            >
                              <div className="flex items-center gap-0.5">
                                <span>Collapse details</span>
                                <ChevronUp className="w-3 h-3" />
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Card Actions: Export PDF, Print, Reload, Delete */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-900 text-xs">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Export Single Receipt PDF */}
                          <button
                            onClick={() => {
                              exportSinglePurchasePdf(purchase);
                              onNotify?.(`Receipt PDF for ${purchase.id} downloaded!`, 'success');
                            }}
                            className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 transition text-xs"
                            title="Download single purchase voucher as PDF file"
                          >
                            <FileDown className="w-3 h-3" />
                            <span>Export PDF</span>
                          </button>

                          {/* Print single voucher via isolated iframe */}
                          <button
                            onClick={() => printPurchaseReceipt(purchase)}
                            className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-semibold flex items-center gap-1 transition text-xs"
                            title="Print purchase voucher"
                          >
                            <Printer className="w-3 h-3 text-amber-400" />
                            <span>Print</span>
                          </button>

                          {/* Reload into estimator */}
                          <button
                            onClick={() => handleReloadToEstimator(purchase)}
                            className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 font-semibold flex items-center gap-1 transition text-[11px]"
                            title="Load this purchase back into estimator"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Re-load</span>
                          </button>
                        </div>

                        {/* Delete Single Purchase with inline confirmation */}
                        <button
                          onClick={() => setConfirmDeleteId(purchase.id)}
                          className="text-slate-500 hover:text-rose-400 p-1.5 transition rounded hover:bg-slate-900"
                          title="Delete from history"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* History Footer */}
            <div className="px-3.5 sm:px-4 py-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
              {purchaseHistory.length > 0 ? (
                <button
                  onClick={() => setIsConfirmingClearAll(true)}
                  className="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 transition p-1 hover:bg-rose-950/40 rounded"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All History</span>
                </button>
              ) : (
                <div />
              )}

              <button
                onClick={() => setActiveTab('estimator')}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Estimator</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
