import React, { useState, useRef } from 'react';
import { X, Download, Upload, ShieldCheck, CheckCircle2, AlertCircle, FileJson } from 'lucide-react';
import { api } from '../lib/api';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshTasks: () => Promise<void>;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  onRefreshTasks,
}) => {
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleExportBackup = async () => {
    try {
      setDownloading(true);
      setStatusMessage(null);
      const data = await api.exportBackup();
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ledgerflow_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setStatusMessage({ type: 'success', text: 'Backup file downloaded successfully.' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to export backup.' });
    } finally {
      setDownloading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setStatusMessage(null);
      const text = await file.text();
      const parsed = JSON.parse(text);

      const result = await api.restoreBackup(parsed);
      await onRefreshTasks();
      setStatusMessage({
        type: 'success',
        text: `Backup restored successfully! Imported ${result.importedCount} tasks.`,
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Invalid backup file format.',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        id="backup-modal"
        className="w-full max-w-lg bg-[#0d0d0d] rounded-2xl shadow-2xl border border-[#262626] overflow-hidden transform transition-all text-[#e5e5e5]"
      >
        <div className="px-6 py-5 border-b border-[#262626] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-[#171717] border border-[#262626] text-[#e5e5e5]">
              <FileJson className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Backup &amp; Restore
              </h2>
              <p className="text-xs text-[#737373]">
                Full data portability for your login-free private ledgers
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

        <div className="p-6 space-y-5">
          {statusMessage && (
            <div
              className={`p-3.5 rounded-xl border text-xs font-medium flex items-start space-x-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-800 text-rose-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Export Box */}
          <div className="p-4 rounded-2xl bg-[#141414] border border-[#262626] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-white">
                Download Backup
              </h3>
              <p className="text-xs text-[#737373] mt-0.5">
                Save an encrypted, structured JSON backup of all your tasks and records to your device.
              </p>
            </div>
            <button
              id="export-backup-btn"
              onClick={handleExportBackup}
              disabled={downloading}
              className="px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-950/40 flex items-center space-x-2 shrink-0 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{downloading ? 'Downloading...' : 'Download JSON'}</span>
            </button>
          </div>

          {/* Import Box */}
          <div className="p-4 rounded-2xl bg-[#141414] border border-[#262626] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-white">
                Restore from Backup
              </h3>
              <p className="text-xs text-[#737373] mt-0.5">
                Upload a previously exported Ledger Flow JSON file to restore your tasks.
              </p>
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="hidden"
                id="restore-file-input"
              />
              <button
                id="select-restore-file-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-4 py-2.5 rounded-lg bg-[#1c1c1c] hover:bg-[#262626] text-[#e5e5e5] border border-[#262626] font-semibold text-xs shadow-sm flex items-center space-x-2 shrink-0 disabled:opacity-50 transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>{uploading ? 'Restoring...' : 'Upload & Restore'}</span>
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-[11px] text-[#737373]">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Passwords remain cryptographically protected in backup exports.</span>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 text-xs font-semibold rounded-lg bg-[#171717] hover:bg-[#222] border border-[#262626] text-[#e5e5e5] transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
