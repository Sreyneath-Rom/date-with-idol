import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Image as ImageIcon, Mic, ChevronLeft, MoreVertical, Heart, Sparkles, Phone, PhoneOff, MicOff, Volume2, Search, Calendar, Award, Smile, Check, Globe, Languages, Settings } from 'lucide-react';
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

interface TranslationLang {
  code: string;
  name: string;
  flag: string;
  localLabel?: string;
}

const SUPPORTED_LANGS: TranslationLang[] = [
  { code: 'Khmer', name: 'Khmer', flag: '🇰🇭', localLabel: 'បកប្រែ' },
  { code: 'English', name: 'English', flag: '🇺🇸', localLabel: 'Translated' },
  { code: 'Japanese', name: 'Japanese', flag: '🇯🇵', localLabel: '翻訳' },
  { code: 'Korean', name: 'Korean', flag: '🇰🇷', localLabel: '번역' },
  { code: 'Chinese', name: 'Chinese', flag: '🇨🇳', localLabel: '翻译' },
  { code: 'Thai', name: 'Thai', flag: '🇹🇭', localLabel: 'แปล' },
  { code: 'Spanish', name: 'Spanish', flag: '🇪🇸', localLabel: 'Traducido' },
  { code: 'Vietnamese', name: 'Vietnamese', flag: '🇻🇳', localLabel: 'Dịch' },
];

const FALLBACK_TRANSLATIONS: Record<string, string> = {
  Khmer: 'បកប្រែ៖ ខ្ញុំស្រឡាញ់អ្នក និងគាំទ្រអ្នកជានិច្ច! 💖',
  English: 'Translated: I love you and support you always! 💖',
  Japanese: '翻訳: いつも愛してるし、応援してるよ! 💖',
  Korean: '번역: 언제나 사랑하고 지지해요! 💖',
  Chinese: '翻译: 我永远爱你、支持你！💖',
  Thai: 'แปล: รักและสนับสนุนคุณเสมอบับเบิ้ล! 💖',
  Spanish: 'Traducido: ¡Siempre te amo y te apoyo! 💖',
  Vietnamese: 'Bản dịch: Mình luôn yêu và ủng hộ bạn! 💖',
};

const getEstimatedReadTime = (text: string) => {
  if (!text) return '';
  const wordCount = text.trim().split(/\s+/).length;
  // Estimate: 3.5 words per second
  const seconds = Math.max(3, Math.ceil(wordCount / 3.5));
  if (seconds < 60) {
    return `${seconds}s read`;
  } else {
    const mins = Math.max(1, Math.ceil(seconds / 60));
    return `${mins}m read`;
  }
};

function cleanObject<T extends Record<string, any>>(obj: T): T {
  const result: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const val = obj[key];
      if (val === undefined) {
        continue;
      }
      if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
        result[key] = cleanObject(val);
      } else {
        result[key] = val;
      }
    }
  }
  return result;
}

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
  const [infiniteChat, setInfiniteChat] = useState<boolean>(() => {
    return localStorage.getItem('bubble_infinite_chat_mode') !== 'false';
  });
  const [targetLang, setTargetLang] = useState<string>(() => {
    return localStorage.getItem('bubble_target_lang') || 'Khmer';
  });
  const [showTranslationSettings, setShowTranslationSettings] = useState(false);
  const [autoTranslate, setAutoTranslate] = useState<boolean>(() => {
    return localStorage.getItem('bubble_auto_translate') === 'true';
  });
  const actLang = SUPPORTED_LANGS.find(l => l.code === targetLang) || SUPPORTED_LANGS[0];
  const [showProfileCard, setShowProfileCard] = useState(false);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [mentionIndex, setMentionIndex] = useState(-1);
  const [activeMentionIndex, setActiveMentionIndex] = useState(0);
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

  const handleSelectWallpaper = (wpId: string) => {
    const activeChatId = currentGroup ? currentGroup.id : currentIdol.id;
    setSelectedWallpaperId(wpId);
    localStorage.setItem(`bubble_wallpaper_${activeChatId}`, wpId);
    triggerHaptic(10);
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const wasAtBottomRef = useRef<boolean>(true);

  // Voice recording states and refs
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  const [isAway, setIsAway] = useState(false);
  const [replyingToMessage, setReplyingToMessage] = useState<ChatMessage | null>(null);

  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  const [bubbleHearts, setBubbleHearts] = useState<{ id: string; msgId: string; x: number; size: number; delay: number; color: string; rotate: number }[]>([]);

  const triggerBubbleHearts = useCallback((msgId: string) => {
    const colors = [
      'text-rose-500', 
      'text-pink-500', 
      'text-red-500', 
      'text-rose-400', 
      'text-pink-400', 
      'text-rose-300',
      'text-luxury-magenta'
    ];
    
    // Generate 8 floating hearts that burst upwards from the bubble
    const count = 10;
    const newHearts = Array.from({ length: count }).map((_, i) => ({
      id: `${msgId}-${Date.now()}-${i}-${Math.random()}`,
      msgId,
      x: Math.random() * 50 - 25, // horizontal offset variation relative to bubble center
      size: Math.random() * 8 + 12, // size (12px to 20px)
      delay: Math.random() * 0.15, // slight delay for organic burst spread
      color: colors[Math.floor(Math.random() * colors.length)],
      rotate: Math.random() * 60 - 30 // random initial rotation offset
    }));
    
    setBubbleHearts(prev => [...prev, ...newHearts]);
  }, []);

  const removeBubbleHeart = useCallback((id: string) => {
    setBubbleHearts(prev => prev.filter(h => h.id !== id));
  }, []);

  const triggerHaptic = useCallback((pattern: number | number[] = 10) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {}
    }
  }, []);

  const handleReplyIndicatorClick = useCallback((e: React.MouseEvent, targetMsgId: string) => {
    e.stopPropagation();
    triggerHaptic(10);
    setHighlightedMessageId(targetMsgId);
    
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }

    // Find absolute location or scroll the specific container's child to view
    const element = document.getElementById(`msg-${targetMsgId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    // Auto clear the highlight after 2.5 seconds
    highlightTimeoutRef.current = setTimeout(() => {
      setHighlightedMessageId(null);
    }, 2500);
  }, [triggerHaptic]);

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
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
          setDoc(doc(db, 'users', user.uid, 'chats', chatId, 'messages', '1'), cleanObject(welcomeMsg))
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
        await setDoc(doc(db, 'users', user.uid, 'chats', chatId, 'messages', msg.id), cleanObject(msg));
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `${messagesCollPath}/${msg.id}`);
      }
    } else {
      setMessages(prev => [...prev, msg]);
    }
  };
 
  const updateMessageReaction = async (msgId: string, emoji: string) => {
    triggerHearts();
    if (emoji === '❤️') {
      triggerBubbleHearts(msgId);
    }
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
      const isPlayer = msg.sender === 'player';
      let response;

      if (isPlayer) {
        // Retrieve custom active clone details from localstorage or fall back to default prebuilt template
        let activeClone: any = null;
        try {
          const savedActiveId = localStorage.getItem('active_voice_clone_id');
          const savedClonesStr = localStorage.getItem('ai_voice_clones');
          const PREBUILT_CLONES = [
            { id: 'prebuilt-sweet-lover', name: 'Mina Style (Soft ASMR)', gender: 'female', age: 'young', pitch: 12, accent: 'Whisper ASMR', stability: 85, clarity: 92, provider: 'sandbox', voiceId: 'sandbox-sweet-lover' },
            { id: 'prebuilt-popstar', name: 'Nayeon Style (Sassy Pop)', gender: 'female', age: 'young', pitch: 20, accent: 'Sassy Popstar', stability: 78, clarity: 88, provider: 'sandbox', voiceId: 'sandbox-popstar' },
            { id: 'prebuilt-mature-oppa', name: 'Warm Friend (Calm Tone)', gender: 'male', age: 'mature', pitch: -22, accent: 'Standard US English', stability: 90, clarity: 95, provider: 'sandbox', voiceId: 'sandbox-mature-oppa' }
          ];
          
          let allClones = [...PREBUILT_CLONES];
          if (savedClonesStr) {
            const savedClones = JSON.parse(savedClonesStr);
            allClones = [...PREBUILT_CLONES, ...savedClones];
          }

          activeClone = allClones.find(c => c.id === savedActiveId) || PREBUILT_CLONES[0];
        } catch (_) {}

        if (!activeClone) {
          activeClone = { id: 'prebuilt-sweet-lover', name: 'Mina Style (Soft ASMR)', gender: 'female', age: 'young', pitch: 12, accent: 'Whisper ASMR', stability: 85, clarity: 92, provider: 'sandbox', voiceId: 'sandbox-sweet-lover' };
        }

        response = await fetch('/api/voice-clone/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: msg.text.replace(/🎙️ Sent voice clip: /, "").replace(/"/g, ''),
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
      } else {
        response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            text: msg.text, 
            idolName: msg.senderName || currentIdol.name 
          })
        });
      }

      const data = await response.json();
      if (data.audio) {
        const mimeType = data.mimeType || "audio/wav";
        const fullAudioUrl = `data:${mimeType};base64,${data.audio}`;
        await updateMessageAudio(msg.id, fullAudioUrl);
        setPlayingAudioId(msg.id);
      } else {
        console.warn("[ChatRoom] API voice fell back:", data.error || "No audio data");
        speakText(msg.text, msg.senderName || currentIdol.name);
      }
    } catch (e) {
      console.error("Failed to generate AI Voice, using fallback speak:", e);
      speakText(msg.text, msg.senderName || currentIdol.name);
    } finally {
      setGeneratingVoiceMessageId(null);
    }
  };

  const handleTranslateMessage = async (msg: ChatMessage) => {
    if (msg.translatedText) {
      await updateMessageTranslation(msg.id, '');
      return;
    }
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: msg.text, targetLang })
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
        body: JSON.stringify({ messages: messagesToTranslate, targetLang })
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
            translationsMap[msg.id] = `${msg.text}\n\n(${FALLBACK_TRANSLATIONS[targetLang] || FALLBACK_TRANSLATIONS.Khmer})`;
          }
        }

        await updateMessagesBatchTranslation(translationsMap);
        triggerHearts();
      }
    } catch (err) {
      console.error("[ChatRoom] Error in batch translation:", err);
      // Fallback on error to translate everything locally
      const fallbackMap: Record<string, string> = {};
      for (const msg of untranslated) {
        fallbackMap[msg.id] = `${msg.text}\n\n(${FALLBACK_TRANSLATIONS[targetLang] || FALLBACK_TRANSLATIONS.Khmer})`;
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

  // Auto-translate last incoming message if enabled
  useEffect(() => {
    if (!autoTranslate || messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.sender === 'idol' && lastMsg.text && !lastMsg.translatedText) {
      const timer = setTimeout(() => {
        handleTranslateMessage(lastMsg);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [messages, autoTranslate, targetLang]);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      wasAtBottomRef.current = (scrollHeight - scrollTop - clientHeight) < 150;
    }
  };

  useEffect(() => {
    if (!contentRef.current || !scrollRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      if (scrollRef.current && wasAtBottomRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });

    resizeObserver.observe(contentRef.current);
    
    // Set initially at bottom
    wasAtBottomRef.current = true;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    if (activeView === 'room') {
      wasAtBottomRef.current = true;
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 50);
    }
  }, [activeView]);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage) {
      if (lastMessage.sender === 'player') {
        wasAtBottomRef.current = true;
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      } else if (lastMessage.sender === 'idol' && wasAtBottomRef.current) {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }
    }
  }, [messages]);

  useEffect(() => {
    if (isTyping && wasAtBottomRef.current) {
      if (scrollRef.current) {
        setTimeout(() => {
          if (scrollRef.current && wasAtBottomRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        }, 60);
      }
    }
  }, [isTyping]);

  const getChatHistoryForAPI = (chatMessages: ChatMessage[]) => {
    // Keep last 100 turns if infiniteChat mode is active, else 25 turns for optimized memory context
    const historyLimit = infiniteChat ? -100 : -25;
    return chatMessages.slice(historyLimit).map(m => {
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
      
      const selfieDelay = infiniteChat ? 150 : 1500;
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
      }, selfieDelay);
      
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
          
          const voiceDelay = infiniteChat ? 150 : 1500;
          const stepOffset = infiniteChat ? 100 : 800;
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
                }, index * stepOffset);
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
          }, voiceDelay);
          
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

  const getMentionableIdols = (): Idol[] => {
    if (currentGroup) {
      return IDOLS.filter(i => currentGroup.members.includes(i.id));
    }
    return [currentIdol];
  };

  const filteredMentionIdols = getMentionableIdols().filter(idol => 
    idol.name.toLowerCase().includes(mentionFilter.toLowerCase()) ||
    (idol.instagram && idol.instagram.toLowerCase().includes(mentionFilter.toLowerCase()))
  );

  const selectIdolMention = (idolName: string) => {
    triggerHaptic(12);
    if (mentionIndex !== -1) {
      const beforeMention = input.slice(0, mentionIndex);
      const afterMention = input.slice(mentionIndex + mentionFilter.length + 1);
      const suffix = afterMention.startsWith(' ') ? afterMention : ' ' + afterMention;
      setInput(beforeMention + '@' + idolName + suffix);
    } else {
      setInput(prev => prev + '@' + idolName + ' ');
    }
    setShowMentionDropdown(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);
    
    const lastAtPos = val.lastIndexOf('@');
    if (lastAtPos !== -1 && (lastAtPos === 0 || val[lastAtPos - 1] === ' ')) {
      const query = val.slice(lastAtPos + 1);
      if (!query.includes(' ')) {
        setMentionFilter(query);
        setMentionIndex(lastAtPos);
        setShowMentionDropdown(true);
        setActiveMentionIndex(0);
        return;
      }
    }
    setShowMentionDropdown(false);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showMentionDropdown && filteredMentionIdols.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveMentionIndex(prev => (prev + 1) % filteredMentionIdols.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveMentionIndex(prev => (prev - 1 + filteredMentionIdols.length) % filteredMentionIdols.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        selectIdolMention(filteredMentionIdols[activeMentionIndex].name);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentionDropdown(false);
      }
    } else if (e.key === 'Enter') {
      handleSend();
    }
  };

  const renderTextWithMentions = (text: string) => {
    if (!text) return '';
    const parts = text.split(/(@[a-zA-Z0-9_\u1780-\u17FF]+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        return (
          <span 
            key={index} 
            className="px-1.5 py-0.5 mx-0.5 rounded bg-luxury-gold/20 text-luxury-gold border border-luxury-gold/30 inline-block font-extrabold select-none shadow-sm animate-pulse-soft"
          >
            {part}
          </span>
        );
      }
      return part;
    });
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
      const mentionRegex = /@([a-zA-Z0-9_\u1780-\u17FF]+)/g;
      const parsedMentions: string[] = [];
      let match;
      while ((match = mentionRegex.exec(sentInput)) !== null) {
        parsedMentions.push(match[1]);
      }

      const payload: any = {
        message: sentInput,
        image: sentImage ? { data: sentImage.data, mimeType: sentImage.mimeType } : undefined,
        history: getChatHistoryForAPI(messages),
        replyTo: activeReply ? {
          id: activeReply.id,
          senderName: activeReply.senderName || 'Star',
          text: activeReply.text
        } : undefined,
        mentions: parsedMentions.length > 0 ? parsedMentions : undefined
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
      
      // Artificial delay for "realism" (minimized in endless chat mode)
      const chatDelay = infiniteChat ? 150 : 1500;
      const stepOffset = infiniteChat ? 100 : 800;
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
            }, index * stepOffset); // Fast or standard typing offset between group members
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
      }, chatDelay);
      
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
          <header className="glass px-4 md:px-6 pt-[calc(1.5rem+env(safe-area-inset-top))] md:pt-12 pb-4 md:pb-6 flex flex-col gap-4 z-10 border-b border-white/5">
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
          <main className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 space-y-4">
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
                                {item.instagram ? (
                                  <span className="text-[7.5px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 leading-none truncate">{item.instagram}</span>
                                ) : (
                                  <span className="text-[7.5px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-luxury-magenta/10 border border-luxury-magenta/20 text-luxury-magenta leading-none truncate">{item.personalityTag}</span>
                                )}
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
          <header className="glass px-3.5 md:px-6 pt-[calc(1.5rem+env(safe-area-inset-top))] md:pt-12 pb-3.5 md:pb-6 flex items-center justify-between z-10 border-b border-white/5">
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
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 md:w-4 md:h-4 border-2 border-luxury-black rounded-full transition-colors duration-500 ${isTyping ? 'bg-rose-500 animate-pulse' : isAway ? 'bg-amber-500' : 'bg-green-500'}`} />
                  )}
                </div>
                <div>
                  <h3 className="font-display font-bold text-base md:text-lg leading-tight flex items-center gap-1">
                    {currentGroup ? currentGroup.name : currentIdol.name}
                    <Sparkles size={11} className="text-luxury-gold animate-bounce" />
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1 md:w-1.5 h-1 md:h-1.5 rounded-full animate-pulse transition-colors duration-500 ${isTyping ? 'bg-rose-500' : isAway ? 'bg-amber-500' : 'bg-green-500'}`} />
                    <span className={`text-[8px] md:text-[10px] uppercase tracking-widest font-black leading-none transition-colors duration-500 ${isTyping ? 'text-rose-400' : isAway ? 'text-amber-500' : 'text-green-500'}`}>
                      {currentGroup ? (isTyping ? 'Members Typing...' : `${currentGroup.members.length} Members Active`) : isTyping ? 'Typing...' : isAway ? 'Away' : 'Online'}
                    </span>
                    {infiniteChat && (
                      <span className="text-[7.5px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-400 via-luxury-magenta to-luxury-gold bg-clip-text text-transparent border border-white/10 px-1.5 py-0.5 rounded bg-white/[0.02]">
                        ⚡ No Limit Mode
                      </span>
                    )}
                    {!currentGroup && currentIdol.instagram && (
                      <a href={`https://instagram.com/${currentIdol.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="ml-1 text-[8px] md:text-[9px] uppercase tracking-widest font-mono text-white/40 hover:text-luxury-magenta transition-colors">
                        ({currentIdol.instagram})
                      </a>
                    )}
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
              
              {/* Intuitive Target Lang Selector Pill in Header */}
              <button
                onClick={() => {
                  triggerHaptic(12);
                  setShowTranslationSettings(true);
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-luxury-gold/40 bg-luxury-gold/5 text-luxury-gold hover:bg-luxury-gold hover:text-black transition-all duration-300 animate-fade-in outline-none shadow-[0_0_12px_rgba(212,175,55,0.1)] active:scale-95 cursor-pointer h-8"
                title="Change Target Language"
              >
                <span className="text-xs leading-none select-none">{actLang.flag}</span>
                <span className="text-[10px] font-mono font-bold tracking-wider uppercase">{actLang.code}</span>
                <Languages size={11} className="opacity-70 text-luxury-gold hover:text-inherit" />
              </button>

              {/* Intuitive Auto-Translate Real-Time Toggle in Header */}
              <button
                onClick={() => {
                  const updated = !autoTranslate;
                  setAutoTranslate(updated);
                  localStorage.setItem('bubble_auto_translate', String(updated));
                  triggerHaptic(10);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border transition-all duration-300 text-[9px] font-mono uppercase tracking-wider font-bold h-8 active:scale-95 cursor-pointer ${
                  autoTranslate 
                    ? 'bg-[#F2AE00]/10 border-[#F59E0B]/30 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.15)]' 
                    : 'bg-white/5 border-white/10 text-white/45 hover:text-white'
                }`}
                title={autoTranslate ? "Real-time AI Autotranslation is Active" : "Enable real-time AI Autotranslation"}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${autoTranslate ? 'bg-[#F2AE00] animate-pulse' : 'bg-white/30'}`} />
                <span>AI Auto</span>
              </button>
              
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
                          setShowTranslationSettings(true);
                          setShowMenu(false);
                        }}
                        className="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-white/5 text-xs text-white/80 hover:text-white flex items-center gap-2 transition-colors font-medium hover:text-luxury-gold"
                      >
                        <Globe size={14} className="text-luxury-gold" />
                        Translation Settings
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
                        <span className="text-sm select-none">{actLang.flag}</span>
                        Translate to {actLang.name} ({messages.filter(m => m.sender === 'idol' && !m.translatedText).length})
                      </button>
                      
                      <div className="h-[1px] bg-white/5 my-1" />
                      <button
                        onClick={() => {
                          const newVal = !infiniteChat;
                          setInfiniteChat(newVal);
                          localStorage.setItem('bubble_infinite_chat_mode', String(newVal));
                          triggerHaptic(10);
                          setShowMenu(false);
                        }}
                        className="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-white/5 text-xs text-white/80 hover:text-white flex items-center justify-between transition-colors font-medium hover:text-luxury-gold"
                      >
                        <span className="flex items-center gap-2">
                          <Check size={14} className={infiniteChat ? "text-amber-400" : "text-white/40"} />
                          Endless Portal Mode
                        </span>
                        <span className={`text-[8px] px-1.5 py-0.5 rounded font-black tracking-wider uppercase ${infiniteChat ? 'bg-amber-400/20 text-amber-300 border border-amber-400/35' : 'bg-white/10 text-white/50 border border-white/5'}`}>
                          {infiniteChat ? 'ACTIVE' : 'OFF'}
                        </span>
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
            onScroll={handleScroll}
            className="flex-1 min-h-0 overflow-y-auto p-3.5 md:p-6 scrolling-content-fade"
          >
            <div ref={contentRef} className="space-y-3.5 md:space-y-4">
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
                    initial={msg.replyTo ? { 
                      opacity: 0, 
                      y: 28, 
                      scale: 0.98,
                      originX: msg.sender === 'idol' ? 0 : 1,
                      originY: 0
                    } : { 
                      opacity: 0, 
                      y: 12, 
                      scale: 0.95, 
                      originX: msg.sender === 'idol' ? 0 : 1,
                      originY: 0
                    }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={msg.replyTo ? { 
                      type: 'spring',
                      damping: 18,
                      stiffness: 90,
                      delay: 0.04
                    } : { 
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

                    <motion.div 
                      id={`msg-${msg.id}`}
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
                      initial={msg.replyTo ? { y: 20, opacity: 0 } : undefined}
                      animate={
                        highlightedMessageId === msg.id
                          ? {
                              scale: [1, 1.05, 0.98, 1.03, 1],
                              borderColor: [
                                "rgba(212, 175, 55, 0.2)",
                                "rgba(255, 51, 119, 1)",
                                "rgba(212, 175, 55, 1)",
                                "rgba(255, 51, 119, 1)",
                                "rgba(212, 175, 55, 0.2)"
                              ],
                              boxShadow: [
                                "0 4px 10px rgba(0, 0, 0, 0.15)",
                                "0 0 35px rgba(255, 51, 119, 0.9)",
                                "0 0 35px rgba(212, 175, 55, 0.9)",
                                "0 0 25px rgba(255, 51, 119, 0.7)",
                                "0 4px 10px rgba(0, 0, 0, 0.15)"
                              ]
                            }
                          : msg.replyTo
                          ? { 
                              y: 0, 
                              opacity: 1,
                              borderColor: [
                                "rgba(255, 51, 119, 0.1)", 
                                "rgba(255, 51, 119, 0.8)", 
                                "rgba(212, 175, 55, 0.8)", 
                                "rgba(255, 51, 119, 0.1)"
                              ],
                              boxShadow: [
                                "0 4px 10px rgba(0, 0, 0, 0.15)",
                                "0 4px 22px rgba(255, 51, 119, 0.35)",
                                "0 4px 22px rgba(212, 175, 55, 0.28)",
                                "0 4px 10px rgba(0, 0, 0, 0.15)"
                              ]
                            }
                          : undefined
                      }
                      transition={
                        highlightedMessageId === msg.id
                          ? {
                              duration: 1.8,
                              ease: "easeInOut",
                              times: [0, 0.2, 0.4, 0.7, 1]
                            }
                          : msg.replyTo
                          ? {
                              y: { type: 'spring', damping: 14, stiffness: 120 },
                              borderColor: { duration: 2.4, ease: "easeInOut" },
                              boxShadow: { duration: 2.4, ease: "easeInOut" }
                            }
                          : undefined
                      }
                      className={`max-w-[80%] px-4 py-2.5 md:py-3 rounded-2xl md:rounded-[2rem] shadow-lg relative cursor-pointer select-none group hover:brightness-[1.03] active:scale-[0.99] transition-all duration-150 ${
                        highlightedMessageId === msg.id
                          ? 'border-2 border-luxury-gold ring-4 ring-luxury-gold/50 shadow-[0_0_30px_rgba(212,175,55,0.6)]'
                          : msg.sender === 'idol' && msg.type === 'image'
                            ? 'p-2.5 bg-white text-neutral-900 rounded-xl shadow-xl border border-white/50 flex flex-col items-center rotate-1 hover:rotate-0 transition-all duration-300'
                            : msg.sender === 'idol'
                              ? `glass text-white/90 ${msg.translatedText ? 'border-[#F2AE00]/40 shadow-[0_4px_22px_-4px_rgba(242,174,0,0.18)] bg-gradient-to-b from-white/[0.04] to-amber-500/[0.02]' : 'border-luxury-magenta/10'} ${isConsecutive ? 'rounded-tl-2xl' : 'rounded-tl-xs'}`
                              : `bg-gradient-to-tr from-luxury-magenta to-luxury-gold text-white font-medium ${isConsecutive ? 'rounded-tr-2xl' : 'rounded-tr-xs'}`
                      }`}
                    >
                      {/* Local Floating Hearts Particle Effect Container */}
                      {msg.reaction === '❤️' && (
                        <div className="absolute inset-0 pointer-events-none overflow-visible z-30">
                          <AnimatePresence>
                            {bubbleHearts
                              .filter((h) => h.msgId === msg.id)
                              .map((heart) => (
                                <motion.div
                                  key={heart.id}
                                  initial={{ opacity: 0, scale: 0.2, y: 15, x: `${50 + heart.x}%`, rotate: heart.rotate }}
                                  animate={{
                                    opacity: [0, 1, 1, 0],
                                    scale: [0.2, 1.2, 1.4, 0.9],
                                    y: [15, -25, -60, -100],
                                    x: [
                                      `${50 + heart.x}%`,
                                      `${50 + heart.x + (Math.random() * 20 - 10)}%`,
                                      `${50 + heart.x + (Math.random() * 35 - 17.5)}%`,
                                      `${50 + heart.x + (Math.random() * 50 - 25)}%`
                                    ],
                                    rotate: [heart.rotate, heart.rotate + Math.random() * 40 - 20, heart.rotate + Math.random() * 80 - 40]
                                  }}
                                  transition={{
                                    duration: 1.8,
                                    delay: heart.delay,
                                    ease: 'easeOut',
                                  }}
                                  onAnimationComplete={() => removeBubbleHeart(heart.id)}
                                  className={`absolute pointer-events-none drop-shadow-[0_2px_6px_rgba(255,51,119,0.4)] ${heart.color} select-none`}
                                  style={{ fontSize: `${heart.size}px`, bottom: '0px' }}
                                >
                                  ❤️
                                </motion.div>
                              ))}
                          </AnimatePresence>
                        </div>
                      )}

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

                            {/* Dynamic Translation Toggle inside Popover */}
                            {msg.text && (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  triggerHaptic(10);
                                  setActiveReactionMessageId(null);
                                  await handleTranslateMessage(msg);
                                }}
                                className={`flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider font-bold rounded-full px-2.5 py-1 border hover:scale-105 active:scale-95 transition-all cursor-pointer ml-1 ${
                                  msg.translatedText 
                                    ? 'bg-luxury-magenta text-white border-luxury-magenta/30 hover:bg-rose-500' 
                                    : 'bg-white/10 text-white border-white/10 hover:bg-luxury-gold hover:text-black'
                                }`}
                                title={msg.translatedText ? `Hide ${actLang.name} translation` : `Translate to ${actLang.name}`}
                              >
                                <span className="text-xs leading-none">{actLang.flag}</span> {msg.translatedText ? "Hide" : actLang.name}
                              </button>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Render Referencing Reply header preview if this msg is a reply */}
                      {msg.replyTo && (
                        <div 
                          onClick={(e) => handleReplyIndicatorClick(e, msg.replyTo!.id)}
                          className="mb-2 px-2.5 py-1.5 rounded-lg bg-black/30 border-l-2 border-luxury-magenta text-[10px] opacity-90 backdrop-blur-md space-y-0.5 max-w-full cursor-pointer hover:bg-black/55 hover:border-l-luxury-gold hover:scale-[1.01] active:scale-[0.99] transition-all group/reply select-none shadow-[inset_0_1px_5px_rgba(0,0,0,0.4)]"
                          title="Click to locate parent message with pulse highlight"
                        >
                          <div className="font-bold text-luxury-gold tracking-widest uppercase text-[7px] flex items-center justify-between gap-1 select-none">
                            <div className="flex items-center gap-1">
                              <span>↩ REPLIED TO</span>
                              <span className="text-white/60">@{msg.replyTo.senderName}</span>
                            </div>
                            <span className="text-[6.5px] text-luxury-gold/70 tracking-wider uppercase font-mono animate-pulse group-hover/reply:text-white">Tap to locate 🔍</span>
                          </div>
                          <div className="text-white/80 truncate text-[10px] font-sans">
                            {msg.replyTo.text}
                          </div>
                        </div>
                      )}

                      {msg.sender === 'idol' && !isConsecutive && (
                        <div className="text-[10px] md:text-xs text-luxury-gold font-bold mb-1 tracking-wider flex items-center gap-1 border-b border-white/5 pb-1">
                          <span>{speakingIdol?.instagram || senderName}</span>
                          <span className="text-[7px] text-white/40 px-1 rounded bg-white/5 border border-white/5 font-mono scale-90 uppercase">{speakingIdol?.personalityTag || 'Member'}</span>
                          {!currentGroup && msg.type !== 'image' && (
                            <div className="ml-auto flex items-center gap-1 opacity-40">
                              <Sparkles size={8} />
                              <span className="text-[7px] uppercase tracking-tighter font-bold text-luxury-gold pt-[1px] leading-none">Private Bubble</span>
                            </div>
                          )}
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
                                onLoad={() => {
                                  if (scrollRef.current) {
                                    scrollRef.current.scrollTo({
                                      top: scrollRef.current.scrollHeight,
                                      behavior: 'smooth'
                                    });
                                  }
                                }}
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
                              onLoad={() => {
                                if (scrollRef.current) {
                                  scrollRef.current.scrollTo({
                                    top: scrollRef.current.scrollHeight,
                                    behavior: 'smooth'
                                  });
                                }
                              }}
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
                              <motion.span
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.4 }}
                              >
                                {renderTextWithMentions(msg.text)}
                              </motion.span>
                            ) : (
                              renderTextWithMentions(msg.text || '')
                            )}
                          </p>
                          {msg.translatedText && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="border-t border-white/10 pt-2 mt-2 text-xs flex flex-col gap-1.5 relative border-dashed"
                            >
                              <div className="flex items-center justify-between pointer-events-none select-none">
                                <span className="text-[7.5px] uppercase tracking-wider font-extrabold text-[#F2AE00] bg-amber-500/10 border border-[#F2AE00]/20 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse-soft">
                                  <Languages size={9} strokeWidth={2.5} className="text-[#F2AE00]" />
                                  <span>{actLang.flag} {actLang.name} Translation</span>
                                </span>
                                <span className="text-[6.5px] uppercase tracking-widest font-mono font-bold text-white/30 flex items-center gap-1">
                                  <Sparkles size={8} className="text-[#F2AE00]/80" />
                                  <span>Gemini AI</span>
                                </span>
                              </div>
                              <p className="leading-relaxed font-sans font-medium text-white/95 text-[11px] md:text-xs pl-0.5 pr-0.5">{msg.translatedText}</p>
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
                      <div className={`flex items-center gap-2 mt-1.5 opacity-30 hover:opacity-100 transition-opacity duration-200 ${msg.sender === 'player' ? 'justify-end' : 'justify-between'} ${msg.sender === 'idol' && msg.type === 'image' ? 'text-black/50 justify-center' : ''}`}>
                        <div className="flex items-center gap-1.5 font-sans">
                          <span className="text-[8px] font-mono font-medium">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          
                          {/* Inline estimated reading time for longer idol messages */}
                          {msg.sender === 'idol' && msg.text && msg.text.length > 55 && (
                            <span className="text-[7.5px] font-mono tracking-wider uppercase bg-white/10 px-1.5 py-0.5 rounded flex items-center gap-1 select-none font-bold text-luxury-gold/80 border border-white/5" title="Estimated reading time">
                              ⏱️ {getEstimatedReadTime(msg.text)}
                            </span>
                          )}

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

                          {msg.sender === 'player' && msg.type !== 'image' && msg.type !== 'voice' && (
                            <div className="flex items-center gap-1">
                              {/* Cloned Voice generator */}
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  triggerHaptic(12);
                                  handleGenerateAIVoice(msg);
                                }}
                                disabled={generatingVoiceMessageId === msg.id}
                                className={`hover:scale-105 transition-all p-1 rounded-full cursor-pointer inline-flex items-center justify-center text-purple-400 hover:text-purple-300 ${
                                  generatingVoiceMessageId === msg.id ? 'animate-pulse' : ''
                                }`}
                                title={msg.audioUrl ? "Play Real Voice Cloned Track" : "Generate Custom AI Voice Clone"}
                              >
                                {generatingVoiceMessageId === msg.id ? (
                                  <motion.div 
                                    animate={{ rotate: 360 }}
                                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                                    className="w-3.5 h-3.5 border-2 border-purple-500 border-t-transparent rounded-full"
                                  />
                                ) : (
                                  <span className="text-[7.5px] font-sans font-black tracking-widest uppercase bg-purple-500/15 hover:bg-purple-500/25 px-1.5 py-0.5 rounded-full border border-purple-500/20 text-purple-300 transition-colors">
                                    🎙️ CLONE
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
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerHaptic(5);
                            if (msg.reaction === '❤️') {
                              triggerBubbleHearts(msg.id);
                            } else {
                              setActiveReactionMessageId(activeReactionMessageId === msg.id ? null : msg.id);
                            }
                          }}
                          className={`absolute -bottom-2 z-10 p-1 rounded-full bg-neutral-900 border border-white/10 shadow-lg flex items-center justify-center text-xs w-6 h-6 hover:scale-130 active:scale-95 transition-transform cursor-pointer ${
                            msg.sender === 'idol' ? 'right-4' : 'left-4'
                          }`}
                        >
                          {msg.reaction}
                        </motion.div>
                      )}
                    </motion.div>

                    {/* Companion status indicator next to the Chat Bubble for long idol messages */}
                    {msg.sender === 'idol' && msg.text && msg.text.length > 55 && (
                      <div className="text-[10px] font-bold text-luxury-gold/80 select-none pl-1.5 pb-1 pr-1 pointer-events-none text-left flex flex-col justify-end h-full self-end leading-none shrink-0 mb-1">
                        <span className="text-[7.5px] opacity-35 tracking-widest font-mono select-none uppercase bg-white/5 border border-white/5 px-2 py-1 rounded-lg flex items-center gap-1">
                          ⏱ {getEstimatedReadTime(msg.text)}
                        </span>
                      </div>
                    )}
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
            </div>
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
                    <h4 className="text-[10px] md:text-xs font-black text-luxury-gold uppercase tracking-[0.08em] flex items-center gap-1.5">
                      Batch-Translate to {actLang.name} <span className="text-sm select-none leading-none">{actLang.flag}</span>
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
          <footer className="glass-gold px-4 md:px-6 pt-3 md:pt-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] md:pb-6 rounded-t-[2rem] md:rounded-t-[2.5rem] mt-auto shrink-0 z-10">
            {/* Mention Dropdown Popover */}
            <AnimatePresence>
              {showMentionDropdown && filteredMentionIdols.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 15, scale: 0.98 }}
                  className="mb-3 p-1.5 rounded-2xl bg-luxury-black/95 backdrop-blur-xl border border-luxury-gold/20 flex flex-col gap-1 max-h-48 overflow-y-auto shadow-[0_4px_30px_rgba(212,175,55,0.15)] z-20"
                >
                  <div className="px-2.5 py-1 border-b border-white/5 flex items-center justify-between">
                    <span className="text-[8px] uppercase tracking-widest font-black text-luxury-gold flex items-center gap-1.5">
                      <Sparkles size={8} className="animate-spin-slow" />
                      Mention Group Member
                    </span>
                    <span className="text-[7px] font-mono text-white/35">Press ↑↓ to select, ↵ to insert</span>
                  </div>
                  {filteredMentionIdols.map((member, idx) => {
                    const isSelected = idx === activeMentionIndex;
                    return (
                      <div
                        key={member.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          selectIdolMention(member.name);
                        }}
                        onMouseEnter={() => setActiveMentionIndex(idx)}
                        className={`px-2.5 py-2 rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                          isSelected 
                            ? 'bg-gradient-to-r from-luxury-magenta/20 to-luxury-gold/10 border-l-4 border-luxury-gold pl-2 text-white' 
                            : 'hover:bg-white/5 text-white/70 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div 
                            className="w-7 h-7 rounded-full bg-cover bg-center border border-white/10"
                            style={{ backgroundImage: `url(${member.image})` }}
                          />
                          <div className="text-left">
                            <p className="font-bold text-xs leading-none flex items-center gap-1">
                              <span>{member.name}</span>
                              <span className="text-[7.5px] uppercase tracking-wider font-extrabold px-1 py-0.5 rounded bg-luxury-magenta/15 border border-luxury-magenta/30 text-rose-300 leading-none">@{member.name}</span>
                            </p>
                            <p className="text-[9px] text-white/40 mt-0.5 leading-none truncate max-w-[170px]">{member.role}</p>
                          </div>
                        </div>
                        <span className="text-[9px] font-mono text-luxury-gold/70 group-hover:text-luxury-gold">{member.personalityTag}</span>
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>

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
                    onChange={handleInputChange}
                    onKeyDown={handleInputKeyDown}
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

      {/* Profile Card & Customization Bottom Drawer Panel */}
      <AnimatePresence>
        {showProfileCard && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 z-[100] cursor-pointer"
              onClick={() => setShowProfileCard(false)}
            />
            
            {/* Slide-Up Cabinet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-x-0 bottom-0 z-[110] glass-gold rounded-t-[2.5rem] border-t border-luxury-gold/20 shadow-[0_-10px_50px_rgba(0,0,0,0.8)] px-6 md:px-8 pt-6 md:pt-8 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:pb-8 flex flex-col max-h-[85vh] overflow-y-auto select-none bg-luxury-black/98"
            >
              {/* Drag Handle Aesthetic strip */}
              <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6 shrink-0 cursor-pointer" onClick={() => setShowProfileCard(false)} />
              
              {/* Profile Card Content */}
              <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center">
                {/* Visual Avatar frame & Level badge */}
                <div className="relative">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl md:rounded-3xl bg-cover bg-center border-2 border-luxury-gold shadow-2xl shrink-0" style={{ backgroundImage: `url(${currentGroup ? currentGroup.image : currentIdol.image})` }} />
                  <div className="absolute -bottom-2 -left-2 bg-gradient-to-tr from-luxury-magenta to-luxury-gold text-white text-[9px] uppercase tracking-widest font-black px-3 py-1 rounded-full border border-white/10 shadow-lg">
                    {currentGroup ? 'OT9 UNIT' : `MBTI: ${IDOL_STATUSES[currentIdol.id]?.mbti || 'INFP'}`}
                  </div>
                </div>

                {/* Info block */}
                <div className="flex-1 text-center md:text-left space-y-2 md:space-y-3">
                  <div className="flex flex-col md:flex-row md:items-center gap-1.5 md:gap-3 justify-center md:justify-start">
                    <h2 className="text-xl md:text-2xl font-display font-black text-white uppercase tracking-wider flex items-center justify-center md:justify-start gap-2">
                      {currentGroup ? currentGroup.name : currentIdol.name}
                      <span className="text-xl select-none">{currentGroup ? '👑' : IDOL_STATUSES[currentIdol.id]?.favoriteEmoji || '💖'}</span>
                    </h2>
                    <span className="inline-block self-center px-2.5 py-0.5 rounded-full bg-luxury-magenta/15 border border-luxury-magenta/35 text-[8px] font-bold text-luxury-magenta tracking-widest uppercase">
                      Premium Bubble Active
                    </span>
                  </div>

                  {!currentGroup && currentIdol.instagram && (
                    <div className="flex justify-center md:justify-start">
                      <a href={`https://instagram.com/${currentIdol.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-[10px] font-mono text-white/80 hover:text-luxury-gold">
                        <span className="text-luxury-magenta">@</span> {currentIdol.instagram.replace('@', '')}
                      </a>
                    </div>
                  )}

                  <p className="text-xs text-white/70 max-w-md italic font-medium leading-relaxed">
                    "{currentGroup ? currentGroup.voiceIntro : IDOL_STATUSES[currentIdol.id]?.status || currentIdol.voiceIntro}"
                  </p>

                  <div className="grid grid-cols-2 gap-3 max-w-sm pt-2">
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-left">
                      <span className="text-[7.5px] font-mono text-white/30 block tracking-widest uppercase mb-0.5">Subscription</span>
                      <span className="text-[10px] font-sans font-extrabold text-[#FFAA85] flex items-center gap-1">
                        🎁 {subscriptionDays} Days Left
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-left">
                      <span className="text-[7.5px] font-mono text-white/30 block tracking-widest uppercase mb-0.5">Bond Strength</span>
                      <span className="text-[10px] font-sans font-extrabold text-luxury-gold flex items-center gap-1">
                        💖 {(currentGroup ? currentGroup.difficulty : currentIdol.difficulty) * 10}% Complete
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Wallpaper customizer list */}
              <div className="border-t border-white/5 pt-6 mt-6 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <h4 className="text-[9px] md:text-xs font-black uppercase text-luxury-gold tracking-[0.2em] flex items-center gap-1.5">
                    🎨 Tune Bubble Wallpaper
                  </h4>
                  <span className="text-[8px] text-white/35 uppercase font-mono tracking-wider">Live background change</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {WALLPAPERS.map((wp) => {
                    const isActive = selectedWallpaperId === wp.id;
                    return (
                      <button
                        key={wp.id}
                        onClick={() => handleSelectWallpaper(wp.id)}
                        className={`p-3 rounded-2xl border transition-all flex flex-col gap-2.5 text-left items-stretch relative overflow-hidden active:scale-95 cursor-pointer ${
                          isActive 
                            ? 'border-luxury-gold/50 bg-luxury-gold/10 shadow-[0_4px_15px_rgba(212,175,55,0.15)]' 
                            : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05]'
                        }`}
                      >
                        {/* Visual Wallpaper gradient circle mockup */}
                        <div className={`h-10 rounded-xl ${wp.preview} border border-white/10`} />
                        <div className="flex flex-col">
                          <span className={`text-[10.5px] font-bold ${isActive ? 'text-luxury-gold' : 'text-white/80'}`}>{wp.name}</span>
                          <span className="text-[7px] uppercase tracking-wider font-mono text-white/30 leading-none">Preset Wallpaper</span>
                        </div>
                        {isActive && (
                          <div className="absolute top-2 right-2 bg-luxury-gold text-black w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black border border-white/20">
                            ✓
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Close Bottom Strip */}
              <div className="mt-6 flex justify-center">
                <button
                  onClick={() => setShowProfileCard(false)}
                  className="px-8 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 text-xs font-black uppercase tracking-wider transition-all duration-300 active:scale-95 cursor-pointer"
                >
                  Close Profile Settings
                </button>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Translation Settings Center bottom Drawer panel */}
      <AnimatePresence>
        {showTranslationSettings && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 z-[100] cursor-pointer"
              onClick={() => setShowTranslationSettings(false)}
            />
            
            {/* Slide-Up Cabinet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-x-0 bottom-0 z-[110] glass-gold rounded-t-[2.5rem] border-t border-luxury-gold/20 shadow-[0_-10px_50px_rgba(0,0,0,0.8)] px-6 md:px-8 pt-6 md:pt-8 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:pb-8 flex flex-col max-h-[85vh] overflow-y-auto select-none bg-luxury-black/98"
            >
              {/* Drag Handle Accent */}
              <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6 shrink-0 cursor-pointer" onClick={() => setShowTranslationSettings(false)} />
              
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-luxury-gold/10 border border-luxury-gold/20 text-luxury-gold">
                  <Languages size={20} />
                </div>
                <div>
                  <h2 className="text-lg md:text-xl font-display font-black text-white uppercase tracking-wider">
                    Translation Settings
                  </h2>
                  <p className="text-[10px] md:text-xs text-white/50">
                    Customize your neural Gemini language adapter
                  </p>
                </div>
              </div>

              {/* Autotranslate Option Panel */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3 mb-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-white uppercase tracking-wider">Auto-Translate Incoming Chats</p>
                    <p className="text-[10px] text-white/40">Translate messages from idols as soon as they arrive in real-time.</p>
                  </div>
                  <button
                    onClick={() => {
                      const updated = !autoTranslate;
                      setAutoTranslate(updated);
                      localStorage.setItem('bubble_auto_translate', String(updated));
                      triggerHaptic(10);
                    }}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
                      autoTranslate ? 'bg-luxury-gold' : 'bg-white/10'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-black shadow ring-0 transition duration-200 ease-in-out ${
                        autoTranslate ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Language Selection Grid */}
              <div className="space-y-3">
                <span className="text-[8px] font-mono tracking-widest text-[#F59E0B] uppercase font-bold">
                  Select Translation Language
                </span>
                
                <div className="grid grid-cols-2 gap-2.5">
                  {SUPPORTED_LANGS.map((lang) => {
                    const isSelected = targetLang === lang.code;
                    return (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setTargetLang(lang.code);
                          localStorage.setItem('bubble_target_lang', lang.code);
                          triggerHaptic(15);
                        }}
                        className={`p-3 rounded-2xl text-left border flex items-center gap-2.5 transition-all outline-none ${
                          isSelected
                            ? 'bg-gradient-to-tr from-luxury-magenta/20 to-luxury-gold/10 border-luxury-gold text-white shadow-[0_4px_15px_-5px_rgba(255,215,0,0.25)]'
                            : 'bg-white/[0.01] border-white/5 hover:bg-white/5 text-white/70 hover:text-white'
                        }`}
                      >
                        <span className="text-lg md:text-xl leading-none select-none">{lang.flag}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black uppercase tracking-wider truncate leading-tight">{lang.name}</p>
                          <p className={`text-[8.5px] font-mono leading-none mt-0.5 ${isSelected ? 'text-luxury-gold' : 'text-white/30'}`}>
                            {lang.localLabel || 'Translate'}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-luxury-gold text-black flex items-center justify-center font-bold">
                            <Check size={11} strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Informative Note Footer */}
              <div className="border-t border-white/5 mt-6 pt-4 text-[9.5px] leading-relaxed text-white/30 flex items-start gap-2 select-none">
                <span className="text-xs">💡</span>
                <p>
                  Gemini Neural Translation adapts Japanese, Korean, and English expressions dynamically. Slang, emotional nuance, and emojis are preserved in-character.
                </p>
              </div>

              <div className="mt-6 flex justify-center">
                <button
                  onClick={() => setShowTranslationSettings(false)}
                  className="px-8 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 text-xs font-black uppercase tracking-wider transition-all duration-300 active:scale-95 cursor-pointer w-full text-center"
                >
                  Close Settings
                </button>
              </div>
            </motion.div>
          </>
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
