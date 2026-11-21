import React, { useState } from 'react';
import { X, UserCheck, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

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
  const [limit, setLimit] = useState('1000');
  const [hours, setHours] = useState('24');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const limitNum = parseFloat(limit);
    if (isNaN(limitNum) || limitNum <= 0) {
      setError('Please specify a valid withdrawal cap.');
      return;
    }
    if (limitNum > userBalance) {
      setError(`Cap exceeds available reserve (₹${userBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}).`);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#171715]/40 backdrop-blur-sm text-[#171715] font-sans">
      <div className="w-full max-w-lg luxury-card rounded-2xl p-7 shadow-xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-[#9A9386] hover:text-[#171715] hover:bg-[#F5F2EB] transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3.5 mb-6">
          <div className="w-12 h-12 rounded-xl bg-[#F4EFE4] border border-[#E2D4BC] flex items-center justify-center text-[#B5935A]">
            <UserCheck className="w-6 h-6 stroke-[1.8]" />
          </div>
          <div>
            <h3 className="text-2xl font-serif font-semibold text-[#171715]">Authorize Client Representative</h3>
            <p className="text-xs text-[#666156] mt-0.5">
              Grant a family member or private fiduciary cardless terminal withdrawal authority.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-[#FDF2F4] border border-[#F8CBD4] text-[#9F1239] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#9F1239]" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono font-medium text-[#666156] uppercase tracking-wider mb-1.5">
              Authorized Representative Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Sarah Smith"
              value={delegateeName}
              onChange={(e) => setDelegateeName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[#F5F2EB] border border-[#E6E0D4] text-[#171715] text-sm focus:outline-none focus:border-[#B5935A]"
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-medium text-[#666156] uppercase tracking-wider mb-1.5">
              Representative Mobile Phone
            </label>
            <input
              type="tel"
              required
              placeholder="+91 98765 43210"
              value={delegateePhone}
              onChange={(e) => setDelegateePhone(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[#F5F2EB] border border-[#E6E0D4] text-[#171715] text-sm font-mono focus:outline-none focus:border-[#B5935A]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono font-medium text-[#666156] uppercase tracking-wider mb-1.5">
                Maximum Limit Cap (₹)
              </label>
              <input
                type="number"
                required
                min="100"
                step="100"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F5F2EB] border border-[#E6E0D4] text-[#171715] text-sm font-mono focus:outline-none focus:border-[#B5935A]"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-medium text-[#666156] uppercase tracking-wider mb-1.5">
                Authorization Validity
              </label>
              <select
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F5F2EB] border border-[#E6E0D4] text-[#171715] text-sm focus:outline-none focus:border-[#B5935A]"
              >
                <option value="1">1 Hour</option>
                <option value="6">6 Hours</option>
                <option value="12">12 Hours</option>
                <option value="24">24 Hours (Standard)</option>
                <option value="48">48 Hours</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E6E0D4] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[#E6E0D4] text-[#666156] text-xs font-medium hover:bg-[#F5F2EB] transition"
            >
              Cancel
            </button>
            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-[#102A22] hover:bg-[#193D32] text-[#FAF8F3] text-xs font-medium tracking-wider uppercase shadow-sm transition disabled:opacity-50"
            >
              {loading ? 'Authorizing...' : 'Authorize Representative'}
            </motion.button>
          </div>
        </form>
      </div>
    </div>
  );
};
