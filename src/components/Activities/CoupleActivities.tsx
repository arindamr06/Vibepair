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
  Eraser,
  Trophy,
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
  {
    q: 'If we could travel anywhere together right now, where would we go?',
    options: ['Tokyo Neon Lights 🗼', 'Paris River Seine 🥐', 'Tropical Beach Villa 🏝️', 'Cozy Mountain Cabin 🏔️'],
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
  { type: 'Truth', text: 'What is the sweetest thing I have ever done that touched your heart?' },
  { type: 'Dare', text: 'Look into partner’s eyes on camera for 15 seconds without laughing!' },
];

export const CoupleActivities: React.FC<CoupleActivitiesProps> = ({ multiplayer, partnerName }) => {
  const [activeTab, setActiveTab] = useState<'trivia' | 'truth_dare' | 'doodle' | 'tictactoe'>('trivia');

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

  // Tic-Tac-Toe State (💖 vs 💜)
  // Board cells: 0..8. Values: null | '💖' | '💜'
  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [currentTurn, setCurrentTurn] = useState<'💖' | '💜'>('💖');
  const [mySymbol, setMySymbol] = useState<'💖' | '💜'>('💖');
  const [tictactoeWinner, setTictactoeWinner] = useState<string | null>(null);

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
      } else if (data.action === 'TICTACTOE_MOVE') {
        handleRemoteMove(data.index, data.symbol, data.nextTurn);
      } else if (data.action === 'TICTACTOE_RESET') {
        resetTicTacToeLocal();
      }
    });

    return () => unsub();
  }, [multiplayer]);

  // Check Tic-Tac-Toe winner
  const checkWinner = (squares: (string | null)[]) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
      [0, 4, 8], [2, 4, 6],           // Diagonals
    ];
    for (const [a, b, c] of lines) {
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }
    if (squares.every(s => s !== null)) {
      return 'draw';
    }
    return null;
  };

  const handleCellClick = (index: number) => {
    if (board[index] || tictactoeWinner) return;
    if (currentTurn !== mySymbol) return; // Only allow clicking on your turn

    const newBoard = [...board];
    newBoard[index] = mySymbol;
    const nextTurn = mySymbol === '💖' ? '💜' : '💖';
    setBoard(newBoard);
    setCurrentTurn(nextTurn);

    const winner = checkWinner(newBoard);
    if (winner) {
      setTictactoeWinner(winner);
      if (winner === mySymbol) {
        confetti({ particleCount: 70, spread: 80 });
      }
    }

    multiplayer.send('MINIGAME_ACTION', {
      action: 'TICTACTOE_MOVE',
      index,
      symbol: mySymbol,
      nextTurn,
    });
  };

  const handleRemoteMove = (index: number, symbol: string, nextTurn: '💖' | '💜') => {
    setBoard(prev => {
      const newBoard = [...prev];
      newBoard[index] = symbol;
      const winner = checkWinner(newBoard);
      if (winner) {
        setTictactoeWinner(winner);
        confetti({ particleCount: 50, spread: 60 });
      }
      return newBoard;
    });
    setCurrentTurn(nextTurn);
  };

  const resetTicTacToeLocal = () => {
    setBoard(Array(9).fill(null));
    setTictactoeWinner(null);
    setCurrentTurn('💖');
  };

  const handleResetTicTacToe = () => {
    resetTicTacToeLocal();
    multiplayer.send('MINIGAME_ACTION', { action: 'TICTACTOE_RESET' });
  };

  // Trivia Handlers
  const handleSelectAnswer = (idx: number) => {
    setMyAnswer(idx);
    multiplayer.send('MINIGAME_ACTION', {
      action: 'TRIVIA_ANSWER',
      answer: idx,
    });
    if (partnerAnswer !== null && partnerAnswer === idx) {
      setTriviaScore(s => s + 1);
      confetti({ particleCount: 50, spread: 70 });
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
    if (isRolling) return;
    setIsRolling(true);
    setTimeout(() => {
      const picked = TRUTH_OR_DARE_PROMPTS[Math.floor(Math.random() * TRUTH_OR_DARE_PROMPTS.length)];
      setTodPrompt(picked);
      setIsRolling(false);
      multiplayer.send('MINIGAME_ACTION', {
        action: 'TOD_ROLL',
        prompt: picked,
      });
      confetti({ particleCount: 40, spread: 60 });
    }, 450);
  };

  // Doodle Canvas Coordinates with accurate DPI and bounding-box ratio scaling
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const getTouchCoords = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || e.touches.length === 0) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (touch.clientX - rect.left) * scaleX,
      y: (touch.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true;
    lastPosRef.current = getCanvasCoords(e);
  };

  const drawMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !lastPosRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const coords = getCanvasCoords(e);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();

      multiplayer.send('MINIGAME_ACTION', {
        action: 'DOODLE_DRAW',
        x0: lastPosRef.current.x,
        y0: lastPosRef.current.y,
        x1: coords.x,
        y1: coords.y,
        color: brushColor,
        size: brushSize,
      });
    }

    lastPosRef.current = coords;
  };

  const endDraw = () => {
    isDrawingRef.current = false;
    lastPosRef.current = null;
  };

  const startTouchDraw = (e: React.TouchEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true;
    lastPosRef.current = getTouchCoords(e);
  };

  const touchDrawMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !lastPosRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const coords = getTouchCoords(e);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();

      multiplayer.send('MINIGAME_ACTION', {
        action: 'DOODLE_DRAW',
        x0: lastPosRef.current.x,
        y0: lastPosRef.current.y,
        x1: coords.x,
        y1: coords.y,
        color: brushColor,
        size: brushSize,
      });
    }

    lastPosRef.current = coords;
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
      ctx.lineJoin = 'round';
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
    <div className="flex flex-col h-full w-full bg-slate-950/85 rounded-3xl overflow-hidden border border-purple-500/30 backdrop-blur-2xl shadow-2xl p-4 sm:p-6">
      {/* Mini-Games Header & Tab Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-purple-500/25 mb-4 sm:mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-300 to-indigo-200 flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-pink-400" />
            Couple Mini-Games & Shared Fun
          </h2>
          <p className="text-xs text-purple-200/80">
            Real-time multiplayer games designed exclusively for you and {partnerName}.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-black/50 p-1 rounded-2xl border border-purple-500/30 overflow-x-auto max-w-full scrollbar-none">
          {[
            { id: 'trivia', label: 'Trivia 🧠' },
            { id: 'truth_dare', label: 'Truth/Dare 🎲' },
            { id: 'tictactoe', label: 'Hearts Match 💖' },
            { id: 'doodle', label: 'Doodles 🎨' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md shadow-pink-500/30 scale-105'
                  : 'text-purple-300 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mini-Game 1: Couple Trivia */}
      {activeTab === 'trivia' && (
        <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full justify-center overflow-y-auto">
          <div className="p-5 sm:p-7 rounded-3xl bg-slate-900/90 border border-purple-500/35 shadow-2xl space-y-5">
            <div className="flex items-center justify-between text-xs text-purple-200 font-semibold">
              <span className="font-bold uppercase tracking-wider text-pink-400">
                Question {currentQIndex + 1} of {TRIVIA_QUESTIONS.length}
              </span>
              <span className="flex items-center gap-1.5 font-bold text-amber-300 bg-amber-950/50 px-2.5 py-1 rounded-full border border-amber-500/30">
                <Award className="w-4 h-4" /> Sync Score: {triviaScore}
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-bold text-white leading-relaxed">
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
                    className={`p-4 rounded-2xl text-left text-xs sm:text-sm font-semibold border transition-all active:scale-98 ${
                      isMyChoice
                        ? 'bg-pink-950/80 border-pink-400 text-pink-100 ring-2 ring-pink-500 shadow-lg shadow-pink-500/20'
                        : 'bg-black/40 border-purple-500/25 text-purple-100 hover:border-pink-400/60 hover:bg-white/5'
                    }`}
                  >
                    <div>{opt}</div>
                    <div className="mt-2.5 flex gap-1.5 text-[10px]">
                      {isMyChoice && (
                        <span className="px-2 py-0.5 rounded-full bg-pink-500 text-white font-bold">
                          You Picked
                        </span>
                      )}
                      {isPartnerChoice && (
                        <span className="px-2 py-0.5 rounded-full bg-purple-600 text-white font-bold">
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
                className={`p-3 rounded-2xl text-center text-xs font-bold border animate-in zoom-in-95 ${
                  myAnswer === partnerAnswer
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500'
                    : 'bg-amber-950/80 text-amber-300 border-amber-500'
                }`}
              >
                {myAnswer === partnerAnswer
                  ? '🎉 In Perfect Sync! You both picked the exact same answer!'
                  : '✨ Cute divergence! Talk about why you each chose differently.'}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={handleNextQuestion}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:brightness-110 text-white text-xs font-bold shadow-lg shadow-pink-500/30 transition-all active:scale-95 flex items-center gap-1.5"
              >
                <span>Next Question</span>
                <span>➔</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mini-Game 2: Romantic Truth or Dare */}
      {activeTab === 'truth_dare' && (
        <div className="flex-1 flex flex-col max-w-xl mx-auto w-full items-center justify-center space-y-6">
          <div className="w-full p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-purple-500/35 shadow-2xl text-center relative overflow-hidden">
            <span
              className={`inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border ${
                todPrompt.type === 'Truth'
                  ? 'bg-cyan-950/80 text-cyan-300 border-cyan-400'
                  : 'bg-pink-950/80 text-pink-300 border-pink-400'
              }`}
            >
              {todPrompt.type === 'Truth' ? 'Heart Truth 💖' : 'Sweet Dare 🔥'}
            </span>

            <p className="text-base sm:text-xl font-bold text-white min-h-[70px] flex items-center justify-center leading-relaxed">
              &ldquo;{todPrompt.text}&rdquo;
            </p>

            <div className="mt-8">
              {/* Button only has gentle active scale; only the icon spins */}
              <button
                onClick={rollTruthOrDare}
                disabled={isRolling}
                className="px-8 py-3.5 rounded-2xl font-bold text-xs sm:text-sm text-white shadow-xl flex items-center justify-center gap-2.5 mx-auto transition-all bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:scale-105 active:scale-95 shadow-pink-500/30 disabled:opacity-75"
              >
                <Dice5 className={`w-5 h-5 ${isRolling ? 'animate-spin' : ''}`} />
                <span>{isRolling ? 'Rolling Prompt...' : 'Roll Next Couple Prompt'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mini-Game 3: Hearts Tic-Tac-Toe (Multiplayer Turn-Based) */}
      {activeTab === 'tictactoe' && (
        <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full">
          <div className="w-full p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-purple-500/35 shadow-2xl flex flex-col items-center">
            {/* Symbol Switcher & Turn Banner */}
            <div className="flex items-center justify-between w-full mb-4 px-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-purple-300 font-semibold">Play as:</span>
                <button
                  onClick={() => setMySymbol('💖')}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all ${
                    mySymbol === '💖' ? 'bg-pink-600 text-white border-pink-400' : 'bg-black/30 text-gray-400 border-white/10'
                  }`}
                >
                  💖 Pink
                </button>
                <button
                  onClick={() => setMySymbol('💜')}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all ${
                    mySymbol === '💜' ? 'bg-purple-600 text-white border-purple-400' : 'bg-black/30 text-gray-400 border-white/10'
                  }`}
                >
                  💜 Purple
                </button>
              </div>

              <button
                onClick={handleResetTicTacToe}
                className="p-1.5 rounded-xl bg-purple-950 hover:bg-purple-900 text-pink-300 border border-purple-500/30"
                title="Restart Game"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Status notification */}
            <div className="mb-4 text-xs font-bold">
              {tictactoeWinner ? (
                <span className="px-3 py-1 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500 flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  {tictactoeWinner === 'draw' ? "It's a draw! Tie game 🤝" : `${tictactoeWinner} Wins the Hearts Match! 🎉`}
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full bg-purple-950/60 text-purple-200 border border-purple-500/30">
                  {currentTurn === mySymbol ? 'Your Turn to Place! 💖' : `Waiting for ${partnerName}'s Move... ⏳`}
                </span>
              )}
            </div>

            {/* 3x3 Tic Tac Toe Grid */}
            <div className="grid grid-cols-3 gap-2.5 w-64 h-64 sm:w-72 sm:h-72">
              {board.map((cell, idx) => (
                <button
                  key={idx}
                  onClick={() => handleCellClick(idx)}
                  disabled={Boolean(cell) || Boolean(tictactoeWinner) || currentTurn !== mySymbol}
                  className={`rounded-2xl border flex items-center justify-center text-3xl sm:text-4xl transition-all shadow-md active:scale-95 ${
                    cell
                      ? 'bg-black/60 border-purple-500/50'
                      : currentTurn === mySymbol
                      ? 'bg-purple-950/30 border-purple-400/40 hover:bg-pink-600/20 hover:border-pink-400 cursor-pointer'
                      : 'bg-black/20 border-purple-500/20 cursor-not-allowed'
                  }`}
                >
                  {cell}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mini-Game 4: Shared Canvas / Love Doodles */}
      {activeTab === 'doodle' && (
        <div className="flex-1 flex flex-col items-center justify-center w-full overflow-hidden">
          {/* Canvas Controls Bar */}
          <div className="flex items-center gap-2 sm:gap-3 mb-2.5 bg-black/60 p-2 rounded-2xl border border-purple-500/35 flex-wrap justify-center">
            {/* Color Swatches */}
            <div className="flex items-center gap-1.5">
              {['#ec4899', '#f43f5e', '#a855f7', '#38bdf8', '#10b981', '#facc15', '#ffffff'].map(c => (
                <button
                  key={c}
                  onClick={() => setBrushColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-7 h-7 rounded-full border transition-all ${
                    brushColor === c ? 'border-white scale-110 ring-2 ring-pink-500 shadow-md' : 'border-black/50'
                  }`}
                  title={c}
                />
              ))}
            </div>

            <div className="h-4 w-px bg-purple-500/30" />

            {/* Brush Size Slider */}
            <div className="flex items-center gap-2 text-xs font-semibold text-purple-200">
              <span>Size:</span>
              <input
                type="range"
                min="2"
                max="20"
                value={brushSize}
                onChange={e => setBrushSize(parseInt(e.target.value, 10))}
                className="w-16 accent-pink-500 cursor-pointer"
              />
            </div>

            {/* Clear Board Button */}
            <button
              onClick={handleClearCanvas}
              className="px-3 py-1 rounded-xl bg-purple-950/80 hover:bg-purple-900 text-purple-200 text-xs font-bold flex items-center gap-1 border border-purple-500/30 transition-all active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Clear Board
            </button>
          </div>

          {/* Real-time Drawing Canvas with touch-action none */}
          <div className="relative border-2 border-purple-500/40 rounded-3xl overflow-hidden shadow-2xl bg-slate-950 max-w-full">
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
              className="cursor-crosshair max-w-full max-h-[50vh] sm:max-h-[58vh] touch-none block"
            />
            <div className="absolute bottom-2 right-3 text-[10px] text-pink-300/80 font-mono pointer-events-none bg-black/60 px-2 py-0.5 rounded-full border border-purple-500/30">
              Live Synchronized Canvas 🎨
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
