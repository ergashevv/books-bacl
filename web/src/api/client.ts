import axios from 'axios';

const API_URL = 'http://localhost:3001/api'; // Update if needed

const client = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const bookApi = {
    getAll: (category?: number, search?: string) =>
        client.get('/books', { params: { category, search } }),
    getById: (id: number) =>
        client.get(`/books/${id}`),
    create: (data: any) =>
        client.post('/books', data),
    update: (id: number, data: any) =>
        client.put(`/books/${id}`, data),
    delete: (id: number) =>
        client.delete(`/books/${id}`),
    getCategories: () =>
        client.get('/categories'),
    uploadFile: (file: File, type: 'cover' | 'pdf') => {
        const formData = new FormData();
        formData.append('file', file);
        return client.post(`/upload?type=${type}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },
};

export default client;
