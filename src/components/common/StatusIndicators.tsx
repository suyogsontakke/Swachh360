import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ClipboardCheck,
  ImageOff,
  PlayCircle,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';
import { Complaint, ComplaintPriority, ComplaintStatus } from '../../types';

export function formatShortDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const StatusText: React.FC<{ status: ComplaintStatus; compact?: boolean }> = ({
  status,
  compact = false,
}) => {
  const config: Record<
    ComplaintStatus,
    { label: string; shortLabel: string; color: string; Icon: React.FC<{ className?: string }> }
  > = {
    Submitted: {
      label: 'Submitted',
      shortLabel: 'Submitted',
      color: 'text-slate-700',
      Icon: Clock,
    },
    Assigned: {
      label: 'Assigned to Crew',
      shortLabel: 'Assigned',
      color: 'text-[#1D4262]',
      Icon: UserCheck,
    },
    'In Progress': {
      label: 'In Progress',
      shortLabel: 'In Progress',
      color: 'text-amber-700',
      Icon: PlayCircle,
    },
    Completed: {
      label: 'Completed · Pending Verification',
      shortLabel: 'Pending Verify',
      color: 'text-teal-700',
      Icon: ClipboardCheck,
    },
    Resolved: {
      label: 'Resolved & Verified',
      shortLabel: 'Resolved',
      color: 'text-[#1E8E5E]',
      Icon: CheckCircle2,
    },
  };

  const { label, shortLabel, color, Icon } = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap ${color}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{compact ? shortLabel : label}</span>
    </span>
  );
};

export const PriorityText: React.FC<{ priority: ComplaintPriority }> = ({ priority }) => {
  const map: Record<
    ComplaintPriority,
    { color: string; Icon: React.FC<{ className?: string }> }
  > = {
    Low: { color: 'text-slate-600', Icon: AlertCircle },
    Medium: { color: 'text-[#1D4262]', Icon: AlertCircle },
    High: { color: 'text-amber-700', Icon: AlertTriangle },
    Critical: { color: 'text-red-700', Icon: ShieldAlert },
  };
  const { color, Icon } = map[priority];
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold whitespace-nowrap ${color}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{priority}</span>
    </span>
  );
};

export const SafeImage: React.FC<{
  src?: string;
  alt: string;
  className?: string;
  emptyLabel?: string;
}> = ({ src, alt, className = 'w-full h-48 object-cover', emptyLabel = 'No photograph attached' }) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-[#F4F7FA] border border-dashed border-[#CBD5E1] text-[#52677A] ${className}`}
      >
        <ImageOff className="w-6 h-6 mb-1.5 text-slate-400" />
        <span className="text-xs font-medium">{emptyLabel}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};

export const ComplaintTimelineBar: React.FC<{ complaint: Complaint }> = ({ complaint }) => {
  const steps: Array<{
    key: ComplaintStatus;
    label: string;
    timestamp?: string;
  }> = [
    { key: 'Submitted', label: 'Submitted', timestamp: complaint.createdAt },
    { key: 'Assigned', label: 'Assigned', timestamp: complaint.assignedAt },
    { key: 'In Progress', label: 'In Progress', timestamp: complaint.inProgressAt },
    { key: 'Completed', label: 'Work Completed', timestamp: complaint.workerCompletedAt },
    { key: 'Resolved', label: 'Resolved', timestamp: complaint.resolvedAt },
  ];

  const orderMap: Record<ComplaintStatus, number> = {
    Submitted: 0,
    Assigned: 1,
    'In Progress': 2,
    Completed: 3,
    Resolved: 4,
  };
  const currentIdx = orderMap[complaint.status];

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        {steps.map((step, idx) => {
          const isReached = idx <= currentIdx;
          const isCurrent = idx === currentIdx;
          return (
            <div key={step.key} className="relative flex sm:flex-col items-start gap-2.5 sm:gap-1.5">
              <div className="flex items-center w-auto sm:w-full">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-semibold shrink-0 border transition-colors ${
                    isReached
                      ? isCurrent && step.key !== 'Resolved'
                        ? 'bg-[#142B45] text-white border-[#142B45]'
                        : 'bg-[#27AE75] text-white border-[#27AE75]'
                      : 'bg-white text-slate-400 border-[#CBD5E1]'
                  }`}
                >
                  {idx + 1}
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`hidden sm:block h-0.5 flex-1 ml-2 ${
                      idx < currentIdx ? 'bg-[#27AE75]' : 'bg-[#E2E8F0]'
                    }`}
                  />
                )}
              </div>
              <div className="min-w-0">
                <p
                  className={`text-xs font-semibold ${
                    isReached ? 'text-[#172B3A]' : 'text-slate-400'
                  }`}
                >
                  {step.label}
                </p>
                <p className="text-[11px] font-mono tabular-nums text-[#52677A] mt-0.5">
                  {step.timestamp ? formatDateTime(step.timestamp) : 'Pending'}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
