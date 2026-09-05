/**
 * useReports Hook - React hook for report generation
 * Provides async/await report operations with error handling and cleanup
 */
import { useState, useCallback, useEffect } from 'react';
import * as reportsService from '../services/reportsService';
export function useReports() {
    const [complianceReport, setComplianceReport] = useState(null);
    const [activityReport, setActivityReport] = useState(null);
    const [dashboardMetrics, setDashboardMetrics] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    // Generate compliance report
    const generateComplianceReport = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const report = await reportsService.generateComplianceReport();
            setComplianceReport(report);
        }
        catch (err) {
            setError(err.message || 'Failed to generate compliance report');
            console.error('useReports.generateComplianceReport error:', err);
        }
        finally {
            setLoading(false);
        }
    }, []);
    // Generate activity report
    const generateActivityReport = useCallback(async (startDate, endDate) => {
        try {
            setLoading(true);
            setError(null);
            const report = await reportsService.generateActivityReport(startDate, endDate);
            setActivityReport(report);
        }
        catch (err) {
            setError(err.message || 'Failed to generate activity report');
            console.error('useReports.generateActivityReport error:', err);
        }
        finally {
            setLoading(false);
        }
    }, []);
    // Get dashboard metrics
    const getDashboardMetrics = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const metrics = await reportsService.getDashboardMetrics();
            setDashboardMetrics(metrics);
        }
        catch (err) {
            setError(err.message || 'Failed to get dashboard metrics');
            console.error('useReports.getDashboardMetrics error:', err);
        }
        finally {
            setLoading(false);
        }
    }, []);
    // Export report as CSV
    const exportReportCSV = useCallback(async (type) => {
        try {
            setError(null);
            return await reportsService.exportReportCSV(type);
        }
        catch (err) {
            setError(err.message || 'Failed to export report');
            throw err;
        }
    }, []);
    // Generate PDF report
    const generatePDFReport = useCallback(async (type) => {
        try {
            setError(null);
            return await reportsService.generatePDFReport(type);
        }
        catch (err) {
            setError(err.message || 'Failed to generate PDF report');
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
            reportsService.cleanupReportsService();
        };
    }, []);
    return {
        complianceReport,
        activityReport,
        dashboardMetrics,
        loading,
        error,
        generateComplianceReport,
        generateActivityReport,
        getDashboardMetrics,
        exportReportCSV,
        generatePDFReport,
        clearError,
    };
}
export default useReports;
