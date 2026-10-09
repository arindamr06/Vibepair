'use client';

import React, { useState, useEffect } from 'react';
import { Shield, EyeOff, Lock, AlertTriangle, Monitor, ExternalLink } from 'lucide-react';

interface PrivacyShieldProps {
  roomCode: string;
  fingerprint: string;
  isPanicMode: boolean;
  onExitPanicMode: () => void;
  children: React.ReactNode;
}

export const PrivacyShield: React.FC<PrivacyShieldProps> = ({
  roomCode,
  fingerprint,
  isPanicMode,
  onExitPanicMode,
  children,
}) => {
  const [isWindowBlurred, setIsWindowBlurred] = useState(false);
  const [screenshotAttemptDetected, setScreenshotAttemptDetected] = useState(false);

  // Tab switch & window blur detection
  useEffect(() => {
    const handleBlur = () => {
      setIsWindowBlurred(true);
    };

    const handleFocus = () => {
      setIsWindowBlurred(false);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsWindowBlurred(true);
      } else {
        setIsWindowBlurred(false);
      }
    };

    // PrintScreen key trap
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen') {
        setScreenshotAttemptDetected(true);
        setTimeout(() => setScreenshotAttemptDetected(false), 5000);
      }
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Panic / Stealth Mode Mock Work Screen
  if (isPanicMode) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-100 text-slate-800 flex flex-col font-sans p-6 select-none">
        <div className="flex items-center justify-between pb-4 border-b border-slate-300">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg text-slate-700">Project Strategy Notes - Q4 Overview</span>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-200 text-slate-600 font-mono">Draft</span>
          </div>
          <button
            onClick={onExitPanicMode}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all"
          >
            Resume App
          </button>
        </div>

        <div className="flex-1 mt-6 max-w-3xl space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <p>
            <strong>1. Executive Summary:</strong> Optimization of real-time distributed state
            synchronization across multi-cloud environments. The goal is reducing network latency
            while maintaining low client resource overhead.
          </p>
          <p>
            <strong>2. Architectural Deliverables:</strong> Implementation of WebRTC data channels
            with fallback peer relays. End-to-end payload cryptography validated using AES-256-GCM.
          </p>
          <div className="p-4 rounded-lg bg-slate-200/60 border border-slate-300 font-mono text-xs">
            STATUS: All services operational. Memory footprint within optimal parameters.
          </div>
        </div>

        <div className="text-[11px] text-slate-400 text-right">
          Press "Resume App" to return to private space.
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* Underlying Content */}
      <div className={`w-full h-full transition-all duration-200 ${isWindowBlurred ? 'blur-2xl pointer-events-none' : ''}`}>
        {children}
      </div>

      {/* Floating Dynamic Watermark for Screenshot Deterrence */}
      <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden flex items-center justify-around opacity-[0.035] select-none text-white font-mono text-xs rotate-[-25deg]">
        <div>VIBEPAIR PRIVATE • {roomCode} • {fingerprint}</div>
        <div>VIBEPAIR PRIVATE • {roomCode} • {fingerprint}</div>
      </div>

      {/* Screenshot attempt alert */}
      {screenshotAttemptDetected && (
        <div className="fixed top-6 right-6 z-50 p-4 rounded-2xl bg-amber-950/95 border border-amber-500 text-amber-200 text-xs shadow-2xl flex items-center gap-3 animate-in fade-in">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <div>
            <div className="font-bold">Screen Capture Key Detected</div>
            <div className="text-[11px] text-amber-300/80">
              Notice: Screenshot deterrence logged this attempt. Always respect partner privacy.
            </div>
          </div>
        </div>
      )}

      {/* Window Blurred Privacy Veil */}
      {isWindowBlurred && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/75 backdrop-blur-3xl text-center p-6 animate-in fade-in">
          <div className="p-4 rounded-3xl bg-purple-950/80 border border-pink-500/40 shadow-2xl max-w-sm w-full space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-pink-500/20 text-pink-400 mx-auto flex items-center justify-center border border-pink-500/40">
              <EyeOff className="w-6 h-6 animate-pulse" />
            </div>
            <h3 className="font-bold text-sm text-pink-200">Private Space Shielded</h3>
            <p className="text-xs text-purple-200/70 leading-relaxed">
              VibePair automatically veiled your screen while the application window was not in focus.
            </p>
            <div className="text-[11px] font-mono text-purple-300/50 pt-1">
              Click anywhere inside the window to restore
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
