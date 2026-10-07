import React, { useState } from 'react';
import { X, ShieldAlert, Clock, UserCheck, DollarSign, AlertCircle } from 'lucide-react';

interface DelegationModalProps {
  delegatorId: string;
  userBalance: number;
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export const DelegationModal: React.FC<DelegationModalProps> = ({
  delegatorId,
  userBalance,
  isOpen,
  onClose,
  onCreated,
}) => {
  const [delegateeName, setDelegateeName] = useState('');
  const [delegateePhone, setDelegateePhone] = useState('');
  const [limit, setLimit] = useState('150');
  const [hours, setHours] = useState('24');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const limitNum = parseFloat(limit);
    if (isNaN(limitNum) || limitNum <= 0) {
      setError('Please enter a valid positive withdrawal limit.');
      return;
    }
    if (limitNum > userBalance) {
      setError(`Limit exceeds current balance ($${userBalance.toFixed(2)}).`);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await fetch('http://localhost:8000/api/delegations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          delegator_id: delegatorId,
          delegatee_name: delegateeName.trim(),
          delegatee_phone: delegateePhone.trim(),
          max_withdrawal_limit: limitNum,
          duration_hours: parseInt(hours, 10),
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to create delegation');
      }

      onCreated();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error creating delegation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl relative text-slate-900">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">Cardless Delegation</h3>
            <p className="text-xs text-slate-500">
              Grant a family member temporary withdrawal authority without sharing your PIN.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
              Authorized Representative Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Sarah Smith"
              value={delegateeName}
              onChange={(e) => setDelegateeName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
              Representative Mobile Phone
            </label>
            <input
              type="tel"
              required
              placeholder="+1 (555) 987-6543"
              value={delegateePhone}
              onChange={(e) => setDelegateePhone(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                Maximum Limit ($)
              </label>
              <input
                type="number"
                required
                min="1"
                step="10"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                Duration (Hours)
              </label>
              <select
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="1">1 Hour</option>
                <option value="6">6 Hours</option>
                <option value="12">12 Hours</option>
                <option value="24">24 Hours</option>
                <option value="48">48 Hours</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
            >
              {loading ? 'Issuing Permission...' : 'Authorize Delegation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
