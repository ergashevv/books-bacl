import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Creating auth_requests table...');
        await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS public.auth_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        status TEXT DEFAULT 'pending',
        access_token TEXT,
        refresh_token TEXT,
        telegram_user_id TEXT
      );
    `);

        console.log('Enabling Realtime...');
        // Enable replication for the table (required for Realtime)
        await prisma.$executeRawUnsafe(`
      ALTER TABLE public.auth_requests REPLICA IDENTITY FULL;
    `);

        // Add to publication
        // Note: This might fail if the publication doesn't exist or is managed by Supabase specifically, 
        // but usually 'supabase_realtime' exists.
        try {
            await prisma.$executeRawUnsafe(`
          ALTER PUBLICATION supabase_realtime ADD TABLE public.auth_requests;
        `);
        } catch (e: any) {
            console.log('Publication might already contain table or other error:', e?.message || e);
        }

        // RLS: Allow anyone to insert (to start login) and read (to listen). 
        // In production, you'd want strictly UUID matching or just public insert, verify by subscribing.
        await prisma.$executeRawUnsafe(`ALTER TABLE public.auth_requests ENABLE ROW LEVEL SECURITY;`);
        await prisma.$executeRawUnsafe(`
        CREATE POLICY "Public insert requests" ON public.auth_requests FOR INSERT WITH CHECK (true);
    `);
        await prisma.$executeRawUnsafe(`
        CREATE POLICY "Public read requests" ON public.auth_requests FOR SELECT USING (true);
    `);

        await prisma.$executeRawUnsafe(`
        CREATE POLICY "Public update requests" ON public.auth_requests FOR UPDATE USING (true);
    `);


        console.log('Table auth_requests created and realtime enabled.');
    } catch (e) {
        console.error('Error setting up tables:', e);
    }
}

main()
    .finally(async () => {
        await prisma.$disconnect();
    });
