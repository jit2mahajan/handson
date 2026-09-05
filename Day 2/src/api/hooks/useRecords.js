/**
 * useRecords Hook - React hook for record management
 * Provides async/await record operations with error handling and cleanup
 */
import { useState, useCallback, useEffect } from 'react';
import * as recordsService from '../services/recordsService';
export function useRecords() {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    // Fetch records
    const fetchRecords = useCallback(async (filters) => {
        try {
            setLoading(true);
            setError(null);
            const data = await recordsService.fetchRecords(filters);
            setRecords(data);
        }
        catch (err) {
            setError(err.message || 'Failed to fetch records');
            console.error('useRecords.fetchRecords error:', err);
        }
        finally {
            setLoading(false);
        }
    }, []);
    // Get single record
    const getRecord = useCallback(async (id) => {
        try {
            setError(null);
            return await recordsService.fetchRecord(id);
        }
        catch (err) {
            setError(err.message || 'Failed to fetch record');
            return null;
        }
    }, []);
    // Create record
    const createRecord = useCallback(async (data) => {
        try {
            setError(null);
            const newRecord = await recordsService.createRecord(data);
            setRecords(prev => [...prev, newRecord]);
            return newRecord;
        }
        catch (err) {
            setError(err.message || 'Failed to create record');
            throw err;
        }
    }, []);
    // Update record
    const updateRecord = useCallback(async (id, data) => {
        try {
            setError(null);
            const updated = await recordsService.updateRecord(id, data);
            setRecords(prev => prev.map(r => (r.id === id ? updated : r)));
            return updated;
        }
        catch (err) {
            setError(err.message || 'Failed to update record');
            throw err;
        }
    }, []);
    // Delete record
    const deleteRecord = useCallback(async (id) => {
        try {
            setError(null);
            await recordsService.removeRecord(id);
            setRecords(prev => prev.filter(r => r.id !== id));
        }
        catch (err) {
            setError(err.message || 'Failed to delete record');
            throw err;
        }
    }, []);
    // Approve record
    const approveRecord = useCallback(async (id) => {
        try {
            setError(null);
            const approved = await recordsService.approveRecord(id);
            setRecords(prev => prev.map(r => (r.id === id ? approved : r)));
            return approved;
        }
        catch (err) {
            setError(err.message || 'Failed to approve record');
            throw err;
        }
    }, []);
    // Reject record
    const rejectRecord = useCallback(async (id, reason) => {
        try {
            setError(null);
            const rejected = await recordsService.rejectRecord(id, reason);
            setRecords(prev => prev.map(r => (r.id === id ? rejected : r)));
            return rejected;
        }
        catch (err) {
            setError(err.message || 'Failed to reject record');
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
            recordsService.cleanupRecordsService();
        };
    }, []);
    return {
        records,
        loading,
        error,
        fetchRecords,
        getRecord,
        createRecord,
        updateRecord,
        deleteRecord,
        approveRecord,
        rejectRecord,
        clearError,
    };
}
export default useRecords;
