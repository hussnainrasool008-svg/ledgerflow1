import React, { useState, useEffect } from 'react';
import { X, KeyRound, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { TaskSummary } from '../types';

interface ChangePasswordModalProps {
  isOpen: boolean;
  task: TaskSummary | null;
  onClose: () => void;
  onChangePassword: (taskId: string, currentPass: string, newPass: string) => Promise<void>;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  task,
  onClose,
  onChangePassword,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setError('');
      setSuccessMsg('');
    }
  }, [isOpen]);

  if (!isOpen || !task) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!currentPassword) {
      setError('Current password is required.');
      return;
    }
    if (!newPassword || newPassword.length < 3) {
      setError('New password must be at least 3 characters long.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('New passwords do not match. Please verify.');
      return;
    }

    try {
      setLoading(true);
      await onChangePassword(task.id, currentPassword, newPassword);
      setSuccessMsg('Password changed successfully.');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to change password. Please verify current password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        id="change-password-modal"
        className="w-full max-w-md bg-[#0d0d0d] rounded-2xl shadow-2xl border border-[#262626] overflow-hidden transform transition-all text-[#e5e5e5]"
      >
        <div className="px-6 py-5 border-b border-[#262626] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-[#171717] border border-[#262626] text-[#e5e5e5]">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Change Task Password
              </h2>
              <p className="text-xs text-[#737373]">
                Update security password for <span className="font-semibold text-[#a3a3a3]">"{task.task_name}"</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#737373] hover:text-[#e5e5e5] p-1.5 rounded-lg hover:bg-[#1f1f1f] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-xs font-medium text-rose-300">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-xs font-medium text-emerald-300">
              {successMsg}
            </div>
          )}

          {/* Current Password */}
          <div>
            <label
              htmlFor="current-password-input"
              className="block text-xs font-semibold text-[#a3a3a3] uppercase tracking-wider mb-1.5"
            >
              Current Password
            </label>
            <div className="relative">
              <input
                id="current-password-input"
                type={showCurrent ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full pl-3.5 pr-10 py-2.5 text-sm rounded-xl bg-[#171717] border border-[#262626] text-[#e5e5e5] focus:outline-none focus:border-emerald-500 placeholder:text-[#525252] font-mono transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#737373] hover:text-[#e5e5e5]"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label
              htmlFor="new-password-input"
              className="block text-xs font-semibold text-[#a3a3a3] uppercase tracking-wider mb-1.5"
            >
              New Password
            </label>
            <div className="relative">
              <input
                id="new-password-input"
                type={showNew ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full pl-3.5 pr-10 py-2.5 text-sm rounded-xl bg-[#171717] border border-[#262626] text-[#e5e5e5] focus:outline-none focus:border-emerald-500 placeholder:text-[#525252] font-mono transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#737373] hover:text-[#e5e5e5]"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <label
              htmlFor="confirm-new-password-input"
              className="block text-xs font-semibold text-[#a3a3a3] uppercase tracking-wider mb-1.5"
            >
              Confirm New Password
            </label>
            <div className="relative">
              <input
                id="confirm-new-password-input"
                type={showConfirm ? 'text' : 'password'}
                required
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full pl-3.5 pr-10 py-2.5 text-sm rounded-xl bg-[#171717] border border-[#262626] text-[#e5e5e5] focus:outline-none focus:border-emerald-500 placeholder:text-[#525252] font-mono transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#737373] hover:text-[#e5e5e5]"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold rounded-lg bg-[#171717] hover:bg-[#222] border border-[#262626] text-[#a3a3a3] hover:text-[#e5e5e5] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Updating...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
