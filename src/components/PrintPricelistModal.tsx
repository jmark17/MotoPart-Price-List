import React, { useState } from 'react';
import { X, Printer, Wrench, FileDown } from 'lucide-react';
import { MotorPart } from '../types/motorPart';
import { formatPHP } from '../utils/formatCurrency';
import { exportPartsPricelistPdf } from '../utils/exportPdf';

interface PrintPricelistModalProps {
  isOpen: boolean;
  onClose: () => void;
  parts: MotorPart[];
}

export const PrintPricelistModal: React.FC<PrintPricelistModalProps> = ({
  isOpen,
  onClose,
  parts,
}) => {
  const [printMode, setPrintMode] = useState<'both' | 'srp-only'>('both');

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleExportPdf = () => {
    exportPartsPricelistPdf(parts, printMode);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col my-auto">
        {/* Modal Controls (Not printed) */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-800 bg-slate-950/80 print:hidden shrink-0">
          <div className="flex items-center space-x-2">
            <Printer className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm sm:text-base font-bold text-white">Printable Pricelist (PHP ₱)</h2>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Toggle print view */}
            <div className="hidden sm:flex items-center bg-slate-900 border border-slate-700 rounded-lg p-0.5 text-xs">
              <button
                onClick={() => setPrintMode('both')}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  printMode === 'both' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                Shop Copy (SRP &amp; Shop)
              </button>
              <button
                onClick={() => setPrintMode('srp-only')}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  printMode === 'srp-only' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                Customer Copy (SRP Only)
              </button>
            </div>

            <button
              onClick={handleExportPdf}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow transition cursor-pointer"
              title="Download official PDF copy"
            >
              <FileDown className="w-4 h-4" />
              <span>Export PDF</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold shadow transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-6 sm:p-8 overflow-y-auto bg-white text-slate-900 print:p-0 flex-1">
          {/* Printable Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-5 flex justify-between items-start">
            <div>
              <div className="flex items-center space-x-2">
                <Wrench className="w-6 h-6 text-slate-900 stroke-[2.5]" />
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 uppercase">
                  Motor Parts Pricelist (PHP)
                </h1>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                {printMode === 'both' ? 'Dealer & Shop Internal Pricelist (Philippine Peso)' : 'Official Retail Pricelist (Philippine Peso)'}
              </p>
            </div>
            <div className="text-right text-xs text-slate-500">
              <div>Date: {new Date().toLocaleDateString('en-PH')}</div>
              <div>Items: {parts.length}</div>
            </div>
          </div>

          {/* Table */}
          <table className="w-full text-left text-xs text-slate-800 border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-900 text-[10px] uppercase font-bold text-slate-700 bg-slate-100">
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Part #</th>
                <th className="py-2.5 px-3">Item Name</th>
                <th className="py-2.5 px-3">Brand</th>
                {printMode === 'both' && <th className="py-2.5 px-3 text-right">Shop Price</th>}
                <th className="py-2.5 px-3 text-right">SRP Price (Dealer)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {parts.map((p, idx) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 text-slate-400 font-mono text-[10px]">{idx + 1}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{p.partNumber}</td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">{p.itemName}</td>
                  <td className="py-2.5 px-3 text-slate-700">{p.brand}</td>
                  {printMode === 'both' && (
                    <td className="py-2.5 px-3 text-right font-medium text-emerald-700">
                      {formatPHP(p.shopPrice)}
                    </td>
                  )}
                  <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                    {formatPHP(p.srpPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer Summary */}
          <div className="mt-8 pt-4 border-t border-slate-300 flex justify-between items-center text-xs text-slate-600">
            <div>All prices in Philippine Peso (PHP ₱). Synchronized real-time with Google Sheet database.</div>
            <div className="text-right font-bold text-slate-900 text-sm">
              Total Items: {parts.length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
