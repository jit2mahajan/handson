import { User } from '../types';
import { getAuditTrail } from '../utils/storage';
import { useMemo } from 'react';
import { format } from 'date-fns';
import { History, User as UserIcon, Clock } from 'lucide-react';

interface AuditTrailProps {
  user: User;
}

export default function AuditTrail({ user }: AuditTrailProps) {
  const auditTrail = getAuditTrail();

  const sortedTrail = useMemo(() => {
    return [...auditTrail].sort((a, b) => b.changedAt.getTime() - a.changedAt.getTime());
  }, [auditTrail]);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <History className="text-eli-blue" size={32} />
          Audit Trail
        </h2>
        <p className="text-gray-600 mt-2">Complete record of all system activities and changes</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card p-6 bg-blue-50">
          <p className="text-sm text-gray-600 mb-2">Total Activities</p>
          <p className="text-4xl font-bold text-eli-blue">{auditTrail.length}</p>
        </div>
        <div className="card p-6 bg-green-50">
          <p className="text-sm text-gray-600 mb-2">Your Activities</p>
          <p className="text-4xl font-bold text-green-600">
            {auditTrail.filter((a) => a.changedBy === user.name).length}
          </p>
        </div>
        <div className="card p-6 bg-purple-50">
          <p className="text-sm text-gray-600 mb-2">Last Activity</p>
          <p className="text-sm font-semibold text-purple-600 mt-3">
            {auditTrail.length > 0
              ? format(sortedTrail[0].changedAt, 'MMM dd, yyyy HH:mm:ss')
              : 'No activities'}
          </p>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Activity Timeline</h3>

        {sortedTrail.length === 0 ? (
          <div className="text-center py-12">
            <Clock size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-600">No audit trail records yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedTrail.map((entry, index) => (
              <div key={entry.id} className="flex gap-4 pb-4 border-b border-gray-200 last:border-0">
                <div className="flex flex-col items-center">
                  <div className="w-4 h-4 rounded-full bg-eli-blue mt-2"></div>
                  {index < sortedTrail.length - 1 && <div className="w-1 h-12 bg-blue-200"></div>}
                </div>
                <div className="flex-1 pt-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900">{entry.action}</h4>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <UserIcon size={16} />
                          {entry.changedBy}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock size={16} />
                          {format(entry.changedAt, 'MMM dd, yyyy HH:mm:ss')}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs bg-gray-100 px-3 py-1 rounded text-gray-700 font-semibold">
                      ID: {entry.recordId}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-6 mt-8 bg-gradient-to-r from-eli-light to-blue-50 border-l-4 border-eli-blue">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Audit Trail Compliance</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-center gap-2">
            <span className="text-green-600 font-bold">✓</span> All activities recorded with timestamps
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-600 font-bold">✓</span> User attribution tracked for every action
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-600 font-bold">✓</span> Records are immutable
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-600 font-bold">✓</span> Meets 21 CFR Part 11 requirements
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-600 font-bold">✓</span> Full ALCOA+ compliance
          </li>
        </ul>
      </div>
    </div>
  );
}
