import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User } from 'firebase/auth';
import {
  initAuth,
  logout,
  getAccessToken,
  setCachedAccessToken,
  AppUser,
} from './services/auth';
import {
  createMotorPartsSpreadsheet,
  syncAllPartsToSheet,
  readPartsFromSheet,
  fetchSpreadsheetMetadata,
  extractSpreadsheetId,
} from './services/sheetsService';
import { INITIAL_MOTOR_PARTS } from './data/initialParts';
import { MotorPart, SheetSyncStatus } from './types/motorPart';
import { Header } from './components/Header';
import { SearchAndFilters, FilterState } from './components/SearchAndFilters';
import { PartsTable } from './components/PartsTable';
import { PartsGrid } from './components/PartsGrid';
import { PartModal } from './components/PartModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { SheetConfigModal } from './components/SheetConfigModal';
import { PrintPricelistModal } from './components/PrintPricelistModal';
import { WholesaleEstimateModal, STORAGE_PURCHASE_HISTORY_KEY } from './components/WholesaleEstimateModal';
import { WholesaleEstimateItem, CompletedPurchase } from './types/wholesale';
import { AuthModal } from './components/AuthModal';
import { CheckCircle2, AlertCircle, Info, Calculator, ChevronUp, Check } from 'lucide-react';
import { formatPHP } from './utils/formatCurrency';

const STORAGE_PARTS_KEY = 'motoparts_items_php_v1';
const STORAGE_SHEET_ID_KEY = 'motoparts_sheet_id_php_v1';
const STORAGE_SHEET_TITLE_KEY = 'motoparts_sheet_title_php_v1';

export default function App() {
  // Auth user state
  const [user, setUser] = useState<User | AppUser | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Parts dataset in Philippine Peso (Part #, Item Name, Brand, SRP Price, Shop Price)
  const [parts, setParts] = useState<MotorPart[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_PARTS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load stored parts, using initial defaults:', e);
    }
    return INITIAL_MOTOR_PARTS;
  });

  // Sync state
  const [syncStatus, setSyncStatus] = useState<SheetSyncStatus>(() => {
    const savedSheetId = localStorage.getItem(STORAGE_SHEET_ID_KEY);
    const savedTitle = localStorage.getItem(STORAGE_SHEET_TITLE_KEY);
    return {
      isConnected: Boolean(savedSheetId),
      spreadsheetId: savedSheetId || null,
      spreadsheetUrl: savedSheetId
        ? `https://docs.google.com/spreadsheets/d/${savedSheetId}/edit`
        : null,
      spreadsheetTitle: savedTitle || 'Motor Parts Pricelist (PHP)',
      lastSyncedAt: null,
      isSyncing: false,
      autoSync: true,
      error: null,
    };
  });

  // Filters state
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    brand: 'ALL',
    minPrice: '',
    maxPrice: '',
    sortBy: 'name-asc',
  });

  // View mode: 'table' or 'grid'
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Modals
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<MotorPart | null>(null);
  const [deletePart, setDeletePart] = useState<MotorPart | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isWholesaleModalOpen, setIsWholesaleModalOpen] = useState(false);

  // Wholesale estimate basket
  const [wholesaleItems, setWholesaleItems] = useState<WholesaleEstimateItem[]>(() => {
    try {
      const stored = localStorage.getItem('motoparts_wholesale_items_v1');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Failed to load wholesale items', e);
    }
    return [];
  });

  // Save wholesale items
  useEffect(() => {
    try {
      localStorage.setItem('motoparts_wholesale_items_v1', JSON.stringify(wholesaleItems));
    } catch (e) {
      console.warn('Failed to save wholesale items', e);
    }
  }, [wholesaleItems]);

  const wholesalePartIds = useMemo(() => {
    return new Set(wholesaleItems.map((i) => i.partId));
  }, [wholesaleItems]);

  const handleAddToWholesale = (part: MotorPart, qty: number = 1) => {
    setWholesaleItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.partId === part.id);
      if (existingIndex >= 0) {
        const copy = [...prev];
        copy[existingIndex] = {
          ...copy[existingIndex],
          quantity: copy[existingIndex].quantity + qty,
        };
        return copy;
      } else {
        const newItem: WholesaleEstimateItem = {
          partId: part.id,
          partNumber: part.partNumber,
          itemName: part.itemName,
          brand: part.brand,
          srpPrice: part.srpPrice,
          shopPrice: part.shopPrice,
          quantity: qty,
        };
        return [...prev, newItem];
      }
    });
    showToast(`Added "${part.itemName}" to Wholesale Estimate`, 'success');
  };

  const handleClearWholesale = (skipToast: boolean = false) => {
    setWholesaleItems([]);
    if (!skipToast) {
      showToast('Wholesale estimate cleared', 'info');
    }
  };

  const wholesaleTotalUnits = useMemo(() => {
    return wholesaleItems.reduce((acc, i) => acc + i.quantity, 0);
  }, [wholesaleItems]);

  const wholesaleGrandTotal = useMemo(() => {
    return wholesaleItems.reduce((acc, i) => {
      const price =
        i.customWholesalePrice !== undefined && i.customWholesalePrice > 0
          ? i.customWholesalePrice
          : i.shopPrice;
      return acc + price * i.quantity;
    }, 0);
  }, [wholesaleItems]);

  const wholesaleTotalSrp = useMemo(() => {
    return wholesaleItems.reduce((acc, i) => acc + i.srpPrice * i.quantity, 0);
  }, [wholesaleItems]);

  const wholesaleShopPriceMargin = useMemo(() => {
    return Math.max(0, wholesaleTotalSrp - wholesaleGrandTotal);
  }, [wholesaleTotalSrp, wholesaleGrandTotal]);

  // Complete purchase from the floating minimized bar
  const handleCompleteWholesaleFromBar = () => {
    if (wholesaleItems.length === 0) return;
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
      buyerName: 'Walk-in Buyer',
      items: wholesaleItems.map((i) => {
        const unitPrice =
          i.customWholesalePrice !== undefined && i.customWholesalePrice > 0
            ? i.customWholesalePrice
            : i.shopPrice;
        const subtotal = unitPrice * i.quantity;
        const itemMargin = i.srpPrice * i.quantity - subtotal;
        return {
          partId: i.partId,
          partNumber: i.partNumber,
          itemName: i.itemName,
          brand: i.brand,
          quantity: i.quantity,
          unitPrice,
          subtotal,
          srpPrice: i.srpPrice,
          shopPriceMargin: itemMargin,
        };
      }),
      totalUnits: wholesaleTotalUnits,
      grandTotal: wholesaleGrandTotal,
      totalSrp: wholesaleTotalSrp,
      shopPriceMargin: wholesaleShopPriceMargin,
    };

    try {
      const stored = localStorage.getItem(STORAGE_PURCHASE_HISTORY_KEY);
      const existing: CompletedPurchase[] = stored ? JSON.parse(stored) : [];
      localStorage.setItem(
        STORAGE_PURCHASE_HISTORY_KEY,
        JSON.stringify([completedPurchase, ...existing])
      );
    } catch (e) {
      console.warn('Failed to save purchase history', e);
    }

    setWholesaleItems([]);
    showToast(`Purchase ${purchaseId} completed and saved to History!`, 'success');
  };

  // Toast notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const toastTimeoutRef = useRef<any>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Keep localStorage in sync with parts
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PARTS_KEY, JSON.stringify(parts));
    } catch (e) {
      console.warn('Failed to save parts to localStorage', e);
    }
  }, [parts]);

  // Firebase auth initialization
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        if (token) {
          setCachedAccessToken(token);
        }
      },
      () => {
        setUser(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Trigger Google Sheet sync
  const triggerSheetSync = async (
    targetParts: MotorPart[],
    overrideSheetId?: string,
    showToastMessage: boolean = true
  ) => {
    const targetId = overrideSheetId || syncStatus.spreadsheetId;
    if (!targetId) return;

    let token = await getAccessToken(false);
    if (!token) {
      setSyncStatus((prev) => ({
        ...prev,
        isSyncing: false,
        error: 'Google authorization required. Please sign in with Google or reconnect in Sheet settings.',
      }));
      showToast('Google Sheet sync paused: Sign in with Google to authorize updates', 'info');
      return;
    }

    setSyncStatus((prev) => ({ ...prev, isSyncing: true, error: null }));

    try {
      await syncAllPartsToSheet(token, targetId, targetParts);
      const now = new Date().toISOString();
      setSyncStatus((prev) => ({
        ...prev,
        isSyncing: false,
        lastSyncedAt: now,
        error: null,
      }));
      if (showToastMessage) {
        showToast(`Google Sheet updated successfully (${targetParts.length} parts synchronized in PHP)`);
      }
    } catch (err: any) {
      console.error('Error syncing parts to sheet:', err);

      // Auto-retry once if token expired (HTTP 401)
      if (
        err.message?.includes('401') ||
        err.message?.includes('invalid authentication credentials') ||
        err.message?.includes('Google authorization expired')
      ) {
        setCachedAccessToken(null);
        try {
          const freshToken = await getAccessToken(false);
          if (freshToken) {
            await syncAllPartsToSheet(freshToken, targetId, targetParts);
            const now = new Date().toISOString();
            setSyncStatus((prev) => ({
              ...prev,
              isSyncing: false,
              lastSyncedAt: now,
              error: null,
            }));
            if (showToastMessage) {
              showToast(`Google Sheet updated successfully (${targetParts.length} parts synchronized in PHP)`);
            }
            return;
          }
        } catch (retryErr) {
          console.warn('Auto-refresh retry failed:', retryErr);
        }
      }

      setSyncStatus((prev) => ({
        ...prev,
        isSyncing: false,
        error: err.message || 'Failed to sync with Google Sheet',
      }));
      showToast(err.message || 'Sync error with Google Sheet', 'error');
    }
  };

  // Sign out handler
  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      showToast('Signed out of Firebase account', 'info');
    } catch (err) {
      console.error('Error during logout', err);
    }
  };

  // Create brand new Google Sheet
  const handleCreateNewSheet = async () => {
    let token = await getAccessToken();
    if (!token) {
      setIsAuthModalOpen(true);
      showToast('Please sign in with Google to create a spreadsheet in Google Drive', 'info');
      return;
    }

    setSyncStatus((prev) => ({ ...prev, isSyncing: true, error: null }));
    try {
      const created = await createMotorPartsSpreadsheet(
        token,
        'Motor Parts Pricelist Database (PHP)',
        parts
      );

      localStorage.setItem(STORAGE_SHEET_ID_KEY, created.id);
      localStorage.setItem(STORAGE_SHEET_TITLE_KEY, created.title);

      setSyncStatus({
        isConnected: true,
        spreadsheetId: created.id,
        spreadsheetUrl: created.url,
        spreadsheetTitle: created.title,
        lastSyncedAt: new Date().toISOString(),
        isSyncing: false,
        autoSync: true,
        error: null,
      });

      showToast(`Created & connected Google Sheet: "${created.title}"`);
    } catch (err: any) {
      setSyncStatus((prev) => ({
        ...prev,
        isSyncing: false,
        error: err.message || 'Failed to create Google Sheet',
      }));
      showToast(err.message || 'Failed to create Google Sheet', 'error');
    }
  };

  // Connect existing Google Sheet
  const handleConnectExistingSheet = async (input: string) => {
    const sheetId = extractSpreadsheetId(input);
    if (!sheetId) {
      showToast('Please enter a valid Google Sheet URL or ID', 'error');
      return;
    }

    let token = await getAccessToken();
    if (!token) {
      setIsAuthModalOpen(true);
      showToast('Please sign in with Google to connect and read from Google Sheets', 'info');
      return;
    }

    setSyncStatus((prev) => ({ ...prev, isSyncing: true, error: null }));
    try {
      const meta = await fetchSpreadsheetMetadata(token, sheetId);
      await syncAllPartsToSheet(token, sheetId, parts);

      localStorage.setItem(STORAGE_SHEET_ID_KEY, sheetId);
      localStorage.setItem(STORAGE_SHEET_TITLE_KEY, meta.title);

      setSyncStatus({
        isConnected: true,
        spreadsheetId: sheetId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/edit`,
        spreadsheetTitle: meta.title,
        lastSyncedAt: new Date().toISOString(),
        isSyncing: false,
        autoSync: true,
        error: null,
      });

      showToast(`Connected to Google Sheet: "${meta.title}"`);
    } catch (err: any) {
      setSyncStatus((prev) => ({
        ...prev,
        isSyncing: false,
        error: err.message || 'Failed to connect Google Sheet',
      }));
      showToast(err.message || 'Failed to connect Google Sheet', 'error');
    }
  };

  // Disconnect Google Sheet
  const handleDisconnectSheet = () => {
    localStorage.removeItem(STORAGE_SHEET_ID_KEY);
    localStorage.removeItem(STORAGE_SHEET_TITLE_KEY);
    setSyncStatus({
      isConnected: false,
      spreadsheetId: null,
      spreadsheetUrl: null,
      spreadsheetTitle: null,
      lastSyncedAt: null,
      isSyncing: false,
      autoSync: true,
      error: null,
    });
    showToast('Google Sheet disconnected from app', 'info');
  };

  // Pull / Import data from Google Sheet
  const handlePullFromSheet = async () => {
    if (!syncStatus.spreadsheetId) return;

    let token = await getAccessToken();
    if (!token) {
      setIsAuthModalOpen(true);
      showToast('Please sign in with Google to read from Google Sheet', 'error');
      return;
    }

    setSyncStatus((prev) => ({ ...prev, isSyncing: true, error: null }));
    try {
      const { parts: sheetParts } = await readPartsFromSheet(token, syncStatus.spreadsheetId);
      if (sheetParts.length > 0) {
        const normalized = sheetParts.map((p) => ({
          ...p,
          brand: (p.brand || '').toUpperCase(),
        }));
        setParts(normalized);
        showToast(`Imported ${sheetParts.length} items from Google Sheet`);
      } else {
        showToast('Google Sheet has no data rows', 'info');
      }
      setSyncStatus((prev) => ({
        ...prev,
        isSyncing: false,
        lastSyncedAt: new Date().toISOString(),
        error: null,
      }));
    } catch (err: any) {
      setSyncStatus((prev) => ({
        ...prev,
        isSyncing: false,
        error: err.message || 'Failed to pull from Google Sheet',
      }));
      showToast(err.message || 'Failed to read from Google Sheet', 'error');
    }
  };

  // Save part handler (Add / Edit)
  const handleSavePart = async (savedPart: MotorPart) => {
    const normalizedPart = {
      ...savedPart,
      brand: (savedPart.brand || '').toUpperCase(),
    };
    let updatedList: MotorPart[];
    const exists = parts.some((p) => p.id === normalizedPart.id);

    if (exists) {
      updatedList = parts.map((p) => (p.id === normalizedPart.id ? normalizedPart : p));
      showToast(`Updated "${normalizedPart.itemName}"`);
    } else {
      updatedList = [normalizedPart, ...parts];
      showToast(`Added "${normalizedPart.itemName}"`);
    }

    setParts(updatedList);
    setIsAddEditModalOpen(false);
    setEditingPart(null);

    if (syncStatus.isConnected && syncStatus.autoSync) {
      triggerSheetSync(updatedList);
    }
  };


  // Delete part handler
  const handleConfirmDelete = async () => {
    if (!deletePart) return;
    setIsDeleting(true);

    const updated = parts.filter((p) => p.id !== deletePart.id);
    setParts(updated);

    showToast(`Deleted "${deletePart.itemName}"`);
    setIsDeleting(false);
    setDeletePart(null);

    if (syncStatus.isConnected && syncStatus.autoSync) {
      triggerSheetSync(updated);
    }
  };

  // Filter and Search calculation
  const filteredParts = useMemo(() => {
    return parts
      .filter((part) => {
        // Search Query (Part #, Item Name, Brand)
        if (filters.searchQuery.trim()) {
          const q = filters.searchQuery.toLowerCase().trim();
          const matchesNum = part.partNumber.toLowerCase().includes(q);
          const matchesName = part.itemName.toLowerCase().includes(q);
          const matchesBrand = part.brand.toLowerCase().includes(q);

          if (!matchesNum && !matchesName && !matchesBrand) {
            return false;
          }
        }

        // Brand Filter
        if (filters.brand !== 'ALL' && part.brand !== filters.brand) {
          return false;
        }

        // SRP Price Range
        if (filters.minPrice !== '') {
          const min = parseFloat(filters.minPrice);
          if (!isNaN(min) && part.srpPrice < min) {
            return false;
          }
        }
        if (filters.maxPrice !== '') {
          const max = parseFloat(filters.maxPrice);
          if (!isNaN(max) && part.srpPrice > max) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        switch (filters.sortBy) {
          case 'name-asc':
            return a.itemName.localeCompare(b.itemName);
          case 'name-desc':
            return b.itemName.localeCompare(a.itemName);
          case 'part-asc':
            return a.partNumber.localeCompare(b.partNumber);
          case 'srp-asc':
            return a.srpPrice - b.srpPrice;
          case 'srp-desc':
            return b.srpPrice - a.srpPrice;
          case 'shop-asc':
            return a.shopPrice - b.shopPrice;
          case 'shop-desc':
            return b.shopPrice - a.shopPrice;
          default:
            return 0;
        }
      });
  }, [parts, filters]);

  // Derived filter options
  const distinctBrands = useMemo(() => {
    const set = new Set<string>();
    parts.forEach((p) => {
      if (p.brand) set.add(p.brand);
    });
    return Array.from(set).sort();
  }, [parts]);

  const brandCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    parts.forEach((p) => {
      counts[p.brand] = (counts[p.brand] || 0) + 1;
    });
    return counts;
  }, [parts]);

  const totalSrpValue = useMemo(() => {
    return parts.reduce((acc, p) => acc + p.srpPrice, 0);
  }, [parts]);

  const totalShopValue = useMemo(() => {
    return parts.reduce((acc, p) => acc + p.shopPrice, 0);
  }, [parts]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-2.5 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md border text-xs sm:text-sm font-semibold animate-in slide-in-from-bottom duration-200 transition-all bg-slate-900 border-slate-700 text-white">
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
          {toast.type === 'info' && <Info className="w-5 h-5 text-sky-400 shrink-0" />}
          {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <Header
        user={user}
        syncStatus={syncStatus}
        isLoggingIn={isLoggingIn}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        onOpenAddModal={() => {
          setEditingPart(null);
          setIsAddEditModalOpen(true);
        }}
        onOpenSheetConfig={() => setIsSheetModalOpen(true)}
        onOpenPrintModal={() => setIsPrintModalOpen(true)}
        onManualSync={() => triggerSheetSync(parts)}
        totalParts={parts.length}
        totalSrpValue={totalSrpValue}
        totalShopValue={totalShopValue}
        wholesaleCount={wholesaleItems.reduce((acc, i) => acc + i.quantity, 0)}
        onOpenWholesaleModal={() => setIsWholesaleModalOpen(true)}
      />

      {/* Search & Filters */}
      <SearchAndFilters
        filters={filters}
        onFilterChange={setFilters}
        onResetFilters={() =>
          setFilters({
            searchQuery: '',
            brand: 'ALL',
            minPrice: '',
            maxPrice: '',
            sortBy: 'name-asc',
          })
        }
        brands={distinctBrands}
        brandCounts={brandCounts}
        totalFiltered={filteredParts.length}
        totalAll={parts.length}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Main Content (Table / Grid) */}
      <main className="flex-1 max-w-7xl w-full mx-auto pb-16">
        {viewMode === 'table' ? (
          <PartsTable
            parts={filteredParts}
            onEdit={(part) => {
              setEditingPart(part);
              setIsAddEditModalOpen(true);
            }}
            onDelete={(part) => setDeletePart(part)}
            onAddToWholesale={handleAddToWholesale}
            wholesalePartIds={wholesalePartIds}
          />
        ) : (
          <PartsGrid
            parts={filteredParts}
            onEdit={(part) => {
              setEditingPart(part);
              setIsAddEditModalOpen(true);
            }}
            onDelete={(part) => setDeletePart(part)}
            onAddToWholesale={handleAddToWholesale}
            wholesalePartIds={wholesalePartIds}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-5 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center space-x-2">
            <span>MotoParts Pricelist (PHP ₱)</span>
            <span>•</span>
            <span>Columns: Part #, Item Name, Brand, SRP Price, Shop Price</span>
          </div>
          <div className="flex items-center space-x-2 text-slate-400">
            {user ? (
              <span className="text-emerald-400 font-medium">
                ● Signed in as {user.displayName || user.email}
              </span>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="text-amber-400 hover:text-amber-300 underline"
              >
                Sign in with Firebase
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* Firebase Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(msg) => showToast(msg, 'success')}
      />

      {/* Add / Edit Part Modal */}
      <PartModal
        isOpen={isAddEditModalOpen}
        onClose={() => {
          setIsAddEditModalOpen(false);
          setEditingPart(null);
        }}
        onSave={handleSavePart}
        editingPart={editingPart}
        sheetConnected={syncStatus.isConnected}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deletePart)}
        onClose={() => setDeletePart(null)}
        onConfirm={handleConfirmDelete}
        part={deletePart}
        sheetConnected={syncStatus.isConnected}
        isDeleting={isDeleting}
      />

      {/* Sheet Connection & Sync Modal */}
      <SheetConfigModal
        isOpen={isSheetModalOpen}
        onClose={() => setIsSheetModalOpen(false)}
        user={user}
        syncStatus={syncStatus}
        isLoggingIn={isLoggingIn}
        onLogin={() => setIsAuthModalOpen(true)}
        onCreateNewSheet={handleCreateNewSheet}
        onConnectExistingSheet={handleConnectExistingSheet}
        onDisconnectSheet={handleDisconnectSheet}
        onPullFromSheet={handlePullFromSheet}
        onPushToSheet={() => triggerSheetSync(parts)}
        onToggleAutoSync={() =>
          setSyncStatus((prev) => {
            const next = !prev.autoSync;
            showToast(`Auto-sync ${next ? 'enabled' : 'paused'}`, 'info');
            return { ...prev, autoSync: next };
          })
        }
        totalParts={parts.length}
      />

      {/* Printable Pricelist Modal */}
      <PrintPricelistModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        parts={filteredParts}
      />

      {/* Minimized Floating Wholesale Bar (Visible when estimate is ongoing and modal is closed/minimized) */}
      {!isWholesaleModalOpen && wholesaleItems.length > 0 && (
        <div className="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-6 sm:w-auto z-40 animate-in slide-in-from-bottom-5 duration-200">
          <div className="bg-slate-900/95 backdrop-blur-md border-2 border-amber-500/80 rounded-2xl p-2.5 sm:p-3 shadow-2xl shadow-black/80 flex items-center justify-between gap-3">
            {/* Clickable Info Area: Opens Modal */}
            <div
              onClick={() => setIsWholesaleModalOpen(true)}
              className="flex items-center gap-2.5 min-w-0 cursor-pointer hover:opacity-90 transition pr-1"
              title="Click to resume Wholesale Estimate"
            >
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shrink-0 shadow">
                <Calculator className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                    Ongoing Wholesale
                  </span>
                  <span className="text-[11px] text-slate-400 font-semibold">
                    {wholesaleTotalUnits} pcs ({wholesaleItems.length} items)
                  </span>
                </div>
                <div className="text-xs sm:text-sm font-black text-white truncate flex items-baseline gap-2 flex-wrap">
                  <span>Total: <span className="text-amber-400">{formatPHP(wholesaleGrandTotal)}</span></span>
                  {wholesaleShopPriceMargin > 0 && (
                    <span className="text-[10px] text-emerald-400 font-bold">
                      Shop Price Margin: +{formatPHP(wholesaleShopPriceMargin)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions: View & Done */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setIsWholesaleModalOpen(true)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1 active:scale-95 cursor-pointer"
                title="Open and edit estimate"
              >
                <span>View</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleCompleteWholesaleFromBar}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-black shadow-md shadow-orange-500/20 transition flex items-center gap-1 active:scale-95 cursor-pointer"
                title="Complete purchase and save to history"
              >
                <span>Done</span>
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wholesale Estimation & Quotation Modal */}
      <WholesaleEstimateModal
        isOpen={isWholesaleModalOpen}
        onClose={() => setIsWholesaleModalOpen(false)}
        catalogParts={parts}
        estimateItems={wholesaleItems}
        onUpdateItems={setWholesaleItems}
        onClearItems={() => handleClearWholesale(true)}
        onAddItem={handleAddToWholesale}
        onNotify={showToast}
      />
    </div>
  );
}
