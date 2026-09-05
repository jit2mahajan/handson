/**
 * useAuditTrail Hook - React hook for audit trail operations
 * Provides async/await audit operations with error handling and cleanup
 */

import { useState, useCallback, useEffect } from 'react';
import { AuditTrail } from '@/types';
import * as auditService from '../services/auditService';

interface UseAuditTrailState {
  entries: AuditTrail[];
  stats: any;
  loading: boolean;
  error: string | null;
}

interface UseAuditTrailActions {
  fetchAuditTrail: (filters?: any) => Promise<void>;
  fetchRecordAudit: (recordId: string) => Promise<AuditTrail[]>;
  fetchAuditStats: () => Promise<void>;
  exportAuditTrail: (format: 'csv' | 'json') => Promise<Blob>;
  verifyIntegrity: () => Promise<any>;
  clearError: () => void;
}

export function useAuditTrail(): UseAuditTrailState & UseAuditTrailActions {
  const [entries, setEntries] = useState<AuditTrail[]>([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch audit trail
  const fetchAuditTrail = useCallback(async (filters?: any) => {
    try {
      setLoading(true);
      setError(null);
      const data = await auditService.fetchAuditTrail(filters);
      setEntries(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch audit trail');
      console.error('useAuditTrail.fetchAuditTrail error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch record audit
  const fetchRecordAudit = useCallback(async (recordId: string): Promise<AuditTrail[]> => {
    try {
      setError(null);
      const data = await auditService.fetchRecordAudit(recordId);
      setEntries(data);
      return data;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch record audit');
      return [];
    }
  }, []);

  // Fetch audit stats
  const fetchAuditStats = useCallback(async () => {
    try {
      setError(null);
      const data = await auditService.fetchAuditStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch audit stats');
    }
  }, []);

  // Export audit trail
  const exportAuditTrail = useCallback(async (format: 'csv' | 'json'): Promise<Blob> => {
    try {
      setError(null);
      return await auditService.exportAuditTrail(format);
    } catch (err: any) {
      setError(err.message || 'Failed to export audit trail');
      throw err;
    }
  }, []);

  // Verify integrity
  const verifyIntegrity = useCallback(async () => {
    try {
      setError(null);
      return await auditService.verifyAuditTrailIntegrity();
    } catch (err: any) {
      setError(err.message || 'Failed to verify audit trail');
      throw err;
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      auditService.cleanupAuditService();
    };
  }, []);

  return {
    entries,
    stats,
    loading,
    error,
    fetchAuditTrail,
    fetchRecordAudit,
    fetchAuditStats,
    exportAuditTrail,
    verifyIntegrity,
    clearError,
  };
}

export default useAuditTrail;
