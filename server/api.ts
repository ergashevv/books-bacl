import cors from 'cors';
import { randomUUID } from 'crypto';
import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import path from 'path';
import { Client } from 'pg';
import { Telegraf } from 'telegraf';

const app = express();
app.use(cors());
app.use(express.json());

// Static files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Multer Setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const type = req.query.type === 'cover' ? 'covers' : 'pdfs';
        const dir = path.join(process.cwd(), 'uploads', type);
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

async function getDbClient() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    await client.connect();
    return client;
}

// Create auth request
app.post('/api/create-auth-request', async (req, res) => {
    const client = await getDbClient();

    try {
        const requestUuid = randomUUID();

        await client.query(
            `INSERT INTO auth_requests (request_uuid, status) VALUES ($1, 'pending')`,
            [requestUuid]
        );

        res.json({ request_uuid: requestUuid });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to create auth request' });
    } finally {
        await client.end();
    }
});

// Check auth request status
app.get('/api/check-auth', async (req, res) => {
    const { request_uuid } = req.query;
    const client = await getDbClient();

    try {
        const result = await client.query(
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
    } finally {
        await client.end();
    }
});

// Get user by ID
app.get('/api/user', async (req, res) => {
    const { id } = req.query;
    const client = await getDbClient();

    try {
        const result = await client.query(
            `SELECT * FROM users WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(result.rows[0]);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Internal error' });
    } finally {
        await client.end();
    }
});

// Get all books
app.get('/api/books', async (req, res) => {
    const { category, search, page = 1, limit = 20 } = req.query;
    const client = await getDbClient();

    try {
        let query = 'SELECT * FROM books WHERE 1=1';
        const params: any[] = [];
        let paramIdx = 1;

        if (search) {
            query += ` AND (title ILIKE $${paramIdx} OR author ILIKE $${paramIdx})`;
            params.push(`%${search}%`);
            paramIdx++;
        }

        if (category) {
            query += ` AND category_id = $${paramIdx}`;
            params.push(category);
            paramIdx++;
        }

        const offset = (Number(page) - 1) * Number(limit);
        query += ` ORDER BY created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
        params.push(limit, offset);

        const result = await client.query(query, params);
        res.json(result.rows);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Internal error' });
    } finally {
        await client.end();
    }
});

// Get book by ID
app.get('/api/books/:id', async (req, res) => {
    const { id } = req.params;
    const client = await getDbClient();

    try {
        const result = await client.query('SELECT * FROM books WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Book not found' });
        }
        res.json(result.rows[0]);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Internal error' });
    } finally {
        await client.end();
    }
});

// Upload Endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    const type = req.query.type === 'cover' ? 'covers' : 'pdfs';
    const filePath = `/uploads/${type}/${req.file.filename}`;
    res.json({ url: filePath });
});

// Add a new book
app.post('/api/books', async (req, res) => {
    const { title, author, description, cover_url, pdf_path, price, rating, is_premium, category_id } = req.body;
    const client = await getDbClient();

    try {
        const result = await client.query(
            `INSERT INTO books (title, author, description, cover_url, pdf_path, price, rating, is_premium, category_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [title, author, description, cover_url, pdf_path, price || 0, rating || 0, is_premium || false, category_id]
        );
        res.status(201).json(result.rows[0]);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to add book' });
    } finally {
        await client.end();
    }
});

// Update an existing book
app.put('/api/books/:id', async (req, res) => {
    const { id } = req.params;
    const { title, author, description, cover_url, pdf_path, price, rating, is_premium, category_id } = req.body;
    const client = await getDbClient();

    try {
        const result = await client.query(
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
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to update book' });
    } finally {
        await client.end();
    }
});

// Delete a book
app.delete('/api/books/:id', async (req, res) => {
    const { id } = req.params;
    const client = await getDbClient();

    try {
        const result = await client.query('DELETE FROM books WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Book not found' });
        }
        res.json({ message: 'Book deleted successfully', id: result.rows[0].id });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to delete book' });
    } finally {
        await client.end();
    }
});

// Get categories
app.get('/api/categories', async (req, res) => {
    const client = await getDbClient();

    try {
        const result = await client.query('SELECT * FROM categories ORDER BY name');
        res.json(result.rows);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Internal error' });
    } finally {
        await client.end();
    }
});

// Initialize Telegram Bot
let bot: Telegraf | null = null;

if (process.env.BOT_TOKEN) {
    try {
        bot = new Telegraf(process.env.BOT_TOKEN);
        console.log('🤖 Telegram Bot initializing...');

        // Database helper for bot
        async function getBotDbClient() {
            const client = new Client({
                connectionString: process.env.DATABASE_URL,
                ssl: { rejectUnauthorized: false }
            });
            await client.connect();
            return client;
        }

        bot.start(async (ctx) => {
            const startPayload = ctx.payload;
            const telegramUser = ctx.from;

            if (!startPayload) {
                return ctx.reply('👋 Xush kelibsiz! Ilovani oching va "Telegram orqali kirish" tugmasini bosing.');
            }

            console.log(`📥 Login request: ${startPayload} from ${telegramUser.first_name} (${telegramUser.id})`);

            const client = await getBotDbClient();

            try {
                // 1. Validate auth request
                console.log(`🔍 Validating auth request ${startPayload}...`);
                const requestResult = await client.query(
                    `SELECT * FROM auth_requests WHERE request_uuid = $1 AND status = 'pending'`,
                    [startPayload]
                );

                if (requestResult.rows.length === 0) {
                    console.log('❌ No valid request found');
                    return ctx.reply('❌ Yaroqsiz yoki muddati o\'tgan login so\'rovi. Iltimos, ilovadan qayta urinib ko\'ring.');
                }

                console.log('✅ Auth request validated');

                // 2. Find or Create User
                const telegramId = telegramUser.id.toString();
                console.log(`👤 Looking up user with telegram_id: ${telegramId}...`);

                let userResult = await client.query(
                    `SELECT * FROM users WHERE telegram_id = $1`,
                    [telegramId]
                );

                let userId;
                let userPhone;

                if (userResult.rows.length > 0) {
                    console.log('✅ User exists, updating last login...');
                    userId = userResult.rows[0].id;
                    userPhone = userResult.rows[0].phone;

                    await client.query(
                        `UPDATE users SET last_login_at = NOW() WHERE id = $1`,
                        [userId]
                    );
                } else {
                    console.log('🆕 Creating new user...');
                    const fullName = `${telegramUser.first_name} ${telegramUser.last_name || ''}`.trim();
                    const username = telegramUser.username || null;
                    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(telegramUser.first_name)}`;

                    const insertResult = await client.query(
                        `INSERT INTO users (telegram_id, full_name, username, avatar_url, last_login_at) 
                         VALUES ($1, $2, $3, $4, NOW()) 
                         RETURNING id`,
                        [telegramId, fullName, username, avatarUrl]
                    );

                    userId = insertResult.rows[0].id;
                    console.log(`✅ User created with ID: ${userId}`);
                }

                // Check if phone number is missing
                if (!userPhone) {
                    // Store the request_uuid in user's session context for later use
                    await client.query(
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
                await client.query(
                    `UPDATE auth_requests 
                     SET status = 'completed', telegram_user_id = $1, user_id = $2 
                     WHERE request_uuid = $3`,
                    [telegramId, userId, startPayload]
                );

                console.log(`✅ Login successful for user ${userId}`);
                ctx.reply(`✅ Muvaffaqiyatli kirildi, ${telegramUser.first_name}! Endi ilovaga qaytishingiz mumkin.`, {
                    reply_markup: { remove_keyboard: true }
                });

            } catch (e) {
                console.error('❌ Error:', e);
                ctx.reply('❌ Xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.');
            } finally {
                await client.end();
            }
        });

        // Handle contact (phone number) sharing
        bot.on('contact', async (ctx) => {
            const contact = ctx.message.contact;
            const telegramId = ctx.from.id.toString();

            if (contact.user_id !== ctx.from.id) {
                return ctx.reply('❌ Iltimos, o\'z kontaktingizni ulashing.');
            }

            console.log(`📱 Received phone number for ${telegramId}: ${contact.phone_number}`);

            const client = await getBotDbClient();
            try {
                // Update phone number
                await client.query(
                    `UPDATE users SET phone = $1 WHERE telegram_id = $2`,
                    [contact.phone_number, telegramId]
                );

                // Find pending auth request for this user
                const authRequestResult = await client.query(
                    `SELECT * FROM auth_requests 
                     WHERE telegram_user_id = $1 AND status = 'pending' 
                     ORDER BY created_at DESC 
                     LIMIT 1`,
                    [telegramId]
                );

                if (authRequestResult.rows.length > 0) {
                    const requestUuid = authRequestResult.rows[0].request_uuid;
                    
                    // Get user ID
                    const userResult = await client.query(
                        `SELECT id FROM users WHERE telegram_id = $1`,
                        [telegramId]
                    );

                    if (userResult.rows.length > 0) {
                        const userId = userResult.rows[0].id;
                        
                        // Complete the auth request
                        await client.query(
                            `UPDATE auth_requests 
                             SET status = 'completed', user_id = $1 
                             WHERE request_uuid = $2`,
                            [userId, requestUuid]
                        );

                        console.log(`✅ Auth request completed after phone number save`);
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
            } finally {
                await client.end();
            }
        });

        // Error handling
        bot.catch((err, ctx) => {
            console.error('❌ Bot error:', err);
            ctx.reply('❌ Xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.');
        });

        // Launch bot
        bot.launch()
            .then(() => {
                console.log('✅ Telegram Bot is running successfully!');
            })
            .catch((error) => {
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
} else {
    console.log('⚠️  BOT_TOKEN not found. Bot functionality disabled.');
}

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 API Server running on port ${PORT}`);
});
