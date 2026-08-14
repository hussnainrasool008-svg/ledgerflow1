import React, { useState, useEffect } from 'react';
import { X, Edit3 } from 'lucide-react';
import { TaskSummary } from '../types';

interface RenameTaskModalProps {
  isOpen: boolean;
  task: TaskSummary | null;
  onClose: () => void;
  onRename: (taskId: string, newName: string) => Promise<void>;
}

export const RenameTaskModal: React.FC<RenameTaskModalProps> = ({
  isOpen,
  task,
  onClose,
  onRename,
}) => {
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (task && isOpen) {
      setNewName(task.task_name);
      setError('');
    }
  }, [task, isOpen]);

  if (!isOpen || !task) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) {
      setError('Task name cannot be empty.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await onRename(task.id, trimmed);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to rename task.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        id="rename-task-modal"
        className="w-full max-w-md bg-[#0d0d0d] rounded-2xl shadow-2xl border border-[#262626] overflow-hidden transform transition-all text-[#e5e5e5]"
      >
        <div className="px-6 py-5 border-b border-[#262626] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-[#171717] border border-[#262626] text-[#e5e5e5]">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Rename Khata
              </h2>
              <p className="text-xs text-[#737373]">
                Update the display name of this business khata
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
              htmlFor="rename-input"
              className="block text-xs font-semibold text-[#a3a3a3] uppercase tracking-wider mb-1.5"
            >
              Khata Name
            </label>
            <input
              id="rename-input"
              type="text"
              required
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Al-Madina Hardware Khata"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[#171717] border border-[#262626] text-[#e5e5e5] focus:outline-none focus:border-emerald-500 placeholder:text-[#525252] transition-colors"
            />
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
              {loading ? 'Saving...' : 'Save Name'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
