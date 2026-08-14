import React, { useState, useEffect } from 'react';
import { X, Lock, Eye, EyeOff, KeyRound, AlertCircle, ShieldAlert } from 'lucide-react';
import { TaskSummary } from '../types';

interface UnlockTaskModalProps {
  isOpen: boolean;
  task: TaskSummary | null;
  onClose: () => void;
  onUnlock: (taskId: string, password: string) => Promise<void>;
}

export const UnlockTaskModal: React.FC<UnlockTaskModalProps> = ({
  isOpen,
  task,
  onClose,
  onUnlock,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldownSec, setCooldownSec] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError('');
      setShowPassword(false);
      setCooldownSec(null);
    }
  }, [isOpen, task?.id]);

  useEffect(() => {
    if (cooldownSec === null || cooldownSec <= 0) return;
    const timer = setInterval(() => {
      setCooldownSec((prev) => (prev && prev > 1 ? prev - 1 : null));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSec]);

  if (!isOpen || !task) return null;

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldownSec !== null && cooldownSec > 0) return;
    if (!password) {
      setError('Please enter the password for this task.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await onUnlock(task.id, password);
      setPassword('');
      onClose();
    } catch (err: any) {
      if (err.lockedRemainingSec) {
        setCooldownSec(err.lockedRemainingSec);
      }
      setError(err.message || 'Incorrect password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        id="unlock-task-modal"
        className="w-full max-w-md bg-[#0d0d0d] rounded-2xl shadow-2xl border border-[#262626] overflow-hidden transform transition-all text-[#e5e5e5]"
      >
        {/* Top visual decoration */}
        <div className="bg-[#141414] border-b border-[#262626] p-6 text-white text-center relative">
          <button
            id="close-unlock-modal-btn"
            onClick={onClose}
            className="absolute top-4 right-4 text-[#737373] hover:text-[#e5e5e5] p-1.5 rounded-lg hover:bg-[#1f1f1f] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Lock className="w-6 h-6" />
          </div>
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-[#1c1c1c] text-[11px] font-medium text-[#a3a3a3] mb-1.5 border border-[#262626]">
            <span>Protected Khata</span>
          </div>
          <h2 id="unlock-task-name" className="text-lg font-bold tracking-tight text-white px-2">
            {task.task_name}
          </h2>
          <p className="text-xs text-[#737373] mt-1 max-w-xs mx-auto">
            This khata is password protected. Enter your password to view entries and balance.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleUnlock} className="p-6 space-y-4">
          {error && (
            <div
              id="unlock-error-message"
              className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800 text-xs font-medium text-rose-300 flex items-start space-x-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {cooldownSec !== null && cooldownSec > 0 && (
            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800 text-xs font-medium text-amber-300 flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Security cooldown active. Retry in {cooldownSec}s.</span>
            </div>
          )}

          <div>
            <label
              htmlFor="unlock-password-input"
              className="block text-xs font-semibold text-[#a3a3a3] uppercase tracking-wider mb-1.5"
            >
              Khata Password
            </label>
            <div className="relative">
              <input
                id="unlock-password-input"
                type={showPassword ? 'text' : 'password'}
                required
                autoFocus
                disabled={cooldownSec !== null && cooldownSec > 0}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter khata password"
                autoComplete="current-password"
                className="w-full pl-3.5 pr-10 py-2.5 text-sm rounded-xl bg-[#171717] border border-[#262626] text-[#e5e5e5] focus:outline-none focus:border-emerald-500 transition-colors font-mono disabled:opacity-50 placeholder:text-[#525252]"
              />
              <button
                type="button"
                id="toggle-unlock-password-btn"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#737373] hover:text-[#e5e5e5]"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-[#737373]">
              <span>{showPassword ? 'Password visible' : 'Password hidden'}</span>
              <span>Secure authentication</span>
            </div>
          </div>

          <div className="pt-2 flex items-center space-x-3">
            <button
              type="button"
              id="cancel-unlock-btn"
              onClick={onClose}
              className="flex-1 py-2.5 text-xs font-semibold rounded-lg bg-[#171717] hover:bg-[#222] border border-[#262626] text-[#a3a3a3] hover:text-[#e5e5e5] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="submit-unlock-btn"
              disabled={loading || (cooldownSec !== null && cooldownSec > 0)}
              className="flex-1 py-2.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40 transition-all disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              <span>{loading ? 'Verifying...' : 'Unlock Khata'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
