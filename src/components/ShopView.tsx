/**
 * AetherVerse Virtual Marketplace & 3D Item Shop
 * Includes 3D item inspector, category filters, server-verified purchases, and inventory manager.
 */

import React, { useEffect, useState, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ShopItem, ShopCategory, UserProfile, MusicTrack, EmoteItem } from '../types/index';
import { api } from '../services/api';
import {
  Zap,
  ShoppingBag,
  Sparkles,
  Music,
  Eye,
  Check,
  Shield,
  Palette,
  AlertCircle
} from 'lucide-react';

interface ShopViewProps {
  currentUser: UserProfile;
  onCoinsUpdated: (newBalance: number) => void;
  onOpenAvatarStudio: () => void;
}

export const ShopView: React.FC<ShopViewProps> = ({
  currentUser,
  onCoinsUpdated,
  onOpenAvatarStudio
}) => {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [musicTracks, setMusicTracks] = useState<MusicTrack[]>([]);
  const [emotes, setEmotes] = useState<EmoteItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'shop' | 'inventory'>('shop');
  const [isLoading, setIsLoading] = useState(true);

  // 3D Model Inspector Modal State
  const [inspectingItem, setInspectingItem] = useState<ShopItem | null>(null);
  const inspectorMountRef = useRef<HTMLDivElement>(null);

  // Purchase Feedback
  const [purchaseMessage, setPurchaseMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [purchasingItemId, setPurchasingItemId] = useState<string | null>(null);

  useEffect(() => {
    loadShop();
  }, []);

  const loadShop = async () => {
    setIsLoading(true);
    try {
      const res = await api.getShopItems();
      setItems(res.items);
      setMusicTracks(res.musicTracks || []);
      setEmotes(res.emotes || []);
    } catch (err) {
      console.error('Failed to load shop items', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchase = async (item: ShopItem) => {
    setPurchasingItemId(item.id);
    setPurchaseMessage(null);
    try {
      const res = await api.purchaseItem(item.id);
      onCoinsUpdated(res.newBalance);
      currentUser.inventoryItemIds = res.inventory;
      setPurchaseMessage({ text: res.message, type: 'success' });
    } catch (err: any) {
      setPurchaseMessage({ text: err.message || 'Purchase failed', type: 'error' });
    } finally {
      setPurchasingItemId(null);
      setTimeout(() => setPurchaseMessage(null), 4000);
    }
  };

  const handleToggleEquip = async (itemId: string, isEquipped: boolean) => {
    try {
      const res = await api.equipItem(itemId, !isEquipped);
      currentUser.equippedItemIds = res.equippedItemIds;
      // Force re-render of inventory
      setItems([...items]);
    } catch (err: any) {
      alert(err.message || 'Failed to update equipment');
    }
  };

  // 3D Item Inspector Viewport effect
  useEffect(() => {
    if (!inspectingItem || !inspectorMountRef.current) return;
    const container = inspectorMountRef.current;

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

    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 50);
    camera.position.set(0, 1.2, 3.8);

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

    // Studio 3-point light
    scene.add(new THREE.HemisphereLight(0x7928ca, 0x070913, 1.5));
    const key = new THREE.DirectionalLight(0xffffff, 2);
    key.position.set(5, 10, 7);
    scene.add(key);

    // Build 3D Holographic Item Model Preview
    const itemGroup = new THREE.Group();

    if (inspectingItem.category === 'avatar') {
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.35, 1.6, 16),
        new THREE.MeshStandardMaterial({ color: 0x7928ca, metalness: 0.9, roughness: 0.2 })
      );
      body.position.y = 0.8;
      itemGroup.add(body);

      const helmet = new THREE.Mesh(
        new THREE.SphereGeometry(0.4, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0x00f3ff, emissive: 0x00f3ff, emissiveIntensity: 0.8, roughness: 0.1 })
      );
      helmet.position.y = 1.85;
      itemGroup.add(helmet);
    } else if (inspectingItem.category === 'accessories') {
      // Wings or Halo
      const torus = new THREE.Mesh(
        new THREE.TorusGeometry(0.8, 0.08, 16, 32),
        new THREE.MeshStandardMaterial({ color: 0xeab308, emissive: 0xeab308, emissiveIntensity: 1.5 })
      );
      torus.rotateX(Math.PI / 2);
      torus.position.y = 1.5;
      itemGroup.add(torus);
    } else {
      // High-tech Artifact Gem
      const gem = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.9, 0),
        new THREE.MeshStandardMaterial({ color: 0x00f3ff, emissive: 0x00f3ff, emissiveIntensity: 1.0, roughness: 0.2, wireframe: false })
      );
      gem.position.y = 1.0;
      itemGroup.add(gem);
    }

    // Pedestal
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.4, 0.2, 32),
      new THREE.MeshStandardMaterial({ color: 0x181a2f, metalness: 0.8 })
    );
    itemGroup.add(base);

    scene.add(itemGroup);

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
      itemGroup.rotation.y += dt * 0.75;
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
  }, [inspectingItem]);

  const filteredItems = selectedCategory === 'all'
    ? items
    : items.filter(i => i.category === selectedCategory);

  const ownedItems = items.filter(i => currentUser.inventoryItemIds.includes(i.id));

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Top Banner & Coins HUD */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-900/60 via-neutral-900 to-cyan-950/60 border border-neutral-800 p-6 md:p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs font-semibold border border-purple-500/30">
                Official Virtual Economy
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-semibold border border-cyan-500/30">
                3D Metaverse Assets
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              AetherVerse Marketplace
            </h1>
            <p className="text-sm text-neutral-400 mt-1 max-w-xl">
              Equip high-tier 3D avatars, cyber accessories, synchronized emotes, and spatial lobby music.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-neutral-950/80 backdrop-blur-md px-5 py-3 rounded-2xl border border-neutral-700/80 shadow-lg">
            <div>
              <div className="text-[11px] text-neutral-400 uppercase font-semibold">Your Balance</div>
              <div className="text-xl font-black text-yellow-400 flex items-center gap-1.5">
                <Zap size={18} /> {currentUser.coins.toLocaleString()} <span className="text-xs text-neutral-400 font-normal">COINS</span>
              </div>
            </div>
            <button
              onClick={onOpenAvatarStudio}
              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl transition-all shadow-md flex items-center gap-1.5"
            >
              <Sparkles size={14} /> Avatar Studio
            </button>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {purchaseMessage && (
        <div className={`p-4 rounded-2xl border flex items-center gap-3 text-sm font-medium transition-all ${
          purchaseMessage.type === 'success'
            ? 'bg-emerald-950/60 border-emerald-700 text-emerald-200'
            : 'bg-red-950/60 border-red-700 text-red-200'
        }`}>
          {purchaseMessage.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
          <span>{purchaseMessage.text}</span>
        </div>
      )}

      {/* Tabs: Shop vs Inventory */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('shop')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'shop'
                ? 'bg-white text-black shadow-lg'
                : 'bg-neutral-900 text-neutral-400 hover:text-white'
            }`}
          >
            <ShoppingBag size={15} /> Catalog ({items.length})
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'inventory'
                ? 'bg-white text-black shadow-lg'
                : 'bg-neutral-900 text-neutral-400 hover:text-white'
            }`}
          >
            <Shield size={15} /> My Inventory ({ownedItems.length})
          </button>
        </div>

        {activeTab === 'shop' && (
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
            {[
              { id: 'all', label: 'All' },
              { id: 'avatar', label: '3D Avatars' },
              { id: 'skin', label: 'Skins' },
              { id: 'clothing', label: 'Clothing' },
              { id: 'accessories', label: 'Accessories' },
              { id: 'emote', label: 'Emotes' },
              { id: 'music', label: 'Lobby Music' }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-neutral-900/60 text-neutral-400 hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Catalog Grid */}
      {activeTab === 'shop' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredItems.map(item => {
            const isOwned = currentUser.inventoryItemIds.includes(item.id);
            return (
              <div
                key={item.id}
                className="group relative bg-neutral-900/50 hover:bg-neutral-900 border border-neutral-800 hover:border-purple-500/50 rounded-2xl overflow-hidden transition-all duration-300 flex flex-col shadow-xl"
              >
                {/* Item Thumbnail */}
                <div className="relative aspect-square w-full bg-neutral-950 overflow-hidden">
                  <img
                    src={item.thumbnailUrl}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {item.isFeatured && (
                    <span className="absolute top-2.5 left-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-black text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider shadow-md">
                      Featured
                    </span>
                  )}
                  {item.isLimited && (
                    <span className="absolute top-2.5 right-2.5 bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-md">
                      Limited Edition
                    </span>
                  )}
                  {/* Quick 3D Inspect Button */}
                  <button
                    onClick={() => setInspectingItem(item)}
                    className="absolute bottom-2.5 right-2.5 bg-neutral-950/80 hover:bg-black text-white p-2 rounded-xl backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-xs font-medium"
                    title="Inspect in 3D"
                  >
                    <Eye size={14} className="text-cyan-400" />
                    <span>3D View</span>
                  </button>
                </div>

                {/* Details */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider">
                      {item.category.replace('_', ' ')}
                    </div>
                    <h3 className="font-bold text-white text-base mt-0.5 group-hover:text-cyan-300 transition-colors">
                      {item.name}
                    </h3>
                    <p className="text-xs text-neutral-400 mt-1 line-clamp-2">
                      {item.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between">
                    <div className="font-extrabold text-yellow-400 flex items-center gap-1 text-sm">
                      <Zap size={14} /> {item.price.toLocaleString()}
                    </div>

                    {isOwned ? (
                      <span className="px-3 py-1.5 rounded-xl bg-neutral-800 text-emerald-400 text-xs font-semibold flex items-center gap-1">
                        <Check size={13} /> Owned
                      </span>
                    ) : (
                      <button
                        onClick={() => handlePurchase(item)}
                        disabled={purchasingItemId === item.id || currentUser.coins < item.price}
                        className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white text-xs font-semibold rounded-xl transition-all shadow-md"
                      >
                        {purchasingItemId === item.id ? 'Processing...' : 'Buy Now'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Inventory Tab */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {ownedItems.length === 0 ? (
            <div className="col-span-full py-16 text-center text-neutral-500">
              <ShoppingBag size={36} className="mx-auto mb-2 opacity-40" />
              <div className="text-base font-semibold text-neutral-300">Your Inventory is Empty</div>
              <p className="text-xs text-neutral-500 mt-1">Explore the catalog to purchase 3D models and cosmetics.</p>
            </div>
          ) : (
            ownedItems.map(item => {
              const isEquipped = currentUser.equippedItemIds.includes(item.id);
              return (
                <div
                  key={item.id}
                  className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden p-4 flex flex-col justify-between"
                >
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-neutral-950 mb-3">
                    <img src={item.thumbnailUrl} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <span className="text-[10px] text-purple-400 font-bold uppercase">{item.category}</span>
                    <h4 className="font-bold text-white text-sm">{item.name}</h4>
                  </div>
                  <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between">
                    <button
                      onClick={() => setInspectingItem(item)}
                      className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                    >
                      <Eye size={12} /> Inspect 3D
                    </button>
                    <button
                      onClick={() => handleToggleEquip(item.id, isEquipped)}
                      className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                        isEquipped
                          ? 'bg-emerald-600 text-white'
                          : 'bg-neutral-800 text-neutral-300 hover:text-white'
                      }`}
                    >
                      {isEquipped ? 'Equipped ✓' : 'Equip Item'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 3D Model Inspector Modal */}
      {inspectingItem && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative bg-neutral-950 border border-neutral-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-cyan-400 uppercase font-bold tracking-wider">
                  Interactive 3D Inspector
                </span>
                <h3 className="font-extrabold text-white text-lg">{inspectingItem.name}</h3>
              </div>
              <button
                onClick={() => setInspectingItem(null)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg bg-neutral-900"
              >
                ✕
              </button>
            </div>

            {/* 3D Canvas Box */}
            <div className="relative w-full h-80 bg-neutral-900">
              <div ref={inspectorMountRef} className="w-full h-full" />
              <div className="absolute bottom-2.5 left-3 text-[10px] text-neutral-400 bg-black/60 px-2 py-0.5 rounded-md">
                Continuous 360° Studio Orbit
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 flex items-center justify-between border-t border-neutral-800">
              <div>
                <div className="text-xs text-neutral-400">Price</div>
                <div className="text-lg font-black text-yellow-400 flex items-center gap-1">
                  <Zap size={16} /> {inspectingItem.price.toLocaleString()} COINS
                </div>
              </div>

              {currentUser.inventoryItemIds.includes(inspectingItem.id) ? (
                <span className="px-4 py-2 rounded-xl bg-neutral-800 text-emerald-400 text-xs font-semibold flex items-center gap-1">
                  <Check size={14} /> Item In Inventory
                </span>
              ) : (
                <button
                  onClick={() => {
                    handlePurchase(inspectingItem);
                    setInspectingItem(null);
                  }}
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-semibold text-xs rounded-xl shadow-lg transition-all"
                >
                  Purchase Now
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
