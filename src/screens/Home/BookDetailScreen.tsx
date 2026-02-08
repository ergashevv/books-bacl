import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { ChevronLeft, Heart } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Layout from '../../components/Layout';
import { useAuthStore } from '../../store/useAuthStore';
import { useBookStore } from '../../store/useBookStore';
import { Book } from '../../types';
import { getImageUrl, getPdfUrl } from '../../utils/api';

type DetailRouteProp = RouteProp<{ Detail: { bookId: string } }, 'Detail'>;



const BookDetailScreen = () => {
    const route = useRoute<DetailRouteProp>();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { bookId } = (route.params as any);
    const { getBookDetail, toggleFavorite, favorites, updateProgress } = useBookStore();

    const [book, setBook] = useState<Book | null>(null);
    const [loading, setLoading] = useState(true);

    const isFavorite = favorites.includes(bookId);

    const loadData = useCallback(async () => {
        setLoading(true);
        const data = await getBookDetail(bookId);
        if (data) setBook(data.book);
        setLoading(false);
    }, [bookId, getBookDetail]);

    useEffect(() => { 
        loadData(); 
    }, [loadData]);

    const handleRead = async () => {
        if (!book || !book.pdf_path) {
            Alert.alert("Notice", "This book is temporarily unavailable.");
            return;
        }
        updateProgress(book.id, 1);
        (navigation as any).navigate('Reader', { pdfUrl: getPdfUrl(book.pdf_path), title: book.title });
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-background-light dark:bg-background-dark">
                <ActivityIndicator size="large" color="#34A853" />
                <Text className="mt-4 font-medium text-slate-400">Loading...</Text>
            </View>
        );
    }

    if (!book) return null;
    const imageUrl = getImageUrl(book.cover_url);

    return (
        <Layout className="bg-background-light dark:bg-background-dark" noInsets>
            <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

            <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
                {/* Navbar */}
                <View className="flex-row justify-between items-center px-6 z-20" style={{ marginTop: insets.top + 10 }}>
                    <TouchableOpacity onPress={() => navigation.goBack()} className="bg-white dark:bg-surface-dark p-3 rounded-lg shadow-soft">
                        <ChevronLeft color="#34A853" size={24} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => toggleFavorite(book.id)} className="bg-white dark:bg-surface-dark p-3 rounded-lg shadow-soft">
                        <Heart color={isFavorite ? "#EF4444" : "#34A853"} fill={isFavorite ? "#EF4444" : "transparent"} size={22} />
                    </TouchableOpacity>
                </View>

                {/* Figma Style Content */}
                <View className="items-center mt-8 px-6">
                    <View className="shadow-medium rounded-lg overflow-hidden mb-8">
                        <Image source={{ uri: imageUrl }} className="w-64 h-96 rounded-lg" resizeMode="cover" />
                    </View>

                    <Text className="text-[24px] font-bold text-slate-900 dark:text-white text-center leading-tight">
                        {book.title}
                    </Text>
                    <Text className="text-[16px] text-slate-500 dark:text-slate-400 font-medium mt-2">
                        {book.author}
                    </Text>

                    {/* Stats */}
                    <View className="flex-row mt-6 space-x-8">
                        <View className="items-center">
                            <Text className="text-[18px] font-bold text-slate-900 dark:text-white">4.8</Text>
                            <Text className="text-[12px] text-slate-400 font-medium">Rating</Text>
                        </View>
                        <View className="items-center">
                            <Text className="text-[18px] font-bold text-slate-900 dark:text-white">362</Text>
                            <Text className="text-[12px] text-slate-400 font-medium">Pages</Text>
                        </View>
                        <View className="items-center">
                            <Text className="text-[18px] font-bold text-slate-900 dark:text-white uppercase">{book.language || 'UZ'}</Text>
                            <Text className="text-[12px] text-slate-400 font-medium">Language</Text>
                        </View>
                    </View>

                    {/* Description */}
                    <View className="w-full mt-10">
                        <Text className="text-[18px] font-bold text-slate-900 dark:text-white mb-3">Overview</Text>
                        <Text className="text-[14px] text-slate-600 dark:text-slate-300 leading-6">
                            {book.description || "Dive into this captivating story. A masterpiece that explores the depths of human emotions and the wonders of imagination."}
                        </Text>
                    </View>

                    {/* Action Button */}
                    <TouchableOpacity
                        onPress={handleRead}
                        activeOpacity={0.8}
                        className="bg-primary w-full p-4 rounded-lg items-center justify-center shadow-soft mt-10"
                    >
                        <Text className="text-white text-[16px] font-bold">Start Reading</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </Layout>
    );
};

export default BookDetailScreen;
