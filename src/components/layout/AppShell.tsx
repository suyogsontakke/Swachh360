import React, { useState } from 'react';
import {
  LogOut,
  Menu,
  RotateCcw,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';
import { SwachhLogo } from '../common/SwachhLogo';
import { ToastContainer } from '../common/ToastContainer';

export interface NavItem {
  id: string;
  label: string;
  Icon: React.FC<{ className?: string }>;
  count?: number;
}

interface AppShellProps {
  portalTitle: string;
  navItems: NavItem[];
  activePage: string;
  onSelectPage: (pageId: string) => void;
  primaryAction?: {
    label: string;
    onClick: () => void;
    Icon?: React.FC<{ className?: string }>;
  };
  children: React.ReactNode;
}

const ROLE_SWITCH_OPTIONS: Array<{ role: UserRole; label: string }> = [
  { role: 'citizen', label: 'Citizen' },
  { role: 'supervisor', label: 'Supervisor' },
  { role: 'worker', label: 'Worker' },
];

export const AppShell: React.FC<AppShellProps> = ({
  portalTitle,
  navItems,
  activePage,
  onSelectPage,
  primaryAction,
  children,
}) => {
  const { currentUser, loginAsRole, logout, resetDemoData, toasts, dismissToast } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activeNav = navItems.find((item) => item.id === activePage);

  const SidebarContent = (
    <div className="flex flex-col h-full bg-[#142B45] text-white">
      {/* Brand */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-white/10 shrink-0">
        <SwachhLogo variant="light" size="sm" />
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          className="lg:hidden p-1.5 text-slate-300 hover:text-white rounded-md"
          aria-label="Close navigation menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Active User Profile */}
      {currentUser && (
        <div className="px-5 py-4 border-b border-white/10">
          <p className="text-xs font-medium text-[#27AE75]">{portalTitle}</p>
          <p className="text-sm font-semibold text-white mt-0.5 truncate">{currentUser.name}</p>
          <p className="text-xs text-slate-300 font-mono truncate mt-0.5">{currentUser.email}</p>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Portal Navigation">
        {navItems.map((item) => {
          const Icon = item.Icon;
          const isActive = item.id === activePage;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectPage(item.id);
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-[#1D4262] text-white'
                  : 'text-slate-300 hover:bg-white/8 hover:text-white'
              }`}
            >
              <span className="inline-flex items-center gap-2.5 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-[#27AE75]' : 'text-slate-400'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </span>
              {typeof item.count === 'number' && item.count > 0 && (
                <span className="font-mono text-xs tabular-nums text-slate-200">
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Demo Quick Role Switcher & Session Actions */}
      <div className="p-4 border-t border-white/10 space-y-3 shrink-0">
        <div>
          <p className="text-[11px] font-medium text-slate-400 mb-2">
            Demo Role Switch (Shared Data)
          </p>
          <div className="grid grid-cols-3 gap-1 p-1 bg-[#0E1F33] rounded-md">
            {ROLE_SWITCH_OPTIONS.map((opt) => {
              const active = currentUser?.role === opt.role;
              return (
                <button
                  key={opt.role}
                  type="button"
                  onClick={() => {
                    if (!active) {
                      loginAsRole(opt.role);
                      setMobileMenuOpen(false);
                    }
                  }}
                  className={`px-2 py-1.5 text-[11px] font-semibold rounded transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-[#27AE75] text-white'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={resetDemoData}
            className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white py-1.5 transition-colors whitespace-nowrap"
            title="Restore initial 14 demonstration complaints"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Seed
          </button>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white py-1.5 transition-colors whitespace-nowrap"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F4F7FA] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen">
        {SidebarContent}
      </aside>

      {/* Mobile Slide-Over Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#142B45]/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-68 max-w-[82vw] h-full z-50">{SidebarContent}</div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar (Clean 1-row contract: Breadcrumb left, 1 primary action right) */}
        <header className="h-16 bg-white border-b border-[#E2E8F0] px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 text-[#142B45] hover:bg-[#F4F7FA] rounded-md"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="font-semibold text-[#52677A] hidden sm:inline whitespace-nowrap">
                {portalTitle}
              </span>
              <span className="text-slate-300 hidden sm:inline" aria-hidden="true">
                /
              </span>
              <h1 className="font-bold text-[#142B45] truncate">
                {activeNav?.label ?? portalTitle}
              </h1>
            </div>
          </div>

          {primaryAction && (
            <button
              type="button"
              onClick={primaryAction.onClick}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#27AE75] hover:bg-[#1E8E5E] rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              {primaryAction.Icon && <primaryAction.Icon className="w-4 h-4" />}
              {primaryAction.label}
            </button>
          )}
        </header>

        {/* Main Viewport */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 max-w-[1360px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Live Subtle Status & SMS Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};
