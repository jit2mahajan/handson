/**
 * useAuditTrail Hook - React hook for audit trail operations
 * Provides async/await audit operations with error handling and cleanup
 */
import { useState, useCallback, useEffect } from 'react';
import * as auditService from '../services/auditService';
export function useAuditTrail() {
    const [entries, setEntries] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    // Fetch audit trail
    const fetchAuditTrail = useCallback(async (filters) => {
        try {
            setLoading(true);
            setError(null);
            const data = await auditService.fetchAuditTrail(filters);
            setEntries(data);
        }
        catch (err) {
            setError(err.message || 'Failed to fetch audit trail');
            console.error('useAuditTrail.fetchAuditTrail error:', err);
        }
        finally {
            setLoading(false);
        }
    }, []);
    // Fetch record audit
    const fetchRecordAudit = useCallback(async (recordId) => {
        try {
            setError(null);
            const data = await auditService.fetchRecordAudit(recordId);
            setEntries(data);
            return data;
        }
        catch (err) {
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
        }
        catch (err) {
            setError(err.message || 'Failed to fetch audit stats');
        }
    }, []);
    // Export audit trail
    const exportAuditTrail = useCallback(async (format) => {
        try {
            setError(null);
            return await auditService.exportAuditTrail(format);
        }
        catch (err) {
            setError(err.message || 'Failed to export audit trail');
            throw err;
        }
    }, []);
    // Verify integrity
    const verifyIntegrity = useCallback(async () => {
        try {
            setError(null);
            return await auditService.verifyAuditTrailIntegrity();
        }
        catch (err) {
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
