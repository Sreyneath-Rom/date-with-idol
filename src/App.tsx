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
import MemoryBook from './components/MemoryBook';
import { Idol, AppView, UserProfile } from './types';
import { useFirebase } from './lib/FirebaseContext';
import { IDOLS } from './constants';
import { useEffect } from 'react';

export default function App() {
  const [view, setView] = useState<AppView>('intro');
  const [selectedIdol, setSelectedIdol] = useState<Idol | null>(null);
  const { profile, updateFirestoreProfile, user } = useFirebase();

  // Keep selectedIdol synchronized with the user profile's chosen idol (from cloud or guest)
  useEffect(() => {
    if (profile.selectedIdolId) {
      const match = IDOLS.find(i => i.id === profile.selectedIdolId);
      if (match) {
        setSelectedIdol(match);
      }
    } else {
      setSelectedIdol(null);
    }
  }, [profile.selectedIdolId]);

  const handleIdolSelect = (idol: Idol) => {
    setSelectedIdol(idol);
    updateFirestoreProfile({ ...profile, selectedIdolId: idol.id });
    setView('hub');
  };

  const handleAffectionGain = (points: number) => {
    updateFirestoreProfile({ ...profile, affection: Math.min(100, profile.affection + points) });
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
              profile={profile}
              onUpdateProfile={updateFirestoreProfile}
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
      </AnimatePresence>

      {/* Persistent Audio Player or Ambient Background could go here */}
      <div className="fixed bottom-0 left-0 p-4 opacity-10 pointer-events-none">
         <span className="text-[8px] font-mono tracking-widest uppercase">SYSTM v2.4.0 • IDOL PROTOCOL ACTIVE</span>
      </div>
    </div>
  );
}
