'use client';

import React, { useEffect, useRef } from 'react';
import { Phone, PhoneOff, Video, Mic, ShieldCheck, Heart } from 'lucide-react';

interface IncomingCallModalProps {
  callerName: string;
  callType: 'voice' | 'video' | 'avatar';
  onAccept: () => void;
  onDecline: () => void;
}

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  callerName,
  callType,
  onAccept,
  onDecline,
}) => {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ringIntervalRef = useRef<number | null>(null);

  // Play gentle romantic chime ringtone
  useEffect(() => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = audioCtx;

      const playChime = () => {
        if (!audioCtx || audioCtx.state === 'closed') return;
        const now = audioCtx.currentTime;

        // Note 1 (E5: 659.25 Hz)
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(659.25, now);
        gain1.gain.setValueAtTime(0, now);
        gain1.gain.linearRampToValueAtTime(0.15, now + 0.05);
        gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        osc1.start(now);
        osc1.stop(now + 0.6);

        // Note 2 (G#5: 830.61 Hz)
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(830.61, now + 0.18);
        gain2.gain.setValueAtTime(0, now + 0.18);
        gain2.gain.linearRampToValueAtTime(0.18, now + 0.23);
        gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.start(now + 0.18);
        osc2.stop(now + 0.8);

        // Note 3 (B5: 987.77 Hz)
        const osc3 = audioCtx.createOscillator();
        const gain3 = audioCtx.createGain();
        osc3.type = 'sine';
        osc3.frequency.setValueAtTime(987.77, now + 0.36);
        gain3.gain.setValueAtTime(0, now + 0.36);
        gain3.gain.linearRampToValueAtTime(0.2, now + 0.41);
        gain3.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
        osc3.connect(gain3);
        gain3.connect(audioCtx.destination);
        osc3.start(now + 0.36);
        osc3.stop(now + 1.2);
      };

      playChime();
      ringIntervalRef.current = window.setInterval(playChime, 2500);
    } catch {}

    return () => {
      if (ringIntervalRef.current) clearInterval(ringIntervalRef.current);
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-2xl animate-in fade-in">
      <div className="w-full max-w-sm bg-slate-950 border-2 border-pink-500/60 rounded-3xl p-6 shadow-2xl text-center space-y-6 relative overflow-hidden">
        {/* Pulsing ring aura */}
        <div className="absolute inset-0 bg-gradient-to-b from-pink-500/10 via-purple-500/5 to-transparent pointer-events-none" />
        
        {/* Animated Caller Avatar with pulse rings */}
        <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-pink-500/30 animate-ping opacity-75" />
          <div className="absolute -inset-2 rounded-full border-2 border-pink-500/40 animate-pulse" />
          <div className="relative w-20 h-20 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-3xl font-extrabold text-white shadow-2xl ring-4 ring-slate-950">
            {callerName.slice(0, 1).toUpperCase()}
          </div>
        </div>

        {/* Call Info */}
        <div className="space-y-1">
          <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-purple-200 to-indigo-200">
            {callerName}
          </h3>
          <p className="text-xs text-pink-300 font-semibold flex items-center justify-center gap-1.5">
            {callType === 'video' ? (
              <>
                <Video className="w-4 h-4 text-pink-400 animate-pulse" />
                <span>Incoming Video Call...</span>
              </>
            ) : callType === 'avatar' ? (
              <>
                <Heart className="w-4 h-4 text-pink-400 fill-pink-400 animate-pulse" />
                <span>Incoming 3D Avatar Call...</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span>Incoming Voice Call...</span>
              </>
            )}
          </p>
          <div className="pt-1 flex items-center justify-center gap-1 text-[11px] text-emerald-400 font-mono">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>End-to-End Encrypted</span>
          </div>
        </div>

        {/* Action Buttons: Accept & Decline */}
        <div className="flex items-center justify-center gap-6 pt-2">
          {/* Decline Button */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={onDecline}
              className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-xl shadow-red-600/40 active:scale-90 transition-transform"
              title="Decline Call"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
            <span className="text-[11px] font-semibold text-gray-400">Decline</span>
          </div>

          {/* Accept Button */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={onAccept}
              className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center shadow-2xl shadow-emerald-500/50 active:scale-95 transition-transform animate-bounce"
              title="Accept Call"
            >
              <Phone className="w-7 h-7" />
            </button>
            <span className="text-[11px] font-bold text-emerald-300">Accept</span>
          </div>
        </div>
      </div>
    </div>
  );
};

interface OutgoingCallingModalProps {
  partnerName: string;
  callType: 'voice' | 'video' | 'avatar';
  onCancel: () => void;
}

export const OutgoingCallingModal: React.FC<OutgoingCallingModalProps> = ({
  partnerName,
  callType,
  onCancel,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-2xl animate-in fade-in">
      <div className="w-full max-w-sm bg-slate-950 border-2 border-purple-500/50 rounded-3xl p-6 shadow-2xl text-center space-y-6 relative overflow-hidden">
        {/* Animated Caller Avatar with pulse rings */}
        <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-purple-500/30 animate-ping opacity-60" />
          <div className="absolute -inset-2 rounded-full border-2 border-purple-500/40 animate-pulse" />
          <div className="relative w-20 h-20 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-3xl font-extrabold text-white shadow-2xl ring-4 ring-slate-950">
            {partnerName.slice(0, 1).toUpperCase()}
          </div>
        </div>

        {/* Call Info */}
        <div className="space-y-1">
          <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-purple-200 to-indigo-200">
            Calling {partnerName}...
          </h3>
          <p className="text-xs text-purple-300 font-semibold flex items-center justify-center gap-1.5">
            {callType === 'video' ? 'Connecting Encrypted Video...' : 'Connecting Encrypted Voice...'}
          </p>
          <div className="pt-1 flex items-center justify-center gap-1 text-[11px] text-pink-300/80 font-mono">
            <span className="w-2 h-2 rounded-full bg-pink-400 animate-ping" />
            <span>Ringing partner&apos;s device...</span>
          </div>
        </div>

        {/* Cancel Button */}
        <div className="pt-2 flex flex-col items-center gap-1.5">
          <button
            onClick={onCancel}
            className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-xl shadow-red-600/40 active:scale-90 transition-transform"
            title="Cancel Call"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
          <span className="text-[11px] font-semibold text-gray-400">Cancel</span>
        </div>
      </div>
    </div>
  );
};
