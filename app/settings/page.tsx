'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase/client';
import Header from '@/components/Header';
import Loader from '@/components/Loader';

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [nickname, setNickname] = useState('');
  const [nicknameError, setNicknameError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const fetchProfile = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('avatar_url, nickname')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned, which is fine for new users
        console.error('Error fetching profile:', error);
      }

      if (data) {
        setAvatarUrl(data.avatar_url);
        setNickname(data.nickname || '');
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
      return;
    }

    if (user) {
      fetchProfile();
    }
  }, [user, authLoading, fetchProfile, router]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setNicknameError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setNicknameError('Image size must be less than 5MB');
      return;
    }

    setSaving(true);
    setNicknameError('');
    setSuccessMessage('');

    // Store old avatar URL before updating
    const oldAvatarUrl = avatarUrl;

    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const newAvatarUrl = urlData.publicUrl;

      // Update profile
      const { error: updateError } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          avatar_url: newAvatarUrl,
          nickname: nickname || null,
        }, {
          onConflict: 'user_id'
        });

      if (updateError) throw updateError;

      // Delete old avatar from storage if it exists
      if (oldAvatarUrl) {
        try {
          // Extract file path from old avatar URL
          // URL format: https://[project-id].supabase.co/storage/v1/object/public/avatars/[file-path]
          const urlParts = oldAvatarUrl.split('/avatars/');
          if (urlParts.length > 1) {
            const oldFilePath = `avatars/${urlParts[1]}`;
            
            // Delete old file
            const { error: deleteError } = await supabase.storage
              .from('avatars')
              .remove([oldFilePath]);

            if (deleteError) {
              console.warn('Failed to delete old avatar:', deleteError);
              // Don't throw error, just log it - new avatar is already uploaded
            }
          }
        } catch (deleteErr) {
          console.warn('Error deleting old avatar:', deleteErr);
          // Don't throw error, just log it - new avatar is already uploaded
        }
      }

      setAvatarUrl(newAvatarUrl);
      setSuccessMessage('Avatar updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      console.error('Error uploading avatar:', err);
      setNicknameError(err.message || 'Failed to upload avatar');
    } finally {
      setSaving(false);
    }
  };

  const handleNicknameChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setNicknameError('');
    setSuccessMessage('');

    // Validate nickname
    if (!nickname.trim()) {
      setNicknameError('Nickname cannot be empty');
      setSaving(false);
      return;
    }

    if (nickname.length < 3) {
      setNicknameError('Nickname must be at least 3 characters');
      setSaving(false);
      return;
    }

    if (nickname.length > 20) {
      setNicknameError('Nickname must be less than 20 characters');
      setSaving(false);
      return;
    }

    try {
      // Check if nickname already exists
      const trimmedNickname = nickname.trim();
      const { data: existingUsers, error: checkError } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('nickname', trimmedNickname)
        .neq('user_id', user.id);

      if (checkError) {
        // If error is not "no rows found", throw it
        if (checkError.code !== 'PGRST116') {
          throw checkError;
        }
      }

      if (existingUsers && existingUsers.length > 0) {
        setNicknameError('This nickname is already taken');
        setSaving(false);
        return;
      }

      // Update profile
      const { error: updateError } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          avatar_url: avatarUrl,
          nickname: nickname.trim(),
        }, {
          onConflict: 'user_id'
        });

      if (updateError) throw updateError;

      setSuccessMessage('Nickname updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      console.error('Error updating nickname:', err);
      setNicknameError(err.message || 'Failed to update nickname');
    } finally {
      setSaving(false);
    }
  };

  const getInitials = () => {
    if (nickname) {
      return nickname.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'L';
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader message="Loading settings..." />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <Header />
      <div className="min-h-screen pt-24 pb-20 px-4">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="cinematic-card p-8 space-y-8"
          >
            <div>
              <h1 className="text-3xl font-bold mb-2">Settings</h1>
              <p className="text-white/60 text-sm">Manage your profile and preferences</p>
            </div>

            {/* Success Message */}
            {successMessage && (
              <div className="p-4 bg-green-600/10 border border-green-600/30 rounded-lg text-green-400 text-sm">
                ✓ {successMessage}
              </div>
            )}

            {/* Profile Picture Section */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Profile Picture</h2>
              <div className="flex items-center gap-6">
                <div className="relative">
                  <button
                    onClick={handleAvatarClick}
                    disabled={saving}
                    className="w-24 h-24 rounded-full bg-red-600 flex items-center justify-center text-white font-semibold text-3xl hover:ring-2 hover:ring-red-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Profile"
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span>{getInitials()}</span>
                    )}
                  </button>
                  {saving && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                      <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-white/70 mb-2">
                    Click on your profile picture to upload a new one
                  </p>
                  <p className="text-xs text-white/50">
                    Supported formats: JPG, PNG, GIF (max 5MB)
                  </p>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>

            {/* Divider */}
            <div className="border-t border-white/10" />

            {/* Nickname Section */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Nickname</h2>
              <form onSubmit={handleNicknameChange} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Choose a unique nickname
                  </label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => {
                      setNickname(e.target.value);
                      setNicknameError('');
                    }}
                    placeholder="Enter your nickname"
                    maxLength={20}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:border-red-600 focus:outline-none transition-all"
                  />
                  <p className="mt-2 text-xs text-white/50">
                    {nickname.length}/20 characters
                  </p>
                </div>

                {nicknameError && (
                  <div className="p-3 bg-red-600/10 border border-red-600/30 rounded-lg text-red-400 text-sm">
                    {nicknameError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={saving || !nickname.trim()}
                  className="netflix-button disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Nickname'}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}

