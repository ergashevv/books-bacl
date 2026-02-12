# Book Reading Application - Complete Project Specification

## Project Overview

Build a comprehensive cross-platform mobile application (iOS, Android) for reading books and listening to audiobooks. The project consists of **TWO SEPARATE PROJECTS**:

1. **Backend API Server** - REST API built with **Node.js (Express)** OR **Python (FastAPI/Flask)** - choose the best option for Render.com deployment
2. **Mobile App** - Flutter application for iOS and Android

The app should support multiple book formats (PDF, EPUB, TXT, MOBI), provide an excellent reading experience with customizable themes and settings, and integrate with the REST API backend hosted on Render.com.

## Architecture Decision

### Backend Technology Choice

**Recommendation: Choose Node.js (Express.js)**

**Reasons:**
- Better compatibility with Render.com deployment
- Easier file handling with Multer
- Simpler PostgreSQL integration
- Better performance for I/O operations (file serving)
- Easier to maintain and debug
- Better community support for this use case

**Alternative: Python (FastAPI)**
- Use if team has strong Python expertise
- Better for async operations
- Type safety with Pydantic
- Modern async/await patterns

**Final Decision**: Choose Node.js (Express) unless there's a specific reason to use Python.

### Tech Stack

#### Backend:
- **Framework**: Express.js (Node.js) OR FastAPI (Python)
- **Runtime**: Node.js 18+ LTS OR Python 3.11+
- **Database**: PostgreSQL (Neon Database or Render PostgreSQL)
- **File Storage**: Local file system on server (`/uploads` directory)
- **Authentication**: Custom Telegram-based auth + optional JWT tokens
- **Deployment**: Render.com Web Service (512MB RAM, optimized for memory)

#### Frontend:
- **Framework**: Flutter 3.x with Dart
- **State Management**: Provider or Riverpod
- **Minimum Flutter Version**: 3.16.0+
- **Minimum Dart Version**: 3.2.0+
- **Deployment**: iOS App Store & Google Play Store

## Project Structure

### Two Separate Projects:

```
book-backend/          ← Backend API Server (NEW PROJECT - SEPARATE REPO)
├── src/
│   ├── routes/       ← API routes (auth, books, categories, upload)
│   ├── controllers/  ← Business logic
│   ├── models/       ← Database models/types
│   ├── middleware/   ← Auth, error handling, validation
│   ├── utils/        ← Helper functions (db, file handling)
│   └── server.ts     ← Main entry point (Express app)
├── uploads/          ← File storage (persistent disk on Render)
│   ├── covers/       ← Book cover images
│   ├── pdfs/         ← PDF files
│   ├── epub/         ← EPUB files
│   ├── txt/          ← TXT files
│   └── mobi/         ← MOBI files
├── package.json      ← Node.js dependencies
├── tsconfig.json     ← TypeScript config
├── .env.example      ← Environment variables template
├── render.yaml       ← Render.com deployment config
├── .gitignore
└── README.md         ← Setup and deployment instructions

book-mobile/          ← Flutter Mobile App (NEW PROJECT - SEPARATE REPO)
├── lib/
│   ├── main.dart     ← App entry point
│   ├── models/       ← Data models (Book, Category, User, etc.)
│   ├── services/     ← API services (BookService, AuthService, etc.)
│   ├── providers/    ← State management (Provider/Riverpod)
│   ├── screens/      ← UI screens (Home, Reader, Profile, etc.)
│   ├── widgets/      ← Reusable widgets (BookCard, ReaderControls, etc.)
│   ├── utils/        ← Helpers (constants, validators, etc.)
│   └── config/       ← App configuration (API URLs, etc.)
├── assets/
│   ├── images/       ← App images, icons
│   └── fonts/        ← Custom fonts (if any)
├── pubspec.yaml      ← Flutter dependencies
├── ios/              ← iOS native configuration
├── android/          ← Android native configuration
├── .gitignore
└── README.md         ← Setup and build instructions
```

**CRITICAL**: Backend and Mobile are **completely separate projects**. They should be:
- Developed independently
- Have separate Git repositories
- Deployed separately
- Communicate only through REST API
- Have their own documentation

## Backend API Server - Complete Specification

### Project Setup

#### Node.js Setup (Recommended):
```bash
# Create new directory
mkdir book-backend
cd book-backend

# Initialize Node.js project
npm init -y

# Install production dependencies
npm install express cors dotenv pg multer telegraf

# Install development dependencies
npm install -D @types/node @types/express @types/cors @types/multer @types/pg typescript ts-node nodemon

# Create project structure
mkdir -p src/{routes,controllers,models,middleware,utils}
mkdir -p uploads/{covers,pdfs,epub,txt,mobi}

# Initialize TypeScript
npx tsc --init
```

#### Python Setup (Alternative):
```bash
# Create new directory
mkdir book-backend
cd book-backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install fastapi uvicorn psycopg2-binary python-multipart python-dotenv pydantic python-telegram-bot

# Create project structure
mkdir -p app/{routes,controllers,models,middleware,utils}
mkdir -p uploads/{covers,pdfs,epub,txt,mobi}
```

### Render.com Deployment Configuration

#### For Node.js (render.yaml):
```yaml
services:
  - type: web
    name: books-api
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    plan: free  # or starter for better performance
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        sync: false  # Set in Render dashboard
      - key: PORT
        value: 10000
      - key: BOT_TOKEN
        sync: false  # Telegram bot token
    disk:
      name: uploads-disk
      mountPath: /opt/render/project/src/uploads
      sizeGB: 1
```

#### For Python (render.yaml):
```yaml
services:
  - type: web
    name: books-api
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn app.main:app --host 0.0.0.0 --port $PORT
    plan: free
    envVars:
      - key: PYTHON_VERSION
        value: 3.11.0
      - key: DATABASE_URL
        sync: false
      - key: PORT
        value: 10000
      - key: BOT_TOKEN
        sync: false
    disk:
      name: uploads-disk
      mountPath: /opt/render/project/src/uploads
      sizeGB: 1
```

### Backend Requirements & Constraints

#### Memory Optimization (512MB RAM limit):
1. **Database Connection Pool**:
   - Maximum 2-3 connections
   - Close idle connections after 5 seconds
   - Connection timeout: 2 seconds
   - Query timeout: 10 seconds

2. **Query Optimization**:
   - Always SELECT only needed fields (never SELECT *)
   - Use LIMIT and OFFSET for pagination
   - Maximum 100 items per page
   - Use database indexes for frequently queried fields
   - Implement query result caching (in-memory, 1 minute)

3. **File Handling**:
   - Stream large file responses (don't load entire file in memory)
   - File size limits: 50MB for PDFs, 5MB for cover images
   - Clean up old/temporary files periodically
   - Use Render.com persistent disk for file storage

4. **Request Optimization**:
   - Enable response compression (gzip)
   - Set appropriate cache headers
   - Limit request body size (1MB for JSON)
   - Implement rate limiting (optional, for production)

### Database Schema

#### Tables:

1. **users**
   ```sql
   id SERIAL PRIMARY KEY
   telegram_id BIGINT UNIQUE
   full_name TEXT
   username TEXT
   phone TEXT
   avatar_url TEXT
   role TEXT DEFAULT 'user' -- 'user' or 'admin'
   created_at TIMESTAMPTZ DEFAULT NOW()
   last_login_at TIMESTAMPTZ
   ```

2. **books**
   ```sql
   id SERIAL PRIMARY KEY
   title TEXT NOT NULL
   author TEXT
   description TEXT
   cover_url TEXT -- URL to cover image
   pdf_path TEXT -- Path to PDF file
   epub_path TEXT -- Path to EPUB file
   txt_path TEXT -- Path to TXT file
   mobi_path TEXT -- Path to MOBI file
   language TEXT DEFAULT 'uz'
   is_premium BOOLEAN DEFAULT FALSE
   price NUMERIC
   rating NUMERIC
   views INT DEFAULT 0
   category_id INT REFERENCES categories(id)
   created_at TIMESTAMPTZ DEFAULT NOW()
   updated_at TIMESTAMPTZ DEFAULT NOW()
   ```

3. **categories**
   ```sql
   id SERIAL PRIMARY KEY
   name TEXT UNIQUE NOT NULL
   created_at TIMESTAMPTZ DEFAULT NOW()
   ```

4. **book_categories** (Junction table for many-to-many)
   ```sql
   book_id INT REFERENCES books(id) ON DELETE CASCADE
   category_id INT REFERENCES categories(id) ON DELETE CASCADE
   PRIMARY KEY (book_id, category_id)
   ```

5. **favorites**
   ```sql
   user_id INT REFERENCES users(id) ON DELETE CASCADE
   book_id INT REFERENCES books(id) ON DELETE CASCADE
   created_at TIMESTAMPTZ DEFAULT NOW()
   PRIMARY KEY (user_id, book_id)
   ```

6. **user_book_progress**
   ```sql
   user_id INT REFERENCES users(id) ON DELETE CASCADE
   book_id INT REFERENCES books(id) ON DELETE CASCADE
   last_page INT
   last_opened_at TIMESTAMPTZ DEFAULT NOW()
   PRIMARY KEY (user_id, book_id)
   ```

7. **audio_tracks**
   ```sql
   id SERIAL PRIMARY KEY
   book_id INT REFERENCES books(id) ON DELETE CASCADE
   title TEXT
   audio_path TEXT
   duration_seconds INT
   order_index INT DEFAULT 1
   created_at TIMESTAMPTZ DEFAULT NOW()
   ```

8. **user_audio_progress**
   ```sql
   user_id INT REFERENCES users(id) ON DELETE CASCADE
   audio_track_id INT REFERENCES audio_tracks(id) ON DELETE CASCADE
   position_seconds INT DEFAULT 0
   completed BOOLEAN DEFAULT FALSE
   updated_at TIMESTAMPTZ DEFAULT NOW()
   PRIMARY KEY (user_id, audio_track_id)
   ```

9. **subscriptions**
   ```sql
   user_id INT REFERENCES users(id) ON DELETE CASCADE PRIMARY KEY
   plan TEXT
   expires_at TIMESTAMPTZ
   provider TEXT -- 'click', 'payme', 'iap'
   status TEXT DEFAULT 'inactive' -- 'active', 'inactive', 'cancelled'
   ```

10. **auth_requests**
    ```sql
    id SERIAL PRIMARY KEY
    request_uuid UUID UNIQUE
    user_id INT REFERENCES users(id) NULLABLE
    status TEXT DEFAULT 'pending' -- 'pending' or 'completed'
    created_at TIMESTAMPTZ DEFAULT NOW()
    ```

### API Endpoints Specification

#### Base URL
```
Production: https://books-api.onrender.com
Local: http://localhost:3000
```

#### Authentication Endpoints

**1. Create Auth Request**
```
POST /api/create-auth-request
Response: { request_uuid: string }
```
- Generates unique UUID for Telegram authentication
- Stores in `auth_requests` table with status 'pending'
- Returns UUID for QR code generation

**2. Check Auth Status**
```
GET /api/check-auth?request_uuid={uuid}
Response: {
  status: 'pending' | 'completed',
  user?: {
    id: number,
    telegram_id: number,
    full_name: string,
    username?: string,
    phone?: string,
    avatar_url?: string,
    role: 'user' | 'admin'
  }
}
```
- Poll this endpoint every 2 seconds from mobile app
- Returns user data when Telegram bot completes authentication

**3. Get User Info**
```
GET /api/user?id={userId}
Response: User object
Headers: Cache-Control: private, max-age=60
```

#### Books Endpoints

**1. Get Books List**
```
GET /api/books?page={page}&limit={limit}&category={categoryId}&search={query}

Query Parameters:
  - page: number (default: 1, max: 100)
  - limit: number (default: 20, max: 100)
  - category: number (optional)
  - search: string (optional, searches title and author)

Response: Array<Book>
Headers: Cache-Control: private, max-age=60

Book Object:
{
  id: number,
  title: string,
  author?: string,
  description?: string,
  cover_url?: string,
  pdf_path?: string,
  epub_path?: string,
  txt_path?: string,
  mobi_path?: string,
  file_type?: 'pdf' | 'epub' | 'txt' | 'mobi',
  file_path?: string,
  language?: string,
  is_premium: boolean,
  price?: number,
  rating?: number,
  views: number,
  category_id?: number,
  created_at: string,
  updated_at: string
}
```

**2. Get Book Detail**
```
GET /api/books/{bookId}
Response: Book object with full details
Headers: Cache-Control: private, max-age=300
```

**3. Create Book (Admin)**
```
POST /api/books
Headers: Content-Type: application/json
Body: {
  title: string,
  author?: string,
  description?: string,
  category_id?: number,
  is_premium: boolean,
  price?: number,
  language?: string
}
Response: Created Book object
```

**4. Update Book (Admin)**
```
PUT /api/books/{bookId}
Headers: Content-Type: application/json
Body: Partial<Book>
Response: Updated Book object
```

**5. Delete Book (Admin)**
```
DELETE /api/books/{bookId}
Response: 200 OK
```

#### Categories Endpoints

**1. Get Categories**
```
GET /api/categories
Response: Array<Category>
Headers: Cache-Control: public, max-age=3600

Category Object:
{
  id: number,
  name: string,
  created_at: string
}
```

#### File Upload Endpoints

**1. Upload Book File**
```
POST /api/upload?type=cover|pdf|epub|txt|mobi
Content-Type: multipart/form-data
Body: file (max 50MB for PDFs, max 5MB for covers)
Response: {
  filename: string,
  path: string,
  url: string
}
```

**2. Check File Exists**
```
GET /api/check-file?path={filePath}
Response: {
  exists: boolean,
  path: string,
  fullPath: string,
  size: number
}
```

#### Static File Serving
```
GET /uploads/{type}/{filename}
Types: covers, pdfs, epub, txt, mobi
Headers:
  - CORS: Enabled
  - Cache-Control: public, max-age=86400 (images), max-age=3600 (PDFs)
  - Content-Type: application/pdf (for PDFs)
```

### Backend Implementation Details

#### Database Connection (Node.js)
```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 2,  // Limit for 512MB RAM
  min: 0,
  idleTimeoutMillis: 5000,
  connectionTimeoutMillis: 2000,
  statement_timeout: 10000,
  query_timeout: 10000,
});
```

#### File Upload (Node.js - Multer)
```typescript
import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = req.query.type || 'pdfs';
    const dir = path.join(process.cwd(), 'uploads', type);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});
```

#### API Response Format

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message"
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## Flutter Mobile App - Complete Specification

### Project Setup

```bash
# Create new Flutter project
flutter create book_mobile
cd book_mobile

# Project will be created with iOS and Android folders
```

### Key Dependencies (pubspec.yaml)

```yaml
dependencies:
  flutter:
    sdk: flutter
  
  # State Management
  provider: ^6.1.1
  # OR
  riverpod: ^2.4.9
  
  # HTTP Client
  dio: ^5.4.0
  
  # Local Storage
  flutter_secure_storage: ^9.0.0
  shared_preferences: ^2.2.2
  hive: ^2.2.3
  hive_flutter: ^1.1.0
  
  # PDF Reader
  pdfrx: ^0.9.0
  # OR
  syncfusion_flutter_pdfviewer: ^24.1.41
  
  # EPUB Reader
  epubx: ^3.0.0
  
  # Image Caching
  cached_network_image: ^3.3.0
  
  # File Caching
  flutter_cache_manager: ^3.3.1
  
  # UI Components
  flutter_svg: ^2.0.9
  shimmer: ^3.0.0
  
  # Navigation
  go_router: ^13.0.0
  
  # Utils
  intl: ^0.19.0
  uuid: ^4.2.1
  path_provider: ^2.1.1
```

### Core Features & Functionality

#### 1. Authentication Flow

**Telegram QR Code Authentication:**
1. User opens app → Generate QR code with `request_uuid`
2. User scans QR code with Telegram bot
3. Bot authenticates user and links `request_uuid` to user account
4. App polls `/api/check-auth` endpoint every 2 seconds
5. When status becomes 'completed', store user session locally
6. Use user ID for authenticated requests

**Session Management:**
- Store user session in secure storage (`flutter_secure_storage`)
- Include user ID, token (if JWT implemented), and profile data
- Auto-logout on token expiration
- Refresh token mechanism (if implemented)

#### 2. Home Screen

**Book List Display:**
- Grid/List view toggle
- Pagination: Load 20 books per page
- Infinite scroll: Load more when scrolling to bottom
- Pull-to-refresh functionality
- Search bar: Real-time search by title/author
- Category filter: Dropdown/chips to filter by category
- Sort options: Newest, Popular (by views), Rating

**Book Card Component:**
- Cover image (cached, placeholder if missing)
- Title (truncated if too long)
- Author name
- Rating stars (if available)
- Premium badge (if is_premium)
- Views count
- Tap to navigate to Book Detail

#### 3. Book Detail Screen

**Display Information:**
- Large cover image
- Title, Author, Description
- Category tags
- Rating display
- Views count
- File format indicators (PDF, EPUB, TXT, MOBI)
- Premium status

**Actions:**
- **Read Book** button → Navigate to Reader Screen
- **Add to Favorites** button (heart icon)
- **Share** button (share book link)
- **Download** button (if offline reading supported)

#### 4. Reader Screen (Core Feature)

**Supported Formats:**

**PDF Reader:**
- Use `pdfrx` package (native, fast)
- Page-by-page navigation
- Zoom in/out (pinch gesture)
- Scroll through pages
- Jump to page number
- Page counter: "Page X of Y"
- Progress bar at bottom

**EPUB Reader:**
- Use `epubx` package
- Reflowable text rendering
- Chapter navigation
- Table of Contents (TOC) sidebar
- Text selection and highlighting
- Customizable font size and line height

**TXT Reader:**
- Custom text renderer using Flutter Text widgets
- Word-based pagination algorithm
- Scrollable text view
- Customizable font size (12px - 24px)
- Customizable line height (1.2 - 2.5)
- Page estimation based on word count (~500 words per page)

**MOBI Reader:**
- Use available MOBI reader packages
- Similar to EPUB functionality

**Reading Features:**

**Themes:**
1. **Paper Theme** - Light background, dark text
2. **Sepia Theme** - Warm beige background, brown text
3. **Dark Theme** - Dark background, light text

**Typography Settings:**
- Font size: 12px - 24px (adjustable slider)
- Line height: 1.2 - 2.5 (adjustable slider, TXT only)
- Font family: System default, Serif, Sans-serif

**Navigation:**
- Swipe gestures: Swipe left/right to change pages
- Previous/Next buttons: Bottom navigation bar
- Page jump: Tap page number to jump to specific page
- Progress bar: Visual progress indicator
- Page counter: "Page X / Y" display

**Reading Progress:**
- Auto-save current page to local storage
- Sync progress to backend (if endpoint exists)
- Resume reading from last page
- Show "Continue Reading" badge on book card

**Bookmarks:**
- Add bookmark at current page/chapter
- View all bookmarks in sidebar
- Jump to bookmarked location
- Delete bookmarks
- Store locally and sync to backend

**Immersive Mode:**
- Full-screen reading (hide status bar, navigation bar)
- Tap center to toggle controls visibility
- Minimal UI for distraction-free reading
- Exit immersive mode: Swipe down or tap back

#### 5. Favorites Screen

- List of favorited books
- Grid/List view
- Remove from favorites
- Empty state: "No favorites yet"
- Sync with backend

#### 6. Profile Screen

- User avatar and name
- Reading statistics:
  - Total books read
  - Total reading time
  - Current streak
  - Favorite categories
- Settings:
  - Theme preference (app-wide)
  - Language selection
  - Notifications toggle
  - Cache management
  - About section
- Logout button

### UI/UX Design Guidelines

**Colors:**
- Primary: #34A853 (Green)
- Secondary: #4285F4 (Blue)
- Error: #EA4335 (Red)
- Background Light: #FFFFFF
- Background Dark: #1E293B

**Navigation Structure:**
```
Bottom Navigation (Main Tabs):
├── Home (Book List)
├── Categories
├── Favorites
└── Profile

Stack Navigation:
├── Home Screen
│   ├── Book Detail Screen
│   │   └── Reader Screen
│   └── Search Results Screen
├── Categories Screen
│   └── Category Books Screen
├── Favorites Screen
│   └── Book Detail Screen
└── Profile Screen
    ├── Settings Screen
    └── Reading Statistics Screen
```

## Development Workflow

### Phase 1: Backend Development

1. **Setup Backend Project**
   - Choose technology (Node.js recommended)
   - Initialize project structure
   - Setup database connection
   - Configure Render.com deployment

2. **Implement Core APIs**
   - Authentication endpoints
   - Books CRUD operations
   - Categories endpoints
   - File upload endpoints
   - Static file serving

3. **Testing**
   - Test all endpoints with Postman/Thunder Client
   - Test file uploads
   - Test database queries
   - Optimize for memory usage

4. **Deploy to Render.com**
   - Create Render.com account
   - Connect GitHub repository
   - Configure environment variables
   - Deploy and test live API

### Phase 2: Flutter Mobile App Development

1. **Setup Flutter Project**
   - Create new Flutter project
   - Configure iOS and Android
   - Setup project structure
   - Install dependencies

2. **Implement Core Features**
   - Authentication flow
   - Home screen with book list
   - Book detail screen
   - Reader screen (PDF, EPUB, TXT)
   - Profile and settings

3. **Testing**
   - Test on iOS simulator
   - Test on Android emulator
   - Test on physical devices
   - Test API integration

4. **Build & Deploy**
   - Build iOS app (Xcode)
   - Build Android app (Gradle)
   - Submit to App Store
   - Submit to Google Play

## Important Notes

### Backend Considerations

1. **Render.com Limitations**:
   - 512MB RAM limit - optimize memory usage
   - Free tier has cold starts - implement health checks
   - Persistent disk for file storage
   - Environment variables in dashboard

2. **File Storage**:
   - Use Render.com persistent disk
   - Implement file cleanup (old files)
   - Monitor disk usage
   - Consider CDN for production (Cloudflare, etc.)

3. **Database**:
   - Use Neon Database (free tier available)
   - Or Render.com PostgreSQL
   - Implement connection pooling
   - Use indexes for performance

### Mobile App Considerations

1. **API Integration**:
   - Handle network errors gracefully
   - Implement retry logic
   - Cache responses locally
   - Show loading states

2. **File Formats**:
   - PDF: Use `pdfrx` package (native, fast)
   - EPUB: Use `epubx` package
   - TXT: Custom text renderer
   - MOBI: Use available packages

3. **Performance**:
   - Lazy load images
   - Paginate book lists
   - Cache book covers
   - Optimize reader performance

## Summary

This project consists of **two separate applications**:

1. **Backend API Server** - Built with Node.js (Express) OR Python (FastAPI), deployed on Render.com. Handles all business logic, database operations, file storage, and serves the REST API.

2. **Flutter Mobile App** - Cross-platform mobile application for iOS and Android. Provides native reading experience with support for PDF, EPUB, TXT, and MOBI formats. Includes customizable themes, font settings, bookmarks, and reading progress tracking.

**Key Requirements:**
- Backend and Mobile are completely separate projects
- Communication only through REST API
- Backend optimized for Render.com 512MB RAM
- Mobile app optimized for iOS and Android
- Both projects should be production-ready
- Full documentation and deployment guides included

The architecture is scalable, maintainable, and optimized for performance while providing an excellent user experience across all platforms.
