import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { LogOut, BarChart3, FileText, History, LayoutDashboard, Lock } from 'lucide-react';
export default function Navigation({ user, currentPage, onPageChange, onLogout, }) {
    const canAccess = (requiredRole) => requiredRole.includes(user.role);
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
    return (_jsx("nav", { className: "bg-eli-blue text-white shadow-lg", children: _jsx("div", { className: "max-w-7xl mx-auto px-6 py-4", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "w-10 h-10 bg-eli-gold rounded-lg flex items-center justify-center font-bold text-eli-blue", children: "L" }), _jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold", children: "ALCOA+ QA" }), _jsx("p", { className: "text-xs text-blue-200", children: "Eli Lilly Quality Assurance" })] })] }), _jsxs("div", { className: "flex items-center gap-8", children: [_jsx("div", { className: "flex gap-1", children: navItems.map((item) => {
                                    if (!canAccess(item.roles))
                                        return null;
                                    const Icon = item.icon;
                                    return (_jsxs("button", { onClick: () => onPageChange(item.id), className: `px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm ${currentPage === item.id
                                            ? 'bg-eli-gold text-eli-blue font-semibold'
                                            : 'hover:bg-blue-700'}`, children: [_jsx(Icon, { size: 18 }), item.label] }, item.id));
                                }) }), _jsxs("div", { className: "border-l border-blue-400 pl-8 flex items-center gap-4", children: [_jsxs("div", { className: "text-right text-sm", children: [_jsx("p", { className: "font-semibold", children: user.name }), _jsxs("p", { className: "text-blue-200 text-xs flex items-center gap-1", children: [_jsx(Lock, { size: 12 }), " ", user.role.replace('-', ' ').toUpperCase()] })] }), _jsx("button", { onClick: onLogout, className: "p-2 hover:bg-blue-700 rounded-lg transition-colors", title: "Logout", children: _jsx(LogOut, { size: 20 }) })] })] })] }) }) }));
}
