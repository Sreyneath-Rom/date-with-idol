import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { MessageSquare, Heart, Camera, Shirt, Home, Sparkles, Clock, MapPin, Cloud, LogOut } from 'lucide-react';
import { Idol, AppView } from '../types';
import { useFirebase } from '../lib/FirebaseContext';

interface Props {
  idol: Idol;
  onNavigate: (view: AppView) => void;
  affection: number;
}

export default function HomeHub({ idol, onNavigate, affection }: Props) {
  const { user, loginWithGoogle, logout } = useFirebase();
  const [time, setTime] = useState(new Date());
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 60000);
    const hour = time.getHours();
    
    if (hour < 12) setGreeting(`Good morning. I've been waiting for you to wake up.`);
    else if (hour < 18) setGreeting(`Are you having a busy day? Don't forget to rest.`);
    else setGreeting(`The city looks beautiful tonight. It reminds me of the time we...`);

    return () => clearInterval(timer);
  }, [time]);

  const toggleVoice = () => {
    // In a real app, this would play the idol's voiceIntro audio
    const utterance = new SpeechSynthesisUtterance(idol.voiceIntro);
    // Setting a more "idol-like" tone if possible (standard Web Speech API is limited but helps prototype)
    utterance.rate = 1.0;
    utterance.pitch = 1.2;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="min-h-screen bg-luxury-black text-white relative overflow-hidden flex flex-col">
      {/* Dynamic Background Atmosphere */}
      <div className="absolute inset-0 z-0">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-30 transition-opacity duration-1000"
          style={{ backgroundImage: `url('https://legacy.kpopping.com/c8/0/TWICE-SPECIAL-ALBUM-TEN-The-Story-Goes-On-documents-1.jpeg')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-luxury-black via-luxury-black/20 to-luxury-black/60" />
        
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-luxury-magenta/5 blur-[120px] rounded-full animate-pulse-soft" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-luxury-gold/5 blur-[120px] rounded-full animate-pulse-soft delay-1000" />
      </div>

      {/* Top Section: Dynamic Info */}
      <header className="relative z-10 px-6 pt-10 md:px-12 md:pt-16 flex justify-between items-center">
        <motion.div 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="space-y-0.5 md:space-y-1"
        >
          <div className="flex items-center gap-1.5 md:gap-2 text-luxury-gold">
            <Clock className="w-2.5 h-2.5 md:w-3 md:h-3" />
            <span className="text-[8px] md:text-[10px] uppercase tracking-[0.2em] font-medium font-mono">
              {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • SEOUL
            </span>
          </div>
          <h2 className="text-xs md:text-sm font-medium text-white/50 max-w-[150px] md:max-w-none line-clamp-2 md:line-clamp-none leading-relaxed">{greeting}</h2>
        </motion.div>

        <div className="flex items-center gap-2 md:gap-3">
          {/* Real-time Firebase Sync Controls */}
          <motion.button
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            onClick={user ? logout : loginWithGoogle}
            className={`glass p-2 md:p-3 rounded-xl md:rounded-2xl flex items-center gap-2 border transition-all cursor-pointer hover:scale-105 active:scale-95 ${
              user 
                ? 'border-green-500/30 hover:bg-rose-500/10 hover:border-rose-500/30 group' 
                : 'border-luxury-gold/25 hover:border-luxury-gold/50'
            }`}
            title={user ? "Logout & Unsync Session" : "Sign In with Google to synchronize chats & affinity scores to Firebase Cloud!"}
          >
            {user ? (
              <>
                <img 
                  src={user.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150'} 
                  referrerPolicy="no-referrer"
                  className="w-4 h-4 md:w-5 md:h-5 rounded-full object-cover group-hover:hidden animate-fade-in"
                  alt="avatar"
                />
                <LogOut className="w-4 h-4 md:w-5 md:h-5 text-rose-400 hidden group-hover:block transition-colors animate-fade-in" />
                <div className="flex flex-col text-left group-hover:text-rose-400">
                  <span className="text-[6px] md:text-[8px] uppercase tracking-wider text-green-400 font-bold leading-none mb-0.5 group-hover:text-rose-400">Synced</span>
                  <span className="text-[10px] font-display font-medium leading-none max-w-[60px] md:max-w-[100px] truncate">
                    {user.displayName?.split(' ')[0] || 'Sync'}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="relative">
                  <Cloud className="w-4 h-4 md:w-5 md:h-5 text-luxury-gold" />
                  <motion.div 
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="absolute inset-0 bg-luxury-gold/10 blur-sm rounded-full" 
                  />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[6px] md:text-[8px] uppercase tracking-wider text-white/40 font-bold leading-none mb-0.5">Offline</span>
                  <span className="text-[10px] font-display font-semibold leading-none text-luxury-gold">Cloud Sync</span>
                </div>
              </>
            )}
          </motion.button>

          <motion.div 
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="glass-gold p-2 md:p-3 rounded-xl md:rounded-2xl flex items-center gap-2 md:gap-3 border-luxury-magenta/30 hover:scale-105 transition-transform"
          >
            <div className="relative">
              <Heart className="w-4 h-4 md:w-5 md:h-5 text-luxury-magenta fill-luxury-magenta/20" />
              <motion.div 
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute inset-0 bg-luxury-magenta/20 blur-md rounded-full" 
              />
            </div>
            <div className="flex flex-col">
              <span className="text-[7px] md:text-[8px] uppercase tracking-wider text-luxury-magenta font-bold leading-none mb-0.5">Bond</span>
              <span className="text-xs md:text-sm font-display font-bold leading-none">{affection}%</span>
            </div>
          </motion.div>
        </div>
      </header>

      {/* Center: Idol Presence */}
      <main className="flex-1 relative z-10 flex items-center justify-center pointer-events-none">
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="w-full h-full max-w-lg relative flex items-end justify-center pb-24 md:pb-32"
        >
          <div className="relative group cursor-pointer pointer-events-auto" onClick={toggleVoice}>
             <motion.img 
              src={idol.image} 
              alt={idol.name}
              className="h-[clamp(50vh,65vh,78vh)] object-contain drop-shadow-[0_20px_60px_rgba(0,0,0,0.8)] transition-all duration-700 group-hover:scale-[1.03]"
              animate={{ y: [0, -12, 0] }}
              transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
            />
            {/* Ambient Shine */}
            <div className="absolute inset-0 bg-gradient-to-t from-luxury-black/40 via-transparent to-transparent pointer-events-none" />
            
            {/* Interactive Pulse Points */}
            <motion.div 
              className="absolute top-1/4 right-[20%] w-6 h-6 glass rounded-full border-luxury-gold/50 flex items-center justify-center"
              whileHover={{ scale: 1.5 }}
            >
              <div className="w-2 h-2 bg-luxury-gold rounded-full animate-ping" />
              <Sparkles className="absolute text-luxury-gold w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.div>
          </div>

          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="absolute bottom-24 md:bottom-28 glass p-4 md:p-5 rounded-[2rem] md:rounded-[2.5rem] max-w-[260px] md:max-w-[300px] border-luxury-magenta/10 flex flex-col gap-1 items-center shadow-2xl backdrop-blur-3xl"
          >
            <div className="flex gap-1.5 mb-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[9px] md:text-[10px] uppercase tracking-widest text-luxury-magenta font-bold">Personalized Note</span>
            </div>
            <p className="text-xs md:text-sm text-center font-medium leading-relaxed italic text-white/90">
               "{idol.voiceIntro}"
            </p>
          </motion.div>
        </motion.div>
      </main>

      {/* Bottom Navigation: Glass Dock */}
      <footer className="fixed bottom-6 md:bottom-10 inset-x-0 z-50 px-4 md:px-6">
        <motion.div 
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="max-w-md mx-auto glass p-1.5 md:p-2 rounded-2xl md:rounded-[2rem] flex items-center justify-between"
        >
          <NavButton icon={<Home />} label="Home" active={true} onClick={() => onNavigate('hub')} />
          <NavButton icon={<MessageSquare />} label="Chat" onClick={() => onNavigate('chat')} />
          <NavButton icon={<MapPin />} label="Dates" onClick={() => onNavigate('date')} />
          <NavButton icon={<Shirt />} label="Closet" onClick={() => onNavigate('closet')} />
          <NavButton icon={<Camera />} label="Memories" onClick={() => onNavigate('memories')} />
        </motion.div>
      </footer>
    </div>
  );
}

function NavButton({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-xl md:rounded-3xl transition-all duration-300 gap-1 md:gap-1.5 ${active ? 'bg-luxury-magenta text-white font-bold' : 'text-white/40 hover:text-white/80 hover:bg-white/5'}`}
    >
      {React.cloneElement(icon as React.ReactElement<any>, { size: 18 })}
      <span className="text-[7px] md:text-[8px] uppercase tracking-wider">{label}</span>
    </button>
  );
}
