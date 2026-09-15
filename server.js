import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = Number(process.env.PORT || 5000);
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.use(express.json({ limit: "2mb" }));
app.use(express.static(__dirname));

const clean = (v = "") => String(v).trim();
const textOf = (r = {}) => [r.name,r.title,r.email,r.phone,r.location,r.linkedin,r.website,r.summary,...(r.skills||[]),...(r.experience||[]).flatMap(x=>[x.role,x.company,...(x.bullets||[])]),...(r.education||[]).flatMap(x=>[x.degree,x.school]),...(r.projects||[]).flatMap(x=>[x.name,x.description,...(x.tech||[])]),...(r.certifications||[])].filter(Boolean).join(" ");

function ats(resume, jd="") {
  const text=textOf(resume).toLowerCase();
  const words=[...new Set((jd.toLowerCase().match(/[a-z][a-z0-9+#.-]{2,}/g)||[]).filter(w=>!['the','and','with','for','from','you','your','our','are','this','that','will','have','has','into','using'].includes(w)))];
  const matched=words.filter(w=>text.includes(w));
  const keyword=words.length?Math.round(matched.length/words.length*60):45;
  const complete=[resume.name,resume.email,resume.summary,resume.experience?.length,resume.education?.length,resume.skills?.length].filter(Boolean).length;
  const bullets=(resume.experience||[]).flatMap(x=>x.bullets||[]);
  const quantified=bullets.filter(b=>/\d|%|\$|₹|increased|reduced|saved|grew|improved/i.test(b)).length;
  return {score:Math.max(0,Math.min(100,keyword+Math.min(25,complete*4)+Math.min(15,bullets.length?8:0,8)+Math.min(7,quantified*2))),keywords:words,matched,missing:words.filter(w=>!text.includes(w)).slice(0,30)};
}

async function ai(prompt){
  if(!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");
  const r=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({model:OPENAI_MODEL,temperature:.3,messages:[{role:"system",content:"You are an expert ATS resume writer. Never invent employers, dates, skills, metrics, degrees or achievements. Improve wording only from supplied facts."},{role:"user",content:prompt}]})});
  const d=await r.json(); if(!r.ok) throw new Error(d?.error?.message||"AI request failed"); return d.choices?.[0]?.message?.content||"";
}

app.get("/health",(_q,s)=>s.json({ok:true,service:"ai-resume-builder"}));
app.get("/",(_q,s)=>s.sendFile(path.join(__dirname,"index.html")));
app.post("/api/ats/analyze",(q,s)=>s.json(ats(q.body?.resume||{},q.body?.jobDescription||"")));
app.post("/api/rewriteResume",async(q,s)=>{try{s.json({rewrittenResume:await ai(`Rewrite this resume into a polished ATS-friendly version. Preserve all facts and do not invent metrics.\n\n${clean(q.body?.text)}`)})}catch(e){s.status(500).json({error:e.message})}});
app.post("/api/ai/summary",async(q,s)=>{try{s.json({result:await ai(`Write three concise ATS-friendly professional summaries for the target role ${clean(q.body?.targetRole)} using only these facts:\n${JSON.stringify(q.body?.resume||{})}`)})}catch(e){s.status(500).json({error:e.message})}});
app.post("/api/ai/bullets",async(q,s)=>{try{s.json({result:await ai(`Improve these resume bullets for ${clean(q.body?.role)}. Preserve facts and numbers; do not fabricate. Return concise bullets.\n${(q.body?.bullets||[]).join("\n")}`)})}catch(e){s.status(500).json({error:e.message})}});
app.post("/api/ai/tailor",async(q,s)=>{try{s.json({result:await ai(`Tailor this resume to the job description. Return JSON with summary, skills, experience and recommendations. Do not invent facts.\nRESUME:${JSON.stringify(q.body?.resume||{})}\nJOB:${clean(q.body?.jobDescription)}`)})}catch(e){s.status(500).json({error:e.message})}});

app.listen(PORT,"0.0.0.0",()=>console.log(`AI Resume Builder listening on 0.0.0.0:${PORT}`));
