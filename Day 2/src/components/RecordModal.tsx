import { useState } from 'react';
import { QARecord, User } from '../types';
import { X, Save, FileText, Check } from 'lucide-react';

interface RecordModalProps {
  record: QARecord | null;
  user: User;
  onSave: (record: QARecord) => void;
  onClose: () => void;
}

export default function RecordModal({ record, user, onSave, onClose }: RecordModalProps) {
  const [formData, setFormData] = useState<QARecord>(
    record || {
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
    },
  );

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-96 overflow-y-auto">
        <div className="sticky top-0 bg-eli-blue text-white p-6 flex items-center justify-between border-b border-blue-700">
          <div className="flex items-center gap-3">
            <FileText size={24} />
            <h2 className="text-xl font-bold">{record ? 'Edit Record' : 'Create New Record'}</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-blue-700 rounded transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter record title"
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Type *</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="input-field"
              >
                <option value="test-result">Test Result</option>
                <option value="deviation">Deviation</option>
                <option value="documentation">Documentation</option>
                <option value="audit">Audit</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                className="input-field"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Description *</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter detailed description"
              rows={3}
              className="input-field"
            />
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 p-6 flex gap-3 justify-end border-t border-gray-200">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSubmit} className="btn-primary flex items-center gap-2">
            <Save size={18} />
            {record ? 'Update Record' : 'Create Record'}
          </button>
        </div>
      </div>
    </div>
  );
}
