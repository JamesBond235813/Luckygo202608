import type { LocalLanguageCode } from './localization';
import type { ProductCategory } from '../types';

export function pickCategoryName(category: ProductCategory, language: LocalLanguageCode): string {
    if (language === 'zh' && category.nameZh.trim()) {
        return category.nameZh.trim();
    }
    return category.name.trim();
}
