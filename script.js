// server.js
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// POST route for resume rewriting
app.post("/api/rewriteResume", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "No resume text provided" });
    }

    // Call OpenAI (replace with Azure OpenAI if you prefer)
    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          { role: "system", content: "You are a professional resume writer." },
          { role: "user", content: `Rewrite this resume in a polished, ATS-friendly format. Highlight achievements, add metrics, and improve clarity:\n\n${text}` }
        ]
      })
    });

    const result = await aiResponse.json();
    const rewrittenResume = result.choices[0].message.content;

    res.json({ rewrittenResume });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to rewrite resume" });
  }
});

// Run backend on port 5000
app.listen(5000, () => console.log("Backend running on http://localhost:5000"));
