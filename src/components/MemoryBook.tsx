import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  Camera, 
  Image as ImageIcon, 
  Star, 
  Heart, 
  Download, 
  Share2, 
  RefreshCw, 
  X, 
  Sparkles, 
  Calendar,
  Layers,
  HeartCrack
} from 'lucide-react';
import { Idol } from '../types';

interface Props {
  idol: Idol;
  onBack: () => void;
}

interface Memory {
  id: string;
  title: string;
  date: string;
  image: string;
  type: string;
  originalText?: string;
  timestamp: number;
}

interface HeartParticle {
  id: number;
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

// Map of Idol ID to unique signature artwork / written marker text
const SIGNATURE_MAP: Record<string, string> = {
  nayeon: "𝒩𝒶𝓎𝑒𝑜𝓃 ♡ 𝒱-🐰 XOXO",
  jeongyeon: "𝒥𝑒...𝒥𝑒𝑜𝓃𝑔𝓎𝑒𝑜𝓃 ★ 💚",
  momo: "𝑀𝑜𝓂𝑜 𝒳𝒪𝒳𝒪 ♡ 🐷 Peach!",
  sana: "𝒮𝒶𝓃𝒶 ℒℴ𝓋ℯ ♡ 🌸 Nosana Nolife",
  jihyo: "𝒥𝒾𝒽𝓎𝑜 𝒳𝒪𝒳𝒪 ~ GodJihyo 🎤",
  mina: "𝑀𝒾𝓃𝒶 ~ 𝒫𝒾𝓃-🐧 SweetSwan",
  dahyun: "𝒟𝒶𝒽𝓎𝓊𝓃 ♡ 𝒯𝑜𝒻𝓊-📸 Dubu Smile!",
  chaeyoung: "𝒞𝒽𝒶𝑒𝓎𝑜𝓊𝓃𝑔 ★ 🍓 StrawberryArt",
  tzuyu: "𝒯𝓏𝓊𝓎𝓊 𝒳𝒪𝒳𝒪 ♡ 🐶 Chewy",
};

export default function MemoryBook({ idol, onBack }: Props) {
  const [dynamicMemories, setDynamicMemories] = useState<Memory[]>([]);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [cardCaption, setCardCaption] = useState('');
  const [likedMemories, setLikedMemories] = useState<Record<string, boolean>>({});
  const [floatingHearts, setFloatingHearts] = useState<HeartParticle[]>([]);
  const [downloadSuccessToast, setDownloadSuccessToast] = useState(false);

  // Load dynamically captured images from Chat Room history on mount
  useEffect(() => {
    const saved = localStorage.getItem(`kpop_idol_chat_${idol.id}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Filter messages containing image attachments (sent selfies or shared polaroids)
          const imageMessages = parsed
            .filter((msg: any) => msg.imageUrl)
            .map((msg: any, idx: number) => ({
              id: `dynamic_${msg.id || idx}`,
              title: msg.sender === 'idol' ? `${idol.name}'s Special Selfie` : 'Our shared memory',
              date: new Date(msg.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
              image: msg.imageUrl,
              type: msg.sender === 'idol' ? 'Idol Polaroid' : 'Fan Share',
              originalText: msg.text || 'Moments frozen in time together under Twice Portal.',
              timestamp: msg.timestamp
            }));
          setDynamicMemories(imageMessages);
        }
      } catch (e) {
        console.error("Failed to extract dynamic memories:", e);
      }
    }

    // Load overall liked memories index
    try {
      const storedLikes = localStorage.getItem(`kpop_liked_polaroids_${idol.id}`);
      if (storedLikes) {
        setLikedMemories(JSON.parse(storedLikes));
      }
    } catch (e) {}
  }, [idol.id]);

  // Merge default predefined memories with dynamic photo-captures
  const staticMemories: Memory[] = [
    { 
      id: `${idol.id}_static_1`, 
      title: 'First Encounters', 
      date: 'Portal Opening Day', 
      image: idol.image, 
      type: 'Official Stage', 
      originalText: `The historic first private portal opening connection that brought us together.`, 
      timestamp: Date.now() - 604800000 
    },
    { 
      id: `${idol.id}_static_2`, 
      title: 'Secret Seoul Escape', 
      date: 'Memorial Memoir', 
      image: 'https://images.unsplash.com/photo-1546702302-3371816a6676?q=80&w=2000&auto=format&fit=crop', 
      type: 'Sweet Escape', 
      originalText: 'Strolling through secret alleys under Seoul moonlight, sharing cold lattes and sparkling dreams.', 
      timestamp: Date.now() - 172800000 
    },
  ];

  const allMemories = [...dynamicMemories, ...staticMemories];

  // Open full-screen Polaroid Modal
  const handleOpenMemory = (memory: Memory) => {
    setSelectedMemory(memory);
    setIsFlipped(false);
    
    // Load persisted local journal note caption
    const savedCaption = localStorage.getItem(`kpop_polaroid_caption_${memory.id}`) || '';
    setCardCaption(savedCaption);
  };

  // Persist handwritten journal caption on the back of the card
  const handleSaveCaption = (text: string) => {
    setCardCaption(text);
    if (selectedMemory) {
      localStorage.setItem(`kpop_polaroid_caption_${selectedMemory.id}`, text);
    }
  };

  // Toggle Heart Reactions with haptic support
  const handleToggleLike = (memoryId: string) => {
    const updated = {
      ...likedMemories,
      [memoryId]: !likedMemories[memoryId]
    };
    setLikedMemories(updated);
    localStorage.setItem(`kpop_liked_polaroids_${idol.id}`, JSON.stringify(updated));

    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate([15, 10, 15]); } catch (e) {}
    }

    // Spawn floating heart particles cascading upwards
    if (updated[memoryId]) {
      triggerHeartExplosion();
    }
  };

  // Physics animation helper to burst rising hearts
  const triggerHeartExplosion = () => {
    const particles = Array.from({ length: 12 }).map((_, i) => ({
      id: Date.now() + i,
      x: (Math.random() - 0.5) * 160, // scatter horizontally
      y: 0,
      scale: 0.6 + Math.random() * 0.8,
      rotation: (Math.random() - 0.5) * 45
    }));
    setFloatingHearts(prev => [...prev, ...particles]);
    
    // Auto-cleanup particles to avoid memory overhead
    setTimeout(() => {
      setFloatingHearts(prev => prev.filter(p => !particles.some(np => np.id === p.id)));
    }, 1800);
  };

  // Simulate downloading/cloning Polaroid to high-res collection
  const triggerDownload = (memory: Memory) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(10); } catch (e) {}
    }
    
    // Trigger download effect
    setDownloadSuccessToast(true);
    setTimeout(() => setDownloadSuccessToast(false), 2500);

    // Dynamic browser file dispatch
    const link = document.createElement('a');
    link.href = memory.image;
    link.download = `${idol.name.replace(/\s+/g, '_')}_polaroid_${Date.now()}.jpg`;
    link.target = "_blank";
    link.referrerPolicy = "no-referrer";
    document.body.appendChild(link);
    try {
      link.click();
    } catch(err) {}
    document.body.removeChild(link);
  };

  return (
    <div className="h-[100dvh] w-full bg-slate-950 flex flex-col relative overflow-hidden text-white select-none">
      
      {/* Dynamic Floating Heart Portal Canvas elements for background atmosphere */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-gradient-to-b from-luxury-magenta/10 via-transparent to-luxury-gold/5 z-0" />
      
      {/* Header Panel */}
      <header className="glass p-4 md:p-6 pt-10 md:pt-12 flex items-center justify-between z-10 border-b border-white/5 bg-slate-950/80 backdrop-blur-md">
        <div className="flex items-center gap-3.5">
          <button 
            onClick={onBack} 
            className="p-2 -ml-2 text-white/50 hover:text-white hover:bg-white/5 active:scale-95 rounded-xl transition-all cursor-pointer flex items-center justify-center" 
            title="Back to portal hub"
          >
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
          </button>
          <div>
            <h1 className="font-display font-black text-lg md:text-xl tracking-widest uppercase flex items-center gap-1.5 leading-none bg-gradient-to-r from-luxury-magenta to-luxury-gold bg-clip-text text-transparent">
              Memory Book
            </h1>
            <p className="text-[9px] md:text-[10px] uppercase tracking-wider text-white/30 font-medium">{idol.name}'s Photo Collection</p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-luxury-gold/10 text-luxury-gold border border-luxury-gold/20 px-2.5 py-1 rounded-full text-[9px] font-black tracking-widest uppercase shadow-[0_0_12px_rgba(255,215,0,0.15)] select-none">
          <Star className="w-2.5 h-2.5 fill-luxury-gold/50 animate-pulse" />
          <span>{allMemories.length} Captured</span>
        </div>
      </header>

      {/* Main Grid Feed */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 z-10 relative">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
          
          <AnimatePresence mode="popLayout">
            {allMemories.map((memory, idx) => {
              const hasLike = likedMemories[memory.id];
              return (
                <motion.div 
                  key={memory.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: idx * 0.04, type: 'spring', damping: 20 }}
                  whileHover={{ y: -6, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleOpenMemory(memory)}
                  className="glass rounded-2xl md:rounded-[2rem] overflow-hidden border border-white/5 hover:border-luxury-gold/30 bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-300 flex flex-col p-2 cursor-pointer group relative shadow-lg"
                >
                  {/* Polaroid Print Simulated Frame */}
                  <div className="aspect-[1/1] w-full rounded-xl overflow-hidden relative border border-white/5 bg-neutral-900 group-hover:brightness-105 transition-all">
                    <img 
                      src={memory.image} 
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-700" 
                      alt={memory.title} 
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                    
                    {/* Tiny badges */}
                    <div className="absolute top-2 left-2 flex gap-1">
                      <span className="text-[7px] md:text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded-full bg-black/60 shadow text-luxury-gold border border-luxury-gold/20 leading-none">
                        {memory.type}
                      </span>
                    </div>

                    {hasLike && (
                      <div className="absolute top-2 right-2 p-1.5 rounded-full bg-luxury-magenta/20 backdrop-blur-md border border-luxury-magenta/40 text-luxury-magenta animate-bounce shadow">
                        <Heart className="w-2.5 h-2.5 fill-luxury-magenta" />
                      </div>
                    )}
                  </div>

                  {/* Info below photo */}
                  <div className="p-2.5 pt-3 flex flex-col justify-between flex-1">
                    <div>
                      <h4 className="text-[10px] md:text-xs font-bold text-white group-hover:text-luxury-gold tracking-tight line-clamp-1 transition-colors leading-tight mb-1">
                        {memory.title}
                      </h4>
                      <div className="flex items-center gap-1 opacity-35">
                        <Camera className="w-2.5 h-2.5 text-luxury-gold" />
                        <span className="text-[7.5px] md:text-[8.5px] font-mono leading-none">{memory.date}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Locked Slots */}
          {[...Array(3)].map((_, i) => (
            <div 
              key={`locked-${i}`} 
              className="glass rounded-2xl md:rounded-[2rem] border-dashed border-white/10 flex flex-col items-center justify-center gap-2 aspect-[3/4] opacity-20 p-4"
            >
              <div className="p-3 rounded-full bg-white/5 border border-white/10">
                <ImageIcon className="w-4 h-4 md:w-5 md:h-5 text-white/50" />
              </div>
              <span className="text-[7px] md:text-[8px] uppercase font-bold tracking-widest text-white/40">Slot Locked</span>
            </div>
          ))}
          
        </div>
      </main>

      {/* Expanded Lightbox Modal Overlay */}
      <AnimatePresence>
        {selectedMemory && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl"
            onClick={() => setSelectedMemory(null)}
          >
            {/* Modal Exit Click Handler Preventor */}
            <div 
              className="relative w-full max-w-sm md:max-w-md flex flex-col items-center gap-6"
              onClick={(e) => e.stopPropagation()}
            >
              
              {/* Header Floating Label bar */}
              <div className="w-full flex items-center justify-between text-white/45 text-[10px] md:text-xs font-semibold tracking-wider uppercase bg-white/[0.02] border border-white/5 rounded-full px-4 py-1.5 backdrop-blur-md">
                <span className="flex items-center gap-1.5 text-luxury-gold">
                  <Sparkles size={11} className="animate-spin" />
                  Double Click Card to Like
                </span>
                <span className="cursor-pointer hover:text-white" onClick={() => setSelectedMemory(null)}>Close</span>
              </div>

              {/* 3D Skeuomorphic Polaroid Flip Card Wrapper Container */}
              <div 
                className="w-full max-w-xs md:max-w-[340px] aspect-[1/1.3] preserve-3d [perspective:1200px] relative cursor-pointer group"
                onDoubleClick={() => handleToggleLike(selectedMemory.id)}
              >
                
                {/* 3D Spin Core Layer */}
                <motion.div 
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                  className="w-full h-full relative preserve-3d"
                >

                  {/* FRONT FACE OF POLAROID */}
                  <div 
                    className="absolute inset-0 [backface-visibility:hidden] bg-slate-50 p-3.5 pb-12 md:pb-16 text-neutral-900 rounded-lg shadow-[0_25px_60px_rgba(0,0,0,1)] border border-white/40 flex flex-col justify-between"
                    style={{ transform: 'rotateY(0deg)' }}
                  >
                    
                    {/* Image Box */}
                    <div className="relative w-full aspect-[1/1] overflow-hidden rounded bg-black pointer-events-none shadow-inner border border-stone-200">
                      <img 
                        src={selectedMemory.image} 
                        className="w-full h-full object-cover" 
                        alt="Polaroid Front" 
                        referrerPolicy="no-referrer"
                      />
                      
                      {/* Photo Glare Overlay Effect */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none mix-blend-overlay" />
                    </div>

                    {/* Handwriting style labels and signature elements */}
                    <div className="mt-3.5 space-y-1.5 px-0.5">
                      <h2 className="font-serif text-sm md:text-base font-bold text-stone-800 tracking-tight leading-snug italic truncate text-center font-handwriting">
                        "{selectedMemory.title}"
                      </h2>

                      <div className="flex items-center justify-between border-t border-stone-200/60 pt-2 opacity-50 text-[8px] md:text-[9.5px] font-mono tracking-tighter text-slate-500 uppercase">
                        <span className="font-bold text-luxury-magenta">{selectedMemory.type}</span>
                        <span>{selectedMemory.date}</span>
                      </div>
                    </div>
                  </div>

                  {/* BACK FACE OF POLAROID */}
                  <div 
                    className="absolute inset-0 [backface-visibility:hidden] bg-neutral-100 p-4 pb-6 text-neutral-800 rounded-lg shadow-[0_25px_60px_rgba(0,0,0,1)] border border-stone-300 flex flex-col justify-between"
                    style={{ transform: 'rotateY(180deg)' }}
                  >
                    
                    {/* Grid Note design card background look */}
                    <div className="flex-1 flex flex-col justify-between border-2 border-dashed border-stone-300/60 rounded-xl p-3 bg-neutral-100/40 relative overflow-hidden">
                      
                      {/* Grid Line Sheet texture overlay */}
                      <div className="absolute inset-0 bg-[linear-gradient(rgba(130,130,130,0.06)_1px,transparent_1px)] bg-[size:100%_24px] pointer-events-none" />

                      <div className="z-10 w-full space-y-3">
                        {/* Top decorative badge */}
                        <div className="flex items-center justify-between">
                          <span className="text-[7.5px] font-mono uppercase bg-stone-300/50 text-stone-700 px-2 py-0.5 rounded font-extrabold tracking-widest">
                            Private Memo
                          </span>
                          <span className="text-[7px] font-mono opacity-50 font-bold">{selectedMemory.date}</span>
                        </div>

                        {/* Idol handwriting original text */}
                        <p className="font-serif italic text-stone-600 font-light text-[11px] md:text-xs leading-relaxed pl-1">
                          {selectedMemory.originalText}
                        </p>

                        <div className="border-b border-stone-300 border-dashed my-2" />

                        {/* Custom Fan Written Caption Diary */}
                        <div className="space-y-1.5 pt-1">
                          <label className="text-[8.5px] font-bold text-stone-500 uppercase tracking-widest flex items-center gap-1">
                            <span>Your Journal Diary Entry:</span>
                          </label>
                          <textarea
                            value={cardCaption}
                            onChange={(e) => handleSaveCaption(e.target.value)}
                            placeholder="Type a sweet memory, personal thoughts, or a caption for this card..."
                            className="w-full text-xs font-serif leading-relaxed italic bg-stone-200/40 hover:bg-stone-200/60 focus:bg-white text-stone-800 p-2 border border-stone-300 rounded-lg h-20 md:h-24 outline-none focus:ring-1 focus:ring-luxury-gold/50 transition-all resize-none shadow-inner"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>

                      {/* Idol Original Signature Stamp */}
                      <div className="border-t border-stone-300 border-dashed pt-2.5 flex flex-col items-end justify-center z-10 select-none pointer-events-none">
                        <span className="text-[8px] font-mono text-stone-400 font-extrabold uppercase tracking-widest leading-none mb-1">STAMP OF AUTHENTICITY</span>
                        <div className="font-serif italic text-sm font-extrabold text-luxury-magenta/85 tracking-widest rotate-[-1deg] pr-1 flex items-center gap-1">
                          <span>{SIGNATURE_MAP[idol.id] || "𝒯𝒲ℐ𝒞ℰ 𝒳𝒪𝒳𝒪"}</span>
                        </div>
                      </div>

                    </div>
                  </div>

                </motion.div>

                {/* HEART BURST PORTAL EXPLOSION PARTICLES */}
                <div className="absolute inset-0 overflow-visible pointer-events-none">
                  {floatingHearts.map((hp) => (
                    <motion.div
                      key={hp.id}
                      initial={{ opacity: 1, y: 150, x: hp.x, scale: 0, rotate: hp.rotation }}
                      animate={{ opacity: 0, y: -260, x: hp.x + (hp.rotation * 3), scale: hp.scale, rotate: hp.rotation * 4 }}
                      transition={{ duration: 1.6, ease: 'easeOut' }}
                      className="absolute bottom-1/2 left-1/2 text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]"
                    >
                      <Heart className="w-5 h-5 fill-rose-500" />
                    </motion.div>
                  ))}
                </div>

              </div>

              {/* ACTION TOOLBAR CONTROLS */}
              <div className="flex items-center gap-2.5 bg-slate-900 border border-white/5 rounded-2xl p-2 z-20 shadow-xl max-w-full">
                
                <button 
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all cursor-pointer flex items-center gap-2"
                  title="Flip Photocard to Back"
                >
                  <RefreshCw size={15} className={`text-luxury-gold ${isFlipped ? 'rotate-180' : 'rotate-0'} transition-transform duration-500`} />
                  <span className="text-[10px] md:text-xs font-black uppercase tracking-wider">Flip Card</span>
                </button>

                <button 
                  onClick={() => handleToggleLike(selectedMemory.id)}
                  className={`p-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    likedMemories[selectedMemory.id] 
                      ? 'bg-luxury-magenta/10 hover:bg-luxury-magenta/20 text-rose-400 border border-luxury-magenta/25' 
                      : 'bg-white/5 hover:bg-white/10 text-white'
                  }`}
                  title="Heart React Photocard"
                >
                  <Heart size={15} className={likedMemories[selectedMemory.id] ? 'fill-rose-500 text-rose-500 zoom-in animate-pulse' : 'text-neutral-300'} />
                  <span className="text-[10px] md:text-xs font-black uppercase tracking-wider">
                    {likedMemories[selectedMemory.id] ? 'Sweet Love!' : 'Heart It'}
                  </span>
                </button>

                <button 
                  onClick={() => triggerDownload(selectedMemory)}
                  className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                  title="Preserve to Desktop Album"
                >
                  <Download size={15} className="text-emerald-400 animate-pulse-soft" />
                  <span className="text-[10px] md:text-xs font-black uppercase tracking-wider">Save Card</span>
                </button>

              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Persistent Download Confirmation Toast */}
      <AnimatePresence>
        {downloadSuccessToast && (
          <motion.div 
            initial={{ opacity: 0, y: 35 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 25 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-tr from-luxury-magenta/95 to-luxury-gold/95 backdrop-blur border border-white/10 px-5 py-3 rounded-2xl flex items-center gap-2 shadow-[0_12px_30px_rgba(255,51,119,0.4)]"
          >
            <Sparkles className="w-4 h-4 text-white animate-spin" />
            <span className="text-white text-xs font-black uppercase tracking-widest leading-none">
              Preserved in local device collection! 📸
            </span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
