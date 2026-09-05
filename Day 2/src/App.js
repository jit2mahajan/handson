import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { getCurrentUser, setCurrentUser, initializeStorage } from './utils/storage';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import RecordsManagement from './pages/RecordsManagement';
import AuditTrail from './pages/AuditTrail';
import Reports from './pages/Reports';
import Navigation from './components/Navigation';
function App() {
    const [currentUser, setLocalUser] = useState(null);
    const [currentPage, setCurrentPage] = useState('dashboard');
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        initializeStorage();
        const user = getCurrentUser();
        setLocalUser(user);
        setIsLoading(false);
    }, []);
    const handleLogin = (user) => {
        setCurrentUser(user);
        setLocalUser(user);
    };
    const handleLogout = () => {
        setCurrentUser(null);
        setLocalUser(null);
        setCurrentPage('dashboard');
    };
    if (isLoading) {
        return (_jsx("div", { className: "flex items-center justify-center h-screen bg-eli-light", children: _jsx("div", { className: "text-eli-blue text-xl", children: "Loading..." }) }));
    }
    if (!currentUser) {
        return _jsx(LoginPage, { onLogin: handleLogin });
    }
    return (_jsxs("div", { className: "min-h-screen bg-gray-100", children: [_jsx(Navigation, { user: currentUser, currentPage: currentPage, onPageChange: setCurrentPage, onLogout: handleLogout }), _jsxs("main", { className: "p-6", children: [currentPage === 'dashboard' && _jsx(Dashboard, { user: currentUser }), currentPage === 'records' && _jsx(RecordsManagement, { user: currentUser }), currentPage === 'audit' && _jsx(AuditTrail, { user: currentUser }), currentPage === 'reports' && _jsx(Reports, { user: currentUser })] })] }));
}
export default App;
