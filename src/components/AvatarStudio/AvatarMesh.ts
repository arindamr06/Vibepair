/**
 * VibePair Procedural 3D Avatar System
 * Generates customizable stylized low-poly cute 3D characters with hierarchical skeleton joints,
 * expressive faces, modular accessories, and dynamic procedural animations in Three.js.
 */

import * as THREE from 'three';

export interface AvatarConfig {
  skinColor: string;
  hairStyle: 'chic_bob' | 'anime_spikes' | 'long_flowing' | 'cute_pigtails' | 'wavy_messy' | 'afro_puffs';
  hairColor: string;
  outfitType: 'cozy_hoodie' | 'cyber_jacket' | 'date_dress' | 'cozy_pajamas' | 'summer_tee';
  outfitColor: string;
  accentColor: string;
  eyeColor: string;
  accessory: 'none' | 'cat_ears' | 'angel_halo' | 'glasses' | 'headset' | 'heart_earrings';
  expression: 'smile' | 'blush' | 'wink' | 'heart_eyes' | 'sleepy' | 'kissy';
}

export const DEFAULT_AVATAR_CONFIG_1: AvatarConfig = {
  skinColor: '#ffd5bd',
  hairStyle: 'cute_pigtails',
  hairColor: '#f472b6',
  outfitType: 'cozy_hoodie',
  outfitColor: '#a855f7',
  accentColor: '#ec4899',
  eyeColor: '#4f46e5',
  accessory: 'cat_ears',
  expression: 'smile',
};

export const DEFAULT_AVATAR_CONFIG_2: AvatarConfig = {
  skinColor: '#fce0d1',
  hairStyle: 'anime_spikes',
  hairColor: '#38bdf8',
  outfitType: 'cyber_jacket',
  outfitColor: '#0ea5e9',
  accentColor: '#818cf8',
  eyeColor: '#0284c7',
  accessory: 'headset',
  expression: 'wink',
};

export class AvatarModel {
  public root: THREE.Group;
  public config: AvatarConfig;

  // Joint references for procedural animation
  private head!: THREE.Group;
  private torso!: THREE.Mesh;
  private leftArm!: THREE.Group;
  private rightArm!: THREE.Group;
  private leftLeg!: THREE.Group;
  private rightLeg!: THREE.Group;
  private leftEye!: THREE.Mesh;
  private rightEye!: THREE.Mesh;
  private blushLeft!: THREE.Mesh;
  private blushRight!: THREE.Mesh;
  private accessoryGroup!: THREE.Group;
  private hairGroup!: THREE.Group;

  // Materials
  private skinMat!: THREE.MeshStandardMaterial;
  private hairMat!: THREE.MeshStandardMaterial;
  private outfitMat!: THREE.MeshStandardMaterial;
  private accentMat!: THREE.MeshStandardMaterial;
  private eyeMat!: THREE.MeshStandardMaterial;
  private whiteMat!: THREE.MeshStandardMaterial;
  private blushMat!: THREE.MeshBasicMaterial;
  private darkMat!: THREE.MeshStandardMaterial;

  public currentAnimation: 'idle' | 'walk' | 'run' | 'sit' | 'dance' | 'hug' | 'kiss' | 'wave' | 'hold_hands' = 'idle';
  private animTime: number = 0;

  constructor(config: AvatarConfig = DEFAULT_AVATAR_CONFIG_1) {
    this.config = { ...config };
    this.root = new THREE.Group();
    this.buildMaterials();
    this.buildHierarchy();
    this.applyConfig(this.config);
  }

  private buildMaterials() {
    this.skinMat = new THREE.MeshStandardMaterial({
      color: this.config.skinColor,
      roughness: 0.65,
      metalness: 0.05,
    });
    this.hairMat = new THREE.MeshStandardMaterial({
      color: this.config.hairColor,
      roughness: 0.5,
      metalness: 0.1,
    });
    this.outfitMat = new THREE.MeshStandardMaterial({
      color: this.config.outfitColor,
      roughness: 0.7,
      metalness: 0.15,
    });
    this.accentMat = new THREE.MeshStandardMaterial({
      color: this.config.accentColor,
      roughness: 0.4,
      metalness: 0.3,
    });
    this.eyeMat = new THREE.MeshStandardMaterial({
      color: this.config.eyeColor,
      roughness: 0.2,
    });
    this.whiteMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
    });
    this.blushMat = new THREE.MeshBasicMaterial({
      color: 0xff70a0,
      transparent: true,
      opacity: 0.5,
    });
    this.darkMat = new THREE.MeshStandardMaterial({
      color: 0x22222b,
      roughness: 0.8,
    });
  }

  private buildHierarchy() {
    // Center of avatar is at y = 0 (feet touch ground)
    // Total height approx 2.0 units

    // --- PELVIS & TORSO ---
    const torsoGeo = new THREE.CylinderGeometry(0.3, 0.24, 0.65, 16);
    this.torso = new THREE.Mesh(torsoGeo, this.outfitMat);
    this.torso.position.y = 1.05;
    this.torso.castShadow = true;
    this.root.add(this.torso);

    // Belt / accent trim
    const beltGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.08, 16);
    const belt = new THREE.Mesh(beltGeo, this.accentMat);
    belt.position.y = -0.28;
    this.torso.add(belt);

    // --- HEAD GROUP ---
    this.head = new THREE.Group();
    this.head.position.set(0, 0.48, 0);
    this.torso.add(this.head);

    // Head base (cute rounded head)
    const headGeo = new THREE.SphereGeometry(0.35, 24, 20);
    headGeo.scale(1, 1.05, 1);
    const headMesh = new THREE.Mesh(headGeo, this.skinMat);
    headMesh.castShadow = true;
    this.head.add(headMesh);

    // Eyes
    const eyeWhiteGeo = new THREE.SphereGeometry(0.08, 16, 12);
    eyeWhiteGeo.scale(0.8, 1, 0.4);

    const leftEyeWhite = new THREE.Mesh(eyeWhiteGeo, this.whiteMat);
    leftEyeWhite.position.set(-0.13, 0.05, 0.3);
    this.head.add(leftEyeWhite);

    const rightEyeWhite = new THREE.Mesh(eyeWhiteGeo, this.whiteMat);
    rightEyeWhite.position.set(0.13, 0.05, 0.3);
    this.head.add(rightEyeWhite);

    // Pupils
    const pupilGeo = new THREE.SphereGeometry(0.045, 12, 12);
    this.leftEye = new THREE.Mesh(pupilGeo, this.eyeMat);
    this.leftEye.position.set(-0.13, 0.05, 0.33);
    this.head.add(this.leftEye);

    this.rightEye = new THREE.Mesh(pupilGeo, this.eyeMat);
    this.rightEye.position.set(0.13, 0.05, 0.33);
    this.head.add(this.rightEye);

    // Blush spots
    const blushGeo = new THREE.CircleGeometry(0.065, 16);
    this.blushLeft = new THREE.Mesh(blushGeo, this.blushMat);
    this.blushLeft.position.set(-0.18, -0.06, 0.32);
    this.blushLeft.rotation.y = -0.3;
    this.head.add(this.blushLeft);

    this.blushRight = new THREE.Mesh(blushGeo, this.blushMat);
    this.blushRight.position.set(0.18, -0.06, 0.32);
    this.blushRight.rotation.y = 0.3;
    this.head.add(this.blushRight);

    // Cute smile / mouth
    const smileGeo = new THREE.TorusGeometry(0.05, 0.015, 8, 16, Math.PI);
    const smile = new THREE.Mesh(smileGeo, this.darkMat);
    smile.position.set(0, -0.12, 0.34);
    smile.rotation.x = Math.PI;
    this.head.add(smile);

    // Hair container
    this.hairGroup = new THREE.Group();
    this.head.add(this.hairGroup);

    // Accessory container
    this.accessoryGroup = new THREE.Group();
    this.head.add(this.accessoryGroup);

    // --- ARMS ---
    // Left Arm Pivot at shoulder
    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.38, 0.22, 0);
    this.torso.add(this.leftArm);

    const armGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.5, 12);
    armGeo.translate(0, -0.22, 0);
    const leftArmMesh = new THREE.Mesh(armGeo, this.outfitMat);
    leftArmMesh.castShadow = true;
    this.leftArm.add(leftArmMesh);

    // Hand
    const handGeo = new THREE.SphereGeometry(0.08, 12, 12);
    const leftHand = new THREE.Mesh(handGeo, this.skinMat);
    leftHand.position.set(0, -0.48, 0);
    this.leftArm.add(leftHand);

    // Right Arm Pivot
    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.38, 0.22, 0);
    this.torso.add(this.rightArm);

    const rightArmMesh = new THREE.Mesh(armGeo, this.outfitMat);
    rightArmMesh.castShadow = true;
    this.rightArm.add(rightArmMesh);

    const rightHand = new THREE.Mesh(handGeo, this.skinMat);
    rightHand.position.set(0, -0.48, 0);
    this.rightArm.add(rightHand);

    // --- LEGS ---
    const legGeo = new THREE.CylinderGeometry(0.1, 0.08, 0.65, 12);
    legGeo.translate(0, -0.32, 0);

    const footGeo = new THREE.BoxGeometry(0.14, 0.1, 0.24);
    footGeo.translate(0, -0.05, 0.05);

    // Left Leg
    this.leftLeg = new THREE.Group();
    this.leftLeg.position.set(-0.16, -0.32, 0);
    this.torso.add(this.leftLeg);

    const leftLegMesh = new THREE.Mesh(legGeo, this.darkMat);
    leftLegMesh.castShadow = true;
    this.leftLeg.add(leftLegMesh);

    const leftShoe = new THREE.Mesh(footGeo, this.accentMat);
    leftShoe.position.set(0, -0.65, 0);
    leftShoe.castShadow = true;
    this.leftLeg.add(leftShoe);

    // Right Leg
    this.rightLeg = new THREE.Group();
    this.rightLeg.position.set(0.16, -0.32, 0);
    this.torso.add(this.rightLeg);

    const rightLegMesh = new THREE.Mesh(legGeo, this.darkMat);
    rightLegMesh.castShadow = true;
    this.rightLeg.add(rightLegMesh);

    const rightShoe = new THREE.Mesh(footGeo, this.accentMat);
    rightShoe.position.set(0, -0.65, 0);
    rightShoe.castShadow = true;
    this.rightLeg.add(rightShoe);
  }

  public applyConfig(config: Partial<AvatarConfig>) {
    this.config = { ...this.config, ...config };

    this.skinMat.color.set(this.config.skinColor);
    this.hairMat.color.set(this.config.hairColor);
    this.outfitMat.color.set(this.config.outfitColor);
    this.accentMat.color.set(this.config.accentColor);
    this.eyeMat.color.set(this.config.eyeColor);

    this.rebuildHair();
    this.rebuildAccessories();
    this.applyExpression();
  }

  private rebuildHair() {
    // Clear previous hair meshes
    while (this.hairGroup.children.length > 0) {
      this.hairGroup.remove(this.hairGroup.children[0]);
    }

    const style = this.config.hairStyle;

    // Hair cap
    const capGeo = new THREE.SphereGeometry(0.38, 18, 16, 0, Math.PI * 2, 0, Math.PI * 0.65);
    const cap = new THREE.Mesh(capGeo, this.hairMat);
    cap.position.y = 0.05;
    this.hairGroup.add(cap);

    if (style === 'cute_pigtails') {
      // Two cute side puff / buns
      const bunGeo = new THREE.SphereGeometry(0.18, 14, 14);
      const leftBun = new THREE.Mesh(bunGeo, this.hairMat);
      leftBun.position.set(-0.38, 0.28, -0.05);
      const rightBun = new THREE.Mesh(bunGeo, this.hairMat);
      rightBun.position.set(0.38, 0.28, -0.05);

      // Cute ribbons
      const ribbonGeo = new THREE.TorusGeometry(0.14, 0.03, 8, 16);
      const ribbonL = new THREE.Mesh(ribbonGeo, this.accentMat);
      ribbonL.position.copy(leftBun.position);
      ribbonL.rotation.y = Math.PI / 2;
      const ribbonR = new THREE.Mesh(ribbonGeo, this.accentMat);
      ribbonR.position.copy(rightBun.position);
      ribbonR.rotation.y = Math.PI / 2;

      this.hairGroup.add(leftBun, rightBun, ribbonL, ribbonR);
    } else if (style === 'anime_spikes') {
      // Cool spiked tufts
      const coneGeo = new THREE.ConeGeometry(0.1, 0.35, 6);
      for (let i = 0; i < 7; i++) {
        const spike = new THREE.Mesh(coneGeo, this.hairMat);
        const angle = (i / 6 - 0.5) * 1.6;
        spike.position.set(Math.sin(angle) * 0.32, 0.32 + Math.cos(angle) * 0.08, Math.cos(angle) * 0.15);
        spike.rotation.z = -angle * 0.6;
        spike.rotation.x = -0.4;
        this.hairGroup.add(spike);
      }
    } else if (style === 'long_flowing') {
      // Flowing strands down back and sides
      const strandGeo = new THREE.CylinderGeometry(0.12, 0.05, 0.75, 10);
      const leftStrand = new THREE.Mesh(strandGeo, this.hairMat);
      leftStrand.position.set(-0.25, -0.2, 0.05);
      leftStrand.rotation.z = -0.15;

      const rightStrand = new THREE.Mesh(strandGeo, this.hairMat);
      rightStrand.position.set(0.25, -0.2, 0.05);
      rightStrand.rotation.z = 0.15;

      const backGeo = new THREE.BoxGeometry(0.5, 0.75, 0.15);
      const backHair = new THREE.Mesh(backGeo, this.hairMat);
      backHair.position.set(0, -0.2, -0.25);

      this.hairGroup.add(leftStrand, rightStrand, backHair);
    } else if (style === 'chic_bob') {
      const bobGeo = new THREE.CylinderGeometry(0.42, 0.44, 0.4, 16);
      const bob = new THREE.Mesh(bobGeo, this.hairMat);
      bob.position.set(0, 0.02, -0.05);
      this.hairGroup.add(bob);
    } else if (style === 'afro_puffs') {
      const afroGeo = new THREE.SphereGeometry(0.46, 16, 16);
      const afro = new THREE.Mesh(afroGeo, this.hairMat);
      afro.position.set(0, 0.18, 0);
      this.hairGroup.add(afro);
    } else {
      // Wavy messy
      const lumpGeo = new THREE.DodecahedronGeometry(0.2, 0);
      for (let i = 0; i < 5; i++) {
        const lump = new THREE.Mesh(lumpGeo, this.hairMat);
        lump.position.set((Math.random() - 0.5) * 0.3, 0.28 + Math.random() * 0.1, (Math.random() - 0.5) * 0.3);
        lump.scale.setScalar(0.9 + Math.random() * 0.3);
        this.hairGroup.add(lump);
      }
    }
  }

  private rebuildAccessories() {
    while (this.accessoryGroup.children.length > 0) {
      this.accessoryGroup.remove(this.accessoryGroup.children[0]);
    }

    const acc = this.config.accessory;

    if (acc === 'cat_ears') {
      const earGeo = new THREE.ConeGeometry(0.12, 0.22, 4);
      const leftEar = new THREE.Mesh(earGeo, this.accentMat);
      leftEar.position.set(-0.25, 0.45, 0);
      leftEar.rotation.z = -0.3;

      const rightEar = new THREE.Mesh(earGeo, this.accentMat);
      rightEar.position.set(0.25, 0.45, 0);
      rightEar.rotation.z = 0.3;

      this.accessoryGroup.add(leftEar, rightEar);
    } else if (acc === 'angel_halo') {
      const haloGeo = new THREE.TorusGeometry(0.3, 0.03, 8, 24);
      const haloMat = new THREE.MeshStandardMaterial({
        color: 0xffea00,
        emissive: 0xffea00,
        emissiveIntensity: 0.8,
      });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.position.set(0, 0.62, 0);
      halo.rotation.x = Math.PI / 2;
      this.accessoryGroup.add(halo);
    } else if (acc === 'glasses') {
      const frameGeo = new THREE.TorusGeometry(0.1, 0.015, 6, 16);
      const frameL = new THREE.Mesh(frameGeo, this.accentMat);
      frameL.position.set(-0.13, 0.05, 0.36);

      const frameR = new THREE.Mesh(frameGeo, this.accentMat);
      frameR.position.set(0.13, 0.05, 0.36);

      const bridgeGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.08);
      const bridge = new THREE.Mesh(bridgeGeo, this.accentMat);
      bridge.rotation.z = Math.PI / 2;
      bridge.position.set(0, 0.05, 0.36);

      this.accessoryGroup.add(frameL, frameR, bridge);
    } else if (acc === 'headset') {
      const bandGeo = new THREE.TorusGeometry(0.4, 0.035, 8, 20, Math.PI);
      const band = new THREE.Mesh(bandGeo, this.accentMat);
      band.position.set(0, 0.15, 0);
      band.rotation.z = Math.PI;

      const cupGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.1, 12);
      cupGeo.rotateZ(Math.PI / 2);
      const cupL = new THREE.Mesh(cupGeo, this.outfitMat);
      cupL.position.set(-0.4, 0.15, 0);
      const cupR = new THREE.Mesh(cupGeo, this.outfitMat);
      cupR.position.set(0.4, 0.15, 0);

      this.accessoryGroup.add(band, cupL, cupR);
    } else if (acc === 'heart_earrings') {
      const heartShape = new THREE.Shape();
      heartShape.moveTo(0, 0);
      heartShape.bezierCurveTo(0, 0.05, -0.05, 0.1, -0.08, 0.05);
      heartShape.bezierCurveTo(-0.1, 0, 0, -0.1, 0, -0.12);
      heartShape.bezierCurveTo(0, -0.1, 0.1, 0, 0.08, 0.05);
      heartShape.bezierCurveTo(0.05, 0.1, 0, 0.05, 0, 0);

      const heartGeo = new THREE.ShapeGeometry(heartShape);
      const heartMat = new THREE.MeshBasicMaterial({ color: 0xff2a6d, side: THREE.DoubleSide });

      const eL = new THREE.Mesh(heartGeo, heartMat);
      eL.position.set(-0.38, -0.1, 0.05);
      eL.scale.setScalar(0.7);

      const eR = new THREE.Mesh(heartGeo, heartMat);
      eR.position.set(0.38, -0.1, 0.05);
      eR.scale.setScalar(0.7);

      this.accessoryGroup.add(eL, eR);
    }
  }

  private applyExpression() {
    const expr = this.config.expression;
    if (expr === 'blush') {
      this.blushMat.opacity = 0.9;
      this.blushLeft.scale.setScalar(1.4);
      this.blushRight.scale.setScalar(1.4);
    } else {
      this.blushMat.opacity = 0.45;
      this.blushLeft.scale.setScalar(1.0);
      this.blushRight.scale.setScalar(1.0);
    }

    if (expr === 'wink') {
      this.rightEye.scale.set(1, 0.2, 1);
      this.leftEye.scale.set(1, 1, 1);
    } else if (expr === 'sleepy') {
      this.leftEye.scale.set(1, 0.2, 1);
      this.rightEye.scale.set(1, 0.2, 1);
    } else {
      this.leftEye.scale.set(1, 1, 1);
      this.rightEye.scale.set(1, 1, 1);
    }
  }

  /**
   * Procedural skeletal animation tick
   */
  public update(delta: number) {
    this.animTime += delta;
    const t = this.animTime;

    switch (this.currentAnimation) {
      case 'walk': {
        const speed = 7.5;
        const angle = Math.sin(t * speed) * 0.55;

        this.leftLeg.rotation.x = angle;
        this.rightLeg.rotation.x = -angle;

        this.leftArm.rotation.x = -angle * 0.75;
        this.rightArm.rotation.x = angle * 0.75;
        this.leftArm.rotation.z = -0.15;
        this.rightArm.rotation.z = 0.15;

        this.torso.position.y = 1.05 + Math.abs(Math.sin(t * speed)) * 0.05;
        this.head.rotation.y = Math.sin(t * (speed / 2)) * 0.08;
        break;
      }

      case 'run': {
        const speed = 12.0;
        const angle = Math.sin(t * speed) * 0.9;

        this.leftLeg.rotation.x = angle;
        this.rightLeg.rotation.x = -angle;

        this.leftArm.rotation.x = -angle * 1.1;
        this.rightArm.rotation.x = angle * 1.1;
        this.leftArm.rotation.z = -0.3;
        this.rightArm.rotation.z = 0.3;

        this.torso.position.y = 1.05 + Math.abs(Math.sin(t * speed)) * 0.12;
        this.torso.rotation.x = 0.2;
        break;
      }

      case 'sit': {
        this.torso.position.y = 0.65;
        this.torso.rotation.x = 0;
        this.leftLeg.rotation.x = -Math.PI / 2;
        this.rightLeg.rotation.x = -Math.PI / 2;
        this.leftArm.rotation.x = -Math.PI / 4;
        this.rightArm.rotation.x = -Math.PI / 4;
        this.leftArm.rotation.z = -0.1;
        this.rightArm.rotation.z = 0.1;
        break;
      }

      case 'dance': {
        const speed = 6.0;
        this.torso.position.y = 1.05 + Math.abs(Math.sin(t * speed)) * 0.1;
        this.torso.rotation.z = Math.sin(t * (speed / 2)) * 0.15;
        this.head.rotation.z = -Math.sin(t * (speed / 2)) * 0.2;

        // Upward celebratory arm waves
        this.leftArm.rotation.x = 0;
        this.leftArm.rotation.z = -2.2 + Math.sin(t * speed) * 0.35;
        this.rightArm.rotation.x = 0;
        this.rightArm.rotation.z = 2.2 - Math.cos(t * speed) * 0.35;

        this.leftLeg.rotation.x = Math.sin(t * speed) * 0.25;
        this.rightLeg.rotation.x = -Math.sin(t * speed) * 0.25;
        break;
      }

      case 'hug': {
        // Leaning in, arms wrapped forward
        this.torso.rotation.x = 0.15;
        this.torso.position.y = 1.05;
        this.leftArm.rotation.x = -1.4;
        this.leftArm.rotation.z = 0.35;
        this.rightArm.rotation.x = -1.4;
        this.rightArm.rotation.z = -0.35;
        this.head.rotation.x = 0.1;
        this.head.rotation.z = 0.1;
        this.leftLeg.rotation.x = 0;
        this.rightLeg.rotation.x = 0;
        break;
      }

      case 'kiss': {
        // Leaning forward lovingly, eyes tilted
        this.torso.rotation.x = 0.22;
        this.head.rotation.x = -0.15;
        this.head.rotation.z = 0.15;
        this.leftArm.rotation.x = -0.8;
        this.leftArm.rotation.z = 0.25;
        this.rightArm.rotation.x = -0.8;
        this.rightArm.rotation.z = -0.25;
        this.leftLeg.rotation.x = 0;
        this.rightLeg.rotation.x = 0;
        break;
      }

      case 'hold_hands': {
        this.torso.rotation.x = 0;
        this.torso.position.y = 1.05 + Math.sin(t * 2) * 0.02;
        // Extend one arm sideways to clasp partner's hand
        this.rightArm.rotation.x = -0.2;
        this.rightArm.rotation.z = 0.65;
        this.leftArm.rotation.x = 0;
        this.leftArm.rotation.z = -0.15;
        this.leftLeg.rotation.x = 0;
        this.rightLeg.rotation.x = 0;
        break;
      }

      case 'wave': {
        this.torso.rotation.x = 0;
        this.leftArm.rotation.x = 0;
        this.leftArm.rotation.z = -0.15;

        // Wave right hand enthusiastically
        this.rightArm.rotation.x = 0;
        this.rightArm.rotation.z = 2.4;
        this.rightArm.rotation.y = Math.sin(t * 10) * 0.45;
        this.head.rotation.y = Math.sin(t * 3) * 0.15;
        break;
      }

      case 'idle':
      default: {
        // Gentle breathing and slight head tilt
        const breath = Math.sin(t * 2.2) * 0.025;
        this.torso.position.y = 1.05 + breath;
        this.torso.rotation.x = 0;
        this.torso.rotation.z = 0;

        this.head.rotation.y = Math.sin(t * 0.8) * 0.08;
        this.head.rotation.z = Math.sin(t * 0.6) * 0.03;

        this.leftArm.rotation.x = 0;
        this.leftArm.rotation.z = -0.12 + breath;
        this.rightArm.rotation.x = 0;
        this.rightArm.rotation.z = 0.12 - breath;

        this.leftLeg.rotation.x = 0;
        this.rightLeg.rotation.x = 0;
        break;
      }
    }
  }
}
