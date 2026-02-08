import { create } from 'zustand';
import { AudioTrack, Book, BookProgress, Category } from '../types';

interface BookState {
    books: Book[];
    categories: Category[];
    favorites: number[];
    userProgress: { [bookId: number]: BookProgress };
    loading: boolean;
    error: string | null;

    fetchBooks: (category?: number, searchTerm?: string, page?: number, limit?: number) => Promise<void>;
    fetchCategories: () => Promise<void>;
    fetchFavorites: () => Promise<void>;
    toggleFavorite: (bookId: number) => Promise<void>;
    updateProgress: (bookId: number, page: number) => Promise<void>;
    getBookDetail: (bookId: number) => Promise<{ book: Book, audio: AudioTrack[], categories: Category[], relatedBooks: Book[] } | null>;
    addBook: (book: Omit<Book, 'id' | 'created_at' | 'views' | 'updated_at'>) => Promise<boolean>;
    updateBook: (id: number, book: Partial<Book>) => Promise<boolean>;
    deleteBook: (id: number) => Promise<boolean>;
}

// API URL - Render backend
const API_URL = 'https://books-bacl-1.onrender.com';

export const useBookStore = create<BookState>((set, get) => ({
    books: [],
    categories: [],
    favorites: [],
    userProgress: {},
    loading: false,
    error: null,

    fetchBooks: async (category, searchTerm, page = 1, limit = 20) => {
        set({ loading: true, error: null });

        try {
            let url = `${API_URL}/api/books?page=${page}&limit=${limit}`;
            if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
            if (category) url += `&category=${category}`;

            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch books');

            const data = await response.json();
            set({ books: data as Book[], loading: false });
        } catch (error: any) {
            set({ error: error.message, loading: false });
        }
    },

    fetchCategories: async () => {
        try {
            const response = await fetch(`${API_URL}/api/categories`);
            if (response.ok) {
                const data = await response.json();
                set({ categories: data });
            }
        } catch (e) {
            console.error('Fetch categories error:', e);
        }
    },

    fetchFavorites: async () => {
        // Implement fetching user's favorites from Neon via API if needed
        // For now, keep it simple as we are migrating core features
    },

    toggleFavorite: async (bookId) => {
        // Implement toggle favorite via API if needed
    },

    updateProgress: async (bookId, page) => {
        // Implement update progress via API if needed
    },

    getBookDetail: async (bookId) => {
        try {
            // 1. Fetch Book info
            const response = await fetch(`${API_URL}/api/books/${bookId}`);
            if (!response.ok) return null;

            const book = await response.json();

            // 2. Fetch Audio Tracks (If we had them in Neon)
            // For now, return empty audio
            const audio: AudioTrack[] = [];

            return { book, audio, categories: [], relatedBooks: [] };
        } catch (e) {
            console.error('Get book detail error:', e);
            return null;
        }
    },

    addBook: async (bookData) => {
        try {
            const response = await fetch(`${API_URL}/api/books`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bookData)
            });
            if (response.ok) {
                const newBook = await response.json();
                set({ books: [newBook, ...get().books] });
                return true;
            }
            return false;
        } catch (e) {
            console.error('Add book error:', e);
            return false;
        }
    },

    updateBook: async (id, bookData) => {
        try {
            const response = await fetch(`${API_URL}/api/books/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bookData)
            });
            if (response.ok) {
                const updatedBook = await response.json();
                set({
                    books: get().books.map(b => b.id === id ? updatedBook : b)
                });
                return true;
            }
            return false;
        } catch (e) {
            console.error('Update book error:', e);
            return false;
        }
    },

    deleteBook: async (id) => {
        try {
            const response = await fetch(`${API_URL}/api/books/${id}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                set({
                    books: get().books.filter(b => b.id !== id)
                });
                return true;
            }
            return false;
        } catch (e) {
            console.error('Delete book error:', e);
            return false;
        }
    }
}));
