import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import multer from "multer";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: "/tmp/" });

/* =========================
   CHAT (GOOD ACCURACY)
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
        model: "gpt-4o", // ✅ FIXED MODEL
        messages: [
          {
            role: "system",
            content: `
You are a professional English teacher.

Your job:
1. Correct the sentence naturally
2. Give a short and simple explanation
3. Give a realistic score from 0–100

SCORING RULES:

- Perfect sentence → 95–100
- Small spelling/punctuation mistake → 85–95
- Minor grammar mistake → 70–85
- Medium mistake → 50–70
- Very incorrect → below 50

IMPORTANT:
- Do NOT give extremely low scores for small mistakes
- Be fair like a human teacher

Examples:
"Helo i want to go shopping" → 75–85
"Hello, I want to go shopping" → 95+

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

    console.log("🤖 Raw:", content);

    let parsed;

    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = {
        corrected: content,
        explanation: "Formatting issue",
        score: 75,
      };
    }

    // ✅ SCORE PROTECTION (VERY IMPORTANT)
    if (typeof parsed.score !== "number") {
      parsed.score = 75;
    }

    // Prevent unrealistic scores
    parsed.score = Math.max(50, Math.min(parsed.score, 100));

    console.log("✅ Final:", parsed);

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
/* ========================= */
app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});