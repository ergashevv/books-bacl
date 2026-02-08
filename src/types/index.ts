export type Profile = {
    id: number;
    full_name?: string;
    avatar_url?: string;
    updated_at?: string;
    created_at?: string;
    role?: 'user' | 'admin';
};

export type Book = {
    id: number;
    title: string;
    author?: string;
    description?: string;
    cover_url?: string;
    pdf_path?: string;
    epub_path?: string;
    txt_path?: string;
    mobi_path?: string;
    file_type?: 'pdf' | 'epub' | 'txt' | 'mobi';
    file_path?: string; // Generic file path (fallback)
    language?: string;
    is_premium: boolean;
    price?: number;
    rating?: number;
    views: number;
    category_id?: number;
    created_at: string;
    updated_at: string;
};

export type Category = {
    id: number;
    name: string;
    created_at: string;
};

export type BookCategory = {
    book_id: number;
    category_id: number;
};

export type AudioTrack = {
    id: number;
    book_id: number;
    title?: string;
    audio_path: string;
    duration_seconds?: number;
    order_index?: number;
    created_at: string;
};

export type Subscription = {
    user_id: number;
    plan?: string;
    expires_at?: string;
    provider?: string;
    status?: string;
};

// UI Related Types
export type NavigationItem = {
    name: string;
    icon: string;
    screen: string;
};

export type BookProgress = {
    last_page?: number;
    last_opened_at?: string;
};

export type AudioProgress = {
    position_seconds: number;
    completed: boolean;
};

export interface UserSession {
    user: {
        id: number;
        email?: string;
        user_metadata?: {
            full_name?: string;
            avatar_url?: string;
        };
        role?: 'user' | 'admin';
    };
    access_token: string;
}
