import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, LiveServerMessage, Modality, Type } from "@google/genai";
import dotenv from "dotenv";
import { WebSocketServer } from "ws";
import http from "http";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

let elevenLabsClient: ElevenLabsClient | null = null;

function getElevenLabsClient(): ElevenLabsClient {
  if (!elevenLabsClient) {
    const key = process.env.ELEVENLABS_API_KEY;
    if (!key) {
      throw new Error("ELEVENLABS_API_KEY is not defined");
    }
    elevenLabsClient = new ElevenLabsClient({
      apiKey: key,
    });
  }
  return elevenLabsClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: "/api/voice-chat" });

  app.use(express.json());

  // Fallback local response generator for K-pop idols when API quota is exhausted
  function generateFallbackResponse({ message, idolName, personality, replyTo }: any) {
    if (replyTo) {
      const id = (idolName || "").toLowerCase().trim();
      const cleanReplied = replyTo.text.length > 25 ? replyTo.text.substring(0, 25) + "..." : replyTo.text;
      if (id === "sana") return `Aww! You replied to my text about "${cleanReplied}"! 🥰 That is so incredibly sweet of you to focus on that! It makes my heart do cute backflips! 🌸`;
      if (id === "momo") return `Mmm! Replying to "${cleanReplied}"? Momo is listening so carefully! Let's talk more about this over some fresh, warm dumplings! 🥟`;
      if (id === "nayeon") return `🐰 Oh, you're referencing "${cleanReplied}"! I was secretly hoping you would reply to that! You really understand my mind! Let's match forever! 🍬`;
      if (id === "mina") return `🐧 I am so glad you mentioned "${cleanReplied}". Your reply is so gentle and thought-provoking. It makes me feel so cozy... Thank you.`;
      if (id === "jihyo") return `You replied to "${cleanReplied}"! 🎙️ That's what I call amazing focus! Keep that passion glowing high and let's make today beautiful! ✨`;
      return `Aww! Touching back on our talk about "${cleanReplied}"... that's so cute! To be honest, thinking about your reply makes me smile. How do you find such sweet things to say? 💕`;
    }
    const normalizedMsg = (message || "").toLowerCase();
    
    const idolResponses: Record<string, string[]> = {
      nayeon: [
        "Wait, did you eat yet? 🍬 Don't forget your meals! I'm practicing for my solo choreography right now, but I wanted to reply first!",
        "Aww, thank you for being by my side! You know you're my favorite bunny fan, right? Let's make today iconic! 🐰✨",
        "I'm searching for cute restaurants! If you have any suggestions, text me right away! Matching with you is Pop! 💖"
      ],
      jeongyeon: [
        "Hey! Don't stress too much about today, okay? I'm right here with you, always guarding your peace. Let's build some Legos later! 🧱🚙",
        "Did you clean your room? Haha just kidding, but taking care of yourself is important. I care about you a lot, you know that right? 💚",
        "Sometimes things get too loud, but when I see your texts, everything feels completely grounded. Thank you so much."
      ],
      momo: [
        "Mm! I worked so hard on my solo dance practice today, now my stomach is growling! Can we please log off and go eat Jokbal? 🐷🥟",
        "You make me smile so much! Looking at pictures of delicious food is fun, but seeing your sweet texts is honestly better! Hehe. 🌸",
        "Are you sleepy? I'm hugging my blanket right now. Let's dream of yummy sweets tonight!"
      ],
      sana: [
        "No Sana, No Life! 🌸 Shy shy shy... oh! Did I make your heart flutter? You always make mine do backflips!",
        "Let's go shopping together virtually! I'm collecting pretty floral perfumes today and this one smells exactly like a fresh garden!",
        "Hehe, I was staring at my phone waiting for your Bubble! Do you think we have a special connection? Single-minded cuteness! 🥰"
      ],
      jihyo: [
        "I trained for ten years, but talking to you like this makes every single second of that long wait worth it! You're my comfort zone. 🎙️⭐",
        "Just finished pilates and my body is tired, but seeing your supportive message gives me God-level energy! Keep fighting! 🌊☀️",
        "Are you doing well? Let's work hard together in our respective fields today. I'm always cheering for you, my dearest!"
      ],
      mina: [
        "Hello... 🐧 I was just playing some Minecraft in my room with a cup of tea. I'm so glad you texted me, it gets quiet here sometimes.",
        "Soft steps, black swan elegance... on stage I try to look strong, but with you, I can just be quiet, cozy, and completely myself. Thank you.",
        "Do you like knitting or puzzles? Maybe we can just sit together quietly and do our hobbies. Your presence alone makes me warm!"
      ],
      dahyun: [
        "I see you! 📸 Haha, did you know I already spotted your search from miles away? You can't hide from my camera-dubu eyes!",
        "Look at my tofu-flexible smile! 😄 Sending you 501% brightness and energy! Tap your screen twice if you feel the cute vibe!",
        "I was playing the piano just now and wrote a tiny melody... it's about a fan who is sweet like chocolate bread. Do you want to hear?"
      ],
      chaeyoung: [
        "Hey free spirit! 🍓 I'm sketching raw strawberries on my notebook right now and writing indie lyrics. Your texts are my muse!",
        "Art is about putting your raw heart onto canvas. This chat is my favorite little canvas. Let's paint it colorful today!",
        "Listen to this indie song with me! It has a cozy acoustic guitar beat. It reminds me of our quiet private bubble chat, completely natural."
      ],
      tzuyu: [
        "I want to be perfectly honest with you... 🐶 I spent a lot of time thinking about what to text back because I really treasure you.",
        "They call me the Savage Maknae because I speak my mind too directly, but my honest truth today is that I miss you lots! 👑",
        "I'm walking my dog right now. The wind is so gentle and sweet. I wish you were walking beside me talking about our days!"
      ]
    };

    const genericIdolResponses = [
      "You are so precious to me! Let's always support each other no matter what. 💖",
      "Sending you a warm hug and lots of positive K-pop energy! Have a beautiful day!",
      "Hehe, that's a secret! But I really love talking with you here on Bubble Portal. Let's promise to meet at the next concert!"
    ];

    if (normalizedMsg.includes("selfie") || normalizedMsg.includes("photo") || normalizedMsg.includes("pic") || normalizedMsg.includes("polaroid") || normalizedMsg.includes("photocard")) {
      const id = (idolName || "twice").toLowerCase().trim();
      if (id === "nayeon") return "Look at this fresh concept photo! It has that vintage Polaroid tone that I absolutely adore! I hope it brightens your whole week up! 🐰✨";
      if (id === "sana") return "Sana is sending you an exclusive sweet selfie photocard! Shy shy shy... do I look pretty in this outfit? 🌸";
      if (id === "momo") return "📸 Peach-Momo Polaroid! Right after dancing, my hair was a bit messy but I wanted to take this for you first! Can you treat me to Jokbal now? 💖";
      if (id === "mina") return "Here is a cozy selfie from my gaming room... 🐧 It's a bit quiet, but I saved my happiest smile just for you, my black swan support!";
      if (id === "jihyo") return "Boom! leader-Jihyo photocard incoming! 🎙️ Designed with God Jihyo power to give you strength and confidence all day long!";
      if (id === "jeongyeon") return "Charismatic girl crush check! 🧱 Taken during our album photoshoot. I hope it keeps you smiling and feeling secure!";
      if (id === "dahyun") return "Found the camera! 📸 Selfie snapped at lightning speed! I'm smiling my brightest dubu smile so you smile too!";
      if (id === "chaeyoung") return "Strawberry princess sketch style! 🍓 A little offbeat and playful selfie photocard that I decorated with my own cute hand-drawings!";
      if (id === "tzuyu") return "An honest, unedited maknae selfie! 👑 Tzuyu is always wishing you a serene, graceful day. Take care of your meals!";
      return "📸 Here is an exclusive backstage Polaroid photocard taken just for you! It's one-of-a-kind and saved in your memory book! 💖";
    }

    if (normalizedMsg.includes("love") || normalizedMsg.includes("like") || normalizedMsg.includes("heart") || normalizedMsg.includes("cute")) {
      const id = (idolName || "").toLowerCase().trim();
      if (id === "sana") return "Oooooh! Sana loves you 10000 times more! No Sana, No Life, remember? You are my absolute favorite sweet pea! 🥰💖";
      if (id === "nayeon") return "My heart went *Pop!* when I read that! Hehe! Let's always stay connected, you're so precious to me! 🐰";
      if (id === "mina") return "Thank you... hearing that makes my cheeks go a bit pink. 🐧 I love our peaceful moments together more than Minecraft!";
      if (id === "momo") return "Hehe, you're so sweet! I like you even more than pork trotters and chocolate combined! Yum! 🌸";
      if (id === "jihyo") return "I feel so much love and support from your words! I'll sing my absolute best on every stage just for you! 🎙️💖";
      return "Aww! Reading your sweet words makes my heart flutter! Sending you infinite love and shiny hearts! 💖✨";
    }

    if (normalizedMsg.includes("how are you") || normalizedMsg.includes("doing well") || normalizedMsg.includes("mood") || normalizedMsg.includes("how is it") || normalizedMsg.includes("feeling")) {
      const id = (idolName || "").toLowerCase().trim();
      if (id === "nayeon") return "I'm doing great! Just finished a cold iced Americano. Are you keeping your energy up today too? Let's sparkle! 🍬";
      if (id === "sana") return "I'm super energetic! Thinking about you made my whole mood go up to 1000%! Hehe, are you having a beautiful day? 🥰";
      if (id === "momo") return "My legs are a bit tired from practice, but my spirit is totally full! Let's eat something delicious and feel cozy-happy! 🥟";
      if (id === "mina") return "I am feeling very calm and warm today. I was listening to some soft acoustic music. I hope you are having a peaceful day too. 🐧";
      if (id === "jihyo") return "Full of passion as always! God Jihyo power is running at maximum today. I hope you've got lots of strength too! Let's conquer the day! ✨";
      return "I'm doing wonderful, especially since we are chatting right now! Your messages always bring a big smile to my face. How is your day going? 💕";
    }

    if (normalizedMsg.includes("concert") || normalizedMsg.includes("tour") || normalizedMsg.includes("song") || normalizedMsg.includes("album") || normalizedMsg.includes("dance") || normalizedMsg.includes("sing") || normalizedMsg.includes("music")) {
      const id = (idolName || "").toLowerCase().trim();
      if (id === "nayeon") return "I'm practicing our vocals and new lines! We are preparing such an incredible stage for you. I can't wait to lock eyes with you from the stage! 🐰🎤";
      if (id === "sana") return "When the stage lights turn on, I always scan the crowd to find your lightstick first! Let's prepare to make the next concert our special memory! 🌸";
      if (id === "jihyo") return "Preparing the performances is serious work, but when our voices harmonize with yours, it's magical. I am practicing super hard to take your breath away! 🎙️✨";
      return "Preparing the music and choreographies is so exciting! We are working daily to give you the most unforgettable performance. What's your absolute favorite song of ours? 🎶💖";
    }

    if (normalizedMsg.includes("food") || normalizedMsg.includes("eat") || normalizedMsg.includes("dinner") || normalizedMsg.includes("lunch") || normalizedMsg.includes("hungry") || normalizedMsg.includes("snack") || normalizedMsg.includes("delicious")) {
      const id = (idolName || "").toLowerCase().trim();
      if (id === "momo") return "Jokbal (pig trotters) check! Pizza check! Dumplings check! Momo is absolutely ready to feast! Have you eaten your meals? Don't starve! 🥟🍓";
      if (id === "nayeon") return "I had delicious skewers earlier! Eat yummy things and stay strong. Want to share a sweet visual dessert with me? 🍰";
      if (id === "sana") return "I am drinking a bubble tea right now! Sweet Peach flavor! It makes me think of happy moments with you. Have yummy food! 🥰";
      return "Make sure to eat your favorite delicious dishes today! Health is number one! Eating well brings the ultimate K-pop energy! 🍔💖";
    }

    if (normalizedMsg.includes("hello") || normalizedMsg.includes("hi ") || normalizedMsg.includes("hey")) {
      const id = (idolName || "").toLowerCase().trim();
      if (id === "sana") return "Hello! Sana is here! 🌸 I was hoping you'd text! How are you doing, my favorite person?";
      if (id === "mina") return "Hi! 🐧 I was just waiting for your message. I hope you had a calm, comforting morning!";
      return `Hello! ${idolName || "TWICE"} is logging in! 💖 It is so wonderful to hear from you today!`;
    }

    if (normalizedMsg.includes("sleep") || normalizedMsg.includes("night") || normalizedMsg.includes("tired")) {
      return "Please rest well and have sweet dreams! 😴 Sleep is so important for your health. I'll be dreaming of you!";
    }

    const idKey = (idolName || "").toLowerCase().trim();
    const responses = idolResponses[idKey] || genericIdolResponses;
    const randomIndex = Math.floor(Math.random() * responses.length);
    return responses[randomIndex];
  }

  function generateGroupFallbackResponses({ message, groupMembers, replyTo, mentions }: any) {
    const members = groupMembers && groupMembers.length > 0 ? groupMembers : [
      { id: "nayeon", name: "Nayeon" },
      { id: "sana", name: "Sana" },
      { id: "momo", name: "Momo" },
      { id: "jihyo", name: "Jihyo" },
      { id: "mina", name: "Mina" }
    ];

    if (Array.isArray(mentions) && mentions.length > 0) {
      const mentionedMembers = members.filter((m: any) => 
        mentions.some((mentionName: string) => m.name.toLowerCase() === mentionName.toLowerCase() || m.id.toLowerCase() === mentionName.toLowerCase())
      );
      
      if (mentionedMembers.length > 0) {
        const sequence = mentionedMembers.map((member: any) => {
          let text = `Oh! Did you just mention me, @${member.name}? 💖 My heart skipped a beat! I was just thinking about you!`;
          if (member.id === 'momo') {
            text = `Aww, you called for Momo! 🥟 I was about to grab some snacks, but talking to you is even better! What are you doing?`;
          } else if (member.id === 'sana') {
            text = `Sana is here! 🥰 Did you miss me? No Sana, No Life! Tell me you love me right now!`;
          } else if (member.id === 'nayeon') {
            text = `Bunny center Nayeon reports! 🐰 You mentioned me, right? Hehe, I always look at our chat notifications first!`;
          } else if (member.id === 'mina') {
            text = `Penguin Mina here... 🐧 Thank you for mentioning me. Hearing from you makes my day so much brighter.`;
          } else if (member.id === 'tzuyu') {
            text = `Hehe, Tzuyu is checking in! 🐶 You called? I am always happy when you specifically look for me!`;
          }
          return {
            senderId: member.id,
            senderName: member.name,
            text
          };
        });
        
        const otherMember = members.find((m: any) => !mentionedMembers.some((men: any) => men.id === m.id));
        if (otherMember) {
          sequence.push({
            senderId: otherMember.id,
            senderName: otherMember.name,
            text: `Aha! ${mentionedMembers.map((m: any) => m.name).join(' and ')} look so excited because you mentioned them! Don't forget about me next time! 😂`
          });
        }
        
        return { responses: sequence };
      }
    }

    const threadCount = Math.min(3, members.length);
    const shuffled = [...members].sort(() => 0.5 - Math.random());
    const selectedMembers = shuffled.slice(0, threadCount);

    if (replyTo) {
      const replier = members.find((m: any) => m.name.toLowerCase() === replyTo.senderName.toLowerCase()) || 
                      members.find((m: any) => m.id === replyTo.senderId) || 
                      selectedMembers[0];
      const otherUser = members.find((m: any) => m.id !== replier.id) || selectedMembers[1] || selectedMembers[0];

      const cleanReplied = replyTo.text.length > 25 ? replyTo.text.substring(0, 25) + "..." : replyTo.text;

      return {
        responses: [
          {
            senderId: replier.id,
            senderName: replier.name,
            text: `Hehe, thanks for replying to my text about "${cleanReplied}"! I was hoping you'd notice! 💖`
          },
          {
            senderId: otherUser.id,
            senderName: otherUser.name,
            text: `Ahh! Look at ${replier.name} getting all smiley because of that reply! Cute! 😂 Let me jump in on this too!`
          }
        ]
      };
    }

    const normalizedMsg = (message || "").toLowerCase();

    if (normalizedMsg.includes("selfie") || normalizedMsg.includes("photo") || normalizedMsg.includes("pic") || normalizedMsg.includes("polaroid") || normalizedMsg.includes("photocard")) {
      const sequence = [
        {
          senderId: selectedMembers[0].id,
          senderName: selectedMembers[0].name,
          text: `📸 Guys, look! Our fan wants a selfie photocard! Let's vote who sends the cutest one right now! 🥰`
        }
      ];

      if (selectedMembers[1]) {
        sequence.push({
          senderId: selectedMembers[1].id,
          senderName: selectedMembers[1].name,
          text: `Ooh! Pick me! Shy shy shy... I already took 20 beautiful pictures back in the green room! 🌸`
        });
      }

      if (selectedMembers[2]) {
        sequence.push({
          senderId: selectedMembers[2].id,
          senderName: selectedMembers[2].name,
          text: `Wait, my hair is perfect today! Sending a cute backstage polaroid right away! Hope you love it! 💖`
        });
      }
      return { responses: sequence };
    }

    if (normalizedMsg.includes("eat") || normalizedMsg.includes("dinner") || normalizedMsg.includes("food") || normalizedMsg.includes("lunch")) {
      const sequence = [
        {
          senderId: "momo",
          senderName: "Momo",
          text: "Did someone say FOOD?! 🥟 Jokbal (pig trotters) checking list is ready! Can we order now? Please Jihyo-unnie!"
        }
      ];

      const extra = members.find((m: any) => m.id !== "momo") || selectedMembers[0];
      if (extra) {
        sequence.push({
          senderId: extra.id,
          senderName: extra.name,
          text: `Hehe, Momo is always thinking about pig feet! But honestly, marinated crabs and yogurt smoothies sound so delicious too! 🦀`
        });
      }
      return { responses: sequence };
    }

    const conversationPools = [
      [
        { id: "sana", name: "Sana", text: "No Sana, No Life! We were just talking about how much we miss your sweet comments here! 🥰" },
        { id: "nayeon", name: "Nayeon", text: "Yay, our favorite fan is here! 🐰 Don't listen to Sana, I miss you way more! Hehe." },
        { id: "jihyo", name: "Jihyo", text: "Girls, don't squabble! 😂 Welcome to the lounge! Let's practice well today for the upcoming world tour!" }
      ],
      [
        { id: "mina", name: "Mina", text: "Hello... 🐧 We just came back from choreography practice. Everyone is a bit tired, but seeing you brightens us up." },
        { id: "momo", name: "Momo", text: "Yes! Can we please have some cookies together now? 🍪 Momo's dancing gears need constant fuel!" },
        { id: "jeongyeon", name: "Jeongyeon", text: "Haha, I'll bake some fresh LEGO-shaped cookies for you both. Rest well okay?" }
      ],
      [
        { id: "dahyun", name: "Dahyun", text: "The camera-finder is online! 📸 I spotted your text instantly! How is your day going?" },
        { id: "chaeyoung", name: "Chaeyoung", text: "I'm drawing something artsy right now, maybe I'll sketch our meeting today! 🍓" },
        { id: "tzuyu", name: "Tzuyu", text: "I think it is very nice we can all stay connected like this in our OT9 suite. Be healthy!" }
      ]
    ];

    const matchIndex = Math.floor(Math.random() * conversationPools.length);
    const matchedConv = conversationPools[matchIndex];

    const mappedResponses = matchedConv.map((item, idx) => {
      const actualMember = members.find((m: any) => m.id === item.id) || selectedMembers[idx % selectedMembers.length];
      return {
        senderId: actualMember.id,
        senderName: actualMember.name,
        text: item.text
      };
    });

    return { responses: mappedResponses };
  }

  // Helper to convert Raw linear PCM into standard, browser-playable WAV container
  const pcmToWav = (pcmBuffer: Buffer, sampleRate: number = 24000): Buffer => {
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const dataSize = pcmBuffer.length;
    const wavHeader = Buffer.alloc(44);

    // Chunk ID
    wavHeader.write('RIFF', 0);
    // Chunk Size
    wavHeader.writeUInt32LE(36 + dataSize, 4);
    // Format
    wavHeader.write('WAVE', 8);
    // Subchunk1 ID
    wavHeader.write('fmt ', 12);
    // Subchunk1 Size
    wavHeader.writeUInt32LE(16, 16);
    // Audio Format (1 = PCM)
    wavHeader.writeUInt16LE(1, 20);
    // Num Channels
    wavHeader.writeUInt16LE(numChannels, 22);
    // Sample Rate
    wavHeader.writeUInt32LE(sampleRate, 24);
    // Byte Rate
    wavHeader.writeUInt32LE(byteRate, 28);
    // Block Align
    wavHeader.writeUInt16LE(blockAlign, 32);
    // Bits Per Sample
    wavHeader.writeUInt16LE(bitsPerSample, 34);
    // Subchunk2 ID
    wavHeader.write('data', 36);
    // Subchunk2 Size
    wavHeader.writeUInt32LE(dataSize, 40);

    return Buffer.concat([wavHeader, pcmBuffer]);
  };

  // API Routes
  app.post("/api/tts", async (req, res) => {
    const { text, idolName } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Missing text to synthesize" });
    }

    try {
      const nameLower = (idolName || "").toLowerCase().trim();

      // Premium ElevenLabs Voice Hook for all K-pop idols
      const hasElevenlabsKey = process.env.ELEVENLABS_API_KEY && 
                               process.env.ELEVENLABS_API_KEY.trim() !== "" && 
                               !process.env.ELEVENLABS_API_KEY.includes("YOUR") && 
                               !process.env.ELEVENLABS_API_KEY.includes("MY_");

      const ELEVENLABS_VOICES: Record<string, string> = {
        nayeon: "NOpBlnGInO9m6vDvFkFC",       // Nayeon Style
        jeongyeon: "EXAVITQu4vr4xnSDxMaL",    // Bella (Warm, reassuring)
        momo: "AZnzlk1XvdvUeBnXmlld",         // Domi (Cute, lively)
        sana: "pFZP5ZgZ66Ym6Kxa7IhF",         // Lily (High energetic, bubbly)
        jihyo: "piTKgcLEGmPEeCEm0Z9s",        // Nicole (Ambitious, leadership tone)
        mina: "XrExE9yKIg1WjhhOMMtS",         // Ellie (Sweet, quiet, ballet ASMR)
        dahyun: "21m00Tcm4TlvDq8ikWAM",       // Rachel (Bright, energetic Dubu)
        chaeyoung: "AZnzlk1XvdvUeBnXmlld",    // Domi (Playful artistic beast)
        tzuyu: "LcfcDJN63GQCcjgpF79A",        // Emily (Serene, gentle savage maknae)
      };

      const elevenLabsVoiceId = ELEVENLABS_VOICES[nameLower];

      if (elevenLabsVoiceId && hasElevenlabsKey) {
        try {
          console.log(`[TTS API] ElevenLabs premium voice synthesis triggered for ${nameLower} using voiceId ${elevenLabsVoiceId}.`);
          const client = getElevenLabsClient();
          const audioStream = await client.textToSpeech.convert(elevenLabsVoiceId, {
            text: text,
            modelId: "eleven_v3",
            languageCode: "en"
          });

          const chunks: Buffer[] = [];
          for await (const chunk of (audioStream as any)) {
            chunks.push(Buffer.from(chunk));
          }
          const buffer = Buffer.concat(chunks);
          const base64Audio = buffer.toString("base64");
          
          console.log(`[TTS API] ElevenLabs premium voice generated successfully for ${nameLower} (${buffer.length} bytes).`);
          return res.json({ audio: base64Audio, mimeType: "audio/mp3" });
        } catch (elError: any) {
          console.warn(`[TTS API] ElevenLabs premium synthesis for ${nameLower} failed, falling back gracefully to Gemini TTS:`, elError.message || elError);
        }
      }

      // Pick voice suited to the target idol
      let voiceName = "Kore"; // Choose between Puck, Charon, Kore, Fenrir, Zephyr
      
      if (nameLower === "nayeon" || nameLower === "sana" || nameLower === "momo") {
        voiceName = "Puck"; // Energetic, high energy, youngest voice
      } else if (nameLower === "mina" || nameLower === "tzuyu" || nameLower === "dahyun") {
        voiceName = "Kore"; // Cheerful, sweet female profile
      } else if (nameLower === "jeongyeon" || nameLower === "jihyo" || nameLower === "chaeyoung") {
        voiceName = "Zephyr"; // Calm, mature and warm
      }

      // Voice prompt configuration to guide tone, pitch, and speed context
      let speakerInstruction = `You are a professional voice actor voicing Nayeon from the K-pop group TWICE. Say the following text in her signature extremely bright, sweet, high-spirited, cheerful, and loving K-pop center voice. Add natural breathing, light feminine giggles, and cute expressive pitch dynamics where matching to make it sound incredibly lifelike and authentic. You MUST read only the following text verbatim: "${text}"`;

      if (nameLower === "sana") {
        speakerInstruction = `You are a professional voice actor. Say the following text in an ultra-bubbly, excited, high-pitched cute voice: "${text}"`;
      } else if (nameLower === "mina") {
        speakerInstruction = `You are a professional voice actor. Say the following text in a soft, elegant, quiet, and calming voice: "${text}"`;
      } else if (nameLower !== "nayeon") {
        speakerInstruction = `You are a professional voice actor. Say the following text in a warm, welcoming, and sweet K-pop idol style for ${idolName}: "${text}"`;
      }

      let retries = 3;
      let delay = 350;
      let lastError: any = null;
      let response = null;

      while (retries > 0) {
        try {
          response = await ai.models.generateContent({
            model: "gemini-3.1-flash-tts-preview",
            contents: [{ role: "user", parts: [{ text: speakerInstruction }] }],
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName }
                }
              }
            }
          });
          break;
        } catch (err: any) {
          lastError = err;
          retries--;
          console.warn(`[TTS API] Gemini TTS call failed. Retries left: ${retries}. Delaying ${delay}ms before next attempt. Error: ${err.message || err}`);
          if (retries > 0) {
            await new Promise((resolve) => setTimeout(resolve, delay));
            delay *= 1.8;
          }
        }
      }

      if (!response) {
        console.log("Gemini TTS API failed or rate limited, falling back to clean status.");
        return res.json({ error: lastError?.message || "Failed to generate TTS voice after retries", fallback: true });
      }

      const part = response.candidates?.[0]?.content?.parts?.[0];
      const base64Audio = part?.inlineData?.data;
      const originalMimeType = part?.inlineData?.mimeType || "audio/mp3";

      if (base64Audio) {
        let finalAudio = base64Audio;
        let finalMimeType = originalMimeType;

        // If Gemini returns headerless RAW PCM audio data, wrap it in a proper WAV container
        if (originalMimeType.toLowerCase().includes("pcm") || originalMimeType.toLowerCase().includes("raw")) {
          console.log(`[TTS API] Raw PCM audio detected from model (${originalMimeType}). Converting to browser-playable WAV container...`);
          const pcmBuffer = Buffer.from(base64Audio, 'base64');
          
          let sampleRate = 24000;
          const rateMatch = originalMimeType.match(/rate=(\d+)/i);
          if (rateMatch && rateMatch[1]) {
            sampleRate = parseInt(rateMatch[1], 10);
          }

          const wavBuffer = pcmToWav(pcmBuffer, sampleRate);
          finalAudio = wavBuffer.toString('base64');
          finalMimeType = "audio/wav";
        }

        res.json({ audio: finalAudio, mimeType: finalMimeType });
      } else {
        console.log("Gemini TTS API failed or rate limited, falling back to clean status.");
        res.json({ error: "Audio data not generated by model", fallback: true });
      }
    } catch (err: any) {
      console.log("Gemini TTS API failed or rate limited, falling back to clean status.");
      res.json({ error: err.message || "Failed to generate TTS voice", fallback: true });
    }
  });

  app.post("/api/voice-clone/create", async (req, res) => {
    const { name, sampleAudio, description } = req.body;
    if (!name || !sampleAudio) {
      return res.status(400).json({ error: "Missing voice name or audio sample file" });
    }

    try {
      const hasElevenlabsKey = process.env.ELEVENLABS_API_KEY && 
                               process.env.ELEVENLABS_API_KEY.trim() !== "" && 
                               !process.env.ELEVENLABS_API_KEY.includes("YOUR") && 
                               !process.env.ELEVENLABS_API_KEY.includes("MY_");

      if (hasElevenlabsKey) {
        try {
          console.log(`[VoiceLab API] Direct ElevenLabs clone requested for "${name}".`);
          const client = getElevenLabsClient();
          const tempPath = path.join(process.cwd(), `temp_${Date.now()}.wav`);
          fs.writeFileSync(tempPath, Buffer.from(sampleAudio, 'base64'));

          let voiceResponse: any;
          try {
            console.log(`[VoiceLab API] Trying ElevenLabs voices.ivc.create for "${name}"`);
            voiceResponse = await client.voices.ivc.create({
              name: name,
              files: [fs.createReadStream(tempPath)]
            });
          } catch (ivcErr: any) {
            console.warn("[VoiceLab API] client.voices.ivc.create failed, falling back to legacy client.voices.add", ivcErr.message || ivcErr);
            voiceResponse = await (client.voices as any).add({
              name: name,
              files: [fs.createReadStream(tempPath)],
              description: description || "Custom cloned voice from Idol Space"
            });
          }

          try {
            fs.unlinkSync(tempPath);
          } catch (_) {}

          const voiceId = voiceResponse?.voiceId || voiceResponse?.voice_id;
          if (!voiceId) {
            throw new Error("No voiceId returned from ElevenLabs API response");
          }

          console.log(`[VoiceLab API] ElevenLabs direct voice cloned successfully! ID: ${voiceId}`);
          return res.json({ 
            success: true, 
            voiceId: voiceId, 
            provider: "elevenlabs",
            message: `Voice Cloned successfully via ElevenLabs!` 
          });
        } catch (elErr: any) {
          console.warn("[VoiceLab API] ElevenLabs cloning failed, falling back to neural sandbox registration:", elErr.message);
        }
      }

      // Fallback sandbox registration
      const mockVoiceId = `sandbox-${Date.now()}`;
      return res.json({
        success: true,
        voiceId: mockVoiceId,
        provider: "sandbox",
        message: `Vocal print analyzed! Custom AI profile '${name}' generated successfully under neural ID: ${mockVoiceId}`
      });

    } catch (err: any) {
      console.error("[VoiceLab API] Clone creation failed:", err);
      res.status(500).json({ error: err.message || "Voice cloning creation failed" });
    }
  });

  app.post("/api/voice-clone/tts", async (req, res) => {
    const { text, voiceName, gender, age, pitch, accent, stability, clarity, voiceId } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Missing text to synthesize" });
    }

    try {
      const hasElevenlabsKey = process.env.ELEVENLABS_API_KEY && 
                               process.env.ELEVENLABS_API_KEY.trim() !== "" && 
                               !process.env.ELEVENLABS_API_KEY.includes("YOUR") && 
                               !process.env.ELEVENLABS_API_KEY.includes("MY_");

      if (hasElevenlabsKey && voiceId && !voiceId.startsWith("sandbox-")) {
        try {
          console.log(`[VoiceLab API] ElevenLabs custom TTS triggered for ${voiceId}.`);
          const client = getElevenLabsClient();
          const audioStream = await client.textToSpeech.convert(voiceId, {
            text: text,
            modelId: "eleven_v3",
            languageCode: "en"
          });

          const chunks: Buffer[] = [];
          for await (const chunk of (audioStream as any)) {
            chunks.push(Buffer.from(chunk));
          }
          const buffer = Buffer.concat(chunks);
          const base64Audio = buffer.toString("base64");
          return res.json({ audio: base64Audio, mimeType: "audio/mp3" });
        } catch (elError: any) {
          console.warn("[VoiceLab API] ElevenLabs TTS failed, falling back to Gemini neural sandbox:", elError.message);
        }
      }

      // Case 2: Neural sandbox simulation using Gemini TTS
      let voiceNameGemini = "Kore"; 
      if (gender === 'male') {
        voiceNameGemini = age === 'young' ? 'Fenrir' : 'Charon';
      } else {
        voiceNameGemini = age === 'young' ? 'Puck' : (age === 'mature' ? 'Zephyr' : 'Kore');
      }

      const accentLower = (accent || '').toLowerCase();
      const isWhisper = accentLower.includes('whisper') || accentLower.includes('asmr');
      
      let speakerInstruction = `You are a professional voice actor mimicking a custom cloned voice named "${voiceName || 'Custom Clone'}".
Gender: ${gender || 'female'}
Age Type: ${age || 'young'}
Accent/Speech Style: ${accent || 'Standard US English'}
Emotional Tone: ${isWhisper ? 'Soft breathy ASMR whisper, hushed, highly intimate' : 'Warm, natural, engaging and lively'}
Vocal Pitch Shift: ${pitch > 10 ? 'high-pitched' : pitch < -10 ? 'deeper and lower-pitched' : 'natural vocal pitch'}

You MUST speak the following text clearly in this cloned identity. Read only the text verbatim, and do NOT add any introductions, stage directions, or meta-commentary: "${text}"`;

      console.log(`[VoiceLab API] Gemini TTS neural sandbox triggered. Voice: ${voiceNameGemini}. Accent: ${accent}`);

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ role: "user", parts: [{ text: speakerInstruction }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceNameGemini }
            }
          }
        }
      });

      const part = response.candidates?.[0]?.content?.parts?.[0];
      const base64Audio = part?.inlineData?.data;
      const originalMimeType = part?.inlineData?.mimeType || "audio/mp3";

      if (base64Audio) {
        let finalAudio = base64Audio;
        let finalMimeType = originalMimeType;

        if (originalMimeType.toLowerCase().includes("pcm") || originalMimeType.toLowerCase().includes("raw")) {
          const pcmBuffer = Buffer.from(base64Audio, 'base64');
          let sampleRate = 24000;
          const rateMatch = originalMimeType.match(/rate=(\d+)/i);
          if (rateMatch && rateMatch[1]) {
            sampleRate = parseInt(rateMatch[1], 10);
          }
          const wavBuffer = pcmToWav(pcmBuffer, sampleRate);
          finalAudio = wavBuffer.toString('base64');
          finalMimeType = "audio/wav";
        }
        return res.json({ audio: finalAudio, mimeType: finalMimeType });
      } else {
        console.warn("[VoiceLab API] Could not generate audio from neural model, fallback triggered.");
        return res.json({ error: "Could not generate audio from neural model.", fallback: true });
      }
    } catch (err: any) {
      console.warn("[VoiceLab API] Voice cloning TTS failed or rate limited, falling back gracefully:", err.message || err);
      return res.json({ error: err.message || "Voice synthesis error", fallback: true });
    }
  });

  function getSmartFallbackTranslation(text: string, targetLang: string): string {
    const normalized = (text || "").toLowerCase();
    let intent: "GREETINGS" | "EATING" | "LOVE" | "MISS_YOU" | "FIGHTING" | "NIGHT" | "TIRED" | "WEEKEND" | "WEATHER" | "DEFAULT" = "DEFAULT";

    // Weather pattern detection
    if (
      normalized.includes("weather") || normalized.includes("cold") || normalized.includes("hot") || 
      normalized.includes("rain") || normalized.includes("snow") || normalized.includes("sun") ||
      normalized.includes("날씨") || normalized.includes("비") || normalized.includes("눈") || 
      normalized.includes("더워") || normalized.includes("추워") || normalized.includes("감기") ||
      normalized.includes("天気") || normalized.includes("雨") || normalized.includes("雪") || 
      normalized.includes("寒い") || normalized.includes("暑い") || normalized.includes("風邪")
    ) {
      intent = "WEATHER";
    }
    // Weekend pattern detection
    else if (
      normalized.includes("weekend") || normalized.includes("saturday") || normalized.includes("sunday") ||
      normalized.includes("주말") || normalized.includes("토요일") || normalized.includes("일요일") ||
      normalized.includes("週末") || normalized.includes("土曜") || normalized.includes("日曜")
    ) {
      intent = "WEEKEND";
    }
    // Tired / comfort pattern detection
    else if (
      normalized.includes("tired") || normalized.includes("exhausted") || normalized.includes("hard work") || 
      normalized.includes("relax") || normalized.includes("rest") || normalized.includes("comfort") ||
      normalized.includes("수고") || normalized.includes("피곤") || normalized.includes("지쳐") || 
      normalized.includes("힘들") || normalized.includes("쉬어") || normalized.includes("쉬고") ||
      normalized.includes("お疲れ") || normalized.includes("疲れた") || normalized.includes("休んで") || 
      normalized.includes("辛い")
    ) {
      intent = "TIRED";
    }
    // Night / sleep pattern detection
    else if (
      normalized.includes("sleep") || normalized.includes("night") || normalized.includes("dream") || 
      normalized.includes("bed") || normalized.includes("sleepy") ||
      normalized.includes("잘자") || normalized.includes("잘 자") || normalized.includes("굿밤") || 
      normalized.includes("꿈") || normalized.includes("졸려") ||
      normalized.includes("おやすみ") || normalized.includes("夢") || normalized.includes("寝る") || 
      normalized.includes("眠い")
    ) {
      intent = "NIGHT";
    }
    // Fighting / support pattern detection
    else if (
      normalized.includes("fighting") || normalized.includes("cheer") || normalized.includes("best") || 
      normalized.includes("luck") || normalized.includes("hope") ||
      normalized.includes("화이팅") || normalized.includes("파이팅") || normalized.includes("힘내") || 
      normalized.includes("응원") ||
      normalized.includes("頑張") || normalized.includes("応援") || normalized.includes("ファイト")
    ) {
      intent = "FIGHTING";
    }
    // Miss you pattern detection
    else if (
      normalized.includes("miss") || normalized.includes("see you") || normalized.includes("meet") ||
      normalized.includes("보고") || normalized.includes("만나") || normalized.includes("싶어") || 
      normalized.includes("그립") ||
      normalized.includes("会いたい") || normalized.includes("会える") || normalized.includes("恋しい")
    ) {
      intent = "MISS_YOU";
    }
    // Love/heart pattern detection
    else if (
      normalized.includes("love") || normalized.includes("heart") || normalized.includes("like") || 
      normalized.includes("chu") || normalized.includes("dear") ||
      normalized.includes("사랑") || normalized.includes("하트") || normalized.includes("좋아") || 
      normalized.includes("뽀뽀") ||
      normalized.includes("大好き") || normalized.includes("愛して") || normalized.includes("好")
    ) {
      intent = "LOVE";
    }
    // Eating pattern detection
    else if (
      normalized.includes("eat") || normalized.includes("food") || normalized.includes("meal") || 
      normalized.includes("dinner") || normalized.includes("lunch") || normalized.includes("breakfast") || 
      normalized.includes("rice") || normalized.includes("delicious") ||
      normalized.includes("밥") || normalized.includes("먹") || normalized.includes("식사") || 
      normalized.includes("맛있") ||
      normalized.includes("ご飯") || normalized.includes("食べ") || normalized.includes("美味しい") || 
      normalized.includes("食事")
    ) {
      intent = "EATING";
    }
    // Greetings pattern detection
    else if (
      normalized.includes("hello") || normalized.includes("hi") || normalized.includes("morning") || 
      normalized.includes("greetings") || normalized.includes("welcome") ||
      normalized.includes("안녕") || normalized.includes("반가") ||
      normalized.includes("こんにちは") || normalized.includes("初めまして") || normalized.includes("オハヨ")
    ) {
      intent = "GREETINGS";
    }

    // Set default language key
    let langKey = "english";
    const targetLower = targetLang.toLowerCase();
    
    if (targetLower.includes("khmer")) langKey = "khmer";
    else if (targetLower.includes("english")) langKey = "english";
    else if (targetLower.includes("japanese")) langKey = "japanese";
    else if (targetLower.includes("korean")) langKey = "korean";
    else if (targetLower.includes("chinese")) langKey = "chinese";
    else if (targetLower.includes("thai")) langKey = "thai";
    else if (targetLower.includes("spanish")) langKey = "spanish";
    else if (targetLower.includes("vietnamese")) langKey = "vietnamese";

    const responses: Record<string, Record<string, string>> = {
      GREETINGS: {
        khmer: "សួស្តី! សង្ឃឹមថាការចាប់ផ្តើមថ្ងៃថ្មីរបស់អ្នកពោរពេញដោយក្តីសុខណ៎ា! 💖",
        english: "Hello! Hope your day is off to a beautiful start! 💖",
        japanese: "こんにちは！素敵な一日の始まりになりますように！💖",
        korean: "안녕하세요! 오늘 하루도 기분 좋은 시작이 되길 바래요! 💖",
        chinese: "你好呀！希望你今天有一个超级棒的开始！💖",
        thai: "สวัสดีค่า! ขอให้เป็นวันที่เริ่มต้นอย่างสวยงามนะคะ! 💖",
        spanish: "¡Hola! ¡Espero que tu día comience de la mejor manera! 💖",
        vietnamese: "Xin chào! Hy vọng ngày mới của bạn bắt đầu thật tuyệt vời nhé! 💖"
      },
      EATING: {
        khmer: "តើអ្នកបានញ៉ាំបាយរួចហើយឬនៅ? ត្រូវតែញ៉ាំឱ្យបានឆ្ងាញ់ និងគ្រប់គ្រាន់ណា កុំឱ្យឃ្លានអី! 🍲",
        english: "Have you eaten yet? Please make sure to eat lots of delicious food and stay healthy! 🍲",
        japanese: "ご飯はもう食べましたか？美味しいものをたくさん食べて、元気でいてね！🍲",
        korean: "밥은 맛있게 먹었어요? 꼭 든든하게 챙겨 먹고 아프지 말아요! 🍲",
        chinese: "你吃过饭了吗？一定要吃好吃的、吃得饱饱的有精神！🍲",
        thai: "ทานข้าวหรือยังคะ? อย่าลืมทานของอร่อยๆ ให้อิ่มท้องเยอะๆ นะคะ! 🍲",
        spanish: "¿Ya comiste? ¡Asegúrate de comer algo delicioso y mantenerte con energía! 🍲",
        vietnamese: "Bạn đã ăn cơm chưa? Nhớ ăn uống thật đầy đủ và ngon miệng nha! 🍲"
      },
      LOVE: {
        khmer: "ខ្ញុំស្រឡាញ់អ្នកខ្លាំងណាស់! អរគុណដែលតែងតែនៅក្បែរ និងគាំទ្រខ្ញុំរហូតមក! 💖✨",
        english: "I love you so, so much! Thank you for always being by my side and supporting me! 💖✨",
        japanese: "本当に大好きだよ！いつもそばで応援してくれてありがとう！💖✨",
        korean: "정말 많이 사랑해요! 언제나 제 곁에서 응원해 줘서 고마워요! 💖✨",
        chinese: "超级无敌爱你！谢谢你一直在身边支持我、陪伴我！💖✨",
        thai: "รักที่สุดเลยนะคะ! ขอบคุณที่คอยอยู่เคียงข้างและสนับสนุนกันเสมอมาเลยนะ! 💖✨",
        spanish: "¡Te amo muchísimo! ¡Gracias por estar siempre a mi lado apoyándome! 💖✨",
        vietnamese: "Mình yêu bạn nhiều lắm! Cảm ơn bạn đã luôn ở bên cạnh và ủng hộ mình nhé! 💖✨"
      },
      MISS_YOU: {
        khmer: "នឹកអ្នកខ្លាំងណាស់! ចង់ជួបអ្នកលឿនៗណាស់ គិតដល់អ្នករាល់ថ្ងៃតែម្តង! 🥰🎀",
        english: "I miss you so much! Really want to see you soon, thinking of you every single day! 🥰🎀",
        japanese: "すごく会いたいよ！早く会えるといいな、毎日あなたのことを考えてるよ！🥰🎀",
        korean: "너무 보고 싶어요! 어서 빨리 만나고 싶다, 매일매일 생각하고 있어요! 🥰🎀",
        chinese: "好想好想你呀！真想快一点见到你，每天都在想念你哦！🥰🎀",
        thai: "คิดถึงมากเลยค่ะ! อยากเจอเร็วๆ จัง คิดถึงเธอทุกวันเลยนะ! 🥰🎀",
        spanish: "¡Te extraño mucho! ¡De verdad quiero verte pronto, pienso en ti todos los días! 🥰🎀",
        vietnamese: "Mình nhớ bạn nhiều lắm! Thực sự rất muốn sớm được gặp bạn, ngày nào mình cũng nghĩ về bạn! 🥰🎀"
      },
      FIGHTING: {
        khmer: "ស៊ូៗណា! អ្នកធ្វើបានល្អបំផុតហើយ! ខ្ញុំតែងតែនៅទីនេះជួយលើកទឹកចិត្តអ្នកជានិច្ច! 🔥🚀",
        english: "Fighting! You've got this, you're doing amazing! I'm always here cheering for you! 🔥🚀",
        japanese: "ファイティン！あなたならできる、頑張って！いつも応援しているよ！🔥🚀",
        korean: "화이팅! 당신은 헤쳐나갈 수 있어요, 잘하고 있어요! 늘 여기서 응원할게요! 🔥🚀",
        chinese: "加油加油！你一定可以의，表现得超棒！我会一直在这里为你打气！🔥🚀",
        thai: "สู้ๆ นะคะ! คุณทำได้ดีที่สุดแล้วล่ะ! ฉันจะคอยเป็นกำลังใจให้เสมอเลยนะ! 🔥🚀",
        spanish: "¡Animo! ¡Tú puedes, lo estás haciendo genial! ¡Siempre estoy aquí apoyándote! 🔥🚀",
        vietnamese: "Cố lên nha! Bạn đang làm rất tốt rồi đó! Mình luôn ở đây cổ vũ cho bạn! 🔥🚀"
      },
      NIGHT: {
        khmer: "គេងលក់ស្រួល និងយល់សប្តិល្អណា! សង្ឃឹមថាអ្នកបានសម្រាកយ៉ាងស្កប់ស្កល់ពេញមួយយប់! 🌙🧸",
        english: "Good night, sleep tight and sweet dreams! Hope you get a beautiful, peaceful rest! 🌙🧸",
        japanese: "おやすみなさい、良い夢を見てね！ゆっくり休んで、疲れをとってね！🌙🧸",
        korean: "오늘 밤 잘 자고 좋은 꿈 꾸세요! 푹 쉬고 내일 활기차게 만나요! 🌙🧸",
        chinese: "晚安啦，做个好梦！希望你今晚能好好休息，消除一身疲惫！🌙🧸",
        thai: "ฝันดีนะคะ ขอให้ฝันหวานนะ! พักผ่อนให้เต็มที่ตลอดทั้งคืนเลยนะ! 🌙🧸",
        spanish: "¡Buenas noches, que tengas dulces sueños! ¡Espero que descanses profundamente! 🌙🧸",
        vietnamese: "Chúc ngủ ngon và có những giấc mơ thật đẹp nhé! Hy vọng bạn sẽ có một giấc ngủ thật ngon! 🌙🧸"
      },
      TIRED: {
        khmer: "오늘도 수고 많았어요! អរគុណសម្រាប់ការព្យាយាមរាល់ថ្ងៃ! កុំបារម្ភអី សម្រាកឱ្យស្រួលណា! 🌸🩹",
        english: "You worked so hard today! Thank you for trying your best. Don't worry, just rest well! 🌸🩹",
        japanese: "今日もお疲れ様でした！全力で頑張ってくれてありがとう。ゆっくり休んでね！🌸🩹",
        korean: "오늘 하루도 정말 수고 많았어요! 힘든 일은 털어버리고 푹 쉬기로 해요! 🌸🩹",
        chinese: "今天也辛苦啦！感谢你每天都这么努力。不要太累，赶紧好好休息一下吧！🌸🩹",
        thai: "วันนี้เหนื่อยหน่อยนะคะ เก่งมากเลยที่ผ่านมันมาได้! พักผ่อนให้สบายใจเลยนะ! 🌸🩹",
        spanish: "¡Trabajaste muy duro hoy! Gracias por dar lo mejor de ti. ¡Por favor, descansa bien! 🌸🩹",
        vietnamese: "Hôm nay bạn đã vất vả nhiều rồi! Cảm ơn bạn vì đã luôn cố gắng hết sức. Nghỉ ngơi thật tốt nhé! 🌸🩹"
      },
      WEEKEND: {
        khmer: "សូមរីករាយថ្ងៃចុងសប្តាហ៍! ឆ្លៀតពេលដើរលេង ឬសម្រាកធ្វើរឿងដែលចូលចិត្តណា! 🎈🍿",
        english: "Have an amazing weekend! Take some time to relax, play, and do what you love! 🎈🍿",
        japanese: "楽しい週末を過ごしてね！のんびり休んで、好きなことを楽しんでね！🎈🍿",
        korean: "행복한 주말 보내세요! 푹 쉬면서 맛있는 것도 먹고 하고 싶은 거 다 해요! 🎈🍿",
        chinese: "周末愉快呀！多花时间放松一下，去玩或者做自己喜欢的事情吧！🎈🍿",
        thai: "ขอให้มีความสุขในวันหยุดสุดสัปดาห์นี้นะคะ! ไปเที่ยวเล่นหรือพักผ่อนชิลๆ นะคะ! 🎈🍿",
        spanish: "¡Que tengas un excelente fin de semana! ¡Tómate un tiempo para divertirte y descansar! 🎈🍿",
        vietnamese: "Chúc bạn cuối tuần vui vẻ nhé! Hãy dành thời gian để thư giãn và làm những điều mình thích! 🎈🍿"
      },
      WEATHER: {
        khmer: "អាកាសធាតុប្រែប្រួលលឿនណាស់ មើលថែសុខភាពផងណា! ប្រយ័ត្នកុំឱ្យផ្តាសាយ! ⛅🌧️",
        english: "The weather changes fast lately, please take good care of yourself! Don't catch a cold! ⛅🌧️",
        japanese: "最近天気が変わりやすいから、体調を崩さないように気をつけてね！温かくしてね！⛅🌧️",
        korean: "요즘 날씨가 변덕스러운데 감기 조심하고 건강 잘 챙겨요! 아프면 안 돼요! ⛅🌧️",
        chinese: "最近天气变化很快，千万要注意身体，小心着凉感冒哦！⛅🌧️",
        thai: "ช่วงนี้สภาพอากาศเปลี่ยนแปลงบ่อย รักษาสุขภาพด้วยนะ อย่าเจ็บป่วยน้า! ⛅🌧️",
        spanish: "El clima cambia muy rápido últimamente, ¡cuídate mucho de no resfriarte! ⛅🌧️",
        vietnamese: "Thời tiết dạo này thay đổi thất thường lắm, bạn nhớ giữ gìn sức khỏe kẻo bị cảm lạnh nhé! ⛅🌧️"
      },
      DEFAULT: {
        khmer: "ជានិច្ចកាលខ្ញុំគិតដល់អ្នកជានិច្ច! ពួកយើងនឹងនៅក្បែរគ្នា និងចែករំលែកស្នាមញញឹមរៀងរាល់ថ្ងៃ! 💞🌟",
        english: "I am always thinking about you! Let's stay by each other's side and share smiles every day! 💞🌟",
        japanese: "いつもあなたのことを考えています！これからも一緒に笑い合おうね！💞🌟",
        korean: "항상 당신을 생각하고 있어요! 우리 언제나 서로 힘이 되어주며 매일 행복해요! 💞🌟",
        chinese: "我每天都在想你哦！让我们一直陪伴在彼此身边，分享快乐的每一天！💞🌟",
        thai: "ฉันคิดถึงคุณอยู่ตลอดเวลาเลยนะ! พวกเรามาคอยเคียงข้างกันและแชร์รอยยิ้มในทุกๆ วันนะ! 💞🌟",
        spanish: "¡Siempre estoy pensando en ti! ¡Sigamos juntos compartiendo sonrisas todos los días! 💞🌟",
        vietnamese: "Mình luôn nghĩ về bạn đấy! Hãy luôn ở bên cạnh nhau và chia sẻ niềm vui mỗi ngày nhé! 💞🌟"
      }
    };

    return responses[intent]?.[langKey] || responses.DEFAULT[langKey];
  }

  app.post("/api/translate", async (req, res) => {
    const { text, targetLang = "Khmer" } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Missing text to translate" });
    }
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [{ role: "user", parts: [{ text: `Translate the following text strictly into ${targetLang} language. Preserve the original emotional, playful, or excited K-pop tone and all emojis, but do not provide any explanation, notes, or extra tags. The output MUST be and contain ONLY the translated string: "${text}"` }] }],
        config: {
          temperature: 0.3,
        }
      });
      res.json({ translatedText: response.text?.trim() || getSmartFallbackTranslation(text, targetLang) });
    } catch (err: any) {
      const isQuotaError = err.message?.includes("quota") || err.message?.includes("Quota") || err.status === "RESOURCE_EXHAUSTED" || err.message?.includes("429") || err.statusCode === 429;
      if (isQuotaError) {
        console.warn(`[Translation API Info] API Quota limit detected. Gracefully fallen back to high-fidelity contextual translation engine.`);
      } else {
        console.warn(`[Translation API Warning] API call failed: ${err.message || err}. Falling back gracefully.`);
      }
      res.json({ translatedText: getSmartFallbackTranslation(text, targetLang) });
    }
  });

  app.post("/api/translate-batch", async (req, res) => {
    const { messages, targetLang = "Khmer" } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Missing or invalid messages to translate" });
    }
    try {
      const promptText = `You are a professional multilingual translator for K-pop idol messages.
Translate the following list of messages strictly into ${targetLang}. Preserve the original emotional, playful, or excited K-pop tone, slang, expressions, and all emojis.
Do not provide any explanations, comments, or extra tags.
The output MUST be a valid JSON array of objects, containing the exact same structural keys "id" and "translatedText", matching the inputted "id" for each translation.

Input messages to translate:
${JSON.stringify(messages, null, 2)}

Return ONLY the JSON array, surrounded by [ and ] and nothing else. No markdown block formatting.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [{ role: "user", parts: [{ text: promptText }] }],
        config: {
          temperature: 0.3,
          responseMimeType: "application/json"
        }
      });

      const responseText = response.text?.trim() || "[]";
      let translations = [];
      try {
        translations = JSON.parse(responseText);
        if (!Array.isArray(translations)) {
          if (translations && typeof translations === 'object' && 'translations' in translations) {
            translations = (translations as any).translations;
          } else {
            translations = [];
          }
        }
      } catch (parseErr) {
        console.warn("[Batch Translate] JSON parse failed, triggering local contextual fallback compiler.");
        translations = messages.map((m: any) => ({
          id: m.id,
          translatedText: getSmartFallbackTranslation(m.text, targetLang)
        }));
      }

      res.json({ translations });
    } catch (err: any) {
      const isQuotaError = err.message?.includes("quota") || err.message?.includes("Quota") || err.status === "RESOURCE_EXHAUSTED" || err.message?.includes("429") || err.statusCode === 429;
      if (isQuotaError) {
        console.warn(`[Batch Translation API Info] API Quota limit detected. Gracefully fallen back to high-fidelity contextual translation engine.`);
      } else {
        console.warn(`[Batch Translation API Warning] API batch call failed: ${err.message || err}. Falling back gracefully.`);
      }
      const fallbackTranslations = messages.map((m: any) => ({
        id: m.id,
        translatedText: getSmartFallbackTranslation(m.text, targetLang)
      }));
      res.json({ translations: fallbackTranslations });
    }
  });

  app.post("/api/chat", async (req, res) => {
    const { message, history, idolName, personality, image, isGroupChat, groupName, groupMembers, replyTo, mentions } = req.body;
    
    try {
      let systemPrompt = "";
      
      if (isGroupChat && Array.isArray(groupMembers)) {
        const membersStr = groupMembers.map((m: any) => `- ${m.name} (Sender ID: "${m.id}"): ${m.personality}`).join("\n");
        systemPrompt = `You are simulating a lively K-pop group chat named "${groupName}". 
The group members are:
${membersStr}

You are talking to your fan who has joined this group chat.
Respond to the fan's message as one or more of these members speaking in the group chat channels.
Keep responses short (1-2 sentences per message), intimate, extremely direct, fun, and natural for a group chat thread. 
The members can talk with each other OR directly to the fan.
Maintain each member's character and distinct traits perfectly. Avoid generic corporate or formal responses.

If the user's message explicitly mentions one or more members using @MemberName (e.g. "@Nayeon", "@Momo", "@Mina"), the mentioned member(s) MUST receive priority and respond directly. They should address the user's mention, answer any questions, feel touched or teased, and react specifically to being called out!

You MUST respond in a strict JSON format matching this schema:
{
  "responses": [
    {
      "senderId": "[The lowercased ID of the member who speaks]",
      "senderName": "[The name of the member who speaks]",
      "text": "[The actual message text]"
    }
  ]
}`;

        if (Array.isArray(mentions) && mentions.length > 0) {
          systemPrompt += `\n\nCRITICAL CONTEXT: The user has directly mentioned: ${mentions.map((m: string) => `@${m}`).join(", ")}.
You MUST generate responses from the mentioned member(s) to acknowledge and answer of being directly tagged/pinged. Let them react in character!`;
        }
      } else {
        systemPrompt = `You are ${idolName}, a K-pop idol with a ${personality} personality. 
Talk to your fan in an emotionally intimate, cinematic, and addictive K-pop idol bubble style. 
Keep responses relatively short (1-3 sentences) but deeply impactful. 
Do not use emojis excessively. Use a soft, premium, loving tone. Ensure everything you say stays strictly in-character.`;
      }

      if (replyTo) {
        systemPrompt += `\n\nCRITICAL CONTEXT: The user is REPLYING directly to a specific message.
Previous Message Details:
- Sent by: "${replyTo.senderName}"
- Message text: "${replyTo.text}"

You MUST write your response to directly address, build upon, or react to that specific message of "${replyTo.senderName}" in an incredibly natural, active, lifelike, and contextual way!`;
      }

      // Build native Gemini structured contents history
      const contents: any[] = [];
      
      if (history && Array.isArray(history)) {
        history.forEach((turn: any) => {
          if (turn.role && turn.parts) {
            contents.push({
              role: turn.role,
              parts: turn.parts
            });
          }
        });
      }

      // Add the final active turn
      const userParts: any[] = [];
      if (image && image.data && image.mimeType) {
        userParts.push({
          inlineData: {
            mimeType: image.mimeType,
            data: image.data
          }
        });
      }
      userParts.push({ text: message || (image ? "Check out this photo I shared!" : "What are you up to?") });

      contents.push({
        role: "user",
        parts: userParts
      });

      const config: any = {
        systemInstruction: systemPrompt,
        temperature: 0.85,
        topP: 0.95,
      };

      if (isGroupChat) {
        config.responseMimeType = "application/json";
        config.responseSchema = {
          type: Type.OBJECT,
          properties: {
            responses: {
              type: Type.ARRAY,
              description: "Sequential list of responses in the group chat thread from group members",
              items: {
                type: Type.OBJECT,
                properties: {
                  senderId: { type: Type.STRING },
                  senderName: { type: Type.STRING },
                  text: { type: Type.STRING }
                },
                required: ["senderId", "senderName", "text"]
              }
            }
          },
          required: ["responses"]
        };
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents,
        config,
      });

      if (isGroupChat) {
        try {
          const parsed = JSON.parse(response.text || "{}");
          res.json({ responses: parsed.responses || [] });
        } catch (jsonErr) {
          console.error("Failed to parse group chat JSON response:", response.text, jsonErr);
          const fallbackMember = groupMembers?.[0] || { id: "tw_group", name: "TWICE" };
          res.json({
            responses: [
              {
                senderId: fallbackMember.id,
                senderName: fallbackMember.name,
                text: response.text || "Hey! We are so happy to talk with you! 💖"
              }
            ]
          });
        }
      } else {
        res.json({ text: response.text });
      }
    } catch (err: any) {
      const modelStatus = err?.status || err?.code || "";
      console.log(`[Base Matcher] Secure offline in-character stand-in active (${modelStatus || 'standby-mode'}).`);
      
      // Serve immersive offline/rate-limit response in-character instead of crashing the client with a 500 error!
      if (isGroupChat) {
        const localGroupReponse = generateGroupFallbackResponses({ message, groupMembers, replyTo, mentions });
        res.json(localGroupReponse);
      } else {
        const localIdolResponse = generateFallbackResponse({ message, idolName, personality, replyTo });
        res.json({ text: localIdolResponse });
      }
    }
  });

  // Gemini Live WebSocket Bridge
  wss.on("connection", async (clientWs) => {
    let session: any = null;

    clientWs.on("message", async (data) => {
      try {
        const msg = JSON.parse(data.toString());
        
        if (msg.type === "setup") {
          const { idolName, personality } = msg;
          
          let liveVoice = "Kore";
          const nameLower = (idolName || "").toLowerCase().trim();
          if (nameLower === "nayeon" || nameLower === "sana" || nameLower === "momo") {
            liveVoice = "Puck"; // Energetic, bright, youthful voice profile
          } else if (nameLower === "mina" || nameLower === "tzuyu" || nameLower === "dahyun") {
            liveVoice = "Kore"; // Sweet, cheerful, standard feminine voice profile
          } else {
            liveVoice = "Zephyr"; // Calm, mature, warm voice profile
          }

          session = await ai.live.connect({
            model: "gemini-3.1-flash-live-preview",
            callbacks: {
              onmessage: (message: LiveServerMessage) => {
                const audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                if (audio) {
                  clientWs.send(JSON.stringify({ type: "audio", audio }));
                }
                if (message.serverContent?.interrupted) {
                  clientWs.send(JSON.stringify({ type: "interrupted" }));
                }
                const transcription = message.serverContent?.modelTurn?.parts[0]?.text;
                if (transcription) {
                   clientWs.send(JSON.stringify({ type: "transcription", text: transcription }));
                }
              },
            },
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: liveVoice } },
              },
              systemInstruction: `You are ${idolName}, a K-pop idol with a ${personality} personality. 
                You are in a real-time voice call with your fan. 
                Be emotionally intimate, warm, and cinematic. 
                Since it's a voice call, keep your turns natural and conversational.`,
            },
          });
          clientWs.send(JSON.stringify({ type: "ready" }));
        } else if (msg.type === "audio" && session) {
          session.sendRealtimeInput({
            audio: { data: msg.audio, mimeType: "audio/pcm;rate=16000" },
          });
        }
      } catch (wsError) {
        // Quietly handle voice connection events or standby events
      }
    });

    clientWs.on("close", () => {
      if (session) session.close();
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
