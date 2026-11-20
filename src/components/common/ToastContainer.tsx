import React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Info,
  MessageSquareText,
  X,
} from 'lucide-react';
import { ToastMessage } from '../../context/AppContext';
import { formatDateTime } from './StatusIndicators';

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 w-[calc(100vw-2rem)] sm:w-[400px] max-w-[420px] pointer-events-none"
      aria-live="polite"
      aria-label="Status Notifications"
    >
      {toasts.map((toast) => {
        if (toast.smsLog) {
          const sms = toast.smsLog;
          const isResolved = sms.isResolutionAlert;

          return (
            <div
              key={toast.id}
              role="status"
              className="toast-enter pointer-events-auto bg-white text-[#172B3A] rounded-lg shadow-lg border border-[#E2E8F0] px-4 py-3.5"
            >
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  {isResolved ? (
                    <CheckCircle2 className="w-4 h-4 text-[#27AE75] shrink-0" />
                  ) : (
                    <MessageSquareText className="w-4 h-4 text-[#1D4262] shrink-0" />
                  )}
                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs min-w-0">
                    <span
                      className={`font-semibold whitespace-nowrap ${
                        isResolved ? 'text-[#1E8E5E]' : 'text-[#142B45]'
                      }`}
                    >
                      {isResolved ? 'Issue Resolved · SMS Alert' : `SMS Update · ${sms.eventLabel}`}
                    </span>
                    <span className="text-slate-300" aria-hidden="true">
                      /
                    </span>
                    <span className="font-mono text-[11px] font-medium text-[#52677A] tabular-nums whitespace-nowrap">
                      {sms.complaintId}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onDismiss(toast.id)}
                  className="p-0.5 text-slate-400 hover:text-[#142B45] transition-colors shrink-0"
                  aria-label="Dismiss status notification"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="mt-2 text-xs text-[#172B3A] leading-relaxed bg-[#F8FAFC] border border-[#E2E8F0] rounded px-2.5 py-2 font-mono">
                {sms.message}
              </p>

              <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-[#52677A]">
                <span className="truncate">
                  To {sms.recipientName}{' '}
                  <span className="font-mono tabular-nums">({sms.recipientPhone})</span>
                </span>
                <span className="font-mono tabular-nums whitespace-nowrap shrink-0 text-[#1E8E5E]">
                  {sms.deliveryStatus} · {formatDateTime(sms.sentAt)}
                </span>
              </div>
            </div>
          );
        }

        return (
          <div
            key={toast.id}
            role="status"
            className="toast-enter pointer-events-auto flex items-start gap-2.5 bg-[#142B45] text-white px-4 py-3 rounded-lg shadow-lg border border-white/10 text-xs"
          >
            {toast.tone === 'success' && (
              <CheckCircle2 className="w-4 h-4 text-[#27AE75] shrink-0 mt-0.5" />
            )}
            {toast.tone === 'info' && (
              <Info className="w-4 h-4 text-sky-300 shrink-0 mt-0.5" />
            )}
            {toast.tone === 'error' && (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            )}
            <span className="flex-1 leading-relaxed">{toast.message}</span>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="text-slate-400 hover:text-white transition-colors shrink-0"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
