import React, { useEffect, useId, useState } from 'react';
import { getApiErrorMessage } from '../services/api';
import { resolveAssetUrl } from '../lib/asset-url';
import {
    ProfileAvatarTooLargeError,
    PROFILE_NICKNAME_MAX,
    saveUserProfile,
    uploadUserAvatar,
    validateProfileNickname,
} from '../lib/profile-edit';
import { showSimpleToast } from '../lib/simpleToast';
import { useI18n } from '../lib/useI18n';
import type { User } from '../types';

export interface ProfileEditFormProps {
    user: User;
    onSaved: (user: User) => void;
    /** 上传头像成功后自动保存到账号（默认开启） */
    autoSaveAfterAvatarUpload?: boolean;
}

export const ProfileEditForm: React.FC<ProfileEditFormProps> = ({
    user,
    onSaved,
    autoSaveAfterAvatarUpload = true,
}) => {
    const { t } = useI18n();
    const fileInputId = useId();
    const [nickname, setNickname] = useState(user.nickname || '');
    const [avatarDraft, setAvatarDraft] = useState(user.avatar || '');
    const [profileSaving, setProfileSaving] = useState(false);
    const [avatarUploading, setAvatarUploading] = useState(false);

    useEffect(() => {
        setNickname(user.nickname || '');
        setAvatarDraft(user.avatar || '');
    }, [user.nickname, user.avatar]);

    const persistProfile = async (nextAvatar: string) => {
        const nicknameError = validateProfileNickname(nickname, t);
        if (nicknameError) {
            showSimpleToast(nicknameError);
            return false;
        }
        setProfileSaving(true);
        try {
            const updated = await saveUserProfile({
                nickname: nickname.trim(),
                avatar: nextAvatar || user.avatar,
            });
            onSaved(updated);
            showSimpleToast(t('settingsProfileSaved'));
            return true;
        } catch (error) {
            showSimpleToast(getApiErrorMessage(error, t('meSaveProfileFailed')));
            return false;
        } finally {
            setProfileSaving(false);
        }
    };

    const handleAvatarFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;

        setAvatarUploading(true);
        try {
            const url = await uploadUserAvatar(file);
            setAvatarDraft(url);
            if (autoSaveAfterAvatarUpload) {
                await persistProfile(url);
            }
        } catch (error) {
            if (error instanceof ProfileAvatarTooLargeError) {
                showSimpleToast(t('meAvatarTooLarge'));
            } else {
                showSimpleToast(getApiErrorMessage(error, t('meUploadAvatarFailed')));
            }
        } finally {
            setAvatarUploading(false);
        }
    };

    const busy = profileSaving || avatarUploading;

    return (
        <div className="space-y-4">
            <div className="flex flex-col items-center gap-3">
                <img
                    src={
                        resolveAssetUrl(avatarDraft) ||
                        '/logo.png'
                    }
                    alt={t('meUserProfileAlt')}
                    className="size-20 rounded-full border-2 border-gray-100 object-cover dark:border-slate-700"
                />
                <label
                    htmlFor={fileInputId}
                    className={`cursor-pointer rounded-xl border border-dashed border-ghana-green/50 px-4 py-2 text-sm font-bold text-ghana-green ${busy ? 'pointer-events-none opacity-60' : ''}`}
                >
                    <input
                        id={fileInputId}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        disabled={busy}
                        onChange={(event) => void handleAvatarFile(event)}
                    />
                    {avatarUploading ? t('meUploadingAvatar') : t('meUploadAvatar')}
                </label>
            </div>
            <div>
                <label
                    htmlFor="profile-nickname"
                    className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400"
                >
                    {t('settingsNickname')}
                </label>
                <input
                    id="profile-nickname"
                    value={nickname}
                    maxLength={PROFILE_NICKNAME_MAX}
                    onChange={(event) => setNickname(event.target.value)}
                    placeholder={t('meNicknamePlaceholder')}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-ghana-green dark:border-slate-700 dark:bg-slate-900"
                />
            </div>
            <button
                type="button"
                disabled={busy}
                onClick={() => void persistProfile(avatarDraft)}
                className="w-full rounded-xl bg-ghana-green py-3 font-black text-white disabled:opacity-60"
            >
                {profileSaving ? t('commonLoading') : t('meSaveProfile')}
            </button>
        </div>
    );
};
