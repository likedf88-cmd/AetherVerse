/**
 * RiggingPipeline UI Component
 * Integrates into AdminView to handle GLB/GLTF model uploads, validation,
 * guided Adobe Mixamo landmark alignment, and live 3D visual rigging progress
 * (Analyzing Wireframe Scan -> Skeleton Armature Rigging -> Heat-Map Vertex Skinning -> Animation Retargeting).
 */

import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ModelProcessingJob, MixamoLandmark } from '../types/index';
import { api } from '../services/api';
import { buildHighFidelityHumanoidAvatar, HumanoidRig } from '../utils/avatar3dEngine';
import { DEFAULT_MIXAMO_LANDMARKS } from '../services/avatarEngine';
import { calculateWeightHeatColor } from '../utils/riggingMath';
import {
  UploadCloud,
  Cpu,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Play,
  Sparkles,
  ArrowRight,
  Terminal,
  Activity,
  Sliders,
  Check,
  RefreshCw,
  ShoppingBag,
  Eye,
  Scan,
  Maximize2
} from 'lucide-react';

interface RiggingPipelineProps {
  onJobPublished?: () => void;
}

type VisualMode = 'auto' | 'textured' | 'skeleton' | 'heatmap' | 'wireframe';

const MIXAMO_MARKERS: { key: keyof typeof DEFAULT_MIXAMO_LANDMARKS; label: string; desc: string }[] = [
  { key: 'chin', label: 'Chin Joint', desc: 'Base of chin / jaw alignment' },
  { key: 'leftWrist', label: 'Left Wrist', desc: 'Left carpal joint / base of palm' },
  { key: 'rightWrist', label: 'Right Wrist', desc: 'Right carpal joint / base of palm' },
  { key: 'leftElbow', label: 'Left Elbow', desc: 'Left cubital elbow joint hinge' },
  { key: 'rightElbow', label: 'Right Elbow', desc: 'Right cubital elbow joint hinge' },
  { key: 'leftKnee', label: 'Left Knee', desc: 'Left patella / knee hinge joint' },
  { key: 'rightKnee', label: 'Right Knee', desc: 'Right patella / knee hinge joint' },
  { key: 'groin', label: 'Groin / Pelvis', desc: 'Hips root pivot center' }
];

export const RiggingPipeline: React.FC<RiggingPipelineProps> = ({ onJobPublished }) => {
  const [jobs, setJobs] = useState<ModelProcessingJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<ModelProcessingJob | null>(null);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Guided Mixamo state
  const [landmarks, setLandmarks] = useState<Record<string, { x: number; y: number; z: number }>>({
    ...DEFAULT_MIXAMO_LANDMARKS
  });
  const [symmetryEnabled, setSymmetryEnabled] = useState(true);
  const [skeletonLOD, setSkeletonLOD] = useState<'standard_20' | 'full_fingers_65' | 'three_finger_45'>('standard_20');
  const [visualMode, setVisualMode] = useState<VisualMode>('auto');

  // Approval modal state
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approveItemName, setApproveItemName] = useState('');
  const [approveItemPrice, setApproveItemPrice] = useState(1200);

  // 3D Preview chamber refs
  const canvasRef = useRef<HTMLDivElement>(null);
  const rigRef = useRef<HumanoidRig | null>(null);
  const activeClipRef = useRef('dance_electro');
  const [activeClipName, setActiveClipName] = useState('dance_electro');

  // Visual rigging elements refs inside Three.js
  const sceneRef = useRef<THREE.Scene | null>(null);
  const scannerGroupRef = useRef<THREE.Group | null>(null);
  const skeletonGizmoRef = useRef<THREE.Group | null>(null);
  const landmarkMarkersRef = useRef<THREE.Group | null>(null);
  const heatMapMeshRef = useRef<THREE.Mesh | null>(null);
  const customModelGroupRef = useRef<THREE.Group | null>(null);

  // Load jobs on mount
  useEffect(() => {
    fetchJobs();
  }, []);

  // Poll active jobs if analyzing/rigging/skinning
  useEffect(() => {
    if (!selectedJob) return;
    const isWorking = ['analyzing', 'rigging', 'skin_weighting', 'testing_animations'].includes(selectedJob.status);

    if (isWorking) {
      const timer = setInterval(() => {
        api.getAvatarEngineJob(selectedJob.id)
          .then(res => {
            setSelectedJob(res.job);
            setJobs(prev => prev.map(j => j.id === res.job.id ? res.job : j));
            if (res.job.status === 'ready_for_approval') {
              setIsProcessing(false);
              setSuccessMessage('Model successfully auto-rigged and skin weighted!');
            }
          })
          .catch(console.error);
      }, 700);

      return () => clearInterval(timer);
    }
  }, [selectedJob?.status, selectedJob?.id]);

  const fetchJobs = async () => {
    setIsLoadingJobs(true);
    try {
      const res = await api.getAvatarEngineJobs();
      setJobs(res.jobs);
      if (res.jobs.length > 0 && !selectedJob) {
        setSelectedJob(res.jobs[0]);
        if (res.jobs[0].mixamoConfig?.landmarks) {
          setLandmarks(res.jobs[0].mixamoConfig.landmarks);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to fetch jobs');
    } finally {
      setIsLoadingJobs(false);
    }
  };

  // Determine current effective visual mode (auto matches backend status)
  const effectiveVisualMode: 'textured' | 'skeleton' | 'heatmap' | 'wireframe' = (function() {
    if (visualMode !== 'auto') return visualMode;
    if (!selectedJob) return 'textured';
    if (selectedJob.status === 'analyzing') return 'wireframe';
    if (selectedJob.status === 'rigging') return 'skeleton';
    if (selectedJob.status === 'skin_weighting') return 'heatmap';
    return 'textured';
  })();

  // 3D Canvas setup with real visual rigging scene elements
  useEffect(() => {
    const container = canvasRef.current;
    if (!container) return;

    const width = container.clientWidth || 420;
    const height = container.clientHeight || 420;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070913);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.35, 3.2);
    camera.lookAt(0, 1.05, 0);

    const isSoftwareGl = (function() {
      try {
        const gl = document.createElement('canvas').getContext('webgl');
        const dbg = gl?.getExtension('WEBGL_debug_renderer_info');
        const ren = (dbg && gl?.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) || '';
        return /llvmpipe|swiftshader|softpipe/i.test(ren);
      } catch {
        return false;
      }
    })();

    const renderer = new THREE.WebGLRenderer({ antialias: !isSoftwareGl, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Studio Lights
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x111625, 1.8);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0x00f3ff, 2.5);
    keyLight.position.set(3, 4, 3);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xa855f7, 3.0);
    rimLight.position.set(-3, 3, -3);
    scene.add(rimLight);

    // Circular base with cyber glowing rings
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.3, 0.08, 32),
      new THREE.MeshStandardMaterial({ color: 0x111425, metalness: 0.85, roughness: 0.25 })
    );
    base.position.y = -0.04;
    scene.add(base);

    const grid = new THREE.GridHelper(4, 16, 0x00f3ff, 0x1e2238);
    grid.position.y = 0.005;
    scene.add(grid);

    // 1. Scanning Laser Group (for 'analyzing' stage)
    const scannerGroup = new THREE.Group();
    const laserGeometry = new THREE.RingGeometry(0.01, 0.9, 32);
    laserGeometry.rotateX(-Math.PI / 2);
    const laserMaterial = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7
    });
    const laserPlane = new THREE.Mesh(laserGeometry, laserMaterial);
    scannerGroup.add(laserPlane);

    // Outer scanning ring
    const ringGeo = new THREE.TorusGeometry(0.9, 0.015, 16, 64);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const laserRing = new THREE.Mesh(ringGeo, ringMat);
    scannerGroup.add(laserRing);

    // Bounding Box wireframe
    const bboxGeo = new THREE.BoxGeometry(0.95, 1.85, 0.6);
    const bboxEdges = new THREE.EdgesGeometry(bboxGeo);
    const bboxLine = new THREE.LineSegments(
      bboxEdges,
      new THREE.LineBasicMaterial({ color: 0x00f3ff, transparent: true, opacity: 0.4 })
    );
    bboxLine.position.y = 0.925;
    scannerGroup.add(bboxLine);

    scene.add(scannerGroup);
    scannerGroupRef.current = scannerGroup;

    // 2. 3D Skeleton Armature Gizmo (for 'rigging' stage)
    const skeletonGizmo = new THREE.Group();
    const boneMaterial = new THREE.LineBasicMaterial({ color: 0xfacc15, linewidth: 2 });
    const jointMaterial = new THREE.MeshStandardMaterial({
      color: 0x00f3ff,
      emissive: 0x00f3ff,
      emissiveIntensity: 0.6,
      roughness: 0.2
    });
    const jointGeo = new THREE.SphereGeometry(0.035, 12, 12);

    // Standard 20 joints coordinates (normalized humanoid T-pose)
    const jointCoords: Record<string, [number, number, number]> = {
      hips: [0, 0.95, 0],
      spine: [0, 1.15, 0],
      chest: [0, 1.30, 0],
      neck: [0, 1.48, 0],
      head: [0, 1.65, 0],
      l_shoulder: [0.18, 1.42, 0],
      r_shoulder: [-0.18, 1.42, 0],
      l_elbow: [0.42, 1.25, -0.04],
      r_elbow: [-0.42, 1.25, -0.04],
      l_wrist: [0.68, 1.15, 0],
      r_wrist: [-0.68, 1.15, 0],
      l_hand: [0.78, 1.10, 0],
      r_hand: [-0.78, 1.10, 0],
      l_hip: [0.15, 0.92, 0],
      r_hip: [-0.15, 0.92, 0],
      l_knee: [0.20, 0.52, 0.02],
      r_knee: [-0.20, 0.52, 0.02],
      l_ankle: [0.20, 0.12, 0],
      r_ankle: [-0.20, 0.12, 0],
      l_foot: [0.20, 0.05, 0.12],
      r_foot: [-0.20, 0.05, 0.12]
    };

    // Add glowing joint spheres
    Object.entries(jointCoords).forEach(([_, [x, y, z]]) => {
      const sphere = new THREE.Mesh(jointGeo, jointMaterial);
      sphere.position.set(x, y, z);
      skeletonGizmo.add(sphere);
    });

    // Bone connection line pairs
    const bonePairs: [string, string][] = [
      ['hips', 'spine'],
      ['spine', 'chest'],
      ['chest', 'neck'],
      ['neck', 'head'],
      ['chest', 'l_shoulder'],
      ['l_shoulder', 'l_elbow'],
      ['l_elbow', 'l_wrist'],
      ['l_wrist', 'l_hand'],
      ['chest', 'r_shoulder'],
      ['r_shoulder', 'r_elbow'],
      ['r_elbow', 'r_wrist'],
      ['r_wrist', 'r_hand'],
      ['hips', 'l_hip'],
      ['l_hip', 'l_knee'],
      ['l_knee', 'l_ankle'],
      ['l_ankle', 'l_foot'],
      ['hips', 'r_hip'],
      ['r_hip', 'r_knee'],
      ['r_knee', 'r_ankle'],
      ['r_ankle', 'r_foot']
    ];

    const boneLinePositions: number[] = [];
    bonePairs.forEach(([a, b]) => {
      const pa = jointCoords[a];
      const pb = jointCoords[b];
      if (pa && pb) {
        boneLinePositions.push(...pa, ...pb);
      }
    });

    const boneLineGeo = new THREE.BufferGeometry();
    boneLineGeo.setAttribute('position', new THREE.Float32BufferAttribute(boneLinePositions, 3));
    const boneSegments = new THREE.LineSegments(boneLineGeo, boneMaterial);
    skeletonGizmo.add(boneSegments);

    scene.add(skeletonGizmo);
    skeletonGizmoRef.current = skeletonGizmo;

    // 3. Floating Mixamo 3D Landmark Rings
    const landmarkMarkers = new THREE.Group();
    scene.add(landmarkMarkers);
    landmarkMarkersRef.current = landmarkMarkers;

    // 4. Heat-Map Weight Painting Mesh (for 'skinning' stage)
    const heatMapGroup = new THREE.Group();
    // Build stylized capsule/cylinder mannequin painted with vertex colors
    const mannequinBodyGeo = new THREE.CylinderGeometry(0.24, 0.20, 0.65, 24, 32);
    // Apply vertex colors based on height weight gradient
    const vColors: number[] = [];
    const posAttr = mannequinBodyGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const y = posAttr.getY(i);
      const normalizedW = Math.max(0, Math.min(1, (y + 0.325) / 0.65));
      const col = calculateWeightHeatColor(normalizedW);
      vColors.push(col.r, col.g, col.b);
    }
    mannequinBodyGeo.setAttribute('color', new THREE.Float32BufferAttribute(vColors, 3));
    const heatMapMat = new THREE.MeshBasicMaterial({ vertexColors: true, wireframe: false });
    const heatMapMesh = new THREE.Mesh(mannequinBodyGeo, heatMapMat);
    heatMapMesh.position.y = 1.25;
    heatMapGroup.add(heatMapMesh);

    // Heat-map legs
    const leftLegGeo = new THREE.CylinderGeometry(0.09, 0.07, 0.85, 16, 20);
    const legColors: number[] = [];
    for (let i = 0; i < leftLegGeo.attributes.position.count; i++) {
      const y = leftLegGeo.attributes.position.getY(i);
      const nw = Math.max(0, Math.min(1, (y + 0.425) / 0.85));
      const col = calculateWeightHeatColor(nw * 0.75);
      legColors.push(col.r, col.g, col.b);
    }
    leftLegGeo.setAttribute('color', new THREE.Float32BufferAttribute(legColors, 3));
    const leftLegMesh = new THREE.Mesh(leftLegGeo, heatMapMat);
    leftLegMesh.position.set(0.18, 0.45, 0);
    heatMapGroup.add(leftLegMesh);

    const rightLegMesh = new THREE.Mesh(leftLegGeo.clone(), heatMapMat);
    rightLegMesh.position.set(-0.18, 0.45, 0);
    heatMapGroup.add(rightLegMesh);

    // Heat-map arms
    const armGeo = new THREE.CylinderGeometry(0.07, 0.06, 0.65, 16, 16);
    armGeo.rotateZ(Math.PI / 2);
    const armColors: number[] = [];
    for (let i = 0; i < armGeo.attributes.position.count; i++) {
      const x = armGeo.attributes.position.getX(i);
      const nw = Math.max(0, Math.min(1, (x + 0.325) / 0.65));
      const col = calculateWeightHeatColor(nw);
      armColors.push(col.r, col.g, col.b);
    }
    armGeo.setAttribute('color', new THREE.Float32BufferAttribute(armColors, 3));
    const leftArmMesh = new THREE.Mesh(armGeo, heatMapMat);
    leftArmMesh.position.set(0.48, 1.25, 0);
    heatMapGroup.add(leftArmMesh);

    const rightArmMesh = new THREE.Mesh(armGeo.clone(), heatMapMat);
    rightArmMesh.position.set(-0.48, 1.25, 0);
    heatMapGroup.add(rightArmMesh);

    scene.add(heatMapGroup);
    heatMapMeshRef.current = heatMapMesh;

    // 5. Build high-fidelity standard avatar rig
    const rig = buildHighFidelityHumanoidAvatar({
      skinTone: '#ffd1b3',
      hairStyle: 'cyber_dreads',
      hairColor: '#00f3ff',
      outfit: 'cyber_armored_coat',
      outfitColor: '#7928ca',
      visorStyle: 'holographic_specs',
      visorColor: '#00f3ff',
      glowColor: '#a855f7'
    });

    scene.add(rig.rootGroup);
    rigRef.current = rig;

    // Start initial animation
    rig.playAnimation(activeClipRef.current, 0.3);

    // Custom model container for uploaded GLBs
    const customGroup = new THREE.Group();
    scene.add(customGroup);
    customModelGroupRef.current = customGroup;

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

      // Animate scanning laser up and down
      if (scannerGroup) {
        const scanY = 0.95 + Math.sin(now * 0.003) * 0.88;
        laserPlane.position.y = scanY;
        laserRing.position.y = scanY;
      }

      // Rotate mannequin base slowly
      base.rotation.y += dt * 0.3;

      // Update animation mixer
      if (rig) {
        rig.mixer.update(dt);
      }

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

  // Update 3D visual visibility whenever effectiveVisualMode changes
  useEffect(() => {
    const isWireframe = effectiveVisualMode === 'wireframe';
    const isSkeleton = effectiveVisualMode === 'skeleton';
    const isHeatmap = effectiveVisualMode === 'heatmap';
    const isTextured = effectiveVisualMode === 'textured';

    if (scannerGroupRef.current) {
      scannerGroupRef.current.visible = isWireframe;
    }

    if (skeletonGizmoRef.current) {
      skeletonGizmoRef.current.visible = isSkeleton;
    }

    if (landmarkMarkersRef.current) {
      landmarkMarkersRef.current.visible = isSkeleton;
    }

    if (heatMapMeshRef.current && heatMapMeshRef.current.parent) {
      heatMapMeshRef.current.parent.visible = isHeatmap;
    }

    if (rigRef.current) {
      // In wireframe mode: wireframe on standard mesh
      rigRef.current.rootGroup.visible = isTextured || isWireframe;
      rigRef.current.skinnedMesh.material = isWireframe
        ? new THREE.MeshBasicMaterial({ color: 0x00f3ff, wireframe: true })
        : rigRef.current.skinnedMesh.material;
    }
  }, [effectiveVisualMode]);

  // Update 3D landmark marker positions when landmarks change
  useEffect(() => {
    const markerGroup = landmarkMarkersRef.current;
    if (!markerGroup) return;

    markerGroup.clear();
    const ringGeo = new THREE.TorusGeometry(0.06, 0.012, 16, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xec4899 });

    Object.entries(landmarks).forEach(([key, pos]) => {
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(pos.x, pos.y, pos.z);
      ring.name = `landmark_${key}`;
      markerGroup.add(ring);
    });
  }, [landmarks]);

  const handleSwitchClip = (clipName: string) => {
    activeClipRef.current = clipName;
    setActiveClipName(clipName);
    if (rigRef.current) {
      rigRef.current.playAnimation(clipName, 0.25);
    }
  };

  // Real GLB / GLTF file parser into Three.js
  const loadGlbIntoScene = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loader = new GLTFLoader();

      loader.parse(
        arrayBuffer,
        '',
        (gltf) => {
          const loadedScene = gltf.scene;
          if (loadedScene && customModelGroupRef.current) {
            customModelGroupRef.current.clear();

            // Calculate bounding box and scale to standard 1.8m height
            const bbox = new THREE.Box3().setFromObject(loadedScene);
            const size = bbox.getSize(new THREE.Vector3());
            const center = bbox.getCenter(new THREE.Vector3());

            if (size.y > 0) {
              const targetHeight = 1.8;
              const scale = targetHeight / size.y;
              loadedScene.scale.set(scale, scale, scale);
              loadedScene.position.set(-center.x * scale, -bbox.min.y * scale, -center.z * scale);
            }

            customModelGroupRef.current.add(loadedScene);
          }
        },
        (err) => {
          console.warn('GLTFLoader parsing warning (fallback applied):', err);
        }
      );
    } catch (err) {
      console.warn('Could not parse GLB buffer into Three.js:', err);
    }
  };

  // File Upload Handler (Real GLB or Sample)
  const processUploadedFile = async (file: File) => {
    if (!file.name.match(/\.(glb|gltf)$/i)) {
      setErrorMessage('Please upload a valid .GLB or .GLTF 3D model file.');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 50MB platform limit.');
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setVisualMode('auto');

    // Parse GLB into Three.js scene so user sees their actual model
    loadGlbIntoScene(file);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        try {
          const res = await api.uploadAvatarModel({
            fileName: file.name,
            fileSizeBytes: file.size,
            fileBase64: base64,
            format: file.name.endsWith('.glb') ? 'glb' : 'gltf'
          });

          setSelectedJob(res.job);
          setJobs(prev => [res.job, ...prev]);
          setSuccessMessage(`File ${file.name} uploaded! Scanning topology & symmetry.`);
          if (res.job.mixamoConfig?.landmarks) {
            setLandmarks(res.job.mixamoConfig.landmarks);
          }
        } catch (apiErr: any) {
          setErrorMessage(apiErr.message || 'Upload analysis failed');
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to read file');
      setIsUploading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processUploadedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processUploadedFile(file);
  };

  // Pre-set sample loader
  const handleLoadSample = async (sampleName: string, sampleId: string) => {
    setIsUploading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setVisualMode('auto');

    // Clear custom model group to show high-fidelity procedural avatar
    if (customModelGroupRef.current) {
      customModelGroupRef.current.clear();
    }

    try {
      const res = await api.uploadAvatarModel({
        fileName: `${sampleName.toLowerCase().replace(/\s+/g, '_')}_unrigged.glb`,
        fileSizeBytes: 16500000,
        isSample: true,
        sampleId,
        format: 'glb'
      });

      setSelectedJob(res.job);
      setJobs(prev => [res.job, ...prev]);
      setSuccessMessage(`Loaded ${sampleName} sample mesh. Visualizing topology scan.`);
      if (res.job.mixamoConfig?.landmarks) {
        setLandmarks(res.job.mixamoConfig.landmarks);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load sample');
    } finally {
      setIsUploading(false);
    }
  };

  // Start guided pipeline
  const handleStartPipeline = async () => {
    if (!selectedJob) return;
    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setVisualMode('auto');

    try {
      const res = await api.startAvatarEnginePipeline(selectedJob.id, landmarks);
      setSelectedJob(res.job);
      setJobs(prev => prev.map(j => j.id === res.job.id ? res.job : j));
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to start auto-rigging pipeline');
      setIsProcessing(false);
    }
  };

  // Update marker coordinates
  const handleLandmarkChange = (markerKey: string, axis: 'x' | 'y' | 'z', value: number) => {
    const updated = {
      ...landmarks,
      [markerKey]: {
        ...landmarks[markerKey],
        [axis]: value
      }
    };

    // If symmetry is on and it's left/right, mirror across X axis
    if (symmetryEnabled && markerKey.startsWith('left')) {
      const rightKey = markerKey.replace('left', 'right');
      if (updated[rightKey]) {
        updated[rightKey] = {
          ...updated[rightKey],
          [axis]: axis === 'x' ? -value : value
        };
      }
    } else if (symmetryEnabled && markerKey.startsWith('right')) {
      const leftKey = markerKey.replace('right', 'left');
      if (updated[leftKey]) {
        updated[leftKey] = {
          ...updated[leftKey],
          [axis]: axis === 'x' ? -value : value
        };
      }
    }

    setLandmarks(updated);
    if (selectedJob) {
      api.updateAvatarEngineLandmarks(selectedJob.id, updated).catch(console.error);
    }
  };

  // Approve & publish
  const handleApproveJob = async () => {
    if (!selectedJob) return;
    try {
      const res = await api.approveAvatarEngineJob(selectedJob.id, {
        name: approveItemName || selectedJob.fileName.replace(/\.(glb|gltf)$/i, ''),
        price: approveItemPrice,
        category: 'avatar'
      });
      setSelectedJob(res.job);
      setJobs(prev => prev.map(j => j.id === res.job.id ? res.job : j));
      setShowApprovalModal(false);
      setSuccessMessage('Character avatar model published to Metaverse Shop and catalog!');
      if (onJobPublished) onJobPublished();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to approve model');
    }
  };

  // Pipeline step status helpers
  const getStepState = (step: 'analyzing' | 'rigging' | 'skinning' | 'testing' | 'ready') => {
    if (!selectedJob) return 'waiting';
    const status = selectedJob.status;

    if (step === 'analyzing') {
      if (['analyzing', 'rigging', 'skin_weighting', 'testing_animations', 'ready_for_approval', 'published'].includes(status)) {
        return status === 'analyzing' ? 'active' : 'completed';
      }
      return 'waiting';
    }

    if (step === 'rigging') {
      if (['rigging', 'skin_weighting', 'testing_animations', 'ready_for_approval', 'published'].includes(status)) {
        return status === 'rigging' ? 'active' : 'completed';
      }
      return 'waiting';
    }

    if (step === 'skinning') {
      if (['skin_weighting', 'testing_animations', 'ready_for_approval', 'published'].includes(status)) {
        return status === 'skin_weighting' ? 'active' : 'completed';
      }
      return 'waiting';
    }

    if (step === 'testing') {
      if (['testing_animations', 'ready_for_approval', 'published'].includes(status)) {
        return status === 'testing_animations' ? 'active' : 'completed';
      }
      return 'waiting';
    }

    if (step === 'ready') {
      return ['ready_for_approval', 'published'].includes(status) ? 'completed' : 'waiting';
    }

    return 'waiting';
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Pipeline Intro */}
      <div className="bg-gradient-to-r from-purple-950/60 via-neutral-900 to-cyan-950/60 border border-purple-800/40 rounded-3xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold border border-cyan-500/40 flex items-center gap-1.5">
                <Cpu size={13} className="text-cyan-400" />
                Backend AvatarEngine Service
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold border border-purple-500/40 flex items-center gap-1.5">
                <Sparkles size={13} className="text-pink-400" />
                Real-Time Visual Rigging Progress
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white">
              GLB Humanoid Auto-Rigging & Visual Progress Engine
            </h2>
            <p className="text-xs text-neutral-400 mt-1 max-w-2xl">
              Upload unrigged or rigged GLB characters. Watch the 3D viewport progress live: <strong>Topology Laser Scan</strong> &rarr; <strong>Skeleton Armature Placement</strong> &rarr; <strong>Harmonic Heat-Map Skinning</strong> &rarr; <strong>Animation Retargeting</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchJobs}
              disabled={isLoadingJobs}
              className="px-3 py-2 bg-neutral-800/80 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-neutral-700"
            >
              <RefreshCw size={13} className={isLoadingJobs ? 'animate-spin' : ''} />
              Refresh Jobs
            </button>
          </div>
        </div>
      </div>

      {/* Feedback alerts */}
      {errorMessage && (
        <div className="p-3 bg-red-950/80 border border-red-700 text-red-200 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="text-red-400" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-xs hover:text-white">✕</button>
        </div>
      )}

      {successMessage && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-700 text-emerald-200 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-emerald-400" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-xs hover:text-white">✕</button>
        </div>
      )}

      {/* Progress States Visualizer Banner */}
      <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-cyan-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Live Auto-Rigging Pipeline Progress
            </span>
          </div>
          {selectedJob && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-400">Active Model:</span>
              <span className="text-xs font-mono text-cyan-300 font-bold bg-neutral-800 px-2 py-0.5 rounded">
                {selectedJob.fileName}
              </span>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                selectedJob.status === 'ready_for_approval' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                selectedJob.status === 'published' ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' :
                'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
              }`}>
                {selectedJob.status.replace(/_/g, ' ')} ({selectedJob.progressPercent}%)
              </span>
            </div>
          )}
        </div>

        {/* 5-Stage Stepper: Analyzing -> Rigging -> Skinning -> Retargeting -> Ready */}
        <div className="grid grid-cols-5 gap-2 relative">
          {/* Stage 1: Analyzing */}
          <div className={`p-3 rounded-xl border text-center transition-all ${
            getStepState('analyzing') === 'active' ? 'bg-cyan-950/60 border-cyan-500 text-cyan-200 ring-2 ring-cyan-500/30' :
            getStepState('analyzing') === 'completed' ? 'bg-emerald-950/30 border-emerald-700/60 text-emerald-300' :
            'bg-neutral-950/40 border-neutral-800 text-neutral-500'
          }`}>
            <div className="text-[10px] font-bold uppercase mb-1 flex items-center justify-center gap-1">
              {getStepState('analyzing') === 'completed' ? <Check size={12} className="text-emerald-400" /> : '1.'}
              Analyzing
            </div>
            <div className="text-[11px] font-medium truncate">Laser Scan & Mesh</div>
          </div>

          {/* Stage 2: Rigging */}
          <div className={`p-3 rounded-xl border text-center transition-all ${
            getStepState('rigging') === 'active' ? 'bg-cyan-950/60 border-cyan-500 text-cyan-200 ring-2 ring-cyan-500/30 animate-pulse' :
            getStepState('rigging') === 'completed' ? 'bg-emerald-950/30 border-emerald-700/60 text-emerald-300' :
            'bg-neutral-950/40 border-neutral-800 text-neutral-500'
          }`}>
            <div className="text-[10px] font-bold uppercase mb-1 flex items-center justify-center gap-1">
              {getStepState('rigging') === 'completed' ? <Check size={12} className="text-emerald-400" /> : '2.'}
              Rigging
            </div>
            <div className="text-[11px] font-medium truncate">Armature Insertion</div>
          </div>

          {/* Stage 3: Skinning */}
          <div className={`p-3 rounded-xl border text-center transition-all ${
            getStepState('skinning') === 'active' ? 'bg-cyan-950/60 border-cyan-500 text-cyan-200 ring-2 ring-cyan-500/30 animate-pulse' :
            getStepState('skinning') === 'completed' ? 'bg-emerald-950/30 border-emerald-700/60 text-emerald-300' :
            'bg-neutral-950/40 border-neutral-800 text-neutral-500'
          }`}>
            <div className="text-[10px] font-bold uppercase mb-1 flex items-center justify-center gap-1">
              {getStepState('skinning') === 'completed' ? <Check size={12} className="text-emerald-400" /> : '3.'}
              Skinning
            </div>
            <div className="text-[11px] font-medium truncate">Heat-Map Weights</div>
          </div>

          {/* Stage 4: Retargeting */}
          <div className={`p-3 rounded-xl border text-center transition-all ${
            getStepState('testing') === 'active' ? 'bg-cyan-950/60 border-cyan-500 text-cyan-200 ring-2 ring-cyan-500/30 animate-pulse' :
            getStepState('testing') === 'completed' ? 'bg-emerald-950/30 border-emerald-700/60 text-emerald-300' :
            'bg-neutral-950/40 border-neutral-800 text-neutral-500'
          }`}>
            <div className="text-[10px] font-bold uppercase mb-1 flex items-center justify-center gap-1">
              {getStepState('testing') === 'completed' ? <Check size={12} className="text-emerald-400" /> : '4.'}
              Retargeting
            </div>
            <div className="text-[11px] font-medium truncate">Universal Blending</div>
          </div>

          {/* Stage 5: Ready / Published */}
          <div className={`p-3 rounded-xl border text-center transition-all ${
            getStepState('ready') === 'completed' ? 'bg-purple-950/40 border-purple-600 text-purple-200' :
            'bg-neutral-950/40 border-neutral-800 text-neutral-500'
          }`}>
            <div className="text-[10px] font-bold uppercase mb-1 flex items-center justify-center gap-1">
              {getStepState('ready') === 'completed' ? <Sparkles size={12} className="text-pink-400" /> : '5.'}
              Ready
            </div>
            <div className="text-[11px] font-medium truncate">Shop Publish</div>
          </div>
        </div>

        {/* Animated Progress Bar */}
        <div className="w-full bg-neutral-950 h-2.5 rounded-full mt-3 overflow-hidden border border-neutral-800">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 transition-all duration-500 ease-out"
            style={{ width: `${selectedJob ? selectedJob.progressPercent : 0}%` }}
          />
        </div>
      </div>

      {/* Main Grid: Upload & Guided Mixamo Controls vs. 3D Preview & Terminal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols): Ingestion & Guided Mixamo Marker Controls */}
        <div className="lg:col-span-5 space-y-6">
          {/* File Ingestion Dropzone */}
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-3xl p-5 shadow-lg">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
              <UploadCloud size={16} className="text-cyan-400" />
              1. Upload GLB / GLTF Model
            </h3>
            <p className="text-xs text-neutral-400 mb-4">
              Select or drop any <code>.glb</code> or <code>.gltf</code> character. AvatarEngine parses the binary container, extracts meshes, and initializes the visual auto-rigging engine.
            </p>

            <label
              onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
              onDragLeave={() => setIsDraggingOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all ${
                isDraggingOver
                  ? 'border-cyan-400 bg-cyan-950/40 scale-[1.01]'
                  : 'border-neutral-700 hover:border-cyan-500/60 bg-neutral-950/40'
              } group`}
            >
              <input
                type="file"
                accept=".glb,.gltf"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
              />
              <div className="w-14 h-14 rounded-2xl bg-cyan-950/60 border border-cyan-800/40 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform mb-2">
                <UploadCloud size={28} />
              </div>
              <div className="text-xs font-bold text-white">
                {isUploading ? 'Ingesting & Parsing Model...' : 'Click or Drag & Drop .GLB / .GLTF file'}
              </div>
              <div className="text-[10px] text-neutral-400 mt-1 text-center">
                Accepts unrigged or rigged humanoid meshes (Max 50MB)
              </div>
            </label>

            {/* Quick Test Samples */}
            <div className="mt-4 pt-4 border-t border-neutral-800">
              <div className="text-[11px] font-semibold text-neutral-400 mb-2">
                Or Load Pre-Packaged Sample Meshes:
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleLoadSample('Cyber Assassin', 'assassin')}
                  disabled={isUploading}
                  className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-200 rounded-lg border border-neutral-700 flex items-center gap-1.5"
                >
                  <Sparkles size={11} className="text-cyan-400" /> Cyber Assassin
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadSample('Titanium Mech', 'mech')}
                  disabled={isUploading}
                  className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-200 rounded-lg border border-neutral-700 flex items-center gap-1.5"
                >
                  <Cpu size={11} className="text-purple-400" /> Titanium Mech
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadSample('Neon Shinobi', 'shinobi')}
                  disabled={isUploading}
                  className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-200 rounded-lg border border-neutral-700 flex items-center gap-1.5"
                >
                  <Layers size={11} className="text-pink-400" /> Neon Shinobi
                </button>
              </div>
            </div>
          </div>

          {/* Guided Adobe Mixamo Marker Placement */}
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-3xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders size={16} className="text-purple-400" />
                2. Guided Adobe Mixamo Markers
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSymmetryEnabled(!symmetryEnabled)}
                  className={`px-2 py-1 rounded text-[10px] font-bold border ${
                    symmetryEnabled
                      ? 'bg-purple-900/40 text-purple-300 border-purple-600'
                      : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                  }`}
                >
                  Symmetry: {symmetryEnabled ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>

            <p className="text-xs text-neutral-400">
              Moving sliders directly repositions the floating 3D landmark rings in the viewport in real time.
            </p>

            {/* Skeleton LOD Selector */}
            <div className="bg-neutral-950/60 p-3 rounded-2xl border border-neutral-800">
              <div className="text-[11px] font-semibold text-neutral-300 mb-1.5">
                Target Skeleton Resolution:
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSkeletonLOD('standard_20')}
                  className={`p-2 rounded-xl text-left border text-xs transition-all ${
                    skeletonLOD === 'standard_20'
                      ? 'bg-cyan-950/60 border-cyan-500 text-cyan-200'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                  }`}
                >
                  <div className="font-bold">Standard 20</div>
                  <div className="text-[9px] text-neutral-400">High FPS, 0 Lag</div>
                </button>

                <button
                  type="button"
                  onClick={() => setSkeletonLOD('three_finger_45')}
                  className={`p-2 rounded-xl text-left border text-xs transition-all ${
                    skeletonLOD === 'three_finger_45'
                      ? 'bg-cyan-950/60 border-cyan-500 text-cyan-200'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                  }`}
                >
                  <div className="font-bold">Stylized 45</div>
                  <div className="text-[9px] text-neutral-400">3-Finger Rig</div>
                </button>

                <button
                  type="button"
                  onClick={() => setSkeletonLOD('full_fingers_65')}
                  className={`p-2 rounded-xl text-left border text-xs transition-all ${
                    skeletonLOD === 'full_fingers_65'
                      ? 'bg-cyan-950/60 border-cyan-500 text-cyan-200'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                  }`}
                >
                  <div className="font-bold">Detailed 65</div>
                  <div className="text-[9px] text-neutral-400">Full Hand Bones</div>
                </button>
              </div>
            </div>

            {/* Marker Sliders */}
            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {MIXAMO_MARKERS.map(m => {
                const pos = landmarks[m.key] || { x: 0, y: 1, z: 0 };
                return (
                  <div key={m.key} className="bg-neutral-950/50 p-2.5 rounded-xl border border-neutral-800/80">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-neutral-200">{m.label}</span>
                      <span className="font-mono text-[10px] text-cyan-400">
                        Y: {pos.y.toFixed(2)}m
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-neutral-500 w-8">Height</span>
                      <input
                        type="range"
                        min="0.1"
                        max="2.0"
                        step="0.02"
                        value={pos.y}
                        onChange={(e) => handleLandmarkChange(m.key, 'y', parseFloat(e.target.value))}
                        className="flex-1 accent-cyan-400 h-1 bg-neutral-800 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Start Pipeline Action Button */}
            <button
              type="button"
              onClick={handleStartPipeline}
              disabled={!selectedJob || isProcessing}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-600 via-purple-600 to-pink-600 hover:from-cyan-500 hover:to-pink-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-900/30 transition-all disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Running Visual Rigging Engine...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Execute Auto-Rigging & Skinning Pipeline
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column (7 cols): 3D Viewport with Live Visual Progress Modes */}
        <div className="lg:col-span-7 space-y-6">
          {/* 3D Viewport Chamber */}
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-3xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Play size={16} className="text-emerald-400" />
                  3. Real-Time 3D Rigging & Retargeting Viewport
                </h3>
                <p className="text-[11px] text-neutral-400">
                  Visualizes laser scanning, skeleton armature placement, harmonic heat-map weights, and motion tests.
                </p>
              </div>

              {selectedJob?.status === 'ready_for_approval' && (
                <button
                  type="button"
                  onClick={() => setShowApprovalModal(true)}
                  className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950"
                >
                  <ShoppingBag size={14} />
                  Approve & Publish to Shop
                </button>
              )}
            </div>

            {/* 3D Canvas Viewport */}
            <div className="relative w-full h-84 rounded-2xl overflow-hidden border border-neutral-800 bg-[#070913]">
              <div ref={canvasRef} className="w-full h-full" />

              {/* Viewport Top Mode Toggles */}
              <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none">
                {/* Active Mode Status Badge */}
                <div className="bg-neutral-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-neutral-800 text-[11px] font-mono text-cyan-300 flex items-center gap-2 shadow-lg pointer-events-auto">
                  <span className={`w-2 h-2 rounded-full ${
                    effectiveVisualMode === 'wireframe' ? 'bg-cyan-400 animate-pulse' :
                    effectiveVisualMode === 'skeleton' ? 'bg-yellow-400 animate-pulse' :
                    effectiveVisualMode === 'heatmap' ? 'bg-pink-400 animate-pulse' :
                    'bg-emerald-400'
                  }`} />
                  <span className="font-bold uppercase text-[10px] tracking-wider text-white">
                    {effectiveVisualMode === 'wireframe' && 'Stage 1: Topology Laser Scan'}
                    {effectiveVisualMode === 'skeleton' && 'Stage 2: Armature Rigging'}
                    {effectiveVisualMode === 'heatmap' && 'Stage 3: Heat-Map Skinning'}
                    {effectiveVisualMode === 'textured' && 'Stage 4: Retargeted Motion'}
                  </span>
                </div>

                {/* Manual Inspection Mode Toggles */}
                <div className="bg-neutral-950/85 backdrop-blur-md p-1 rounded-xl border border-neutral-800 flex items-center gap-1 shadow-lg pointer-events-auto">
                  {[
                    { id: 'auto', label: 'Auto Stage' },
                    { id: 'wireframe', label: 'Scan' },
                    { id: 'skeleton', label: 'Skeleton' },
                    { id: 'heatmap', label: 'Heat-Map' },
                    { id: 'textured', label: 'Textured' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setVisualMode(tab.id as VisualMode)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                        visualMode === tab.id
                          ? 'bg-purple-600 text-white'
                          : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Clip Selector Dock (Active in textured/testing mode) */}
              <div className="absolute bottom-3 inset-x-3 bg-neutral-950/85 backdrop-blur-md p-2 rounded-2xl border border-neutral-800 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                <span className="text-[10px] font-bold text-neutral-400 uppercase ml-1 shrink-0">
                  Motion Test:
                </span>
                {[
                  { id: 'dance_electro', label: '💃 Electro Shuffle' },
                  { id: 'wave', label: '👋 Wave' },
                  { id: 'cheer', label: '🎉 Cheer' },
                  { id: 'backflip', label: '🤸 Flip' },
                  { id: 'walking', label: '🚶 Walk' },
                  { id: 'running', label: '🏃 Run' },
                  { id: 'jump', label: '⬆ Jump' },
                  { id: 'idle', label: '🧍 Idle' }
                ].map(clip => (
                  <button
                    key={clip.id}
                    type="button"
                    onClick={() => handleSwitchClip(clip.id)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                      activeClipName === clip.id
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
                        : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                    }`}
                  >
                    {clip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Model Metadata Cards */}
            {selectedJob && (
              <div className="grid grid-cols-4 gap-2 mt-3 text-center">
                <div className="bg-neutral-950/60 p-2.5 rounded-xl border border-neutral-800">
                  <div className="text-[10px] text-neutral-400 uppercase">Meshes</div>
                  <div className="text-sm font-black text-cyan-400">{selectedJob.meshCount}</div>
                </div>
                <div className="bg-neutral-950/60 p-2.5 rounded-xl border border-neutral-800">
                  <div className="text-[10px] text-neutral-400 uppercase">Bones</div>
                  <div className="text-sm font-black text-purple-400">{selectedJob.boneCount}</div>
                </div>
                <div className="bg-neutral-950/60 p-2.5 rounded-xl border border-neutral-800">
                  <div className="text-[10px] text-neutral-400 uppercase">Materials</div>
                  <div className="text-sm font-black text-pink-400">{selectedJob.materialCount}</div>
                </div>
                <div className="bg-neutral-950/60 p-2.5 rounded-xl border border-neutral-800">
                  <div className="text-[10px] text-neutral-400 uppercase">Animations</div>
                  <div className="text-sm font-black text-emerald-400">{selectedJob.animationCount}</div>
                </div>
              </div>
            )}
          </div>

          {/* Terminal Console Logs */}
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-3xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-neutral-300 flex items-center gap-2">
                <Terminal size={14} className="text-cyan-400" />
                AvatarEngine Step-by-Step Processing Logs
              </h3>
              <span className="text-[10px] text-neutral-500 font-mono">Real-time Stream</span>
            </div>

            <div className="bg-black/80 rounded-2xl p-3 border border-neutral-800/80 font-mono text-[11px] text-emerald-400 h-36 overflow-y-auto space-y-1">
              {selectedJob?.logs && selectedJob.logs.length > 0 ? (
                selectedJob.logs.map((log, idx) => (
                  <div key={idx} className="leading-tight">
                    <span className="text-neutral-500 mr-1">$</span> {log}
                  </div>
                ))
              ) : (
                <div className="text-neutral-500 italic">No job logs recorded yet. Upload a model to begin.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Approval & Catalog Publishing Modal */}
      {showApprovalModal && selectedJob && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-400" />
                <h3 className="text-base font-bold text-white">Approve & Publish Character</h3>
              </div>
              <button onClick={() => setShowApprovalModal(false)} className="text-neutral-400 hover:text-white">✕</button>
            </div>

            <p className="text-xs text-neutral-300">
              The model passed all skin weighting and animation checks. Set shop metadata to publish this avatar into the AetherVerse Virtual Item Shop.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-neutral-400 block mb-1">Item Title</label>
                <input
                  type="text"
                  value={approveItemName}
                  placeholder={selectedJob.fileName.replace(/\.(glb|gltf)$/i, '')}
                  onChange={(e) => setApproveItemName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-400 block mb-1">Price (Aether Coins)</label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={approveItemPrice}
                  onChange={(e) => setApproveItemPrice(parseInt(e.target.value) || 0)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowApprovalModal(false)}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApproveJob}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold"
              >
                Confirm & Publish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
