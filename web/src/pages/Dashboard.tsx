import { BarChart3, BookOpen, Edit2, Layers, Plus, Search, Trash2, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { bookApi } from '../api/client';
import { getImageUrl } from '../utils/api';

const Dashboard = () => {
    const [books, setBooks] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        try {
            const res = await bookApi.getCategories();
            setCategories(res.data);
        } catch (error) {
            console.error('Failed to load categories', error);
        }
    };

    const getCategoryName = (categoryId: number) => {
        const category = categories.find(c => c.id === categoryId);
        return category?.name || 'Unknown';
    };

    const loadBooks = async () => {
        try {
            setLoading(true);
            const res = await bookApi.getAll(undefined, search);
            setBooks(res.data);
        } catch (error) {
            console.error('Failed to load books', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadBooks();
    }, [search]);

    const handleDelete = async (id: number, title: string) => {
        if (window.confirm(`Are you sure you want to delete "${title}"?`)) {
            try {
                await bookApi.delete(id);
                setBooks(books.filter(b => b.id !== id));
            } catch (error) {
                alert('Failed to delete book');
            }
        }
    };

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark p-8">
            <div className="max-w-7xl mx-auto">
                {/* Stats Section */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <StatCard icon={<BookOpen className="text-primary" />} label="Total Books" value={books.length.toString()} />
                    <StatCard icon={<Layers className="text-blue-500" />} label="Categories" value={categories.length.toString()} />
                    <StatCard icon={<Users className="text-purple-500" />} label="Total Users" value="1.2k" />
                    <StatCard icon={<BarChart3 className="text-amber-500" />} label="Total Reads" value="45.6k" />
                </div>

                {/* Header & Search */}
                <div className="bg-white dark:bg-surface-dark rounded-lg p-6 shadow-soft mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Books Management</h1>
                        <p className="text-slate-500 dark:text-slate-400">Manage your library collection</p>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search books..."
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && loadBooks()}
                            />
                        </div>
                        <button
                            onClick={() => navigate('/add')}
                            className="bg-primary hover:bg-primary-hover text-white px-6 py-2 rounded-lg font-bold transition-all shadow-soft flex items-center gap-2"
                        >
                            <Plus size={20} /> Add Book
                        </button>
                    </div>
                </div>

                {/* Books Table */}
                <div className="bg-white dark:bg-surface-dark rounded-lg shadow-soft overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center w-20">Muqova</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Kitob Nomi</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Muallif</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Kategoriya</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Amallar</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {books.map((book) => (
                                <tr key={book.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                                    <td className="px-6 py-4 flex justify-center">
                                        <img src={getImageUrl(book.cover_url)} className="w-10 h-14 rounded object-cover shadow-sm" alt="" />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-900 dark:text-white">{book.title}</div>
                                        <div className="text-xs text-slate-400">ID: {book.id}</div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-medium">{book.author}</td>
                                    <td className="px-6 py-4">
                                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-3 py-1 rounded-full text-xs font-bold">
                                            {getCategoryName(book.category_id)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {book.is_premium ? (
                                            <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-bold">PREMIUM</span>
                                        ) : (
                                            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-bold">FREE</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => navigate(`/edit/${book.id}`)}
                                                className="p-2 text-primary hover:bg-primary-light rounded-lg transition-colors"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(book.id, book.title)}
                                                className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {loading && (
                        <div className="p-12 text-center text-slate-400">Yuklanmoqda...</div>
                    )}
                    {!loading && books.length === 0 && (
                        <div className="p-12 text-center text-slate-400">Kitoblar topilmadi.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ icon, label, value }: { icon: any, label: string, value: string }) => (
    <div className="bg-white dark:bg-surface-dark p-6 rounded-lg shadow-soft border border-slate-50 dark:border-slate-800">
        <div className="w-12 h-12 rounded-lg bg-slate-50 dark:bg-slate-900 flex items-center justify-center mb-4">
            {icon}
        </div>
        <div className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">{label}</div>
        <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{value}</div>
    </div>
);

export default Dashboard;
