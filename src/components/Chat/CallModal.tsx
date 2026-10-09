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
  Wand2,
  Radio,
  Sparkles,
} from 'lucide-react';

interface CallModalProps {
  callType: 'voice' | 'video' | 'avatar';
  isCaller?: boolean;
  partnerName: string;
  multiplayer: MultiplayerClient;
  myAvatarConfig: AvatarConfig;
  partnerAvatarConfig?: AvatarConfig;
  onClose: () => void;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    // High-availability Public STUN
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    // Free Public OpenRelay TURN Servers for cross-network / mobile cellular NAT traversal
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp',
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
  iceCandidatePoolSize: 10,
};

// Helper: Create a fallback synthetic stream if physical camera/mic is missing
function createFallbackStream(hasVideo: boolean): MediaStream {
  const stream = new MediaStream();

  // 1. Silent synthetic audio track
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const dest = audioCtx.createMediaStreamDestination();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    gain.gain.value = 0; // Silent
    osc.connect(gain);
    gain.connect(dest);
    osc.start();
    const audioTrack = dest.stream.getAudioTracks()[0];
    if (audioTrack) stream.addTrack(audioTrack);
  } catch {}

  // 2. Synthetic canvas video track
  if (hasVideo) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#0f0728';
        ctx.fillRect(0, 0, 320, 240);
        ctx.fillStyle = '#ec4899';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('💖 VibePair Stream', 160, 120);
      }
      const canvasStream = canvas.captureStream(15);
      const vidTrack = canvasStream.getVideoTracks()[0];
      if (vidTrack) stream.addTrack(vidTrack);
    } catch {}
  }

  return stream;
}

export const CallModal: React.FC<CallModalProps> = ({
  callType: initialCallType,
  isCaller = true,
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
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'ended'>('connecting');
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const voiceProcRef = useRef<VoiceEffectProcessor | null>(null);
  const iceCandidatesQueue = useRef<RTCIceCandidateInit[]>([]);

  // Avatar 3D Canvas in call
  const avatarMountRef = useRef<HTMLDivElement>(null);
  const avatarModelRef = useRef<AvatarModel | null>(null);

  // Call duration timer
  useEffect(() => {
    const timer = setInterval(() => setCallDuration(d => d + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // WebRTC PeerConnection & Media Setup
  useEffect(() => {
    let isCleanedUp = false;
    const pc = new RTCPeerConnection(RTC_CONFIG);
    pcRef.current = pc;

    // Track remote ICE connection state
    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setConnectionStatus('connected');
      } else if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        setConnectionStatus('connecting');
      }
    };

    // Forward local ICE candidates to partner
    pc.onicecandidate = (event) => {
      if (event.candidate && !isCleanedUp) {
        multiplayer.send('WEBRTC_SIGNAL', {
          action: 'ICE_CANDIDATE',
          candidate: event.candidate.toJSON(),
        });
      }
    };

    // Receive remote media tracks
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        const remoteStream = event.streams[0];
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
          remoteVideoRef.current.play().catch(() => {});
        }
        setConnectionStatus('connected');

        // Check if stream has video tracks
        const videoTracks = remoteStream.getVideoTracks();
        if (videoTracks.length > 0 && videoTracks[0].enabled) {
          setHasRemoteVideo(true);
        }

        remoteStream.onaddtrack = () => {
          if (remoteStream.getVideoTracks().length > 0) setHasRemoteVideo(true);
        };
      }
    };

    // Acquire local media and initialize WebRTC handshake
    async function startMediaAndHandshake() {
      let localStream: MediaStream;
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          video: initialCallType !== 'voice',
          audio: true,
        });
      } catch (err) {
        console.warn('Physical camera/mic not accessible, fallback to synthetic stream:', err);
        localStream = createFallbackStream(initialCallType !== 'voice');
      }

      if (isCleanedUp) {
        localStream.getTracks().forEach(t => t.stop());
        return;
      }

      localStreamRef.current = localStream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }

      // Initialize voice DSP processor
      try {
        const proc = new VoiceEffectProcessor();
        proc.init(localStream);
        voiceProcRef.current = proc;
      } catch {}

      // Add local tracks to peer connection
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });

      // If this client is the Caller: create and send OFFER
      if (isCaller) {
        try {
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
          });
          await pc.setLocalDescription(offer);
          multiplayer.send('WEBRTC_SIGNAL', {
            action: 'OFFER',
            sdp: pc.localDescription,
          });
        } catch (offerErr) {
          console.error('Error creating WebRTC offer:', offerErr);
        }
      } else {
        // Receiver announces readiness to caller
        multiplayer.send('WEBRTC_SIGNAL', { action: 'RECEIVER_READY' });
      }

      // Process any early signals that arrived before media setup finished
      while (earlySignalsQueue.current.length > 0) {
        const pending = earlySignalsQueue.current.shift();
        if (pending) await processSignal(pending);
      }
    }

    const earlySignalsQueue = { current: [] as any[] };

    async function processSignal(data: any) {
      if (!data || isCleanedUp || !pcRef.current) return;
      const peer = pcRef.current;

      try {
        if (data.action === 'RECEIVER_READY' && isCaller) {
          // Receiver is ready, create or resend offer
          const offer = await peer.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
          });
          await peer.setLocalDescription(offer);
          multiplayer.send('WEBRTC_SIGNAL', {
            action: 'OFFER',
            sdp: peer.localDescription,
          });
        } else if (data.action === 'OFFER' && !isCaller) {
          // Receiver sets remote offer and creates answer
          await peer.setRemoteDescription(new RTCSessionDescription(data.sdp));

          // Drain any queued ICE candidates
          while (iceCandidatesQueue.current.length > 0) {
            const cand = iceCandidatesQueue.current.shift();
            if (cand) await peer.addIceCandidate(new RTCIceCandidate(cand));
          }

          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          multiplayer.send('WEBRTC_SIGNAL', {
            action: 'ANSWER',
            sdp: peer.localDescription,
          });
        } else if (data.action === 'ANSWER' && isCaller) {
          // Caller sets remote answer
          await peer.setRemoteDescription(new RTCSessionDescription(data.sdp));

          // Drain queued candidates
          while (iceCandidatesQueue.current.length > 0) {
            const cand = iceCandidatesQueue.current.shift();
            if (cand) await peer.addIceCandidate(new RTCIceCandidate(cand));
          }
        } else if (data.action === 'ICE_CANDIDATE') {
          if (data.candidate) {
            if (peer.remoteDescription) {
              await peer.addIceCandidate(new RTCIceCandidate(data.candidate));
            } else {
              iceCandidatesQueue.current.push(data.candidate);
            }
          }
        } else if (data.action === 'END_CALL') {
          setConnectionStatus('ended');
          setTimeout(() => onClose(), 800);
        }
      } catch (signalErr) {
        console.warn('WebRTC signaling event error:', signalErr);
      }
    }

    startMediaAndHandshake();

    // Listen to WebRTC signaling messages from partner
    const unsubWebRTC = multiplayer.on('WEBRTC_SIGNAL', async (msg: any) => {
      const data = msg.data;
      if (!data || isCleanedUp) return;
      if (!pcRef.current) {
        earlySignalsQueue.current.push(data);
        return;
      }
      await processSignal(data);
    });

    return () => {
      isCleanedUp = true;
      unsubWebRTC();
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (voiceProcRef.current) {
        voiceProcRef.current.destroy();
      }
    };
  }, [isCaller, initialCallType, multiplayer, onClose]);

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

  const handleEndCall = () => {
    multiplayer.send('WEBRTC_SIGNAL', { action: 'END_CALL' });
    multiplayer.send('CALL_SIGNAL', { action: 'END_CALL' });
    setConnectionStatus('ended');
    onClose();
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-2xl animate-in fade-in">
      <div className="relative w-full max-w-4xl h-[86vh] sm:h-[80vh] bg-slate-950 rounded-3xl border border-pink-500/40 shadow-2xl flex flex-col overflow-hidden">
        {/* Call Top Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-slate-900/80 border-b border-purple-500/20">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg">
                {partnerName.slice(0, 1).toUpperCase()}
              </div>
              <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-slate-950 ${
                connectionStatus === 'connected' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
              }`} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-purple-100 flex items-center gap-2">
                <span>{partnerName}</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> E2EE WebRTC
                </span>
              </h3>
              <p className="text-xs text-pink-300/80 font-mono flex items-center gap-2">
                <span>Duration: {formatTime(callDuration)}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-sans ${
                  connectionStatus === 'connected' ? 'text-emerald-400 bg-emerald-950/40' : 'text-amber-300 bg-amber-950/40'
                }`}>
                  {connectionStatus === 'connected' ? 'Live HD' : 'Connecting peer...'}
                </span>
              </p>
            </div>
          </div>

          {/* Mode Switcher: Video vs Live 3D Avatar */}
          <div className="flex items-center gap-1 sm:gap-2 bg-black/40 p-1 rounded-2xl border border-purple-500/30">
            <button
              onClick={() => setMode('video')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                mode === 'video' ? 'bg-pink-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              Video
            </button>
            <button
              onClick={() => setMode('avatar')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all ${
                mode === 'avatar' ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Smile className="w-3.5 h-3.5" /> 3D Avatar
            </button>
          </div>
        </div>

        {/* Call Main Viewport */}
        <div className="relative flex-1 bg-gradient-to-b from-slate-950 via-purple-950/20 to-slate-950 flex items-center justify-center overflow-hidden">
          {mode === 'avatar' ? (
            <div className="w-full h-full flex flex-col items-center justify-center">
              <div ref={avatarMountRef} className="w-full h-full max-w-lg" />
              <div className="absolute top-4 left-6 px-3 py-1 rounded-full bg-purple-900/60 border border-purple-400/30 text-xs text-pink-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-pink-400 animate-spin" /> Live 3D Avatar Stream
              </div>
            </div>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              {/* Partner remote video stream */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />

              {/* Connected / Waiting Avatar Center Card when camera is off or establishing */}
              {(!hasRemoteVideo || initialCallType === 'voice') && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-purple-950/70 backdrop-blur-sm pointer-events-none">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-4xl font-bold text-white shadow-2xl mb-4 animate-pulse ring-4 ring-pink-500/30">
                    {partnerName.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="text-base font-bold text-purple-100 flex items-center gap-2">
                    <span>{partnerName}</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  </div>
                  <div className="text-xs text-pink-300/80 mt-1 flex items-center gap-1">
                    <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                    <span>Encrypted High-Definition P2P WebRTC Audio</span>
                  </div>
                </div>
              )}

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
        <div className="p-3 sm:p-4 bg-slate-900/90 border-t border-purple-500/20 flex items-center justify-center gap-2.5 sm:gap-3 relative">
          {/* Mic Mute Button */}
          <button
            onClick={toggleMic}
            className={`p-3 sm:p-3.5 rounded-2xl transition-all shadow-lg active:scale-95 ${
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
            className={`p-3 sm:p-3.5 rounded-2xl transition-all shadow-lg active:scale-95 ${
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
              className={`p-3 sm:p-3.5 rounded-2xl transition-all shadow-lg active:scale-95 flex items-center gap-1.5 ${
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
            onClick={handleEndCall}
            className="p-3 sm:p-3.5 px-5 sm:px-6 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xl shadow-red-600/40 active:scale-95 transition-all"
            title="End Call"
          >
            <PhoneOff className="w-5 h-5" /> End Call
          </button>
        </div>
      </div>
    </div>
  );
};
