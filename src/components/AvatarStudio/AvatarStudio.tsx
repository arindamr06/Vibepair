'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { AvatarConfig, AvatarModel, DEFAULT_AVATAR_CONFIG_1 } from './AvatarMesh';
import { VoiceEffectProcessor, VoiceEffectType } from '@/lib/audioFx';
import { Sparkles, Mic, Volume2, Check, RefreshCw } from 'lucide-react';

interface AvatarStudioProps {
  initialConfig?: AvatarConfig;
  onSaveAvatar: (config: AvatarConfig) => void;
}

export const AvatarStudio: React.FC<AvatarStudioProps> = ({ initialConfig, onSaveAvatar }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const avatarModelRef = useRef<AvatarModel | null>(null);

  const [config, setConfig] = useState<AvatarConfig>(() => {
    if (initialConfig) return initialConfig;
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vibepair_my_avatar');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return DEFAULT_AVATAR_CONFIG_1;
  });

  const [activeTab, setActiveTab] = useState<'appearance' | 'outfit' | 'expression' | 'animation' | 'voice'>('appearance');
  const [selectedAnim, setSelectedAnim] = useState<string>('idle');
  const [isSavedFeedback, setIsSavedFeedback] = useState(false);

  // Audio testing
  const [isMicTesting, setIsMicTesting] = useState(false);
  const [selectedVoiceFx, setSelectedVoiceFx] = useState<VoiceEffectType>('none');
  const voiceProcessorRef = useRef<VoiceEffectProcessor | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  // Setup Three.js scene
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight || 480;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0e0918);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 50);
    camera.position.set(0, 1.3, 3.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    container.replaceChildren(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xfff0fa, 1.2);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffe6f5, 1.8);
    dirLight.position.set(2, 4, 3);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // Cyber Rim lights (neon pink & purple)
    const rimPink = new THREE.PointLight(0xec4899, 3, 10);
    rimPink.position.set(-2, 1.5, -1);
    scene.add(rimPink);

    const rimCyan = new THREE.PointLight(0xa855f7, 3, 10);
    rimCyan.position.set(2, 1, -1);
    scene.add(rimCyan);

    // Pedestal floor with glowing ring
    const floorGeo = new THREE.CylinderGeometry(1.2, 1.3, 0.1, 32);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x181028,
      roughness: 0.2,
      metalness: 0.8,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -0.05;
    floor.receiveShadow = true;
    scene.add(floor);

    const ringGeo = new THREE.RingGeometry(1.25, 1.32, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xec4899, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.01;
    scene.add(ring);

    // Avatar
    const model = new AvatarModel(config);
    avatarModelRef.current = model;
    scene.add(model.root);

    // Orbit/drag rotation
    let isDragging = false;
    let prevMouseX = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      prevMouseX = e.clientX;
      model.root.rotation.y += deltaX * 0.01;
    };
    const onMouseUp = () => {
      isDragging = false;
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDragging = true;
        prevMouseX = e.touches[0].clientX;
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging || e.touches.length === 0) return;
      const deltaX = e.touches[0].clientX - prevMouseX;
      prevMouseX = e.touches[0].clientX;
      model.root.rotation.y += deltaX * 0.012;
    };
    const onTouchEnd = () => {
      isDragging = false;
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    dom.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);

    // Render loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      model.update(delta);
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
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      dom.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  // Update avatar when config changes
  useEffect(() => {
    if (avatarModelRef.current) {
      avatarModelRef.current.applyConfig(config);
    }
  }, [config]);

  // Update animation
  useEffect(() => {
    if (avatarModelRef.current) {
      avatarModelRef.current.currentAnimation = selectedAnim as any;
    }
  }, [selectedAnim]);

  // Mic voice effect preview
  const toggleMicTest = async () => {
    if (isMicTesting) {
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(t => t.stop());
        micStreamRef.current = null;
      }
      if (voiceProcessorRef.current) {
        voiceProcessorRef.current.destroy();
        voiceProcessorRef.current = null;
      }
      setIsMicTesting(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = stream;
        const proc = new VoiceEffectProcessor();
        proc.init(stream);
        proc.applyEffect(selectedVoiceFx);
        voiceProcessorRef.current = proc;
        setIsMicTesting(true);
      } catch (e) {
        alert('Could not access microphone for live preview. Check browser permissions.');
      }
    }
  };

  const handleVoiceFxChange = (fx: VoiceEffectType) => {
    setSelectedVoiceFx(fx);
    if (voiceProcessorRef.current) {
      voiceProcessorRef.current.applyEffect(fx);
    }
  };

  const handleSave = () => {
    localStorage.setItem('vibepair_my_avatar', JSON.stringify(config));
    onSaveAvatar(config);
    setIsSavedFeedback(true);
    setTimeout(() => setIsSavedFeedback(false), 2200);
  };

  const randomize = () => {
    const hairStyles: AvatarConfig['hairStyle'][] = ['chic_bob', 'anime_spikes', 'long_flowing', 'cute_pigtails', 'wavy_messy', 'afro_puffs'];
    const outfits: AvatarConfig['outfitType'][] = ['cozy_hoodie', 'cyber_jacket', 'date_dress', 'cozy_pajamas', 'summer_tee'];
    const accessories: AvatarConfig['accessory'][] = ['none', 'cat_ears', 'angel_halo', 'glasses', 'headset', 'heart_earrings'];
    const expressions: AvatarConfig['expression'][] = ['smile', 'blush', 'wink', 'heart_eyes', 'sleepy', 'kissy'];
    const colors = ['#f472b6', '#a855f7', '#ec4899', '#38bdf8', '#fb7185', '#c084fc', '#06b6d4', '#e879f9'];

    setConfig(prev => ({
      ...prev,
      hairStyle: hairStyles[Math.floor(Math.random() * hairStyles.length)],
      hairColor: colors[Math.floor(Math.random() * colors.length)],
      outfitType: outfits[Math.floor(Math.random() * outfits.length)],
      outfitColor: colors[Math.floor(Math.random() * colors.length)],
      accentColor: colors[Math.floor(Math.random() * colors.length)],
      accessory: accessories[Math.floor(Math.random() * accessories.length)],
      expression: expressions[Math.floor(Math.random() * expressions.length)],
    }));
  };

  return (
    <div className="flex flex-col lg:flex-row h-full w-full bg-slate-950/80 rounded-2xl overflow-hidden border border-purple-500/20 backdrop-blur-xl shadow-2xl">
      {/* 3D Viewport Side */}
      <div className="relative flex-1 min-h-[380px] lg:min-h-full flex items-center justify-center bg-gradient-to-b from-purple-950/30 via-slate-950 to-pink-950/20">
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Viewport Overlay Controls */}
        <div className="absolute top-4 left-4 flex items-center space-x-2">
          <span className="px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase bg-purple-900/60 text-purple-200 border border-purple-400/30 backdrop-blur-md flex items-center gap-1.5 shadow-lg">
            <Sparkles className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
            3D Avatar Studio
          </span>
          <span className="text-xs text-purple-300/60 hidden sm:inline">Drag to rotate avatar</span>
        </div>

        <button
          onClick={randomize}
          title="Randomize look"
          className="absolute top-4 right-4 p-2.5 rounded-xl bg-purple-900/40 hover:bg-purple-800/60 text-purple-200 border border-purple-500/30 backdrop-blur-md transition-all hover:scale-105 active:scale-95 shadow-lg"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* Quick Animation Bar */}
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-center gap-1.5 p-1.5 rounded-2xl bg-black/60 backdrop-blur-md border border-purple-500/30 overflow-x-auto scrollbar-none shadow-xl">
          {[
            { id: 'idle', label: 'Idle 🌸' },
            { id: 'wave', label: 'Wave 👋' },
            { id: 'dance', label: 'Dance 💃' },
            { id: 'hug', label: 'Hug 🤗' },
            { id: 'kiss', label: 'Kiss 💋' },
            { id: 'hold_hands', label: 'Hands 🤝' },
            { id: 'sit', label: 'Sit 🛋️' },
          ].map(anim => (
            <button
              key={anim.id}
              onClick={() => setSelectedAnim(anim.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                selectedAnim === anim.id
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md shadow-pink-500/25 scale-105'
                  : 'text-purple-200 hover:bg-white/10'
              }`}
            >
              {anim.label}
            </button>
          ))}
        </div>
      </div>

      {/* Customization Options Side */}
      <div className="w-full lg:w-[420px] flex flex-col bg-slate-900/90 border-t lg:border-t-0 lg:border-l border-purple-500/20 p-5 overflow-y-auto">
        {/* Navigation Tabs */}
        <div className="flex border-b border-purple-500/20 pb-3 mb-4 gap-1 overflow-x-auto scrollbar-none">
          {[
            { id: 'appearance', label: 'Hair & Face' },
            { id: 'outfit', label: 'Fashion' },
            { id: 'expression', label: 'Mood' },
            { id: 'voice', label: 'Voice FX' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-purple-600/30 text-pink-300 border border-pink-500/40 shadow-sm'
                  : 'text-gray-400 hover:text-purple-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Hair & Face */}
        {activeTab === 'appearance' && (
          <div className="space-y-5">
            <div>
              <label className="text-xs uppercase font-bold tracking-wider text-purple-300 mb-2 block">Skin Complexion</label>
              <div className="flex gap-2 flex-wrap">
                {[
                  { name: 'Peach', color: '#ffd5bd' },
                  { name: 'Porcelain', color: '#ffe9dc' },
                  { name: 'Warm Tan', color: '#e5ab82' },
                  { name: 'Caramel', color: '#c78d5e' },
                  { name: 'Deep Cocoa', color: '#7a4e32' },
                  { name: 'Cosmic Violet', color: '#c4b5fd' },
                ].map(skin => (
                  <button
                    key={skin.name}
                    onClick={() => setConfig(prev => ({ ...prev, skinColor: skin.color }))}
                    style={{ backgroundColor: skin.color }}
                    className={`w-9 h-9 rounded-full border-2 transition-transform hover:scale-110 shadow-sm ${
                      config.skinColor === skin.color ? 'border-pink-500 ring-2 ring-pink-500/50 scale-110' : 'border-black/40'
                    }`}
                    title={skin.name}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs uppercase font-bold tracking-wider text-purple-300 mb-2 block">Hairstyle</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'cute_pigtails', label: 'Cute Buns 🎀' },
                  { id: 'anime_spikes', label: 'Anime Spikes ⚡' },
                  { id: 'long_flowing', label: 'Long Waves 🌊' },
                  { id: 'chic_bob', label: 'Chic Bob ✂️' },
                  { id: 'wavy_messy', label: 'Messy Bedhead 💤' },
                  { id: 'afro_puffs', label: 'Afro Crown 👑' },
                ].map(style => (
                  <button
                    key={style.id}
                    onClick={() => setConfig(prev => ({ ...prev, hairStyle: style.id as any }))}
                    className={`p-2.5 rounded-xl text-xs font-medium text-left border transition-all ${
                      config.hairStyle === style.id
                        ? 'bg-purple-950/80 border-pink-500 text-pink-300 shadow-sm'
                        : 'bg-black/30 border-purple-500/20 text-gray-300 hover:border-purple-400/40'
                    }`}
                  >
                    {style.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs uppercase font-bold tracking-wider text-purple-300 mb-2 block">Hair Dye</label>
              <div className="flex gap-2 flex-wrap">
                {['#f472b6', '#38bdf8', '#a855f7', '#fbbf24', '#22c55e', '#1e1b4b', '#f8fafc', '#ef4444'].map(c => (
                  <button
                    key={c}
                    onClick={() => setConfig(prev => ({ ...prev, hairColor: c }))}
                    style={{ backgroundColor: c }}
                    className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                      config.hairColor === c ? 'border-white ring-2 ring-pink-500 scale-110' : 'border-black/50'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs uppercase font-bold tracking-wider text-purple-300 mb-2 block">Eye Color</label>
              <div className="flex gap-2">
                {['#4f46e5', '#0284c7', '#059669', '#d97706', '#9333ea', '#111827'].map(c => (
                  <button
                    key={c}
                    onClick={() => setConfig(prev => ({ ...prev, eyeColor: c }))}
                    style={{ backgroundColor: c }}
                    className={`w-7 h-7 rounded-full border transition-transform hover:scale-110 ${
                      config.eyeColor === c ? 'border-white ring-2 ring-pink-500 scale-110' : 'border-black/40'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Outfits & Accessories */}
        {activeTab === 'outfit' && (
          <div className="space-y-5">
            <div>
              <label className="text-xs uppercase font-bold tracking-wider text-purple-300 mb-2 block">Wardrobe Style</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'cozy_hoodie', label: 'Cozy Oversized Hoodie' },
                  { id: 'cyber_jacket', label: 'Cyberpunk Neon Jacket' },
                  { id: 'date_dress', label: 'Romantic Date Night' },
                  { id: 'cozy_pajamas', label: 'Matching Silk Pajamas' },
                  { id: 'summer_tee', label: 'Breeze Summer Tee' },
                ].map(outfit => (
                  <button
                    key={outfit.id}
                    onClick={() => setConfig(prev => ({ ...prev, outfitType: outfit.id as any }))}
                    className={`p-2.5 rounded-xl text-xs font-medium text-left border transition-all ${
                      config.outfitType === outfit.id
                        ? 'bg-purple-950/80 border-pink-500 text-pink-300 shadow-sm'
                        : 'bg-black/30 border-purple-500/20 text-gray-300 hover:border-purple-400/40'
                    }`}
                  >
                    {outfit.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs uppercase font-bold tracking-wider text-purple-300 mb-2 block">Outfit Main Hue</label>
              <div className="flex gap-2 flex-wrap">
                {['#a855f7', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#0f172a', '#e2e8f0'].map(c => (
                  <button
                    key={c}
                    onClick={() => setConfig(prev => ({ ...prev, outfitColor: c }))}
                    style={{ backgroundColor: c }}
                    className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                      config.outfitColor === c ? 'border-white ring-2 ring-pink-500 scale-110' : 'border-black/50'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs uppercase font-bold tracking-wider text-purple-300 mb-2 block">Accent Highlights</label>
              <div className="flex gap-2 flex-wrap">
                {['#ec4899', '#06b6d4', '#eab308', '#8b5cf6', '#14b8a6', '#ffffff'].map(c => (
                  <button
                    key={c}
                    onClick={() => setConfig(prev => ({ ...prev, accentColor: c }))}
                    style={{ backgroundColor: c }}
                    className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                      config.accentColor === c ? 'border-white ring-2 ring-pink-500 scale-110' : 'border-black/50'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs uppercase font-bold tracking-wider text-purple-300 mb-2 block">Accessories</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'none', label: 'None' },
                  { id: 'cat_ears', label: 'Cat Ears 🐱' },
                  { id: 'angel_halo', label: 'Angel Halo 😇' },
                  { id: 'glasses', label: 'Spectacles 👓' },
                  { id: 'headset', label: 'Headset 🎧' },
                  { id: 'heart_earrings', label: 'Earrings 💖' },
                ].map(acc => (
                  <button
                    key={acc.id}
                    onClick={() => setConfig(prev => ({ ...prev, accessory: acc.id as any }))}
                    className={`p-2 rounded-xl text-xs font-medium text-center border transition-all ${
                      config.accessory === acc.id
                        ? 'bg-pink-950/60 border-pink-500 text-pink-300'
                        : 'bg-black/30 border-purple-500/20 text-gray-300'
                    }`}
                  >
                    {acc.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Expression / Mood */}
        {activeTab === 'expression' && (
          <div className="space-y-4">
            <label className="text-xs uppercase font-bold tracking-wider text-purple-300 block">Default Avatar Expression</label>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { id: 'smile', label: 'Sweet Smile 😊', desc: 'Warm and gentle' },
                { id: 'blush', label: 'Shy Blush 😳', desc: 'Heart fluttering pink' },
                { id: 'wink', label: 'Playful Wink 😉', desc: 'Teasing and cute' },
                { id: 'heart_eyes', label: 'Adoring Love 🥰', desc: 'Obsessed with partner' },
                { id: 'kissy', label: 'Kissy Face 😚', desc: 'Ready for smooch' },
                { id: 'sleepy', label: 'Sleepy Cuddles 😴', desc: 'Cozy and relaxed' },
              ].map(expr => (
                <button
                  key={expr.id}
                  onClick={() => setConfig(prev => ({ ...prev, expression: expr.id as any }))}
                  className={`p-3 rounded-xl text-left border transition-all ${
                    config.expression === expr.id
                      ? 'bg-purple-950/80 border-pink-500 text-pink-300 shadow-md ring-1 ring-pink-500'
                      : 'bg-black/30 border-purple-500/20 text-gray-300 hover:border-purple-400/40'
                  }`}
                >
                  <div className="font-semibold text-xs">{expr.label}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{expr.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Voice FX */}
        {activeTab === 'voice' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-pink-300 flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-pink-400" /> Live Microphone Voice FX
                </span>
                <button
                  onClick={toggleMicTest}
                  className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-all ${
                    isMicTesting
                      ? 'bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse'
                      : 'bg-pink-600 hover:bg-pink-500 text-white shadow-md shadow-pink-500/30'
                  }`}
                >
                  {isMicTesting ? 'Stop Test' : 'Test My Voice'}
                </button>
              </div>
              <p className="text-[11px] text-purple-200/70">
                Alter your voice in real-time during live avatar calls with custom Web Audio DSP filters!
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'none', label: 'Natural Voice 🎙️', desc: 'No modification' },
                { id: 'cute', label: 'Cute & Bright 🐣', desc: 'High harmonics boost' },
                { id: 'deep', label: 'Deep & Cozy 🐻', desc: 'Warm low-end bass' },
                { id: 'robotic', label: 'Cyber Android 🤖', desc: 'Ring modulated wave' },
                { id: 'cosmic', label: 'Starlight Echo ✨', desc: 'Dreamy stereo delay' },
                { id: 'radio', label: 'Vintage Radio 📻', desc: 'Walkie-talkie lo-fi' },
              ].map(fx => (
                <button
                  key={fx.id}
                  onClick={() => handleVoiceFxChange(fx.id as VoiceEffectType)}
                  className={`p-3 rounded-xl text-left border transition-all ${
                    selectedVoiceFx === fx.id
                      ? 'bg-pink-950/70 border-pink-500 text-pink-200 ring-1 ring-pink-500'
                      : 'bg-black/30 border-purple-500/20 text-gray-300 hover:border-purple-400/30'
                  }`}
                >
                  <div className="text-xs font-semibold">{fx.label}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{fx.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Save & Broadcast Button */}
        <div className="mt-auto pt-5 border-t border-purple-500/20">
          <button
            onClick={handleSave}
            className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 ${
              isSavedFeedback
                ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                : 'bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 text-white shadow-pink-500/30 hover:shadow-pink-500/50 hover:brightness-110'
            }`}
          >
            {isSavedFeedback ? (
              <>
                <Check className="w-4 h-4" />
                Avatar Synced to Partner!
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Save & Update In-Game Avatar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
