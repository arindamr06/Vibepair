'use client';

import React, { useState, useEffect } from 'react';
import { MultiplayerClient } from '@/lib/multiplayer';
import confetti from 'canvas-confetti';
import {
  Heart,
  Plus,
  Image as ImageIcon,
  Calendar,
  Sparkles,
  Trash2,
  Clock,
  Pin,
} from 'lucide-react';

export interface CoupleMemory {
  id: string;
  title: string;
  date: string;
  imageUrl?: string;
  note: string;
  moodEmoji: string;
  colorTag: string;
}

const DEFAULT_MEMORIES: CoupleMemory[] = [
  {
    id: 'mem_1',
    title: 'First Stargazing Date ✨',
    date: '2025-06-14',
    note: 'We laid on the roof with blankets and pointed out shooting stars until 3 AM.',
    moodEmoji: '💫',
    colorTag: '#ec4899',
  },
  {
    id: 'mem_2',
    title: 'The Seaside Sunset Walk 🌊',
    date: '2025-08-22',
    note: 'Waves washing over our feet while sharing vanilla gelato by the pier.',
    moodEmoji: '🌅',
    colorTag: '#a855f7',
  },
  {
    id: 'mem_3',
    title: 'Building our First VibePair Home 🏡',
    date: '2026-02-10',
    note: 'Placed the glowing heart arch and spent hours decorating the garden together.',
    moodEmoji: '💖',
    colorTag: '#38bdf8',
  },
];

interface MemoriesWallProps {
  multiplayer: MultiplayerClient;
  partnerName: string;
}

export const MemoriesWall: React.FC<MemoriesWallProps> = ({ multiplayer, partnerName }) => {
  const [memories, setMemories] = useState<CoupleMemory[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vibepair_memories');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return DEFAULT_MEMORIES;
  });

  const [anniversaryDate, setAnniversaryDate] = useState<string>('2025-01-01');
  const [daysTogether, setDaysTogether] = useState<number>(0);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Memory Form
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('2026-02-14');
  const [newNote, setNewNote] = useState('');
  const [newEmoji, setNewEmoji] = useState('💖');
  const [newImage, setNewImage] = useState<string | undefined>(undefined);

  useEffect(() => {
    setNewDate(new Date().toISOString().split('T')[0]);
  }, []);

  // Calculate days together
  useEffect(() => {
    const start = new Date(anniversaryDate).getTime();
    const now = Date.now();
    const diffDays = Math.max(1, Math.floor((now - start) / (1000 * 60 * 60 * 24)));
    setDaysTogether(diffDays);
  }, [anniversaryDate]);

  // Sync with multiplayer
  useEffect(() => {
    const unsub = multiplayer.on('MEMORY_SYNC', (msg: any) => {
      if (msg.data?.memories) {
        setMemories(msg.data.memories);
        localStorage.setItem('vibepair_memories', JSON.stringify(msg.data.memories));
      }
    });
    return () => unsub();
  }, [multiplayer]);

  const handleAddMemory = () => {
    if (!newTitle.trim()) return;

    const mem: CoupleMemory = {
      id: `mem_${Date.now()}`,
      title: newTitle.trim(),
      date: newDate,
      note: newNote.trim(),
      moodEmoji: newEmoji,
      imageUrl: newImage,
      colorTag: '#ec4899',
    };

    const updated = [mem, ...memories];
    setMemories(updated);
    localStorage.setItem('vibepair_memories', JSON.stringify(updated));
    multiplayer.send('MEMORY_SYNC', { memories: updated });

    confetti({ particleCount: 35, spread: 60 });
    setIsAddModalOpen(false);
    setNewTitle('');
    setNewNote('');
    setNewImage(undefined);
  };

  const handleDeleteMemory = (id: string) => {
    const updated = memories.filter(m => m.id !== id);
    setMemories(updated);
    localStorage.setItem('vibepair_memories', JSON.stringify(updated));
    multiplayer.send('MEMORY_SYNC', { memories: updated });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setNewImage(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-950/80 rounded-2xl overflow-hidden border border-purple-500/20 backdrop-blur-xl shadow-2xl p-6 overflow-y-auto">
      {/* Memories Header & Counter */}
      <div className="flex items-center justify-between pb-6 border-b border-purple-500/20 mb-6 flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-300 to-indigo-300 flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-500 fill-pink-500 animate-pulse" />
            Our Shared Memories & Milestones
          </h2>
          <p className="text-xs text-purple-300/70">
            A private encrypted timeline of your sweetest moments together.
          </p>
        </div>

        {/* Days Together Counter Pill */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-2xl bg-gradient-to-r from-purple-950/90 to-pink-950/90 border border-pink-500/30 text-center shadow-lg">
            <div className="text-[10px] uppercase font-bold tracking-wider text-pink-300 flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3 text-pink-400" /> In Love For
            </div>
            <div className="text-lg font-black text-white font-mono">{daysTogether} Days</div>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:brightness-110 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-pink-500/30 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" /> Add Memory
          </button>
        </div>
      </div>

      {/* Polaroid Memories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {memories.map(mem => (
          <div
            key={mem.id}
            className="relative p-5 rounded-3xl bg-slate-900/90 border border-purple-500/30 hover:border-pink-500/60 shadow-xl transition-all hover:-translate-y-1 group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{mem.moodEmoji}</span>
                <span className="text-xs font-semibold text-purple-300/80 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-pink-400" /> {mem.date}
                </span>
              </div>
              <button
                onClick={() => handleDeleteMemory(mem.id)}
                className="opacity-0 group-hover:opacity-100 text-purple-400 hover:text-red-400 p-1 transition-opacity"
                title="Remove memory"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {mem.imageUrl && (
              <div className="rounded-2xl overflow-hidden mb-3 max-h-48 border border-purple-500/20">
                <img src={mem.imageUrl} alt={mem.title} className="w-full h-full object-cover" />
              </div>
            )}

            <h3 className="font-bold text-sm text-pink-200 mb-1">{mem.title}</h3>
            <p className="text-xs text-purple-200/70 leading-relaxed">{mem.note}</p>
          </div>
        ))}
      </div>

      {/* Add Memory Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-950 border border-purple-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-purple-500/20">
              <h3 className="font-bold text-sm text-pink-300 flex items-center gap-2">
                <Pin className="w-4 h-4 text-pink-400" /> New Memory Polaroid
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-xs text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="text-[11px] uppercase font-bold text-purple-300 block mb-1">
                Memory Title
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="e.g. Midnight Picnic by the Ocean"
                className="w-full bg-slate-900 border border-purple-500/30 rounded-xl px-3.5 py-2 text-xs text-purple-100 focus:outline-none focus:border-pink-500"
              />
            </div>

            <div>
              <label className="text-[11px] uppercase font-bold text-purple-300 block mb-1">Date</label>
              <input
                type="date"
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
                className="w-full bg-slate-900 border border-purple-500/30 rounded-xl px-3.5 py-2 text-xs text-purple-100 focus:outline-none focus:border-pink-500"
              />
            </div>

            <div>
              <label className="text-[11px] uppercase font-bold text-purple-300 block mb-1">
                Sweet Note
              </label>
              <textarea
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                rows={3}
                placeholder="What made this moment so special?"
                className="w-full bg-slate-900 border border-purple-500/30 rounded-xl px-3.5 py-2 text-xs text-purple-100 focus:outline-none focus:border-pink-500"
              />
            </div>

            <div>
              <label className="text-[11px] uppercase font-bold text-purple-300 block mb-1">
                Mood Emoji
              </label>
              <div className="flex gap-2">
                {['💖', '✨', '🌅', '🌸', '🧸', '🥂', '🍰', '🌊'].map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => setNewEmoji(emoji)}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center text-lg border transition-all ${
                      newEmoji === emoji ? 'bg-pink-600 border-pink-400 scale-110' : 'bg-slate-900 border-purple-500/20'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] uppercase font-bold text-purple-300 block mb-1">
                Attach Photo
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="text-xs text-gray-400 file:mr-2 file:py-1 file:px-3 file:rounded-xl file:border-0 file:text-xs file:bg-purple-900/60 file:text-purple-200 hover:file:bg-purple-800"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMemory}
                disabled={!newTitle.trim()}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold text-xs shadow-lg shadow-pink-500/30 active:scale-95 disabled:opacity-50"
              >
                Save Memory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
