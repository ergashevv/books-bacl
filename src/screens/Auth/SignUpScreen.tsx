import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, BookOpen, ArrowRight } from 'lucide-react-native';
import React from 'react';
import { Alert, Linking, Text, TouchableOpacity, View, StatusBar, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/useAuthStore';

const SignUpScreen = () => {
    const { signInWithTelegramRealtime } = useAuthStore();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const fadeAnim = React.useRef(new Animated.Value(0)).current;
    const slideAnim = React.useRef(new Animated.Value(50)).current;

    React.useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 600,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const handleTelegramSignUp = async () => {
        try {
            const deepLink = await signInWithTelegramRealtime();
            await Linking.openURL(deepLink);
        } catch (error: any) {
            Alert.alert('Xatolik', error.message);
        }
    };

    return (
        <View className="flex-1 bg-white">
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
            
            {/* Gradient Background */}
            <LinearGradient
                colors={['#34A853', '#2E9448', '#1E7E3A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="absolute inset-0"
            />
            
            {/* Decorative Elements */}
            <View className="absolute top-20 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            <View className="absolute bottom-40 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl" />

            <View className="flex-1 px-6" style={{ paddingTop: insets.top + 10 }}>
                {/* Back Button */}
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    className="mb-8"
                >
                    <View className="bg-white/20 backdrop-blur-xl w-10 h-10 rounded-xl items-center justify-center">
                        <ArrowLeft size={20} color="#ffffff" />
                    </View>
                </TouchableOpacity>

                {/* Logo/Icon */}
                <Animated.View
                    style={{
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }],
                    }}
                    className="items-center mb-12"
                >
                    <View className="bg-white/20 backdrop-blur-xl w-20 h-20 rounded-2xl items-center justify-center mb-6 shadow-lg">
                        <BookOpen size={40} color="#ffffff" strokeWidth={2} />
                    </View>
                </Animated.View>

                {/* Main Content */}
                <Animated.View
                    style={{
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }],
                    }}
                    className="flex-1"
                >
                    <Text className="text-white text-3xl font-bold mb-3 leading-tight">
                        Hisob yaratish
                    </Text>
                    <Text className="text-white/80 text-base leading-6 mb-12">
                        Telegram orqali tez va xavfsiz ro'yxatdan o'ting
                    </Text>

                    {/* Action Button */}
                    <TouchableOpacity
                        onPress={handleTelegramSignUp}
                        activeOpacity={0.9}
                        className="bg-white rounded-2xl h-16 flex-row items-center justify-center shadow-xl mb-6"
                    >
                        <Text className="text-primary text-lg font-bold mr-2">
                            Telegram orqali ro'yxatdan o'tish
                        </Text>
                        <ArrowRight size={20} color="#34A853" />
                    </TouchableOpacity>

                    {/* Login Link */}
                    <View className="flex-row justify-center">
                        <Text className="text-white/70 text-base">
                            Allaqachon hisobingiz bormi?{' '}
                        </Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Login' as never)}>
                            <Text className="text-white font-bold text-base underline">
                                Kirish
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Benefits */}
                    <View className="mt-16">
                        <View className="flex-row items-start mb-3">
                            <View className="w-1.5 h-1.5 bg-white rounded-full mt-2 mr-3" />
                            <Text className="text-white/70 text-sm flex-1">
                                Bepul va tez ro'yxatdan o'tish
                            </Text>
                        </View>
                        <View className="flex-row items-start mb-3">
                            <View className="w-1.5 h-1.5 bg-white rounded-full mt-2 mr-3" />
                            <Text className="text-white/70 text-sm flex-1">
                                Parol eslab qolish shart emas
                            </Text>
                        </View>
                        <View className="flex-row items-start">
                            <View className="w-1.5 h-1.5 bg-white rounded-full mt-2 mr-3" />
                            <Text className="text-white/70 text-sm flex-1">
                                Xavfsiz va shaxsiy
                            </Text>
                        </View>
                    </View>
                </Animated.View>
            </View>
        </View>
    );
};

export default SignUpScreen;
