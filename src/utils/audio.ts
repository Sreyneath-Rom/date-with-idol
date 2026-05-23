/**
 * Native Audio Synthesizer and Speech Engine
 * Avoids any external assets/mp3 dependencies to ensure speed and local execution
 */

interface AudioState {
  ringtoneInterval: any | null;
  audioCtx: AudioContext | null;
}

const state: AudioState = {
  ringtoneInterval: null,
  audioCtx: null,
};

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!state.audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      state.audioCtx = new AudioContextClass();
    }
  }
  if (state.audioCtx && state.audioCtx.state === 'suspended') {
    state.audioCtx.resume();
  }
  return state.audioCtx;
}

/**
 * Synthesizes a soft, clean message sent sound (upwards chirp)
 */
export function playSentSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(450, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.12);

  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.12);
}

/**
 * Synthesizes a beautiful dual-tone bubble notification chime (received message)
 */
export function playReceivedSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  
  // Note 1 (E6, ~1318Hz)
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'triangle';
  osc1.frequency.setValueAtTime(1318, now);
  gain1.gain.setValueAtTime(0.07, now);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start(now);
  osc1.stop(now + 0.18);

  // Note 2 (A6, ~1760Hz, slightly delayed)
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(1760, now + 0.08);
  gain2.gain.setValueAtTime(0.07, now + 0.08);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(now + 0.08);
  osc2.stop(now + 0.28);
}

/**
 * Begins playing a loop of elegant premium call-ringing sounds
 */
export function startRingtoneLoop() {
  if (state.ringtoneInterval) clearInterval(state.ringtoneInterval);

  const playRingInstance = () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Dual-frequency cozy calling ringtone rhythm
    [480, 520].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.04, now + 0.05);
      gain.gain.setValueAtTime(0.04, now + 0.8);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.0);
    });
  };

  playRingInstance();
  state.ringtoneInterval = setInterval(playRingInstance, 2200);
}

/**
 * Stops any active call-ringing sound loop
 */
export function stopRingtoneLoop() {
  if (state.ringtoneInterval) {
    clearInterval(state.ringtoneInterval);
    state.ringtoneInterval = null;
  }
}

/**
 * Plays a discrete hang-up beep sound
 */
export function playCallEndSound() {
  stopRingtoneLoop();
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(320, now);
  osc.frequency.setValueAtTime(240, now + 0.1);

  gain.gain.setValueAtTime(0.06, now);
  gain.gain.setValueAtTime(0.06, now + 0.1);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.25);
}

let activePremiumAudio: HTMLAudioElement | null = null;

function speakWithBrowserSynthesis(text: string, idolName: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  // Cancel any active speak queues to avoid overlapping
  window.speechSynthesis.cancel();

  // Strip emojis from the spoken text for cleaner audio reading
  const cleanText = text.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '');

  const utterance = new SpeechSynthesisUtterance(cleanText);

  // Retrieve matching sound voice
  const voices = window.speechSynthesis.getVoices();
  
  // Look for a pleasant high quality female voice as default for K-pop idols
  const voice = voices.find(v => 
    v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Karen') || v.name.includes('Zira'))
  ) || voices.find(v => v.lang.startsWith('en')) || voices[0];

  if (voice) {
    utterance.voice = voice;
  }

  // Personalize voice properties according to the general personality of Twice members
  let pitch = 1.2; // Slightly cute and crisp
  let rate = 1.0;  // Natural talking speed

  if (idolName.toLowerCase() === 'nayeon') {
    pitch = 1.25; // Energetic and fast-paced
    rate = 1.05;
  } else if (idolName.toLowerCase() === 'mina' || idolName.toLowerCase() === 'tzuyu') {
    pitch = 1.1;  // Elegant and slow, velvety
    rate = 0.9;
  } else if (idolName.toLowerCase() === 'momo') {
    pitch = 1.3;  // Very energetic and cute
    rate = 1.0;
  } else if (idolName.toLowerCase() === 'sana') {
    pitch = 1.35; // Brightest bubble/cute
    rate = 1.05;
  }

  utterance.pitch = pitch;
  utterance.rate = rate;
  utterance.volume = 1.0;

  window.speechSynthesis.speak(utterance);
}

/**
 * Voice Speech Engine utilizing the Premium Server-side Gemini TTS first,
 * with Web Speech Synthesis API as dynamic offline/rate-limit fallback.
 */
export function speakText(text: string, idolName: string) {
  if (typeof window === 'undefined') return;

  // Cancel active browser speak queue to avoid overlapping
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }

  // Stop previous premium audio if running
  if (activePremiumAudio) {
    activePremiumAudio.pause();
    activePremiumAudio = null;
  }

  // Retrieve active selected voice clone details from localstorage to apply AI Voice Clone everywhere
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

  const headers = { 'Content-Type': 'application/json' };
  let fetchPromise;

  if (activeClone) {
    console.log(`[Audio Engine] Synthesizing everywhere command with Cloned Voice: "${activeClone.name}"`);
    fetchPromise = fetch('/api/voice-clone/tts', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        text,
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
    // Normal standard TTS fallback
    fetchPromise = fetch('/api/tts', {
      method: 'POST',
      headers,
      body: JSON.stringify({ text, idolName })
    });
  }

  fetchPromise
    .then(res => {
      if (!res.ok) throw new Error("premium tts status " + res.status);
      return res.json();
    })
    .then(data => {
      if (data.audio) {
        const mimeType = data.mimeType || "audio/wav";
        const audioUrl = `data:${mimeType};base64,${data.audio}`;
        
        const audio = new Audio(audioUrl);
        activePremiumAudio = audio;
        
        audio.play().catch(err => {
          console.warn("Premium voice player blocked, falling back to synthesis", err);
          speakWithBrowserSynthesis(text, idolName);
        });
      } else {
        speakWithBrowserSynthesis(text, idolName);
      }
    })
    .catch(err => {
      console.warn("Premium voice fetch failed, using robotic fallback:", err);
      speakWithBrowserSynthesis(text, idolName);
    });
}
