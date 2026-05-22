import React from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Camera, Image as ImageIcon, Star } from 'lucide-react';
import { Idol } from '../types';

interface Props {
  idol: Idol;
  onBack: () => void;
}

export default function MemoryBook({ idol, onBack }: Props) {
  const memories = [
    { id: 1, title: 'Rooftop Secret', date: 'Just now', image: 'https://images.unsplash.com/photo-1546702302-3371816a6676?q=80&w=2000&auto=format&fit=crop', type: 'Special' },
    { id: 2, title: 'First Encounter', date: 'Earlier today', image: idol.image, type: 'Story' },
  ];

  return (
    <div className="min-h-screen bg-luxury-black flex flex-col">
      <header className="glass p-4 md:p-6 pt-10 md:pt-12 flex items-center justify-between z-10 transition-all">
        <div className="flex items-center gap-3 md:gap-4">
          <button onClick={onBack} className="p-2 -ml-2 text-white/60 hover:text-white transition-colors">
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
          </button>
          <div>
            <h3 className="font-display font-bold text-lg md:text-xl uppercase tracking-widest text-luxury-magenta">Memory Book</h3>
            <p className="text-[8px] md:text-[10px] text-white/40 font-bold uppercase tracking-tighter">Capturing moments with {idol.name}</p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {memories.map((memory) => (
            <motion.div 
              key={memory.id}
              whileHover={{ scale: 1.02 }}
              className="glass rounded-2xl md:rounded-3xl overflow-hidden border-white/5 group relative aspect-[3/4]"
            >
              <img src={memory.image} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-all duration-700" alt={memory.title} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
              
              <div className="absolute bottom-3 md:bottom-4 left-3 md:left-4 right-3 md:right-4">
                <div className="flex items-center gap-1 mb-1 md:mb-1.5">
                  <Star className="w-2 h-2 md:w-2.5 md:h-2.5 text-luxury-magenta fill-luxury-magenta" />
                  <span className="text-[7px] md:text-[8px] uppercase font-bold text-luxury-magenta italic tracking-widest">{memory.type}</span>
                </div>
                <h4 className="text-[10px] md:text-sm font-bold leading-tight mb-1">{memory.title}</h4>
                <div className="flex items-center gap-1 opacity-40">
                  <Camera className="w-2 h-2 md:w-2.5 md:h-2.5 text-luxury-magenta" />
                  <span className="text-[7px] md:text-[8px] font-mono">{memory.date}</span>
                </div>
              </div>
            </motion.div>
          ))}
          
          {/* Empty Slots */}
          {[...Array(2)].map((_, i) => (
            <div key={i} className="glass rounded-2xl md:rounded-3xl border-dashed border-white/10 flex flex-col items-center justify-center gap-2 aspect-[3/4] opacity-20">
              <ImageIcon className="w-5 h-5 md:w-6 md:h-6" />
              <span className="text-[7px] md:text-[8px] uppercase font-bold tracking-widest">Locked</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
