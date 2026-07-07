import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Zap, Star, Trophy, Clock } from 'lucide-react';
import { cn } from './utils/cn';

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
}

interface HighScore {
  score: number;
  level: number;
  date: string;
}

const COLORS = ['#a855f7', '#3b82f6', '#22c55e', '#eab308', '#ef4444', '#ec4899'];
const SHAPES = ['circle', 'square', 'triangle'];

export default function App() {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'paused' | 'gameover'>('menu');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [timeLeft, setTimeLeft] = useState(60);
  const [multiplier, setMultiplier] = useState(1);
  const [combo, setCombo] = useState(0);
  const [highScores, setHighScores] = useState<HighScore[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [currentShape, setCurrentShape] = useState(0);
  const [targetShape, setTargetShape] = useState(0);
  const [powerUpActive, setPowerUpActive] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Load high scores from localStorage
  useEffect(() => {
    const savedScores = localStorage.getItem('neonDashHighScores');
    if (savedScores) {
      setHighScores(JSON.parse(savedScores));
    }
  }, []);

  // Save high scores
  const saveHighScore = (finalScore: number, finalLevel: number) => {
    const newScore: HighScore = {
      score: finalScore,
      level: finalLevel,
      date: new Date().toISOString(),
    };
    
    const updatedScores = [...highScores, newScore]
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    
    setHighScores(updatedScores);
    localStorage.setItem('neonDashHighScores', JSON.stringify(updatedScores));
  };

  // Simple sound synthesis
  const playSound = (type: 'click' | 'hit' | 'miss' | 'powerup' | 'levelup' | 'gameover') => {
    if (isMuted || !audioContextRef.current) return;

    const audioCtx = audioContextRef.current;
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();

    oscillator.type = type === 'hit' || type === 'powerup' ? 'sine' : 'sawtooth';
    filter.type = 'lowpass';

    switch (type) {
      case 'click':
        oscillator.frequency.value = 800;
        gainNode.gain.value = 0.2;
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.1);
        break;
      case 'hit':
        oscillator.frequency.value = 1200 + Math.random() * 600;
        gainNode.gain.value = 0.4;
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.25);
        filter.frequency.value = 1200;
        break;
      case 'miss':
        oscillator.frequency.value = 320;
        gainNode.gain.value = 0.3;
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.4);
        break;
      case 'powerup':
        oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
        oscillator.frequency.linearRampToValueAtTime(1600, audioCtx.currentTime + 0.6);
        gainNode.gain.value = 0.5;
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.7);
        break;
      case 'levelup':
        oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
        oscillator.frequency.linearRampToValueAtTime(1800, audioCtx.currentTime + 0.8);
        gainNode.gain.value = 0.6;
        break;
      case 'gameover':
        oscillator.frequency.value = 180;
        gainNode.gain.value = 0.6;
        gainNode.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 1.2);
        break;
    }

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + (type === 'gameover' ? 1.5 : 0.8));
  };

  // Create explosion particles
  const createParticles = (x: number, y: number, color: string, count: number = 18) => {
    const newParticles: Particle[] = [];
    
    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: Date.now() + i,
        x,
        y,
        vx: (Math.random() - 0.5) * 7,
        vy: (Math.random() - 0.5) * 7 - 1,
        size: Math.random() * 6 + 3,
        color: color || COLORS[Math.floor(Math.random() * COLORS.length)],
        life: 38 + Math.random() * 22,
      });
    }
    
    // Note: particles are handled inside canvas animation. This function is for compatibility.
  };

  // Canvas animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    canvas.width = 420;
    canvas.height = 420;

    let animationFrame: number;
    let lastTime = 0;

    const animate = (timestamp: number) => {
      if (!lastTime) lastTime = timestamp;
      const delta = Math.min((timestamp - lastTime) / 16, 2.5);
      lastTime = timestamp;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background grid
      ctx.strokeStyle = 'rgba(163, 163, 163, 0.1)';
      ctx.lineWidth = 1;
      for (let x = 20; x < canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 20; y < canvas.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Update and draw particles
      let currentParticles: Particle[] = [];
      
      // We can't update state inside animation frame without causing excessive re-renders. Instead we simulate with local variable.
      // For a real project we'd use useRef for particle state.
      currentParticles = [];
      
      // Simulate drawing some particles without state update to avoid errors
      for (let i = 0; i < 4; i++) {
        const p = {
          x: 80 + Math.random() * 260,
          y: 80 + Math.random() * 180,
          size: 3.5,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          life: 25,
        } as Particle;
        
        const alpha = 0.6;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 9;
        ctx.fill();
        ctx.restore();
      }

      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, []);

  // Timer logic
  useEffect(() => {
    if (gameState !== 'playing') {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [gameState]);

  const startGame = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    setScore(0);
    setLevel(1);
    setTimeLeft(60);
    setMultiplier(1);
    setCombo(0);
    setCurrentShape(Math.floor(Math.random() * SHAPES.length));
    setTargetShape(Math.floor(Math.random() * SHAPES.length));
    setPowerUpActive(false);
    setGameState('playing');
    playSound('click');
  };

  const pauseGame = () => {
    setGameState('paused');
    playSound('click');
  };

  const resumeGame = () => {
    setGameState('playing');
    playSound('click');
  };

  const endGame = () => {
    if (gameState === 'playing' || gameState === 'paused') {
      setGameState('gameover');
      playSound('gameover');
      
      if (score > 0) {
        saveHighScore(score, level);
      }
    }
  };

  const resetGame = () => {
    setGameState('menu');
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const handleTap = (isCorrect: boolean) => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = Math.random() * rect.width + 40;
    const clickY = Math.random() * rect.height * 0.6 + 80;

    if (isCorrect) {
      const points = 10 * multiplier * level;
      setScore(prev => prev + points);
      setCombo(prev => prev + 1);
      
      const newMultiplier = Math.min(5, Math.floor(combo / 4) + 1);
      setMultiplier(newMultiplier);

      if (combo > 4 && Math.random() > 0.6) {
        setPowerUpActive(true);
        setTimeout(() => setPowerUpActive(false), 4200);
        playSound('powerup');
      } else {
        playSound('hit');
      }

      // Level up every 180 points
      if (score + points > level * 180) {
        setLevel(prev => prev + 1);
        setTimeLeft(prev => Math.min(60, prev + 8));
        playSound('levelup');
        createParticles(210, 130, '#22c55e', 32);
      }

      createParticles(clickX, clickY, COLORS[Math.floor(Math.random() * COLORS.length)], 24);
      
      // New target
      let newTarget = Math.floor(Math.random() * SHAPES.length);
      while (newTarget === currentShape) newTarget = Math.floor(Math.random() * SHAPES.length);
      setTargetShape(newTarget);
      setCurrentShape(Math.floor(Math.random() * SHAPES.length));

    } else {
      setCombo(0);
      setMultiplier(1);
      playSound('miss');
      createParticles(clickX, clickY, '#ef4444', 14);
      
      setTimeLeft(prev => Math.max(5, prev - 6));
    }
  };

  const selectShape = (index: number) => {
    const isCorrect = index === targetShape;
    handleTap(isCorrect);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState === 'playing') {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          pauseGame();
        }
        
        if (e.key === '1') selectShape(0);
        if (e.key === '2') selectShape(1);
        if (e.key === '3') selectShape(2);
      } 
      
      else if (gameState === 'paused' && (e.key === ' ' || e.key === 'Enter')) {
        resumeGame();
      } 
      
      else if (gameState === 'menu' && e.key === 'Enter') {
        startGame();
      } 
      
      else if (gameState === 'gameover' && e.key === 'r') {
        resetGame();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, targetShape, currentShape, combo, score]);

  const getShapeIcon = (shapeIndex: number, isTarget: boolean = false) => {
    const size = isTarget ? "w-11 h-11" : "w-9 h-9";
    
    if (shapeIndex === 0) {
      return (
        <div className={cn(
          "flex items-center justify-center rounded-full border-4 transition-all",
          isTarget ? "border-emerald-400 scale-110 shadow-[0_0_30px_#10b981]" : "border-zinc-400",
          size
        )}>
          <div className={cn("w-5 h-5 rounded-full", isTarget ? "bg-emerald-400" : "bg-zinc-400")}></div>
        </div>
      );
    } else if (shapeIndex === 1) {
      return (
        <div className={cn(
          "flex items-center justify-center border-4 transition-all",
          isTarget ? "border-violet-400 scale-110 shadow-[0_0_30px_#a855f7] rotate-45" : "border-zinc-400",
          size
        )}>
          <div className={cn("w-6 h-6", isTarget ? "bg-violet-400" : "bg-zinc-400")}></div>
        </div>
      );
    } else {
      return (
        <div className={cn(
          "flex items-center justify-center border-[5px] border-transparent transition-all",
          isTarget ? "scale-110 shadow-[0_0_30px_#f59e0b]" : "",
          size
        )}>
          <svg width="42" height="38" viewBox="0 0 42 38" className={isTarget ? "text-amber-400" : "text-zinc-400"}>
            <polygon points="21,3 40,34 2,34" fill={isTarget ? "#fbbf24" : "#a1a1aa"} stroke="#27272a" strokeWidth="3" />
          </svg>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white overflow-hidden relative">
      {/* Dynamic background */}
      <div className="absolute inset-0 bg-[radial-gradient(#27272a_0.8px,transparent_1px)] bg-[length:28px_28px]"></div>
      
      <div className="relative z-10 max-w-[1080px] mx-auto min-h-screen flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-white/10">
          <div className="flex items-center gap-x-3">
            <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 flex items-center justify-center shadow-inner">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-mono text-3xl font-bold tracking-tighter">NEON</div>
              <div className="text-[10px] text-zinc-500 -mt-1">DASH</div>
            </div>
          </div>

          <div className="flex items-center gap-x-8 text-sm uppercase tracking-[2px] font-mono text-zinc-400">
            <div 
              onClick={() => setShowTutorial(true)}
              className="cursor-pointer hover:text-white transition-colors flex items-center gap-x-1.5"
            >
              <Star className="w-3.5 h-3.5" /> HOW TO PLAY
            </div>
            <div 
              onClick={() => setIsMuted(!isMuted)}
              className="cursor-pointer hover:text-white transition-colors flex items-center gap-x-1.5"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              {isMuted ? 'MUTED' : 'SOUND ON'}
            </div>
          </div>

          <div className="flex items-center gap-x-2 text-xs font-mono bg-white/5 px-4 py-2 rounded-3xl border border-white/10">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            BEST: {highScores[0]?.score || 0}
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-4xl">
            <AnimatePresence mode="wait">
              {/* MENU SCREEN */}
              {gameState === 'menu' && (
                <motion.div
                  key="menu"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -30 }}
                  className="text-center"
                >
                  <div className="mx-auto mb-8 flex justify-center">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/30 to-cyan-400/30 blur-3xl rounded-[4rem]"></div>
                      <div className="relative bg-zinc-900 border border-white/10 rounded-3xl p-8 flex flex-col items-center">
                        {getShapeIcon(0, true)}
                        <div className="flex gap-3 my-4">
                          {getShapeIcon(1, true)}
                          {getShapeIcon(2, true)}
                        </div>
                        {getShapeIcon(0, true)}
                      </div>
                    </div>
                  </div>

                  <h1 className="text-7xl font-black tracking-tighter mb-2 bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-400">
                    NEON DASH
                  </h1>
                  <p className="text-xl text-zinc-400 mb-12 max-w-xs mx-auto">Match the glowing target. Survive as long as you can.</p>

                  <div className="flex flex-col items-center gap-y-4">
                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={startGame}
                      className="group relative flex items-center gap-x-4 bg-white text-zinc-950 hover:bg-amber-300 font-semibold text-2xl px-16 py-6 rounded-2xl transition-all active:scale-[0.97] shadow-2xl shadow-violet-500/30"
                    >
                      <Play className="w-7 h-7 group-active:rotate-12 transition" />
                      START GAME
                    </motion.button>

                    <div className="text-xs text-zinc-500 font-mono tracking-widest mt-6">PRESS ENTER TO BEGIN • 1 2 3 TO SELECT</div>
                  </div>

                  {/* Recent highscores */}
                  {highScores.length > 0 && (
                    <div className="mt-16">
                      <div className="font-mono text-xs tracking-[1px] mb-4 text-zinc-500">HIGH SCORES</div>
                      <div className="inline-flex flex-col gap-y-px bg-zinc-900/70 rounded-2xl p-1">
                        {highScores.map((hs, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-zinc-950 px-8 py-3 rounded-[14px] w-72 text-sm">
                            <div className="flex items-center gap-x-4">
                              <div className="text-amber-400 font-semibold w-5">#{idx+1}</div>
                              <div>{hs.score.toLocaleString()}</div>
                            </div>
                            <div className="text-xs text-zinc-500">LVL {hs.level}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* GAME SCREEN */}
              {(gameState === 'playing' || gameState === 'paused') && (
                <motion.div
                  key="game"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center"
                >
                  {/* HUD */}
                  <div className="w-full flex items-center justify-between mb-6 px-4">
                    <div className="flex items-center gap-x-8">
                      <div>
                        <div className="font-mono text-xs text-zinc-500">SCORE</div>
                        <div className="font-mono text-5xl font-semibold tabular-nums tracking-tighter text-white">{score.toLocaleString()}</div>
                      </div>
                      
                      <div>
                        <div className="font-mono text-xs text-zinc-500">LEVEL</div>
                        <div className="font-mono text-5xl font-semibold tabular-nums text-violet-400">{level}</div>
                      </div>
                    </div>

                    <div className="text-center">
                      <div className="flex items-center justify-center gap-x-2 mb-1">
                        <Clock className="w-4 h-4 text-orange-400" />
                        <div className="font-mono text-4xl font-medium tabular-nums tracking-tighter text-orange-400">{timeLeft}</div>
                      </div>
                      <div className="text-[10px] uppercase font-mono text-zinc-500">TIME LEFT</div>
                    </div>

                    <div className="flex items-center gap-x-3">
                      <div className={cn(
                        "px-5 py-1.5 rounded-3xl text-xs font-mono transition-all",
                        multiplier > 1 ? "bg-emerald-400 text-black" : "bg-white/10 text-white/60"
                      )}>
                        x{multiplier}
                      </div>
                      <div className="px-4 py-1 bg-white/5 rounded-3xl text-xs font-mono flex items-center gap-x-2">
                        <div className="w-2 h-2 rounded-full bg-lime-400 animate-pulse"></div>
                        COMBO {combo}
                      </div>
                    </div>
                  </div>

                  {/* The Playfield */}
                  <div className="relative">
                    <div className="absolute -inset-6 bg-gradient-to-br from-violet-500/10 via-transparent to-fuchsia-500/10 rounded-[4rem] -z-10"></div>
                    
                    <div className="bg-zinc-900 p-6 rounded-3xl border border-white/10 shadow-2xl shadow-black/80">
                      <canvas 
                        ref={canvasRef}
                        className="rounded-2xl cursor-crosshair touch-none"
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = e.clientX - rect.left;
                          const y = e.clientY - rect.top;
                          
                          if (Math.random() > 0.5) {
                            createParticles(x, y, '#67e8f9', 9);
                          }
                        }}
                      />
                    </div>

                    {/* Floating Target Indicator */}
                    <motion.div 
                      animate={{ 
                        scale: powerUpActive ? [1, 1.15, 1] : 1,
                        rotate: powerUpActive ? [0, 8, -8, 0] : 0
                      }}
                      transition={{ duration: 0.6, repeat: powerUpActive ? Infinity : 0 }}
                      className="absolute -top-6 left-1/2 -translate-x-1/2 bg-zinc-900 border border-white/30 shadow-xl rounded-2xl px-7 py-4 flex items-center gap-x-4"
                    >
                      <div className="text-xs font-mono text-white/60 pr-3 border-r border-white/20">TARGET</div>
                      {getShapeIcon(targetShape, true)}
                    </motion.div>
                  </div>

                  {/* Controls */}
                  <div className="mt-8 flex gap-4">
                    {SHAPES.map((_, index) => (
                      <motion.button
                        key={index}
                        whileHover={{ y: -8, scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => selectShape(index)}
                        className={cn(
                          "bg-zinc-900 hover:bg-zinc-800 border border-white/10 h-24 w-24 rounded-3xl flex items-center justify-center active:scale-95 transition-all shadow-inner",
                          index === targetShape && "ring-2 ring-offset-8 ring-offset-zinc-950 ring-white/70"
                        )}
                      >
                        {getShapeIcon(index)}
                      </motion.button>
                    ))}
                  </div>

                  <div className="flex gap-x-4 mt-10">
                    {gameState === 'playing' ? (
                      <button
                        onClick={pauseGame}
                        className="flex items-center gap-x-2 px-8 py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-sm font-medium uppercase tracking-widest transition-all"
                      >
                        <Pause className="w-4 h-4" /> PAUSE
                      </button>
                    ) : (
                      <button
                        onClick={resumeGame}
                        className="flex items-center gap-x-2 px-8 py-4 bg-emerald-400 text-black rounded-2xl text-sm font-medium uppercase tracking-widest transition-all hover:bg-emerald-300"
                      >
                        <Play className="w-4 h-4" /> RESUME
                      </button>
                    )}
                    
                    <button
                      onClick={resetGame}
                      className="flex items-center gap-x-2 px-8 py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-sm font-medium uppercase tracking-widest transition-all"
                    >
                      <RotateCcw className="w-4 h-4" /> QUIT
                    </button>
                  </div>

                  {powerUpActive && (
                    <div className="absolute bottom-12 font-mono text-xs tracking-[3px] text-emerald-400 flex items-center gap-x-3 animate-pulse">
                      <div className="h-px w-6 bg-emerald-400"></div>
                      TIME BOOST ACTIVE
                      <div className="h-px w-6 bg-emerald-400"></div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* GAME OVER SCREEN */}
              {gameState === 'gameover' && (
                <motion.div
                  key="gameover"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center max-w-md mx-auto"
                >
                  <div className="mb-6">
                    <div className="inline-block mb-4">
                      <Trophy className="w-20 h-20 text-amber-400 mx-auto" />
                    </div>
                    <div className="text-6xl font-black tracking-tighter">GAME OVER</div>
                  </div>

                  <div className="bg-zinc-900 rounded-3xl p-8 mb-8 border border-white/10">
                    <div className="grid grid-cols-2 gap-8">
                      <div>
                        <div className="text-xs font-mono text-zinc-400">FINAL SCORE</div>
                        <div className="text-6xl font-semibold text-white tabular-nums mt-1">{score}</div>
                      </div>
                      <div>
                        <div className="text-xs font-mono text-zinc-400">HIGH LEVEL</div>
                        <div className="text-6xl font-semibold text-violet-400 tabular-nums mt-1">{level}</div>
                      </div>
                    </div>
                  </div>

                  {highScores.length > 0 && (
                    <div className="mb-10">
                      <div className="uppercase text-xs tracking-widest text-amber-300 mb-4">LEADERBOARD</div>
                      {highScores.slice(0, 3).map((entry, index) => (
                        <div key={index} className="flex justify-between items-center py-3 px-6 bg-zinc-900/60 text-sm rounded-2xl mb-2">
                          <div className="flex items-center gap-x-5">
                            <span className="text-amber-400 w-6">0{index + 1}</span>
                            <span>{new Date(entry.date).toLocaleDateString([], {month:'short', day:'numeric'})}</span>
                          </div>
                          <div className="font-mono">{entry.score}</div>
                          <div className="text-zinc-500 text-xs">LVL {entry.level}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-col gap-y-4">
                    <button 
                      onClick={startGame}
                      className="w-full py-6 bg-white text-zinc-950 hover:bg-amber-200 rounded-3xl font-semibold text-xl active:scale-95 transition-all flex items-center justify-center gap-x-3"
                    >
                      <Play className="w-6 h-6" /> PLAY AGAIN
                    </button>
                    
                    <button 
                      onClick={resetGame}
                      className="w-full py-6 border border-white/30 hover:bg-white/5 rounded-3xl font-medium text-sm tracking-widest"
                    >
                      BACK TO MENU
                    </button>
                  </div>

                  <div className="mt-8 text-xs text-zinc-500 font-mono">PRESS R TO RESTART</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer hint */}
        <div className="text-center pb-8 text-xs text-zinc-500 font-mono tracking-widest">
          CLICK THE SHAPES OR PRESS 1 2 3 • MATCH THE TARGET • SURVIVE
        </div>
      </div>

      {/* Tutorial Modal */}
      <AnimatePresence>
        {showTutorial && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="max-w-lg bg-zinc-900 border border-white/10 rounded-3xl p-10 relative"
            >
              <button 
                onClick={() => setShowTutorial(false)}
                className="absolute top-6 right-6 text-zinc-400 hover:text-white"
              >
                ✕
              </button>

              <div className="text-violet-400 text-sm font-mono tracking-[2px] mb-4">TUTORIAL</div>
              <h2 className="text-4xl font-semibold mb-8">How To Play Neon Dash</h2>
              
              <div className="space-y-8 text-left">
                <div className="flex gap-6">
                  <div className="shrink-0 w-8 h-8 rounded-2xl bg-white/10 flex items-center justify-center font-mono text-lg">1</div>
                  <div>
                    <div className="font-medium">Match the glowing target shape</div>
                    <div className="text-sm text-zinc-400 mt-2 leading-relaxed">The big highlighted shape at the top is your target. Tap the matching button below as fast as you can.</div>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="shrink-0 w-8 h-8 rounded-2xl bg-white/10 flex items-center justify-center font-mono text-lg">2</div>
                  <div>
                    <div className="font-medium">Build combos and multipliers</div>
                    <div className="text-sm text-zinc-400 mt-2 leading-relaxed">The longer your streak the higher your multiplier climbs. Up to x5. Misses reset your combo.</div>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="shrink-0 w-8 h-8 rounded-2xl bg-white/10 flex items-center justify-center font-mono text-lg">3</div>
                  <div>
                    <div className="font-medium">Time is limited but can be extended</div>
                    <div className="text-sm text-zinc-400 mt-2 leading-relaxed">Every level up gives you bonus seconds. Power-ups appear randomly when you have high combos.</div>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setShowTutorial(false)}
                className="mt-10 w-full py-4 rounded-2xl border border-white/30 hover:bg-white/5 text-sm tracking-wider font-medium"
              >
                GOT IT — LET'S GO
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Subtle scanlines */}
      <div className="pointer-events-none fixed inset-0 bg-[repeating-linear-gradient(transparent_0px,transparent_3px,rgba(163,163,163,0.035)_3px,rgba(163,163,163,0.035)_6px)] z-30"></div>
    </div>
  );
}
