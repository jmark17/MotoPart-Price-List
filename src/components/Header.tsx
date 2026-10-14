import React, { useState, useRef, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  Wrench,
  FileSpreadsheet,
  Plus,
  RefreshCw,
  Printer,
  Calculator,
  User as UserIcon,
  LogOut,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';
import { SheetSyncStatus } from '../types/motorPart';
import { formatPHP } from '../utils/formatCurrency';

interface HeaderProps {
  user: User | null;
  syncStatus: SheetSyncStatus;
  isLoggingIn: boolean;
  onOpenAuthModal: () => void;
  onLogout: () => void;
  onOpenAddModal: () => void;
  onOpenSheetConfig: () => void;
  onOpenPrintModal: () => void;
  onManualSync: () => void;
  totalParts: number;
  totalSrpValue: number;
  totalShopValue: number;
  wholesaleCount: number;
  onOpenWholesaleModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  syncStatus,
  isLoggingIn,
  onOpenAuthModal,
  onLogout,
  onOpenAddModal,
  onOpenSheetConfig,
  onOpenPrintModal,
  onManualSync,
  totalParts,
  totalSrpValue,
  totalShopValue,
  wholesaleCount,
  onOpenWholesaleModal,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-18 py-2 sm:py-3">
          {/* Logo & Title */}
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20 text-slate-950">
              <Wrench className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <h1 className="text-sm sm:text-lg font-bold tracking-tight text-white truncate flex items-center gap-1">
                  <span>MotoParts</span>
                  <span className="text-amber-400 font-extrabold">PRICELIST</span>
                </h1>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  PHP ₱
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden md:block">
                Motorcycle Parts Catalog with SRP &amp; Shop Wholesale Pricing (PHP)
              </p>
            </div>
          </div>

          {/* Quick Metrics (Desktop only) */}
          <div className="hidden lg:flex items-center space-x-5 border-x border-slate-800 px-5">
            <div>
              <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Total Items</div>
              <div className="text-sm font-bold text-slate-100">{totalParts} items</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider font-semibold text-amber-400">SRP Inventory</div>
              <div className="text-sm font-bold text-amber-300">
                {formatPHP(totalSrpValue)}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider font-semibold text-emerald-400">Shop Value</div>
              <div className="text-sm font-bold text-emerald-300">
                {formatPHP(totalShopValue)}
              </div>
            </div>
          </div>

          {/* Right Action Icons & Auth */}
          <div className="flex items-center space-x-1.5 sm:space-x-2.5">
            {/* Sheet Sync Status Button */}
            <button
              onClick={onOpenSheetConfig}
              className={`flex items-center space-x-1.5 px-2 sm:px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                syncStatus.isConnected
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700/80'
              }`}
              title={syncStatus.isConnected ? 'Google Sheet Connected' : 'Connect Google Sheet'}
            >
              <FileSpreadsheet className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${syncStatus.isConnected ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span className="hidden xs:inline text-[11px] sm:text-xs">
                {syncStatus.isConnected ? (
                  syncStatus.isSyncing ? 'Syncing...' : 'Sheet'
                ) : (
                  'Connect'
                )}
              </span>
              {syncStatus.isConnected && (
                <span className="relative flex h-2 w-2 shrink-0">
                  {syncStatus.isSyncing ? (
                    <span className="animate-spin inline-block h-2 w-2 rounded-full border border-emerald-400 border-t-transparent"></span>
                  ) : (
                    <>
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </>
                  )}
                </span>
              )}
            </button>

            {/* Manual Sync Icon (When Connected) */}
            {syncStatus.isConnected && (
              <button
                onClick={onManualSync}
                disabled={syncStatus.isSyncing}
                className="p-1.5 sm:p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg border border-slate-700 transition"
                title="Sync now with Google Sheet"
              >
                <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${syncStatus.isSyncing ? 'animate-spin text-amber-400' : ''}`} />
              </button>
            )}

            {/* Print Catalog Button */}
            <button
              onClick={onOpenPrintModal}
              className="p-1.5 sm:p-2 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg border border-slate-700 transition hidden md:inline-flex"
              title="Printable Pricelist"
            >
              <Printer className="w-4 h-4" />
            </button>

            {/* Wholesale Estimation Button */}
            <button
              onClick={onOpenWholesaleModal}
              className="relative flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-bold text-xs sm:text-xs transition active:scale-95 shrink-0"
              title="Wholesale Estimation & Calculator"
            >
              <Calculator className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 stroke-[2.5]" />
              <span className="hidden sm:inline">Estimator</span>
              {wholesaleCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-black rounded-full bg-amber-500 text-slate-950">
                  {wholesaleCount}
                </span>
              )}
            </button>

            {/* Add Part Button */}
            <button
              onClick={onOpenAddModal}
              className="flex items-center space-x-1 px-2.5 sm:px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs sm:text-sm shadow-md shadow-orange-500/20 transition-all transform active:scale-95 shrink-0"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />
              <span className="hidden xs:inline">Add Part</span>
              <span className="xs:hidden">Add</span>
            </button>

            {/* Firebase Auth Profile or Login Button */}
            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-1.5 pl-1.5 pr-2 py-1 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 transition"
                  title="Account details"
                >
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border border-slate-600 shrink-0"
                    />
                  ) : (
                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-slate-950 font-bold text-xs flex items-center justify-center shrink-0">
                      {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden xs:block" />
                </button>

                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="px-3.5 py-2 border-b border-slate-800">
                      <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-emerald-400 mb-0.5">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Firebase Authenticated</span>
                      </div>
                      <div className="font-bold text-sm text-white truncate">
                        {user.displayName || 'Authorized User'}
                      </div>
                      <div className="text-xs text-slate-400 truncate">
                        {user.email || 'Signed in'}
                      </div>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onOpenSheetConfig();
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 flex items-center space-x-2 transition"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                        <span>Google Sheet Settings</span>
                      </button>
                    </div>

                    <div className="pt-1 border-t border-slate-800">
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onLogout();
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs text-rose-400 hover:bg-rose-500/10 flex items-center space-x-2 transition"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenAuthModal}
                disabled={isLoggingIn}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 text-xs font-semibold shadow-sm transition active:scale-98 shrink-0"
                title="Sign in with Firebase (Email or Google)"
              >
                <UserIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
