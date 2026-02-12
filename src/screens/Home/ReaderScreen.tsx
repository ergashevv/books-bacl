import { ChevronLeft, ChevronRight, Bookmark, BookmarkCheck, Settings2, Maximize, Minus, Plus, Type, AlignLeft } from 'lucide-react-native';
import React, { useRef, useState, useEffect } from 'react';
import { ActivityIndicator, Animated, Dimensions, PanResponder, StatusBar, Text, TouchableOpacity, View, ScrollView, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBookFileUrl, getBookFileType, API_URL } from '../../utils/api';

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
    const loadingTimeoutRef = useRef<number | null>(null);

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
        
        // Set a timeout to prevent infinite loading (30 seconds)
        if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current);
        }
        loadingTimeoutRef.current = setTimeout(() => {
            console.warn('Loading timeout reached, setting loading to false');
            setLoading(false);
            Alert.alert(
                'Xatolik',
                'Kitob yuklash vaqti tugadi. Iltimos, internet aloqasini tekshiring va qayta urinib ko\'ring.',
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
        }, 30000);
        
        return () => {
            if (loadingTimeoutRef.current) {
                clearTimeout(loadingTimeoutRef.current);
            }
        };
    }, [book, pdfUrl, fileUrl, routeFileType, navigation]);

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
        paper: { bg: '#F3F7FB', text: '#1E293B', muted: '#64748B', page: '#FFFFFF', panel: '#FFFFFFF2', border: '#E2E8F0', accent: '#2F9E44' },
        sepia: { bg: '#FBF4E8', text: '#4A3725', muted: '#7A6048', page: '#FFF9F0', panel: '#FFF7EBF0', border: '#E8D9C1', accent: '#B7791F' },
        dark: { bg: '#0B1220', text: '#E2E8F0', muted: '#94A3B8', page: '#162033', panel: '#111827F2', border: '#334155', accent: '#34D399' }
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

    // PDF.js HTML with enhanced features - Optimized version
    const getPdfViewerHTML = () => {
        // Build full URL if needed
        let pdfUrl = fileUrlState;
        if (!pdfUrl.startsWith('http')) {
            pdfUrl = `${API_URL}${pdfUrl.startsWith('/') ? '' : '/'}${pdfUrl}`;
        }
        console.log('Generating optimized PDF viewer HTML with URL:', pdfUrl);
        return `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
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
            min-height: 200px;
            position: relative;
        }
        .page-wrapper.loading {
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .page-wrapper.loading::after {
            content: 'Yuklanmoqda...';
            color: ${themeColors[theme].text};
            opacity: 0.5;
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
        .page-placeholder {
            width: ${PAGE_WIDTH}px;
            height: ${PAGE_WIDTH * 1.414}px;
            background: ${themeColors[theme].page};
            display: flex;
            align-items: center;
            justify-content: center;
            color: ${themeColors[theme].text};
            opacity: 0.3;
        }
    </style>
</head>
<body>
    <div id="pdf-container"></div>
    <!-- Load PDF.js library from multiple CDN sources -->
    <script>
        // Try loading PDF.js from multiple CDN sources
        (function() {
            const pdfjsSources = [
                'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js',
                'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js',
                'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
            ];
            
            let currentSourceIndex = 0;
            
            function tryLoadPDFJS() {
                if (typeof pdfjsLib !== 'undefined') {
                    console.log('PDF.js already loaded');
                    return;
                }
                
                if (currentSourceIndex >= pdfjsSources.length) {
                    console.error('All PDF.js CDN sources failed');
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'error',
                        message: 'PDF.js library yuklanmadi. Internet aloqasini tekshiring.'
                    }));
                    return;
                }
                
                const script = document.createElement('script');
                script.src = pdfjsSources[currentSourceIndex];
                script.async = true;
                
                script.onload = function() {
                    console.log('PDF.js loaded from:', pdfjsSources[currentSourceIndex]);
                    // Wait a bit for pdfjsLib to be available
                    let checkCount = 0;
                    const checkInterval = setInterval(function() {
                        checkCount++;
                        if (typeof pdfjsLib !== 'undefined') {
                            console.log('PDF.js library is now available!');
                            clearInterval(checkInterval);
                            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
                            // Trigger loadPDF if it exists
                            if (typeof window.onPDFJSReady === 'function') {
                                window.onPDFJSReady();
                            }
                        } else if (checkCount > 50) {
                            clearInterval(checkInterval);
                            console.warn('PDF.js not available after loading, trying next source...');
                            currentSourceIndex++;
                            tryLoadPDFJS();
                        }
                    }, 100);
                };
                
                script.onerror = function() {
                    console.warn('Failed to load PDF.js from:', pdfjsSources[currentSourceIndex]);
                    currentSourceIndex++;
                    tryLoadPDFJS();
                };
                
                document.head.appendChild(script);
            }
            
            // Start loading immediately
            tryLoadPDFJS();
        })();
    </script>
    <script>
        console.log('PDF viewer script starting...');
        
        let pdfDoc = null;
        let currentPageNum = 1;
        let totalPages = 0;
        const container = document.getElementById('pdf-container');
        
        // Page cache and rendering state
        const renderedPages = new Map();
        const renderingQueue = [];
        const failedPages = new Set(); // Track failed pages for retry
        let isRendering = false;
        const PRELOAD_DISTANCE = 2; // Preload 2 pages ahead/behind
        const CLEANUP_DISTANCE = 5; // Clean up pages 5 pages away
        const MAX_RETRIES = 3; // Maximum retry attempts for failed pages
        const retryCounts = new Map(); // Track retry counts per page
        
        // Intersection Observer for lazy loading
        let observer = null;
        
        // Callback when PDF.js is ready
        window.onPDFJSReady = function() {
            console.log('PDF.js ready callback called');
            if (typeof window.loadPDF === 'function') {
                setTimeout(function() {
                    window.loadPDF();
                }, 100);
            }
        };
        
        // Define loadPDF function IMMEDIATELY - before anything else that might call it
        console.log('Defining loadPDF function...');
        window.loadPDF = function loadPDFFunction() {
            console.log('loadPDF function called');
            // Helper function to safely initialize pages
            function safeInitializePages() {
                if (typeof initializePages === 'function') {
                    initializePages();
                } else {
                    // Fallback: initialize pages directly
                    container.innerHTML = '';
                    for (let i = 1; i <= totalPages; i++) {
                        const placeholder = createPagePlaceholder(i);
                        container.appendChild(placeholder);
                    }
                    // Render first page if schedulePagesForRendering exists
                    if (typeof schedulePagesForRendering === 'function') {
                        schedulePagesForRendering([1]);
                    }
                }
            }
            
            // Helper function to safely setup intersection observer
            function safeSetupIntersectionObserver() {
                if (typeof setupIntersectionObserver === 'function') {
                    setupIntersectionObserver();
                }
                // If function doesn't exist yet, it's ok - scroll handler will work
            }
            
            const pdfUrl = '${fileUrlState}';
            
            if (!pdfUrl || pdfUrl === '') {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'error',
                    message: 'PDF URL topilmadi'
                }));
                return;
            }
            
            // Check if PDF.js is loaded
            if (typeof pdfjsLib === 'undefined') {
                console.log('PDF.js not loaded yet, waiting...');
                waitForPDFJS(function() {
                    // Retry loading PDF after PDF.js loads
                    window.loadPDF();
                });
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
            
            // Reset state
            renderedPages.clear();
            renderingQueue.length = 0;
            isRendering = false;
            
            // Configure PDF.js worker if not already configured
            if (!pdfjsLib.GlobalWorkerOptions.workerSrc || pdfjsLib.GlobalWorkerOptions.workerSrc === '') {
                // Try multiple worker sources
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
            }
            
            // Try direct PDF.js loading first (better for CORS)
            pdfjsLib.getDocument({
                url: pdfUrl,
                httpHeaders: {
                    'Accept': 'application/pdf'
                },
                withCredentials: false,
                // Enable streaming for better performance
                useSystemFonts: true,
                disableAutoFetch: false,
                disableStream: false
            }).promise.then(function(pdf) {
                console.log('PDF loaded successfully, pages:', pdf.numPages);
                pdfDoc = pdf;
                totalPages = pdf.numPages;
                currentPageNum = 1;
                
                // Initialize page placeholders (safely)
                safeInitializePages();
                
                // Setup intersection observer (safely, with delay to ensure functions are defined)
                setTimeout(() => {
                    safeSetupIntersectionObserver();
                }, 200);
                
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
                    cache: 'default' // Use cache for better performance
                })
                    .then(response => {
                        console.log('PDF Response status:', response.status, response.statusText);
                        
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
                            },
                            useSystemFonts: true,
                            disableAutoFetch: false,
                            disableStream: false
                        }).promise;
                    })
                    .then(function(pdf) {
                        console.log('PDF parsed successfully, pages:', pdf.numPages);
                        pdfDoc = pdf;
                        totalPages = pdf.numPages;
                        currentPageNum = 1;
                        
                        // Initialize page placeholders (safely)
                        safeInitializePages();
                        
                        // Setup intersection observer (safely, with delay)
                        setTimeout(() => {
                            safeSetupIntersectionObserver();
                        }, 200);
                    })
                    .catch(function(error) {
                        console.error('PDF.js parse error:', error);
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: 'error',
                            message: 'PDF yuklanmadi: ' + (error.message || 'Noma\'lum xatolik')
                        }));
                    });
                });
            }).catch(function(error) {
                console.error('Failed to load PDF.js:', error);
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'error',
                    message: 'PDF.js library yuklanmadi: ' + (error.message || 'Noma\'lum xatolik')
                }));
            });
        };
        
        console.log('loadPDF function defined:', typeof window.loadPDF === 'function');
        
        // Create placeholder for page
        function createPagePlaceholder(pageNum) {
            const pageWrapper = document.createElement('div');
            pageWrapper.className = 'page-wrapper loading';
            pageWrapper.id = 'page-' + pageNum;
            pageWrapper.setAttribute('data-page', pageNum);
            
            const placeholder = document.createElement('div');
            placeholder.className = 'page-placeholder';
            placeholder.textContent = 'Sahifa ' + pageNum;
            
            const pageNumber = document.createElement('div');
            pageNumber.className = 'page-number';
            pageNumber.textContent = 'Sahifa ' + pageNum + ' / ' + totalPages;
            
            pageWrapper.appendChild(placeholder);
            pageWrapper.appendChild(pageNumber);
            return pageWrapper;
        }
        
        // Render a single page with retry logic
        function renderPage(pageNum) {
            if (renderedPages.has(pageNum)) {
                return Promise.resolve();
            }
            
            if (!pdfDoc) {
                return Promise.reject('PDF document not loaded');
            }
            
            const retryCount = retryCounts.get(pageNum) || 0;
            if (retryCount >= MAX_RETRIES) {
                console.warn('Max retries reached for page ' + pageNum);
                failedPages.add(pageNum);
                return Promise.reject('Max retries exceeded');
            }
            
            return pdfDoc.getPage(pageNum).then(function(page) {
                const viewport = page.getViewport({ scale: ${PAGE_WIDTH / 612} });
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                
                const renderContext = {
                    canvasContext: ctx,
                    viewport: viewport
                };
                
                return page.render(renderContext).promise.then(function() {
                    // Find or create page wrapper
                    let pageWrapper = document.getElementById('page-' + pageNum);
                    if (!pageWrapper) {
                        pageWrapper = createPagePlaceholder(pageNum);
                        // Insert in correct position
                        const existingPages = Array.from(container.querySelectorAll('.page-wrapper'));
                        const insertIndex = existingPages.findIndex(p => parseInt(p.getAttribute('data-page')) > pageNum);
                        if (insertIndex === -1) {
                            container.appendChild(pageWrapper);
                        } else {
                            container.insertBefore(pageWrapper, existingPages[insertIndex]);
                        }
                    }
                    
                    // Replace placeholder with canvas
                    pageWrapper.className = 'page-wrapper';
                    pageWrapper.innerHTML = '';
                    pageWrapper.appendChild(canvas);
                    
                    const pageNumber = document.createElement('div');
                    pageNumber.className = 'page-number';
                    pageNumber.textContent = 'Sahifa ' + pageNum + ' / ' + totalPages;
                    pageWrapper.appendChild(pageNumber);
                    
                    renderedPages.set(pageNum, true);
                    failedPages.delete(pageNum);
                    retryCounts.delete(pageNum);
                    
                    // Notify React Native about first page rendered
                    if (pageNum === 1) {
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: 'loaded',
                            totalPages: totalPages
                        }));
                    }
                    
                    return pageNum;
                });
            }).catch(function(error) {
                console.error('Error rendering page ' + pageNum + ':', error);
                const currentRetryCount = retryCounts.get(pageNum) || 0;
                retryCounts.set(pageNum, currentRetryCount + 1);
                
                // Retry after delay if under max retries
                if (currentRetryCount < MAX_RETRIES - 1) {
                    setTimeout(() => {
                        if (!renderedPages.has(pageNum)) {
                            console.log('Retrying page ' + pageNum + ' (attempt ' + (currentRetryCount + 2) + ')');
                            schedulePagesForRendering([pageNum]);
                        }
                    }, 1000 * (currentRetryCount + 1)); // Exponential backoff
                } else {
                    failedPages.add(pageNum);
                    // Notify about failed page
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'pageError',
                        page: pageNum,
                        message: 'Sahifa yuklanmadi'
                    }));
                }
                
                throw error;
            });
        }
        
        // Render pages in queue
        async function processRenderQueue() {
            if (isRendering || renderingQueue.length === 0) {
                return;
            }
            
            isRendering = true;
            
            while (renderingQueue.length > 0) {
                const pageNum = renderingQueue.shift();
                if (!renderedPages.has(pageNum)) {
                    try {
                        await renderPage(pageNum);
                        // Small delay to prevent blocking
                        await new Promise(resolve => setTimeout(resolve, 10));
                    } catch (error) {
                        console.error('Failed to render page ' + pageNum + ':', error);
                    }
                }
            }
            
            isRendering = false;
        }
        
        // Get visible page range
        function getVisiblePageRange() {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const viewportHeight = window.innerHeight;
            const startY = scrollTop - viewportHeight * PRELOAD_DISTANCE;
            const endY = scrollTop + viewportHeight * (1 + PRELOAD_DISTANCE);
            
            const visiblePages = [];
            const pages = container.querySelectorAll('.page-wrapper');
            
            pages.forEach((pageWrapper, index) => {
                const pageTop = pageWrapper.offsetTop;
                const pageHeight = pageWrapper.offsetHeight;
                const pageNum = parseInt(pageWrapper.getAttribute('data-page'));
                
                if (pageTop + pageHeight >= startY && pageTop <= endY) {
                    visiblePages.push(pageNum);
                }
            });
            
            return visiblePages.length > 0 ? {
                min: Math.min(...visiblePages),
                max: Math.max(...visiblePages)
            } : null;
        }
        
        // Schedule pages for rendering
        function schedulePagesForRendering(pageNums) {
            pageNums.forEach(pageNum => {
                if (pageNum >= 1 && pageNum <= totalPages && 
                    !renderedPages.has(pageNum) && 
                    !renderingQueue.includes(pageNum) &&
                    !failedPages.has(pageNum)) {
                    renderingQueue.push(pageNum);
                }
            });
            processRenderQueue();
        }
        
        // Retry failed pages
        function retryFailedPages() {
            if (failedPages.size === 0) return;
            
            const pagesToRetry = Array.from(failedPages);
            failedPages.clear();
            retryCounts.clear();
            
            console.log('Retrying ' + pagesToRetry.length + ' failed pages');
            schedulePagesForRendering(pagesToRetry);
        }
        
        // Expose retry function globally
        window.retryFailedPages = retryFailedPages;
        
        // Clean up distant pages to free memory
        function cleanupDistantPages() {
            const visibleRange = getVisiblePageRange();
            if (!visibleRange) return;
            
            renderedPages.forEach((rendered, pageNum) => {
                if (pageNum < visibleRange.min - CLEANUP_DISTANCE || pageNum > visibleRange.max + CLEANUP_DISTANCE) {
                    const pageWrapper = document.getElementById('page-' + pageNum);
                    if (pageWrapper) {
                        // Replace with placeholder
                        pageWrapper.className = 'page-wrapper loading';
                        const canvas = pageWrapper.querySelector('canvas');
                        if (canvas) {
                            canvas.remove();
                            const placeholder = document.createElement('div');
                            placeholder.className = 'page-placeholder';
                            placeholder.textContent = 'Sahifa ' + pageNum;
                            pageWrapper.insertBefore(placeholder, pageWrapper.firstChild);
                        }
                    }
                    renderedPages.delete(pageNum);
                }
            });
        }
        
        // Initialize all page placeholders
        function initializePages() {
            container.innerHTML = '';
            for (let i = 1; i <= totalPages; i++) {
                const placeholder = createPagePlaceholder(i);
                container.appendChild(placeholder);
            }
            
            // Render first page immediately
            schedulePagesForRendering([1]);
        }
        
        // Setup Intersection Observer for lazy loading
        function setupIntersectionObserver() {
            if (!window.IntersectionObserver) {
                // Fallback to scroll-based loading
                return;
            }
            
            observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const pageNum = parseInt(entry.target.getAttribute('data-page'));
                        const pagesToRender = [];
                        
                        // Render current page and nearby pages
                        for (let i = Math.max(1, pageNum - PRELOAD_DISTANCE); 
                             i <= Math.min(totalPages, pageNum + PRELOAD_DISTANCE); 
                             i++) {
                            if (!renderedPages.has(i)) {
                                pagesToRender.push(i);
                            }
                        }
                        
                        schedulePagesForRendering(pagesToRender);
                    }
                });
            }, {
                rootMargin: '200px' // Start loading 200px before page enters viewport
            });
            
            // Observe all page placeholders
            container.querySelectorAll('.page-wrapper').forEach(page => {
                observer.observe(page);
            });
        }
        
        window.scrollToPage = function(pageNum) {
            const pageWrapper = document.getElementById('page-' + pageNum);
            if (pageWrapper) {
                // Ensure page is rendered
                if (!renderedPages.has(pageNum)) {
                    schedulePagesForRendering([pageNum]);
                    // Wait a bit for rendering
                    setTimeout(() => {
                        pageWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 100);
                } else {
                    pageWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        };
        
        // Optimized scroll handler with requestAnimationFrame
        let scrollRafId = null;
        let lastScrollTop = 0;
        
        function handleScroll() {
            if (scrollRafId) {
                cancelAnimationFrame(scrollRafId);
            }
            
            scrollRafId = requestAnimationFrame(() => {
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                
                // Only process if scrolled significantly
                if (Math.abs(scrollTop - lastScrollTop) < 50) {
                    return;
                }
                
                lastScrollTop = scrollTop;
                
                // Find current page
                const pages = container.querySelectorAll('.page-wrapper');
                let currentPage = 1;
                
                for (let i = 0; i < pages.length; i++) {
                    const pageTop = pages[i].offsetTop;
                    const pageHeight = pages[i].offsetHeight;
                    
                    if (scrollTop >= pageTop - 100 && scrollTop < pageTop + pageHeight - 100) {
                        currentPage = parseInt(pages[i].getAttribute('data-page'));
                        break;
                    }
                }
                
                // Notify React Native
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'pageChange',
                    page: currentPage
                }));
                
                // Schedule nearby pages for rendering
                const visibleRange = getVisiblePageRange();
                if (visibleRange) {
                    const pagesToRender = [];
                    for (let i = visibleRange.min; i <= visibleRange.max; i++) {
                        if (i >= 1 && i <= totalPages && !renderedPages.has(i)) {
                            pagesToRender.push(i);
                        }
                    }
                    schedulePagesForRendering(pagesToRender);
                }
                
                // Cleanup distant pages periodically
                if (Math.random() < 0.1) { // 10% chance on each scroll
                    cleanupDistantPages();
                }
            });
        }
        
        // Wait for PDF.js and loadPDF to be ready, then call it
        function tryLoadPDF() {
            console.log('tryLoadPDF called');
            console.log('pdfjsLib available:', typeof pdfjsLib !== 'undefined');
            console.log('loadPDF available:', typeof window.loadPDF === 'function');
            
            function attemptLoad(retryCount) {
                retryCount = retryCount || 0;
                const maxRetries = 30; // More retries for PDF.js to load
                
                if (typeof pdfjsLib !== 'undefined' && typeof window.loadPDF === 'function') {
                    console.log('Both PDF.js and loadPDF are ready, calling loadPDF()');
                    try {
                        window.loadPDF();
                    } catch (e) {
                        console.error('Error calling loadPDF:', e);
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: 'error',
                            message: 'loadPDF chaqirishda xatolik: ' + e.message
                        }));
                    }
                } else if (retryCount < maxRetries) {
                    const missing = [];
                    if (typeof pdfjsLib === 'undefined') missing.push('pdfjsLib');
                    if (typeof window.loadPDF !== 'function') missing.push('loadPDF');
                    console.log('Waiting for: ' + missing.join(', ') + ' (attempt ' + (retryCount + 1) + '/' + maxRetries + ')');
                    setTimeout(function() {
                        attemptLoad(retryCount + 1);
                    }, 200);
                } else {
                    console.error('Failed to load after ' + maxRetries + ' attempts');
                    const missing = [];
                    if (typeof pdfjsLib === 'undefined') missing.push('PDF.js library');
                    if (typeof window.loadPDF !== 'function') missing.push('loadPDF function');
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'error',
                        message: 'Yuklanmadi: ' + missing.join(', ') + '. Internet aloqasini tekshiring.'
                    }));
                }
            }
            
            attemptLoad(0);
        }
        
        // Try loading when page loads
        window.addEventListener('load', tryLoadPDF);
        
        // Also try immediately if ready
        if (document.readyState === 'complete') {
            tryLoadPDF();
        } else {
            document.addEventListener('DOMContentLoaded', tryLoadPDF);
        }
        
        // Also check if PDF.js is already loaded
        setTimeout(function() {
            if (typeof pdfjsLib !== 'undefined' && typeof window.loadPDF === 'function') {
                console.log('PDF.js already loaded, calling loadPDF');
                window.loadPDF();
            }
        }, 1000);
        
        // Optimized scroll listener
        window.addEventListener('scroll', handleScroll, { passive: true });
    </script>
</body>
</html>
    `;
    };

    // EPUB.js HTML viewer - Using a more compatible approach
    const getEpubViewerHTML = () => {
        const bgColor = themeColors[theme].page;
        const textColor = themeColors[theme].text;
        const bgColorMain = themeColors[theme].bg;
        const fSize = fontSize;
        const lHeight = lineHeight;
        return `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <script src="https://cdn.jsdelivr.net/npm/epubjs@0.3.93/dist/epub.min.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            background-color: ${bgColorMain};
            color: ${textColor};
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, serif;
            font-size: ${fSize}px;
            line-height: ${lHeight};
            padding: 20px;
            overflow-x: hidden;
        }
        #book-container {
            max-width: ${PAGE_WIDTH}px;
            margin: 0 auto;
            padding: 20px;
            background: ${bgColor};
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
            color: ${textColor};
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
                        style.textContent = 'body { background-color: ${bgColor} !important; color: ${textColor} !important; font-size: ${fSize}px !important; line-height: ${lHeight} !important; }';
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
    };

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
                useNativeDriver: Platform.OS !== 'web',
            }),
            Animated.timing(flipAnimation, {
                toValue: 0,
                duration: 200,
                useNativeDriver: Platform.OS !== 'web',
            }),
        ]).start();

        if (currentFileType === 'pdf' && webViewRef.current) {
            webViewRef.current.injectJavaScript(`window.scrollToPage(${page}); true;`);
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
                // Clear loading timeout on error
                if (loadingTimeoutRef.current) {
                    clearTimeout(loadingTimeoutRef.current);
                    loadingTimeoutRef.current = null;
                }
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
                // Clear loading timeout since book loaded successfully
                if (loadingTimeoutRef.current) {
                    clearTimeout(loadingTimeoutRef.current);
                    loadingTimeoutRef.current = null;
                }
                console.log('Book loaded successfully, total pages:', data.totalPages);
            } else if (data.type === 'pageChange') {
                setCurrentPage(data.page);
                saveProgress(data.page);
            } else if (data.type === 'pageError') {
                console.warn('Page rendering error:', data.page, data.message);
                // Optionally retry failed page
                if (webViewRef.current) {
                    setTimeout(() => {
                        webViewRef.current?.injectJavaScript(`
                            if (typeof window.retryFailedPages === 'function') {
                                window.retryFailedPages();
                            }
                            true;
                        `);
                    }, 2000);
                }
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
                    borderBottomColor: themeColors[theme].border,
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
                        source={{ html: (currentFileType === 'epub' ? getEpubViewerHTML() : getPdfViewerHTML()) as string }}
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
                            <View 
                                className="flex-1 justify-center items-center" 
                                style={{ backgroundColor: themeColors[theme].bg }}
                                accessibilityViewIsModal={true}
                                importantForAccessibility="yes"
                            >
                                <ActivityIndicator size="large" color={themeColors[theme].accent} />
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
                            console.log('WebView loaded');
                            // The HTML script will automatically call loadPDF via event listeners
                            // We just need to ensure it's available, so trigger a check after a short delay
                            if (webViewRef.current && fileUrlState) {
                                // Small delay to ensure all scripts have executed
                                setTimeout(() => {
                                    // Just verify the function exists and trigger if needed
                                    webViewRef.current?.injectJavaScript(`
                                        console.log('WebView onLoadEnd: Checking loadPDF availability...');
                                        console.log('pdfjsLib available:', typeof pdfjsLib !== 'undefined');
                                        console.log('loadPDF available:', typeof window.loadPDF === 'function');
                                        
                                        // If loadPDF exists but hasn't been called yet, call it
                                        if (typeof window.loadPDF === 'function' && typeof pdfjsLib !== 'undefined') {
                                            console.log('Calling loadPDF from onLoadEnd');
                                            try {
                                                window.loadPDF();
                                            } catch (e) {
                                                console.error('Error calling loadPDF:', e);
                                                window.ReactNativeWebView.postMessage(JSON.stringify({
                                                    type: 'error',
                                                    message: 'loadPDF chaqirishda xatolik: ' + e.message
                                                }));
                                            }
                                        } else if (typeof window.loadPDF !== 'function') {
                                            console.error('loadPDF function still not available');
                                            // Try one more time after a delay
                                            setTimeout(function() {
                                                if (typeof window.loadPDF === 'function' && typeof pdfjsLib !== 'undefined') {
                                                    console.log('Calling loadPDF on delayed retry');
                                                    window.loadPDF();
                                                } else {
                                                    window.ReactNativeWebView.postMessage(JSON.stringify({
                                                        type: 'error',
                                                        message: 'loadPDF funksiyasi topilmadi. Script yuklanmagan bo\'lishi mumkin.'
                                                    }));
                                                }
                                            }, 1000);
                                        }
                                        true;
                                    `);
                                }, 500);
                            } else {
                                // Set loading to false if WebView loads but no file URL
                                if (!fileUrlState) {
                                    console.warn('WebView loaded but no file URL available');
                                    setLoading(false);
                                }
                            }
                        }}
                        onLoadStart={() => {
                            // Ensure loading state is true when WebView starts loading
                            if (!loading) {
                                setLoading(true);
                            }
                        }}
                    />
                    </Animated.View>
                )}
            </View>

            {/* Loading */}
            {loading && (
                <View 
                    className="absolute inset-0 justify-center items-center" 
                    style={{ backgroundColor: themeColors[theme].bg }}
                    accessibilityViewIsModal={true}
                    importantForAccessibility="yes"
                >
                    <ActivityIndicator size="large" color={themeColors[theme].accent} />
                    <Text className="mt-4 text-base font-medium" style={{ color: themeColors[theme].text }}>
                        Kitob yuklanmoqda...
                    </Text>
                </View>
            )}

            {/* Settings Panel */}
            {showSettings && (
                <Animated.View
                    className="absolute bottom-0 left-0 right-0 backdrop-blur-lg border-t"
                    style={{
                        paddingBottom: insets.bottom + 20,
                        paddingTop: 20,
                        paddingHorizontal: 20,
                        backgroundColor: themeColors[theme].panel,
                        borderTopColor: themeColors[theme].border,
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
                        <View className="flex-row items-center">
                            <TouchableOpacity
                                onPress={() => setTheme('paper')}
                                className="px-4 py-2 rounded mr-2"
                                style={{
                                    backgroundColor: theme === 'paper' ? themeColors[theme].accent : themeColors[theme].page,
                                    borderWidth: 1,
                                    borderColor: themeColors[theme].border,
                                }}
                            >
                                <Text
                                    className="text-xs font-bold"
                                    style={{ color: theme === 'paper' ? '#FFFFFF' : themeColors[theme].muted }}
                                >
                                    Paper
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setTheme('sepia')}
                                className="px-4 py-2 rounded mr-2"
                                style={{
                                    backgroundColor: theme === 'sepia' ? themeColors[theme].accent : themeColors[theme].page,
                                    borderWidth: 1,
                                    borderColor: themeColors[theme].border,
                                }}
                            >
                                <Text
                                    className="text-xs font-bold"
                                    style={{ color: theme === 'sepia' ? '#FFFFFF' : themeColors[theme].muted }}
                                >
                                    Sepia
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setTheme('dark')}
                                className="px-4 py-2 rounded"
                                style={{
                                    backgroundColor: theme === 'dark' ? themeColors[theme].accent : themeColors[theme].page,
                                    borderWidth: 1,
                                    borderColor: themeColors[theme].border,
                                }}
                            >
                                <Text
                                    className="text-xs font-bold"
                                    style={{ color: theme === 'dark' ? '#FFFFFF' : themeColors[theme].muted }}
                                >
                                    Dark
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity
                        onPress={() => setShowSettings(false)}
                        className="p-3 rounded-lg items-center mt-2"
                        style={{ backgroundColor: themeColors[theme].accent }}
                    >
                        <Text className="text-white font-bold">Yopish</Text>
                    </TouchableOpacity>
                </Animated.View>
            )}

            {/* Bottom Controls */}
            {showControls && !showSettings && !isImmersive && (
                <Animated.View
                    className="absolute bottom-0 left-0 right-0 backdrop-blur-lg border-t"
                    style={{
                        paddingBottom: insets.bottom + 10,
                        paddingTop: 15,
                        transform: [{ translateY: headerVisible.interpolate({ inputRange: [0, 1], outputRange: [100, 0] }) }],
                        backgroundColor: themeColors[theme].panel,
                        borderTopColor: themeColors[theme].border,
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
                                <View className="w-32 h-1 rounded-full mt-2" style={{ backgroundColor: themeColors[theme].border }}>
                                    <View
                                        className="h-full rounded-full"
                                        style={{ backgroundColor: themeColors[theme].accent, width: `${(currentPage / totalPages) * 100}%` }}
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
