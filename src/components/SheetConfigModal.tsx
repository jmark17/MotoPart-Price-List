import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { AppUser } from '../services/auth';
import {
  X,
  FileSpreadsheet,
  CheckCircle2,
  ExternalLink,
  PlusCircle,
  Link as LinkIcon,
  DownloadCloud,
  UploadCloud,
  AlertCircle,
} from 'lucide-react';
import { SheetSyncStatus } from '../types/motorPart';

interface SheetConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | AppUser | null;
  syncStatus: SheetSyncStatus;
  isLoggingIn: boolean;
  onLogin: () => void;
  onCreateNewSheet: () => void;
  onConnectExistingSheet: (input: string) => void;
  onDisconnectSheet: () => void;
  onPullFromSheet: () => void;
  onPushToSheet: () => void;
  onToggleAutoSync: () => void;
  totalParts: number;
}

export const SheetConfigModal: React.FC<SheetConfigModalProps> = ({
  isOpen,
  onClose,
  user,
  syncStatus,
  isLoggingIn,
  onLogin,
  onCreateNewSheet,
  onConnectExistingSheet,
  onDisconnectSheet,
  onPullFromSheet,
  onPushToSheet,
  onToggleAutoSync,
  totalParts,
}) => {
  const [inputSheetUrlOrId, setInputSheetUrlOrId] = useState('');
  const [activeTab, setActiveTab] = useState<'create' | 'connect'>('create');

  if (!isOpen) return null;

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputSheetUrlOrId.trim()) return;
    onConnectExistingSheet(inputSheetUrlOrId.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden max-h-[94vh] flex flex-col my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-800 bg-slate-950/80 shrink-0">
          <div className="flex items-center space-x-2 sm:space-x-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-white truncate">
                Google Sheet Integration
              </h2>
              <p className="text-[11px] text-slate-400 truncate hidden xs:block">
                Synchronize motor parts database real-time
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 flex-1">
          {/* Sign-in notice if not authenticated */}
          {!user ? (
            <div className="p-3.5 sm:p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center space-y-3">
              <AlertCircle className="w-7 h-7 sm:w-8 sm:h-8 text-amber-400 mx-auto" />
              <div>
                <h3 className="text-sm font-bold text-white">Sign in required to access Google Sheets</h3>
                <p className="text-xs text-slate-300 mt-1 max-w-sm mx-auto">
                  To automatically read and write your motor parts inventory to Google Sheets, sign in with your Google account.
                </p>
              </div>
              <button
                onClick={onLogin}
                disabled={isLoggingIn}
                className="gsi-material-button inline-flex items-center justify-center bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg px-4 py-2 text-xs font-semibold shadow transition"
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" viewBox="0 0 48 48">
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                  </svg>
                  <span>Sign in with Google</span>
                </div>
              </button>
            </div>
          ) : syncStatus.isConnected ? (
            /* Connected state */
            <div className="space-y-3.5 sm:space-y-4">
              <div className="p-3.5 sm:p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0" />
                    <span className="text-xs sm:text-sm font-bold text-white">Google Sheet Connected</span>
                  </div>
                  {syncStatus.spreadsheetUrl && (
                    <a
                      href={syncStatus.spreadsheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1 text-xs text-emerald-300 hover:text-emerald-200 underline shrink-0"
                    >
                      <span>Open Sheet</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <div className="text-xs space-y-1 text-slate-300 pt-1 border-t border-emerald-500/20">
                  <div>
                    <span className="text-slate-400 font-medium">Sheet:</span>{' '}
                    <strong className="text-slate-100">{syncStatus.spreadsheetTitle || 'Motor Parts Database'}</strong>
                  </div>
                  <div className="truncate">
                    <span className="text-slate-400 font-medium">ID:</span>{' '}
                    <code className="text-[10px] text-emerald-300 bg-emerald-950 px-1 py-0.5 rounded break-all">
                      {syncStatus.spreadsheetId}
                    </code>
                  </div>
                  {syncStatus.lastSyncedAt && (
                    <div>
                      <span className="text-slate-400 font-medium">Last Synced:</span>{' '}
                      <span>{new Date(syncStatus.lastSyncedAt).toLocaleTimeString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Auto Sync Toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <div>
                  <div className="text-xs font-semibold text-white">Live Auto-Sync</div>
                  <div className="text-[11px] text-slate-400">
                    Auto update Google Sheet on every edit
                  </div>
                </div>
                <button
                  onClick={onToggleAutoSync}
                  className="text-amber-400 hover:text-amber-300 transition"
                >
                  {syncStatus.autoSync ? (
                    <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold">
                      Active
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 bg-slate-800 text-slate-400 border border-slate-700 rounded-lg text-xs font-medium">
                      Paused
                    </span>
                  )}
                </button>
              </div>

              {/* Manual Actions: Pull & Push */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  onClick={onPushToSheet}
                  disabled={syncStatus.isSyncing}
                  className="flex items-center justify-center space-x-2 px-3 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-xl text-xs font-semibold transition"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Push {totalParts} Items to Sheet</span>
                </button>

                <button
                  onClick={onPullFromSheet}
                  disabled={syncStatus.isSyncing}
                  className="flex items-center justify-center space-x-2 px-3 py-2.5 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 rounded-xl text-xs font-semibold transition"
                >
                  <DownloadCloud className="w-4 h-4" />
                  <span>Import / Pull from Sheet</span>
                </button>
              </div>

              {/* Disconnect Sheet */}
              <div className="pt-2 text-center">
                <button
                  onClick={onDisconnectSheet}
                  className="text-xs text-rose-400 hover:text-rose-300 underline"
                >
                  Disconnect this Google Sheet
                </button>
              </div>
            </div>
          ) : (
            /* Not connected */
            <div className="space-y-4">
              <div className="flex border-b border-slate-800 text-xs font-semibold">
                <button
                  onClick={() => setActiveTab('create')}
                  className={`pb-2 px-3 sm:px-4 transition ${
                    activeTab === 'create'
                      ? 'border-b-2 border-amber-500 text-amber-400'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Create New Sheet
                </button>
                <button
                  onClick={() => setActiveTab('connect')}
                  className={`pb-2 px-3 sm:px-4 transition ${
                    activeTab === 'connect'
                      ? 'border-b-2 border-amber-500 text-amber-400'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Connect Existing Sheet
                </button>
              </div>

              {activeTab === 'create' ? (
                <div className="space-y-3">
                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-2">
                    <p>
                      We will create a formatted spreadsheet in your Google Drive with columns:
                    </p>
                    <div className="flex flex-wrap gap-1 text-[10px] font-mono">
                      <span className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-300">Part #</span>
                      <span className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-300">Item Name</span>
                      <span className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-300">Brand</span>
                      <span className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-300">SRP Price</span>
                      <span className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-300">Shop Price</span>
                    </div>
                  </div>

                  <button
                    onClick={onCreateNewSheet}
                    disabled={syncStatus.isSyncing}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-600/20 transition"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>
                      {syncStatus.isSyncing ? 'Creating Spreadsheet...' : 'Create & Connect Motor Parts Sheet'}
                    </span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleConnect} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Google Sheet URL or Spreadsheet ID
                    </label>
                    <input
                      type="text"
                      value={inputSheetUrlOrId}
                      onChange={(e) => setInputSheetUrlOrId(e.target.value)}
                      placeholder="Paste https://docs.google.com/spreadsheets/d/... or ID"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-base sm:text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500 font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={syncStatus.isSyncing || !inputSheetUrlOrId.trim()}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs sm:text-sm rounded-xl shadow-md transition disabled:opacity-50"
                  >
                    <LinkIcon className="w-4 h-4" />
                    <span>
                      {syncStatus.isSyncing ? 'Connecting...' : 'Connect Existing Google Sheet'}
                    </span>
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Error Notice */}
          {syncStatus.error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 space-y-2">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <span>{syncStatus.error}</span>
              </div>
              {(syncStatus.error.toLowerCase().includes('google') ||
                syncStatus.error.toLowerCase().includes('authoriz') ||
                syncStatus.error.toLowerCase().includes('sign in') ||
                syncStatus.error.toLowerCase().includes('401')) && (
                <button
                  type="button"
                  onClick={onLogin}
                  disabled={isLoggingIn}
                  className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs shadow transition cursor-pointer"
                >
                  <span>Authorize / Reconnect Google Account</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
