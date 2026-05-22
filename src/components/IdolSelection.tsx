import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Mic2, Star, Info } from 'lucide-react';
import { IDOLS } from '../constants';
import { Idol } from '../types';

interface Props {
  onSelect: (idol: Idol) => void;
}

export default function IdolSelection({ onSelect }: Props) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = next, -1 = prev
  const [isFlipped, setIsFlipped] = useState(false);

  const currentIdol = IDOLS[index];

  const next = () => {
    setIsFlipped(false);
    setDirection(1);
    setIndex((prev) => (prev + 1) % IDOLS.length);
  };

  const prev = () => {
    setIsFlipped(false);
    setDirection(-1);
    setIndex((prev) => (prev - 1 + IDOLS.length) % IDOLS.length);
  };

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir * 160,
      opacity: 0,
      scale: 0.92,
      rotateY: dir * 15,
      z: -50,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      rotateY: 0,
      z: 0,
      transition: {
        type: "spring" as const,
        stiffness: 300,
        damping: 24,
        mass: 0.8
      }
    },
    exit: (dir: number) => ({
      x: dir * -160,
      opacity: 0,
      scale: 0.92,
      rotateY: dir * -15,
      z: -50,
      transition: {
        type: "spring" as const,
        stiffness: 300,
        damping: 24,
        mass: 0.8
      }
    }),
  };

  return (
    <div className="min-h-screen bg-luxury-black flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden opacity-20 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-luxury-magenta blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-luxury-gold blur-[120px] rounded-full opacity-30" />
      </div>

      <header className="fixed top-8 md:top-12 text-center z-10 px-4">
        <motion.h2 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="font-display text-[10px] tracking-[0.4em] uppercase text-luxury-magenta/80 mb-1.5"
        >
          ONCE, Choose Your Bias
        </motion.h2>
        <motion.h1 
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="font-serif text-2xl md:text-3xl italic text-gradient-twice"
        >
          One in a million
        </motion.h1>
      </header>

      <div className="relative w-full max-w-[min(380px,calc(100vw-3rem))] aspect-[3/4] perspective-1000 mt-12">
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
              dragElastic={0.6}
              onDragEnd={(e, info) => {
                const swipeThreshold = 50;
                if (info.offset.x < -swipeThreshold) {
                  next();
                } else if (info.offset.x > swipeThreshold) {
                  prev();
                }
              }}
              whileHover={{ 
                scale: 1.03,
                y: -6,
              }}
              animate={{ 
                rotateY: isFlipped ? 180 : 0,
              }}
              transition={{ 
                type: "spring", 
                stiffness: 140, 
                damping: 18 
              }}
              style={{ transformStyle: 'preserve-3d' }}
              className="w-full h-full relative cursor-pointer select-none group rounded-[2.5rem] shadow-[0_15px_35px_rgba(0,0,0,0.5)] hover:shadow-[0_25px_55px_-12px_rgba(255,51,119,0.25)] transition-shadow duration-500"
              onClick={() => setIsFlipped(!isFlipped)}
            >
              {/* Front */}
              <div className="absolute inset-0 backface-hidden w-full h-full rounded-[2.5rem] overflow-hidden">
                <div 
                  className="w-full h-full rounded-[2.5rem] bg-cover bg-center overflow-hidden relative border border-white/10"
                  style={{ backgroundImage: `url(${currentIdol.image})` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/95" />
                  
                  <div className="absolute bottom-6 left-6 right-6 md:bottom-8 md:left-8 md:right-8">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-3 py-1 rounded-full bg-luxury-magenta/20 text-[10px] uppercase tracking-[0.2em] text-pink-300 border border-luxury-magenta/30 backdrop-blur-md">
                        {currentIdol.personalityTag}
                      </span>
                    </div>
                    <h3 className="font-display text-3xl md:text-4xl font-bold mb-1 text-white">{currentIdol.name}</h3>
                    <p className="text-white/60 text-[10px] md:text-xs tracking-[0.3em] uppercase font-medium">{currentIdol.role}</p>
                  </div>
                </div>
                
                <div className="absolute top-6 right-6 flex flex-col gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                  <button className="w-11 h-11 rounded-2xl glass flex items-center justify-center hover:bg-white/20 transition-colors">
                    <Mic2 className="w-5 h-5 text-white/80" />
                  </button>
                  <button className="w-11 h-11 rounded-2xl glass flex items-center justify-center hover:bg-white/20 transition-colors relative">
                    <Info className="w-5 h-5 text-white/80" />
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1] }} 
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="absolute -top-1 -right-1 w-3 h-3 bg-luxury-magenta rounded-full border-2 border-luxury-black" 
                    />
                  </button>
                </div>

                {/* Foil holographic shine reflection */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[2.5rem] z-20">
                  <motion.div 
                    className="absolute inset-0 w-[200%] h-[200%] -left-1/2 -top-1/2 opacity-0 group-hover:opacity-15 transition-opacity duration-300 pointer-events-none"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255,255,255,0) 30%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0) 70%)',
                    }}
                    animate={isFlipped ? {} : {
                      x: ['-20%', '30%'],
                      y: ['-20%', '30%']
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 4,
                      ease: "easeInOut"
                    }}
                  />
                  {/* Subtle multi-colored holographic foil overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-luxury-magenta/10 via-transparent to-luxury-gold/10 opacity-0 group-hover:opacity-40 transition-opacity duration-500 blend-overlay pointer-events-none" />
                </div>

                {/* Discovery Hint */}
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 4, repeat: Infinity, repeatDelay: 1 }}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                >
                  <div className="glass px-6 py-3 rounded-full border border-white/10 flex items-center gap-3 backdrop-blur-xl shadow-2xl">
                    <div className="w-2 h-2 rounded-full bg-luxury-gold animate-pulse shadow-[0_0_10px_rgba(212,175,55,0.8)]" />
                    <span className="text-[11px] uppercase tracking-[0.3em] font-bold text-white/90">Tap to see profile</span>
                  </div>
                </motion.div>
              </div>

              {/* Back */}
              <div className="absolute inset-0 backface-hidden [transform:rotateY(180deg)] glass rounded-[2rem] md:rounded-[2.5rem] p-5 md:p-10 flex flex-col justify-between border-luxury-magenta/30 overflow-hidden w-full h-full">
                {/* Decorative Background for Back */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-luxury-magenta/10 blur-3xl -mr-16 -mt-16 rounded-full" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-luxury-gold/10 blur-3xl -ml-16 -mb-16 rounded-full" />

                <div className="relative z-10 overflow-y-auto pr-2 custom-scrollbar">
                  <h4 className="text-[8px] md:text-[10px] uppercase tracking-[0.4em] text-pink-300 font-bold mb-3 md:mb-6 flex items-center gap-2">
                    <div className="w-6 md:w-8 h-px bg-pink-300/30" />
                    Profile Details
                  </h4>
                  
                  <div className="space-y-3 md:space-y-8">
                    <div>
                      <h5 className="text-[8px] md:text-[10px] uppercase tracking-widest text-white/40 mb-1 md:mb-2">Personality</h5>
                      <p className="text-white/90 leading-relaxed italic text-[11px] md:text-sm">"{currentIdol.personality}"</p>
                    </div>
                    
                    <div className="space-y-2 md:space-y-5">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[7px] md:text-[10px] text-white/30 uppercase tracking-widest">Interests</span>
                        <span className="text-[11px] md:text-sm text-white/90 font-medium">{currentIdol.hobbies.join(' • ')}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[7px] md:text-[10px] text-white/30 uppercase tracking-widest">Taste Preference</span>
                        <span className="text-[11px] md:text-sm text-white/90 font-medium">{currentIdol.favoriteFood}</span>
                      </div>
                      <div className="flex flex-col gap-1 md:gap-1.5 pt-1 md:pt-2">
                        <span className="text-[7px] md:text-[10px] text-white/30 uppercase tracking-widest">Chemistry Difficulty</span>
                        <div className="flex gap-1 h-1 md:h-1.5">
                          {[...Array(10)].map((_, i) => (
                            <div key={i} className={`flex-1 rounded-full transition-all duration-700 delay-[${i*50}ms] ${i < currentIdol.difficulty ? 'bg-gradient-to-r from-luxury-magenta to-pink-400' : 'bg-white/5'}`} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative z-10 pt-3 md:pt-8 bg-luxury-black/40 -mx-5 -mb-5 p-5 border-t border-white/5">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(currentIdol);
                    }}
                    className="w-full py-3.5 md:py-5 rounded-xl md:rounded-3xl bg-gradient-to-r from-luxury-magenta via-pink-400 to-luxury-gold text-white font-display font-bold uppercase tracking-[0.2em] text-[9px] md:text-xs shadow-lg hover:shadow-luxury-magenta/20 transition-all active:scale-95 group"
                  >
                    <span className="flex items-center justify-center gap-2">
                      Enter Her Heart
                      <motion.div
                        animate={{ x: [0, 5, 0] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                      >
                        <ChevronRight className="w-3 h-3 md:w-4 md:h-4" />
                      </motion.div>
                    </span>
                  </button>
                  <p className="text-center text-[7px] md:text-[9px] text-white/30 mt-2 md:mt-4 uppercase tracking-[0.2em]">Tap anywhere to flip back</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>

        <div className="hidden md:block absolute top-1/2 -left-16 -translate-y-1/2">
          <button onClick={prev} className="w-12 h-12 rounded-full glass flex items-center justify-center hover:bg-white/10 transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
        </div>
        <div className="hidden md:block absolute top-1/2 -right-16 -translate-y-1/2">
          <button onClick={next} className="w-12 h-12 rounded-full glass flex items-center justify-center hover:bg-white/10 transition-colors">
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        {/* Mobile Navigation Dots */}
        <div className="flex md:hidden justify-center items-center gap-3 mt-8 absolute -bottom-12 left-0 right-0">
          <button onClick={prev} className="p-2 text-white/20 hover:text-white transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div className="flex gap-1.5 items-center">
            {IDOLS.map((_, i) => (
              <div 
                key={i} 
                className={`transition-all duration-300 rounded-full ${i === index ? 'w-4 h-1.5 bg-luxury-magenta shadow-[0_0_8px_rgba(255,51,119,0.5)]' : 'w-1.5 h-1.5 bg-white/20'}`} 
              />
            ))}
          </div>
          <button onClick={next} className="p-2 text-white/20 hover:text-white transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <footer className="fixed bottom-12 flex items-center gap-4 text-white/20">
        <Star className="w-4 h-4 fill-current" />
        <div className="w-24 h-px bg-current" />
        <p className="text-[10px] uppercase tracking-[0.3em]">Tap card for info</p>
        <div className="w-24 h-px bg-current" />
        <Star className="w-4 h-4 fill-current" />
      </footer>
    </div>
  );
}
