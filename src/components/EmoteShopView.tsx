/**
 * AetherVerse Dedicated Emote Marketplace & Radial Wheel Customizer
 * 3D live animation preview, rarity filters, audio stems, and 6-slot wheel loadout configuration.
 */

import React, { useEffect, useState, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EmoteItem, EmoteRarity, EmoteCategory, UserProfile } from '../types/index';
import { api } from '../services/api';
import { buildHighFidelityHumanoidAvatar, playEmoteSoundEffect } from '../utils/avatar3dEngine';
import {
  Sparkles,
  Zap,
  ShoppingBag,
  Check,
  Play,
  RotateCw,
  Volume2,
  Lock,
  Flame,
  Star
} from 'lucide-react';

interface EmoteShopViewProps {
  currentUser: UserProfile;
  onCoinsUpdated: (newBalance: number) => void;
  onEquippedWheelUpdated: (slots: string[]) => void;
}

const RARITY_STYLING: Record<EmoteRarity, { border: string; bg: string; text: string; badge: string }> = {
  common: { border: 'border-neutral-700', bg: 'bg-neutral-900', text: 'text-neutral-300', badge: 'bg-neutral-800 text-neutral-300' },
  uncommon: { border: 'border-emerald-700', bg: 'bg-emerald-950/30', text: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300' },
  rare: { border: 'border-blue-700', bg: 'bg-blue-950/30', text: 'text-blue-400', badge: 'bg-blue-500/20 text-blue-300' },
  epic: { border: 'border-purple-700', bg: 'bg-purple-950/30', text: 'text-purple-400', badge: 'bg-purple-500/20 text-purple-300' },
  legendary: { border: 'border-amber-700', bg: 'bg-amber-950/30', text: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-300' },
  exclusive: { border: 'border-rose-700', bg: 'bg-rose-950/30', text: 'text-rose-400', badge: 'bg-rose-500/20 text-rose-300' }
};

export const EmoteShopView: React.FC<EmoteShopViewProps> = ({
  currentUser,
  onCoinsUpdated,
  onEquippedWheelUpdated
}) => {
  const [emotes, setEmotes] = useState<EmoteItem[]>([]);
  const [selectedEmote, setSelectedEmote] = useState<EmoteItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [equippedSlots, setEquippedSlots] = useState<string[]>(
    currentUser.equippedEmoteWheelIds || ['emote_dance', 'emote_wave', 'emote_backflip', 'emote_cheer']
  );
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const previewMountRef = useRef<HTMLDivElement>(null);
  const rigRef = useRef<any>(null);

  useEffect(() => {
    loadEmotes();
  }, []);

  const loadEmotes = async () => {
    try {
      const res = await api.getShopItems();
      const loadedEmotes = res.emotes || [];
      setEmotes(loadedEmotes);
      if (loadedEmotes.length > 0 && !selectedEmote) {
        setSelectedEmote(loadedEmotes[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Three.js 3D Avatar Preview for Emote Animation
  useEffect(() => {
    if (!previewMountRef.current) return;
    const container = previewMountRef.current;

    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0b0e1e');

    const camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.1, 50);
    camera.position.set(0, 1.4, 3.8);

    const renderer = new THREE.WebGLRenderer({ antialias: !isSoftwareGl, powerPreference: 'high-performance' });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    container.appendChild(renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    scene.add(new THREE.HemisphereLight(0x7928ca, 0x050711, 1.2));
    const key = new THREE.DirectionalLight(0xffffff, 2);
    key.position.set(5, 10, 7);
    scene.add(key);

    const spot = new THREE.SpotLight(0x00f3ff, 3, 20, Math.PI / 4, 0.5);
    spot.position.set(0, 5, 2);
    scene.add(spot);

    // Build Skinned Humanoid Rig
    const rig = buildHighFidelityHumanoidAvatar(currentUser.avatarConfig);
    scene.add(rig.rootGroup);
    rigRef.current = rig;

    // Pedestal
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 1.6, 0.2, 32),
      new THREE.MeshStandardMaterial({ color: 0x181a2f, metalness: 0.85, roughness: 0.25 })
    );
    base.position.y = -0.1;
    scene.add(base);

    let frameId = 0;
    let lastTime = performance.now();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const tick = () => {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      rig.mixer.update(dt);
      renderer.render(scene, camera);

      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      if (isSoftwareGl) clearTimeout(frameId);
      else cancelAnimationFrame(frameId);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [currentUser]);

  // When selected emote changes, trigger animation on 3D preview
  useEffect(() => {
    if (selectedEmote && rigRef.current) {
      rigRef.current.playAnimation(selectedEmote.actionCode || 'dance_electro');
    }
  }, [selectedEmote]);

  const handlePurchaseEmote = async (emote: EmoteItem) => {
    setPurchasingId(emote.id);
    setMessage(null);
    try {
      const res = await api.purchaseItem(emote.id);
      onCoinsUpdated(res.newBalance);
      currentUser.inventoryItemIds.push(emote.id);
      setMessage(`Purchased ${emote.name}! Equip it to your wheel below.`);
      loadEmotes();
    } catch (err: any) {
      setMessage(err.message || 'Purchase failed');
    } finally {
      setPurchasingId(null);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const handleAssignToSlot = (slotIndex: number, emoteId: string) => {
    const updated = [...equippedSlots];
    updated[slotIndex] = emoteId;
    setEquippedSlots(updated);
    onEquippedWheelUpdated(updated);
    setMessage(`Equipped to Wheel Slot ${slotIndex + 1}!`);
    setTimeout(() => setMessage(null), 2500);
  };

  const filteredEmotes = selectedCategory === 'all'
    ? emotes
    : emotes.filter(e => e.category === selectedCategory);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 select-none">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-950 via-neutral-900 to-pink-950 border border-neutral-800 p-6 md:p-8 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 text-xs font-black border border-pink-500/30">
              Fortnite-Style Emote System
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs font-semibold border border-purple-500/30">
              Universal Retargeted Animations
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            Emote & Dance Marketplace
          </h1>
          <p className="text-xs text-neutral-400 mt-1 max-w-xl">
            Preview dances and gestures on your 3D avatar with live audio beats, and customize your 6-slot radial wheel.
          </p>
        </div>

        <div className="bg-neutral-950/80 px-6 py-4 rounded-2xl border border-neutral-700 text-right">
          <div className="text-[11px] text-neutral-400 uppercase font-semibold">Your Coins</div>
          <div className="text-xl font-black text-yellow-400 flex items-center justify-end gap-1.5 mt-0.5">
            <Zap size={18} /> {currentUser.coins.toLocaleString()}
          </div>
        </div>
      </div>

      {message && (
        <div className="p-3 bg-purple-950/80 border border-purple-700 text-purple-200 text-xs rounded-2xl flex items-center gap-2">
          <Sparkles size={16} /> {message}
        </div>
      )}

      {/* Main Split Layout: 3D Preview (Left) vs Catalog & Wheel Slots (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 3D Live Emote Previewer */}
        <div className="lg:col-span-5 bg-neutral-900/60 border border-neutral-800 rounded-3xl overflow-hidden flex flex-col shadow-2xl">
          <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">{selectedEmote?.icon}</span>
              <div>
                <h3 className="font-extrabold text-white text-sm">{selectedEmote?.name}</h3>
                <span className={`text-[10px] font-bold uppercase ${RARITY_STYLING[selectedEmote?.rarity || 'common'].text}`}>
                  {selectedEmote?.rarity} • {selectedEmote?.category}
                </span>
              </div>
            </div>

            <button
              onClick={() => selectedEmote && playEmoteSoundEffect(selectedEmote.actionCode)}
              className="p-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl transition-colors"
              title="Replay Audio Beat"
            >
              <Volume2 size={16} className="text-cyan-400" />
            </button>
          </div>

          <div className="relative w-full h-80 bg-neutral-950">
            <div ref={previewMountRef} className="w-full h-full" />
            <div className="absolute bottom-3 left-3 text-[10px] text-neutral-400 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md">
              Live Retargeted SkinnedMesh Preview
            </div>
          </div>

          <div className="p-4 bg-neutral-950/50 space-y-3">
            <p className="text-xs text-neutral-300">{selectedEmote?.description}</p>
            {selectedEmote && (
              <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
                <div className="text-xs text-yellow-400 font-black flex items-center gap-1">
                  <Zap size={14} /> {selectedEmote.price === 0 ? 'FREE' : `${selectedEmote.price.toLocaleString()} COINS`}
                </div>

                {currentUser.inventoryItemIds.includes(selectedEmote.id) || selectedEmote.price === 0 ? (
                  <span className="px-3.5 py-1.5 rounded-xl bg-neutral-800 text-emerald-400 text-xs font-bold flex items-center gap-1">
                    <Check size={14} /> Owned in Locker
                  </span>
                ) : (
                  <button
                    onClick={() => handlePurchaseEmote(selectedEmote)}
                    disabled={purchasingId === selectedEmote.id || currentUser.coins < selectedEmote.price}
                    className="px-4 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all disabled:opacity-50"
                  >
                    {purchasingId === selectedEmote.id ? 'Processing...' : 'Unlock Emote'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Wheel Slots Loadout & Catalog */}
        <div className="lg:col-span-7 space-y-6">
          {/* 6-Slot Emote Wheel Loadout Manager */}
          <div className="p-5 bg-neutral-900/60 border border-neutral-800 rounded-3xl shadow-xl space-y-3">
            <h3 className="font-extrabold text-white text-xs uppercase tracking-wider flex items-center gap-2">
              <Star size={14} className="text-yellow-400" /> Equipped Emote Wheel Slots (1–6)
            </h3>
            <p className="text-[11px] text-neutral-400">Click any slot to equip the currently selected emote.</p>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
              {[0, 1, 2, 3, 4, 5].map((slotIdx) => {
                const assignedId = equippedSlots[slotIdx];
                const assignedEmote = emotes.find(e => e.id === assignedId);

                return (
                  <button
                    key={slotIdx}
                    onClick={() => selectedEmote && handleAssignToSlot(slotIdx, selectedEmote.id)}
                    className="p-2.5 rounded-2xl border border-neutral-800 hover:border-purple-500 bg-neutral-950 text-center flex flex-col items-center justify-between h-24 transition-all group"
                  >
                    <span className="text-[10px] font-bold text-neutral-500 uppercase">Slot {slotIdx + 1}</span>
                    <span className="text-xl group-hover:scale-110 transition-transform">
                      {assignedEmote?.icon || '➕'}
                    </span>
                    <span className="text-[10px] font-bold text-white truncate max-w-[65px]">
                      {assignedEmote?.name || 'Empty'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Emote Grid Catalog */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
                {['all', 'dances', 'celebrations', 'funny', 'reactions', 'greetings', 'victory'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-colors ${
                      selectedCategory === cat
                        ? 'bg-purple-600 text-white'
                        : 'bg-neutral-900 text-neutral-400 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 max-h-[380px] overflow-y-auto pr-1">
              {filteredEmotes.map(emote => {
                const isSelected = selectedEmote?.id === emote.id;
                const isOwned = currentUser.inventoryItemIds.includes(emote.id) || emote.price === 0;
                const rarity = RARITY_STYLING[emote.rarity] || RARITY_STYLING.common;

                return (
                  <div
                    key={emote.id}
                    onClick={() => setSelectedEmote(emote)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-purple-500 ring-2 ring-purple-500/50 bg-neutral-900'
                        : `${rarity.border} ${rarity.bg} hover:border-neutral-600`
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-2xl">{emote.icon}</span>
                      <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded ${rarity.badge}`}>
                        {emote.rarity}
                      </span>
                    </div>

                    <div className="mt-2">
                      <h4 className="font-bold text-white text-xs truncate">{emote.name}</h4>
                      <div className="text-[10px] text-neutral-400 capitalize">{emote.category}</div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-neutral-800/80 flex items-center justify-between text-xs">
                      <span className="font-bold text-yellow-400 flex items-center gap-0.5 text-[11px]">
                        <Zap size={11} /> {emote.price === 0 ? 'FREE' : emote.price}
                      </span>
                      {isOwned && (
                        <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-0.5">
                          <Check size={11} /> Owned
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
