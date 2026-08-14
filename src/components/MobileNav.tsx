import React from 'react';
import { LayoutDashboard, FileText, Users, Shield, Plus } from 'lucide-react';

export type MainNavView = 'tasks' | 'notes';

interface MobileNavProps {
  currentView: MainNavView;
  onChangeView: (view: MainNavView) => void;
  onOpenSettings: () => void;
  onOpenCreateTask?: () => void;
  isInsideTask?: boolean;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  currentView,
  onChangeView,
  onOpenSettings,
  onOpenCreateTask,
  isInsideTask,
}) => {
  return (
    <nav
      id="mobile-bottom-nav"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0d0d0d]/95 backdrop-blur-lg border-t border-[#262626] pb-[env(safe-area-inset-bottom)] transition-all"
    >
      <div className="flex items-center justify-around h-14 px-2">
        {/* Ledgers / Tasks Tab */}
        <button
          id="mobile-nav-tasks-btn"
          onClick={() => onChangeView('tasks')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors cursor-pointer select-none ${
            currentView === 'tasks' ? 'text-emerald-400 font-bold' : 'text-[#737373] hover:text-[#bbb]'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Ledgers</span>
        </button>

        {/* Quick Add Action (center action) */}
        {onOpenCreateTask && !isInsideTask && (
          <button
            id="mobile-nav-quick-add-btn"
            onClick={onOpenCreateTask}
            className="flex flex-col items-center justify-center -mt-4 w-11 h-11 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/60 border-2 border-[#0d0d0d] active:scale-95 transition-all cursor-pointer"
            title="Create New Ledger Task"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </button>
        )}

        {/* Notepad Tab */}
        <button
          id="mobile-nav-notepad-btn"
          onClick={() => onChangeView('notes')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors cursor-pointer select-none ${
            currentView === 'notes' ? 'text-emerald-400 font-bold' : 'text-[#737373] hover:text-[#bbb]'
          }`}
        >
          <FileText className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Notepad</span>
        </button>

        {/* Security & Settings */}
        <button
          id="mobile-nav-settings-btn"
          onClick={onOpenSettings}
          className="flex flex-col items-center justify-center flex-1 py-1 text-[#737373] hover:text-[#bbb] transition-colors cursor-pointer select-none"
        >
          <Shield className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Security</span>
        </button>
      </div>
    </nav>
  );
};
