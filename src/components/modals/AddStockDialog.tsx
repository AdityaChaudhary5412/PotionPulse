import React, { useState } from 'react';
import { RestockItem } from '../../types';
import api from '../../services/api';
import { ArrowUpRight, X, PackagePlus } from 'lucide-react';

interface AddStockDialogProps {
  isOpen: boolean;
  item: RestockItem | null;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export const AddStockDialog: React.FC<AddStockDialogProps> = ({
  isOpen,
  item,
  onClose,
  onSuccess,
  onError
}) => {
  const [qty, setQty] = useState<string>(item?.reorder_qty ? String(item.reorder_qty) : '10');
  const [note, setNote] = useState<string>('Supplier shipment batch');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedQty = parseFloat(qty);

    if (isNaN(parsedQty) || parsedQty <= 0) {
      setValidationError('Please enter a valid stock quantity greater than 0.');
      return;
    }

    setValidationError(null);
    setSubmitting(true);

    try {
      await api.stock.adjust(item.ingredient_id, {
        qty: parsedQty,
        type: 'restock',
        note: note.trim() || 'Restock batch delivery'
      });
      onSuccess(`Successfully added +${parsedQty} ${item.unit} to ${item.ingredient}.`);
      onClose();
    } catch (err: any) {
      onError(err?.response?.data?.detail || 'Failed to record restock adjustment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md emergent-glass-card bg-surface/95 backdrop-blur-2xl p-6 shadow-2xl space-y-5 rounded-emergent-lg border border-white/10">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-status-safe-bg border border-status-safe-border text-status-safe">
              <PackagePlus className="w-5 h-5 text-status-safe" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Add Stock (Restock)</h3>
              <p className="text-xs text-gray-400">
                Replenish inventory for <strong className="text-status-safe">{item.ingredient}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:text-white hover:bg-surface-subtle transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current status pill */}
        <div className="rounded-xl bg-surface-subtle p-3 flex justify-between items-center text-xs border border-surface-border">
          <span className="text-gray-400">Current On-Hand:</span>
          <span className="font-mono font-bold text-white">
            {item.stock} {item.unit}
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300">
              Quantity to Add ({item.unit}) <span className="text-status-critical">*</span>:
            </label>
            <input
              type="number"
              min="0.1"
              step="any"
              required
              value={qty}
              onChange={(e) => {
                setQty(e.target.value);
                setValidationError(null);
              }}
              placeholder={`Recommended: +${item.reorder_qty || 10}`}
              className="mt-1.5 w-full rounded-xl border border-surface-border bg-surface-subtle p-3 text-sm text-white placeholder-gray-500 focus:border-white/30 focus:outline-none"
            />
            {validationError && (
              <p className="mt-1 text-xs text-status-critical font-medium">{validationError}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300">
              Delivery / Supplier Note:
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Goblin Caravan Delivery, Full Moon harvest"
              className="mt-1.5 w-full rounded-xl border border-surface-border bg-surface-subtle p-3 text-sm text-white placeholder-gray-500 focus:border-white/30 focus:outline-none"
            />
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-2.5 pt-3 border-t border-surface-border">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-xs font-semibold text-gray-300 hover:bg-surface-subtle transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 rounded-xl bg-white text-black px-5 py-2.5 text-xs font-bold shadow-sm hover:bg-gray-100 transition-all active:scale-95 disabled:opacity-50"
            >
              <ArrowUpRight className="w-4 h-4 text-black" />
              <span>{submitting ? 'Adding...' : 'Confirm Restock'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddStockDialog;

