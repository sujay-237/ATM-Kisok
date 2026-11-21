import React, { useEffect, useState } from 'react';
import { Landmark, Wifi, Clock, ShieldCheck } from 'lucide-react';

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
    <header className="w-full bg-[#FCFBF8]/95 backdrop-blur-md border-b border-[#E6E0D4] px-8 py-4 shadow-warm-sm flex items-center justify-between sticky top-0 z-50">
      {/* Swiss Private Bank Brand */}
      <div className="flex items-center space-x-3.5">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#102A22] to-[#193D32] flex items-center justify-center text-[#FAF8F3] shadow-warm-sm border border-[#255243]/40">
          <Landmark className="w-5 h-5 text-[#FAF8F3]" />
        </div>
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-xl font-serif font-semibold tracking-tight text-[#171715]">
              SENTINEL PRIVATE BANK
            </h1>
            <span className="text-[10px] font-mono tracking-[0.14em] uppercase text-[#B5935A] bg-[#F4EFE4] border border-[#E2D4BC] px-2 py-0.5 rounded-full font-medium">
              #{kioskId}
            </span>
          </div>
          <p className="text-xs text-[#666156] font-sans flex items-center gap-1.5">
            <span>Genève • Est. 1894</span>
            <span className="text-[#D8D2C5]">•</span>
            <span>Concierge Terminal</span>
            <span className="text-[#D8D2C5]">•</span>
            <span className="text-[#155E43] font-medium">Private Wealth Client Services</span>
          </p>
        </div>
      </div>

      {/* Status Badges */}
      <div className="flex items-center space-x-3 text-xs">
        <div className="hidden sm:flex items-center space-x-1.5 text-[#171715] bg-[#F5F2EB] px-3.5 py-1.5 rounded-xl border border-[#E6E0D4]">
          <ShieldCheck className="w-4 h-4 text-[#155E43]" />
          <span className="font-sans font-medium text-[11px] tracking-wide">Hardware Enclave</span>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono px-3.5 py-1.5 rounded-xl border border-[#E6E0D4] bg-[#FCFBF8]">
          <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-[#155E43]' : 'bg-[#9A6700]'}`} />
          <Wifi className={`w-3.5 h-3.5 ${wsConnected ? 'text-[#155E43]' : 'text-[#9A6700]'}`} />
          <span className={wsConnected ? 'text-[#155E43] font-semibold' : 'text-[#9A6700] font-semibold'}>
            {wsConnected ? 'LIVE FEED' : 'CONNECTING'}
          </span>
        </div>

        <div className="flex items-center space-x-1.5 text-[#666156] text-xs font-mono bg-[#F5F2EB] px-3.5 py-1.5 rounded-xl border border-[#E6E0D4]">
          <Clock className="w-3.5 h-3.5 text-[#9A9386]" />
          <span className="tabular-nums tracking-wider">{time}</span>
        </div>
      </div>
    </header>
  );
};
