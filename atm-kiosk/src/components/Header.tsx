import React, { useEffect, useState } from 'react';
import { Landmark, Wifi, Clock, Shield } from 'lucide-react';

interface HeaderProps {
  kioskId: string;
  wsConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({ kioskId, wsConnected }) => {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="w-full bg-white border-b border-slate-200 px-8 py-4 shadow-sm flex items-center justify-between">
      {/* Bank Brand & Terminal Info */}
      <div className="flex items-center space-x-3.5">
        <div className="w-11 h-11 rounded-xl bg-blue-700 flex items-center justify-center text-white shadow-sm">
          <Landmark className="w-6 h-6 stroke-[2]" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-lg font-bold tracking-tight text-slate-900">
              NATIONAL TRUST BANK
            </h1>
            <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
              ATM #{kioskId}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Contactless Mobile Banking Terminal
          </p>
        </div>
      </div>

      {/* Status Badges */}
      <div className="flex items-center space-x-5">
        <div className="hidden sm:flex items-center space-x-1.5 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
          <Shield className="w-3.5 h-3.5 text-blue-600" />
          <span>Biometric Protection</span>
        </div>

        <div className="flex items-center space-x-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border bg-slate-50 border-slate-200">
          <Wifi className={`w-3.5 h-3.5 ${wsConnected ? 'text-emerald-600' : 'text-amber-500'}`} />
          <span className={wsConnected ? 'text-emerald-700' : 'text-amber-600'}>
            {wsConnected ? 'Online' : 'Connecting'}
          </span>
        </div>

        <div className="flex items-center space-x-1.5 text-slate-600 text-xs font-mono font-medium">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{time}</span>
        </div>
      </div>
    </header>
  );
};
