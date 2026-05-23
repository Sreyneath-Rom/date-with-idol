import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Music, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  audioUrl: string;
  isActive: boolean;
  onPlay: () => void;
  onPause: () => void;
  idolName: string;
}

export default function MiniVoicePlayer({ audioUrl, isActive, onPlay, onPause, idolName }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [isPreloading, setIsPreloading] = useState(false);

  useEffect(() => {
    // Release and stop previous Audio element on change
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (!audioUrl) return;

    setHasError(false);
    setIsPreloading(true);

    let active = true;
    let localBlobUrl: string | null = null;
    let audio: HTMLAudioElement | null = null;

    const setupAudio = async () => {
      try {
        let finalSrc = audioUrl;
        
        // Fetch early as blob and create local Object URL to minimize decoding latency in browser
        if (audioUrl.startsWith('data:') || audioUrl.startsWith('http')) {
          const response = await fetch(audioUrl);
          if (!response.ok) throw new Error(`HTTP status ${response.status}`);
          const blob = await response.blob();
          if (!active) return;
          localBlobUrl = URL.createObjectURL(blob);
          finalSrc = localBlobUrl;
        }

        audio = new Audio();
        // Set preload configuration to auto buffer early
        audio.preload = "auto";
        audio.src = finalSrc;
        audioRef.current = audio;

        const onLoadedMetadata = () => {
          if (!active) return;
          setDuration(audio?.duration || 0);
          setHasError(false);
          setIsPreloading(false);
        };

        const onTimeUpdate = () => {
          if (!active) return;
          setCurrentTime(audio?.currentTime || 0);
        };

        const onEnded = () => {
          if (!active) return;
          setIsPlaying(false);
          onPause();
          setCurrentTime(0);
        };

        const onError = (e: Event) => {
          if (!active) return;
          const mediaError = audio?.error;
          console.error("MiniVoicePlayer: Audio source error or unsupported format:", {
            code: mediaError?.code,
            message: mediaError?.message,
            event: e
          });
          setHasError(true);
          setIsPlaying(false);
          setIsPreloading(false);
          onPause();
        };

        audio.addEventListener('loadedmetadata', onLoadedMetadata);
        audio.addEventListener('timeupdate', onTimeUpdate);
        audio.addEventListener('ended', onEnded);
        audio.addEventListener('error', onError);

        // Explicitly trigger a load event to populate buffers early
        audio.load();

        // Warm start checking
        if (audio.readyState >= 1) {
          setDuration(audio.duration || 0);
          setIsPreloading(false);
        }

      } catch (err) {
        console.error("MiniVoicePlayer: Failed early pre-loading blob fetch, using inline fallback:", err);
        if (!active) return;
        
        // Fall back to standard direct audio url initialization
        try {
          audio = new Audio(audioUrl);
          audio.preload = "auto";
          audioRef.current = audio;

          const onLoadedMetadata = () => {
            if (!active) return;
            setDuration(audio?.duration || 0);
            setHasError(false);
            setIsPreloading(false);
          };

          const onTimeUpdate = () => {
            if (!active) return;
            setCurrentTime(audio?.currentTime || 0);
          };

          const onEnded = () => {
            if (!active) return;
            setIsPlaying(false);
            onPause();
            setCurrentTime(0);
          };

          const onError = (e: Event) => {
            if (!active) return;
            const mediaError = audio?.error;
            console.error("MiniVoicePlayer fallback: Audio source error:", mediaError);
            setHasError(true);
            setIsPlaying(false);
            setIsPreloading(false);
            onPause();
          };

          audio.addEventListener('loadedmetadata', onLoadedMetadata);
          audio.addEventListener('timeupdate', onTimeUpdate);
          audio.addEventListener('ended', onEnded);
          audio.addEventListener('error', onError);

          audio.load();
        } catch (fallbackErr) {
          console.error("MiniVoicePlayer critical: Sync fallback failed", fallbackErr);
          setHasError(true);
          setIsPreloading(false);
        }
      }
    };

    setupAudio();

    return () => {
      active = false;
      if (audio) {
        audio.pause();
      }
      if (localBlobUrl) {
        URL.revokeObjectURL(localBlobUrl);
      }
      if (audioRef.current === audio) {
        audioRef.current = null;
      }
    };
  }, [audioUrl]);

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
      setHasError(false);
      onPlay();
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.error("Failed to play mini-audio promise:", err);
        setHasError(true);
        setIsPlaying(false);
        onPause();
      });
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mt-2.5 p-2 rounded-xl transition-all border flex items-center gap-2 max-w-full backdrop-blur-sm shadow-md ${
        hasError 
          ? 'bg-rose-950/40 border-rose-500/30' 
          : 'bg-black/45 hover:bg-black/55 border-rose-500/10'
      }`}
    >
      <button
        onClick={togglePlay}
        disabled={isPreloading && !hasError}
        className={`w-7 h-7 flex items-center justify-center rounded-full text-white shadow-sm flex-shrink-0 cursor-pointer relative hover:scale-105 active:scale-95 transition-transform ${
          hasError
            ? 'bg-rose-900 border border-rose-500/40'
            : isPreloading
            ? 'bg-rose-500/30 border border-rose-500/20 text-rose-300'
            : 'bg-gradient-to-r from-luxury-magenta to-rose-600'
        }`}
        title={hasError ? "Source error. Click to attempt reload/play again." : isPreloading ? "Pre-loading..." : "Play/Pause"}
      >
        {isPreloading && !hasError ? (
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="w-3 h-3 border border-rose-400 border-t-transparent rounded-full"
          />
        ) : isPlaying ? (
          <Pause size={10} fill="currentColor" />
        ) : (
          <Play size={10} fill="currentColor" className="ml-0.5" />
        )}
      </button>

      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center justify-between text-[7px] font-mono tracking-widest uppercase select-none">
          <span className={`flex items-center gap-1 ${hasError ? 'text-rose-400 font-bold' : 'text-luxury-gold/85'}`}>
            <Music size={7} className={isPlaying ? 'animate-bounce' : ''} />
            {hasError ? '⚠️ Playback Error' : isPreloading ? '📡 Buffering...' : '🎙️ AI Voice Memo'}
          </span>
          <span className="opacity-60 text-white/50">{idolName}</span>
        </div>

        {/* Progress bar or error/preloading explanation */}
        {hasError ? (
          <p className="text-[8px] font-medium text-rose-300/80 truncate">
            Unsupported stream format. Click play button to retry.
          </p>
        ) : isPreloading ? (
          <p className="text-[7.5px] font-mono tracking-wider text-rose-300/60 animate-pulse truncate">
            Fetching early audio stream...
          </p>
        ) : (
          <div className="relative w-full h-1 rounded-full bg-white/10 overflow-hidden">
            <div 
              className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-pink-500 to-rose-400"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      <Volume2 size={9} className={`opacity-40 flex-shrink-0 ${isPlaying ? 'animate-pulse text-rose-500' : ''} ${hasError ? 'text-rose-400' : ''}`} />
    </motion.div>
  );
}
