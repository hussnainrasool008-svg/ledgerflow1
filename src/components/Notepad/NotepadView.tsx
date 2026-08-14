import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Plus,
  Search,
  Pin,
  Archive,
  Trash2,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowUpDown,
  RotateCcw,
  Sparkles,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { Note, NoteSection, NoteSortOption, AutoSaveStatus } from '../../types';
import { NoteEditor } from './NoteEditor';
import { api } from '../../lib/api';

interface NotepadViewProps {
  onBackToDashboard?: () => void;
}

export const NotepadView: React.FC<NotepadViewProps> = ({ onBackToDashboard }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<NoteSection>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOption, setSortOption] = useState<NoteSortOption>('updated_desc');
  const [saveStatus, setSaveStatus] = useState<AutoSaveStatus>('saved');
  const [isMobileEditorOpen, setIsMobileEditorOpen] = useState<boolean>(false);

  // Modals for destructive actions
  const [permanentDeleteId, setPermanentDeleteId] = useState<string | null>(null);
  const [showEmptyTrashModal, setShowEmptyTrashModal] = useState<boolean>(false);

  // Load notes on mount
  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true);
      const loaded = await api.getNotes();
      setNotes(loaded);

      // If on desktop and nothing selected, select first active note
      if (loaded.length > 0 && !selectedNoteId) {
        const firstActive = loaded.find((n) => !n.is_deleted && !n.is_archived);
        if (firstActive) {
          setSelectedNoteId(firstActive.id);
        } else {
          setSelectedNoteId(loaded[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load notes:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedNoteId]);

  useEffect(() => {
    fetchNotes();
  }, []);

  // Compute counts for badges
  const counts = useMemo(() => {
    let all = 0;
    let pinned = 0;
    let archived = 0;
    let trash = 0;

    for (const n of notes) {
      if (n.is_deleted) {
        trash++;
      } else if (n.is_archived) {
        archived++;
      } else {
        all++;
        if (n.is_pinned) pinned++;
      }
    }

    return { all, pinned, archived, trash };
  }, [notes]);

  // Filtered & Sorted Notes
  const displayedNotes = useMemo(() => {
    return notes
      .filter((n) => {
        // Section filter
        if (activeSection === 'trash') {
          if (!n.is_deleted) return false;
        } else if (activeSection === 'archived') {
          if (n.is_deleted || !n.is_archived) return false;
        } else if (activeSection === 'pinned') {
          if (n.is_deleted || n.is_archived || !n.is_pinned) return false;
        } else {
          // 'all' section (active non-archived notes)
          if (n.is_deleted || n.is_archived) return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = (n.title || '').toLowerCase().includes(q);
          const matchContent = (n.content || '').toLowerCase().includes(q);
          return matchTitle || matchContent;
        }

        return true;
      })
      .sort((a, b) => {
        // Pinned notes always top in 'all' section
        if (activeSection === 'all') {
          if (a.is_pinned && !b.is_pinned) return -1;
          if (!a.is_pinned && b.is_pinned) return 1;
        }

        switch (sortOption) {
          case 'updated_desc':
            return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
          case 'updated_asc':
            return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
          case 'created_desc':
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          case 'title_asc':
            return (a.title || 'Untitled').localeCompare(b.title || 'Untitled');
          case 'title_desc':
            return (b.title || 'Untitled').localeCompare(a.title || 'Untitled');
          default:
            return 0;
        }
      });
  }, [notes, activeSection, searchQuery, sortOption]);

  // Find currently active selected note
  const selectedNote = useMemo(() => {
    return notes.find((n) => n.id === selectedNoteId) || null;
  }, [notes, selectedNoteId]);

  // Debounced Auto-save
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleUpdateNote = (updatedFields: Partial<Note>) => {
    if (!selectedNoteId) return;

    // Immediately update local state for instant snappy UI
    setNotes((prev) =>
      prev.map((n) =>
        n.id === selectedNoteId
          ? { ...n, ...updatedFields, updated_at: new Date().toISOString() }
          : n
      )
    );

    setSaveStatus('saving');
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const saved = await api.saveNote({
          id: selectedNoteId,
          ...updatedFields,
        });
        setNotes((prev) => prev.map((n) => (n.id === saved.id ? saved : n)));
        setSaveStatus('saved');
      } catch (err) {
        console.error('Auto-save note error:', err);
        setSaveStatus('error');
      }
    }, 500);
  };

  // Create New Note
  const handleCreateNote = async () => {
    try {
      setSaveStatus('saving');
      const newNote = await api.saveNote({
        title: '',
        content: '',
        is_pinned: false,
        is_archived: false,
        is_deleted: false,
      });

      setNotes((prev) => [newNote, ...prev]);
      setSelectedNoteId(newNote.id);
      setActiveSection('all');
      setIsMobileEditorOpen(true);
      setSaveStatus('saved');
    } catch (err) {
      console.error('Failed to create note:', err);
      setSaveStatus('error');
    }
  };

  // Move Note to Trash
  const handleDeleteNote = async (noteId: string) => {
    try {
      await api.deleteNote(noteId);
      setNotes((prev) =>
        prev.map((n) => (n.id === noteId ? { ...n, is_deleted: true } : n))
      );

      // Select next available note
      const remaining = displayedNotes.filter((n) => n.id !== noteId);
      if (remaining.length > 0) {
        setSelectedNoteId(remaining[0].id);
      } else {
        setSelectedNoteId(null);
        setIsMobileEditorOpen(false);
      }
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  // Restore Note from Trash
  const handleRestoreNote = async (noteId: string) => {
    try {
      await api.restoreNote(noteId);
      setNotes((prev) =>
        prev.map((n) => (n.id === noteId ? { ...n, is_deleted: false } : n))
      );
    } catch (err) {
      console.error('Failed to restore note:', err);
    }
  };

  // Permanently Delete Note
  const handleConfirmPermanentDelete = async () => {
    if (!permanentDeleteId) return;
    try {
      await api.permanentDeleteNote(permanentDeleteId);
      setNotes((prev) => prev.filter((n) => n.id !== permanentDeleteId));
      if (selectedNoteId === permanentDeleteId) {
        setSelectedNoteId(null);
        setIsMobileEditorOpen(false);
      }
      setPermanentDeleteId(null);
    } catch (err) {
      console.error('Failed to permanently delete note:', err);
    }
  };

  // Empty Entire Trash
  const handleConfirmEmptyTrash = async () => {
    try {
      await api.emptyTrash();
      setNotes((prev) => prev.filter((n) => !n.is_deleted));
      setSelectedNoteId(null);
      setIsMobileEditorOpen(false);
      setShowEmptyTrashModal(false);
    } catch (err) {
      console.error('Failed to empty trash:', err);
    }
  };

  return (
    <div id="notepad-container" className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 h-[calc(100vh-4.5rem)] flex flex-col">
      {/* Top Header & Fast Actions */}
      <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-[#262626] shrink-0">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center text-emerald-400">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center space-x-2">
              <span>Personal & Business Notes</span>
            </h1>
            <p className="text-[11px] text-[#737373] hidden sm:block">
              Encrypted in your private Firestore space • Auto-saved in real time
            </p>
          </div>
        </div>

        {/* New Note Action */}
        <button
          id="create-new-note-btn"
          onClick={handleCreateNote}
          className="flex items-center space-x-1.5 px-3.5 sm:px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40 transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>+ New Note</span>
        </button>
      </div>

      {/* Main Split Layout: Sidebar List + Full Editor */}
      <div className="flex-1 flex gap-4 pt-3 sm:pt-4 overflow-hidden relative">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: Section Pills, Search Bar, Sort, and Scrollable Notes List */}
        {/* ========================================================================= */}
        <div
          className={`w-full md:w-80 lg:w-96 flex flex-col space-y-3 shrink-0 ${
            isMobileEditorOpen ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Section Filter Pills */}
          <div className="grid grid-cols-4 gap-1 bg-[#141414] p-1 rounded-xl border border-[#262626] shrink-0">
            <button
              id="notes-tab-all"
              onClick={() => setActiveSection('all')}
              className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all flex flex-col items-center justify-center cursor-pointer ${
                activeSection === 'all'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-[#888] hover:text-[#e5e5e5]'
              }`}
            >
              <span>All</span>
              <span className="text-[10px] opacity-80">({counts.all})</span>
            </button>

            <button
              id="notes-tab-pinned"
              onClick={() => setActiveSection('pinned')}
              className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all flex flex-col items-center justify-center cursor-pointer ${
                activeSection === 'pinned'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-[#888] hover:text-amber-400'
              }`}
            >
              <span>Pinned</span>
              <span className="text-[10px] opacity-80">({counts.pinned})</span>
            </button>

            <button
              id="notes-tab-archived"
              onClick={() => setActiveSection('archived')}
              className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all flex flex-col items-center justify-center cursor-pointer ${
                activeSection === 'archived'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-[#888] hover:text-sky-400'
              }`}
            >
              <span>Archived</span>
              <span className="text-[10px] opacity-80">({counts.archived})</span>
            </button>

            <button
              id="notes-tab-trash"
              onClick={() => setActiveSection('trash')}
              className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all flex flex-col items-center justify-center cursor-pointer ${
                activeSection === 'trash'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-[#888] hover:text-rose-400'
              }`}
            >
              <span>Trash</span>
              <span className="text-[10px] opacity-80">({counts.trash})</span>
            </button>
          </div>

          {/* Search & Sort Controls */}
          <div className="flex items-center space-x-2 shrink-0">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-[#666] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="search-notes-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notes..."
                className="w-full pl-8 pr-7 py-2 text-xs rounded-lg bg-[#141414] border border-[#262626] text-[#e5e5e5] placeholder-[#555] focus:outline-none focus:border-emerald-600 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#737373] hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Sort Selector */}
            <select
              id="sort-notes-select"
              aria-label="Sort notes"
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as NoteSortOption)}
              className="px-2 py-2 text-xs font-medium bg-[#141414] text-[#a3a3a3] rounded-lg border border-[#262626] focus:outline-none focus:border-emerald-600 cursor-pointer"
            >
              <option value="updated_desc">Recent</option>
              <option value="updated_asc">Oldest</option>
              <option value="title_asc">Title A-Z</option>
              <option value="title_desc">Title Z-A</option>
            </select>
          </div>

          {/* Trash Header Notice & Empty Trash Button */}
          {activeSection === 'trash' && counts.trash > 0 && (
            <div className="flex items-center justify-between px-3 py-2 bg-rose-950/30 border border-rose-900/40 rounded-xl text-xs text-rose-300 shrink-0">
              <span>{counts.trash} notes in Trash</span>
              <button
                id="empty-trash-btn"
                onClick={() => setShowEmptyTrashModal(true)}
                className="font-bold underline hover:text-white"
              >
                Empty Trash
              </button>
            </div>
          )}

          {/* Scrollable Notes List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 custom-scrollbar">
            {loading ? (
              <div className="py-12 text-center text-[#737373] text-xs">
                <div className="w-6 h-6 border-2 border-[#333] border-t-emerald-500 rounded-full animate-spin mx-auto mb-2" />
                <span>Loading notes...</span>
              </div>
            ) : displayedNotes.length === 0 ? (
              <div className="py-12 px-4 text-center text-[#737373] bg-[#111] rounded-2xl border border-[#222] my-2">
                <FileText className="w-8 h-8 mx-auto mb-2 text-[#444]" />
                <p className="text-xs font-medium text-[#aaa] mb-1">
                  {searchQuery
                    ? 'No matching notes found.'
                    : activeSection === 'trash'
                    ? 'Trash is empty.'
                    : activeSection === 'archived'
                    ? 'No archived notes.'
                    : activeSection === 'pinned'
                    ? 'No pinned notes yet.'
                    : 'No notes yet.'}
                </p>
                {activeSection === 'all' && !searchQuery && (
                  <button
                    onClick={handleCreateNote}
                    className="mt-2 text-xs text-emerald-400 font-semibold hover:underline inline-flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create your first note</span>
                  </button>
                )}
              </div>
            ) : (
              displayedNotes.map((n) => {
                const isSelected = n.id === selectedNoteId;
                const formattedDate = new Date(n.updated_at || n.created_at).toLocaleDateString(
                  'en-US',
                  {
                    month: 'short',
                    day: 'numeric',
                  }
                );

                return (
                  <div
                    key={n.id}
                    id={`note-card-${n.id}`}
                    onClick={() => {
                      setSelectedNoteId(n.id);
                      setIsMobileEditorOpen(true);
                    }}
                    className={`p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer select-none text-left relative group ${
                      isSelected
                        ? 'bg-[#1a1a1a] border-emerald-600/70 shadow-md ring-1 ring-emerald-600/30'
                        : 'bg-[#111111] border-[#262626] hover:border-[#383838] hover:bg-[#161616]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3
                        className={`text-xs sm:text-sm font-semibold truncate ${
                          isSelected ? 'text-white' : 'text-[#e5e5e5]'
                        }`}
                      >
                        {n.title.trim() ? n.title : <span className="italic text-[#666]">Untitled Note</span>}
                      </h3>

                      {/* Status Badges */}
                      <div className="flex items-center space-x-1 shrink-0">
                        {n.is_pinned && !n.is_deleted && (
                          <span
                            title="Pinned"
                            className="p-1 rounded bg-amber-500/10 text-amber-400 text-[10px]"
                          >
                            <Pin className="w-3 h-3 fill-amber-400/30" />
                          </span>
                        )}
                        {n.is_archived && !n.is_deleted && (
                          <span
                            title="Archived"
                            className="p-1 rounded bg-sky-500/10 text-sky-400 text-[10px]"
                          >
                            <Archive className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Preview Snippet */}
                    <p className="text-xs text-[#737373] line-clamp-2 mt-1.5 leading-relaxed font-sans">
                      {n.content.trim() ? n.content : <span className="italic text-[#444]">Empty content...</span>}
                    </p>

                    {/* Footer Date & Arrow for mobile */}
                    <div className="flex items-center justify-between text-[10px] text-[#555] mt-2 pt-2 border-t border-[#1f1f1f]">
                      <span>{formattedDate}</span>
                      <ChevronRight className="w-3.5 h-3.5 md:hidden text-[#444] group-hover:text-white" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: Full Dedicated Note Editor */}
        {/* ========================================================================= */}
        <div
          className={`flex-1 h-full ${
            isMobileEditorOpen ? 'flex' : 'hidden md:flex'
          }`}
        >
          <NoteEditor
            note={selectedNote}
            onUpdateNote={handleUpdateNote}
            onDeleteNote={handleDeleteNote}
            onRestoreNote={handleRestoreNote}
            onPermanentDeleteNote={(id) => setPermanentDeleteId(id)}
            onBack={() => setIsMobileEditorOpen(false)}
            saveStatus={saveStatus}
            isMobile={isMobileEditorOpen}
          />
        </div>
      </div>

      {/* Confirmation Modal for Permanent Delete */}
      {permanentDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-[#171717] border border-[#2e2e2e] p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-rose-950/60 border border-rose-800/50 flex items-center justify-center text-rose-400 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-white">Delete Note Forever?</h3>
              <p className="text-xs text-[#888]">
                This note will be permanently removed from your Firestore database and cannot be recovered.
              </p>
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setPermanentDeleteId(null)}
                className="flex-1 py-2 rounded-lg bg-[#222] hover:bg-[#2a2a2a] text-xs font-semibold text-[#bbb] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPermanentDelete}
                className="flex-1 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white transition-colors"
              >
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Empty Trash */}
      {showEmptyTrashModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-[#171717] border border-[#2e2e2e] p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-rose-950/60 border border-rose-800/50 flex items-center justify-center text-rose-400 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-white">Empty Entire Trash?</h3>
              <p className="text-xs text-[#888]">
                All {counts.trash} notes in the Trash will be permanently deleted from Firestore.
              </p>
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowEmptyTrashModal(false)}
                className="flex-1 py-2 rounded-lg bg-[#222] hover:bg-[#2a2a2a] text-xs font-semibold text-[#bbb] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmEmptyTrash}
                className="flex-1 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white transition-colors"
              >
                Empty All Trash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
