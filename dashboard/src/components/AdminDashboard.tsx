import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Key,
  Users,
  Activity,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Eye,
  Flag,
  Wifi,
  Sparkles,
  Zap,
  Lock,
  Building2,
  UserCheck,
} from 'lucide-react';
import { Transaction, User, RotatorStatus } from '../types';

export const AdminDashboard: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [rotatorStatus, setRotatorStatus] = useState<RotatorStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [onlyAnomalies, setOnlyAnomalies] = useState<boolean>(false);
  const [wsConnected, setWsConnected] = useState<boolean>(false);

  // Key update inputs
  const [key1, setKey1] = useState('');
  const [key2, setKey2] = useState('');
  const [key3, setKey3] = useState('');
  const [keyUpdateMsg, setKeyUpdateMsg] = useState<string | null>(null);

  // Selected photo preview
  const [viewingPhoto, setViewingPhoto] = useState<{ name: string; url: string } | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [txRes, usersRes, rotRes] = await Promise.all([
        fetch(`http://localhost:8000/api/transactions?limit=100${onlyAnomalies ? '&only_anomalies=true' : ''}`),
        fetch('http://localhost:8000/api/users'),
        fetch('http://localhost:8000/api/gemini/status'),
      ]);

      if (txRes.ok) setTransactions(await txRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
      if (rotRes.ok) setRotatorStatus(await rotRes.json());
    } catch (e) {
      console.error('Error fetching admin data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [onlyAnomalies]);

  // Connect to Admin WebSocket for real-time monitoring
  useEffect(() => {
    let ws: WebSocket;
    try {
      ws = new WebSocket('ws://localhost:8000/ws/admin');
      ws.onopen = () => setWsConnected(true);
      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'KIOSK_SESSION_UPDATE' || payload.type === 'ANOMALY_UPDATED') {
            fetchData();
          }
        } catch (err) {
          console.error(err);
        }
      };
      ws.onclose = () => setWsConnected(false);
      ws.onerror = () => setWsConnected(false);
    } catch (e) {
      console.error(e);
    }

    return () => {
      if (ws) ws.close();
    };
  }, []);

  const handleToggleFlag = async (txId: string, currentFlag: boolean) => {
    try {
      const res = await fetch(`http://localhost:8000/api/transactions/${txId}/flag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anomaly_flag: !currentFlag,
          anomaly_reason: !currentFlag ? 'Manually flagged for fraud audit by Administrator' : null,
        }),
      });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:8000/api/gemini/update-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key1: key1 || undefined,
          key2: key2 || undefined,
          key3: key3 || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setRotatorStatus(data.status);
        setKeyUpdateMsg('Keys updated successfully into Rotator engine.');
        setKey1('');
        setKey2('');
        setKey3('');
        setTimeout(() => setKeyUpdateMsg(null), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleViewUserPhoto = async (u: User) => {
    try {
      const res = await fetch(`http://localhost:8000/api/users/${u.id}/reference-photo`);
      const data = await res.json();
      if (data.reference_selfie) {
        setViewingPhoto({ name: u.full_name, url: data.reference_selfie });
      } else {
        alert('No reference selfie registered for this user.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Telemetry Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-900">
              Security Operations Center
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-mono font-semibold flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-blue-600" /> ADMIN PORTAL
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time biometric fraud mitigation, live audit trails, and multi-key Gemini API rotator telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono">
            <Wifi className={`w-3.5 h-3.5 ${wsConnected ? 'text-emerald-600' : 'text-amber-500'}`} />
            <span className={wsConnected ? 'text-emerald-700 font-semibold' : 'text-amber-600'}>
              {wsConnected ? 'WEBSOCKET ACTIVE' : 'RECONNECTING...'}
            </span>
          </div>
          <button
            onClick={fetchData}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ================= GEMINI 3-KEY ROTATOR MONITOR ================= */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Gemini API Key Rotator & Failover Engine
              </h3>
              <p className="text-xs text-slate-500">Autonomous failover through key pool with rate-limit protection.</p>
            </div>
          </div>
          <span className="text-xs font-mono px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 self-start sm:self-auto">
            Active Slot: <strong className="text-blue-700">KEY_{(rotatorStatus?.current_index ?? 0) + 1}</strong>
          </span>
        </div>

        {/* 3 Key Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {rotatorStatus?.slots.map((slot, idx) => {
            const isCurrentlySelected = rotatorStatus.current_index === idx;
            return (
              <div
                key={slot.key_id}
                className={`p-4 rounded-xl border transition relative ${
                  slot.is_cooling_down
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : isCurrentlySelected
                    ? 'bg-blue-50/70 border-blue-300 text-blue-950 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                {isCurrentlySelected && (
                  <span className="absolute top-2.5 right-2.5 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-700 text-white">
                    ACTIVE ROUTE
                  </span>
                )}

                <div className="flex items-center gap-2 mb-2">
                  <Key className={`w-4 h-4 ${isCurrentlySelected ? 'text-blue-700' : 'text-slate-500'}`} />
                  <span className="text-sm font-bold font-mono text-slate-900">{slot.key_id}</span>
                  <span className="text-[10px] text-slate-500 font-mono">({slot.masked_key})</span>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-200/80 text-center font-mono text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Calls</span>
                    <p className="text-sm font-bold text-slate-900">{slot.total_requests}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Success</span>
                    <p className="text-sm font-bold text-emerald-600">{slot.success_count}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">429 Hits</span>
                    <p className={`text-sm font-bold ${slot.rate_limit_count > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                      {slot.rate_limit_count}
                    </p>
                  </div>
                </div>

                {slot.is_cooling_down ? (
                  <div className="mt-3 p-1.5 rounded-lg bg-rose-100 text-rose-800 text-[11px] font-mono flex items-center justify-between">
                    <span>COOLDOWN ACTIVE</span>
                    <span>{slot.remaining_cooldown_seconds}s</span>
                  </div>
                ) : (
                  <div className="mt-3 text-[11px] font-medium text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Ready for routing
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Update Keys Form */}
        <form onSubmit={handleUpdateKeys} className="mt-5 pt-5 border-t border-slate-100">
          <p className="text-xs font-semibold text-slate-700 mb-2">Configure / Update Gemini API Keys</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="password"
              placeholder="Gemini Key 1"
              value={key1}
              onChange={(e) => setKey1(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
            />
            <input
              type="password"
              placeholder="Gemini Key 2"
              value={key2}
              onChange={(e) => setKey2(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
            />
            <input
              type="password"
              placeholder="Gemini Key 3"
              value={key3}
              onChange={(e) => setKey3(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
            />
          </div>
          <div className="mt-3 flex items-center justify-between">
            {keyUpdateMsg ? (
              <span className="text-xs text-emerald-700 font-medium">{keyUpdateMsg}</span>
            ) : (
              <span className="text-[11px] text-slate-500">Keys are kept secured in backend memory and cycled automatically.</span>
            )}
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs transition"
            >
              Update Keys
            </button>
          </div>
        </form>
      </div>

      {/* ================= REAL-TIME TRANSACTIONS FEED ================= */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Live Kiosk Transaction Audit Trail</h3>
              <p className="text-xs text-slate-500">All ATM withdrawals with real-time biometric risk evaluation.</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setOnlyAnomalies(!onlyAnomalies)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border ${
                onlyAnomalies
                  ? 'bg-rose-50 text-rose-700 border-rose-300'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{onlyAnomalies ? 'Showing Flagged Only' : 'Show All'}</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-y border-slate-200">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Terminal</th>
                <th className="px-4 py-3">User ID</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Fraud Anomaly</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500 font-sans">
                    No transactions recorded in ledger.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {new Date(tx.created_at).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                      {tx.kiosk_id}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {tx.user_id.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-sans">{tx.transaction_type}</td>
                    <td className="px-4 py-3 font-bold text-emerald-600 text-sm">
                      ${tx.amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-sans font-semibold">
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {tx.anomaly_flag ? (
                        <div className="flex items-center gap-1.5 text-rose-600" title={tx.anomaly_reason || ''}>
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span className="text-[11px] truncate max-w-[180px] font-sans font-medium">{tx.anomaly_reason || 'Flagged'}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px] font-sans">Normal</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleToggleFlag(tx.id, tx.anomaly_flag)}
                        className={`p-1.5 rounded-lg border transition ${
                          tx.anomaly_flag
                            ? 'bg-rose-100 border-rose-300 text-rose-700 hover:bg-rose-200'
                            : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'
                        }`}
                        title={tx.anomaly_flag ? 'Clear Anomaly Flag' : 'Flag as Anomaly'}
                      >
                        <Flag className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= REGISTERED USERS DIRECTORY ================= */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Registered Accounts & Biometrics Directory</h3>
            <p className="text-xs text-slate-500">Live records in MongoDB Atlas database (no dummy records).</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {users.map((u) => (
            <div key={u.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {u.role}
                  </span>
                  <span className={`w-2.5 h-2.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                </div>
                <h4 className="text-sm font-bold text-slate-900">{u.full_name}</h4>
                <p className="text-xs text-slate-500 font-mono">@{u.username} • {u.phone}</p>
                
                <div className="mt-3 flex items-baseline justify-between font-mono pt-2 border-t border-slate-200/60">
                  <span className="text-xs text-slate-500 font-sans">Balance:</span>
                  <span className="text-sm font-bold text-emerald-600">${u.account_balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-medium">
                  {u.has_reference_selfie ? 'Baseline: Enrolled' : 'No Photo'}
                </span>
                <button
                  onClick={() => handleViewUserPhoto(u)}
                  className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs text-slate-700 flex items-center gap-1.5 transition"
                >
                  <Eye className="w-3.5 h-3.5 text-blue-700" />
                  <span>Inspect Face</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Face Photo Modal */}
      {viewingPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl text-center">
            <h4 className="text-base font-bold text-slate-900 mb-1">{viewingPhoto.name}</h4>
            <p className="text-xs text-slate-500 mb-4">Registered Gemini Biometric Reference</p>
            <div className="w-48 h-48 rounded-xl overflow-hidden mx-auto border border-slate-200 shadow-inner">
              <img src={viewingPhoto.url} alt={viewingPhoto.name} className="w-full h-full object-cover" />
            </div>
            <button
              onClick={() => setViewingPhoto(null)}
              className="mt-6 px-6 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
