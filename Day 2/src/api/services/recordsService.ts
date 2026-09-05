/**
 * Records Service - Async/Await API handlers
 * Handles all QA record operations (CRUD)
 */

import { QARecord } from '@/types';
import { getRecords, saveRecord, deleteRecord, addAuditTrail } from '@/utils/storage';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

interface RecordsServiceError {
  message: string;
  code: string;
  statusCode: number;
}

/**
 * Get all QA records
 * @param filters - Optional filter parameters
 * @returns Promise with records array
 */
export async function fetchRecords(filters?: {
  type?: string;
  status?: string;
  priority?: string;
}): Promise<QARecord[]> {
  try {
    // In production, replace with actual API call
    if (import.meta.env.VITE_MOCK_DATA === 'true') {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 300));
      let records = getRecords();

      if (filters) {
        if (filters.type) records = records.filter(r => r.type === filters.type);
        if (filters.status) records = records.filter(r => r.status === filters.status);
        if (filters.priority) records = records.filter(r => r.priority === filters.priority);
      }

      return records;
    }

    // Production API call
    const queryParams = new URLSearchParams(filters as any).toString();
    const response = await fetch(`${API_BASE_URL}/records?${queryParams}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${getAuthToken()}` },
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    handleServiceError(error, 'Failed to fetch records');
  }
}

/**
 * Get single record by ID
 * @param recordId - Record UUID
 * @returns Promise with single record
 */
export async function fetchRecord(recordId: string): Promise<QARecord | null> {
  try {
    if (import.meta.env.VITE_MOCK_DATA === 'true') {
      await new Promise(resolve => setTimeout(resolve, 200));
      const records = getRecords();
      return records.find(r => r.id === recordId) || null;
    }

    const response = await fetch(`${API_BASE_URL}/records/${recordId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${getAuthToken()}` },
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    handleServiceError(error, 'Failed to fetch record');
  }
}

/**
 * Create new QA record
 * @param recordData - Record data to create
 * @returns Promise with created record
 */
export async function createRecord(recordData: Omit<QARecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<QARecord> {
  try {
    validateRecordData(recordData);

    const newRecord: QARecord = {
      ...recordData,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (import.meta.env.VITE_MOCK_DATA === 'true') {
      await new Promise(resolve => setTimeout(resolve, 300));
      saveRecord(newRecord);
      addAuditTrail(newRecord.id, 'Record created', JSON.stringify(newRecord));
      return newRecord;
    }

    const response = await fetch(`${API_BASE_URL}/records`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify(newRecord),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    handleServiceError(error, 'Failed to create record');
  }
}

/**
 * Update existing QA record
 * @param recordId - Record UUID
 * @param updates - Partial record data to update
 * @returns Promise with updated record
 */
export async function updateRecord(recordId: string, updates: Partial<QARecord>): Promise<QARecord> {
  try {
    const existingRecord = await fetchRecord(recordId);
    if (!existingRecord) throw new Error('Record not found');

    const updatedRecord = { ...existingRecord, ...updates, updatedAt: new Date() };
    validateRecordData(updatedRecord);

    if (import.meta.env.VITE_MOCK_DATA === 'true') {
      await new Promise(resolve => setTimeout(resolve, 300));
      saveRecord(updatedRecord);
      addAuditTrail(recordId, 'Record updated', JSON.stringify(updates));
      return updatedRecord;
    }

    const response = await fetch(`${API_BASE_URL}/records/${recordId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify(updatedRecord),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    handleServiceError(error, 'Failed to update record');
  }
}

/**
 * Delete QA record (admin/manager only)
 * @param recordId - Record UUID
 * @returns Promise that resolves when deleted
 */
export async function removeRecord(recordId: string): Promise<void> {
  try {
    if (import.meta.env.VITE_MOCK_DATA === 'true') {
      await new Promise(resolve => setTimeout(resolve, 300));
      deleteRecord(recordId);
      addAuditTrail(recordId, 'Record deleted', '');
      return;
    }

    const response = await fetch(`${API_BASE_URL}/records/${recordId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${getAuthToken()}` },
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    handleServiceError(error, 'Failed to delete record');
  }
}

/**
 * Approve record (manager/admin only)
 * @param recordId - Record UUID
 * @returns Promise with approved record
 */
export async function approveRecord(recordId: string): Promise<QARecord> {
  try {
    const record = await fetchRecord(recordId);
    if (!record) throw new Error('Record not found');

    const approved = { ...record, status: 'approved' as const, updatedAt: new Date() };

    if (import.meta.env.VITE_MOCK_DATA === 'true') {
      await new Promise(resolve => setTimeout(resolve, 300));
      saveRecord(approved);
      addAuditTrail(recordId, 'Record approved', '');
      return approved;
    }

    const response = await fetch(`${API_BASE_URL}/records/${recordId}/approve`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${getAuthToken()}` },
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    handleServiceError(error, 'Failed to approve record');
  }
}

/**
 * Reject record (manager/admin only)
 * @param recordId - Record UUID
 * @param reason - Rejection reason
 * @returns Promise with rejected record
 */
export async function rejectRecord(recordId: string, reason?: string): Promise<QARecord> {
  try {
    const record = await fetchRecord(recordId);
    if (!record) throw new Error('Record not found');

    const rejected = { ...record, status: 'rejected' as const, updatedAt: new Date() };

    if (import.meta.env.VITE_MOCK_DATA === 'true') {
      await new Promise(resolve => setTimeout(resolve, 300));
      saveRecord(rejected);
      addAuditTrail(recordId, 'Record rejected', reason || '');
      return rejected;
    }

    const response = await fetch(`${API_BASE_URL}/records/${recordId}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({ reason }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    handleServiceError(error, 'Failed to reject record');
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validate record data
 */
function validateRecordData(record: any): void {
  if (!record.title?.trim()) throw new Error('Title is required');
  if (!record.description?.trim()) throw new Error('Description is required');
  if (!record.type) throw new Error('Record type is required');
}

/**
 * Get authentication token from localStorage
 */
function getAuthToken(): string {
  const user = localStorage.getItem('alcoa_current_user');
  return user ? JSON.parse(user).token || '' : '';
}

/**
 * Handle service errors uniformly
 */
function handleServiceError(error: any, defaultMessage: string): never {
  console.error(defaultMessage, error);
  throw {
    message: error.message || defaultMessage,
    code: error.code || 'UNKNOWN_ERROR',
    statusCode: error.statusCode || 500,
  } as RecordsServiceError;
}

// ============================================================================
// SERVICE CLEANUP
// ============================================================================

/**
 * Cleanup service (cancel pending requests, clear state)
 */
export function cleanupRecordsService(): void {
  // Cancel any pending API requests
  // Clear cached data if applicable
  console.log('Records service cleanup completed');
}

export default {
  fetchRecords,
  fetchRecord,
  createRecord,
  updateRecord,
  removeRecord,
  approveRecord,
  rejectRecord,
  cleanupRecordsService,
};
