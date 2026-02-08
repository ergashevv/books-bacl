import { ChevronLeft, Maximize, Settings2 } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Animated, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

const ReaderScreen = ({ route, navigation }: any) => {
    const { pdfUrl, title } = route.params;


    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(true);
    const [theme, setTheme] = useState<'paper' | 'sepia' | 'dark'>('paper');
    const [headerVisible] = useState(new Animated.Value(1));
    const [isImmersive, setIsImmersive] = useState(false);

    const themeColors = {
        paper: { bg: '#F8FAFC', text: '#1E293B', header: '#FFFFFF' },
        sepia: { bg: '#FEF9EF', text: '#433422', header: '#FDF5E6' },
        dark: { bg: '#0F172A', text: '#F8FAFC', header: '#1E293B' }
    };

    const toggleImmersive = () => {
        setIsImmersive(!isImmersive);
        Animated.timing(headerVisible, {
            toValue: isImmersive ? 1 : 0,
            duration: 350,
            useNativeDriver: true
        }).start();
    };

    const headerY = headerVisible.interpolate({
        inputRange: [0, 1],
        outputRange: [-110, 0]
    });

    const injectedJS = `
        const hideUI = () => {
            const selectors = ['.ndfHFb-c43EBc-HpQ3mf-wosMWb', '.ndfHFb-c43EBc-iI709b', '.ndfHFb-c43EBc-S069nd', 'header', 'footer'];
            selectors.forEach(s => {
                const el = document.querySelector(s);
                if (el) el.style.display = 'none';
            });
            document.body.style.backgroundColor = '${themeColors[theme].bg}';
        };
        setInterval(hideUI, 500);
        true;
    `;

    const renderLoading = () => (
        <View className="absolute inset-0 justify-center items-center" style={{ backgroundColor: themeColors[theme].bg }}>
            <ActivityIndicator size="large" color="#34A853" />
            <Text className="mt-8 text-lg font-medium" style={{ color: themeColors[theme].text }}>
                Preparing your reading experience...
            </Text>
        </View>
    );

    return (
        <View className="flex-1" style={{ backgroundColor: themeColors[theme].bg }}>
            <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} hidden={isImmersive} animated />

            <TouchableOpacity activeOpacity={1} onPress={toggleImmersive} className="absolute inset-0 z-0" />

            {/* Premium Reader Header */}
            <Animated.View
                className="absolute left-0 right-0 z-30 shadow-sm"
                style={{
                    transform: [{ translateY: headerY }],
                    paddingTop: insets.top,
                    backgroundColor: themeColors[theme].header,
                    height: insets.top + 70,
                    borderBottomWidth: 1,
                    borderBottomColor: theme === 'dark' ? '#334155' : '#f1f5f9'
                }}
            >
                <View className="flex-row items-center h-full px-6">
                    <TouchableOpacity onPress={() => navigation.goBack()} className="p-2">
                        <ChevronLeft color={themeColors[theme].text} size={24} />
                    </TouchableOpacity>

                    <View className="flex-1 ml-3">
                        <Text className="text-lg font-bold" style={{ color: themeColors[theme].text }} numberOfLines={1}>
                            {title}
                        </Text>
                    </View>

                    <TouchableOpacity className="p-2">
                        <Settings2 color={themeColors[theme].text} size={20} />
                    </TouchableOpacity>
                </View>
            </Animated.View>

            {/* Viewer content */}
            <View className="flex-1">
                <WebView
                    source={{
                        uri: pdfUrl.includes('localhost') || pdfUrl.includes('192.168.') || pdfUrl.includes('onrender.com') || pdfUrl.startsWith('/')
                            ? pdfUrl
                            : `https://docs.google.com/viewer?url=${encodeURIComponent(pdfUrl)}&embedded=true`
                    }}
                    onLoadEnd={() => setLoading(false)}
                    injectedJavaScript={injectedJS}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    style={{ flex: 1, opacity: loading ? 0 : 1, backgroundColor: themeColors[theme].bg }}
                    scalesPageToFit={true}
                />
            </View>

            {/* Contemporary Floating Theme Bar */}
            <Animated.View
                className="absolute bottom-10 self-center bg-slate-900/90 dark:bg-slate-800/90 px-6 py-4 rounded-3xl flex-row items-center shadow-xl z-30"
                style={{
                    transform: [{ translateY: headerVisible.interpolate({ inputRange: [0, 1], outputRange: [200, 0] }) }]
                }}
            >
                <View className="flex-row items-center space-x-5">
                    <TouchableOpacity onPress={() => setTheme('paper')} className={`w-8 h-8 rounded-full border-2 ${theme === 'paper' ? 'border-primary' : 'border-transparent'} bg-[#F8FAFC]`} />
                    <TouchableOpacity onPress={() => setTheme('sepia')} className={`w-8 h-8 rounded-full border-2 ${theme === 'sepia' ? 'border-primary' : 'border-transparent'} bg-[#FEF9EF]`} />
                    <TouchableOpacity onPress={() => setTheme('dark')} className={`w-8 h-8 rounded-full border-2 ${theme === 'dark' ? 'border-primary' : 'border-primary'} bg-[#0F172A]`} />
                </View>
                <View className="w-[1px] h-5 bg-slate-700 mx-6" />
                <TouchableOpacity onPress={toggleImmersive}>
                    <Maximize size={20} color="white" />
                </TouchableOpacity>
            </Animated.View>

            {loading && renderLoading()}
        </View>
    );
};

export default ReaderScreen;
