'use client';

import React from 'react';
import { Heart, X, Check, Sparkles } from 'lucide-react';

interface ConsentModalProps {
  partnerName: string;
  interactionType: 'hug' | 'kiss' | 'hold_hands' | 'dance' | 'cuddle';
  onAccept: () => void;
  onDecline: () => void;
}

const INTERACTION_DETAILS = {
  hug: {
    title: 'Warm Embracing Hug',
    emoji: '🤗',
    desc: 'Wants to pull you close for a gentle, warm hug.',
  },
  kiss: {
    title: 'Sweet Forehead & Cheek Kiss',
    emoji: '💋',
    desc: 'Wants to lean in for a sweet, affectionate kiss.',
  },
  hold_hands: {
    title: 'Hold Hands While Walking',
    emoji: '🤝',
    desc: 'Wants to clasp your hand and explore the 3D world together.',
  },
  dance: {
    title: 'Slow Dance Under The Stars',
    emoji: '💃',
    desc: 'Wants to slow-dance with you under the sakura moonlight.',
  },
  cuddle: {
    title: 'Cozy Cuddle on the Cloud Bed',
    emoji: '🛋️',
    desc: 'Wants to relax and cuddle closely together.',
  },
};

export const ConsentModal: React.FC<ConsentModalProps> = ({
  partnerName,
  interactionType,
  onAccept,
  onDecline,
}) => {
  const details = INTERACTION_DETAILS[interactionType] || INTERACTION_DETAILS.hug;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-sm bg-slate-950 border-2 border-pink-500/60 rounded-3xl p-6 shadow-2xl text-center space-y-4 animate-in zoom-in-95">
        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 mx-auto flex items-center justify-center text-3xl shadow-xl shadow-pink-500/30">
          {details.emoji}
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-pink-400 bg-pink-950/60 px-3 py-1 rounded-full border border-pink-500/30">
            Consensual Interaction Request
          </span>
          <h3 className="text-base font-bold text-white mt-2">
            {partnerName} requested: {details.title}
          </h3>
          <p className="text-xs text-purple-200/80 mt-1">{details.desc}</p>
        </div>

        <div className="text-[11px] text-purple-300/60 italic">
          All intimate couple actions require mutual consent between partners.
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onDecline}
            className="flex-1 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-gray-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
          >
            <X className="w-4 h-4" /> Not right now
          </button>
          <button
            onClick={onAccept}
            className="flex-1 py-2.5 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 hover:brightness-110 text-white text-xs font-bold shadow-lg shadow-pink-500/30 flex items-center justify-center gap-1.5 transition-all active:scale-95"
          >
            <Heart className="w-4 h-4 fill-white" /> Accept 💖
          </button>
        </div>
      </div>
    </div>
  );
};
