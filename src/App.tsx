/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import CinematicIntro from './components/CinematicIntro';
import IdolSelection from './components/IdolSelection';
import HomeHub from './components/HomeHub';
import ChatRoom from './components/ChatRoom';
import DateScene from './components/DateScene';
import MemoryBook from './components/MemoryBook';
import Closet from './components/Closet';
import { Idol, AppView, UserProfile } from './types';

export default function App() {
  const [view, setView] = useState<AppView>('intro');
  const [selectedIdol, setSelectedIdol] = useState<Idol | null>(null);
  const [profile, setProfile] = useState<UserProfile>({
    name: 'Player',
    selectedIdolId: null,
    affection: 12
  });

  const handleIdolSelect = (idol: Idol) => {
    setSelectedIdol(idol);
    setProfile(p => ({ ...p, selectedIdolId: idol.id }));
    setView('hub');
  };

  const handleAffectionGain = (points: number) => {
    setProfile(p => ({ ...p, affection: Math.min(100, p.affection + points) }));
  };

  return (
    <div className="min-h-screen bg-luxury-black overflow-hidden font-sans select-none">
      <AnimatePresence mode="wait">
        {view === 'intro' && (
          <CinematicIntro key="intro" onComplete={() => setView('selection')} />
        )}

        {view === 'selection' && (
          <motion.div
             key="selection"
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
          >
            <IdolSelection onSelect={handleIdolSelect} />
          </motion.div>
        )}

        {view === 'hub' && selectedIdol && (
          <motion.div
            key="hub"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <HomeHub 
              idol={selectedIdol} 
              onNavigate={setView} 
              affection={profile.affection}
            />
          </motion.div>
        )}

        {view === 'chat' && selectedIdol && (
          <motion.div
            key="chat"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[60]"
          >
            <ChatRoom idol={selectedIdol} onBack={() => setView('hub')} />
          </motion.div>
        )}

        {view === 'date' && selectedIdol && (
          <motion.div
            key="date"
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-[70]"
          >
            <DateScene 
              idol={selectedIdol} 
              onClose={() => setView('hub')} 
              onAffectionGain={handleAffectionGain}
              onViewMemories={() => setView('memories')}
            />
          </motion.div>
        )}

        {view === 'memories' && selectedIdol && (
          <motion.div
            key="memories"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="fixed inset-0 z-[60]"
          >
            <MemoryBook idol={selectedIdol} onBack={() => setView('hub')} />
          </motion.div>
        )}

        {view === 'closet' && selectedIdol && (
          <motion.div
            key="closet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[60]"
          >
            <Closet idol={selectedIdol} onBack={() => setView('hub')} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Persistent Audio Player or Ambient Background could go here */}
      <div className="fixed bottom-0 left-0 p-4 opacity-10 pointer-events-none">
         <span className="text-[8px] font-mono tracking-widest uppercase">SYSTM v2.4.0 • IDOL PROTOCOL ACTIVE</span>
      </div>
    </div>
  );
}
