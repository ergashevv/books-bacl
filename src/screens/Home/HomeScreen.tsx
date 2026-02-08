import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, Filter, Search } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StatusBar, Text, TextInput, TouchableOpacity, View } from 'react-native';
import BookCard from '../../components/BookCard';
import CategoryChip from '../../components/CategoryChip';
import Layout from '../../components/Layout';
import { useAuthStore } from '../../store/useAuthStore';
import { useBookStore } from '../../store/useBookStore';

const HomeScreen = () => {
    const { books, loading, fetchBooks, categories, fetchCategories } = useBookStore();
    const { session } = useAuthStore();
    const navigation = useNavigation();
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

    useEffect(() => {
        fetchCategories();
    }, []);

    useEffect(() => {
        fetchBooks(selectedCategory || undefined, search || undefined);
    }, [selectedCategory, search]);

    const userName = session?.user?.full_name || 'Reader';

    const renderHeader = () => (
        <View className="pt-4">
            {/* Figma Header */}
            <View className="flex-row justify-between items-center px-6 mb-6">
                <View>
                    <Text className="text-[20px] font-bold text-slate-900 dark:text-white">
                        Hi, {userName.split(' ')[0]}
                    </Text>
                    <Text className="text-[14px] text-slate-500 dark:text-slate-400 mt-1">
                        Find your next favorite read
                    </Text>
                </View>
                <TouchableOpacity className="bg-white dark:bg-surface-dark p-3 rounded-lg shadow-soft">
                    <Bell size={20} color="#34A853" />
                </TouchableOpacity>
            </View>

            {/* Figma Featured Section (Recommended) */}
            {books.length > 0 && !search && !selectedCategory && (
                <View className="px-6 mb-8">
                    <TouchableOpacity
                        onPress={() => (navigation as any).navigate('BookDetail', { bookId: books[0].id })}
                        activeOpacity={0.9}
                        className="relative h-48 rounded-lg overflow-hidden shadow-soft"
                    >
                        <LinearGradient
                            colors={['#34A853', '#2E7D32']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            className="absolute inset-0"
                        />

                        <View className="flex-row items-center h-full px-6">
                            <View className="flex-1 pr-4">
                                <Text className="text-white text-[12px] font-bold uppercase tracking-wider mb-2 opacity-80">RECOMMENDED FOR YOU</Text>
                                <Text className="text-white text-[18px] font-bold leading-tight mb-2" numberOfLines={2}>
                                    {books[0].title}
                                </Text>
                                <Text className="text-green-50 text-[13px] font-medium mb-3">
                                    {books[0].author}
                                </Text>
                            </View>
                            <View className="shadow-medium">
                                <BookCard
                                    book={books[0]}
                                    onPress={() => { }}
                                    containerStyle={{
                                        width: 80,
                                        height: 120,
                                        marginBottom: 0,
                                    }}
                                />
                            </View>
                        </View>
                    </TouchableOpacity>
                </View>
            )}

            {/* Figma Search Bar */}
            <View className="px-6 mb-6">
                <View className="flex-row items-center bg-white dark:bg-surface-dark rounded-lg px-4 py-3 shadow-soft">
                    <Search size={18} color="#94A3B8" style={{ marginRight: 10 }} />
                    <TextInput
                        className="flex-1 text-[14px] font-medium text-slate-900 dark:text-white h-full"
                        placeholder="Search books..."
                        placeholderTextColor="#94A3B8"
                        value={search}
                        onChangeText={setSearch}
                    />
                    <TouchableOpacity className="ml-2">
                        <Filter size={18} color="#34A853" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Categories */}
            <View className="mb-6">
                <View className="flex-row justify-between items-center px-6 mb-4">
                    <Text className="text-[18px] font-bold text-slate-900 dark:text-white">Categories</Text>
                </View>
                <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={categories}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                        <CategoryChip
                            category={item}
                            selected={selectedCategory === item.id}
                            onPress={() => setSelectedCategory(selectedCategory === item.id ? null : item.id)}
                        />
                    )}
                    contentContainerStyle={{ paddingLeft: 24, paddingRight: 24 }}
                />
            </View>

            <View className="px-6 mb-4">
                <Text className="text-[18px] font-bold text-slate-900 dark:text-white">
                    {selectedCategory ? "Explore" : "New Releases"}
                </Text>
            </View>
        </View>
    );

    const renderBook = ({ item }: { item: any }) => (
        <BookCard
            book={item}
            onPress={() => (navigation as any).navigate('BookDetail', { bookId: item.id })}
            containerStyle={{ width: '46%' }}
        />
    );

    return (
        <Layout className="bg-background-light dark:bg-background-dark" noInsets>
            <StatusBar barStyle="dark-content" />

            {loading && !books.length ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#34A853" />
                    <Text className="mt-4 font-medium text-slate-400">Loading...</Text>
                </View>
            ) : (
                <FlatList
                    data={books}
                    keyExtractor={(item: any) => item.id.toString()}
                    renderItem={renderBook}
                    numColumns={2}
                    columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 24 }}
                    ListHeaderComponent={renderHeader}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 100 }}
                />
            )}
        </Layout>
    );
};

export default HomeScreen;
