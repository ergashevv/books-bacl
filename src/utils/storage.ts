import AsyncStorage from '@react-native-async-storage/async-storage';

// Check if we're on web
const isWeb = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

// Universal storage that works on both web and mobile
export const storage = {
    async getItem(key: string): Promise<string | null> {
        if (isWeb) {
            return window.localStorage.getItem(key);
        }
        return await AsyncStorage.getItem(key);
    },

    async setItem(key: string, value: string): Promise<void> {
        if (isWeb) {
            window.localStorage.setItem(key, value);
        } else {
            await AsyncStorage.setItem(key, value);
        }
    },

    async removeItem(key: string): Promise<void> {
        if (isWeb) {
            window.localStorage.removeItem(key);
        } else {
            await AsyncStorage.removeItem(key);
        }
    }
};

