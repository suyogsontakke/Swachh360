import React, { useMemo, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  ClipboardCheck,
  History,
  MapPin,
  Play,
  Trash2,
  Upload,
  Wrench,
} from 'lucide-react';
import { SAMPLE_PHOTOS } from '../../data/seedData';
import { useApp } from '../../context/AppContext';
import { storageService } from '../../services/repository';
import { Complaint } from '../../types';
import {
  formatDateTime,
  PriorityText,
  SafeImage,
  StatusText,
} from '../common/StatusIndicators';
import { AppShell, NavItem } from '../layout/AppShell';
import { WardMapView } from '../shared/WardMapView';
import { ComplaintDetailModal } from '../common/ComplaintDetailModal';

type WorkerPage = 'active-tasks' | 'history' | 'map';

interface CompletionDraft {
  photoUrl: string;
  fileName: string;
  remarks: string;
  error?: string;
}

export const WorkerPortal: React.FC = () => {
  const {
    currentUser,
    complaints,
    workers,
    workerStartTask,
    workerCompleteTask,
    loginAsRole,
  } = useApp();

  const [activePage, setActivePage] = useState<WorkerPage>('active-tasks');
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>(
    currentUser?.id ?? workers[0]?.id ?? 'usr-worker-01'
  );
  const [drafts, setDrafts] = useState<Record<string, CompletionDraft>>({});
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [detailComplaintId, setDetailComplaintId] = useState<string | null>(null);

  const activeWorker = useMemo(
    () => workers.find((w) => w.id === selectedWorkerId) ?? workers[0],
    [workers, selectedWorkerId]
  );

  const workerComplaints = useMemo(
    () => complaints.filter((c) => c.assignedWorkerId === activeWorker.id),
    [complaints, activeWorker]
  );

  const activeTasks = useMemo(
    () =>
      workerComplaints.filter(
        (c) => c.status === 'Assigned' || c.status === 'In Progress'
      ),
    [workerComplaints]
  );

  const completedTasks = useMemo(
    () =>
      workerComplaints.filter(
        (c) => c.status === 'Completed' || c.status === 'Resolved'
      ),
    [workerComplaints]
  );

  const updateDraft = (complaintId: string, patch: Partial<CompletionDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [complaintId]: {
        photoUrl: prev[complaintId]?.photoUrl ?? '',
        fileName: prev[complaintId]?.fileName ?? '',
        remarks: prev[complaintId]?.remarks ?? '',
        ...patch,
      },
    }));
  };

  const handleAfterPhotoUpload = async (
    complaintId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingId(complaintId);
    updateDraft(complaintId, { error: '' });
    try {
      const dataUrl = await storageService.processPhotoFile(file);
      updateDraft(complaintId, { photoUrl: dataUrl, fileName: file.name, error: '' });
    } catch (err) {
      updateDraft(complaintId, {
        error: err instanceof Error ? err.message : 'Unable to process image.',
      });
    } finally {
      setUploadingId(null);
      e.target.value = '';
    }
  };

  const handleCompleteSubmit = (task: Complaint) => {
    const draft = drafts[task.id];
    if (!draft?.photoUrl) {
      updateDraft(task.id, {
        error: 'Please upload an after-cleaning evidence photograph before marking Completed.',
      });
      return;
    }
    workerCompleteTask(task.id, draft.photoUrl, draft.remarks, activeWorker);
    setDrafts((prev) => {
      const copy = { ...prev };
      delete copy[task.id];
      return copy;
    });
  };

  const navItems: NavItem[] = [
    { id: 'active-tasks', label: 'Assigned Tasks', Icon: Wrench, count: activeTasks.length },
    { id: 'history', label: 'Completed History', Icon: History, count: completedTasks.length },
    { id: 'map', label: 'Ward Map', Icon: MapPin },
  ];

  return (
    <AppShell
      portalTitle="Sanitation Worker"
      navItems={navItems}
      activePage={activePage}
      onSelectPage={(id) => setActivePage(id as WorkerPage)}
      primaryAction={{
        label: 'Supervisor Verification View',
        Icon: ClipboardCheck,
        onClick: () => loginAsRole('supervisor'),
      }}
    >
      {/* Mobile-Friendly Worker Header & Demo Crew Selector */}
      <section className="bg-white border border-[#E2E8F0] rounded-lg p-5 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#52677A]">
            <span className="font-mono font-semibold text-[#142B45]">
              Crew {activeWorker.crewCode}
            </span>
            <span>·</span>
            <span>{activeWorker.shift}</span>
            <span>·</span>
            <span>Wards: {activeWorker.assignedWards.join(', ')}</span>
          </div>
          <h2 className="text-xl font-bold text-[#142B45] mt-1">{activeWorker.name}</h2>
          <p className="text-xs text-[#52677A] mt-0.5">
            Accept assigned jobs, update field progress, and upload after-cleaning photo proof.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-5 pr-4 border-r border-[#E2E8F0]">
            <div>
              <p className="font-mono text-xl font-bold text-amber-700 tabular-nums">
                {activeTasks.length}
              </p>
              <p className="text-[11px] text-[#52677A]">Active</p>
            </div>
            <div>
              <p className="font-mono text-xl font-bold text-[#1E8E5E] tabular-nums">
                {completedTasks.length}
              </p>
              <p className="text-[11px] text-[#52677A]">Completed</p>
            </div>
          </div>

          <div>
            <label htmlFor="crew-selector" className="block text-[11px] text-[#52677A] mb-1">
              Demo Field Crew View
            </label>
            <select
              id="crew-selector"
              value={selectedWorkerId}
              onChange={(e) => setSelectedWorkerId(e.target.value)}
              className="px-3 py-2 text-xs font-medium bg-[#F8FAFC] border border-[#CBD5E1] rounded-md text-[#142B45]"
            >
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.crewCode})
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Active Assigned Tasks */}
      {activePage === 'active-tasks' && (
        <div className="space-y-4">
          {activeTasks.length === 0 ? (
            <div className="bg-white border border-[#E2E8F0] rounded-lg px-6 py-14 text-center">
              <CheckCircle2 className="w-8 h-8 text-[#27AE75] mx-auto mb-2" />
              <p className="text-base font-bold text-[#142B45]">
                No pending active tasks for {activeWorker.name}
              </p>
              <p className="text-xs text-[#52677A] mt-1 max-w-md mx-auto">
                All currently assigned jobs are completed. New tasks assigned by the Municipal
                Supervisor will appear here immediately.
              </p>
              <button
                type="button"
                onClick={() => setActivePage('history')}
                className="mt-4 px-4 py-2.5 text-xs font-semibold text-[#142B45] border border-[#CBD5E1] rounded-md hover:bg-[#F4F7FA]"
              >
                View Completed Task History
              </button>
            </div>
          ) : (
            activeTasks.map((task) => {
              const draft = drafts[task.id] ?? { photoUrl: '', fileName: '', remarks: '' };
              const isAssigned = task.status === 'Assigned';
              const isInProgress = task.status === 'In Progress';

              return (
                <article
                  key={task.id}
                  className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden"
                >
                  {/* Task Card Header */}
                  <div className="px-5 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
                      <span className="font-mono font-bold text-[#142B45] tabular-nums">
                        {task.id}
                      </span>
                      <span className="text-slate-300">·</span>
                      <PriorityText priority={task.priority} />
                      <span className="text-slate-300">·</span>
                      <span className="text-[#52677A]">{task.wardName}</span>
                    </div>
                    <StatusText status={task.status} />
                  </div>

                  {/* Card Body */}
                  <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
                    {/* Issue Details & Before Photo */}
                    <div className="lg:col-span-7 space-y-3">
                      <div>
                        <h3 className="text-base font-bold text-[#142B45]">{task.category}</h3>
                        <p className="flex items-start gap-1.5 text-sm font-medium text-[#172B3A] mt-1">
                          <MapPin className="w-4 h-4 text-[#27AE75] shrink-0 mt-0.5" />
                          <span>{task.location}</span>
                        </p>
                      </div>

                      <p className="text-sm text-[#52677A] leading-relaxed">{task.description}</p>

                      {task.internalNotes.length > 0 && (
                        <div className="p-3 rounded-md bg-[#F4F7FA] border border-[#E2E8F0] text-xs">
                          <p className="font-semibold text-[#142B45]">Supervisor Instruction</p>
                          <p className="text-[#172B3A] mt-0.5">
                            {task.internalNotes[task.internalNotes.length - 1].content}
                          </p>
                        </div>
                      )}

                      <div className="pt-1">
                        <p className="text-xs font-medium text-[#52677A] mb-1.5">
                          Reported Site Condition (Before Photo)
                        </p>
                        <SafeImage
                          src={task.beforePhotoUrl}
                          alt={`Reported condition for ${task.id}`}
                          className="w-full sm:w-80 h-44 object-cover rounded-md border border-[#E2E8F0]"
                          emptyLabel="No citizen photograph attached"
                        />
                      </div>
                    </div>

                    {/* Worker Action Workflow Column */}
                    <div className="lg:col-span-5 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-[#E2E8F0] pt-4 lg:pt-0 lg:pl-5 space-y-4">
                      {isAssigned && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-bold text-[#142B45]">
                            Step 1: Accept Assigned Task
                          </h4>
                          <p className="text-xs text-[#52677A] leading-relaxed">
                            Tap below when your sanitation crew reaches the ward location to move
                            this ticket into <strong className="text-[#142B45]">In Progress</strong>
                            .
                          </p>
                          <button
                            type="button"
                            onClick={() => workerStartTask(task.id, activeWorker)}
                            className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-[#142B45] hover:bg-[#1D4262] rounded-md transition-colors"
                          >
                            <Play className="w-4 h-4" />
                            Accept Task &amp; Start Work
                          </button>
                        </div>
                      )}

                      {isInProgress && (
                        <div className="space-y-3.5">
                          <div>
                            <h4 className="text-sm font-bold text-[#142B45]">
                              Step 2: Upload After-Cleaning Evidence
                            </h4>
                            <p className="text-xs text-[#52677A] mt-0.5">
                              A clear post-cleanup photo is required for supervisor verification.
                            </p>
                          </div>

                          {draft.photoUrl ? (
                            <div className="space-y-2">
                              <SafeImage
                                src={draft.photoUrl}
                                alt="After-cleaning evidence preview"
                                className="w-full h-44 object-cover rounded-md border border-[#E2E8F0]"
                              />
                              <div className="flex items-center justify-between text-xs text-[#52677A]">
                                <span className="font-mono truncate">{draft.fileName}</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateDraft(task.id, { photoUrl: '', fileName: '' })
                                  }
                                  className="inline-flex items-center gap-1 text-red-700 font-semibold"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Remove
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="border border-dashed border-[#CBD5E1] rounded-md p-4 bg-[#F8FAFC] text-center space-y-2.5">
                              <Camera className="w-6 h-6 text-[#52677A] mx-auto" />
                              <div>
                                <label className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-4 py-2 text-xs font-semibold text-white bg-[#1D4262] hover:bg-[#142B45] rounded-md cursor-pointer transition-colors">
                                  <Upload className="w-3.5 h-3.5" />
                                  <span>
                                    {uploadingId === task.id
                                      ? 'Processing...'
                                      : 'Upload After-Cleaning Photo'}
                                  </span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={(e) => handleAfterPhotoUpload(task.id, e)}
                                    className="hidden"
                                  />
                                </label>
                              </div>
                              <div className="pt-2 border-t border-[#E2E8F0]">
                                <p className="text-[11px] text-[#52677A] mb-1.5">
                                  Demo quick attach (desktop testing):
                                </p>
                                <div className="flex flex-wrap justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateDraft(task.id, {
                                        photoUrl: SAMPLE_PHOTOS.garbageAfter,
                                        fileName: 'cleaned_street_evidence.jpg',
                                        error: '',
                                      })
                                    }
                                    className="px-2.5 py-1 text-[11px] bg-white border border-[#CBD5E1] hover:bg-[#F4F7FA] text-[#142B45] rounded"
                                  >
                                    Sample Cleaned Street
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateDraft(task.id, {
                                        photoUrl: SAMPLE_PHOTOS.drainAfter,
                                        fileName: 'cleared_drain_evidence.jpg',
                                        error: '',
                                      })
                                    }
                                    className="px-2.5 py-1 text-[11px] bg-white border border-[#CBD5E1] hover:bg-[#F4F7FA] text-[#142B45] rounded"
                                  >
                                    Sample Cleared Drain
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}

                          <div>
                            <label className="block text-xs font-medium text-[#142B45] mb-1">
                              Crew Completion Remarks
                            </label>
                            <textarea
                              rows={2}
                              value={draft.remarks}
                              onChange={(e) => updateDraft(task.id, { remarks: e.target.value })}
                              placeholder="e.g., Waste cleared, drain desilted, and kerb disinfected."
                              className="w-full px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-md focus:outline-none focus:ring-2 focus:ring-[#27AE75]"
                            />
                          </div>

                          {draft.error && (
                            <p className="text-xs text-red-700 font-medium" role="alert">
                              {draft.error}
                            </p>
                          )}

                          <button
                            type="button"
                            onClick={() => handleCompleteSubmit(task)}
                            className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-[#27AE75] hover:bg-[#1E8E5E] rounded-md transition-colors"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Mark Task Completed
                          </button>
                        </div>
                      )}

                      <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-[11px] text-[#52677A]">
                        <span>Assigned {formatDateTime(task.assignedAt ?? task.createdAt)}</span>
                        <button
                          type="button"
                          onClick={() => setDetailComplaintId(task.id)}
                          className="font-semibold text-[#1D4262] hover:text-[#27AE75]"
                        >
                          Full Ticket →
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      )}

      {/* Completed Task History */}
      {activePage === 'history' && (
        <div className="space-y-4">
          {completedTasks.length === 0 ? (
            <div className="bg-white border border-[#E2E8F0] rounded-lg px-6 py-14 text-center">
              <p className="text-sm font-semibold text-[#142B45]">No completed tasks yet</p>
              <p className="text-xs text-[#52677A] mt-1">
                Completed jobs with after-cleaning photos will appear in this log.
              </p>
            </div>
          ) : (
            completedTasks.map((task) => (
              <article
                key={task.id}
                onClick={() => setDetailComplaintId(task.id)}
                className="bg-white border border-[#E2E8F0] hover:border-[#94A3B8] rounded-lg p-5 cursor-pointer transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E2E8F0]">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#52677A]">
                    <span className="font-mono font-bold text-[#142B45] tabular-nums">
                      {task.id}
                    </span>
                    <span>·</span>
                    <span>{task.wardName}</span>
                    <span>·</span>
                    <span className="font-mono tabular-nums">
                      Completed {formatDateTime(task.workerCompletedAt)}
                    </span>
                  </div>
                  <StatusText status={task.status} />
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                  <div className="md:col-span-6 space-y-1.5">
                    <h3 className="text-sm font-bold text-[#142B45]">{task.category}</h3>
                    <p className="text-xs text-[#172B3A] font-medium">{task.location}</p>
                    {task.workerRemarks && (
                      <p className="text-xs text-[#52677A] pt-1">
                        <strong className="text-[#172B3A]">Field Remarks:</strong>{' '}
                        {task.workerRemarks}
                      </p>
                    )}
                    {task.supervisorVerificationNote && (
                      <p className="text-xs text-[#1E8E5E] pt-1">
                        <strong>Supervisor Sign-off:</strong> {task.supervisorVerificationNote}
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-6 grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[11px] text-[#52677A] mb-1">Before</p>
                      <SafeImage
                        src={task.beforePhotoUrl}
                        alt="Before cleaning"
                        className="w-full h-28 object-cover rounded border border-[#E2E8F0]"
                      />
                    </div>
                    <div>
                      <p className="text-[11px] text-[#52677A] mb-1">After Evidence</p>
                      <SafeImage
                        src={task.afterPhotoUrl}
                        alt="After cleaning"
                        className="w-full h-28 object-cover rounded border border-[#E2E8F0]"
                      />
                    </div>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      )}

      {activePage === 'map' && (
        <WardMapView onSelectComplaint={(id) => setDetailComplaintId(id)} />
      )}

      <ComplaintDetailModal
        complaintId={detailComplaintId}
        onClose={() => setDetailComplaintId(null)}
        mode="worker"
      />
    </AppShell>
  );
};
