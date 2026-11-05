/**
 * AetherVerse Daily Rewards & Virtual Economy Center
 * 7-day streak claim ladder, daily achievements, live cooldown, and leaderboard.
 */

import React, { useEffect, useState } from 'react';
import { UserProfile } from '../types/index';
import { api } from '../services/api';
import {
  Zap,
  Gift,
  Trophy,
  Flame,
  Check,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

interface RewardsViewProps {
  currentUser: UserProfile;
  onCoinsUpdated: (newBalance: number) => void;
  onNavigateToLobby: () => void;
  onNavigateToShop: () => void;
}

export const RewardsView: React.FC<RewardsViewProps> = ({
  currentUser,
  onCoinsUpdated,
  onNavigateToLobby,
  onNavigateToShop
}) => {
  const [eligible, setEligible] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [potentialReward, setPotentialReward] = useState(100);
  const [cooldownMs, setCooldownMs] = useState(0);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimFeedback, setClaimFeedback] = useState<string | null>(null);

  useEffect(() => {
    loadRewardsStatus();
  }, []);

  const loadRewardsStatus = async () => {
    try {
      const res = await api.getRewardsStatus();
      setEligible(res.eligible);
      setCurrentStreak(res.currentStreak);
      setPotentialReward(res.potentialReward);
      setCooldownMs(res.cooldownRemainingMs);
    } catch (err) {
      console.error(err);
    }
  };

  const handleClaim = async () => {
    setIsClaiming(true);
    setClaimFeedback(null);
    try {
      const res = await api.claimDailyReward();
      onCoinsUpdated(res.newBalance);
      setEligible(false);
      setCurrentStreak(res.newStreak);
      setClaimFeedback(res.message);
    } catch (err: any) {
      setClaimFeedback(err.message || 'Failed to claim reward');
    } finally {
      setIsClaiming(false);
    }
  };

  const streakDays = [
    { day: 1, reward: 100 },
    { day: 2, reward: 150 },
    { day: 3, reward: 200 },
    { day: 4, reward: 250 },
    { day: 5, reward: 350 },
    { day: 6, reward: 500 },
    { day: 7, reward: 1000, jackpot: true }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Top Header Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-600/30 via-purple-900/40 to-neutral-900 border border-neutral-800 p-6 md:p-8 shadow-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-500/30 flex items-center gap-1">
                <Flame size={12} className="text-amber-400" /> Daily Streak: {currentStreak} Days
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white">
              Rewards & Economy Hub
            </h1>
            <p className="text-xs text-neutral-400 mt-1">
              Claim daily login bonuses, complete metaverse missions, and earn virtual coins.
            </p>
          </div>

          <div className="bg-neutral-950/80 backdrop-blur-md px-6 py-4 rounded-2xl border border-neutral-700 text-right">
            <div className="text-[11px] text-neutral-400 uppercase font-semibold">Total Balance</div>
            <div className="text-2xl font-black text-yellow-400 flex items-center justify-end gap-1.5 mt-0.5">
              <Zap size={20} /> {currentUser.coins.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* 7-Day Streak Claim Card */}
      <div className="bg-neutral-900/60 backdrop-blur-md border border-neutral-800 rounded-3xl p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Gift size={20} className="text-pink-400" /> 7-Day Consecutive Streak
            </h2>
            <p className="text-xs text-neutral-400">
              Log in every 24 hours to scale up your daily reward. Reach Day 7 for the 1,000 COIN Jackpot!
            </p>
          </div>

          {eligible ? (
            <button
              onClick={handleClaim}
              disabled={isClaiming}
              className="px-6 py-2.5 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all animate-pulse"
            >
              {isClaiming ? 'Claiming...' : `Claim +${potentialReward} Coins!`}
            </button>
          ) : (
            <div className="flex items-center gap-2 text-xs text-neutral-400 bg-neutral-950 px-3.5 py-2 rounded-xl border border-neutral-800">
              <Clock size={14} className="text-cyan-400" />
              <span>Next claim in ~{Math.ceil(cooldownMs / 3600000)}h</span>
            </div>
          )}
        </div>

        {claimFeedback && (
          <div className="p-3 bg-purple-950/60 border border-purple-700 text-purple-200 text-xs rounded-xl flex items-center gap-2">
            <Check size={16} /> {claimFeedback}
          </div>
        )}

        {/* 7 Day Blocks Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
          {streakDays.map((s) => {
            const isCompleted = currentStreak >= s.day;
            const isCurrent = currentStreak + 1 === s.day && eligible;

            return (
              <div
                key={s.day}
                className={`p-3.5 rounded-2xl border flex flex-col items-center justify-between text-center transition-all ${
                  isCompleted
                    ? 'bg-purple-950/40 border-purple-600 text-purple-200'
                    : isCurrent
                    ? 'bg-gradient-to-b from-pink-950/60 to-purple-950/60 border-pink-500 ring-2 ring-pink-500/50'
                    : s.jackpot
                    ? 'bg-amber-950/20 border-amber-600/50 text-neutral-400'
                    : 'bg-neutral-950/60 border-neutral-800 text-neutral-400'
                }`}
              >
                <div className="text-[11px] font-bold uppercase tracking-wider mb-2">
                  Day {s.day}
                </div>

                <div className="w-10 h-10 rounded-full bg-neutral-900 border border-neutral-700 flex items-center justify-center text-yellow-400 text-base mb-2">
                  {s.jackpot ? '👑' : <Zap size={18} />}
                </div>

                <div className="text-xs font-black text-white">
                  +{s.reward}
                </div>
                <div className="text-[9px] text-neutral-500 uppercase mt-0.5">
                  {s.jackpot ? 'Jackpot' : 'Coins'}
                </div>

                {isCompleted && (
                  <div className="mt-2 text-[10px] text-emerald-400 font-semibold flex items-center gap-0.5">
                    <Check size={10} /> Claimed
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Daily Challenges */}
      <div className="bg-neutral-900/60 backdrop-blur-md border border-neutral-800 rounded-3xl p-6 shadow-xl space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Trophy size={18} className="text-yellow-400" /> Daily Metaverse Challenges
        </h2>

        <div className="space-y-3">
          {[
            {
              title: 'Enter the 3D Metaverse Lobby',
              reward: 150,
              desc: 'Join the Central Plaza and dance with another player.',
              completed: true,
              action: onNavigateToLobby,
              actionLabel: 'Enter 3D Lobby'
            },
            {
              title: 'Customize Your Avatar Identity',
              reward: 200,
              desc: 'Equip a new skin color, visor, or custom 3D model.',
              completed: true,
              action: onNavigateToShop,
              actionLabel: 'Go to Shop'
            },
            {
              title: 'Post a Short Video or Photo',
              reward: 250,
              desc: 'Share a moment with the AetherVerse community.',
              completed: false,
              action: () => alert('Create a new post in the Home Feed!'),
              actionLabel: 'Create Post'
            }
          ].map((ch, idx) => (
            <div
              key={idx}
              className="p-4 bg-neutral-950/70 border border-neutral-800 rounded-2xl flex items-center justify-between gap-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-white text-xs">{ch.title}</h4>
                  <span className="text-[10px] text-yellow-400 font-bold bg-yellow-400/10 px-2 py-0.5 rounded-md flex items-center gap-0.5">
                    <Zap size={10} /> +{ch.reward} Coins
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 mt-0.5">{ch.desc}</p>
              </div>

              {ch.completed ? (
                <span className="px-3 py-1.5 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center gap-1">
                  <Check size={13} /> Completed
                </span>
              ) : (
                <button
                  onClick={ch.action}
                  className="px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium rounded-xl border border-neutral-700 transition-colors"
                >
                  {ch.actionLabel}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
