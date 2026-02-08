import { create } from 'zustand';
import { storage } from '../utils/storage';

// API URL - Render backend
const API_URL = 'https://books-bacl-1.onrender.com';
interface AppUser {
    id: number;
    telegram_id: string;
    full_name?: string;
    username?: string;
    phone?: string;
    avatar_url?: string;
    role?: 'user' | 'admin';
}

interface UserSession {
    user: AppUser;
}

interface AuthState {
    session: UserSession | null;
    loading: boolean;
    signInWithTelegramRealtime: () => Promise<string>;
    signOut: () => Promise<void>;
    checkSession: () => Promise<void>;
}

// Simple polling function to check auth request status
async function pollAuthRequest(requestUuid: string): Promise<AppUser | null> {
    const maxAttempts = 60; // 60 seconds
    const interval = 1000; // 1 second

    for (let i = 0; i < maxAttempts; i++) {
        try {
            // In a real app, you'd call your backend API here
            // For now, we'll use a simple fetch to a serverless function or API route
            const response = await fetch(`${API_URL}/api/check-auth?request_uuid=${requestUuid}`);

            if (response.ok) {
                const data = await response.json();
                if (data.status === 'completed' && data.user) {
                    return data.user;
                }
            }
        } catch (e) {
            console.error('Polling error:', e);
        }

        await new Promise(resolve => setTimeout(resolve, interval));
    }

    return null;
}

export const useAuthStore = create<AuthState>((set) => ({
    session: null,
    loading: false,

    checkSession: async () => {
        set({ loading: true });

        const storedUserId = await storage.getItem('app_user_id');

        if (storedUserId) {
            try {
                // Fetch user from API
                const response = await fetch(`${API_URL}/api/user?id=${storedUserId}`);
                if (response.ok) {
                    const user = await response.json();
                    set({ session: { user }, loading: false });
                } else {
                    await storage.removeItem('app_user_id');
                    set({ session: null, loading: false });
                }
            } catch (e) {
                console.error('Check session error:', e);
                await storage.removeItem('app_user_id');
                set({ session: null, loading: false });
            }
        } else {
            set({ session: null, loading: false });
        }
    },

    signInWithTelegramRealtime: async () => {
        try {
            set({ loading: true });

            // 1. Create auth request
            const response = await fetch(`${API_URL}/api/create-auth-request`, {
                method: 'POST'
            });

            if (!response.ok) throw new Error('Failed to create auth request');

            const { request_uuid } = await response.json();
            const botUsername = 'mybooks_parol_bot';
            const deepLink = `https://t.me/${botUsername}?start=${request_uuid}`;

            // 2. Start polling for completion (in background)
            setTimeout(async () => {
                const user = await pollAuthRequest(request_uuid);

                if (user) {
                    await storage.setItem('app_user_id', user.id.toString());
                    set({ session: { user }, loading: false });
                } else {
                    set({ loading: false });
                }
            }, 0);

            return deepLink;
        } catch (e) {
            console.error(e);
            set({ loading: false });
            throw e;
        }
    },

    signOut: async () => {
        await storage.removeItem('app_user_id');
        set({ session: null });
    }
}));
