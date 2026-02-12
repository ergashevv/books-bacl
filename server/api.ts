import cors from 'cors';
import { createHash, randomInt, randomUUID } from 'crypto';
import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import path from 'path';
import { Pool } from 'pg';
import { Telegraf, Context } from 'telegraf';
import fs from 'fs';

const app = express();

// Optimize Express settings for memory efficiency
app.set('trust proxy', 1); // Trust first proxy
app.set('x-powered-by', false); // Remove X-Powered-By header to save bandwidth
app.set('etag', true); // Enable ETag for better caching
app.set('env', process.env.NODE_ENV || 'production');

// Optimize CORS - only allow necessary origins
app.use(cors({
    origin: true, // Allow all origins for now, can be restricted later
    credentials: true,
    maxAge: 86400 // Cache preflight for 24 hours
}));

// Optimize JSON parser - limit body size to prevent memory issues
app.use(express.json({ 
    limit: '1mb', // Reduced from default 100kb to prevent large payloads
    strict: true 
}));

// Optimize URL encoded parser
app.use(express.urlencoded({ 
    extended: true, 
    limit: '1mb',
    parameterLimit: 50 // Limit number of parameters
}));

// Ensure uploads directories exist
const uploadsDir = path.join(process.cwd(), 'uploads');
const coversDir = path.join(uploadsDir, 'covers');
const pdfsDir = path.join(uploadsDir, 'pdfs');

[uploadsDir, coversDir, pdfsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`✅ Created directory: ${dir}`);
    }
});

// Static files with cache optimization and CORS headers
app.use('/uploads', express.static(uploadsDir, {
    maxAge: '1d', // Cache static files for 1 day
    etag: true,
    lastModified: true,
    setHeaders: (res, path) => {
        // CORS headers for all static files
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        
        // Set cache headers for images
        if (path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.png') || path.endsWith('.webp')) {
            res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
        }
        // PDFs should not be cached as aggressively
        if (path.endsWith('.pdf')) {
            res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour
            res.setHeader('Content-Type', 'application/pdf');
        }
    }
}));

// Debug endpoint to check if file exists
app.get('/api/check-file', async (req, res) => {
    const { path: filePath } = req.query;
    if (!filePath || typeof filePath !== 'string') {
        return res.status(400).json({ error: 'Path parameter is required' });
    }
    
    try {
        // Remove leading slash if present
        const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
        const fullPath = path.join(process.cwd(), cleanPath);
        
        // Security check - ensure path is within uploads directory
        if (!fullPath.startsWith(uploadsDir)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        const exists = fs.existsSync(fullPath);
        const stats = exists ? fs.statSync(fullPath) : null;
        
        res.json({
            exists,
            path: filePath,
            fullPath: fullPath,
            size: stats?.size || 0,
            uploadsDir: uploadsDir,
            filesInDir: exists ? fs.readdirSync(path.dirname(fullPath)).length : 0
        });
    } catch (e) {
        console.error('File check error:', e);
        res.status(500).json({ error: 'Failed to check file', details: String(e) });
    }
});

// Multer Setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const type = req.query.type === 'cover' ? 'covers' : 'pdfs';
        const dir = path.join(process.cwd(), 'uploads', type);
        
        // Ensure directory exists
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

// File size limits to prevent memory issues on 512MB server
// PDF: max 50MB, Cover images: max 5MB
const upload = multer({ 
    storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max (for PDFs)
    }
});

// Connection Pool - Maximum memory optimization for 512MB server
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 2, // Keep at 2 for memory efficiency
    min: 0, // Don't keep idle connections
    idleTimeoutMillis: 5000, // Reduced to 5 seconds - close idle connections faster
    connectionTimeoutMillis: 2000,
    statement_timeout: 10000, // Kill queries after 10 seconds
    query_timeout: 10000,
    // Optimize for memory
    keepAlive: true,
    keepAliveInitialDelayMillis: 0,
});

// Helper function using pool with memory optimization
async function query(text: string, params?: any[]) {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        
        // Log slow queries (only in development or if very slow)
        if (duration > 2000) {
            console.warn(`⚠️  Slow query (${duration}ms):`, text.substring(0, 100));
        }
        
        // Return only necessary data to reduce memory
        return res;
    } catch (error) {
        console.error('❌ Query error:', error);
        throw error;
    }
}

function normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('998') && digits.length === 12) {
        return `+${digits}`;
    }
    if (digits.length === 9) {
        return `+998${digits}`;
    }
    if (digits.length === 12 && digits.startsWith('998')) {
        return `+${digits}`;
    }
    return '';
}

function buildOtpHash(phone: string, otpCode: string): string {
    const salt = process.env.OTP_HASH_SALT || 'book-otp-salt';
    return createHash('sha256').update(`${phone}:${otpCode}:${salt}`).digest('hex');
}

let eskizTokenCache: { token: string; expiresAt: number } | null = null;

async function getEskizToken(): Promise<string> {
    const now = Date.now();
    if (eskizTokenCache && eskizTokenCache.expiresAt > now + 60_000) {
        return eskizTokenCache.token;
    }

    const email = process.env.ESKIZ_EMAIL;
    const password = process.env.ESKIZ_PASSWORD;
    if (!email || !password) {
        throw new Error('Eskiz credentials are not configured');
    }

    const body = new URLSearchParams({ email, password });
    const response = await fetch('https://notify.eskiz.uz/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString()
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Eskiz auth failed: ${text}`);
    }

    const data: any = await response.json();
    const token = data?.data?.token;
    if (!token) {
        throw new Error('Eskiz token not found in response');
    }

    eskizTokenCache = {
        token,
        expiresAt: now + 25 * 60 * 1000
    };
    return token;
}

async function sendEskizSms(phone: string, otpCode: string): Promise<void> {
    const from = process.env.ESKIZ_FROM || '4546';
    const message = `Book ilovasi uchun tasdiqlash kodi: ${otpCode}. Kod 5 daqiqa amal qiladi.`;
    const token = await getEskizToken();

    const body = new URLSearchParams({
        mobile_phone: phone.replace('+', ''),
        message,
        from,
        callback_url: process.env.ESKIZ_CALLBACK_URL || ''
    });

    const response = await fetch('https://notify.eskiz.uz/api/message/sms/send', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body.toString()
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Eskiz SMS send failed: ${text}`);
    }

    const data: any = await response.json();
    const status = data?.status;
    if (status !== 'waiting' && status !== 'success') {
        throw new Error(`Eskiz SMS rejected: ${JSON.stringify(data)}`);
    }
}

async function ensureSmsOtpTable() {
    await query(`
        CREATE TABLE IF NOT EXISTS sms_otp_requests (
            id SERIAL PRIMARY KEY,
            phone TEXT NOT NULL,
            otp_hash TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            attempts INTEGER NOT NULL DEFAULT 0,
            ip_address TEXT,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            verified_at TIMESTAMP
        )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_sms_otp_phone_created ON sms_otp_requests(phone, created_at DESC)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_sms_otp_ip_created ON sms_otp_requests(ip_address, created_at DESC)`);
}

// Cleanup function for pool
process.on('SIGTERM', async () => {
    console.log('🛑 Closing database pool...');
    await pool.end();
});

process.on('SIGINT', async () => {
    console.log('🛑 Closing database pool...');
    await pool.end();
});

// Create auth request
app.post('/api/create-auth-request', async (req, res) => {
    try {
        const requestUuid = randomUUID();
        await query(
            `INSERT INTO auth_requests (request_uuid, status) VALUES ($1, 'pending')`,
            [requestUuid]
        );
        res.json({ request_uuid: requestUuid });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to create auth request' });
    }
});

app.post('/api/auth/sms/request-otp', async (req, res) => {
    const rawPhone = typeof req.body?.phone === 'string' ? req.body.phone : '';
    const phone = normalizePhone(rawPhone);
    if (!phone) {
        return res.status(400).json({ error: 'Telefon raqam noto\'g\'ri formatda' });
    }

    const ipAddress = req.ip || req.socket.remoteAddress || '';
    const cooldownSeconds = 120;
    const maxPerPhoneHour = 5;
    const maxPerPhoneDay = 12;
    const maxPerIpHour = 20;

    try {
        const recentPhone = await query(
            `SELECT created_at
             FROM sms_otp_requests
             WHERE phone = $1
             ORDER BY created_at DESC
             LIMIT 1`,
            [phone]
        );

        if (recentPhone.rows.length > 0) {
            const lastCreatedAt = new Date(recentPhone.rows[0].created_at).getTime();
            const secondsSinceLast = Math.floor((Date.now() - lastCreatedAt) / 1000);
            if (secondsSinceLast < cooldownSeconds) {
                return res.status(429).json({
                    error: 'Yangi kod yuborish uchun biroz kuting',
                    retry_after_seconds: cooldownSeconds - secondsSinceLast
                });
            }
        }

        const phoneHourCount = await query(
            `SELECT COUNT(*)::int AS count
             FROM sms_otp_requests
             WHERE phone = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
            [phone]
        );
        if (phoneHourCount.rows[0].count >= maxPerPhoneHour) {
            return res.status(429).json({ error: 'Bu raqamga juda ko\'p kod yuborildi. 1 soatdan keyin urinib ko\'ring.' });
        }

        const phoneDayCount = await query(
            `SELECT COUNT(*)::int AS count
             FROM sms_otp_requests
             WHERE phone = $1 AND created_at > NOW() - INTERVAL '1 day'`,
            [phone]
        );
        if (phoneDayCount.rows[0].count >= maxPerPhoneDay) {
            return res.status(429).json({ error: 'Kunlik SMS limiti tugadi. Ertaga qayta urinib ko\'ring.' });
        }

        const ipHourCount = await query(
            `SELECT COUNT(*)::int AS count
             FROM sms_otp_requests
             WHERE ip_address = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
            [ipAddress]
        );
        if (ipHourCount.rows[0].count >= maxPerIpHour) {
            return res.status(429).json({ error: 'Juda ko\'p so\'rov yuborildi. Birozdan keyin qayta urinib ko\'ring.' });
        }

        const otpCode = `${randomInt(100000, 1000000)}`;
        const otpHash = buildOtpHash(phone, otpCode);
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        await sendEskizSms(phone, otpCode);

        const insertResult = await query(
            `INSERT INTO sms_otp_requests (phone, otp_hash, status, attempts, ip_address, expires_at)
             VALUES ($1, $2, 'pending', 0, $3, $4)
             RETURNING id`,
            [phone, otpHash, ipAddress, expiresAt]
        );

        res.json({
            ok: true,
            request_id: insertResult.rows[0].id,
            expires_in_seconds: 300,
            retry_after_seconds: cooldownSeconds
        });
    } catch (e: any) {
        console.error('SMS OTP request error:', e);
        res.status(500).json({ error: 'SMS yuborishda xatolik yuz berdi' });
    }
});

app.post('/api/auth/sms/verify-otp', async (req, res) => {
    const rawPhone = typeof req.body?.phone === 'string' ? req.body.phone : '';
    const rawCode = typeof req.body?.code === 'string' ? req.body.code : '';
    const phone = normalizePhone(rawPhone);
    const code = rawCode.replace(/\D/g, '');

    if (!phone || code.length !== 6) {
        return res.status(400).json({ error: 'Telefon yoki kod noto\'g\'ri' });
    }

    try {
        const otpResult = await query(
            `SELECT id, otp_hash, attempts, expires_at
             FROM sms_otp_requests
             WHERE phone = $1 AND status = 'pending'
             ORDER BY created_at DESC
             LIMIT 1`,
            [phone]
        );

        if (otpResult.rows.length === 0) {
            return res.status(400).json({ error: 'Faol kod topilmadi. Qayta kod so\'rang.' });
        }

        const otpRequest = otpResult.rows[0];
        if (new Date(otpRequest.expires_at).getTime() < Date.now()) {
            await query(`UPDATE sms_otp_requests SET status = 'expired' WHERE id = $1`, [otpRequest.id]);
            return res.status(400).json({ error: 'Kodning amal qilish muddati tugagan' });
        }

        if (Number(otpRequest.attempts) >= 5) {
            await query(`UPDATE sms_otp_requests SET status = 'failed' WHERE id = $1`, [otpRequest.id]);
            return res.status(429).json({ error: 'Juda ko\'p noto\'g\'ri urinish. Qayta kod so\'rang.' });
        }

        const inputHash = buildOtpHash(phone, code);
        if (inputHash !== otpRequest.otp_hash) {
            await query(`UPDATE sms_otp_requests SET attempts = attempts + 1 WHERE id = $1`, [otpRequest.id]);
            return res.status(400).json({ error: 'Kod noto\'g\'ri' });
        }

        await query(
            `UPDATE sms_otp_requests
             SET status = 'verified', verified_at = NOW()
             WHERE id = $1`,
            [otpRequest.id]
        );

        const smsTelegramId = `sms:${phone}`;
        let userResult = await query(`SELECT * FROM users WHERE phone = $1 LIMIT 1`, [phone]);

        if (userResult.rows.length === 0) {
            userResult = await query(`SELECT * FROM users WHERE telegram_id = $1 LIMIT 1`, [smsTelegramId]);
        }

        let user;
        if (userResult.rows.length > 0) {
            user = userResult.rows[0];
            await query(`UPDATE users SET phone = $1, last_login_at = NOW() WHERE id = $2`, [phone, user.id]);
            const updatedUser = await query(`SELECT * FROM users WHERE id = $1`, [user.id]);
            user = updatedUser.rows[0];
        } else {
            const inserted = await query(
                `INSERT INTO users (telegram_id, full_name, username, phone, avatar_url, last_login_at)
                 VALUES ($1, $2, $3, $4, $5, NOW())
                 RETURNING *`,
                [smsTelegramId, `SMS user ${phone}`, null, phone, null]
            );
            user = inserted.rows[0];
        }

        return res.json({
            status: 'completed',
            user: {
                id: user.id,
                telegram_id: user.telegram_id,
                full_name: user.full_name,
                username: user.username,
                phone: user.phone,
                avatar_url: user.avatar_url,
                role: user.role
            }
        });
    } catch (e) {
        console.error('SMS OTP verify error:', e);
        return res.status(500).json({ error: 'Kodni tekshirishda xatolik yuz berdi' });
    }
});

// Check auth request status
app.get('/api/check-auth', async (req, res) => {
    const { request_uuid } = req.query;
    try {
        const result = await query(
            `SELECT ar.*, u.* FROM auth_requests ar
             LEFT JOIN users u ON ar.user_id = u.id
             WHERE ar.request_uuid = $1`,
            [request_uuid]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Request not found' });
        }

        const row = result.rows[0];

        if (row.status === 'completed' && row.user_id) {
            res.json({
                status: 'completed',
                user: {
                    id: row.user_id,
                    telegram_id: row.telegram_id,
                    full_name: row.full_name,
                    username: row.username,
                    phone: row.phone,
                    avatar_url: row.avatar_url,
                    role: row.role
                }
            });
        } else {
            res.json({ status: row.status });
        }
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Internal error' });
    }
});

// Get user by ID - optimized field selection
app.get('/api/user', async (req, res) => {
    const { id } = req.query;
    if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    try {
        // Select only necessary fields to reduce memory
        const result = await query(
            `SELECT id, telegram_id, full_name, username, phone, avatar_url, role, created_at, last_login_at 
             FROM users WHERE id = $1`, 
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Cache user data for 1 minute
        res.setHeader('Cache-Control', 'private, max-age=60');
        res.json(result.rows[0]);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Internal error' });
    }
});

// Get all books - optimized with pagination and field selection
app.get('/api/books', async (req, res) => {
    const { category, search, page = 1, limit = 20 } = req.query;
    
    // Validate and limit pagination to prevent memory issues
    const pageNum = Math.max(1, Math.min(Number(page) || 1, 100)); // Max 100 pages
    const limitNum = Math.max(1, Math.min(Number(limit) || 20, 100)); // Max 100 items per page
    
    try {
        // Select only necessary fields to reduce memory usage
        let sql = `SELECT id, title, author, description, cover_url, pdf_path, price, rating, is_premium, category_id, created_at FROM books WHERE 1=1`;
        const params: any[] = [];
        let paramIdx = 1;

        if (search && typeof search === 'string' && search.length > 0 && search.length < 100) {
            sql += ` AND (title ILIKE $${paramIdx} OR author ILIKE $${paramIdx})`;
            params.push(`%${search}%`);
            paramIdx++;
        }

        if (category && typeof category === 'string') {
            sql += ` AND category_id = $${paramIdx}`;
            params.push(category);
            paramIdx++;
        }

        const offset = (pageNum - 1) * limitNum;
        sql += ` ORDER BY created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
        params.push(limitNum, offset);

        const result = await query(sql, params);
        
        // Set cache headers for GET requests
        res.setHeader('Cache-Control', 'private, max-age=60'); // Cache for 1 minute
        res.json(result.rows);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Internal error' });
    }
});

// Get book by ID - optimized with field selection and caching
app.get('/api/books/:id', async (req, res) => {
    const { id } = req.params;
    if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Invalid book ID' });
    }
    
    try {
        // Select only necessary fields
        const result = await query(
            `SELECT id, title, author, description, cover_url, pdf_path, price, rating, is_premium, category_id, created_at, updated_at 
             FROM books WHERE id = $1`, 
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Book not found' });
        }
        
        // Cache book data for 5 minutes (books don't change often)
        res.setHeader('Cache-Control', 'public, max-age=300');
        res.json(result.rows[0]);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Internal error' });
    }
});

// Upload Endpoint - optimized with async file operations
app.post('/api/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Additional size check for cover images (5MB limit)
    const type = req.query.type === 'cover' ? 'covers' : 'pdfs';
    if (type === 'covers' && req.file.size > 5 * 1024 * 1024) {
        // Delete uploaded file asynchronously to not block
        fs.unlink(req.file.path, (err) => {
            if (err) console.error('Failed to delete file:', err);
        });
        return res.status(400).json({ error: 'Cover image size exceeds 5MB limit' });
    }
    
    // Validate file extension for security
    const allowedExtensions = type === 'covers' 
        ? ['.jpg', '.jpeg', '.png', '.webp'] 
        : ['.pdf'];
    const ext = path.extname(req.file.originalname).toLowerCase();
    
    if (!allowedExtensions.includes(ext)) {
        // Delete invalid file
        fs.unlink(req.file.path, (err) => {
            if (err) console.error('Failed to delete file:', err);
        });
        return res.status(400).json({ 
            error: `Invalid file type. Allowed: ${allowedExtensions.join(', ')}` 
        });
    }
    
    const filePath = `/uploads/${type}/${req.file.filename}`;
    res.json({ url: filePath });
});

// Add a new book
app.post('/api/books', async (req, res) => {
    const { title, author, description, cover_url, pdf_path, price, rating, is_premium, category_id } = req.body;
    
    // Validate required fields
    if (!title || !author || !pdf_path) {
        return res.status(400).json({ error: 'Title, author, and pdf_path are required' });
    }
    
    // Validate category_id exists
    if (category_id) {
        try {
            const categoryCheck = await query('SELECT id FROM categories WHERE id = $1', [category_id]);
            if (categoryCheck.rows.length === 0) {
                return res.status(400).json({ 
                    error: `Category with id ${category_id} does not exist. Please select a valid category.` 
                });
            }
        } catch (e) {
            console.error('Category validation error:', e);
            return res.status(500).json({ error: 'Failed to validate category' });
        }
    }
    
    try {
        const result = await query(
            `INSERT INTO books (title, author, description, cover_url, pdf_path, price, rating, is_premium, category_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [title, author, description, cover_url, pdf_path, price || 0, rating || 0, is_premium || false, category_id]
        );
        res.status(201).json(result.rows[0]);
    } catch (e: any) {
        console.error('Book creation error:', e);
        // Check for foreign key constraint violation
        if (e.code === '23503') {
            return res.status(400).json({ 
                error: `Invalid category_id. The category does not exist in the database.` 
            });
        }
        res.status(500).json({ error: 'Failed to add book' });
    }
});

// Update an existing book
app.put('/api/books/:id', async (req, res) => {
    const { id } = req.params;
    const { title, author, description, cover_url, pdf_path, price, rating, is_premium, category_id } = req.body;
    
    // Validate category_id exists if provided
    if (category_id) {
        try {
            const categoryCheck = await query('SELECT id FROM categories WHERE id = $1', [category_id]);
            if (categoryCheck.rows.length === 0) {
                return res.status(400).json({ 
                    error: `Category with id ${category_id} does not exist. Please select a valid category.` 
                });
            }
        } catch (e) {
            console.error('Category validation error:', e);
            return res.status(500).json({ error: 'Failed to validate category' });
        }
    }
    
    try {
        const result = await query(
            `UPDATE books SET 
                title = $1, author = $2, description = $3, cover_url = $4, 
                pdf_path = $5, price = $6, rating = $7, is_premium = $8, category_id = $9,
                updated_at = NOW()
             WHERE id = $10 RETURNING *`,
            [title, author, description, cover_url, pdf_path, price, rating, is_premium, category_id, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Book not found' });
        }

        res.json(result.rows[0]);
    } catch (e: any) {
        console.error('Book update error:', e);
        // Check for foreign key constraint violation
        if (e.code === '23503') {
            return res.status(400).json({ 
                error: `Invalid category_id. The category does not exist in the database.` 
            });
        }
        res.status(500).json({ error: 'Failed to update book' });
    }
});

// Delete a book
app.delete('/api/books/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await query('DELETE FROM books WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Book not found' });
        }
        res.json({ message: 'Book deleted successfully', id: result.rows[0].id });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to delete book' });
    }
});

// Get categories - optimized with caching
app.get('/api/categories', async (req, res) => {
    try {
        // Select only necessary fields
        let result = await query('SELECT id, name FROM categories ORDER BY name');
        
        // If no categories exist, create default ones
        if (result.rows.length === 0) {
            console.log('⚠️  No categories found, creating default categories...');
            await query(`
                INSERT INTO categories (name) VALUES 
                ('Fiction'), ('Technology'), ('Business'), ('Science'), ('History'), 
                ('Biography'), ('Self-Help'), ('Education'), ('Art'), ('Other')
                ON CONFLICT (name) DO NOTHING
            `);
            result = await query('SELECT id, name FROM categories ORDER BY name');
            console.log(`✅ Created ${result.rows.length} default categories`);
        }
        
        // Categories don't change often, cache for 5 minutes
        res.setHeader('Cache-Control', 'public, max-age=300');
        res.json(result.rows);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Internal error' });
    }
});

// Create a new category
app.post('/api/categories', async (req, res) => {
    const { name } = req.body;
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Category name is required' });
    }
    
    if (name.length > 100) {
        return res.status(400).json({ error: 'Category name must be less than 100 characters' });
    }
    
    try {
        const result = await query(
            'INSERT INTO categories (name) VALUES ($1) RETURNING id, name',
            [name.trim()]
        );
        res.status(201).json(result.rows[0]);
    } catch (e: any) {
        console.error('Category creation error:', e);
        // Check for unique constraint violation
        if (e.code === '23505') {
            return res.status(400).json({ error: 'Category with this name already exists' });
        }
        res.status(500).json({ error: 'Failed to create category' });
    }
});

// Delete a category
app.delete('/api/categories/:id', async (req, res) => {
    const { id } = req.params;
    
    if (!id || isNaN(Number(id))) {
        return res.status(400).json({ error: 'Invalid category ID' });
    }
    
    try {
        // Check if category is used by any books
        const booksCheck = await query('SELECT COUNT(*) FROM books WHERE category_id = $1', [id]);
        if (booksCheck.rows[0].count > 0) {
            return res.status(400).json({ 
                error: `Cannot delete category. It is used by ${booksCheck.rows[0].count} book(s).` 
            });
        }
        
        const result = await query('DELETE FROM categories WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Category not found' });
        }
        res.json({ message: 'Category deleted successfully', id: result.rows[0].id });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to delete category' });
    }
});

// Initialize Telegram Bot (lazy load to save memory)
let bot: Telegraf | null = null;

function initializeBot() {
    if (!process.env.BOT_TOKEN) {
        console.log('⚠️  BOT_TOKEN not found. Bot functionality disabled.');
        return;
    }

    try {
        bot = new Telegraf(process.env.BOT_TOKEN);
        console.log('🤖 Telegram Bot initializing...');

    bot.start(async (ctx: Context) => {
            if (!ctx.message || !ctx.from) {
                return ctx.reply('👋 Xush kelibsiz! Ilovani oching va "Telegram orqali kirish" tugmasini bosing.');
            }

            const startPayload = 'text' in ctx.message && ctx.message.text?.startsWith('/start ') 
                ? ctx.message.text.split(' ')[1] 
                : null;
            const telegramUser = ctx.from;

            if (!startPayload) {
                return ctx.reply('👋 Xush kelibsiz! Ilovani oching va "Telegram orqali kirish" tugmasini bosing.');
            }

            try {
                // 1. Validate auth request
                const requestResult = await query(
                    `SELECT * FROM auth_requests WHERE request_uuid = $1 AND status = 'pending'`,
                    [startPayload]
                );

                if (requestResult.rows.length === 0) {
                    return ctx.reply('❌ Yaroqsiz yoki muddati o\'tgan login so\'rovi. Iltimos, ilovadan qayta urinib ko\'ring.');
                }

                // 2. Find or Create User
                const telegramId = telegramUser.id.toString();
                let userResult = await query(`SELECT * FROM users WHERE telegram_id = $1`, [telegramId]);

                let userId;
                let userPhone;

                if (userResult.rows.length > 0) {
                    userId = userResult.rows[0].id;
                    userPhone = userResult.rows[0].phone;
                    await query(`UPDATE users SET last_login_at = NOW() WHERE id = $1`, [userId]);
                } else {
                    const fullName = `${telegramUser.first_name} ${telegramUser.last_name || ''}`.trim();
                    const username = telegramUser.username || null;
                    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(telegramUser.first_name)}`;

                    const insertResult = await query(
                        `INSERT INTO users (telegram_id, full_name, username, avatar_url, last_login_at) 
                         VALUES ($1, $2, $3, $4, NOW()) 
                         RETURNING id`,
                        [telegramId, fullName, username, avatarUrl]
                    );

                    userId = insertResult.rows[0].id;
                }

                // Check if phone number is missing
                if (!userPhone) {
                    await query(
                        `UPDATE auth_requests SET telegram_user_id = $1, user_id = $2 WHERE request_uuid = $3`,
                        [telegramId, userId, startPayload]
                    );
                    
                    return ctx.reply('👋 Salom! Davom etish uchun telefon raqamingizni ulashing:', {
                        reply_markup: {
                            keyboard: [[{ text: '📱 Telefon raqamini ulashish', request_contact: true }]],
                            resize_keyboard: true,
                            one_time_keyboard: true
                        }
                    });
                }

                // 3. Update auth request
                await query(
                    `UPDATE auth_requests 
                     SET status = 'completed', telegram_user_id = $1, user_id = $2 
                     WHERE request_uuid = $3`,
                    [telegramId, userId, startPayload]
                );

                ctx.reply(`✅ Muvaffaqiyatli kirildi, ${telegramUser.first_name}! Endi ilovaga qaytishingiz mumkin.`, {
                    reply_markup: { remove_keyboard: true }
                });

            } catch (e) {
                console.error('❌ Error:', e);
                ctx.reply('❌ Xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.');
            }
        });

        // Handle contact (phone number) sharing
        bot.on('contact', async (ctx: Context) => {
            if (!ctx.message || !('contact' in ctx.message) || !ctx.from) {
                return;
            }
            
            const contact = ctx.message.contact;
            const telegramId = ctx.from.id.toString();

            if (contact.user_id !== ctx.from.id) {
                return ctx.reply('❌ Iltimos, o\'z kontaktingizni ulashing.');
            }

            try {
                // Update phone number
                await query(`UPDATE users SET phone = $1 WHERE telegram_id = $2`, [contact.phone_number, telegramId]);

                // Find pending auth request for this user
                const authRequestResult = await query(
                    `SELECT * FROM auth_requests 
                     WHERE telegram_user_id = $1 AND status = 'pending' 
                     ORDER BY created_at DESC 
                     LIMIT 1`,
                    [telegramId]
                );

                if (authRequestResult.rows.length > 0) {
                    const requestUuid = authRequestResult.rows[0].request_uuid;
                    const userResult = await query(`SELECT id FROM users WHERE telegram_id = $1`, [telegramId]);

                    if (userResult.rows.length > 0) {
                        const userId = userResult.rows[0].id;
                        await query(
                            `UPDATE auth_requests 
                             SET status = 'completed', user_id = $1 
                             WHERE request_uuid = $2`,
                            [userId, requestUuid]
                        );

                        ctx.reply(`✅ Rahmat! Telefon raqamingiz (${contact.phone_number}) saqlandi. Endi ilovadan login qilishingiz mumkin.`, {
                            reply_markup: { remove_keyboard: true }
                        });
                    } else {
                        ctx.reply(`✅ Rahmat! Telefon raqamingiz (${contact.phone_number}) saqlandi.`, {
                            reply_markup: { remove_keyboard: true }
                        });
                    }
                } else {
                    ctx.reply(`✅ Rahmat! Telefon raqamingiz (${contact.phone_number}) saqlandi.`, {
                        reply_markup: { remove_keyboard: true }
                    });
                }
            } catch (e) {
                console.error('❌ Update phone error:', e);
                ctx.reply('❌ Telefon raqamini saqlashda xatolik yuz berdi.');
            }
        });

        // Error handling
        bot.catch((err: any, ctx: Context) => {
            console.error('❌ Bot error:', err);
            ctx.reply('❌ Xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.');
        });

        // Launch bot
        bot.launch()
            .then(() => {
                console.log('✅ Telegram Bot is running successfully!');
            })
            .catch((error: any) => {
                console.error('❌ Failed to launch bot:', error);
            });

        // Graceful shutdown
        process.once('SIGINT', () => {
            console.log('🛑 Shutting down bot...');
            bot?.stop('SIGINT');
        });

        process.once('SIGTERM', () => {
            console.log('🛑 Shutting down bot...');
            bot?.stop('SIGTERM');
        });
    } catch (error) {
        console.error('❌ Failed to initialize Telegram Bot:', error);
        console.log('⚠️  Server will continue without bot functionality');
    }
}

// Delay bot initialization to save memory during startup
// Increased delay to allow server to stabilize and free up memory after startup
if (process.env.BOT_TOKEN) {
    // Use setImmediate for better event loop management
    setTimeout(() => {
        // Force garbage collection before bot init (if available)
        if (global.gc) {
            global.gc();
            // Wait a bit more after GC
            setTimeout(() => {
                initializeBot();
            }, 1000);
        } else {
            initializeBot();
        }
    }, 5000); // Wait 5 seconds after server starts to free up memory
}

// Cleanup bot on shutdown
process.on('SIGTERM', () => {
    if (bot) {
        console.log('🛑 Stopping Telegram bot...');
        bot.stop('SIGTERM');
    }
});

process.on('SIGINT', () => {
    if (bot) {
        console.log('🛑 Stopping Telegram bot...');
        bot.stop('SIGINT');
    }
});

// Request timeout middleware - prevent hanging requests
app.use((req, res, next) => {
    req.setTimeout(30000); // 30 second timeout
    res.setTimeout(30000);
    next();
});

// Global error handler - prevent memory leaks from unhandled errors
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('❌ Unhandled error:', err);
    if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

ensureSmsOtpTable().catch((e) => {
    console.error('Failed to ensure sms_otp_requests table:', e);
});

const PORT = Number(process.env.PORT) || 3001;
const server = app.listen(PORT, '0.0.0.0', () => {
    const memUsage = process.memoryUsage();
    console.log(`🚀 API Server running on port ${PORT}`);
    console.log(`💾 Memory usage: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB / ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`);
    console.log(`📊 RSS: ${Math.round(memUsage.rss / 1024 / 1024)}MB`);
    
    // Optimize server settings for memory
    server.keepAliveTimeout = 65000; // 65 seconds
    server.headersTimeout = 66000; // 66 seconds
    
    // Monitor memory every 3 minutes (more frequent for better control)
    const memoryMonitor = setInterval(() => {
        const mem = process.memoryUsage();
        const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
        const rssMB = Math.round(mem.rss / 1024 / 1024);
        const heapTotalMB = Math.round(mem.heapTotal / 1024 / 1024);
        
        console.log(`📊 Memory - Heap: ${heapUsedMB}MB/${heapTotalMB}MB, RSS: ${rssMB}MB`);
        
        // Aggressive memory management
        if (rssMB > 380) {
            console.warn(`⚠️  High memory usage: ${rssMB}MB (threshold: 380MB)`);
            // Force garbage collection if available
            if (global.gc) {
                global.gc();
                const afterGC = process.memoryUsage();
                console.log(`🧹 GC triggered - RSS after: ${Math.round(afterGC.rss / 1024 / 1024)}MB`);
            }
        }
        
        // Emergency: if memory exceeds 450MB, log warning
        if (rssMB > 450) {
            console.error(`🚨 CRITICAL: Memory usage very high: ${rssMB}MB`);
        }
    }, 3 * 60 * 1000); // Every 3 minutes
    
    // Cleanup on shutdown
    process.on('SIGTERM', () => {
        clearInterval(memoryMonitor);
        server.close(() => {
            console.log('🛑 Server closed');
            process.exit(0);
        });
    });
    
    process.on('SIGINT', () => {
        clearInterval(memoryMonitor);
        server.close(() => {
            console.log('🛑 Server closed');
            process.exit(0);
        });
    });
});
