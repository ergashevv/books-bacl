import { useNavigation, useRoute } from '@react-navigation/native';
import { ChevronLeft, Save } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Layout from '../../components/Layout';
import { useBookStore } from '../../store/useBookStore';

const AdminBookFormScreen = () => {
    const navigation = useNavigation();
    const route = useRoute<any>();
    const { addBook, updateBook, categories, fetchCategories } = useBookStore();
    const editingBook = route.params?.book;

    useEffect(() => {
        if (categories.length === 0) {
            fetchCategories();
        }
    }, [categories.length, fetchCategories]);

    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        title: editingBook?.title || '',
        author: editingBook?.author || '',
        description: editingBook?.description || '',
        cover_url: editingBook?.cover_url || '',
        pdf_path: editingBook?.pdf_path || '',
        price: editingBook?.price?.toString() || '0',
        rating: editingBook?.rating?.toString() || '4.5',
        is_premium: editingBook?.is_premium || false,
        category_id: editingBook?.category_id ? Number(editingBook.category_id) : (categories[0]?.id ? Number(categories[0].id) : 0),
    });

    const handleSave = async () => {
        if (!form.title || !form.pdf_path) {
            Alert.alert("Error", "Title and PDF Path are required");
            return;
        }

        setLoading(true);
        const bookData = {
            ...form,
            price: parseFloat(form.price),
            rating: parseFloat(form.rating),
        };

        let success;
        if (editingBook) {
            success = await updateBook(editingBook.id, bookData);
        } else {
            success = await addBook(bookData);
        }

        setLoading(false);
        if (success) {
            Alert.alert("Success", `Book ${editingBook ? 'updated' : 'added'} successfully`);
            navigation.goBack();
        } else {
            Alert.alert("Error", `Failed to ${editingBook ? 'update' : 'add'} book`);
        }
    };

    const InputField = ({ label, value, onChangeText, placeholder, multiline = false, keyboardType = 'default' as any }: any) => (
        <View className="mb-5">
            <Text className="text-[14px] font-bold text-slate-700 dark:text-slate-300 mb-2">{label}</Text>
            <TextInput
                className={`bg-white dark:bg-surface-dark p-4 rounded-lg border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white ${multiline ? 'h-32' : ''}`}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor="#94A3B8"
                multiline={multiline}
                textAlignVertical={multiline ? 'top' : 'center'}
                keyboardType={keyboardType}
            />
        </View>
    );

    return (
        <Layout className="bg-background-light dark:bg-background-dark">
            <View className="flex-row items-center px-6 pt-4 mb-6">
                <TouchableOpacity onPress={() => navigation.goBack()} className="bg-white dark:bg-surface-dark p-2 rounded-lg shadow-soft mr-4">
                    <ChevronLeft color="#34A853" size={24} />
                </TouchableOpacity>
                <Text className="text-[20px] font-bold text-slate-900 dark:text-white">
                    {editingBook ? 'Edit Book' : 'Add New Book'}
                </Text>
            </View>

            <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                <InputField
                    label="Book Title *"
                    value={form.title}
                    onChangeText={(t: string) => setForm({ ...form, title: t })}
                    placeholder="Enter title"
                />
                <InputField
                    label="Author Name"
                    value={form.author}
                    onChangeText={(t: string) => setForm({ ...form, author: t })}
                    placeholder="Enter author name"
                />
                <InputField
                    label="Description"
                    value={form.description}
                    onChangeText={(t: string) => setForm({ ...form, description: t })}
                    placeholder="Enter book description"
                    multiline
                />
                <InputField
                    label="Cover Image URL"
                    value={form.cover_url}
                    onChangeText={(t: string) => setForm({ ...form, cover_url: t })}
                    placeholder="https://example.com/cover.jpg"
                />
                <InputField
                    label="PDF Path/URL *"
                    value={form.pdf_path}
                    onChangeText={(t: string) => setForm({ ...form, pdf_path: t })}
                    placeholder="Enter PDF URL or storage path"
                />

                <View className="flex-row space-x-4">
                    <View className="flex-1">
                        <InputField
                            label="Price ($)"
                            value={form.price}
                            onChangeText={(t: string) => setForm({ ...form, price: t })}
                            placeholder="0"
                            keyboardType="numeric"
                        />
                    </View>
                    <View className="flex-1">
                        <InputField
                            label="Rating"
                            value={form.rating}
                            onChangeText={(t: string) => setForm({ ...form, rating: t })}
                            placeholder="4.5"
                            keyboardType="numeric"
                        />
                    </View>
                </View>

                {/* Category Picker (Simplified as Input for now or you can use a Modal) */}
                <View className="mb-5">
                    <Text className="text-[14px] font-bold text-slate-700 dark:text-slate-300 mb-2">Category</Text>
                    <View className="bg-white dark:bg-surface-dark rounded-lg border border-slate-100 dark:border-slate-800">
                        {categories.map((cat) => (
                            <TouchableOpacity
                                key={cat.id}
                                onPress={() => setForm({ ...form, category_id: cat.id })}
                                className={`p-4 ${form.category_id === cat.id ? 'bg-primary/10' : ''} border-b border-slate-50 dark:border-slate-800`}
                            >
                                <Text className={`text-[14px] ${form.category_id === cat.id ? 'text-primary font-bold' : 'text-slate-600 dark:text-slate-400'}`}>
                                    {cat.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View className="flex-row items-center justify-between bg-white dark:bg-surface-dark p-4 rounded-lg mb-8 border border-slate-100 dark:border-slate-800">
                    <Text className="text-[14px] font-bold text-slate-700 dark:text-slate-300">Premium Content</Text>
                    <Switch
                        value={form.is_premium}
                        onValueChange={(v) => setForm({ ...form, is_premium: v })}
                        trackColor={{ true: '#34A853' }}
                    />
                </View>

                <TouchableOpacity
                    onPress={handleSave}
                    disabled={loading}
                    className="bg-primary p-4 rounded-lg flex-row items-center justify-center shadow-soft"
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <>
                            <Save size={20} color="white" />
                            <Text className="text-white font-bold ml-2 text-[16px]">
                                {editingBook ? 'Update Book' : 'Save Book'}
                            </Text>
                        </>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </Layout>
    );
};

export default AdminBookFormScreen;
