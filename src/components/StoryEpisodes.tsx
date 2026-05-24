import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Calendar, BookOpen, Lock, Play, X, Compass, Award } from 'lucide-react';
import { Idol, StoryEpisode } from '../types';
import { playReceivedSound, playSentSound } from '../utils/audio';
import { INSTANTIATE_STORY_EPISODES } from '../data/sprintData';

interface Props {
  idol: Idol;
  currentAffection: number;
  onClose: () => void;
  onSelectEpisode: (title: string) => void;
}

export default function StoryEpisodes({ idol, currentAffection, onClose, onSelectEpisode }: Props) {
  const [episodes, setEpisodes] = useState<StoryEpisode[]>([]);

  // Calculate unlock status based on current affection levels
  useEffect(() => {
    const list = INSTANTIATE_STORY_EPISODES(idol.name);
    const updated = list.map(ep => ({
      ...ep,
      unlocked: currentAffection >= ep.reqAffection
    }));
    setEpisodes(updated);
  }, [idol.name, currentAffection]);

  const activeColor = {
    nayeon: '#FF3377',
    jeongyeon: '#10B981',
    momo: '#F43F5E',
    sana: '#A855F7',
    jihyo: '#F59E0B',
    mina: '#14B8A6',
    dahyun: '#818CF8',
    chaeyoung: '#EF4444',
    tzuyu: '#0EA5E9'
  }[idol.id] || '#FF3377';

  return (
    <div className="absolute inset-x-4 top-16 md:top-24 bottom-24 z-45 glass rounded-[2.2rem] border border-white/10 overflow-hidden flex flex-col shadow-2xl"
         style={{ boxShadow: `0 35px 80px -20px ${activeColor}25, inset 0 1px 1px rgba(255,255,255,0.05)` }}>
      
      {/* Header Plaque */}
      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/5 border border-purple-500/25">
            <BookOpen className="text-purple-400 w-5 h-5 animate-pulse-soft" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-white tracking-wide uppercase leading-none">Story Episodes</h2>
            <p className="text-[9px] font-mono text-white/40 tracking-widest uppercase mt-1">Unlock career and sweet secret chapters of {idol.name}</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/5 text-white/45 hover:text-white transition-all cursor-pointer"
        >
          <X size={15} />
        </button>
      </div>

      {/* Body List container */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar">
        <div className="flex items-center justify-between text-[10px] font-mono tracking-widest text-white/35 uppercase border-b border-white/5 pb-2.5 px-1">
          <span>Chapter Tree List</span>
          <span>Current Bond Affection: <strong className="text-rose-400" style={{ color: activeColor }}>{currentAffection}%</strong></span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {episodes.map((ep, idx) => {
            return (
              <motion.div
                key={ep.id}
                whileHover={ep.unlocked ? { scale: 1.01 } : {}}
                className={`p-4 rounded-3xl border flex flex-col gap-3 relative overflow-hidden bg-white/[0.02] ${
                  ep.unlocked ? 'border-white/5 hover:bg-white/[0.04]' : 'border-white/[0.02] opacity-50'
                }`}
              >
                {/* Thumbnail image backdrop or blur card */}
                <div className="relative rounded-2xl overflow-hidden h-24 border border-white/5">
                  <img
                    src={ep.thumbnail}
                    alt={ep.title}
                    referrerPolicy="no-referrer"
                    className={`w-full h-full object-cover transition-all ${ep.unlocked ? 'brightness-[0.45] hover:scale-105 duration-700' : 'brightness-[0.1] blur-md'}`}
                  />
                  
                  {/* Absolute Center overlay of unlock constraint */}
                  <div className="absolute inset-0 flex items-center justify-center p-3 text-center">
                    {!ep.unlocked && (
                      <div className="flex flex-col items-center gap-1">
                        <Lock size={15} className="text-white/40 animate-pulse-soft" />
                        <span className="text-[8px] font-mono uppercase tracking-[0.15em] text-white/45">
                          Requires {ep.reqAffection}% Affection
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Corner Index */}
                  <span className="absolute top-2 left-2 text-[10px] font-mono font-black text-white/30 tracking-widest uppercase bg-black/40 px-2 py-0.5 rounded-lg border border-white/5 leading-none">
                    Chapter 0{idx + 1}
                  </span>
                </div>

                {/* Info and button */}
                <div className="flex-1 space-y-2 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-xs text-white tracking-wide">{ep.title}</h3>
                    <p className="text-[10px] leading-relaxed text-white/60 mt-1">{ep.description}</p>
                  </div>

                  <div className="border-t border-white/5 pt-2 flex items-center justify-between">
                    <span className="text-[8px] font-mono uppercase text-luxury-gold tracking-widest pl-0.5">
                      {ep.unlocked ? 'Unlocked Storyline' : 'Classified Capsule'}
                    </span>

                    {ep.unlocked ? (
                      <button
                        onClick={() => {
                          playSentSound();
                          onSelectEpisode(ep.title);
                        }}
                        className="px-3 py-1.5 rounded-lg font-mono text-[8.5px] font-black uppercase tracking-wider bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 text-white hover:border-white/20 transition-all cursor-pointer flex items-center gap-1"
                      >
                        <Play size={10} className="fill-white/15" /> Launch Story
                      </button>
                    ) : (
                      <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/5 bg-white/[0.01]">
                        <Lock size={10} className="text-white/20" />
                        <span className="text-[8px] font-mono uppercase tracking-wider text-white/30">Locked</span>
                      </div>
                    )}
                  </div>
                </div>

              </motion.div>
            );
          })}
        </div>
      </div>
      
    </div>
  );
}
