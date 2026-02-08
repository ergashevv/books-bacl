import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
// Node 19+ has crypto.randomUUID
// Let's try crypto

// Load env vars
// In a real env, load .env. Local script hack:
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://klcijabqnqrxfycunppf.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const REAL_BOOKS = [
    {
        filename: '1984.pdf',
        title: '1984',
        author: 'George Orwell',
        category: 'Fiction',
        description: 'A dystopian social science fiction novel.',
        coverPath: 'https://m.media-amazon.com/images/I/71rpa1-kyvL._AC_UF1000,1000_QL80_.jpg',
        price: 14.50,
        rating: 4.8,
        isPremium: false,
    },
    {
        filename: 'cleancode.pdf',
        title: 'Clean Code',
        author: 'Robert C. Martin',
        category: 'Technology',
        description: 'A Handbook of Agile Software Craftsmanship.',
        coverPath: 'https://m.media-amazon.com/images/I/41xShlnTZTL._SX218_BO1,204,203,200_QL40_FMwebp_.jpg',
        price: 35.00,
        rating: 4.7,
        isPremium: true,
    }
];

async function main() {
    console.log('🌱 Starting Seed with Real Data...');

    // 1. Clear Data
    console.log('Cleaning old data...');
    // We can't easily TRUNCATE without RLS bypass or RPC, but we have service key.
    // Order matters due to foreign keys.
    await supabase.from('reviews').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('books').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    // Categories often referenced, maybe define categories first or upsert.
    // Let's create categories if needed.

    // 2. Upload PDFs
    for (const book of REAL_BOOKS) {
        // Assume script is run from project root
        const filePath = path.join(process.cwd(), 'data', book.filename);
        if (!fs.existsSync(filePath)) {
            console.warn(`⚠️ File not found: ${filePath}`);
            continue;
        }

        const fileBuffer = fs.readFileSync(filePath);
        // Supabase JS client accepts Buffer too
        const file = fileBuffer;

        // Upload to 'library' bucket
        // Ensure bucket exists first
        try {
            const { data: bucketData, error: bucketError } = await supabase.storage.getBucket('library');
            if (bucketError) {
                console.log('Creating library bucket...');
                await supabase.storage.createBucket('library', { public: true });
            }
        } catch (e) {
            // Ignore if already check
        }

        const storagePath = `books/${book.filename}`;

        console.log(`Uploading ${book.filename}...`);
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('library')
            .upload(storagePath, file, {
                contentType: 'application/pdf',
                upsert: true
            });

        if (uploadError) {
            console.error(`❌ Upload failed for ${book.filename}:`, uploadError);
            continue;
        }

        // 3. Create Database Entry
        // Get or Create Category
        let categoryId;
        const { data: catData } = await supabase.from('categories').select('id').eq('name', book.category).single();
        if (catData) {
            categoryId = catData.id;
        } else {
            const { data: newCat } = await supabase.from('categories').insert({ name: book.category }).select().single();
            categoryId = newCat.id;
        }

        // Insert Book
        const { error: insertError } = await supabase.from('books').insert({
            id: crypto.randomUUID(),
            title: book.title,
            author: book.author,
            description: book.description,
            cover_path: book.coverPath, // Using URL directly for now or path if needed
            pdf_path: storagePath, // The path in storage bucket
            price: book.price,
            rating: book.rating,
            is_premium: book.isPremium,
            category_id: categoryId,
            views: 0,
            updated_at: new Date().toISOString() // Explicitly set if default is missing
        });

        if (insertError) {
            console.error(`❌ Failed to insert book ${book.title}:`, insertError);
        } else {
            console.log(`✅ Added book: ${book.title}`);
        }
    }

    console.log('🎉 Seeding Complete!');
}

main();
