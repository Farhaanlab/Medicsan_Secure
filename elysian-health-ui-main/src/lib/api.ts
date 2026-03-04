// Centralized API client with JWT token management
import { Capacitor } from '@capacitor/core';

// In native apps, we can't use relative /api paths (no Vite proxy).
// Use the backend URL directly. Change this to your server IP/domain.
const NATIVE_API_URL = 'http://192.168.1.6:3001/api'; // Host machine IP for physical device
const WEB_API_URL = '/api'; // Vite proxy handles this

const API_BASE = Capacitor.isNativePlatform() ? NATIVE_API_URL : WEB_API_URL;

function getToken(): string | null {
    return localStorage.getItem('mediscan_token');
}

export function setToken(token: string) {
    localStorage.setItem('mediscan_token', token);
}

export function clearToken() {
    localStorage.removeItem('mediscan_token');
    localStorage.removeItem('mediscan_user');
}

export function getStoredUser() {
    const raw = localStorage.getItem('mediscan_user');
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
}

export function setStoredUser(user: any) {
    localStorage.setItem('mediscan_user', JSON.stringify(user));
}

async function request<T = any>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const token = getToken();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    let res: Response;
    try {
        res = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers,
        });
    } catch (networkErr) {
        throw new Error(`Network error: Could not reach the server`);
    }

    if (res.status === 401) {
        clearToken();
        window.location.href = '/login';
        throw new Error('Unauthorized');
    }

    // Safely parse JSON — handle non-JSON responses (e.g. HTML error pages)
    let data: any;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        try {
            data = await res.json();
        } catch {
            throw new Error(`Invalid JSON response from server (${res.status})`);
        }
    } else {
        // Non-JSON response — likely proxy error or server down
        const text = await res.text().catch(() => '');
        throw new Error(
            `Server returned non-JSON response (${res.status}). ` +
            (text.length < 200 ? text : 'The API server may be unavailable.')
        );
    }

    if (!res.ok) {
        throw new Error(data.error || `Request failed (${res.status})`);
    }

    return data as T;
}

// Auth
export const api = {
    // Auth
    login: (email: string, password: string) =>
        request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    sendOtp: (email: string) =>
        request('/auth/send-otp', { method: 'POST', body: JSON.stringify({ email }) }),
    signup: (email: string, password: string, fullName: string, otp: string) =>
        request('/auth/signup', { method: 'POST', body: JSON.stringify({ email, password, fullName, otp }) }),
    getMe: () => request('/auth/me'),
    updateProfile: (data: { fullName?: string; email?: string }) =>
        request('/auth/profile', { method: 'PATCH', body: JSON.stringify(data) }),
    changePassword: (current: string, newPass: string) =>
        request('/auth/password', { method: 'PATCH', body: JSON.stringify({ current, newPass }) }),

    uploadRingtone: async (file: File) => {
        const formData = new FormData();
        formData.append('ringtone', file);
        const token = getToken();
        let res: Response;
        try {
            res = await fetch(`${API_BASE}/user/ringtone`, {
                method: 'POST',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                body: formData
            });
        } catch (err) {
            throw new Error('Network error: Could not reach the server');
        }
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || `Upload failed (${res.status})`);
        }
        return res.json();
    },
    changePassword: (currentPassword: string, newPassword: string) =>
        request('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }),

    // Medicines
    searchMedicines: (q: string) => request(`/medicines/search?q=${encodeURIComponent(q)}`),
    getMedicine: (id: string) => request(`/medicines/${id}`),

    // Reminders
    getReminders: () => request('/reminders'),
    createReminder: (data: any) =>
        request('/reminders', { method: 'POST', body: JSON.stringify(data) }),
    updateReminder: (id: string, data: any) =>
        request(`/reminders/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteReminder: (id: string) =>
        request(`/reminders/${id}`, { method: 'DELETE' }),

    // Inventory
    getInventory: () => request('/user/inventory'),
    addToInventory: (data: any) =>
        request('/user/inventory', { method: 'POST', body: JSON.stringify(data) }),
    updateInventory: (id: string, data: any) =>
        request(`/user/inventory/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteInventory: (id: string) =>
        request(`/user/inventory/${id}`, { method: 'DELETE' }),
    importMedicines: (data: { medicines: any[], scanId?: string }) =>
        request('/user/inventory/import', { method: 'POST', body: JSON.stringify(data) }),

    // History
    getHistory: () => request('/user/history'),
    logIntake: (medicineName: string, status: string) =>
        request('/user/history', { method: 'POST', body: JSON.stringify({ medicineName, status }) }),

    // OCR Scan
    scanPrescription: async (formData: FormData) => {
        const token = getToken();
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        // Do NOT set Content-Type — browser sets multipart boundary automatically
        let res: Response;
        try {
            res = await fetch(`${API_BASE}/ocr/scan`, {
                method: 'POST',
                headers,
                body: formData,
            });
        } catch {
            throw new Error('Network error: Could not reach the server');
        }
        if (res.status === 401) {
            clearToken();
            window.location.href = '/login';
            throw new Error('Unauthorized');
        }
        const contentType = res.headers.get('content-type') || '';
        let data: any;
        if (contentType.includes('application/json')) {
            try {
                data = await res.json();
            } catch {
                throw new Error('Invalid JSON response from scan server');
            }
        } else {
            throw new Error('Server returned non-JSON response. The API server may be unavailable.');
        }
        if (!res.ok) throw new Error(data.error || 'Scan failed');
        return data;
    },

    // Chat
    chat: (message: string) =>
        request('/chat', { method: 'POST', body: JSON.stringify({ message }) }),
};
