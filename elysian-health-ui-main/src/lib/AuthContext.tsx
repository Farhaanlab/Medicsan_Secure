import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, setToken, clearToken, getStoredUser, setStoredUser } from './api';

interface User {
    id: string;
    email: string;
    fullName: string | null;
    role?: string;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    signup: (email: string, password: string, fullName: string) => Promise<void>;
    logout: () => void;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(getStoredUser());
    const [loading, setLoading] = useState(false);

    const refreshUser = async () => {
        try {
            const userData = await api.getMe();
            setUser(userData);
            setStoredUser(userData);
        } catch {
            setUser(null);
            clearToken();
        }
    };

    // On mount, if we have a stored user, verify token is still valid
    useEffect(() => {
        if (getStoredUser()) {
            refreshUser();
        }
    }, []);

    const login = async (email: string, password: string) => {
        setLoading(true);
        try {
            const result = await api.login(email, password);
            setToken(result.token);
            setUser(result.user);
            setStoredUser(result.user);
        } finally {
            setLoading(false);
        }
    };

    const signup = async (email: string, password: string, fullName: string) => {
        setLoading(true);
        try {
            const result = await api.signup(email, password, fullName);
            setToken(result.token);
            setUser(result.user);
            setStoredUser(result.user);
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        clearToken();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
