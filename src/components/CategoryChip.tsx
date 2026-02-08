import clsx from 'clsx';
import React, { FC } from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { Category } from '../types';

interface Props {
    category: Category;
    selected?: boolean;
    onPress: () => void;
}

const CategoryChip: FC<Props> = ({ category, selected, onPress }) => (
    <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        className={clsx(
            "px-6 py-2.5 rounded-lg mr-3",
            selected
                ? "bg-primary shadow-soft"
                : "bg-white dark:bg-surface-dark border border-slate-100 dark:border-slate-800"
        )}
    >
        <Text
            className={clsx(
                "font-bold text-[13px]",
                selected ? "text-white" : "text-slate-500 dark:text-slate-400"
            )}
        >
            {category.name}
        </Text>
    </TouchableOpacity>
);

export default CategoryChip;
