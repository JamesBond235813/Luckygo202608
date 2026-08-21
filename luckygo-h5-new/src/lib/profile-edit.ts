import { ApiService } from '../services/api';
import { tf } from './localization';
import type { User } from '../types';

export const PROFILE_NICKNAME_MAX = 32;
export const PROFILE_AVATAR_MAX_BYTES = 5 * 1024 * 1024;

export class ProfileAvatarTooLargeError extends Error {
    constructor() {
        super('AVATAR_TOO_LARGE');
        this.name = 'ProfileAvatarTooLargeError';
    }
}

export function validateProfileNickname(nickname: string, t: (key: string) => string): string | null {
    const trimmed = nickname.trim();
    if (!trimmed) return t('meNicknameRequired');
    if (trimmed.length > PROFILE_NICKNAME_MAX) {
        return tf(t, 'meNicknameTooLong', { max: PROFILE_NICKNAME_MAX });
    }
    return null;
}

export async function saveUserProfile(payload: { nickname: string; avatar: string }): Promise<User> {
    const nickname = payload.nickname.trim();
    const avatar = payload.avatar.trim();
    return ApiService.updateMe({ nickname, avatar });
}

export async function uploadUserAvatar(file: File): Promise<string> {
    if (file.size > PROFILE_AVATAR_MAX_BYTES) {
        throw new ProfileAvatarTooLargeError();
    }
    const { url } = await ApiService.uploadImage(file, 'avatars');
    return url;
}
