import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

// Shared confirm-cancellation dialog — the backend requires a non-empty reason
// on every booking cancellation, so this is the one place that reason is collected.
const CancelBookingModal = ({ open, onClose, onConfirm, submitting }) => {
  const [reason, setReason] = useState('');

  if (!open) return null;

  const handleConfirm = () => {
    if (!reason.trim()) return;
    onConfirm(reason.trim());
  };

  const close = () => { setReason(''); onClose(); };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-label="Cancel booking">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-scale-in">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Cancel Booking</h3>
          </div>
          <button onClick={close} aria-label="Close" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Reason for cancellation <span className="text-red-500">*</span>
        </label>
        <textarea
          autoFocus
          value={reason}
          onChange={e => setReason(e.target.value)}
          className="input min-h-[90px] resize-none"
          placeholder="e.g. Schedule conflict, weather, no longer needed..."
        />
        <div className="flex gap-3 mt-4">
          <button onClick={handleConfirm} disabled={!reason.trim() || submitting}
            className="btn-primary flex-1 bg-red-600 border-red-600 hover:bg-red-700 disabled:opacity-50">
            {submitting ? 'Cancelling...' : 'Confirm Cancellation'}
          </button>
          <button onClick={close} className="btn-outline flex-1">Keep Booking</button>
        </div>
      </div>
    </div>
  );
};

export default CancelBookingModal;
