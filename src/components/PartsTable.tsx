import React from 'react';
import { Edit2, Trash2, AlertTriangle, Calculator } from 'lucide-react';
import { MotorPart } from '../types/motorPart';
import { formatPHP } from '../utils/formatCurrency';

interface PartsTableProps {
  parts: MotorPart[];
  onEdit: (part: MotorPart) => void;
  onDelete: (part: MotorPart) => void;
  onAddToWholesale?: (part: MotorPart) => void;
  wholesalePartIds?: Set<string>;
}

export const PartsTable: React.FC<PartsTableProps> = ({
  parts,
  onEdit,
  onDelete,
  onAddToWholesale,
  wholesalePartIds = new Set(),
}) => {
  if (parts.length === 0) {
    return (
      <div className="text-center py-12 sm:py-16 px-4 bg-slate-900/50 rounded-2xl border border-slate-800 m-3 sm:m-6">
        <AlertTriangle className="w-8 h-8 sm:w-10 sm:h-10 text-amber-500/80 mx-auto mb-2.5" />
        <h3 className="text-base font-semibold text-slate-200">No parts found</h3>
        <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-md mx-auto">
          No parts match your current search query or brand filter.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Mobile-Optimized List View (< md) */}
      <div className="block md:hidden divide-y divide-slate-800/80 bg-slate-900/40">
        {parts.map((part) => {
          const margin = part.srpPrice - part.shopPrice;
          const marginPercent =
            part.shopPrice > 0 ? ((margin / part.shopPrice) * 100).toFixed(0) : '0';

          return (
            <div
              key={part.id}
              className="p-3.5 hover:bg-slate-900 transition-colors flex flex-col gap-2"
            >
              {/* Top Row: Part # & Brand & Prices */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                    {part.partNumber}
                  </span>
                  <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wide bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    {part.brand}
                  </span>
                </div>

                {/* Mobile Pricing Badge (PHP) */}
                <div className="text-right shrink-0">
                  <div className="text-sm font-extrabold text-amber-400">
                    {formatPHP(part.srpPrice)}{' '}
                    <span className="text-[10px] text-amber-500/90 font-bold uppercase">Dealer (SRP)</span>
                  </div>
                  <div className="text-xs font-bold text-emerald-400">
                    {formatPHP(part.shopPrice)}{' '}
                    <span className="text-[9px] text-emerald-500/90 font-bold uppercase">Shop Price</span>
                  </div>
                </div>
              </div>

              {/* Item Name */}
              <div className="font-bold text-slate-100 text-sm leading-snug">
                {part.itemName}
              </div>

              {/* Bottom Row: Shop Price Margin info & Actions */}
              <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/50 mt-0.5">
                <div>
                  {margin > 0 ? (
                    <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                      +{formatPHP(margin)} ({marginPercent}%) Shop Price Margin
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-500 font-medium">Standard</span>
                  )}
                </div>

                <div className="flex items-center space-x-1">
                  {onAddToWholesale && (
                    <button
                      onClick={() => onAddToWholesale(part)}
                      className={`px-2 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 active:scale-95 ${
                        wholesalePartIds.has(part.id)
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-slate-800/80 text-amber-400 hover:bg-slate-700'
                      }`}
                      title="Add to Wholesale Estimate"
                    >
                      <Calculator className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>{wholesalePartIds.has(part.id) ? 'Added' : '+ Wholesale'}</span>
                    </button>
                  )}
                  <button
                    onClick={() => onEdit(part)}
                    className="p-2 text-slate-400 hover:text-amber-400 bg-slate-800/60 hover:bg-slate-800 rounded-lg transition active:scale-95"
                    title="Edit Part"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(part)}
                    className="p-2 text-slate-400 hover:text-rose-400 bg-slate-800/60 hover:bg-slate-800 rounded-lg transition active:scale-95"
                    title="Delete Part"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Multi-Column Table View (>= md) */}
      <div className="hidden md:block overflow-x-auto border-t border-slate-800">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-950/90 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800 font-semibold sticky top-0">
            <tr>
              <th className="py-3.5 px-4 sm:px-6">Part #</th>
              <th className="py-3.5 px-4">Item Name</th>
              <th className="py-3.5 px-4">Brand</th>
              <th className="py-3.5 px-4 text-right">Shop Price</th>
              <th className="py-3.5 px-4 text-right">SRP Price (Dealer)</th>
              <th className="py-3.5 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 bg-slate-900/60">
            {parts.map((part) => {
              const margin = part.srpPrice - part.shopPrice;
              const marginPercent =
                part.shopPrice > 0 ? ((margin / part.shopPrice) * 100).toFixed(0) : '0';

              return (
                <tr
                  key={part.id}
                  className="hover:bg-slate-800/50 transition-colors group"
                >
                  {/* Part # */}
                  <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap">
                    <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                      {part.partNumber}
                    </span>
                  </td>

                  {/* Item Name */}
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-100 group-hover:text-amber-400 transition-colors">
                      {part.itemName}
                    </div>
                  </td>

                  {/* Brand */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="font-medium text-slate-200 bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-700">
                      {part.brand}
                    </span>
                  </td>

                  {/* Shop Price */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="text-sm font-bold text-emerald-400">
                      {formatPHP(part.shopPrice)}
                    </div>
                    <div className="text-[10px] text-slate-400">Shop Price</div>
                  </td>

                  {/* SRP Price (Dealer) */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="text-base font-extrabold text-amber-400">
                      {formatPHP(part.srpPrice)}
                    </div>
                    {margin > 0 && (
                      <div className="text-[10px] font-semibold text-emerald-400">
                        +{formatPHP(margin)} ({marginPercent}%) Shop Price Margin
                      </div>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center space-x-1">
                      {onAddToWholesale && (
                        <button
                          onClick={() => onAddToWholesale(part)}
                          className={`px-2 py-1 rounded-md text-xs font-bold transition flex items-center gap-1 active:scale-95 ${
                            wholesalePartIds.has(part.id)
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-slate-800 text-amber-400 hover:bg-slate-700'
                          }`}
                          title="Add to Wholesale Estimate"
                        >
                          <Calculator className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span className="hidden lg:inline">{wholesalePartIds.has(part.id) ? 'Added' : 'Wholesale'}</span>
                        </button>
                      )}
                      <button
                        onClick={() => onEdit(part)}
                        className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition"
                        title="Edit Part"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDelete(part)}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition"
                        title="Delete Part"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
