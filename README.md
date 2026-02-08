# Online Kitob + Audiokitob App

This is a React Native (Expo) mobile application for reading books and listening to audiobooks.
Built with Expo, TypeScript, Supabase (Auth + DB + Storage).

## 🚀 Setup Instructions

### 1. Prerequisites
- Node.js & npm installed
- Supabase Account created

### 2. Database Setup (Supabase)
1. Go to your Supabase Project Dashboard -> **SQL Editor**.
2. Open `schema.sql` from this project root.
3. Copy the entire content and run it in the SQL Editor.
   - This creates all Tables (books, audio_tracks, etc.)
   - Enables RLS policies.
   - Sets up Triggers.
   
4. **Storage Bucket**:
   - Go to **Storage** -> Create a new bucket named `library`.
   - Make it **Private** (recommended) or Public (easier for MVP).
   - If using Private, you must configure policies. **For MVP, make it Public** and upload files manually.
   - Folder structure inside bucket:
     - `covers/` (bookId.jpg)
     - `pdfs/` (bookId.pdf)
     - `audios/` (bookId/trackId.mp3)

### 3. Environment Configuration
1. Go to `src/api/config.ts`.
2. Replace the placeholders with your Supabase credentials:
   ```typescript
   export const SUPABASE_URL = "https://your-project.supabase.co";
   export const SUPABASE_ANON_KEY = "your-anon-key";
   ```

### 4. Run the App
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the Expo server:
   ```bash
   npx expo start
   ```
3. Scan the QR code with your phone (Expo Go) or run on Simulator (`i` for iOS, `a` for Android).

## 📱 Features (MVP)
- **Auth**: Login (Magic Link), Signup (Email/Password).
- **Home**: List of books, Search, Category Filter.
- **Book Detail**: View info, Read PDF (via Browser), Listen (coming soon).
- **Profile**: Logout.
- **Favorites**: Add/remove books.
- **Progress**: Tracks last opened time (basic).

## 📂 Project Structure
- `src/api`: Supabase client & config.
- `src/components`: Reusable UI (BookCard, Button, Input).
- `src/screens`: App screens (Auth, Home, Profile).
- `src/store`: State management (Zustand).
- `src/navigation`: Navigation setup.
- `src/types`: TypeScript definitions.

## ⚠️ Notes
- No Admin Panel: Upload data via Supabase Dashboard.
- PDF Reader: Opens in system browser/webview (MVP).
- Audio Player: UI button exists, logic is placeholder (Phase 2).
