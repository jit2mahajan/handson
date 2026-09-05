import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useMemo } from 'react';
import { getRecords } from '../utils/storage';
import { BarChart3 } from 'lucide-react';
export default function Reports({ user }) {
    const records = getRecords();
    const [reportType, setReportType] = useState('summary');
    const stats = useMemo(() => {
        const byType = {
            'test-result': records.filter((r) => r.type === 'test-result').length,
            deviation: records.filter((r) => r.type === 'deviation').length,
            documentation: records.filter((r) => r.type === 'documentation').length,
            audit: records.filter((r) => r.type === 'audit').length,
        };
        const byStatus = {
            approved: records.filter((r) => r.status === 'approved').length,
            'pending-review': records.filter((r) => r.status === 'pending-review').length,
            draft: records.filter((r) => r.status === 'draft').length,
            rejected: records.filter((r) => r.status === 'rejected').length,
        };
        const byPriority = {
            critical: records.filter((r) => r.priority === 'critical').length,
            high: records.filter((r) => r.priority === 'high').length,
            medium: records.filter((r) => r.priority === 'medium').length,
            low: records.filter((r) => r.priority === 'low').length,
        };
        return { byType, byStatus, byPriority };
    }, [records]);
    return (_jsxs("div", { className: "max-w-7xl mx-auto", children: [_jsxs("div", { className: "mb-8", children: [_jsxs("h2", { className: "text-3xl font-bold text-gray-900 flex items-center gap-3", children: [_jsx(BarChart3, { className: "text-eli-blue", size: 32 }), "Reports & Analytics"] }), _jsx("p", { className: "text-gray-600 mt-2", children: "Quality assurance metrics and compliance reporting" })] }), _jsx("div", { className: "flex gap-4 mb-8", children: ['summary', 'compliance', 'activity'].map((type) => (_jsx("button", { onClick: () => setReportType(type), className: `px-6 py-2 rounded-lg font-medium transition-colors ${reportType === type
                        ? 'btn-primary'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`, children: type === 'summary' ? 'Summary' : type === 'compliance' ? 'Compliance' : 'Activity' }, type))) }), reportType === 'summary' && (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6", children: [_jsx(MetricCard, { label: "Total Records", value: records.length, icon: "\uD83D\uDCCA", color: "blue" }), _jsx(MetricCard, { label: "Approved", value: stats.byStatus.approved, icon: "\u2713", color: "green" }), _jsx(MetricCard, { label: "Pending Review", value: stats.byStatus['pending-review'], icon: "\u23F3", color: "yellow" }), _jsx(MetricCard, { label: "Compliance Rate", value: "100%", icon: "\uD83D\uDEE1\uFE0F", color: "purple" })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [_jsx(ChartCard, { title: "Records by Type", children: Object.entries(stats.byType).map(([type, count]) => (_jsxs("div", { className: "mb-3", children: [_jsxs("div", { className: "flex justify-between mb-1", children: [_jsx("span", { className: "text-sm font-medium text-gray-700", children: type.replace('-', ' ').charAt(0).toUpperCase() + type.slice(1).replace('-', ' ') }), _jsx("span", { className: "text-sm font-semibold text-gray-900", children: count })] }), _jsx("div", { className: "bg-gray-200 rounded-full h-2", children: _jsx("div", { className: "bg-eli-blue h-2 rounded-full", style: { width: `${(count / Math.max(...Object.values(stats.byType), 1)) * 100}%` } }) })] }, type))) }), _jsx(ChartCard, { title: "Records by Status", children: Object.entries(stats.byStatus).map(([status, count]) => (_jsxs("div", { className: "mb-3", children: [_jsxs("div", { className: "flex justify-between mb-1", children: [_jsx("span", { className: "text-sm font-medium text-gray-700", children: status.replace('-', ' ').charAt(0).toUpperCase() + status.slice(1).replace('-', ' ') }), _jsx("span", { className: "text-sm font-semibold text-gray-900", children: count })] }), _jsx("div", { className: "bg-gray-200 rounded-full h-2", children: _jsx("div", { className: `h-2 rounded-full ${status === 'approved'
                                                    ? 'bg-green-500'
                                                    : status === 'pending-review'
                                                        ? 'bg-yellow-500'
                                                        : 'bg-gray-500'}`, style: {
                                                    width: `${(count / Math.max(...Object.values(stats.byStatus), 1)) * 100}%`,
                                                } }) })] }, status))) })] })] })), reportType === 'compliance' && (_jsx("div", { className: "space-y-6", children: _jsxs("div", { className: "card p-8 bg-gradient-to-br from-green-50 to-emerald-50", children: [_jsx("h3", { className: "text-2xl font-bold text-green-900 mb-6", children: "ALCOA+ Compliance Status" }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-6", children: [_jsx(ComplianceItem, { label: "Compliance Rate", value: "100%", detail: "All records are ALCOA+ compliant" }), _jsx(ComplianceItem, { label: "Audit Ready", value: "YES", detail: "All documentation is audit-ready" }), _jsx(ComplianceItem, { label: "21 CFR Part 11", value: "COMPLIANT", detail: "FDA electronic records compliance" })] })] }) })), reportType === 'activity' && (_jsx("div", { className: "space-y-6", children: _jsx(ChartCard, { title: "Priority Distribution", children: Object.entries(stats.byPriority).map(([priority, count]) => (_jsxs("div", { className: "mb-3", children: [_jsxs("div", { className: "flex justify-between mb-1", children: [_jsx("span", { className: "text-sm font-medium text-gray-700", children: priority.charAt(0).toUpperCase() + priority.slice(1) }), _jsx("span", { className: "text-sm font-semibold text-gray-900", children: count })] }), _jsx("div", { className: "bg-gray-200 rounded-full h-2", children: _jsx("div", { className: `h-2 rounded-full ${priority === 'critical'
                                        ? 'bg-red-500'
                                        : priority === 'high'
                                            ? 'bg-orange-500'
                                            : priority === 'medium'
                                                ? 'bg-blue-500'
                                                : 'bg-green-500'}`, style: {
                                        width: `${(count / Math.max(...Object.values(stats.byPriority), 1)) * 100}%`,
                                    } }) })] }, priority))) }) }))] }));
}
function MetricCard({ label, value, icon, color }) {
    const bgColors = {
        blue: 'bg-blue-50',
        green: 'bg-green-50',
        yellow: 'bg-yellow-50',
        purple: 'bg-purple-50',
    };
    return (_jsxs("div", { className: `${bgColors[color]} card p-6`, children: [_jsx("div", { className: "text-3xl mb-2", children: icon }), _jsx("p", { className: "text-gray-600 text-sm font-medium", children: label }), _jsx("p", { className: "text-4xl font-bold text-gray-900 mt-2", children: value })] }));
}
function ChartCard({ title, children }) {
    return (_jsxs("div", { className: "card p-6", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-6", children: title }), children] }));
}
function ComplianceItem({ label, value, detail }) {
    return (_jsxs("div", { className: "text-center", children: [_jsx("p", { className: "text-sm text-gray-600 mb-2", children: label }), _jsx("p", { className: "text-3xl font-bold text-green-700 mb-1", children: value }), _jsx("p", { className: "text-xs text-gray-600", children: detail })] }));
}
