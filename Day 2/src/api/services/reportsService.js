/**
 * Reports Service - Async/Await API handlers
 * Handles report generation and analytics
 */
import { getRecords } from '@/utils/storage';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
/**
 * Generate compliance report
 * @returns Promise with compliance statistics
 */
export async function generateComplianceReport() {
    try {
        if (import.meta.env.VITE_MOCK_DATA === 'true') {
            await new Promise(resolve => setTimeout(resolve, 500));
            const records = getRecords();
            const byStatus = {};
            const byType = {};
            const byPriority = {};
            records.forEach(record => {
                byStatus[record.status] = (byStatus[record.status] || 0) + 1;
                byType[record.type] = (byType[record.type] || 0) + 1;
                byPriority[record.priority] = (byPriority[record.priority] || 0) + 1;
            });
            const alcoapCompliant = records.filter(r => r.alcoa.attributable).length;
            const complianceRate = records.length > 0 ? (alcoapCompliant / records.length) * 100 : 100;
            return {
                totalRecords: records.length,
                byStatus,
                byType,
                byPriority,
                complianceRate,
                alcoapCompliant,
            };
        }
        const response = await fetch(`${API_BASE_URL}/reports/compliance`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${getAuthToken()}` },
        });
        if (!response.ok)
            throw new Error(`HTTP ${response.status}`);
        return await response.json();
    }
    catch (error) {
        handleServiceError(error, 'Failed to generate compliance report');
    }
}
/**
 * Generate activity report
 * @param startDate - Report start date
 * @param endDate - Report end date
 * @returns Promise with activity data
 */
export async function generateActivityReport(startDate, endDate) {
    try {
        if (import.meta.env.VITE_MOCK_DATA === 'true') {
            await new Promise(resolve => setTimeout(resolve, 500));
            const records = getRecords();
            const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const end = endDate || new Date();
            const filtered = records.filter(r => r.createdAt >= start && r.createdAt <= end);
            return {
                period: {
                    start: start.toISOString(),
                    end: end.toISOString(),
                },
                recordsCreated: filtered.length,
                recordsUpdated: filtered.length / 2,
                recordsApproved: filtered.filter(r => r.status === 'approved').length,
                recordsRejected: filtered.filter(r => r.status === 'rejected').length,
                avgTimeToApprove: 24,
            };
        }
        const params = new URLSearchParams();
        if (startDate)
            params.append('startDate', startDate.toISOString());
        if (endDate)
            params.append('endDate', endDate.toISOString());
        const response = await fetch(`${API_BASE_URL}/reports/activity?${params}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${getAuthToken()}` },
        });
        if (!response.ok)
            throw new Error(`HTTP ${response.status}`);
        return await response.json();
    }
    catch (error) {
        handleServiceError(error, 'Failed to generate activity report');
    }
}
/**
 * Export report as CSV
 * @param reportType - Type of report to export
 * @returns Promise with CSV blob
 */
export async function exportReportCSV(reportType = 'compliance') {
    try {
        if (import.meta.env.VITE_MOCK_DATA === 'true') {
            await new Promise(resolve => setTimeout(resolve, 500));
            const records = getRecords();
            if (reportType === 'compliance') {
                const headers = ['Record ID', 'Title', 'Status', 'Type', 'Priority', 'Created Date'];
                const rows = records.map(r => [
                    r.id,
                    r.title,
                    r.status,
                    r.type,
                    r.priority,
                    r.createdAt.toISOString(),
                ]);
                const csv = [headers, ...rows]
                    .map(row => row.map(cell => `"${cell}"`).join(','))
                    .join('\n');
                return new Blob([csv], { type: 'text/csv' });
            }
            else {
                const headers = ['Period Start', 'Records Created', 'Approved', 'Rejected', 'Avg Approval Time'];
                const rows = [[
                        new Date().toISOString(),
                        records.length,
                        records.filter(r => r.status === 'approved').length,
                        records.filter(r => r.status === 'rejected').length,
                        '24 hours',
                    ]];
                const csv = [headers, ...rows]
                    .map(row => row.map(cell => `"${cell}"`).join(','))
                    .join('\n');
                return new Blob([csv], { type: 'text/csv' });
            }
        }
        const response = await fetch(`${API_BASE_URL}/reports/export?type=${reportType}&format=csv`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${getAuthToken()}` },
        });
        if (!response.ok)
            throw new Error(`HTTP ${response.status}`);
        return await response.blob();
    }
    catch (error) {
        handleServiceError(error, 'Failed to export report');
    }
}
/**
 * Generate PDF report
 * @param reportType - Type of report to generate
 * @returns Promise with PDF blob
 */
export async function generatePDFReport(reportType) {
    try {
        if (import.meta.env.VITE_MOCK_DATA === 'true') {
            await new Promise(resolve => setTimeout(resolve, 800));
            const records = getRecords();
            const pdfContent = `
        ALCOA+ ${reportType.toUpperCase()} REPORT
        Generated: ${new Date().toISOString()}
        Total Records: ${records.length}
      `;
            return new Blob([pdfContent], { type: 'application/pdf' });
        }
        const response = await fetch(`${API_BASE_URL}/reports/generate?type=${reportType}&format=pdf`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${getAuthToken()}` },
        });
        if (!response.ok)
            throw new Error(`HTTP ${response.status}`);
        return await response.blob();
    }
    catch (error) {
        handleServiceError(error, 'Failed to generate PDF report');
    }
}
/**
 * Get dashboard metrics
 * @returns Promise with dashboard data
 */
export async function getDashboardMetrics() {
    try {
        if (import.meta.env.VITE_MOCK_DATA === 'true') {
            await new Promise(resolve => setTimeout(resolve, 400));
            const records = getRecords();
            return {
                totalRecords: records.length,
                pendingApproval: records.filter(r => r.status === 'pending-review').length,
                criticalItems: records.filter(r => r.priority === 'critical').length,
                complianceRate: 98,
                recentActivity: [
                    { date: new Date().toISOString(), count: 5 },
                    { date: new Date(Date.now() - 86400000).toISOString(), count: 3 },
                    { date: new Date(Date.now() - 172800000).toISOString(), count: 8 },
                ],
            };
        }
        const response = await fetch(`${API_BASE_URL}/reports/dashboard-metrics`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${getAuthToken()}` },
        });
        if (!response.ok)
            throw new Error(`HTTP ${response.status}`);
        return await response.json();
    }
    catch (error) {
        handleServiceError(error, 'Failed to get dashboard metrics');
    }
}
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
function getAuthToken() {
    return localStorage.getItem('alcoa_auth_token') || '';
}
function handleServiceError(error, defaultMessage) {
    console.error(defaultMessage, error);
    throw new Error(error.message || defaultMessage);
}
// ============================================================================
// SERVICE CLEANUP
// ============================================================================
export function cleanupReportsService() {
    console.log('Reports service cleanup completed');
}
export default {
    generateComplianceReport,
    generateActivityReport,
    exportReportCSV,
    generatePDFReport,
    getDashboardMetrics,
    cleanupReportsService,
};
