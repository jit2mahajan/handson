/**
 * useValidation Hook - React hook for ALCOA+ compliance validation
 * Provides async/await validation operations with error handling and cleanup
 */
import { useState, useCallback, useEffect } from 'react';
import * as validationService from '../services/validationService';
export function useValidation() {
    const [validationResult, setValidationResult] = useState(null);
    const [alcoapResult, setAlcoapResult] = useState(null);
    const [approvalEligibility, setApprovalEligibility] = useState(null);
    const [batchResult, setBatchResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    // Validate record
    const validateRecord = useCallback(async (record) => {
        try {
            setLoading(true);
            setError(null);
            const result = await validationService.validateRecord(record);
            setValidationResult(result);
        }
        catch (err) {
            setError(err.message || 'Record validation failed');
            console.error('useValidation.validateRecord error:', err);
        }
        finally {
            setLoading(false);
        }
    }, []);
    // Validate ALCOA+ compliance
    const validateALCOACompliance = useCallback(async (record) => {
        try {
            setLoading(true);
            setError(null);
            const result = await validationService.validateALCOACompliance(record);
            setAlcoapResult(result);
        }
        catch (err) {
            setError(err.message || 'ALCOA+ validation failed');
            console.error('useValidation.validateALCOACompliance error:', err);
        }
        finally {
            setLoading(false);
        }
    }, []);
    // Check approval eligibility
    const checkApprovalEligibility = useCallback(async (record) => {
        try {
            setLoading(true);
            setError(null);
            const result = await validationService.checkApprovalEligibility(record);
            setApprovalEligibility(result);
        }
        catch (err) {
            setError(err.message || 'Approval eligibility check failed');
            console.error('useValidation.checkApprovalEligibility error:', err);
        }
        finally {
            setLoading(false);
        }
    }, []);
    // Validate batch
    const validateBatch = useCallback(async (records) => {
        try {
            setLoading(true);
            setError(null);
            const result = await validationService.validateBatch(records);
            setBatchResult(result);
        }
        catch (err) {
            setError(err.message || 'Batch validation failed');
            console.error('useValidation.validateBatch error:', err);
        }
        finally {
            setLoading(false);
        }
    }, []);
    // Clear error
    const clearError = useCallback(() => {
        setError(null);
    }, []);
    // Cleanup on unmount
    useEffect(() => {
        return () => {
            validationService.cleanupValidationService();
        };
    }, []);
    return {
        validationResult,
        alcoapResult,
        approvalEligibility,
        batchResult,
        loading,
        error,
        validateRecord,
        validateALCOACompliance,
        checkApprovalEligibility,
        validateBatch,
        clearError,
    };
}
export default useValidation;
