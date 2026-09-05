import { useEffect, useState } from 'react';
import { User } from './types';
import { getCurrentUser, setCurrentUser, initializeStorage, getUsers } from './utils/storage';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import RecordsManagement from './pages/RecordsManagement';
import AuditTrail from './pages/AuditTrail';
import Reports from './pages/Reports';
import Navigation from './components/Navigation';

type Page = 'dashboard' | 'records' | 'audit' | 'reports';

function App() {
  const [currentUser, setLocalUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeStorage();
    const user = getCurrentUser();
    setLocalUser(user);
    setIsLoading(false);
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setLocalUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setLocalUser(null);
    setCurrentPage('dashboard');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-eli-light">
        <div className="text-eli-blue text-xl">Loading...</div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation
        user={currentUser}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        onLogout={handleLogout}
      />
      <main className="p-6">
        {currentPage === 'dashboard' && <Dashboard user={currentUser} />}
        {currentPage === 'records' && <RecordsManagement user={currentUser} />}
        {currentPage === 'audit' && <AuditTrail user={currentUser} />}
        {currentPage === 'reports' && <Reports user={currentUser} />}
      </main>
    </div>
  );
}

export default App;
