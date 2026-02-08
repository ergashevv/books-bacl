import React from 'react';
import { Image, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Book } from '../types';

import { getImageUrl } from '../utils/api';

interface Props {
    book: Book;
    onPress: () => void;
    containerStyle?: ViewStyle;
}

const BookCard: React.FC<Props> = ({ book, onPress, containerStyle }) => {
    const imageUrl = getImageUrl(book.cover_url);

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.8}
            style={containerStyle}
            className="mb-6"
        >
            {/* Figma Style Book Cover */}
            <View className="shadow-soft rounded-lg overflow-hidden aspect-[2/3] bg-white dark:bg-surface-dark">
                <Image
                    source={{ uri: imageUrl }}
                    className="w-full h-full"
                    resizeMode="cover"
                />

                {book.is_premium && (
                    <View className="absolute top-2 right-2 bg-primary px-2 py-0.5 rounded shadow-sm">
                        <Text className="text-white text-[9px] font-bold">PREMIUM</Text>
                    </View>
                )}
            </View>

            {/* Figma Typography */}
            <View className="mt-3">
                <Text
                    className="text-[14px] font-bold text-slate-900 dark:text-white leading-tight mb-1"
                    numberOfLines={2}
                >
                    {book.title}
                </Text>
                <Text
                    className="text-[12px] text-slate-500 dark:text-slate-400 font-medium"
                    numberOfLines={1}
                >
                    {book.author}
                </Text>
            </View>
        </TouchableOpacity>
    );
};

export default BookCard;
