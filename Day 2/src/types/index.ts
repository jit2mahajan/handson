export type UserRole = 'admin' | 'qa-manager' | 'qa-analyst' | 'reviewer';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department: string;
}

export interface QARecord {
  id: string;
  title: string;
  type: 'test-result' | 'deviation' | 'documentation' | 'audit';
  status: 'draft' | 'pending-review' | 'approved' | 'rejected';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  signedBy?: string;
  signedAt?: Date;
  attachments: string[];
  alcoa: {
    attributable: boolean;
    legible: boolean;
    contemporaneous: boolean;
    original: boolean;
    accurate: boolean;
    auditable: boolean;
  };
}

export interface AuditTrail {
  id: string;
  recordId: string;
  action: string;
  changedBy: string;
  changedAt: Date;
  previousValue?: any;
  newValue?: any;
  details: string;
}

export interface DigitalSignature {
  id: string;
  recordId: string;
  signedBy: string;
  signedAt: Date;
  signature: string;
  reason: string;
}

export interface Report {
  id: string;
  title: string;
  generatedAt: Date;
  generatedBy: string;
  recordIds: string[];
  format: 'pdf' | 'csv' | 'json';
}
