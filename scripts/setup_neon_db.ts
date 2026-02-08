import 'dotenv/config';
import { Client } from 'pg';

async function setupDatabase() {
    console.log('🔧 Setting up Neon database...');

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        await client.connect();
        console.log('✅ Connected to Neon');

        // Create users table
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                telegram_id TEXT UNIQUE NOT NULL,
                full_name TEXT,
                username TEXT,
                phone TEXT,
                avatar_url TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                last_login_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Users table created');

        // Create categories table
        await client.query(`
            CREATE TABLE IF NOT EXISTS categories (
                id SERIAL PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Categories table created');

        // Create books table
        await client.query(`
            CREATE TABLE IF NOT EXISTS books (
                id SERIAL PRIMARY KEY,
                title TEXT NOT NULL,
                author TEXT NOT NULL,
                description TEXT,
                cover_url TEXT,
                pdf_path TEXT NOT NULL,
                price DECIMAL(10,2) DEFAULT 0,
                rating DECIMAL(3,2) DEFAULT 0,
                is_premium BOOLEAN DEFAULT FALSE,
                views INTEGER DEFAULT 0,
                category_id INTEGER REFERENCES categories(id),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Books table created');

        // Create auth_requests table (for Telegram login flow)
        await client.query(`
            CREATE TABLE IF NOT EXISTS auth_requests (
                id SERIAL PRIMARY KEY,
                request_uuid TEXT UNIQUE NOT NULL,
                telegram_user_id TEXT,
                user_id INTEGER REFERENCES users(id),
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Auth requests table created');

        // Insert default categories
        await client.query(`
            INSERT INTO categories (name) VALUES 
            ('Fiction'), ('Technology'), ('Business'), ('Science')
            ON CONFLICT (name) DO NOTHING
        `);
        console.log('✅ Default categories inserted');

        console.log('🎉 Database setup complete!');
    } catch (error) {
        console.error('❌ Error setting up database:', error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

setupDatabase();
