import { ChevronLeft, Loader2, Save } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { bookApi } from '../api/client';
import FileUpload from '../components/FileUpload';

const BookForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = !!id;

    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<any[]>([]);
    const [form, setForm] = useState({
        title: '',
        author: '',
        description: '',
        cover_url: '',
        pdf_path: '',
        price: 0,
        rating: 4.5,
        is_premium: false,
        category_id: 1,
    });

    useEffect(() => {
        loadCategories();
        if (isEditing) {
            loadBook();
        }
    }, [id]);

    const loadCategories = async () => {
        try {
            const res = await bookApi.getCategories();
            setCategories(res.data);
            if (!isEditing && res.data.length > 0) {
                setForm(prev => ({ ...prev, category_id: res.data[0].id }));
            }
        } catch (error) {
            console.error('Failed to load categories');
        }
    };

    const loadBook = async () => {
        try {
            const res = await bookApi.getById(Number(id));
            const data = res.data;
            setForm({
                title: data.title,
                author: data.author,
                description: data.description || '',
                cover_url: data.cover_url || '',
                pdf_path: data.pdf_path,
                price: data.price,
                rating: data.rating,
                is_premium: data.is_premium,
                category_id: data.category_id,
            });
        } catch (error) {
            alert('Failed to load book data');
            navigate('/');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isEditing) {
                await bookApi.update(Number(id), form);
            } else {
                await bookApi.create(form);
            }
            navigate('/');
        } catch (error) {
            alert('Saqlashda xatolik yuz berdi');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark p-8">
            <div className="max-w-3xl mx-auto">
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 text-slate-500 hover:text-primary mb-6 font-medium transition-colors"
                >
                    <ChevronLeft size={20} /> Orqaga qaytish
                </button>

                <div className="bg-white dark:bg-surface-dark rounded-lg shadow-soft p-8 border border-slate-50 dark:border-slate-800">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-8">
                        {isEditing ? 'Kitobni tahrirlash' : 'Yangi kitob qo\'shish'}
                    </h1>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InputField
                                label="Kitob nomi *"
                                value={form.title}
                                onChange={(val) => setForm({ ...form, title: val })}
                                placeholder="Masalan: O'tkan kunlar"
                            />
                            <InputField
                                label="Muallif *"
                                value={form.author}
                                onChange={(val) => setForm({ ...form, author: val })}
                                placeholder="Masalan: Abdulla Qodiriy"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Tavsif</label>
                            <textarea
                                className="w-full p-4 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 h-32"
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                placeholder="Kitob haqida qisqacha ma'lumot..."
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FileUpload
                                label="Kitob muqovasi (Cover)"
                                type="cover"
                                value={form.cover_url}
                                onUpload={(url) => setForm({ ...form, cover_url: url })}
                                accept="image/*"
                            />
                            <FileUpload
                                label="PDF fayl *"
                                type="pdf"
                                value={form.pdf_path}
                                onUpload={(url) => setForm({ ...form, pdf_path: url })}
                                accept="application/pdf"
                            />
                        </div>

                        {/* Old input fields for reference or backup if needed, but commented out for cleaner UI */}
                        {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InputField
                                label="Muqova rasmi (URL)"
                                value={form.cover_url}
                                onChange={(val) => setForm({ ...form, cover_url: val })}
                                placeholder="https://example.com/image.jpg"
                            />
                            <InputField
                                label="PDF manzili (URL/Path) *"
                                value={form.pdf_path}
                                onChange={(val) => setForm({ ...form, pdf_path: val })}
                                placeholder="PDF fayl manzili"
                            />
                        </div> */}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Kategoriya</label>
                                <select
                                    className="w-full p-4 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
                                    value={form.category_id}
                                    onChange={(e) => setForm({ ...form, category_id: Number(e.target.value) })}
                                >
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                            <InputField
                                label="Narxi ($)"
                                type="number"
                                value={form.price.toString()}
                                onChange={(val) => setForm({ ...form, price: Number(val) })}
                            />
                            <InputField
                                label="Reyting"
                                type="number"
                                value={form.rating.toString()}
                                onChange={(val) => setForm({ ...form, rating: Number(val) })}
                            />
                        </div>

                        <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900 p-4 rounded-lg">
                            <input
                                type="checkbox"
                                id="premium"
                                className="w-5 h-5 accent-primary"
                                checked={form.is_premium}
                                onChange={(e) => setForm({ ...form, is_premium: e.target.checked })}
                            />
                            <label htmlFor="premium" className="font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                                Premium kontent (Faqat obunachilar uchun)
                            </label>
                        </div>

                        <div className="pt-6">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-primary hover:bg-primary-hover text-white py-4 rounded-lg font-bold text-lg transition-all shadow-medium flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                                {isEditing ? "O'zgarishlarni saqlash" : "Kitobni qo'shish"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

interface InputFieldProps {
    label: string;
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    type?: string;
}

const InputField = ({ label, value, onChange, placeholder, type = "text" }: InputFieldProps) => (
    <div>
        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{label}</label>
        <input
            type={type}
            step={type === "number" ? "0.1" : undefined}
            className="w-full p-4 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
        />
    </div>
);

export default BookForm;
