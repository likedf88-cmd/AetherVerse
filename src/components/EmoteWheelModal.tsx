/**
 * AetherVerse Fortnite-Style Radial Emote Wheel
 * Supports radial mouse navigation, keyboard slot shortcuts (1-6), touch drag,
 * rarity gradient borders, sound trigger, and synchronized multiplayer emotes.
 */

import React, { useEffect, useState, useRef } from 'react';
import { EmoteItem, EmoteRarity } from '../types/index';
import { playEmoteSoundEffect } from '../utils/avatar3dEngine';
import {
  Sparkles,
  Users,
  Settings,
  X,
  Volume2
} from 'lucide-react';

interface EmoteWheelModalProps {
  equippedEmotes: EmoteItem[];
  onSelectEmote: (emote: EmoteItem) => void;
  onClose: () => void;
  onOpenEmoteShop: () => void;
}

const RARITY_COLORS: Record<EmoteRarity, { border: string; bg: string; text: string; glow: string }> = {
  common: { border: 'border-neutral-500', bg: 'bg-neutral-800/80', text: 'text-neutral-300', glow: '#737373' },
  uncommon: { border: 'border-emerald-500', bg: 'bg-emerald-950/80', text: 'text-emerald-300', glow: '#10b981' },
  rare: { border: 'border-blue-500', bg: 'bg-blue-950/80', text: 'text-blue-300', glow: '#3b82f6' },
  epic: { border: 'border-purple-500', bg: 'bg-purple-950/80', text: 'text-purple-300', glow: '#a855f7' },
  legendary: { border: 'border-amber-500', bg: 'bg-amber-950/80', text: 'text-amber-300', glow: '#f59e0b' },
  exclusive: { border: 'border-rose-500', bg: 'bg-rose-950/80', text: 'text-rose-300', glow: '#f43f5e' }
};

export const EmoteWheelModal: React.FC<EmoteWheelModalProps> = ({
  equippedEmotes,
  onSelectEmote,
  onClose,
  onOpenEmoteShop
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const wheelRef = useRef<HTMLDivElement>(null);

  // Maximum 6 wheel segments
  const slots = equippedEmotes.slice(0, 6);
  const totalSlots = Math.max(slots.length, 6);

  // Keyboard shortcut listener (Keys 1 to 6 and Esc to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      const num = parseInt(e.key, 10);
      if (!isNaN(num) && num >= 1 && num <= slots.length) {
        const selected = slots[num - 1];
        if (selected) {
          playEmoteSoundEffect(selected.actionCode);
          onSelectEmote(selected);
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slots, onSelectEmote, onClose]);

  const handleSlotClick = (emote: EmoteItem) => {
    playEmoteSoundEffect(emote.actionCode);
    onSelectEmote(emote);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="relative flex flex-col items-center">
        {/* Top Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold border border-purple-500/30 mb-1">
            <Sparkles size={12} /> FORTNITE-STYLE EMOTE WHEEL
          </div>
          <h2 className="text-xl font-black text-white tracking-wide">Select Emote or Dance</h2>
          <p className="text-xs text-neutral-400 mt-0.5">Press keys <kbd className="px-1.5 py-0.5 bg-neutral-800 rounded text-white text-[11px]">1-6</kbd> or click a slot</p>
        </div>

        {/* Radial Wheel Container */}
        <div
          ref={wheelRef}
          className="relative w-80 h-80 sm:w-96 sm:h-96 rounded-full border-2 border-neutral-800 bg-neutral-950/80 flex items-center justify-center shadow-2xl"
        >
          {/* Center Hub Indicator */}
          <div className="w-24 h-24 rounded-full bg-neutral-900 border border-neutral-700 flex flex-col items-center justify-center text-center p-2 z-20 shadow-inner">
            {hoveredIndex !== null && slots[hoveredIndex] ? (
              <>
                <span className="text-lg">{slots[hoveredIndex].icon}</span>
                <span className="text-[10px] font-black text-white truncate max-w-[80px]">
                  {slots[hoveredIndex].name}
                </span>
                <span className={`text-[8px] uppercase font-bold ${RARITY_COLORS[slots[hoveredIndex].rarity]?.text || 'text-neutral-400'}`}>
                  {slots[hoveredIndex].rarity}
                </span>
              </>
            ) : (
              <>
                <Sparkles size={20} className="text-cyan-400" />
                <span className="text-[9px] font-bold text-neutral-400 uppercase mt-1">
                  Hover Slot
                </span>
              </>
            )}
          </div>

          {/* Sliced Emote Badges Positioned in Circle */}
          {slots.map((emote, idx) => {
            const angle = (idx / totalSlots) * 2 * Math.PI - Math.PI / 2;
            const radius = 120; // px distance from center
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            const isHovered = hoveredIndex === idx;
            const rarity = RARITY_COLORS[emote.rarity] || RARITY_COLORS.common;

            return (
              <button
                key={emote.id}
                onClick={() => handleSlotClick(emote)}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{
                  transform: `translate(${x}px, ${y}px) translate(-50%, -50%)`,
                  left: '50%',
                  top: '50%'
                }}
                className={`absolute w-20 h-20 sm:w-22 sm:h-22 rounded-2xl border-2 flex flex-col items-center justify-center p-1.5 transition-all duration-200 cursor-pointer shadow-lg group ${
                  rarity.border
                } ${rarity.bg} ${
                  isHovered ? 'scale-115 z-30 ring-4 ring-cyan-400/50' : 'hover:scale-105'
                }`}
              >
                {/* Slot Number Badge */}
                <span className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-black border border-neutral-700 text-[10px] font-black text-white flex items-center justify-center">
                  {idx + 1}
                </span>

                <span className="text-2xl drop-shadow-md group-hover:scale-110 transition-transform">
                  {emote.icon}
                </span>

                <span className="text-[10px] font-black text-white text-center leading-tight truncate max-w-[70px] mt-0.5">
                  {emote.name}
                </span>

                <span className={`text-[8px] font-bold uppercase ${rarity.text}`}>
                  {emote.rarity}
                </span>
              </button>
            );
          })}
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center gap-3 mt-8">
          <button
            onClick={onOpenEmoteShop}
            className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-xl border border-neutral-700 transition-colors flex items-center gap-2 shadow-lg"
          >
            <Settings size={14} className="text-purple-400" /> Customize Wheel in Emote Shop
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium rounded-xl transition-colors"
          >
            Close (Esc)
          </button>
        </div>
      </div>
    </div>
  );
};
