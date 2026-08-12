import { Search, Bell } from 'lucide-react';

export default function Topbar() {
  return (
    <header className="flex items-center justify-between px-6 py-0 h-[56px] border-b border-[#2e2e3a] bg-[#1a1a1f] flex-shrink-0">
      {/* Left: status pills */}
      <div className="flex items-center gap-6">
        <span className="text-[11px] font-mono tracking-[0.12em] text-[#8888a0]">
          SYSTEM HEALTH: <span className="text-[#00d97e]">OPTIMAL</span>
        </span>
        <div className="w-px h-4 bg-[#3a3a48]" />
        <span className="text-[11px] font-mono tracking-[0.12em] text-[#8888a0]">
          GPU STATUS: <span className="text-[#00d97e]">ACTIVE</span>
        </span>
      </div>

      {/* Right: actions + user */}
      <div className="flex items-center gap-3">
        <button className="w-8 h-8 flex items-center justify-center text-[#8888a0] hover:text-[#e0e0ea] transition-colors cursor-pointer">
          <Search size={17} />
        </button>

        <button className="relative w-8 h-8 flex items-center justify-center text-[#8888a0] hover:text-[#e0e0ea] transition-colors cursor-pointer">
          <Bell size={17} />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#ff8c42]" />
        </button>

        <div className="flex items-center gap-2.5 pl-3 ml-1 border-l border-[#3a3a48]">
          <div className="text-right">
            <p className="text-[12px] font-medium text-[#e0e0ea] leading-tight tracking-wide">ENG_7741</p>
            <p className="text-[10px] text-[#555568] tracking-widest uppercase">Senior Analyst</p>
          </div>
          <div className="w-9 h-9 rounded-md bg-[#2a2a34] border border-[#3a3a48] flex items-center justify-center text-[#e0e0ea] text-[13px] font-semibold">
            <img src="/images/Image_1.jpeg" alt="" className="w-full h-full object-cover rounded-md" />
          </div>
        </div>
      </div>
    </header>
  );
}
