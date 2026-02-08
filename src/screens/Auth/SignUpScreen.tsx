import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { Alert, Linking, Text, TouchableOpacity, View } from 'react-native';
import Button from '../../components/Button';
import Layout from '../../components/Layout';
import { useAuthStore } from '../../store/useAuthStore';

const SignUpScreen = () => {
    const { signInWithTelegramRealtime } = useAuthStore();
    const navigation = useNavigation();

    const handleTelegramSignUp = async () => {
        try {
            const deepLink = await signInWithTelegramRealtime();
            await Linking.openURL(deepLink);
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    return (
        <Layout className="justify-center px-6">
            <View className="items-center mb-10">
                <Text className="text-4xl mb-4">📚</Text>
                <Text className="text-3xl font-bold text-slate-900 dark:text-white text-center">
                    Create Account
                </Text>
                <Text className="text-slate-500 text-center mt-2">
                    Sign up with Telegram to get started
                </Text>
            </View>

            <View className="space-y-4">
                <Button
                    title="Sign Up with Telegram"
                    onPress={handleTelegramSignUp}
                    icon={<Text className="text-xl mr-2">✈️</Text>}
                />

                <View className="flex-row justify-center mt-6">
                    <Text className="text-slate-600 dark:text-slate-400">
                        Already have an account?{' '}
                    </Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Login' as never)}>
                        <Text className="text-indigo-600 font-semibold">Login</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Layout>
    );
};

export default SignUpScreen;
