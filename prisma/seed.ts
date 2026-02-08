import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM compatibility for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to load .env manually if not loaded
if (!process.env.EXPO_PUBLIC_SUPABASE_URL) {
    const envPath = path.resolve(__dirname, '../.env');
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf-8');
        envConfig.split('\n').forEach((line) => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim().replace(/^["'](.*)["']$/, '$1'); // remove quotes
                process.env[key] = value;
            }
        });
    }
}

const prisma = new PrismaClient();

// Initialize Supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function setupStorage() {
    try {
        console.log('Setting up storage buckets...');

        // Ensure storage schema exists (standard in Supabase)

        // Create 'books' bucket
        await prisma.$executeRawUnsafe(`
            INSERT INTO storage.buckets (id, name, public) 
            VALUES ('books', 'books', true) 
            ON CONFLICT (id) DO NOTHING;
        `);

        // Create policy for public access to 'books' bucket
        // We drop it first to ensure we can recreate it with correct definition if needed, 
        // or getting "already exists" error is fine too. 
        // Safest is to catch error.
        try {
            await prisma.$executeRawUnsafe(`
                CREATE POLICY "Public Access Books" 
                ON storage.objects FOR ALL 
                USING (bucket_id = 'books') 
                WITH CHECK (bucket_id = 'books');
            `);
            console.log('Created storage policy for books.');
        } catch (e: any) {
            // likely "policy already exists"
            // console.log('Storage policy might already exist:', e.message);
        }

    } catch (e) {
        console.error('Error setting up storage:', e);
    }
}

async function uploadFileToSupabase(bucket: string, fileName: string, filePath: string): Promise<string | null> {
    try {
        if (!fs.existsSync(filePath)) {
            console.warn(`File not found: ${filePath}`);
            return null;
        }

        const fileBuffer = fs.readFileSync(filePath);

        // Attempt to upload
        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(fileName, fileBuffer, {
                contentType: 'application/pdf',
                upsert: true
            });

        if (error) {
            console.error(`Error uploading ${fileName}:`, error.message);
            return null;
        }

        const { data: publicUrlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(fileName);

        return publicUrlData.publicUrl;
    } catch (e) {
        console.error(`Exception uploading ${fileName}:`, e);
        return null;
    }
}

async function main() {

    // Setup Storage First
    await setupStorage();

    // Create Categories
    const fiction = await prisma.category.upsert({
        where: { name: 'Fiction' },
        update: {},
        create: { name: 'Fiction' },
    });

    const business = await prisma.category.upsert({
        where: { name: 'Business' },
        update: {},
        create: { name: 'Business' },
    });

    const tech = await prisma.category.upsert({
        where: { name: 'Technology' },
        update: {},
        create: { name: 'Technology' },
    });

    const psychology = await prisma.category.upsert({
        where: { name: 'Psychology' },
        update: {},
        create: { name: 'Psychology' },
    });

    // Upload PDFs
    console.log('Uploading PDFs from data folder...');
    const bucketName = 'books';

    const pdf1984Path = path.join(__dirname, '../data/1984.pdf');
    const pdfCleanCodePath = path.join(__dirname, '../data/cleancode.pdf');

    let url1984Str: string | undefined;
    const url1984 = await uploadFileToSupabase(bucketName, '1984.pdf', pdf1984Path);
    if (url1984) {
        console.log('Uploaded 1984.pdf:', url1984);
        url1984Str = url1984;
    }

    let urlCleanCodeStr: string | undefined;
    const urlCleanCode = await uploadFileToSupabase(bucketName, 'cleancode.pdf', pdfCleanCodePath);
    if (urlCleanCode) {
        console.log('Uploaded cleancode.pdf:', urlCleanCode);
        urlCleanCodeStr = urlCleanCode;
    }

    // Books Data
    const booksData = [
        {
            title: 'The Great Gatsby',
            author: 'F. Scott Fitzgerald',
            description: 'The story of the fabulously wealthy Jay Gatsby and his new love for the beautiful Daisy Buchanan.',
            coverPath: 'https://d28hgpri8am2if.cloudfront.net/book_images/onix/cvr9781524879761/the-great-gatsby-9781524879761_hr.jpg',
            price: 15.99,
            categoryId: fiction.id,
            rating: 4.5,
            isPremium: false,
            pdfPath: 'sample.pdf'
        },
        {
            title: 'Atomic Habits',
            author: 'James Clear',
            description: 'No matter your goals, Atomic Habits offers a proven framework for improving--every day.',
            coverPath: 'https://m.media-amazon.com/images/I/81F90H7hnML._AC_UF1000,1000_QL80_.jpg',
            price: 21.99,
            categoryId: psychology.id,
            rating: 4.8,
            isPremium: true,
            pdfPath: 'atomic_habits.pdf'
        },
        {
            title: 'Zero to One',
            author: 'Peter Thiel',
            description: 'Notes on Startups, or How to Build the Future.',
            coverPath: 'https://m.media-amazon.com/images/I/71uAI28kJuL._AC_UF1000,1000_QL80_.jpg',
            price: 18.50,
            categoryId: business.id,
            rating: 4.6,
            isPremium: false,
        },
        {
            title: 'Clean Code',
            author: 'Robert C. Martin',
            description: 'A Handbook of Agile Software Craftsmanship.',
            coverPath: 'https://m.media-amazon.com/images/I/41xShlnTZTL._SX218_BO1,204,203,200_QL40_FMwebp_.jpg',
            price: 35.00,
            categoryId: tech.id,
            rating: 4.7,
            isPremium: true,
            pdfPath: urlCleanCodeStr,
        },
        {
            title: 'Think and Grow Rich',
            author: 'Napoleon Hill',
            description: 'A personal development and self-improvement book.',
            coverPath: 'https://m.media-amazon.com/images/I/71UypkUjStL._AC_UF1000,1000_QL80_.jpg',
            price: 12.99,
            categoryId: business.id,
            rating: 4.4,
            isPremium: false,
        },
        {
            title: '1984',
            author: 'George Orwell',
            description: 'A dystopian social science fiction novel.',
            coverPath: 'https://m.media-amazon.com/images/I/71rpa1-kyvL._AC_UF1000,1000_QL80_.jpg',
            price: 14.50,
            categoryId: fiction.id,
            rating: 4.8,
            isPremium: false,
            pdfPath: url1984Str,
        },
    ];

    console.log('Clearing existing books...');
    await prisma.book.deleteMany({});

    console.log('Seeding books...');
    for (const book of booksData) {
        await prisma.book.create({
            data: book
        });
    }

    console.log('Enabling RLS and Public Access...');
    try {
        await prisma.$executeRawUnsafe(`ALTER TABLE books ENABLE ROW LEVEL SECURITY;`);
        await prisma.$executeRawUnsafe(`ALTER TABLE categories ENABLE ROW LEVEL SECURITY;`);

        await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "Public read books" ON books;`);
        await prisma.$executeRawUnsafe(`CREATE POLICY "Public read books" ON books FOR SELECT USING (true);`);

        await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "Public read categories" ON categories;`);
        await prisma.$executeRawUnsafe(`CREATE POLICY "Public read categories" ON categories FOR SELECT USING (true);`);

    } catch (e) {
        console.warn('Failed to set RLS policies via seed script.', e);
    }

    console.log('Seed data inserted successfully.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
