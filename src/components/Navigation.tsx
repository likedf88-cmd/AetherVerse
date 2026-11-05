/**
 * AetherVerse Responsive Navigation System
 * Desktop left sidebar, mobile bottom dock, coins widget, and Super Admin badge.
 */

import React from 'react';
import { UserProfile } from '../types/index';
import { isSuperAdmin } from '../utils/security';
import {
  Home,
  Compass,
  Video,
  MessageSquare,
  Sparkles,
  ShoppingBag,
  Gift,
  Bell,
  User,
  ShieldAlert,
  Zap,
  LogIn,
  Layers,
  Disc3
} from 'lucide-react';

interface NavigationProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  currentUser: UserProfile;
  onOpenAuthModal: () => void;
  onOpenNotifications: () => void;
  unreadNotificationsCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  currentUser,
  onOpenAuthModal,
  onOpenNotifications,
  unreadNotificationsCount = 2
}) => {
  const superAdmin = isSuperAdmin(currentUser);

  const navLinks = [
    { id: 'feed', label: 'Home Feed', icon: Home },
    { id: 'videos', label: 'Reels & Videos', icon: Video, badge: 'HOT' },
    { id: 'lobby', label: '3D Metaverse Lobby', icon: Sparkles, highlight: true },
    { id: 'emoteshop', label: 'Emote Shop', icon: Disc3, badge: 'NEW' },
    { id: 'messages', label: 'Direct Messages', icon: MessageSquare },
    { id: 'shop', label: 'Virtual Shop', icon: ShoppingBag },
    { id: 'rewards', label: 'Daily Rewards', icon: Gift },
    { id: 'profile', label: 'My Profile', icon: User }
  ];

  return (
    <>
      {/* ========================================== */}
      {/* DESKTOP SIDEBAR (Hidden on mobile) */}
      {/* ========================================== */}
      <aside className="hidden md:flex flex-col justify-between w-64 lg:w-72 h-screen sticky top-0 bg-neutral-950/80 backdrop-blur-xl border-r border-neutral-800/80 p-5 z-40 select-none">
        <div className="space-y-6">
          {/* Logo & Brand Header */}
          <div
            onClick={() => onSelectTab('feed')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-600 to-cyan-400 p-0.5 shadow-lg group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-neutral-950 rounded-[14px] flex items-center justify-center">
                <Layers className="text-cyan-400" size={20} />
              </div>
            </div>
            <div>
              <div className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
                AETHER<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">VERSE</span>
              </div>
              <div className="text-[10px] text-neutral-400 font-medium tracking-widest uppercase">
                Social Metaverse
              </div>
            </div>
          </div>

          {/* Virtual Coins Wallet Pill */}
          <div
            onClick={() => onSelectTab('rewards')}
            className="p-3 bg-gradient-to-r from-neutral-900 to-neutral-900/40 border border-neutral-800 rounded-2xl flex items-center justify-between cursor-pointer hover:border-yellow-500/50 transition-colors shadow-inner"
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-yellow-500/20 text-yellow-400 flex items-center justify-center">
                <Zap size={15} />
              </div>
              <div>
                <div className="text-[10px] text-neutral-400 uppercase font-semibold">Coins Balance</div>
                <div className="text-xs font-black text-white">{currentUser.coins.toLocaleString()}</div>
              </div>
            </div>
            <span className="text-[10px] text-purple-400 font-bold bg-purple-500/10 px-2 py-0.5 rounded-md">
              Earn Free +
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navLinks.map(link => {
              const active = currentTab === link.id;

              return (
                <button
                  key={link.id}
                  onClick={() => onSelectTab(link.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-semibold transition-all ${
                    active
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-900/30 font-bold'
                      : link.highlight
                      ? 'text-cyan-300 hover:text-white hover:bg-neutral-900 border border-cyan-500/20'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <link.icon size={18} className={link.highlight && !active ? 'text-cyan-400 animate-pulse' : ''} />
                    <span>{link.label}</span>
                  </div>

                  {link.badge && (
                    <span className="text-[9px] font-black bg-pink-500 text-white px-1.5 py-0.2 rounded-md">
                      {link.badge}
                    </span>
                  )}
                </button>
              );
            })}

            {/* SUPER_ADMIN Control Center Button */}
            {superAdmin && (
              <button
                onClick={() => onSelectTab('admin')}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all mt-3 border ${
                  currentTab === 'admin'
                    ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-900/40'
                    : 'bg-red-950/30 text-red-300 hover:bg-red-950/60 border-red-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <ShieldAlert size={18} className="text-red-400" />
                  <span>Ultra Admin Panel</span>
                </div>
                <span className="text-[9px] font-black bg-red-600 text-white px-1.5 py-0.5 rounded">
                  SUPER
                </span>
              </button>
            )}
          </nav>
        </div>

        {/* User Profile & Account Switcher Footer */}
        <div className="pt-4 border-t border-neutral-800/80 space-y-3">
          <div
            onClick={() => onSelectTab('profile')}
            className="flex items-center gap-3 p-2 rounded-2xl hover:bg-neutral-900 cursor-pointer transition-colors"
          >
            <div className="relative">
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.username}
                className="w-10 h-10 rounded-full object-cover border border-purple-500/50"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-black" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white truncate flex items-center gap-1">
                {currentUser.displayName}
                {currentUser.isVerified && <span className="text-purple-400 text-[10px]">✓</span>}
              </div>
              <div className="text-[11px] text-neutral-400 truncate">@{currentUser.username}</div>
            </div>
          </div>

          <button
            onClick={onOpenAuthModal}
            className="w-full py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-xl text-xs font-semibold border border-neutral-800 transition-colors flex items-center justify-center gap-2"
          >
            <LogIn size={13} /> Switch Account / Login
          </button>
        </div>
      </aside>

      {/* ========================================== */}
      {/* MOBILE TOP HEADER BAR */}
      {/* ========================================== */}
      <header className="md:hidden sticky top-0 z-40 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800 px-4 py-3 flex items-center justify-between">
        <div onClick={() => onSelectTab('feed')} className="flex items-center gap-2 cursor-pointer">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 to-cyan-400 flex items-center justify-center">
            <Layers className="text-white" size={14} />
          </div>
          <span className="font-black text-white text-sm tracking-tight">AETHERVERSE</span>
        </div>

        <div className="flex items-center gap-2">
          {superAdmin && (
            <button
              onClick={() => onSelectTab('admin')}
              className="p-1.5 bg-red-950/60 border border-red-800 rounded-lg text-red-300 text-xs font-bold"
            >
              ADMIN
            </button>
          )}

          <div
            onClick={() => onSelectTab('rewards')}
            className="flex items-center gap-1 bg-neutral-900 px-2.5 py-1 rounded-lg border border-neutral-800 text-yellow-400 font-bold text-xs"
          >
            <Zap size={13} /> {currentUser.coins.toLocaleString()}
          </div>

          <button
            onClick={onOpenAuthModal}
            className="p-1.5 text-neutral-400 hover:text-white bg-neutral-900 rounded-lg"
            title="Switch User"
          >
            <User size={16} />
          </button>
        </div>
      </header>

      {/* ========================================== */}
      {/* MOBILE BOTTOM DOCK BAR */}
      {/* ========================================== */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-neutral-950/95 backdrop-blur-xl border-t border-neutral-800 px-3 py-2 flex items-center justify-around">
        {[
          { id: 'feed', label: 'Feed', icon: Home },
          { id: 'videos', label: 'Videos', icon: Video },
          { id: 'lobby', label: '3D Lobby', icon: Sparkles, highlight: true },
          { id: 'messages', label: 'Chat', icon: MessageSquare },
          { id: 'shop', label: 'Shop', icon: ShoppingBag },
          { id: 'profile', label: 'Profile', icon: User }
        ].map(item => {
          const active = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center gap-1 text-[10px] font-semibold transition-colors ${
                active
                  ? 'text-purple-400'
                  : item.highlight
                  ? 'text-cyan-400'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <item.icon size={19} className={item.highlight && active ? 'animate-bounce' : ''} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
