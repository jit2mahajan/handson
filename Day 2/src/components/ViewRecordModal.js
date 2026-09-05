import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { X, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { getAuditTrail, getUsers } from '../utils/storage';
import { useMemo } from 'react';
export default function ViewRecordModal({ record, onClose }) {
    if (!record)
        return null;
    const auditTrail = useMemo(() => {
        return getAuditTrail().filter((a) => a.recordId === record.id).sort((a, b) => b.changedAt.getTime() - a.changedAt.getTime());
    }, [record.id]);
    const users = useMemo(() => {
        return getUsers();
    }, []);
    const getCreatorName = (userId) => {
        const user = users.find((u) => u.id === userId);
        return user?.name || userId;
    };
    const alcoaFields = [
        { key: 'attributable', label: 'Attributable' },
        { key: 'legible', label: 'Legible' },
        { key: 'contemporaneous', label: 'Contemporaneous' },
        { key: 'original', label: 'Original' },
        { key: 'accurate', label: 'Accurate' },
        { key: 'auditable', label: 'Auditable' },
    ];
    const allCompliant = alcoaFields.every((field) => record.alcoa[field.key]);
    return (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50", children: _jsxs("div", { className: "bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto", children: [_jsxs("div", { className: "sticky top-0 bg-eli-blue text-white p-6 flex items-center justify-between border-b border-blue-700", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Eye, { size: 24 }), _jsx("h2", { className: "text-xl font-bold", children: "Record Details (Read-Only)" })] }), _jsx("button", { onClick: onClose, className: "p-1 hover:bg-blue-700 rounded transition-colors", "aria-label": "Close modal", children: _jsx(X, { size: 24 }) })] }), _jsxs("div", { className: "p-6 space-y-6", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-2xl font-bold text-gray-900 mb-1", children: record.title }), _jsx("p", { className: "text-gray-600", children: record.description })] }), _jsxs("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3", children: [_jsxs("div", { className: "p-3 bg-blue-50 rounded-lg border border-blue-200", children: [_jsx("p", { className: "text-xs text-gray-600 mb-1", children: "Type" }), _jsx("p", { className: "text-sm font-semibold text-gray-900", children: record.type.replace('-', ' ').charAt(0).toUpperCase() + record.type.slice(1).replace('-', ' ') })] }), _jsxs("div", { className: "p-3 bg-purple-50 rounded-lg border border-purple-200", children: [_jsx("p", { className: "text-xs text-gray-600 mb-1", children: "Status" }), _jsx(StatusDisplay, { status: record.status })] }), _jsxs("div", { className: "p-3 bg-orange-50 rounded-lg border border-orange-200", children: [_jsx("p", { className: "text-xs text-gray-600 mb-1", children: "Priority" }), _jsx(PriorityDisplay, { priority: record.priority })] }), _jsxs("div", { className: "p-3 bg-green-50 rounded-lg border border-green-200", children: [_jsx("p", { className: "text-xs text-gray-600 mb-1", children: "Category" }), _jsx("p", { className: "text-sm font-semibold text-gray-900", children: record.category })] })] }), _jsxs("div", { className: "border-t border-gray-200 pt-4", children: [_jsxs("div", { className: "flex items-center gap-2 mb-4", children: [_jsx("div", { className: `w-3 h-3 rounded-full ${allCompliant ? 'bg-green-500' : 'bg-red-500'}` }), _jsx("h3", { className: "text-lg font-bold text-gray-900", children: "ALCOA+ Compliance" }), _jsx("span", { className: `ml-auto text-xs px-3 py-1 rounded-full font-semibold ${allCompliant
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-red-100 text-red-800'}`, children: allCompliant ? '✓ Compliant' : '✗ Non-Compliant' })] }), _jsx("div", { className: "grid grid-cols-2 md:grid-cols-3 gap-3", children: alcoaFields.map((field) => {
                                        const isCompliant = record.alcoa[field.key];
                                        return (_jsxs("div", { className: `p-3 rounded-lg border flex items-center gap-2 ${isCompliant
                                                ? 'bg-green-50 border-green-200'
                                                : 'bg-red-50 border-red-200'}`, children: [_jsx("span", { className: `text-lg font-bold ${isCompliant ? 'text-green-600' : 'text-red-600'}`, children: isCompliant ? '✓' : '✗' }), _jsx("span", { className: "text-sm font-semibold text-gray-900", children: field.label })] }, field.key));
                                    }) })] }), _jsxs("div", { className: "bg-gray-50 rounded-lg p-4 border border-gray-200", children: [_jsx("h4", { className: "text-sm font-bold text-gray-900 mb-3", children: "Record Timeline" }), _jsxs("div", { className: "space-y-2 text-sm", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-gray-600", children: "Created by:" }), _jsxs("span", { className: "font-semibold text-gray-900", children: [getCreatorName(record.createdBy), " @ ", format(new Date(record.createdAt), 'MMM dd, yyyy HH:mm')] })] }), record.signedBy && (_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-gray-600", children: "Signed by:" }), _jsxs("span", { className: "font-semibold text-gray-900", children: [getCreatorName(record.signedBy), " @ ", record.signedAt && format(new Date(record.signedAt), 'MMM dd, yyyy HH:mm')] })] })), record.updatedAt && new Date(record.updatedAt).getTime() !== new Date(record.createdAt).getTime() && (_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-gray-600", children: "Last updated:" }), _jsx("span", { className: "font-semibold text-gray-900", children: format(new Date(record.updatedAt), 'MMM dd, yyyy HH:mm') })] }))] })] }), auditTrail.length > 0 && (_jsxs("div", { className: "bg-blue-50 rounded-lg p-4 border border-blue-200", children: [_jsxs("h4", { className: "text-sm font-bold text-gray-900 mb-3", children: ["Audit Trail (", auditTrail.length, ")"] }), _jsx("div", { className: "space-y-2 max-h-48 overflow-y-auto", children: auditTrail.map((entry, idx) => (_jsxs("div", { className: "text-xs p-2 bg-white rounded border border-blue-100", children: [_jsxs("div", { className: "flex justify-between mb-1", children: [_jsx("span", { className: "font-semibold text-gray-900", children: entry.action }), _jsx("span", { className: "text-gray-600", children: format(new Date(entry.changedAt), 'HH:mm') })] }), _jsxs("div", { className: "text-gray-600", children: ["by ", entry.changedBy, " on ", format(new Date(entry.changedAt), 'MMM dd, yyyy')] })] }, entry.id))) })] })), record.attachments.length > 0 && (_jsxs("div", { className: "bg-yellow-50 rounded-lg p-4 border border-yellow-200", children: [_jsx("h4", { className: "text-sm font-bold text-gray-900 mb-2", children: "Attachments" }), _jsx("ul", { className: "space-y-1", children: record.attachments.map((attachment, idx) => (_jsxs("li", { className: "text-sm text-gray-700", children: ["\u2022 ", attachment] }, idx))) })] }))] }), _jsx("div", { className: "sticky bottom-0 bg-gray-50 p-6 border-t border-gray-200 flex justify-end", children: _jsx("button", { onClick: onClose, className: "btn-secondary", children: "Close" }) })] }) }));
}
function StatusDisplay({ status }) {
    const colors = {
        approved: 'text-green-700',
        'pending-review': 'text-yellow-700',
        draft: 'text-gray-700',
        rejected: 'text-red-700',
    };
    return (_jsx("span", { className: `text-sm font-semibold ${colors[status]}`, children: status.replace('-', ' ').charAt(0).toUpperCase() +
            status.slice(1).replace('-', ' ') }));
}
function PriorityDisplay({ priority }) {
    const colors = {
        low: 'text-blue-700',
        medium: 'text-yellow-700',
        high: 'text-orange-700',
        critical: 'text-red-700',
    };
    return (_jsx("span", { className: `text-sm font-semibold ${colors[priority]}`, children: priority.charAt(0).toUpperCase() + priority.slice(1) }));
}
