import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, setToken, clearToken, getStoredUser, setStoredUser } from './api';
import { supabase } from './supabase';

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

function toUser(u: any): User {
    return {
        id: u.id,
        email: u.email || '',
        fullName: u.user_metadata?.name || u.fullName || null,
    };
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshUser = async () => {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
            setUser(toUser(data.session.user));
            setToken(data.session.access_token);
        } else {
            setUser(null);
        }
    };

    useEffect(() => {
        // 1. Load Session on startup
        const loadSession = async () => {
            const { data } = await supabase.auth.getSession();
            if (data.session?.user) {
                setUser(toUser(data.session.user));
                setToken(data.session.access_token);
            } else {
                setUser(null);
            }
            setLoading(false);
        };

        loadSession();

        // 2. Listen for auth state changes (login, logout, token refresh, email confirmation)
        const { data: listener } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                if (session?.user) {
                    setUser(toUser(session.user));
                    setToken(session.access_token);
                } else {
                    setUser(null);
                }
                setLoading(false);
            }
        );

        return () => {
            listener.subscription.unsubscribe();
        };
    }, []);

    const login = async (email: string, password: string) => {
        // Try Supabase auth first
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (!error && data.user && data.session) {
            setUser(toUser(data.user));
            setToken(data.session.access_token);
            setStoredUser(toUser(data.user));
            return;
        }

        // Fall back to legacy Node.js API for older accounts
        try {
            const result = await api.login(email, password);
            setToken(result.token);
            setUser(result.user);
            setStoredUser(result.user);
        } catch {
            // If both fail, throw the Supabase error (more descriptive)
            if (error) throw error;
            throw new Error('Invalid email or password');
        }
    };

    const signup = async (email: string, password: string, fullName: string) => {
        setLoading(true);
        try {
            const result = await api.signup(email, password, fullName, '');
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
        setStoredUser(null as any);
        supabase.auth.signOut();
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
