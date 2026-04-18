// server.js
import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";

const app = express();
app.use(bodyParser.json());

app.post("/api/rewriteResume", async (req, res) => {
  const { text } = req.body;

  // Call AI model (replace with your API endpoint + key)
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
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
