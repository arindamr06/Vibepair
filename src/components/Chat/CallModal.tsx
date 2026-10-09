'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { AvatarConfig, AvatarModel, DEFAULT_AVATAR_CONFIG_1, DEFAULT_AVATAR_CONFIG_2 } from '../AvatarStudio/AvatarMesh';
import { VoiceEffectProcessor, VoiceEffectType } from '@/lib/audioFx';
import { MultiplayerClient } from '@/lib/multiplayer';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Smile,
  ShieldCheck,
  Monitor,
  Wand2,
} from 'lucide-react';

interface CallModalProps {
  callType: 'voice' | 'video' | 'avatar';
  partnerName: string;
  multiplayer: MultiplayerClient;
  myAvatarConfig: AvatarConfig;
  partnerAvatarConfig?: AvatarConfig;
  onClose: () => void;
}

export const CallModal: React.FC<CallModalProps> = ({
  callType: initialCallType,
  partnerName,
  multiplayer,
  myAvatarConfig,
  partnerAvatarConfig,
  onClose,
}) => {
  const [mode, setMode] = useState<'video' | 'avatar'>(initialCallType === 'avatar' ? 'avatar' : 'video');
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(initialCallType === 'voice');
  const [activeVoiceFx, setActiveVoiceFx] = useState<VoiceEffectType>('none');
  const [fxMenuOpen, setFxMenuOpen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const voiceProcRef = useRef<VoiceEffectProcessor | null>(null);

  // Avatar 3D Canvas in call
  const avatarMountRef = useRef<HTMLDivElement>(null);
  const avatarModelRef = useRef<AvatarModel | null>(null);

  // Call timer
  useEffect(() => {
    const timer = setInterval(() => setCallDuration(d => d + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // WebRTC Media Setup
  useEffect(() => {
    let stream: MediaStream | null = null;

    async function initMedia() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: !isVideoMuted,
          audio: true,
        });
        localStreamRef.current = stream;

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Initialize voice DSP processor
        const proc = new VoiceEffectProcessor();
        proc.init(stream);
        voiceProcRef.current = proc;
      } catch (err) {
        console.warn('Camera/Mic permission unavailable or simulated:', err);
      }
    }

    initMedia();

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (voiceProcRef.current) {
        voiceProcRef.current.destroy();
      }
    };
  }, []);

  // 3D Avatar mode renderer
  useEffect(() => {
    if (mode !== 'avatar' || !avatarMountRef.current) return;
    const container = avatarMountRef.current;
    const w = container.clientWidth || 360;
    const h = container.clientHeight || 360;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0e0719);

    const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 50);
    camera.position.set(0, 1.4, 2.8);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    container.replaceChildren(renderer.domElement);

    const amb = new THREE.AmbientLight(0xfff0fa, 1.4);
    scene.add(amb);

    const pinkLight = new THREE.PointLight(0xec4899, 3, 10);
    pinkLight.position.set(-2, 2, 2);
    scene.add(pinkLight);

    const cyanLight = new THREE.PointLight(0x38bdf8, 2.5, 10);
    cyanLight.position.set(2, 2, 2);
    scene.add(cyanLight);

    const avatar = new AvatarModel(partnerAvatarConfig || DEFAULT_AVATAR_CONFIG_2);
    avatar.currentAnimation = 'idle';
    scene.add(avatar.root);
    avatarModelRef.current = avatar;

    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      avatar.update(delta);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      renderer.dispose();
    };
  }, [mode, partnerAvatarConfig]);

  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach(t => (t.enabled = isMicMuted));
      setIsMicMuted(!isMicMuted);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const vidTracks = localStreamRef.current.getVideoTracks();
      vidTracks.forEach(t => (t.enabled = isVideoMuted));
      setIsVideoMuted(!isVideoMuted);
    }
  };

  const setVoiceEffect = (fx: VoiceEffectType) => {
    setActiveVoiceFx(fx);
    if (voiceProcRef.current) {
      voiceProcRef.current.applyEffect(fx);
    }
    setFxMenuOpen(false);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in">
      <div className="relative w-full max-w-4xl h-[80vh] bg-slate-950 rounded-3xl border border-pink-500/40 shadow-2xl flex flex-col overflow-hidden">
        {/* Call Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900/60 border-b border-purple-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg">
              {partnerName.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <h3 className="font-bold text-sm text-purple-100 flex items-center gap-2">
                <span>{partnerName}</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> E2EE Stream
                </span>
              </h3>
              <p className="text-xs text-pink-300/80 font-mono">Duration: {formatTime(callDuration)}</p>
            </div>
          </div>

          {/* Mode Switcher: Video vs Live 3D Avatar */}
          <div className="flex items-center gap-2 bg-black/40 p-1 rounded-2xl border border-purple-500/30">
            <button
              onClick={() => setMode('video')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                mode === 'video' ? 'bg-pink-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              Video Stream
            </button>
            <button
              onClick={() => setMode('avatar')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all ${
                mode === 'avatar' ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Smile className="w-3.5 h-3.5" /> 3D Avatar Call
            </button>
          </div>
        </div>

        {/* Call Main Viewport */}
        <div className="relative flex-1 bg-gradient-to-b from-slate-950 via-purple-950/20 to-slate-950 flex items-center justify-center overflow-hidden">
          {mode === 'avatar' ? (
            <div className="w-full h-full flex flex-col items-center justify-center">
              <div ref={avatarMountRef} className="w-full h-full max-w-lg" />
              <div className="absolute top-4 left-6 px-3 py-1 rounded-full bg-purple-900/60 border border-purple-400/30 text-xs text-pink-200">
                Live 3D Avatar Stream
              </div>
            </div>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Partner video placeholder / stream */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-purple-950/30">
                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-3xl font-bold text-white shadow-2xl mb-3 animate-pulse">
                  {partnerName.slice(0, 1).toUpperCase()}
                </div>
                <div className="text-sm font-semibold text-purple-200">Connected with {partnerName}</div>
                <div className="text-xs text-pink-300/60 mt-1">Encrypted High-Definition Audio & Video</div>
              </div>

              {/* Local User Self-Preview PIP */}
              <div className="absolute top-4 right-4 w-28 h-20 sm:w-44 sm:h-32 bg-black rounded-2xl border-2 border-pink-500/50 shadow-2xl overflow-hidden z-20">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${isVideoMuted ? 'hidden' : 'block'}`}
                />
                {isVideoMuted && (
                  <div className="w-full h-full flex items-center justify-center text-xs text-gray-400 bg-slate-900">
                    Camera Off
                  </div>
                )}
                <div className="absolute bottom-1 left-2 text-[10px] text-pink-300 font-semibold bg-black/60 px-1.5 py-0.5 rounded">
                  You
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Control Dock */}
        <div className="p-4 bg-slate-900/90 border-t border-purple-500/20 flex items-center justify-center gap-3 relative">
          {/* Mic Mute Button */}
          <button
            onClick={toggleMic}
            className={`p-3.5 rounded-2xl transition-all shadow-lg active:scale-95 ${
              isMicMuted
                ? 'bg-red-600/80 text-white border border-red-500'
                : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
            }`}
            title={isMicMuted ? 'Unmute Mic' : 'Mute Mic'}
          >
            {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Video Toggle Button */}
          <button
            onClick={toggleVideo}
            className={`p-3.5 rounded-2xl transition-all shadow-lg active:scale-95 ${
              isVideoMuted
                ? 'bg-red-600/80 text-white border border-red-500'
                : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
            }`}
            title={isVideoMuted ? 'Turn Camera On' : 'Turn Camera Off'}
          >
            {isVideoMuted ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </button>

          {/* Voice FX Switcher Button */}
          <div className="relative">
            <button
              onClick={() => setFxMenuOpen(!fxMenuOpen)}
              className={`p-3.5 rounded-2xl transition-all shadow-lg active:scale-95 flex items-center gap-1.5 ${
                activeVoiceFx !== 'none'
                  ? 'bg-pink-600 text-white border border-pink-400'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
              }`}
              title="Voice Morphing Effects"
            >
              <Wand2 className="w-5 h-5" />
            </button>

            {fxMenuOpen && (
              <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-48 bg-slate-900 border border-purple-500/40 rounded-2xl p-2 shadow-2xl z-30">
                <div className="text-[10px] uppercase font-bold text-pink-300 px-2 py-1 mb-1">
                  Live Voice Filter
                </div>
                {[
                  { id: 'none', label: 'Natural Voice 🎙️' },
                  { id: 'cute', label: 'Cute Chipmunk 🐣' },
                  { id: 'deep', label: 'Deep Velvet 🐻' },
                  { id: 'robotic', label: 'Android 🤖' },
                  { id: 'cosmic', label: 'Cosmic Echo ✨' },
                  { id: 'radio', label: 'Vintage Radio 📻' },
                ].map(fx => (
                  <button
                    key={fx.id}
                    onClick={() => setVoiceEffect(fx.id as VoiceEffectType)}
                    className={`w-full px-2.5 py-1.5 rounded-xl text-xs text-left transition-all ${
                      activeVoiceFx === fx.id
                        ? 'bg-pink-600 text-white font-semibold'
                        : 'text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    {fx.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* End Call Button */}
          <button
            onClick={onClose}
            className="p-3.5 px-6 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm flex items-center gap-2 shadow-xl shadow-red-600/40 active:scale-95 transition-all"
            title="End Call"
          >
            <PhoneOff className="w-5 h-5" /> End Call
          </button>
        </div>
      </div>
    </div>
  );
};
