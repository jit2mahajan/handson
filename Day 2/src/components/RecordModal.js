import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { X, Save, FileText } from 'lucide-react';
export default function RecordModal({ record, user, onSave, onClose }) {
    const [formData, setFormData] = useState(record || {
        id: Date.now().toString(),
        title: '',
        type: 'test-result',
        status: 'draft',
        createdBy: user.name,
        createdAt: new Date(),
        updatedAt: new Date(),
        description: '',
        category: '',
        priority: 'medium',
        attachments: [],
        alcoa: {
            attributable: true,
            legible: true,
            contemporaneous: true,
            original: true,
            accurate: true,
            auditable: true,
        },
    });
    const handleSubmit = () => {
        if (!formData.title.trim() || !formData.description.trim()) {
            alert('Please fill in all required fields');
            return;
        }
        onSave({
            ...formData,
            updatedAt: new Date(),
        });
    };
    return (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50", children: _jsxs("div", { className: "bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-96 overflow-y-auto", children: [_jsxs("div", { className: "sticky top-0 bg-eli-blue text-white p-6 flex items-center justify-between border-b border-blue-700", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(FileText, { size: 24 }), _jsx("h2", { className: "text-xl font-bold", children: record ? 'Edit Record' : 'Create New Record' })] }), _jsx("button", { onClick: onClose, className: "p-1 hover:bg-blue-700 rounded transition-colors", children: _jsx(X, { size: 24 }) })] }), _jsxs("div", { className: "p-6 space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold text-gray-900 mb-2", children: "Title *" }), _jsx("input", { type: "text", value: formData.title, onChange: (e) => setFormData({ ...formData, title: e.target.value }), placeholder: "Enter record title", className: "input-field" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold text-gray-900 mb-2", children: "Type *" }), _jsxs("select", { value: formData.type, onChange: (e) => setFormData({ ...formData, type: e.target.value }), className: "input-field", children: [_jsx("option", { value: "test-result", children: "Test Result" }), _jsx("option", { value: "deviation", children: "Deviation" }), _jsx("option", { value: "documentation", children: "Documentation" }), _jsx("option", { value: "audit", children: "Audit" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold text-gray-900 mb-2", children: "Priority" }), _jsxs("select", { value: formData.priority, onChange: (e) => setFormData({ ...formData, priority: e.target.value }), className: "input-field", children: [_jsx("option", { value: "low", children: "Low" }), _jsx("option", { value: "medium", children: "Medium" }), _jsx("option", { value: "high", children: "High" }), _jsx("option", { value: "critical", children: "Critical" })] })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold text-gray-900 mb-2", children: "Description *" }), _jsx("textarea", { value: formData.description, onChange: (e) => setFormData({ ...formData, description: e.target.value }), placeholder: "Enter detailed description", rows: 3, className: "input-field" })] })] }), _jsxs("div", { className: "sticky bottom-0 bg-gray-50 p-6 flex gap-3 justify-end border-t border-gray-200", children: [_jsx("button", { onClick: onClose, className: "btn-secondary", children: "Cancel" }), _jsxs("button", { onClick: handleSubmit, className: "btn-primary flex items-center gap-2", children: [_jsx(Save, { size: 18 }), record ? 'Update Record' : 'Create Record'] })] })] }) }));
}
