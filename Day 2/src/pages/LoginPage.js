import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { getUsers } from '../utils/storage';
import { LogIn } from 'lucide-react';
export default function LoginPage({ onLogin }) {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const users = getUsers();
    const handleLogin = () => {
        const user = users.find((u) => u.email === email);
        if (user) {
            onLogin(user);
            setError('');
        }
        else {
            setError('User not found. Please check your email.');
        }
    };
    const handleDemoLogin = (demoEmail) => {
        const user = users.find((u) => u.email === demoEmail);
        if (user) {
            onLogin(user);
        }
    };
    return (_jsx("div", { className: "min-h-screen bg-gradient-to-br from-eli-blue to-blue-900 flex items-center justify-center p-4", children: _jsx("div", { className: "w-full max-w-md", children: _jsxs("div", { className: "bg-white rounded-2xl shadow-2xl p-8", children: [_jsxs("div", { className: "text-center mb-8", children: [_jsx("div", { className: "inline-block w-16 h-16 bg-eli-blue rounded-xl flex items-center justify-center mb-4", children: _jsx("span", { className: "text-3xl font-bold text-eli-gold", children: "L" }) }), _jsx("h1", { className: "text-3xl font-bold text-eli-blue mb-2", children: "ALCOA+ QA" }), _jsx("p", { className: "text-gray-600 text-sm", children: "Eli Lilly Quality Assurance Management" }), _jsx("p", { className: "text-xs text-gray-500 mt-2", children: "Data Integrity & Compliance Platform" })] }), _jsxs("div", { className: "bg-eli-light p-4 rounded-lg mb-6 border-l-4 border-eli-blue", children: [_jsx("p", { className: "text-xs text-gray-700 font-semibold mb-2", children: "ALCOA+ Principles:" }), _jsxs("div", { className: "grid grid-cols-2 gap-2 text-xs", children: [_jsx("div", { children: "\u2713 Attributable" }), _jsx("div", { children: "\u2713 Legible" }), _jsx("div", { children: "\u2713 Contemporaneous" }), _jsx("div", { children: "\u2713 Original" }), _jsx("div", { children: "\u2713 Accurate" }), _jsx("div", { children: "\u2713 Auditable & Complete" })] })] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Email Address" }), _jsx("input", { type: "email", value: email, onChange: (e) => setEmail(e.target.value), onKeyPress: (e) => e.key === 'Enter' && handleLogin(), placeholder: "name@lilly.com", className: "input-field" })] }), error && (_jsx("div", { className: "bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm", children: error })), _jsxs("button", { onClick: handleLogin, className: "w-full btn-primary flex items-center justify-center gap-2", children: [_jsx(LogIn, { size: 18 }), "Login"] })] }), _jsxs("div", { className: "mt-8 pt-6 border-t border-gray-200", children: [_jsx("p", { className: "text-xs text-gray-600 text-center mb-3 font-semibold", children: "Demo Accounts - Click to Login:" }), _jsx("div", { className: "space-y-2", children: users.map((user) => (_jsxs("button", { onClick: () => handleDemoLogin(user.email), className: "w-full p-3 text-left bg-gray-50 hover:bg-eli-light border border-gray-200 rounded-lg transition-colors text-sm", children: [_jsx("div", { className: "font-medium text-gray-900", children: user.name }), _jsxs("div", { className: "text-xs text-gray-500", children: [user.email, " \u2022 ", user.role.replace('-', ' ').toUpperCase()] })] }, user.id))) })] }), _jsx("div", { className: "mt-6 pt-4 border-t border-gray-200", children: _jsx("p", { className: "text-xs text-gray-500 text-center", children: "Secured \u2022 Compliant \u2022 Auditable" }) })] }) }) }));
}
