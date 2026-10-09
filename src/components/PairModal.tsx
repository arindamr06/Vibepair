'use client';

import React, { useState, useEffect } from 'react';
import { generatePairCode, generateSecretKey, deriveKey, computeFingerprint } from '@/lib/crypto';
import { Heart, ShieldCheck, Copy, Check, Sparkles, Key, Link as LinkIcon, Users } from 'lucide-react';

interface PairModalProps {
  isOpen: boolean;
  onConnected: (data: {
    roomCode: string;
    secretKey: string;
    cryptoKey: CryptoKey;
    userName: string;
    fingerprint: string;
  }) => void;
}

export const PairModal: React.FC<PairModalProps> = ({ isOpen, onConnected }) => {
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [roomCode, setRoomCode] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [userName, setUserName] = useState('Soulmate');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [fingerprint, setFingerprint] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Initialize defaults and check URL params for instant join
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const urlRoom = params.get('room');
    const urlKey = params.get('key');

    if (urlRoom && urlKey) {
      setTab('join');
      setRoomCode(urlRoom);
      setSecretKey(urlKey);
    } else {
      const savedRoom = localStorage.getItem('vibepair_last_room');
      const savedKey = localStorage.getItem('vibepair_last_key');
      const savedName = localStorage.getItem('vibepair_my_name');

      if (savedName) setUserName(savedName);

      if (savedRoom && savedKey) {
        setRoomCode(savedRoom);
        setSecretKey(savedKey);
      } else {
        const newCode = generatePairCode();
        const newKey = generateSecretKey();
        setRoomCode(newCode);
        setSecretKey(newKey);
      }
    }
  }, []);

  // Compute SHA-256 fingerprint whenever roomCode or secretKey updates
  useEffect(() => {
    if (roomCode && secretKey) {
      computeFingerprint(roomCode, secretKey).then(fp => setFingerprint(fp));
    }
  }, [roomCode, secretKey]);

  const handleGenerateNew = () => {
    const newCode = generatePairCode();
    const newKey = generateSecretKey();
    setRoomCode(newCode);
    setSecretKey(newKey);
  };

  const handleCopyInviteLink = () => {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(roomCode)}&key=${encodeURIComponent(secretKey)}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2200);
  };

  const handleConnect = async () => {
    const cleanRoom = roomCode.trim().toUpperCase();
    const cleanKey = secretKey.trim();
    const cleanName = userName.trim() || 'Soulmate';

    if (!cleanRoom || !cleanKey) {
      alert('Please provide both Room Code and Encryption Key.');
      return;
    }

    setIsLoading(true);
    try {
      const cryptoKey = await deriveKey(cleanKey);
      const fp = await computeFingerprint(cleanRoom, cleanKey);

      localStorage.setItem('vibepair_last_room', cleanRoom);
      localStorage.setItem('vibepair_last_key', cleanKey);
      localStorage.setItem('vibepair_my_name', cleanName);

      onConnected({
        roomCode: cleanRoom,
        secretKey: cleanKey,
        cryptoKey,
        userName: cleanName,
        fingerprint: fp,
      });
    } catch (e) {
      alert('Cryptographic key generation failed. Check your input.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-2xl animate-in fade-in">
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto bg-slate-950 border-2 border-pink-500/50 rounded-3xl p-5 sm:p-8 shadow-2xl space-y-5 sm:space-y-6 relative">
        {/* Glow backdrop decorative spots */}
        <div className="absolute -top-20 -left-20 w-48 h-48 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 mx-auto flex items-center justify-center shadow-lg shadow-pink-500/30">
            <Heart className="w-7 h-7 text-white fill-white animate-pulse" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-300 to-indigo-300">
            Welcome to VibePair
          </h2>
          <p className="text-xs text-purple-200/80">
            Your private, encrypted 3D sanctuary for two. No signups or logins required.
          </p>
        </div>

        {/* Create Room vs Join Room Switcher */}
        <div className="flex bg-slate-900 p-1 rounded-2xl border border-purple-500/20">
          <button
            onClick={() => setTab('create')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              tab === 'create'
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Create Private Room
          </button>
          <button
            onClick={() => setTab('join')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              tab === 'join'
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Join Partner's Room
          </button>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <div>
            <label className="text-[11px] uppercase font-bold text-purple-300 block mb-1">
              Your Nickname
            </label>
            <input
              type="text"
              value={userName}
              onChange={e => setUserName(e.target.value)}
              placeholder="e.g. Darling, Sunshine, Honey"
              className="w-full bg-slate-900 border border-purple-500/30 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-purple-100 focus:outline-none focus:border-pink-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] uppercase font-bold text-purple-300">
                Couple Room Code
              </label>
              {tab === 'create' && (
                <button
                  onClick={handleGenerateNew}
                  className="text-[11px] text-pink-400 hover:underline flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" /> Regenerate
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={roomCode}
                onChange={e => setRoomCode(e.target.value)}
                placeholder="e.g. NEON-7788-SOUL"
                className="flex-1 bg-slate-900 border border-purple-500/30 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-pink-300 font-mono font-bold focus:outline-none focus:border-pink-500"
              />
              <button
                onClick={handleCopyCode}
                className="px-3 rounded-xl bg-purple-900/40 hover:bg-purple-800 text-purple-200 border border-purple-500/30 text-xs font-medium flex items-center gap-1"
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-[11px] uppercase font-bold text-purple-300 block mb-1">
              End-to-End Encryption Passphrase / Secret Key
            </label>
            <div className="flex items-center gap-2 bg-slate-900 border border-purple-500/30 rounded-xl px-4 py-2">
              <Key className="w-4 h-4 text-pink-400 flex-shrink-0" />
              <input
                type="text"
                value={secretKey}
                onChange={e => setSecretKey(e.target.value)}
                placeholder="Cryptographic passphrase or secret token"
                className="flex-1 bg-transparent text-xs text-purple-200 font-mono focus:outline-none"
              />
            </div>
          </div>

          {/* Cryptographic Safety Verification Fingerprint */}
          {fingerprint && (
            <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/30 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 text-purple-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Verification Fingerprint:</span>
              </div>
              <span className="font-mono text-emerald-300 font-bold tracking-wider">
                {fingerprint}
              </span>
            </div>
          )}
        </div>

        {/* Shareable Direct Invite Link Button */}
        {tab === 'create' && (
          <button
            onClick={handleCopyInviteLink}
            className="w-full py-2.5 rounded-2xl bg-purple-900/40 hover:bg-purple-900/70 border border-purple-500/40 text-purple-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all hover:scale-[1.02] shadow-sm"
          >
            {copiedLink ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Instant Invite Link Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <LinkIcon className="w-4 h-4 text-pink-400" />
                <span>Copy Instant Invite Link for Partner</span>
              </>
            )}
          </button>
        )}

        {/* Enter Sanctuary Button */}
        <button
          onClick={handleConnect}
          disabled={isLoading}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:brightness-110 text-white font-bold text-sm shadow-xl shadow-pink-500/30 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          {isLoading ? 'Deriving E2E Crypto Keys...' : 'Enter Private 3D Sanctuary'}
        </button>
      </div>
    </div>
  );
};
