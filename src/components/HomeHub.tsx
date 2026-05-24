import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, Heart, Camera, Home, Sparkles, 
  Clock, Cloud, LogOut, Volume2, Award, Zap, Compass, Star, Mic, X, Calendar, BookOpen
} from 'lucide-react';
import { Idol, AppView, StatusUpdate, UserProfile, DynamicEvent } from '../types';
import { useFirebase } from '../lib/FirebaseContext';
import { speakText, playSentSound, playReceivedSound } from '../utils/audio';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, doc, onSnapshot, setDoc, updateDoc, increment } from 'firebase/firestore';
import { DEFAULT_STATUS_UPDATES } from '../constants';
import EventCenter from './EventCenter';
import DateScene from './DateScene';
import StoryEpisodes from './StoryEpisodes';

interface Props {
  idol: Idol;
  onNavigate: (view: AppView) => void;
  profile: UserProfile;
  onUpdateProfile: (newProfile: UserProfile) => void;
}

const IDOL_MISSIONS: Record<string, string> = {
  nayeon: 'Watch her latest "POP!" solo choreography video and find strawberry jello.',
  jeongyeon: 'Challenge her to a LEGO building match and tidy up the shared recording suite.',
  momo: 'Order a platter of fresh Jokbal and practice her iconic dance tutorial.',
  sana: 'Pick a luxury flower fragrance and surprise her with cute "Shy Shy Shy" Aegyo.',
  jihyo: 'Go on an invigorating high-energy surfing adventure over the East Sea.',
  mina: 'Boot up Minecraft for a quiet survival co-op gaming night in her room.',
  dahyun: 'Play a romantic melody on the piano and help her locate hidden cameras.',
  chaeyoung: 'Read through her private sketch book in a quiet indie café and write poems.',
  tzuyu: 'Spend a calm evening walking puppies in the park and share sincere thoughts.'
};

const IDOL_AURA_COLOR: Record<string, string> = {
  nayeon: 'from-pink-500/10 to-transparent',
  jeongyeon: 'from-emerald-500/10 to-transparent',
  momo: 'from-rose-500/10 to-transparent',
  sana: 'from-purple-500/10 to-transparent',
  jihyo: 'from-amber-500/10 to-transparent',
  mina: 'from-teal-500/10 to-transparent',
  dahyun: 'from-indigo-400/10 to-transparent',
  chaeyoung: 'from-red-500/10 to-transparent',
  tzuyu: 'from-sky-500/10 to-transparent'
};

const IDOL_NEON: Record<string, string> = {
  nayeon: '#FF3377',
  jeongyeon: '#10B981',
  momo: '#F43F5E',
  sana: '#A855F7',
  jihyo: '#F59E0B',
  mina: '#14B8A6',
  dahyun: '#818CF8',
  chaeyoung: '#EF4444',
  tzuyu: '#0EA5E9'
};

function getAffinityLevel(score: number): { title: string; desc: string; textStyle: string; tier: string } {
  if (score < 20) return { title: 'Distant Friends ☕', desc: 'Starting to break the ice.', textStyle: 'text-zinc-400 border-zinc-500/20 bg-zinc-500/5', tier: 'TIER V' };
  if (score < 40) return { title: 'Sweet Dialogue 🌸', desc: 'Exchanging daily updates.', textStyle: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5', tier: 'TIER IV' };
  if (score < 60) return { title: 'Charming Chemistry ✨', desc: 'Heart flutter alerts!', textStyle: 'text-sky-400 border-sky-500/20 bg-sky-500/5', tier: 'TIER III' };
  if (score < 85) return { title: 'My Ultimate Bias 💖', desc: 'A deeply trusted connection.', textStyle: 'text-rose-400 border-rose-500/20 bg-rose-500/5', tier: 'TIER II' };
  return { title: 'Destined Soulmates 👑', desc: 'Hearts beat in perfect sync.', textStyle: 'text-amber-400 border-amber-500/35 bg-amber-500/5 shadow-[0_0_15px_rgba(245,158,11,0.08)]', tier: 'TIER I' };
}

export default function HomeHub({ idol, onNavigate, profile, onUpdateProfile }: Props) {
  const { user, loginWithGoogle, logout } = useFirebase();
  const [time, setTime] = useState(new Date());
  const [greeting, setGreeting] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showExitHint, setShowExitHint] = useState(false);
  const [activeCloneName, setActiveCloneName] = useState<string>('');

  const [updates, setUpdates] = useState<StatusUpdate[]>([]);
  const [loadingUpdates, setLoadingUpdates] = useState(true);
  const [showStatusUpdates, setShowStatusUpdates] = useState(false);

  // Sprint / Option panel states
  const [showEventsPanel, setShowEventsPanel] = useState(false);
  const [showStoryEpisodes, setShowStoryEpisodes] = useState(false);
  const [activeDateEvent, setActiveDateEvent] = useState<DynamicEvent | null>(null);

  const handleAddStats = (stats: Partial<UserProfile>) => {
    const updated = {
      ...profile,
      affection: Math.min(100, (profile.affection || 0) + (stats.affection || 0)),
      trust: Math.min(100, (profile.trust || 0) + (stats.trust || 0)),
      chemistry: Math.min(100, (profile.chemistry || 0) + (stats.chemistry || 0)),
      comfort: Math.min(100, (profile.comfort || 0) + (stats.comfort || 0))
    };
    onUpdateProfile(updated);
  };
  const [likedUpdates, setLikedUpdates] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(`bubble_liked_updates_${idol.id}`);
      return saved ? JSON.parse(saved) : {};
    } catch (_) { return {}; }
  });

  const triggerHaptic = (pattern: number | number[] = 10) => {
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    } catch (_) {}
  };

  useEffect(() => {
    if (!user) {
      const local = DEFAULT_STATUS_UPDATES[idol.id] || [];
      setUpdates(local);
      setLoadingUpdates(false);
      return;
    }

    setLoadingUpdates(true);
    const updatesColRef = collection(db, 'idols', idol.id, 'status_updates');

    // Subscribe to real-time status updates subcollection
    const unsubscribe = onSnapshot(updatesColRef, async (snapshot) => {
      if (snapshot.empty) {
        // Automatically seed the subcollection if it doesn't exist
        try {
          const defaults = DEFAULT_STATUS_UPDATES[idol.id] || [];
          for (const item of defaults) {
            await setDoc(doc(db, 'idols', idol.id, 'status_updates', item.id), item);
          }
        } catch (error) {
          console.error("Auto seeding of updates failed:", error);
          const defaults = DEFAULT_STATUS_UPDATES[idol.id] || [];
          setUpdates(defaults);
          setLoadingUpdates(false);
        }
      } else {
        const list: StatusUpdate[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as StatusUpdate);
        });
        list.sort((a, b) => b.timestamp - a.timestamp);
        setUpdates(list);
        setLoadingUpdates(false);
      }
    }, (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, `idols/${idol.id}/status_updates`);
      } catch (_) {}
      // Fallback
      const defaults = DEFAULT_STATUS_UPDATES[idol.id] || [];
      setUpdates(defaults);
      setLoadingUpdates(false);
    });

    return () => unsubscribe();
  }, [user, idol.id]);

  const handleLikeUpdate = async (updateId: string) => {
    triggerHaptic(10);
    const alreadyLiked = likedUpdates[updateId];
    const updatedLiked = { ...likedUpdates, [updateId]: !alreadyLiked };
    setLikedUpdates(updatedLiked);
    try {
      localStorage.setItem(`bubble_liked_updates_${idol.id}`, JSON.stringify(updatedLiked));
    } catch (_) {}

    const diff = alreadyLiked ? -1 : 1;
    setUpdates(prev => prev.map(up => {
      if (up.id === updateId) {
        return { ...up, likes: Math.max(0, up.likes + diff) };
      }
      return up;
    }));

    if (user) {
      try {
        const docRef = doc(db, 'idols', idol.id, 'status_updates', updateId);
        await updateDoc(docRef, {
          likes: increment(diff)
        });
      } catch (error) {
        try {
          handleFirestoreError(error, OperationType.UPDATE, `idols/${idol.id}/status_updates/${updateId}`);
        } catch (_) {}
      }
    }
  };

  const activeMission = IDOL_MISSIONS[idol.id] || IDOL_MISSIONS.nayeon;
  const activeAura = IDOL_AURA_COLOR[idol.id] || IDOL_AURA_COLOR.nayeon;
  const activeColor = IDOL_NEON[idol.id] || '#FF3377';
  const affinity = getAffinityLevel(profile.affection || 12);

  useEffect(() => {
    try {
      const savedActiveId = localStorage.getItem('active_voice_clone_id');
      const savedClonesStr = localStorage.getItem('ai_voice_clones');
      const PREBUILT_CLONES = [
        { id: 'prebuilt-sweet-lover', name: 'Mina Style (Soft ASMR)', gender: 'female', age: 'young', pitch: 12, accent: 'Whisper ASMR', stability: 85, clarity: 92, provider: 'sandbox', voiceId: 'sandbox-sweet-lover' },
        { id: 'prebuilt-popstar', name: 'Nayeon Style (Sassy Pop)', gender: 'female', age: 'young', pitch: 20, accent: 'Sassy Popstar', stability: 78, clarity: 88, provider: 'sandbox', voiceId: 'sandbox-popstar' },
        { id: 'prebuilt-mature-oppa', name: 'Warm Friend (Calm Tone)', gender: 'male', age: 'mature', pitch: -22, accent: 'Standard US English', stability: 90, clarity: 95, provider: 'sandbox', voiceId: 'sandbox-mature-oppa' }
      ];
      
      let allClones = [...PREBUILT_CLONES];
      if (savedClonesStr) {
        const savedClones = JSON.parse(savedClonesStr);
        allClones = [...PREBUILT_CLONES, ...savedClones];
      }
      const activeClone = allClones.find(c => c.id === savedActiveId) || PREBUILT_CLONES[0];
      if (activeClone) {
        setActiveCloneName(activeClone.name);
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 60000);
    const hour = time.getHours();

    if (hour < 12) setGreeting(`Good morning. I've been waiting for you to wake up.`);
    else if (hour < 18) setGreeting(`Are you having a busy day? Don't forget to take cozy rests.`);
    else setGreeting(`The city looks beautiful tonight. It reminds me of our special memories...`);

    return () => clearInterval(timer);
  }, [time]);

  const triggerVoiceGreeting = () => {
    if (isSpeaking) return;
    setIsSpeaking(true);
    speakText(idol.voiceIntro, idol.name);
    playSentSound();
    
    // Simulate vocal speech wave length
    setTimeout(() => {
      setIsSpeaking(false);
    }, 4500);
  };

  return (
    <div className="min-h-screen bg-luxury-black text-white relative overflow-y-auto xl:overflow-hidden flex flex-col justify-between p-4 md:p-6 lg:p-10 select-none pb-24 xl:pb-10">
      
      {/* Dynamic Ambient Space Overlay */}
      <div className="absolute inset-0 w-full h-full overflow-hidden opacity-30 z-0 pointer-events-none transition-all duration-1000">
        <div 
          className="absolute inset-x-0 top-0 w-full h-full bg-gradient-to-b opacity-50 transition-all duration-1000"
          style={{ backgroundImage: `linear-gradient(to bottom, ${activeColor}33, transparent)` }}
        />
        <img
          src="https://legacy.kpopping.com/c8/0/TWICE-SPECIAL-ALBUM-TEN-The-Story-Goes-On-documents-1.jpeg"
          alt="Twice Collective Backdrop"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover object-center scale-105 filter blur-lg opacity-40 transition-all duration-1000"
        />
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-luxury-black via-luxury-black/95 to-luxury-black/40 z-0 pointer-events-none" />

      {/* Glow Ambient Lights */}
      <div 
        className="absolute top-1/3 left-1/4 w-[500px] h-[500px] blur-[150px] rounded-full opacity-15 pointer-events-none transition-all duration-1000"
        style={{ backgroundColor: activeColor }}
      />

      {/* Top Header Panel */}
      <header className="relative z-10 w-full max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-white/5 pb-4 md:pb-6">
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="space-y-1 text-center sm:text-left"
        >
          <div className="flex items-center justify-center sm:justify-start gap-2" style={{ color: activeColor }}>
            <Clock className="w-3.5 h-3.5" />
            <span className="text-[9px] md:text-[10px] uppercase tracking-[0.25em] font-black font-mono">
              {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • SEOUL
            </span>
          </div>
          <h2 className="text-xs md:text-sm font-medium text-white/50 max-w-sm leading-relaxed">{greeting}</h2>
        </motion.div>

        {/* Sync Controls & General Actions */}
        <div className="flex items-center gap-3">
          <motion.button
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            onClick={user ? logout : loginWithGoogle}
            className={`glass px-4 py-2.5 rounded-2xl flex items-center gap-2.5 border transition-all cursor-pointer hover:scale-105 active:scale-95 text-xs font-semibold ${
              user
                ? 'border-emerald-500/30 text-emerald-300 hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-400'
                : 'border-white/10 text-white/80 hover:border-white/30'
            }`}
            title={user ? "Logout session" : "Sign In to backup data to cloud"}
          >
            {user ? (
              <>
                <img
                  src={user.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150'}
                  referrerPolicy="no-referrer"
                  className="w-4 h-4 rounded-full object-cover border border-emerald-400"
                  alt="Sync Avatar"
                />
                <span className="truncate max-w-[80px] text-[11px] font-display">Synced</span>
              </>
            ) : (
              <>
                <Cloud size={13} className="text-luxury-gold animate-pulse" />
                <span className="text-[11px] font-display">Cloud Sync</span>
              </>
            )}
          </motion.button>

          {/* Persistent Bias Back button */}
          <motion.button
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
            onClick={() => { onNavigate('selection'); playSentSound(); }}
            className="px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 hover:scale-105 active:scale-95 transition-all cursor-pointer text-xs font-semibold uppercase tracking-wider text-rose-300 shadow-md"
          >
            Switch Bias
          </motion.button>
        </div>
      </header>

      {/* Main Responsive Grid Layout (Multi-Column Home Page) */}
      <main className="w-full max-w-7xl mx-auto flex-1 grid grid-cols-1 xl:grid-cols-12 gap-6 md:gap-8 items-center py-6 md:py-10 relative z-10">
        
        {/* -- COLUMN 1 (LEFT HOME STATS DECK) -- */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="xl:col-span-3 flex flex-col gap-4 md:gap-5 w-full order-2 xl:order-1"
        >
          {/* Card: Aura Chemistry Status */}
          <div 
            className="glass p-5 rounded-[1.8rem] border transition-all duration-300 hover:scale-[1.01]"
            style={{ 
              borderColor: `${activeColor}20`,
              boxShadow: `0 15px 35px -15px ${activeColor}15, inset 0 1px 1px rgba(255,255,255,0.05)`
            }}
          >
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <span className="text-[8px] font-mono tracking-widest uppercase text-white/45 flex items-center gap-1.5 font-sans">
                <Compass size={11} className="text-rose-400" />
                CHEMISTRY STATUS
              </span>
              <span className="text-[8px] font-mono font-bold text-luxury-gold tracking-wider">{affinity.tier}</span>
            </div>

            <div className="space-y-3">
              <div>
                <div className={`px-2.5 py-1.5 rounded-xl border text-center font-bold font-display text-xs tracking-wider uppercase mb-1.5 ${affinity.textStyle}`}>
                  {affinity.title}
                </div>
                <p className="text-[10px] text-white/40 leading-relaxed text-center font-medium italic">"{affinity.desc}"</p>
              </div>

              {/* Affinity Level Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[8px] font-mono tracking-widest text-white/35 uppercase">
                  <span>Current Bond Level</span>
                  <span className="text-rose-400 font-bold">{profile.affection || 12}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/5 relative overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${profile.affection || 12}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    style={{ background: `linear-gradient(to right, ${activeColor}, #FFA07A)` }}
                    className="h-full rounded-full"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card: Bio-data Highlights */}
          <div 
            className="glass p-5 rounded-[1.8rem] border transition-all duration-300 hover:scale-[1.01]"
            style={{ 
              borderColor: `${activeColor}15`,
              boxShadow: `0 15px 35px -15px ${activeColor}10, inset 0 1px 1px rgba(255,255,255,0.02)`
            }}
          >
            <span className="text-[8px] font-mono tracking-widest uppercase text-white/45 block mb-1 font-sans">BIAS PARAMETERS</span>
            <div className="grid grid-cols-2 gap-3.5 mb-3.5">
              <div className="p-2.5 rounded-2xl bg-white/5 border border-white/5">
                <span className="text-[7.5px] font-mono text-white/30 block tracking-widest uppercase mb-0.5">Role Group</span>
                <span className="text-[10.5px] font-display font-black text-rose-300/90 truncate block">{idol.role.split(',')[0]}</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-white/5 border border-white/5">
                <span className="text-[7.5px] font-mono text-white/30 block tracking-widest uppercase mb-0.5">Best Treat</span>
                <span className="text-[10.5px] font-display font-black text-white/90 truncate block">{idol.favoriteFood.split('&')[0]}</span>
              </div>
            </div>
            {idol.instagram && (
              <a href={`https://instagram.com/${idol.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-2.5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer">
                <span className="text-[7.5px] font-mono text-white/30 tracking-widest uppercase block">Instagram</span>
                <span className="text-[10.5px] font-mono font-black text-luxury-gold truncate">{idol.instagram}</span>
              </a>
            )}
          </div>

        </motion.div>

        {/* -- COLUMN 2 (CENTER STANDING PORTRAIT CANVAS & TALK BUBBLE) -- */}
        <div className="xl:col-span-6 flex flex-col items-center justify-center p-2 relative order-1 xl:order-2 overflow-hidden md:overflow-visible min-h-[420px] md:min-h-[530px] w-full">
          
          {/* Subtle concentric cyber-halo stage to anchor the center group visually */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-0 overflow-hidden">
            <div className="w-[300px] h-[300px] md:w-[460px] md:h-[460px] rounded-full border border-white/[0.02] absolute animate-[spin_120s_linear_infinite]" />
            <div className="w-[190px] h-[190px] md:w-[310px] md:h-[310px] rounded-full border border-dashed border-white/[0.03] absolute animate-[spin_80s_linear_infinite_reverse]" />
            <div className="w-[90px] h-[90px] md:w-[160px] md:h-[160px] rounded-full border border-white/[0.015] absolute" />
          </div>

          {/* Standing Portrait with reflection & lighting pedestal */}
          <div className="relative pointer-events-auto cursor-pointer group flex items-end justify-center min-h-[350px] md:min-h-[480px] z-10 w-full">
            {/* Soft glowing aura behind her */}
            <div className={`absolute bottom-32 w-72 h-72 rounded-full blur-[110px] opacity-40 transition-all ${activeAura}`} />
            
            {/* Glowing reflective floor light portal at the standing feet */}
            <div 
              className="absolute bottom-2 left-1/2 -translate-x-1/2 w-48 md:w-64 h-8 rounded-full opacity-60 pointer-events-none transition-all duration-700 group-hover:scale-110 group-hover:opacity-85"
              style={{
                background: `radial-gradient(ellipse at center, ${activeColor}50 0%, transparent 70%)`
              }}
            />

            <motion.img
              src={idol.image}
              alt={idol.name}
              initial={{ y: 50, opacity: 0 }}
              animate={{ 
                y: [0, -8, 0],
                scale: [1, 1.015, 1],
                opacity: 1 
              }}
              whileHover={{ 
                scale: 1.035,
                filter: "brightness(1.04)"
              }}
              transition={{ 
                y: {
                  repeat: Infinity,
                  duration: 4,
                  ease: "easeInOut"
                },
                scale: { 
                  repeat: Infinity,
                  duration: 4.5,
                  ease: "easeInOut" 
                },
                opacity: { duration: 0.8, ease: "easeOut" }
              }}
              style={{
                filter: `drop-shadow(0 25px 45px ${activeColor}25) drop-shadow(0 6px 14px rgba(0,0,0,0.5))`
              }}
              className="h-[38vh] md:h-[52vh] xl:h-[58vh] max-h-[580px] object-contain select-none transition-all duration-300"
              onClick={triggerVoiceGreeting}
            />

            {/* Sparkles Dynamic Tactile Touchpoint Indicator */}
            <motion.div
              className="absolute bottom-[45%] right-[22%] w-6 h-6 rounded-full border border-white/20 glass flex items-center justify-center pointer-events-none group-hover:scale-125 transition-all duration-300"
              animate={{ y: [0, -5, 0] }}
              transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
            >
              <div className="w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: activeColor }} />
              <Sparkles className="absolute w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: activeColor }} />
            </motion.div>
          </div>

          {/* Interactive Floating Talk Bubble Card with reactive scaling & pulse ring */}
          <motion.div
            initial={{ y: 25, opacity: 0 }}
            animate={{ 
              y: 0, 
              opacity: 1,
              scale: isSpeaking ? 1.04 : 1,
            }}
            whileHover={{ scale: isSpeaking ? 1.05 : 1.03, y: -2 }}
            transition={{ type: "spring", stiffness: 160, damping: 18 }}
            onClick={triggerVoiceGreeting}
            className={`absolute bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[290px] md:max-w-[340px] glass p-4 md:p-5 rounded-[1.8rem] border flex flex-col gap-1 z-20 shadow-2xl backdrop-blur-3xl cursor-pointer transition-all duration-300 ${
              isSpeaking ? 'ring-2 ring-white/10' : ''
            }`}
            style={{ 
              borderColor: isSpeaking ? activeColor : `${activeColor}30`,
              boxShadow: isSpeaking 
                ? `0 20px 45px -5px ${activeColor}40, inset 0 1px 1px rgba(255,255,255,0.15)` 
                : `0 15px 35px -10px ${activeColor}20, inset 0 1px 1px rgba(255,255,255,0.05)` 
            }}
          >
            <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full animate-pulse mr-0.5" style={{ backgroundColor: activeColor }} />
                <span className="text-[8.5px] font-mono tracking-widest font-black uppercase font-sans" style={{ color: activeColor }}>Voice Introduction</span>
              </div>
              
              {/* Voice Equalizer lines simulation to look active when speaking */}
              {isSpeaking ? (
                <div className="flex items-center gap-0.5 h-2.5">
                  <span className="w-0.5 h-full animate-bounce delay-100" style={{ backgroundColor: activeColor }} />
                  <span className="w-0.5 h-full animate-bounce delay-200" style={{ animationDuration: '0.6s', backgroundColor: activeColor }} />
                  <span className="w-0.5 h-full animate-bounce" style={{ backgroundColor: activeColor }} />
                </div>
              ) : (
                <span className="text-[7px] font-mono tracking-widest text-white/35 flex items-center gap-1 mb-0.5">
                  <Volume2 size={8} /> PLAY GREETING
                </span>
              )}
            </div>
            
            <p className="text-xs text-center font-medium leading-relaxed italic text-white/90 pt-0.5 px-1">
              "{idol.voiceIntro}"
            </p>

            {/* AI Voice Clone Config Active Indicator */}
            <div className="mt-1.5 flex items-center justify-center gap-1.5 bg-white/5 rounded-full py-1 px-3 border border-white/5 self-center">
              <Sparkles size={10} className="text-luxury-gold animate-pulse text-rose-300" style={{ color: activeColor }} />
              <span className="text-[7.5px] font-mono uppercase tracking-wider text-white/50">
                ACTIVE AI VOICE CLONE: <strong className="text-white font-bold" style={{ color: activeColor }}>{activeCloneName || "Mina Style (Soft ASMR)"}</strong>
              </span>
            </div>
          </motion.div>

        </div>

        {/* -- COLUMN 3 (RIGHT DAILY MISSION DECK CARD) -- */}
        <motion.div 
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25 }}
          className="xl:col-span-3 flex flex-col gap-4 md:gap-5 w-full order-3"
        >
          {/* Card: Daily Chemistry Mission */}
          <div 
            className="glass p-5 rounded-[1.8rem] border shadow-xl space-y-4 relative overflow-hidden transition-all duration-300 hover:scale-[1.01]"
            style={{ 
              borderColor: `${activeColor}20`,
              boxShadow: `0 15px 35px -15px ${activeColor}15, inset 0 1px 1px rgba(255,255,255,0.05)`
            }}
          >
            {/* Corner aesthetic badge */}
            <div className="absolute top-0 right-0 p-1 bg-gradient-to-l from-rose-500/10 to-transparent text-[6.5px] font-bold font-mono tracking-widest text-rose-300 uppercase px-2 rounded-bl-xl border-l border-b border-white/5">
              ACTIVE QUEST
            </div>

            <div className="space-y-1">
              <span className="text-[8px] font-mono tracking-widest text-white/45 uppercase flex items-center gap-1.5 leading-none font-sans">
                <Star size={11} className="text-luxury-gold fill-luxury-gold/20" />
                DAILY MISSION
              </span>
              <p className="text-[9px] uppercase font-bold tracking-wider" style={{ color: activeColor }}>{idol.name}'s Choice</p>
            </div>

            <div className="bg-white/5 border border-white/5 p-4 rounded-2xl select-text">
              <p className="text-[11px] leading-relaxed font-medium text-white/80">
                {activeMission}
              </p>
            </div>

            {/* Quick mission shortcut */}
            <button
              onClick={() => { onNavigate('chat'); playSentSound(); }}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-500/15 via-rose-500/20 to-pink-500/10 hover:from-rose-500/30 hover:to-pink-500/20 text-rose-300 font-display font-medium text-xs tracking-wider uppercase transition-all duration-300 border border-rose-500/30 active:scale-[0.97] cursor-pointer flex items-center justify-center gap-2 shadow-sm"
              style={{ borderColor: `${activeColor}40` }}
            >
              <MessageSquare size={13} className="text-rose-400" style={{ color: activeColor }} />
              Start Interactive Chat
            </button>
          </div>

          {/* Quick-links Bento Action Shortcuts */}
          <div 
            className="glass p-5 rounded-[1.8rem] border shadow-xl space-y-3.5 transition-all duration-300 hover:scale-[1.01]"
            style={{ 
              borderColor: `${activeColor}20`,
              boxShadow: `0 15px 35px -15px ${activeColor}15, inset 0 1px 1px rgba(255,255,255,0.05)`
            }}
          >
            <span className="text-[8px] font-mono tracking-widest uppercase text-white/45 block mb-0.5 font-sans">CHEMISTRY QUICK ACTIVATOR</span>
            
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { onNavigate('memories'); playReceivedSound(); }}
                className="w-full py-2.5 px-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 cursor-pointer text-left text-xs font-semibold uppercase tracking-wider text-rose-200/95 transition-all flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <Camera size={12} className="text-rose-400" /> Memory Book
                </span>
                <span className="text-[9px] font-mono text-white/30 font-bold">&#10095;</span>
              </button>

              <button
                onClick={() => { setShowEventsPanel(true); playReceivedSound(); }}
                className="w-full py-2.5 px-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 cursor-pointer text-left text-xs font-semibold uppercase tracking-wider text-amber-200/95 transition-all flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <Zap size={12} className="text-amber-400 animate-pulse-soft" /> Event Center
                </span>
                <span className="text-[9px] font-mono text-white/30 font-bold">&#10095;</span>
              </button>

              <button
                onClick={() => { setShowStoryEpisodes(true); playReceivedSound(); }}
                className="w-full py-2.5 px-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 cursor-pointer text-left text-xs font-semibold uppercase tracking-wider text-purple-200/95 transition-all flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <BookOpen size={12} className="text-purple-400" /> Story Episodes
                </span>
                <span className="text-[9px] font-mono text-white/30 font-bold">&#10095;</span>
              </button>

              <button
                onClick={() => { setShowStatusUpdates(true); playReceivedSound(); }}
                className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-luxury-gold/5 to-transparent hover:from-luxury-gold/15 hover:to-white/5 border border-luxury-gold/20 hover:border-luxury-gold/45 cursor-pointer text-left text-xs font-semibold uppercase tracking-wider text-amber-200 transition-all flex items-center justify-between shadow-sm"
              >
                <span className="flex items-center gap-2">
                  <Sparkles size={12} className="text-luxury-gold" /> Status Updates
                </span>
                <span className="text-[9px] font-mono text-luxury-gold font-bold">&#10095;</span>
              </button>
            </div>
          </div>

        </motion.div>

      </main>

      {/* Floating Bottom Navigator Dock */}
      <footer className="fixed bottom-4 md:bottom-8 inset-x-0 z-50 px-4 md:px-6">
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="max-w-md mx-auto glass p-2 rounded-2xl md:rounded-[2.2rem] flex items-center justify-between shadow-2xl border-white/5 backdrop-blur-3xl"
        >
          <NavButton icon={<Home />} label="Home" active={true} onClick={() => onNavigate('hub')} activeColor={activeColor} />
          <NavButton icon={<MessageSquare />} label="Chat" onClick={() => onNavigate('chat')} activeColor={activeColor} />
          <NavButton icon={<Camera />} label="Memories" onClick={() => onNavigate('memories')} activeColor={activeColor} />
        </motion.div>
      </footer>

      {/* Event Center Panel */}
      <AnimatePresence>
        {showEventsPanel && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="fixed inset-0 z-40 bg-luxury-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <EventCenter
              idol={idol}
              onClose={() => setShowEventsPanel(false)}
              onAddStats={handleAddStats}
              onEnterDate={(ev) => {
                setShowEventsPanel(false);
                setActiveDateEvent(ev);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Story Episodes Panel */}
      <AnimatePresence>
        {showStoryEpisodes && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="fixed inset-0 z-40 bg-luxury-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <StoryEpisodes
              idol={idol}
              currentAffection={profile.affection || 12}
              onClose={() => setShowStoryEpisodes(false)}
              onSelectEpisode={(title) => {
                setShowStoryEpisodes(false);
                // Trigger customized romance date scene simulating story playthrough choice consequences!
                setActiveDateEvent({
                  id: `story_ev_${Date.now()}`,
                  type: 'date',
                  title: title,
                  description: `Step inside chapter: ${title}`,
                  expiresAt: Date.now() + 1000 * 60 * 60
                });
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interactive Cyber dating Choice Simulator */}
      {activeDateEvent && (
        <DateScene
          idol={idol}
          eventName={activeDateEvent.title}
          onClose={() => setActiveDateEvent(null)}
          onAddStats={handleAddStats}
        />
      )}

      {/* Immersive Idol Status Updates Modal */}
      <AnimatePresence>
        {showStatusUpdates && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-luxury-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50"
          >
            {/* Modal Container */}
            <motion.div
              initial={{ scale: 0.95, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 30 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="bg-luxury-black/95 border border-white/10 rounded-[2.2rem] w-full max-w-xl flex flex-col max-h-[80vh] overflow-hidden shadow-2xl relative"
              style={{
                boxShadow: `0 25px 60px -15px ${activeColor}30, inset 0 1px 1px rgba(255,255,255,0.05)`
              }}
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-gradient-to-b from-white/[0.02] to-transparent">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-full bg-cover bg-center border-2 animate-pulse-soft"
                    style={{ 
                      backgroundImage: `url(${idol.image})`,
                      borderColor: activeColor
                    }}
                  />
                  <div>
                    <h3 className="font-bold text-sm tracking-wide text-white flex items-center gap-1.5 leading-none">
                      {idol.name} 
                      <span className="text-[7.5px] uppercase font-black px-1.5 py-0.5 rounded bg-luxury-gold/10 text-luxury-gold border border-luxury-gold/25 leading-none">Bubble Feed</span>
                    </h3>
                    <p className="text-[9px] font-mono text-white/40 tracking-wider uppercase mt-1 leading-none">{idol.personalityTag}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Status update indicator */}
                  <div className="hidden xs:flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
                    <Cloud size={10} className="text-luxury-gold" />
                    <span className="text-[8px] font-mono uppercase tracking-widest text-white/55">
                      {user ? "Cloud Synced" : "Offline Cache"}
                    </span>
                  </div>

                  <button
                    onClick={() => { setShowStatusUpdates(false); playReceivedSound(); }}
                    className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/5 hover:border-white/15 cursor-pointer text-white/40 hover:text-white/90 transition-all active:scale-95"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Feed Body */}
              <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-5 custom-scrollbar">
                {loadingUpdates ? (
                  <div className="py-20 text-center flex flex-col items-center justify-center">
                    <div className="w-8 h-8 rounded-full border-t-2 border-r-2 animate-spin mb-4" style={{ borderColor: activeColor }} />
                    <p className="text-[10px] font-mono text-white/40 tracking-widest uppercase animate-pulse">Establishing secure channel...</p>
                  </div>
                ) : updates.length === 0 ? (
                  <div className="py-16 text-center text-white/30 space-y-2">
                    <Sparkles size={24} className="mx-auto opacity-20 mb-1" style={{ color: activeColor }} />
                    <p className="text-xs font-semibold uppercase tracking-wider">Feed is currently silent</p>
                    <p className="text-[10px] max-w-xs mx-auto leading-relaxed">Let's wait for {idol.name} to release her next sweet status update!</p>
                  </div>
                ) : (
                  updates.map((item) => {
                    const liked = likedUpdates[item.id];
                    const dateStr = new Date(item.timestamp).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-3xl bg-white/[0.03] border border-white/5 flex flex-col gap-3 hover:bg-white/[0.05] transition-all duration-300"
                        style={{
                          boxShadow: `inset 0 1px 1px rgba(255,255,255,0.02)`
                        }}
                      >
                        {/* Meta */}
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1.5 text-white/50">
                            <Calendar size={11} className="text-rose-400" style={{ color: activeColor }} />
                            <span className="text-[9px] font-mono text-white/40 uppercase tracking-wider leading-none">{dateStr}</span>
                          </div>
                          
                          <span className="text-[7.5px] font-mono text-luxury-gold uppercase px-1.5 py-0.5 rounded bg-luxury-gold/5 border border-luxury-gold/15">Authorized Bubble Original</span>
                        </div>

                        {/* Text */}
                        <p className="text-xs md:text-[13px] leading-relaxed text-white/85 select-text whitespace-pre-line font-medium">
                          {item.text}
                        </p>

                        {/* Attachment Image if present */}
                        {item.imageUrl && (
                          <div className="relative rounded-2xl overflow-hidden border border-white/5 max-h-48 group cursor-zoom-in">
                            <img
                              src={item.imageUrl}
                              alt="Feed image attachment"
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
                          </div>
                        )}

                        {/* Interactive reaction buttons */}
                        <div className="flex items-center justify-between border-t border-white/5 pt-2.5 mt-1">
                          <button
                            onClick={() => handleLikeUpdate(item.id)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all cursor-pointer hover:scale-105 active:scale-95 ${
                              liked 
                                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 font-extrabold shadow-sm shadow-rose-500/10' 
                                : 'bg-white/5 border-white/5 text-white/40 hover:text-white/80 hover:bg-white/10 hover:border-white/10'
                            }`}
                          >
                            <Heart size={12.5} className={`transition-transform duration-300 ${liked ? 'fill-rose-500 text-rose-400 animate-pulse-soft scale-110' : 'text-white/50'}`} />
                            <span className="text-[10px] font-mono leading-none tracking-tight">{item.likes}</span>
                          </button>

                          <span className="text-[8px] font-mono tracking-wider text-white/20 select-none uppercase">Official Fan Exclusive</span>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavButton({ icon, label, active = false, onClick, activeColor }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void, activeColor?: string }) {
  return (
    <button
      onClick={() => { onClick(); playReceivedSound(); }}
      className={`flex flex-col items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-xl md:rounded-[1.8rem] transition-all duration-300 gap-1.5 cursor-pointer relative ${
        active 
          ? 'text-white font-black' 
          : 'text-white/40 hover:text-white/80 hover:bg-white/5'
      }`}
      style={active && activeColor ? {
        backgroundColor: activeColor,
        boxShadow: `0 10px 20px -5px ${activeColor}50`
      } : {}}
    >
      {React.cloneElement(icon as React.ReactElement<any>, { size: 16 })}
      <span className="text-[7.5px] md:text-[8px] uppercase tracking-wider font-bold leading-none">{label}</span>
    </button>
  );
}
