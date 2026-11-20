import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Info,
  MessageSquareText,
  Phone,
  Search,
  Trash2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatDateTime } from '../common/StatusIndicators';

interface SmsNotificationsPanelProps {
  scope: 'all' | 'citizen';
  onSelectComplaint?: (complaintId: string) => void;
}

export const SmsNotificationsPanel: React.FC<SmsNotificationsPanelProps> = ({
  scope,
  onSelectComplaint,
}) => {
  const { smsLogs, currentUser, clearSmsLogs } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'RESOLVED' | 'OTHER'>('ALL');

  const scopedLogs = useMemo(() => {
    if (scope === 'citizen' && currentUser) {
      return smsLogs.filter(
        (log) =>
          log.recipientPhone === currentUser.phone ||
          log.recipientName.toLowerCase() === currentUser.name.toLowerCase()
      );
    }
    return smsLogs;
  }, [smsLogs, scope, currentUser]);

  const filteredLogs = useMemo(() => {
    return scopedLogs.filter((log) => {
      if (filterMode === 'RESOLVED' && !log.isResolutionAlert) return false;
      if (filterMode === 'OTHER' && log.isResolutionAlert) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          log.complaintId.toLowerCase().includes(q) ||
          log.recipientName.toLowerCase().includes(q) ||
          log.recipientPhone.toLowerCase().includes(q) ||
          log.message.toLowerCase().includes(q) ||
          log.eventLabel.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [scopedLogs, filterMode, searchQuery]);

  const resolvedCount = scopedLogs.filter((l) => l.isResolutionAlert).length;

  return (
    <div className="space-y-6">
      {/* Transparent Service Simulation Header */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-md bg-[#142B45] text-[#27AE75] flex items-center justify-center shrink-0">
            <MessageSquareText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#142B45]">
              {scope === 'citizen'
                ? 'Citizen SMS Notification Inbox (Simulated)'
                : 'SMS Gateway Dispatch Logs (Simulated)'}
            </h2>
            <p className="text-xs text-[#52677A] mt-1 max-w-3xl leading-relaxed">
              {scope === 'citizen'
                ? `Automatic simulated SMS alerts dispatched to ${
                    currentUser?.phone ?? '+91 98230 11402'
                  } whenever your complaint changes status — with priority resolution notices when verified closed.`
                : 'Service-layer SMS simulation automatically triggered on every complaint status transition, prioritizing Citizen Resolution Alerts when a ticket is verified Resolved. Ready for Twilio / MSG91 / Cloud Functions.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-5 shrink-0">
          <div className="text-right">
            <p className="font-mono text-xl font-bold tabular-nums text-[#142B45]">
              {scopedLogs.length}
            </p>
            <p className="text-[11px] text-[#52677A]">Total SMS Logged</p>
          </div>
          <div className="text-right pl-4 border-l border-[#E2E8F0]">
            <p className="font-mono text-xl font-bold tabular-nums text-[#1E8E5E]">
              {resolvedCount}
            </p>
            <p className="text-[11px] text-[#52677A]">Resolved Alerts</p>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#52677A] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Complaint ID, phone, recipient, or SMS text..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded-md focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#142B45]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-[#F4F7FA] rounded-md">
            {(
              [
                { id: 'ALL', label: `All (${scopedLogs.length})` },
                { id: 'RESOLVED', label: `Resolved Alerts (${resolvedCount})` },
                { id: 'OTHER', label: 'Workflow Updates' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterMode(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  filterMode === tab.id
                    ? 'bg-white text-[#142B45] shadow-sm font-semibold'
                    : 'text-[#52677A] hover:text-[#142B45]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {scope === 'all' && smsLogs.length > 0 && (
            <button
              type="button"
              onClick={clearSmsLogs}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#52677A] hover:text-red-700 border border-[#CBD5E1] rounded-md transition-colors whitespace-nowrap"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Logs
            </button>
          )}
        </div>
      </div>

      {/* SMS Log Stream */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <MessageSquareText className="w-7 h-7 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-[#142B45]">No SMS notification logs found</p>
            <p className="text-xs text-[#52677A] mt-1 max-w-md mx-auto">
              Update any complaint status (or verify &amp; mark a ticket Resolved) to watch
              simulated citizen SMS dispatches appear here in real time.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[#E2E8F0]">
            {filteredLogs.map((log) => (
              <li
                key={log.id}
                className={`px-5 py-4 transition-colors ${
                  log.isResolutionAlert ? 'bg-[#27AE75]/[0.04]' : 'hover:bg-[#F8FAFC]'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    {log.isResolutionAlert ? (
                      <span className="inline-flex items-center gap-1 font-bold text-[#1E8E5E]">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        Citizen Resolution SMS
                      </span>
                    ) : (
                      <span className="font-semibold text-[#142B45]">{log.eventLabel}</span>
                    )}
                    <span className="text-slate-300">·</span>
                    <button
                      type="button"
                      onClick={() => onSelectComplaint?.(log.complaintId)}
                      className="font-mono font-semibold text-[#1D4262] hover:text-[#27AE75] tabular-nums"
                    >
                      {log.complaintId}
                    </button>
                    <span className="text-slate-300">·</span>
                    <span className="inline-flex items-center gap-1 text-[#52677A]">
                      <Phone className="w-3 h-3 shrink-0" />
                      <span className="font-medium text-[#172B3A]">{log.recipientName}</span>
                      <span className="font-mono tabular-nums">({log.recipientPhone})</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-[#52677A] whitespace-nowrap shrink-0">
                    <span className="text-[#1E8E5E] font-medium">{log.deliveryStatus}</span>
                    <span className="text-slate-300">/</span>
                    <span className="font-mono tabular-nums">{formatDateTime(log.sentAt)}</span>
                  </div>
                </div>

                <p className="mt-2 text-xs sm:text-sm text-[#172B3A] leading-relaxed font-mono bg-[#F8FAFC] border border-[#E2E8F0] rounded px-3.5 py-2.5">
                  {log.message}
                </p>

                <div className="mt-2 flex items-center justify-between text-[11px] text-[#52677A]">
                  <span className="font-mono tabular-nums">Dispatch Ref: {log.id}</span>
                  {onSelectComplaint && (
                    <button
                      type="button"
                      onClick={() => onSelectComplaint(log.complaintId)}
                      className="font-semibold text-[#1D4262] hover:text-[#27AE75]"
                    >
                      Inspect Complaint →
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer Architecture Hint */}
      <div className="flex items-start gap-2 text-xs text-[#52677A]">
        <Info className="w-4 h-4 text-[#1D4262] shrink-0 mt-0.5" />
        <span>
          All SMS notifications are also logged to the browser developer console under{' '}
          <code className="font-mono text-[#142B45]">[SWACHH360 Simulated SMS Gateway]</code> for
          audit verification.
        </span>
      </div>
    </div>
  );
};
