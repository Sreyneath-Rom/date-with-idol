import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import { WebSocketServer } from "ws";
import { GoogleGenAI, Modality } from "@google/genai";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));

const server = http.createServer(app);

const wss = new WebSocketServer({
  server,
  path: "/api/voice-chat",
});

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
});

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY || "",
});

const idolVoices: Record<string, string> = {
  nayeon: "Puck",
  sana: "Puck",
  momo: "Puck",
  mina: "Kore",
  tzuyu: "Kore",
  dahyun: "Kore",
  jihyo: "Zephyr",
  jeongyeon: "Zephyr",
  chaeyoung: "Zephyr",
};

const idolFallbacks: Record<string, string[]> = {
  sana: [
    "Hehe~ I missed you so much 🥺💖",
    "Did you eat yet? Let's eat together virtually 🌸",
    "You always make my heart flutter!",
  ],

  nayeon: [
    "Yahhh you came back 🐰✨",
    "I'm practicing choreography right now!",
    "You're my favorite person today 💖",
  ],

  momo: [
    "I'm hungry again 🥟",
    "Dance practice finished finallyyy",
    "Can we eat jokbal together? 😭",
  ],
};

function randomMessage(idolName: string) {
  const msgs =
    idolFallbacks[idolName?.toLowerCase()] || [
      "I'm happy talking with you 💖",
    ];

  return msgs[Math.floor(Math.random() * msgs.length)];
}

function pcmToWav(
  pcmBuffer: Buffer,
  sampleRate = 24000
) {
  const header = Buffer.alloc(44);

  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate =
    (sampleRate * numChannels * bitsPerSample) / 8;

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcmBuffer.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcmBuffer.length, 40);

  return Buffer.concat([header, pcmBuffer]);
}

app.get("/", (_, res) => {
  res.json({
    status: "running",
    message: "Date With Idol Server Online 💖",
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    const {
      message,
      idolName = "sana",
      personality = "cute",
      history = [],
    } = req.body;

    const contents: any[] = [];

    history.forEach((msg: any) => {
      contents.push({
        role: msg.role,
        parts: [{ text: msg.text }],
      });
    });

    contents.push({
      role: "user",
      parts: [{ text: message }],
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents,

      config: {
        temperature: 0.9,

        systemInstruction: `
You are ${idolName}, a K-pop idol.

Personality:
${personality}

Rules:
- Talk like Bubble / Weverse DM
- Short emotional messages
- Romantic and intimate
- Natural texting style
- Sometimes tease the user
- Never act robotic
`,
      },
    });

    res.json({
      text:
        response.text ||
        randomMessage(idolName),
    });
  } catch (err) {
    console.log(err);

    res.json({
      text: randomMessage(req.body.idolName),
      fallback: true,
    });
  }
});

app.post("/api/tts", async (req, res) => {
  try {
    const { text, idolName = "sana" } = req.body;

    const voiceName =
      idolVoices[idolName.toLowerCase()] || "Kore";

    const response =
      await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",

        contents: [
          {
            role: "user",
            parts: [
              {
                text: `
Say this like a real K-pop idol talking lovingly to their fan:

"${text}"
`,
              },
            ],
          },
        ],

        config: {
          responseModalities: [Modality.AUDIO],

          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName,
              },
            },
          },
        },
      });

    const part =
      response.candidates?.[0]?.content?.parts?.[0];

    const audio = part?.inlineData?.data;

    const mimeType =
      part?.inlineData?.mimeType ||
      "audio/wav";

    if (!audio) {
      return res.status(500).json({
        error: "No audio generated",
      });
    }

    let finalAudio = audio;
    let finalMime = mimeType;

    if (
      mimeType.includes("pcm") ||
      mimeType.includes("raw")
    ) {
      const pcmBuffer = Buffer.from(
        audio,
        "base64"
      );

      const wav = pcmToWav(pcmBuffer);

      finalAudio = wav.toString("base64");
      finalMime = "audio/wav";
    }

    res.json({
      audio: finalAudio,
      mimeType: finalMime,
    });
  } catch (err: any) {
    console.log(err);

    res.status(500).json({
      error: err.message,
    });
  }
});

app.post("/api/translate", async (req, res) => {
  try {
    const {
      text,
      targetLang = "Khmer",
    } = req.body;

    const response =
      await ai.models.generateContent({
        model: "gemini-3.5-flash",

        contents: [
          {
            role: "user",
            parts: [
              {
                text: `
Translate into ${targetLang}.

Keep emojis and emotional tone.

Text:
${text}
`,
              },
            ],
          },
        ],
      });

    res.json({
      translatedText: response.text,
    });
  } catch (err: any) {
    res.status(500).json({
      error: err.message,
    });
  }
});

app.post("/api/voice-clone/tts", async (req, res) => {
  try {
    const {
      text,
      voiceId,
    } = req.body;

    const audioStream =
      await elevenlabs.textToSpeech.convert(
        voiceId,
        {
          text,
          modelId: "eleven_v3",
        }
      );

    const chunks: Buffer[] = [];

    for await (const chunk of audioStream as any) {
      chunks.push(Buffer.from(chunk));
    }

    const buffer = Buffer.concat(chunks);

    res.json({
      audio: buffer.toString("base64"),
      mimeType: "audio/mp3",
    });
  } catch (err: any) {
    res.status(500).json({
      error: err.message,
    });
  }
});

wss.on("connection", async (ws) => {
  let session: any = null;

  ws.on("message", async (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      if (msg.type === "setup") {
        const {
          idolName = "sana",
          personality = "cute",
        } = msg;

        const voice =
          idolVoices[idolName.toLowerCase()] ||
          "Kore";

        session = await ai.live.connect({
          model:
            "gemini-3.1-flash-live-preview",

          config: {
            responseModalities: [
              Modality.AUDIO,
            ],

            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: voice,
                },
              },
            },

            systemInstruction: `
You are ${idolName}.

Personality:
${personality}

You are on a live voice call with your fan.
Talk naturally and emotionally.
`,
          },

          callbacks: {
            onmessage: (message: any) => {
              const audio =
                message.serverContent
                  ?.modelTurn?.parts?.[0]
                  ?.inlineData?.data;

              if (audio) {
                ws.send(
                  JSON.stringify({
                    type: "audio",
                    audio,
                  })
                );
              }

              const text =
                message.serverContent
                  ?.modelTurn?.parts?.[0]?.text;

              if (text) {
                ws.send(
                  JSON.stringify({
                    type: "text",
                    text,
                  })
                );
              }
            },
          },
        });

        ws.send(
          JSON.stringify({
            type: "ready",
          })
        );
      }

      if (
        msg.type === "audio" &&
        session
      ) {
        session.sendRealtimeInput({
          audio: {
            data: msg.audio,
            mimeType:
              "audio/pcm;rate=16000",
          },
        });
      }
    } catch (err) {
      console.log(err);
    }
  });

  ws.on("close", () => {
    if (session) {
      session.close();
    }
  });
});

server.listen(PORT, () => {
  console.log(`
💖 Date With Idol Server Running
🌐 http://localhost:${PORT}
`);
});
