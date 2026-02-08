import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Creating auth_requests and app_users tables...');

        // 1. Create app_users table (Simple Custom User Table)
        await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS public.app_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        telegram_id TEXT UNIQUE NOT NULL,
        full_name TEXT,
        username TEXT,
        avatar_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        last_login_at TIMESTAMPTZ
      );
    `);

        // 2. Ensure auth_requests exists and has correct columns
        await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS public.auth_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        status TEXT DEFAULT 'pending',
        telegram_user_id TEXT,
        app_user_id UUID -- Link to the created user
      );
    `);

        // 3. Enable Realtime for auth_requests
        await prisma.$executeRawUnsafe(`
      ALTER TABLE public.auth_requests REPLICA IDENTITY FULL;
    `);

        try {
            await prisma.$executeRawUnsafe(`
          ALTER PUBLICATION supabase_realtime ADD TABLE public.auth_requests;
        `);
        } catch (e: any) {
            console.log('Publication setup note:', e?.message || e);
        }

        // 4. RLS Policies (Public for now for simplicity, or specific)
        await prisma.$executeRawUnsafe(`ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;`);
        await prisma.$executeRawUnsafe(`ALTER TABLE public.auth_requests ENABLE ROW LEVEL SECURITY;`);

        // Allow public access (Since we manage auth via bot/app logic for now)
        // In production, you'd secure this with RLS based on headers or signatures.
        const tables = ['app_users', 'auth_requests'];
        const policies = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'];

        for (const table of tables) {
            for (const policy of policies) {
                try {
                    await prisma.$executeRawUnsafe(`
                    DROP POLICY IF EXISTS "Public ${policy} ${table}" ON public.${table};
                `);
                    await prisma.$executeRawUnsafe(`
                    CREATE POLICY "Public ${policy} ${table}" ON public.${table} FOR ${policy} USING (true);
                `);
                } catch (e) { }
            }
        }

        console.log('✅ Custom Auth tables setup complete.');
    } catch (e) {
        console.error('Error setting up tables:', e);
    }
}

main()
    .finally(async () => {
        await prisma.$disconnect();
    });
