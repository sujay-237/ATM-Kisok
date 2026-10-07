import React, { useState, useEffect } from 'react';
import {
  QrCode,
  Wallet,
  ShieldCheck,
  CreditCard,
  LogOut,
  UserCheck,
  Eye,
  EyeOff,
  Building2,
  ArrowRight,
} from 'lucide-react';
import { MobileUser, DelegationItem } from '../types';
import { mobileApi } from '../services/api';

interface HomeScreenProps {
  user: MobileUser;
  onStartATMScan: () => void;
  onLogout: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  user,
  onStartATMScan,
  onLogout,
}) => {
  const [showBalance, setShowBalance] = useState<boolean>(true);
  const [delegations, setDelegations] = useState<DelegationItem[]>([]);

  useEffect(() => {
    mobileApi.getDelegationsForPhone(user.phone).then((data) => {
      setDelegations(data.filter((d: any) => d.is_active));
    }).catch(console.error);
  }, [user.phone]);

  return (
    <div className="flex-1 flex flex-col justify-between p-5 bg-slate-50 text-slate-900 overflow-y-auto">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between pt-2 mb-5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-700 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              {user.full_name.charAt(0)}
            </div>
            <div>
              <p className="text-[11px] text-slate-500">Welcome,</p>
              <h2 className="text-sm font-bold text-slate-900">{user.full_name}</h2>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-900 transition"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Active Delegation Alert Card */}
        {delegations.length > 0 && (
          <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold flex items-center gap-1.5 text-emerald-800">
                <UserCheck className="w-4 h-4 text-emerald-700" />
                Delegation Authorized
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-800 font-mono">
                READY
              </span>
            </div>
            <p className="text-xs text-slate-600">
              <strong>{delegations[0].delegator_name}</strong> approved you to withdraw up to{' '}
              <strong className="text-emerald-700">₹{delegations[0].remaining_limit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong> at any ATM!
            </p>
          </div>
        )}

        {/* Banking Balance Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-900 to-indigo-900 text-white shadow-md relative overflow-hidden mb-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase font-mono tracking-widest text-blue-200 font-semibold">
              SENTINEL CHECKING
            </span>
            <button
              onClick={() => setShowBalance(!showBalance)}
              className="p-1 rounded text-blue-200 hover:text-white"
            >
              {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex items-baseline space-x-1.5">
            <span className="text-xl font-light text-blue-200">₹</span>
            <span className="text-3xl font-extrabold font-mono tracking-tight">
              {showBalance ? user.account_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '••••••••'}
            </span>
            <span className="text-xs text-blue-200 font-mono">INR</span>
          </div>

          <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-[11px] text-blue-100 font-mono">
            <span>•••• 9012</span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Cardless Protected
            </span>
          </div>
        </div>

        {/* Primary Action Button: Cardless ATM Withdrawal */}
        <div className="space-y-3">
          <button
            onClick={onStartATMScan}
            className="w-full p-4 rounded-2xl bg-blue-700 hover:bg-blue-800 text-white shadow-md transition flex items-center justify-between group"
          >
            <div className="flex items-center space-x-3 text-left">
              <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center">
                <QrCode className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold">Scan ATM QR Code</p>
                <p className="text-xs text-blue-200">Authenticate cardless cash withdrawal</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-white/80 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Security & Features Checklist */}
        <div className="mt-5 bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Biometric Security Status
          </h4>
          <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100">
            <span className="text-slate-600">Facial Baseline</span>
            <span className="font-semibold text-emerald-600">Enrolled (Gemini Vision)</span>
          </div>
          <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100">
            <span className="text-slate-600">Device Biometrics</span>
            <span className="font-semibold text-emerald-600">Fingerprint / Face ID</span>
          </div>
          <div className="flex items-center justify-between text-xs py-1">
            <span className="text-slate-600">Skimmer Protection</span>
            <span className="font-semibold text-blue-700">100% Cardless</span>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="pt-4 text-center text-[11px] text-slate-400 font-sans">
        Sentinel Cardless ATM Network • RBI Regulated
      </div>
    </div>
  );
};
