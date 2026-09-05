import { QARecord, AuditTrail } from '../types';
import { X, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { getAuditTrail, getUsers } from '../utils/storage';
import { useMemo } from 'react';

interface ViewRecordModalProps {
  record: QARecord | null;
  onClose: () => void;
}

export default function ViewRecordModal({ record, onClose }: ViewRecordModalProps) {
  if (!record) return null;

  const auditTrail = useMemo(() => {
    return getAuditTrail().filter((a) => a.recordId === record.id).sort((a, b) => b.changedAt.getTime() - a.changedAt.getTime());
  }, [record.id]);

  const users = useMemo(() => {
    return getUsers();
  }, []);

  const getCreatorName = (userId: string) => {
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

  const allCompliant = alcoaFields.every((field) => record.alcoa[field.key as keyof typeof record.alcoa]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-eli-blue text-white p-6 flex items-center justify-between border-b border-blue-700">
          <div className="flex items-center gap-3">
            <Eye size={24} />
            <h2 className="text-xl font-bold">Record Details (Read-Only)</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-blue-700 rounded transition-colors"
            aria-label="Close modal"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Title and Basic Info */}
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{record.title}</h3>
            <p className="text-gray-600">{record.description}</p>
          </div>

          {/* Badges Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-gray-600 mb-1">Type</p>
              <p className="text-sm font-semibold text-gray-900">
                {record.type.replace('-', ' ').charAt(0).toUpperCase() + record.type.slice(1).replace('-', ' ')}
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-xs text-gray-600 mb-1">Status</p>
              <StatusDisplay status={record.status} />
            </div>
            <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-xs text-gray-600 mb-1">Priority</p>
              <PriorityDisplay priority={record.priority} />
            </div>
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-xs text-gray-600 mb-1">Category</p>
              <p className="text-sm font-semibold text-gray-900">{record.category}</p>
            </div>
          </div>

          {/* ALCOA+ Compliance Section */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center gap-2 mb-4">
              <div
                className={`w-3 h-3 rounded-full ${
                  allCompliant ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              <h3 className="text-lg font-bold text-gray-900">ALCOA+ Compliance</h3>
              <span
                className={`ml-auto text-xs px-3 py-1 rounded-full font-semibold ${
                  allCompliant
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {allCompliant ? '✓ Compliant' : '✗ Non-Compliant'}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {alcoaFields.map((field) => {
                const isCompliant = record.alcoa[field.key as keyof typeof record.alcoa];
                return (
                  <div
                    key={field.key}
                    className={`p-3 rounded-lg border flex items-center gap-2 ${
                      isCompliant
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <span
                      className={`text-lg font-bold ${
                        isCompliant ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {isCompliant ? '✓' : '✗'}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {field.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Creator/Modifier Info */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h4 className="text-sm font-bold text-gray-900 mb-3">Record Timeline</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Created by:</span>
                <span className="font-semibold text-gray-900">{getCreatorName(record.createdBy)} @ {format(new Date(record.createdAt), 'MMM dd, yyyy HH:mm')}</span>
              </div>
              {record.signedBy && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Signed by:</span>
                  <span className="font-semibold text-gray-900">
                    {getCreatorName(record.signedBy)} @ {record.signedAt && format(new Date(record.signedAt), 'MMM dd, yyyy HH:mm')}
                  </span>
                </div>
              )}
              {record.updatedAt && new Date(record.updatedAt).getTime() !== new Date(record.createdAt).getTime() && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Last updated:</span>
                  <span className="font-semibold text-gray-900">{format(new Date(record.updatedAt), 'MMM dd, yyyy HH:mm')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Audit Trail Section */}
          {auditTrail.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h4 className="text-sm font-bold text-gray-900 mb-3">Audit Trail ({auditTrail.length})</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {auditTrail.map((entry, idx) => (
                  <div
                    key={entry.id}
                    className="text-xs p-2 bg-white rounded border border-blue-100"
                  >
                    <div className="flex justify-between mb-1">
                      <span className="font-semibold text-gray-900">{entry.action}</span>
                      <span className="text-gray-600">
                        {format(new Date(entry.changedAt), 'HH:mm')}
                      </span>
                    </div>
                    <div className="text-gray-600">
                      by {entry.changedBy} on {format(new Date(entry.changedAt), 'MMM dd, yyyy')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attachments */}
          {record.attachments.length > 0 && (
            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <h4 className="text-sm font-bold text-gray-900 mb-2">Attachments</h4>
              <ul className="space-y-1">
                {record.attachments.map((attachment, idx) => (
                  <li key={idx} className="text-sm text-gray-700">
                    • {attachment}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 p-6 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="btn-secondary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusDisplay({ status }: { status: string }) {
  const colors: Record<string, string> = {
    approved: 'text-green-700',
    'pending-review': 'text-yellow-700',
    draft: 'text-gray-700',
    rejected: 'text-red-700',
  };
  return (
    <span className={`text-sm font-semibold ${colors[status]}`}>
      {status.replace('-', ' ').charAt(0).toUpperCase() +
        status.slice(1).replace('-', ' ')}
    </span>
  );
}

function PriorityDisplay({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    low: 'text-blue-700',
    medium: 'text-yellow-700',
    high: 'text-orange-700',
    critical: 'text-red-700',
  };
  return (
    <span className={`text-sm font-semibold ${colors[priority]}`}>
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  );
}
