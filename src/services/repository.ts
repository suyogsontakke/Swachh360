import { createSeedComplaints, DEMO_USERS, NAGPUR_WARDS } from '../data/seedData';
import {
  Complaint,
  ComplaintCategory,
  ComplaintPriority,
  ComplaintStatus,
  DemoUser,
  UserRole,
} from '../types';

/**
 * Firebase-ready repository abstractions.
 * In production, swap LocalStorageComplaintRepository -> FirestoreComplaintRepository,
 * DemoAuthService -> FirebaseAuthService, and LocalImageStorageService -> FirebaseStorageService
 * without modifying UI components.
 */

export interface IComplaintRepository {
  getAll(): Complaint[];
  saveAll(complaints: Complaint[]): void;
  resetToDemoSeed(): Complaint[];
  generateUniqueId(existing: Complaint[]): string;
}

export interface IAuthService {
  getCurrentUser(): DemoUser | null;
  signInWithDemoRole(role: UserRole): DemoUser;
  signInWithEmail(email: string): DemoUser | null;
  signOut(): void;
}

export interface IStorageService {
  processPhotoFile(file: File): Promise<string>;
}

export const STORAGE_KEYS = {
  complaints: 'swachh360_complaints_v1',
  session: 'swachh360_demo_session_v1',
} as const;

class LocalStorageComplaintRepository implements IComplaintRepository {
  getAll(): Complaint[] {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEYS.complaints);
      if (!raw) {
        const seeded = createSeedComplaints();
        this.saveAll(seeded);
        return seeded;
      }
      const parsed = JSON.parse(raw) as Complaint[];
      if (!Array.isArray(parsed) || parsed.length === 0) {
        const seeded = createSeedComplaints();
        this.saveAll(seeded);
        return seeded;
      }
      return parsed;
    } catch {
      return createSeedComplaints();
    }
  }

  saveAll(complaints: Complaint[]): void {
    try {
      window.localStorage.setItem(STORAGE_KEYS.complaints, JSON.stringify(complaints));
    } catch {
      // Handle localStorage quota edge case gracefully by trimming older photo payloads if needed
      const compacted = complaints.map((item, idx) =>
        idx > 15 && item.beforePhotoUrl?.startsWith('data:')
          ? { ...item, beforePhotoUrl: undefined }
          : item
      );
      window.localStorage.setItem(STORAGE_KEYS.complaints, JSON.stringify(compacted));
    }
  }

  resetToDemoSeed(): Complaint[] {
    const seeded = createSeedComplaints();
    this.saveAll(seeded);
    return seeded;
  }

  generateUniqueId(existing: Complaint[]): string {
    const year = new Date().getFullYear();
    const numericSuffixes = existing
      .map((c) => {
        const match = c.id.match(/(\d{4})$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((n) => !Number.isNaN(n));
    const nextNum = (numericSuffixes.length > 0 ? Math.max(...numericSuffixes) : 14) + 1;
    let candidate = `SW360-NGP-${year}-${String(nextNum).padStart(4, '0')}`;
    const existingIds = new Set(existing.map((c) => c.id));
    let bump = nextNum;
    while (existingIds.has(candidate)) {
      bump += 1;
      candidate = `SW360-NGP-${year}-${String(bump).padStart(4, '0')}`;
    }
    return candidate;
  }
}

class DemoAuthService implements IAuthService {
  getCurrentUser(): DemoUser | null {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEYS.session);
      if (!raw) return null;
      return JSON.parse(raw) as DemoUser;
    } catch {
      return null;
    }
  }

  signInWithDemoRole(role: UserRole): DemoUser {
    const user = DEMO_USERS[role];
    window.localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(user));
    return user;
  }

  signInWithEmail(email: string): DemoUser | null {
    const normalized = email.trim().toLowerCase();
    const matched = Object.values(DEMO_USERS).find(
      (u) => u.email.toLowerCase() === normalized
    );
    if (!matched) return null;
    window.localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(matched));
    return matched;
  }

  signOut(): void {
    window.localStorage.removeItem(STORAGE_KEYS.session);
  }
}

class LocalImageStorageService implements IStorageService {
  /**
   * Compresses uploaded image client-side so localStorage stays fast and reliable.
   * Drop-in replacement point for Firebase Storage `uploadBytes` + `getDownloadURL`.
   */
  processPhotoFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        reject(new Error('Please select a valid image file (JPG, PNG, or WebP).'));
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        reject(new Error('Image file must be smaller than 10 MB.'));
        return;
      }

      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Unable to read the selected image file.'));
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const img = new Image();
        img.onerror = () => resolve(dataUrl);
        img.onload = () => {
          const maxDim = 900;
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            const scale = maxDim / Math.max(width, height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(dataUrl);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.78));
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });
  }
}

export const complaintRepository: IComplaintRepository = new LocalStorageComplaintRepository();
export const authService: IAuthService = new DemoAuthService();
export const storageService: IStorageService = new LocalImageStorageService();

export interface CreateComplaintInput {
  category: ComplaintCategory;
  description: string;
  location: string;
  wardId: string;
  beforePhotoUrl?: string;
  priority?: ComplaintPriority;
}

export function buildNewComplaint(
  input: CreateComplaintInput,
  citizen: DemoUser,
  existing: Complaint[]
): Complaint {
  const ward = NAGPUR_WARDS.find((w) => w.id === input.wardId) ?? NAGPUR_WARDS[0];
  const now = new Date().toISOString();
  const id = complaintRepository.generateUniqueId(existing);

  // Deterministic slight offset within the selected ward polygon so markers never overlap exactly
  const sameWardCount = existing.filter((c) => c.wardId === ward.id).length;
  const angle = (sameWardCount * 1.9) % (Math.PI * 2);
  const radius = Math.min(8, 2.5 + sameWardCount * 1.4);
  const x = Math.max(12, Math.min(90, Math.round(ward.mapCenter.x + Math.cos(angle) * radius)));
  const y = Math.max(12, Math.min(90, Math.round(ward.mapCenter.y + Math.sin(angle) * radius)));

  const latBase = 21.12 + ((100 - y) / 100) * 0.075;
  const lngBase = 79.09 + (x / 100) * 0.068;

  return {
    id,
    category: input.category,
    description: input.description.trim(),
    location: input.location.trim(),
    wardId: ward.id,
    wardName: `${ward.code} — ${ward.name}`,
    coordinates: {
      x,
      y,
      approxLat: `${latBase.toFixed(4)}° N`,
      approxLng: `${lngBase.toFixed(4)}° E`,
    },
    status: 'Submitted',
    priority: input.priority ?? 'Medium',
    citizenId: citizen.id,
    citizenName: citizen.name,
    citizenEmail: citizen.email,
    beforePhotoUrl: input.beforePhotoUrl,
    createdAt: now,
    updatedAt: now,
    timeline: [
      {
        id: `tl-${Date.now()}`,
        status: 'Submitted',
        timestamp: now,
        actorName: citizen.name,
        actorRole: 'citizen',
        summary: input.beforePhotoUrl
          ? 'Complaint submitted with photographic evidence.'
          : 'Complaint submitted via Citizen Portal.',
      },
    ],
    internalNotes: [],
    isDemoData: false,
  };
}

export function exportComplaintsToCsv(complaints: Complaint[]): void {
  const headers = [
    'Complaint ID',
    'Category',
    'Ward',
    'Location',
    'Status',
    'Priority',
    'Citizen',
    'Assigned Worker',
    'Created At',
    'Updated At',
  ];
  const escape = (val: string) => `"${(val ?? '').replace(/"/g, '""')}"`;
  const rows = complaints.map((c) => [
    c.id,
    c.category,
    c.wardName,
    c.location,
    c.status,
    c.priority,
    c.citizenName,
    c.assignedWorkerName ?? 'Unassigned',
    new Date(c.createdAt).toLocaleString(),
    new Date(c.updatedAt).toLocaleString(),
  ]);
  const csvContent = [headers, ...rows].map((r) => r.map(escape).join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `swachh360-complaints-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function getStatusOrder(status: ComplaintStatus): number {
  const order: Record<ComplaintStatus, number> = {
    Submitted: 0,
    Assigned: 1,
    'In Progress': 2,
    Completed: 3,
    Resolved: 4,
  };
  return order[status];
}
