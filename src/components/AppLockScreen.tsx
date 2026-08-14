import React, { useState, useEffect, useRef } from 'react';
import { Lock, KeyRound, Eye, EyeOff, AlertCircle, ShieldAlert, HelpCircle, X, DownloadCloud, RefreshCw, CheckCircle2 } from 'lucide-react';
import { LedgerFlowLogo } from './LedgerFlowLogo';

interface AppLockScreenProps {
  onUnlock: (password: string) => Promise<void>;
  onRestoreBackup: (backupData: any) => Promise<void>;
  onResetData: () => Promise<void>;
}

export const AppLockScreen: React.FC<AppLockScreenProps> = ({
  onUnlock,
  onRestoreBackup,
  onResetData,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldownSec, setCooldownSec] = useState<number | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [restoreSuccess, setRestoreSuccess] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldownSec === null || cooldownSec <= 0) return;
    const timer = setInterval(() => {
      setCooldownSec((prev) => (prev && prev > 1 ? prev - 1 : null));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSec]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldownSec !== null && cooldownSec > 0) return;
    if (!password) {
      setError('Please enter your app password.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await onUnlock(password);
      setPassword('');
    } catch (err: any) {
      if (err.lockedRemainingSec) {
        setCooldownSec(err.lockedRemainingSec);
      }
      setError(err.message || 'Incorrect app password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreError(null);
    setRestoreSuccess(null);

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      await onRestoreBackup(parsed);
      setRestoreSuccess('Backup data restored successfully! You can now access your ledgers.');
      setTimeout(() => {
        setShowForgotModal(false);
      }, 1500);
    } catch (err: any) {
      setRestoreError(err.message || 'Invalid backup file format.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmReset = async () => {
    try {
      setResetting(true);
      await onResetData();
      setResetConfirmOpen(false);
      setShowForgotModal(false);
    } catch (err: any) {
      alert(err.message || 'Failed to reset device data.');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0a0a0a] text-[#e5e5e5] flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[32rem] h-[32rem] bg-cyan-950/15 rounded-full blur-3xl pointer-events-none" />

      <div
        id="app-lock-screen-card"
        className="w-full max-w-md bg-[#0d0d0d] border border-[#262626] rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 space-y-6 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Official Brand Logo */}
        <div className="text-center">
          <LedgerFlowLogo variant="lock-screen" size="lg" showTagline />
          <div className="mt-5 inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#171717] border border-[#262626] text-xs font-semibold text-[#a3a3a3]">
            <Lock className="w-3.5 h-3.5 text-amber-500" />
            <span>Ledger Flow Locked</span>
          </div>
          <p className="text-xs text-[#737373] mt-2">
            Enter your app password to access your business ledgers
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleUnlock} className="space-y-4">
          {error && (
            <div
              id="app-lock-error-message"
              className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800 text-xs font-medium text-rose-300 flex items-start space-x-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {cooldownSec !== null && cooldownSec > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800 text-xs font-medium text-amber-300 flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Security lockout active. Try again in {cooldownSec}s.</span>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="app-lock-password-input"
                className="text-xs font-semibold text-[#a3a3a3] uppercase tracking-wider"
              >
                App Password
              </label>
              <button
                type="button"
                id="forgot-app-password-btn"
                onClick={() => setShowForgotModal(true)}
                className="text-[11px] text-[#737373] hover:text-emerald-400 transition-colors flex items-center space-x-1 cursor-pointer"
              >
                <HelpCircle className="w-3 h-3" />
                <span>Forgot Password?</span>
              </button>
            </div>

            <div className="relative">
              <input
                id="app-lock-password-input"
                type={showPassword ? 'text' : 'password'}
                required
                autoFocus
                disabled={cooldownSec !== null && cooldownSec > 0}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter app password"
                autoComplete="current-password"
                className="w-full pl-3.5 pr-10 py-3 text-sm rounded-xl bg-[#171717] border border-[#262626] text-[#e5e5e5] focus:outline-none focus:border-emerald-500 font-mono placeholder:text-[#525252] disabled:opacity-50 transition-colors"
              />
              <button
                type="button"
                id="toggle-app-password-vis-btn"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#737373] hover:text-[#e5e5e5]"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            id="unlock-app-btn"
            disabled={loading || (cooldownSec !== null && cooldownSec > 0)}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-xl shadow-emerald-950/50 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
          >
            <KeyRound className="w-4 h-4" />
            <span>{loading ? 'Verifying Password...' : 'Unlock Ledger Flow'}</span>
          </button>
        </form>
      </div>

      {/* Forgot Password / Recovery Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0d0d0d] rounded-2xl shadow-2xl border border-[#262626] overflow-hidden text-[#e5e5e5]">
            <div className="px-6 py-5 border-b border-[#262626] flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">
                  App Password Recovery
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowForgotModal(false);
                  setResetConfirmOpen(false);
                }}
                className="text-[#737373] hover:text-[#e5e5e5] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-[#a3a3a3] leading-relaxed">
              <p>
                <strong className="text-[#e5e5e5]">Ledger Flow is 100% private and zero-login.</strong> Because no email or external cloud account is linked to your device, there is no email reset link.
              </p>

              {restoreSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{restoreSuccess}</span>
                </div>
              )}

              {restoreError && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300">
                  {restoreError}
                </div>
              )}

              <div className="space-y-3 pt-2">
                {/* Option 1: Restore JSON Backup */}
                <div className="p-3.5 rounded-xl bg-[#141414] border border-[#262626] space-y-2">
                  <div className="flex items-center space-x-2 text-white font-semibold">
                    <DownloadCloud className="w-4 h-4 text-emerald-400" />
                    <span>Option 1: Restore from JSON Backup</span>
                  </div>
                  <p className="text-[11px] text-[#737373]">
                    If you have a previously exported Ledger Flow JSON backup file, you can restore your ledgers directly.
                  </p>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".json,application/json"
                    onChange={handleFileRestore}
                    className="hidden"
                    id="restore-backup-file-input"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-1 w-full py-2 rounded-lg bg-[#1a1a1a] hover:bg-[#222] border border-[#333] text-[#e5e5e5] font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Select JSON Backup File
                  </button>
                </div>

                {/* Option 2: Reset App Data */}
                <div className="p-3.5 rounded-xl bg-[#141414] border border-rose-950/60 space-y-2">
                  <div className="flex items-center space-x-2 text-rose-400 font-semibold">
                    <RefreshCw className="w-4 h-4" />
                    <span>Option 2: Reset App Data</span>
                  </div>
                  <p className="text-[11px] text-[#737373]">
                    Reset all local data on this device and set a brand new master app password.
                  </p>

                  {!resetConfirmOpen ? (
                    <button
                      type="button"
                      onClick={() => setResetConfirmOpen(true)}
                      className="mt-1 w-full py-2 rounded-lg bg-rose-950/30 hover:bg-rose-950/60 border border-rose-900/50 text-rose-300 font-semibold text-xs transition-colors cursor-pointer"
                    >
                      Reset Device Data...
                    </button>
                  ) : (
                    <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-700 text-rose-200 space-y-2 mt-2">
                      <p className="font-semibold text-xs">
                        ⚠️ Are you sure? All existing task records will be cleared!
                      </p>
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => setResetConfirmOpen(false)}
                          className="flex-1 py-1.5 rounded bg-[#171717] text-[#a3a3a3] text-xs font-semibold"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleConfirmReset}
                          disabled={resetting}
                          className="flex-1 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
                        >
                          {resetting ? 'Resetting...' : 'Yes, Reset Data'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-[#111111] border-t border-[#262626] text-right">
              <button
                type="button"
                onClick={() => {
                  setShowForgotModal(false);
                  setResetConfirmOpen(false);
                }}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#171717] hover:bg-[#222] border border-[#262626] text-[#e5e5e5]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 text-center text-xs text-[#525252] select-none">
        Ledger Flow • Secure • Manage • Grow
      </div>
    </div>
  );
};
