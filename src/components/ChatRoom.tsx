import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Image as ImageIcon, Mic, ChevronLeft, MoreVertical, Heart, Sparkles, Phone, PhoneOff, MicOff, Volume2, Search, Calendar, Award, Smile, Check } from 'lucide-react';
import { Idol, ChatMessage, GroupChat } from '../types';
import { IDOLS, GROUP_CHATS } from '../constants';
import { playSentSound, playReceivedSound, startRingtoneLoop, stopRingtoneLoop, playCallEndSound, speakText } from '../utils/audio';
import VoiceMessagePlayer from './VoiceMessagePlayer';
import MiniVoicePlayer from './MiniVoicePlayer';
import { useFirebase } from '../lib/FirebaseContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, setDoc, doc, deleteDoc } from 'firebase/firestore';

interface Props {
  idol: Idol;
  onBack: () => void;
}

const WALLPAPERS: { id: string; name: string; gradient: string; preview: string; textClass: string }[] = [
  {
    id: 'midnight',
    name: 'Midnight Slate',
    gradient: 'radial-gradient(circle at top, #090e1a 0%, #03050a 60%, #010204 100%)',
    preview: 'bg-gradient-to-tr from-slate-900 via-neutral-900 to-black',
    textClass: 'text-white/40'
  },
  {
    id: 'peach',
    name: 'Sweet Peach Pink',
    gradient: 'radial-gradient(circle at top left, #2c121e 0%, #12040c 70%, #0a0106 100%)',
    preview: 'bg-gradient-to-tr from-pink-950 via-rose-950 to-neutral-950',
    textClass: 'text-pink-300/40'
  },
  {
    id: 'celestial',
    name: 'Celestial Violet',
    gradient: 'radial-gradient(circle at top right, #1a1236 0%, #080314 75%, #020106 100%)',
    preview: 'bg-gradient-to-tr from-violet-950 via-indigo-950 to-stone-950',
    textClass: 'text-violet-300/40'
  },
  {
    id: 'sunset',
    name: 'Sunset Cafe',
    gradient: 'radial-gradient(circle at top left, #29180c 0%, #0e0501 70%, #050100 100%)',
    preview: 'bg-gradient-to-tr from-amber-950 via-yellow-950 to-slate-950',
    textClass: 'text-amber-300/40'
  }
];

const IDOL_STATUSES: Record<string, { status: string; mbti: string; favoriteEmoji: string }> = {
  nayeon: { status: "🐰 Solo comeback practice! Eat yummy things candy!", mbti: "ISTP", favoriteEmoji: "🍬" },
  jeongyeon: { status: "💚 Legos & peace of mind. Fighting today! 🚙", mbti: "ISFJ", favoriteEmoji: "🧱" },
  momo: { status: "💃 Dancing 24/7. Peach-momo is super hungry!", mbti: "INFP", favoriteEmoji: "🥟" },
  sana: { status: "🌸 No Sana No Life! Sweet heart flutter bubble time!", mbti: "ENFP", favoriteEmoji: "🥰" },
  jihyo: { status: "🎙️ God Jihyo power is with you! Lead with passion! ✨", mbti: "ESFP", favoriteEmoji: "✨" },
  mina: { status: "🐧 Quiet gaming sessions and sweet hot tea.", mbti: "ISFP", favoriteEmoji: "🎮" },
  dahyun: { status: "😄 Smile wide! Catching your attention camera-style!", mbti: "ISFJ", favoriteEmoji: "📸" },
  chaeyoung: { status: "🍓 Sketching beautiful strawberries. Acoustic riffs on repeat.", mbti: "INFP", favoriteEmoji: "🎨" },
  tzuyu: { status: "👑 Graceful thoughts. Wishing you raw peace.", mbti: "ISFP", favoriteEmoji: "🐶" }
};

export default function ChatRoom({ idol, onBack }: Props) {
  const { user } = useFirebase();
  const [currentIdol, setCurrentIdol] = useState<Idol>(idol);
  const [currentGroup, setCurrentGroup] = useState<GroupChat | null>(null);
  const [activeTab, setActiveTab] = useState<'direct' | 'group'>('direct');
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
  const [showProfileCard, setShowProfileCard] = useState(false);
  const [selectedWallpaperId, setSelectedWallpaperId] = useState<string>(() => {
    const activeChatId = currentGroup ? currentGroup.id : currentIdol.id;
    return localStorage.getItem(`bubble_wallpaper_${activeChatId}`) || 'midnight';
  });
  const [subscriptionDays, setSubscriptionDays] = useState<number>(() => {
    const activeChatId = currentGroup ? currentGroup.id : currentIdol.id;
    const key = `bubble_sub_days_${activeChatId}`;
    const saved = localStorage.getItem(key);
    if (saved) return parseInt(saved, 10);
    const generated = Math.floor(Math.random() * 150) + 45; // between 45 and 195 days
    localStorage.setItem(key, String(generated));
    return generated;
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  // Voice recording states and refs
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  const [isAway, setIsAway] = useState(false);
  const [replyingToMessage, setReplyingToMessage] = useState<ChatMessage | null>(null);

  // Floating hearts effect state and helpers
  const [floatingHearts, setFloatingHearts] = useState<{ id: string; x: number; size: number; delay: number; color: string; rotate: number }[]>([]);

  const triggerHearts = useCallback(() => {
    const colors = [
      'text-rose-500', 
      'text-pink-500', 
      'text-red-500', 
      'text-rose-400', 
      'text-pink-400', 
      'text-rose-300'
    ];
    
    const count = 12;
    const newHearts = Array.from({ length: count }).map((_, i) => ({
      id: `${Date.now()}-${i}-${Math.random()}`,
      x: Math.random() * 80 + 10, // horizontal start in %
      size: Math.random() * 16 + 14, // size in px
      delay: Math.random() * 0.4, // stagger delay
      color: colors[Math.floor(Math.random() * colors.length)],
      rotate: Math.random() * 40 - 20
    }));
    
    setFloatingHearts(prev => [...prev, ...newHearts]);
  }, []);

  const removeHeart = useCallback((id: string) => {
    setFloatingHearts(prev => prev.filter(h => h.id !== id));
  }, []);

  const triggerHaptic = useCallback((pattern: number | number[] = 10) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    const checkStatus = () => {
      const lastMsg = messages[messages.length - 1];
      if (!lastMsg) {
        setIsAway(false);
        return;
      }
      const diffMs = Date.now() - lastMsg.timestamp;
      // If the last message was sent more than 2 minutes (120,000 ms) ago, show "Away"
      setIsAway(diffMs > 120000);
    };

    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [messages]);

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
    const chatId = currentGroup ? currentGroup.id : currentIdol.id;
    if (user) {
      const messagesCollPath = `users/${user.uid}/chats/${chatId}/messages`;
      const q = query(
        collection(db, 'users', user.uid, 'chats', chatId, 'messages'),
        orderBy('timestamp', 'asc')
      );
 
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
          // Put the initial welcome message into Firestore
          const firstMemberId = currentGroup ? currentGroup.members[0] : currentIdol.id;
          const firstMemberName = currentGroup ? (IDOLS.find(i => i.id === firstMemberId)?.name || currentGroup.name) : currentIdol.name;
          const welcomeMsg: ChatMessage = {
            id: '1',
            sender: 'idol',
            senderId: firstMemberId,
            senderName: firstMemberName,
            text: currentGroup ? currentGroup.voiceIntro : `Hey. I was just thinking about you. Did you sleep well?`,
            timestamp: Date.now() - 30000,
            type: 'text'
          };
          setDoc(doc(db, 'users', user.uid, 'chats', chatId, 'messages', '1'), welcomeMsg)
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
      const saved = localStorage.getItem(`kpop_idol_chat_${chatId}`);
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
      
      const firstMemberId = currentGroup ? currentGroup.members[0] : currentIdol.id;
      const firstMemberName = currentGroup ? (IDOLS.find(i => i.id === firstMemberId)?.name || currentGroup.name) : currentIdol.name;
      setMessages([{
        id: '1',
        sender: 'idol',
        senderId: firstMemberId,
        senderName: firstMemberName,
        text: currentGroup ? currentGroup.voiceIntro : `Hey. I was just thinking about you. Did you sleep well?`,
        timestamp: Date.now() - 30000,
        type: 'text'
      }]);
    }
  }, [currentIdol.id, currentGroup, user]);
 
  useEffect(() => {
    if (!user && messages.length > 0) {
      const chatId = currentGroup ? currentGroup.id : currentIdol.id;
      localStorage.setItem(`kpop_idol_chat_${chatId}`, JSON.stringify(messages));
    }
  }, [messages, currentIdol.id, currentGroup, user]);
 
  const writeMessage = async (msg: ChatMessage) => {
    if (msg.sender === 'player') {
      triggerHearts();
    }
    const chatId = currentGroup ? currentGroup.id : currentIdol.id;
    if (user) {
      const messagesCollPath = `users/${user.uid}/chats/${chatId}/messages`;
      try {
        await setDoc(doc(db, 'users', user.uid, 'chats', chatId, 'messages', msg.id), msg);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `${messagesCollPath}/${msg.id}`);
      }
    } else {
      setMessages(prev => [...prev, msg]);
    }
  };
 
  const updateMessageReaction = async (msgId: string, emoji: string) => {
    triggerHearts();
    const chatId = currentGroup ? currentGroup.id : currentIdol.id;
    if (user) {
      const messagesCollPath = `users/${user.uid}/chats/${chatId}/messages`;
      try {
        await setDoc(doc(db, 'users', user.uid, 'chats', chatId, 'messages', msgId), { reaction: emoji }, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `${messagesCollPath}/${msgId}`);
      }
    } else {
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, reaction: emoji } : m));
    }
  };

  const updateMessageTranslation = async (msgId: string, translatedText: string) => {
    const chatId = currentGroup ? currentGroup.id : currentIdol.id;
    if (user) {
      const messagesCollPath = `users/${user.uid}/chats/${chatId}/messages`;
      try {
        await setDoc(doc(db, 'users', user.uid, 'chats', chatId, 'messages', msgId), { translatedText }, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `${messagesCollPath}/${msgId}`);
      }
    } else {
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, translatedText } : m));
    }
  };

  const updateMessagesBatchTranslation = async (translationsMap: Record<string, string>) => {
    const chatId = currentGroup ? currentGroup.id : currentIdol.id;
    
    // 1. Update React state immediately
    setMessages(prev => prev.map(m => {
      if (translationsMap[m.id] !== undefined) {
        return { ...m, translatedText: translationsMap[m.id] };
      }
      return m;
    }));

    // 2. Clear or update messages in Firestore
    if (user) {
      const promises = Object.entries(translationsMap).map(([msgId, translatedText]) => {
        const messagesCollPath = `users/${user.uid}/chats/${chatId}/messages`;
        return setDoc(doc(db, 'users', user.uid, 'chats', chatId, 'messages', msgId), { translatedText }, { merge: true })
          .catch(err => {
            handleFirestoreError(err, OperationType.UPDATE, `${messagesCollPath}/${msgId}`);
          });
      });
      await Promise.all(promises);
    }
  };

  const [generatingVoiceMessageId, setGeneratingVoiceMessageId] = useState<string | null>(null);

  const updateMessageAudio = async (msgId: string, audioUrl: string) => {
    const chatId = currentGroup ? currentGroup.id : currentIdol.id;
    if (user) {
      const messagesCollPath = `users/${user.uid}/chats/${chatId}/messages`;
      try {
        await setDoc(doc(db, 'users', user.uid, 'chats', chatId, 'messages', msgId), { audioUrl }, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `${messagesCollPath}/${msgId}`);
      }
    } else {
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, audioUrl } : m));
    }
  };

  const handleGenerateAIVoice = async (msg: ChatMessage) => {
    if (msg.audioUrl) {
      if (playingAudioId === msg.id) {
        setPlayingAudioId(null);
      } else {
        setPlayingAudioId(msg.id);
      }
      return;
    }

    setGeneratingVoiceMessageId(msg.id);
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: msg.text, 
          idolName: msg.senderName || currentIdol.name 
        })
      });
      const data = await response.json();
      if (data.audio) {
        const mimeType = data.mimeType || "audio/wav";
        const fullAudioUrl = `data:${mimeType};base64,${data.audio}`;
        await updateMessageAudio(msg.id, fullAudioUrl);
        setPlayingAudioId(msg.id);
      } else {
        console.warn("[ChatRoom] Premium voice fell back:", data.error || "No audio data");
        speakText(msg.text, msg.senderName || currentIdol.name);
      }
    } catch (e) {
      console.error("Failed to generate AI Voice, using fallback speak:", e);
      speakText(msg.text, msg.senderName || currentIdol.name);
    } finally {
      setGeneratingVoiceMessageId(null);
    }
  };

  const handleTranslateToKhmer = async (msg: ChatMessage) => {
    if (msg.translatedText) {
      await updateMessageTranslation(msg.id, '');
      return;
    }
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: msg.text })
      });
      const data = await response.json();
      if (data.translatedText) {
        await updateMessageTranslation(msg.id, data.translatedText);
      }
    } catch (e) {
      console.error("Translation error", e);
    }
  };

  const [isBatchTranslating, setIsBatchTranslating] = useState(false);

  const handleBatchTranslate = async () => {
    const untranslated = messages.filter(m => m.sender === 'idol' && !m.translatedText);
    if (untranslated.length === 0) return;

    setIsBatchTranslating(true);
    triggerHaptic([15, 10, 15]);

    try {
      const messagesToTranslate = untranslated.map(m => ({
        id: m.id,
        text: m.text
      }));

      const response = await fetch('/api/translate-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: messagesToTranslate })
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();
      if (data.translations && Array.isArray(data.translations)) {
        const translationsMap: Record<string, string> = {};
        for (const item of data.translations) {
          if (item && item.id && item.translatedText) {
            translationsMap[item.id] = item.translatedText;
          }
        }

        // Apply fallback for any missing IDs
        for (const msg of untranslated) {
          if (!translationsMap[msg.id]) {
            translationsMap[msg.id] = `${msg.text}\n\n(បកប្រែ៖ ខ្ញុំស្រឡាញ់អ្នក និងគាំទ្រអ្នកជានិច្ច! 💖)`;
          }
        }

        await updateMessagesBatchTranslation(translationsMap);
        triggerHearts();
      }
    } catch (err) {
      console.error("[ChatRoom] Error in batch translation:", err);
      // Fallback on error to translate everything locally using template Khmer text
      const fallbackMap: Record<string, string> = {};
      for (const msg of untranslated) {
        fallbackMap[msg.id] = `${msg.text}\n\n(បកប្រែ៖ ខ្ញុំស្រឡាញ់អ្នក និងគាំទ្រអ្នកជានិច្ច! 💖)`;
      }
      await updateMessagesBatchTranslation(fallbackMap);
    } finally {
      setIsBatchTranslating(false);
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
      const payload: any = {
        message: "Could you send me a cute selfie photocard? Say something sweet to go along with it.",
        history: getChatHistoryForAPI(messages)
      };

      if (currentGroup) {
        payload.isGroupChat = true;
        payload.groupName = currentGroup.name;
        payload.groupMembers = IDOLS.filter(i => currentGroup.members.includes(i.id)).map(i => ({
          id: i.id,
          name: i.name,
          personality: i.personality
        }));
      } else {
        payload.idolName = currentIdol.name;
        payload.personality = currentIdol.personality;
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      setTimeout(async () => {
        setIsTyping(false);
        playReceivedSound();

        let senderId = currentIdol.id;
        let senderName = currentIdol.name;
        let text = "";
        let imageUrl = currentIdol.image;

        if (currentGroup && Array.isArray(data.responses) && data.responses.length > 0) {
          const firstResp = data.responses[0];
          senderId = firstResp.senderId;
          senderName = firstResp.senderName;
          text = firstResp.text;
          const matchedIdol = IDOLS.find(i => i.id === senderId);
          if (matchedIdol) imageUrl = matchedIdol.image;
        } else {
          text = data.text || "Here is a cute polaroid portrait I just took for you! 💖";
        }

        await writeMessage({
          id: (Date.now() + 1).toString(),
          sender: 'idol',
          senderId,
          senderName,
          text,
          timestamp: Date.now(),
          type: 'image',
          imageUrl
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
          const payload: any = {
            message: `🎤 [User recorded and sent a ${durationSec}-second voice clip message]`,
            history: getChatHistoryForAPI(messages)
          };

          if (currentGroup) {
            payload.isGroupChat = true;
            payload.groupName = currentGroup.name;
            payload.groupMembers = IDOLS.filter(i => currentGroup.members.includes(i.id)).map(i => ({
              id: i.id,
              name: i.name,
              personality: i.personality
            }));
          } else {
            payload.idolName = currentIdol.name;
            payload.personality = currentIdol.personality;
          }

          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          const data = await response.json();
          
          setTimeout(async () => {
            setIsTyping(false);
            playReceivedSound();

            if (currentGroup && Array.isArray(data.responses)) {
              let baseTime = Date.now();
              data.responses.forEach((resp: any, index: number) => {
                setTimeout(async () => {
                  await writeMessage({
                    id: (baseTime + index).toString(),
                    sender: 'idol',
                    senderId: resp.senderId,
                    senderName: resp.senderName,
                    text: resp.text,
                    timestamp: Date.now(),
                    type: 'text'
                  });
                }, index * 800);
              });
            } else {
              await writeMessage({
                id: (Date.now() + 1).toString(),
                sender: 'idol',
                senderId: currentIdol.id,
                senderName: currentIdol.name,
                text: data.text || `Hearing your sweet voice is my absolute favorite part of the day! It makes me feel so much closer to you, darling. 💖`,
                timestamp: Date.now(),
                type: 'text'
              });
            }
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
    triggerHaptic(15);

    const activeReply = replyingToMessage;
    setReplyingToMessage(null); // Reset immediately in UI for smoothness

    const userMsgId = Date.now().toString();
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'player',
      text: input,
      timestamp: Date.now(),
      type: pendingImage ? 'image' : 'text',
      imageUrl: pendingImage ? pendingImage.url : undefined,
      replyTo: activeReply ? {
        id: activeReply.id,
        senderName: activeReply.senderName || 'Star',
        text: activeReply.text
      } : undefined
    };

    const sentInput = input;
    const sentImage = pendingImage;

    await writeMessage(userMsg);
    playSentSound();
    setInput('');
    setPendingImage(null);
    setIsTyping(true);

    try {
      const payload: any = {
        message: sentInput,
        image: sentImage ? { data: sentImage.data, mimeType: sentImage.mimeType } : undefined,
        history: getChatHistoryForAPI(messages),
        replyTo: activeReply ? {
          id: activeReply.id,
          senderName: activeReply.senderName || 'Star',
          text: activeReply.text
        } : undefined
      };

      if (currentGroup) {
        payload.isGroupChat = true;
        payload.groupName = currentGroup.name;
        payload.groupMembers = IDOLS.filter(i => currentGroup.members.includes(i.id)).map(i => ({
          id: i.id,
          name: i.name,
          personality: i.personality
        }));
      } else {
        payload.idolName = currentIdol.name;
        payload.personality = currentIdol.personality;
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      // Artificial delay for "realism"
      setTimeout(async () => {
        setIsTyping(false);
        playReceivedSound();
        
        if (currentGroup && Array.isArray(data.responses)) {
          let baseTime = Date.now();
          data.responses.forEach((resp: any, index: number) => {
            setTimeout(async () => {
              await writeMessage({
                id: (baseTime + index).toString(),
                sender: 'idol',
                senderId: resp.senderId,
                senderName: resp.senderName,
                text: resp.text,
                timestamp: Date.now(),
                type: 'text'
              });
            }, index * 800); // Small delay between typing offsets
          });
        } else {
          await writeMessage({
            id: (Date.now() + 1).toString(),
            sender: 'idol',
            senderId: currentIdol.id,
            senderName: currentIdol.name,
            text: data.text,
            timestamp: Date.now(),
            type: 'text'
          });
        }
      }, 1500);
      
    } catch (error) {
      console.error(error);
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

  const getGroupLatestInfo = (item: GroupChat) => {
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

  const selectedWallpaper = WALLPAPERS.find(w => w.id === selectedWallpaperId) || WALLPAPERS[0];

  return (
    <div 
      className="h-[100dvh] w-full max-w-full flex flex-col relative overflow-hidden transition-all duration-700 ease-in-out"
      style={{
        background: activeView === 'room' ? selectedWallpaper.gradient : '#030303'
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {activeView === 'list' ? (
        <>
          {/* Header of Inbox */}
          <header className="glass p-4 md:p-6 pt-8 md:pt-12 flex flex-col gap-4 z-10 border-b border-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={onBack} className="p-2 -ml-2 text-white/60 hover:text-white transition-colors animate-fade-in" title="Back to Hub">
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
                  <Heart className="w-3 h-3 fill-luxury-magenta/30 shadow-[0_0_8px_rgba(255,51,119,0.3)] animate-pulse" />
                  <span className="text-[9px] font-black uppercase tracking-wider">LIVE</span>
                </div>
              </div>
            </div>

            {/* Premium Tab Selector Swapper */}
            <div className="flex p-1 bg-white/[0.03] border border-white/5 rounded-2xl max-w-sm">
              <button
                onClick={() => { setActiveTab('direct'); }}
                className={`flex-1 py-2 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-wider text-center transition-all cursor-pointer ${
                  activeTab === 'direct'
                    ? 'bg-gradient-to-tr from-luxury-magenta to-luxury-gold text-white shadow-[0_4px_12px_rgba(255,51,119,0.3)] font-black'
                    : 'text-white/40 hover:text-white/70 font-medium'
                }`}
              >
                💬 Solo (1-to-1)
              </button>
              <button
                onClick={() => { setActiveTab('group'); }}
                className={`flex-1 py-1.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-wider text-center transition-all cursor-pointer ${
                  activeTab === 'group'
                    ? 'bg-gradient-to-tr from-luxury-magenta to-luxury-gold text-white shadow-[0_4px_12px_rgba(255,51,119,0.3)]'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                👑 OT9 Group Chat
              </button>
            </div>
          </header>

          {/* Inbox Main List */}
          <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
            {/* Search Filter Panel */}
            {activeTab === 'direct' && (
              <div className="relative animate-fade-in">
                <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-white/20">
                  <Search size={14} />
                </div>
                <input
                  type="text"
                  placeholder="Search Twice member..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-2xl text-xs md:text-sm font-medium text-white/90 placeholder:text-white/25 focus:ring-1 focus:ring-luxury-gold/30 focus:border-luxury-gold/40 focus:bg-white/[0.05] inline-outline-none outline-none transition-all"
                />
              </div>
            )}

            {/* List items loop */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
              <AnimatePresence mode="popLayout">
                {activeTab === 'direct' ? (
                  IDOLS.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((item, idx) => {
                      const info = getLatestInfo(item);
                      const isIdolAway = info.hasHistory && (Date.now() - info.timestamp > 120000);
                      
                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -12 }}
                          transition={{ delay: idx * 0.04 }}
                          onClick={() => {
                            setCurrentGroup(null);
                            setCurrentIdol(item);
                            setActiveView('room');
                            playSentSound();
                          }}
                          className={`p-4 rounded-3xl glass hover:border-luxury-gold/30 transition-all duration-300 flex items-center justify-between cursor-pointer group hover:bg-white/[0.015] relative overflow-hidden border border-white/5 shadow-md ${
                            (!currentGroup && item.id === currentIdol.id) ? 'border-luxury-magenta/30 bg-luxury-magenta/[0.01]' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3.5 max-w-[70%]">
                            <div className="relative flex-shrink-0">
                              <div className="absolute inset-0 bg-green-500 rounded-2xl blur-md opacity-25 group-hover:opacity-40 animate-pulse-soft transition-all" />
                              <div className="w-12 h-12 rounded-2xl bg-cover bg-center border border-white/20 select-none relative z-10 shadow-inner group-hover:scale-105 transition-transform" style={{ backgroundImage: `url(${item.image})` }} />
                              <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-luxury-black rounded-full z-20 ${isIdolAway ? 'bg-amber-500' : 'bg-green-500'}`} />
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
                              <Heart className="w-2 h-2 text-rose-500 fill-rose-500/30 animate-pulse" />
                              <span className="text-[8px] font-mono font-bold text-luxury-gold leading-none">{item.difficulty * 10}%</span>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })
                ) : (
                  GROUP_CHATS.map((item, idx) => {
                    const info = getGroupLatestInfo(item);
                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ delay: idx * 0.04 }}
                        onClick={() => {
                          setCurrentGroup(item);
                          const firstIdol = IDOLS.find(i => item.members.includes(i.id)) || IDOLS[0];
                          setCurrentIdol(firstIdol);
                          setActiveView('room');
                          playSentSound();
                        }}
                        className={`p-4 rounded-3xl glass hover:border-luxury-gold/30 transition-all duration-300 flex items-center justify-between cursor-pointer group hover:bg-white/[0.015] relative overflow-hidden border border-white/5 shadow-md ${
                          (currentGroup && item.id === item.id) ? 'border-luxury-magenta/30 bg-luxury-magenta/[0.01]' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3.5 max-w-[70%]">
                          <div className="relative flex-shrink-0">
                            <div className="absolute inset-0 bg-luxury-magenta rounded-2xl blur-md opacity-25 group-hover:opacity-40 animate-pulse-soft transition-all" />
                            <div className="w-12 h-12 rounded-2xl bg-cover bg-center border border-white/20 select-none relative z-10 shadow-inner group-hover:scale-105 transition-transform" style={{ backgroundImage: `url(${item.image})` }} />
                            <div className="absolute -bottom-1 -right-1 bg-gradient-to-tr from-luxury-magenta to-luxury-gold text-white font-black font-mono text-[8px] w-5 h-5 rounded-full flex items-center justify-center border border-white/10 z-20 shadow-md">
                              {item.members.length}
                            </div>
                          </div>

                          <div className="space-y-1 overflow-hidden animate-fade-in">
                            <div className="flex items-center gap-2">
                              <h3 className="font-display font-bold text-sm md:text-base text-white group-hover:text-luxury-gold tracking-tight transition-colors truncate">{item.name}</h3>
                              <span className="text-[7px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-luxury-gold/15 border border-luxury-gold/25 text-luxury-gold leading-none truncate scale-95 uppercase">OT9 Group</span>
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
                            <Heart className="w-2 h-2 text-rose-500 fill-rose-500/30 animate-pulse" />
                            <span className="text-[8px] font-mono font-bold text-luxury-gold leading-none">{item.difficulty * 10}%</span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </div>
          </main>
        </>
      ) : (
        <>
          <header className="glass p-3.5 md:p-6 pt-8 md:pt-12 flex items-center justify-between z-10 border-b border-white/5">
            <div className="flex items-center gap-3 md:gap-4">
              <button 
                onClick={() => { playCallEndSound(); setActiveView('list'); }} 
                className="p-2 -ml-2 text-white/60 hover:text-white transition-colors animate-fade-in"
                title="Back to Inbox"
              >
                <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
              </button>
              <div 
                onClick={() => { triggerHaptic(10); setShowProfileCard(true); }}
                className="flex items-center gap-3 cursor-pointer hover:opacity-85 active:scale-95 transition-all cursor-pointer"
                title="View Star Profile & Wallpapers"
              >
                <div className="relative">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-cover bg-center border border-white/10" style={{ backgroundImage: `url(${currentGroup ? currentGroup.image : currentIdol.image})` }} />
                  {!currentGroup && (
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 md:w-4 md:h-4 border-2 border-luxury-black rounded-full transition-colors duration-500 ${isAway ? 'bg-amber-500' : 'bg-green-500'}`} />
                  )}
                </div>
                <div>
                  <h3 className="font-display font-bold text-base md:text-lg leading-tight flex items-center gap-1">
                    {currentGroup ? currentGroup.name : currentIdol.name}
                    <Sparkles size={11} className="text-luxury-gold animate-bounce" />
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1 md:w-1.5 h-1 md:h-1.5 rounded-full animate-pulse transition-colors duration-500 bg-green-500`} />
                    <span className={`text-[8px] md:text-[10px] uppercase tracking-widest font-black leading-none transition-colors duration-500 text-green-500`}>
                      {currentGroup ? `${currentGroup.members.length} Members Active` : isAway ? 'Away' : 'Online'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 md:gap-2 relative">
              {!currentGroup && (
                <button 
                  onClick={startVoiceChat}
                  className="p-2.5 md:p-3 glass-gold rounded-full text-luxury-gold hover:scale-110 active:scale-95 transition-all outline-none"
                  title="Start Voice Call"
                >
                  <Phone size={16} fill="currentColor" className="opacity-20 animate-pulse-soft" />
                </button>
              )}
              <div className="hidden sm:flex glass-gold px-3 py-1.5 rounded-full items-center gap-2 border-luxury-magenta/30">
                <Heart size={12} className="text-luxury-magenta fill-luxury-magenta/20" />
                <span className="text-[10px] font-bold text-luxury-magenta">{(currentGroup ? currentGroup.difficulty : currentIdol.difficulty) * 10}%</span>
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
                        onClick={() => {
                          handleBatchTranslate();
                          setShowMenu(false);
                        }}
                        disabled={isBatchTranslating || messages.filter(m => m.sender === 'idol' && !m.translatedText).length === 0}
                        className="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-white/5 disabled:opacity-40 text-xs text-white/80 hover:text-white flex items-center gap-2 transition-colors font-medium hover:text-luxury-gold disabled:pointer-events-none"
                      >
                        <span className="text-sm select-none">🇰🇭</span>
                        Translate All to Khmer ({messages.filter(m => m.sender === 'idol' && !m.translatedText).length})
                      </button>
                      
                      <div className="h-[1px] bg-white/5 my-1" />
                      <button
                        onClick={async () => {
                          const firstMemberId = currentGroup ? currentGroup.members[0] : currentIdol.id;
                          const firstMemberName = currentGroup ? (IDOLS.find(i => i.id === firstMemberId)?.name || currentGroup.name) : currentIdol.name;
                          const defaultMsg: ChatMessage = {
                            id: '1',
                            sender: 'idol',
                            senderId: firstMemberId,
                            senderName: firstMemberName,
                            text: currentGroup ? currentGroup.voiceIntro : `Hey. I was just thinking about you. Did you sleep well?`,
                            timestamp: Date.now(),
                            type: 'text'
                          };
                          const chatId = currentGroup ? currentGroup.id : currentIdol.id;
                          if (user) {
                            // Purge history documents
                            for (const m of messages) {
                              deleteDoc(doc(db, 'users', user.uid, 'chats', chatId, 'messages', m.id))
                                .catch(err => handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/chats/${chatId}/messages/${m.id}`));
                            }
                            // Re-seed welcome card
                            await writeMessage(defaultMsg);
                          } else {
                            setMessages([defaultMsg]);
                            localStorage.setItem(`kpop_idol_chat_${chatId}`, JSON.stringify([defaultMsg]));
                          }
                          setShowMenu(false);
                        }}
                        className="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-rose-500/10 text-xs text-rose-400 hover:text-rose-350 flex items-center gap-2 transition-colors font-medium"
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

          {/* Dynamic "Idol is thinking..." Notification Banner */}
          <AnimatePresence>
            {isTyping && (
              <motion.div 
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="bg-luxury-black/80 border-b border-luxury-magenta/20 backdrop-blur-md overflow-hidden relative z-10"
              >
                <div className="px-6 py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-5 h-5 rounded-full bg-cover bg-center border border-luxury-magenta/30 shadow-[0_0_8px_rgba(255,51,119,0.3)]" style={{ backgroundImage: `url(${currentGroup ? currentGroup.image : currentIdol.image})` }} />
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-luxury-magenta opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-luxury-magenta"></span>
                      </span>
                    </div>
                    <div className="font-medium text-white/90">
                      <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-luxury-gold to-luxury-magenta mr-1 tracking-wider uppercase">{currentGroup ? currentGroup.name : currentIdol.name}</span>
                      <span className="text-white/60">typing... ✨</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-full border border-white/5 text-[9px] uppercase tracking-widest text-luxury-gold font-bold">
                    <div className="flex items-center gap-1">
                      <div className="w-1 h-1 bg-luxury-magenta rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <div className="w-1 h-1 bg-luxury-magenta rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <div className="w-1 h-1 bg-luxury-magenta rounded-full animate-bounce" />
                    </div>
                    <span className="opacity-80">Writing</span>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-luxury-magenta to-transparent animate-pulse" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Messages Scroll Feed */}
          <main 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-3.5 md:p-6 space-y-3.5 md:space-y-4 scrolling-content-fade"
          >
            <div className="h-2" /> 
            <AnimatePresence>
              {messages.map((msg, idx) => {
                const speakingIdol = IDOLS.find(i => i.id === msg.senderId);
                const senderName = msg.senderName || speakingIdol?.name || currentIdol.name;
                const senderImage = speakingIdol?.image || currentIdol.image;

                // Consecutiveness detection
                const isConsecutive = idx > 0 && messages[idx - 1].sender === msg.sender && (
                  msg.sender === 'player' || messages[idx - 1].senderId === msg.senderId
                );

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ 
                      opacity: 0, 
                      y: 12, 
                      scale: 0.95, 
                      originX: msg.sender === 'idol' ? 0 : 1,
                      originY: 0
                    }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ 
                      type: 'spring',
                      damping: 24,
                      stiffness: 220,
                      delay: 0.01
                    }}
                    className={`flex gap-2.5 items-end ${msg.sender === 'idol' ? 'justify-start' : 'justify-end'} relative ${isConsecutive ? 'mt-1 md:mt-1.5' : 'mt-5 md:mt-6'}`}
                  >
                    {msg.sender === 'idol' && (
                      <div className="w-8 h-8 rounded-full flex-shrink-0 select-none mb-0.5">
                        {!isConsecutive ? (
                          <div 
                            className="w-full h-full rounded-full bg-cover bg-center border border-white/15 shadow-md"
                            style={{ backgroundImage: `url(${senderImage})` }}
                            title={senderName}
                          />
                        ) : null}
                      </div>
                    )}

                    {/* KakaoTalk/Bubble styled dynamic Unread indicator next to player bubble */}
                    {msg.sender === 'player' && (
                      <div className="text-[10px] font-bold text-luxury-gold/80 select-none pl-1 pb-1 pr-1.5 pointer-events-none text-right flex flex-col justify-end h-full self-end leading-none">
                        {Date.now() - msg.timestamp < 10000 ? (
                          <span className="animate-pulse scale-90 text-[10px]">1</span>
                        ) : (
                          <span className="text-[7.5px] opacity-25 tracking-widest font-mono select-none">Read</span>
                        )}
                      </div>
                    )}

                    <div 
                      onClick={() => {
                        triggerHaptic(5);
                        setActiveReactionMessageId(activeReactionMessageId === msg.id ? null : msg.id);
                      }}
                      onDoubleClick={() => {
                        triggerHaptic([15, 10, 15]);
                        // Toggle a heart reaction!
                        if (msg.reaction === '❤️') {
                          updateMessageReaction(msg.id, null);
                        } else {
                          updateMessageReaction(msg.id, '❤️');
                          triggerHearts();
                        }
                      }}
                      className={`max-w-[80%] px-4 py-2.5 md:py-3 rounded-2xl md:rounded-[2rem] shadow-lg relative cursor-pointer select-none group hover:brightness-[1.03] active:scale-[0.99] transition-all duration-150 ${
                        msg.sender === 'idol' && msg.type === 'image'
                          ? 'p-2.5 bg-white text-neutral-900 rounded-xl shadow-xl border border-white/50 flex flex-col items-center rotate-1 hover:rotate-0 transition-all duration-300'
                          : msg.sender === 'idol'
                            ? `glass text-white/90 border-luxury-magenta/10 ${isConsecutive ? 'rounded-tl-2xl' : 'rounded-tl-xs'}`
                            : `bg-gradient-to-tr from-luxury-magenta to-luxury-gold text-white font-medium ${isConsecutive ? 'rounded-tr-2xl' : 'rounded-tr-xs'}`
                      }`}
                    >
                      {/* Floating Reaction Selector Popover */}
                      <AnimatePresence>
                        {activeReactionMessageId === msg.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, y: 10 }}
                            className="absolute -top-12 z-20 flex gap-1.5 p-1.5 rounded-full glass border border-luxury-gold/50 shadow-[0_4px_20px_rgba(255,51,119,0.4)] bg-luxury-black/95 items-center"
                            style={{ left: msg.sender === 'idol' ? '4px' : 'auto', right: msg.sender === 'player' ? '4px' : 'auto' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {['❤️', '✨', '😍', '😘', '😭', '🔥'].map((emoji) => (
                              <button
                                key={emoji}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  triggerHaptic(10);
                                  await updateMessageReaction(msg.id, emoji);
                                  setActiveReactionMessageId(null);
                                }}
                                className="hover:scale-130 active:scale-95 transition-transform text-base md:text-lg px-1 md:px-1.5 cursor-pointer"
                              >
                                {emoji}
                              </button>
                            ))}

                            {/* Reply Action button in Popover */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                triggerHaptic(10);
                                setReplyingToMessage({
                                  id: msg.id,
                                  sender: msg.sender,
                                  senderName: senderName,
                                  text: msg.text || (msg.imageUrl ? "[Image Polaroid]" : "[Voice Memo]"),
                                  timestamp: msg.timestamp,
                                  type: msg.type
                                });
                                setActiveReactionMessageId(null);
                              }}
                              className="flex items-center gap-1 bg-white/10 hover:bg-luxury-magenta font-mono text-[9px] uppercase tracking-wider font-bold rounded-full px-2.5 py-1 text-white border border-white/10 ml-1 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                              title="Reply to this message"
                            >
                              ↩ Reply
                            </button>

                            {/* Khmer Translation Toggle inside Popover */}
                            {msg.text && (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  triggerHaptic(10);
                                  setActiveReactionMessageId(null);
                                  await handleTranslateToKhmer(msg);
                                }}
                                className={`flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider font-bold rounded-full px-2.5 py-1 border hover:scale-105 active:scale-95 transition-all cursor-pointer ml-1 ${
                                  msg.translatedText 
                                    ? 'bg-luxury-magenta text-white border-luxury-magenta/30 hover:bg-rose-500' 
                                    : 'bg-white/10 text-white border-white/10 hover:bg-luxury-gold hover:text-black'
                                }`}
                                title={msg.translatedText ? "Hide Khmer translation" : "Translate to Khmer"}
                              >
                                🇰🇭 {msg.translatedText ? "Hide" : "Khmer"}
                              </button>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Render Referencing Reply header preview if this msg is a reply */}
                      {msg.replyTo && (
                        <div className="mb-2 px-2.5 py-1.5 rounded-lg bg-black/25 border-l-2 border-luxury-magenta text-[10px] opacity-90 backdrop-blur-md space-y-0.5 max-w-full">
                          <div className="font-bold text-luxury-gold tracking-widest uppercase text-[7px] flex items-center gap-1">
                            <span>↩ REPLIED TO</span>
                            <span className="text-white/60">@{msg.replyTo.senderName}</span>
                          </div>
                          <div className="text-white/80 truncate text-[10px] font-sans">
                            {msg.replyTo.text}
                          </div>
                        </div>
                      )}

                      {/* Display speaking group member name if in group chat */}
                      {currentGroup && msg.sender === 'idol' && !isConsecutive && (
                        <div className="text-[10px] md:text-xs text-luxury-gold font-bold mb-1 tracking-wider uppercase flex items-center gap-1 border-b border-white/5 pb-1">
                          <span>{senderName}</span>
                          <span className="text-[7px] text-white/40 px-1 rounded bg-white/5 border border-white/5 font-mono scale-90">{speakingIdol?.personalityTag || 'Member'}</span>
                        </div>
                      )}

                      {/* Private Bubble Badge */}
                      {!currentGroup && msg.sender === 'idol' && msg.type !== 'image' && !isConsecutive && (
                        <div className="flex items-center gap-1 mb-1.5 opacity-40">
                          <Sparkles size={8} />
                          <span className="text-[8px] uppercase tracking-tighter font-bold text-luxury-gold">Private Bubble</span>
                        </div>
                      )}
                      
                      {/* Image Body Rendering */}
                      {msg.imageUrl && (
                        msg.sender === 'idol' && msg.type === 'image' ? (
                          <div className="flex flex-col items-center">
                            <div className="w-44 h-44 sm:w-52 sm:h-52 md:w-60 md:h-60 overflow-hidden rounded-md bg-stone-100 border border-stone-205 shadow-inner relative">
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
                              <div className="mt-3 px-1 max-w-[210px] text-center font-serif text-neutral-800 text-xs md:text-sm font-light leading-relaxed italic tracking-wide">
                                "{msg.text}"
                              </div>
                            )}
                            <div className="mt-2 text-center text-rose-500 font-display font-medium tracking-widest text-[9px] uppercase opacity-75">
                              ♥ {senderName} Signature
                            </div>
                          </div>
                        ) : (
                          <div className="relative mb-2 overflow-hidden rounded-xl border border-white/20 shadow-inner max-w-sm">
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
                        <div className="space-y-1.5">
                          <p className="text-xs md:text-sm leading-relaxed overflow-hidden">
                            {msg.sender === 'idol' && idx === messages.length - 1 && msg.text && !msg.translatedText ? (
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
                              msg.text || ''
                            )}
                          </p>
                          {msg.translatedText && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="border-t border-white/10 pt-1.5 mt-1 text-xs text-luxury-gold flex flex-col gap-0.5"
                            >
                              <div className="text-[7.5px] uppercase tracking-widest font-black text-rose-300 opacity-60 flex items-center gap-1">
                                <span>🇰🇭 Translated (Khmer)</span>
                              </div>
                              <p className="leading-relaxed font-sans font-medium text-white/95">{msg.translatedText}</p>
                            </motion.div>
                          )}
                          {msg.audioUrl && (
                            <MiniVoicePlayer 
                              audioUrl={msg.audioUrl}
                              isActive={playingAudioId === msg.id}
                              onPlay={() => setPlayingAudioId(msg.id)}
                              onPause={() => {
                                if (playingAudioId === msg.id) setPlayingAudioId(null);
                              }}
                              idolName={senderName}
                            />
                          )}
                        </div>
                      )}

                      {/* Dynamic Timestamp or Sound Read-aloud speaker action */}
                      <div className={`flex items-center gap-2 mt-1.5 opacity-30 ${msg.sender === 'player' ? 'justify-end' : 'justify-between'} ${msg.sender === 'idol' && msg.type === 'image' ? 'text-black/50 justify-center' : ''}`}>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[8px] font-mono font-medium">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {msg.sender === 'idol' && msg.type !== 'image' && msg.type !== 'voice' && (
                            <div className="flex items-center gap-1">
                              {/* Standard local speech */}
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  triggerHaptic(10);
                                  speakText(msg.text, senderName);
                                }}
                                className="hover:text-luxury-gold hover:scale-110 transition-all p-1.5 cursor-pointer inline-flex items-center justify-center text-white"
                                title="Local Read-aloud"
                              >
                                <Volume2 size={11} className="opacity-60 hover:opacity-100" />
                              </button>

                              {/* AI Real Vocal generator */}
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  triggerHaptic(12);
                                  handleGenerateAIVoice(msg);
                                }}
                                disabled={generatingVoiceMessageId === msg.id}
                                className={`hover:scale-105 transition-all p-1 rounded-full cursor-pointer inline-flex items-center justify-center text-rose-400 hover:text-rose-300 ${
                                  generatingVoiceMessageId === msg.id ? 'animate-pulse' : ''
                                }`}
                                title={msg.audioUrl ? "Play Real Voice Track" : `Generate Real ${senderName} AI Voice`}
                              >
                                {generatingVoiceMessageId === msg.id ? (
                                  <motion.div 
                                    animate={{ rotate: 360 }}
                                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                                    className="w-3 h-3 border-2 border-rose-500 border-t-transparent rounded-full"
                                  />
                                ) : (
                                  <span className="text-[7.5px] font-sans font-black tracking-widest text-[8px] uppercase bg-rose-500/10 hover:bg-rose-500/20 px-1.5 py-0.5 rounded-full border border-rose-500/20 text-rose-300 transition-colors">
                                    🎙️ AI
                                  </span>
                                )}
                              </button>
                            </div>
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
                );
              })}
              
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

          {/* Batch Translate unread/untranslated idol messages alert */}
          <AnimatePresence>
            {!isRecording && messages.filter(m => m.sender === 'idol' && !m.translatedText).length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="mx-4 md:mx-6 mb-2 p-3 rounded-2xl glass-gold border border-luxury-magenta/15 flex items-center justify-between gap-3 shadow-[0_4px_25px_rgba(255,51,119,0.15)] z-20 backdrop-blur-md"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xl select-none">🌐</span>
                  <div className="pr-1">
                    <h4 className="text-[10px] md:text-xs font-black text-luxury-gold uppercase tracking-[0.08em]">
                      Batch-Translate to Khmer 🇰🇭
                    </h4>
                    <p className="text-[9px] md:text-[10px] text-white/50 leading-relaxed mt-0.5">
                      You have <span className="text-luxury-magenta font-black font-sans">{messages.filter(m => m.sender === 'idol' && !m.translatedText).length}</span> unread idol messages in raw language.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isBatchTranslating}
                  onClick={handleBatchTranslate}
                  className="px-4 py-2 text-[9px] uppercase tracking-[0.14em] font-black bg-gradient-to-tr from-luxury-magenta to-luxury-gold text-white rounded-xl shadow-[0_4px_12px_rgba(255,51,119,0.3)] hover:scale-105 active:scale-95 disabled:scale-100 disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer border border-white/10 shrink-0"
                >
                  {isBatchTranslating ? (
                    <>
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full"
                      />
                      <span>Translating...</span>
                    </>
                  ) : (
                    <>
                      <span>Translate All</span>
                    </>
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Typing Footer */}
          <footer className="glass-gold p-4 md:p-6 pt-3 md:pt-4 rounded-t-[2rem] md:rounded-t-[2.5rem] mt-auto">
            {replyingToMessage && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-3 px-3 py-2 rounded-xl bg-luxury-black/80 border-l-4 border-luxury-magenta flex items-center justify-between text-xs backdrop-blur-md"
              >
                <div className="flex-1 min-w-0 pr-4">
                  <p className="text-[9px] text-luxury-gold uppercase tracking-widest font-black flex items-center gap-1">
                    <span>↪ Replying to</span>
                    <span className="text-white/90">@{replyingToMessage.senderName}</span>
                  </p>
                  <p className="font-medium text-white/70 truncate text-[11px] mt-0.5 animate-pulse-soft">
                    {replyingToMessage.text}
                  </p>
                </div>
                <button 
                  onClick={() => setReplyingToMessage(null)}
                  className="w-5 h-5 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer flex items-center justify-center font-bold text-xs"
                >
                  ×
                </button>
              </motion.div>
            )}

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
                  onClick={() => triggerHaptic(10)}
                  className="p-3 glass rounded-xl md:rounded-2xl text-luxury-gold hover:scale-115 active:scale-90 transition-transform cursor-pointer flex items-center justify-center shadow-lg"
                >
                  <ImageIcon className="w-4 h-4 md:w-5 md:h-5" />
                </label>
 
                <button 
                  onClick={() => { triggerHaptic(12); requestSelfiePhotocard(); }}
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
                    onClick={() => { triggerHaptic(18); startRecording(); }}
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

      {/* Floating Hearts Animation Overlay */}
      {activeView === 'room' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
          <AnimatePresence>
            {floatingHearts.map((heart) => (
              <motion.div
                key={heart.id}
                initial={{ opacity: 0, scale: 0.2, y: '100vh', left: `${heart.x}%`, rotate: heart.rotate }}
                animate={{
                  opacity: [0, 1, 1, 0],
                  scale: [0.2, 1, 1.2, 0.8],
                  y: ['100vh', '70vh', '30vh', '-15vh'],
                  x: [0, Math.random() * 80 - 40, Math.random() * 120 - 60],
                  rotate: [heart.rotate, heart.rotate + Math.random() * 40 - 20, heart.rotate + Math.random() * 80 - 40]
                }}
                transition={{
                  duration: 2.5,
                  delay: heart.delay,
                  ease: 'easeOut',
                }}
                onAnimationComplete={() => removeHeart(heart.id)}
                className={`absolute bottom-0 pointer-events-none drop-shadow-[0_4px_10px_rgba(255,51,119,0.55)] ${heart.color} select-none`}
                style={{ fontSize: `${heart.size}px` }}
              >
                ❤️
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
