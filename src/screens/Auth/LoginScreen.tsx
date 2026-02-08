import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Send } from 'lucide-react-native';
import React from 'react';
import { Alert, ImageBackground, Linking, Text, TouchableOpacity, View } from 'react-native';
import { useAuthStore } from '../../store/useAuthStore';

const LoginScreen = () => {
    const { signInWithTelegramRealtime } = useAuthStore();
    const navigation = useNavigation();

    const handleTelegramLogin = async () => {
        try {
            const deepLink = await signInWithTelegramRealtime();
            await Linking.openURL(deepLink);
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    return (
        <ImageBackground
            source={require('../../../assets/images/login_bg.png')}
            className="flex-1"
            resizeMode="cover"
        >
            <LinearGradient
                colors={['rgba(15,23,42,0.6)', 'rgba(15,23,42,0.85)', '#0F172A']}
                className="flex-1 justify-end px-8 pb-16"
            >
                <View className="mb-12">
                    <View className="bg-accent/20 self-start px-4 py-1.5 rounded-full mb-6 border border-accent/30 backdrop-blur-md">
                        <Text className="text-accent-light text-[10px] font-bold tracking-[3px] uppercase">Premium Library</Text>
                    </View>
                    <Text className="text-5xl font-bold text-white mb-4 font-serif leading-tight">
                        Your Personal{"\n"}
                        <Text className="text-accent-light italic">Literary Haven</Text>
                    </Text>
                    <Text className="text-gray-300 text-lg leading-7 font-medium opacity-90">
                        Dive into a curated collection of masterpieces. Access your library anytime, anywhere.
                    </Text>
                </View>

                {/* Glassmorphic Action Card */}
                <View className="bg-white/10 p-8 rounded-[40px] border border-white/20 backdrop-blur-3xl shadow-2xl">
                    <Text className="text-white text-xl font-bold mb-6 text-center font-serif">Get Started</Text>

                    <TouchableOpacity
                        onPress={handleTelegramLogin}
                        activeOpacity={0.9}
                        className="bg-white h-16 rounded-3xl flex-row items-center justify-center shadow-xl"
                    >
                        <Send size={24} color="#1E293B" className="mr-3" />
                        <Text className="text-primary text-lg font-bold">Continue with Telegram</Text>
                    </TouchableOpacity>

                    <View className="flex-row justify-center mt-8">
                        <Text className="text-gray-400 font-medium">New here? </Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Signup' as never)}>
                            <Text className="text-white font-bold decoration-white">Create an Account</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View className="mt-10 items-center">
                    <Text className="text-gray-500 text-[10px] font-bold tracking-widest uppercase opacity-60">
                        Powered by Neon DB & Telegram
                    </Text>
                </View>
            </LinearGradient>
        </ImageBackground>
    );
};

export default LoginScreen;
