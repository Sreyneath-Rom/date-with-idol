import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Compass, ShieldCheck, Heart, Sparkles, Award, Star, CheckCircle, Flame, Navigation, Volume2 } from 'lucide-react';
import { Idol, DialogueNode, UserProfile } from '../types';
import { playReceivedSound, playSentSound, speakText } from '../utils/audio';
import { getDialogueTree } from '../data/sprintData';

interface Props {
  idol: Idol;
  eventName: string;
  onClose: () => void;
  onAddStats: (stats: Partial<UserProfile>) => void;
}

export default function DateScene({ idol, eventName, onClose, onAddStats }: Props) {
  const [loading, setLoading] = useState(true);
  const [currentNodeId, setCurrentNodeId] = useState('start');
  const [dialogueTree, setDialogueTree] = useState<Record<string, DialogueNode>>({});
  
  // Total earned credentials record in this date session
  const [sessionEarned, setSessionEarned] = useState({ affection: 0, trust: 0, chemistry: 0 });
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);

  // Load Dialogue branches
  useEffect(() => {
    const tree = getDialogueTree(idol.id);
    setDialogueTree(tree);

    // Run custom Travel Transition blur animation
    const timer = setTimeout(() => {
      setLoading(false);
      speakText(tree.start?.text || "Let's go on a bubble adventure!", idol.name);
    }, 3200);

    return () => clearTimeout(timer);
  }, [idol.id, idol.name]);

  const currentNode = dialogueTree[currentNodeId];
  const isFinished = currentNode ? !currentNode.choices || currentNode.choices.length === 0 : true;

  // Touchpoint Haptics
  const triggerHaptic = (pattern: number | number[] = 15) => {
    try {
      if ('vibrate' in navigator) navigator.vibrate(pattern);
    } catch (_) {}
  };

  // Select path node
  const handleSelectChoice = (choice: any) => {
    triggerHaptic([20, 10, 20]);
    playSentSound();
    setSelectedChoiceId(choice.id);

    // Apply incremental stats record
    setSessionEarned(prev => ({
      affection: prev.affection + choice.affection,
      trust: prev.trust + choice.trust,
      chemistry: prev.chemistry + choice.chemistry
    }));

    // Trigger parent state update
    onAddStats({
      affection: choice.affection,
      trust: choice.trust,
      chemistry: choice.chemistry
    });

    // Advance state node
    setTimeout(() => {
      setSelectedChoiceId(null);
      setCurrentNodeId(choice.nextNode);
      const nextNodeText = dialogueTree[choice.nextNode]?.text;
      if (nextNodeText) {
        speakText(nextNodeText, idol.name);
      }
    }, 700);
  };

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
    <div className="fixed inset-0 bg-luxury-black z-50 flex items-center justify-center p-4">
      
      {/* Absolute Cinematic Stage Lights */}
      <div className="absolute inset-0 w-full h-full overflow-hidden opacity-25 z-0 pointer-events-none">
        <div className="absolute top-0 inset-x-0 h-2/3 bg-gradient-to-b" style={{ backgroundImage: `linear-gradient(to bottom, ${activeColor}40, transparent)` }} />
        <img
          src={idol.image}
          alt="Backdrop visual blurry"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover object-top filter blur-2xl opacity-30 scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-luxury-black via-luxury-black to-transparent" />
      </div>

      <AnimatePresence mode="wait">
        {/* TRAVEL TRANSITION SCENE */}
        {loading ? (
          <motion.div
            key="travel_transition"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-luxury-black/95 flex flex-col items-center justify-center z-50 p-6"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [1, 1.05, 1], opacity: 1 }}
              transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
              className="relative w-28 h-28 flex items-center justify-center mb-6"
            >
              {/* Spinning compass halos */}
              <div className="absolute inset-0 rounded-full border border-dashed animate-spin border-white/20" style={{ animationDuration: '10s' }} />
              <div className="absolute inset-2 rounded-full border border-white/10" />
              <Navigation className="w-10 h-10 animate-pulse text-amber-300 rotate-45" />
            </motion.div>

            <h2 className="text-sm font-black tracking-[0.2em] font-mono text-luxury-gold uppercase text-center animate-pulse-soft">
              Initiating Travel Sequence
            </h2>
            
            <p className="text-lg font-bold font-display text-white mt-1 uppercase text-center max-w-sm">
              {eventName}
            </p>
            
            <p className="text-[10px] text-white/40 uppercase tracking-widest font-mono text-center mt-3 max-w-xs leading-relaxed">
              Traveling with <strong style={{ color: activeColor }}>{idol.name}</strong> to the designated meeting spot...
            </p>
          </motion.div>
        ) : (
          /* ACTIVE INTERACTIVE GAMEPLAY */
          <motion.div
            key="active_gameplay"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-10 w-full max-w-3xl flex flex-col max-h-[92vh] xl:max-h-[85vh] rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl bg-luxury-black/95"
            style={{
              boxShadow: `0 35px 85px -15px ${activeColor}30, inset 0 1px 1px rgba(255,255,255,0.05)`
            }}
          >
            {/* Header Block with Back navigation */}
            <header className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-cover bg-center border" style={{ backgroundImage: `url(${idol.image})`, borderColor: activeColor }} />
                <div>
                  <h3 className="font-bold text-xs tracking-wider text-white uppercase">{idol.name}</h3>
                  <p className="text-[8.5px] font-mono uppercase tracking-widest text-amber-200 mt-0.5 font-sans flex items-center gap-1.5 font-bold">
                    <Compass size={11} className="text-amber-300" />
                    Bubble Date: {eventName}
                  </p>
                </div>
              </div>

              {!isFinished && (
                <button
                  onClick={() => { playReceivedSound(); onClose(); }}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white border border-white/5 text-[9px] font-mono uppercase tracking-widest cursor-pointer"
                >
                  Terminate Date
                </button>
              )}
            </header>

            {/* Inner scroll node content block */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center custom-scrollbar">
              
              <AnimatePresence mode="wait">
                {!isFinished ? (
                  /* THE NARRATIVE BRANCH PANEL */
                  <motion.div
                    key={currentNodeId}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.4 }}
                    className="w-full flex flex-col items-center gap-6"
                  >
                    
                    {/* Visual Standing Avatar focus with interactive glow portal */}
                    <div className="relative h-44 xl:h-52 flex items-end justify-center select-none mt-2">
                      <div className="absolute bottom-0 w-36 h-4 rounded-full opacity-60 filter blur-sm" style={{ background: `radial-gradient(ellipse, ${activeColor}50 0%, transparent 70%)` }} />
                      <img
                        src={idol.image}
                        alt="Standing idol pose"
                        referrerPolicy="no-referrer"
                        className="h-full object-contain pointer-events-none drop-shadow-lg"
                      />
                    </div>

                    {/* Speech Text Container */}
                    <div className="w-full glass p-5 rounded-[2rem] border relative" style={{ borderColor: `${activeColor}20` }}>
                      <div className="absolute -top-3 left-6 flex items-center gap-1 bg-white/5 border border-white/10 rounded-full px-2.5 py-0.5">
                        <Volume2 size={10} style={{ color: activeColor }} />
                        <span className="text-[7.5px] font-mono tracking-wider uppercase text-white/50">Spoken feed preview</span>
                      </div>

                      <p className="text-xs md:text-sm font-medium leading-relaxed italic text-center text-white/90 whitespace-pre-line px-1 pt-1">
                        "{currentNode ? currentNode.text : 'Bubble connection loading...'}"
                      </p>
                    </div>

                    {/* CHOICE BUTTONS GRID */}
                    <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                      {currentNode?.choices.map((choice) => {
                        const isChosen = selectedChoiceId === choice.id;
                        return (
                          <button
                            key={choice.id}
                            onClick={() => handleSelectChoice(choice)}
                            disabled={selectedChoiceId !== null}
                            className={`p-4 rounded-2xl border text-center text-[11px] md:text-xs leading-relaxed font-semibold uppercase tracking-wider transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 relative overflow-hidden ${
                              isChosen
                                ? 'bg-white/10 text-white font-black'
                                : selectedChoiceId !== null
                                ? 'opacity-40 border-white/5 text-white/20'
                                : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/15 text-white/80'
                            }`}
                            style={isChosen ? { borderColor: activeColor } : {}}
                          >
                            <span>{choice.text}</span>
                            
                            {/* Option Reward parameters highlight */}
                            <div className="flex items-center gap-1 opacity-70">
                              <span className="text-[7.5px] font-mono text-luxury-gold tracking-wide leading-none font-bold">
                                +{choice.affection} XP
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                  </motion.div>
                ) : (
                  /* DATE RESULT SCREEN (Dating complete dashboard) */
                  <motion.div
                    key="date_results"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-full flex flex-col items-center max-w-md py-4 text-center space-y-6"
                  >
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full bg-cover bg-center border-2 mx-auto animate-pulse-soft" style={{ backgroundImage: `url(${idol.image})`, borderColor: activeColor }} />
                      <div className="absolute -bottom-2 -right-1 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white border border-luxury-black">
                        <CheckCircle size={14} />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h2 className="text-sm font-black tracking-[0.25em] font-mono text-luxury-gold uppercase">
                        Date Completed
                      </h2>
                      <p className="text-xl font-bold text-white uppercase font-display leading-tight">
                        Perfect Bubble Chemistry!
                      </p>
                      <p className="text-[10px] text-white/40 uppercase tracking-widest font-mono">
                        Your bond with {idol.name} has undergone synthesis!
                      </p>
                    </div>

                    {/* Earned Relationship stats cards */}
                    <div className="w-full grid grid-cols-3 gap-3">
                      
                      <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col items-center justify-center gap-1 shadow-sm">
                        <Heart size={14} className="text-rose-400 fill-rose-500/10" style={{ color: activeColor }} />
                        <span className="text-[14px] font-black tracking-tight text-white">{sessionEarned.affection}%</span>
                        <span className="text-[7.5px] font-mono text-white/35 uppercase">Affection</span>
                      </div>

                      <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col items-center justify-center gap-1 shadow-sm">
                        <ShieldCheck size={14} className="text-emerald-400" />
                        <span className="text-[14px] font-black tracking-tight text-white">+{sessionEarned.trust}</span>
                        <span className="text-[7.5px] font-mono text-white/35 uppercase">Trust Boost</span>
                      </div>

                      <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col items-center justify-center gap-1 shadow-sm">
                        <Flame size={14} className="text-amber-400 fill-amber-500/15" />
                        <span className="text-[14px] font-black tracking-tight text-white">+{sessionEarned.chemistry}</span>
                        <span className="text-[7.5px] font-mono text-white/35 uppercase">Chemistry</span>
                      </div>

                    </div>

                    {/* Unlocked Reward milestone plaque */}
                    <div className="p-4 rounded-2xl border border-luxury-gold/25 bg-luxury-gold/5 flex items-center gap-4 text-left w-full">
                      <div className="p-2.5 rounded-xl bg-luxury-gold/10 border border-luxury-gold/30">
                        <Award className="text-luxury-gold w-5 h-5 animate-pulse-soft" />
                      </div>
                      <div>
                        <h4 className="text-[10.5px] font-display font-black text-rose-300 uppercase leading-none mb-1">
                          Bond Milestone Unlocked!
                        </h4>
                        <p className="text-[9.5px] font-medium leading-relaxed text-white/70 whitespace-pre-line">
                          "{idol.name} was deeply touched by your dialougue choices. New secret memories unlocked inside your Memory Book!"
                        </p>
                      </div>
                    </div>

                    {/* Closing button */}
                    <button
                      onClick={() => { triggerHaptic(10); playReceivedSound(); onClose(); }}
                      className="w-full py-4 rounded-xl bg-gradient-to-r from-rose-500/20 via-rose-500/30 to-pink-500/10 hover:from-rose-500/30 hover:to-pink-500/25 text-rose-200 font-display font-medium text-xs tracking-widest uppercase transition-all duration-300 border border-rose-500/30 active:scale-[0.97] cursor-pointer shadow-md"
                      style={{ borderColor: `${activeColor}40` }}
                    >
                      Record & Return to Hub
                    </button>

                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
