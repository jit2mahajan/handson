/**
 * ALCOA+ API Layer
 * Centralized exports for all services and hooks
 */
// Services
export * as recordsService from './services/recordsService';
export * as auditService from './services/auditService';
export * as authService from './services/authService';
export * as reportsService from './services/reportsService';
export * as validationService from './services/validationService';
// Hooks
export { useRecords } from './hooks/useRecords';
export { useAuditTrail } from './hooks/useAuditTrail';
export { useAuth } from './hooks/useAuth';
export { useReports } from './hooks/useReports';
export { useValidation } from './hooks/useValidation';
// Re-export commonly used functions for convenience
export { 
// Records
fetchRecords, createRecord, updateRecord, approveRecord, 
// Auth
login, logout, getCurrentUser, isAuthenticated, 
// Validation
validateRecord, validateALCOACompliance, } from './services/recordsService';
