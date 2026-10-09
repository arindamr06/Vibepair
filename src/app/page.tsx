'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import confetti from 'canvas-confetti';
import { getMultiplayerClient, MultiplayerClient } from '@/lib/multiplayer';
import { AmbientSoundGenerator } from '@/lib/audioFx';
import { Navbar } from '@/components/Navbar';
import { PairModal } from '@/components/PairModal';
import { ConsentModal } from '@/components/ConsentModal';
import { PrivacyShield } from '@/components/Privacy/PrivacyShield';
import { WorldScene } from '@/components/World3D/WorldScene';
import { ChatPanel } from '@/components/Chat/ChatPanel';
import { CallModal } from '@/components/Chat/CallModal';
import { AvatarStudio } from '@/components/AvatarStudio/AvatarStudio';
import {
  AvatarConfig,
  DEFAULT_AVATAR_CONFIG_1,
  DEFAULT_AVATAR_CONFIG_2,
} from '@/components/AvatarStudio/AvatarMesh';
import { CoupleActivities } from '@/components/Activities/CoupleActivities';
import { MemoriesWall } from '@/components/Memories/MemoriesWall';
import {
  Globe,
  MessageSquare,
  Smile,
  Gamepad2,
  CalendarHeart,
  Sparkles,
} from 'lucide-react';
import { AICupidPanel } from '@/components/AICompanion/AICupidPanel';

export default function VibePairApp() {
  const multiplayer = useMemo<MultiplayerClient>(() => getMultiplayerClient(), []);
  const ambientGenerator = useMemo<AmbientSoundGenerator>(() => new AmbientSoundGenerator(), []);

  // Connection & Room State
  const [isPairModalOpen, setIsPairModalOpen] = useState(true);
  const [roomCode, setRoomCode] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [fingerprint, setFingerprint] = useState('');
  const [userName, setUserName] = useState('Soulmate');
  const [partnerName, setPartnerName] = useState('Partner');
  const [isPartnerConnected, setIsPartnerConnected] = useState(false);

  // App Navigation View
  const [activeView, setActiveView] = useState<'world' | 'chat' | 'avatar' | 'activities' | 'memories' | 'ai'>('world');

  // Call Modal State
  const [activeCallType, setActiveCallType] = useState<'voice' | 'video' | 'avatar' | null>(null);

  // Panic / Stealth mode state
  const [isPanicMode, setIsPanicMode] = useState(false);

  // Consent modal state for couple interactions
  const [incomingInteraction, setIncomingInteraction] = useState<{
    type: 'hug' | 'kiss' | 'hold_hands' | 'dance' | 'cuddle';
    senderName: string;
  } | null>(null);

  // Avatar configs
  const [myAvatarConfig, setMyAvatarConfig] = useState<AvatarConfig>(() => {
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

  const [partnerAvatarConfig, setPartnerAvatarConfig] = useState<AvatarConfig>(DEFAULT_AVATAR_CONFIG_2);

  // Global toasts
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = window.setTimeout(() => setToastMessage(null), 3500);
  };

  // Keyboard shortcut for Panic Mode (Double Escape)
  const lastEscapePressRef = useRef<number>(0);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const now = Date.now();
        if (now - lastEscapePressRef.current < 400) {
          setIsPanicMode(prev => !prev);
        }
        lastEscapePressRef.current = now;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle incoming interaction and partner signals
  useEffect(() => {
    const unsubPresence = multiplayer.on('PRESENCE', (msg: any) => {
      setIsPartnerConnected(true);
      if (msg.data?.name) {
        setPartnerName(msg.data.name);
      }
      showToast(`💖 ${msg.data?.name || 'Partner'} is in your shared space!`);
    });

    const unsubInteractionReq = multiplayer.on('INTERACTION_REQUEST', (msg: any) => {
      const { type, senderName } = msg.data as {
        type: 'hug' | 'kiss' | 'hold_hands' | 'dance' | 'cuddle';
        senderName: string;
      };
      setIncomingInteraction({ type, senderName });
    });

    const unsubInteractionResp = multiplayer.on('INTERACTION_RESPONSE', (msg: any) => {
      const { type, accepted } = msg.data as { type: string; accepted: boolean };
      if (accepted) {
        showToast(`💖 ${partnerName} accepted your ${type}!`);
        confetti({
          particleCount: 60,
          spread: 80,
          origin: { y: 0.5 },
          colors: ['#ec4899', '#f43f5e', '#a855f7', '#fb7185'],
        });
      } else {
        showToast(`🌸 ${partnerName} wasn't ready for ${type} right now.`);
      }
    });

    const unsubAvatarUpdate = multiplayer.on('AVATAR_UPDATE', (msg: any) => {
      if (msg.data) {
        setPartnerAvatarConfig(msg.data);
      }
    });

    const unsubCallReq = multiplayer.on('CALL_SIGNAL', (msg: any) => {
      if (msg.data?.action === 'START_CALL') {
        setActiveCallType(msg.data.type || 'voice');
        showToast(`📞 Incoming ${msg.data.type} call from ${partnerName}!`);
      }
    });

    return () => {
      unsubPresence();
      unsubInteractionReq();
      unsubInteractionResp();
      unsubAvatarUpdate();
      unsubCallReq();
    };
  }, [multiplayer, partnerName]);

  // When room is joined/created
  const handleConnected = (data: {
    roomCode: string;
    secretKey: string;
    cryptoKey: CryptoKey;
    userName: string;
    fingerprint: string;
  }) => {
    setRoomCode(data.roomCode);
    setSecretKey(data.secretKey);
    setUserName(data.userName);
    setFingerprint(data.fingerprint);
    setIsPairModalOpen(false);

    // Initialize multiplayer engine
    multiplayer.init(data.roomCode, data.cryptoKey, data.userName);

    // Broadcast our avatar to partner
    setTimeout(() => {
      multiplayer.send('AVATAR_UPDATE', myAvatarConfig);
    }, 500);

    showToast(`🔒 Encrypted Room ${data.roomCode} Initialized!`);
  };

  // Request intimate interaction from 3D world
  const handleRequestInteraction = (type: 'hug' | 'kiss' | 'hold_hands' | 'dance' | 'cuddle') => {
    multiplayer.send('INTERACTION_REQUEST', {
      type,
      senderName: userName,
    });
    showToast(`💌 Sent ${type} request to ${partnerName}...`);
  };

  // Consent modal responses
  const handleAcceptInteraction = () => {
    if (!incomingInteraction) return;
    multiplayer.send('INTERACTION_RESPONSE', {
      type: incomingInteraction.type,
      accepted: true,
    });
    confetti({
      particleCount: 60,
      spread: 80,
      colors: ['#ec4899', '#f43f5e', '#a855f7'],
    });
    setIncomingInteraction(null);
  };

  const handleDeclineInteraction = () => {
    if (!incomingInteraction) return;
    multiplayer.send('INTERACTION_RESPONSE', {
      type: incomingInteraction.type,
      accepted: false,
    });
    setIncomingInteraction(null);
  };

  // Save and broadcast avatar changes
  const handleSaveAvatar = (config: AvatarConfig) => {
    setMyAvatarConfig(config);
    multiplayer.send('AVATAR_UPDATE', config);
    showToast('✨ Avatar synced with partner!');
  };

  // Start Call
  const handleStartCall = (type: 'voice' | 'video' | 'avatar') => {
    setActiveCallType(type);
    multiplayer.send('CALL_SIGNAL', { action: 'START_CALL', type });
  };

  // Forward love letter / date idea from AI directly into Chat
  const handleSendAIToChat = (text: string) => {
    multiplayer.send('CHAT_MESSAGE', {
      id: `msg_ai_${Date.now()}`,
      senderId: multiplayer.peerId,
      senderName: userName,
      text,
      type: 'text',
      reactions: {},
      timestamp: Date.now(),
    });
    showToast('💌 Message sent to your private chat!');
    setActiveView('chat');
  };

  return (
    <PrivacyShield
      roomCode={roomCode}
      fingerprint={fingerprint}
      isPanicMode={isPanicMode}
      onExitPanicMode={() => setIsPanicMode(false)}
    >
      <div className="flex flex-col h-[100dvh] w-screen overflow-hidden bg-[#07040d]">
        {/* Top Navigation Bar */}
        <Navbar
          roomCode={roomCode}
          fingerprint={fingerprint}
          partnerName={partnerName}
          isPartnerConnected={isPartnerConnected}
          activeView={activeView}
          onSelectView={setActiveView}
          onTriggerPanic={() => setIsPanicMode(true)}
          ambientGenerator={ambientGenerator}
        />

        {/* Main Application Content Area */}
        <main className="flex-1 p-2 sm:p-4 pb-20 md:pb-4 overflow-hidden relative">
          {/* View 1: 3D Multiplayer Sandbox World */}
          <div className={`w-full h-full ${activeView === 'world' ? 'block' : 'hidden'}`}>
            <WorldScene
              multiplayer={multiplayer}
              myAvatarConfig={myAvatarConfig}
              partnerAvatarConfig={partnerAvatarConfig}
              onRequestInteraction={handleRequestInteraction}
              partnerName={partnerName}
            />
          </div>

          {/* View 2: E2EE Private Chat */}
          <div className={`w-full h-full ${activeView === 'chat' ? 'block' : 'hidden'}`}>
            <ChatPanel
              multiplayer={multiplayer}
              userName={userName}
              partnerName={partnerName}
              onStartCall={handleStartCall}
            />
          </div>

          {/* View 3: Live 3D Avatar Studio */}
          <div className={`w-full h-full ${activeView === 'avatar' ? 'block' : 'hidden'}`}>
            <AvatarStudio
              initialConfig={myAvatarConfig}
              onSaveAvatar={handleSaveAvatar}
            />
          </div>

          {/* View 4: Couple Mini-Games & Shared Activities */}
          <div className={`w-full h-full ${activeView === 'activities' ? 'block' : 'hidden'}`}>
            <CoupleActivities
              multiplayer={multiplayer}
              partnerName={partnerName}
            />
          </div>

          {/* View 5: Shared Memories & Timeline Wall */}
          <div className={`w-full h-full ${activeView === 'memories' ? 'block' : 'hidden'}`}>
            <MemoriesWall
              multiplayer={multiplayer}
              partnerName={partnerName}
            />
          </div>

          {/* View 6: Relationship AI Companion ("VibeCupid") */}
          <div className={`w-full h-full ${activeView === 'ai' ? 'block' : 'hidden'}`}>
            <AICupidPanel
              partnerName={partnerName}
              onSendToChat={handleSendAIToChat}
            />
          </div>
        </main>

        {/* Floating Mobile Bottom Navigation Dock (Phones) */}
        <nav className="md:hidden fixed bottom-2 inset-x-2.5 z-40 bg-slate-950/92 border border-purple-500/35 backdrop-blur-2xl rounded-2xl p-1.5 flex items-center justify-around shadow-2xl">
          {[
            { id: 'world', label: '3D World', icon: Globe },
            { id: 'chat', label: 'Chat', icon: MessageSquare },
            { id: 'avatar', label: 'Avatar', icon: Smile },
            { id: 'activities', label: 'Games', icon: Gamepad2 },
            { id: 'memories', label: 'Memories', icon: CalendarHeart },
            { id: 'ai', label: 'AI Cupid', icon: Sparkles },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeView === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id as any)}
                className={`flex-1 py-1 flex flex-col items-center justify-center rounded-xl transition-all ${
                  isActive
                    ? 'bg-gradient-to-t from-pink-600/30 to-purple-600/30 text-pink-300 font-bold border border-pink-500/40 shadow-sm'
                    : 'text-gray-400 hover:text-purple-200'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-pink-400 animate-pulse' : ''}`} />
                <span className="text-[9px] mt-0.5 tracking-tight font-medium">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Toast Notification Banner */}
        {toastMessage && (
          <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-black/85 backdrop-blur-xl border border-pink-500/60 text-pink-200 text-xs font-semibold shadow-2xl animate-in slide-in-from-bottom-3 flex items-center gap-2">
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Pairing Modal (No login, client-side E2EE key creation) */}
        <PairModal isOpen={isPairModalOpen} onConnected={handleConnected} />

        {/* Consensual Interaction Request Modal */}
        {incomingInteraction && (
          <ConsentModal
            partnerName={incomingInteraction.senderName || partnerName}
            interactionType={incomingInteraction.type}
            onAccept={handleAcceptInteraction}
            onDecline={handleDeclineInteraction}
          />
        )}

        {/* Active WebRTC Voice / Video / 3D Avatar Call Modal */}
        {activeCallType && (
          <CallModal
            callType={activeCallType}
            partnerName={partnerName}
            multiplayer={multiplayer}
            myAvatarConfig={myAvatarConfig}
            partnerAvatarConfig={partnerAvatarConfig}
            onClose={() => setActiveCallType(null)}
          />
        )}
      </div>
    </PrivacyShield>
  );
}
