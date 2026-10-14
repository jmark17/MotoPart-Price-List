import React, { useState, useEffect } from 'react';
import { X, Sparkles, AlertCircle } from 'lucide-react';
import { MotorPart } from '../types/motorPart';
import { formatPHP } from '../utils/formatCurrency';

interface PartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (part: MotorPart) => void;
  editingPart?: MotorPart | null;
  sheetConnected: boolean;
}

export const PartModal: React.FC<PartModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingPart,
  sheetConnected,
}) => {
  const [formData, setFormData] = useState<Partial<MotorPart>>({
    partNumber: '',
    itemName: '',
    brand: '',
    srpPrice: 0,
    shopPrice: 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editingPart) {
      setFormData({ ...editingPart });
    } else {
      setFormData({
        partNumber: `PT-${Math.floor(1000 + Math.random() * 9000)}`,
        itemName: '',
        brand: '',
        srpPrice: 0,
        shopPrice: 0,
      });
    }
    setErrors({});
  }, [editingPart, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.partNumber?.trim()) errs.partNumber = 'Part # is required';
    if (!formData.itemName?.trim()) errs.itemName = 'Item Name is required';
    if (!formData.brand?.trim()) errs.brand = 'Brand is required';
    if (formData.srpPrice === undefined || formData.srpPrice < 0) {
      errs.srpPrice = 'SRP Price must be a valid number';
    }
    if (formData.shopPrice === undefined || formData.shopPrice < 0) {
      errs.shopPrice = 'Shop Price must be a valid number';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const finalPart: MotorPart = {
      id: editingPart?.id || `part-${Date.now()}`,
      partNumber: formData.partNumber!.trim(),
      itemName: formData.itemName!.trim(),
      brand: formData.brand!.trim().toUpperCase(),
      srpPrice: Number(formData.srpPrice) || 0,
      shopPrice: Number(formData.shopPrice) || 0,
      updatedAt: new Date().toISOString(),
    };

    onSave(finalPart);
  };

  const handleGeneratePartNum = () => {
    const prefix = (formData.brand || 'PRT').substring(0, 3).toUpperCase();
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    setFormData((prev) => ({ ...prev, partNumber: `${prefix}-${randomDigits}` }));
  };

  const srp = Number(formData.srpPrice) || 0;
  const shop = Number(formData.shopPrice) || 0;
  const margin = srp - shop;
  const marginPercent = shop > 0 ? ((margin / shop) * 100).toFixed(1) : '0';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden max-h-[94vh] flex flex-col my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-800 bg-slate-950/80 shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white">
              {editingPart ? 'Edit Item' : 'Add New Item'}
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-400">
              {sheetConnected
                ? 'Updates your connected Google Sheet database in real time'
                : 'Pricelist catalog entry'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-4 sm:p-6 space-y-3.5 sm:space-y-4 flex-1">
          {/* Part # */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                Part # *
              </label>
              <button
                type="button"
                onClick={handleGeneratePartNum}
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center space-x-1"
              >
                <Sparkles className="w-3 h-3" />
                <span>Auto-generate</span>
              </button>
            </div>
            <input
              type="text"
              value={formData.partNumber || ''}
              onChange={(e) => setFormData({ ...formData, partNumber: e.target.value })}
              placeholder="e.g. BRM-110C74010 or NGK-6289"
              className={`w-full bg-slate-950 border ${
                errors.partNumber ? 'border-red-500' : 'border-slate-700'
              } rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-white placeholder-slate-500 outline-none focus:border-amber-500 font-mono`}
            />
            {errors.partNumber && (
              <p className="text-xs text-red-400 mt-1">{errors.partNumber}</p>
            )}
          </div>

          {/* Item Name */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Item Name *
            </label>
            <input
              type="text"
              value={formData.itemName || ''}
              onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
              placeholder="e.g. Brembo RCS 19 Corsa Corta Radial Master Cylinder"
              className={`w-full bg-slate-950 border ${
                errors.itemName ? 'border-red-500' : 'border-slate-700'
              } rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-white placeholder-slate-500 outline-none focus:border-amber-500`}
            />
            {errors.itemName && (
              <p className="text-xs text-red-400 mt-1">{errors.itemName}</p>
            )}
          </div>

          {/* Brand */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Brand *
            </label>
            <input
              type="text"
              value={formData.brand || ''}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value.toUpperCase() })}
              placeholder="e.g. BREMBO, AKRAPOVIC, OHLINS, NGK, D.I.D, MOTUL..."
              className={`w-full bg-slate-950 border ${
                errors.brand ? 'border-red-500' : 'border-slate-700'
              } rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-white uppercase placeholder-slate-500 outline-none focus:border-amber-500`}
            />
            {errors.brand && (
              <p className="text-xs text-red-400 mt-1">{errors.brand}</p>
            )}
          </div>

          {/* Pricing in PHP ₱ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* SRP Price (Dealer) */}
            <div>
              <label className="block text-[11px] font-semibold text-amber-400 uppercase tracking-wider mb-1">
                SRP Price (Dealer) *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-amber-400/90 text-sm font-bold">
                  ₱
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.srpPrice ?? ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      srpPrice: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="0.00"
                  className={`w-full pl-8 pr-3 py-2.5 bg-slate-950 border ${
                    errors.srpPrice ? 'border-red-500' : 'border-slate-700'
                  } rounded-xl text-base sm:text-sm text-amber-300 font-bold outline-none focus:border-amber-500`}
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">Dealer Selling / Retail Price</p>
              {errors.srpPrice && (
                <p className="text-xs text-red-400 mt-1">{errors.srpPrice}</p>
              )}
            </div>

            {/* Shop Price */}
            <div>
              <label className="block text-[11px] font-semibold text-emerald-400 uppercase tracking-wider mb-1">
                Shop Price (PHP) *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-emerald-400/90 text-sm font-bold">
                  ₱
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.shopPrice ?? ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      shopPrice: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="0.00"
                  className={`w-full pl-8 pr-3 py-2.5 bg-slate-950 border ${
                    errors.shopPrice ? 'border-red-500' : 'border-slate-700'
                  } rounded-xl text-base sm:text-sm text-emerald-300 font-bold outline-none focus:border-emerald-500`}
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">Shop Price (Wholesale Cost)</p>
              {errors.shopPrice && (
                <p className="text-xs text-red-400 mt-1">{errors.shopPrice}</p>
              )}
            </div>
          </div>

          {/* Live Shop Price Margin Preview */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-300 font-semibold block">Shop Price Margin:</span>
              <span className="text-[10px] text-slate-500">SRP - Shop Price</span>
            </div>
            <span className="font-bold text-emerald-400 text-sm sm:text-base">
              +{formatPHP(margin)} ({marginPercent}%)
            </span>
          </div>

          {/* Google Sheet Sync Notice */}
          {sheetConnected && (
            <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3 flex items-start space-x-2 text-xs text-emerald-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              <span>
                <strong>Live Sync Active:</strong> Changes in Philippine Peso (PHP) will update directly in your Google Sheet.
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs sm:text-sm font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-orange-500/20 transition-all transform active:scale-95"
            >
              {editingPart ? 'Save Changes' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
