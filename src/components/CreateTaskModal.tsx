import React, { useState } from 'react';
import { X, Lock, Eye, EyeOff, ShieldCheck, PlusCircle, Sparkles } from 'lucide-react';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (taskName: string, password: string) => Promise<void>;
}

const EXAMPLE_SUGGESTIONS = [
  'September Sales',
  'August Customer Records',
  'Supplier Payments',
  'Daily Purchases',
  'Ali Traders Records',
  '2026 Sales Ledger',
];

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [taskName, setTaskName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedName = taskName.trim();
    if (!trimmedName) {
      setError('Task Name is required.');
      return;
    }

    if (!password) {
      setError('Password is required to protect this task.');
      return;
    }

    if (password.length < 3) {
      setError('Password must be at least 3 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    try {
      setLoading(true);
      await onSubmit(trimmedName, password);
      // reset form
      setTaskName('');
      setPassword('');
      setConfirmPassword('');
      setError('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create task. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        id="create-task-modal"
        className="w-full max-w-lg bg-[#0d0d0d] rounded-2xl shadow-2xl border border-[#262626] overflow-hidden transform transition-all text-[#e5e5e5]"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#262626] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-900/40 text-emerald-400 flex items-center justify-center">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                Create New Task
              </h2>
              <p className="text-xs text-[#737373]">
                Name your ledger & set a private password
              </p>
            </div>
          </div>
          <button
            id="close-create-task-modal-btn"
            onClick={onClose}
            className="text-[#737373] hover:text-[#e5e5e5] p-1.5 rounded-lg hover:bg-[#1f1f1f] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div
              id="create-task-error"
              className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800 text-xs font-medium text-rose-300"
            >
              {error}
            </div>
          )}

          {/* Task Name */}
          <div>
            <label
              htmlFor="task-name-input"
              className="block text-xs font-semibold text-[#a3a3a3] uppercase tracking-wider mb-1.5"
            >
              Task Name <span className="text-emerald-500">*</span>
            </label>
            <input
              id="task-name-input"
              type="text"
              required
              autoFocus
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder="e.g. September Sales"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[#171717] border border-[#262626] text-[#e5e5e5] focus:outline-none focus:border-emerald-500 placeholder:text-[#525252] transition-colors"
            />
            {/* Quick Suggestions Chips */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="text-[11px] text-[#737373] py-0.5 flex items-center mr-1">
                <Sparkles className="w-3 h-3 mr-1 text-emerald-400" /> Quick names:
              </span>
              {EXAMPLE_SUGGESTIONS.slice(0, 3).map((sugg) => (
                <button
                  type="button"
                  key={sugg}
                  onClick={() => setTaskName(sugg)}
                  className="text-[11px] px-2 py-0.5 rounded bg-[#171717] border border-[#262626] text-[#a3a3a3] hover:text-[#e5e5e5] hover:bg-[#222] transition-colors"
                >
                  {sugg}
                </button>
              ))}
            </div>
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="task-password-input"
              className="block text-xs font-semibold text-[#a3a3a3] uppercase tracking-wider mb-1.5"
            >
              Password <span className="text-emerald-500">*</span>
            </label>
            <div className="relative">
              <input
                id="task-password-input"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password for this task"
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

          {/* Confirm Password */}
          <div>
            <label
              htmlFor="task-confirm-password-input"
              className="block text-xs font-semibold text-[#a3a3a3] uppercase tracking-wider mb-1.5"
            >
              Confirm Password <span className="text-emerald-500">*</span>
            </label>
            <div className="relative">
              <input
                id="task-confirm-password-input"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password to confirm"
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

          {/* Security Notice */}
          <div className="p-3.5 rounded-xl bg-[#141414] border border-emerald-900/30 flex items-start space-x-2.5 text-xs text-[#a3a3a3]">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-emerald-400">Private &amp; Secure:</strong> Passwords are protected via one-way cryptographic hashing (PBKDF2/SHA-512) and are never stored in plain text.
            </p>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              id="cancel-create-task-btn"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 text-xs font-semibold rounded-lg bg-[#171717] hover:bg-[#222] border border-[#262626] text-[#a3a3a3] hover:text-[#e5e5e5] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="submit-create-task-btn"
              disabled={loading}
              className="px-5 py-2.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Creating...' : 'Continue / Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
