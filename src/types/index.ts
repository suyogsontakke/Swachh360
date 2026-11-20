export type UserRole = 'citizen' | 'supervisor' | 'worker';

export interface DemoUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  designation: string;
  wardId?: string;
  wardLabel?: string;
  crewCode?: string;
  phone: string;
  assignedWards?: string[];
}

export type ComplaintCategory =
  | 'Garbage Overflow'
  | 'Uncollected Waste'
  | 'Blocked Drain'
  | 'Overflowing Public Bin'
  | 'Other Sanitation Issue';

export type ComplaintStatus =
  | 'Submitted'
  | 'Assigned'
  | 'In Progress'
  | 'Completed'
  | 'Resolved';

export type ComplaintPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface TimelineEvent {
  id: string;
  status: ComplaintStatus | 'Note Added' | 'Rework Requested';
  timestamp: string;
  actorName: string;
  actorRole: UserRole | 'system';
  summary: string;
}

export interface InternalNote {
  id: string;
  authorName: string;
  authorRole: UserRole;
  content: string;
  createdAt: string;
}

export interface Complaint {
  id: string;
  category: ComplaintCategory;
  description: string;
  location: string;
  wardId: string;
  wardName: string;
  coordinates: {
    x: number; // Schematic ward map X (0-100)
    y: number; // Schematic ward map Y (0-100)
    approxLat: string;
    approxLng: string;
  };
  status: ComplaintStatus;
  priority: ComplaintPriority;
  citizenId: string;
  citizenName: string;
  citizenEmail: string;
  assignedWorkerId?: string;
  assignedWorkerName?: string;
  assignedWorkerEmail?: string;
  beforePhotoUrl?: string;
  afterPhotoUrl?: string;
  workerRemarks?: string;
  supervisorVerificationNote?: string;
  createdAt: string;
  updatedAt: string;
  assignedAt?: string;
  inProgressAt?: string;
  workerCompletedAt?: string;
  resolvedAt?: string;
  timeline: TimelineEvent[];
  internalNotes: InternalNote[];
  isDemoData?: boolean;
}

export interface WardInfo {
  id: string;
  code: string;
  name: string;
  zone: string;
  populationEstimate: string;
  densityClass: 'High Density' | 'Very High Density' | 'Dense Urban Cluster';
  mapCenter: { x: number; y: number };
  polygonPoints: string;
  sampleLandmarks: string[];
}

export interface WorkerProfile {
  id: string;
  name: string;
  email: string;
  crewCode: string;
  phone: string;
  shift: string;
  assignedWards: string[];
}

export interface RuleBasedSuggestion {
  suggestedCategory: ComplaintCategory;
  categoryConfidence: 'High' | 'Moderate' | 'Baseline';
  matchedKeywords: string[];
  recommendedPriority: ComplaintPriority;
  priorityReason: string;
  possibleDuplicates: Array<{
    complaintId: string;
    location: string;
    status: ComplaintStatus;
    similarityReason: string;
  }>;
  engineNotice: string;
}

export interface SimulatedImageAnalysis {
  predictedLabel: ComplaintCategory;
  estimatedSeverity: ComplaintPriority;
  detectedIndicators: string[];
  recommendedCrewAction: string;
  simulationNotice: string;
}

export interface HotspotSummary {
  wardId: string;
  wardName: string;
  totalReports: number;
  openReports: number;
  dominantCategory: ComplaintCategory;
  riskLevel: 'Elevated' | 'High' | 'Recurring Critical';
  recommendedAction: string;
}

export type SmsDeliveryStatus = 'Simulated Delivered' | 'Queued (Simulated)';

export type SmsTriggerEvent =
  | 'Complaint Submitted'
  | 'Crew Assigned'
  | 'Work Started'
  | 'Work Completed'
  | 'Issue Resolved'
  | 'Status Updated'
  | 'Rework Requested';

export interface SmsNotificationLog {
  id: string;
  complaintId: string;
  recipientName: string;
  recipientPhone: string;
  recipientRole: UserRole;
  triggerStatus: ComplaintStatus | 'Rework Requested';
  eventLabel: SmsTriggerEvent;
  message: string;
  sentAt: string;
  deliveryStatus: SmsDeliveryStatus;
  isResolutionAlert: boolean;
  isSimulated: true;
}

