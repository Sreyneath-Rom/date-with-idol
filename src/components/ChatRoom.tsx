import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Image as ImageIcon, Mic, ChevronLeft, MoreVertical, Heart, Sparkles, Phone, PhoneOff, MicOff, Volume2, Search } from 'lucide-react';
import { Idol, ChatMessage } from '../types';
import { IDOLS } from '../constants';
import { playSentSound, playReceivedSound, startRingtoneLoop, stopRingtoneLoop, playCallEndSound, speakText } from '../utils/audio';
import VoiceMessagePlayer from './VoiceMessagePlayer';
import { useFirebase } from '../lib/FirebaseContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, setDoc, doc, deleteDoc } from 'firebase/firestore';

interface Props {
  idol: Idol;
  onBack: () => void;
}

export default function ChatRoom({ idol, onBack }: Props) {
  const { user } = useFirebase();
  const [currentIdol, setCurrentIdol] = useState<Idol>(idol);
  const [activeView, setActiveView] = useState<'list' | 'room'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [callStatus, setCallStatus] = useState<'connecting' | 'connected' | 'ended'>('connecting');
  const [pendingImage, setPendingImage] = useState<{ data: string; mimeType: string; url: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeReactionMessageId, setActiveReactionMessageId] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Voice recording states and refs
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalIdRef = useRef<any>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = (reader.result as string).split(',')[1];
      setPendingImage({
        data: base64Data,
        mimeType: file.type,
        url: URL.createObjectURL(file)
      });
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };
  
  // Voice Chat Refs
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Load / Subscribe to Messages (Firebase Real-Time vs localStorage)
  useEffect(() => {
    if (user) {
      const messagesCollPath = `users/${user.uid}/chats/${currentIdol.id}/messages`;
      const q = query(
        collection(db, 'users', user.uid, 'chats', currentIdol.id, 'messages'),
        orderBy('timestamp', 'asc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
          // Put the initial welcome message into Firestore
          const welcomeMsg: ChatMessage = {
            id: '1',
            sender: 'idol',
            text: `Hey. I was just thinking about you. Did you sleep well?`,
            timestamp: Date.now() - 30000,
            type: 'text'
          };
          setDoc(doc(db, 'users', user.uid, 'chats', currentIdol.id, 'messages', '1'), welcomeMsg)
            .catch(err => handleFirestoreError(err, OperationType.WRITE, `${messagesCollPath}/1`));
        } else {
          const loaded: ChatMessage[] = [];
          snapshot.forEach((doc) => {
            loaded.push(doc.data() as ChatMessage);
          });
          setMessages(loaded);
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, messagesCollPath);
      });

      return () => unsubscribe();
    } else {
      const saved = localStorage.getItem(`kpop_idol_chat_${currentIdol.id}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
            return;
          }
        } catch (e) {
          console.error("Error parsing saved chat history:", e);
        }
      }
      setMessages([{
        id: '1',
        sender: 'idol',
        text: `Hey. I was just thinking about you. Did you sleep well?`,
        timestamp: Date.now() - 30000,
        type: 'text'
      }]);
    }
  }, [currentIdol.id, user]);

  useEffect(() => {
    if (!user && messages.length > 0) {
      localStorage.setItem(`kpop_idol_chat_${currentIdol.id}`, JSON.stringify(messages));
    }
  }, [messages, currentIdol.id, user]);

  const writeMessage = async (msg: ChatMessage) => {
    if (user) {
      const messagesCollPath = `users/${user.uid}/chats/${currentIdol.id}/messages`;
      try {
        await setDoc(doc(db, 'users', user.uid, 'chats', currentIdol.id, 'messages', msg.id), msg);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `${messagesCollPath}/${msg.id}`);
      }
    } else {
      setMessages(prev => [...prev, msg]);
    }
  };

  const updateMessageReaction = async (msgId: string, emoji: string) => {
    if (user) {
      const messagesCollPath = `users/${user.uid}/chats/${currentIdol.id}/messages`;
      try {
        await setDoc(doc(db, 'users', user.uid, 'chats', currentIdol.id, 'messages', msgId), { reaction: emoji }, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `${messagesCollPath}/${msgId}`);
      }
    } else {
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, reaction: emoji } : m));
    }
  };

  useEffect(() => {
    return () => {
      cleanupCall();
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const getChatHistoryForAPI = (chatMessages: ChatMessage[]) => {
    // Keep last 25 turns for long but highly scalable conversational memory context
    return chatMessages.slice(-25).map(m => {
      let contentText = m.text;
      if (m.type === 'image') {
        contentText = m.text ? `[Sent image attachment: "${m.text}"]` : '[Sent image attachment]';
      }
      return {
        role: m.sender === 'idol' ? 'model' : 'user',
        parts: [{ text: contentText }]
      };
    });
  };

  const pcmToBase64 = (float32Array: Float32Array) => {
    const pcm16 = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      pcm16[i] = Math.max(-1, Math.min(1, float32Array[i])) * 0x7FFF;
    }
    const uint8 = new Uint8Array(pcm16.buffer);
    let binary = '';
    for (let i = 0; i < uint8.byteLength; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    return btoa(binary);
  };

  const playAudioChunk = useCallback((base64: string) => {
    if (!audioCtxRef.current || isSpeakerMuted) return;
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const pcm16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) float32[i] = pcm16[i] / 0x7FFF;

    const buffer = audioCtxRef.current.createBuffer(1, float32.length, 16000);
    buffer.getChannelData(0).set(float32);
    const source = audioCtxRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtxRef.current.destination);

    const startTime = Math.max(audioCtxRef.current.currentTime, nextStartTimeRef.current);
    source.start(startTime);
    nextStartTimeRef.current = startTime + buffer.duration;
  }, [isSpeakerMuted]);

  const cleanupCall = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    setIsCalling(false);
    setIsMuted(false);
    setIsSpeakerMuted(false);
    playCallEndSound();
  };

  const startVoiceChat = async () => {
    setIsCalling(true);
    setCallStatus('connecting');
    startRingtoneLoop();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const audioCtx = new AudioContext({ sampleRate: 16000 });
      audioCtxRef.current = audioCtx;
      
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/api/voice-chat`);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ 
          type: 'setup', 
          idolName: currentIdol.name, 
          personality: currentIdol.personality 
        }));
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'ready') {
          stopRingtoneLoop();
          setCallStatus('connected');
          const source = audioCtx.createMediaStreamSource(stream);
          const processor = audioCtx.createScriptProcessor(4096, 1, 1);
          processorRef.current = processor;
          source.connect(processor);
          processor.connect(audioCtx.destination);

          processor.onaudioprocess = (e) => {
            if (isMuted) return;
            const base64 = pcmToBase64(e.inputBuffer.getChannelData(0));
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'audio', audio: base64 }));
            }
          };
        } else if (msg.type === 'audio') {
          playAudioChunk(msg.audio);
        } else if (msg.type === 'transcription') {
          // Could optionally show transcription
          console.log("Idol said:", msg.text);
        } else if (msg.type === 'interrupted') {
          // Interruption logic if needed
          nextStartTimeRef.current = audioCtx.currentTime;
        }
      };

      ws.onclose = () => {
        cleanupCall();
      };

    } catch (err) {
      console.error("Failed to start voice chat:", err);
      cleanupCall();
    }
  };

  const requestSelfiePhotocard = async () => {
    setIsTyping(true);
    playSentSound();
    
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'player',
      text: "📸 Send me a cute polaroid photocard, please?",
      timestamp: Date.now(),
      type: 'text'
    };

    await writeMessage(userMsg);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: "Could you send me a cute selfie photocard? Say something sweet to go along with it.",
          idolName: currentIdol.name,
          personality: currentIdol.personality,
          history: getChatHistoryForAPI(messages)
        })
      });

      const data = await response.json();
      
      setTimeout(async () => {
        setIsTyping(false);
        playReceivedSound();
        await writeMessage({
          id: (Date.now() + 1).toString(),
          sender: 'idol',
          text: data.text || "Here is a cute polaroid portrait I just took for you! 💖",
          timestamp: Date.now(),
          type: 'image',
          imageUrl: currentIdol.image
        });
      }, 1500);
      
    } catch (error) {
      console.error(error);
      setIsTyping(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const options = { mimeType: 'audio/webm' };
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, options);
      } catch (e) {
        // Fallback for Safari etc.
        recorder = new MediaRecorder(stream);
      }
      
      mediaRecorderRef.current = recorder;
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        // Stop all tracks on the stream
        stream.getTracks().forEach(track => track.stop());
        
        // Use latest closure/state value for duration or read duration dynamically
        const recordedDur = recordingDuration;
        // Check if there is anything recorded
        if (audioChunksRef.current.length > 0) {
          await sendVoiceMessage(audioBlob);
        }
      };

      setRecordingDuration(0);
      setIsRecording(true);
      recorder.start();
      
      let secondsCount = 0;
      recordingIntervalIdRef.current = setInterval(() => {
        secondsCount++;
        setRecordingDuration(secondsCount);
        if (secondsCount >= 15) {
          // Reached max 15s limit - stop recording automatically
          if (recordingIntervalIdRef.current) {
            clearInterval(recordingIntervalIdRef.current);
            recordingIntervalIdRef.current = null;
          }
          if (recorder && recorder.state !== 'inactive') {
            recorder.stop();
          }
          setIsRecording(false);
        }
      }, 1000);

    } catch (err) {
      console.error("Failed to start voice message recording:", err);
    }
  };

  const stopRecording = () => {
    if (recordingIntervalIdRef.current) {
      clearInterval(recordingIntervalIdRef.current);
      recordingIntervalIdRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const cancelRecording = () => {
    if (recordingIntervalIdRef.current) {
      clearInterval(recordingIntervalIdRef.current);
      recordingIntervalIdRef.current = null;
    }
    audioChunksRef.current = [];
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state !== 'inactive') {
        // Prevent sending on un-intended onstop trigger
        mediaRecorderRef.current.onstop = () => {
          if (mediaRecorderRef.current?.stream) {
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
          }
        };
        mediaRecorderRef.current.stop();
      }
    }
    setIsRecording(false);
    setRecordingDuration(0);
  };

  const sendVoiceMessage = async (audioBlob: Blob) => {
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Url = reader.result as string; 
        const durationSec = recordingDuration || 1; // Fallback to 1 if 0
        
        const userMsgId = Date.now().toString();
        const userMsg: ChatMessage = {
          id: userMsgId,
          sender: 'player',
          text: `🎤 Voice message (${durationSec}s)`,
          timestamp: Date.now(),
          type: 'voice',
          audioUrl: base64Url,
          audioDuration: durationSec
        };

        await writeMessage(userMsg);
        playSentSound();
        setIsTyping(true);

        try {
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: `🎤 [User recorded and sent a ${durationSec}-second voice clip message]`,
              idolName: currentIdol.name,
              personality: currentIdol.personality,
              history: getChatHistoryForAPI(messages)
            })
          });

          const data = await response.json();
          
          setTimeout(async () => {
            setIsTyping(false);
            playReceivedSound();
            await writeMessage({
              id: (Date.now() + 1).toString(),
              sender: 'idol',
              text: data.text || `Hearing your sweet voice is my absolute favorite part of the day! It makes me feel so much closer to you, darling. 💖`,
              timestamp: Date.now(),
              type: 'text'
            });
          }, 1500);
          
        } catch (error) {
          console.error("AI chat API failed on voice response:", error);
          setIsTyping(false);
        }
      };
      
      reader.readAsDataURL(audioBlob);
    } catch (e) {
      console.error("Failed to process recorded audio blob:", e);
    }
  };

  const handleSend = async () => {
    if (!input.trim() && !pendingImage) return;

    const userMsgId = Date.now().toString();
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'player',
      text: input,
      timestamp: Date.now(),
      type: pendingImage ? 'image' : 'text',
      imageUrl: pendingImage ? pendingImage.url : undefined
    };

    const sentInput = input;
    const sentImage = pendingImage;

    await writeMessage(userMsg);
    playSentSound();
    setInput('');
    setPendingImage(null);
    setIsTyping(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: sentInput,
          idolName: currentIdol.name,
          personality: currentIdol.personality,
          image: sentImage ? { data: sentImage.data, mimeType: sentImage.mimeType } : undefined,
          history: getChatHistoryForAPI(messages)
        })
      });

      const data = await response.json();
      
      // Artificial delay for "realism"
      setTimeout(async () => {
        setIsTyping(false);
        playReceivedSound();
        await writeMessage({
          id: (Date.now() + 1).toString(),
          sender: 'idol',
          text: data.text,
          timestamp: Date.now(),
          type: 'text'
        });
      }, 1500);
      
    } catch (error) {
      console.error(error);
      setIsTyping(true); // reset
      setIsTyping(false);
    }
  };

  const formatRelativeTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getLatestInfo = (item: Idol) => {
    const saved = localStorage.getItem(`kpop_idol_chat_${item.id}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const last = parsed[parsed.length - 1];
          return {
            text: last.text || "📸 Polaroid Sent",
            timestamp: last.timestamp,
            hasHistory: true
          };
        }
      } catch (e) {}
    }
    return {
      text: item.voiceIntro,
      timestamp: Date.now() - 7200000,
      hasHistory: false
    };
  };

  return (
    <div 
      className="min-h-screen bg-luxury-black flex flex-col relative overflow-hidden"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {activeView === 'list' ? (
        <>
          {/* Header of Inbox */}
          <header className="glass p-4 md:p-6 pt-10 md:pt-12 flex items-center justify-between z-10 border-b border-white/5">
            <div className="flex items-center gap-3">
              <button onClick={onBack} className="p-2 -ml-2 text-white/60 hover:text-white transition-colors" title="Back to Hub">
                <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
              </button>
              <div>
                <h1 className="font-display font-black text-lg md:text-xl text-white tracking-widest uppercase flex items-center gap-1.5 leading-none">
                  <span className="bg-gradient-to-r from-luxury-magenta to-luxury-gold bg-clip-text text-transparent gap-1">Bubble</span>
                  <span className="text-[9px] text-luxury-gold uppercase px-1.5 py-0.5 rounded bg-luxury-gold/10 font-bold border border-luxury-gold/20 tracking-normal">Portal</span>
                </h1>
                <p className="text-[9px] md:text-[10px] uppercase tracking-wider text-white/30 font-medium">TWICE Private Channels</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-luxury-magenta/10 text-luxury-magenta border border-luxury-magenta/20 px-2.5 py-1 rounded-full">
                <Heart className="w-3 h-3 fill-luxury-magenta/30" />
                <span className="text-[9px] font-black uppercase tracking-wider">LIVE</span>
              </div>
            </div>
          </header>

          {/* Inbox Main List */}
          <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
            {/* Search Filter Panel */}
            <div className="relative">
              <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-white/20">
                <Search size={14} />
              </div>
              <input
                type="text"
                placeholder="Search Twice member..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 md:py-3.5 bg-white/[0.03] border border-white/10 rounded-2xl text-xs md:text-sm font-medium text-white/90 placeholder:text-white/25 focus:ring-1 focus:ring-luxury-gold/30 focus:border-luxury-gold/40 focus:bg-white/[0.05] inline-outline-none outline-none transition-all"
              />
            </div>

            {/* List items loop */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
              <AnimatePresence mode="popLayout">
                {IDOLS.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((item, idx) => {
                    const info = getLatestInfo(item);
                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ delay: idx * 0.04 }}
                        onClick={() => {
                          setCurrentIdol(item);
                          setActiveView('room');
                          playSentSound();
                        }}
                        className={`p-4 rounded-3xl glass hover:border-luxury-gold/30 transition-all duration-300 flex items-center justify-between cursor-pointer group hover:bg-white/[0.015] relative overflow-hidden border border-white/5 shadow-md ${
                          item.id === currentIdol.id ? 'border-luxury-magenta/20 bg-luxury-magenta/[0.005]' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3.5 max-w-[70%]">
                          <div className="relative flex-shrink-0">
                            <div className="absolute inset-0 bg-green-500 rounded-2xl blur-md opacity-25 group-hover:opacity-40 animate-pulse-soft transition-all" />
                            <div className="w-12 h-12 rounded-2xl bg-cover bg-center border border-white/20 select-none relative z-10 shadow-inner group-hover:scale-105 transition-transform" style={{ backgroundImage: `url(${item.image})` }} />
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-luxury-black rounded-full z-20" />
                          </div>

                          <div className="space-y-1 overflow-hidden">
                            <div className="flex items-center gap-2">
                              <h3 className="font-display font-bold text-sm md:text-base text-white group-hover:text-luxury-gold tracking-tight transition-colors truncate">{item.name}</h3>
                              <span className="text-[7.5px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-luxury-magenta/10 border border-luxury-magenta/20 text-luxury-magenta leading-none truncate">{item.personalityTag}</span>
                            </div>
                            <p className="text-[11px] md:text-xs text-white/45 truncate leading-tight group-hover:text-white/60 transition-colors">
                              {info.text}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end justify-between gap-1 h-12 flex-shrink-0 relative z-10">
                          <span className="text-[7.5px] md:text-[8px] font-mono text-white/30 font-medium whitespace-nowrap">
                            {formatRelativeTime(info.timestamp)}
                          </span>
                          
                          <div className="flex items-center gap-1 bg-luxury-gold/5 px-2 py-0.5 rounded-full border border-luxury-gold/20">
                            <Heart className="w-2 h-2 text-rose-500 fill-rose-500/30" />
                            <span className="text-[8px] font-mono font-bold text-luxury-gold leading-none">{item.difficulty * 10}%</span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
              </AnimatePresence>
            </div>
          </main>
        </>
      ) : (
        <>
          {/* ROMAN CHAT ROOM VIEW */}
          <header className="glass p-4 md:p-6 pt-10 md:pt-12 flex items-center justify-between z-10 border-b border-white/5">
            <div className="flex items-center gap-3 md:gap-4">
              <button 
                onClick={() => { playCallEndSound(); setActiveView('list'); }} 
                className="p-2 -ml-2 text-white/60 hover:text-white transition-colors animate-fade-in"
                title="Back to Inbox"
              >
                <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
              </button>
              <div className="relative">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-cover bg-center border border-white/10" style={{ backgroundImage: `url(${currentIdol.image})` }} />
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 md:w-4 md:h-4 bg-green-500 border-2 border-luxury-black rounded-full" />
              </div>
              <div>
                <h3 className="font-display font-bold text-base md:text-lg leading-tight">{currentIdol.name}</h3>
                <div className="flex items-center gap-1.5">
                  <span className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[8px] md:text-[10px] uppercase tracking-widest text-white/40 font-bold leading-none">Online</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 md:gap-2 relative">
              <button 
                onClick={startVoiceChat}
                className="p-2.5 md:p-3 glass-gold rounded-full text-luxury-gold hover:scale-110 active:scale-95 transition-all outline-none"
                title="Start Voice Call"
              >
                <Phone size={16} fill="currentColor" className="opacity-20 animate-pulse-soft" />
              </button>
              <div className="hidden sm:flex glass-gold px-3 py-1.5 rounded-full items-center gap-2 border-luxury-magenta/30">
                <Heart size={12} className="text-luxury-magenta fill-luxury-magenta/20" />
                <span className="text-[10px] font-bold text-luxury-magenta">{currentIdol.difficulty * 10}%</span>
              </div>
              
              <button 
                onClick={() => setShowMenu(prev => !prev)}
                className="p-1.5 md:p-2 text-white/40 hover:text-white transition-colors"
                title="Chat Options"
              >
                <MoreVertical size={20} />
              </button>

              <AnimatePresence>
                {showMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-20" 
                      onClick={() => setShowMenu(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      className="absolute right-0 top-12 z-30 w-48 glass rounded-2xl border border-white/10 shadow-2xl p-2.5 bg-luxury-black/95 backdrop-blur-xl"
                    >
                      <button
                        onClick={() => {
                          requestSelfiePhotocard();
                          setShowMenu(false);
                        }}
                        className="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-white/5 text-xs text-white/80 hover:text-white flex items-center gap-2 transition-colors font-medium hover:text-luxury-gold"
                      >
                        <Sparkles size={14} className="text-luxury-gold" />
                        Request Polaroid Selfie
                      </button>
                      <div className="h-[1px] bg-white/5 my-1" />
                      <button
                        onClick={async () => {
                          const defaultMsg: ChatMessage = {
                            id: '1',
                            sender: 'idol',
                            text: `Hey. I was just thinking about you. Did you sleep well?`,
                            timestamp: Date.now(),
                            type: 'text'
                          };
                          if (user) {
                            // Purge history documents
                            for (const m of messages) {
                              deleteDoc(doc(db, 'users', user.uid, 'chats', currentIdol.id, 'messages', m.id))
                                .catch(err => handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/chats/${currentIdol.id}/messages/${m.id}`));
                            }
                            // Re-seed welcome card
                            await writeMessage(defaultMsg);
                          } else {
                            setMessages([defaultMsg]);
                            localStorage.setItem(`kpop_idol_chat_${currentIdol.id}`, JSON.stringify([defaultMsg]));
                          }
                          setShowMenu(false);
                        }}
                        className="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-rose-500/10 text-xs text-rose-400 hover:text-rose-300 flex items-center gap-2 transition-colors font-medium"
                      >
                        <Heart size={14} className="text-rose-500" />
                        Reset Chat History
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </header>

          {/* Messages Scroll Feed */}
          <main 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 md:space-y-8 scrolling-content-fade"
          >
            <div className="h-2" /> 
            <AnimatePresence>
              {messages.map((msg, idx) => (
                <motion.div
                  key={msg.id}
                  initial={{ 
                    opacity: 0, 
                    y: 15, 
                    scale: 0.8, 
                    originX: msg.sender === 'idol' ? 0 : 1,
                    originY: 0
                  }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ 
                    type: 'spring',
                    damping: 20,
                    stiffness: 200,
                    delay: 0.05
                  }}
                  className={`flex ${msg.sender === 'idol' ? 'justify-start' : 'justify-end'} relative`}
                >
                  <div 
                    onClick={() => setActiveReactionMessageId(activeReactionMessageId === msg.id ? null : msg.id)}
                    className={`max-w-[85%] p-4 rounded-[2rem] shadow-lg relative cursor-pointer select-none group hover:brightness-105 transition-all ${
                      msg.sender === 'idol' && msg.type === 'image'
                        ? 'p-3 bg-white text-neutral-900 rounded-lg shadow-xl border border-white/50 flex flex-col items-center rotate-1 hover:rotate-0 transition-all duration-300'
                        : msg.sender === 'idol'
                          ? 'glass rounded-tl-sm text-white/90 border-luxury-magenta/10'
                          : 'bg-gradient-to-tr from-luxury-magenta to-luxury-gold rounded-tr-sm text-white font-medium'
                    }`}
                  >
                    {/* Floating Reaction Selector Popover */}
                    <AnimatePresence>
                      {activeReactionMessageId === msg.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.8, y: 10 }}
                          className="absolute -top-12 z-20 flex gap-1.5 p-1.5 rounded-full glass border border-luxury-gold/50 shadow-[0_4px_20px_rgba(255,51,119,0.4)] bg-luxury-black/95"
                          style={{ left: msg.sender === 'idol' ? '12px' : 'auto', right: msg.sender === 'player' ? '12px' : 'auto' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {['❤️', '✨', '😍', '😘', '😭', '🔥'].map((emoji) => (
                            <button
                              key={emoji}
                              onClick={async (e) => {
                                e.stopPropagation();
                                await updateMessageReaction(msg.id, emoji);
                                setActiveReactionMessageId(null);
                              }}
                              className="hover:scale-130 active:scale-95 transition-transform text-base md:text-lg px-1 md:px-1.5"
                            >
                              {emoji}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Private Bubble Badge */}
                    {msg.sender === 'idol' && msg.type !== 'image' && (
                      <div className="flex items-center gap-1 mb-2 opacity-40">
                        <Sparkles size={8} />
                        <span className="text-[8px] uppercase tracking-tighter font-bold text-luxury-gold">Private Bubble</span>
                      </div>
                    )}
                    
                    {/* Image Body Rendering */}
                    {msg.imageUrl && (
                      msg.sender === 'idol' && msg.type === 'image' ? (
                        <div className="flex flex-col items-center">
                          <div className="w-52 h-52 md:w-60 md:h-60 overflow-hidden rounded-md bg-stone-100 border border-stone-205 shadow-inner relative">
                            <img 
                              src={msg.imageUrl} 
                              alt="Selfie Polaroid" 
                              className="w-full h-full object-cover filter brightness-[1.02] contrast-[0.98]"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-luxury-magenta/90 text-white font-display text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full shadow-md backdrop-blur">
                              <Sparkles size={6} />
                              Photocard
                            </div>
                          </div>
                          
                          {msg.text && (
                            <div className="mt-3.5 px-1 max-w-[210px] text-center font-serif text-neutral-800 text-xs md:text-sm font-light leading-relaxed italic tracking-wide">
                              "{msg.text}"
                            </div>
                          )}
                          <div className="mt-2 text-center text-rose-500 font-display font-medium tracking-widest text-[9px] uppercase opacity-75">
                            ♥ {currentIdol.name} Signature
                          </div>
                        </div>
                      ) : (
                        <div className="relative mb-2.5 overflow-hidden rounded-[1.5rem] border border-white/20 shadow-inner max-w-sm">
                          <img 
                            src={msg.imageUrl} 
                            alt="Shared Photo" 
                            className="w-full h-auto max-h-56 object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )
                    )}

                    {/* Voice Message Player or Normal Text Rendering */}
                    {msg.type === 'voice' && msg.audioUrl ? (
                      <VoiceMessagePlayer 
                        audioUrl={msg.audioUrl}
                        sender={msg.sender}
                        isActive={playingAudioId === msg.id}
                        onPlay={() => setPlayingAudioId(msg.id)}
                        onPause={() => {
                          if (playingAudioId === msg.id) setPlayingAudioId(null);
                        }}
                      />
                    ) : !(msg.sender === 'idol' && msg.type === 'image') && (
                      <p className="text-sm leading-relaxed overflow-hidden">
                        {msg.sender === 'idol' && idx === messages.length - 1 ? (
                          msg.text.split('').map((char, i) => (
                            <motion.span
                              key={i}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.05, delay: i * 0.02 }}
                            >
                              {char}
                            </motion.span>
                          ))
                        ) : (
                          msg.text
                        )}
                      </p>
                    )}

                    {/* Dynamic Timestamp or Sound Read-aloud speaker action */}
                    <div className={`flex items-center gap-2 mt-2 opacity-30 ${msg.sender === 'player' ? 'justify-end' : 'justify-between'} ${msg.sender === 'idol' && msg.type === 'image' ? 'text-black/50 justify-center' : ''}`}>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8px] font-mono font-medium">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {msg.sender === 'idol' && msg.type !== 'image' && msg.type !== 'voice' && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              speakText(msg.text, currentIdol.name);
                            }}
                            className="hover:text-luxury-gold hover:scale-130 transition-all p-0.5 cursor-pointer"
                            title="Speak with Star Vocals"
                          >
                            <Volume2 size={10} className="text-white hover:text-luxury-gold" />
                          </button>
                        )}
                      </div>
                      {msg.sender === 'player' && <div className="w-1 h-1 rounded-full bg-white" />}
                    </div>

                    {msg.reaction && (
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className={`absolute -bottom-2 z-10 p-1 rounded-full bg-neutral-900 border border-white/10 shadow-lg flex items-center justify-center text-xs w-6 h-6 hover:scale-110 active:scale-95 transition-transform ${
                          msg.sender === 'idol' ? 'right-4' : 'left-4'
                        }`}
                      >
                        {msg.reaction}
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              ))}
              
              {isTyping && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="glass p-4 rounded-3xl rounded-tl-none flex gap-1 items-center">
                    <div className="w-1.5 h-1.5 bg-luxury-magenta/50 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-1.5 h-1.5 bg-luxury-magenta/50 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-1.5 h-1.5 bg-luxury-magenta/50 rounded-full animate-bounce" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="h-12" /> 
          </main>

          {/* Typing Footer */}
          <footer className="glass-gold p-4 md:p-6 pt-3 md:pt-4 rounded-t-[2rem] md:rounded-t-[2.5rem] mt-auto">
            {pendingImage && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-3.5 flex items-center justify-between p-2 rounded-2xl bg-white/5 border border-white/10"
              >
                <div className="flex items-center gap-3">
                  <img src={pendingImage.url} alt="upload preview" className="w-12 h-12 rounded-xl object-cover border border-white/20" />
                  <div>
                    <p className="text-[10px] text-white/50 uppercase tracking-widest font-black">Image Preview</p>
                    <p className="text-[11px] text-white/85 font-medium">Ready to share image... ✨</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    if (pendingImage.url) URL.revokeObjectURL(pendingImage.url);
                    setPendingImage(null);
                  }}
                  className="px-3.5 py-1.5 text-[9px] uppercase tracking-widest font-bold text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors"
                >
                  Remove
                </button>
              </motion.div>
            )}

            {isRecording ? (
              <div className="flex items-center gap-2 w-full animate-pulse-soft">
                <div className="flex-1 glass border border-luxury-magenta/30 px-4 py-3 rounded-xl md:rounded-2xl flex items-center justify-between shadow-[0_0_15px_rgba(255,51,119,0.15)] bg-luxury-black/60">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
                    <div className="text-[10px] md:text-xs font-bold text-white tracking-widest uppercase select-none">
                      Recording Voice...
                    </div>
                    <div className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-luxury-gold">
                      {recordingDuration}s / 15s
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={cancelRecording}
                      className="px-3.5 py-1.5 text-[8px] uppercase tracking-widest font-black bg-white/5 hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 rounded-full border border-rose-500/20 transition-all cursor-pointer"
                    >
                      Cancel
                    </button>

                    <button
                      onClick={stopRecording}
                      className="px-4 py-1.5 text-[8px] uppercase tracking-widest font-black bg-luxury-magenta hover:bg-luxury-magenta/90 text-white rounded-full transition-all border border-luxury-magenta/20 flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(255,51,119,0.25)]"
                    >
                      <div className="w-1.5 h-1.5 bg-white rounded-sm" />
                      Send Memo
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 md:gap-3">
                <input 
                  type="file" 
                  id="chat-photo-attachments" 
                  className="hidden" 
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFile(e.target.files[0]);
                    }
                  }}
                />
                <label 
                  htmlFor="chat-photo-attachments"
                  className="p-3 glass rounded-xl md:rounded-2xl text-luxury-gold hover:scale-115 active:scale-90 transition-transform cursor-pointer flex items-center justify-center shadow-lg"
                >
                  <ImageIcon className="w-4 h-4 md:w-5 md:h-5" />
                </label>

                <button 
                  onClick={requestSelfiePhotocard}
                  className="p-3 glass rounded-xl md:rounded-2xl text-luxury-gold hover:scale-115 active:scale-90 transition-all flex items-center justify-center gap-1.5 shadow-lg border border-luxury-gold/10"
                  title="Request Photocard Selfie"
                >
                  <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-luxury-gold icon-pulse animate-pulse" />
                  <span className="hidden sm:inline text-[9px] uppercase tracking-widest font-black">Selfie</span>
                </button>

                <div className="flex-1 glass rounded-xl md:rounded-2xl flex items-center px-3 md:px-4 overflow-hidden focus-within:border-luxury-gold/50 transition-all">
                  <input 
                    type="text" 
                    placeholder={pendingImage ? "Type note for your picture (optional)..." : `Write to ${currentIdol.name}...`}
                    className="flex-1 py-3 md:py-4 bg-transparent border-none outline-none text-xs md:text-sm font-medium placeholder:text-white/20"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  />
                  <button 
                    onClick={startRecording}
                    className="text-white/20 hover:text-luxury-gold transition-colors"
                    title="Record Voice Memo"
                  >
                    <Mic className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                </div>
                <button 
                  onClick={handleSend}
                  disabled={!input.trim() && !pendingImage}
                  className="p-3.5 md:p-4 bg-luxury-magenta text-white rounded-xl md:rounded-2xl hover:scale-115 active:scale-[0.9] transition-transform disabled:opacity-40 disabled:scale-100 shadow-[0_0_20px_rgba(255,51,119,0.3)]"
                >
                  <Send className="w-4 h-4 md:w-5 md:h-5" />
                </button>
              </div>
            )}
          </footer>
        </>
      )}

      {/* Voice Call Overlay */}
      <AnimatePresence>
        {isCalling && (
          <motion.div 
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="absolute inset-0 z-50 bg-luxury-black/98 flex flex-col items-center justify-between p-8 md:p-12 text-center"
          >
            <div className="space-y-4 md:space-y-6 mt-8 md:mt-16">
              <div className="relative mx-auto w-32 h-32 sm:w-44 sm:h-44 md:w-52 md:h-52">
                <motion.div 
                  animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="absolute inset-0 bg-luxury-magenta rounded-full blur-[50px] md:blur-[80px]"
                />
                <div 
                  className="relative w-32 h-32 sm:w-44 sm:h-44 md:w-52 md:h-52 rounded-full border-4 border-luxury-gold/20 bg-cover bg-center overflow-hidden shadow-[0_0_30px_rgba(212,175,55,0.2)]"
                  style={{ backgroundImage: `url(${currentIdol.image})` }}
                />
                <div className="absolute -bottom-1 -right-1 md:-bottom-2 md:-right-2 w-8 h-8 md:w-14 md:h-14 glass-gold rounded-full flex items-center justify-center border-luxury-magenta/30">
                  <Heart className="text-luxury-magenta fill-luxury-magenta/20 w-3 h-3 md:w-6 md:h-6 animate-pulse" />
                </div>
              </div>
              <div className="px-4">
                <h2 className="font-display font-black text-xl md:text-3xl lg:text-4xl text-white tracking-tight mb-1 md:mb-2 uppercase">{currentIdol.name}</h2>
                <div className="flex items-center justify-center gap-2 md:gap-3">
                  <span className={`w-1 h-1 md:w-2 md:h-2 rounded-full ${callStatus === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-luxury-gold/50'}`} />
                  <p className="text-luxury-gold tracking-[0.2em] md:tracking-[0.3em] text-[7px] md:text-[10px] uppercase font-bold">
                    {callStatus === 'connecting' ? 'Connecting...' : 'Secure Private Line'}
                  </p>
                </div>
              </div>
            </div>

            <div className="w-full max-w-sm space-y-6 md:space-y-12 mb-8 md:mb-12">
              <div className="flex justify-center items-end gap-1 md:gap-2 h-10 md:h-16">
                {[...Array(10)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ 
                      height: callStatus === 'connected' ? [10, Math.random() * 40 + 10, 10] : 8,
                      opacity: callStatus === 'connected' ? [0.3, 1, 0.3] : 0.2
                    }}
                    transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.05 }}
                    className="w-1 md:w-1.5 rounded-full bg-gradient-to-t from-luxury-magenta to-luxury-gold"
                  />
                ))}
              </div>

              <div className="flex justify-around items-center px-2 md:px-4">
                <div className="flex flex-col items-center gap-2">
                  <button 
                    onClick={() => setIsMuted(!isMuted)}
                    className={`p-4 md:p-6 rounded-full transition-all duration-300 ${isMuted ? 'bg-luxury-magenta text-white shadow-[0_0_20px_rgba(255,51,119,0.4)]' : 'glass text-white/60 hover:text-white'}`}
                  >
                    {isMuted ? <MicOff className="w-5 h-5 md:w-6 md:h-6" /> : <Mic className="w-5 h-5 md:w-6 md:h-6" />}
                  </button>
                  <span className="text-[7px] md:text-[8px] uppercase tracking-widest text-white/40 font-bold">{isMuted ? 'Unmute' : 'Mute'}</span>
                </div>

                <button 
                  onClick={cleanupCall}
                  className="p-6 md:p-8 bg-gradient-to-br from-red-600 to-rose-700 text-white rounded-full hover:scale-110 active:scale-95 transition-all shadow-[0_0_30px_rgba(225,29,72,0.4)] group"
                >
                  <PhoneOff className="w-6 h-6 md:w-8 md:h-8 group-hover:rotate-12 transition-transform" />
                </button>

                <div className="flex flex-col items-center gap-2">
                  <button 
                    onClick={() => setIsSpeakerMuted(!isSpeakerMuted)}
                    className={`p-4 md:p-6 rounded-full transition-all duration-300 ${isSpeakerMuted ? 'bg-white/20 text-white shadow-[0_0_20px_rgba(255,255,255,0.2)]' : 'glass text-white/60 hover:text-white'}`}
                  >
                    <Volume2 className={`w-5 h-5 md:w-6 md:h-6 ${isSpeakerMuted ? 'opacity-40' : ''}`} />
                  </button>
                  <span className="text-[7px] md:text-[8px] uppercase tracking-widest text-white/40 font-bold">{isSpeakerMuted ? 'Sound On' : 'Sound Off'}</span>
                </div>
              </div>
              
              <p className="text-[8px] text-white/20 uppercase tracking-[0.3em] font-medium">Session ID: {Math.random().toString(16).slice(2, 10).toUpperCase()}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Photo Drag Over Modal */}
      <AnimatePresence>
        {isDragging && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 bg-luxury-black/90 flex flex-col items-center justify-center p-8 text-center pointer-events-none"
          >
            <div className="border-2 border-dashed border-luxury-gold/50 rounded-2xl p-10 max-w-sm flex flex-col items-center gap-5 bg-luxury-black/50 backdrop-blur-md">
              <motion.div
                animate={{ scale: [1, 1.1, 1], rotate: [0, 4, -4, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <ImageIcon className="w-12 h-12 text-luxury-magenta" />
              </motion.div>
              <div className="space-y-1.5">
                <h3 className="font-display font-bold text-lg text-white uppercase tracking-wider">Share photo</h3>
                <p className="text-white/65 text-xs leading-relaxed">
                  Drop your file here to upload and show it to <strong className="text-luxury-gold uppercase">{currentIdol.name}</strong>
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
