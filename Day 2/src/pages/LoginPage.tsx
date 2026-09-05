import { useState } from 'react';
import { User } from '../types';
import { getUsers } from '../utils/storage';
import { LogIn } from 'lucide-react';

interface LoginPageProps {
  onLogin: (user: User) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const users = getUsers();

  const handleLogin = () => {
    const user = users.find((u) => u.email === email);
    if (user) {
      onLogin(user);
      setError('');
    } else {
      setError('User not found. Please check your email.');
    }
  };

  const handleDemoLogin = (demoEmail: string) => {
    const user = users.find((u) => u.email === demoEmail);
    if (user) {
      onLogin(user);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-eli-blue to-blue-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="inline-block w-16 h-16 bg-eli-blue rounded-xl flex items-center justify-center mb-4">
              <span className="text-3xl font-bold text-eli-gold">L</span>
            </div>
            <h1 className="text-3xl font-bold text-eli-blue mb-2">ALCOA+ QA</h1>
            <p className="text-gray-600 text-sm">Eli Lilly Quality Assurance Management</p>
            <p className="text-xs text-gray-500 mt-2">Data Integrity & Compliance Platform</p>
          </div>

          <div className="bg-eli-light p-4 rounded-lg mb-6 border-l-4 border-eli-blue">
            <p className="text-xs text-gray-700 font-semibold mb-2">ALCOA+ Principles:</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>✓ Attributable</div>
              <div>✓ Legible</div>
              <div>✓ Contemporaneous</div>
              <div>✓ Original</div>
              <div>✓ Accurate</div>
              <div>✓ Auditable & Complete</div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="name@lilly.com"
                className="input-field"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleLogin}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              <LogIn size={18} />
              Login
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-600 text-center mb-3 font-semibold">
              Demo Accounts - Click to Login:
            </p>
            <div className="space-y-2">
              {users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleDemoLogin(user.email)}
                  className="w-full p-3 text-left bg-gray-50 hover:bg-eli-light border border-gray-200 rounded-lg transition-colors text-sm"
                >
                  <div className="font-medium text-gray-900">{user.name}</div>
                  <div className="text-xs text-gray-500">
                    {user.email} • {user.role.replace('-', ' ').toUpperCase()}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Secured • Compliant • Auditable
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
