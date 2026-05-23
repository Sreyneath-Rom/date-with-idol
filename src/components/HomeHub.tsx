import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, Heart, Camera, Shirt, Home, Sparkles, 
  Clock, MapPin, Cloud, LogOut, Volume2, Award, Zap, Compass, Star, Mic
} from 'lucide-react';
import { Idol, AppView } from '../types';
import { useFirebase } from '../lib/FirebaseContext';
import { speakText, playSentSound, playReceivedSound } from '../utils/audio';

interface Props {
  idol: Idol;
  onNavigate: (view: AppView) => void;
  affection: number;
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

export default function HomeHub({ idol, onNavigate, affection }: Props) {
  const { user, loginWithGoogle, logout } = useFirebase();
  const [time, setTime] = useState(new Date());
  const [greeting, setGreeting] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showExitHint, setShowExitHint] = useState(false);

  const activeMission = IDOL_MISSIONS[idol.id] || IDOL_MISSIONS.nayeon;
  const activeAura = IDOL_AURA_COLOR[idol.id] || IDOL_AURA_COLOR.nayeon;
  const activeColor = IDOL_NEON[idol.id] || '#FF3377';
  const affinity = getAffinityLevel(affection);

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
      <div className="absolute inset-0 w-full h-full overflow-hidden opacity-25 z-0 pointer-events-none transition-all duration-1000">
        <div 
          className="absolute inset-x-0 top-0 w-full h-full bg-gradient-to-b opacity-40 transition-all duration-1000"
          style={{ backgroundImage: `linear-gradient(to bottom, ${activeColor}33, transparent)` }}
        />
        <div
          className="absolute inset-0 bg-center bg-cover scale-105 filter blur-sm translate-y-2 opacity-60"
          style={{ backgroundImage: `url('https://legacy.kpopping.com/c8/0/TWICE-SPECIAL-ALBUM-TEN-The-Story-Goes-On-documents-1.jpeg')` }}
        />
        
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-luxury-black via-luxury-black/90 to-luxury-black/50 z-0 pointer-events-none" />

      {/* Glow Ambient Lights */}
      <div 
        className="absolute top-1/3 left-1/4 w-[500px] h-[500px] blur-[150px] rounded-full opacity-10 pointer-events-none transition-all duration-1000"
        style={{ backgroundColor: activeColor }}
      />

      {/* Top Header Panel */}
      <header className="relative z-10 w-full max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-white/5 pb-4 md:pb-6">
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="space-y-1 text-center sm:text-left"
        >
          <div className="flex items-center justify-center sm:justify-start gap-2 text-rose-400">
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
          <div className="glass p-5 rounded-[1.8rem] border-white/5 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <span className="text-[8px] font-mono tracking-widest uppercase text-white/45 flex items-center gap-1.5">
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
                  <span className="text-rose-400 font-bold">{affection}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/5 relative overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${affection}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    style={{ background: `linear-gradient(to right, ${activeColor}, #FFA07A)` }}
                    className="h-full rounded-full"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card: Bio-data Highlights */}
          <div className="glass p-5 rounded-[1.8rem] border-white/5 shadow-xl space-y-3">
            <span className="text-[8px] font-mono tracking-widest uppercase text-white/45 block mb-1">BIAS PARAMETERS</span>
            <div className="grid grid-cols-2 gap-3.5">
              <div className="p-2.5 rounded-2xl bg-white/5 border border-white/5">
                <span className="text-[7.5px] font-mono text-white/30 block tracking-widest uppercase mb-0.5">Role Group</span>
                <span className="text-[10.5px] font-display font-black text-rose-300/90 truncate block">{idol.role.split(',')[0]}</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-white/5 border border-white/5">
                <span className="text-[7.5px] font-mono text-white/30 block tracking-widest uppercase mb-0.5">Best Treat</span>
                <span className="text-[10.5px] font-display font-black text-white/90 truncate block">{idol.favoriteFood.split('&')[0]}</span>
              </div>
            </div>
          </div>

        </motion.div>

        {/* -- COLUMN 2 (CENTER STANDING PORTRAIT CANVAS & TALK BUBBLE -- */}
        <div className="xl:col-span-6 flex flex-col items-center justify-center p-2 relative order-1 xl:order-2">
          
          {/* Standing Portrait */}
          <div className="relative pointer-events-auto cursor-pointer group flex items-end justify-center min-h-[350px] md:min-h-[480px]">
            {/* Soft glowing aura behind her */}
            <div className={`absolute bottom-32 w-72 h-72 rounded-full blur-[110px] opacity-40 transition-all ${activeAura}`} />
            
            <motion.img
              src={idol.image}
              alt={idol.name}
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 1.1, ease: "easeOut" }}
              className="h-[38vh] md:h-[52vh] xl:h-[58vh] max-h-[580px] object-contain drop-shadow-[0_15px_35px_rgba(0,0,0,0.92)] select-none hover:scale-[1.02] active:scale-[0.99] transition-transform duration-700"
              onClick={triggerVoiceGreeting}
            />

            {/* Sparkles Dynamic Touch point */}
            <motion.div
              className="absolute top-1/4 right-[25%] w-6 h-6 rounded-full border border-white/20 glass flex items-center justify-center pointer-events-none hover:scale-125 transition-transform"
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 4 }}
            >
              <div className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-ping" />
              <Sparkles className="absolute text-orange-200 w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.div>
          </div>

          {/* Interactive Floating Talk Bubble Card */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            onClick={triggerVoiceGreeting}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-[290px] md:max-w-[340px] glass p-4 md:p-5 rounded-[1.8rem] border-white/5 hover:border-rose-400/20 shadow-2xl backdrop-blur-3xl cursor-pointer hover:scale-[1.03] active:scale-[0.98] transition-all flex flex-col gap-1 z-20"
          >
            <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${isSpeaking ? 'bg-rose-500 animate-ping' : 'bg-rose-400'}`} />
                <span className="text-[8.5px] font-mono tracking-widest text-rose-300 font-black uppercase">Voice Introduction</span>
              </div>
              
              {/* Voice Equalizer lines simulation to look active when speaking */}
              {isSpeaking ? (
                <div className="flex items-center gap-0.5 h-2.5">
                  <span className="w-0.5 h-full bg-rose-400 animate-bounce delay-100" />
                  <span className="w-0.5 h-full bg-rose-400 animate-bounce delay-200" style={{ animationDuration: '0.6s' }} />
                  <span className="w-0.5 h-full bg-rose-400 animate-bounce" />
                </div>
              ) : (
                <span className="text-[7px] font-mono tracking-widest text-white/35 flex items-center gap-1 mb-0.5">
                  <Volume2 size={8} /> PLAY GREETING
                </span>
              )}
            </div>
            
            <p className="text-xs text-center font-medium leading-relaxed italic text-white/90 pt-0.5">
              "{idol.voiceIntro}"
            </p>
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
          <div className="glass p-5 rounded-[1.8rem] border-white/5 shadow-xl space-y-4 relative overflow-hidden">
            {/* Corner aesthetic badge */}
            <div className="absolute top-0 right-0 p-1 bg-gradient-to-l from-rose-500/10 to-transparent text-[6.5px] font-bold font-mono tracking-widest text-rose-300 uppercase px-2 rounded-bl-xl border-l border-b border-white/5">
              ACTIVE QUEST
            </div>

            <div className="space-y-1">
              <span className="text-[8px] font-mono tracking-widest text-white/45 uppercase flex items-center gap-1.5 leading-none">
                <Star size={11} className="text-luxury-gold fill-luxury-gold/20" />
                DAILY MISSION
              </span>
              <p className="text-[9px] text-[#FFADAD] uppercase font-bold tracking-wider">{idol.name}'s Choice</p>
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
            >
              <MessageSquare size={13} className="text-rose-400" />
              Start Interactive Chat
            </button>
          </div>

          {/* Quick-links Bento Action Shortcuts */}
          <div className="glass p-5 rounded-[1.8rem] border-white/5 shadow-xl space-y-3.5">
            <span className="text-[8px] font-mono tracking-widest uppercase text-white/45 block mb-0.5">CHEMISTRY QUICK ACTIVATOR</span>
            
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { onNavigate('date'); playReceivedSound(); }}
                className="w-full py-2.5 px-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 cursor-pointer text-left text-xs font-semibold uppercase tracking-wider text-rose-200/95 transition-all flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <MapPin size={12} className="text-rose-400" /> Date Activities
                </span>
                <span className="text-[9px] font-mono text-white/30 font-bold">&#10095;</span>
              </button>
              
              <button
                onClick={() => { onNavigate('closet'); playReceivedSound(); }}
                className="w-full py-2.5 px-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 cursor-pointer text-left text-xs font-semibold uppercase tracking-wider text-rose-200/95 transition-all flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <Shirt size={12} className="text-emerald-400" /> Dress Up Closet
                </span>
                <span className="text-[9px] font-mono text-white/30 font-bold">&#10095;</span>
              </button>

              <button
                onClick={() => { onNavigate('voicelab'); playReceivedSound(); }}
                className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-purple-500/10 to-indigo-500/10 hover:from-purple-500/20 hover:to-indigo-500/20 border border-purple-500/20 cursor-pointer text-left text-xs font-semibold uppercase tracking-wider text-purple-200/95 transition-all flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <Mic size={12} className="text-purple-400" /> AI Voice Lab
                </span>
                <span className="text-[9px] font-mono text-purple-400/80 font-bold">NEW • &#10095;</span>
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
          <NavButton icon={<Home />} label="Home" active={true} onClick={() => onNavigate('hub')} />
          <NavButton icon={<MessageSquare />} label="Chat" onClick={() => onNavigate('chat')} />
          <NavButton icon={<MapPin />} label="Dates" onClick={() => onNavigate('date')} />
          <NavButton icon={<Shirt />} label="Closet" onClick={() => onNavigate('closet')} />
          <NavButton icon={<Camera />} label="Memories" onClick={() => onNavigate('memories')} />
        </motion.div>
      </footer>

      {/* Persistent System Version Overlay Info */}
      <div className="fixed bottom-3 left-4 p-2 opacity-5 pointer-events-none z-50 text-[6.5px] font-mono tracking-widest uppercase block">
        TWICE HUB SYSTM v2.5.0 • PORT 3000 • CHNL STABLE
      </div>
    </div >
  );
}

function NavButton({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) {
  return (
    <button
      onClick={() => { onClick(); playReceivedSound(); }}
      className={`flex flex-col items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-xl md:rounded-[1.8rem] transition-all duration-300 gap-1.5 cursor-pointer relative ${
        active 
          ? 'bg-rose-500 text-white font-black shadow-md shadow-rose-500/10' 
          : 'text-white/40 hover:text-white/80 hover:bg-white/5'
      }`}
    >
      {React.cloneElement(icon as React.ReactElement<any>, { size: 16 })}
      <span className="text-[7.5px] md:text-[8px] uppercase tracking-wider font-bold leading-none">{label}</span>
    </button>
  );
}
