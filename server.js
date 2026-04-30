import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import FormData from "form-data";
import fs from "fs";
import multer from "multer";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: "/tmp/" });

/* =========================
   CHAT (FINAL SCORING FIX)
========================= */
app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    console.log("📨 Message:", message);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `
You are a professional English teacher.

Your job:
1. Correct the sentence naturally
2. Give a short and clear explanation
3. Give a realistic score from 0–100

SCORING RULES:

- Perfect sentence → 95–100
- Small mistake → 85–95
- Minor grammar mistake → 70–85
- Medium mistake → 50–70
- Very incorrect → below 50
- Random or meaningless text → below 40

IMPORTANT:
- If sentence is meaningless, return corrected as "---"
- Be fair and realistic

Return ONLY JSON:
{"corrected":"...","explanation":"...","score":85}
`,
          },
          {
            role: "user",
            content: message,
          },
        ],
      }),
    });

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || "";

    console.log("🤖 Raw AI:", content);

    let parsed;

    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = {
        corrected: content,
        explanation: "Formatting issue",
        score: 70,
      };
    }

    // ✅ Ensure score exists
    if (typeof parsed.score !== "number") {
      parsed.score = 70;
    }

    // ✅ Clamp score 0–100
    parsed.score = Math.min(Math.max(parsed.score, 0), 100);

    // 🔥 FINAL GIBBERISH DETECTION (STRONG FIX)
    if (
      parsed.corrected === "---" ||
      parsed.explanation?.toLowerCase().includes("not form a coherent sentence") ||
      parsed.explanation?.toLowerCase().includes("random") ||
      message.length < 5
    ) {
      parsed.score = Math.min(parsed.score, 25);
    }

    console.log("✅ Final Response:", parsed);

    res.json(parsed);
  } catch (err) {
    console.error("Chat error:", err);

    res.json({
      corrected: "Error occurred",
      explanation: "Server error",
      score: 0,
    });
  }
});

/* =========================
   SPEECH (UNCHANGED)
========================= */
app.post("/speech", upload.single("audio"), async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      console.log("❌ No file received");
      return res.json({ text: "" });
    }

    console.log("📁 File:", file.path);

    const formData = new FormData();
    formData.append("file", fs.createReadStream(file.path));
    formData.append("model", "whisper-1");

    const response = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          ...formData.getHeaders(),
        },
        body: formData,
      }
    );

    const raw = await response.text();
    console.log("🧠 Whisper raw:", raw);

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      data = {};
    }

    res.json({ text: data.text || "" });
  } catch (err) {
    console.error("Speech error:", err);
    res.json({ text: "" });
  }
});

/* ========================= */
app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});