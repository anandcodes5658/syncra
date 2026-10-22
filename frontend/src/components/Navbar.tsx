import React from 'react';
import { Send, Activity, History, Link2, Settings, ShieldCheck } from 'lucide-react';

interface Props {
  activeTab: 'create' | 'status' | 'history' | 'accounts' | 'settings';
  onTabChange: (tab: 'create' | 'status' | 'history' | 'accounts' | 'settings') => void;
  hasActiveJobs?: boolean;
}

interface NavItem {
  id: 'create' | 'status' | 'history' | 'accounts' | 'settings';
  label: string;
  icon: any;
  badge?: boolean;
}

export const Navbar: React.FC<Props> = ({ activeTab, onTabChange, hasActiveJobs }) => {
  const navItems: NavItem[] = [
    { id: 'create', label: 'Create Post', icon: Send },
    { id: 'status', label: 'Live Status', icon: Activity, badge: hasActiveJobs },
    { id: 'history', label: 'Post History', icon: History },
    { id: 'accounts', label: 'Accounts', icon: Link2 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-800 bg-black/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onTabChange('create')}>
          <div className="w-8 h-8 rounded-xl bg-white text-black flex items-center justify-center font-bold text-sm tracking-tighter shadow-md">
            SY
          </div>
          <div className="text-left">
            <span className="font-semibold text-white tracking-tight text-sm block">
              Syncra
            </span>
            <span className="text-[10px] text-neutral-400 uppercase tracking-wider block font-mono">
              Social Auto Poster
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-neutral-950 p-1 rounded-2xl border border-neutral-800/80">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-neutral-800 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Server & OAuth Status Pill */}
        <div className="hidden md:flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-neutral-950 border border-neutral-800 rounded-full text-[11px] text-neutral-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
            <span>API Online</span>
          </div>
        </div>
      </div>
    </header>
  );
};
