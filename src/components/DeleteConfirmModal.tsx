import React, { useState } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import { TaskSummary } from '../types';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  task: TaskSummary | null;
  onClose: () => void;
  onConfirmDelete: (taskId: string) => Promise<void>;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  task,
  onClose,
  onConfirmDelete,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !task) return null;

  const handleDelete = async () => {
    try {
      setLoading(true);
      setError('');
      await onConfirmDelete(task.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete task.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        id="delete-task-modal"
        className="w-full max-w-md bg-[#0d0d0d] rounded-2xl shadow-2xl border border-[#262626] overflow-hidden transform transition-all p-6 space-y-4 text-[#e5e5e5]"
      >
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              Delete this task?
            </h2>
            <p className="text-xs text-[#737373]">
              <span className="font-semibold text-[#e5e5e5]">"{task.task_name}"</span>
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-xs font-medium text-rose-300">
            {error}
          </div>
        )}

        <blockquote className="p-3.5 rounded-xl bg-[#171717] border border-[#262626] text-xs text-[#a3a3a3] leading-relaxed">
          This will permanently delete this task and all of its {task.record_count} records. This action cannot be undone.
        </blockquote>

        <div className="pt-2 flex items-center justify-end space-x-3">
          <button
            type="button"
            id="cancel-delete-task-btn"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 text-xs font-semibold rounded-lg bg-[#171717] hover:bg-[#222] border border-[#262626] text-[#a3a3a3] hover:text-[#e5e5e5] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            id="confirm-delete-task-btn"
            onClick={handleDelete}
            disabled={loading}
            className="px-5 py-2.5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-950/40 transition-all disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>{loading ? 'Deleting...' : 'Delete Task'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
