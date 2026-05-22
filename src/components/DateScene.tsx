import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Camera, X } from 'lucide-react';
import { Idol } from '../types';

interface Props {
  idol: Idol;
  onClose: () => void;
  onAffectionGain: (points: number) => void;
  onViewMemories: () => void;
}

export default function DateScene({ idol, onClose, onAffectionGain, onViewMemories }: Props) {
  const [step, setStep] = useState(0);
  const [showChoices, setShowChoices] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [memoryUnlocked, setMemoryUnlocked] = useState(false);
  const [photoSaved, setPhotoSaved] = useState(false);
  const [hasCaptured, setHasCaptured] = useState(false);

  const dialogue = [
    { text: "You're finally here. I thought you'd gotten lost.", action: "Idol smiles slightly." },
    { text: "The view from this rooftop is my favorite secret. Especially with the moon like this...", action: "He looks at the skyline." },
    { text: "Actually, there was something I've been wanting to tell you...", action: "He turns back to you, looking intense." },
  ];

  const takePhoto = () => {
    setIsCapturing(true);
    // Simulate shutter sound/flash duration
    setTimeout(() => {
      setIsCapturing(false);
      setHasCaptured(true);
      setPhotoSaved(true);
      setMemoryUnlocked(true);
      onAffectionGain(15);
      // Hide notifications after 4 seconds to give more time for choice
      setTimeout(() => {
        setMemoryUnlocked(false);
        setPhotoSaved(false);
      }, 4000);
    }, 150);
  };

  const choices = [
    { text: "What is it?", gain: 5 },
    { text: "The view is beautiful, just like you.", gain: 10 },
    { text: "Stay quiet and wait.", gain: 8 }
  ];

  useEffect(() => {
    if (step < dialogue.length) {
      const timer = setTimeout(() => {
        if (step === dialogue.length - 1) setShowChoices(true);
      }, 3000 * (step + 1));
      return () => clearTimeout(timer);
    }
  }, [step]);

  const handleChoice = (gain: number) => {
    onAffectionGain(gain);
    setStep(dialogue.length); // End for now
    setTimeout(onClose, 2000);
  };

  return (
    <div className="fixed inset-0 bg-luxury-black z-[100] flex flex-col overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center transition-transform duration-[10s] scale-110"
        style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1546702302-3371816a6676?q=80&w=2000&auto=format&fit=crop")' }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-luxury-black via-transparent to-black/40" />

      <header className="relative z-10 p-4 md:p-8 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="w-1 h-8 md:h-12 bg-luxury-magenta" />
          <div>
            <h4 className="text-[8px] md:text-[10px] uppercase tracking-[0.4em] text-luxury-magenta font-bold leading-none">Rooftop Encounter</h4>
            <h3 className="font-serif italic text-lg md:text-xl leading-snug">Private Date</h3>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <AnimatePresence>
            {hasCaptured && (
              <motion.button 
                initial={{ scale: 0.8, opacity: 0, x: 20 }}
                animate={{ 
                  scale: [0.8, 1.1, 1], 
                  opacity: 1, 
                  x: 0,
                  boxShadow: ["0 0 0px rgba(255,51,119,0)", "0 0 20px rgba(255,51,119,0.4)", "0 0 0px rgba(255,51,119,0)"]
                }}
                transition={{ duration: 0.5 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onViewMemories();
                }}
                className="hidden sm:block px-4 py-3 glass-gold rounded-full text-[10px] uppercase font-bold tracking-widest text-luxury-magenta border border-luxury-magenta/50 hover:bg-luxury-magenta/10 transition-colors"
              >
                Memory Book
              </motion.button>
            )}
          </AnimatePresence>
          <button 
            onClick={takePhoto}
            className="p-2.5 md:p-3 glass rounded-full hover:scale-110 transition-transform text-luxury-magenta"
          >
            <Camera className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <button onClick={onClose} className="p-2.5 md:p-3 glass rounded-full hover:scale-110 transition-transform"><X className="w-5 h-5 md:w-6 md:h-6" /></button>
        </div>
      </header>

      <AnimatePresence>
        {memoryUnlocked && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 20, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="absolute top-24 left-1/2 -translate-x-1/2 glass-gold px-6 py-3 rounded-full z-[150] flex items-center gap-3 border-luxury-magenta shadow-[0_0_30px_rgba(255,51,119,0.4)]"
          >
            <div className="w-10 h-10 rounded-lg overflow-hidden border border-luxury-magenta/40 shadow-lg">
              <img src={idol.image} className="w-full h-full object-cover" alt="Memory preview" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-luxury-magenta">Memory Captured</span>
              <span className="text-[8px] text-white/40 font-medium">Synced with your bias</span>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onViewMemories();
              }}
              className="ml-2 px-4 py-2 bg-luxury-magenta text-white text-[8px] font-bold uppercase rounded-full hover:scale-105 transition-transform"
            >
              View
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {photoSaved && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute bottom-40 left-1/2 -translate-x-1/2 glass px-4 py-2 rounded-xl z-[150] text-[10px] uppercase font-bold tracking-widest text-white/60 pointer-events-none"
          >
            Photo Saved
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCapturing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-white z-[200] pointer-events-none"
          />
        )}
      </AnimatePresence>

      <main className="flex-1 relative z-10 flex items-center justify-center pointer-events-none">
        <motion.img 
          src={idol.image}
          className="h-[65vh] md:h-[80vh] object-contain drop-shadow-[0_0_50px_rgba(255,51,119,0.2)]"
          initial={{ opacity: 0, scale: 0.9, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1.5 }}
        />
      </main>

      <footer className="relative z-20 px-6 md:px-8 pb-12 md:pb-16 mt-auto">
        <AnimatePresence mode="wait">
          {step < dialogue.length && (
            <motion.div 
              key={step}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="glass p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border-luxury-magenta/30 max-w-2xl mx-auto"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] uppercase font-bold tracking-widest text-luxury-magenta">{idol.name}</span>
                <div className="flex-1 h-px bg-luxury-magenta/20" />
              </div>
              <p className="text-sm md:text-lg font-medium italic leading-relaxed text-center mb-6">
                "{dialogue[step].text}"
              </p>
              <div className="flex justify-center">
                 <button 
                  onClick={() => setStep(s => s + 1)}
                  className="px-6 py-2.5 glass-gold rounded-full text-[10px] uppercase font-bold tracking-widest text-luxury-magenta shadow-[0_0_15px_rgba(255,51,119,0.2)]"
                 >Tap to continue</button>
              </div>
            </motion.div>
          )}

          {showChoices && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col gap-4 max-w-sm mx-auto"
            >
              {choices.map((choice, i) => (
                <motion.button
                  key={i}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleChoice(choice.gain)}
                  className="glass-gold p-6 rounded-3xl font-display font-bold uppercase tracking-[0.2em] text-xs hover:bg-luxury-magenta/20 transition-all border-luxury-magenta/50 text-white"
                >
                  {choice.text}
                </motion.button>
              ))}
            </motion.div>
          )}
          
          {step >= dialogue.length && !showChoices && (
             <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
             >
                <div className="flex justify-center gap-4 mb-4">
                   <Heart className="w-8 h-8 text-luxury-magenta fill-luxury-magenta animate-bounce" />
                </div>
                <p className="font-display uppercase tracking-[0.4em] text-luxury-magenta font-bold">Bond Strengthened</p>
             </motion.div>
          )}
        </AnimatePresence>
      </footer>

      {/* Cinematic Overlays */}
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black to-transparent pointer-events-none" />
    </div>
  );
}
