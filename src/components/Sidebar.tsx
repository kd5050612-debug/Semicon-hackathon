import { LayoutDashboard, PlusCircle, History, BarChart2, Settings } from 'lucide-react';
import type { Page } from '@/types';

interface SidebarProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
}

const navItems: { id: Page; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { id: 'command-center', label: 'Command Center', icon: LayoutDashboard },
  { id: 'new-inspection', label: 'New Inspection', icon: PlusCircle },
  { id: 'history', label: 'History', icon: History },
  { id: 'quality-reports', label: 'Quality Reports', icon: BarChart2 },
  { id: 'system-settings', label: 'System Settings', icon: Settings },
];

export default function Sidebar({ activePage, onNavigate }: SidebarProps) {
  return (
    <aside className="w-[272px] min-w-[272px] bg-[#1e1e26] border-r border-[#2e2e3a] flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-[56px] border-b border-[#2e2e3a]">
        <div className="w-8 h-8 rounded-sm overflow-hidden flex-shrink-0 border border-[#3a3a48]">
          <img src="/images/Image_1.jpeg" alt="Semantic" className="w-full h-full object-cover" />
        </div>
        <span className="text-[15px] font-bold tracking-[0.15em] text-[#e0e0ea] uppercase">
          SEMANTIC
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
        {navItems.map(({ id, label, icon: Icon }) => {
          const isActive = activePage === id;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-[14px] font-medium transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-[#4a8fff] text-white'
                  : 'text-[#8888a0] hover:text-[#c0c0d0] hover:bg-[#2a2a34]'
              }`}
            >
              <Icon size={17} />
              {label}
            </button>
          );
        })}
      </nav>

      {/* Uplink status */}
      <div className="px-5 py-4 border-t border-[#2e2e3a]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#00d97e] animate-pulse-dot" />
          <span className="text-[11px] font-mono tracking-[0.1em] text-[#8888a0]">
            UPLINK: <span className="text-[#00d97e]">ACTIVE</span>
          </span>
        </div>
      </div>
    </aside>
  );
}
