import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  onComplete: () => void;
}

export default function CinematicIntro({ onComplete }: Props) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 1800),
      setTimeout(() => setStep(2), 7600),
    ];

    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (step === 2) {
      const timer = setTimeout(onComplete, 1200);
      return () => clearTimeout(timer);
    }
  }, [step, onComplete]);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black">
      {/* Background */}
      <motion.div
        initial={{ scale: 1.15, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 3, ease: 'easeOut' }}
        className="absolute inset-0"
      >
        {/* Background Image */}
        <div className="relative w-full h-full overflow-hidden">
          <img
            alt="TWICE Special Album 'TEN: The Story Goes On' - Concept Photos"
            src="https://legacy.kpopping.com/28/2/TWICE-Special-Album-TEN-The-Story-Goes-On-Concept-Photos-documents-1(1).jpeg"
            className="absolute inset-0 w-full h-full object-fit object-center scale-105"
          />
        </div>

        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black/60" />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black" />
      </motion.div>

      {/* Skip Button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        onClick={onComplete}
        className="absolute top-10 right-10 z-50 px-6 py-2 glass rounded-full text-[10px] uppercase tracking-[0.3em] font-bold text-white/40 hover:text-white transition-all hover:bg-white/10"
      >
        Skip Intro
      </motion.button>

      <AnimatePresence mode="wait">
        {/* STEP 0 — Intro */}
        {step === 0 && (
          <motion.div
            key="logo"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute inset-0 flex flex-col items-center justify-center text-center px-6"
          >
            <motion.h1
              initial={{ y: 40, opacity: 0, letterSpacing: '0.4em' }}
              animate={{ y: 0, opacity: 1, letterSpacing: '0.2em' }}
              transition={{ duration: 1.6, ease: 'easeOut' }}
              className="font-display text-5xl md:text-6xl uppercase font-light text-white"
            >
              Date with
            </motion.h1>

            <motion.h2
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 1.5 }}
              className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-pink-400 via-rose-300 to-pink-500 bg-clip-text text-transparent"
            >
              TWICE
            </motion.h2>

            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 120, opacity: 1 }}
              transition={{ delay: 1, duration: 1 }}
              className="h-px bg-pink-400/50 mt-6"
            />
          </motion.div>
        )}

        {/* STEP 1 — Notification Card */}
        {step === 1 && (
          <motion.div
            key="message"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="absolute inset-0 flex items-end justify-center pb-28 px-6"
          >
            <motion.div
              initial={{ y: 40, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{
                duration: 1,
                ease: 'easeOut',
              }}
              className="backdrop-blur-2xl bg-white/10 border border-white/10 rounded-3xl p-6 max-w-md w-full shadow-[0_8px_40px_rgba(0,0,0,0.45)]"
            >
              <div className="flex items-start gap-4">
                {/* Animated Dot */}
                <div className="relative mt-1">
                  <div className="w-3 h-3 rounded-full bg-pink-400 animate-pulse" />
                  <div className="absolute inset-0 w-3 h-3 rounded-full bg-pink-400 blur-sm opacity-70 animate-ping" />
                </div>

                {/* Text Content */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs uppercase tracking-[0.25em] font-semibold text-pink-300">
                      ONCE Universe
                    </span>

                    <span className="text-[10px] text-white/40 tracking-wide">
                      Just now
                    </span>
                  </div>

                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.8 }}
                    className="text-white text-base md:text-lg font-medium leading-relaxed"
                  >
                    “I heard you wanted to meet me.”
                  </motion.p>

                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: '100%', opacity: 1 }}
                    transition={{ delay: 0.8, duration: 1 }}
                    className="h-px bg-gradient-to-r from-pink-400/50 to-transparent mt-4"
                  />
                </div>
              </div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="mt-5 text-center text-sm tracking-[0.35em] uppercase text-white/45"
              >
                Seoul • Midnight
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Glow */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black to-transparent" />
    </div>
  );
}