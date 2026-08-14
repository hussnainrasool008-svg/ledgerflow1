import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Pin,
  PinOff,
  Archive,
  ArchiveRestore,
  Trash2,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Copy,
  Check,
  Calendar,
} from 'lucide-react';
import { Note, AutoSaveStatus } from '../../types';

interface NoteEditorProps {
  note: Note | null;
  onUpdateNote: (updated: Partial<Note>) => void;
  onDeleteNote: (noteId: string) => void;
  onRestoreNote: (noteId: string) => void;
  onPermanentDeleteNote: (noteId: string) => void;
  onBack?: () => void; // Used for mobile back navigation
  saveStatus: AutoSaveStatus;
  isMobile?: boolean;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({
  note,
  onUpdateNote,
  onDeleteNote,
  onRestoreNote,
  onPermanentDeleteNote,
  onBack,
  saveStatus,
  isMobile,
}) => {
  const [copied, setCopied] = useState(false);
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  // Focus title if it's a new empty note
  useEffect(() => {
    if (note && !note.title && !note.content && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [note?.id]);

  if (!note) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center text-[#737373] bg-[#0d0d0d] rounded-2xl border border-[#262626]">
        <div className="w-16 h-16 rounded-2xl bg-[#171717] border border-[#262626] flex items-center justify-center mb-4 text-[#525252]">
          <FileText className="w-8 h-8" />
        </div>
        <h3 className="text-base font-semibold text-[#e5e5e5] mb-1">No Note Selected</h3>
        <p className="text-xs text-[#737373] max-w-sm">
          Select a note from the list on the left or create a new note to start writing.
        </p>
      </div>
    );
  }

  const wordCount = note.content.trim() ? note.content.trim().split(/\s+/).length : 0;
  const charCount = note.content.length;

  const handleCopyContent = () => {
    const textToCopy = `${note.title}\n\n${note.content}`.trim();
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedDate = new Date(note.updated_at || note.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="h-full flex flex-col bg-[#0f0f0f] md:rounded-2xl md:border md:border-[#262626] overflow-hidden">
      {/* Top Action Header */}
      <div className="flex items-center justify-between px-3 sm:px-6 py-3 border-b border-[#262626] bg-[#141414] shrink-0 gap-2">
        {/* Left: Mobile Back Button & Status Indicator */}
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          {onBack && (
            <button
              id="note-editor-back-btn"
              onClick={onBack}
              className="p-2 -ml-1 rounded-lg text-[#a3a3a3] hover:text-white hover:bg-[#222] transition-colors cursor-pointer"
              title="Back to notes list"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          {/* Sync / Auto-save Status Badge */}
          <div
            id="note-autosave-badge"
            className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#1c1c1c] border border-[#2e2e2e]"
          >
            {saveStatus === 'saved' && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-semibold text-emerald-400">SAVED</span>
              </>
            )}
            {saveStatus === 'saving' && (
              <>
                <Clock className="w-3 h-3 text-amber-400 animate-spin" />
                <span className="font-semibold text-amber-400">SAVING...</span>
              </>
            )}
            {saveStatus === 'error' && (
              <>
                <AlertCircle className="w-3 h-3 text-rose-400" />
                <span className="font-semibold text-rose-400">ERROR</span>
              </>
            )}
          </div>

          {/* Word Count / Character Count Pill */}
          <div className="hidden sm:inline-flex items-center space-x-2 text-[11px] text-[#737373]">
            <span>{wordCount} words</span>
            <span>•</span>
            <span>{charCount} chars</span>
          </div>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center space-x-1 sm:space-x-1.5">
          {note.is_deleted ? (
            /* Trashed Note Actions: Restore or Delete Permanently */
            <>
              <button
                id="restore-note-btn"
                onClick={() => onRestoreNote(note.id)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-700/50 text-emerald-300 transition-colors cursor-pointer"
                title="Restore note from Trash"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore</span>
              </button>

              <button
                id="permanent-delete-note-btn"
                onClick={() => onPermanentDeleteNote(note.id)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-950/60 hover:bg-rose-900 border border-rose-700/50 text-rose-300 transition-colors cursor-pointer"
                title="Delete note permanently"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Forever</span>
              </button>
            </>
          ) : (
            /* Active Note Actions: Copy, Pin, Archive, Trash */
            <>
              {/* Copy Note Button */}
              <button
                id="copy-note-content-btn"
                onClick={handleCopyContent}
                className="p-2 rounded-lg text-[#a3a3a3] hover:text-white hover:bg-[#222] transition-colors cursor-pointer"
                title="Copy note text"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>

              {/* Pin Note Button */}
              <button
                id="toggle-pin-note-btn"
                onClick={() => onUpdateNote({ is_pinned: !note.is_pinned })}
                className={`p-2 rounded-lg transition-colors cursor-pointer ${
                  note.is_pinned
                    ? 'text-amber-400 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20'
                    : 'text-[#a3a3a3] hover:text-white hover:bg-[#222]'
                }`}
                title={note.is_pinned ? 'Unpin note' : 'Pin note to top'}
              >
                {note.is_pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
              </button>

              {/* Archive Note Button */}
              <button
                id="toggle-archive-note-btn"
                onClick={() => onUpdateNote({ is_archived: !note.is_archived })}
                className={`p-2 rounded-lg transition-colors cursor-pointer ${
                  note.is_archived
                    ? 'text-sky-400 bg-sky-500/10 border border-sky-500/30 hover:bg-sky-500/20'
                    : 'text-[#a3a3a3] hover:text-white hover:bg-[#222]'
                }`}
                title={note.is_archived ? 'Unarchive note' : 'Archive note'}
              >
                {note.is_archived ? (
                  <ArchiveRestore className="w-4 h-4" />
                ) : (
                  <Archive className="w-4 h-4" />
                )}
              </button>

              {/* Move to Trash Button */}
              <button
                id="trash-note-btn"
                onClick={() => onDeleteNote(note.id)}
                className="p-2 rounded-lg text-[#a3a3a3] hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
                title="Move note to Trash"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto space-y-3">
        {/* Trashed or Archived Notice Banner if applicable */}
        {note.is_deleted && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs flex items-center justify-between">
            <span className="flex items-center space-x-2">
              <Trash2 className="w-4 h-4 shrink-0" />
              <span>This note is in the Trash. Restore it to make edits.</span>
            </span>
            <button
              onClick={() => onRestoreNote(note.id)}
              className="text-xs font-bold underline hover:text-white ml-2 shrink-0"
            >
              Restore Note
            </button>
          </div>
        )}

        {note.is_archived && !note.is_deleted && (
          <div className="p-3 rounded-xl bg-sky-950/30 border border-sky-800/40 text-sky-300 text-xs flex items-center justify-between">
            <span className="flex items-center space-x-2">
              <Archive className="w-4 h-4 shrink-0" />
              <span>This note is archived.</span>
            </span>
            <button
              onClick={() => onUpdateNote({ is_archived: false })}
              className="text-xs font-bold underline hover:text-white ml-2 shrink-0"
            >
              Unarchive
            </button>
          </div>
        )}

        {/* Title Input Field */}
        <input
          id="note-title-input"
          ref={titleInputRef}
          type="text"
          value={note.title}
          disabled={note.is_deleted}
          onChange={(e) => onUpdateNote({ title: e.target.value })}
          placeholder="Note title..."
          className="w-full bg-transparent text-xl sm:text-2xl font-bold text-white placeholder-[#525252] focus:outline-none border-b border-transparent focus:border-[#333] pb-2 transition-colors disabled:opacity-70"
        />

        {/* Metadata Bar (Date & Tags) */}
        <div className="flex items-center space-x-2 text-xs text-[#666] pb-1">
          <Calendar className="w-3.5 h-3.5" />
          <span>Last modified: {formattedDate}</span>
        </div>

        {/* Unlimited Content Textarea */}
        <textarea
          id="note-content-textarea"
          value={note.content}
          disabled={note.is_deleted}
          onChange={(e) => onUpdateNote({ content: e.target.value })}
          placeholder="Write your note, business ideas, meeting minutes, client terms, or task reminders here..."
          className="flex-1 w-full bg-transparent text-sm sm:text-base leading-relaxed text-[#e5e5e5] placeholder-[#404040] focus:outline-none resize-none min-h-[300px] sm:min-h-[420px] font-sans disabled:opacity-70"
        />
      </div>
    </div>
  );
};
