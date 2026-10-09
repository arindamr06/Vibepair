'use client';

import React, { useState } from 'react';
import {
  DATE_IDEAS,
  CONVERSATION_STARTERS,
  APOLOGY_TEMPLATES,
  generateLoveMessage,
  DateIdea,
} from '@/lib/aiAssistant';
import {
  Sparkles,
  Heart,
  CalendarHeart,
  MessageCircleHeart,
  Smile,
  Copy,
  Check,
  Send,
  Coffee,
  Moon,
  Compass,
} from 'lucide-react';

interface AICupidPanelProps {
  partnerName: string;
  onSendToChat?: (text: string) => void;
}

export const AICupidPanel: React.FC<AICupidPanelProps> = ({ partnerName, onSendToChat }) => {
  const [activeTab, setActiveTab] = useState<'dates' | 'apology' | 'conversation' | 'letters'>('dates');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Custom love letter generator state
  const [letterType, setLetterType] = useState<'morning' | 'night' | 'miss_you' | 'random'>('morning');
  const [generatedLetter, setGeneratedLetter] = useState<string>(() =>
    generateLoveMessage('morning', partnerName)
  );

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleGenerateLetter = (type: typeof letterType) => {
    setLetterType(type);
    setGeneratedLetter(generateLoveMessage(type, partnerName));
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-950/80 rounded-2xl overflow-hidden border border-purple-500/20 backdrop-blur-xl shadow-2xl p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-purple-500/20 mb-6 flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-300 to-indigo-300 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-pink-400 animate-pulse" />
            VibeCupid Relationship AI
          </h2>
          <p className="text-xs text-purple-300/70">
            Privacy-first couple assistant for date inspiration, gentle apologies, and deep conversations.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 bg-black/40 p-1 rounded-2xl border border-purple-500/30">
          {[
            { id: 'dates', label: 'Date Ideas 🥂' },
            { id: 'apology', label: 'Apology Craft 🕊️' },
            { id: 'conversation', label: 'Deep Starters 💬' },
            { id: 'letters', label: 'Love Notes 💌' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: Date Ideas */}
      {activeTab === 'dates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DATE_IDEAS.map((date, idx) => (
            <div
              key={idx}
              className="p-5 rounded-3xl bg-slate-900/90 border border-purple-500/30 hover:border-pink-500/60 shadow-xl transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-pink-950/60 text-pink-300 border border-pink-500/40">
                    {date.category} • {date.duration}
                  </span>
                </div>
                <h3 className="font-bold text-sm text-pink-200 mb-2">{date.title}</h3>
                <p className="text-xs text-purple-200/80 mb-3 leading-relaxed">{date.description}</p>
                <div className="space-y-1">
                  {date.tips.map((t, i) => (
                    <div key={i} className="text-[11px] text-purple-300/60 flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-pink-400" /> {t}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-purple-500/20 flex justify-end gap-2">
                <button
                  onClick={() => handleCopy(`Hey ${partnerName}! How about this date idea: "${date.title}"? ${date.description}`, `date_${idx}`)}
                  className="px-3 py-1.5 rounded-xl bg-purple-900/40 hover:bg-purple-800 text-purple-200 text-xs font-medium flex items-center gap-1"
                >
                  {copiedId === `date_${idx}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  Copy Idea
                </button>
                {onSendToChat && (
                  <button
                    onClick={() => onSendToChat(`Date Idea for us: "${date.title}" ✨\n${date.description}`)}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold flex items-center gap-1"
                  >
                    <Send className="w-3.5 h-3.5" /> Send to Chat
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Apology Assistance */}
      {activeTab === 'apology' && (
        <div className="max-w-2xl mx-auto w-full space-y-4">
          <p className="text-xs text-purple-300/70 mb-2">
            Disagreements happen in every healthy relationship. Here are sincere, de-escalating apology templates drafted to communicate love, respect, and emotional maturity:
          </p>
          {APOLOGY_TEMPLATES.map((tmpl, idx) => (
            <div
              key={idx}
              className="p-5 rounded-3xl bg-slate-900/90 border border-purple-500/30 hover:border-pink-500/50 shadow-xl space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-pink-300 flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-pink-500" /> {tmpl.subject}
                </span>
                <span className="text-[10px] uppercase font-bold text-purple-400 px-2 py-0.5 rounded-full bg-purple-950/60 border border-purple-500/20">
                  {tmpl.tone} tone
                </span>
              </div>
              <p className="text-xs sm:text-sm text-purple-100 leading-relaxed italic bg-black/30 p-3 rounded-2xl border border-purple-500/20">
                "{tmpl.text}"
              </p>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => handleCopy(tmpl.text, `apol_${idx}`)}
                  className="px-3 py-1.5 rounded-xl bg-purple-900/40 hover:bg-purple-800 text-purple-200 text-xs font-medium flex items-center gap-1"
                >
                  {copiedId === `apol_${idx}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  Copy
                </button>
                {onSendToChat && (
                  <button
                    onClick={() => onSendToChat(tmpl.text)}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold flex items-center gap-1"
                  >
                    <Send className="w-3.5 h-3.5" /> Send to {partnerName}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Deep Conversation Starters */}
      {activeTab === 'conversation' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CONVERSATION_STARTERS.map((item, idx) => (
            <div
              key={idx}
              className="p-5 rounded-3xl bg-slate-900/90 border border-purple-500/30 hover:border-pink-500/50 shadow-xl flex flex-col justify-between"
            >
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-pink-400 mb-2 block">
                  {item.category}
                </span>
                <p className="text-xs sm:text-sm font-semibold text-purple-100 leading-relaxed">
                  "{item.question}"
                </p>
              </div>
              <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-purple-500/20">
                <button
                  onClick={() => handleCopy(item.question, `q_${idx}`)}
                  className="px-3 py-1.5 rounded-xl bg-purple-900/40 hover:bg-purple-800 text-purple-200 text-xs font-medium flex items-center gap-1"
                >
                  {copiedId === `q_${idx}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  Copy
                </button>
                {onSendToChat && (
                  <button
                    onClick={() => onSendToChat(`Question for you: "${item.question}" 💭`)}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold flex items-center gap-1"
                  >
                    <Send className="w-3.5 h-3.5" /> Ask in Chat
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 4: Love Letters & Notes */}
      {activeTab === 'letters' && (
        <div className="max-w-xl mx-auto w-full space-y-5">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {[
              { id: 'morning', label: 'Good Morning ☀️' },
              { id: 'night', label: 'Sweet Dreams 🌙' },
              { id: 'miss_you', label: 'Thinking of You 🧸' },
              { id: 'random', label: 'Affirmation 💖' },
            ].map(type => (
              <button
                key={type.id}
                onClick={() => handleGenerateLetter(type.id as any)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  letterType === type.id
                    ? 'bg-pink-600 text-white shadow-md'
                    : 'bg-black/40 text-purple-200 hover:bg-white/10'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/90 border border-purple-500/40 shadow-2xl space-y-4">
            <h3 className="font-bold text-sm text-pink-300 flex items-center gap-2">
              <MessageCircleHeart className="w-4 h-4 text-pink-400" /> Personalized Note for {partnerName}
            </h3>

            <p className="text-xs sm:text-sm text-purple-100 leading-relaxed bg-black/40 p-4 rounded-2xl border border-purple-500/20 italic">
              "{generatedLetter}"
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => handleCopy(generatedLetter, 'letter')}
                className="px-4 py-2 rounded-xl bg-purple-900/40 hover:bg-purple-800 text-purple-200 text-xs font-medium flex items-center gap-1.5"
              >
                {copiedId === 'letter' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                Copy Letter
              </button>
              {onSendToChat && (
                <button
                  onClick={() => onSendToChat(generatedLetter)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-pink-500/30"
                >
                  <Send className="w-3.5 h-3.5" /> Send to {partnerName}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
