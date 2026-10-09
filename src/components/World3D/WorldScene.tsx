'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import confetti from 'canvas-confetti';
import { CATALOG, CatalogTemplate, WorldObjectItem } from './ObjectCatalog';
import { AvatarConfig, AvatarModel, DEFAULT_AVATAR_CONFIG_1, DEFAULT_AVATAR_CONFIG_2 } from '../AvatarStudio/AvatarMesh';
import { MultiplayerClient } from '@/lib/multiplayer';
import {
  Sun,
  Moon,
  CloudRain,
  Sparkles,
  Heart,
  RotateCw,
  Trash2,
  Undo2,
  Maximize2,
  Palette,
  Eye,
  Plus,
  Compass,
  Smile,
  Music,
} from 'lucide-react';

interface WorldSceneProps {
  multiplayer: MultiplayerClient;
  myAvatarConfig: AvatarConfig;
  partnerAvatarConfig?: AvatarConfig;
  onRequestInteraction: (type: 'hug' | 'kiss' | 'hold_hands' | 'dance' | 'cuddle') => void;
  partnerName: string;
}

export type EnvironmentType = 'sakura_garden' | 'sunset_beach' | 'penthouse_loft';
export type WeatherType = 'sakura' | 'rain' | 'snow' | 'fireflies' | 'clear';

const INITIAL_WORLD_OBJECTS: WorldObjectItem[] = [
  {
    id: 'obj_cottage_1',
    typeId: 'cozy_cottage',
    name: 'Cozy House',
    category: 'architecture',
    position: [0, 0, -8],
    rotation: 0,
    scale: 1.2,
    color: '#e0a96d',
  },
  {
    id: 'obj_bed_1',
    typeId: 'cloud_bed',
    name: 'Cloud Lovers Bed',
    category: 'furniture',
    position: [0, 0, -4],
    rotation: 0,
    scale: 1.0,
    color: '#f43f5e',
  },
  {
    id: 'obj_arch_1',
    typeId: 'neon_arch',
    name: 'Neon Heart Arch',
    category: 'architecture',
    position: [0, 0, 4],
    rotation: 0,
    scale: 1.0,
    color: '#ec4899',
  },
  {
    id: 'obj_tree_1',
    typeId: 'sakura_tree',
    name: 'Sakura Blossom Tree',
    category: 'nature',
    position: [-6, 0, -2],
    rotation: 0.5,
    scale: 1.1,
    color: '#f472b6',
  },
  {
    id: 'obj_tree_2',
    typeId: 'sakura_tree',
    name: 'Sakura Blossom Tree',
    category: 'nature',
    position: [6, 0, -2],
    rotation: -0.3,
    scale: 1.1,
    color: '#f472b6',
  },
  {
    id: 'obj_cat_1',
    typeId: 'cozy_cat',
    name: 'Cozy Calico Kitten',
    category: 'pets',
    position: [-2, 0, -3.5],
    rotation: 0.4,
    scale: 0.8,
    color: '#ea580c',
  },
];

export const WorldScene: React.FC<WorldSceneProps> = ({
  multiplayer,
  myAvatarConfig,
  partnerAvatarConfig,
  onRequestInteraction,
  partnerName,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // World states
  const [environment, setEnvironment] = useState<EnvironmentType>('sakura_garden');
  const [timeOfDay, setTimeOfDay] = useState<number>(0.8); // 0 = midnight, 0.25 = sunrise, 0.5 = noon, 0.75 = sunset
  const [weather, setWeather] = useState<WeatherType>('sakura');
  const [placedObjects, setPlacedObjects] = useState<WorldObjectItem[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vibepair_world_objects');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return INITIAL_WORLD_OBJECTS;
  });

  // Undo history
  const undoStackRef = useRef<WorldObjectItem[][]>([]);

  // Selection & Building mode
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [buildCatalogOpen, setBuildCatalogOpen] = useState(false);
  const [placingTemplate, setPlacingTemplate] = useState<CatalogTemplate | null>(null);
  const [colorPickerTarget, setColorPickerTarget] = useState<string | null>(null);

  // Avatar positions & interaction proximity
  const [myPos, setMyPos] = useState<[number, number, number]>([0, 0, 1]);
  const [partnerPos, setPartnerPos] = useState<[number, number, number]>([1.5, 0, 1]);
  const [partnerAnim, setPartnerAnim] = useState<string>('idle');
  const [isNearPartner, setIsNearPartner] = useState<boolean>(false);

  // Virtual Touch Joystick & Mobile Controls
  const [joystickKnob, setJoystickKnob] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isJoystickActive, setIsJoystickActive] = useState(false);
  const joystickDeltaRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const joystickCenterRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isSprintActive, setIsSprintActive] = useState(false);
  const touchSprintRef = useRef(false);

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const myAvatarRef = useRef<AvatarModel | null>(null);
  const partnerAvatarRef = useRef<AvatarModel | null>(null);
  const objectMeshGroupRef = useRef<THREE.Group | null>(null);
  const weatherParticlesRef = useRef<THREE.Points | null>(null);
  const placementCursorRef = useRef<THREE.Mesh | null>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);

  // Virtual Touch Joystick Handlers for Mobile Phones
  const handleJoystickTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    joystickCenterRef.current = { x: cx, y: cy };
    setIsJoystickActive(true);

    const dx = touch.clientX - cx;
    const dy = touch.clientY - cy;
    const dist = Math.hypot(dx, dy);
    const maxRadius = rect.width / 2;
    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);
    const kx = Math.cos(angle) * clampedDist;
    const ky = Math.sin(angle) * clampedDist;

    setJoystickKnob({ x: kx, y: ky });
    joystickDeltaRef.current = {
      x: kx / maxRadius,
      y: ky / maxRadius,
    };
  };

  const handleJoystickTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!isJoystickActive) return;
    const touch = e.touches[0];
    const { x: cx, y: cy } = joystickCenterRef.current;
    const dx = touch.clientX - cx;
    const dy = touch.clientY - cy;
    const dist = Math.hypot(dx, dy);
    const maxRadius = 45;
    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);
    const kx = Math.cos(angle) * clampedDist;
    const ky = Math.sin(angle) * clampedDist;

    setJoystickKnob({ x: kx, y: ky });
    joystickDeltaRef.current = {
      x: kx / maxRadius,
      y: ky / maxRadius,
    };
  };

  const handleJoystickTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsJoystickActive(false);
    setJoystickKnob({ x: 0, y: 0 });
    joystickDeltaRef.current = { x: 0, y: 0 };
  };

  // Movement input keys
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  // Push state to undo stack
  const saveUndoSnapshot = useCallback(() => {
    undoStackRef.current.push(JSON.parse(JSON.stringify(placedObjects)));
    if (undoStackRef.current.length > 20) {
      undoStackRef.current.shift();
    }
  }, [placedObjects]);

  // Sync objects to partner and localStorage
  const syncWorldObjects = useCallback(
    (newObjs: WorldObjectItem[]) => {
      setPlacedObjects(newObjs);
      localStorage.setItem('vibepair_world_objects', JSON.stringify(newObjs));
      multiplayer.send('WORLD_SYNC', { objects: newObjs });
    },
    [multiplayer]
  );

  // Handle incoming multiplayer messages
  useEffect(() => {
    const unsubMove = multiplayer.on('PLAYER_MOVE', (msg: any) => {
      const data = msg.data;
      if (data && Array.isArray(data.pos)) {
        setPartnerPos(data.pos);
        if (data.anim) setPartnerAnim(data.anim);
        if (partnerAvatarRef.current) {
          partnerAvatarRef.current.root.position.set(data.pos[0], data.pos[1], data.pos[2]);
          if (typeof data.rot === 'number') {
            partnerAvatarRef.current.root.rotation.y = data.rot;
          }
          partnerAvatarRef.current.currentAnimation = data.anim || 'idle';
        }
      }
    });

    const unsubWorldSync = multiplayer.on('WORLD_SYNC', (msg: any) => {
      const data = msg.data;
      if (data?.objects && Array.isArray(data.objects)) {
        setPlacedObjects(data.objects);
        localStorage.setItem('vibepair_world_objects', JSON.stringify(data.objects));
      }
    });

    const unsubAvatarUpdate = multiplayer.on('AVATAR_UPDATE', (msg: any) => {
      if (partnerAvatarRef.current && msg.data) {
        partnerAvatarRef.current.applyConfig(msg.data);
      }
    });

    return () => {
      unsubMove();
      unsubWorldSync();
      unsubAvatarUpdate();
    };
  }, [multiplayer]);

  // Main Three.js Scene Setup
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight || 600;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 150);
    camera.position.set(0, 5, 9);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;

    container.replaceChildren(renderer.domElement);

    // Lights
    const hemiLight = new THREE.HemisphereLight(0xffe4e6, 0x1e1b4b, 1.2);
    scene.add(hemiLight);
    hemiLightRef.current = hemiLight;

    const sunLight = new THREE.DirectionalLight(0xfff1f2, 2.0);
    sunLight.position.set(10, 15, 10);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 40;
    sunLight.shadow.camera.left = -15;
    sunLight.shadow.camera.right = 15;
    sunLight.shadow.camera.top = 15;
    sunLight.shadow.camera.bottom = -15;
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    // Ambient colored accents
    const pinkPoint = new THREE.PointLight(0xec4899, 2.5, 20);
    pinkPoint.position.set(-6, 3, -4);
    scene.add(pinkPoint);

    const purplePoint = new THREE.PointLight(0xa855f7, 2.5, 20);
    purplePoint.position.set(6, 3, -4);
    scene.add(purplePoint);

    // Ground Floor
    const groundGeo = new THREE.PlaneGeometry(60, 60, 32, 32);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x140e2b,
      roughness: 0.8,
      metalness: 0.2,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.name = 'GROUND';
    scene.add(ground);

    // Grid Floor Overlay
    const grid = new THREE.GridHelper(60, 60, 0xec4899, 0x3b1d60);
    grid.position.y = 0.01;
    scene.add(grid);

    // Placement Cursor Preview
    const cursorGeo = new THREE.RingGeometry(0.8, 0.95, 32);
    const cursorMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7,
    });
    const cursor = new THREE.Mesh(cursorGeo, cursorMat);
    cursor.rotation.x = -Math.PI / 2;
    cursor.position.y = 0.02;
    cursor.visible = false;
    scene.add(cursor);
    placementCursorRef.current = cursor;

    // Object Group
    const objectMeshGroup = new THREE.Group();
    scene.add(objectMeshGroup);
    objectMeshGroupRef.current = objectMeshGroup;

    // My Avatar
    const myAvatar = new AvatarModel(myAvatarConfig);
    myAvatar.root.position.set(0, 0, 1);
    scene.add(myAvatar.root);
    myAvatarRef.current = myAvatar;

    // Partner Avatar
    const partnerAvatar = new AvatarModel(partnerAvatarConfig || DEFAULT_AVATAR_CONFIG_2);
    partnerAvatar.root.position.set(1.5, 0, 1);
    scene.add(partnerAvatar.root);
    partnerAvatarRef.current = partnerAvatar;

    // Controls: Keyboard WASD / Arrows
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Mouse picking / raycasting for object selection & placement
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(ground);

      if (intersects.length > 0 && placementCursorRef.current) {
        const pt = intersects[0].point;
        // Snap to half-meter grid
        const snapX = Math.round(pt.x * 2) / 2;
        const snapZ = Math.round(pt.z * 2) / 2;
        placementCursorRef.current.position.set(snapX, 0.02, snapZ);
      }
    };

    const handlePointerDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      // Check if placing a new object
      if (placingTemplate && placementCursorRef.current) {
        const pt = placementCursorRef.current.position;
        const newObj: WorldObjectItem = {
          id: `obj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          typeId: placingTemplate.typeId,
          name: placingTemplate.name,
          category: placingTemplate.category,
          position: [pt.x, 0, pt.z],
          rotation: 0,
          scale: placingTemplate.defaultScale,
          color: placingTemplate.defaultColor,
        };
        saveUndoSnapshot();
        const updated = [...placedObjects, newObj];
        syncWorldObjects(updated);
        setPlacingTemplate(null);
        placementCursorRef.current.visible = false;
        return;
      }

      // Check if selecting an existing object
      if (objectMeshGroupRef.current) {
        const hits = raycaster.intersectObjects(objectMeshGroupRef.current.children, true);
        if (hits.length > 0) {
          // Walk up to find root item with userData
          let cur: THREE.Object3D | null = hits[0].object;
          while (cur && !cur.userData?.itemId && cur.parent !== objectMeshGroupRef.current) {
            cur = cur.parent;
          }
          if (cur?.userData?.itemId) {
            setSelectedObjectId(cur.userData.itemId);
            return;
          }
        } else {
          // Clicked empty ground
          setSelectedObjectId(null);
        }
      }
    };

    const dom = renderer.domElement;
    dom.addEventListener('pointermove', handlePointerMove);
    dom.addEventListener('pointerdown', handlePointerDown);

    // Weather particles generator
    const setupWeather = (type: WeatherType) => {
      if (weatherParticlesRef.current) {
        scene.remove(weatherParticlesRef.current);
        weatherParticlesRef.current.geometry.dispose();
        weatherParticlesRef.current = null;
      }

      if (type === 'clear') return;

      const particleCount = type === 'rain' ? 800 : type === 'sakura' ? 400 : 350;
      const particleGeo = new THREE.BufferGeometry();
      const posArray = new Float32Array(particleCount * 3);

      for (let i = 0; i < particleCount * 3; i += 3) {
        posArray[i] = (Math.random() - 0.5) * 36;
        posArray[i + 1] = Math.random() * 14;
        posArray[i + 2] = (Math.random() - 0.5) * 36;
      }
      particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

      let pColor = 0xf472b6;
      let pSize = 0.22;
      if (type === 'rain') {
        pColor = 0x60a5fa;
        pSize = 0.12;
      } else if (type === 'snow') {
        pColor = 0xffffff;
        pSize = 0.18;
      } else if (type === 'fireflies') {
        pColor = 0xfacc15;
        pSize = 0.25;
      }

      const pMat = new THREE.PointsMaterial({
        color: pColor,
        size: pSize,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
      });

      const particles = new THREE.Points(particleGeo, pMat);
      scene.add(particles);
      weatherParticlesRef.current = particles;
    };
    setupWeather(weather);

    // Animation & Physics Loop
    let animId: number;
    const clock = new THREE.Clock();
    let lastNetworkSync = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const now = clock.getElapsedTime();

      // Handle Avatar Movement
      if (myAvatarRef.current) {
        const isSprinting = Boolean(keysPressed.current['shift'] || touchSprintRef.current);
        const speed = isSprinting ? 7.5 : 4.5;
        let moveX = joystickDeltaRef.current.x;
        let moveZ = joystickDeltaRef.current.y;

        if (keysPressed.current['w'] || keysPressed.current['arrowup']) moveZ -= 1;
        if (keysPressed.current['s'] || keysPressed.current['arrowdown']) moveZ += 1;
        if (keysPressed.current['a'] || keysPressed.current['arrowleft']) moveX -= 1;
        if (keysPressed.current['d'] || keysPressed.current['arrowright']) moveX += 1;

        const isMoving = Math.abs(moveX) > 0.05 || Math.abs(moveZ) > 0.05;

        if (isMoving) {
          const moveVec = new THREE.Vector3(moveX, 0, moveZ).normalize().multiplyScalar(speed * delta);
          myAvatarRef.current.root.position.add(moveVec);

          // Face movement direction
          const targetAngle = Math.atan2(moveX, moveZ);
          myAvatarRef.current.root.rotation.y = THREE.MathUtils.lerp(
            myAvatarRef.current.root.rotation.y,
            targetAngle,
            0.2
          );

          myAvatarRef.current.currentAnimation = isSprinting ? 'run' : 'walk';

          // Keep camera following avatar smoothly
          const targetCamPos = new THREE.Vector3(
            myAvatarRef.current.root.position.x,
            myAvatarRef.current.root.position.y + 4.5,
            myAvatarRef.current.root.position.z + 7.5
          );
          camera.position.lerp(targetCamPos, 0.08);
          camera.lookAt(
            myAvatarRef.current.root.position.x,
            myAvatarRef.current.root.position.y + 1.2,
            myAvatarRef.current.root.position.z
          );

          // Update position state
          setMyPos([
            myAvatarRef.current.root.position.x,
            myAvatarRef.current.root.position.y,
            myAvatarRef.current.root.position.z,
          ]);

          // Broadcast movement throttled every 60ms
          if (now - lastNetworkSync > 0.06) {
            lastNetworkSync = now;
            multiplayer.send('PLAYER_MOVE', {
              pos: [
                myAvatarRef.current.root.position.x,
                myAvatarRef.current.root.position.y,
                myAvatarRef.current.root.position.z,
              ],
              rot: myAvatarRef.current.root.rotation.y,
              anim: myAvatarRef.current.currentAnimation,
            });
          }
        } else {
          // If was walking, revert to idle
          if (myAvatarRef.current.currentAnimation === 'walk' || myAvatarRef.current.currentAnimation === 'run') {
            myAvatarRef.current.currentAnimation = 'idle';
            multiplayer.send('PLAYER_MOVE', {
              pos: [
                myAvatarRef.current.root.position.x,
                myAvatarRef.current.root.position.y,
                myAvatarRef.current.root.position.z,
              ],
              rot: myAvatarRef.current.root.rotation.y,
              anim: 'idle',
            });
          }
        }

        myAvatarRef.current.update(delta);
      }

      // Partner avatar tick
      if (partnerAvatarRef.current) {
        partnerAvatarRef.current.update(delta);

        // Distance check for intimate interaction menu
        if (myAvatarRef.current) {
          const dist = myAvatarRef.current.root.position.distanceTo(partnerAvatarRef.current.root.position);
          setIsNearPartner(dist <= 2.8);
        }
      }

      // Weather Particles Animation
      if (weatherParticlesRef.current) {
        const positions = weatherParticlesRef.current.geometry.attributes.position.array as Float32Array;
        for (let i = 1; i < positions.length; i += 3) {
          positions[i] -= delta * (weather === 'rain' ? 12 : weather === 'snow' ? 2 : 1.5);
          if (positions[i] < 0) {
            positions[i] = 12 + Math.random() * 2;
          }
        }
        weatherParticlesRef.current.geometry.attributes.position.needsUpdate = true;
      }

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      dom.removeEventListener('pointermove', handlePointerMove);
      dom.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [placingTemplate, weather]);

  // Re-render placed world objects in 3D group whenever placedObjects changes
  useEffect(() => {
    if (!objectMeshGroupRef.current) return;
    const group = objectMeshGroupRef.current;

    // Clear old children
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    placedObjects.forEach(obj => {
      const template = CATALOG.find(t => t.typeId === obj.typeId);
      if (!template) return;

      const mesh = template.buildMesh(obj.color);
      mesh.position.set(obj.position[0], obj.position[1], obj.position[2]);
      mesh.rotation.y = obj.rotation;
      mesh.scale.setScalar(obj.scale);
      mesh.userData = { itemId: obj.id };

      // Highlight if selected
      if (obj.id === selectedObjectId) {
        const box = new THREE.BoxHelper(mesh, 0xec4899);
        mesh.add(box);
      }

      group.add(mesh);
    });
  }, [placedObjects, selectedObjectId]);

  // Update lighting & sky on timeOfDay change
  useEffect(() => {
    if (!sceneRef.current || !sunLightRef.current || !hemiLightRef.current) return;

    // 0 = midnight, 0.25 = sunrise, 0.5 = noon, 0.75 = sunset
    const sunAngle = timeOfDay * Math.PI * 2 - Math.PI / 2;
    sunLightRef.current.position.set(Math.cos(sunAngle) * 20, Math.sin(sunAngle) * 20, 10);

    if (timeOfDay < 0.2 || timeOfDay > 0.85) {
      // Midnight
      sceneRef.current.background = new THREE.Color(0x07040d);
      hemiLightRef.current.color.set(0x381d60);
      hemiLightRef.current.groundColor.set(0x090514);
      sunLightRef.current.intensity = 0.3;
    } else if (timeOfDay < 0.35) {
      // Sunrise
      sceneRef.current.background = new THREE.Color(0x4c1d4f);
      hemiLightRef.current.color.set(0xfb7185);
      sunLightRef.current.intensity = 1.6;
    } else if (timeOfDay < 0.7) {
      // Day
      sceneRef.current.background = new THREE.Color(0x1e1538);
      hemiLightRef.current.color.set(0xffe4e6);
      sunLightRef.current.intensity = 2.2;
    } else {
      // Sunset / Golden hour
      sceneRef.current.background = new THREE.Color(0x4a154b);
      hemiLightRef.current.color.set(0xf43f5e);
      sunLightRef.current.intensity = 1.8;
    }
  }, [timeOfDay]);

  // Object manipulation handlers
  const handleMoveSelected = (dx: number, dz: number) => {
    if (!selectedObjectId) return;
    saveUndoSnapshot();
    const updated = placedObjects.map(obj => {
      if (obj.id === selectedObjectId) {
        return {
          ...obj,
          position: [obj.position[0] + dx, obj.position[1], obj.position[2] + dz] as [number, number, number],
        };
      }
      return obj;
    });
    syncWorldObjects(updated);
  };

  const handleRotateSelected = () => {
    if (!selectedObjectId) return;
    saveUndoSnapshot();
    const updated = placedObjects.map(obj => {
      if (obj.id === selectedObjectId) {
        return {
          ...obj,
          rotation: obj.rotation + Math.PI / 4,
        };
      }
      return obj;
    });
    syncWorldObjects(updated);
  };

  const handleScaleSelected = (factor: number) => {
    if (!selectedObjectId) return;
    saveUndoSnapshot();
    const updated = placedObjects.map(obj => {
      if (obj.id === selectedObjectId) {
        return {
          ...obj,
          scale: Math.max(0.4, Math.min(3.0, obj.scale * factor)),
        };
      }
      return obj;
    });
    syncWorldObjects(updated);
  };

  const handleRecolorSelected = (color: string) => {
    if (!selectedObjectId) return;
    saveUndoSnapshot();
    const updated = placedObjects.map(obj => {
      if (obj.id === selectedObjectId) {
        return { ...obj, color };
      }
      return obj;
    });
    syncWorldObjects(updated);
    setColorPickerTarget(null);
  };

  const handleDeleteSelected = () => {
    if (!selectedObjectId) return;
    saveUndoSnapshot();
    const updated = placedObjects.filter(obj => obj.id !== selectedObjectId);
    syncWorldObjects(updated);
    setSelectedObjectId(null);
  };

  const handleUndo = () => {
    if (undoStackRef.current.length === 0) return;
    const prev = undoStackRef.current.pop()!;
    syncWorldObjects(prev);
    setSelectedObjectId(null);
  };

  const triggerCelebration = () => {
    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#ec4899', '#f43f5e', '#a855f7', '#fb7185', '#ffd1dc'],
    });
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-black rounded-2xl overflow-hidden border border-purple-500/20 shadow-2xl select-none">
      {/* 3D Canvas */}
      <div ref={mountRef} className="w-full h-full cursor-crosshair" />

      {/* Top Floating World HUD */}
      <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none z-20">
        {/* Environment & Weather Status */}
        <div className="flex items-center gap-1.5 pointer-events-auto flex-wrap">
          <div className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-black/70 backdrop-blur-md border border-purple-500/30 text-[11px] sm:text-xs font-semibold text-purple-200 flex items-center gap-1.5 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="hidden sm:inline">Shared World</span>
            <span className="text-pink-400">({placedObjects.length})</span>
          </div>

          {/* Time of Day Cycle */}
          <div className="flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-black/70 backdrop-blur-md border border-purple-500/30 text-xs text-purple-200">
            {timeOfDay < 0.25 || timeOfDay > 0.8 ? <Moon className="w-3.5 h-3.5 text-indigo-400" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={timeOfDay}
              onChange={e => setTimeOfDay(parseFloat(e.target.value))}
              className="w-12 sm:w-16 accent-pink-500 cursor-pointer"
              title="Drag to change Day / Sunset / Night time"
            />
          </div>

          {/* Weather Switcher */}
          <div className="flex items-center gap-0.5 p-0.5 sm:p-1 rounded-xl bg-black/70 backdrop-blur-md border border-purple-500/30 text-xs">
            {[
              { id: 'sakura', label: '🌸' },
              { id: 'rain', label: '🌧️' },
              { id: 'snow', label: '❄️' },
              { id: 'fireflies', label: '✨' },
              { id: 'clear', label: '☀️' },
            ].map(w => (
              <button
                key={w.id}
                onClick={() => setWeather(w.id as any)}
                className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs transition-all ${
                  weather === w.id ? 'bg-pink-500/40 text-white border border-pink-400/50' : 'text-gray-400 hover:text-white'
                }`}
                title={`Weather: ${w.id}`}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>

        {/* Undo & Build Catalog Trigger */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {undoStackRef.current.length > 0 && (
            <button
              onClick={handleUndo}
              className="px-2.5 py-1.5 rounded-xl bg-black/70 hover:bg-purple-900/40 text-purple-200 border border-purple-500/30 backdrop-blur-md text-xs font-medium flex items-center gap-1 shadow-lg transition-all"
            >
              <Undo2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Undo</span>
            </button>
          )}

          <button
            onClick={() => {
              setBuildCatalogOpen(!buildCatalogOpen);
              setPlacingTemplate(null);
              if (placementCursorRef.current) placementCursorRef.current.visible = false;
            }}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:brightness-110 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-pink-500/30 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" /> Build & Place
          </button>
        </div>
      </div>

      {/* Proximity Intimacy Interaction Prompt (Mobile Horizontal Scrollable) */}
      {isNearPartner && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 max-w-[94vw] overflow-x-auto scrollbar-none flex items-center gap-1.5 p-2 rounded-2xl bg-black/85 backdrop-blur-xl border border-pink-500/50 shadow-2xl animate-bounce z-20">
          <span className="text-xs font-bold text-pink-300 pl-2 whitespace-nowrap flex items-center gap-1">
            <Heart className="w-3.5 h-3.5 fill-pink-500 text-pink-500 animate-pulse" />
            Near {partnerName}:
          </span>
          {[
            { id: 'hug', label: 'Warm Hug 🤗' },
            { id: 'kiss', label: 'Sweet Kiss 💋' },
            { id: 'hold_hands', label: 'Hold Hands 🤝' },
            { id: 'dance', label: 'Slow Dance 💃' },
            { id: 'cuddle', label: 'Cuddle 🛋️' },
          ].map(act => (
            <button
              key={act.id}
              onClick={() => {
                onRequestInteraction(act.id as any);
                triggerCelebration();
              }}
              className="px-3 py-1 rounded-xl text-xs font-semibold bg-gradient-to-r from-pink-600/80 to-purple-600/80 hover:from-pink-500 hover:to-purple-500 text-white shadow-md active:scale-95 transition-all"
            >
              {act.label}
            </button>
          ))}
        </div>
      )}

      {/* Selected Object Manipulation Toolbar */}
      {selectedObjectId && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-1.5 p-2 rounded-2xl bg-slate-950/90 backdrop-blur-xl border border-pink-500/40 shadow-2xl">
          <span className="text-[11px] font-bold text-pink-300 px-2 uppercase">Selected</span>
          <button
            onClick={() => handleMoveSelected(0, -0.5)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium"
            title="Move North"
          >
            ⬆️
          </button>
          <button
            onClick={() => handleMoveSelected(0, 0.5)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium"
            title="Move South"
          >
            ⬇️
          </button>
          <button
            onClick={() => handleMoveSelected(-0.5, 0)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium"
            title="Move West"
          >
            ⬅️
          </button>
          <button
            onClick={() => handleMoveSelected(0.5, 0)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium"
            title="Move East"
          >
            ➡️
          </button>
          <button
            onClick={handleRotateSelected}
            className="p-2 rounded-xl bg-purple-900/50 hover:bg-purple-800 text-purple-200"
            title="Rotate 45°"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleScaleSelected(1.15)}
            className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white"
            title="Scale Up"
          >
            +
          </button>
          <button
            onClick={() => handleScaleSelected(0.85)}
            className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white"
            title="Scale Down"
          >
            -
          </button>
          <button
            onClick={() => setColorPickerTarget(selectedObjectId)}
            className="p-2 rounded-xl bg-purple-900/50 hover:bg-purple-800 text-pink-300"
            title="Recolor"
          >
            <Palette className="w-4 h-4" />
          </button>
          <button
            onClick={handleDeleteSelected}
            className="p-2 rounded-xl bg-red-900/50 hover:bg-red-800 text-red-300"
            title="Delete Object"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Recolor Pop-up */}
      {colorPickerTarget && (
        <div className="absolute bottom-36 left-1/2 -translate-x-1/2 flex items-center gap-2 p-3 rounded-2xl bg-black/90 backdrop-blur-xl border border-pink-500 shadow-2xl">
          <span className="text-xs font-bold text-purple-300">Choose Hue:</span>
          {['#ec4899', '#f43f5e', '#a855f7', '#38bdf8', '#10b981', '#f59e0b', '#78350f', '#e2e8f0'].map(c => (
            <button
              key={c}
              onClick={() => handleRecolorSelected(c)}
              style={{ backgroundColor: c }}
              className="w-7 h-7 rounded-full border border-white/50 hover:scale-125 transition-transform"
            />
          ))}
          <button onClick={() => setColorPickerTarget(null)} className="text-xs text-gray-400 hover:text-white pl-2">
            Done
          </button>
        </div>
      )}

      {/* Placer Guidance Toast */}
      {placingTemplate && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-2xl bg-pink-950/90 backdrop-blur-xl border border-pink-500 text-xs font-bold text-pink-200 shadow-2xl flex items-center gap-2 animate-pulse">
          <span>Click anywhere on the ground to place {placingTemplate.name} {placingTemplate.emoji}</span>
          <button
            onClick={() => {
              setPlacingTemplate(null);
              if (placementCursorRef.current) placementCursorRef.current.visible = false;
            }}
            className="px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 text-white"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Bottom Controls / Keyboard Movement Legend (Desktop) */}
      <div className="hidden sm:flex absolute bottom-4 right-4 items-center gap-2 p-2 rounded-2xl bg-black/60 backdrop-blur-md border border-purple-500/20 text-[11px] text-purple-200/80">
        <span className="px-1.5 py-0.5 rounded bg-white/10 font-mono font-bold text-pink-300">WASD</span>
        <span>or</span>
        <span className="px-1.5 py-0.5 rounded bg-white/10 font-mono font-bold text-pink-300">Arrows</span>
        <span>to Move | Hold</span>
        <span className="px-1.5 py-0.5 rounded bg-white/10 font-mono font-bold text-pink-300">Shift</span>
        <span>to Run</span>
      </div>

      {/* Virtual On-Screen Touch Joystick for Mobile / Phones */}
      <div className="absolute bottom-6 left-4 z-30 flex items-center gap-3 select-none touch-none">
        <div
          onTouchStart={handleJoystickTouchStart}
          onTouchMove={handleJoystickTouchMove}
          onTouchEnd={handleJoystickTouchEnd}
          className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-slate-950/75 border-2 border-purple-500/40 backdrop-blur-xl flex items-center justify-center shadow-2xl active:border-pink-500/80 cursor-pointer"
        >
          {/* Guide marks */}
          <div className="absolute inset-1 rounded-full border border-dashed border-purple-500/20 pointer-events-none" />
          
          {/* Thumbstick knob */}
          <div
            style={{
              transform: `translate(${joystickKnob.x}px, ${joystickKnob.y}px)`,
              transition: isJoystickActive ? 'none' : 'transform 0.15s ease-out',
            }}
            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full shadow-lg flex items-center justify-center pointer-events-none ${
              isJoystickActive
                ? 'bg-gradient-to-tr from-pink-500 to-purple-600 border border-white/70 shadow-pink-500/50 scale-110'
                : 'bg-purple-900/60 border border-purple-400/30'
            }`}
          >
            <Compass className={`w-4 h-4 sm:w-5 sm:h-5 ${isJoystickActive ? 'text-white' : 'text-pink-300'}`} />
          </div>
        </div>

        {/* Turbo / Sprint Hold Button */}
        <button
          onTouchStart={() => {
            touchSprintRef.current = true;
            setIsSprintActive(true);
          }}
          onTouchEnd={() => {
            touchSprintRef.current = false;
            setIsSprintActive(false);
          }}
          onMouseDown={() => {
            touchSprintRef.current = true;
            setIsSprintActive(true);
          }}
          onMouseUp={() => {
            touchSprintRef.current = false;
            setIsSprintActive(false);
          }}
          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full border flex flex-col items-center justify-center text-[10px] font-bold shadow-xl transition-all ${
            isSprintActive
              ? 'bg-pink-600 border-pink-400 text-white scale-110 shadow-pink-500/60'
              : 'bg-slate-950/75 border-purple-500/40 text-purple-200 backdrop-blur-xl hover:border-pink-500'
          }`}
          title="Hold to Sprint / Run"
        >
          <Sparkles className="w-3.5 h-3.5 mb-0.5" />
          <span>RUN</span>
        </button>
      </div>

      {/* Build Catalog Drawer (Bottom Sheet on Mobile, Sidebar on Desktop) */}
      {buildCatalogOpen && (
        <div className="fixed inset-x-0 bottom-0 max-h-[82vh] sm:max-h-none sm:absolute sm:inset-y-0 sm:right-0 sm:w-96 bg-slate-950/95 backdrop-blur-2xl border-t sm:border-t-0 sm:border-l border-purple-500/30 p-5 flex flex-col shadow-2xl z-40 overflow-y-auto rounded-t-3xl sm:rounded-none animate-in slide-in-from-bottom sm:slide-in-from-right">
          <div className="flex items-center justify-between pb-3 border-b border-purple-500/20 mb-4">
            <h3 className="font-bold text-sm text-pink-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-pink-400" />
              Build Together Catalog
            </h3>
            <button
              onClick={() => setBuildCatalogOpen(false)}
              className="text-xs text-gray-400 hover:text-white"
            >
              ✕ Close
            </button>
          </div>

          <p className="text-xs text-purple-300/70 mb-4">
            Select an item, then click anywhere on your shared 3D terrain to build it together.
          </p>

          <div className="space-y-4">
            {['architecture', 'furniture', 'nature', 'lighting', 'pets', 'vehicles'].map(cat => {
              const items = CATALOG.filter(c => c.category === cat);
              if (items.length === 0) return null;
              return (
                <div key={cat}>
                  <div className="text-[11px] uppercase font-bold tracking-wider text-purple-400 mb-2">
                    {cat}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {items.map(item => (
                      <button
                        key={item.typeId}
                        onClick={() => {
                          setPlacingTemplate(item);
                          setBuildCatalogOpen(false);
                          if (placementCursorRef.current) {
                            placementCursorRef.current.visible = true;
                          }
                        }}
                        className="p-3 rounded-xl bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/20 hover:border-pink-500/50 text-left transition-all hover:scale-105 group"
                      >
                        <div className="text-xl mb-1">{item.emoji}</div>
                        <div className="text-xs font-semibold text-gray-200 group-hover:text-pink-300">
                          {item.name}
                        </div>
                        <div className="text-[10px] text-gray-400 line-clamp-1">{item.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
