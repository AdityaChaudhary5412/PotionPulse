import React, { useState } from 'react';
import { RestockItem } from '../../types';
import api from '../../services/api';
import { ArrowDownRight, X, FlaskConical, AlertTriangle } from 'lucide-react';

interface RecordSaleDialogProps {
  isOpen: boolean;
  item: RestockItem | null;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export const RecordSaleDialog: React.FC<RecordSaleDialogProps> = ({
  isOpen,
  item,
  onClose,
  onSuccess,
  onError
}) => {
  const [qty, setQty] = useState<string>('2');
  const [note, setNote] = useState<string>('Customer potion brew dispense');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen || !item) return null;

  const parsedQty = parseFloat(qty) || 0;
  const remainingAfter = item.stock - parsedQty;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isNaN(parsedQty) || parsedQty <= 0) {
      setValidationError('Please enter a valid quantity greater than 0.');
      return;
    }

    if (parsedQty > item.stock) {
      setValidationError(
        `Insufficient stock: Cannot dispense ${parsedQty} ${item.unit}. Only ${item.stock} ${item.unit} available.`
      );
      return;
    }

    setValidationError(null);
    setSubmitting(true);

    try {
      await api.sales.record({
        ingredient_id: item.ingredient_id,
        qty: parsedQty,
        note: note.trim() || 'Potion brew dispense'
      });
      onSuccess(`Dispensed ${parsedQty} ${item.unit} of ${item.ingredient}. Remaining: ${Math.max(0, remainingAfter)}.`);
      onClose();
    } catch (err: any) {
      onError(err?.response?.data?.detail || 'Failed to record sale movement.');
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
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emergent-cyan/15 border border-emergent-cyan/30 text-emergent-cyan">
              <FlaskConical className="w-5 h-5 text-emergent-cyan" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Record Sale / Brew</h3>
              <p className="text-xs text-gray-400">
                Dispense <strong className="text-gray-200">{item.ingredient}</strong>
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

        {/* Current & projected stock badge */}
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-surface-subtle p-3 text-xs border border-surface-border">
          <div>
            <span className="text-gray-400 block text-[10px] uppercase font-semibold">Current Stock</span>
            <span className="font-mono font-bold text-white">
              {item.stock} {item.unit}
            </span>
          </div>
          <div>
            <span className="text-gray-400 block text-[10px] uppercase font-semibold">After Dispense</span>
            <span className={`font-mono font-bold ${remainingAfter < 0 ? 'text-status-critical' : 'text-emergent-cyan'}`}>
              {remainingAfter.toFixed(1)} {item.unit}
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300">
              Quantity to Dispense ({item.unit}) <span className="text-status-critical">*</span>:
            </label>
            <input
              type="number"
              min="0.1"
              step="any"
              max={item.stock}
              required
              value={qty}
              onChange={(e) => {
                setQty(e.target.value);
                setValidationError(null);
              }}
              placeholder="e.g. 2.0"
              className="mt-1.5 w-full rounded-xl border border-surface-border bg-surface-subtle p-3 text-sm text-white placeholder-gray-500 focus:border-white/30 focus:outline-none font-mono"
            />
            {validationError && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-status-critical font-medium">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{validationError}</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300">
              Potion Brew / Customer Note:
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Invisibility Potion, Fire Breath Draught"
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
              disabled={submitting || parsedQty > item.stock}
              className="flex items-center gap-1.5 rounded-xl bg-white text-black px-5 py-2.5 text-xs font-bold shadow-sm hover:bg-gray-100 transition-all active:scale-95 disabled:opacity-50"
            >
              <ArrowDownRight className="w-4 h-4 text-black" />
              <span>{submitting ? 'Dispensing...' : 'Record Sale'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecordSaleDialog;

