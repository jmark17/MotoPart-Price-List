import React from 'react';
import { Edit2, Trash2, AlertTriangle, Calculator } from 'lucide-react';
import { MotorPart } from '../types/motorPart';
import { formatPHP } from '../utils/formatCurrency';

interface PartsGridProps {
  parts: MotorPart[];
  onEdit: (part: MotorPart) => void;
  onDelete: (part: MotorPart) => void;
  onAddToWholesale?: (part: MotorPart) => void;
  wholesalePartIds?: Set<string>;
}

export const PartsGrid: React.FC<PartsGridProps> = ({
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
    <div className="p-3 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
      {parts.map((part) => {
        const margin = part.srpPrice - part.shopPrice;
        const marginPercent =
          part.shopPrice > 0 ? ((margin / part.shopPrice) * 100).toFixed(0) : '0';

        return (
          <div
            key={part.id}
            className="bg-slate-900/90 rounded-2xl border border-slate-800 hover:border-slate-700 hover:shadow-xl hover:shadow-black/40 transition-all flex flex-col justify-between p-4 group"
          >
            <div>
              {/* Top Row: Part # & Brand */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                  {part.partNumber}
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                  {part.brand}
                </span>
              </div>

              {/* Item Name */}
              <h3 className="font-bold text-slate-100 text-sm sm:text-base leading-snug group-hover:text-amber-400 transition-colors mt-1">
                {part.itemName}
              </h3>
            </div>

            {/* Bottom Row: Pricing & Actions */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-end justify-between">
              <div>
                <div className="flex items-baseline space-x-2">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-amber-500/90">Dealer (SRP)</div>
                    <div className="text-base sm:text-lg font-black text-amber-400">
                      {formatPHP(part.srpPrice)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-emerald-500/90">Shop Price</div>
                    <div className="text-sm sm:text-base font-bold text-emerald-400">
                      {formatPHP(part.shopPrice)}
                    </div>
                  </div>
                </div>

                {margin > 0 && (
                  <div className="text-[10px] font-semibold text-emerald-400 mt-1">
                    +{formatPHP(margin)} ({marginPercent}%) Shop Price Margin
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-1 shrink-0">
                {onAddToWholesale && (
                  <button
                    onClick={() => onAddToWholesale(part)}
                    className={`px-2 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 active:scale-95 ${
                      wholesalePartIds.has(part.id)
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-800 text-amber-400 hover:bg-slate-700'
                    }`}
                    title="Add to Wholesale Estimate"
                  >
                    <Calculator className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>{wholesalePartIds.has(part.id) ? 'Added' : 'Wholesale'}</span>
                  </button>
                )}
                <button
                  onClick={() => onEdit(part)}
                  className="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition"
                  title="Edit Part"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(part)}
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
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
  );
};
