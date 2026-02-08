import React from 'react';
import 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import "./global.css";
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
    return (
        <SafeAreaProvider>
            <RootNavigator />
        </SafeAreaProvider>
    );
}
