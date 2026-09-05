/**
 * useValidation Hook - React hook for ALCOA+ compliance validation
 * Provides async/await validation operations with error handling and cleanup
 */

import { useState, useCallback, useEffect } from 'react';
import { QARecord } from '@/types';
import * as validationService from '../services/validationService';

interface UseValidationState {
  validationResult: any;
  alcoapResult: any;
  approvalEligibility: any;
  batchResult: any;
  loading: boolean;
  error: string | null;
}

interface UseValidationActions {
  validateRecord: (record: QARecord) => Promise<void>;
  validateALCOACompliance: (record: QARecord) => Promise<void>;
  checkApprovalEligibility: (record: QARecord) => Promise<void>;
  validateBatch: (records: QARecord[]) => Promise<void>;
  clearError: () => void;
}

export function useValidation(): UseValidationState & UseValidationActions {
  const [validationResult, setValidationResult] = useState(null);
  const [alcoapResult, setAlcoapResult] = useState(null);
  const [approvalEligibility, setApprovalEligibility] = useState(null);
  const [batchResult, setBatchResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validate record
  const validateRecord = useCallback(async (record: QARecord) => {
    try {
      setLoading(true);
      setError(null);
      const result = await validationService.validateRecord(record);
      setValidationResult(result);
    } catch (err: any) {
      setError(err.message || 'Record validation failed');
      console.error('useValidation.validateRecord error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Validate ALCOA+ compliance
  const validateALCOACompliance = useCallback(async (record: QARecord) => {
    try {
      setLoading(true);
      setError(null);
      const result = await validationService.validateALCOACompliance(record);
      setAlcoapResult(result);
    } catch (err: any) {
      setError(err.message || 'ALCOA+ validation failed');
      console.error('useValidation.validateALCOACompliance error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Check approval eligibility
  const checkApprovalEligibility = useCallback(async (record: QARecord) => {
    try {
      setLoading(true);
      setError(null);
      const result = await validationService.checkApprovalEligibility(record);
      setApprovalEligibility(result);
    } catch (err: any) {
      setError(err.message || 'Approval eligibility check failed');
      console.error('useValidation.checkApprovalEligibility error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Validate batch
  const validateBatch = useCallback(async (records: QARecord[]) => {
    try {
      setLoading(true);
      setError(null);
      const result = await validationService.validateBatch(records);
      setBatchResult(result);
    } catch (err: any) {
      setError(err.message || 'Batch validation failed');
      console.error('useValidation.validateBatch error:', err);
    } finally {
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
