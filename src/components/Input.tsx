import clsx from 'clsx';
import React from 'react';
import { Text, TextInput, TextInputProps, View } from 'react-native';

interface Props extends TextInputProps {
    label?: string;
    error?: string;
}

const Input: React.FC<Props> = ({ label, error, className, ...props }) => {
    return (
        <View className="mb-4 w-full">
            {label && <Text className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">{label}</Text>}
            <TextInput
                placeholderTextColor="#9CA3AF"
                style={{ padding: 12 }}
                className={clsx(
                    "bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg",
                    error && "border-red-500",
                    className
                )}
                {...props}
            />
            {error && <Text className="text-xs text-red-500 mt-1">{error}</Text>}
        </View>
    );
};

export default Input;
