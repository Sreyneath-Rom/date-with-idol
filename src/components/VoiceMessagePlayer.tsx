import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  audioUrl: string;
  sender: 'idol' | 'player';
  isActive: boolean;
  onPlay: () => void;
  onPause: () => void;
}

export default function VoiceMessagePlayer({ audioUrl, sender, isActive, onPlay, onPause }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    // Initialize audio element
    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
      
      const onLoadedMetadata = () => {
        if (audioRef.current) {
          setDuration(audioRef.current.duration || 0);
        }
      };

      const onTimeUpdate = () => {
        if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime || 0);
        }
      };

      const onEnded = () => {
        setIsPlaying(false);
        onPause();
        setCurrentTime(0);
      };

      audioRef.current.addEventListener('loadedmetadata', onLoadedMetadata);
      audioRef.current.addEventListener('timeupdate', onTimeUpdate);
      audioRef.current.addEventListener('ended', onEnded);

      // Trigger metadata load if audio is preheated
      if (audioRef.current.readyState >= 1) {
        setDuration(audioRef.current.duration || 0);
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [audioUrl]);

  // Handle external play state changes (if another audio starts playing, isActive is set to false)
  useEffect(() => {
    if (!isActive && isPlaying) {
      setIsPlaying(false);
      audioRef.current?.pause();
    }
  }, [isActive, isPlaying]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      onPause();
    } else {
      onPlay(); // Inform parent to pause any other active playing audios
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.error("Audio playback failed:", err);
      });
    }
  };

  const formatTime = (time: number) => {
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div 
      id="voice-message-player-bubble"
      className={`flex items-center gap-3 py-2.5 px-4 rounded-3xl min-w-[210px] md:min-w-[250px] transition-all border ${
        sender === 'idol' 
          ? 'bg-white/5 border-white/10 text-white/90'
          : 'bg-white/10 border-white/20 text-white font-medium'
      }`}
    >
      <motion.button 
        id={`voice-play-toggle-${sender}`}
        onClick={togglePlay}
        whileTap={{ scale: 0.82 }}
        transition={{ type: "spring", stiffness: 400, damping: 15 }}
        className={`w-9 h-9 flex items-center justify-center rounded-full transition-all duration-300 flex-shrink-0 cursor-pointer relative overflow-hidden ${
          sender === 'idol'
            ? isPlaying
              ? 'bg-gradient-to-r from-luxury-magenta to-rose-600 text-white shadow-[0_0_15px_rgba(255,51,119,0.8)] border border-luxury-magenta/30'
              : 'bg-gradient-to-r from-luxury-magenta to-rose-600 hover:from-rose-500 hover:to-luxury-magenta text-white shadow-[0_2px_8px_rgba(255,51,119,0.3)] hover:shadow-[0_4px_12px_rgba(255,51,119,0.5)]'
            : 'bg-white text-luxury-black hover:bg-neutral-100 shadow-[0_2px_8px_rgba(0,0,0,0.15)] font-bold'
        }`}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={isPlaying ? "pause" : "play"}
            initial={{ rotate: -135, scale: 0.2, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: 135, scale: 0.2, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
            className="flex items-center justify-center absolute"
          >
            {isPlaying ? (
              <Pause size={14} fill="currentColor" />
            ) : (
              <Play size={14} fill="currentColor" className="ml-0.5" />
            )}
          </motion.div>
        </AnimatePresence>
      </motion.button>

      <div className="flex-1 min-w-0 space-y-1">
        {/* Progress track */}
        <div className="relative w-full h-1.5 rounded-full bg-white/20 overflow-hidden">
          <div 
            className={`absolute left-0 top-0 h-full rounded-full transition-all duration-75 ${
              sender === 'idol' ? 'bg-luxury-gold' : 'bg-luxury-gold'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[9px] font-mono opacity-50 select-none">
          <span className="font-bold">{formatTime(currentTime)}</span>
          <span className="font-medium">{duration ? formatTime(duration) : '0:00'}</span>
        </div>
      </div>

      <Volume2 size={12} className={`opacity-40 flex-shrink-0 ${isPlaying ? 'animate-pulse text-luxury-gold' : ''}`} />
    </div>
  );
}
