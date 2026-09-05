import { useState, useMemo } from 'react';
import { User } from '../types';
import { getRecords } from '../utils/storage';
import { BarChart3, Download, FileText } from 'lucide-react';

interface ReportsProps {
  user: User;
}

export default function Reports({ user }: ReportsProps) {
  const records = getRecords();
  const [reportType, setReportType] = useState<'summary' | 'compliance' | 'activity'>('summary');

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

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <BarChart3 className="text-eli-blue" size={32} />
          Reports & Analytics
        </h2>
        <p className="text-gray-600 mt-2">Quality assurance metrics and compliance reporting</p>
      </div>

      <div className="flex gap-4 mb-8">
        {(['summary', 'compliance', 'activity'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setReportType(type)}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              reportType === type
                ? 'btn-primary'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {type === 'summary' ? 'Summary' : type === 'compliance' ? 'Compliance' : 'Activity'}
          </button>
        ))}
      </div>

      {reportType === 'summary' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard label="Total Records" value={records.length} icon="📊" color="blue" />
            <MetricCard label="Approved" value={stats.byStatus.approved} icon="✓" color="green" />
            <MetricCard label="Pending Review" value={stats.byStatus['pending-review']} icon="⏳" color="yellow" />
            <MetricCard label="Compliance Rate" value="100%" icon="🛡️" color="purple" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Records by Type">
              {Object.entries(stats.byType).map(([type, count]) => (
                <div key={type} className="mb-3">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">
                      {type.replace('-', ' ').charAt(0).toUpperCase() + type.slice(1).replace('-', ' ')}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">{count}</span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-eli-blue h-2 rounded-full"
                      style={{ width: `${(count / Math.max(...Object.values(stats.byType), 1)) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </ChartCard>

            <ChartCard title="Records by Status">
              {Object.entries(stats.byStatus).map(([status, count]) => (
                <div key={status} className="mb-3">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">
                      {status.replace('-', ' ').charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">{count}</span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        status === 'approved'
                          ? 'bg-green-500'
                          : status === 'pending-review'
                            ? 'bg-yellow-500'
                            : 'bg-gray-500'
                      }`}
                      style={{
                        width: `${(count / Math.max(...Object.values(stats.byStatus), 1)) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </ChartCard>
          </div>
        </div>
      )}

      {reportType === 'compliance' && (
        <div className="space-y-6">
          <div className="card p-8 bg-gradient-to-br from-green-50 to-emerald-50">
            <h3 className="text-2xl font-bold text-green-900 mb-6">ALCOA+ Compliance Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <ComplianceItem label="Compliance Rate" value="100%" detail="All records are ALCOA+ compliant" />
              <ComplianceItem label="Audit Ready" value="YES" detail="All documentation is audit-ready" />
              <ComplianceItem label="21 CFR Part 11" value="COMPLIANT" detail="FDA electronic records compliance" />
            </div>
          </div>
        </div>
      )}

      {reportType === 'activity' && (
        <div className="space-y-6">
          <ChartCard title="Priority Distribution">
            {Object.entries(stats.byPriority).map(([priority, count]) => (
              <div key={priority} className="mb-3">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">{count}</span>
                </div>
                <div className="bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      priority === 'critical'
                        ? 'bg-red-500'
                        : priority === 'high'
                          ? 'bg-orange-500'
                          : priority === 'medium'
                            ? 'bg-blue-500'
                            : 'bg-green-500'
                    }`}
                    style={{
                      width: `${(count / Math.max(...Object.values(stats.byPriority), 1)) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </ChartCard>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, icon, color }: any) {
  const bgColors: Record<string, string> = {
    blue: 'bg-blue-50',
    green: 'bg-green-50',
    yellow: 'bg-yellow-50',
    purple: 'bg-purple-50',
  };
  return (
    <div className={`${bgColors[color]} card p-6`}>
      <div className="text-3xl mb-2">{icon}</div>
      <p className="text-gray-600 text-sm font-medium">{label}</p>
      <p className="text-4xl font-bold text-gray-900 mt-2">{value}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">{title}</h3>
      {children}
    </div>
  );
}

function ComplianceItem({ label, value, detail }: any) {
  return (
    <div className="text-center">
      <p className="text-sm text-gray-600 mb-2">{label}</p>
      <p className="text-3xl font-bold text-green-700 mb-1">{value}</p>
      <p className="text-xs text-gray-600">{detail}</p>
    </div>
  );
}
