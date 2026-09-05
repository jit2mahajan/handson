import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useMemo } from 'react';
import { getRecords, saveRecord, deleteRecord } from '../utils/storage';
import { Plus, Trash2, Edit2, Eye, Filter } from 'lucide-react';
import { format } from 'date-fns';
import RecordModal from '../components/RecordModal';
import ViewRecordModal from '../components/ViewRecordModal';
export default function RecordsManagement({ user }) {
    const [records, setRecords] = useState(getRecords());
    const [showModal, setShowModal] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [selectedRecordToView, setSelectedRecordToView] = useState(null);
    const [filterType, setFilterType] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const canEdit = ['admin', 'qa-manager', 'qa-analyst'].includes(user.role);
    const filteredRecords = useMemo(() => {
        return records.filter((r) => {
            if (filterType && r.type !== filterType)
                return false;
            if (filterStatus && r.status !== filterStatus)
                return false;
            return true;
        });
    }, [records, filterType, filterStatus]);
    const handleSaveRecord = (record) => {
        saveRecord(record);
        setRecords(getRecords());
        setShowModal(false);
        setSelectedRecord(null);
    };
    const handleDeleteRecord = (recordId) => {
        if (window.confirm('Are you sure you want to delete this record?')) {
            deleteRecord(recordId);
            setRecords(getRecords());
        }
    };
    const handleNewRecord = () => {
        setSelectedRecord(null);
        setShowModal(true);
    };
    const handleEditRecord = (record) => {
        setSelectedRecord(record);
        setShowModal(true);
    };
    return (_jsxs("div", { className: "max-w-7xl mx-auto", children: [_jsxs("div", { className: "flex items-center justify-between mb-8", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-3xl font-bold text-gray-900", children: "QA Records Management" }), _jsx("p", { className: "text-gray-600 mt-2", children: "Create and manage quality assurance records with full ALCOA+ compliance" })] }), canEdit && (_jsxs("button", { onClick: handleNewRecord, className: "btn-primary flex items-center gap-2", children: [_jsx(Plus, { size: 20 }), " New Record"] }))] }), _jsx("div", { className: "card p-4 mb-6", children: _jsxs("div", { className: "flex items-center gap-4 flex-wrap", children: [_jsx(Filter, { size: 20, className: "text-gray-600" }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs text-gray-600 mb-1", children: "Type" }), _jsxs("select", { value: filterType, onChange: (e) => setFilterType(e.target.value), className: "input-field w-40", children: [_jsx("option", { value: "", children: "All Types" }), _jsx("option", { value: "test-result", children: "Test Result" }), _jsx("option", { value: "deviation", children: "Deviation" }), _jsx("option", { value: "documentation", children: "Documentation" }), _jsx("option", { value: "audit", children: "Audit" })] })] })] }) }), _jsxs("div", { className: "card overflow-hidden", children: [_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full", children: [_jsx("thead", { className: "bg-gray-50 border-b border-gray-200", children: _jsxs("tr", { children: [_jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900", children: "Title" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900", children: "Type" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900", children: "Status" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900", children: "Created At" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900", children: "ALCOA+" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900", children: "Actions" })] }) }), _jsx("tbody", { children: filteredRecords.map((record, index) => (_jsxs("tr", { className: `border-b border-gray-200 hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`, children: [_jsxs("td", { className: "px-6 py-4", children: [_jsx("p", { className: "font-medium text-gray-900", children: record.title }), _jsxs("p", { className: "text-sm text-gray-600", children: [record.description.substring(0, 40), "..."] })] }), _jsx("td", { className: "px-6 py-4", children: _jsx("span", { className: "text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium", children: record.type.replace('-', ' ') }) }), _jsx("td", { className: "px-6 py-4", children: _jsx(StatusBadge, { status: record.status }) }), _jsx("td", { className: "px-6 py-4 text-sm text-gray-700", children: format(record.createdAt, 'MMM dd, yyyy') }), _jsx("td", { className: "px-6 py-4", children: record.alcoa.attributable ? (_jsx("span", { className: "text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-semibold", children: "\u2713 Compliant" })) : (_jsx("span", { className: "text-xs bg-red-100 text-red-800 px-2 py-1 rounded font-semibold", children: "\u2717 Non-Compliant" })) }), _jsx("td", { className: "px-6 py-4", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { onClick: () => setSelectedRecordToView(record), className: "p-1 hover:bg-blue-100 rounded text-blue-600", children: _jsx(Eye, { size: 18 }) }), canEdit && (_jsxs(_Fragment, { children: [_jsx("button", { onClick: () => handleEditRecord(record), className: "p-1 hover:bg-yellow-100 rounded text-yellow-600", children: _jsx(Edit2, { size: 18 }) }), _jsx("button", { onClick: () => handleDeleteRecord(record.id), className: "p-1 hover:bg-red-100 rounded text-red-600", children: _jsx(Trash2, { size: 18 }) })] }))] }) })] }, record.id))) })] }) }), filteredRecords.length === 0 && (_jsx("div", { className: "text-center py-12", children: _jsx("p", { className: "text-gray-600", children: "No records found. Create a new record to get started." }) }))] }), showModal && (_jsx(RecordModal, { record: selectedRecord, user: user, onSave: handleSaveRecord, onClose: () => {
                    setShowModal(false);
                    setSelectedRecord(null);
                } })), selectedRecordToView && (_jsx(ViewRecordModal, { record: selectedRecordToView, onClose: () => setSelectedRecordToView(null) }))] }));
}
function StatusBadge({ status }) {
    const colors = {
        approved: 'bg-green-100 text-green-800',
        'pending-review': 'bg-yellow-100 text-yellow-800',
        draft: 'bg-gray-100 text-gray-800',
        rejected: 'bg-red-100 text-red-800',
    };
    return (_jsx("span", { className: `text-xs px-2 py-1 rounded font-semibold ${colors[status]}`, children: status.replace('-', ' ').charAt(0).toUpperCase() + status.slice(1).replace('-', ' ') }));
}
