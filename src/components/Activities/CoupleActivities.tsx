'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MultiplayerClient } from '@/lib/multiplayer';
import confetti from 'canvas-confetti';
import {
  Gamepad2,
  Sparkles,
  Dice5,
  PenTool,
  HelpCircle,
  Heart,
  RotateCcw,
  Check,
  Flame,
  Award,
} from 'lucide-react';

interface CoupleActivitiesProps {
  multiplayer: MultiplayerClient;
  partnerName: string;
}

const TRIVIA_QUESTIONS = [
  {
    q: 'Where was our very first official date or hangout?',
    options: ['Cozy Coffee Shop ☕', 'Walk in the Park 🌸', 'Cinema Movie 🍿', 'Romantic Dinner 🍷'],
  },
  {
    q: 'What is my absolute comfort food when having a long day?',
    options: ['Cheesy Pizza 🍕', 'Spicy Noodles 🍜', 'Chocolate & Ice Cream 🍨', 'French Fries 🍟'],
  },
  {
    q: 'What is my favorite way to spend a quiet Sunday afternoon with you?',
    options: ['Bingeing TV in bed 🛋️', 'Going for a sunset drive 🚗', 'Cooking together 🍳', 'Cuddling with music 🎧'],
  },
  {
    q: 'Which love language makes me feel most cherished?',
    options: ['Physical Touch & Cuddles 🤗', 'Words of Affirmation 💌', 'Quality Undivided Time ⏳', 'Thoughtful Surprises 🎁'],
  },
];

const TRUTH_OR_DARE_PROMPTS = [
  { type: 'Truth', text: 'What was the exact moment you realized you had real feelings for me?' },
  { type: 'Dare', text: 'Give your partner a 60-second gentle neck or temple massage right now!' },
  { type: 'Truth', text: 'What is one silly quirk of mine that secretly makes you melt?' },
  { type: 'Dare', text: 'Whisper 3 things you love most about your partner into the mic!' },
  { type: 'Truth', text: 'If we could escape anywhere in the world next weekend, where would we fly?' },
  { type: 'Dare', text: 'Hold your partner’s hand (or send 5 heart reactions) for the next 2 minutes straight!' },
  { type: 'Truth', text: 'What is your favorite romantic memory of us so far?' },
  { type: 'Dare', text: 'Sing the chorus of our favorite couple song or dance for 10 seconds!' },
];

export const CoupleActivities: React.FC<CoupleActivitiesProps> = ({ multiplayer, partnerName }) => {
  const [activeTab, setActiveTab] = useState<'trivia' | 'truth_dare' | 'doodle'>('trivia');

  // Trivia State
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [myAnswer, setMyAnswer] = useState<number | null>(null);
  const [partnerAnswer, setPartnerAnswer] = useState<number | null>(null);
  const [triviaScore, setTriviaScore] = useState(0);

  // Truth or Dare State
  const [todPrompt, setTodPrompt] = useState(TRUTH_OR_DARE_PROMPTS[0]);
  const [isRolling, setIsRolling] = useState(false);

  // Doodle Canvas State
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const [brushColor, setBrushColor] = useState('#ec4899');
  const [brushSize, setBrushSize] = useState(4);

  // Sync incoming mini-game signals
  useEffect(() => {
    const unsub = multiplayer.on('MINIGAME_ACTION', (msg: any) => {
      const data = msg.data;
      if (!data) return;

      if (data.action === 'TRIVIA_ANSWER') {
        setPartnerAnswer(data.answer);
      } else if (data.action === 'NEXT_QUESTION') {
        setCurrentQIndex(data.index);
        setMyAnswer(null);
        setPartnerAnswer(null);
      } else if (data.action === 'TOD_ROLL') {
        setTodPrompt(data.prompt);
      } else if (data.action === 'DOODLE_DRAW') {
        drawRemoteStroke(data.x0, data.y0, data.x1, data.y1, data.color, data.size);
      } else if (data.action === 'DOODLE_CLEAR') {
        clearLocalCanvas();
      }
    });

    return () => unsub();
  }, [multiplayer]);

  // Trivia Handlers
  const handleSelectAnswer = (idx: number) => {
    setMyAnswer(idx);
    multiplayer.send('MINIGAME_ACTION', {
      action: 'TRIVIA_ANSWER',
      answer: idx,
    });
    if (partnerAnswer !== null && partnerAnswer === idx) {
      setTriviaScore(s => s + 1);
      confetti({ particleCount: 40, spread: 60 });
    }
  };

  const handleNextQuestion = () => {
    const nextIdx = (currentQIndex + 1) % TRIVIA_QUESTIONS.length;
    setCurrentQIndex(nextIdx);
    setMyAnswer(null);
    setPartnerAnswer(null);
    multiplayer.send('MINIGAME_ACTION', {
      action: 'NEXT_QUESTION',
      index: nextIdx,
    });
  };

  // Truth or Dare Handlers
  const rollTruthOrDare = () => {
    setIsRolling(true);
    setTimeout(() => {
      const picked = TRUTH_OR_DARE_PROMPTS[Math.floor(Math.random() * TRUTH_OR_DARE_PROMPTS.length)];
      setTodPrompt(picked);
      setIsRolling(false);
      multiplayer.send('MINIGAME_ACTION', {
        action: 'TOD_ROLL',
        prompt: picked,
      });
      confetti({ particleCount: 30, spread: 50 });
    }, 400);
  };

  // Doodle Canvas Handlers
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    isDrawingRef.current = true;
    lastPosRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const drawMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !lastPosRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();

      multiplayer.send('MINIGAME_ACTION', {
        action: 'DOODLE_DRAW',
        x0: lastPosRef.current.x,
        y0: lastPosRef.current.y,
        x1: x,
        y1: y,
        color: brushColor,
        size: brushSize,
      });
    }

    lastPosRef.current = { x, y };
  };

  const endDraw = () => {
    isDrawingRef.current = false;
    lastPosRef.current = null;
  };

  const startTouchDraw = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || e.touches.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    isDrawingRef.current = true;
    lastPosRef.current = {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
  };

  const touchDrawMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !lastPosRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas || e.touches.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();

      multiplayer.send('MINIGAME_ACTION', {
        action: 'DOODLE_DRAW',
        x0: lastPosRef.current.x,
        y0: lastPosRef.current.y,
        x1: x,
        y1: y,
        color: brushColor,
        size: brushSize,
      });
    }

    lastPosRef.current = { x, y };
  };

  const drawRemoteStroke = (
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    color: string,
    size: number
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = color;
      ctx.lineWidth = size;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
  };

  const clearLocalCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleClearCanvas = () => {
    clearLocalCanvas();
    multiplayer.send('MINIGAME_ACTION', { action: 'DOODLE_CLEAR' });
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-950/80 rounded-2xl overflow-hidden border border-purple-500/20 backdrop-blur-xl shadow-2xl p-6">
      {/* Mini-Games Header & Navigation */}
      <div className="flex items-center justify-between pb-4 border-b border-purple-500/20 mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-300 to-indigo-300 flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-pink-400" />
            Couple Mini-Games & Shared Activities
          </h2>
          <p className="text-xs text-purple-300/70">
            Synchronized playful games designed exclusively for two partners.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-black/40 p-1 rounded-2xl border border-purple-500/30">
          {[
            { id: 'trivia', label: 'Couple Trivia 🧠' },
            { id: 'truth_dare', label: 'Truth or Dare 🎲' },
            { id: 'doodle', label: 'Love Doodles 🎨' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
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

      {/* Mini-Game 1: Couple Trivia */}
      {activeTab === 'trivia' && (
        <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full justify-center">
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-purple-500/30 shadow-2xl space-y-6">
            <div className="flex items-center justify-between text-xs text-purple-300">
              <span className="font-bold uppercase tracking-wider text-pink-400">
                Question {currentQIndex + 1} of {TRIVIA_QUESTIONS.length}
              </span>
              <span className="flex items-center gap-1 font-bold text-amber-300">
                <Award className="w-4 h-4" /> Match Score: {triviaScore}
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-semibold text-white">
              {TRIVIA_QUESTIONS[currentQIndex].q}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TRIVIA_QUESTIONS[currentQIndex].options.map((opt, idx) => {
                const isMyChoice = myAnswer === idx;
                const isPartnerChoice = partnerAnswer === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectAnswer(idx)}
                    className={`p-4 rounded-2xl text-left text-xs sm:text-sm font-medium border transition-all ${
                      isMyChoice
                        ? 'bg-pink-950/80 border-pink-500 text-pink-200 ring-2 ring-pink-500 shadow-lg'
                        : 'bg-black/30 border-purple-500/20 text-gray-200 hover:border-purple-400'
                    }`}
                  >
                    <div>{opt}</div>
                    <div className="mt-2 flex gap-1.5 text-[10px]">
                      {isMyChoice && (
                        <span className="px-2 py-0.5 rounded-full bg-pink-500 text-white font-bold">
                          You Picked
                        </span>
                      )}
                      {isPartnerChoice && (
                        <span className="px-2 py-0.5 rounded-full bg-purple-500 text-white font-bold">
                          {partnerName} Picked
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {myAnswer !== null && partnerAnswer !== null && (
              <div
                className={`p-3 rounded-2xl text-center text-xs font-bold ${
                  myAnswer === partnerAnswer
                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500'
                    : 'bg-amber-950/80 text-amber-300 border border-amber-500'
                }`}
              >
                {myAnswer === partnerAnswer
                  ? '🎉 In Perfect Sync! You both picked the exact same answer!'
                  : '✨ Cute divergence! Compare why you each chose differently.'}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={handleNextQuestion}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:brightness-110 text-white text-xs font-bold shadow-lg shadow-pink-500/30 transition-all active:scale-95"
              >
                Next Question ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mini-Game 2: Romantic Truth or Dare */}
      {activeTab === 'truth_dare' && (
        <div className="flex-1 flex flex-col max-w-xl mx-auto w-full items-center justify-center space-y-6">
          <div className="w-full p-8 rounded-3xl bg-slate-900/90 border border-purple-500/30 shadow-2xl text-center relative overflow-hidden">
            <span
              className={`inline-block px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border ${
                todPrompt.type === 'Truth'
                  ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40'
                  : 'bg-pink-950/80 text-pink-300 border-pink-500/40'
              }`}
            >
              {todPrompt.type === 'Truth' ? 'Heart Truth 💖' : 'Sweet Dare 🔥'}
            </span>

            <p className="text-base sm:text-xl font-semibold text-purple-100 min-h-[70px] flex items-center justify-center leading-relaxed">
              "{todPrompt.text}"
            </p>

            <div className="mt-8">
              <button
                onClick={rollTruthOrDare}
                disabled={isRolling}
                className={`px-8 py-3.5 rounded-2xl font-bold text-sm text-white shadow-xl flex items-center justify-center gap-2 mx-auto transition-all ${
                  isRolling
                    ? 'bg-purple-800 animate-spin'
                    : 'bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:scale-105 active:scale-95 shadow-pink-500/30'
                }`}
              >
                <Dice5 className="w-5 h-5" /> Roll Next Couple Prompt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mini-Game 3: Shared Canvas / Love Doodles */}
      {activeTab === 'doodle' && (
        <div className="flex-1 flex flex-col items-center justify-center w-full">
          {/* Canvas Controls */}
          <div className="flex items-center gap-3 mb-3 bg-black/40 p-2 rounded-2xl border border-purple-500/30 flex-wrap justify-center">
            <div className="flex items-center gap-1.5">
              {['#ec4899', '#f43f5e', '#a855f7', '#38bdf8', '#10b981', '#facc15', '#ffffff'].map(c => (
                <button
                  key={c}
                  onClick={() => setBrushColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-6 h-6 rounded-full border transition-transform ${
                    brushColor === c ? 'border-white scale-125 ring-2 ring-pink-500' : 'border-black/50'
                  }`}
                />
              ))}
            </div>

            <div className="h-4 w-px bg-purple-500/30" />

            <div className="flex items-center gap-2 text-xs text-purple-300">
              <span>Size:</span>
              <input
                type="range"
                min="2"
                max="16"
                value={brushSize}
                onChange={e => setBrushSize(parseInt(e.target.value, 10))}
                className="w-16 accent-pink-500"
              />
            </div>

            <button
              onClick={handleClearCanvas}
              className="px-3 py-1 rounded-xl bg-purple-900/40 hover:bg-purple-800 text-purple-200 text-xs flex items-center gap-1 border border-purple-500/20"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Clear Board
            </button>
          </div>

          {/* Real-time Drawing Canvas */}
          <div className="relative border-2 border-purple-500/40 rounded-3xl overflow-hidden shadow-2xl bg-slate-950">
            <canvas
              ref={canvasRef}
              width={700}
              height={420}
              onMouseDown={startDraw}
              onMouseMove={drawMove}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onTouchStart={startTouchDraw}
              onTouchMove={touchDrawMove}
              onTouchEnd={endDraw}
              className="cursor-crosshair max-w-full touch-none"
            />
            <div className="absolute bottom-2 right-3 text-[10px] text-purple-400/60 pointer-events-none">
              Live Synchronized Couple Canvas 🎨
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
