/**
 * AetherVerse User Profile & 3D Avatar Showroom
 * Displays stats, social media creations, 3D avatar identity, and profile customizer.
 */

import React, { useState } from 'react';
import { UserProfile, Post, ShortVideo } from '../types/index';
import { api } from '../services/api';
import {
  Sparkles,
  Edit3,
  Grid,
  Video,
  Bookmark,
  Shield,
  Zap,
  Users,
  Heart,
  MessageSquare,
  Check
} from 'lucide-react';

interface ProfileViewProps {
  currentUser: UserProfile;
  onOpenAvatarStudio: () => void;
  onProfileUpdated: (updated: UserProfile) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  onOpenAvatarStudio,
  onProfileUpdated
}) => {
  const [activeTab, setActiveTab] = useState<'posts' | 'videos' | 'saved' | 'avatar'>('posts');
  const [isEditing, setIsEditing] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState(currentUser.displayName);
  const [editBio, setEditBio] = useState(currentUser.bio);
  const [editBannerUrl, setEditBannerUrl] = useState(currentUser.bannerUrl);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await api.updateProfile({
        displayName: editDisplayName,
        bio: editBio,
        bannerUrl: editBannerUrl
      });
      onProfileUpdated(res.user);
      setIsEditing(false);
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Banner & Profile Header */}
      <div className="relative bg-neutral-900/60 backdrop-blur-md border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl">
        {/* Banner Image */}
        <div className="relative w-full h-44 sm:h-56 bg-gradient-to-r from-purple-900 via-neutral-900 to-cyan-950 overflow-hidden">
          <img
            src={currentUser.bannerUrl}
            alt="Banner"
            className="w-full h-full object-cover opacity-80"
          />
        </div>

        {/* Profile Card Body */}
        <div className="p-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 -mt-16 sm:-mt-20 mb-4">
            {/* Avatar Photo with Cyber Ring */}
            <div className="relative">
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl p-1 bg-gradient-to-tr from-purple-500 via-cyan-400 to-pink-500 shadow-2xl">
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.username}
                  className="w-full h-full rounded-[22px] object-cover bg-neutral-950"
                />
              </div>
              <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-black" />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={onOpenAvatarStudio}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white text-xs font-semibold rounded-xl shadow-lg transition-all flex items-center gap-1.5"
              >
                <Sparkles size={14} /> 3D Avatar Studio
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium rounded-xl border border-neutral-700 transition-colors flex items-center gap-1.5"
              >
                <Edit3 size={14} /> Edit Profile
              </button>
            </div>
          </div>

          {/* User Details */}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white">{currentUser.displayName}</h1>
              {currentUser.isVerified && (
                <span className="bg-purple-600 text-[10px] text-white px-2 py-0.5 rounded-full font-bold">
                  ✓ Verified
                </span>
              )}
              {currentUser.role === 'SUPER_ADMIN' && (
                <span className="bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Shield size={11} className="text-red-400" /> SUPER_ADMIN
                </span>
              )}
            </div>

            <div className="text-xs text-neutral-400 mt-0.5">@{currentUser.username} • {currentUser.email}</div>

            <p className="text-xs sm:text-sm text-neutral-200 mt-3 max-w-2xl leading-relaxed">
              {currentUser.bio}
            </p>

            {/* Social Stats */}
            <div className="flex flex-wrap items-center gap-6 mt-5 pt-4 border-t border-neutral-800/80 text-xs">
              <div>
                <span className="font-extrabold text-white text-sm">{currentUser.followersCount.toLocaleString()}</span>
                <span className="text-neutral-400 ml-1.5">Followers</span>
              </div>
              <div>
                <span className="font-extrabold text-white text-sm">{currentUser.followingCount.toLocaleString()}</span>
                <span className="text-neutral-400 ml-1.5">Following</span>
              </div>
              <div>
                <span className="font-extrabold text-white text-sm">{currentUser.totalLikesCount.toLocaleString()}</span>
                <span className="text-neutral-400 ml-1.5">Total Likes</span>
              </div>
              <div className="text-yellow-400 flex items-center gap-1 font-bold">
                <Zap size={15} />
                <span>{currentUser.coins.toLocaleString()} Coins</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-center border-b border-neutral-800">
        {[
          { id: 'posts', label: 'Posts', icon: Grid },
          { id: 'videos', label: 'Reels & Videos', icon: Video },
          { id: 'saved', label: 'Saved (Private)', icon: Bookmark },
          { id: 'avatar', label: '3D Avatar Specs', icon: Sparkles }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-all ${
              activeTab === tab.id
                ? 'border-purple-500 text-white bg-neutral-900/30'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <tab.icon size={15} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      {activeTab === 'posts' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
            'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=600&q=80',
            'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=600&q=80'
          ].map((url, i) => (
            <div key={i} className="aspect-square rounded-2xl overflow-hidden bg-neutral-900 relative group">
              <img src={url} alt="Post" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white text-xs font-bold">
                <span className="flex items-center gap-1"><Heart size={14} className="fill-white" /> 1.4K</span>
                <span className="flex items-center gap-1"><MessageSquare size={14} /> 88</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'videos' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80',
            'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80'
          ].map((url, i) => (
            <div key={i} className="aspect-9/16 rounded-2xl overflow-hidden bg-neutral-900 relative group">
              <img src={url} alt="Video" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              <div className="absolute bottom-3 left-3 text-white text-xs font-bold drop-shadow-md">
                ⚡ 45.2K Views
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'saved' && (
        <div className="p-8 text-center text-neutral-400 bg-neutral-900/40 rounded-3xl border border-neutral-800">
          <Bookmark size={32} className="mx-auto mb-2 opacity-40 text-purple-400" />
          <h4 className="font-bold text-white text-sm">Your Saved Collection</h4>
          <p className="text-xs text-neutral-500 mt-1">Posts and items bookmarked for your personal inspiration.</p>
        </div>
      )}

      {activeTab === 'avatar' && (
        <div className="p-6 bg-neutral-900/60 border border-neutral-800 rounded-3xl space-y-4">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <Sparkles size={16} className="text-cyan-400" /> Equipped Avatar Specifications
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800">
              <span className="text-[10px] text-neutral-400 uppercase">Skin Tone</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-4 h-4 rounded-full border border-neutral-700" style={{ backgroundColor: currentUser.avatarConfig.skinTone }} />
                <span className="text-white font-semibold">{currentUser.avatarConfig.skinTone}</span>
              </div>
            </div>

            <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800">
              <span className="text-[10px] text-neutral-400 uppercase">Visor HUD</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-4 h-4 rounded-full" style={{ backgroundColor: currentUser.avatarConfig.visorColor }} />
                <span className="text-white font-semibold capitalize">{currentUser.avatarConfig.visorStyle.replace('_', ' ')}</span>
              </div>
            </div>

            <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800">
              <span className="text-[10px] text-neutral-400 uppercase">Aura Reactor</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-4 h-4 rounded-full" style={{ backgroundColor: currentUser.avatarConfig.glowColor }} />
                <span className="text-white font-semibold">{currentUser.avatarConfig.glowColor}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-neutral-800 rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="font-extrabold text-white text-lg">Edit Profile Details</h3>

            <form onSubmit={handleSaveProfile} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-neutral-400 block mb-1">Display Name</label>
                <input
                  type="text"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  className="w-full bg-neutral-900 text-white text-xs px-3.5 py-2.5 rounded-xl border border-neutral-700 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-400 block mb-1">Bio</label>
                <textarea
                  rows={3}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full bg-neutral-900 text-white text-xs px-3.5 py-2.5 rounded-xl border border-neutral-700 focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-400 block mb-1">Banner Image URL</label>
                <input
                  type="url"
                  value={editBannerUrl}
                  onChange={(e) => setEditBannerUrl(e.target.value)}
                  className="w-full bg-neutral-900 text-white text-xs px-3.5 py-2.5 rounded-xl border border-neutral-700 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl shadow-lg transition-all"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
