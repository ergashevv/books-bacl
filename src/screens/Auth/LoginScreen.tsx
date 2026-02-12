import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BookOpen, Sparkles, ArrowRight } from 'lucide-react-native';
import React from 'react';
import { Alert, Linking, Text, TouchableOpacity, View, StatusBar, Animated, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/useAuthStore';

const LoginScreen = () => {
    const { signInWithTelegramRealtime, requestSmsOtp, verifySmsOtp, loading } = useAuthStore();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const fadeAnim = React.useRef(new Animated.Value(0)).current;
    const slideAnim = React.useRef(new Animated.Value(50)).current;
    const [phone, setPhone] = React.useState('');
    const [otpCode, setOtpCode] = React.useState('');
    const [smsCooldown, setSmsCooldown] = React.useState(0);

    React.useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 800,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const handleTelegramLogin = async () => {
        try {
            const deepLink = await signInWithTelegramRealtime();
            await Linking.openURL(deepLink);
        } catch (error: any) {
            Alert.alert('Xatolik', error.message);
        }
    };

    React.useEffect(() => {
        if (smsCooldown <= 0) return;
        const timer = setInterval(() => {
            setSmsCooldown((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(timer);
    }, [smsCooldown]);

    const handleSendSmsCode = async () => {
        try {
            const result = await requestSmsOtp(phone);
            setSmsCooldown(result.retry_after_seconds ?? 120);
            Alert.alert('Yuborildi', 'Tasdiqlash kodi SMS orqali yuborildi.');
        } catch (error: any) {
            Alert.alert('Xatolik', error.message);
        }
    };

    const handleVerifySmsCode = async () => {
        try {
            await verifySmsOtp(phone, otpCode);
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

            <View className="flex-1 px-6" style={{ paddingTop: insets.top + 20 }}>
                {/* Logo/Icon Section */}
                <Animated.View
                    style={{
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }],
                    }}
                    className="items-center mt-16 mb-12"
                >
                    <View className="bg-white/20 backdrop-blur-xl w-24 h-24 rounded-3xl items-center justify-center mb-6 shadow-lg">
                        <BookOpen size={48} color="#ffffff" strokeWidth={2} />
                    </View>
                    <View className="flex-row items-center gap-2">
                        <Sparkles size={20} color="#ffffff" fill="#ffffff" />
                        <Text className="text-white/90 text-sm font-semibold tracking-wider">
                            PREMIUM LIBRARY
                        </Text>
                        <Sparkles size={20} color="#ffffff" fill="#ffffff" />
                    </View>
                </Animated.View>

                {/* Main Content */}
                <Animated.View
                    style={{
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }],
                    }}
                    className="flex-1 justify-center"
                >
                    <Text className="text-white text-4xl font-bold mb-4 leading-tight">
                        Kitob o'qish{'\n'}tajribangizni{'\n'}yaxshilang
                    </Text>
                    <Text className="text-white/80 text-lg leading-7 mb-12 font-medium">
                        Minglab kitoblar, zamonaviy interfeys va qulay o'qish muhiti
                    </Text>

                    {/* Action Buttons */}
                    <View>
                        <TouchableOpacity
                            onPress={handleTelegramLogin}
                            activeOpacity={0.9}
                            className="bg-white rounded-2xl h-16 flex-row items-center justify-center shadow-xl mb-4"
                        >
                            <Text className="text-primary text-lg font-bold mr-2">
                                Telegram orqali kirish
                            </Text>
                            <ArrowRight size={20} color="#34A853" />
                        </TouchableOpacity>

                        <View className="bg-white/10 border border-white/25 rounded-2xl p-4 mb-4">
                            <Text className="text-white text-base font-semibold mb-3">
                                SMS orqali kirish
                            </Text>
                            <TextInput
                                value={phone}
                                onChangeText={setPhone}
                                placeholder="+998901234567"
                                placeholderTextColor="rgba(255,255,255,0.6)"
                                keyboardType="phone-pad"
                                className="bg-white/15 text-white rounded-xl px-4 h-12 mb-3"
                            />
                            <TextInput
                                value={otpCode}
                                onChangeText={setOtpCode}
                                placeholder="6 xonali kod"
                                placeholderTextColor="rgba(255,255,255,0.6)"
                                keyboardType="number-pad"
                                maxLength={6}
                                className="bg-white/15 text-white rounded-xl px-4 h-12 mb-3"
                            />
                            <TouchableOpacity
                                onPress={handleSendSmsCode}
                                disabled={smsCooldown > 0}
                                className="bg-white rounded-xl h-12 items-center justify-center mb-2"
                            >
                                <Text className="text-primary font-bold">
                                    {smsCooldown > 0 ? `Qayta yuborish ${smsCooldown}s` : 'SMS kod yuborish'}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleVerifySmsCode}
                                disabled={loading}
                                className="bg-primary rounded-xl h-12 items-center justify-center"
                            >
                                <Text className="text-white font-bold">Kod bilan kirish</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            onPress={() => navigation.navigate('Signup' as never)}
                            className="bg-white/10 backdrop-blur-xl border-2 border-white/30 rounded-2xl h-16 flex-row items-center justify-center"
                        >
                            <Text className="text-white text-lg font-semibold">
                                Hisob yaratish
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Features */}
                    <View className="mt-16">
                        <View className="flex-row items-center mb-4">
                            <View className="w-2 h-2 bg-white rounded-full mr-3" />
                            <Text className="text-white/70 text-base">
                                PDF, EPUB va boshqa formatlar
                            </Text>
                        </View>
                        <View className="flex-row items-center mb-4">
                            <View className="w-2 h-2 bg-white rounded-full mr-3" />
                            <Text className="text-white/70 text-base">
                                Zamonaviy o'qish muhiti
                            </Text>
                        </View>
                        <View className="flex-row items-center">
                            <View className="w-2 h-2 bg-white rounded-full mr-3" />
                            <Text className="text-white/70 text-base">
                                Bookmark va progress tracking
                            </Text>
                        </View>
                    </View>
                </Animated.View>

                {/* Footer */}
                <Animated.View
                    style={{ opacity: fadeAnim }}
                    className="pb-8 items-center"
                >
                    <Text className="text-white/50 text-xs font-medium">
                        Neon DB & Telegram bilan quvvatlanadi
                    </Text>
                </Animated.View>
            </View>
        </View>
    );
};

export default LoginScreen;
