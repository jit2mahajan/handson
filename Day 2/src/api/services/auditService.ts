/**
 * Audit Trail Service - Async/Await API handlers
 * Handles audit trail operations (immutable, append-only)
 */

import { AuditTrail } from '@/types';
import { getAuditTrail } from '@/utils/storage';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

interface AuditFilter {
  recordId?: string;
  action?: string;
  changedBy?: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Fetch audit trail entries
 * @param filters - Optional filter parameters
 * @returns Promise with audit entries
 */
export async function fetchAuditTrail(filters?: AuditFilter): Promise<AuditTrail[]> {
  try {
    if (import.meta.env.VITE_MOCK_DATA === 'true') {
      await new Promise(resolve => setTimeout(resolve, 300));
      let entries = getAuditTrail();

      if (filters?.recordId) {
        entries = entries.filter(e => e.recordId === filters.recordId);
      }
      if (filters?.action) {
        entries = entries.filter(e => e.action.includes(filters.action!));
      }
      if (filters?.changedBy) {
        entries = entries.filter(e => e.changedBy === filters.changedBy);
      }

      return entries.sort((a, b) => b.changedAt.getTime() - a.changedAt.getTime());
    }

    const queryParams = new URLSearchParams();
    if (filters?.recordId) queryParams.append('recordId', filters.recordId);
    if (filters?.action) queryParams.append('action', filters.action);
    if (filters?.changedBy) queryParams.append('changedBy', filters.changedBy);

    const response = await fetch(`${API_BASE_URL}/audit-trail?${queryParams}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${getAuthToken()}` },
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    handleServiceError(error, 'Failed to fetch audit trail');
  }
}

/**
 * Get audit entries for specific record
 * @param recordId - Record UUID
 * @returns Promise with audit entries for record
 */
export async function fetchRecordAudit(recordId: string): Promise<AuditTrail[]> {
  try {
    if (import.meta.env.VITE_MOCK_DATA === 'true') {
      await new Promise(resolve => setTimeout(resolve, 200));
      const audit = getAuditTrail();
      return audit
        .filter(e => e.recordId === recordId)
        .sort((a, b) => b.changedAt.getTime() - a.changedAt.getTime());
    }

    const response = await fetch(`${API_BASE_URL}/audit-trail?recordId=${recordId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${getAuthToken()}` },
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    handleServiceError(error, 'Failed to fetch record audit');
  }
}

/**
 * Get audit statistics
 * @returns Promise with audit statistics
 */
export async function fetchAuditStats(): Promise<{
  totalEntries: number;
  actionsCount: Record<string, number>;
  usersCount: Record<string, number>;
}> {
  try {
    if (import.meta.env.VITE_MOCK_DATA === 'true') {
      await new Promise(resolve => setTimeout(resolve, 300));
      const entries = getAuditTrail();

      const actionsCount: Record<string, number> = {};
      const usersCount: Record<string, number> = {};

      entries.forEach(entry => {
        actionsCount[entry.action] = (actionsCount[entry.action] || 0) + 1;
        usersCount[entry.changedBy] = (usersCount[entry.changedBy] || 0) + 1;
      });

      return {
        totalEntries: entries.length,
        actionsCount,
        usersCount,
      };
    }

    const response = await fetch(`${API_BASE_URL}/audit-trail/stats`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${getAuthToken()}` },
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    handleServiceError(error, 'Failed to fetch audit stats');
  }
}

/**
 * Export audit trail (CSV/JSON)
 * @param format - Export format ('csv' | 'json')
 * @returns Promise with exported data
 */
export async function exportAuditTrail(format: 'csv' | 'json' = 'json'): Promise<Blob> {
  try {
    if (import.meta.env.VITE_MOCK_DATA === 'true') {
      await new Promise(resolve => setTimeout(resolve, 500));
      const entries = getAuditTrail();

      if (format === 'json') {
        const json = JSON.stringify(entries, null, 2);
        return new Blob([json], { type: 'application/json' });
      } else {
        const headers = ['ID', 'Record ID', 'Action', 'Changed By', 'Changed At', 'Details'];
        const rows = entries.map(e => [
          e.id,
          e.recordId,
          e.action,
          e.changedBy,
          e.changedAt.toISOString(),
          e.details,
        ]);

        const csv = [headers, ...rows]
          .map(row => row.map(cell => `"${cell}"`).join(','))
          .join('\n');

        return new Blob([csv], { type: 'text/csv' });
      }
    }

    const response = await fetch(`${API_BASE_URL}/audit-trail/export?format=${format}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${getAuthToken()}` },
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.blob();
  } catch (error) {
    handleServiceError(error, 'Failed to export audit trail');
  }
}

/**
 * Verify audit trail integrity (check for tampering)
 * @returns Promise with verification result
 */
export async function verifyAuditTrailIntegrity(): Promise<{
  isValid: boolean;
  entriesChecked: number;
  issues: string[];
}> {
  try {
    if (import.meta.env.VITE_MOCK_DATA === 'true') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const entries = getAuditTrail();
      const issues: string[] = [];

      // Check for gaps in timestamps
      for (let i = 1; i < entries.length; i++) {
        if (entries[i].changedAt > entries[i - 1].changedAt) {
          issues.push(`Timestamp ordering violation at entry ${i}`);
        }
      }

      return {
        isValid: issues.length === 0,
        entriesChecked: entries.length,
        issues,
      };
    }

    const response = await fetch(`${API_BASE_URL}/audit-trail/verify`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${getAuthToken()}` },
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    handleServiceError(error, 'Failed to verify audit trail');
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getAuthToken(): string {
  const user = localStorage.getItem('alcoa_current_user');
  return user ? JSON.parse(user).token || '' : '';
}

function handleServiceError(error: any, defaultMessage: string): never {
  console.error(defaultMessage, error);
  throw new Error(error.message || defaultMessage);
}

// ============================================================================
// SERVICE CLEANUP
// ============================================================================

export function cleanupAuditService(): void {
  console.log('Audit service cleanup completed');
}

export default {
  fetchAuditTrail,
  fetchRecordAudit,
  fetchAuditStats,
  exportAuditTrail,
  verifyAuditTrailIntegrity,
  cleanupAuditService,
};
