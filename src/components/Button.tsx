import clsx from 'clsx';
import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

interface Props {
    onPress: () => Promise<void> | void;
    title: string;
    variant?: 'primary' | 'secondary' | 'outline' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    disabled?: boolean;
    className?: string;
    icon?: React.ReactNode;
}

const Button: React.FC<Props> = ({
    onPress,
    title,
    variant = 'primary',
    size = 'md',
    loading,
    disabled,
    className,
    icon
}) => {
    const baseClasses = "flex-row items-center justify-center rounded-2xl shadow-sm active:opacity-90 relative overflow-hidden";

    const variantClasses = {
        primary: "bg-primary-500",
        secondary: "bg-slate-800 dark:bg-slate-200",
        outline: "bg-transparent border-2 border-slate-200 dark:border-slate-800",
        danger: "bg-rose-500"
    };

    const textClasses = {
        primary: "text-white font-bold",
        secondary: "text-white dark:text-slate-900 font-bold",
        outline: "text-slate-600 dark:text-slate-300 font-semibold",
        danger: "text-white font-bold"
    };

    const sizeClasses = {
        sm: "px-4 py-2",
        md: "px-6 py-4",
        lg: "px-8 py-5"
    };

    const textSizeClasses = {
        sm: "text-sm",
        md: "text-base",
        lg: "text-lg"
    };

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={loading || disabled}
            className={clsx(
                baseClasses,
                variantClasses[variant],
                sizeClasses[size],
                disabled && "opacity-50",
                className
            )}
            activeOpacity={0.8}
        >
            {loading ? (
                <ActivityIndicator color={variant === 'outline' ? '#1E293B' : 'white'} />
            ) : (
                <View className="flex-row items-center justify-center">
                    {icon && <View className="mr-3">{icon}</View>}
                    <Text className={clsx(textClasses[variant], textSizeClasses[size], "text-center")}>
                        {title}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );
};

export default Button;
