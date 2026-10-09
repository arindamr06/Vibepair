'use client';

import React, { useState } from 'react';
import {
  Heart,
  ShieldCheck,
  Music,
  EyeOff,
  Copy,
  Check,
  Globe,
  MessageSquare,
  Smile,
  Gamepad2,
  CalendarHeart,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { AmbientSoundGenerator } from '@/lib/audioFx';

interface NavbarProps {
  roomCode: string;
  fingerprint: string;
  partnerName: string;
  isPartnerConnected: boolean;
  activeView: 'world' | 'chat' | 'avatar' | 'activities' | 'memories' | 'ai';
  onSelectView: (view: 'world' | 'chat' | 'avatar' | 'activities' | 'memories' | 'ai') => void;
  onTriggerPanic: () => void;
  ambientGenerator: AmbientSoundGenerator;
}

export const Navbar: React.FC<NavbarProps> = ({
  roomCode,
  fingerprint,
  partnerName,
  isPartnerConnected,
  activeView,
  onSelectView,
  onTriggerPanic,
  ambientGenerator,
}) => {
  const [copiedRoom, setCopiedRoom] = useState(false);
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const [showFpTooltip, setShowFpTooltip] = useState(false);

  const handleCopyRoom = () => {
    navigator.clipboard.writeText(roomCode);
    setCopiedRoom(true);
    setTimeout(() => setCopiedRoom(false), 2000);
  };

  const toggleMusic = () => {
    const status = ambientGenerator.toggle();
    setIsPlayingMusic(status);
  };

  return (
    <header className="h-16 px-4 sm:px-6 bg-slate-950/90 border-b border-purple-500/20 backdrop-blur-xl flex items-center justify-between gap-3 select-none z-30">
      {/* Brand & Room Code */}
      <div className="flex items-center gap-3 sm:gap-5">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => onSelectView('world')}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-500 via-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-pink-500/25">
            <Heart className="w-5 h-5 text-white fill-white animate-pulse" />
          </div>
          <span className="font-black text-lg tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-300 to-indigo-200">
            VibePair
          </span>
        </div>

        {/* Room Code Badge */}
        {roomCode && (
          <button
            onClick={handleCopyRoom}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-purple-950/50 hover:bg-purple-900/60 border border-purple-500/30 text-[11px] font-mono text-pink-300 transition-all active:scale-95 shadow-sm"
            title="Click to copy room code"
          >
            <span className="hidden sm:inline">Room:</span>
            <span>{roomCode}</span>
            {copiedRoom ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          </button>
        )}

        {/* E2EE Safety Badge */}
        <div className="relative">
          <button
            onMouseEnter={() => setShowFpTooltip(true)}
            onMouseLeave={() => setShowFpTooltip(false)}
            onClick={() => setShowFpTooltip(!showFpTooltip)}
            className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-[10px] sm:text-[11px] text-emerald-300 font-mono"
          >
            <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="hidden sm:inline">E2EE 256-bit</span>
          </button>

          {showFpTooltip && fingerprint && (
            <div className="absolute left-0 top-full mt-2 w-64 p-3 rounded-2xl bg-slate-900 border border-emerald-500/40 text-[11px] text-purple-200 shadow-2xl z-40">
              <div className="font-bold text-emerald-300 mb-1">Encrypted Room Fingerprint</div>
              <div className="font-mono text-emerald-200 bg-black/50 p-1.5 rounded-lg text-center tracking-wider mb-1">
                {fingerprint}
              </div>
              <div className="text-[10px] text-purple-300/70">
                Compare with your partner to guarantee no man-in-the-middle interception.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main View Navigation Tabs (Desktop / Tablets) */}
      <nav className="hidden md:flex items-center gap-1 bg-black/40 p-1 rounded-2xl border border-purple-500/25 overflow-x-auto scrollbar-none">
        {[
          { id: 'world', label: '3D World', icon: Globe },
          { id: 'chat', label: 'Private Chat', icon: MessageSquare },
          { id: 'avatar', label: 'Avatar Studio', icon: Smile },
          { id: 'activities', label: 'Mini-Games', icon: Gamepad2 },
          { id: 'memories', label: 'Memories', icon: CalendarHeart },
          { id: 'ai', label: 'VibeCupid AI', icon: Sparkles },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeView === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectView(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md shadow-pink-500/20'
                  : 'text-gray-400 hover:text-purple-200 hover:bg-white/5'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Right Controls: Partner Presence, Ambient Music & Panic Mode */}
      <div className="flex items-center gap-2">
        {/* Partner Status Pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 border border-purple-500/20 text-xs">
          <span
            className={`w-2 h-2 rounded-full ${
              isPartnerConnected ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'
            }`}
          />
          <span className="text-purple-200">{partnerName}</span>
          <span className="text-[10px] text-purple-400/60">
            {isPartnerConnected ? 'Online' : 'Waiting...'}
          </span>
        </div>

        {/* Ambient Lo-Fi / Synth Soundtrack Toggle */}
        <button
          onClick={toggleMusic}
          className={`p-2 rounded-xl transition-all border ${
            isPlayingMusic
              ? 'bg-pink-600 text-white border-pink-400 shadow-md shadow-pink-500/30'
              : 'bg-white/5 hover:bg-white/10 text-purple-200 border-purple-500/20'
          }`}
          title={isPlayingMusic ? 'Mute Romantic Lo-Fi Music' : 'Play Romantic Lo-Fi Ambient Synth'}
        >
          {isPlayingMusic ? <Volume2 className="w-4 h-4 animate-bounce" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* Emergency Panic Stealth Mode Button */}
        <button
          onClick={onTriggerPanic}
          className="p-2 rounded-xl bg-purple-950/50 hover:bg-purple-900 text-purple-200 border border-purple-500/30 transition-all hover:scale-105"
          title="Emergency Stealth Mode (Disguise screen)"
        >
          <EyeOff className="w-4 h-4 text-pink-400" />
        </button>
      </div>
    </header>
  );
};
