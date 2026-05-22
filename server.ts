import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import dotenv from "dotenv";
import { WebSocketServer } from "ws";
import http from "http";

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: "/api/voice-chat" });

  app.use(express.json());

  // API Routes
  app.post("/api/chat", async (req, res) => {
    const { message, history, idolName, personality, image } = req.body;
    
    try {
      const systemPrompt = `You are ${idolName}, a K-pop idol with a ${personality} personality. 
Talk to your fan in an emotionally intimate, cinematic, and addictive K-pop idol bubble style. 
Keep responses relatively short (1-3 sentences) but deeply impactful. 
Do not use emojis excessively. Use a soft, premium, loving tone. Ensure everything you say stays strictly in-character.`;

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

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.85,
          topP: 0.95,
        }
      });

      res.json({ text: response.text });
    } catch (error) {
      console.error("Gemini Error:", error);
      res.status(500).json({ error: "Failed to connect with your idol." });
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
                voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } }, // Kore is a good default for female-ish or balanced tones
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
      } catch (error) {
        console.error("WS Error:", error);
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
