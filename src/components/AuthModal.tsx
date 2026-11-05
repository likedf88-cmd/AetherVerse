/**
 * AetherVerse Authentication & Demo Switcher Modal
 * Enables registration, login, and instant switching between demo accounts & SUPER_ADMIN accounts.
 */

import React, { useState } from 'react';
import { UserProfile } from '../types/index';
import { api } from '../services/api';
import {
  ShieldCheck,
  User,
  Sparkles,
  Lock,
  Mail,
  Check,
  LogIn,
  UserPlus
} from 'lucide-react';

interface AuthModalProps {
  currentUser: UserProfile;
  onUserChanged: (newUser: UserProfile) => void;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  currentUser,
  onUserChanged,
  onClose
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const demoAccounts = [
    {
      id: 'usr_superadmin_likedf88',
      email: 'likedf88@gmail.com',
      username: 'likedf88',
      role: 'SUPER_ADMIN',
      badge: 'SUPER ADMIN (Owner)',
      badgeColor: 'bg-red-500/20 text-red-300 border-red-500/40'
    },
    {
      id: 'usr_superadmin_cmoney',
      email: 'cmoney20262626@gmail.com',
      username: 'cmoney_admin',
      role: 'SUPER_ADMIN',
      badge: 'SUPER ADMIN (Security)',
      badgeColor: 'bg-red-500/20 text-red-300 border-red-500/40'
    },
    {
      id: 'usr_creator_nova',
      email: 'nova_artist@meta.io',
      username: 'nova_artist',
      role: 'CREATOR',
      badge: 'Creator ✨',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40'
    },
    {
      id: 'usr_casual_cyber_racer',
      email: 'cyber_racer@meta.io',
      username: 'cyber_racer',
      role: 'USER',
      badge: 'Regular User',
      badgeColor: 'bg-neutral-800 text-neutral-300 border-neutral-700'
    }
  ];

  const handleQuickSwitch = async (userId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.switchUser(userId);
      onUserChanged(res.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Switch failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'login') {
        const res = await api.login(email, password);
        onUserChanged(res.user);
        onClose();
      } else {
        const res = await api.register({
          email,
          username,
          displayName: displayName || username,
          password
        });
        onUserChanged(res.user);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-neutral-950 border border-neutral-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div>
            <h3 className="font-extrabold text-white text-lg flex items-center gap-2">
              <Sparkles size={18} className="text-purple-400" /> AetherVerse Account Center
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">Switch active user or register a custom account</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg bg-neutral-900"
          >
            ✕
          </button>
        </div>

        {/* Quick Demo Switcher Section */}
        <div className="space-y-2.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block">
            ⚡ Quick-Switch Active Account
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {demoAccounts.map(acc => {
              const isActive = currentUser.id === acc.id;

              return (
                <button
                  key={acc.id}
                  onClick={() => handleQuickSwitch(acc.id)}
                  disabled={loading}
                  className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                    isActive
                      ? 'bg-purple-950/40 border-purple-500 ring-1 ring-purple-500'
                      : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">{acc.username}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${acc.badgeColor}`}>
                      {acc.badge}
                    </span>
                  </div>
                  <div className="text-[10px] text-neutral-400 font-mono mt-1 truncate">{acc.email}</div>
                  {isActive && (
                    <div className="mt-2 text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                      <Check size={10} /> Currently Active
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Standard Email Auth Form */}
        <div className="pt-4 border-t border-neutral-800 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white">
              {mode === 'login' ? 'Login with Credentials' : 'Create New Account'}
            </span>
            <button
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError(null);
              }}
              className="text-xs text-purple-400 hover:text-purple-300 font-semibold"
            >
              {mode === 'login' ? 'Need an account? Register' : 'Have an account? Login'}
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl text-xs text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-[11px] font-semibold text-neutral-400 block mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@metaverse.io"
                className="w-full bg-neutral-900 text-white text-xs px-3.5 py-2.5 rounded-xl border border-neutral-700 focus:outline-none focus:border-purple-500"
              />
            </div>

            {mode === 'register' && (
              <>
                <div>
                  <label className="text-[11px] font-semibold text-neutral-400 block mb-1">Username (Unique handle)</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="cyber_pilot"
                    className="w-full bg-neutral-900 text-white text-xs px-3.5 py-2.5 rounded-xl border border-neutral-700 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-neutral-400 block mb-1">Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Cyber Pilot 🚀"
                    className="w-full bg-neutral-900 text-white text-xs px-3.5 py-2.5 rounded-xl border border-neutral-700 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </>
            )}

            <div>
              <label className="text-[11px] font-semibold text-neutral-400 block mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-neutral-900 text-white text-xs px-3.5 py-2.5 rounded-xl border border-neutral-700 focus:outline-none focus:border-purple-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all"
            >
              {loading ? 'Authenticating...' : mode === 'login' ? 'Sign In' : 'Complete Registration'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
