import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import fs from "fs";
import multer from "multer";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// 🔥 Multer (Render-safe path)
const upload = multer({ dest: "/tmp/" });

/* =========================
   CHAT ENDPOINT
========================= */
app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are an English teacher. Correct the sentence, explain briefly, and give a score out of 10. Respond ONLY in JSON format: { corrected, explanation, score }",
          },
          {
            role: "user",
            content: message,
          },
        ],
      }),
    });

    const data = await response.json();

    const content = data.choices[0].message.content;

    res.json(JSON.parse(content));
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: "Chat error" });
  }
});

/* =========================
   SPEECH (WHISPER)
========================= */
app.post("/speech", upload.single("audio"), async (req, res) => {
  try {
    const file = req.file;

    const formData = new FormData();
    formData.append("file", fs.createReadStream(file.path));
    formData.append("model", "whisper-1");

    const response = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: formData,
      }
    );

    const data = await response.json();

    res.json({ text: data.text });
  } catch (err) {
    console.error("Speech error:", err);
    res.status(500).json({ error: "Speech error" });
  }
});

/* =========================
   HEALTH CHECK (IMPORTANT)
========================= */
app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

/* =========================
   START SERVER (Render ready)
========================= */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});