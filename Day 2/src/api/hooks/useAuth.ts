/**
 * useAuth Hook - React hook for authentication
 * Provides async/await auth operations with error handling and cleanup
 */

import { useState, useCallback, useEffect } from 'react';
import { User } from '@/types';
import * as authService from '../services/authService';

interface UseAuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

interface UseAuthActions {
  login: (email: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  verifyToken: () => Promise<boolean>;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  clearError: () => void;
}

export function useAuth(): UseAuthState & UseAuthActions {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth from localStorage
  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
  }, []);

  // Login
  const login = useCallback(async (email: string, password?: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await authService.login({ email, password });
      setUser(response.user);
      localStorage.setItem('alcoa_current_user', JSON.stringify(response.user));
    } catch (err: any) {
      setError(err.message || 'Login failed');
      console.error('useAuth.login error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout
  const logout = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await authService.logout();
      setUser(null);
    } catch (err: any) {
      setError(err.message || 'Logout failed');
      console.error('useAuth.logout error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh token
  const refreshToken = useCallback(async () => {
    try {
      setError(null);
      const response = await authService.refreshToken();
      setUser(response.user);
    } catch (err: any) {
      setError(err.message || 'Token refresh failed');
      setUser(null);
    }
  }, []);

  // Verify token
  const verifyToken = useCallback(async (): Promise<boolean> => {
    try {
      const result = await authService.verifyToken();
      if (!result.isValid) {
        setUser(null);
      }
      return result.isValid;
    } catch (err: any) {
      setUser(null);
      return false;
    }
  }, []);

  // Check role
  const hasRole = useCallback((role: string): boolean => {
    return user?.role === role || false;
  }, [user]);

  // Check any role
  const hasAnyRole = useCallback((roles: string[]): boolean => {
    return user ? roles.includes(user.role) : false;
  }, [user]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      authService.cleanupAuthService();
    };
  }, []);

  return {
    user,
    isAuthenticated: !!user,
    loading,
    error,
    login,
    logout,
    refreshToken,
    verifyToken,
    hasRole,
    hasAnyRole,
    clearError,
  };
}

export default useAuth;
