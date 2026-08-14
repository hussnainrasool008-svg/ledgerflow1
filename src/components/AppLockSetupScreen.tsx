import React, { useState } from 'react';
import { Eye, EyeOff, ShieldCheck, Lock, Clock, Sparkles } from 'lucide-react';
import { LedgerFlowLogo } from './LedgerFlowLogo';
import { AppLockTimeout } from '../types';

interface AppLockSetupScreenProps {
  onSetupSuccess: (password: string, timeout: AppLockTimeout) => Promise<void>;
}

export const AppLockSetupScreen: React.FC<AppLockSetupScreenProps> = ({ onSetupSuccess }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [timeout, setTimeout] = useState<AppLockTimeout>('closed');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password) {
      setError('Please create an app password.');
      return;
    }

    if (password.length < 3) {
      setError('App password must be at least 3 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    try {
      setLoading(true);
      await onSetupSuccess(password, timeout);
    } catch (err: any) {
      setError(err.message || 'Failed to setup app password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0a0a0a] text-[#e5e5e5] flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Subtle Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-950/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-emerald-950/15 rounded-full blur-3xl pointer-events-none" />

      <div
        id="app-lock-setup-card"
        className="w-full max-w-md bg-[#0d0d0d] border border-[#262626] rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 space-y-6"
      >
        {/* Official Logo Header */}
        <div className="text-center">
          <LedgerFlowLogo variant="lock-screen" size="lg" showTagline={false} />
          <div className="mt-4">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Secure Ledger Flow
            </h1>
            <p className="text-xs sm:text-sm text-[#737373] mt-1.5 leading-relaxed">
              Protect your private tasks and spreadsheet ledgers with an app password.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSetup} className="space-y-4">
          {error && (
            <div
              id="setup-error-message"
              className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800 text-xs font-medium text-rose-300"
            >
              {error}
            </div>
          )}

          {/* Create App Password */}
          <div>
            <label
              htmlFor="create-app-password-input"
              className="block text-xs font-semibold text-[#a3a3a3] uppercase tracking-wider mb-1.5"
            >
              Create App Password <span className="text-emerald-500">*</span>
            </label>
            <div className="relative">
              <input
                id="create-app-password-input"
                type={showPassword ? 'text' : 'password'}
                required
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new master password"
                autoComplete="new-password"
                className="w-full pl-3.5 pr-10 py-2.5 text-sm rounded-xl bg-[#171717] border border-[#262626] text-[#e5e5e5] focus:outline-none focus:border-emerald-500 placeholder:text-[#525252] font-mono transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#737373] hover:text-[#e5e5e5]"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm App Password */}
          <div>
            <label
              htmlFor="confirm-app-password-input"
              className="block text-xs font-semibold text-[#a3a3a3] uppercase tracking-wider mb-1.5"
            >
              Confirm App Password <span className="text-emerald-500">*</span>
            </label>
            <div className="relative">
              <input
                id="confirm-app-password-input"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter master password"
                autoComplete="new-password"
                className="w-full pl-3.5 pr-10 py-2.5 text-sm rounded-xl bg-[#171717] border border-[#262626] text-[#e5e5e5] focus:outline-none focus:border-emerald-500 placeholder:text-[#525252] font-mono transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#737373] hover:text-[#e5e5e5]"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Auto-Lock Preference Selection */}
          <div>
            <label
              htmlFor="setup-autolock-select"
              className="block text-xs font-semibold text-[#a3a3a3] uppercase tracking-wider mb-1.5"
            >
              Lock Ledger Flow Automatically
            </label>
            <div className="relative inline-flex w-full items-center">
              <Clock className="w-4 h-4 text-[#737373] absolute left-3 pointer-events-none" />
              <select
                id="setup-autolock-select"
                value={timeout}
                onChange={(e) => setTimeout(e.target.value as AppLockTimeout)}
                className="w-full pl-9 pr-4 py-2 text-xs font-medium rounded-xl bg-[#171717] border border-[#262626] text-[#e5e5e5] focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
              >
                <option value="closed" className="bg-[#171717]">When app is closed / reopened (Default)</option>
                <option value="immediately" className="bg-[#171717]">Immediately when switching apps/tabs</option>
                <option value="1m" className="bg-[#171717]">After 1 minute of inactivity</option>
                <option value="5m" className="bg-[#171717]">After 5 minutes of inactivity</option>
                <option value="15m" className="bg-[#171717]">After 15 minutes of inactivity</option>
              </select>
            </div>
          </div>

          {/* Cryptographic Protection Guarantee */}
          <div className="p-3.5 rounded-xl bg-[#141414] border border-emerald-900/30 flex items-start space-x-2.5 text-xs text-[#a3a3a3]">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-emerald-400">PBKDF2/SHA-512 Security:</strong> Passwords are cryptographically salted and hashed. Your business ledgers stay strictly confidential on this device.
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            id="enable-app-lock-btn"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-xl shadow-emerald-950/50 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
          >
            <Lock className="w-4 h-4" />
            <span>{loading ? 'Securing Ledger Flow...' : 'Enable App Lock'}</span>
          </button>
        </form>
      </div>

      <div className="mt-6 text-center text-xs text-[#525252] select-none">
        Ledger Flow • Zero-Login Private Business Records
      </div>
    </div>
  );
};
