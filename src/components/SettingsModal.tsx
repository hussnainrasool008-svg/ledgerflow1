import React, { useState, useRef } from 'react';
import {
  X,
  Shield,
  Lock,
  Key,
  Clock,
  Coins,
  DownloadCloud,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Share2,
  HardDrive,
  Info,
  Layers,
} from 'lucide-react';
import { CurrencyConfig, CURRENCIES, AppLockTimeout, AppLockStatus } from '../types';
import { LedgerFlowLogo } from './LedgerFlowLogo';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency: CurrencyConfig;
  onChangeCurrency: (c: CurrencyConfig) => void;
  appLockStatus: AppLockStatus;
  onUpdateAppLockSettings: (timeout?: AppLockTimeout, enabled?: boolean) => Promise<void>;
  onChangeAppPassword: (currentPassword: string, newPassword: string) => Promise<void>;
  onExportBackup: () => Promise<void>;
  onRestoreBackup: (backupData: any) => Promise<void>;
  onLockAppNow: () => void;
  deferredPrompt: any;
  onTriggerInstall: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currency,
  onChangeCurrency,
  appLockStatus,
  onUpdateAppLockSettings,
  onChangeAppPassword,
  onExportBackup,
  onRestoreBackup,
  onLockAppNow,
  deferredPrompt,
  onTriggerInstall,
}) => {
  const [activeTab, setActiveTab] = useState<'security' | 'preferences' | 'backup' | 'pwa'>('security');

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState<string | null>(null);
  const [pwdError, setPwdError] = useState<string | null>(null);

  // Backup restore state
  const [restoreSuccess, setRestoreSuccess] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // iOS instructions toggle
  const [showIosGuide, setShowIosGuide] = useState(false);

  if (!isOpen) return null;

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);
    setPwdSuccess(null);

    if (!currentPassword || !newPassword) {
      setPwdError('Please enter both current and new passwords.');
      return;
    }

    if (newPassword.length < 3) {
      setPwdError('New app password must be at least 3 characters long.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPwdError('New passwords do not match. Please verify.');
      return;
    }

    try {
      setPwdLoading(true);
      await onChangeAppPassword(currentPassword, newPassword);
      setPwdSuccess('App password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      setPwdError(err.message || 'Failed to update app password.');
    } finally {
      setPwdLoading(false);
    }
  };

  const handleFileRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreError(null);
    setRestoreSuccess(null);
    setRestoring(true);

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      await onRestoreBackup(parsed);
      setRestoreSuccess('Backup data restored successfully!');
    } catch (err: any) {
      setRestoreError(err.message || 'Failed to parse JSON backup file.');
    } finally {
      setRestoring(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div
        id="settings-modal"
        className="w-full max-w-2xl bg-[#0d0d0d] rounded-3xl shadow-2xl border border-[#262626] overflow-hidden text-[#e5e5e5] flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-[#262626] flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-900/40 text-emerald-400 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Settings &amp; Security</h2>
              <p className="text-xs text-[#737373]">Configure App Lock, Currencies &amp; Data Portability</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#737373] hover:text-[#e5e5e5] p-1.5 rounded-lg hover:bg-[#1f1f1f] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#262626] px-6 bg-[#111111] overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab('security')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center space-x-2 ${
              activeTab === 'security'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-[#737373] hover:text-[#e5e5e5]'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>App Lock &amp; Security</span>
          </button>

          <button
            onClick={() => setActiveTab('preferences')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center space-x-2 ${
              activeTab === 'preferences'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-[#737373] hover:text-[#e5e5e5]'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>Currency &amp; Display</span>
          </button>

          <button
            onClick={() => setActiveTab('backup')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center space-x-2 ${
              activeTab === 'backup'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-[#737373] hover:text-[#e5e5e5]'
            }`}
          >
            <DownloadCloud className="w-3.5 h-3.5" />
            <span>Backup &amp; Restore</span>
          </button>

          <button
            onClick={() => setActiveTab('pwa')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center space-x-2 ${
              activeTab === 'pwa'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-[#737373] hover:text-[#e5e5e5]'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Install PWA App</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {/* TAB 1: SECURITY */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              {/* App Lock Status Banner */}
              <div className="p-4 rounded-2xl bg-[#141414] border border-[#262626] flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-400 flex items-center justify-center">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white text-sm">App Lock Status</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                        ACTIVE &amp; PROTECTED
                      </span>
                    </div>
                    <p className="text-xs text-[#737373] mt-0.5">
                      Protects the entire application with PBKDF2/SHA-512 cryptographic hashing.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onLockAppNow();
                  }}
                  className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#1a1a1a] hover:bg-[#222] text-[#e5e5e5] border border-[#333] transition-colors cursor-pointer shrink-0"
                >
                  Lock App Now
                </button>
              </div>

              {/* Auto-Lock Timeout Setting */}
              <div className="p-4 rounded-2xl bg-[#141414] border border-[#262626] space-y-3">
                <div>
                  <h4 className="font-semibold text-white text-sm">Auto-Lock Timer</h4>
                  <p className="text-xs text-[#737373] mt-0.5">
                    Automatically lock Ledger Flow after inactivity or when navigating away.
                  </p>
                </div>

                <div className="relative">
                  <select
                    id="settings-autolock-select"
                    value={appLockStatus.timeout}
                    onChange={(e) => onUpdateAppLockSettings(e.target.value as AppLockTimeout)}
                    className="w-full px-3.5 py-2.5 text-xs font-medium rounded-xl bg-[#171717] border border-[#262626] text-[#e5e5e5] focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
                  >
                    <option value="closed" className="bg-[#171717]">When app is closed / reopened (Default)</option>
                    <option value="immediately" className="bg-[#171717]">Immediately when switching apps / tabs</option>
                    <option value="1m" className="bg-[#171717]">After 1 minute of inactivity</option>
                    <option value="5m" className="bg-[#171717]">After 5 minutes of inactivity</option>
                    <option value="15m" className="bg-[#171717]">After 15 minutes of inactivity</option>
                  </select>
                </div>
              </div>

              {/* Change App Password Form */}
              <div className="p-5 rounded-2xl bg-[#141414] border border-[#262626] space-y-4">
                <div className="flex items-center space-x-2.5">
                  <Key className="w-4 h-4 text-amber-400" />
                  <h4 className="font-bold text-white text-sm">Change App Password</h4>
                </div>

                {pwdSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{pwdSuccess}</span>
                  </div>
                )}

                {pwdError && (
                  <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{pwdError}</span>
                  </div>
                )}

                <form onSubmit={handleChangePasswordSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#a3a3a3] uppercase tracking-wider mb-1">
                      Current App Password
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        required
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current app password"
                        className="w-full pl-3.5 pr-10 py-2 text-xs font-mono rounded-xl bg-[#171717] border border-[#262626] text-[#e5e5e5] focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#737373] hover:text-[#e5e5e5]"
                      >
                        {showCurrentPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#a3a3a3] uppercase tracking-wider mb-1">
                        New App Password
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="New password (min 3 chars)"
                          className="w-full pl-3.5 pr-10 py-2 text-xs font-mono rounded-xl bg-[#171717] border border-[#262626] text-[#e5e5e5] focus:outline-none focus:border-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#737373] hover:text-[#e5e5e5]"
                        >
                          {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#a3a3a3] uppercase tracking-wider mb-1">
                        Confirm New Password
                      </label>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        className="w-full px-3.5 py-2 text-xs font-mono rounded-xl bg-[#171717] border border-[#262626] text-[#e5e5e5] focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <p className="text-[11px] text-[#737373]">
                    Note: Changing your App Password protects the application entry and does NOT modify your individual Task Passwords.
                  </p>

                  <button
                    type="submit"
                    disabled={pwdLoading}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer"
                  >
                    {pwdLoading ? 'Updating...' : 'Update App Password'}
                  </button>
                </form>
              </div>

              {/* Task-Level Independent Password Architecture notice */}
              <div className="p-4 rounded-2xl bg-[#111111] border border-emerald-950/60 flex items-start space-x-3 text-xs text-[#a3a3a3]">
                <Layers className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong className="text-emerald-400">Two-Level Independent Security:</strong> Your App Password unlocks the app interface, while each individual Task retains its own isolated cryptographic password. Changing one never alters the other.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: PREFERENCES */}
          {activeTab === 'preferences' && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-[#141414] border border-[#262626] space-y-3">
                <div className="flex items-center space-x-2.5">
                  <Coins className="w-4 h-4 text-amber-400" />
                  <h4 className="font-bold text-white text-sm">Currency Selector</h4>
                </div>
                <p className="text-xs text-[#737373]">
                  Choose how financial values and totals are formatted across all your task ledgers.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                  {CURRENCIES.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => onChangeCurrency(c)}
                      className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        currency.code === c.code
                          ? 'bg-[#1a1a1a] border-emerald-500 text-white shadow-md'
                          : 'bg-[#171717] border-[#262626] text-[#a3a3a3] hover:border-[#333]'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-xs text-white">{c.label}</div>
                        <div className="text-[11px] text-[#737373]">Code: {c.code}</div>
                      </div>
                      <span className="font-bold text-sm text-emerald-400">{c.symbol}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BACKUP & RESTORE */}
          {activeTab === 'backup' && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-[#141414] border border-[#262626] space-y-4">
                <div className="flex items-center space-x-2.5">
                  <DownloadCloud className="w-4 h-4 text-emerald-400" />
                  <h4 className="font-bold text-white text-sm">Data Export &amp; Backup</h4>
                </div>
                <p className="text-xs text-[#737373] leading-relaxed">
                  Export all your private tasks and spreadsheet records to a single encrypted JSON backup file. Store it in a safe location or transfer it to another device.
                </p>

                <button
                  type="button"
                  onClick={onExportBackup}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-950/40 transition-all flex items-center space-x-2 cursor-pointer"
                >
                  <DownloadCloud className="w-4 h-4" />
                  <span>Download Complete Backup (.json)</span>
                </button>
              </div>

              <div className="p-5 rounded-2xl bg-[#141414] border border-[#262626] space-y-4">
                <div className="flex items-center space-x-2.5">
                  <HardDrive className="w-4 h-4 text-sky-400" />
                  <h4 className="font-bold text-white text-sm">Restore from Backup</h4>
                </div>
                <p className="text-xs text-[#737373] leading-relaxed">
                  Upload a previously exported Ledger Flow backup file to restore all tasks and customer records.
                </p>

                {restoreSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{restoreSuccess}</span>
                  </div>
                )}

                {restoreError && (
                  <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{restoreError}</span>
                  </div>
                )}

                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json,application/json"
                  onChange={handleFileRestore}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={restoring}
                  className="px-5 py-2.5 rounded-xl bg-[#1a1a1a] hover:bg-[#222] border border-[#333] text-[#e5e5e5] font-semibold text-xs transition-colors cursor-pointer"
                >
                  {restoring ? 'Restoring records...' : 'Select JSON File to Restore'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: PWA INSTALLATION */}
          {activeTab === 'pwa' && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-[#141414] border border-[#262626] space-y-4 text-center">
                <div className="w-14 h-14 rounded-2xl bg-[#171717] border border-emerald-900/40 text-emerald-400 flex items-center justify-center mx-auto">
                  <Smartphone className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-base">Install Ledger Flow to Home Screen</h4>
                  <p className="text-xs text-[#737373] mt-1 max-w-md mx-auto">
                    Install Ledger Flow as a native progressive web application for instant full-screen access, ultra-fast launch speeds, and offline persistence.
                  </p>
                </div>

                {deferredPrompt ? (
                  <button
                    type="button"
                    onClick={onTriggerInstall}
                    className="mt-2 inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-xl shadow-emerald-950/40 transition-all cursor-pointer"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Install App on this Device</span>
                  </button>
                ) : (
                  <div className="p-4 rounded-xl bg-[#171717] border border-[#262626] text-xs text-[#a3a3a3] max-w-md mx-auto text-left space-y-2">
                    <p className="font-semibold text-white">How to Install on Mobile Devices:</p>
                    <ul className="list-disc pl-4 space-y-1 text-[11px] text-[#888]">
                      <li>
                        <strong className="text-emerald-400">iOS (Safari):</strong> Tap the <span className="text-white">Share</span> button (⎙) in Safari, scroll down, and tap <span className="text-white font-semibold">"Add to Home Screen"</span>.
                      </li>
                      <li>
                        <strong className="text-emerald-400">Android (Chrome):</strong> Tap the 3 dots in Chrome and select <span className="text-white font-semibold">"Install App"</span> or <span className="text-white font-semibold">"Add to Home Screen"</span>.
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-[#111111] border-t border-[#262626] flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2 text-[11px] text-[#525252]">
            <span>Ledger Flow v2.4</span>
            <span>•</span>
            <span>Zero-Login Secure</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#171717] hover:bg-[#222] border border-[#262626] text-[#e5e5e5] transition-colors cursor-pointer"
          >
            Done / Close
          </button>
        </div>
      </div>
    </div>
  );
};
