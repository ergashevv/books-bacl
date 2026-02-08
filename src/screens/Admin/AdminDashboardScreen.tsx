import { useNavigation } from '@react-navigation/native';
import { Edit2, Plus, Trash2 } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { Alert, FlatList, Image, Text, TouchableOpacity, View } from 'react-native';
import Layout from '../../components/Layout';
import { useBookStore } from '../../store/useBookStore';
import { getImageUrl } from '../../utils/api';

const AdminDashboardScreen = () => {
    const { books, fetchBooks, deleteBook } = useBookStore();
    const navigation = useNavigation<any>();

    useEffect(() => {
        fetchBooks();
    }, [fetchBooks]);

    const handleDelete = (id: number, title: string) => {
        Alert.alert(
            "Delete Book",
            `Are you sure you want to delete "${title}"?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        const success = await deleteBook(id);
                        if (success) {
                            Alert.alert("Success", "Book deleted successfully");
                        } else {
                            Alert.alert("Error", "Failed to delete book");
                        }
                    }
                }
            ]
        );
    };

    const renderBookItem = ({ item }: { item: any }) => (
        <View className="flex-row items-center bg-white dark:bg-surface-dark p-4 rounded-lg mb-4 shadow-soft">
            <Image
                source={{ uri: getImageUrl(item.cover_url) }}
                className="w-16 h-24 rounded-lg"
                resizeMode="cover"
            />
            <View className="flex-1 ml-4">
                <Text className="text-[16px] font-bold text-slate-800 dark:text-white" numberOfLines={1}>
                    {item.title}
                </Text>
                <Text className="text-[14px] text-slate-500 mt-1">{item.author}</Text>
                <View className="flex-row items-center mt-2">
                    <View className={`px-2 py-0.5 rounded ${item.is_premium ? 'bg-amber-100' : 'bg-green-100'}`}>
                        <Text className={`text-[10px] font-bold ${item.is_premium ? 'text-amber-700' : 'text-green-700'}`}>
                            {item.is_premium ? 'PREMIUM' : 'FREE'}
                        </Text>
                    </View>
                </View>
            </View>
            <View className="flex-row space-x-2">
                <TouchableOpacity
                    onPress={() => navigation.navigate('AdminBookForm', { book: item })}
                    className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg"
                >
                    <Edit2 size={18} color="#34A853" />
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => handleDelete(item.id, item.title)}
                    className="p-2 bg-rose-50 dark:bg-rose-900/30 rounded-lg"
                >
                    <Trash2 size={18} color="#EF4444" />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <Layout className="bg-background-light dark:bg-background-dark">
            <View className="flex-1 px-6 pt-4">
                <View className="flex-row justify-between items-center mb-6">
                    <Text className="text-[24px] font-bold text-slate-900 dark:text-white">Book Admin</Text>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('AdminBookForm')}
                        className="bg-primary p-3 rounded-lg shadow-soft flex-row items-center"
                    >
                        <Plus size={20} color="white" />
                        <Text className="text-white font-bold ml-2">Add New</Text>
                    </TouchableOpacity>
                </View>

                <FlatList
                    data={books}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderBookItem}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 100 }}
                />
            </View>
        </Layout>
    );
};

export default AdminDashboardScreen;
