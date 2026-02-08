import { useNavigation } from '@react-navigation/native';
import {
    Bookmark,
    ChevronRight,
    Crown,
    LayoutDashboard,
    LogOut,
    Settings,
    Shield,
    User
} from 'lucide-react-native';
import React from 'react';
import { Alert, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Layout from '../../components/Layout';
import { useAuthStore } from '../../store/useAuthStore';
import { useBookStore } from '../../store/useBookStore';

const ProfileScreen = () => {
    const { session, signOut } = useAuthStore();
    const { favorites } = useBookStore();
    const navigation = useNavigation();

    const handleLogout = async () => {
        Alert.alert(
            "Logout",
            "Are you sure you want to sign out?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Logout",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await signOut();
                        } catch {
                            Alert.alert("Error signing out");
                        }
                    }
                }
            ]
        );
    };

    const SettingItem = ({ icon: Icon, title, subtitle, color = "#34A853", isLast = false, onPress }: any) => (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.6}
            className={`flex-row items-center py-4 ${!isLast ? 'border-b border-slate-50 dark:border-slate-800' : ''}`}
        >
            <View className="w-10 h-10 rounded-lg items-center justify-center mr-4" style={{ backgroundColor: `${color}10` }}>
                <Icon size={18} color={color} />
            </View>
            <View className="flex-1">
                <Text className="text-[16px] font-bold text-slate-800 dark:text-slate-100">{title}</Text>
                {subtitle && <Text className="text-[12px] text-slate-400 dark:text-slate-500 mt-0.5">{subtitle}</Text>}
            </View>
            <ChevronRight size={16} color="#CBD5E1" />
        </TouchableOpacity>
    );

    return (
        <Layout className="bg-background-light dark:bg-background-dark" noInsets>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Figma Style Header */}
                <View className="bg-white dark:bg-surface-dark px-6 pt-16 pb-10 rounded-b-3xl shadow-soft">
                    <View className="items-center">
                        <View className="relative">
                            <View className="w-24 h-24 rounded-lg bg-slate-50 dark:bg-slate-800 p-1 border border-slate-100 dark:border-slate-700">
                                <View className="w-full h-full rounded-lg bg-slate-100 dark:bg-slate-700 items-center justify-center overflow-hidden">
                                    {session?.user?.avatar_url ? (
                                        <Image source={{ uri: session.user.avatar_url }} className="w-full h-full" />
                                    ) : (
                                        <User size={40} color="#94A3B8" />
                                    )}
                                </View>
                            </View>
                            <View className="absolute bottom--2 right-2 bg-primary w-7 h-7 rounded-lg items-center justify-center border-2 border-white dark:border-surface-dark">
                                <Crown size={12} color="white" />
                            </View>
                        </View>

                        <Text className="text-[22px] font-bold text-slate-900 dark:text-white mt-4">
                            {session?.user?.full_name ?? "Reader"}
                        </Text>
                        <Text className="text-slate-400 dark:text-slate-500 text-[14px] font-medium mt-1">
                            {session?.user?.username ? `@${session.user.username}` : "Book Lover"}
                        </Text>

                        {/* Figma Stats */}
                        <View className="flex-row mt-8 space-x-4 px-4 w-full">
                            <View className="flex-1 items-center">
                                <Text className="text-[18px] font-bold text-slate-900 dark:text-white">12</Text>
                                <Text className="text-[12px] text-slate-400 font-medium">Read Books</Text>
                            </View>
                            <View className="w-[1px] h-10 bg-slate-100 dark:bg-slate-800" />
                            <View className="flex-1 items-center">
                                <Text className="text-[18px] font-bold text-slate-900 dark:text-white">{favorites.length}</Text>
                                <Text className="text-[12px] text-slate-400 font-medium">Favorites</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Settings Section */}
                <View className="px-6 mt-8">
                    <View className="bg-white dark:bg-surface-dark rounded-lg px-5 shadow-soft border border-slate-100 dark:border-slate-800">
                        <SettingItem
                            icon={User}
                            title="My Profile"
                            subtitle="Edit personal details"
                        />
                        <SettingItem
                            icon={Bookmark}
                            title="My Collection"
                            subtitle="Books you love"
                        />
                        <SettingItem
                            icon={Shield}
                            title="Privacy"
                            subtitle="Manage your data"
                        />
                        <SettingItem
                            icon={Settings}
                            title="Settings"
                            isLast
                            onPress={() => { }}
                        />
                    </View>

                    {/* Admin Dashboard */}
                    {session?.user?.role === 'admin' && (
                        <>
                            <Text className="text-[12px] font-bold text-slate-400 uppercase tracking-[2px] mt-8 mb-4 ml-2">Administrative</Text>
                            <View className="bg-white dark:bg-surface-dark rounded-lg px-5 shadow-soft border border-slate-100 dark:border-slate-800">
                                <SettingItem
                                    icon={LayoutDashboard}
                                    title="Admin Dashboard"
                                    subtitle="Manage books and categories"
                                    isLast
                                    onPress={() => (navigation as any).navigate('AdminDashboard')}
                                />
                            </View>
                        </>
                    )}

                    {/* Sign Out Button */}
                    <TouchableOpacity
                        onPress={handleLogout}
                        activeOpacity={0.8}
                        className="mt-8 bg-white dark:bg-surface-dark p-4 rounded-lg flex-row items-center justify-center shadow-soft border border-rose-50 dark:border-rose-900/30 mb-8"
                    >
                        <LogOut size={18} color="#EF4444" />
                        <Text className="text-rose-500 font-bold ml-3 text-[16px]">Sign Out</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </Layout>
    );
};

export default ProfileScreen;
