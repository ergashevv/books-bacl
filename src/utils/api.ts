// API manzilini shu yerdan o'zgartirish kifoya
export const API_URL = 'https://books-bacl-1.onrender.com';

export const getImageUrl = (path?: string) => {
    if (!path) return 'https://via.placeholder.com/150';
    if (path.startsWith('http')) return path;
    if (path.startsWith('/uploads')) return `${API_URL}${path}`;
    return path;
};

export const getPdfUrl = (path?: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    if (path.startsWith('/uploads')) return `${API_URL}${path}`;
    return path;
};

export const getFileUrl = (path?: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    if (path.startsWith('/uploads')) return `${API_URL}${path}`;
    return path;
};

export const getBookFileUrl = (book: { pdf_path?: string; epub_path?: string; txt_path?: string; mobi_path?: string; file_path?: string; file_type?: string }) => {
    // Priority: file_type -> specific paths -> file_path -> pdf_path
    if (book.file_type === 'epub' && book.epub_path) return getFileUrl(book.epub_path);
    if (book.file_type === 'txt' && book.txt_path) return getFileUrl(book.txt_path);
    if (book.file_type === 'mobi' && book.mobi_path) return getFileUrl(book.mobi_path);
    if (book.file_type === 'pdf' && book.pdf_path) return getFileUrl(book.pdf_path);
    
    if (book.epub_path) return getFileUrl(book.epub_path);
    if (book.txt_path) return getFileUrl(book.txt_path);
    if (book.mobi_path) return getFileUrl(book.mobi_path);
    if (book.file_path) return getFileUrl(book.file_path);
    if (book.pdf_path) return getFileUrl(book.pdf_path);
    
    return '';
};

export const getBookFileType = (book: { pdf_path?: string; epub_path?: string; txt_path?: string; mobi_path?: string; file_path?: string; file_type?: string }): 'pdf' | 'epub' | 'txt' | 'mobi' => {
    if (book.file_type) return book.file_type as 'pdf' | 'epub' | 'txt' | 'mobi';
    if (book.epub_path) return 'epub';
    if (book.txt_path) return 'txt';
    if (book.mobi_path) return 'mobi';
    if (book.pdf_path) return 'pdf';
    if (book.file_path) {
        const ext = book.file_path.split('.').pop()?.toLowerCase();
        if (ext === 'epub') return 'epub';
        if (ext === 'txt') return 'txt';
        if (ext === 'mobi') return 'mobi';
    }
    return 'pdf'; // default
};
