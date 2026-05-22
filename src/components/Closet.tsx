import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Sparkles, Shirt, Check, Palette } from 'lucide-react';
import { Idol } from '../types';

interface Props {
  idol: Idol;
  onBack: () => void;
}

const OUTFITS = [
  { 
    id: 'casual', 
    name: 'Cozy Morning', 
    description: 'Soft knits and a warm vibe.', 
    color: 'from-amber-100 to-orange-100',
    inspiration: 'Inspired by lazy Sundays and the smell of fresh coffee.',
    story: "I love wearing this when I'm just relaxing at home. The oversized fit makes me feel safe and comfortable, like a warm hug."
  },
  { 
    id: 'stage', 
    name: 'Stage Presence', 
    description: 'Bejeweled and ready for the spotlight.', 
    color: 'from-purple-300 to-pink-300',
    inspiration: 'Cyberpunk elegance meets classic pop royalty.',
    story: "When I put this on, my heart starts racing. It's not just a costume; it's my armor. It reminds me of the first time I performed for you all."
  },
  { 
    id: 'date', 
    name: 'Midnight Seoul', 
    description: 'Elegant black dress for a quiet night.', 
    color: 'from-slate-800 to-black',
    inspiration: 'The quiet sophistication of the city lights reflecting off the Han River.',
    story: "I chose this for its simplicity. I don't want the dress to stand out too much—I want our conversation and time together to be the main event."
  },
];

export default function Closet({ idol, onBack }: Props) {
  const [selectedOutfit, setSelectedOutfit] = useState('casual');

  return (
    <div className="min-h-screen bg-luxury-black text-white p-6 md:p-8 pt-10 md:pt-12 flex flex-col relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] md:w-[800px] h-[600px] md:h-[800px] bg-luxury-magenta/5 blur-[120px] md:blur-[160px] rounded-full" />
      </div>

      <header className="relative z-10 flex items-center justify-between mb-8 md:mb-12">
        <button onClick={onBack} className="p-2.5 md:p-3 glass rounded-full hover:bg-white/10 transition-colors">
          <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
        </button>
        <div className="text-center">
          <h2 className="font-display text-[8px] md:text-[10px] tracking-[0.4em] uppercase text-luxury-gold mb-1">Style Selection</h2>
          <h1 className="font-serif text-xl md:text-2xl italic">{idol.name}'s Closet</h1>
        </div>
        <div className="w-10 md:w-12" /> {/* Spacer */}
      </header>

      <main className="flex-1 relative z-10 flex flex-col lg:flex-row gap-8 md:gap-12 items-center justify-center">
        {/* Idol Preview */}
        <div className="relative w-full max-w-[280px] md:max-w-sm aspect-[4/5] perspective-1000">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-full h-full rounded-[2.5rem] md:rounded-[3rem] overflow-hidden relative shadow-2xl border border-white/5"
          >
            <img 
              src={idol.image} 
              alt={idol.name} 
              className="w-full h-full object-cover grayscale-[0.2] contrast-[1.1]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
            
            {/* Holographic overlay if "stage" outfit */}
            {selectedOutfit === 'stage' && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.3 }}
                className="absolute inset-0 bg-gradient-to-tr from-cyan-400 via-pink-400 to-yellow-300 mix-blend-overlay animate-pulse"
              />
            )}
          </motion.div>
          
          <motion.div 
            className="absolute -bottom-2 -right-2 md:-bottom-4 md:-right-4 p-3 md:p-4 glass-gold rounded-2xl md:rounded-3xl border-luxury-magenta/30"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: 'spring' }}
          >
            <Sparkles className="text-luxury-gold w-5 h-5 md:w-6 md:h-6" />
          </motion.div>
        </div>

        {/* Outfit Selection List */}
        <div className="flex-1 w-full max-w-md space-y-3 md:space-y-4">
          <div className="flex items-center gap-3 mb-4 md:mb-6">
            <Palette className="text-luxury-magenta w-4 h-4 md:w-5 md:h-5" />
            <h3 className="text-[10px] md:text-xs uppercase tracking-widest font-bold text-white/50">Current Variations</h3>
          </div>

          {OUTFITS.map((outfit) => (
            <div key={outfit.id} className="space-y-4">
              <motion.button
                onClick={() => setSelectedOutfit(outfit.id)}
                whileHover={{ x: 10 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full p-4 md:p-6 rounded-2xl md:rounded-3xl border flex items-center gap-3 md:gap-4 transition-all duration-500 ${
                  selectedOutfit === outfit.id 
                  ? 'bg-white/10 border-luxury-gold/50 shadow-[0_0_30px_rgba(212,175,55,0.1)]' 
                  : 'bg-white/5 border-white/5 hover:bg-white/[0.08]'
                }`}
              >
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br ${outfit.color} flex items-center justify-center opacity-80 flex-shrink-0`}>
                  <Shirt className={`w-4 h-4 md:w-5 md:h-5 ${selectedOutfit === outfit.id ? 'text-white' : 'text-white/40'}`} />
                </div>
                <div className="flex-1 text-left">
                  <h4 className={`text-sm md:text-base font-bold transition-colors ${selectedOutfit === outfit.id ? 'text-luxury-gold' : 'text-white'}`}>
                    {outfit.name}
                  </h4>
                  <p className="text-[10px] md:text-xs text-white/40 mt-0.5">{outfit.description}</p>
                </div>
                {selectedOutfit === outfit.id && (
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-luxury-gold flex items-center justify-center flex-shrink-0"
                  >
                    <Check className="w-3 h-3 md:w-3.5 md:h-3.5 text-black font-bold" />
                  </motion.div>
                )}
              </motion.button>

              <AnimatePresence>
                {selectedOutfit === outfit.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/5 space-y-4">
                      <div className="space-y-1">
                        <span className="text-[8px] uppercase tracking-[0.3em] text-luxury-gold font-bold">The Inspiration</span>
                        <p className="text-xs text-white/60 leading-relaxed">{outfit.inspiration}</p>
                      </div>
                      <div className="pt-3 border-t border-white/5 relative">
                        <Sparkles className="absolute right-0 top-3 text-luxury-gold/20 w-4 h-4" />
                        <span className="text-[8px] uppercase tracking-[0.3em] text-luxury-magenta font-bold">Idol's Note</span>
                        <p className="text-xs text-white/90 italic leading-relaxed mt-1">
                          "{outfit.story}"
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}

          <button className="w-full py-4 md:py-5 mt-4 md:mt-8 glass-gold rounded-full font-display font-bold uppercase tracking-[0.2em] text-xs md:text-sm text-luxury-gold hover:scale-[1.02] active:scale-[0.98] transition-all">
            Unlock Premium Styles
          </button>
        </div>
      </main>
    </div>
  );
}
