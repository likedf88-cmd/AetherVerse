/**
 * AetherVerse - Next-Generation Social Media & 3D Metaverse Platform
 * Combines Social Feeds, TikTok-style Videos, Disappearing Stories, Real-time Messaging,
 * Interactive 3D Virtual World Lobby, Custom 3D Avatar Creator, Virtual Shop, and Ultra Admin Center.
 */

import React, { useState, useEffect } from 'react';
import { UserProfile, PlatformConfig } from './types/index';
import { api } from './services/api';
import { isSuperAdmin } from './utils/security';
import { Navigation } from './components/Navigation';
import { FeedView } from './components/FeedView';
import { VideosView } from './components/VideosView';
import { LobbyView } from './components/LobbyView';
import { AvatarCustomizerView } from './components/AvatarCustomizerView';
import { ShopView } from './components/ShopView';
import { MessagesView } from './components/MessagesView';
import { RewardsView } from './components/RewardsView';
import { ProfileView } from './components/ProfileView';
import { AdminView } from './components/AdminView';
import { EmoteShopView } from './components/EmoteShopView';
import { AuthModal } from './components/AuthModal';
import { AlertCircle, Megaphone, Lock } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [platformConfig, setPlatformConfig] = useState<PlatformConfig | null>(null);
  const [currentTab, setCurrentTab] = useState<string>('lobby'); // Default to the premier 3D Lobby experience!
  const [showAvatarStudio, setShowAvatarStudio] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  // Initialize session
  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    setIsLoadingSession(true);
    try {
      const res = await api.getSession();
      setCurrentUser(res.user);
      setPlatformConfig(res.config);
    } catch (err) {
      console.error('Session load error', err);
    } finally {
      setIsLoadingSession(false);
    }
  };

  const handleCoinsUpdated = (newBalance: number) => {
    if (currentUser) {
      setCurrentUser({ ...currentUser, coins: newBalance });
    }
  };

  const handleProfileUpdated = (updatedUser: UserProfile) => {
    setCurrentUser(updatedUser);
  };

  if (isLoadingSession || !currentUser) {
    return (
      <div className="w-full h-screen bg-[#070913] flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-600 to-cyan-400 p-0.5 animate-spin">
          <div className="w-full h-full bg-[#070913] rounded-[14px]" />
        </div>
        <div className="text-sm font-semibold tracking-wider uppercase text-neutral-400">
          Entering AetherVerse...
        </div>
      </div>
    );
  }

  // Maintenance mode guard (Except for SUPER_ADMIN)
  if (platformConfig?.maintenanceMode && !isSuperAdmin(currentUser)) {
    return (
      <div className="w-full h-screen bg-black flex flex-col items-center justify-center p-6 text-center text-white space-y-4">
        <Lock size={48} className="text-amber-400 mx-auto" />
        <h1 className="text-2xl font-black">Metaverse Maintenance in Progress</h1>
        <p className="text-xs text-neutral-400 max-w-md">
          Platform systems are temporarily undergoing scheduled updates. Please check back shortly.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070913] text-neutral-100 flex flex-col md:flex-row antialiased selection:bg-purple-600 selection:text-white">
      {/* Navigation (Sidebar on Desktop, Header & Dock on Mobile) */}
      <Navigation
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        currentUser={currentUser}
        onOpenAuthModal={() => setShowAuthModal(true)}
        onOpenNotifications={() => alert('Notifications: You have 2 new followers and 1 daily streak bonus ready!')}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-y-auto">
        {/* Global Announcement Banner if present */}
        {platformConfig?.globalAnnouncement && (
          <div className="bg-gradient-to-r from-purple-950 via-neutral-900 to-cyan-950 border-b border-purple-800/40 px-4 py-2 text-xs flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2 text-purple-200">
              <Megaphone size={14} className="text-pink-400 shrink-0" />
              <span className="font-medium">{platformConfig.globalAnnouncement}</span>
            </div>
          </div>
        )}

        {/* View Routing */}
        <div className="flex-1">
          {currentTab === 'lobby' && (
            <LobbyView
              currentUser={currentUser}
              onOpenAvatarStudio={() => setShowAvatarStudio(true)}
              onOpenShop={() => setCurrentTab('shop')}
              onOpenEmoteShop={() => setCurrentTab('emoteshop')}
            />
          )}

          {currentTab === 'emoteshop' && (
            <EmoteShopView
              currentUser={currentUser}
              onCoinsUpdated={handleCoinsUpdated}
              onEquippedWheelUpdated={(newWheel) => {
                if (currentUser) {
                  const updated = { ...currentUser, equippedEmoteWheelIds: newWheel };
                  setCurrentUser(updated);
                  api.updateProfile({ equippedEmoteWheelIds: newWheel } as any).catch(console.error);
                }
              }}
            />
          )}

          {currentTab === 'feed' && (
            <FeedView currentUser={currentUser} />
          )}

          {currentTab === 'videos' && (
            <VideosView currentUser={currentUser} />
          )}

          {currentTab === 'messages' && (
            <MessagesView currentUser={currentUser} />
          )}

          {currentTab === 'shop' && (
            <ShopView
              currentUser={currentUser}
              onCoinsUpdated={handleCoinsUpdated}
              onOpenAvatarStudio={() => setShowAvatarStudio(true)}
            />
          )}

          {currentTab === 'rewards' && (
            <RewardsView
              currentUser={currentUser}
              onCoinsUpdated={handleCoinsUpdated}
              onNavigateToLobby={() => setCurrentTab('lobby')}
              onNavigateToShop={() => setCurrentTab('shop')}
            />
          )}

          {currentTab === 'profile' && (
            <ProfileView
              currentUser={currentUser}
              onOpenAvatarStudio={() => setShowAvatarStudio(true)}
              onProfileUpdated={handleProfileUpdated}
            />
          )}

          {currentTab === 'admin' && (
            <AdminView currentUser={currentUser} />
          )}
        </div>
      </main>

      {/* 3D Avatar Customizer & Model Studio Modal */}
      {showAvatarStudio && (
        <AvatarCustomizerView
          currentUser={currentUser}
          onProfileUpdated={handleProfileUpdated}
          onClose={() => setShowAvatarStudio(false)}
        />
      )}

      {/* Authentication & User Switcher Modal */}
      {showAuthModal && (
        <AuthModal
          currentUser={currentUser}
          onUserChanged={(newUser) => {
            setCurrentUser(newUser);
          }}
          onClose={() => setShowAuthModal(false)}
        />
      )}
    </div>
  );
}
