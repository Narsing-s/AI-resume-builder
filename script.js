import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.send("Server is running");
});

app.post("/api/rewriteResume", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: "No resume text provided" });
    }

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a professional resume writer."
          },
          {
            role: "user",
            content: `Rewrite this resume into a polished, ATS-friendly version with bullet points and metrics:\n\n${text}`
          }
        ]
      })
    });

    const result = await aiResponse.json();

    if (!result.choices) {
      console.error(result);
      return res.status(500).json({ error: "OpenAI API failed" });
    }

    const rewrittenResume = result.choices[0].message.content;

    res.json({ rewrittenResume });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
