import React, { useState, useEffect } from 'react';
import { X, Copy, Eye, EyeOff } from 'lucide-react';
import { TaskSummary } from '../types';

interface DuplicateTaskModalProps {
  isOpen: boolean;
  task: TaskSummary | null;
  onClose: () => void;
  onDuplicate: (taskId: string, newName: string, newPassword: string) => Promise<void>;
}

export const DuplicateTaskModal: React.FC<DuplicateTaskModalProps> = ({
  isOpen,
  task,
  onClose,
  onDuplicate,
}) => {
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (task && isOpen) {
      setNewName(`${task.task_name} (Copy)`);
      setNewPassword('');
      setConfirmPassword('');
      setError('');
    }
  }, [task, isOpen]);

  if (!isOpen || !task) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) {
      setError('Task name is required.');
      return;
    }
    if (!newPassword || newPassword.length < 3) {
      setError('Password for new duplicate must be at least 3 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await onDuplicate(task.id, trimmed, newPassword);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to duplicate task.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        id="duplicate-task-modal"
        className="w-full max-w-md bg-[#0d0d0d] rounded-2xl shadow-2xl border border-[#262626] overflow-hidden transform transition-all text-[#e5e5e5]"
      >
        <div className="px-6 py-5 border-b border-[#262626] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-[#171717] border border-[#262626] text-[#e5e5e5]">
              <Copy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Duplicate Task
              </h2>
              <p className="text-xs text-[#737373]">
                Clone records to a new protected ledger
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

          <div>
            <label
              htmlFor="duplicate-name-input"
              className="block text-xs font-semibold text-[#a3a3a3] uppercase tracking-wider mb-1.5"
            >
              New Task Name
            </label>
            <input
              id="duplicate-name-input"
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[#171717] border border-[#262626] text-[#e5e5e5] focus:outline-none focus:border-emerald-500 placeholder:text-[#525252] transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="duplicate-password-input"
              className="block text-xs font-semibold text-[#a3a3a3] uppercase tracking-wider mb-1.5"
            >
              New Password
            </label>
            <div className="relative">
              <input
                id="duplicate-password-input"
                type={showPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter password for duplicate task"
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

          <div>
            <label
              htmlFor="duplicate-confirm-password-input"
              className="block text-xs font-semibold text-[#a3a3a3] uppercase tracking-wider mb-1.5"
            >
              Confirm New Password
            </label>
            <div className="relative">
              <input
                id="duplicate-confirm-password-input"
                type={showConfirm ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
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
              {loading ? 'Duplicating...' : 'Duplicate Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
