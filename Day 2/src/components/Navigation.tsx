import { User } from '../types';
import { LogOut, BarChart3, FileText, History, LayoutDashboard, Lock } from 'lucide-react';

interface NavigationProps {
  user: User;
  currentPage: string;
  onPageChange: (page: any) => void;
  onLogout: () => void;
}

export default function Navigation({
  user,
  currentPage,
  onPageChange,
  onLogout,
}: NavigationProps) {
  const canAccess = (requiredRole: string[]) => requiredRole.includes(user.role);

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['admin', 'qa-manager', 'qa-analyst', 'reviewer'],
    },
    {
      id: 'records',
      label: 'QA Records',
      icon: FileText,
      roles: ['admin', 'qa-manager', 'qa-analyst'],
    },
    {
      id: 'audit',
      label: 'Audit Trail',
      icon: History,
      roles: ['admin', 'qa-manager', 'reviewer'],
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: BarChart3,
      roles: ['admin', 'qa-manager', 'reviewer'],
    },
  ];

  return (
    <nav className="bg-eli-blue text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-eli-gold rounded-lg flex items-center justify-center font-bold text-eli-blue">
              L
            </div>
            <div>
              <h1 className="text-2xl font-bold">ALCOA+ QA</h1>
              <p className="text-xs text-blue-200">Eli Lilly Quality Assurance</p>
            </div>
          </div>

          <div className="flex items-center gap-8">
            <div className="flex gap-1">
              {navItems.map((item) => {
                if (!canAccess(item.roles)) return null;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => onPageChange(item.id)}
                    className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm ${
                      currentPage === item.id
                        ? 'bg-eli-gold text-eli-blue font-semibold'
                        : 'hover:bg-blue-700'
                    }`}
                  >
                    <Icon size={18} />
                    {item.label}
                  </button>
                );
              })}
            </div>

            <div className="border-l border-blue-400 pl-8 flex items-center gap-4">
              <div className="text-right text-sm">
                <p className="font-semibold">{user.name}</p>
                <p className="text-blue-200 text-xs flex items-center gap-1">
                  <Lock size={12} /> {user.role.replace('-', ' ').toUpperCase()}
                </p>
              </div>
              <button
                onClick={onLogout}
                className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
