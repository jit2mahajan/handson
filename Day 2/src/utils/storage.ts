import { User, QARecord, AuditTrail } from '../types';

const STORAGE_KEYS = {
  USER: 'alcoa_current_user',
  RECORDS: 'alcoa_records',
  AUDIT: 'alcoa_audit_trail',
  USERS: 'alcoa_users',
};

const mockUsers: User[] = [
  {
    id: '1',
    email: 'john.smith@lilly.com',
    name: 'John Smith',
    role: 'qa-manager',
    department: 'Quality Assurance',
  },
  {
    id: '2',
    email: 'sarah.jones@lilly.com',
    name: 'Sarah Jones',
    role: 'qa-analyst',
    department: 'Quality Assurance',
  },
  {
    id: '3',
    email: 'mike.wilson@lilly.com',
    name: 'Mike Wilson',
    role: 'reviewer',
    department: 'Quality Assurance',
  },
  {
    id: '4',
    email: 'admin@lilly.com',
    name: 'Admin User',
    role: 'admin',
    department: 'System Administration',
  },
];

export function initializeStorage() {
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(mockUsers));
  }

  if (!localStorage.getItem(STORAGE_KEYS.RECORDS)) {
    const mockRecords: QARecord[] = [
      {
        id: '1',
        title: 'Test Execution - Batch XYZ-001',
        type: 'test-result',
        status: 'approved',
        createdBy: '2',
        createdAt: new Date('2026-09-01'),
        updatedAt: new Date('2026-09-03'),
        description: 'Pharmaceutical batch testing and validation',
        category: 'Batch Testing',
        priority: 'high',
        signedBy: '1',
        signedAt: new Date('2026-09-03'),
        attachments: ['test-report-001.pdf', 'lab-data.xlsx'],
        alcoa: {
          attributable: true,
          legible: true,
          contemporaneous: true,
          original: true,
          accurate: true,
          auditable: true,
        },
      },
      {
        id: '2',
        title: 'Deviation Report - Equipment Calibration',
        type: 'deviation',
        status: 'pending-review',
        createdBy: '2',
        createdAt: new Date('2026-09-04'),
        updatedAt: new Date('2026-09-04'),
        description: 'pH meter out of calibration tolerance detected',
        category: 'Equipment',
        priority: 'critical',
        attachments: ['deviation-form.pdf'],
        alcoa: {
          attributable: true,
          legible: true,
          contemporaneous: true,
          original: true,
          accurate: true,
          auditable: true,
        },
      },
    ];
    localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(mockRecords));
  }

  if (!localStorage.getItem(STORAGE_KEYS.AUDIT)) {
    localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify([]));
  }
}

export function getCurrentUser(): User | null {
  const user = localStorage.getItem(STORAGE_KEYS.USER);
  return user ? JSON.parse(user) : null;
}

export function setCurrentUser(user: User | null) {
  if (user) {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEYS.USER);
  }
}

export function getUsers(): User[] {
  const users = localStorage.getItem(STORAGE_KEYS.USERS);
  return users ? JSON.parse(users) : mockUsers;
}

export function getRecords(): QARecord[] {
  const records = localStorage.getItem(STORAGE_KEYS.RECORDS);
  if (!records) return [];
  return JSON.parse(records).map((r: any) => ({
    ...r,
    createdAt: new Date(r.createdAt),
    updatedAt: new Date(r.updatedAt),
    signedAt: r.signedAt ? new Date(r.signedAt) : undefined,
  }));
}

export function saveRecord(record: QARecord) {
  const records = getRecords();
  const index = records.findIndex(r => r.id === record.id);
  if (index >= 0) {
    records[index] = record;
  } else {
    records.push(record);
  }
  localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
  addAuditTrail(record.id, 'Record saved', JSON.stringify(record));
}

export function deleteRecord(recordId: string) {
  const records = getRecords();
  const filtered = records.filter(r => r.id !== recordId);
  localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(filtered));
  addAuditTrail(recordId, 'Record deleted', '');
}

export function getAuditTrail(): AuditTrail[] {
  const audit = localStorage.getItem(STORAGE_KEYS.AUDIT);
  if (!audit) return [];
  return JSON.parse(audit).map((a: any) => ({
    ...a,
    changedAt: new Date(a.changedAt),
  }));
}

export function addAuditTrail(recordId: string, action: string, details: string) {
  const audit = getAuditTrail();
  const currentUser = getCurrentUser();
  const trail: AuditTrail = {
    id: Date.now().toString(),
    recordId,
    action,
    changedBy: currentUser?.name || 'Unknown',
    changedAt: new Date(),
    details,
  };
  audit.push(trail);
  localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify(audit));
}
