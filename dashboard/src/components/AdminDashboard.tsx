import React, { useState, useEffect, useCallback } from 'react';
import {
  Key,
  Users,
  Activity,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Eye,
  Flag,
  Wifi,
  Zap,
  Unlock,
  Radio,
  Volume2,
  VolumeX,
  XOctagon,
  Flame,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Transaction, User, RotatorStatus, ActiveSession, DuressAlert } from '../types';

export const AdminDashboard: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [rotatorStatus, setRotatorStatus] = useState<RotatorStatus | null>(null);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [duressAlerts, setDuressAlerts] = useState<DuressAlert[]>([]);
  const [audioMuted, setAudioMuted] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [onlyAnomalies, setOnlyAnomalies] = useState<boolean>(false);
  const [wsConnected, setWsConnected] = useState<boolean>(false);

  // Key update inputs
  const [key1, setKey1] = useState('');
  const [key2, setKey2] = useState('');
  const [key3, setKey3] = useState('');
  const [keyUpdateMsg, setKeyUpdateMsg] = useState<string | null>(null);

  // Selected photo preview
  const [, setViewingPhoto] = useState<{ name: string; url: string } | null>(null);

  // Play synthetic Web Audio warning tone for Duress emergencies
  const playEmergencyTone = useCallback(() => {
    if (audioMuted) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.35);

      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.38);
    } catch {
      // Audio context might be restricted before user interaction
    }
  }, [audioMuted]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [txRes, usersRes, rotRes, sessRes] = await Promise.all([
        fetch(`http://localhost:8000/api/transactions?limit=100${onlyAnomalies ? '&only_anomalies=true' : ''}`),
        fetch('http://localhost:8000/api/users'),
        fetch('http://localhost:8000/api/gemini/status'),
        fetch('http://localhost:8000/api/admin/sessions/active'),
      ]);

      if (txRes.ok) setTransactions(await txRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
      if (rotRes.ok) setRotatorStatus(await rotRes.json());
      if (sessRes.ok) setActiveSessions(await sessRes.json());
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

          if (payload.type === 'ACTIVE_SESSIONS_INIT' && Array.isArray(payload.sessions)) {
            setActiveSessions(payload.sessions);
          } else if (payload.type === 'ACTIVE_SESSION_UPDATED' && payload.session) {
            setActiveSessions((prev) => {
              const idx = prev.findIndex((s) => s.session_id === payload.session.session_id);
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = payload.session;
                return next;
              }
              return [payload.session, ...prev];
            });
          } else if (payload.type === 'ACTIVE_SESSION_REMOVED') {
            setActiveSessions((prev) => prev.filter((s) => s.session_id !== payload.session_id));
          } else if (payload.type === 'DURESS_ALERT') {
            playEmergencyTone();
            const alertItem: DuressAlert = {
              kiosk_id: payload.kiosk_id,
              user_id: payload.user_id,
              user_name: payload.user_name,
              decoy_amount: payload.decoy_amount,
              timestamp: payload.timestamp || new Date().toISOString(),
              session_id: payload.session_id,
            };
            setDuressAlerts((prev) => [alertItem, ...prev]);
            fetchData();
          } else if (
            payload.type === 'KIOSK_SESSION_UPDATE' ||
            payload.type === 'ANOMALY_UPDATED' ||
            payload.type === 'USER_UNFROZEN' ||
            payload.type === 'BALANCE_UPDATED' ||
            payload.type === 'TRANSACTION_COMPLETE'
          ) {
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
  }, [playEmergencyTone]);

  const handleTerminateSession = async (sessionId: string) => {
    if (!confirm(`Are you sure you want to terminate ATM Session ${sessionId.slice(0, 8)}...? The terminal will immediately lock out.`)) {
      return;
    }
    try {
      const res = await fetch(`http://localhost:8000/api/admin/sessions/${sessionId}/terminate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Terminated immediately by Security Operations Admin' }),
      });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error('Error terminating session:', e);
    }
  };

  const handleUnfreezeUser = async (userId: string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/admin/users/${userId}/unfreeze`, {
        method: 'POST',
      });
      if (res.ok) {
        setDuressAlerts((prev) => prev.filter((a) => a.user_id !== userId));
        fetchData();
      }
    } catch (e) {
      console.error('Error unfreezing user:', e);
    }
  };

  const handleToggleFlag = async (txId: string, currentFlag: boolean) => {
    try {
      const res = await fetch(`http://localhost:8000/api/transactions/${txId}/flag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anomaly_flag: !currentFlag,
          anomaly_reason: !currentFlag ? 'Manually flagged for audit by Administrator' : null,
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
        setKeyUpdateMsg('Cryptographic key slots updated successfully.');
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
        const win = window.open('', '_blank');
        if (win) {
          win.document.write(`<html><body style="background:#102A22;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><img src="${data.reference_selfie}" style="max-width:90%;max-height:90%;border-radius:16px;border:3px solid #B5935A;" /></body></html>`);
        }
      } else {
        alert('No reference selfie registered for this client.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Helper: Render Circular SVG Risk Score Gauge with Animated strokeDashoffset
  const renderRiskGauge = (score: number) => {
    const radius = 22;
    const circumference = 2 * Math.PI * radius;
    const progress = Math.min(100, Math.max(0, score)) / 100;
    const offset = circumference - progress * circumference;

    let color = '#155E43'; // Emerald (0-39)
    if (score >= 70) color = '#9F1239'; // Bordeaux (70-100)
    else if (score >= 40) color = '#9A6700'; // Ochre (40-69)

    return (
      <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
        <svg className="w-16 h-16 transform -rotate-90">
          <circle
            cx="32"
            cy="32"
            r={radius}
            stroke="#E6E0D4"
            strokeWidth="3.5"
            fill="transparent"
          />
          <motion.circle
            cx="32"
            cy="32"
            r={radius}
            stroke={color}
            strokeWidth="3.5"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] as const }}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
          <span className="text-xs font-bold text-[#171715] tracking-tight tabular-nums">{score}</span>
          <span className="text-[8px] text-[#9A9386] uppercase tracking-tight">RISK</span>
        </div>
      </div>
    );
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.06,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: [0.22, 1, 0.36, 1] as const,
      },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-7 text-[#171715] font-sans"
    >
      {/* ================= DURESS EMERGENCY BANNER ================= */}
      <AnimatePresence>
        {duressAlerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -15, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.98 }}
            className="p-5 rounded-2xl bg-[#FDF2F4] border-2 border-[#9F1239] shadow-md relative overflow-hidden"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-xl bg-[#9F1239] flex items-center justify-center text-[#FAF8F3] shadow-sm shrink-0">
                  <Flame className="w-6 h-6 stroke-[2]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#9F1239]/15 text-[#9F1239] border border-[#9F1239]/30 text-[10px] font-mono font-bold uppercase tracking-wider">
                      CRITICAL DURESS ALERT
                    </span>
                    <span className="text-xs text-[#9F1239] font-mono">
                      {new Date(duressAlerts[0].timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <h3 className="text-lg font-serif font-bold text-[#9F1239] mt-0.5">
                    Silent Duress Panic Protocol Activated!
                  </h3>
                  <p className="text-xs text-[#9F1239]/90 font-mono mt-0.5">
                    Terminal: <strong className="text-[#171715]">{duressAlerts[0].kiosk_id}</strong> • Client: <strong className="text-[#171715]">{duressAlerts[0].user_name}</strong> • Decoy Dispensed: <strong className="text-[#171715]">₹{duressAlerts[0].decoy_amount.toLocaleString('en-IN')}</strong>. Account balance has been locked from further disbursements.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  onClick={() => setAudioMuted(!audioMuted)}
                  className="p-2 rounded-xl bg-white border border-[#F8CBD4] text-[#9F1239] hover:bg-[#FDF2F4] transition text-xs"
                  title={audioMuted ? "Unmute Alarm" : "Mute Alarm"}
                >
                  {audioMuted ? <VolumeX className="w-4 h-4 text-[#9A9386]" /> : <Volume2 className="w-4 h-4 text-[#9F1239]" />}
                </button>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => handleUnfreezeUser(duressAlerts[0].user_id)}
                  className="px-4 py-2.5 rounded-xl bg-[#9F1239] hover:bg-[#881337] text-white font-medium text-xs tracking-wider uppercase shadow-sm transition flex items-center gap-2"
                >
                  <Unlock className="w-4 h-4 text-white" />
                  <span>Acknowledge & Lift Hold</span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Operations Header */}
      <motion.div variants={itemVariants} className="luxury-card rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-3xl font-serif font-semibold text-[#171715] tracking-tight">
              Institutional Security Operations
            </h2>
            <span className="px-3 py-1 rounded-full bg-[#F4EFE4] text-[#B5935A] border border-[#E2D4BC] text-xs font-mono font-semibold flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#B5935A]" /> AUDIT PORTAL
            </span>
          </div>
          <p className="text-xs text-[#666156] mt-1 font-sans">
            Real-time biometric threat surveillance, live risk engine scoring, 1-click terminal kill switch, and multi-slot cryptographic key gateway telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#F5F2EB] border border-[#E6E0D4] text-xs font-mono">
            <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-[#155E43]' : 'bg-[#9A6700]'}`} />
            <Wifi className={`w-3.5 h-3.5 ${wsConnected ? 'text-[#155E43]' : 'text-[#9A6700]'}`} />
            <span className={wsConnected ? 'text-[#155E43] font-semibold' : 'text-[#9A6700] font-semibold'}>
              {wsConnected ? 'LIVE FEED ACTIVE' : 'RECONNECTING'}
            </span>
          </div>

          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={fetchData}
            className="p-2.5 rounded-xl border border-[#E6E0D4] bg-[#FCFBF8] text-[#666156] hover:text-[#171715] hover:bg-[#F5F2EB] shadow-sm transition"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </motion.button>
        </div>
      </motion.div>

      {/* ================= LIVE ACTIVE SESSIONS & THREAT MONITOR ================= */}
      <motion.div variants={itemVariants} className="luxury-card rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F4EFE4] border border-[#E2D4BC] flex items-center justify-center text-[#B5935A]">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-serif font-semibold text-[#171715] flex items-center gap-2">
                <span>Active Concierge Terminals & Live Risk Scoring</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#EBF5F0] text-[#155E43] border border-[#C2E2D3] font-bold">
                  {activeSessions.length} TERMINAL{activeSessions.length === 1 ? '' : 'S'}
                </span>
              </h3>
              <p className="text-xs text-[#666156]">Live terminal session telemetry, AI threat score calculation, and administrative override kill switch.</p>
            </div>
          </div>
        </div>

        {activeSessions.length === 0 ? (
          <div className="py-10 text-center rounded-xl bg-[#F5F2EB]/50 border border-dashed border-[#E6E0D4]">
            <Radio className="w-8 h-8 text-[#9A9386] mx-auto mb-2 opacity-60" />
            <p className="text-base font-serif font-medium text-[#171715]">No Active Terminal Sessions</p>
            <p className="text-xs text-[#666156] mt-1">When a client initiates a cardless withdrawal at a concierge terminal, live risk telemetry will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeSessions.map((s) => (
              <motion.div
                key={s.session_id}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-5 rounded-xl bg-[#FCFBF8] border border-[#E6E0D4] shadow-sm flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-mono uppercase font-bold text-[#B5935A] tracking-wider">
                        TERMINAL #{s.kiosk_id}
                      </span>
                      <h4 className="text-base font-serif font-semibold text-[#171715] mt-0.5">
                        {s.user_name || 'Guest Device Pairing...'}
                      </h4>
                      <p className="text-[11px] text-[#666156] font-mono mt-0.5">
                        Step: <strong className="text-[#171715]">{s.step}</strong>
                      </p>
                    </div>

                    {renderRiskGauge(s.risk_score || 0)}
                  </div>

                  {s.prestaged_amount && (
                    <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FDF6E7] border border-[#F5DEB3] text-[#9A6700] text-[10px] font-mono">
                      <Zap className="w-3 h-3 text-[#9A6700]" />
                      <span>Express Staged: ₹{s.prestaged_amount.toLocaleString('en-IN')}</span>
                    </div>
                  )}

                  {(s.shoulder_surfing_detected || s.disguise_detected) && (
                    <div className="mt-2.5 p-2 rounded-xl bg-[#FDF2F4] border border-[#F8CBD4] text-[#9F1239] text-[11px] flex items-center gap-1.5 font-sans">
                      <AlertTriangle className="w-3.5 h-3.5 text-[#9F1239] shrink-0" />
                      <span>{s.threat_reason || "Surveillance Threat Active"}</span>
                    </div>
                  )}

                  {s.risk_factors && s.risk_factors.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {s.risk_factors.map((f, i) => (
                        <span key={i} className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#F5F2EB] text-[#666156] border border-[#E6E0D4]">
                          {f}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-[#E6E0D4] flex items-center justify-between">
                  <span className="text-[10px] text-[#9A9386] font-mono">
                    Token: {s.session_id.slice(0, 8)}...
                  </span>
                  <motion.button
                    whileTap={{ scale: 0.94 }}
                    onClick={() => handleTerminateSession(s.session_id)}
                    className="px-3 py-1.5 rounded-xl bg-[#FDF2F4] hover:bg-[#FCE7EB] border border-[#F8CBD4] text-[#9F1239] font-medium text-[11px] flex items-center gap-1.5 transition"
                  >
                    <XOctagon className="w-3.5 h-3.5 text-[#9F1239]" />
                    <span>Terminate Session</span>
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* ================= CRYPTOGRAPHIC KEY GATEWAY TELEMETRY ================= */}
      <motion.div variants={itemVariants} className="luxury-card rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F4EFE4] border border-[#E2D4BC] flex items-center justify-center text-[#B5935A]">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-serif font-semibold text-[#171715]">
                Sentinel Cryptographic Key Gateway & Failover Telemetry
              </h3>
              <p className="text-xs text-[#666156]">Autonomous round-robin failover with rate-limit cooldown management.</p>
            </div>
          </div>
          <span className="text-xs font-mono px-3.5 py-1.5 rounded-full bg-[#F4EFE4] text-[#B5935A] border border-[#E2D4BC] self-start sm:self-auto font-medium">
            Active Slot: <strong className="text-[#102A22]">KEY_{(rotatorStatus?.current_index ?? 0) + 1}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {rotatorStatus?.slots.map((slot, idx) => {
            const isCurrentlySelected = rotatorStatus.current_index === idx;
            return (
              <div
                key={slot.key_id}
                className={`p-5 rounded-xl border transition-all relative ${
                  slot.is_cooling_down
                    ? 'bg-[#FDF2F4] border-[#F8CBD4] text-[#9F1239]'
                    : isCurrentlySelected
                    ? 'bg-[#FCFBF8] border-[#B5935A] shadow-sm ring-1 ring-[#B5935A]/30'
                    : 'bg-[#F5F2EB]/50 border-[#E6E0D4] text-[#666156]'
                }`}
              >
                {isCurrentlySelected && (
                  <span className="absolute top-3 right-3 text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#102A22] text-[#FAF8F3]">
                    ACTIVE ROUTE
                  </span>
                )}

                <div className="flex items-center gap-2 mb-2">
                  <Key className={`w-4 h-4 ${isCurrentlySelected ? 'text-[#B5935A]' : 'text-[#9A9386]'}`} />
                  <span className="text-sm font-bold font-mono text-[#171715]">{slot.key_id}</span>
                  <span className="text-[10px] text-[#9A9386] font-mono">({slot.masked_key})</span>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-[#E6E0D4] text-center font-mono text-xs">
                  <div>
                    <span className="text-[9px] text-[#9A9386] uppercase block">Calls</span>
                    <p className="text-sm font-bold text-[#171715] mt-0.5 tabular-nums">{slot.total_requests}</p>
                  </div>
                  <div>
                    <span className="text-[9px] text-[#9A9386] uppercase block">Success</span>
                    <p className="text-sm font-bold text-[#155E43] mt-0.5 tabular-nums">{slot.success_count}</p>
                  </div>
                  <div>
                    <span className="text-[9px] text-[#9A9386] uppercase block">Rate Hits</span>
                    <p className={`text-sm font-bold mt-0.5 tabular-nums ${slot.rate_limit_count > 0 ? 'text-[#9F1239]' : 'text-[#666156]'}`}>
                      {slot.rate_limit_count}
                    </p>
                  </div>
                </div>

                {slot.is_cooling_down ? (
                  <div className="mt-4 p-2 rounded-lg bg-[#FCE7EB] text-[#9F1239] text-[11px] font-mono flex items-center justify-between border border-[#F8CBD4]">
                    <span>COOLDOWN ACTIVE</span>
                    <span>{slot.remaining_cooldown_seconds}s</span>
                  </div>
                ) : (
                  <div className="mt-4 text-[11px] font-medium text-[#155E43] flex items-center gap-1.5 font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#155E43]" /> Ready for routing
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <form onSubmit={handleUpdateKeys} className="mt-6 pt-5 border-t border-[#E6E0D4]">
          <p className="text-xs font-semibold text-[#171715] mb-2.5 font-serif">Configure / Update Cryptographic Keys</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="password"
              placeholder="API Key Slot 1"
              value={key1}
              onChange={(e) => setKey1(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl bg-[#F5F2EB] border border-[#E6E0D4] text-xs text-[#171715] focus:outline-none focus:border-[#B5935A] font-mono"
            />
            <input
              type="password"
              placeholder="API Key Slot 2"
              value={key2}
              onChange={(e) => setKey2(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl bg-[#F5F2EB] border border-[#E6E0D4] text-xs text-[#171715] focus:outline-none focus:border-[#B5935A] font-mono"
            />
            <input
              type="password"
              placeholder="API Key Slot 3"
              value={key3}
              onChange={(e) => setKey3(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl bg-[#F5F2EB] border border-[#E6E0D4] text-xs text-[#171715] focus:outline-none focus:border-[#B5935A] font-mono"
            />
          </div>
          <div className="mt-3.5 flex items-center justify-between">
            {keyUpdateMsg ? (
              <span className="text-xs text-[#155E43] font-medium font-mono">{keyUpdateMsg}</span>
            ) : (
              <span className="text-[11px] text-[#9A9386]">Keys are encrypted in memory and rotated dynamically.</span>
            )}
            <motion.button
              whileTap={{ scale: 0.96 }}
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#102A22] hover:bg-[#193D32] text-[#FAF8F3] font-medium text-xs tracking-wider uppercase transition shadow-sm"
            >
              Update Key Slots
            </motion.button>
          </div>
        </form>
      </motion.div>

      {/* ================= REAL-TIME TRANSACTIONS FEED ================= */}
      <motion.div variants={itemVariants} className="luxury-card rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F4EFE4] border border-[#E2D4BC] flex items-center justify-center text-[#B5935A]">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-serif font-semibold text-[#171715]">Institutional Transaction Audit Trail</h3>
              <p className="text-xs text-[#666156]">Secure ledger records with real-time threat scores & anomaly flags.</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setOnlyAnomalies(!onlyAnomalies)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition border ${
                onlyAnomalies
                  ? 'bg-[#FDF2F4] text-[#9F1239] border-[#F8CBD4]'
                  : 'bg-[#FCFBF8] text-[#666156] border-[#E6E0D4] hover:bg-[#F5F2EB]'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-[#9F1239]" />
              <span>{onlyAnomalies ? 'Flagged / Duress Only' : 'Show All Audit Ledger'}</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-[#F5F2EB] text-[#666156] uppercase font-mono tracking-wider border-y border-[#E6E0D4]">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Terminal</th>
                <th className="px-4 py-3">Client Ref</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Threat Score</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Audit Review</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E0D4]/70 font-mono">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-[#9A9386] font-sans">
                    No transactions recorded in institutional audit ledger.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const score = tx.risk_score ?? 0;
                  const isHighRisk = score >= 70 || tx.is_duress;
                  const isMedRisk = score >= 40 && score < 70;

                  return (
                    <tr key={tx.id} className="hover:bg-[#F5F2EB]/50 transition">
                      <td className="px-4 py-3.5 text-[#666156] whitespace-nowrap">
                        {new Date(tx.created_at).toLocaleTimeString()}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-[#171715] whitespace-nowrap font-mono">
                        {tx.kiosk_id}
                      </td>
                      <td className="px-4 py-3.5 text-[#666156] whitespace-nowrap">
                        {tx.user_id.slice(0, 8)}...
                      </td>
                      <td className="px-4 py-3.5 text-[#666156] font-sans">{tx.transaction_type}</td>
                      <td className="px-4 py-3.5 font-bold text-[#102A22] text-sm whitespace-nowrap tabular-nums">
                        ₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold tabular-nums ${
                          isHighRisk
                            ? 'bg-[#FDF2F4] text-[#9F1239] border border-[#F8CBD4]'
                            : isMedRisk
                            ? 'bg-[#FDF6E7] text-[#9A6700] border border-[#F5DEB3]'
                            : 'bg-[#EBF5F0] text-[#155E43] border border-[#C2E2D3]'
                        }`}>
                          {score} / 100
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="px-2.5 py-0.5 rounded-full bg-[#EBF5F0] text-[#155E43] border border-[#C2E2D3] text-[10px] font-sans font-semibold">
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {tx.is_duress ? (
                          <span className="px-2 py-0.5 rounded-full bg-[#FCE7EB] text-[#9F1239] border border-[#F8CBD4] text-[10px] font-bold font-mono flex items-center gap-1 w-fit">
                            <Flame className="w-3 h-3 text-[#9F1239]" /> DURESS PROTOCOL
                          </span>
                        ) : tx.anomaly_flag ? (
                          <div className="flex items-center gap-1.5 text-[#9F1239] font-sans" title={tx.anomaly_reason || ''}>
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-[#9F1239]" />
                            <span className="text-[11px] truncate max-w-[160px]">{tx.anomaly_reason || 'Flagged'}</span>
                          </div>
                        ) : (
                          <span className="text-[#9A9386] text-[11px] font-sans">Normal</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => handleToggleFlag(tx.id, tx.anomaly_flag)}
                          className={`p-1.5 rounded-lg border transition ${
                            tx.anomaly_flag
                              ? 'bg-[#FDF2F4] border-[#F8CBD4] text-[#9F1239]'
                              : 'bg-white border-[#E6E0D4] text-[#9A9386] hover:text-[#171715]'
                          }`}
                          title={tx.anomaly_flag ? 'Clear Anomaly Flag' : 'Flag for Audit'}
                        >
                          <Flag className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* ================= REGISTERED CLIENTS DIRECTORY ================= */}
      <motion.div variants={itemVariants} className="luxury-card rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#F4EFE4] border border-[#E2D4BC] flex items-center justify-center text-[#B5935A]">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-serif font-semibold text-[#171715]">Private Client Accounts Directory</h3>
            <p className="text-xs text-[#666156]">Enrolled client profiles with biometric identity baselines and security hold controls.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {users.map((u) => (
            <div key={u.id} className="p-5 rounded-xl border border-[#E6E0D4] bg-[#FCFBF8] shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                    u.role === 'admin' ? 'bg-[#F4EFE4] text-[#B5935A] border border-[#E2D4BC]' : 'bg-[#EBF5F0] text-[#155E43] border border-[#C2E2D3]'
                  }`}>
                    {u.role}
                  </span>
                  <div className="flex items-center gap-2">
                    {u.account_frozen_duress ? (
                      <span className="px-2 py-0.5 rounded-full bg-[#FDF2F4] text-[#9F1239] border border-[#F8CBD4] text-[9px] font-mono font-bold">
                        HOLD ACTIVE
                      </span>
                    ) : null}
                    <span className={`w-2 h-2 rounded-full ${u.is_active ? 'bg-[#155E43]' : 'bg-[#9F1239]'}`} />
                  </div>
                </div>

                <h4 className="text-base font-serif font-semibold text-[#171715]">{u.full_name}</h4>
                <p className="text-xs text-[#666156] font-mono mt-0.5">@{u.username} • {u.phone}</p>
                
                <div className="mt-3.5 flex items-baseline justify-between font-mono pt-2.5 border-t border-[#E6E0D4]">
                  <span className="text-xs text-[#666156] font-sans">Reserve Balance:</span>
                  <span className="text-sm font-bold text-[#102A22] tabular-nums">
                    ₹{u.account_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#E6E0D4] flex items-center justify-between gap-2">
                <span className="text-[11px] text-[#9A9386] font-mono">
                  {u.has_reference_selfie ? 'Baseline: Enrolled' : 'No Photo'}
                </span>

                <div className="flex items-center gap-2">
                  {u.account_frozen_duress && (
                    <button
                      onClick={() => handleUnfreezeUser(u.id)}
                      className="px-2.5 py-1 rounded-lg bg-[#FDF2F4] hover:bg-[#FCE7EB] border border-[#F8CBD4] text-[11px] font-semibold text-[#9F1239] transition"
                    >
                      Lift Hold
                    </button>
                  )}
                  <button
                    onClick={() => handleViewUserPhoto(u)}
                    className="px-3 py-1.5 rounded-lg border border-[#E6E0D4] bg-[#F5F2EB] hover:bg-[#EBE6DB] text-xs text-[#171715] flex items-center gap-1.5 transition"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#B5935A]" />
                    <span>Inspect</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};
