import { DEMO_USERS } from '../data/seedData';
import {
  Complaint,
  ComplaintStatus,
  SmsNotificationLog,
  SmsTriggerEvent,
} from '../types';

/**
 * Modular SMS Gateway Simulation Service.
 * Designed with a clean interface so production gateways (Twilio, MSG91, or
 * Firebase Cloud Functions SMS triggers) can replace LocalSmsSimulationService
 * without modifying UI components or AppContext workflows.
 */

export const SMS_STORAGE_KEY = 'swachh360_sms_logs_v1';

export interface ISmsNotificationService {
  getLogs(): SmsNotificationLog[];
  saveLogs(logs: SmsNotificationLog[]): void;
  seedInitialLogs(complaints: Complaint[]): SmsNotificationLog[];
  dispatchStatusChangeSms(params: {
    complaint: Complaint;
    newStatus: ComplaintStatus | 'Rework Requested';
    verificationNote?: string;
    workerName?: string;
  }): SmsNotificationLog;
  clearLogs(): void;
}

const DEMO_CITIZEN_PHONES: Record<string, string> = {
  'citizen@swachh360.demo': DEMO_USERS.citizen.phone,
  'neha.g@swachh360.demo': '+91 98230 14209',
  'salim.a@swachh360.demo': '+91 98230 19844',
  'kavita.m@swachh360.demo': '+91 98230 22517',
  'prakash.w@swachh360.demo': '+91 98230 26391',
  'suresh.k@swachh360.demo': '+91 98230 31048',
  'rameshwar.p@swachh360.demo': '+91 98230 35672',
  'vandana.i@swachh360.demo': '+91 98230 40915',
  'imran.s@swachh360.demo': '+91 98230 45123',
  'rekha.d@swachh360.demo': '+91 98230 48902',
};

function resolveCitizenPhone(email: string): string {
  return DEMO_CITIZEN_PHONES[email.toLowerCase()] ?? '+91 98230 50000';
}

function buildSmsPayload(
  complaint: Complaint,
  newStatus: ComplaintStatus | 'Rework Requested',
  workerName?: string,
  verificationNote?: string
): { eventLabel: SmsTriggerEvent; message: string; isResolutionAlert: boolean } {
  const assignedLabel = workerName ?? complaint.assignedWorkerName ?? 'Ward Sanitation Crew';

  switch (newStatus) {
    case 'Submitted':
      return {
        eventLabel: 'Complaint Submitted',
        isResolutionAlert: false,
        message: `SWACHH360: Thank you ${complaint.citizenName}. Your ${complaint.category} report (${complaint.id}) at ${complaint.location} has been registered and sent to the ${complaint.wardName} Supervisor.`,
      };
    case 'Assigned':
      return {
        eventLabel: 'Crew Assigned',
        isResolutionAlert: false,
        message: `SWACHH360 Update (${complaint.id}): Your complaint at ${complaint.location} has been assigned to ${assignedLabel} (${complaint.priority} priority).`,
      };
    case 'In Progress':
      return {
        eventLabel: 'Work Started',
        isResolutionAlert: false,
        message: `SWACHH360 Update (${complaint.id}): Field crew ${assignedLabel} is now on site at ${complaint.location}. Cleanup work is In Progress.`,
      };
    case 'Completed':
      return {
        eventLabel: 'Work Completed',
        isResolutionAlert: false,
        message: `SWACHH360 Update (${complaint.id}): Sanitation work at ${complaint.location} is completed with after-cleaning photo uploaded. Awaiting Municipal Supervisor verification.`,
      };
    case 'Resolved':
      return {
        eventLabel: 'Issue Resolved',
        isResolutionAlert: true,
        message: `SWACHH360 RESOLVED (${complaint.id}): Good news ${complaint.citizenName}! Your reported ${complaint.category} at ${complaint.location} (${complaint.wardName}) has been verified & marked Resolved.${
          verificationNote ? ` Note: ${verificationNote}` : ''
        } View before-and-after photo evidence in the SWACHH360 Citizen Portal.`,
      };
    case 'Rework Requested':
      return {
        eventLabel: 'Rework Requested',
        isResolutionAlert: false,
        message: `SWACHH360 Update (${complaint.id}): Supervisor requested additional sanitation follow-up at ${complaint.location} before final closure. Field crew has been notified.`,
      };
    default:
      return {
        eventLabel: 'Status Updated',
        isResolutionAlert: false,
        message: `SWACHH360 Update (${complaint.id}): Status for ${complaint.location} is now ${newStatus}.`,
      };
  }
}

class LocalSmsSimulationService implements ISmsNotificationService {
  getLogs(): SmsNotificationLog[] {
    try {
      const raw = window.localStorage.getItem(SMS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as SmsNotificationLog[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  saveLogs(logs: SmsNotificationLog[]): void {
    try {
      window.localStorage.setItem(SMS_STORAGE_KEY, JSON.stringify(logs.slice(0, 120)));
    } catch {
      // Ignore storage quota edge case for non-critical simulated logs
    }
  }

  seedInitialLogs(complaints: Complaint[]): SmsNotificationLog[] {
    const seeded: SmsNotificationLog[] = [];

    for (const c of complaints) {
      // Generate realistic historical SMS entries for Resolved and active demo tickets
      if (c.status === 'Resolved') {
        const payload = buildSmsPayload(
          c,
          'Resolved',
          c.assignedWorkerName,
          c.supervisorVerificationNote
        );
        seeded.push({
          id: `SMS-${c.id.slice(-4)}-RES`,
          complaintId: c.id,
          recipientName: c.citizenName,
          recipientPhone: resolveCitizenPhone(c.citizenEmail),
          recipientRole: 'citizen',
          triggerStatus: 'Resolved',
          eventLabel: payload.eventLabel,
          message: payload.message,
          sentAt: c.resolvedAt ?? c.updatedAt,
          deliveryStatus: 'Simulated Delivered',
          isResolutionAlert: true,
          isSimulated: true,
        });
      } else if (c.status === 'Completed' || c.status === 'Assigned' || c.status === 'In Progress') {
        const payload = buildSmsPayload(c, c.status, c.assignedWorkerName);
        seeded.push({
          id: `SMS-${c.id.slice(-4)}-${c.status.slice(0, 3).toUpperCase()}`,
          complaintId: c.id,
          recipientName: c.citizenName,
          recipientPhone: resolveCitizenPhone(c.citizenEmail),
          recipientRole: 'citizen',
          triggerStatus: c.status,
          eventLabel: payload.eventLabel,
          message: payload.message,
          sentAt: c.updatedAt,
          deliveryStatus: 'Simulated Delivered',
          isResolutionAlert: false,
          isSimulated: true,
        });
      }
    }

    seeded.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
    this.saveLogs(seeded);
    return seeded;
  }

  dispatchStatusChangeSms(params: {
    complaint: Complaint;
    newStatus: ComplaintStatus | 'Rework Requested';
    verificationNote?: string;
    workerName?: string;
  }): SmsNotificationLog {
    const { complaint, newStatus, verificationNote, workerName } = params;
    const { eventLabel, message, isResolutionAlert } = buildSmsPayload(
      complaint,
      newStatus,
      workerName,
      verificationNote
    );

    const log: SmsNotificationLog = {
      id: `SMS-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
      complaintId: complaint.id,
      recipientName: complaint.citizenName,
      recipientPhone: resolveCitizenPhone(complaint.citizenEmail),
      recipientRole: 'citizen',
      triggerStatus: newStatus,
      eventLabel,
      message,
      sentAt: new Date().toISOString(),
      deliveryStatus: 'Simulated Delivered',
      isResolutionAlert,
      isSimulated: true,
    };

    // Structured console log for developer / judge verification
    console.info(
      `[SWACHH360 Simulated SMS Gateway] ${log.eventLabel} -> ${log.recipientName} (${log.recipientPhone}): ${log.message}`
    );

    const existing = this.getLogs();
    this.saveLogs([log, ...existing]);
    return log;
  }

  clearLogs(): void {
    this.saveLogs([]);
  }
}

export const smsNotificationService: ISmsNotificationService = new LocalSmsSimulationService();
