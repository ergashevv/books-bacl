import { ChevronLeft, ChevronRight, Bookmark, BookmarkCheck, Settings2, Maximize, Minus, Plus, Type, AlignLeft } from 'lucide-react-native';
import React, { useRef, useState, useEffect } from 'react';
import { ActivityIndicator, Animated, Dimensions, PanResponder, StatusBar, Text, TouchableOpacity, View, ScrollView, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBookFileUrl, getBookFileType } from '../../utils/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PAGE_WIDTH = SCREEN_WIDTH - 40;

type BookFileType = 'pdf' | 'epub' | 'txt' | 'mobi';

interface ReaderScreenProps {
    route: {
        params: {
            book: any;
            pdfUrl?: string;
            fileUrl?: string;
            fileType?: BookFileType;
            title: string;
            bookId: number;
        };
    };
    navigation: any;
}

const ReaderScreen = ({ route, navigation }: ReaderScreenProps) => {
    const { book, pdfUrl, fileUrl, fileType: routeFileType, title, bookId } = route.params;
    const insets = useSafeAreaInsets();
    
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [theme, setTheme] = useState<'paper' | 'sepia' | 'dark'>('paper');
    const [headerVisible] = useState(new Animated.Value(1));
    const [isImmersive, setIsImmersive] = useState(false);
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [fontSize, setFontSize] = useState(16);
    const [lineHeight, setLineHeight] = useState(1.6);
    const [showControls, setShowControls] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    
    const flipAnimation = useRef(new Animated.Value(0)).current;
    const pageX = useRef(0);
    const webViewRef = useRef<WebView>(null);
    const scrollViewRef = useRef<ScrollView>(null);
    const [textContent, setTextContent] = useState<string>('');
    const [currentFileType, setCurrentFileType] = useState<BookFileType>('pdf');
    const [fileUrlState, setFileUrlState] = useState<string>('');

    // Determine file type and URL
    useEffect(() => {
        let url = '';
        let type: BookFileType = 'pdf';
        
        if (book) {
            type = routeFileType || getBookFileType(book);
            url = fileUrl || pdfUrl || getBookFileUrl(book);
        } else if (fileUrl) {
            type = routeFileType || 'pdf';
            url = fileUrl;
        } else if (pdfUrl) {
            type = 'pdf';
            url = pdfUrl;
        }
        
        if (!url || url === '') {
            Alert.alert('Xatolik', 'Kitob fayli URL topilmadi');
            navigation.goBack();
            return;
        }
        
        console.log('Setting file URL:', url, 'Type:', type);
        setCurrentFileType(type);
        setFileUrlState(url);
        setLoading(true); // Reset loading state when URL changes
    }, [book, pdfUrl, fileUrl, routeFileType]);

    // Load bookmarks and reading progress
    useEffect(() => {
        loadBookmark();
        loadProgress();
    }, [bookId]);

    const loadBookmark = async () => {
        try {
            const bookmarks = await AsyncStorage.getItem(`bookmarks_${bookId}`);
            setIsBookmarked(bookmarks === 'true');
        } catch (e) {
            console.error('Load bookmark error:', e);
        }
    };

    const loadProgress = async () => {
        try {
            const progress = await AsyncStorage.getItem(`progress_${bookId}`);
            if (progress) {
                const { page } = JSON.parse(progress);
                setCurrentPage(page || 1);
            }
        } catch (e) {
            console.error('Load progress error:', e);
        }
    };

    const saveProgress = async (page: number) => {
        try {
            await AsyncStorage.setItem(`progress_${bookId}`, JSON.stringify({ page, timestamp: Date.now() }));
        } catch (e) {
            console.error('Save progress error:', e);
        }
    };

    const toggleBookmark = async () => {
        const newValue = !isBookmarked;
        setIsBookmarked(newValue);
        try {
            await AsyncStorage.setItem(`bookmarks_${bookId}`, String(newValue));
        } catch (e) {
            console.error('Save bookmark error:', e);
        }
    };

    const themeColors = {
        paper: { bg: '#F8FAFC', text: '#1E293B', page: '#FFFFFF', shadow: '#E2E8F0' },
        sepia: { bg: '#FEF9EF', text: '#433422', page: '#FDF5E6', shadow: '#E8D5B7' },
        dark: { bg: '#0F172A', text: '#F8FAFC', page: '#1E293B', shadow: '#334155' }
    };

    // Load TXT file content
    useEffect(() => {
        if (currentFileType === 'txt' && fileUrlState) {
            loadTextFile();
        }
    }, [currentFileType, fileUrlState]);

    const loadTextFile = async () => {
        try {
            setLoading(true);
            const response = await fetch(fileUrlState);
            const text = await response.text();
            setTextContent(text);
            
            // Estimate pages (assuming ~500 words per page)
            const words = text.split(/\s+/).length;
            const estimatedPages = Math.max(1, Math.ceil(words / 500));
            setTotalPages(estimatedPages);
            setLoading(false);
        } catch (error: any) {
            console.error('Load text error:', error);
            Alert.alert('Xatolik', 'Kitob yuklanmadi');
            setLoading(false);
        }
    };

    // PDF.js HTML with enhanced features
    const getPdfViewerHTML = () => {
        // Build full URL if needed
        let pdfUrl = fileUrlState;
        if (!pdfUrl.startsWith('http')) {
            pdfUrl = `${API_URL}${pdfUrl.startsWith('/') ? '' : '/'}${pdfUrl}`;
        }
        console.log('Generating PDF viewer HTML with URL:', pdfUrl);
        return `
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
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
        
        // Check if pdfjsLib is loaded
        if (typeof pdfjsLib === 'undefined') {
            console.error('PDF.js library not loaded!');
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'error',
                message: 'PDF.js library yuklanmadi. Internet aloqasini tekshiring.'
            }));
        } else {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            console.log('PDF.js library loaded successfully');
        }
        
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
            // Check if pdfjsLib is available
            if (typeof pdfjsLib === 'undefined') {
                console.error('PDF.js is not loaded!');
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'error',
                    message: 'PDF.js library yuklanmadi. Qayta urinib ko\'ring.'
                }));
                return;
            }
            
            const pdfUrl = '${fileUrlState}';
            
            if (!pdfUrl || pdfUrl === '') {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'error',
                    message: 'PDF URL topilmadi'
                }));
                return;
            }
            
            console.log('Loading PDF from:', pdfUrl);
            container.innerHTML = '<div class="loading">PDF yuklanmoqda...</div>';
            
            // Try direct PDF.js loading first (better for CORS)
            pdfjsLib.getDocument({
                url: pdfUrl,
                httpHeaders: {
                    'Accept': 'application/pdf'
                },
                withCredentials: false
            }).promise.then(function(pdf) {
                console.log('PDF loaded successfully, pages:', pdf.numPages);
                pdfDoc = pdf;
                currentPageNum = 1;
                container.innerHTML = '';
                renderPage(1);
            }).catch(function(error) {
                console.error('PDF.js direct load error:', error);
                // Fallback to fetch + arrayBuffer
                console.log('Trying fetch method...');
                fetch(pdfUrl, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/pdf',
                    },
                    mode: 'cors',
                    credentials: 'omit',
                    cache: 'no-cache'
                })
                    .then(response => {
                        console.log('PDF Response status:', response.status, response.statusText);
                        console.log('PDF Response headers:', Object.fromEntries(response.headers.entries()));
                        
                        if (!response.ok) {
                            throw new Error('PDF yuklanmadi: ' + response.status + ' ' + response.statusText + '. URL: ' + pdfUrl);
                        }
                        
                        const contentType = response.headers.get('content-type');
                        if (!contentType || !contentType.includes('pdf')) {
                            console.warn('Warning: Content-Type is not PDF:', contentType);
                        }
                        
                        return response.arrayBuffer();
                    })
                    .then(data => {
                        if (!data || data.byteLength === 0) {
                            throw new Error('PDF fayli bo\'sh');
                        }
                        
                        console.log('PDF data received, size:', data.byteLength);
                        return pdfjsLib.getDocument({ 
                            data: data,
                            httpHeaders: {
                                'Accept': 'application/pdf'
                            }
                        }).promise;
                    })
                    .then(function(pdf) {
                        console.log('PDF parsed successfully, pages:', pdf.numPages);
                        pdfDoc = pdf;
                        currentPageNum = 1;
                        container.innerHTML = '';
                        renderPage(1);
                    })
                    .catch(function(error) {
                        console.error('PDF.js parse error:', error);
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: 'error',
                            message: 'PDF yuklanmadi: ' + (error.message || 'Noma\'lum xatolik')
                        }));
                    });
            });
        }
        
        function scrollToPage(pageNum) {
            const pages = document.querySelectorAll('.page-wrapper');
            if (pages[pageNum - 1]) {
                pages[pageNum - 1].scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
        
        // Wait for PDF.js to load before trying to load PDF
        function tryLoadPDF() {
            if (typeof pdfjsLib !== 'undefined') {
                console.log('PDF.js loaded, calling loadPDF()');
                loadPDF();
            } else {
                console.log('PDF.js not loaded yet, retrying...');
                // Retry after a delay if PDF.js hasn't loaded
                setTimeout(function() {
                    if (typeof pdfjsLib !== 'undefined') {
                        console.log('PDF.js loaded on retry, calling loadPDF()');
                        loadPDF();
                    } else {
                        console.error('PDF.js failed to load after retry');
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: 'error',
                            message: 'PDF.js library yuklanmadi. Internet aloqasini tekshiring.'
                        }));
                    }
                }, 2000);
            }
        }
        
        // Try loading when page loads
        window.addEventListener('load', tryLoadPDF);
        
        // Also try immediately if PDF.js is already loaded
        if (document.readyState === 'complete') {
            tryLoadPDF();
        } else {
            document.addEventListener('DOMContentLoaded', tryLoadPDF);
        }
        
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

    // EPUB.js HTML viewer - Using a more compatible approach
    const getEpubViewerHTML = () => `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <script src="https://cdn.jsdelivr.net/npm/epubjs@0.3.93/dist/epub.min.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            background-color: ${themeColors[theme].bg};
            color: ${themeColors[theme].text};
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, serif;
            font-size: ${fontSize}px;
            line-height: ${lineHeight};
            padding: 20px;
            overflow-x: hidden;
        }
        #book-container {
            max-width: ${PAGE_WIDTH}px;
            margin: 0 auto;
            padding: 20px;
            background: ${themeColors[theme].page};
            min-height: 100vh;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        #viewer {
            width: 100%;
            min-height: 80vh;
        }
        #viewer iframe {
            width: 100%;
            min-height: 80vh;
            border: none;
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
    <div id="book-container">
        <div id="viewer"></div>
    </div>
    <script>
        let book = null;
        let rendition = null;
        let currentLocation = null;
        let totalSpineLength = 0;
        
        function initEpub() {
            try {
                book = ePub('${fileUrlState}');
                
                book.ready.then(function() {
                    totalSpineLength = book.spine.length || 1;
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'loaded',
                        totalPages: totalSpineLength
                    }));
                });
                
                rendition = book.renderTo('viewer', {
                    width: '100%',
                    height: '100%',
                    spread: 'none',
                    flow: 'paginated'
                });
                
                rendition.display().then(function() {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'loaded',
                        totalPages: totalSpineLength
                    }));
                });
                
                rendition.on('relocated', function(location) {
                    currentLocation = location;
                    const cfi = location.start.cfi;
                    const spineItem = book.spine.get(location.start.index);
                    const pageNum = location.start.index + 1;
                    
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'pageChange',
                        page: pageNum
                    }));
                });
                
                rendition.on('rendered', function(section) {
                    // Apply theme colors to rendered content
                    const iframe = document.getElementById('viewer').querySelector('iframe');
                    if (iframe && iframe.contentDocument) {
                        const style = iframe.contentDocument.createElement('style');
                        style.textContent = \`
                            body {
                                background-color: ${themeColors[theme].page} !important;
                                color: ${themeColors[theme].text} !important;
                                font-size: ${fontSize}px !important;
                                line-height: ${lineHeight} !important;
                            }
                        \`;
                        iframe.contentDocument.head.appendChild(style);
                    }
                });
            } catch (error) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'error',
                    message: error.message || 'EPUB yuklanmadi'
                }));
            }
        }
        
        function nextPage() {
            if (rendition) {
                rendition.next();
            }
        }
        
        function prevPage() {
            if (rendition) {
                rendition.prev();
            }
        }
        
        function goToPage(page) {
            if (book && book.spine && rendition) {
                const index = Math.max(0, Math.min(page - 1, book.spine.length - 1));
                const spineItem = book.spine.get(index);
                if (spineItem) {
                    rendition.display(spineItem.href);
                }
            }
        }
        
        window.addEventListener('load', function() {
            setTimeout(initEpub, 100);
        });
    </script>
</body>
</html>
    `;

    // TXT Reader Component
    const renderTextReader = () => {
        const words = textContent.split(/\s+/);
        const wordsPerPage = Math.floor((SCREEN_WIDTH - 80) * (SCREEN_WIDTH - 80) / (fontSize * fontSize * lineHeight * 0.5));
        const startIndex = (currentPage - 1) * wordsPerPage;
        const endIndex = startIndex + wordsPerPage;
        const pageText = words.slice(startIndex, endIndex).join(' ');

        return (
            <ScrollView
                ref={scrollViewRef}
                style={{ flex: 1, backgroundColor: themeColors[theme].bg }}
                contentContainerStyle={{ padding: 20 }}
                showsVerticalScrollIndicator={false}
            >
                <View style={{
                    backgroundColor: themeColors[theme].page,
                    padding: 24,
                    borderRadius: 8,
                    minHeight: SCREEN_WIDTH - 200,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                }}>
                    <Text style={{
                        color: themeColors[theme].text,
                        fontSize: fontSize,
                        lineHeight: fontSize * lineHeight,
                        fontFamily: 'serif',
                        textAlign: 'left',
                    }}>
                        {pageText || textContent}
                    </Text>
                </View>
            </ScrollView>
        );
    };

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
        saveProgress(page);
        
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

        if (currentFileType === 'pdf' && webViewRef.current) {
            webViewRef.current.injectJavaScript(`scrollToPage(${page}); true;`);
        } else if (currentFileType === 'epub' && webViewRef.current) {
            webViewRef.current.injectJavaScript(`goToPage(${page}); true;`);
        }
    };

    const handleWebViewMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            console.log('WebView message:', data);
            
            if (data.type === 'error') {
                console.error('PDF Error:', data.message);
                setLoading(false);
                Alert.alert(
                    'Xatolik',
                    data.message || 'PDF yuklanmadi. Iltimos, qayta urinib ko\'ring.',
                    [
                        { text: 'Orqaga', onPress: () => navigation.goBack() },
                        { text: 'Qayta urinish', onPress: () => {
                            setLoading(true);
                            if (webViewRef.current) {
                                webViewRef.current.reload();
                            }
                        }}
                    ]
                );
                return;
            }
            
            if (data.type === 'loaded') {
                setTotalPages(data.totalPages || 1);
                setLoading(false);
            } else if (data.type === 'pageChange') {
                setCurrentPage(data.page);
                saveProgress(data.page);
            } else if (data.type === 'error') {
                setLoading(false);
                console.error('PDF Error:', data.message);
                Alert.alert('Xatolik', data.message || 'Kitob yuklanmadi', [
                    { text: 'Qaytish', onPress: () => navigation.goBack() },
                    { text: 'Qayta urinish', onPress: () => {
                        setLoading(true);
                        webViewRef.current?.reload();
                    }}
                ]);
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
            useNativeDriver: Platform.OS !== 'web',
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

    const adjustFontSize = (delta: number) => {
        const newSize = Math.max(12, Math.min(24, fontSize + delta));
        setFontSize(newSize);
    };

    const adjustLineHeight = (delta: number) => {
        const newHeight = Math.max(1.2, Math.min(2.5, lineHeight + delta));
        setLineHeight(newHeight);
    };

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

                    <TouchableOpacity onPress={toggleBookmark} className="p-2 mr-2">
                        {isBookmarked ? (
                            <BookmarkCheck color={themeColors[theme].text} size={22} fill={themeColors[theme].text} />
                        ) : (
                            <Bookmark color={themeColors[theme].text} size={22} />
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => setShowSettings(!showSettings)} className="p-2">
                        <Settings2 color={themeColors[theme].text} size={20} />
                    </TouchableOpacity>
                </View>
            </Animated.View>

            {/* Reader Content */}
            <View className="flex-1" style={{ marginTop: insets.top + 70 }}>
                {currentFileType === 'txt' ? (
                    renderTextReader()
                ) : (
                    <Animated.View
                        style={{
                            flex: 1,
                            transform: [{ rotateY: flipRotation }],
                        }}
                    >
                    <WebView
                        ref={webViewRef}
                        key={`${currentFileType}-${fileUrlState}`} // Force reload when URL changes
                        source={{ html: currentFileType === 'epub' ? getEpubViewerHTML() : getPdfViewerHTML() }}
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
                        startInLoadingState={true}
                        renderLoading={() => (
                            <View className="flex-1 justify-center items-center" style={{ backgroundColor: themeColors[theme].bg }}>
                                <ActivityIndicator size="large" color="#34A853" />
                                <Text className="mt-4" style={{ color: themeColors[theme].text }}>PDF yuklanmoqda...</Text>
                            </View>
                        )}
                        onError={(syntheticEvent) => {
                            const { nativeEvent } = syntheticEvent;
                            console.error('WebView error:', nativeEvent);
                            setLoading(false);
                            Alert.alert('Xatolik', 'WebView yuklanmadi');
                        }}
                        onHttpError={(syntheticEvent) => {
                            const { nativeEvent } = syntheticEvent;
                            console.error('HTTP error:', nativeEvent.statusCode);
                            setLoading(false);
                            Alert.alert('Xatolik', `HTTP xatolik: ${nativeEvent.statusCode}`);
                        }}
                        onLoadEnd={() => {
                            console.log('WebView loaded, injecting loadPDF call');
                            // Inject JavaScript to trigger PDF loading after WebView is ready
                            if (webViewRef.current && fileUrlState) {
                                setTimeout(() => {
                                    webViewRef.current?.injectJavaScript(`
                                        console.log('Injected: Checking PDF.js and loading PDF...');
                                        if (typeof pdfjsLib !== 'undefined') {
                                            console.log('PDF.js is available, calling loadPDF()');
                                            if (typeof loadPDF === 'function') {
                                                loadPDF();
                                            } else {
                                                console.error('loadPDF function not found');
                                                window.ReactNativeWebView.postMessage(JSON.stringify({
                                                    type: 'error',
                                                    message: 'loadPDF funksiyasi topilmadi'
                                                }));
                                            }
                                        } else {
                                            console.log('PDF.js not loaded yet, waiting...');
                                            setTimeout(function() {
                                                if (typeof pdfjsLib !== 'undefined' && typeof loadPDF === 'function') {
                                                    loadPDF();
                                                } else {
                                                    window.ReactNativeWebView.postMessage(JSON.stringify({
                                                        type: 'error',
                                                        message: 'PDF.js library yuklanmadi'
                                                    }));
                                                }
                                            }, 1000);
                                        }
                                        true;
                                    `);
                                }, 500);
                            }
                        }}
                    />
                    </Animated.View>
                )}
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

            {/* Settings Panel */}
            {showSettings && (
                <Animated.View
                    className="absolute bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800"
                    style={{
                        paddingBottom: insets.bottom + 20,
                        paddingTop: 20,
                        paddingHorizontal: 20,
                    }}
                >
                    <View className="mb-4">
                        <Text className="text-sm font-bold mb-3" style={{ color: themeColors[theme].text }}>
                            Shrift o'lchami
                        </Text>
                        <View className="flex-row items-center justify-between">
                            <TouchableOpacity onPress={() => adjustFontSize(-2)} className="p-2">
                                <Minus color={themeColors[theme].text} size={20} />
                            </TouchableOpacity>
                            <Text style={{ color: themeColors[theme].text, fontSize: 16 }}>{fontSize}px</Text>
                            <TouchableOpacity onPress={() => adjustFontSize(2)} className="p-2">
                                <Plus color={themeColors[theme].text} size={20} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {currentFileType === 'txt' && (
                        <View className="mb-4">
                            <Text className="text-sm font-bold mb-3" style={{ color: themeColors[theme].text }}>
                                Qatorlar orasidagi masofa
                            </Text>
                            <View className="flex-row items-center justify-between">
                                <TouchableOpacity onPress={() => adjustLineHeight(-0.1)} className="p-2">
                                    <Minus color={themeColors[theme].text} size={20} />
                                </TouchableOpacity>
                                <Text style={{ color: themeColors[theme].text, fontSize: 16 }}>{lineHeight.toFixed(1)}</Text>
                                <TouchableOpacity onPress={() => adjustLineHeight(0.1)} className="p-2">
                                    <Plus color={themeColors[theme].text} size={20} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    <View className="mb-4">
                        <Text className="text-sm font-bold mb-3" style={{ color: themeColors[theme].text }}>
                            Mavzu
                        </Text>
                        <View className="flex-row items-center space-x-2">
                            <TouchableOpacity
                                onPress={() => setTheme('paper')}
                                className={`px-4 py-2 rounded ${theme === 'paper' ? 'bg-slate-200' : 'bg-slate-100'}`}
                            >
                                <Text className={`text-xs font-bold ${theme === 'paper' ? 'text-slate-900' : 'text-slate-500'}`}>
                                    Paper
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setTheme('sepia')}
                                className={`px-4 py-2 rounded ${theme === 'sepia' ? 'bg-slate-200' : 'bg-slate-100'}`}
                            >
                                <Text className={`text-xs font-bold ${theme === 'sepia' ? 'text-slate-900' : 'text-slate-500'}`}>
                                    Sepia
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setTheme('dark')}
                                className={`px-4 py-2 rounded ${theme === 'dark' ? 'bg-slate-200' : 'bg-slate-100'}`}
                            >
                                <Text className={`text-xs font-bold ${theme === 'dark' ? 'text-slate-900' : 'text-slate-500'}`}>
                                    Dark
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity
                        onPress={() => setShowSettings(false)}
                        className="bg-primary p-3 rounded-lg items-center mt-2"
                    >
                        <Text className="text-white font-bold">Yopish</Text>
                    </TouchableOpacity>
                </Animated.View>
            )}

            {/* Bottom Controls */}
            {showControls && !showSettings && !isImmersive && (
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
                </Animated.View>
            )}
        </View>
    );
};

export default ReaderScreen;
