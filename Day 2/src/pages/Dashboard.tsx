import { User, QARecord } from '../types';
import { getRecords } from '../utils/storage';
import { CheckCircle2, AlertCircle, Clock, FileText, TrendingUp, Award } from 'lucide-react';
import { useMemo } from 'react';
import { format } from 'date-fns';

interface DashboardProps {
  user: User;
}

export default function Dashboard({ user }: DashboardProps) {
  const records = getRecords();

  const stats = useMemo(() => {
    const approved = records.filter((r) => r.status === 'approved').length;
    const pending = records.filter((r) => r.status === 'pending-review').length;
    const critical = records.filter((r) => r.priority === 'critical').length;
    const total = records.length;

    return { approved, pending, critical, total };
  }, [records]);

  const recentRecords = useMemo(() => {
    return records
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);
  }, [records]);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h2>
        <p className="text-gray-600">Welcome, {user.name}. Here's your QA overview.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard icon={FileText} label="Total Records" value={stats.total} color="bg-blue-50" iconColor="text-blue-600" />
        <StatCard icon={CheckCircle2} label="Approved" value={stats.approved} color="bg-green-50" iconColor="text-green-600" />
        <StatCard icon={Clock} label="Pending Review" value={stats.pending} color="bg-yellow-50" iconColor="text-yellow-600" />
        <StatCard icon={AlertCircle} label="Critical Items" value={stats.critical} color="bg-red-50" iconColor="text-red-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <Award className="text-eli-blue" size={24} />
            <h3 className="text-lg font-semibold text-gray-900">ALCOA+ Compliance</h3>
          </div>
          <div className="space-y-3">
            {['Attributable', 'Legible', 'Contemporaneous', 'Original', 'Accurate', 'Auditable'].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-green-600" />
                <span className="text-sm text-gray-700">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="text-eli-gold" size={24} />
            <h3 className="text-lg font-semibold text-gray-900">Performance</h3>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">Compliance Rate</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '98%' }}></div>
                </div>
                <span className="text-sm font-semibold text-gray-900">98%</span>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Audit Pass Rate</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '100%' }}></div>
                </div>
                <span className="text-sm font-semibold text-gray-900">100%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card p-6 bg-gradient-to-br from-eli-light to-blue-50">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">User Profile</h3>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-600 uppercase tracking-wider">Name</p>
              <p className="text-sm font-semibold text-gray-900">{user.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 uppercase tracking-wider">Department</p>
              <p className="text-sm font-semibold text-gray-900">{user.department}</p>
            </div>
            <div className="pt-2 border-t border-blue-200">
              <span className="inline-block bg-eli-blue text-white text-xs font-semibold px-3 py-1 rounded-full">
                {user.role.replace('-', ' ').toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent QA Records</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 font-semibold text-gray-700">Title</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-700">Type</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-700">Status</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-700">Updated</th>
              </tr>
            </thead>
            <tbody>
              {recentRecords.map((record) => (
                <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-3 font-medium text-gray-900">{record.title}</td>
                  <td className="py-3 px-3">
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {record.type.replace('-', ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <StatusBadge status={record.status} />
                  </td>
                  <td className="py-3 px-3 text-gray-600">
                    {format(record.updatedAt, 'MMM dd, yyyy')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, iconColor }: any) {
  return (
    <div className={`${color} card p-6`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
        </div>
        <Icon className={`${iconColor}`} size={32} />
      </div>
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
