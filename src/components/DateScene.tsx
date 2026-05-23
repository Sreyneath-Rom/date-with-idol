import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Camera, X, Compass, Sliders, Volume2, VolumeX, Sparkles, MapPin } from 'lucide-react';
import { Idol } from '../types';

interface Props {
  idol: Idol;
  onClose: () => void;
  onAffectionGain: (points: number) => void;
  onViewMemories: () => void;
}

interface DateLocation {
  id: string;
  name: string;
  subTitle: string;
  image: string;
  description: string;
  dialogues: { text: string; action: string }[];
  choices: { text: string; gain: number }[];
}

const datingLocations: DateLocation[] = [
  {
    id: "rooftop",
    name: "Rooftop Observatory",
    subTitle: "Starlight Skyline",
    image: "https://images.unsplash.com/photo-1546702302-3371816a6676?q=80&w=2000&auto=format&fit=crop",
    description: "A private skyline view looking out on millions of flashing neon city lights.",
    dialogues: [
      { text: "You're finally here. I thought you'd gotten lost.", action: "Idol smiles slightly." },
      { text: "The view from this rooftop is my favorite secret. Especially with the moon like this...", action: "He looks at the skyline." },
      { text: "Actually, there was something I've been wanting to tell you...", action: "He turns back to you, looking intense." }
    ],
    choices: [
      { text: "What is it?", gain: 5 },
      { text: "The view is beautiful, just like you.", gain: 10 },
      { text: "Stay quiet and wait.", gain: 8 }
    ]
  },
  {
    id: "hanok",
    name: "Cozy Hanok Cafe",
    subTitle: "Warm Rain & Cedar Wood",
    image: "https://images.unsplash.com/photo-1590608897129-79da98d15969?q=80&w=2000&auto=format&fit=crop",
    description: "Warm wooden rafters, golden paper lantern lighting, and a soothing rainy window.",
    dialogues: [
      { text: "I love the smell of cedar wood and fresh coffee in here. It feels... incredibly safe.", action: "Idol cups a warm mug." },
      { text: "Look at the raindrops sliding down the glass panel. It feels like the whole world went to sleep, except for us.", action: "He looks at the rainy courtyard." },
      { text: "If we could stay tucked away like this forever, would you want to?", action: "He looks into your eyes softly." }
    ],
    choices: [
      { text: "More than anything.", gain: 11 },
      { text: "Only if you are with me.", gain: 13 },
      { text: "Let's live right in this moment.", gain: 9 }
    ]
  },
  {
    id: "arcade",
    name: "Midnight Neon Arcade",
    subTitle: "Retro Laser Glow",
    image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=2000&auto=format&fit=crop",
    description: "Flashing retro game consoles and a pulsing, energetic fluorescent atmosphere.",
    dialogues: [
      { text: "Hey! Let's see who gets the high score on the retro rhythm game first. No holding back!", action: "Idol laughs energetically." },
      { text: "You did pretty well, but check out my high score combo. I practiced a lot to show off today...", action: "He rubs his neck with a playful blush." },
      { text: "Look, the crane machine is glowing. Should I win that giant plushie for you?", action: "He holds your wrist, pulling you closer to the machine." }
    ],
    choices: [
      { text: "I dare you to try!", gain: 7 },
      { text: "Your smile is prize enough.", gain: 12 },
      { text: "Let's win it together!", gain: 10 }
    ]
  },
  {
    id: "river",
    name: "Scenic Han River Park",
    subTitle: "Cherry Blossom Breeze",
    image: "https://images.unsplash.com/photo-1501535033-a59396acb93d?q=80&w=2000&auto=format&fit=crop",
    description: "Quiet river breeze under a cherry blossom tree canopy illuminated by warm park lights.",
    dialogues: [
      { text: "The water sparkles so bright tonight. Let's walk closer to the edge.", action: "Idol pulls their coat close." },
      { text: "A delicate cherry blossom petal landed right in your hair. Don't move...", action: "He leans in closer to brush it off." },
      { text: "Times like these make me forget how busy and noisy my schedule is. Thank you for being here with me.", action: "He holds your hand gently." }
    ],
    choices: [
      { text: "I'll always find time for you.", gain: 12 },
      { text: "We should do this more often.", gain: 8 },
      { text: "Lean onto his shoulder.", gain: 11 }
    ]
  }
];

const moodOptions = [
  {
    id: 'dreamy',
    name: 'Dreamy Purple',
    vibeName: 'Cosmic Chills',
    overlayClass: 'bg-indigo-600/25 backdrop-saturate-[1.1] mix-blend-color-burn',
    glowColor: 'shadow-[0_0_20px_rgba(129,140,248,0.5)]',
    themeColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    indicatorColor: 'bg-indigo-400',
    audioName: '✨ Celestial Synths'
  },
  {
    id: 'golden',
    name: 'Sunset Twilight',
    vibeName: 'Serenade Accords',
    overlayClass: 'bg-amber-500/20 backdrop-contrast-[1.05] mix-blend-color-dodge',
    glowColor: 'shadow-[0_0_20px_rgba(245,158,11,0.5)]',
    themeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    indicatorColor: 'bg-amber-400',
    audioName: '🌅 Amber Acoustic Chimes'
  },
  {
    id: 'teal',
    name: 'Cozy Teal',
    vibeName: 'Lo-fi Ambient',
    overlayClass: 'bg-teal-500/20 backdrop-brightness-[0.9] mix-blend-overlay',
    glowColor: 'shadow-[0_0_20px_rgba(20,184,166,0.5)]',
    themeColor: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
    indicatorColor: 'bg-teal-400',
    audioName: '🍃 Healing Calm Pad'
  },
  {
    id: 'rose',
    name: 'Romantic Rosé',
    vibeName: 'Warm Heartbeat',
    overlayClass: 'bg-rose-500/25 backdrop-contrast-[1.1] mix-blend-soft-light',
    glowColor: 'shadow-[0_0_20px_rgba(244,63,94,0.5)]',
    themeColor: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    indicatorColor: 'bg-rose-400',
    audioName: '💖 Heartbeat Bell Rhythms'
  }
];

export default function DateScene({ idol, onClose, onAffectionGain, onViewMemories }: Props) {
  const [selectedLocation, setSelectedLocation] = useState<DateLocation | null>(null);
  const [selectedMood, setSelectedMood] = useState(moodOptions[0]);
  const [showMoodControls, setShowMoodControls] = useState(false);

  const [step, setStep] = useState(0);
  const [showChoices, setShowChoices] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [memoryUnlocked, setMemoryUnlocked] = useState(false);
  const [photoSaved, setPhotoSaved] = useState(false);
  const [hasCaptured, setHasCaptured] = useState(false);

  // Audio synthesize variables
  const [isPlayingMusic, setIsPlayingMusic] = useState(true);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<any[]>([]);
  const intervalRef = useRef<any>(null);

  // Stop sound playback
  const stopAmbientSynth = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    nodesRef.current.forEach(node => {
      try { node.stop(); } catch (e) {}
    });
    nodesRef.current = [];
  }, []);

  // Web Audio synth loop depending on active mood choice
  useEffect(() => {
    if (!isPlayingMusic || !selectedLocation) {
      stopAmbientSynth();
      return;
    }

    stopAmbientSynth();

    let ctx = audioCtxRef.current;
    if (!ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        ctx = new AudioCtx();
        audioCtxRef.current = ctx;
      }
    }

    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    let notes: number[] = [];
    let oscType: OscillatorType = 'sine';
    let tempo = 1500;

    const playNote = (freq: number, duration: number, volume: number) => {
      if (!ctx || ctx.state === 'suspended') return;
      try {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = oscType;
        osc.frequency.setValueAtTime(freq, now);

        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(volume, now + 0.1);
        gainNode.gain.setValueAtTime(volume, now + duration - 0.2);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + duration);

        nodesRef.current.push(osc);
        setTimeout(() => {
          nodesRef.current = nodesRef.current.filter(n => n !== osc);
        }, duration * 1000 + 500);
      } catch (err) {
        console.error("Audio error during synthesize", err);
      }
    };

    let stepIndex = 0;

    if (selectedMood.id === 'dreamy') {
      notes = [196.00, 220.00, 293.66, 329.63, 392.00, 440.00]; // G3, A3, D4, E4, G4, A4
      oscType = 'sine';
      tempo = 2400;
      const tick = () => {
        const rootFreq = notes[stepIndex % notes.length];
        playNote(rootFreq / 2, 4.0, 0.03); // base pad
        if (Math.random() > 0.4) {
          const sparkle = notes[Math.floor(Math.random() * notes.length)] * 2;
          playNote(sparkle, 2.0, 0.015); // quiet stars
        }
        stepIndex++;
      };
      tick();
      intervalRef.current = setInterval(tick, tempo);
    } else if (selectedMood.id === 'golden') {
      notes = [261.63, 329.63, 392.00, 493.88, 523.25]; // C4, E4, G4, B4, C5
      oscType = 'triangle';
      tempo = 2000;
      const tick = () => {
        const rootFreq = notes[stepIndex % notes.length];
        playNote(rootFreq / 2, 3.5, 0.02); // warm bass chord
        const offsetFreq = stepIndex % 2 === 0 ? 329.63 : 392.00;
        playNote(offsetFreq, 1.8, 0.01); // pleasant chord notes
        stepIndex++;
      };
      tick();
      intervalRef.current = setInterval(tick, tempo);
    } else if (selectedMood.id === 'teal') {
      notes = [146.83, 220.00, 293.66, 349.23, 440.00]; // D3, A3, D4, F4, A4
      oscType = 'sine';
      tempo = 1800;
      const tick = () => {
        const root = notes[stepIndex % notes.length];
        playNote(root, 3.0, 0.025); // healing slow pad
        if (stepIndex % 3 === 0) {
          playNote(root * 1.5, 1.5, 0.01); // smooth chime note
        }
        stepIndex++;
      };
      tick();
      intervalRef.current = setInterval(tick, tempo);
    } else if (selectedMood.id === 'rose') {
      notes = [220.00, 277.18, 329.63, 415.30, 440.00]; // A3, C#4, E4, G#4, A4
      oscType = 'triangle';
      tempo = 1600;
      const tick = () => {
        const bellTone = notes[stepIndex % notes.length] * (stepIndex % 4 === 0 ? 1 : 2);
        playNote(bellTone, 2.5, 0.015); // bright bell tone
        if (stepIndex % 2 === 0) {
          playNote(110.00, 1.5, 0.025); // romantic low heartbeat pad
        }
        stepIndex++;
      };
      tick();
      intervalRef.current = setInterval(tick, tempo);
    }

    return () => {
      stopAmbientSynth();
    };
  }, [selectedMood, selectedLocation, isPlayingMusic, stopAmbientSynth]);

  // Handle clean-up when component unmounts
  useEffect(() => {
    return () => {
      stopAmbientSynth();
    };
  }, [stopAmbientSynth]);

  // Synchronize showChoices state with dialogue step progression
  useEffect(() => {
    if (!selectedLocation) return;
    if (step >= selectedLocation.dialogues.length) {
      setShowChoices(true);
    } else {
      setShowChoices(false);
    }
  }, [step, selectedLocation]);

  const selectDateLocation = (loc: DateLocation) => {
    setSelectedLocation(loc);
    setStep(0);
    setShowChoices(false);
    setHasCaptured(false);
    // Auto restore music context on click interaction
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
  };

  const takePhoto = () => {
    setIsCapturing(true);
    setTimeout(() => {
      setIsCapturing(false);
      setHasCaptured(true);
      setPhotoSaved(true);
      setMemoryUnlocked(true);
      onAffectionGain(15);
      setTimeout(() => {
        setMemoryUnlocked(false);
        setPhotoSaved(false);
      }, 4000);
    }, 150);
  };

  const handleChoice = (gain: number) => {
    onAffectionGain(gain);
    if (selectedLocation) {
      setStep(selectedLocation.dialogues.length);
    }
    setTimeout(onClose, 2500);
  };

  return (
    <div className="fixed inset-0 bg-luxury-black z-[100] flex flex-col overflow-hidden select-none">
      
      {/* SCREEN 1: Dynamic Location Selector */}
      <AnimatePresence mode="wait">
        {!selectedLocation ? (
          <motion.div 
            key="location-picker"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-br from-luxury-black via-luxury-black/95 to-zinc-950 flex flex-col justify-center items-center px-4 md:px-8 z-50 overflow-y-auto py-12"
          >
            <div className="absolute top-6 left-6 flex items-center gap-2">
              <Compass className="w-5 h-5 text-luxury-magenta animate-spin-slow" />
              <span className="font-sans text-[10px] uppercase tracking-widest text-white/50 font-bold">Bias Date Plan</span>
            </div>

            <button 
              onClick={onClose} 
              className="absolute top-6 right-6 p-2.5 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            <div className="text-center max-w-xl mx-auto mb-10 md:mb-14 mt-8">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-luxury-magenta/10 border border-luxury-magenta/30 rounded-full text-[9px] uppercase tracking-widest font-black text-luxury-magenta mb-4"
              >
                <Sparkles className="w-3 h-3" /> Evening Escape
              </motion.div>
              <h2 className="text-2xl md:text-4xl font-serif text-white tracking-tight mb-3">Choose Your Date Spot</h2>
              <p className="text-xs md:text-sm text-white/60 leading-relaxed font-sans">
                Plan the ultimate night with <span className="text-transparent bg-clip-text bg-gradient-to-r from-luxury-gold to-luxury-magenta font-extrabold tracking-wider">{idol.name}</span>. Select a beautiful venue to spark romance and unlock precious memory snapshots.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl px-2">
              {datingLocations.map((loc) => (
                <motion.div
                  key={loc.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => selectDateLocation(loc)}
                  className="relative h-44 md:h-52 rounded-3xl overflow-hidden glass border border-white/5 hover:border-luxury-magenta/40 group cursor-pointer shadow-lg transition-all"
                >
                  {/* Card Background */}
                  <div 
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-105"
                    style={{ backgroundImage: `url(${loc.image})` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent transition-opacity" />
                  
                  {/* Card Content */}
                  <div className="absolute inset-0 p-5 md:p-6 flex flex-col justify-end">
                    <span className="text-[9px] uppercase font-bold tracking-[0.25em] text-luxury-magenta mb-1">
                      {loc.subTitle}
                    </span>
                    <h3 className="text-lg font-serif font-bold text-white mb-1.5 group-hover:text-luxury-gold transition-colors">
                      {loc.name}
                    </h3>
                    <p className="text-[10px] md:text-xs text-white/60 line-clamp-2 md:line-clamp-none max-w-xs leading-relaxed font-sans mb-3">
                      {loc.description}
                    </p>
                    <div className="flex items-center gap-1.5 text-[9px] font-sans font-black uppercase tracking-widest text-luxury-gold mt-1 group-hover:translate-x-1.5 transition-transform">
                      <MapPin className="w-3.5 h-3.5" /> Start Journey
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          
          /* SCREEN 2: Immersive Interrogative Scene with Mood overlays */
          <motion.div 
            key="immersive-date"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col z-40 overflow-hidden"
          >
            {/* Visual Location Backdrop */}
            <div 
              className="absolute inset-0 bg-cover bg-center transition-all duration-[6s] scale-105"
              style={{ backgroundImage: `url(${selectedLocation.image})` }}
            />
            
            {/* Real-time Dynamic Mood Overlays carefully controlled by selectedMood styles */}
            <div className={`absolute inset-0 transition-all duration-1000 ${selectedMood.overlayClass}`} />
            <div className="absolute inset-0 bg-gradient-to-t from-luxury-black via-transparent to-black/50 pointer-events-none" />

            {/* Date Applet Header */}
            <header className="relative z-10 p-4 md:p-8 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
              <div className="flex items-center gap-2 md:gap-3">
                <button 
                  onClick={() => setSelectedLocation(null)}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 text-white/70 hover:text-white transition-colors"
                  title="Back to location list"
                >
                  <Compass className="w-4 h-4 md:w-5 md:h-5 text-luxury-magenta" />
                </button>
                <div className="w-[1px] h-8 bg-white/10 mx-1 md:mx-2" />
                <div>
                  <h4 className="text-[8px] md:text-[10px] uppercase tracking-[0.4em] text-luxury-magenta font-bold leading-none">
                    {selectedLocation.name}
                  </h4>
                  <h3 className="font-serif italic text-base md:text-lg leading-snug">
                    Romantic Escapade
                  </h3>
                </div>
              </div>

              {/* Functional Controls Overlay */}
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
                      className="hidden sm:block px-4 py-2.5 glass-gold rounded-full text-[9px] uppercase font-bold tracking-widest text-luxury-magenta border border-luxury-magenta/50 hover:bg-luxury-magenta/10 transition-colors"
                    >
                      Memory Book
                    </motion.button>
                  )}
                </AnimatePresence>

                {/* Ambient Synthesizer Audio Trigger & Pulse Indicator */}
                <button 
                  onClick={() => setIsPlayingMusic(p => !p)}
                  className={`p-2.5 md:p-3 rounded-full transition-all flex items-center justify-center border hover:scale-105 active:scale-95 ${
                    isPlayingMusic 
                      ? 'bg-luxury-magenta/25 border-luxury-magenta/50 text-luxury-magenta shadow-[0_0_12px_rgba(255,51,119,0.3)]' 
                      : 'bg-white/5 border-white/10 text-white/40 hover:text-white'
                  }`}
                  title={isPlayingMusic ? "Mute ambient music synthesis" : "Unmute space synth loop"}
                >
                  {isPlayingMusic ? (
                    <div className="relative">
                      <Volume2 className="w-4 h-4 md:w-5 md:h-5 text-luxury-magenta" />
                      <div className="absolute -top-1 -right-1 flex gap-0.5 h-1.5 items-end justify-center pointer-events-none">
                        <motion.span animate={{ height: [3, 6, 3] }} transition={{ repeat: Infinity, duration: 0.5 }} className="w-[1.5px] bg-luxury-magenta rounded-full" />
                        <motion.span animate={{ height: [1, 5, 1] }} transition={{ repeat: Infinity, duration: 0.4, delay: 0.1 }} className="w-[1.5px] bg-luxury-magenta rounded-full" />
                      </div>
                    </div>
                  ) : (
                    <VolumeX className="w-4 h-4 md:w-5 md:h-5 text-white/50" />
                  )}
                </button>

                {/* Mood Settings Tuning Switcher Trigger */}
                <button 
                  onClick={() => setShowMoodControls(prev => !prev)}
                  className={`p-2.5 md:p-3 rounded-full transition-all border hover:scale-105 ${
                    showMoodControls 
                      ? 'bg-luxury-gold/25 border-luxury-gold/50 text-luxury-gold shadow-[0_0_12px_rgba(230,185,115,0.4)]' 
                      : 'bg-white/5 border-white/10 text-white hover:border-luxury-magenta/30'
                  }`}
                  title="Tune Venue Mood & Color Overlay"
                >
                  <Sliders className="w-4 h-4 md:w-5 md:h-5" />
                </button>

                <button 
                  onClick={takePhoto}
                  className="p-2.5 md:p-3 bg-white/5 hover:bg-luxury-magenta/20 border border-white/10 hover:border-luxury-magenta/50 rounded-full hover:scale-110 transition-all text-luxury-magenta"
                  title="Take dating polaroid memory"
                >
                  <Camera className="w-4 h-4 md:w-5 md:h-5 animate-pulse" />
                </button>

                <button 
                  onClick={onClose} 
                  className="p-2.5 md:p-3 bg-white/5 hover:bg-white/15 border border-white/10 rounded-full hover:scale-110 transition-transform"
                >
                  <X className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </button>
              </div>
            </header>

            {/* REAL-TIME DYNAMIC MOOD PANEL SELECTION SLIDE DRAWER */}
            <AnimatePresence>
              {showMoodControls && (
                <motion.div
                  initial={{ y: -30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -30, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="absolute top-24 right-4 md:right-8 w-[280px] md:w-[320px] glass p-4 md:p-5 rounded-[2rem] border-luxury-magenta/20 backdrop-blur-xl z-50 shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
                >
                  <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                    <div className="flex items-center gap-1.5">
                      <Sliders className="w-4 h-4 text-luxury-gold" />
                      <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-luxury-gold">Atmosphere Pitcher</span>
                    </div>
                    {isPlayingMusic && (
                      <div className="flex items-center gap-2">
                        <div className="flex items-end gap-[2px] h-2.5">
                          <motion.div animate={{ height: [3, 9, 3] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-[1.5px] bg-luxury-magenta rounded-full" />
                          <motion.div animate={{ height: [1, 10, 1] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }} className="w-[1.5px] bg-luxury-magenta rounded-full" />
                          <motion.div animate={{ height: [4, 7, 4] }} transition={{ repeat: Infinity, duration: 0.5, delay: 0.1 }} className="w-[1.5px] bg-luxury-magenta rounded-full" />
                        </div>
                        <span className="text-[7.5px] font-mono text-white/40 tracking-wider">Synth Live</span>
                      </div>
                    )}
                  </div>
                  
                  <p className="text-[9.5px] text-white/50 leading-relaxed mb-4">
                    Modify the light color spectrum, saturation blending mode, and simulated ambient chime synthesis.
                  </p>

                  <div className="flex flex-col gap-2">
                    {moodOptions.map((mood) => {
                      const isActive = selectedMood.id === mood.id;
                      return (
                        <button
                          key={mood.id}
                          onClick={() => setSelectedMood(mood)}
                          className={`w-full text-left p-2.5 rounded-2xl border transition-all flex items-center justify-between ${
                            isActive 
                              ? `border-luxury-magenta/70 bg-luxury-magenta/10 shadow-[0_0_12px_rgba(255,51,119,0.15)]` 
                              : 'border-white/10 hover:border-white/20 bg-white/5'
                          }`}
                        >
                          <div className="flex flex-col">
                            <span className={`text-[10.5px] font-bold font-sans ${isActive ? 'text-luxury-magenta' : 'text-white'}`}>
                              {mood.name}
                            </span>
                            <span className="text-[7.5px] tracking-wider uppercase text-white/40">
                              {mood.vibeName}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className={`text-[8px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold ${
                              isActive ? 'bg-luxury-gold/25 text-luxury-gold' : 'bg-white/5 text-white/40'
                            }`}>
                              {isActive ? 'Active' : 'Pick'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-3.5 bg-black/40 border border-white/5 p-2 rounded-xl flex items-center justify-between gap-1">
                    <span className="text-[7.5px] uppercase tracking-widest text-white/40">Current Vibe Track:</span>
                    <span className="text-[8.5px] font-mono font-bold text-luxury-gold shrink-0 truncate max-w-[150px]">
                      {isPlayingMusic ? selectedMood.audioName : "🔊 Synthesis Muted"}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

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
                  Photo Saved 📸
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

            {/* Immersive Portrait Rendering */}
            <main className="flex-1 relative z-10 flex items-center justify-center pointer-events-none mb-10">
              <motion.img 
                src={idol.image}
                className="h-[65vh] md:h-[80vh] object-contain drop-shadow-[0_0_50px_rgba(255,51,119,0.25)] filter"
                initial={{ opacity: 0, scale: 0.9, y: 50 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 1.5 }}
              />
            </main>

            {/* Immersive Sub Dialogue Flow Section */}
            <footer className="relative z-20 px-6 md:px-8 pb-12 md:pb-16 mt-auto">
              <AnimatePresence mode="wait">
                {step < selectedLocation.dialogues.length && (
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
                      {dialogueActionText(selectedLocation.dialogues[step].action) && (
                        <span className="text-[9px] font-serif tracking-wider italic text-white/40">
                          {selectedLocation.dialogues[step].action}
                        </span>
                      )}
                    </div>
                    <p className="text-sm md:text-lg font-medium italic leading-relaxed text-center mb-6 text-white/95">
                      "{selectedLocation.dialogues[step].text}"
                    </p>
                    <div className="flex justify-center">
                       <button 
                        onClick={() => setStep(s => s + 1)}
                        className="px-6 py-2.5 glass-gold rounded-full text-[10px] uppercase font-bold tracking-widest text-luxury-magenta shadow-[0_0_15px_rgba(255,51,119,0.2)] hover:scale-105 active:scale-95 transition-all"
                       >
                         Tap to continue
                       </button>
                    </div>
                  </motion.div>
                )}

                {showChoices && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col gap-4 max-w-sm mx-auto"
                  >
                    {selectedLocation.choices.map((choice, i) => (
                      <motion.button
                        key={i}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleChoice(choice.gain)}
                        className="glass-gold p-6 rounded-3xl font-display font-black uppercase tracking-[0.2em] text-xs hover:bg-luxury-magenta/20 transition-all border-luxury-magenta/50 text-white shadow-xl"
                      >
                        {choice.text}
                      </motion.button>
                    ))}
                  </motion.div>
                )}
                
                {step >= selectedLocation.dialogues.length && !showChoices && (
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Minimal auxiliary function to format dialogue action tags
function dialogueActionText(action: string) {
  return action ? action.trim() : "";
}
