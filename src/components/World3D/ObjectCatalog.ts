/**
 * VibePair 3D Sandbox Object Catalog
 * Provides procedural 3D mesh generators for architecture, furniture, nature, lighting, pets, and romantic items.
 */

import * as THREE from 'three';

export interface WorldObjectItem {
  id: string; // unique placed instance id
  typeId: string; // template id from catalog
  name: string;
  category: 'architecture' | 'furniture' | 'nature' | 'lighting' | 'pets' | 'vehicles';
  position: [number, number, number];
  rotation: number; // Y-axis rotation in radians
  scale: number;
  color: string;
}

export interface CatalogTemplate {
  typeId: string;
  name: string;
  category: WorldObjectItem['category'];
  emoji: string;
  defaultColor: string;
  defaultScale: number;
  description: string;
  buildMesh: (color: string) => THREE.Group;
}

export const CATALOG: CatalogTemplate[] = [
  // --- ARCHITECTURE ---
  {
    typeId: 'cozy_cottage',
    name: 'Cozy House',
    category: 'architecture',
    emoji: '🏡',
    defaultColor: '#e0a96d',
    defaultScale: 1.0,
    description: 'A warm wooden couple sanctuary with roof and glowing windows',
    buildMesh: (color) => {
      const group = new THREE.Group();
      // Main walls
      const wallsGeo = new THREE.BoxGeometry(3.2, 2.2, 2.8);
      const wallsMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.7 });
      const walls = new THREE.Mesh(wallsGeo, wallsMat);
      walls.position.y = 1.1;
      walls.castShadow = true;
      walls.receiveShadow = true;
      group.add(walls);

      // Roof
      const roofGeo = new THREE.ConeGeometry(2.6, 1.4, 4);
      roofGeo.rotateY(Math.PI / 4);
      const roofMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.5 });
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.y = 2.9;
      roof.scale.set(1.15, 1, 1.05);
      roof.castShadow = true;
      group.add(roof);

      // Door
      const doorGeo = new THREE.BoxGeometry(0.7, 1.4, 0.1);
      const doorMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.8 });
      const door = new THREE.Mesh(doorGeo, doorMat);
      door.position.set(0, 0.7, 1.41);
      group.add(door);

      // Glowing Windows
      const winGeo = new THREE.PlaneGeometry(0.6, 0.6);
      const winMat = new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        emissive: 0xfef08a,
        emissiveIntensity: 0.8,
      });
      const winL = new THREE.Mesh(winGeo, winMat);
      winL.position.set(-0.9, 1.3, 1.41);
      const winR = new THREE.Mesh(winGeo, winMat);
      winR.position.set(0.9, 1.3, 1.41);
      group.add(winL, winR);

      // Chimney
      const chimGeo = new THREE.BoxGeometry(0.4, 0.9, 0.4);
      const chimMat = new THREE.MeshStandardMaterial({ color: 0x57534e });
      const chim = new THREE.Mesh(chimGeo, chimMat);
      chim.position.set(0.8, 3.1, -0.4);
      group.add(chim);

      return group;
    },
  },
  {
    typeId: 'neon_arch',
    name: 'Neon Heart Arch',
    category: 'architecture',
    emoji: '💖',
    defaultColor: '#ec4899',
    defaultScale: 1.0,
    description: 'Cyberpunk neon gateway for romantic walks',
    buildMesh: (color) => {
      const group = new THREE.Group();
      const archGeo = new THREE.TorusGeometry(1.6, 0.12, 12, 32, Math.PI);
      const archMat = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 1.5,
      });
      const arch = new THREE.Mesh(archGeo, archMat);
      arch.position.y = 1.6;
      group.add(arch);

      // Base pillars
      const pillarGeo = new THREE.CylinderGeometry(0.14, 0.16, 1.6, 16);
      const pL = new THREE.Mesh(pillarGeo, archMat);
      pL.position.set(-1.6, 0.8, 0);
      const pR = new THREE.Mesh(pillarGeo, archMat);
      pR.position.set(1.6, 0.8, 0);
      group.add(pL, pR);

      return group;
    },
  },
  {
    typeId: 'stone_bridge',
    name: 'Romantic Bridge',
    category: 'architecture',
    emoji: '🌉',
    defaultColor: '#94a3b8',
    defaultScale: 1.0,
    description: 'Arched bridge over rivers or flower fields',
    buildMesh: (color) => {
      const group = new THREE.Group();
      const plankGeo = new THREE.BoxGeometry(3.2, 0.2, 1.4);
      const plankMat = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
      const plank = new THREE.Mesh(plankGeo, plankMat);
      plank.position.y = 0.4;
      plank.castShadow = true;
      group.add(plank);

      // Rails
      const railGeo = new THREE.CylinderGeometry(0.06, 0.06, 3.2);
      railGeo.rotateZ(Math.PI / 2);
      const railMat = new THREE.MeshStandardMaterial({ color: 0x475569 });
      const r1 = new THREE.Mesh(railGeo, railMat);
      r1.position.set(0, 0.9, 0.65);
      const r2 = new THREE.Mesh(railGeo, railMat);
      r2.position.set(0, 0.9, -0.65);
      group.add(r1, r2);

      return group;
    },
  },

  // --- FURNITURE ---
  {
    typeId: 'cloud_bed',
    name: 'Cloud Lovers Bed',
    category: 'furniture',
    emoji: '🛏️',
    defaultColor: '#f43f5e',
    defaultScale: 1.0,
    description: 'Ultra-soft double bed with silk pillows for cuddling',
    buildMesh: (color) => {
      const group = new THREE.Group();
      // Mattress frame
      const frameGeo = new THREE.BoxGeometry(2.4, 0.35, 2.6);
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.5 });
      const frame = new THREE.Mesh(frameGeo, frameMat);
      frame.position.y = 0.2;
      group.add(frame);

      // Mattress
      const mattressGeo = new THREE.BoxGeometry(2.2, 0.4, 2.4);
      const mattressMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
      const mattress = new THREE.Mesh(mattressGeo, mattressMat);
      mattress.position.y = 0.5;
      group.add(mattress);

      // Duvet / Blanket
      const duvetGeo = new THREE.BoxGeometry(2.25, 0.2, 1.7);
      const duvetMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.6 });
      const duvet = new THREE.Mesh(duvetGeo, duvetMat);
      duvet.position.set(0, 0.65, 0.35);
      group.add(duvet);

      // 2 Pillows
      const pillowGeo = new THREE.BoxGeometry(0.8, 0.18, 0.5);
      const pillowMat = new THREE.MeshStandardMaterial({ color: 0xfbcfe8, roughness: 0.4 });
      const p1 = new THREE.Mesh(pillowGeo, pillowMat);
      p1.position.set(-0.6, 0.72, -0.75);
      const p2 = new THREE.Mesh(pillowGeo, pillowMat);
      p2.position.set(0.6, 0.72, -0.75);
      group.add(p1, p2);

      // Headboard
      const headGeo = new THREE.BoxGeometry(2.4, 1.2, 0.2);
      const headMat = new THREE.MeshStandardMaterial({ color: 0x3f3f46 });
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.set(0, 0.8, -1.25);
      group.add(head);

      return group;
    },
  },
  {
    typeId: 'velvet_sofa',
    name: 'Velvet Loveseat',
    category: 'furniture',
    emoji: '🛋️',
    defaultColor: '#8b5cf6',
    defaultScale: 1.0,
    description: 'Plush romantic sofa built for two',
    buildMesh: (color) => {
      const group = new THREE.Group();
      const seatMat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });

      // Seat cushion
      const seatGeo = new THREE.BoxGeometry(1.8, 0.35, 0.9);
      const seat = new THREE.Mesh(seatGeo, seatMat);
      seat.position.y = 0.35;
      seat.castShadow = true;
      group.add(seat);

      // Backrest
      const backGeo = new THREE.BoxGeometry(1.8, 0.7, 0.25);
      const back = new THREE.Mesh(backGeo, seatMat);
      back.position.set(0, 0.75, -0.35);
      group.add(back);

      // Left & Right Armrests
      const armGeo = new THREE.BoxGeometry(0.25, 0.55, 0.9);
      const armL = new THREE.Mesh(armGeo, seatMat);
      armL.position.set(-0.95, 0.5, 0);
      const armR = new THREE.Mesh(armGeo, seatMat);
      armR.position.set(0.95, 0.5, 0);
      group.add(armL, armR);

      return group;
    },
  },
  {
    typeId: 'candle_table',
    name: 'Date Candle Table',
    category: 'furniture',
    emoji: '🕯️',
    defaultColor: '#78350f',
    defaultScale: 1.0,
    description: 'Candlelit dining table with wine glasses',
    buildMesh: (color) => {
      const group = new THREE.Group();
      // Table top
      const topGeo = new THREE.CylinderGeometry(0.9, 0.9, 0.1, 24);
      const topMat = new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
      const top = new THREE.Mesh(topGeo, topMat);
      top.position.y = 0.85;
      group.add(top);

      // Table leg
      const legGeo = new THREE.CylinderGeometry(0.1, 0.2, 0.8, 16);
      const legMat = new THREE.MeshStandardMaterial({ color: 0x18181b });
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.y = 0.4;
      group.add(leg);

      // Candle
      const candleGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.2, 12);
      const candleMat = new THREE.MeshStandardMaterial({ color: 0xfef08a });
      const candle = new THREE.Mesh(candleGeo, candleMat);
      candle.position.set(0, 0.98, 0);
      group.add(candle);

      // Candle Flame
      const flameGeo = new THREE.SphereGeometry(0.04, 8, 8);
      const flameMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.set(0, 1.1, 0);
      group.add(flame);

      return group;
    },
  },
  {
    typeId: 'cozy_fireplace',
    name: 'Warm Fireplace',
    category: 'furniture',
    emoji: '🔥',
    defaultColor: '#57534e',
    defaultScale: 1.0,
    description: 'Roaring hearth with warm ambient crackling fire',
    buildMesh: (color) => {
      const group = new THREE.Group();
      const hearthGeo = new THREE.BoxGeometry(1.6, 1.4, 0.8);
      const hearthMat = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
      const hearth = new THREE.Mesh(hearthGeo, hearthMat);
      hearth.position.y = 0.7;
      group.add(hearth);

      // Inner fire cavity
      const cavityGeo = new THREE.BoxGeometry(0.9, 0.7, 0.5);
      const cavityMat = new THREE.MeshStandardMaterial({ color: 0x18181b });
      const cavity = new THREE.Mesh(cavityGeo, cavityMat);
      cavity.position.set(0, 0.45, 0.2);
      group.add(cavity);

      // Glowing fire core
      const fireGeo = new THREE.DodecahedronGeometry(0.25, 0);
      const fireMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
      const fire = new THREE.Mesh(fireGeo, fireMat);
      fire.position.set(0, 0.35, 0.25);
      group.add(fire);

      return group;
    },
  },

  // --- NATURE ---
  {
    typeId: 'sakura_tree',
    name: 'Sakura Blossom Tree',
    category: 'nature',
    emoji: '🌸',
    defaultColor: '#f472b6',
    defaultScale: 1.1,
    description: 'Blooming cherry blossom tree with falling petals',
    buildMesh: (color) => {
      const group = new THREE.Group();
      // Trunk
      const trunkGeo = new THREE.CylinderGeometry(0.22, 0.35, 2.6, 10);
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3d2e, roughness: 0.9 });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 1.3;
      trunk.castShadow = true;
      group.add(trunk);

      // Foliage clouds
      const foliageMat = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.8,
      });

      const foliagePositions: [number, number, number, number][] = [
        [0, 2.8, 0, 1.2],
        [-0.7, 2.4, 0.5, 0.9],
        [0.7, 2.5, -0.4, 0.95],
        [0.4, 2.6, 0.6, 0.85],
        [-0.5, 2.5, -0.6, 0.8],
      ];

      foliagePositions.forEach(([x, y, z, s]) => {
        const cloudGeo = new THREE.DodecahedronGeometry(s, 1);
        const cloud = new THREE.Mesh(cloudGeo, foliageMat);
        cloud.position.set(x, y, z);
        cloud.castShadow = true;
        group.add(cloud);
      });

      return group;
    },
  },
  {
    typeId: 'rose_patch',
    name: 'Blooming Rose Bush',
    category: 'nature',
    emoji: '🌹',
    defaultColor: '#e11d48',
    defaultScale: 0.9,
    description: 'Vibrant cluster of red and velvet roses',
    buildMesh: (color) => {
      const group = new THREE.Group();
      const bushGeo = new THREE.SphereGeometry(0.5, 12, 10);
      const bushMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.9 });
      const bush = new THREE.Mesh(bushGeo, bushMat);
      bush.position.y = 0.35;
      group.add(bush);

      // Roses on surface
      const roseGeo = new THREE.SphereGeometry(0.12, 8, 8);
      const roseMat = new THREE.MeshStandardMaterial({ color, roughness: 0.5 });
      for (let i = 0; i < 6; i++) {
        const r = new THREE.Mesh(roseGeo, roseMat);
        const a = (i / 6) * Math.PI * 2;
        r.position.set(Math.cos(a) * 0.4, 0.4 + (i % 2) * 0.15, Math.sin(a) * 0.4);
        group.add(r);
      }

      return group;
    },
  },
  {
    typeId: 'crystal_fountain',
    name: 'Starlight Fountain',
    category: 'nature',
    emoji: '⛲',
    defaultColor: '#38bdf8',
    defaultScale: 1.0,
    description: 'Marble fountain with soothing glowing water',
    buildMesh: (color) => {
      const group = new THREE.Group();
      // Basin
      const basinGeo = new THREE.CylinderGeometry(1.6, 1.4, 0.5, 24);
      const basinMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4 });
      const basin = new THREE.Mesh(basinGeo, basinMat);
      basin.position.y = 0.25;
      group.add(basin);

      // Water surface
      const waterGeo = new THREE.CylinderGeometry(1.45, 1.45, 0.05, 24);
      const waterMat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.1,
        metalness: 0.8,
        emissive: color,
        emissiveIntensity: 0.3,
      });
      const water = new THREE.Mesh(waterGeo, waterMat);
      water.position.y = 0.45;
      group.add(water);

      // Center pillar
      const pilGeo = new THREE.CylinderGeometry(0.25, 0.35, 1.1, 16);
      const pil = new THREE.Mesh(pilGeo, basinMat);
      pil.position.y = 0.8;
      group.add(pil);

      return group;
    },
  },

  // --- LIGHTING ---
  {
    typeId: 'street_lantern',
    name: 'Vintage Street Lantern',
    category: 'lighting',
    emoji: '🏮',
    defaultColor: '#fef08a',
    defaultScale: 1.0,
    description: 'Warm street lamp illuminating evening strolls',
    buildMesh: (color) => {
      const group = new THREE.Group();
      const postGeo = new THREE.CylinderGeometry(0.08, 0.12, 2.8, 12);
      const postMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3 });
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.y = 1.4;
      group.add(post);

      const lanternGeo = new THREE.DodecahedronGeometry(0.3, 0);
      const lanternMat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 2.0,
      });
      const lantern = new THREE.Mesh(lanternGeo, lanternMat);
      lantern.position.y = 2.8;
      group.add(lantern);

      return group;
    },
  },
  {
    typeId: 'neon_heart_sign',
    name: 'Electric Neon Heart',
    category: 'lighting',
    emoji: '💓',
    defaultColor: '#ec4899',
    defaultScale: 0.9,
    description: 'Glowing wall neon light with your partner vibe',
    buildMesh: (color) => {
      const group = new THREE.Group();
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.bezierCurveTo(0, 0.4, -0.4, 0.8, -0.7, 0.4);
      shape.bezierCurveTo(-0.9, 0, 0, -0.8, 0, -1.0);
      shape.bezierCurveTo(0, -0.8, 0.9, 0, 0.7, 0.4);
      shape.bezierCurveTo(0.4, 0.8, 0, 0.4, 0, 0);

      const geo = new THREE.ShapeGeometry(shape);
      const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
      const heart = new THREE.Mesh(geo, mat);
      heart.position.y = 1.4;
      heart.scale.set(0.9, 0.9, 0.9);
      group.add(heart);

      return group;
    },
  },

  // --- PETS ---
  {
    typeId: 'cozy_cat',
    name: 'Cozy Calico Kitten',
    category: 'pets',
    emoji: '🐱',
    defaultColor: '#ea580c',
    defaultScale: 0.7,
    description: 'Sweet kitten that purrs and curls up by your feet',
    buildMesh: (color) => {
      const group = new THREE.Group();
      const bodyGeo = new THREE.SphereGeometry(0.3, 14, 12);
      bodyGeo.scale(1.2, 0.8, 0.8);
      const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
      const body = new THREE.Mesh(bodyGeo, mat);
      body.position.y = 0.25;
      group.add(body);

      // Head
      const headGeo = new THREE.SphereGeometry(0.22, 14, 12);
      const head = new THREE.Mesh(headGeo, mat);
      head.position.set(0.32, 0.38, 0);
      group.add(head);

      // Ears
      const earGeo = new THREE.ConeGeometry(0.08, 0.12, 4);
      const e1 = new THREE.Mesh(earGeo, mat);
      e1.position.set(0.32, 0.52, 0.12);
      const e2 = new THREE.Mesh(earGeo, mat);
      e2.position.set(0.32, 0.52, -0.12);
      group.add(e1, e2);

      // Tail
      const tailGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.4, 8);
      tailGeo.rotateZ(0.7);
      const tail = new THREE.Mesh(tailGeo, mat);
      tail.position.set(-0.35, 0.35, 0);
      group.add(tail);

      return group;
    },
  },
  {
    typeId: 'shiba_dog',
    name: 'Playful Shiba Puppy',
    category: 'pets',
    emoji: '🐕',
    defaultColor: '#d97706',
    defaultScale: 0.75,
    description: 'Loyal fluffy puppy that wags its tail for treats',
    buildMesh: (color) => {
      const group = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.75 });
      const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff });

      const bodyGeo = new THREE.CylinderGeometry(0.24, 0.26, 0.65, 12);
      bodyGeo.rotateZ(Math.PI / 2);
      const body = new THREE.Mesh(bodyGeo, mat);
      body.position.y = 0.38;
      group.add(body);

      const headGeo = new THREE.SphereGeometry(0.24, 14, 12);
      const head = new THREE.Mesh(headGeo, mat);
      head.position.set(0.38, 0.55, 0);
      group.add(head);

      const snoutGeo = new THREE.ConeGeometry(0.1, 0.18, 8);
      snoutGeo.rotateZ(-Math.PI / 2);
      const snout = new THREE.Mesh(snoutGeo, whiteMat);
      snout.position.set(0.58, 0.52, 0);
      group.add(snout);

      // 4 Legs
      const legGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.3, 8);
      const legPositions: [number, number, number][] = [
        [0.2, 0.15, 0.15],
        [0.2, 0.15, -0.15],
        [-0.2, 0.15, 0.15],
        [-0.2, 0.15, -0.15],
      ];
      legPositions.forEach(([x, y, z]) => {
        const leg = new THREE.Mesh(legGeo, whiteMat);
        leg.position.set(x, y, z);
        group.add(leg);
      });

      return group;
    },
  },

  // --- VEHICLES & LEISURE ---
  {
    typeId: 'swan_boat',
    name: 'Swan Love Boat',
    category: 'vehicles',
    emoji: '🦢',
    defaultColor: '#ffffff',
    defaultScale: 1.0,
    description: 'Scenic pedalo swan boat for sunset dates',
    buildMesh: (color) => {
      const group = new THREE.Group();
      const hullGeo = new THREE.BoxGeometry(2.2, 0.5, 1.4);
      const hullMat = new THREE.MeshStandardMaterial({ color, roughness: 0.3 });
      const hull = new THREE.Mesh(hullGeo, hullMat);
      hull.position.y = 0.25;
      group.add(hull);

      // Swan neck
      const neckGeo = new THREE.CylinderGeometry(0.12, 0.15, 1.1, 12);
      neckGeo.rotateZ(-0.3);
      const neck = new THREE.Mesh(neckGeo, hullMat);
      neck.position.set(0.85, 0.8, 0);
      group.add(neck);

      // Head & Beak
      const headGeo = new THREE.SphereGeometry(0.18, 12, 12);
      const head = new THREE.Mesh(headGeo, hullMat);
      head.position.set(1.0, 1.35, 0);
      group.add(head);

      const beakGeo = new THREE.ConeGeometry(0.08, 0.25, 8);
      beakGeo.rotateZ(-Math.PI / 2);
      const beakMat = new THREE.MeshStandardMaterial({ color: 0xf97316 });
      const beak = new THREE.Mesh(beakGeo, beakMat);
      beak.position.set(1.18, 1.35, 0);
      group.add(beak);

      return group;
    },
  },
];
