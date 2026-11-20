import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { DEMO_USERS, DEMO_WORKERS } from '../data/seedData';
import {
  authService,
  buildNewComplaint,
  complaintRepository,
  CreateComplaintInput,
  STORAGE_KEYS,
} from '../services/repository';
import {
  SMS_STORAGE_KEY,
  smsNotificationService,
} from '../services/smsNotificationService';
import {
  Complaint,
  ComplaintPriority,
  ComplaintStatus,
  DemoUser,
  SmsNotificationLog,
  UserRole,
  WorkerProfile,
} from '../types';

export interface ToastMessage {
  id: string;
  tone: 'success' | 'info' | 'error';
  message: string;
  smsLog?: SmsNotificationLog;
}

const SEEN_SMS_STORAGE_KEY = 'swachh360_seen_sms_by_user_v1';

function readSeenSmsMap(): Record<string, string[]> {
  try {
    const raw = window.localStorage.getItem(SEEN_SMS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string[]>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeSeenSmsMap(map: Record<string, string[]>): void {
  try {
    window.localStorage.setItem(SEEN_SMS_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore quota errors for seen-state metadata
  }
}

function isSmsRelevantToUser(
  log: SmsNotificationLog,
  user: DemoUser,
  complaintsList: Complaint[]
): boolean {
  const linked = complaintsList.find((c) => c.id === log.complaintId);
  if (user.role === 'citizen') {
    if (log.recipientPhone === user.phone) return true;
    if (linked && linked.citizenEmail.toLowerCase() === user.email.toLowerCase()) return true;
    return false;
  }
  if (user.role === 'worker') {
    if (linked && linked.assignedWorkerId === user.id) return true;
    return false;
  }
  // Supervisor monitors all ward complaint lifecycle updates
  return true;
}

interface AppContextValue {
  currentUser: DemoUser | null;
  complaints: Complaint[];
  smsLogs: SmsNotificationLog[];
  workers: WorkerProfile[];
  isLoading: boolean;
  toasts: ToastMessage[];
  dismissToast: (id: string) => void;
  pushToast: (message: string, tone?: ToastMessage['tone']) => void;
  clearSmsLogs: () => void;
  loginAsRole: (role: UserRole) => void;
  loginWithEmail: (email: string) => boolean;
  logout: () => void;
  resetDemoData: () => void;
  submitComplaint: (input: CreateComplaintInput) => Complaint | null;
  assignComplaint: (
    complaintId: string,
    workerId: string,
    priority?: ComplaintPriority
  ) => void;
  updateComplaintStatus: (
    complaintId: string,
    status: ComplaintStatus,
    note?: string
  ) => void;
  updateComplaintPriority: (complaintId: string, priority: ComplaintPriority) => void;
  addInternalNote: (complaintId: string, content: string) => void;
  workerStartTask: (complaintId: string, workerProfile?: WorkerProfile) => void;
  workerCompleteTask: (
    complaintId: string,
    afterPhotoUrl: string,
    remarks: string,
    workerProfile?: WorkerProfile
  ) => void;
  supervisorVerifyAndResolve: (complaintId: string, verificationNote: string) => void;
  supervisorRequestRework: (complaintId: string, reason: string) => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<DemoUser | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const complaintsRef = useRef<Complaint[]>([]);
  const currentUserRef = useRef<DemoUser | null>(null);
  const seenSmsMapRef = useRef<Record<string, string[]>>({});
  const [smsLogs, setSmsLogs] = useState<SmsNotificationLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback((message: string, tone: ToastMessage['tone'] = 'success') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-2), { id, tone, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const pushSmsToast = useCallback((smsLog: SmsNotificationLog) => {
    const id = `sms-toast-${smsLog.id}-${Date.now()}`;
    setToasts((prev) => {
      // Avoid stacking duplicate toasts for the exact same SMS log ID
      const deduped = prev.filter((t) => t.smsLog?.id !== smsLog.id);
      return [
        ...deduped.slice(-2),
        {
          id,
          tone: smsLog.isResolutionAlert ? 'success' : 'info',
          message: smsLog.message,
          smsLog,
        },
      ];
    });
    window.setTimeout(
      () => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      },
      smsLog.isResolutionAlert ? 7200 : 5800
    );
  }, []);

  const markSmsIdsSeenForUser = useCallback((userId: string, ids: string[]) => {
    if (!userId || ids.length === 0) return;
    const currentSet = new Set(seenSmsMapRef.current[userId] ?? []);
    let changed = false;
    for (const id of ids) {
      if (!currentSet.has(id)) {
        currentSet.add(id);
        changed = true;
      }
    }
    if (changed) {
      seenSmsMapRef.current = {
        ...seenSmsMapRef.current,
        [userId]: Array.from(currentSet).slice(-200),
      };
      writeSeenSmsMap(seenSmsMapRef.current);
    }
  }, []);

  const markBaselineSeenForAllUsers = useCallback((logs: SmsNotificationLog[]) => {
    const allIds = logs.map((l) => l.id);
    const nextMap: Record<string, string[]> = {};
    for (const u of Object.values(DEMO_USERS)) {
      nextMap[u.id] = allIds;
    }
    seenSmsMapRef.current = nextMap;
    writeSeenSmsMap(nextMap);
  }, []);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedUser = authService.getCurrentUser();
      const loadedComplaints = complaintRepository.getAll();
      const existingSms = smsNotificationService.getLogs();
      const hydratedSms =
        existingSms.length > 0
          ? existingSms
          : smsNotificationService.seedInitialLogs(loadedComplaints);

      const savedSeenMap = readSeenSmsMap();
      if (Object.keys(savedSeenMap).length === 0) {
        markBaselineSeenForAllUsers(hydratedSms);
      } else {
        seenSmsMapRef.current = savedSeenMap;
      }

      complaintsRef.current = loadedComplaints;
      currentUserRef.current = savedUser;
      setCurrentUser(savedUser);
      setComplaints(loadedComplaints);
      setSmsLogs(hydratedSms);
      setIsLoading(false);
    }, 180);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.complaints) {
        const synced = complaintRepository.getAll();
        complaintsRef.current = synced;
        setComplaints(synced);
      }
      if (e.key === STORAGE_KEYS.session) {
        const syncedUser = authService.getCurrentUser();
        currentUserRef.current = syncedUser;
        setCurrentUser(syncedUser);
      }
      if (e.key === SMS_STORAGE_KEY) {
        setSmsLogs(smsNotificationService.getLogs());
      }
      if (e.key === SEEN_SMS_STORAGE_KEY) {
        seenSmsMapRef.current = readSeenSmsMap();
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('storage', handleStorage);
    };
  }, [markBaselineSeenForAllUsers]);

  // Automatically detect newly arrived complaint status updates for the current user
  // (e.g., when switching back to Citizen after Supervisor resolved a ticket, or via cross-tab sync)
  useEffect(() => {
    if (isLoading || !currentUser || smsLogs.length === 0) return;

    const seenSet = new Set(seenSmsMapRef.current[currentUser.id] ?? []);
    const relevantUnseen = smsLogs.filter(
      (log) => !seenSet.has(log.id) && isSmsRelevantToUser(log, currentUser, complaints)
    );

    if (relevantUnseen.length === 0) return;

    // Mark all detected relevant SMS logs as seen for this user and show the latest status message
    markSmsIdsSeenForUser(
      currentUser.id,
      relevantUnseen.map((l) => l.id)
    );

    // Prefer the latest Resolved alert if present among unseen updates; otherwise show the newest log
    const latestPriorityLog =
      relevantUnseen.find((l) => l.isResolutionAlert) ?? relevantUnseen[0];
    pushSmsToast(latestPriorityLog);
  }, [currentUser, smsLogs, complaints, isLoading, markSmsIdsSeenForUser, pushSmsToast]);

  const triggerSmsLog = useCallback(
    (params: {
      complaint: Complaint;
      newStatus: ComplaintStatus | 'Rework Requested';
      verificationNote?: string;
      workerName?: string;
    }): SmsNotificationLog => {
      const createdLog = smsNotificationService.dispatchStatusChangeSms(params);
      // Mark seen for the active actor so the watcher won't duplicate it, then show subtle toast immediately
      if (currentUserRef.current) {
        markSmsIdsSeenForUser(currentUserRef.current.id, [createdLog.id]);
      }
      setSmsLogs((prev) => [createdLog, ...prev]);
      pushSmsToast(createdLog);
      return createdLog;
    },
    [markSmsIdsSeenForUser, pushSmsToast]
  );

  const clearSmsLogs = useCallback(() => {
    smsNotificationService.clearLogs();
    setSmsLogs([]);
    seenSmsMapRef.current = {};
    writeSeenSmsMap({});
    pushToast('Simulated SMS notification logs cleared.', 'info');
  }, [pushToast]);

  const persistComplaints = useCallback((nextList: Complaint[]) => {
    complaintsRef.current = nextList;
    setComplaints(nextList);
    complaintRepository.saveAll(nextList);
  }, []);

  const loginAsRole = useCallback(
    (role: UserRole) => {
      const user = authService.signInWithDemoRole(role);
      currentUserRef.current = user;
      setCurrentUser(user);
      pushToast(`Signed in as ${user.name} (${role.charAt(0).toUpperCase() + role.slice(1)})`, 'info');
    },
    [pushToast]
  );

  const loginWithEmail = useCallback(
    (email: string) => {
      const user = authService.signInWithEmail(email);
      if (!user) return false;
      currentUserRef.current = user;
      setCurrentUser(user);
      pushToast(`Signed in as ${user.name}`, 'info');
      return true;
    },
    [pushToast]
  );

  const logout = useCallback(() => {
    authService.signOut();
    currentUserRef.current = null;
    setCurrentUser(null);
  }, []);

  const resetDemoData = useCallback(() => {
    const fresh = complaintRepository.resetToDemoSeed();
    const freshSms = smsNotificationService.seedInitialLogs(fresh);
    complaintsRef.current = fresh;
    markBaselineSeenForAllUsers(freshSms);
    setComplaints(fresh);
    setSmsLogs(freshSms);
    pushToast(
      'Demonstration dataset and simulated SMS logs restored to initial 14 Nagpur records.',
      'info'
    );
  }, [markBaselineSeenForAllUsers, pushToast]);

  const submitComplaint = useCallback(
    (input: CreateComplaintInput): Complaint | null => {
      if (!currentUser) return null;
      const created = buildNewComplaint(input, currentUser, complaintsRef.current);
      persistComplaints([created, ...complaintsRef.current]);
      triggerSmsLog({ complaint: created, newStatus: 'Submitted' });
      return created;
    },
    [currentUser, persistComplaints, triggerSmsLog]
  );

  const assignComplaint = useCallback(
    (complaintId: string, workerId: string, priority?: ComplaintPriority) => {
      const worker = DEMO_WORKERS.find((w) => w.id === workerId);
      if (!worker || !currentUser) return;
      const existing = complaintsRef.current.find((c) => c.id === complaintId);
      if (!existing) return;

      const now = new Date().toISOString();
      const nextPriority = priority ?? existing.priority;
      const nextStatus: ComplaintStatus =
        existing.status === 'Submitted' ? 'Assigned' : existing.status;

      const updated: Complaint = {
        ...existing,
        assignedWorkerId: worker.id,
        assignedWorkerName: worker.name,
        assignedWorkerEmail: worker.email,
        priority: nextPriority,
        status: nextStatus,
        assignedAt: existing.assignedAt ?? now,
        updatedAt: now,
        timeline: [
          ...existing.timeline,
          {
            id: `tl-${Date.now()}`,
            status: 'Assigned',
            timestamp: now,
            actorName: currentUser.name,
            actorRole: currentUser.role,
            summary: `Assigned to ${worker.name} (${worker.crewCode}) · Priority set to ${nextPriority}.`,
          },
        ],
      };

      persistComplaints(complaintsRef.current.map((c) => (c.id === complaintId ? updated : c)));
      triggerSmsLog({
        complaint: updated,
        newStatus: 'Assigned',
        workerName: `${worker.name} (${worker.crewCode})`,
      });
    },
    [currentUser, persistComplaints, triggerSmsLog]
  );

  const updateComplaintPriority = useCallback(
    (complaintId: string, priority: ComplaintPriority) => {
      if (!currentUser) return;
      const existing = complaintsRef.current.find((c) => c.id === complaintId);
      if (!existing || existing.priority === priority) return;

      const now = new Date().toISOString();
      const updated: Complaint = {
        ...existing,
        priority,
        updatedAt: now,
        timeline: [
          ...existing.timeline,
          {
            id: `tl-${Date.now()}`,
            status: 'Note Added',
            timestamp: now,
            actorName: currentUser.name,
            actorRole: currentUser.role,
            summary: `Priority updated from ${existing.priority} to ${priority}.`,
          },
        ],
      };

      persistComplaints(complaintsRef.current.map((c) => (c.id === complaintId ? updated : c)));
      pushToast(`Priority for ${complaintId} updated to ${priority}.`, 'info');
    },
    [currentUser, persistComplaints, pushToast]
  );

  const updateComplaintStatus = useCallback(
    (complaintId: string, status: ComplaintStatus, note?: string) => {
      if (!currentUser) return;
      const existing = complaintsRef.current.find((c) => c.id === complaintId);
      if (!existing || existing.status === status) return;

      const now = new Date().toISOString();
      const updated: Complaint = {
        ...existing,
        status,
        updatedAt: now,
        assignedAt: status === 'Assigned' ? existing.assignedAt ?? now : existing.assignedAt,
        inProgressAt: status === 'In Progress' ? existing.inProgressAt ?? now : existing.inProgressAt,
        workerCompletedAt:
          status === 'Completed' ? existing.workerCompletedAt ?? now : existing.workerCompletedAt,
        resolvedAt: status === 'Resolved' ? now : existing.resolvedAt,
        timeline: [
          ...existing.timeline,
          {
            id: `tl-${Date.now()}`,
            status,
            timestamp: now,
            actorName: currentUser.name,
            actorRole: currentUser.role,
            summary: note?.trim() || `Status updated to ${status}.`,
          },
        ],
      };

      persistComplaints(complaintsRef.current.map((c) => (c.id === complaintId ? updated : c)));
      triggerSmsLog({
        complaint: updated,
        newStatus: status,
        verificationNote: status === 'Resolved' ? note : undefined,
      });
    },
    [currentUser, persistComplaints, triggerSmsLog]
  );

  const addInternalNote = useCallback(
    (complaintId: string, content: string) => {
      if (!currentUser || !content.trim()) return;
      const existing = complaintsRef.current.find((c) => c.id === complaintId);
      if (!existing) return;

      const now = new Date().toISOString();
      const trimmed = content.trim();
      const updated: Complaint = {
        ...existing,
        updatedAt: now,
        internalNotes: [
          ...existing.internalNotes,
          {
            id: `nt-${Date.now()}`,
            authorName: currentUser.name,
            authorRole: currentUser.role,
            content: trimmed,
            createdAt: now,
          },
        ],
      };

      persistComplaints(complaintsRef.current.map((c) => (c.id === complaintId ? updated : c)));
      pushToast('Internal supervisor note saved.', 'info');
    },
    [currentUser, persistComplaints, pushToast]
  );

  const workerStartTask = useCallback(
    (complaintId: string, workerProfile?: WorkerProfile) => {
      if (!currentUser) return;
      const existing = complaintsRef.current.find((c) => c.id === complaintId);
      if (!existing) return;

      const actorName = workerProfile?.name ?? currentUser.name;
      const now = new Date().toISOString();
      const updated: Complaint = {
        ...existing,
        status: 'In Progress',
        inProgressAt: now,
        updatedAt: now,
        timeline: [
          ...existing.timeline,
          {
            id: `tl-${Date.now()}`,
            status: 'In Progress',
            timestamp: now,
            actorName,
            actorRole: 'worker',
            summary: 'Task accepted by field crew; sanitation cleanup in progress.',
          },
        ],
      };

      persistComplaints(complaintsRef.current.map((c) => (c.id === complaintId ? updated : c)));
      triggerSmsLog({
        complaint: updated,
        newStatus: 'In Progress',
        workerName: actorName,
      });
    },
    [currentUser, persistComplaints, triggerSmsLog]
  );

  const workerCompleteTask = useCallback(
    (
      complaintId: string,
      afterPhotoUrl: string,
      remarks: string,
      workerProfile?: WorkerProfile
    ) => {
      if (!currentUser) return;
      const existing = complaintsRef.current.find((c) => c.id === complaintId);
      if (!existing) return;

      const actorName = workerProfile?.name ?? currentUser.name;
      const now = new Date().toISOString();
      const updated: Complaint = {
        ...existing,
        status: 'Completed',
        afterPhotoUrl,
        workerRemarks: remarks.trim() || 'Sanitation issue cleared and site photographed.',
        workerCompletedAt: now,
        updatedAt: now,
        timeline: [
          ...existing.timeline,
          {
            id: `tl-${Date.now()}`,
            status: 'Completed',
            timestamp: now,
            actorName,
            actorRole: 'worker',
            summary:
              'Field work completed with after-cleaning photo uploaded; awaiting supervisor verification.',
          },
        ],
      };

      persistComplaints(complaintsRef.current.map((c) => (c.id === complaintId ? updated : c)));
      triggerSmsLog({
        complaint: updated,
        newStatus: 'Completed',
        workerName: actorName,
      });
    },
    [currentUser, persistComplaints, triggerSmsLog]
  );

  const supervisorVerifyAndResolve = useCallback(
    (complaintId: string, verificationNote: string) => {
      if (!currentUser) return;
      const existing = complaintsRef.current.find((c) => c.id === complaintId);
      if (!existing) return;

      const now = new Date().toISOString();
      const note =
        verificationNote.trim() ||
        'After-cleaning photograph verified; site meets municipal standard.';
      const updated: Complaint = {
        ...existing,
        status: 'Resolved',
        supervisorVerificationNote: note,
        resolvedAt: now,
        updatedAt: now,
        timeline: [
          ...existing.timeline,
          {
            id: `tl-${Date.now()}`,
            status: 'Resolved',
            timestamp: now,
            actorName: currentUser.name,
            actorRole: 'supervisor',
            summary: `Verified & Resolved: ${note}`,
          },
        ],
      };

      persistComplaints(complaintsRef.current.map((c) => (c.id === complaintId ? updated : c)));
      triggerSmsLog({
        complaint: updated,
        newStatus: 'Resolved',
        verificationNote: note,
      });
    },
    [currentUser, persistComplaints, triggerSmsLog]
  );

  const supervisorRequestRework = useCallback(
    (complaintId: string, reason: string) => {
      if (!currentUser) return;
      const existing = complaintsRef.current.find((c) => c.id === complaintId);
      if (!existing) return;

      const now = new Date().toISOString();
      const note = reason.trim() || 'Additional clearing required before final sign-off.';
      const updated: Complaint = {
        ...existing,
        status: 'In Progress',
        updatedAt: now,
        internalNotes: [
          ...existing.internalNotes,
          {
            id: `nt-${Date.now()}`,
            authorName: currentUser.name,
            authorRole: currentUser.role,
            content: `Rework requested: ${note}`,
            createdAt: now,
          },
        ],
        timeline: [
          ...existing.timeline,
          {
            id: `tl-${Date.now()}`,
            status: 'Rework Requested',
            timestamp: now,
            actorName: currentUser.name,
            actorRole: currentUser.role,
            summary: `Returned to In Progress: ${note}`,
          },
        ],
      };

      persistComplaints(complaintsRef.current.map((c) => (c.id === complaintId ? updated : c)));
      triggerSmsLog({
        complaint: updated,
        newStatus: 'Rework Requested',
      });
    },
    [currentUser, persistComplaints, triggerSmsLog]
  );

  const value = useMemo<AppContextValue>(
    () => ({
      currentUser,
      complaints,
      smsLogs,
      workers: DEMO_WORKERS,
      isLoading,
      toasts,
      dismissToast,
      pushToast,
      clearSmsLogs,
      loginAsRole,
      loginWithEmail,
      logout,
      resetDemoData,
      submitComplaint,
      assignComplaint,
      updateComplaintStatus,
      updateComplaintPriority,
      addInternalNote,
      workerStartTask,
      workerCompleteTask,
      supervisorVerifyAndResolve,
      supervisorRequestRework,
    }),
    [
      currentUser,
      complaints,
      smsLogs,
      isLoading,
      toasts,
      dismissToast,
      pushToast,
      clearSmsLogs,
      loginAsRole,
      loginWithEmail,
      logout,
      resetDemoData,
      submitComplaint,
      assignComplaint,
      updateComplaintStatus,
      updateComplaintPriority,
      addInternalNote,
      workerStartTask,
      workerCompleteTask,
      supervisorVerifyAndResolve,
      supervisorRequestRework,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
