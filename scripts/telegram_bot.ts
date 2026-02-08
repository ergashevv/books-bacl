import 'dotenv/config';
import { Client } from 'pg';
import { Telegraf } from 'telegraf';

const BOT_TOKEN = process.env.BOT_TOKEN!;

if (!BOT_TOKEN) {
    console.error('❌ Missing BOT_TOKEN in .env');
    process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

console.log('🤖 Telegram Bot Starting (Neon DB)...');

// Database helper
async function getDbClient() {
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
        return ctx.reply('👋 Welcome! Please open the app and click "Login with Telegram" to start.');
    }

    console.log(`📥 Login request: ${startPayload} from ${telegramUser.first_name} (${telegramUser.id})`);

    const client = await getDbClient();

    try {
        // 1. Validate auth request
        console.log(`🔍 Validating auth request ${startPayload}...`);
        const requestResult = await client.query(
            `SELECT * FROM auth_requests WHERE request_uuid = $1 AND status = 'pending'`,
            [startPayload]
        );

        if (requestResult.rows.length === 0) {
            console.log('❌ No valid request found');
            return ctx.reply('❌ Invalid or expired login request. Please try again from the app.');
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
            return ctx.reply('👋 Hello! To continue, please share your phone number using the button below:', {
                reply_markup: {
                    keyboard: [[{ text: '📱 Share Phone Number', request_contact: true }]],
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
        ctx.reply(`✅ Successfully logged in as ${telegramUser.first_name}! You can return to the app now.`, {
            reply_markup: { remove_keyboard: true }
        });

    } catch (e) {
        console.error('❌ Error:', e);
        ctx.reply('❌ An error occurred.');
    } finally {
        await client.end();
    }
});

// Handle contact (phone number) sharing
bot.on('contact', async (ctx) => {
    const contact = ctx.message.contact;
    const telegramId = ctx.from.id.toString();

    if (contact.user_id !== ctx.from.id) {
        return ctx.reply('❌ Please share your own contact.');
    }

    console.log(`📱 Received phone number for ${telegramId}: ${contact.phone_number}`);

    const client = await getDbClient();
    try {
        await client.query(
            `UPDATE users SET phone = $1 WHERE telegram_id = $2`,
            [contact.phone_number, telegramId]
        );
        ctx.reply(`✅ Thank you! Your phone number (${contact.phone_number}) has been saved. You can now login from the app.`);
    } catch (e) {
        console.error('❌ Update phone error:', e);
        ctx.reply('❌ Failed to save phone number.');
    } finally {
        await client.end();
    }
});

bot.launch()
    .then(() => {
        console.log('🤖 Bot is running!');
    })
    .catch((error) => {
        console.error('❌ Failed to launch bot:', error);
        process.exit(1);
    });

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
