import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Mic2, Star, Info, LayoutGrid, Layers, Volume2, Sparkles, Check } from 'lucide-react';
import { IDOLS } from '../constants';
import { Idol } from '../types';
import { speakText, playSentSound, playReceivedSound } from '../utils/audio';

interface Props {
  onSelect: (idol: Idol) => void;
}

// Twice group colors/aesthetics mapped to enhance the authentic luxury feeling
const IDOL_THEMES: Record<string, { border: string; glow: string; text: string; bg: string; accent: string; neon: string }> = {
  nayeon: {
    border: 'border-pink-500/35',
    glow: 'shadow-pink-500/25',
    text: 'text-pink-400',
    accent: '#FF3377',
    neon: 'rgba(255, 51, 119, 0.4)',
    bg: 'from-pink-950/30 via-black/95 to-zinc-950'
  },
  jeongyeon: {
    border: 'border-emerald-500/35',
    glow: 'shadow-emerald-500/25',
    text: 'text-emerald-400',
    accent: '#10B981',
    neon: 'rgba(16, 185, 129, 0.4)',
    bg: 'from-emerald-950/30 via-black/95 to-zinc-950'
  },
  momo: {
    border: 'border-rose-500/35',
    glow: 'shadow-rose-500/25',
    text: 'text-rose-400',
    accent: '#F43F5E',
    neon: 'rgba(244, 63, 94, 0.4)',
    bg: 'from-rose-950/30 via-black/95 to-zinc-950'
  },
  sana: {
    border: 'border-purple-500/35',
    glow: 'shadow-purple-500/25',
    text: 'text-purple-400',
    accent: '#A855F7',
    neon: 'rgba(168, 85, 247, 0.4)',
    bg: 'from-purple-950/30 via-black/95 to-zinc-950'
  },
  jihyo: {
    border: 'border-amber-500/35',
    glow: 'shadow-amber-500/25',
    text: 'text-amber-400',
    accent: '#F59E0B',
    neon: 'rgba(245, 158, 11, 0.4)',
    bg: 'from-amber-950/30 via-black/95 to-zinc-950'
  },
  mina: {
    border: 'border-teal-500/35',
    glow: 'shadow-teal-500/25',
    text: 'text-teal-400',
    accent: '#14B8A6',
    neon: 'rgba(20, 184, 166, 0.4)',
    bg: 'from-teal-950/30 via-black/95 to-zinc-950'
  },
  dahyun: {
    border: 'border-indigo-400/35',
    glow: 'shadow-indigo-400/25',
    text: 'text-indigo-300',
    accent: '#818CF8',
    neon: 'rgba(129, 140, 248, 0.4)',
    bg: 'from-indigo-950/30 via-black/95 to-zinc-950'
  },
  chaeyoung: {
    border: 'border-red-500/35',
    glow: 'shadow-red-500/25',
    text: 'text-red-400',
    accent: '#EF4444',
    neon: 'rgba(239, 68, 68, 0.4)',
    bg: 'from-red-950/30 via-black/95 to-zinc-950'
  },
  tzuyu: {
    border: 'border-sky-500/35',
    glow: 'shadow-sky-500/25',
    text: 'text-sky-400',
    accent: '#0EA5E9',
    neon: 'rgba(14, 165, 233, 0.4)',
    bg: 'from-sky-950/30 via-black/95 to-zinc-950'
  }
};

export default function IdolSelection({ onSelect }: Props) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = next, -1 = prev
  const [isFlipped, setIsFlipped] = useState(false);
  const [viewMode, setViewMode] = useState<'gallery' | 'binder'>('gallery');
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  // Track 3D cursor-tilting coordinate offset
  const [tiltCoords, setTiltCoords] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const currentIdol = IDOLS[index];
  const activeTheme = IDOL_THEMES[currentIdol.id] || IDOL_THEMES.nayeon;

  const next = () => {
    setIsFlipped(false);
    setDirection(1);
    setIndex((prev) => (prev + 1) % IDOLS.length);
    playSentSound();
  };

  const prev = () => {
    setIsFlipped(false);
    setDirection(-1);
    setIndex((prev) => (prev - 1 + IDOLS.length) % IDOLS.length);
    playSentSound();
  };

  const jumpToIdol = (idx: number) => {
    if (idx === index) return;
    setIsFlipped(false);
    setDirection(idx > index ? 1 : -1);
    setIndex(idx);
    playReceivedSound();
  };

  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const box = card.getBoundingClientRect();
    // Normalize coordinates: range from -0.5 to 0.5
    const x = (e.clientX - box.left) / box.width - 0.5;
    const y = (e.clientY - box.top) / box.height - 0.5;
    setTiltCoords({ x, y });
    setIsHovering(true);
  };

  const handleCardMouseLeave = () => {
    setTiltCoords({ x: 0, y: 0 });
    setIsHovering(false);
  };

  const hearVoiceIntro = (e: React.MouseEvent, idol: Idol) => {
    e.stopPropagation();
    setSpeakingId(idol.id);
    speakText(idol.voiceIntro, idol.name);
    // Visual flash timeout matching vocal start
    setTimeout(() => setSpeakingId(null), 3000);
  };

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir * 180,
      opacity: 0,
      scale: 0.9,
      rotateY: dir * 25,
      z: -70,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      rotateY: 0,
      z: 0,
      transition: {
        type: "spring" as const,
        stiffness: 320,
        damping: 25,
        mass: 0.8
      }
    },
    exit: (dir: number) => ({
      x: dir * -180,
      opacity: 0,
      scale: 0.9,
      rotateY: dir * -25,
      z: -70,
      transition: {
        type: "spring" as const,
        stiffness: 320,
        damping: 25,
        mass: 0.8
      }
    }),
  };

  return (
    <div className="min-h-screen bg-luxury-black flex flex-col items-center justify-between py-6 md:py-10 px-4 relative overflow-hidden">
      
      {/* Dynamic Background Atmosphere that updates color with selection */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none transition-all duration-1000 z-0">
        <div 
          className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] blur-[140px] rounded-full opacity-20 transition-all duration-1000"
          style={{ backgroundColor: activeTheme.accent }}
        />
        <div className="absolute bottom-[-15%] left-[-15%] w-[50%] h-[50%] bg-zinc-900 blur-[130px] rounded-full opacity-60" />
        <div className="absolute inset-0 bg-radial-gradient from-transparent to-luxury-black/95" />
      </div>

      {/* Top Header Section */}
      <header className="w-full max-w-5xl relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/5 pb-4 md:pb-6">
        <div className="text-center sm:text-left">
          <motion.div 
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex items-center justify-center sm:justify-start gap-2 mb-1"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            <h2 className="font-display text-[9px] md:text-[10px] tracking-[0.4em] uppercase text-rose-500 font-bold">
              ONCE SPECIAL COLLECION • CHOOSE BIAS
            </h2>
          </motion.div>
          <motion.h1 
            initial={{ y: -5, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.05 }}
            className="font-serif text-xl md:text-2xl lg:text-3xl italic text-gradient-twice font-medium"
          >
            One in a million
          </motion.h1>
        </div>

        {/* View Mode Toggle Switch */}
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex bg-white/5 rounded-2xl p-1 border border-white/10"
        >
          <button
            onClick={() => { setViewMode('gallery'); playReceivedSound(); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium tracking-wide transition-all cursor-pointer ${
              viewMode === 'gallery' 
                ? 'bg-rose-500/10 text-rose-400 shadow-sm border border-rose-500/20' 
                : 'text-white/50 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Layers size={13} />
            3D Studio
          </button>
          <button
            onClick={() => { setViewMode('binder'); playReceivedSound(); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium tracking-wide transition-all cursor-pointer ${
              viewMode === 'binder' 
                ? 'bg-rose-500/10 text-rose-400 shadow-sm border border-rose-500/20' 
                : 'text-white/50 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <LayoutGrid size={13} />
            Binder Grid
          </button>
        </motion.div>
      </header>

      {/* Main Interactive Workspace Area */}
      <div className="w-full flex-1 flex items-center justify-center relative z-10 py-4 md:py-8">
        <AnimatePresence mode="wait">
          {viewMode === 'gallery' ? (
            /* ---- GALLERY 3D SWIPEABLE MODE ---- */
            <motion.div 
              key="gallery_view"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="relative w-full max-w-[min(390px,calc(100vw-3rem))] aspect-[3/4.2] perspective-1000"
            >
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={currentIdol.id}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="w-full h-full absolute inset-0"
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <motion.div
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.4}
                    onDragEnd={(e, info) => {
                      const swipeThreshold = 55;
                      if (info.offset.x < -swipeThreshold) next();
                      else if (info.offset.x > swipeThreshold) prev();
                    }}
                    onMouseMove={handleCardMouseMove}
                    onMouseLeave={handleCardMouseLeave}
                    animate={{ 
                      rotateY: isFlipped ? 180 : 0
                    }}
                    style={{ 
                      transformStyle: 'preserve-3d',
                      rotateY: isFlipped ? 180 + tiltCoords.x * 24 : tiltCoords.x * 24,
                      rotateX: -tiltCoords.y * 24,
                    }}
                    transition={isHovering ? { type: "tween", ease: "linear", duration: 0.1 } : { type: "spring", stiffness: 120, damping: 18 }}
                    className={`w-full h-full relative cursor-pointer select-none rounded-[2.2rem] transition-shadow duration-500 shadow-[0_15px_35px_rgba(0,0,0,0.6)] ${activeTheme.glow} hover:shadow-[0_22px_55px_rgba(255,255,255,0.06)]`}
                    onClick={() => { setIsFlipped(!isFlipped); playReceivedSound(); }}
                  >
                    
                    {/* GALLERY FRONT CARD COVER */}
                    <div className={`absolute inset-0 backface-hidden w-full h-full rounded-[2.2rem] overflow-hidden border ${activeTheme.border} bg-zinc-950`}>
                      <div 
                        className="w-full h-full bg-cover bg-center overflow-hidden relative flex flex-col justify-end p-6 md:p-8"
                        style={{ backgroundImage: `url(${currentIdol.image})` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent opacity-85" />
                        
                        {/* Static Content Layout */}
                        <div className="relative z-10 w-full space-y-2 md:space-y-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-[7.5px] font-bold uppercase tracking-[0.25em] text-rose-300 border border-rose-500/30 backdrop-blur-md">
                              {currentIdol.personalityTag}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full bg-white/5 text-[7.5px] font-mono tracking-[0.1em] text-white/60 border border-white/10 backdrop-blur-md">
                              #09_BIAS
                            </span>
                          </div>
                          
                          <div>
                            <h3 className="font-display text-2xl md:text-3.5xl font-extrabold tracking-tight mb-0.5 text-white flex items-center justify-between">
                              {currentIdol.name}
                              {/* Hear Voice Floating Pin */}
                              <button
                                onClick={(e) => hearVoiceIntro(e, currentIdol)}
                                className={`w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center transition-all border shadow-md cursor-pointer ${
                                  speakingId === currentIdol.id
                                    ? 'bg-rose-500 text-white border-rose-400 animate-pulse'
                                    : 'bg-black/60 hover:bg-rose-500/35 text-white/95 border-white/10 hover:border-rose-400/50 hover:scale-110 active:scale-95'
                                }`}
                                title="Synthesize Voice Announcement"
                              >
                                <Volume2 size={13} className={speakingId === currentIdol.id ? 'animate-bounce' : ''} />
                              </button>
                            </h3>
                            <p className="text-luxury-gold text-[9px] md:text-[10px] tracking-[0.25em] uppercase font-bold font-display">{currentIdol.role}</p>
                          </div>

                          <div className="pt-2">
                            <button
                              id={`select-idol-button-${currentIdol.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelect(currentIdol);
                                playSentSound();
                              }}
                              className="w-full py-2.5 md:py-3 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-600 to-rose-500 text-white font-display font-black uppercase tracking-[0.25em] text-[10px] md:text-xs shadow-lg shadow-rose-500/10 hover:shadow-rose-500/25 hover:scale-[1.03] active:scale-[0.97] transition-all cursor-pointer border border-rose-400/25 flex items-center justify-center gap-1"
                            >
                              Select {currentIdol.name}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Foil/Holographic Dynamic Reflection Overlay */}
                      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[2.2rem] z-20">
                        {isHovering && (
                          <div 
                            className="absolute inset-0 w-full h-full mix-blend-color-dodge opacity-30 transition-all duration-100"
                            style={{
                              background: `radial-gradient(circle at ${50 + tiltCoords.x * 100}% ${50 + tiltCoords.y * 100}%, rgba(255, 255, 255, 0.75) 0%, rgba(255, 80, 200, 0.2) 30%, rgba(80, 200, 255, 0.2) 55%, rgba(0,0,0,0) 80%)`,
                            }}
                          />
                        )}
                        {/* Dynamic spectrum glow corner overlay */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-rose-500/5 via-transparent to-luxury-gold/5 opacity-40 mix-blend-overlay" />
                      </div>

                      {/* Floating Interactive Flip Hint */}
                      <div className="absolute top-4 left-4 z-10 glass border-white/5 py-1 px-2 rounded-full text-[6.5px] font-mono tracking-[0.2em] uppercase text-white/50 flex items-center gap-1.5 backdrop-blur-md opacity-90 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <Sparkles size={7} className="text-luxury-gold" />
                        TAP TO FLIP PROFILE
                      </div>
                    </div>

                    {/* GALLERY BACK DETAILED PROFILE */}
                    <div className={`absolute inset-0 backface-hidden [transform:rotateY(180deg)] rounded-[2.2rem] p-6 md:p-8 border ${activeTheme.border} bg-gradient-to-b ${activeTheme.bg} flex flex-col justify-between overflow-hidden w-full h-full`}>
                      
                      {/* Decorative elements representing true collector design */}
                      <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl opacity-25" style={{ backgroundColor: activeTheme.accent }} />
                      <div className="absolute bottom-0 left-0 w-40 h-40 bg-zinc-950 rounded-full blur-2xl" />

                      <div className="relative z-10 space-y-4 md:space-y-6 flex-1 overflow-y-auto pr-1 select-text custom-scrollbar">
                        <div className="flex justify-between items-center border-b border-white/5 pb-2 md:pb-3">
                          <span className="text-[7.5px] font-mono tracking-[0.3em] uppercase text-white/40">COLLECTION CARD #09</span>
                          <span className="text-[7.5px] font-mono tracking-[0.2em] font-bold text-luxury-gold uppercase">BIAS IDOL</span>
                        </div>

                        <div className="space-y-3 md:space-y-4">
                          <div>
                            <span className="text-[7px] md:text-[8.5px] text-white/40 font-mono tracking-widest uppercase block mb-1">Aura Personality</span>
                            <p className="text-white/90 leading-relaxed italic text-[10.5px] md:text-xs">"{currentIdol.personality}"</p>
                          </div>

                          <div className="grid grid-cols-2 gap-3.5 pt-1">
                            <div>
                              <span className="text-[7px] md:text-[8px] text-white/30 font-mono tracking-widest uppercase block mb-0.5">Focus Hobbies</span>
                              <div className="flex flex-col gap-0.5">
                                {currentIdol.hobbies.map((h, i) => (
                                  <span key={i} className="text-[10px] md:text-[11px] text-white/80 font-medium truncate">• {h}</span>
                                ))}
                              </div>
                            </div>
                            <div>
                              <span className="text-[7px] md:text-[8px] text-white/30 font-mono tracking-widest uppercase block mb-0.5">Aesthetic Treats</span>
                              <span className="text-[10px] md:text-[11px] text-white/80 font-medium leading-tight block">{currentIdol.favoriteFood}</span>
                            </div>
                          </div>

                          <div className="space-y-1.5 pt-2">
                            <div className="flex justify-between text-[7px] md:text-[8px] tracking-wider text-white/35 font-mono uppercase">
                              <span>Chemistry Unlock Friction</span>
                              <span className="text-rose-400 font-bold">LVL {currentIdol.difficulty}/10</span>
                            </div>
                            <div className="flex gap-1 h-1">
                              {[...Array(10)].map((_, i) => (
                                <div 
                                  key={i} 
                                  className={`flex-1 rounded-full transition-all duration-700 ${
                                    i < currentIdol.difficulty 
                                      ? 'bg-gradient-to-r from-rose-500 to-amber-400' 
                                      : 'bg-white/5'
                                  }`} 
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Collector's handwriting signature simulation block */}
                      <div className="relative z-10 border-t border-white/5 pt-4 mt-2 flex flex-col items-center">
                        <div className="font-serif italic text-sm md:text-base text-white/60 select-none pb-2 tracking-[0.1em] opacity-80">
                          {currentIdol.name} Loves ONCE
                        </div>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelect(currentIdol);
                            playSentSound();
                          }}
                          className="w-full py-3 md:py-4 rounded-xl bg-gradient-to-r from-rose-500 via-pink-500 to-luxury-gold text-white font-display font-black uppercase tracking-[0.25em] text-[8.5px] md:text-xs shadow-lg hover:shadow-rose-500/20 active:scale-[0.98] transition-transform flex items-center justify-center gap-1.5 cursor-pointer border border-rose-400/20"
                        >
                          Unlock Chemistry Hub
                        </button>
                        <p className="text-[6.5px] md:text-[8px] text-white/35 font-mono tracking-wider mt-2.5 uppercase select-none">Tap anywhere to flip card back</p>
                      </div>

                    </div>
                  </motion.div>
                </motion.div>
              </AnimatePresence>

              {/* Slider Hardware Arrow Controls */}
              <div className="absolute top-1/2 -left-3 sm:-left-18 -translate-y-1/2 z-30">
                <button 
                  onClick={prev} 
                  className="w-8 h-8 sm:w-11 sm:h-11 rounded-full glass border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-white/20 hover:scale-105 active:scale-95 text-white/80 hover:text-white transition-all cursor-pointer shadow-xl backdrop-blur-md"
                >
                  <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
              <div className="absolute top-1/2 -right-3 sm:-right-18 -translate-y-1/2 z-30">
                <button 
                  onClick={next} 
                  className="w-8 h-8 sm:w-11 sm:h-11 rounded-full glass border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-white/20 hover:scale-105 active:scale-95 text-white/80 hover:text-white transition-all cursor-pointer shadow-xl backdrop-blur-md"
                >
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </motion.div>
          ) : (
            /* ---- BINDER MODE (9-MEMBER PHOTOCARD GRID) ---- */
            <motion.div 
              key="binder_view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="w-full max-w-5xl px-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-5 max-h-[70vh] overflow-y-auto custom-scrollbar pr-1"
            >
              {IDOLS.map((idol, i) => {
                const idolTheme = IDOL_THEMES[idol.id] || IDOL_THEMES.nayeon;
                const isSelected = i === index;
                
                return (
                  <motion.div
                    key={idol.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    whileHover={{ scale: 1.025, y: -4 }}
                    onClick={() => {
                      jumpToIdol(i);
                      setViewMode('gallery');
                    }}
                    className={`relative aspect-[3/4.2] rounded-[1.8rem] overflow-hidden cursor-pointer border hover:shadow-2xl transition-all duration-300 ${
                      isSelected 
                        ? `${idolTheme.border} ${idolTheme.glow} scale-[1.015] border-rose-500`
                        : 'border-white/5 bg-zinc-950/60 hover:border-rose-500/30'
                    }`}
                  >
                    {/* Background image covering card */}
                    <div 
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-105"
                      style={{ backgroundImage: `url(${idol.image})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-85" />

                    {/* Active Selected Stamp */}
                    {isSelected && (
                      <div className="absolute top-3 left-3 bg-rose-500 text-white p-1 rounded-full border border-pink-400/50 shadow-md">
                        <Check size={8} strokeWidth={4} />
                      </div>
                    )}

                    {/* Compact layout */}
                    <div className="absolute inset-x-0 bottom-0 p-3.5 md:p-5 flex flex-col gap-1 z-10">
                      <span className={`text-[6px] md:text-[7.5px] uppercase tracking-widest font-mono font-black ${idolTheme.text}`}>
                        {idol.personalityTag}
                      </span>
                      <div className="flex items-center justify-between min-w-0">
                        <h4 className="font-display font-extrabold text-sm md:text-base text-white truncate mr-2">
                          {idol.name}
                        </h4>
                        
                        {/* Audio speaker trigger */}
                        <button
                          onClick={(e) => hearVoiceIntro(e, idol)}
                          className={`w-6 h-6 rounded-full flex items-center justify-center transition-all flex-shrink-0 cursor-pointer ${
                            speakingId === idol.id
                              ? 'bg-rose-500 text-white animate-pulse'
                              : 'bg-black/60 hover:bg-rose-500/40 text-rose-300'
                          }`}
                        >
                          <Volume2 size={10} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Ribbon Portrait indicator bar at the bottom for quick visual navigation */}
      {viewMode === 'gallery' && (
        <footer className="w-full max-w-lg relative z-20 flex flex-col items-center gap-3">
          <div className="flex items-center gap-1">
            <Star size={9} className="text-luxury-gold fill-current" />
            <span className="text-[8px] font-mono tracking-[0.3em] uppercase text-white/35">
              PHOTOCARD INDEX ({index + 1}/{IDOLS.length})
            </span>
            <Star size={9} className="text-luxury-gold fill-current" />
          </div>

          <div className="w-full flex justify-center items-center gap-2 overflow-x-auto py-1.5 custom-scrollbar px-2 max-w-full">
            {IDOLS.map((idol, i) => {
              const themeForThumb = IDOL_THEMES[idol.id] || IDOL_THEMES.nayeon;
              const isActive = i === index;
              
              return (
                <button
                  key={idol.id}
                  onClick={() => jumpToIdol(i)}
                  className={`w-9 h-9 md:w-11 md:h-11 rounded-full border overflow-hidden relative transition-all duration-300 cursor-pointer flex-shrink-0 ${
                    isActive
                      ? `border-rose-500 ${themeForThumb.glow} scale-110 ring-2 ring-rose-500/20`
                      : 'border-white/10 opacity-40 hover:opacity-85 hover:scale-105'
                  }`}
                  title={`View ${idol.name}`}
                >
                  <div 
                    className="w-full h-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${idol.image})` }}
                  />
                </button>
              );
            })}
          </div>
        </footer>
      )}

      {/* Decorative credit overlay footer */}
      {viewMode === 'binder' && (
        <footer className="w-full max-w-md relative z-20 flex items-center justify-center gap-4 text-white/15">
          <div className="w-12 h-px bg-current" />
          <p className="text-[8px] uppercase tracking-[0.3em] font-mono">GRID COMPLETED • 9 BIASES LOADED</p>
          <div className="w-12 h-px bg-current" />
        </footer>
      )}

    </div>
  );
}
