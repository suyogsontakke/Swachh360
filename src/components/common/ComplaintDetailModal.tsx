import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  MapPin,
  MessageSquarePlus,
  MessageSquareText,
  RotateCcw,
  Sparkles,
  UserCheck,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { analyzeComplaintRuleBased } from '../../services/aiAssistant';
import { Complaint, ComplaintPriority, ComplaintStatus } from '../../types';
import {
  ComplaintTimelineBar,
  formatDateTime,
  PriorityText,
  SafeImage,
  StatusText,
} from './StatusIndicators';

interface ComplaintDetailModalProps {
  complaintId: string | null;
  onClose: () => void;
  mode: 'citizen' | 'supervisor' | 'worker';
}

const PRIORITIES: ComplaintPriority[] = ['Low', 'Medium', 'High', 'Critical'];
const STATUSES: ComplaintStatus[] = [
  'Submitted',
  'Assigned',
  'In Progress',
  'Completed',
  'Resolved',
];

export const ComplaintDetailModal: React.FC<ComplaintDetailModalProps> = ({
  complaintId,
  onClose,
  mode,
}) => {
  const {
    complaints,
    smsLogs,
    workers,
    assignComplaint,
    updateComplaintPriority,
    updateComplaintStatus,
    addInternalNote,
    supervisorVerifyAndResolve,
    supervisorRequestRework,
  } = useApp();

  const complaint: Complaint | undefined = useMemo(
    () => complaints.find((c) => c.id === complaintId),
    [complaints, complaintId]
  );

  const complaintSmsLogs = useMemo(
    () => smsLogs.filter((log) => log.complaintId === complaintId),
    [smsLogs, complaintId]
  );

  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<ComplaintPriority>('Medium');
  const [noteInput, setNoteInput] = useState('');
  const [verificationNote, setVerificationNote] = useState('');
  const [reworkReason, setReworkReason] = useState('');
  const [showReworkBox, setShowReworkBox] = useState(false);

  // Sync local form controls whenever complaint changes
  React.useEffect(() => {
    if (complaint) {
      setSelectedWorkerId(complaint.assignedWorkerId ?? workers[0]?.id ?? '');
      setSelectedPriority(complaint.priority);
      setVerificationNote(complaint.supervisorVerificationNote ?? '');
      setShowReworkBox(false);
      setReworkReason('');
    }
  }, [complaint, workers]);

  const ruleInsights = useMemo(() => {
    if (!complaint) return null;
    const others = complaints.filter((c) => c.id !== complaint.id);
    return analyzeComplaintRuleBased(
      complaint.description,
      complaint.location,
      complaint.wardId,
      others
    );
  }, [complaint, complaints]);

  if (!complaintId || !complaint) return null;

  const workerTaskCounts = new Map<string, number>();
  for (const c of complaints) {
    if (c.assignedWorkerId && c.status !== 'Resolved') {
      workerTaskCounts.set(
        c.assignedWorkerId,
        (workerTaskCounts.get(c.assignedWorkerId) ?? 0) + 1
      );
    }
  }

  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkerId) return;
    assignComplaint(complaint.id, selectedWorkerId, selectedPriority);
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteInput.trim()) return;
    addInternalNote(complaint.id, noteInput);
    setNoteInput('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#142B45]/50 p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="complaint-modal-title"
    >
      <div className="bg-white border border-[#E2E8F0] rounded-lg w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-xl my-auto">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#52677A]">
              <span className="font-mono font-semibold text-[#142B45] tabular-nums">
                {complaint.id}
              </span>
              <span aria-hidden="true">·</span>
              <span>{complaint.wardName}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{formatDateTime(complaint.createdAt)}</span>
              {complaint.isDemoData && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#52677A]">Demonstration Record</span>
                </>
              )}
            </div>
            <h2
              id="complaint-modal-title"
              className="text-lg font-bold text-[#142B45] mt-1 leading-snug"
            >
              {complaint.category}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[#52677A] hover:text-[#142B45] hover:bg-[#E2E8F0]/60 rounded-md transition-colors shrink-0"
            aria-label="Close complaint details"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto px-6 py-5 space-y-6">
          {/* Status & Priority Strip */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[#E2E8F0]">
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <p className="text-xs text-[#52677A] mb-1">Current Status</p>
                <StatusText status={complaint.status} />
              </div>
              <div>
                <p className="text-xs text-[#52677A] mb-1">Priority Level</p>
                <PriorityText priority={complaint.priority} />
              </div>
              <div>
                <p className="text-xs text-[#52677A] mb-1">Reported By</p>
                <p className="text-xs font-semibold text-[#172B3A]">{complaint.citizenName}</p>
              </div>
              <div>
                <p className="text-xs text-[#52677A] mb-1">Assigned Worker</p>
                <p className="text-xs font-semibold text-[#172B3A]">
                  {complaint.assignedWorkerName ?? 'Unassigned'}
                </p>
              </div>
            </div>
          </div>

          {/* Supervisor Verification Banner when Worker has marked task Completed */}
          {mode === 'supervisor' && complaint.status === 'Completed' && (
            <div className="p-4 rounded-lg bg-[#27AE75]/8 border border-[#27AE75]/35 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-[#142B45]">
                    Field Work Completed — Supervisor Verification Required
                  </h3>
                  <p className="text-xs text-[#52677A] mt-0.5">
                    {complaint.assignedWorkerName} uploaded after-cleaning photographic evidence on{' '}
                    <span className="font-mono tabular-nums">
                      {formatDateTime(complaint.workerCompletedAt)}
                    </span>
                    . Review both photographs below before closing.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-[#172B3A] mb-1">
                    Verification Remark (visible to citizen)
                  </label>
                  <input
                    type="text"
                    value={verificationNote}
                    onChange={(e) => setVerificationNote(e.target.value)}
                    placeholder="e.g., After-cleaning evidence verified; site meets municipal standard."
                    className="w-full px-3 py-2 text-sm bg-white border border-[#CBD5E1] rounded-md focus:outline-none focus:ring-2 focus:ring-[#27AE75]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => supervisorVerifyAndResolve(complaint.id, verificationNote)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#27AE75] hover:bg-[#1E8E5E] rounded-md transition-colors whitespace-nowrap"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Verify & Mark Resolved
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReworkBox((prev) => !prev)}
                    className="inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-[#172B3A] bg-white border border-[#CBD5E1] hover:bg-slate-50 rounded-md transition-colors whitespace-nowrap"
                    title="Send back to worker for rework"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Rework
                  </button>
                </div>
              </div>

              {showReworkBox && (
                <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-[#27AE75]/20">
                  <input
                    type="text"
                    value={reworkReason}
                    onChange={(e) => setReworkReason(e.target.value)}
                    placeholder="Explain what needs additional cleaning..."
                    className="flex-1 px-3 py-2 text-sm bg-white border border-[#CBD5E1] rounded-md focus:outline-none focus:ring-2 focus:ring-[#142B45]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      supervisorRequestRework(complaint.id, reworkReason);
                      setShowReworkBox(false);
                    }}
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#142B45] hover:bg-[#1D4262] rounded-md whitespace-nowrap"
                  >
                    Send Back to Worker
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Status Timeline */}
          <div>
            <h3 className="text-sm font-semibold text-[#142B45] mb-3">Resolution Progress</h3>
            <ComplaintTimelineBar complaint={complaint} />
          </div>

          {/* Description & Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[#E2E8F0]">
            <div>
              <h3 className="text-sm font-semibold text-[#142B45] mb-1.5">Issue Description</h3>
              <p className="text-sm text-[#172B3A] leading-relaxed">{complaint.description}</p>
              {complaint.workerRemarks && (
                <div className="mt-4 pt-3 border-t border-[#E2E8F0]">
                  <p className="text-xs font-semibold text-[#142B45]">Worker Field Remarks</p>
                  <p className="text-sm text-[#52677A] mt-1">{complaint.workerRemarks}</p>
                </div>
              )}
              {complaint.supervisorVerificationNote && (
                <div className="mt-3 pt-3 border-t border-[#E2E8F0]">
                  <p className="text-xs font-semibold text-[#1E8E5E]">
                    Supervisor Verification Record
                  </p>
                  <p className="text-sm text-[#172B3A] mt-1">
                    {complaint.supervisorVerificationNote}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[#142B45]">Location & Ward Details</h3>
              <div className="flex items-start gap-2 text-sm text-[#172B3A]">
                <MapPin className="w-4 h-4 text-[#27AE75] shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">{complaint.location}</p>
                  <p className="text-xs text-[#52677A] mt-0.5">{complaint.wardName}</p>
                  <p className="text-xs font-mono tabular-nums text-[#52677A] mt-1">
                    Demo Coordinates: {complaint.coordinates.approxLat},{' '}
                    {complaint.coordinates.approxLng}
                  </p>
                </div>
              </div>

              {mode === 'supervisor' && ruleInsights && (
                <div className="pt-3 border-t border-[#E2E8F0]">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1D4262]">
                    <Sparkles className="w-3.5 h-3.5 text-[#27AE75]" />
                    <span>Rule-Based Triage Advisory (Prototype)</span>
                  </div>
                  <p className="text-xs text-[#52677A] mt-1">
                    Recommended Priority:{' '}
                    <strong className="text-[#172B3A]">{ruleInsights.recommendedPriority}</strong> —{' '}
                    {ruleInsights.priorityReason}
                  </p>
                  {ruleInsights.possibleDuplicates.length > 0 && (
                    <p className="text-xs text-amber-700 mt-1">
                      Related open ticket in ward: {ruleInsights.possibleDuplicates[0].complaintId} (
                      {ruleInsights.possibleDuplicates[0].similarityReason})
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Before & After Photos */}
          <div className="pt-4 border-t border-[#E2E8F0]">
            <h3 className="text-sm font-semibold text-[#142B45] mb-3">
              Photographic Evidence (Before & After)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between text-xs text-[#52677A] mb-1.5">
                  <span className="font-medium text-[#172B3A]">Before Cleaning (Citizen Report)</span>
                  <span className="font-mono tabular-nums">{formatDateTime(complaint.createdAt)}</span>
                </div>
                <SafeImage
                  src={complaint.beforePhotoUrl}
                  alt={`Before cleaning photo for ${complaint.id}`}
                  className="w-full h-56 object-cover rounded-md border border-[#E2E8F0]"
                  emptyLabel="No citizen photograph attached"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs text-[#52677A] mb-1.5">
                  <span className="font-medium text-[#172B3A]">
                    After Cleaning (Worker Verification)
                  </span>
                  <span className="font-mono tabular-nums">
                    {complaint.workerCompletedAt
                      ? formatDateTime(complaint.workerCompletedAt)
                      : 'Awaiting upload'}
                  </span>
                </div>
                <SafeImage
                  src={complaint.afterPhotoUrl}
                  alt={`After cleaning evidence for ${complaint.id}`}
                  className="w-full h-56 object-cover rounded-md border border-[#E2E8F0]"
                  emptyLabel="Pending after-cleaning photo from field crew"
                />
              </div>
            </div>
          </div>

          {/* Supervisor Management Controls */}
          {mode === 'supervisor' && (
            <div className="pt-4 border-t border-[#E2E8F0] space-y-5">
              <h3 className="text-sm font-semibold text-[#142B45]">
                Supervisor Dispatch & Controls
              </h3>

              <form
                onSubmit={handleAssignSubmit}
                className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
              >
                <div className="md:col-span-5">
                  <label className="block text-xs font-medium text-[#52677A] mb-1">
                    Assign Sanitation Worker
                  </label>
                  <select
                    value={selectedWorkerId}
                    onChange={(e) => setSelectedWorkerId(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-[#CBD5E1] rounded-md focus:outline-none focus:ring-2 focus:ring-[#142B45]"
                  >
                    {workers.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.crewCode}) — {workerTaskCounts.get(w.id) ?? 0} active tasks
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-medium text-[#52677A] mb-1">
                    Priority Level
                  </label>
                  <select
                    value={selectedPriority}
                    onChange={(e) => {
                      const val = e.target.value as ComplaintPriority;
                      setSelectedPriority(val);
                      updateComplaintPriority(complaint.id, val);
                    }}
                    className="w-full px-3 py-2 text-sm bg-white border border-[#CBD5E1] rounded-md focus:outline-none focus:ring-2 focus:ring-[#142B45]"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-4 flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#142B45] hover:bg-[#1D4262] rounded-md transition-colors whitespace-nowrap"
                  >
                    <UserCheck className="w-4 h-4" />
                    {complaint.assignedWorkerId ? 'Reassign Worker' : 'Assign Worker'}
                  </button>
                </div>
              </form>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div className="md:col-span-5">
                  <label className="block text-xs font-medium text-[#52677A] mb-1">
                    Manual Status Override
                  </label>
                  <select
                    value={complaint.status}
                    onChange={(e) =>
                      updateComplaintStatus(complaint.id, e.target.value as ComplaintStatus)
                    }
                    className="w-full px-3 py-2 text-sm bg-white border border-[#CBD5E1] rounded-md focus:outline-none focus:ring-2 focus:ring-[#142B45]"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-7 text-xs text-[#52677A] pb-2">
                  Status updates synchronize immediately across Citizen and Sanitation Worker views.
                </div>
              </div>

              {/* Internal Notes */}
              <div className="pt-4 border-t border-[#E2E8F0]">
                <h4 className="text-xs font-semibold text-[#142B45] mb-2">
                  Internal Municipal Notes ({complaint.internalNotes.length})
                </h4>
                {complaint.internalNotes.length === 0 ? (
                  <p className="text-xs text-[#52677A] mb-3">
                    No internal notes logged for this ticket yet.
                  </p>
                ) : (
                  <ul className="space-y-2 mb-3">
                    {complaint.internalNotes.map((note) => (
                      <li
                        key={note.id}
                        className="text-xs bg-[#F4F7FA] border border-[#E2E8F0] rounded-md px-3 py-2"
                      >
                        <div className="flex items-center justify-between text-[#52677A] mb-1">
                          <span className="font-semibold text-[#172B3A]">{note.authorName}</span>
                          <span className="font-mono tabular-nums">
                            {formatDateTime(note.createdAt)}
                          </span>
                        </div>
                        <p className="text-[#172B3A]">{note.content}</p>
                      </li>
                    ))}
                  </ul>
                )}

                <form onSubmit={handleAddNote} className="flex gap-2">
                  <input
                    type="text"
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    placeholder="Add internal instruction for crew or ward audit..."
                    className="flex-1 px-3 py-2 text-sm bg-white border border-[#CBD5E1] rounded-md focus:outline-none focus:ring-2 focus:ring-[#142B45]"
                  />
                  <button
                    type="submit"
                    disabled={!noteInput.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1D4262] hover:bg-[#142B45] disabled:opacity-45 rounded-md transition-colors whitespace-nowrap"
                  >
                    <MessageSquarePlus className="w-4 h-4" />
                    Add Note
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Audit Activity Log */}
          <div className="pt-4 border-t border-[#E2E8F0]">
            <h3 className="text-sm font-semibold text-[#142B45] mb-3">Activity Audit Trail</h3>
            <ol className="space-y-2.5">
              {[...complaint.timeline].reverse().map((event) => (
                <li
                  key={event.id}
                  className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 text-xs pb-2.5 border-b border-[#E2E8F0]/70 last:border-b-0 last:pb-0"
                >
                  <div>
                    <span className="font-semibold text-[#142B45]">{event.status}</span>
                    <span className="mx-1.5 text-slate-400">·</span>
                    <span className="text-[#172B3A]">{event.summary}</span>
                  </div>
                  <div className="text-[#52677A] whitespace-nowrap shrink-0">
                    <span>{event.actorName}</span>
                    <span className="mx-1.5 text-slate-300">/</span>
                    <span className="font-mono tabular-nums">{formatDateTime(event.timestamp)}</span>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Dispatched Simulated SMS Log for this Complaint */}
          <div className="pt-4 border-t border-[#E2E8F0]">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-1.5">
                <MessageSquareText className="w-4 h-4 text-[#27AE75]" />
                <h3 className="text-sm font-semibold text-[#142B45]">
                  Citizen SMS Notification Log (Simulated)
                </h3>
              </div>
              <span className="text-[11px] font-mono tabular-nums text-[#52677A]">
                {complaintSmsLogs.length} {complaintSmsLogs.length === 1 ? 'SMS' : 'SMS logs'}
              </span>
            </div>

            {complaintSmsLogs.length === 0 ? (
              <p className="text-xs text-[#52677A]">
                No simulated SMS dispatches recorded for this ticket yet. Any status change will
                log an automated citizen SMS here.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {complaintSmsLogs.map((sms) => (
                  <li
                    key={sms.id}
                    className={`rounded-md border px-3.5 py-2.5 text-xs ${
                      sms.isResolutionAlert
                        ? 'bg-[#27AE75]/8 border-[#27AE75]/35'
                        : 'bg-[#F8FAFC] border-[#E2E8F0]'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                      <span
                        className={`font-semibold ${
                          sms.isResolutionAlert ? 'text-[#1E8E5E]' : 'text-[#142B45]'
                        }`}
                      >
                        {sms.isResolutionAlert ? 'Resolved Citizen Alert' : sms.eventLabel} →{' '}
                        {sms.recipientName} ({sms.recipientPhone})
                      </span>
                      <span className="font-mono text-[11px] tabular-nums text-[#52677A]">
                        {sms.deliveryStatus} · {formatDateTime(sms.sentAt)}
                      </span>
                    </div>
                    <p className="font-mono text-[11px] text-[#172B3A] leading-relaxed">
                      {sms.message}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-[#E2E8F0] bg-[#F8FAFC]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#142B45] bg-white border border-[#CBD5E1] hover:bg-slate-50 rounded-md transition-colors"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
};
