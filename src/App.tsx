import React, { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Navbar } from './components/Navbar';
import { TaskDashboard } from './components/TaskDashboard';
import { LedgerView } from './components/LedgerView';
import { CreateTaskModal } from './components/CreateTaskModal';
import { UnlockTaskModal } from './components/UnlockTaskModal';
import { RenameTaskModal } from './components/RenameTaskModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { DuplicateTaskModal } from './components/DuplicateTaskModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { BackupModal } from './components/BackupModal';
import { SettingsModal } from './components/SettingsModal';
import { AppLockSetupScreen } from './components/AppLockSetupScreen';
import { AppLockScreen } from './components/AppLockScreen';
import { SplashScreen } from './components/SplashScreen';
import { NotepadView } from './components/Notepad/NotepadView';
import { MobileNav, MainNavView } from './components/MobileNav';
import { TaskSummary, TaskRecord, CurrencyConfig, CURRENCIES, AppLockStatus, AppLockTimeout } from './types';
import { api, isTaskUnlocked } from './lib/api';
import { exportToCSV } from './lib/exportUtils';

export default function App() {
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [activeTask, setActiveTask] = useState<TaskSummary | null>(null);
  const [activeRecords, setActiveRecords] = useState<TaskRecord[]>([]);
  const [currentView, setCurrentView] = useState<MainNavView>('tasks');
  const [loading, setLoading] = useState<boolean>(true);
  const [showSplash, setShowSplash] = useState<boolean>(true);

  // App Lock Security State
  const [appLockStatus, setAppLockStatus] = useState<AppLockStatus>({
    isSetup: false,
    enabled: true,
    timeout: 'closed',
    isUnlocked: false,
  });

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [unlockingTask, setUnlockingTask] = useState<TaskSummary | null>(null);
  const [renamingTask, setRenamingTask] = useState<TaskSummary | null>(null);
  const [changingPassTask, setChangingPassTask] = useState<TaskSummary | null>(null);
  const [duplicatingTask, setDuplicatingTask] = useState<TaskSummary | null>(null);
  const [deletingTask, setDeletingTask] = useState<TaskSummary | null>(null);

  // PWA Prompt
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Preferences
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('ledgerflow_theme') !== 'light';
  });

  const [currency, setCurrency] = useState<CurrencyConfig>(() => {
    const saved = localStorage.getItem('ledgerflow_currency');
    if (saved) {
      const match = CURRENCIES.find((c) => c.code === saved);
      if (match) return match;
    }
    return CURRENCIES[0]; // Default Rs.
  });

  // Capture PWA install event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleTriggerInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  // Sync dark mode class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('ledgerflow_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('ledgerflow_theme', 'light');
    }
  }, [darkMode]);

  // Sync tasks from backend
  const refreshTasks = useCallback(async () => {
    try {
      setLoading(true);
      const initData = await api.initDevice();
      setAppLockStatus(initData.appLock);

      // If app lock is enabled and unlocked, load the tasks
      if (!initData.appLock.isSetup || initData.appLock.isUnlocked) {
        const taskList = await api.getTasks();
        setTasks(taskList);

        if (activeTask) {
          const current = taskList.find((t) => t.id === activeTask.id);
          if (current) {
            setActiveTask(current);
          }
        }
      }
    } catch (err: any) {
      console.error('Failed to load initial data:', err);
      if (err.isAppLocked) {
        setAppLockStatus((prev) => ({ ...prev, isUnlocked: false }));
      }
    } finally {
      setLoading(false);
    }
  }, [activeTask?.id]);

  useEffect(() => {
    refreshTasks();
  }, []);

  // --- Inactivity and Auto-Lock Watcher ---
  const lastActivityRef = useRef<number>(Date.now());

  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('touchstart', updateActivity);
    window.addEventListener('scroll', updateActivity);

    const checkInterval = setInterval(() => {
      if (!appLockStatus.isSetup || !appLockStatus.isUnlocked) return;

      const idleMs = Date.now() - lastActivityRef.current;
      const timeoutSetting = appLockStatus.timeout;

      let maxIdleMs = 0;
      if (timeoutSetting === '1m') maxIdleMs = 60 * 1000;
      else if (timeoutSetting === '5m') maxIdleMs = 5 * 60 * 1000;
      else if (timeoutSetting === '15m') maxIdleMs = 15 * 60 * 1000;

      if (maxIdleMs > 0 && idleMs >= maxIdleMs) {
        handleLockApp();
      }
    }, 5000);

    // Handle visibility changes (e.g. switching tabs / apps)
    const handleVisibilityChange = () => {
      if (document.hidden && appLockStatus.timeout === 'immediately' && appLockStatus.isUnlocked) {
        handleLockApp();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('touchstart', updateActivity);
      window.removeEventListener('scroll', updateActivity);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(checkInterval);
    };
  }, [appLockStatus.isSetup, appLockStatus.isUnlocked, appLockStatus.timeout]);

  // --- App Lock Handlers ---
  const handleSetupAppLock = async (password: string, timeout: AppLockTimeout) => {
    await api.setupAppLock(password, timeout);
    const status = await api.getAppLockStatus();
    setAppLockStatus(status);
    await refreshTasks();
  };

  const handleUnlockApp = async (password: string) => {
    await api.unlockApp(password);
    const status = await api.getAppLockStatus();
    setAppLockStatus(status);
    await refreshTasks();
  };

  const handleLockApp = async () => {
    await api.lockApp();
    setActiveTask(null);
    setActiveRecords([]);
    setAppLockStatus((prev) => ({ ...prev, isUnlocked: false }));
  };

  const handleUpdateAppLockSettings = async (timeout?: AppLockTimeout, enabled?: boolean) => {
    const res = await api.updateAppLockSettings(timeout, enabled);
    setAppLockStatus(res.status);
  };

  const handleChangeAppPassword = async (currentPassword: string, newPassword: string) => {
    await api.changeAppPassword(currentPassword, newPassword);
  };

  const handleResetDeviceData = async () => {
    await api.resetUserData();
    setActiveTask(null);
    setActiveRecords([]);
    setTasks([]);
    const status = await api.getAppLockStatus();
    setAppLockStatus(status);
  };

  // --- Task Handlers ---
  const handleSelectTask = async (task: TaskSummary) => {
    if (isTaskUnlocked(task.id)) {
      try {
        const data = await api.getTaskRecords(task.id);
        setActiveTask(data.task);
        setActiveRecords(data.records);
        return;
      } catch {
        // Token might have expired, prompt unlock
      }
    }
    setUnlockingTask(task);
  };

  const handleUnlockTask = async (taskId: string, password: string) => {
    const res = await api.unlockTask(taskId, password);
    setActiveTask(res.task);
    setActiveRecords(res.records);
    setUnlockingTask(null);
  };

  const handleCreateTask = async (taskName: string, password: string) => {
    const res = await api.createTask(taskName, password);
    try {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.7 },
      });
    } catch {
      // ignore
    }
    refreshTasks();
    setActiveTask(res.task);
    setActiveRecords([]);
    setIsCreateOpen(false);
  };

  const handleLockTask = async () => {
    if (activeTask) {
      await api.lockTask(activeTask.id);
    }
    setActiveTask(null);
    setActiveRecords([]);
    refreshTasks();
  };

  const handleSaveRecords = async (records: TaskRecord[]) => {
    if (!activeTask) return;
    const res = await api.saveTaskRecords(activeTask.id, records);
    setActiveTask(res.task);
    setActiveRecords(res.records);
    setTasks((prev) => prev.map((t) => (t.id === res.task.id ? res.task : t)));
  };

  const handleRename = async (taskId: string, newName: string) => {
    const updated = await api.renameTask(taskId, newName);
    setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
    if (activeTask && activeTask.id === taskId) {
      setActiveTask(updated);
    }
  };

  const handleChangeTaskPassword = async (taskId: string, currentPass: string, newPass: string) => {
    await api.changePassword(taskId, currentPass, newPass);
  };

  const handleDuplicate = async (taskId: string, newName: string, newPassword: string) => {
    const res = await api.duplicateTask(taskId, newName, newPassword);
    await refreshTasks();
    setActiveTask(res.task);
    const recordsRes = await api.getTaskRecords(res.task.id);
    setActiveRecords(recordsRes.records);
  };

  const handleDelete = async (taskId: string) => {
    await api.deleteTask(taskId);
    if (activeTask && activeTask.id === taskId) {
      setActiveTask(null);
      setActiveRecords([]);
    }
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const handleExportCSVQuick = async (task: TaskSummary) => {
    if (isTaskUnlocked(task.id)) {
      try {
        const data = await api.getTaskRecords(task.id);
        exportToCSV(task.task_name, data.records, currency.symbol);
        return;
      } catch {
        // needs unlock
      }
    }
    setUnlockingTask(task);
  };

  const handleExportBackup = async () => {
    const data = await api.exportBackup();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LedgerFlow_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRestoreBackup = async (backupData: any) => {
    await api.restoreBackup(backupData);
    await refreshTasks();
  };

  // Render Splash Screen if active
  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  // If App Lock has never been setup, render setup screen
  if (!appLockStatus.isSetup) {
    return <AppLockSetupScreen onSetupSuccess={handleSetupAppLock} />;
  }

  // If App Lock is enabled and locked, render AppLockScreen
  if (appLockStatus.enabled && !appLockStatus.isUnlocked) {
    return (
      <AppLockScreen
        onUnlock={handleUnlockApp}
        onRestoreBackup={handleRestoreBackup}
        onResetData={handleResetDeviceData}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e5e5e5] flex flex-col font-sans selection:bg-emerald-600 selection:text-white transition-colors duration-200">
      {/* Navigation Header */}
      <Navbar
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        currency={currency}
        onChangeCurrency={(c) => {
          setCurrency(c);
          localStorage.setItem('ledgerflow_currency', c.code);
        }}
        onOpenBackup={() => setIsBackupOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onLockApp={handleLockApp}
        onHomeClick={() => {
          if (activeTask) {
            setActiveTask(null);
            refreshTasks();
          }
          setCurrentView('tasks');
        }}
        activeTaskName={activeTask?.task_name}
        isAppLocked={!appLockStatus.isUnlocked}
        hasPwaInstallPrompt={!!deferredPrompt}
        onTriggerInstall={handleTriggerInstall}
        currentView={currentView}
        onChangeView={(v) => {
          if (activeTask) {
            setActiveTask(null);
            refreshTasks();
          }
          setCurrentView(v);
        }}
      />

      {/* Main Content */}
      <main className="flex-1 pb-16 md:pb-0">
        {loading ? (
          <div className="max-w-7xl mx-auto px-4 py-24 flex flex-col items-center justify-center space-y-4">
            <div className="w-10 h-10 border-4 border-[#262626] border-t-emerald-500 rounded-full animate-spin" />
            <p className="text-sm font-medium text-[#737373]">
              Loading your tasks...
            </p>
          </div>
        ) : activeTask ? (
          /* Active Task Spreadsheet Ledger */
          <LedgerView
            task={activeTask}
            initialRecords={activeRecords}
            currency={currency}
            onBack={() => {
              setActiveTask(null);
              refreshTasks();
            }}
            onLockTask={handleLockTask}
            onSaveRecords={handleSaveRecords}
            onRenameTask={() => setRenamingTask(activeTask)}
            onChangePassword={() => setChangingPassTask(activeTask)}
            onDuplicateTask={() => setDuplicatingTask(activeTask)}
            onDeleteTask={() => setDeletingTask(activeTask)}
          />
        ) : currentView === 'notes' ? (
          /* Dedicated Notepad Section */
          <NotepadView onBackToDashboard={() => setCurrentView('tasks')} />
        ) : (
          /* Task Dashboard (All My Tasks) */
          <TaskDashboard
            tasks={tasks}
            currency={currency}
            onOpenCreateModal={() => setIsCreateOpen(true)}
            onSelectTask={handleSelectTask}
            onRenameTask={(task) => setRenamingTask(task)}
            onChangePassword={(task) => setChangingPassTask(task)}
            onDuplicateTask={(task) => setDuplicatingTask(task)}
            onDeleteTask={(task) => setDeletingTask(task)}
            onExportCSVQuick={handleExportCSVQuick}
            hasPwaInstallPrompt={!!deferredPrompt}
            onTriggerInstall={handleTriggerInstall}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <MobileNav
        currentView={currentView}
        onChangeView={(v) => {
          if (activeTask) {
            setActiveTask(null);
            refreshTasks();
          }
          setCurrentView(v);
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenCreateTask={() => setIsCreateOpen(true)}
        isInsideTask={!!activeTask}
      />

      {/* Modals */}
      <CreateTaskModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateTask}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currency={currency}
        onChangeCurrency={(c) => {
          setCurrency(c);
          localStorage.setItem('ledgerflow_currency', c.code);
        }}
        appLockStatus={appLockStatus}
        onUpdateAppLockSettings={handleUpdateAppLockSettings}
        onChangeAppPassword={handleChangeAppPassword}
        onExportBackup={handleExportBackup}
        onRestoreBackup={handleRestoreBackup}
        onLockAppNow={handleLockApp}
        deferredPrompt={deferredPrompt}
        onTriggerInstall={handleTriggerInstall}
      />

      <UnlockTaskModal
        isOpen={!!unlockingTask}
        task={unlockingTask}
        onClose={() => setUnlockingTask(null)}
        onUnlock={handleUnlockTask}
      />

      <RenameTaskModal
        isOpen={!!renamingTask}
        task={renamingTask}
        onClose={() => setRenamingTask(null)}
        onRename={handleRename}
      />

      <ChangePasswordModal
        isOpen={!!changingPassTask}
        task={changingPassTask}
        onClose={() => setChangingPassTask(null)}
        onChangePassword={handleChangeTaskPassword}
      />

      <DuplicateTaskModal
        isOpen={!!duplicatingTask}
        task={duplicatingTask}
        onClose={() => setDuplicatingTask(null)}
        onDuplicate={handleDuplicate}
      />

      <DeleteConfirmModal
        isOpen={!!deletingTask}
        task={deletingTask}
        onClose={() => setDeletingTask(null)}
        onConfirmDelete={handleDelete}
      />

      <BackupModal
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
        onRefreshTasks={refreshTasks}
      />
    </div>
  );
}
