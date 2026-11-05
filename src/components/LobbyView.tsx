/**
 * AetherVerse 3D Metaverse Lobby
 * High-fidelity humanoid SkinnedMesh avatars, Fortnite-style radial emote wheel,
 * real-time multiplayer animation synchronization, proximity spatial audio, and dance floor.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { UserProfile, LobbyPlayer, LobbyRoom, EmoteItem, MusicTrack } from '../types/index';
import { clampToLobbyBounds, DEFAULT_LOBBY_BOUNDS } from '../utils/lobbyMath';
import { buildHighFidelityHumanoidAvatar, playEmoteSoundEffect, HumanoidRig } from '../utils/avatar3dEngine';
import { EmoteWheelModal } from './EmoteWheelModal';
import {
  Volume2,
  VolumeX,
  Send,
  Sparkles,
  Users,
  Compass,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Music,
  Zap,
  Disc3,
  Layers
} from 'lucide-react';

interface LobbyViewProps {
  currentUser: UserProfile;
  onOpenAvatarStudio: () => void;
  onOpenShop: () => void;
  onOpenEmoteShop: () => void;
}

// Scratch math helpers outside render loop (Zero GC)
const _playerDir = new THREE.Vector3();
const _camOffset = new THREE.Vector3(0, 4.2, 7.8);
const _camLook = new THREE.Vector3();

const DEFAULT_EMOTES_PACK: EmoteItem[] = [
  { id: 'emote_dance', name: 'Electro Shuffle', description: 'Energetic cyber shuffle dance', icon: '💃', actionCode: 'dance_electro', category: 'dances', rarity: 'epic', price: 500, isUnlocked: true, isLooping: true, durationSeconds: 6 },
  { id: 'emote_wave', name: 'Friendly Wave', description: 'Polite greeting to nearby players', icon: '👋', actionCode: 'wave', category: 'greetings', rarity: 'common', price: 0, isUnlocked: true, isLooping: false, durationSeconds: 2 },
  { id: 'emote_backflip', name: 'Zero-G Backflip', description: 'Gravity-defying acrobatic backflip', icon: '🤸', actionCode: 'backflip', category: 'victory', rarity: 'legendary', price: 900, isUnlocked: true, isLooping: false, durationSeconds: 3 },
  { id: 'emote_cheer', name: 'Victory Cheer', description: 'Triumphant celebratory fist pump', icon: '🎉', actionCode: 'cheer', category: 'celebrations', rarity: 'rare', price: 300, isUnlocked: true, isLooping: false, durationSeconds: 3 }
];

export const LobbyView: React.FC<LobbyViewProps> = ({
  currentUser,
  onOpenAvatarStudio,
  onOpenShop,
  onOpenEmoteShop
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // UI state
  const [activeRoomId, setActiveRoomId] = useState<string>('room_cyber_plaza');
  const [isMuted, setIsMuted] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isHudCollapsed, setIsHudCollapsed] = useState(false);
  const [activeEmote, setActiveEmote] = useState<string | null>(null);
  const [showEmoteWheel, setShowEmoteWheel] = useState(false);
  const [playerCount, setPlayerCount] = useState(1);
  const [chatLog, setChatLog] = useState<{ id: string; user: string; text: string }[]>([]);

  // Synchronized partner dance prompt
  const [nearbyDancerPrompt, setNearbyDancerPrompt] = useState<{
    id: string;
    username: string;
    emoteCode: string;
  } | null>(null);

  // Remote player rigs map: userId -> HumanoidRig
  const remoteRigsRef = useRef<Map<string, HumanoidRig>>(new Map());

  // Local player rig ref
  const localRigRef = useRef<HumanoidRig | null>(null);

  // Local player state in ref to avoid React state re-renders in 60Hz tick
  const localPlayerStateRef = useRef<{
    position: THREE.Vector3;
    rotationY: number;
    velocity: THREE.Vector3;
    isMoving: boolean;
    isRunning: boolean;
    isJumping: boolean;
    currentEmote: string | null;
  }>({
    position: new THREE.Vector3(0, 0, 8),
    rotationY: 0,
    velocity: new THREE.Vector3(),
    isMoving: false,
    isRunning: false,
    isJumping: false,
    currentEmote: null
  });

  const keysRef = useRef<{ [key: string]: boolean }>({});

  // Initialize Three.js scene and loop
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Detect software WebGL as per guidelines
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
    scene.background = new THREE.Color('#070913');
    scene.fog = new THREE.FogExp2('#070913', 0.022);

    const camera = new THREE.PerspectiveCamera(
      52,
      container.clientWidth / container.clientHeight,
      0.1,
      250
    );
    camera.position.set(0, 4.2, 9);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      stencil: false,
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // Studio Environment (RoomEnvironment + PMREM)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Studio & Aesthetic Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0x7928ca, 0x050711, 0.9);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0x00f3ff, 1.4);
    keyLight.position.set(15, 25, 12);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 60;
      keyLight.shadow.camera.left = -25;
      keyLight.shadow.camera.right = 25;
      keyLight.shadow.camera.top = 25;
      keyLight.shadow.camera.bottom = -25;
      keyLight.shadow.bias = -0.0005;
    }
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0xa855f7, 2, 40);
    rimLight.position.set(-10, 8, -10);
    scene.add(rimLight);

    // ==========================================
    // 3D LOBBY ENVIRONMENT GEOMETRY
    // ==========================================

    // 1. Main Plaza Floor with Cyber Grid
    const floorGeo = new THREE.PlaneGeometry(90, 90, 32, 32);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0b0e1e,
      roughness: 0.25,
      metalness: 0.85
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.receiveShadow = !isSoftwareGl;
    scene.add(floor);

    // Grid Floor Overlay
    const gridHelper = new THREE.GridHelper(90, 45, 0xa855f7, 0x1e293b);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    // 2. Central Holographic Crystal Spire
    const crystalGeo = new THREE.OctahedronGeometry(2.5, 0);
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0x00f3ff,
      emissive: 0x00f3ff,
      emissiveIntensity: 1.2,
      roughness: 0.1,
      metalness: 0.9,
      wireframe: true
    });
    const crystalSpire = new THREE.Mesh(crystalGeo, crystalMat);
    crystalSpire.position.set(0, 4.5, 0);
    scene.add(crystalSpire);

    // Crystal Podium Base
    const podiumGeo = new THREE.CylinderGeometry(4.5, 5.5, 0.6, 32);
    const podiumMat = new THREE.MeshStandardMaterial({
      color: 0x181a2f,
      metalness: 0.9,
      roughness: 0.3
    });
    const podium = new THREE.Mesh(podiumGeo, podiumMat);
    podium.position.y = 0.3;
    scene.add(podium);

    // 3. Neon Dance Floor (Interactive Disco Pad)
    const danceFloorGroup = new THREE.Group();
    danceFloorGroup.position.set(-15, 0.02, -15);
    const danceTiles: THREE.Mesh[] = [];
    for (let x = 0; x < 6; x++) {
      for (let z = 0; z < 6; z++) {
        const tileGeo = new THREE.BoxGeometry(1.4, 0.08, 1.4);
        const tileMat = new THREE.MeshStandardMaterial({
          color: ((x + z) % 2 === 0) ? 0x7928ca : 0x00f3ff,
          emissive: ((x + z) % 2 === 0) ? 0x7928ca : 0x00f3ff,
          emissiveIntensity: 0.4,
          roughness: 0.2
        });
        const tile = new THREE.Mesh(tileGeo, tileMat);
        tile.position.set((x - 2.5) * 1.55, 0.04, (z - 2.5) * 1.55);
        danceFloorGroup.add(tile);
        danceTiles.push(tile);
      }
    }
    scene.add(danceFloorGroup);

    // 4. DJ Music Lounge Zone (Stage & Speakers)
    const djStage = new THREE.Mesh(
      new THREE.BoxGeometry(10, 0.8, 6),
      new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.8, roughness: 0.4 })
    );
    djStage.position.set(16, 0.4, -18);
    scene.add(djStage);

    // DJ Speakers
    const speakerGeo = new THREE.BoxGeometry(1.2, 3.5, 1.2);
    const speakerMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.5 });
    const spkLeft = new THREE.Mesh(speakerGeo, speakerMat);
    spkLeft.position.set(12, 2.1, -18);
    const spkRight = new THREE.Mesh(speakerGeo, speakerMat);
    spkRight.position.set(20, 2.1, -18);
    scene.add(spkLeft);
    scene.add(spkRight);

    // 5. Teleportation Portal Arches
    const portalGeo = new THREE.TorusGeometry(3.0, 0.22, 16, 32);
    const portalMat = new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      emissive: 0xa855f7,
      emissiveIntensity: 1.5,
      metalness: 0.9,
      roughness: 0.1
    });
    const portal1 = new THREE.Mesh(portalGeo, portalMat);
    portal1.position.set(0, 3.2, -35);
    scene.add(portal1);

    // ==========================================
    // SPAWN HIGH-FIDELITY HUMANOD SKINNED AVATAR
    // ==========================================
    const localRig = buildHighFidelityHumanoidAvatar(currentUser.avatarConfig);
    scene.add(localRig.rootGroup);
    localRigRef.current = localRig;
    localRig.rootGroup.position.copy(localPlayerStateRef.current.position);

    // Keyboard handlers
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysRef.current[key] = true;

      // Toggle Emote Wheel with key 'b' or 'e'
      if (key === 'b') {
        setShowEmoteWheel(prev => !prev);
      }

      // Synchronize partner dance with key 'g'
      if (key === 'g' && nearbyDancerPrompt) {
        triggerEmote(nearbyDancerPrompt.emoteCode);
        setNearbyDancerPrompt(null);
      }

      if (e.code === 'Space' && !localPlayerStateRef.current.isJumping) {
        localPlayerStateRef.current.isJumping = true;
        localPlayerStateRef.current.velocity.y = 7.5;
        localRig.playAnimation('jump', 0.15, false);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Window resize
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // ==========================================
    // WEBSOCKET MULTIPLAYER SYNCHRONIZATION
    // ==========================================
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      socket.send(JSON.stringify({
        type: 'join_lobby',
        userId: currentUser.id,
        roomId: activeRoomId
      }));
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === 'lobby_sync_init') {
          // Sync other players
          msg.players.forEach((p: LobbyPlayer) => {
            if (p.id !== currentUser.id && !remoteRigsRef.current.has(p.id)) {
              const remoteRig = buildHighFidelityHumanoidAvatar(p.avatarConfig);
              remoteRig.rootGroup.position.set(p.position.x, p.position.y, p.position.z);
              scene.add(remoteRig.rootGroup);
              remoteRigsRef.current.set(p.id, remoteRig);
            }
          });
          setPlayerCount(remoteRigsRef.current.size + 1);
        }

        if (msg.type === 'player_joined') {
          const p = msg.player;
          if (p.id !== currentUser.id && !remoteRigsRef.current.has(p.id)) {
            const remoteRig = buildHighFidelityHumanoidAvatar(p.avatarConfig);
            remoteRig.rootGroup.position.set(p.position.x, p.position.y, p.position.z);
            scene.add(remoteRig.rootGroup);
            remoteRigsRef.current.set(p.id, remoteRig);
            setPlayerCount(remoteRigsRef.current.size + 1);
          }
        }

        if (msg.type === 'player_moved') {
          const remoteRig = remoteRigsRef.current.get(msg.id);
          if (remoteRig) {
            remoteRig.rootGroup.position.set(msg.position.x, msg.position.y, msg.position.z);
            remoteRig.rootGroup.rotation.y = msg.rotationY || 0;

            if (msg.isMoving) {
              remoteRig.playAnimation(msg.isRunning ? 'running' : 'walking', 0.2);
            } else if (!msg.isJumping) {
              remoteRig.playAnimation('idle', 0.2);
            }
          }
        }

        if (msg.type === 'player_emoted') {
          const remoteRig = remoteRigsRef.current.get(msg.id);
          if (remoteRig) {
            remoteRig.playAnimation(msg.emoteCode || 'dance_electro', 0.2, true);
            playEmoteSoundEffect(msg.emoteCode);

            // If nearby, offer synchronized dance prompt
            const dist = remoteRig.rootGroup.position.distanceTo(localPlayerStateRef.current.position);
            if (dist < 5.0) {
              setNearbyDancerPrompt({
                id: msg.id,
                username: 'Nearby Player',
                emoteCode: msg.emoteCode
              });
              setTimeout(() => setNearbyDancerPrompt(null), 8000);
            }
          }
        }

        if (msg.type === 'player_left') {
          const remoteRig = remoteRigsRef.current.get(msg.id);
          if (remoteRig) {
            scene.remove(remoteRig.rootGroup);
            remoteRigsRef.current.delete(msg.id);
            setPlayerCount(remoteRigsRef.current.size + 1);
          }
        }

        if (msg.type === 'player_chatted') {
          setChatLog(prev => [...prev.slice(-12), { id: String(Date.now()), user: msg.username, text: msg.text }]);
        }
      } catch (err) {
        // Ignore JSON parse errors
      }
    };

    // ==========================================
    // MAIN TICK ANIMATION LOOP
    // ==========================================
    let frameId = 0;
    let netSyncTimer = 0;
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
      const elapsed = now / 1000;

      // Animate Environment
      crystalSpire.rotation.y = elapsed * 0.4;
      crystalSpire.position.y = 4.5 + Math.sin(elapsed * 1.5) * 0.35;
      portal1.rotation.z = elapsed * 0.25;

      danceTiles.forEach((tile, idx) => {
        const intensity = 0.3 + 0.5 * Math.sin(elapsed * 4 + idx * 0.4);
        (tile.material as THREE.MeshStandardMaterial).emissiveIntensity = intensity;
      });

      // Advance Humanoid AnimationMixer for local & remote avatars
      localRig.mixer.update(dt);
      remoteRigsRef.current.forEach(r => r.mixer.update(dt));

      // --- Local Player Movement ---
      const player = localPlayerStateRef.current;
      const keys = keysRef.current;

      _playerDir.set(0, 0, 0);
      let moving = false;

      if (keys['w'] || keys['arrowup']) {
        _playerDir.z -= 1;
        moving = true;
      }
      if (keys['s'] || keys['arrowdown']) {
        _playerDir.z += 1;
        moving = true;
      }
      if (keys['a'] || keys['arrowleft']) {
        _playerDir.x -= 1;
        moving = true;
      }
      if (keys['d'] || keys['arrowright']) {
        _playerDir.x += 1;
        moving = true;
      }

      const isRunning = Boolean(keys['shift']);
      const speed = isRunning ? 9.2 : 5.0;

      // Movement automatically cancels active emote and crossFades into locomotion
      if (moving) {
        if (player.currentEmote) {
          player.currentEmote = null;
          setActiveEmote(null);
        }

        _playerDir.normalize();
        player.position.x += _playerDir.x * speed * dt;
        player.position.z += _playerDir.z * speed * dt;

        const targetAngle = Math.atan2(_playerDir.x, _playerDir.z);
        player.rotationY = THREE.MathUtils.damp(player.rotationY, targetAngle, 12, dt);

        if (!player.isJumping) {
          localRig.playAnimation(isRunning ? 'running' : 'walking', 0.2);
        }
      } else {
        if (!player.currentEmote && !player.isJumping) {
          localRig.playAnimation('idle', 0.25);
        }
      }

      // Jump Physics
      if (player.isJumping) {
        player.position.y += player.velocity.y * dt;
        player.velocity.y -= 19.8 * dt; // Gravity
        if (player.position.y <= 0) {
          player.position.y = 0;
          player.velocity.y = 0;
          player.isJumping = false;
          localRig.playAnimation(moving ? 'walking' : 'idle', 0.15);
        }
      }

      // Clamping to Arena bounds
      const clamped = clampToLobbyBounds(player.position);
      player.position.x = clamped.x;
      player.position.z = clamped.z;

      localRig.rootGroup.position.copy(player.position);
      localRig.rootGroup.rotation.y = player.rotationY;

      // Camera Follow with frame-rate independent exponential damping
      _camOffset.set(0, 3.8, 7.5);
      _camOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotationY);
      const targetCamPos = player.position.clone().add(_camOffset);

      camera.position.x = THREE.MathUtils.damp(camera.position.x, targetCamPos.x, 6, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, targetCamPos.y, 6, dt);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, targetCamPos.z, 6, dt);

      _camLook.set(player.position.x, player.position.y + 1.5, player.position.z);
      camera.lookAt(_camLook);

      // WebSocket Position Sync (10Hz)
      netSyncTimer += dt;
      if (netSyncTimer > 0.08) {
        netSyncTimer = 0;
        if (socket.readyState === WebSocket.OPEN && moving) {
          socket.send(JSON.stringify({
            type: 'player_move',
            position: { x: player.position.x, y: player.position.y, z: player.position.z },
            rotationY: player.rotationY,
            isMoving: moving,
            isRunning,
            isJumping: player.isJumping
          }));
        }
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', handleResize);
      if (isSoftwareGl) clearTimeout(frameId);
      else cancelAnimationFrame(frameId);
      socket.close();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [currentUser, activeRoomId]);

  const triggerEmote = (emoteCode: string) => {
    setActiveEmote(emoteCode);
    localPlayerStateRef.current.currentEmote = emoteCode;

    if (localRigRef.current) {
      localRigRef.current.playAnimation(emoteCode, 0.25, true);
      playEmoteSoundEffect(emoteCode);
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'player_emote',
        emoteCode
      }));
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const text = chatInput.trim();
    setChatLog(prev => [...prev.slice(-12), { id: String(Date.now()), user: currentUser.username, text }]);
    setChatInput('');

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'lobby_chat',
        text
      }));
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-64px)] md:h-screen bg-black overflow-hidden select-none">
      {/* 3D Canvas Isolated Ref Container */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Floating Header HUD */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3 bg-neutral-900/85 backdrop-blur-md px-4 py-2 rounded-xl border border-neutral-800 pointer-events-auto shadow-xl">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-white font-semibold text-sm">Aether Central Plaza</span>
          <span className="text-xs text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded-md flex items-center gap-1">
            <Users size={12} className="text-purple-400" /> {playerCount} Online
          </span>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => setShowEmoteWheel(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all animate-pulse"
          >
            <Disc3 size={14} /> Emote Wheel [B]
          </button>
          <button
            onClick={onOpenEmoteShop}
            className="flex items-center gap-1.5 px-3 py-2 bg-neutral-900/90 hover:bg-neutral-800 text-white text-xs font-semibold rounded-xl border border-neutral-700 shadow-lg transition-all"
          >
            <Sparkles size={14} className="text-pink-400" /> Emote Shop
          </button>
          <button
            onClick={onOpenAvatarStudio}
            className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium rounded-xl shadow-lg transition-all"
          >
            <Layers size={14} /> Avatar Studio
          </button>
        </div>
      </div>

      {/* Synchronized Partner Dance Prompt */}
      {nearbyDancerPrompt && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-purple-950/90 border-2 border-pink-500 px-5 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce">
          <Sparkles size={18} className="text-pink-400" />
          <span className="text-xs font-bold text-white">
            Nearby avatar is dancing! Press <kbd className="px-1.5 py-0.5 bg-black rounded text-cyan-300">G</kbd> to Synchronize Dance!
          </span>
          <button
            onClick={() => {
              triggerEmote(nearbyDancerPrompt.emoteCode);
              setNearbyDancerPrompt(null);
            }}
            className="px-3 py-1 bg-pink-600 hover:bg-pink-500 text-white font-black text-xs rounded-lg"
          >
            Sync Now
          </button>
        </div>
      )}

      {/* Left Chat & Event Stream */}
      <div className="absolute left-4 bottom-28 w-80 max-h-56 hidden md:flex flex-col justify-end pointer-events-none z-10">
        <div className="space-y-1 overflow-hidden pointer-events-auto bg-neutral-950/70 backdrop-blur-md p-3 rounded-2xl border border-neutral-800/80">
          <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Compass size={12} className="text-cyan-400" /> Proximity Spatial Chat
          </div>
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {chatLog.length === 0 ? (
              <div className="text-xs text-neutral-500 italic">No recent messages in this zone. Say hello!</div>
            ) : (
              chatLog.map((c) => (
                <div key={c.id} className="text-xs break-words">
                  <span className="font-semibold text-purple-400 mr-1.5">{c.user}:</span>
                  <span className="text-neutral-200">{c.text}</span>
                </div>
              ))
            )}
          </div>
          <form onSubmit={handleSendChat} className="mt-2 flex gap-1.5">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Chat with nearby avatars..."
              className="flex-1 bg-neutral-900 text-white text-xs px-2.5 py-1.5 rounded-lg border border-neutral-700 focus:outline-none focus:border-cyan-400"
            />
            <button
              type="submit"
              className="bg-cyan-600 hover:bg-cyan-500 text-white px-2 py-1.5 rounded-lg transition-colors"
            >
              <Send size={12} />
            </button>
          </form>
        </div>
      </div>

      {/* Controls Guide */}
      <div className="absolute top-20 right-4 hidden lg:flex flex-col gap-1.5 bg-neutral-950/75 backdrop-blur-md px-3 py-2 rounded-xl border border-neutral-800 text-[11px] text-neutral-300 pointer-events-none">
        <div className="font-medium text-white flex items-center gap-1">
          <Compass size={12} className="text-purple-400" /> Controls
        </div>
        <div><kbd className="px-1.5 py-0.5 bg-neutral-800 rounded text-neutral-200">W A S D</kbd> Move</div>
        <div><kbd className="px-1.5 py-0.5 bg-neutral-800 rounded text-neutral-200">Space</kbd> Jump</div>
        <div><kbd className="px-1.5 py-0.5 bg-neutral-800 rounded text-neutral-200">Shift</kbd> Sprint</div>
        <div><kbd className="px-1.5 py-0.5 bg-pink-900 text-pink-200 rounded">B</kbd> Emote Wheel</div>
      </div>

      {/* Collapsible Bottom Control Dock */}
      <div
        className={`absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 transition-all duration-300 z-20 ${
          isHudCollapsed ? 'translate-y-24' : 'translate-y-0'
        }`}
      >
        <div className="relative bg-neutral-900/90 backdrop-blur-lg border border-neutral-800 rounded-2xl p-3 shadow-2xl">
          {/* Collapse toggle latch */}
          <button
            onClick={() => setIsHudCollapsed(!isHudCollapsed)}
            className="absolute -top-7 left-1/2 -translate-x-1/2 bg-neutral-900/90 border border-neutral-800 text-neutral-400 hover:text-white px-3 py-1 rounded-t-xl text-[11px] flex items-center gap-1 transition-colors"
          >
            {isHudCollapsed ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {isHudCollapsed ? 'Show Emotes & Music' : 'Hide Dock'}
          </button>

          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Quick Emote Bar */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-neutral-400 font-semibold mr-1 uppercase">Emotes:</span>
              {[
                { code: 'dance_electro', label: '💃 Shuffle' },
                { code: 'wave', label: '👋 Wave' },
                { code: 'backflip', label: '🤸 Flip' },
                { code: 'cheer', label: '🎉 Cheer' }
              ].map((emote) => (
                <button
                  key={emote.code}
                  onClick={() => triggerEmote(emote.code)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    activeEmote === emote.code
                      ? 'bg-purple-600 text-white ring-2 ring-purple-400'
                      : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                  }`}
                >
                  {emote.label}
                </button>
              ))}

              <button
                onClick={() => setShowEmoteWheel(true)}
                className="px-2.5 py-1.5 rounded-xl bg-pink-900/50 hover:bg-pink-800 text-pink-300 text-xs font-bold border border-pink-700 flex items-center gap-1"
                title="Open Emote Wheel"
              >
                <Disc3 size={13} /> Wheel
              </button>
            </div>

            {/* Spatial Music Controls */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-neutral-300">
                <Music size={14} className="text-cyan-400" />
                <span className="hidden sm:inline text-neutral-400">Track:</span>
                <span className="font-medium text-white">Neon Odyssey</span>
              </div>

              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg transition-colors"
                title={isMuted ? 'Unmute Lobby Music' : 'Mute Music'}
              >
                {isMuted ? <VolumeX size={15} className="text-red-400" /> : <Volume2 size={15} className="text-cyan-400" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Fortnite-Style Radial Emote Wheel Modal */}
      {showEmoteWheel && (
        <EmoteWheelModal
          equippedEmotes={DEFAULT_EMOTES_PACK}
          onSelectEmote={(emote) => triggerEmote(emote.actionCode)}
          onClose={() => setShowEmoteWheel(false)}
          onOpenEmoteShop={() => {
            setShowEmoteWheel(false);
            onOpenEmoteShop();
          }}
        />
      )}
    </div>
  );
};
