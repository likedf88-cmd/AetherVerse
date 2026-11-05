/**
 * AetherVerse High-Fidelity Humanoid 3D Avatar Engine & Skinned Mesh Rigger
 * Features true SkinnedMesh humanoid skeleton, procedural PBR textures,
 * universal retargeted animations, smooth cross-fading, and Web Audio emote synth beats.
 */

import * as THREE from 'three';
import { AvatarConfig } from '../types/index';
import { mapRawBoneToStandard, calculateVertexSkinWeights, STANDARD_HUMANOID_BONES } from './riggingMath';

export interface HumanoidRig {
  rootGroup: THREE.Group;
  skinnedMesh: THREE.SkinnedMesh;
  skeleton: THREE.Skeleton;
  bones: { [key: string]: THREE.Bone };
  mixer: THREE.AnimationMixer;
  actions: { [key: string]: THREE.AnimationAction };
  currentAction: THREE.AnimationAction | null;
  accessoriesGroup: THREE.Group;
  playAnimation: (name: string, fadeDuration?: number, loop?: boolean) => void;
  stopAnimation: (fadeDuration?: number) => void;
}

/**
 * Procedural tileable canvas texture for micro-relief normal and roughness maps.
 */
function createProceduralFabricTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 256, 256);
    // Draw subtle weave grid
    for (let x = 0; x < 256; x += 4) {
      for (let y = 0; y < 256; y += 4) {
        const val = 120 + Math.floor(Math.random() * 30);
        ctx.fillStyle = `rgb(${val},${val},${val})`;
        ctx.fillRect(x, y, 2, 2);
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 8);
  return texture;
}

/**
 * Builds a standardized Humanoid Skeleton.
 */
export function buildUniversalHumanoidSkeleton(): {
  bonesList: THREE.Bone[];
  bonesMap: { [key: string]: THREE.Bone };
  skeleton: THREE.Skeleton;
} {
  const bonesMap: { [key: string]: THREE.Bone } = {};

  // 1. Root / Hips
  const hips = new THREE.Bone();
  hips.name = 'hips';
  hips.position.set(0, 0.95, 0);
  bonesMap['hips'] = hips;

  // 2. Spine & Chest
  const spine = new THREE.Bone();
  spine.name = 'spine';
  spine.position.set(0, 0.22, 0);
  hips.add(spine);
  bonesMap['spine'] = spine;

  const chest = new THREE.Bone();
  chest.name = 'chest';
  chest.position.set(0, 0.26, 0);
  spine.add(chest);
  bonesMap['chest'] = chest;

  const neck = new THREE.Bone();
  neck.name = 'neck';
  neck.position.set(0, 0.28, 0);
  chest.add(neck);
  bonesMap['neck'] = neck;

  const head = new THREE.Bone();
  head.name = 'head';
  head.position.set(0, 0.18, 0);
  neck.add(head);
  bonesMap['head'] = head;

  // 3. Left Arm Chain
  const leftShoulder = new THREE.Bone();
  leftShoulder.name = 'leftShoulder';
  leftShoulder.position.set(0.18, 0.22, 0);
  chest.add(leftShoulder);
  bonesMap['leftShoulder'] = leftShoulder;

  const leftUpperArm = new THREE.Bone();
  leftUpperArm.name = 'leftUpperArm';
  leftUpperArm.position.set(0.18, 0, 0);
  leftShoulder.add(leftUpperArm);
  bonesMap['leftUpperArm'] = leftUpperArm;

  const leftForearm = new THREE.Bone();
  leftForearm.name = 'leftForearm';
  leftForearm.position.set(0.28, 0, 0);
  leftUpperArm.add(leftForearm);
  bonesMap['leftForearm'] = leftForearm;

  const leftHand = new THREE.Bone();
  leftHand.name = 'leftHand';
  leftHand.position.set(0.24, 0, 0);
  leftForearm.add(leftHand);
  bonesMap['leftHand'] = leftHand;

  // 4. Right Arm Chain
  const rightShoulder = new THREE.Bone();
  rightShoulder.name = 'rightShoulder';
  rightShoulder.position.set(-0.18, 0.22, 0);
  chest.add(rightShoulder);
  bonesMap['rightShoulder'] = rightShoulder;

  const rightUpperArm = new THREE.Bone();
  rightUpperArm.name = 'rightUpperArm';
  rightUpperArm.position.set(-0.18, 0, 0);
  rightShoulder.add(rightUpperArm);
  bonesMap['rightUpperArm'] = rightUpperArm;

  const rightForearm = new THREE.Bone();
  rightForearm.name = 'rightForearm';
  rightForearm.position.set(-0.28, 0, 0);
  rightUpperArm.add(rightForearm);
  bonesMap['rightForearm'] = rightForearm;

  const rightHand = new THREE.Bone();
  rightHand.name = 'rightHand';
  rightHand.position.set(-0.24, 0, 0);
  rightForearm.add(rightHand);
  bonesMap['rightHand'] = rightHand;

  // 5. Left Leg Chain
  const leftUpperLeg = new THREE.Bone();
  leftUpperLeg.name = 'leftUpperLeg';
  leftUpperLeg.position.set(0.16, -0.05, 0);
  hips.add(leftUpperLeg);
  bonesMap['leftUpperLeg'] = leftUpperLeg;

  const leftLowerLeg = new THREE.Bone();
  leftLowerLeg.name = 'leftLowerLeg';
  leftLowerLeg.position.set(0, -0.42, 0);
  leftUpperLeg.add(leftLowerLeg);
  bonesMap['leftLowerLeg'] = leftLowerLeg;

  const leftFoot = new THREE.Bone();
  leftFoot.name = 'leftFoot';
  leftFoot.position.set(0, -0.44, 0.08);
  leftLowerLeg.add(leftFoot);
  bonesMap['leftFoot'] = leftFoot;

  // 6. Right Leg Chain
  const rightUpperLeg = new THREE.Bone();
  rightUpperLeg.name = 'rightUpperLeg';
  rightUpperLeg.position.set(-0.16, -0.05, 0);
  hips.add(rightUpperLeg);
  bonesMap['rightUpperLeg'] = rightUpperLeg;

  const rightLowerLeg = new THREE.Bone();
  rightLowerLeg.name = 'rightLowerLeg';
  rightLowerLeg.position.set(0, -0.42, 0);
  rightUpperLeg.add(rightLowerLeg);
  bonesMap['rightLowerLeg'] = rightLowerLeg;

  const rightFoot = new THREE.Bone();
  rightFoot.name = 'rightFoot';
  rightFoot.position.set(0, -0.44, 0.08);
  rightLowerLeg.add(rightFoot);
  bonesMap['rightFoot'] = rightFoot;

  const bonesList = [
    hips, // 0
    spine, // 1
    chest, // 2
    neck, // 3
    head, // 4
    leftUpperArm, // 5
    leftForearm, // 6
    leftHand, // 7
    rightUpperArm, // 8
    rightForearm, // 9
    rightHand, // 10
    leftUpperLeg, // 11
    leftLowerLeg, // 12
    leftFoot, // 13
    rightUpperLeg, // 14
    rightLowerLeg, // 15
    rightFoot // 16
  ];

  const skeleton = new THREE.Skeleton(bonesList);
  return { bonesList, bonesMap, skeleton };
}

/**
 * Builds a high-fidelity Humanoid SkinnedMesh character.
 */
export function buildHighFidelityHumanoidAvatar(config: AvatarConfig): HumanoidRig {
  const rootGroup = new THREE.Group();
  const accessoriesGroup = new THREE.Group();
  rootGroup.add(accessoriesGroup);

  const { bonesList, bonesMap, skeleton } = buildUniversalHumanoidSkeleton();
  rootGroup.add(bonesList[0]); // add hips to root

  // Generate anatomical humanoid geometry
  const bodyGeo = new THREE.CylinderGeometry(0.38, 0.28, 1.85, 24, 32);
  bodyGeo.translate(0, 0.95, 0);

  // Compute vertex skin weights based on vertical & lateral normalized coordinates
  const position = bodyGeo.attributes.position;
  const vertexCount = position.count;
  const skinIndices = new Float32Array(vertexCount * 4);
  const skinWeights = new Float32Array(vertexCount * 4);

  for (let i = 0; i < vertexCount; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);

    const yNorm = Math.max(0, Math.min(1, y / 1.85));
    const xNorm = Math.max(-1, Math.min(1, x / 0.5));

    const weights = calculateVertexSkinWeights(yNorm, xNorm, z);

    skinIndices[i * 4] = weights.primaryBoneIndex;
    skinIndices[i * 4 + 1] = weights.secondaryBoneIndex;
    skinIndices[i * 4 + 2] = 0;
    skinIndices[i * 4 + 3] = 0;

    skinWeights[i * 4] = weights.primaryWeight;
    skinWeights[i * 4 + 1] = weights.secondaryWeight;
    skinWeights[i * 4 + 2] = 0;
    skinWeights[i * 4 + 3] = 0;
  }

  bodyGeo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
  bodyGeo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));

  const fabricTex = createProceduralFabricTexture();

  // Premium PBR Material
  const bodyMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(config.outfitColor || '#1e293b'),
    roughness: 0.35,
    metalness: 0.65,
    bumpMap: fabricTex,
    bumpScale: 0.005,
  });

  const skinnedMesh = new THREE.SkinnedMesh(bodyGeo, bodyMat);
  skinnedMesh.add(bonesList[0]);
  skinnedMesh.bind(skeleton);
  skinnedMesh.castShadow = true;
  skinnedMesh.receiveShadow = true;
  rootGroup.add(skinnedMesh);

  // ==========================================
  // DETAILED MODULAR ATTACHMENTS (Attached to Bones)
  // ==========================================
  const headBone = bonesMap['head'];
  const chestBone = bonesMap['chest'];

  if (headBone) {
    // Sculpted Head & Face
    const headGeom = new THREE.SphereGeometry(0.24, 24, 20);
    headGeom.scale(0.85, 1.1, 0.95);
    const headMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(config.skinTone || '#ffd1b3'),
      roughness: 0.55,
      metalness: 0.05
    });
    const headMesh = new THREE.Mesh(headGeom, headMat);
    headMesh.position.set(0, 0.08, 0.02);
    headBone.add(headMesh);

    // Glowing Cyber Visor
    if (config.visorStyle !== 'none') {
      const visorGeo = new THREE.BoxGeometry(0.36, 0.12, 0.18);
      const visorMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(config.visorColor || '#00f3ff'),
        emissive: new THREE.Color(config.visorColor || '#00f3ff'),
        emissiveIntensity: 1.8,
        roughness: 0.1,
        metalness: 0.95
      });
      const visor = new THREE.Mesh(visorGeo, visorMat);
      visor.position.set(0, 0.08, 0.16);
      headBone.add(visor);
    }

    // Detailed Cyber Hair Strands
    const hairGeo = new THREE.ConeGeometry(0.26, 0.32, 16);
    hairGeo.rotateX(Math.PI);
    const hairMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(config.hairColor || '#a855f7'),
      roughness: 0.45,
      metalness: 0.3
    });
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.set(0, 0.28, -0.02);
    headBone.add(hair);
  }

  if (chestBone) {
    // Bioluminescent Reactor Core
    const coreGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.04, 16);
    coreGeo.rotateX(Math.PI / 2);
    const coreMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(config.glowColor || '#00f3ff'),
      emissive: new THREE.Color(config.glowColor || '#00f3ff'),
      emissiveIntensity: 2.2,
      roughness: 0.1
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.set(0, 0.04, 0.2);
    chestBone.add(core);

    // Back Accessory (Cyber Jetpack / Wings)
    if (config.backAccessory !== 'none') {
      const wingGeo = new THREE.BoxGeometry(0.65, 0.3, 0.08);
      const wingMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(config.glowColor || '#a855f7'),
        emissive: new THREE.Color(config.glowColor || '#a855f7'),
        emissiveIntensity: 1.2,
        roughness: 0.2,
        metalness: 0.8
      });
      const wings = new THREE.Mesh(wingGeo, wingMat);
      wings.position.set(0, 0.05, -0.22);
      chestBone.add(wings);
    }
  }

  // Soft Contact Shadow Disc
  const shadowGeo = new THREE.CircleGeometry(0.55, 24);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.45,
    depthWrite: false
  });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.position.y = 0.015;
  rootGroup.add(shadow);

  // Initialize Animation Mixer & Clips
  const mixer = new THREE.AnimationMixer(rootGroup);
  const actions: { [key: string]: THREE.AnimationAction } = {};

  const animationClips = generateStandardAnimationClips();
  animationClips.forEach(clip => {
    actions[clip.name] = mixer.clipAction(clip);
  });

  let currentAction: THREE.AnimationAction | null = null;

  const playAnimation = (name: string, fadeDuration: number = 0.25, loop: boolean = true) => {
    const nextAction = actions[name] || actions['idle'];
    if (!nextAction) return;

    if (currentAction === nextAction && currentAction.isRunning()) return;

    nextAction.reset();
    nextAction.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
    nextAction.clampWhenFinished = !loop;

    if (currentAction) {
      currentAction.crossFadeTo(nextAction, fadeDuration, true);
    } else {
      nextAction.fadeIn(fadeDuration);
    }

    nextAction.play();
    currentAction = nextAction;
  };

  const stopAnimation = (fadeDuration: number = 0.2) => {
    if (currentAction) {
      playAnimation('idle', fadeDuration, true);
    }
  };

  // Start with Idle
  playAnimation('idle');

  return {
    rootGroup,
    skinnedMesh,
    skeleton,
    bones: bonesMap,
    mixer,
    actions,
    currentAction,
    accessoriesGroup,
    playAnimation,
    stopAnimation
  };
}

/**
 * Procedurally generates standard humanoid AnimationClips with smooth keyframes.
 */
export function generateStandardAnimationClips(): THREE.AnimationClip[] {
  const clips: THREE.AnimationClip[] = [];

  // 1. IDLE (Breathing & subtle sway)
  const idleTracks: THREE.KeyframeTrack[] = [
    new THREE.VectorKeyframeTrack(
      'chest.position',
      [0, 1.2, 2.4],
      [0, 0.26, 0, 0, 0.275, 0, 0, 0.26, 0]
    ),
    new THREE.QuaternionKeyframeTrack(
      'leftUpperArm.quaternion',
      [0, 1.2, 2.4],
      [
        0, 0, 0, 1,
        0, 0, -0.04, 0.999,
        0, 0, 0, 1
      ]
    ),
    new THREE.QuaternionKeyframeTrack(
      'rightUpperArm.quaternion',
      [0, 1.2, 2.4],
      [
        0, 0, 0, 1,
        0, 0, 0.04, 0.999,
        0, 0, 0, 1
      ]
    )
  ];
  clips.push(new THREE.AnimationClip('idle', 2.4, idleTracks));

  // 2. WALKING (Cyclic gait with leg lift & arm swing)
  const walkDuration = 1.0;
  const walkTimes = [0, 0.25, 0.5, 0.75, 1.0];
  const qForward = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.45);
  const qBackward = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.45);
  const qNeutral = new THREE.Quaternion();

  const walkTracks: THREE.KeyframeTrack[] = [
    new THREE.QuaternionKeyframeTrack('leftUpperLeg.quaternion', walkTimes, [
      ...qNeutral.toArray(),
      ...qForward.toArray(),
      ...qNeutral.toArray(),
      ...qBackward.toArray(),
      ...qNeutral.toArray()
    ]),
    new THREE.QuaternionKeyframeTrack('rightUpperLeg.quaternion', walkTimes, [
      ...qNeutral.toArray(),
      ...qBackward.toArray(),
      ...qNeutral.toArray(),
      ...qForward.toArray(),
      ...qNeutral.toArray()
    ]),
    new THREE.QuaternionKeyframeTrack('leftUpperArm.quaternion', walkTimes, [
      ...qNeutral.toArray(),
      ...qBackward.toArray(),
      ...qNeutral.toArray(),
      ...qForward.toArray(),
      ...qNeutral.toArray()
    ]),
    new THREE.QuaternionKeyframeTrack('rightUpperArm.quaternion', walkTimes, [
      ...qNeutral.toArray(),
      ...qForward.toArray(),
      ...qNeutral.toArray(),
      ...qBackward.toArray(),
      ...qNeutral.toArray()
    ])
  ];
  clips.push(new THREE.AnimationClip('walking', walkDuration, walkTracks));

  // 3. RUNNING (High energy, dynamic swing)
  const runDuration = 0.65;
  const runTimes = [0, 0.16, 0.32, 0.48, 0.65];
  const qRunFwd = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.75);
  const qRunBwd = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.7);

  const runTracks: THREE.KeyframeTrack[] = [
    new THREE.QuaternionKeyframeTrack('leftUpperLeg.quaternion', runTimes, [
      ...qNeutral.toArray(),
      ...qRunFwd.toArray(),
      ...qNeutral.toArray(),
      ...qRunBwd.toArray(),
      ...qNeutral.toArray()
    ]),
    new THREE.QuaternionKeyframeTrack('rightUpperLeg.quaternion', runTimes, [
      ...qNeutral.toArray(),
      ...qRunBwd.toArray(),
      ...qNeutral.toArray(),
      ...qRunFwd.toArray(),
      ...qNeutral.toArray()
    ]),
    new THREE.QuaternionKeyframeTrack('leftUpperArm.quaternion', runTimes, [
      ...qNeutral.toArray(),
      ...qRunBwd.toArray(),
      ...qNeutral.toArray(),
      ...qRunFwd.toArray(),
      ...qNeutral.toArray()
    ]),
    new THREE.QuaternionKeyframeTrack('rightUpperArm.quaternion', runTimes, [
      ...qNeutral.toArray(),
      ...qRunFwd.toArray(),
      ...qNeutral.toArray(),
      ...qRunBwd.toArray(),
      ...qNeutral.toArray()
    ])
  ];
  clips.push(new THREE.AnimationClip('running', runDuration, runTracks));

  // 4. JUMP
  const jumpTimes = [0, 0.2, 0.5, 0.8, 1.0];
  const jumpTracks: THREE.KeyframeTrack[] = [
    new THREE.VectorKeyframeTrack('hips.position', jumpTimes, [
      0, 0.95, 0,
      0, 0.82, 0, // Crouch
      0, 1.6, 0,  // Apex
      0, 1.1, 0,  // Fall
      0, 0.95, 0  // Land
    ])
  ];
  clips.push(new THREE.AnimationClip('jump', 1.0, jumpTracks));

  // 5. FORTNITE-STYLE DANCE: ELECTRO SHUFFLE (High tempo, hip sway & arm pump)
  const danceTimes = [0, 0.25, 0.5, 0.75, 1.0];
  const danceTracks: THREE.KeyframeTrack[] = [
    new THREE.VectorKeyframeTrack('hips.position', danceTimes, [
      -0.08, 0.98, 0,
      0.08, 0.93, 0,
      -0.08, 0.98, 0,
      0.08, 0.93, 0,
      -0.08, 0.98, 0
    ]),
    new THREE.QuaternionKeyframeTrack('chest.quaternion', danceTimes, [
      0, 0, 0.12, 0.99,
      0, 0, -0.12, 0.99,
      0, 0, 0.12, 0.99,
      0, 0, -0.12, 0.99,
      0, 0, 0.12, 0.99
    ])
  ];
  clips.push(new THREE.AnimationClip('dance_electro', 1.0, danceTracks));

  // 6. FRIENDLY WAVE
  const waveTimes = [0, 0.3, 0.6, 0.9, 1.2];
  const qWaveUp = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 2.2);
  const qWaveLeft = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 1.8);
  const qWaveRight = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 2.5);

  const waveTracks: THREE.KeyframeTrack[] = [
    new THREE.QuaternionKeyframeTrack('rightUpperArm.quaternion', waveTimes, [
      ...qNeutral.toArray(),
      ...qWaveLeft.toArray(),
      ...qWaveRight.toArray(),
      ...qWaveLeft.toArray(),
      ...qNeutral.toArray()
    ])
  ];
  clips.push(new THREE.AnimationClip('wave', 1.2, waveTracks));

  // 7. VICTORY CHEER
  const cheerTimes = [0, 0.4, 0.8, 1.2, 1.6];
  const qCheerArms = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -2.4);
  const cheerTracks: THREE.KeyframeTrack[] = [
    new THREE.QuaternionKeyframeTrack('leftUpperArm.quaternion', cheerTimes, [
      ...qNeutral.toArray(),
      ...qCheerArms.toArray(),
      ...qCheerArms.toArray(),
      ...qCheerArms.toArray(),
      ...qNeutral.toArray()
    ]),
    new THREE.QuaternionKeyframeTrack('rightUpperArm.quaternion', cheerTimes, [
      ...qNeutral.toArray(),
      ...qCheerArms.toArray(),
      ...qCheerArms.toArray(),
      ...qCheerArms.toArray(),
      ...qNeutral.toArray()
    ])
  ];
  clips.push(new THREE.AnimationClip('cheer', 1.6, cheerTracks));

  // 8. ZERO-G BACKFLIP
  const flipTimes = [0, 0.3, 0.6, 0.9, 1.2];
  const flipTracks: THREE.KeyframeTrack[] = [
    new THREE.VectorKeyframeTrack('hips.position', flipTimes, [
      0, 0.95, 0,
      0, 1.8, -0.4,
      0, 2.2, 0,
      0, 1.4, 0.3,
      0, 0.95, 0
    ]),
    new THREE.QuaternionKeyframeTrack('hips.quaternion', flipTimes, [
      0, 0, 0, 1,
      0.707, 0, 0, 0.707,
      1, 0, 0, 0,
      -0.707, 0, 0, 0.707,
      0, 0, 0, 1
    ])
  ];
  clips.push(new THREE.AnimationClip('backflip', 1.2, flipTracks));

  return clips;
}

/**
 * Procedural Web Audio Synth for Emote Beats & Audio Stems (Zero external audio 404s).
 */
export function playEmoteSoundEffect(actionCode: string) {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (actionCode.includes('dance')) {
      // 4-on-the-floor electro beat burst
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(130, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.35);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.45);
    } else if (actionCode.includes('cheer') || actionCode.includes('victory')) {
      // Ascending triumphant chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(640, now + 0.3);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.4);
    } else {
      // Gentle cyber ping
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.2);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  } catch {
    // Audio context may be suspended before user interaction
  }
}
