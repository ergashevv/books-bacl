import 'dotenv/config';
import { Pool } from 'pg';

async function clearDatabase() {
    console.log('🗑️  Starting database cleanup...');

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
    });

    try {
        await pool.connect();
        console.log('✅ Connected to database');

        // Disable foreign key checks temporarily (PostgreSQL doesn't have this, but we'll delete in order)
        // Delete in reverse order of dependencies

        console.log('\n📋 Clearing tables...');

        // 1. Clear junction/user data tables first (they reference other tables)
        const userDataTables = [
            'user_audio_progress',
            'user_book_progress',
            'favorites',
            'book_categories',
            'audio_tracks',
        ];

        for (const table of userDataTables) {
            try {
                const result = await pool.query(`DELETE FROM ${table}`);
                console.log(`✅ Cleared ${table}: ${result.rowCount} rows`);
            } catch (e: any) {
                if (e.message.includes('does not exist')) {
                    console.log(`⚠️  Table ${table} does not exist, skipping...`);
                } else {
                    console.error(`❌ Error clearing ${table}:`, e.message);
                }
            }
        }

        // 2. Clear main data tables
        const mainTables = [
            'books',
            'categories',
            'subscriptions',
            'profiles',
        ];

        for (const table of mainTables) {
            try {
                const result = await pool.query(`DELETE FROM ${table}`);
                console.log(`✅ Cleared ${table}: ${result.rowCount} rows`);
            } catch (e: any) {
                if (e.message.includes('does not exist')) {
                    console.log(`⚠️  Table ${table} does not exist, skipping...`);
                } else {
                    console.error(`❌ Error clearing ${table}:`, e.message);
                }
            }
        }

        // 3. Clear auth-related tables
        const authTables = [
            'auth_requests',
            'sms_otp_requests',
            'users',
            'app_users',
        ];

        for (const table of authTables) {
            try {
                const result = await pool.query(`DELETE FROM ${table}`);
                console.log(`✅ Cleared ${table}: ${result.rowCount} rows`);
            } catch (e: any) {
                if (e.message.includes('does not exist')) {
                    console.log(`⚠️  Table ${table} does not exist, skipping...`);
                } else {
                    console.error(`❌ Error clearing ${table}:`, e.message);
                }
            }
        }

        // 4. Reset sequences (for SERIAL/auto-increment columns)
        console.log('\n🔄 Resetting sequences...');
        try {
            await pool.query(`
                DO $$ 
                DECLARE 
                    r RECORD;
                BEGIN
                    FOR r IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public') 
                    LOOP
                        EXECUTE 'ALTER SEQUENCE ' || r.sequence_name || ' RESTART WITH 1';
                    END LOOP;
                END $$;
            `);
            console.log('✅ Sequences reset');
        } catch (e: any) {
            console.log('⚠️  Could not reset sequences:', e.message);
        }

        console.log('\n✅ Database cleanup completed successfully!');
        console.log('💡 Note: Table structures and constraints are preserved.');
        console.log('💡 To recreate tables, run: npm run setup:db (if available)');

    } catch (error: any) {
        console.error('❌ Database cleanup failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run cleanup
clearDatabase();
