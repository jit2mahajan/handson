import { useState, useMemo } from 'react';
import { User, QARecord } from '../types';
import { getRecords, saveRecord, deleteRecord } from '../utils/storage';
import { Plus, Trash2, Edit2, Eye, Filter } from 'lucide-react';
import { format } from 'date-fns';
import RecordModal from '../components/RecordModal';
import ViewRecordModal from '../components/ViewRecordModal';

interface RecordsManagementProps {
  user: User;
}

export default function RecordsManagement({ user }: RecordsManagementProps) {
  const [records, setRecords] = useState(getRecords());
  const [showModal, setShowModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<QARecord | null>(null);
  const [selectedRecordToView, setSelectedRecordToView] = useState<QARecord | null>(null);
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  const canEdit = ['admin', 'qa-manager', 'qa-analyst'].includes(user.role);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (filterType && r.type !== filterType) return false;
      if (filterStatus && r.status !== filterStatus) return false;
      return true;
    });
  }, [records, filterType, filterStatus]);

  const handleSaveRecord = (record: QARecord) => {
    saveRecord(record);
    setRecords(getRecords());
    setShowModal(false);
    setSelectedRecord(null);
  };

  const handleDeleteRecord = (recordId: string) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      deleteRecord(recordId);
      setRecords(getRecords());
    }
  };

  const handleNewRecord = () => {
    setSelectedRecord(null);
    setShowModal(true);
  };

  const handleEditRecord = (record: QARecord) => {
    setSelectedRecord(record);
    setShowModal(true);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">QA Records Management</h2>
          <p className="text-gray-600 mt-2">Create and manage quality assurance records with full ALCOA+ compliance</p>
        </div>
        {canEdit && (
          <button onClick={handleNewRecord} className="btn-primary flex items-center gap-2">
            <Plus size={20} /> New Record
          </button>
        )}
      </div>

      <div className="card p-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <Filter size={20} className="text-gray-600" />
          <div>
            <label className="block text-xs text-gray-600 mb-1">Type</label>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="input-field w-40">
              <option value="">All Types</option>
              <option value="test-result">Test Result</option>
              <option value="deviation">Deviation</option>
              <option value="documentation">Documentation</option>
              <option value="audit">Audit</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Title</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Type</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Created At</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">ALCOA+</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record, index) => (
                <tr key={record.id} className={`border-b border-gray-200 hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">{record.title}</p>
                    <p className="text-sm text-gray-600">{record.description.substring(0, 40)}...</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium">
                      {record.type.replace('-', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={record.status} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{format(record.createdAt, 'MMM dd, yyyy')}</td>
                  <td className="px-6 py-4">
                    {record.alcoa.attributable ? (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-semibold">✓ Compliant</span>
                    ) : (
                      <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded font-semibold">✗ Non-Compliant</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setSelectedRecordToView(record)} className="p-1 hover:bg-blue-100 rounded text-blue-600">
                        <Eye size={18} />
                      </button>
                      {canEdit && (
                        <>
                          <button onClick={() => handleEditRecord(record)} className="p-1 hover:bg-yellow-100 rounded text-yellow-600">
                            <Edit2 size={18} />
                          </button>
                          <button onClick={() => handleDeleteRecord(record.id)} className="p-1 hover:bg-red-100 rounded text-red-600">
                            <Trash2 size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredRecords.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">No records found. Create a new record to get started.</p>
          </div>
        )}
      </div>

      {showModal && (
        <RecordModal
          record={selectedRecord}
          user={user}
          onSave={handleSaveRecord}
          onClose={() => {
            setShowModal(false);
            setSelectedRecord(null);
          }}
        />
      )}

      {selectedRecordToView && (
        <ViewRecordModal
          record={selectedRecordToView}
          onClose={() => setSelectedRecordToView(null)}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    approved: 'bg-green-100 text-green-800',
    'pending-review': 'bg-yellow-100 text-yellow-800',
    draft: 'bg-gray-100 text-gray-800',
    rejected: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`text-xs px-2 py-1 rounded font-semibold ${colors[status]}`}>
      {status.replace('-', ' ').charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
    </span>
  );
}
