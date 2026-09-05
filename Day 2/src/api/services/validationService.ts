/**
 * Validation Service - Async/Await API handlers
 * Handles ALCOA+ compliance validation and record validation
 */

import { QARecord } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface ALCOAValidation {
  attributable: { valid: boolean; message: string };
  legible: { valid: boolean; message: string };
  contemporaneous: { valid: boolean; message: string };
  original: { valid: boolean; message: string };
  accurate: { valid: boolean; message: string };
  auditable: { valid: boolean; message: string };
  overallCompliance: boolean;
}

/**
 * Validate QA record
 * @param record - Record to validate
 * @returns Promise with validation result
 */
export async function validateRecord(record: QARecord): Promise<ValidationResult> {
  try {
    if (import.meta.env.VITE_MOCK_DATA === 'true') {
      await new Promise(resolve => setTimeout(resolve, 200));

      const errors: string[] = [];
      const warnings: string[] = [];

      // Required fields
      if (!record.title?.trim()) errors.push('Title is required');
      if (!record.description?.trim()) errors.push('Description is required');
      if (!record.type) errors.push('Record type is required');
      if (!record.status) errors.push('Status is required');

      // Field length validation
      if (record.title?.length > 255) errors.push('Title exceeds max length (255)');
      if (record.description?.length > 5000) errors.push('Description exceeds max length (5000)');

      // ALCOA+ validation
      if (record.status === 'approved' && !record.alcoa.attributable) {
        errors.push('Attributable flag must be true for approved records');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    }

    const response = await fetch(`${API_BASE_URL}/validate/record`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify(record),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    handleServiceError(error, 'Record validation failed');
  }
}

/**
 * Validate ALCOA+ compliance
 * @param record - Record to check
 * @returns Promise with ALCOA+ validation result
 */
export async function validateALCOACompliance(record: QARecord): Promise<ALCOAValidation> {
  try {
    if (import.meta.env.VITE_MOCK_DATA === 'true') {
      await new Promise(resolve => setTimeout(resolve, 300));

      const now = new Date();
      const recordAge = now.getTime() - record.createdAt.getTime();
      const isRecent = recordAge < 86400000; // 24 hours

      return {
        attributable: {
          valid: !!record.createdBy && !!record.createdAt,
          message: record.createdBy ? 'User attributed' : 'Missing user attribution',
        },
        legible: {
          valid: !!record.title && !!record.description,
          message: record.title && record.description ? 'Record is readable' : 'Missing readable content',
        },
        contemporaneous: {
          valid: isRecent,
          message: isRecent ? 'Record created at event time' : 'Record created too long ago',
        },
        original: {
          valid: !record.signedBy || !!record.signedAt,
          message: 'Record preserved in original form',
        },
        accurate: {
          valid: !!record.description && record.description.length > 10,
          message: record.description && record.description.length > 10
            ? 'Data appears accurate'
            : 'Insufficient data detail',
        },
        auditable: {
          valid: true,
          message: 'Audit trail available',
        },
        overallCompliance:
          !!record.createdBy &&
          !!record.createdAt &&
          !!record.title &&
          !!record.description &&
          isRecent,
      };
    }

    const response = await fetch(`${API_BASE_URL}/validate/alcoa`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify(record),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    handleServiceError(error, 'ALCOA+ validation failed');
  }
}

/**
 * Check if record can be approved
 * @param record - Record to check
 * @returns Promise with approval check result
 */
export async function checkApprovalEligibility(
  record: QARecord,
): Promise<{
  eligible: boolean;
  reasons: string[];
  recommendations: string[];
}> {
  try {
    if (import.meta.env.VITE_MOCK_DATA === 'true') {
      await new Promise(resolve => setTimeout(resolve, 200));

      const reasons: string[] = [];
      const recommendations: string[] = [];

      // Check all ALCOA+ flags
      if (!record.alcoa.attributable) reasons.push('Not attributable');
      if (!record.alcoa.legible) reasons.push('Not legible');
      if (!record.alcoa.contemporaneous) reasons.push('Not contemporaneous');
      if (!record.alcoa.original) reasons.push('Original not preserved');
      if (!record.alcoa.accurate) reasons.push('Data not accurate');
      if (!record.alcoa.auditable) reasons.push('Not auditable');

      // Check record status
      if (record.status === 'approved') recommendations.push('Record already approved');
      if (record.status === 'rejected') recommendations.push('Record is rejected');

      const eligible = reasons.length === 0 && record.status === 'pending-review';

      return {
        eligible,
        reasons,
        recommendations,
      };
    }

    const response = await fetch(`${API_BASE_URL}/validate/approval-eligibility`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify(record),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    handleServiceError(error, 'Approval eligibility check failed');
  }
}

/**
 * Validate batch of records
 * @param records - Records to validate
 * @returns Promise with batch validation result
 */
export async function validateBatch(records: QARecord[]): Promise<{
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  issues: Array<{ recordId: string; errors: string[] }>;
}> {
  try {
    if (import.meta.env.VITE_MOCK_DATA === 'true') {
      await new Promise(resolve => setTimeout(resolve, 500));

      const issues: Array<{ recordId: string; errors: string[] }> = [];
      let validCount = 0;

      records.forEach(record => {
        const errors: string[] = [];
        if (!record.title?.trim()) errors.push('Missing title');
        if (!record.description?.trim()) errors.push('Missing description');

        if (errors.length === 0) {
          validCount++;
        } else {
          issues.push({ recordId: record.id, errors });
        }
      });

      return {
        totalRecords: records.length,
        validRecords: validCount,
        invalidRecords: records.length - validCount,
        issues,
      };
    }

    const response = await fetch(`${API_BASE_URL}/validate/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify(records),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    handleServiceError(error, 'Batch validation failed');
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getAuthToken(): string {
  return localStorage.getItem('alcoa_auth_token') || '';
}

function handleServiceError(error: any, defaultMessage: string): never {
  console.error(defaultMessage, error);
  throw new Error(error.message || defaultMessage);
}

// ============================================================================
// SERVICE CLEANUP
// ============================================================================

export function cleanupValidationService(): void {
  console.log('Validation service cleanup completed');
}

export default {
  validateRecord,
  validateALCOACompliance,
  checkApprovalEligibility,
  validateBatch,
  cleanupValidationService,
};
