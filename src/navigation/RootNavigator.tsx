import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { BookOpen, Home, User } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';

import AdminBookFormScreen from '../screens/Admin/AdminBookFormScreen';
import AdminDashboardScreen from '../screens/Admin/AdminDashboardScreen';
import LoginScreen from '../screens/Auth/LoginScreen';
import SignUpScreen from '../screens/Auth/SignUpScreen';
import BookDetailScreen from '../screens/Home/BookDetailScreen';
import HomeScreen from '../screens/Home/HomeScreen';
import ReaderScreen from '../screens/Home/ReaderScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function TabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: '#34A853', // Figma Primary Green
                tabBarInactiveTintColor: '#94a3b8', // slate-400
                tabBarStyle: {
                    borderTopWidth: 1,
                    borderTopColor: '#f1f5f9', // slate-100
                    paddingTop: 8,
                    paddingBottom: 8,
                    height: 65,
                    backgroundColor: '#ffffff',
                    elevation: 0,
                    shadowOpacity: 0,
                }
            }}
        >
            <Tab.Screen
                name="Home"
                component={HomeScreen}
                options={{
                    tabBarIcon: ({ color }) => <Home color={color} size={24} />,
                    tabBarLabel: 'Library'
                }}
            />
            {/* Placeholder for My Books / Favorites Tab */}
            <Tab.Screen
                name="MyBooks"
                component={HomeScreen} // Placeholder
                options={{
                    tabBarIcon: ({ color }) => <BookOpen color={color} size={24} />,
                    tabBarLabel: 'My Books'
                }}
            />
            <Tab.Screen
                name="Profile"
                component={ProfileScreen}
                options={{
                    tabBarIcon: ({ color }) => <User color={color} size={24} />,
                    tabBarLabel: 'Profile'
                }}
            />
        </Tab.Navigator>
    );
}

function AuthStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignUpScreen} />
        </Stack.Navigator>
    );
}

function MainStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Tabs" component={TabNavigator} />
            <Stack.Screen name="BookDetail" component={BookDetailScreen}
                options={{
                    headerShown: false, // Custom header in screen
                }}
            />
            <Stack.Screen name="Reader" component={ReaderScreen} />
            <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
            <Stack.Screen name="AdminBookForm" component={AdminBookFormScreen} />
        </Stack.Navigator>
    );
}

export default function RootNavigator() {
    const { session, loading, checkSession } = useAuthStore();

    useEffect(() => {
        checkSession();
    }, [checkSession]);

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#4F46E5" />
            </View>
        );
    }

    return (
        <NavigationContainer>
            {session ? <MainStack /> : <AuthStack />}
        </NavigationContainer>
    );
}
