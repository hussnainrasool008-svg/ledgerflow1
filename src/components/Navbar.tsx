import React, { useEffect, useState } from 'react';
import { Moon, Sun, DownloadCloud, Coins, Shield, Lock, Smartphone, Settings, LayoutDashboard, FileText } from 'lucide-react';
import { CurrencyConfig, CURRENCIES } from '../types';
import { LedgerFlowLogo } from './LedgerFlowLogo';

export type MainNavView = 'tasks' | 'notes';

interface NavbarProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  currency: CurrencyConfig;
  onChangeCurrency: (c: CurrencyConfig) => void;
  onOpenBackup: () => void;
  onOpenSettings: () => void;
  onLockApp: () => void;
  onHomeClick?: () => void;
  activeTaskName?: string;
  isAppLocked?: boolean;
  hasPwaInstallPrompt?: boolean;
  onTriggerInstall?: () => void;
  currentView?: MainNavView;
  onChangeView?: (view: MainNavView) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  darkMode,
  onToggleDarkMode,
  currency,
  onChangeCurrency,
  onOpenBackup,
  onOpenSettings,
  onLockApp,
  onHomeClick,
  activeTaskName,
  isAppLocked,
  hasPwaInstallPrompt,
  onTriggerInstall,
  currentView = 'tasks',
  onChangeView,
}) => {
  const [deviceId, setDeviceId] = useState<string>('');

  useEffect(() => {
    const rawId = localStorage.getItem('ledgerflow_device_id') || 'DEV-4921-X';
    setDeviceId(rawId.substring(0, 8).toUpperCase());
  }, []);

  return (
    <header
      id="main-header"
      className="sticky top-0 z-30 border-b backdrop-blur-md bg-[#0d0d0d]/95 border-[#262626] text-[#e5e5e5] transition-colors"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand Logo & Desktop Nav Tabs */}
        <div className="flex items-center space-x-4 sm:space-x-6">
          <div
            className="flex items-center space-x-2 cursor-pointer select-none group"
            onClick={onHomeClick}
          >
            <LedgerFlowLogo variant="full" size="md" showTagline />
            <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 ml-1">
              Digital Khata
            </span>
          </div>

          {/* Desktop Navigation Links */}
          {onChangeView && !activeTaskName && (
            <nav className="hidden md:flex items-center space-x-1 bg-[#141414] p-1 rounded-xl border border-[#262626]">
              <button
                id="desktop-nav-tasks-btn"
                onClick={() => onChangeView('tasks')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  currentView === 'tasks'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-[#888] hover:text-[#e5e5e5]'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>My Khatas</span>
              </button>

              <button
                id="desktop-nav-notepad-btn"
                onClick={() => onChangeView('notes')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  currentView === 'notes'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-[#888] hover:text-[#e5e5e5]'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Notepad</span>
              </button>
            </nav>
          )}
        </div>

        {/* Center Breadcrumb if inside task */}
        {activeTaskName && (
          <div className="hidden md:flex items-center space-x-2 text-xs text-[#737373]">
            <span>/</span>
            <span className="font-medium text-emerald-400 truncate max-w-xs bg-[#171717] px-2.5 py-1 rounded border border-emerald-900/30">
              {activeTaskName}
            </span>
          </div>
        )}

        {/* Right Actions */}
        <div className="flex items-center space-x-1.5 sm:space-x-2.5">
          {/* Quick Lock App Button */}
          {!isAppLocked && (
            <button
              id="navbar-quick-lock-btn"
              onClick={onLockApp}
              title="Lock Application Now"
              className="flex items-center space-x-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-[#171717] hover:bg-[#222] text-[#a3a3a3] hover:text-amber-400 border border-[#262626] transition-colors cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden md:inline">Lock</span>
            </button>
          )}

          {/* Currency Selector */}
          <div className="relative inline-flex items-center">
            <Coins className="w-3.5 h-3.5 text-[#737373] absolute left-2 pointer-events-none" />
            <select
              id="currency-selector"
              aria-label="Select currency"
              value={currency.code}
              onChange={(e) => {
                const found = CURRENCIES.find((c) => c.code === e.target.value);
                if (found) onChangeCurrency(found);
              }}
              className="pl-6 pr-2.5 py-1.5 text-xs font-medium bg-[#171717] hover:bg-[#222] text-[#e5e5e5] rounded-lg border border-[#262626] focus:outline-none focus:border-emerald-600 transition-colors cursor-pointer"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code} className="bg-[#171717] text-[#e5e5e5]">
                  {c.symbol} {c.code}
                </option>
              ))}
            </select>
          </div>

          {/* PWA Install Button if available */}
          {hasPwaInstallPrompt && onTriggerInstall && (
            <button
              id="pwa-install-nav-btn"
              onClick={onTriggerInstall}
              title="Install Ledger Flow to Home Screen"
              className="hidden sm:flex items-center space-x-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800 transition-colors cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Install</span>
            </button>
          )}

          {/* Backup / Export quick button */}
          <button
            id="backup-restore-btn"
            onClick={onOpenBackup}
            title="Backup & Export Data"
            className="flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-[#171717] hover:bg-[#222] text-[#e5e5e5] border border-[#262626] transition-colors cursor-pointer"
          >
            <DownloadCloud className="w-3.5 h-3.5 text-[#a3a3a3]" />
            <span className="hidden lg:inline">Backup</span>
          </button>

          {/* Settings & Security Button */}
          <button
            id="open-settings-modal-btn"
            onClick={onOpenSettings}
            title="Security & App Settings"
            className="p-2 rounded-lg bg-[#171717] hover:bg-[#222] text-[#a3a3a3] hover:text-[#e5e5e5] border border-[#262626] transition-colors cursor-pointer"
          >
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
          </button>
        </div>
      </div>
    </header>
  );
};

