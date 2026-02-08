// API manzilini shu yerdan o'zgartirish kifoya
// Agar haqiqiy telefonda tekshirsangiz, localhost o'rniga kompyuter IP-sini yozing (masalan: 192.168.1.5)
export const API_URL = 'http://localhost:3001';

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
