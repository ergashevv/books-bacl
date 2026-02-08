import { ChevronLeft, ChevronRight, Bookmark, BookmarkCheck, Settings2, Maximize, Minus, Plus } from 'lucide-react-native';
import React, { useRef, useState, useEffect } from 'react';
import { ActivityIndicator, Animated, Dimensions, PanResponder, StatusBar, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PAGE_WIDTH = SCREEN_WIDTH - 40;
const PAGE_HEIGHT = SCREEN_HEIGHT - 200;

const ReaderScreen = ({ route, navigation }: any) => {
    const { pdfUrl, title, bookId } = route.params;
    const insets = useSafeAreaInsets();
    
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [theme, setTheme] = useState<'paper' | 'sepia' | 'dark'>('paper');
    const [headerVisible] = useState(new Animated.Value(1));
    const [isImmersive, setIsImmersive] = useState(false);
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [fontSize, setFontSize] = useState(16);
    const [showControls, setShowControls] = useState(true);
    
    const flipAnimation = useRef(new Animated.Value(0)).current;
    const pageX = useRef(0);
    const webViewRef = useRef<WebView>(null);

    const themeColors = {
        paper: { bg: '#F8FAFC', text: '#1E293B', page: '#FFFFFF', shadow: '#E2E8F0' },
        sepia: { bg: '#FEF9EF', text: '#433422', page: '#FDF5E6', shadow: '#E8D5B7' },
        dark: { bg: '#0F172A', text: '#F8FAFC', page: '#1E293B', shadow: '#334155' }
    };

    // PDF.js HTML with page-by-page rendering
    const pdfViewerHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            background-color: ${themeColors[theme].bg};
            overflow-x: hidden;
            -webkit-overflow-scrolling: touch;
        }
        #pdf-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 20px 0;
            min-height: 100vh;
        }
        .page-wrapper {
            margin: 20px 0;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            border-radius: 4px;
            overflow: hidden;
            background: ${themeColors[theme].page};
        }
        canvas {
            display: block;
            width: 100%;
            height: auto;
            max-width: ${PAGE_WIDTH}px;
        }
        .page-number {
            text-align: center;
            padding: 10px;
            color: ${themeColors[theme].text};
            font-size: 14px;
            opacity: 0.6;
        }
        .loading {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            color: ${themeColors[theme].text};
        }
    </style>
</head>
<body>
    <div id="pdf-container"></div>
    <script>
        let pdfDoc = null;
        let currentPageNum = 1;
        const container = document.getElementById('pdf-container');
        
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        
        function renderPage(pageNum) {
            pdfDoc.getPage(pageNum).then(function(page) {
                const viewport = page.getViewport({ scale: ${PAGE_WIDTH / 612} });
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                
                const pageWrapper = document.createElement('div');
                pageWrapper.className = 'page-wrapper';
                
                const pageNumber = document.createElement('div');
                pageNumber.className = 'page-number';
                pageNumber.textContent = 'Sahifa ' + pageNum + ' / ' + pdfDoc.numPages;
                
                pageWrapper.appendChild(canvas);
                pageWrapper.appendChild(pageNumber);
                container.appendChild(pageWrapper);
                
                const renderContext = {
                    canvasContext: ctx,
                    viewport: viewport
                };
                
                page.render(renderContext).promise.then(function() {
                    if (pageNum < pdfDoc.numPages) {
                        renderPage(pageNum + 1);
                    } else {
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: 'loaded',
                            totalPages: pdfDoc.numPages
                        }));
                    }
                });
            });
        }
        
        function loadPDF() {
            fetch('${pdfUrl}')
                .then(response => response.arrayBuffer())
                .then(data => {
                    pdfjsLib.getDocument({ data: data }).promise.then(function(pdf) {
                        pdfDoc = pdf;
                        currentPageNum = 1;
                        container.innerHTML = '';
                        renderPage(1);
                    });
                })
                .catch(error => {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'error',
                        message: error.message
                    }));
                });
        }
        
        function scrollToPage(pageNum) {
            const pages = document.querySelectorAll('.page-wrapper');
            if (pages[pageNum - 1]) {
                pages[pageNum - 1].scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
        
        window.addEventListener('load', loadPDF);
        
        // Handle scroll to track current page
        let scrollTimeout;
        window.addEventListener('scroll', function() {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(function() {
                const pages = document.querySelectorAll('.page-wrapper');
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                
                for (let i = 0; i < pages.length; i++) {
                    const pageTop = pages[i].offsetTop;
                    const pageHeight = pages[i].offsetHeight;
                    
                    if (scrollTop >= pageTop - 100 && scrollTop < pageTop + pageHeight - 100) {
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: 'pageChange',
                            page: i + 1
                        }));
                        break;
                    }
                }
            }, 100);
        });
    </script>
</body>
</html>
    `;

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt) => {
                pageX.current = evt.nativeEvent.pageX;
            },
            onPanResponderRelease: (evt) => {
                const deltaX = evt.nativeEvent.pageX - pageX.current;
                if (Math.abs(deltaX) > 50) {
                    if (deltaX > 0 && currentPage > 1) {
                        goToPage(currentPage - 1);
                    } else if (deltaX < 0 && currentPage < totalPages) {
                        goToPage(currentPage + 1);
                    }
                }
            },
        })
    ).current;

    const goToPage = (page: number) => {
        if (page < 1 || page > totalPages) return;
        setCurrentPage(page);
        
        // Animate page flip
        Animated.sequence([
            Animated.timing(flipAnimation, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(flipAnimation, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start();

        // Scroll to page in WebView
        webViewRef.current?.injectJavaScript(`
            scrollToPage(${page});
            true;
        `);
    };

    const handleWebViewMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'loaded') {
                setTotalPages(data.totalPages);
                setLoading(false);
            } else if (data.type === 'pageChange') {
                setCurrentPage(data.page);
            } else if (data.type === 'error') {
                setLoading(false);
                console.error('PDF Error:', data.message);
            }
        } catch (e) {
            console.error('Parse error:', e);
        }
    };

    const toggleImmersive = () => {
        setIsImmersive(!isImmersive);
        setShowControls(!showControls);
        Animated.timing(headerVisible, {
            toValue: isImmersive ? 1 : 0,
            duration: 350,
            useNativeDriver: true,
        }).start();
    };

    const headerY = headerVisible.interpolate({
        inputRange: [0, 1],
        outputRange: [-110, 0],
    });

    const flipRotation = flipAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '180deg'],
    });

    return (
        <View className="flex-1" style={{ backgroundColor: themeColors[theme].bg }} {...panResponder.panHandlers}>
            <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} hidden={isImmersive} animated />

            {/* Header */}
            <Animated.View
                className="absolute left-0 right-0 z-30 shadow-lg"
                style={{
                    transform: [{ translateY: headerY }],
                    paddingTop: insets.top,
                    backgroundColor: themeColors[theme].page,
                    height: insets.top + 70,
                    borderBottomWidth: 1,
                    borderBottomColor: themeColors[theme].shadow,
                }}
            >
                <View className="flex-row items-center h-full px-4">
                    <TouchableOpacity onPress={() => navigation.goBack()} className="p-2">
                        <ChevronLeft color={themeColors[theme].text} size={24} />
                    </TouchableOpacity>

                    <View className="flex-1 ml-3">
                        <Text className="text-base font-bold" style={{ color: themeColors[theme].text }} numberOfLines={1}>
                            {title}
                        </Text>
                        {totalPages > 0 && (
                            <Text className="text-xs mt-1" style={{ color: themeColors[theme].text, opacity: 0.6 }}>
                                Sahifa {currentPage} / {totalPages}
                            </Text>
                        )}
                    </View>

                    <TouchableOpacity onPress={() => setIsBookmarked(!isBookmarked)} className="p-2 mr-2">
                        {isBookmarked ? (
                            <BookmarkCheck color={themeColors[theme].text} size={22} fill={themeColors[theme].text} />
                        ) : (
                            <Bookmark color={themeColors[theme].text} size={22} />
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={toggleImmersive} className="p-2">
                        {isImmersive ? (
                            <Maximize color={themeColors[theme].text} size={20} />
                        ) : (
                            <Settings2 color={themeColors[theme].text} size={20} />
                        )}
                    </TouchableOpacity>
                </View>
            </Animated.View>

            {/* PDF Viewer */}
            <View className="flex-1" style={{ marginTop: insets.top + 70 }}>
                <Animated.View
                    style={{
                        flex: 1,
                        transform: [{ rotateY: flipRotation }],
                    }}
                >
                    <WebView
                        ref={webViewRef}
                        source={{ html: pdfViewerHTML }}
                        onMessage={handleWebViewMessage}
                        javaScriptEnabled={true}
                        domStorageEnabled={true}
                        style={{ 
                            flex: 1, 
                            backgroundColor: themeColors[theme].bg,
                            opacity: loading ? 0 : 1,
                        }}
                        scrollEnabled={true}
                        showsVerticalScrollIndicator={false}
                    />
                </Animated.View>
            </View>

            {/* Loading */}
            {loading && (
                <View className="absolute inset-0 justify-center items-center" style={{ backgroundColor: themeColors[theme].bg }}>
                    <ActivityIndicator size="large" color="#34A853" />
                    <Text className="mt-4 text-base font-medium" style={{ color: themeColors[theme].text }}>
                        Kitob yuklanmoqda...
                    </Text>
                </View>
            )}

            {/* Bottom Controls */}
            {showControls && !isImmersive && (
                <Animated.View
                    className="absolute bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800"
                    style={{
                        paddingBottom: insets.bottom + 10,
                        paddingTop: 15,
                        transform: [{ translateY: headerVisible.interpolate({ inputRange: [0, 1], outputRange: [100, 0] }) }],
                    }}
                >
                    {/* Page Navigation */}
                    <View className="flex-row items-center justify-center px-4 mb-4">
                        <TouchableOpacity
                            onPress={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1}
                            className={`p-3 rounded-lg ${currentPage === 1 ? 'opacity-30' : ''}`}
                            style={{ backgroundColor: themeColors[theme].page }}
                        >
                            <ChevronLeft color={themeColors[theme].text} size={24} />
                        </TouchableOpacity>

                        <View className="mx-6 items-center min-w-[120px]">
                            <Text className="text-sm font-bold" style={{ color: themeColors[theme].text }}>
                                {currentPage} / {totalPages || '...'}
                            </Text>
                            {totalPages > 0 && (
                                <View className="w-32 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mt-2">
                                    <View
                                        className="h-full bg-primary rounded-full"
                                        style={{ width: `${(currentPage / totalPages) * 100}%` }}
                                    />
                                </View>
                            )}
                        </View>

                        <TouchableOpacity
                            onPress={() => goToPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className={`p-3 rounded-lg ${currentPage === totalPages ? 'opacity-30' : ''}`}
                            style={{ backgroundColor: themeColors[theme].page }}
                        >
                            <ChevronRight color={themeColors[theme].text} size={24} />
                        </TouchableOpacity>
                    </View>

                    {/* Theme & Settings */}
                    <View className="flex-row items-center justify-center space-x-4 px-4">
                        <View className="flex-row items-center space-x-2 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                            <TouchableOpacity
                                onPress={() => setTheme('paper')}
                                className={`px-4 py-2 rounded ${theme === 'paper' ? 'bg-white dark:bg-slate-700 shadow-sm' : ''}`}
                            >
                                <Text className={`text-xs font-bold ${theme === 'paper' ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>
                                    Paper
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setTheme('sepia')}
                                className={`px-4 py-2 rounded ${theme === 'sepia' ? 'bg-white dark:bg-slate-700 shadow-sm' : ''}`}
                            >
                                <Text className={`text-xs font-bold ${theme === 'sepia' ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>
                                    Sepia
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setTheme('dark')}
                                className={`px-4 py-2 rounded ${theme === 'dark' ? 'bg-white dark:bg-slate-700 shadow-sm' : ''}`}
                            >
                                <Text className={`text-xs font-bold ${theme === 'dark' ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>
                                    Dark
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Animated.View>
            )}
        </View>
    );
};

export default ReaderScreen;
