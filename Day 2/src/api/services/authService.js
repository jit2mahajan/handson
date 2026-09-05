/**
 * Authentication Service - Async/Await API handlers
 * Handles user authentication and token management
 */
import { getUsers } from '@/utils/storage';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
/**
 * Login user
 * @param credentials - Email (and password for production)
 * @returns Promise with auth response
 */
export async function login(credentials) {
    try {
        if (!credentials.email?.trim()) {
            throw new Error('Email is required');
        }
        if (import.meta.env.VITE_MOCK_DATA === 'true') {
            await new Promise(resolve => setTimeout(resolve, 500));
            const users = getUsers();
            const user = users.find(u => u.email === credentials.email.toLowerCase());
            if (!user) {
                throw new Error('User not found');
            }
            const token = generateMockJWT(user);
            localStorage.setItem('alcoa_auth_token', token);
            return {
                user,
                token,
                expiresIn: 3600,
            };
        }
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Login failed');
        }
        const data = await response.json();
        localStorage.setItem('alcoa_auth_token', data.token);
        return data;
    }
    catch (error) {
        handleAuthError(error, 'Login failed');
    }
}
/**
 * Logout user
 * @returns Promise that resolves when logged out
 */
export async function logout() {
    try {
        const token = getAuthToken();
        if (import.meta.env.VITE_MOCK_DATA === 'true') {
            await new Promise(resolve => setTimeout(resolve, 300));
            localStorage.removeItem('alcoa_auth_token');
            localStorage.removeItem('alcoa_current_user');
            return;
        }
        const response = await fetch(`${API_BASE_URL}/auth/logout`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok)
            throw new Error('Logout failed');
        localStorage.removeItem('alcoa_auth_token');
        localStorage.removeItem('alcoa_current_user');
    }
    catch (error) {
        handleAuthError(error, 'Logout failed');
    }
}
/**
 * Refresh authentication token
 * @returns Promise with new auth response
 */
export async function refreshToken() {
    try {
        const token = getAuthToken();
        if (!token)
            throw new Error('No token to refresh');
        if (import.meta.env.VITE_MOCK_DATA === 'true') {
            await new Promise(resolve => setTimeout(resolve, 200));
            const userJson = localStorage.getItem('alcoa_current_user');
            const user = userJson ? JSON.parse(userJson) : null;
            if (!user)
                throw new Error('User session expired');
            const newToken = generateMockJWT(user);
            localStorage.setItem('alcoa_auth_token', newToken);
            return {
                user,
                token: newToken,
                expiresIn: 3600,
            };
        }
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok)
            throw new Error('Token refresh failed');
        const data = await response.json();
        localStorage.setItem('alcoa_auth_token', data.token);
        return data;
    }
    catch (error) {
        handleAuthError(error, 'Token refresh failed');
    }
}
/**
 * Verify current token
 * @returns Promise with verification result
 */
export async function verifyToken() {
    try {
        const token = getAuthToken();
        if (!token)
            return { isValid: false };
        if (import.meta.env.VITE_MOCK_DATA === 'true') {
            const userJson = localStorage.getItem('alcoa_current_user');
            const user = userJson ? JSON.parse(userJson) : null;
            return {
                isValid: !!user,
                user: user || undefined,
                expiresAt: Date.now() + 3600000,
            };
        }
        const response = await fetch(`${API_BASE_URL}/auth/verify`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok)
            return { isValid: false };
        const data = await response.json();
        return data;
    }
    catch (error) {
        console.error('Token verification failed', error);
        return { isValid: false };
    }
}
/**
 * Get current user from token
 * @returns Current user or null
 */
export function getCurrentUser() {
    try {
        const userJson = localStorage.getItem('alcoa_current_user');
        return userJson ? JSON.parse(userJson) : null;
    }
    catch {
        return null;
    }
}
/**
 * Check if user is authenticated
 * @returns true if authenticated
 */
export function isAuthenticated() {
    return !!getAuthToken() && !!getCurrentUser();
}
/**
 * Check if user has specific role
 * @param role - Role to check
 * @returns true if user has role
 */
export function hasRole(role) {
    const user = getCurrentUser();
    return user?.role === role;
}
/**
 * Check if user has any of specified roles
 * @param roles - Roles to check
 * @returns true if user has any role
 */
export function hasAnyRole(roles) {
    const user = getCurrentUser();
    return user ? roles.includes(user.role) : false;
}
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
function getAuthToken() {
    return localStorage.getItem('alcoa_auth_token') || '';
}
function generateMockJWT(user) {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
        sub: user.id,
        email: user.email,
        role: user.role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
    }));
    const signature = btoa('mock-signature');
    return `${header}.${payload}.${signature}`;
}
function handleAuthError(error, defaultMessage) {
    console.error(defaultMessage, error);
    throw new Error(error.message || defaultMessage);
}
// ============================================================================
// SERVICE CLEANUP
// ============================================================================
export function cleanupAuthService() {
    // Clear any stored tokens on cleanup
    localStorage.removeItem('alcoa_auth_token');
    console.log('Auth service cleanup completed');
}
export default {
    login,
    logout,
    refreshToken,
    verifyToken,
    getCurrentUser,
    isAuthenticated,
    hasRole,
    hasAnyRole,
    cleanupAuthService,
};
