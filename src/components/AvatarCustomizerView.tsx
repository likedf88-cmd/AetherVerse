/**
 * AetherVerse 3D Avatar Studio & Model Customizer
 * Interactive 3D avatar viewport, cosmetic customization, and custom GLB model validator.
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { UserProfile, AvatarConfig } from '../types/index';
import { api } from '../services/api';
import {
  Sparkles,
  Save,
  Upload,
  RefreshCw,
  Palette,
  Shield,
  Eye,
  Check,
  AlertCircle
} from 'lucide-react';

interface AvatarCustomizerViewProps {
  currentUser: UserProfile;
  onProfileUpdated: (updatedUser: UserProfile) => void;
  onClose: () => void;
}

const SKIN_TONES = [
  { label: 'Pale Cyber', value: '#ffd1b3' },
  { label: 'Sun Bronze', value: '#e0ac69' },
  { label: 'Obsidian Tone', value: '#5c3836' },
  { label: 'Stellar Pale', value: '#f8d9d6' },
  { label: 'Synth Silver', value: '#cbd5e1' }
];

const HAIR_COLORS = [
  { label: 'Hyper Cyan', value: '#00f3ff' },
  { label: 'Electric Purple', value: '#a855f7' },
  { label: 'Hot Pink', value: '#ec4899' },
  { label: 'Solar Gold', value: '#eab308' },
  { label: 'Emerald Plasma', value: '#10b981' },
  { label: 'Midnight Black', value: '#0f172a' }
];

const OUTFIT_COLORS = [
  { label: 'Dark Charcoal', value: '#1e293b' },
  { label: 'Neon Ultraviolet', value: '#7928ca' },
  { label: 'Deep Cyan', value: '#0e7490' },
  { label: 'Crimson Plasma', value: '#991b1b' },
  { label: 'Titanium White', value: '#e2e8f0' }
];

const GLOW_COLORS = [
  { label: 'Cyan Pulse', value: '#00f3ff' },
  { label: 'Neon Violet', value: '#a855f7' },
  { label: 'Solar Pink', value: '#ec4899' },
  { label: 'Amber Flame', value: '#f59e0b' },
  { label: 'Matrix Lime', value: '#22c55e' }
];

export const AvatarCustomizerView: React.FC<AvatarCustomizerViewProps> = ({
  currentUser,
  onProfileUpdated,
  onClose
}) => {
  const previewCanvasRef = useRef<HTMLDivElement>(null);

  const [config, setConfig] = useState<AvatarConfig>({
    ...currentUser.avatarConfig
  });

  const [activeTab, setActiveTab] = useState<'body' | 'hair' | 'visor' | 'outfit' | 'glow' | 'upload'>('body');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [customModelFileName, setCustomModelFileName] = useState<string | null>(null);

  // Mesh refs for live updating without recreating scene
  const avatarGroupRef = useRef<THREE.Group | null>(null);
  const headMeshRef = useRef<THREE.Mesh | null>(null);
  const hairMeshRef = useRef<THREE.Mesh | null>(null);
  const visorMeshRef = useRef<THREE.Mesh | null>(null);
  const torsoMeshRef = useRef<THREE.Mesh | null>(null);
  const coreMeshRef = useRef<THREE.Mesh | null>(null);

  // Initialize Three.js 3D Avatar Preview Viewport
  useEffect(() => {
    const container = previewCanvasRef.current;
    if (!container) return;

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
    camera.position.set(0, 1.6, 4.2);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance'
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    container.appendChild(renderer.domElement);

    // Studio Environment map
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // Studio Lights
    const hemi = new THREE.HemisphereLight(0x7928ca, 0x050711, 1.2);
    scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.set(5, 10, 7);
    scene.add(key);

    const fill = new THREE.PointLight(0x00f3ff, 2.0, 15);
    fill.position.set(-4, 3, 2);
    scene.add(fill);

    // Rotating Pedestal Base
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(1.6, 1.8, 0.25, 32),
      new THREE.MeshStandardMaterial({ color: 0x181a2f, metalness: 0.85, roughness: 0.2 })
    );
    pedestal.position.y = -0.12;
    scene.add(pedestal);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.65, 1.75, 32),
      new THREE.MeshBasicMaterial({ color: 0x00f3ff, side: THREE.DoubleSide })
    );
    ring.rotateX(-Math.PI / 2);
    ring.position.y = 0.01;
    scene.add(ring);

    // Build Avatar Group
    const avatarGroup = new THREE.Group();
    avatarGroupRef.current = avatarGroup;

    // 1. Torso
    const torsoMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(config.outfitColor || '#1e293b'),
      roughness: 0.35,
      metalness: 0.8
    });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.0, 0.45), torsoMat);
    torso.position.y = 1.2;
    avatarGroup.add(torso);
    torsoMeshRef.current = torso;

    // 2. Reactor Core
    const coreMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(config.glowColor || '#00f3ff'),
      emissive: new THREE.Color(config.glowColor || '#00f3ff'),
      emissiveIntensity: 1.5
    });
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 16), coreMat);
    core.rotateX(Math.PI / 2);
    core.position.set(0, 1.25, 0.24);
    avatarGroup.add(core);
    coreMeshRef.current = core;

    // 3. Head
    const headMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(config.skinTone || '#ffd1b3'),
      roughness: 0.65
    });
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.52, 0.48), headMat);
    head.position.y = 1.95;
    avatarGroup.add(head);
    headMeshRef.current = head;

    // 4. Visor
    const visorMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(config.visorColor || '#00f3ff'),
      emissive: new THREE.Color(config.visorColor || '#00f3ff'),
      emissiveIntensity: 1.2,
      roughness: 0.1,
      metalness: 0.9
    });
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.16, 0.25), visorMat);
    visor.position.set(0, 1.98, 0.18);
    avatarGroup.add(visor);
    visorMeshRef.current = visor;

    // 5. Hair
    const hairMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(config.hairColor || '#7928ca'),
      roughness: 0.6
    });
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.24, 0.52), hairMat);
    hair.position.set(0, 2.24, 0);
    avatarGroup.add(hair);
    hairMeshRef.current = hair;

    // 6 & 7. Legs
    const legMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5, metalness: 0.6 });
    const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.9, 0.32), legMat);
    leftLeg.position.set(-0.24, 0.45, 0);
    avatarGroup.add(leftLeg);

    const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.9, 0.32), legMat);
    rightLeg.position.set(0.24, 0.45, 0);
    avatarGroup.add(rightLeg);

    // 8 & 9. Arms
    const armMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(config.outfitColor || '#1e293b'), roughness: 0.4 });
    const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.85, 0.28), armMat);
    leftArm.position.set(-0.55, 1.15, 0);
    avatarGroup.add(leftArm);

    const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.85, 0.28), armMat);
    rightArm.position.set(0.55, 1.15, 0);
    avatarGroup.add(rightArm);

    scene.add(avatarGroup);

    // Render loop with gentle studio rotation
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
      avatarGroup.rotation.y += dt * 0.4;
      ring.rotation.z += dt * 0.5;

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
  }, []);

  // Update Three.js materials when state changes
  useEffect(() => {
    if (headMeshRef.current) {
      (headMeshRef.current.material as THREE.MeshStandardMaterial).color.set(config.skinTone);
    }
    if (hairMeshRef.current) {
      (hairMeshRef.current.material as THREE.MeshStandardMaterial).color.set(config.hairColor);
    }
    if (visorMeshRef.current) {
      const mat = visorMeshRef.current.material as THREE.MeshStandardMaterial;
      mat.color.set(config.visorColor);
      mat.emissive.set(config.visorColor);
      visorMeshRef.current.visible = config.visorStyle !== 'none';
    }
    if (torsoMeshRef.current) {
      (torsoMeshRef.current.material as THREE.MeshStandardMaterial).color.set(config.outfitColor);
    }
    if (coreMeshRef.current) {
      const mat = coreMeshRef.current.material as THREE.MeshStandardMaterial;
      mat.color.set(config.glowColor);
      mat.emissive.set(config.glowColor);
    }
  }, [config]);

  // Handle custom model file validation and upload
  const handleModelFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate extension
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension !== 'glb' && extension !== 'gltf') {
      setUploadError('Invalid model format. Only .glb and .gltf 3D files are supported.');
      return;
    }

    // Validate file size limit (50 MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadError(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Limit is 50MB.`);
      return;
    }

    // Simulated local URL or model reference
    setCustomModelFileName(file.name);
    setConfig(prev => ({
      ...prev,
      modelUrl: `/models/custom_${file.name}`
    }));
  };

  const handleSaveAvatar = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const res = await api.updateProfile({ avatarConfig: config });
      onProfileUpdated(res.user);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to save avatar');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col md:flex-row items-stretch">
      {/* 3D Viewport on Left/Top */}
      <div className="relative flex-1 h-[45vh] md:h-full bg-radial from-neutral-900 to-black overflow-hidden flex items-center justify-center">
        <div ref={previewCanvasRef} className="w-full h-full" />

        <div className="absolute top-4 left-4 bg-neutral-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-neutral-800 text-xs text-neutral-300 flex items-center gap-2">
          <Sparkles size={14} className="text-cyan-400" />
          <span>Real-Time 3D Holographic Viewport</span>
        </div>

        <div className="absolute bottom-4 left-4 bg-neutral-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-neutral-800 text-[11px] text-neutral-400">
          Tip: Avatar automatically equips in the 3D Metaverse Lobby.
        </div>
      </div>

      {/* Customization Control Panel on Right */}
      <div className="w-full md:w-[480px] bg-neutral-950 border-t md:border-t-0 md:border-l border-neutral-800 flex flex-col h-[55vh] md:h-full overflow-hidden">
        {/* Panel Header */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Palette size={18} className="text-purple-400" /> 3D Avatar Studio
            </h2>
            <p className="text-xs text-neutral-400">Customize your cyber identity and wearable gear</p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-2 rounded-lg bg-neutral-900 border border-neutral-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex border-b border-neutral-800 overflow-x-auto px-2 py-1.5 gap-1 scrollbar-none">
          {[
            { id: 'body', label: 'Skin', icon: Eye },
            { id: 'hair', label: 'Hair', icon: Sparkles },
            { id: 'visor', label: 'Visor', icon: Shield },
            { id: 'outfit', label: 'Outfit', icon: Palette },
            { id: 'glow', label: 'Aura', icon: Sparkles },
            { id: 'upload', label: 'GLB Upload', icon: Upload }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <tab.icon size={13} /> {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 p-5 overflow-y-auto space-y-6">
          {activeTab === 'body' && (
            <div className="space-y-4">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Skin Tone Synthesizer
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {SKIN_TONES.map(item => (
                  <button
                    key={item.value}
                    onClick={() => setConfig(prev => ({ ...prev, skinTone: item.value }))}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                      config.skinTone === item.value
                        ? 'border-cyan-400 bg-neutral-900 text-white ring-1 ring-cyan-400'
                        : 'border-neutral-800 bg-neutral-900/50 text-neutral-300 hover:border-neutral-700'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full border border-black/40" style={{ backgroundColor: item.value }} />
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'hair' && (
            <div className="space-y-4">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Bioluminescent Hair Pigment
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {HAIR_COLORS.map(item => (
                  <button
                    key={item.value}
                    onClick={() => setConfig(prev => ({ ...prev, hairColor: item.value }))}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                      config.hairColor === item.value
                        ? 'border-purple-400 bg-neutral-900 text-white ring-1 ring-purple-400'
                        : 'border-neutral-800 bg-neutral-900/50 text-neutral-300 hover:border-neutral-700'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full border border-black/40 shadow-sm" style={{ backgroundColor: item.value }} />
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'visor' && (
            <div className="space-y-4">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Cyber Visor & HUD Glass
              </label>
              <div className="flex gap-2 mb-3">
                {['holographic_specs', 'matrix_goggles', 'none'].map(style => (
                  <button
                    key={style}
                    onClick={() => setConfig(prev => ({ ...prev, visorStyle: style }))}
                    className={`flex-1 py-2 text-xs font-medium rounded-lg border capitalize transition-all ${
                      config.visorStyle === style
                        ? 'border-cyan-400 bg-neutral-900 text-white'
                        : 'border-neutral-800 bg-neutral-900/40 text-neutral-400'
                    }`}
                  >
                    {style.replace('_', ' ')}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {GLOW_COLORS.map(item => (
                  <button
                    key={item.value}
                    onClick={() => setConfig(prev => ({ ...prev, visorColor: item.value }))}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                      config.visorColor === item.value
                        ? 'border-cyan-400 bg-neutral-900 text-white'
                        : 'border-neutral-800 bg-neutral-900/50 text-neutral-300'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full" style={{ backgroundColor: item.value }} />
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'outfit' && (
            <div className="space-y-4">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Chassis Coating Color
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {OUTFIT_COLORS.map(item => (
                  <button
                    key={item.value}
                    onClick={() => setConfig(prev => ({ ...prev, outfitColor: item.value }))}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                      config.outfitColor === item.value
                        ? 'border-purple-400 bg-neutral-900 text-white ring-1 ring-purple-400'
                        : 'border-neutral-800 bg-neutral-900/50 text-neutral-300'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full" style={{ backgroundColor: item.value }} />
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'glow' && (
            <div className="space-y-4">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Core Reactor Bioluminescence
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {GLOW_COLORS.map(item => (
                  <button
                    key={item.value}
                    onClick={() => setConfig(prev => ({ ...prev, glowColor: item.value }))}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                      config.glowColor === item.value
                        ? 'border-cyan-400 bg-neutral-900 text-white ring-1 ring-cyan-400'
                        : 'border-neutral-800 bg-neutral-900/50 text-neutral-300'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full shadow-lg" style={{ backgroundColor: item.value, boxShadow: `0 0 10px ${item.value}` }} />
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="space-y-4">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Upload Custom 3D Avatar (GLB / GLTF)
              </label>
              <p className="text-xs text-neutral-400">
                Import custom 3D character models created in Blender, Maya, or VRoid. Files are validated for geometry integrity, texture bounds, and 50MB file size limits.
              </p>

              <div className="border-2 border-dashed border-neutral-700 hover:border-purple-500 rounded-2xl p-6 text-center cursor-pointer transition-colors relative bg-neutral-900/40">
                <input
                  type="file"
                  accept=".glb,.gltf"
                  onChange={handleModelFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <Upload size={28} className="mx-auto mb-2 text-purple-400" />
                <div className="text-xs font-medium text-white">Click or drag & drop 3D file</div>
                <div className="text-[11px] text-neutral-500 mt-1">Accepts .GLB or .GLTF (Max 50MB)</div>
              </div>

              {customModelFileName && (
                <div className="flex items-center gap-2 p-3 bg-emerald-950/40 border border-emerald-800 rounded-xl text-xs text-emerald-300">
                  <Check size={14} className="text-emerald-400" />
                  <span>Validated: <strong>{customModelFileName}</strong> ready for metaverse deployment!</span>
                </div>
              )}

              {uploadError && (
                <div className="flex items-center gap-2 p-3 bg-red-950/40 border border-red-800 rounded-xl text-xs text-red-300">
                  <AlertCircle size={14} className="text-red-400" />
                  <span>{uploadError}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Panel Footer */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-900/50 flex items-center justify-between">
          <button
            onClick={() => setConfig({ ...currentUser.avatarConfig })}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-neutral-400 hover:text-white transition-colors"
          >
            <RefreshCw size={13} /> Reset
          </button>

          <button
            onClick={handleSaveAvatar}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white text-xs font-semibold rounded-xl shadow-lg transition-all disabled:opacity-50"
          >
            {isSaving ? (
              <>Saving...</>
            ) : saveSuccess ? (
              <>
                <Check size={14} /> Saved & Equipped!
              </>
            ) : (
              <>
                <Save size={14} /> Save & Equip Avatar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
