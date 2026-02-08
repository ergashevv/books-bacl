import 'dotenv/config';
import { Client } from 'pg';

const books = [
    {
        title: "Frankenstein",
        author: "Mary Shelley",
        description: "A timeless masterpiece of gothic horror. Victor Frankenstein, a brilliant scientist, creates a sentient being in an unorthodox scientific experiment, leading to tragic consequences.",
        pdfUrl: "https://www.planetpublish.com/wp-content/uploads/2021/11/Frankenstein.pdf",
        coverUrl: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1490528560i/4671.jpg",
        price: 0,
        rating: 4.7,
        isPremium: false,
        categoryName: "Gothic Fiction"
    },
    {
        title: "Dracula",
        author: "Bram Stoker",
        description: "The classic vampire novel that defined the genre. Follow the journey of Jonathan Harker as he travels to Transylvania and encounters the mysterious Count Dracula.",
        pdfUrl: "https://www.planetpublish.com/wp-content/uploads/2021/11/Dracula.pdf",
        coverUrl: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1387151694i/17245.jpg",
        price: 0,
        rating: 4.8,
        isPremium: false,
        categoryName: "Horror"
    },
    {
        title: "The Adventures of Sherlock Holmes",
        author: "Arthur Conan Doyle",
        description: "Step into 221B Baker Street with the world's greatest detective. A collection of twelve stories featuring the remarkable deductive powers of Sherlock Holmes.",
        pdfUrl: "https://www.planetpublish.com/wp-content/uploads/2021/11/The-Adventures-of-Sherlock-Holmes.pdf",
        coverUrl: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1356138584i/3590.jpg",
        price: 0,
        rating: 4.9,
        isPremium: false,
        categoryName: "Mystery"
    },
    {
        title: "The Great Gatsby",
        author: "F. Scott Fitzgerald",
        description: "A portrait of the Jazz Age in all its decadence and excess. Jay Gatsby's pursuit of Daisy Buchanan explores the American Dream and the disillusionment that follows.",
        pdfUrl: "https://www.planetpublish.com/wp-content/uploads/2021/11/The-Great-Gatsby.pdf",
        coverUrl: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1490528560i/4671.jpg",
        price: 0,
        rating: 4.6,
        isPremium: false,
        categoryName: "Classic"
    },
    {
        title: "Peter Pan",
        author: "J.M. Barrie",
        description: "The magical story of the boy who wouldn't grow up. Follow Wendy, John, and Michael to Neverland on an adventure with Peter Pan and Tinker Bell.",
        pdfUrl: "https://www.planetpublish.com/wp-content/uploads/2021/11/Peter-Pan.pdf",
        coverUrl: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1337714526i/34268.jpg",
        price: 0,
        rating: 4.5,
        isPremium: false,
        categoryName: "Children's Literature"
    },
    {
        title: "Notes from Underground",
        author: "Fyodor Dostoevsky",
        description: "A foundational work of existentialist literature. The anonymous narrator's 'notes' explore the conflict between rationalism and the chaotic nature of human existence.",
        pdfUrl: "https://www.planetpublish.com/wp-content/uploads/2021/11/Notes-from-Underground.pdf",
        coverUrl: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1327909384i/49455.jpg",
        price: 14.99,
        rating: 4.9,
        isPremium: true,
        categoryName: "Philosophy"
    }
];

async function seedRealBooks() {
    console.log('🚀 Seeding real literary masterpieces...');

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        await client.query('DELETE FROM auth_requests');
        await client.query('DELETE FROM books');

        for (const book of books) {
            let catResult = await client.query('SELECT id FROM categories WHERE name = $1', [book.categoryName]);
            let categoryId;
            if (catResult.rows.length === 0) {
                const newCat = await client.query('INSERT INTO categories (name) VALUES ($1) RETURNING id', [book.categoryName]);
                categoryId = newCat.rows[0].id;
            } else {
                categoryId = catResult.rows[0].id;
            }

            await client.query(
                `INSERT INTO books (title, author, description, cover_url, pdf_path, price, rating, is_premium, category_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [book.title, book.author, book.description, book.coverUrl, book.pdfUrl, book.price, book.rating, book.isPremium, categoryId]
            );
            console.log(`✅ Library updated: ${book.title}`);
        }
        console.log('🎉 Seeding Complete! Enjoy your library.');
    } catch (error) {
        console.error('❌ Error Seeding:', error);
    } finally {
        await client.end();
    }
}

seedRealBooks();
