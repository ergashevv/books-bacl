import { clsx } from 'clsx';
import React from 'react';
import { StatusBar, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
    children: React.ReactNode;
    className?: string;
    noInsets?: boolean;
}

const Layout: React.FC<Props> = ({ children, className, noInsets }) => {
    const insets = useSafeAreaInsets();

    return (
        <View
            className={clsx('flex-1 bg-background-light dark:bg-background-dark', className)}
        >
            <StatusBar barStyle="dark-content" />
            <View
                className="flex-1"
                style={!noInsets ? {
                    paddingTop: insets.top,
                    paddingBottom: insets.bottom,
                    paddingLeft: insets.left,
                    paddingRight: insets.right,
                } : undefined}
            >
                {children}
            </View>
        </View>
    );
};
export default Layout; // Ensure it exports default
