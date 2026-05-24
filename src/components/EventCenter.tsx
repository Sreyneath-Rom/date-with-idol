import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Calendar, Clock, Award, Play, AlertCircle, X, CheckCircle, Smartphone } from 'lucide-react';
import { Idol, DynamicEvent, UserProfile } from '../types';
import { useFirebase } from '../lib/FirebaseContext';
import { playReceivedSound, playSentSound } from '../utils/audio';
import { DailyMission, GENERATED_EVENTS, GENERATED_MISSIONS } from '../data/sprintData';

interface Props {
  idol: Idol;
  onClose: () => void;
  onEnterDate: (event: DynamicEvent) => void;
  onAddStats: (stats: Partial<UserProfile>) => void;
  onMissionCompleted?: (text: string) => void;
}

export default function EventCenter({ idol, onClose, onEnterDate, onAddStats, onMissionCompleted }: Props) {
  const { user } = useFirebase();
  const [activeTab, setActiveTab] = useState<'missions' | 'events'>('missions');
  const [missions, setMissions] = useState<DailyMission[]>([]);
  const [events, setEvents] = useState<DynamicEvent[]>([]);
  const [rewardsList, setRewardsList] = useState<{ id: string; val: number; type: string }[]>([]);
  const [timeLeft, setTimeLeft] = useState<Record<string, string>>({});

  // Touchpoint Haptic Emulation
  const triggerHaptic = (pattern: number | number[] = 10) => {
    try {
      if ('vibrate' in navigator) navigator.vibrate(pattern);
    } catch (_) {}
  };

  // On mount, load missions and active events with local cache
  useEffect(() => {
    const cachedMissionsKey = `bubble_missions_v1_${idol.id}`;
    const cachedMissions = localStorage.getItem(cachedMissionsKey);
    if (cachedMissions) {
      try {
        setMissions(JSON.parse(cachedMissions));
      } catch (_) {
        setMissions(GENERATED_MISSIONS[idol.id] || GENERATED_MISSIONS.nayeon);
      }
    } else {
      setMissions(GENERATED_MISSIONS[idol.id] || GENERATED_MISSIONS.nayeon);
    }

    setEvents(GENERATED_EVENTS[idol.id] || GENERATED_EVENTS.nayeon);
  }, [idol.id]);

  // Save missions whenever they mutate
  const saveMissions = (updated: DailyMission[]) => {
    setMissions(updated);
    localStorage.setItem(`bubble_missions_v1_${idol.id}`, JSON.stringify(updated));
  };

  // Active timers ticking countdown
  useEffect(() => {
    const interval = setInterval(() => {
      const times: Record<string, string> = {};
      events.forEach(ev => {
        const diff = ev.expiresAt - Date.now();
        if (diff <= 0) {
          times[ev.id] = "EXPIRED";
        } else {
          const minutes = Math.floor(diff / 60000);
          const seconds = Math.floor((diff % 60000) / 1000);
          times[ev.id] = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        }
      });
      setTimeLeft(times);
    }, 1000);

    return () => clearInterval(interval);
  }, [events]);

  // Completing a Daily Mission
  const handleToggleMission = (missionId: string) => {
    triggerHaptic([15, 10, 15]);
    playSentSound();
    
    const updated = missions.map(m => {
      if (m.id === missionId) {
        if (!m.completed) {
          // Trigger reward animation trigger log
          const newReward = { id: `rew_${Date.now()}`, val: m.rewardValue, type: m.rewardType };
          setRewardsList(prev => [...prev, newReward]);
          
          // Add stats feedback to parent
          onAddStats({ [m.rewardType]: m.rewardValue });

          if (onMissionCompleted) {
            onMissionCompleted(m.text);
          }

          // Remove reward animation after 2.5s
          setTimeout(() => {
            setRewardsList(prev => prev.filter(r => r.id !== newReward.id));
          }, 2500);
        }
        return { ...m, completed: !m.completed };
      }
      return m;
    });

    saveMissions(updated);
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
    <div className="absolute inset-x-4 top-16 md:top-24 bottom-24 z-40 glass rounded-[2.2rem] border border-white/10 overflow-hidden flex flex-col shadow-2xl"
         style={{ boxShadow: `0 35px 80px -20px ${activeColor}25, inset 0 1px 1px rgba(255,255,255,0.05)` }}>
      
      {/* Floating Animated Reward Indicator Panels */}
      <div className="absolute top-10 inset-x-0 pointer-events-none z-50 flex flex-col items-center gap-2">
        <AnimatePresence>
          {rewardsList.map(rew => (
            <motion.div
              key={rew.id}
              initial={{ scale: 0.6, y: -20, opacity: 0 }}
              animate={{ scale: 1.1, y: 0, opacity: 1 }}
              exit={{ scale: 0.8, y: -30, opacity: 0 }}
              className="px-5 py-2 rounded-full font-display border border-luxury-gold bg-luxury-black/90 text-luxury-gold flex items-center gap-2 shadow-lg"
            >
              <Sparkles className="animate-pulse w-4 h-4 text-amber-300" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Earned +{rew.val} {rew.type}!
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Header Block */}
      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-luxury-gold/5 border border-luxury-gold/25">
            <Award className="text-luxury-gold w-5 h-5 animate-pulse-soft" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-white tracking-wide uppercase leading-none">Event Center</h2>
            <p className="text-[9px] font-mono text-white/40 tracking-widest uppercase mt-1">Boost bond dynamics with {idol.name}</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/5 text-white/45 hover:text-white transition-all cursor-pointer"
        >
          <X size={15} />
        </button>
      </div>

      {/* Navigator tabs selector */}
      <div className="flex border-b border-white/5 p-2 gap-2 bg-white/[0.005]">
        <button
          onClick={() => { setActiveTab('missions'); playReceivedSound(); }}
          className={`flex-1 py-2 text-center text-xs font-semibold rounded-xl uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'missions'
              ? 'bg-white/10 text-white font-extrabold border border-white/10'
              : 'text-white/40 hover:text-white/70'
          }`}
        >
          Daily Quests
        </button>
        <button
          onClick={() => { setActiveTab('events'); playReceivedSound(); }}
          className={`flex-1 py-2 text-center text-xs font-semibold rounded-xl uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'events'
              ? 'bg-white/10 text-white font-extrabold border border-white/10'
              : 'text-white/40 hover:text-white/70'
          }`}
        >
          Dynamic Events
        </button>
      </div>

      {/* Body List Container */}
      <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4 custom-scrollbar">
        {activeTab === 'missions' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-[10px] uppercase font-mono tracking-widest pl-1">
              <Calendar size={13} style={{ color: activeColor }} /> Daily Bias Tasks Remaining
            </div>

            {missions.map((m) => (
              <motion.div
                key={m.id}
                whileHover={{ scale: 1.01 }}
                className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 select-none ${
                  m.completed
                    ? 'border-emerald-500/15 bg-emerald-500/5 opacity-60'
                    : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex-1 space-y-1">
                  <p className={`text-[11.5px] leading-relaxed font-semibold transition-all ${m.completed ? 'line-through text-white/40' : 'text-white/90'}`}>
                    {m.text}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[7.5px] font-mono text-luxury-gold uppercase leading-all font-bold px-1.5 py-0.5 rounded bg-luxury-gold/5 border border-luxury-gold/15">
                      +{m.rewardValue} {m.rewardType}
                    </span>
                    <span className="text-[7.5px] font-mono text-white/30 uppercase tracking-widest">
                      Task Mode: {m.type}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleToggleMission(m.id)}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all cursor-pointer ${
                    m.completed
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                      : 'border-white/10 bg-white/5 hover:border-white/20 text-white/60 hover:text-white'
                  }`}
                >
                  {m.completed ? (
                    <CheckCircle size={16} className="fill-emerald-400/10" />
                  ) : (
                    <Play size={13} className="ml-0.5 fill-white/10" />
                  )}
                </button>
              </motion.div>
            ))}
          </div>
        )}

        {activeTab === 'events' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-[10px] uppercase font-mono tracking-widest pl-1">
              <Clock size={13} /> Highly Sensitive Dynamic Feed
            </div>

            {events.length === 0 ? (
              <div className="py-16 text-center text-white/30">
                <AlertCircle className="mx-auto block mb-2 opacity-35" size={24} />
                <p className="text-xs uppercase font-extrabold tracking-widest">No Active Events</p>
                <p className="text-[9px] text-white/40 mt-1 max-w-xs mx-auto">Events are dynamically generated based on schedule! Keep checking later.</p>
              </div>
            ) : (
              events.map((ev) => {
                const timerState = timeLeft[ev.id] || '---';
                const isExpired = timerState === 'EXPIRED';

                return (
                  <div
                    key={ev.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col gap-3 relative overflow-hidden bg-white/[0.02] ${
                      isExpired ? 'border-white/5 opacity-50' : 'border-white/5 hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <div className="flex items-center gap-1.5 font-sans mb-1">
                          <span className="w-1.5 h-1.5 rounded-full animate-ping mr-0.5" style={{ backgroundColor: isExpired ? '#666' : activeColor }} />
                          <span className="text-[7.5px] font-mono uppercase tracking-widest font-black" style={{ color: activeColor }}>
                            {ev.type} event
                          </span>
                        </div>
                        <h3 className="font-bold text-xs text-white tracking-wide">{ev.title}</h3>
                        <p className="text-[10px] leading-relaxed text-white/60 mt-1">{ev.description}</p>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`text-[9px] font-mono font-black px-2 py-0.5 rounded-full border leading-none ${
                          isExpired 
                            ? 'bg-red-500/5 border-red-500/10 text-red-400' 
                            : 'bg-white/5 border-white/5 text-amber-300 animate-pulse-soft'
                        }`}>
                          {timerState}
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-white/5 pt-2.5 flex items-center justify-between mt-1">
                      <span className="text-[7.5px] font-mono text-white/20 uppercase tracking-widest">Authorized bubble feed</span>
                      <button
                        onClick={() => {
                          if (isExpired) return;
                          triggerHaptic(12);
                          playSentSound();
                          onEnterDate(ev);
                        }}
                        disabled={isExpired}
                        className={`px-3.5 py-1.5 rounded-lg font-mono text-[8.5px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer ${
                          isExpired
                            ? 'bg-white/5 text-white/20 border border-white/5 cursor-not-allowed'
                            : 'bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 text-white hover:border-white/20'
                        }`}
                      >
                        Launch Game
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

    </div>
  );
}
