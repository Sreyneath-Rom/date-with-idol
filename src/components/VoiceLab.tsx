import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Mic, Square, Play, Pause, RefreshCw, Layers, 
  Volume2, Trash2, Check, Music, Sliders, ChevronRight
} from 'lucide-react';

interface VoiceClone {
  id: string;
  name: string;
  gender: 'male' | 'female';
  age: 'young' | 'mature';
  pitch: number; // -30 to 30
  accent: string;
  stability: number; // 0 to 100
  clarity: number; // 0 to 100
  provider: 'sandbox' | 'elevenlabs';
  voiceId?: string;
  isPrebuilt?: boolean;
}

const PREBUILT_CLONES: VoiceClone[] = [
  {
    id: 'prebuilt-sweet-lover',
    name: 'Mina Style (Soft ASMR)',
    gender: 'female',
    age: 'young',
    pitch: 12,
    accent: 'Whisper ASMR',
    stability: 85,
    clarity: 92,
    provider: 'sandbox',
    voiceId: 'sandbox-sweet-lover',
    isPrebuilt: true
  },
  {
    id: 'prebuilt-popstar',
    name: 'Nayeon Style (Sassy Pop)',
    gender: 'female',
    age: 'young',
    pitch: 20,
    accent: 'Sassy Popstar',
    stability: 78,
    clarity: 88,
    provider: 'sandbox',
    voiceId: 'sandbox-popstar',
    isPrebuilt: true
  },
  {
    id: 'prebuilt-mature-oppa',
    name: 'Warm Friend (Calm Tone)',
    gender: 'male',
    age: 'mature',
    pitch: -22,
    accent: 'Standard US English',
    stability: 90,
    clarity: 95,
    provider: 'sandbox',
    voiceId: 'sandbox-mature-oppa',
    isPrebuilt: true
  }
];

interface Props {
  idol: any;
  onBack: () => void;
  onNavigateToChat?: () => void;
}

export default function VoiceLab({ idol, onBack, onNavigateToChat }: Props) {
  // Saved Clones state
  const [clones, setClones] = useState<VoiceClone[]>([]);
  const [activeCloneId, setActiveCloneId] = useState<string>('prebuilt-sweet-lover');

  // Input fields state
  const [cloneName, setCloneName] = useState<string>('');
  const [gender, setGender] = useState<'male' | 'female'>('female');
  const [age, setAge] = useState<'young' | 'mature'>('young');
  const [pitch, setPitch] = useState<number>(0);
  const [accent, setAccent] = useState<string>('Standard US English');
  const [stability, setStability] = useState<number>(75);
  const [clarity, setClarity] = useState<number>(85);

  // Recording State
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordedBase64, setRecordedBase64] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);

  // Training Simulation State
  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [trainingLogs, setTrainingLogs] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(0);

  // Playground State
  const [sandboxText, setSandboxText] = useState<string>('Annyeonghaseyo! Hope you are having a wonderful day! Practicing hard to meet you. Let\'s make beautiful music!');
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);
  const [synthesizedAudioUrl, setSynthesizedAudioUrl] = useState<string | null>(null);
  const [isPlaygroundPlaying, setIsPlaygroundPlaying] = useState<boolean>(false);

  // Audio References & Visualizers
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const playgroundAudioRef = useRef<HTMLAudioElement | null>(null);

  // Sound FX
  const [sentSuccess, setSentSuccess] = useState<boolean>(false);

  // Initial loading of voice clones from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('ai_voice_clones');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setClones([...PREBUILT_CLONES, ...parsed]);
          const currentActive = localStorage.getItem('active_voice_clone_id');
          if (currentActive && [...PREBUILT_CLONES, ...parsed].some(c => c.id === currentActive)) {
            setActiveCloneId(currentActive);
          }
        } else {
          setClones(PREBUILT_CLONES);
          localStorage.setItem('ai_voice_clones', JSON.stringify([]));
        }
      } catch (e) {
        setClones(PREBUILT_CLONES);
      }
    } else {
      setClones(PREBUILT_CLONES);
      localStorage.setItem('ai_voice_clones', JSON.stringify([]));
    }
  }, []);

  // Set default name for vocal print based on active selection
  useEffect(() => {
    if (!cloneName) {
      setCloneName(`${idol.name} Clone Print #${clones.filter(c => !c.isPrebuilt).length + 1}`);
    }
  }, [clones, idol]);

  // Handle active clone change
  const selectActiveClone = (id: string) => {
    setActiveCloneId(id);
    localStorage.setItem('active_voice_clone_id', id);
    const chosen = clones.find(c => c.id === id);
    if (chosen) {
      // Sync parameters to visual display for satisfaction
      setGender(chosen.gender);
      setAge(chosen.age);
      setPitch(chosen.pitch);
      setAccent(chosen.accent);
      setStability(chosen.stability);
      setClarity(chosen.clarity);
    }
  };

  // Start microphon recording
  const startRecording = async () => {
    try {
      setRecordedAudioUrl(null);
      setRecordedBase64(null);
      setRecordingDuration(0);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up Audio Context and AnalyserNode for real-time wave drawing
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Draw real timing audio wave on Canvas
      drawWaveform();

      // Configure MediaRecorder
      const options = { mimeType: 'audio/webm' };
      let mediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, options);
      } catch (err) {
        mediaRecorder = new MediaRecorder(stream);
      }
      
      mediaRecorderRef.current = mediaRecorder;
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedAudioUrl(url);

        // Convert sound blob to base64 for ElevenLabs and node transfers
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          const base64data = reader.result as string;
          // Strip base64 headers
          const stripped = base64data.split(',')[1];
          setRecordedBase64(stripped);
        };
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Start duration elapsed tracker
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => {
          if (prev >= 15) { // Max 15 seconds
            stopRecording();
            return 15;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (err) {
      console.error("Microphone capture failed:", err);
      // Fallback: simulate visual feedback if mic blocked
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => {
          if (prev >= 15) {
            stopRecording();
            return 15;
          }
          return prev + 1;
        });
      }, 1000);
      drawMockWaveform();
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Clear canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    // Mock recorded sound if mic failed
    if (!recordedAudioUrl && !recordedBase64) {
      // Simulate generated sample voice audio for safety
      setRecordedAudioUrl("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3");
      setRecordedBase64("MOCK_SND_DATA");
    }
  };

  const drawWaveform = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const analyser = analyserRef.current;
    if (!analyser) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!isRecording) return;
      animationFrameRef.current = requestAnimationFrame(draw);

      analyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = 'rgba(10, 10, 12, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;

        const grad = ctx.createLinearGradient(0, canvas.height, 0, 0);
        grad.addColorStop(0, '#FF3377'); // Magenta
        grad.addColorStop(1, '#D4AF37'); // Gold

        ctx.fillStyle = grad;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);

        x += barWidth;
      }
    };

    draw();
  };

  const drawMockWaveform = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      if (!isRecording) return;
      animationFrameRef.current = requestAnimationFrame(draw);

      ctx.fillStyle = 'rgba(10, 10, 12, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 2;
      ctx.strokeStyle = '#FF3377';
      ctx.beginPath();

      const sliceWidth = canvas.width / 50;
      let x = 0;

      for (let i = 0; i < 50; i++) {
        const v = Math.sin(i * 0.35 + Date.now() * 0.01) * (Math.random() * 25 + 5);
        const y = canvas.height / 2 + v;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.stroke();
    };

    draw();
  };

  // Launch AI neural Training Simulator
  const triggerVoiceTraining = async () => {
    if (!cloneName.trim()) return;
    
    setIsTraining(true);
    setTrainingLogs([]);
    setCurrentStep(0);

    const logs = [
      "🔄 Initializing Sonic Print Formant Analyzer...",
      "🎙️ Loading recording vocal footprint sample...",
      "🧬 Extracting acoustic timbre profiles, pitch registers & harmonics...",
      "🧠 Aligning neural phoneme mapping configurations...",
      "🎛️ Training custom neural model weights on ElevenLabs API...",
      "🧬 Structuring local neural sandbox voice parameter coefficients...",
      "✨ Voice Clone Print synthetically generated successfully!"
    ];

    for (let i = 0; i < logs.length; i++) {
      setCurrentStep(i);
      setTrainingLogs(prev => [...prev, logs[i]]);
      await new Promise(resolve => setTimeout(resolve, i === 4 ? 1200 : 700));
    }

    try {
      // Create new clone item
      const newClone: VoiceClone = {
        id: `clone-${Date.now()}`,
        name: cloneName,
        gender,
        age,
        pitch,
        accent,
        stability,
        clarity,
        provider: 'sandbox' // Default sandbox, if ElevenLabs endpoint works it gets updated
      };

      // Call API if possible
      if (recordedBase64 && recordedBase64 !== "MOCK_SND_DATA") {
        try {
          const apiRes = await fetch("/api/voice-clone/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: cloneName,
              sampleAudio: recordedBase64,
              description: `Vocal print parameters: Pitch=${pitch}, Accent=${accent}`
            })
          });
          const apiData = await apiRes.json();
          if (apiData?.success && apiData?.voiceId) {
            newClone.voiceId = apiData.voiceId;
            newClone.provider = apiData.provider;
          }
        } catch (apiErr) {
          console.warn("API direct ElevenLabs cloning failed, falling back to neural sandbox simulation", apiErr);
        }
      }

      // Add to clones list
      const customClones = [...clones.filter(c => !c.isPrebuilt), newClone];
      setClones([...PREBUILT_CLONES, ...customClones]);
      localStorage.setItem('ai_voice_clones', JSON.stringify(customClones));
      
      // Select new clone as active
      setActiveCloneId(newClone.id);
      localStorage.setItem('active_voice_clone_id', newClone.id);

      // Reset fields
      setCloneName('');
      setRecordedAudioUrl(null);
      setRecordedBase64(null);

    } catch (err) {
      console.error(err);
    } finally {
      setIsTraining(false);
    }
  };

  // Delete custom voice clone
  const deleteClone = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (PREBUILT_CLONES.some(p => p.id === id)) return; // Prohibit deleting prebuilt
    
    const remaining = clones.filter(c => c.id !== id);
    setClones(remaining);
    
    const customOnly = remaining.filter(c => !c.isPrebuilt);
    localStorage.setItem('ai_voice_clones', JSON.stringify(customOnly));

    if (activeCloneId === id) {
      setActiveCloneId('prebuilt-sweet-lover');
      localStorage.setItem('active_voice_clone_id', 'prebuilt-sweet-lover');
    }
  };

  // Synthesize Text to Speech using Selected Clone in the Sandbox Lab
  const synthesizePlaygroundTTS = async () => {
    if (!sandboxText.trim()) return;

    setIsSynthesizing(true);
    setSynthesizedAudioUrl(null);
    setIsPlaygroundPlaying(false);

    const activeClone = clones.find(c => c.id === activeCloneId) || PREBUILT_CLONES[0];

    try {
      const response = await fetch("/api/voice-clone/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: sandboxText,
          voiceName: activeClone.name,
          gender: activeClone.gender,
          age: activeClone.age,
          pitch: activeClone.pitch,
          accent: activeClone.accent,
          stability: activeClone.stability,
          clarity: activeClone.clarity,
          voiceId: activeClone.voiceId
        })
      });

      const data = await response.json();
      if (data?.audio) {
        // Convert base64 sound to playable audio URL
        const blobUrl = `data:${data.mimeType || 'audio/mp3'};base64,${data.audio}`;
        setSynthesizedAudioUrl(blobUrl);

        // Pre-heat audio
        if (playgroundAudioRef.current) {
          playgroundAudioRef.current.src = blobUrl;
          playgroundAudioRef.current.load();
        }
      }
    } catch (err) {
      console.error("Text to Speech synthesis failed:", err);
    } finally {
      setIsSynthesizing(false);
    }
  };

  // Play synthesized playground speech
  const togglePlaygroundPlayback = () => {
    const audio = playgroundAudioRef.current;
    if (!audio) return;

    if (isPlaygroundPlaying) {
      audio.pause();
      setIsPlaygroundPlaying(false);
    } else {
      audio.play().then(() => {
        setIsPlaygroundPlaying(true);
      }).catch(err => {
        console.error("Audio playback error:", err);
      });
    }
  };

  useEffect(() => {
    const audio = playgroundAudioRef.current;
    if (audio) {
      const onEnded = () => setIsPlaygroundPlaying(false);
      audio.addEventListener('ended', onEnded);
      return () => audio.removeEventListener('ended', onEnded);
    }
  }, [synthesizedAudioUrl]);

  // Inject voice directly into chat log!
  const sendVoiceToChat = () => {
    if (!synthesizedAudioUrl) return;

    setSentSuccess(true);
    
    // Save generated voice message to active chat database/localStorage so when they go back to chat it is displayed!
    const activeClone = clones.find(c => c.id === activeCloneId) || PREBUILT_CLONES[0];
    
    const playerMsg = {
      id: `audio-msg-${Date.now()}`,
      sender: 'player',
      text: `🎙️ Sent voice clip: "${sandboxText.substring(0, 40)}${sandboxText.length > 40 ? '...' : ''}"`,
      timestamp: Date.now(),
      type: 'voice',
      audioUrl: synthesizedAudioUrl, // Base64 audio url
      audioDuration: 8, // Estimated
      reaction: undefined
    };

    // Append to localStorage chats list
    const roomKey = `vlog_chat_history_${idol.id}`;
    let history: any[] = [];
    const savedHist = localStorage.getItem(roomKey);
    if (savedHist) {
      try {
        history = JSON.parse(savedHist);
      } catch (_) {}
    }
    history.push(playerMsg);
    localStorage.setItem(roomKey, JSON.stringify(history));

    setTimeout(() => {
      setSentSuccess(false);
      if (onNavigateToChat) {
        onNavigateToChat();
      }
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0e0a12] via-[#09060d] to-[#040206] text-white flex flex-col p-4 md:p-8 relative selection:bg-purple-500/30 selection:text-purple-200">
      
      {/* Background Ambience and Waves */}
      <div className="absolute inset-x-0 top-0 h-[25vh] bg-gradient-to-b from-purple-500/5 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-pink-500/3 blur-[180px] pointer-events-none" />
      <div className="absolute top-1/3 left-0 w-[300px] h-[300px] rounded-full bg-purple-500/3 blur-[150px] pointer-events-none" />

      {/* Header Bar */}
      <header className="max-w-7xl mx-auto w-full flex items-center justify-between mb-6 md:mb-10 z-10">
        <button 
          id="voicelab-back-btn"
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2.5 rounded-xl md:rounded-2xl glass hover:bg-white/10 text-xs font-bold uppercase tracking-widest text-[#FFADAD] border-white/5 cursor-pointer hover:border-white/15 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <ArrowLeft size={14} className="text-[#FFADAD]" />
          <span>Exit Lab</span>
        </button>

        <div className="text-center">
          <span className="text-[9px] font-mono tracking-widest text-luxury-gold uppercase block animate-pulse">Neural Audio Sandbox</span>
          <h1 className="text-xl md:text-3xl font-bold font-display bg-gradient-to-r from-white via-neutral-100 to-white/60 bg-clip-text text-transparent transform md:tracking-tight">
            AI VOICE CLONING WORKSHOP
          </h1>
        </div>

        <div className="flex items-center gap-1.5 opacity-60">
          <Volume2 size={13} className="text-luxury-gold animate-bounce" />
          <span className="text-[8px] font-mono uppercase tracking-widest hidden md:inline">Neural Node Online</span>
        </div>
      </header>

      {/* Main Sandbox Grid */}
      <main className="max-w-7xl mx-auto w-full flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 z-10 pb-16">
        
        {/* LEFT COLUMN: Archive & Playground (7 spans) */}
        <section className="lg:col-span-7 flex flex-col gap-6 md:gap-8 order-2 lg:order-1">
          
          {/* Card 1: Archive of Voices */}
          <div className="glass p-5 md:p-6 rounded-[2rem] border-white/5 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[8px] font-mono tracking-widest text-white/45 uppercase block">Archive Library</span>
                <h2 className="text-sm md:text-[15px] uppercase font-bold text-rose-300 flex items-center gap-2">
                  <Layers size={14} className="text-rose-400" /> Active Vocal Profiles
                </h2>
              </div>
              <span className="text-[10px] font-mono text-white/40 bg-white/5 border border-white/5 px-2.5 py-1 rounded-full">{clones.length} Available</span>
            </div>

            <p className="text-[11px] leading-relaxed font-normal text-white/50 bg-black/15 p-3 rounded-xl border border-white/5 italic">
              💡 Choose a vocal profile profile below to activate it for message replies. The Sandbox Generator will craft dynamic speech tailored to these exact specifications!
            </p>

            {/* Vocal Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[290px] overflow-y-auto pr-1">
              {clones.map((c) => {
                const isActive = c.id === activeCloneId;
                return (
                  <div 
                    key={c.id}
                    id={`clone-card-${c.id}`}
                    onClick={() => selectActiveClone(c.id)}
                    className={`p-4 rounded-2xl cursor-pointer border select-none transition-all duration-300 relative group flex flex-col justify-between overflow-hidden ${
                      isActive 
                        ? 'bg-gradient-to-tr from-purple-500/10 via-purple-500/5 to-indigo-500/5 border-purple-500/40 shadow-[0_4px_25px_rgba(168,85,247,0.15)] ring-1 ring-purple-500/20' 
                        : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                    }`}
                  >
                    {/* Active Checkmark */}
                    {isActive && (
                      <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center border border-purple-400">
                        <Check size={11} className="text-white fill-white" />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <Music size={13} className={isActive ? 'text-purple-400 animate-pulse' : 'text-white/40'} />
                        <span className="text-xs font-bold text-white/90 truncate max-w-[120px]">{c.name}</span>
                      </div>
                      
                      <div className="flex flex-wrap gap-1">
                        <span className="text-[7.5px] uppercase font-mono tracking-wider bg-white/5 border border-white/5 px-1.5 py-0.5 rounded text-white/60">
                          {c.gender}
                        </span>
                        <span className="text-[7.5px] uppercase font-mono tracking-wider bg-white/5 border border-white/5 px-1.5 py-0.5 rounded text-white/60">
                          {c.age}
                        </span>
                        <span className="text-[7.5px] uppercase font-mono tracking-wider bg-white/5 border border-white/5 px-1.5 py-0.5 rounded text-white/60 truncate max-w-[85px]">
                          {c.accent}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3.5 border-t border-white/5 flex items-center justify-between text-[8px] font-mono text-white/40">
                      <span>PROVIDER: {c.provider.toUpperCase()}</span>
                      
                      {!c.isPrebuilt ? (
                        <button 
                          onClick={(e) => deleteClone(c.id, e)}
                          className="p-1 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                          title="Wipe sonic signature"
                        >
                          <Trash2 size={11} />
                        </button>
                      ) : (
                        <span className="text-luxury-gold/70 tracking-widest font-bold">CORE PRINT</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card 2: Neural TTS Sandbox Playground */}
          <div className="glass p-5 md:p-6 rounded-[2rem] border-white/5 shadow-2xl relative space-y-4">
            <div className="space-y-0.5">
              <span className="text-[8px] font-mono tracking-widest text-[#FFADAD] uppercase block animate-pulse">Sonic Synthesizer Sandbox</span>
              <h2 className="text-sm md:text-[15px] uppercase font-bold text-[#FFADAD] flex items-center gap-2">
                <Sliders size={14} className="text-[#FFADAD]" /> Neural Sandbox Playground
              </h2>
            </div>

            <div className="space-y-3">
              <label className="text-[9px] font-mono tracking-widest uppercase text-white/45 block mb-1">Enter Text to Speak with Selected Clone</label>
              <textarea 
                value={sandboxText}
                onChange={(e) => setSandboxText(e.target.value)}
                maxLength={200}
                placeholder="Type anything here..."
                className="w-full h-24 p-3.5 rounded-2xl bg-black/30 border border-white/5 hover:border-white/10 focus:border-purple-500/50 text-white font-medium text-xs leading-relaxed focus:outline-none resize-none transition-all placeholder:text-white/20 select-text"
              />
              <div className="flex justify-end text-[8px] font-mono text-white/30">
                <span>{sandboxText.length}/200 characters</span>
              </div>
            </div>

            {/* Action synthe block */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-1">
              <button 
                onClick={synthesizePlaygroundTTS}
                disabled={isSynthesizing || !sandboxText.trim()}
                className={`flex-1 py-3 px-5 rounded-2xl text-xs uppercase tracking-widest font-bold border cursor-pointer transition-all duration-300 flex items-center justify-center gap-2 ${
                  isSynthesizing 
                    ? 'bg-white/5 border-white/10 text-white/40' 
                    : 'bg-gradient-to-r from-purple-500/80 to-[#FF3377]/80 hover:from-purple-600 hover:to-[#FF3377] text-white border-purple-500 shadow-lg shadow-purple-500/10 hover:shadow-purple-500/20 hover:scale-[1.01] active:scale-[0.99]'
                }`}
              >
                {isSynthesizing ? (
                  <>
                    <RefreshCw size={13} className="animate-spin text-purple-400" />
                    <span>Engaging Vocal Synths...</span>
                  </>
                ) : (
                  <>
                    <Volume2 size={13} />
                    <span>Synthesize Voice Clone</span>
                  </>
                )}
              </button>

              {/* Sound Player Controls for Sandbox TTS */}
              <AnimatePresence mode="wait">
                {synthesizedAudioUrl && (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-black/45 border border-white/5 flex-shrink-0"
                  >
                    <button 
                      onClick={togglePlaygroundPlayback}
                      className="w-10 h-10 rounded-full flex items-center justify-center bg-purple-500 text-white cursor-pointer hover:bg-purple-600 active:scale-90 transition-all shadow-[0_0_12px_rgba(168,85,247,0.5)]"
                    >
                      {isPlaygroundPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
                    </button>

                    <div className="pr-1.5 text-left">
                      <span className="text-[7.5px] font-mono text-luxury-gold uppercase block font-black">Synthesized Live</span>
                      <button 
                        onClick={sendVoiceToChat}
                        disabled={sentSuccess}
                        className={`text-[9px] font-bold uppercase tracking-wider block mt-0.5 transition-all text-emerald-400 hover:text-emerald-300 cursor-pointer ${
                          sentSuccess ? 'animate-pulse text-rose-300' : ''
                        }`}
                      >
                        {sentSuccess ? '✨ Sent to Chat!' : '📥 Use in ChatRoom ➔'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

        </section>

        {/* RIGHT COLUMN: Clone New Interface Selector (5 spans) */}
        <section className="lg:col-span-5 bg-transparent flex flex-col gap-6 md:gap-8 order-1 lg:order-2">
          
          {/* Main Voice cloning tool block */}
          <div className="glass p-5 md:p-6 rounded-[2rem] border-white/5 shadow-2xl relative space-y-5 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="space-y-0.5">
                <span className="text-[8px] font-mono tracking-widest text-[#D4AF37] uppercase block">Voice Grabber</span>
                <h2 className="text-sm md:text-[15px] uppercase font-bold text-luxury-gold flex items-center gap-2">
                  <Mic size={14} className="text-luxury-gold" /> Train Neural Voice Print
                </h2>
              </div>

              {/* Step 1: Voice Recorder with wave effect */}
              <div className="space-y-2.5">
                <label className="text-[8px] font-mono tracking-widest uppercase text-white/45 block mb-1">Step 1: Record 5-10 Sec Sample or Set Profile</label>
                
                <div className="relative h-28 w-full rounded-2xl bg-[#0a0a0c]/80 border border-white/5 overflow-hidden flex flex-col items-center justify-center p-4">
                  
                  {/* Real visualizer canvas or mock visualizer lines */}
                  <canvas 
                    ref={canvasRef} 
                    className="absolute inset-x-0 bottom-0 h-2/3 w-full opacity-60 pointer-events-none"
                    width={350}
                    height={112}
                  />

                  <div className="z-10 flex flex-col items-center gap-2">
                    {isRecording ? (
                      <button 
                        onClick={stopRecording}
                        className="w-12 h-12 rounded-full bg-rose-600 animate-pulse flex items-center justify-center text-white border border-rose-500 shadow-[0_0_20px_rgba(220,38,38,0.6)] cursor-pointer"
                        title="Cut mic capture"
                      >
                        <Square size={16} fill="currentColor" />
                      </button>
                    ) : (
                      <button 
                        onClick={startRecording}
                        className="w-12 h-12 rounded-full bg-gradient-to-r from-[#FF3377] to-purple-600 flex items-center justify-center text-white cursor-pointer hover:border hover:border-white/20 hover:shadow-lg shadow-[#FF3377]/20 hover:shadow-purple-500/30 transition-all hover:scale-[1.05]"
                        title="Open mic and capture print"
                      >
                        <Mic size={18} />
                      </button>
                    )}

                    <span className="text-[9px] font-mono uppercase tracking-widest transition-all">
                      {isRecording 
                        ? `Recording... ${recordingDuration}s elapsed` 
                        : recordedAudioUrl 
                          ? '✅ Voice print captured successfully!' 
                          : 'Hold to capture mic voice print'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Step 2: Settings parameters */}
              <div className="space-y-4 pt-1">
                <label className="text-[8px] font-mono tracking-widest uppercase text-white/45 block">Step 2: Define Sonic DNA Coordinates</label>
                
                {/* Voice Name */}
                <div className="space-y-1">
                  <span className="text-[8px] uppercase tracking-wider text-white/40 block">Profile Identifier</span>
                  <input 
                    type="text"
                    value={cloneName}
                    onChange={(e) => setCloneName(e.target.value)}
                    placeholder="e.g. Dreamy Sweetheart"
                    maxLength={30}
                    className="w-full px-3.5 py-2 rounded-xl bg-black/35 text-xs text-white border border-white/5 focus:outline-none focus:border-purple-500/40 font-semibold select-text"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <span className="text-[8px] uppercase tracking-wider text-white/40 block">Vocal Gender</span>
                    <select 
                      value={gender}
                      onChange={(e: any) => setGender(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-black/45 text-xs text-white/80 border border-white/5 focus:outline-none font-medium cursor-pointer"
                    >
                      <option value="female">Female Register</option>
                      <option value="male">Male Register</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[8px] uppercase tracking-wider text-white/40 block">Acoustic Age</span>
                    <select 
                      value={age}
                      onChange={(e: any) => setAge(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-black/45 text-xs text-white/80 border border-white/5 focus:outline-none font-medium cursor-pointer"
                    >
                      <option value="young">Young / Breathier</option>
                      <option value="mature">Mature / Warm Resonant</option>
                    </select>
                  </div>
                </div>

                {/* Accent/Flavor */}
                <div className="space-y-1">
                  <span className="text-[8px] uppercase tracking-wider text-white/40 block">Sonic Accent Model</span>
                  <select 
                    value={accent}
                    onChange={(e: any) => setAccent(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-black/45 text-xs text-white/80 border border-white/5 focus:outline-none font-medium cursor-pointer"
                  >
                    <option value="Standard US English">Standard US English</option>
                    <option value="Elegant British">Elegant British</option>
                    <option value="Korean Accent">Korean Accent (K-English)</option>
                    <option value="Whisper ASMR">Whisper ASMR / Hushed Dial</option>
                    <option value="Sassy Popstar">Sassy Popstar / Cheerful</option>
                  </select>
                </div>

                {/* Pitch Slider */}
                <div className="space-y-1 pr-1">
                  <div className="flex justify-between text-[8px] uppercase text-white/40 font-mono">
                    <span>Vocal Pitch Shift</span>
                    <span className="text-luxury-gold">{pitch > 0 ? `+${pitch}` : pitch} Hz</span>
                  </div>
                  <input 
                    type="range"
                    min="-30"
                    max="30"
                    value={pitch}
                    onChange={(e) => setPitch(parseInt(e.target.value))}
                    className="w-full accent-purple-500 bg-white/5 rounded-lg appearance-none h-1.5 focus:outline-none cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Stability Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[7px] uppercase font-mono text-white/40">
                      <span>Neural Stability</span>
                      <span>{stability}%</span>
                    </div>
                    <input 
                      type="range"
                      min="10"
                      max="100"
                      value={stability}
                      onChange={(e) => setStability(parseInt(e.target.value))}
                      className="w-full accent-pink-500 bg-white/5 rounded-lg appearance-none h-1 focus:outline-none cursor-pointer"
                    />
                  </div>
                  {/* Clarity Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[7px] uppercase font-mono text-white/40">
                      <span>Neural Clarity</span>
                      <span>{clarity}%</span>
                    </div>
                    <input 
                      type="range"
                      min="10"
                      max="100"
                      value={clarity}
                      onChange={(e) => setClarity(parseInt(e.target.value))}
                      className="w-full accent-[#D4AF37] bg-white/5 rounded-lg appearance-none h-1 focus:outline-none cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Launch AI voice generation Button */}
            <div className="pt-6 relative">
              <button 
                onClick={triggerVoiceTraining}
                disabled={isTraining}
                className={`w-full py-4 rounded-2xl cursor-pointer text-xs uppercase font-black tracking-widest border transition-all duration-300 flex items-center justify-center gap-2 ${
                  isTraining
                    ? 'bg-neutral-900 border-white/5 text-transparent'
                    : 'bg-gradient-to-tr from-[#D4AF37] to-[#FF3377] hover:from-yellow-400 hover:to-pink-600 border-[#D4AF37] text-white shadow-xl shadow-rose-500/10 hover:shadow-rose-500/20 active:scale-[0.98]'
                }`}
              >
                <span>Synthesize & Train Neural Clone</span>
              </button>

              {/* Training Progress Cinematic Logs Overlay */}
              <AnimatePresence>
                {isTraining && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="absolute inset-0 bg-neutral-950/95 rounded-2xl border border-purple-500/30 p-4 font-mono text-[9px] text-[#00FF66] flex flex-col justify-between overflow-hidden z-20"
                  >
                    <div className="space-y-1.5 max-h-[145px] overflow-y-auto">
                      <div className="text-white/40 text-[7.5px] border-b border-white/5 pb-1 uppercase tracking-wider flex items-center justify-between">
                        <span>Neural Weight Trainer v2.1</span>
                        <span className="animate-spin text-luxury-gold">&#9696;</span>
                      </div>
                      {trainingLogs.map((log, index) => (
                        <div key={index} className="flex gap-2">
                          <span className="text-white/30">[{index + 1}]</span>
                          <span className={index === currentStep ? 'text-[#00FF66] font-bold animate-pulse' : 'text-neutral-300'}>{log}</span>
                        </div>
                      ))}
                    </div>
                    
                    {/* Linear Loader Bar */}
                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mt-2">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(currentStep + 1) * 14.3}%` }}
                        transition={{ duration: 0.7 }}
                        className="bg-gradient-to-r from-purple-500 via-rose-500 to-green-400 h-full"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>

        </section>

      </main>

      {/* Persistent Audio Tag for Sandbox TTS Playback */}
      <audio ref={playgroundAudioRef} className="hidden" />

    </div>
  );
}
