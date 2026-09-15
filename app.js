const STORAGE_KEY = "resume-ai-v3";

const EMPTY_RESUME = {
  name: "", title: "", email: "", phone: "", location: "", linkedin: "", website: "",
  summary: "", skills: [], experience: [], education: [], projects: [], certifications: [], jobDescription: ""
};

const SAMPLE_RESUME = {
  ...EMPTY_RESUME,
  name: "Narsing Beesetti",
  title: "MuleSoft Developer | Production Support",
  email: "narsing@example.com",
  phone: "+91 90000 00000",
  location: "Hyderabad, India",
  linkedin: "linkedin.com/in/narsing",
  summary: "MuleSoft developer with experience in API-led connectivity, DataWeave, REST integrations and production support. Skilled in monitoring, incident resolution and building reliable integrations.",
  skills: ["MuleSoft", "Anypoint Platform", "DataWeave 2.0", "REST API", "APIKit", "Java", "Git", "Dynatrace"],
  experience: [{ role: "MuleSoft Developer", company: "Technology Company", location: "India", dates: "2023 — Present", bullets: ["Developed REST APIs using MuleSoft and API-led connectivity patterns.", "Resolved production incidents and improved integration stability through monitoring and root-cause analysis.", "Created DataWeave transformations and reusable integration components."] }],
  education: [{ degree: "Bachelor of Technology", school: "University", location: "India", dates: "2019 — 2023" }],
  projects: [{ name: "Bank Account API", tech: ["MuleSoft", "DataWeave", "MySQL"], description: "Built API-led banking services for account creation, retrieval and updates." }],
  certifications: []
};

let data = loadResume();
let activeTab = "basics";
let activeTemplate = localStorage.getItem("resume-ai-template") || "modern";
let lastAnalysis = { score: 0, matched: [], missing: [], keywords: [] };

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadResume() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    return saved && typeof saved === "object" ? { ...clone(EMPTY_RESUME), ...saved } : clone(EMPTY_RESUME);
  } catch (error) {
    localStorage.removeItem(STORAGE_KEY);
    return clone(EMPTY_RESUME);
  }
}

function esc(value) {
  return String(value ?? "").replace(/[&<>\"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
}

function save(showState = true) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  if (showState) setSaveState("Saved locally");
  updatePreview();
  analyze();
}

function setSaveState(text) {
  const el = document.querySelector("#saveState");
  if (el) el.textContent = text;
}

function toast(message) {
  const el = document.querySelector("#toast");
  if (!el) return;
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
}

function field(label, key, value, type = "input", full = false, placeholder = "") {
  const cls = `field${full ? " full" : ""}`;
  if (type === "textarea") return `<div class="${cls}"><label>${label}</label><textarea data-key="${key}" placeholder="${esc(placeholder)}">${esc(value)}</textarea></div>`;
  return `<div class="${cls}"><label>${label}</label><input data-key="${key}" value="${esc(value)}" placeholder="${esc(placeholder)}"></div>`;
}

function renderForm() {
  const form = document.querySelector("#form");
  if (!form) return;

  if (activeTab === "basics") {
    form.innerHTML = `<div class="grid">
      ${field("Full name", "name", data.name, "input", false, "Your full name")}
      ${field("Professional title", "title", data.title, "input", false, "Target role")}
      ${field("Email", "email", data.email, "input", false, "name@example.com")}
      ${field("Phone", "phone", data.phone, "input", false, "+91 ...")}
      ${field("Location", "location", data.location, "input", false, "City, Country")}
      ${field("LinkedIn", "linkedin", data.linkedin, "input", false, "linkedin.com/in/...")}
      ${field("Website", "website", data.website, "input", false, "yourwebsite.com")}
      ${field("Professional summary", "summary", data.summary, "textarea", true, "Write a concise professional summary...")}
    </div>`;
    return;
  }

  if (activeTab === "experience") {
    form.innerHTML = `<div>${(data.experience || []).map((item, index) => entryCard("experience", item, index, `
      <div class="grid">
        ${field("Role", "role", item.role)}
        ${field("Company", "company", item.company)}
        ${field("Location", "location", item.location)}
        ${field("Dates", "dates", item.dates)}
        ${field("Bullets (one per line)", "bullets", (item.bullets || []).join("\n"), "textarea", true, "Describe achievements and responsibilities...")}
      </div>`)).join("")}</div>
      <button type="button" class="small-btn" data-action="add" data-type="experience">＋ Add experience</button>`;
    return;
  }

  if (activeTab === "education") {
    form.innerHTML = `${(data.education || []).map((item, index) => entryCard("education", item, index, `
      <div class="grid">
        ${field("Degree", "degree", item.degree)}
        ${field("School", "school", item.school)}
        ${field("Location", "location", item.location)}
        ${field("Dates", "dates", item.dates)}
      </div>`)).join("")}
      <button type="button" class="small-btn" data-action="add" data-type="education">＋ Add education</button>`;
    return;
  }

  if (activeTab === "skills") {
    form.innerHTML = `<div class="field"><label>Skills</label><textarea id="skillsInput" placeholder="Type skills separated by commas">${esc((data.skills || []).join(", "))}</textarea></div>
      <div class="field"><label>Certifications</label><textarea id="certInput" placeholder="One certification per line">${esc((data.certifications || []).join("\n"))}</textarea></div>
      <p class="helper">Skills and certifications update the live resume automatically.</p>`;
    return;
  }

  if (activeTab === "projects") {
    form.innerHTML = `${(data.projects || []).map((item, index) => entryCard("projects", item, index, `
      <div class="grid">
        ${field("Project name", "name", item.name)}
        ${field("Technologies", "tech", (item.tech || []).join(", "))}
        ${field("Description", "description", item.description, "textarea", true, "Describe the project and your contribution...")}
      </div>`)).join("")}
      <button type="button" class="small-btn" data-action="add" data-type="projects">＋ Add project</button>`;
    return;
  }

  if (activeTab === "target") {
    form.innerHTML = `<div class="field"><label>Paste job description</label><textarea id="jd" style="min-height:300px" placeholder="Paste the job description here to calculate keyword match and tailor your resume.">${esc(data.jobDescription)}</textarea></div>
      <div class="button-row"><button type="button" class="primary" data-action="analyze">Analyze job match</button><button type="button" class="ghost" data-action="clear-jd">Clear job description</button></div>
      <div id="analysis" class="section-card" style="margin-top:15px">${analysisHTML(lastAnalysis)}</div>`;
  }
}

function entryCard(type, item, index, inside) {
  const heading = item.role || item.degree || item.name || `New ${type}`;
  return `<div class="section-card" data-entry-type="${type}" data-entry-index="${index}">
    <div class="section-head"><b>${esc(heading)}</b><button type="button" class="small-btn danger" data-action="remove" data-type="${type}" data-index="${index}">Remove</button></div>
    ${inside}
  </div>`;
}

function updateEntry(type, index, key, value) {
  if (!data[type] || !data[type][index]) return;
  if (key === "bullets") data[type][index][key] = value.split("\n").map(v => v.trim()).filter(Boolean);
  else if (key === "tech") data[type][index][key] = value.split(",").map(v => v.trim()).filter(Boolean);
  else data[type][index][key] = value;
  save(false);
}

function addEntry(type) {
  if (!Array.isArray(data[type])) data[type] = [];
  if (type === "experience") data[type].push({ role: "", company: "", location: "", dates: "", bullets: [""] });
  if (type === "education") data[type].push({ degree: "", school: "", location: "", dates: "" });
  if (type === "projects") data[type].push({ name: "", tech: [], description: "" });
  renderForm();
  save();
  toast(`${type.charAt(0).toUpperCase() + type.slice(1)} added`);
}

function removeEntry(type, index) {
  if (!Array.isArray(data[type])) return;
  data[type].splice(index, 1);
  renderForm();
  save();
  toast("Removed");
}

function analysisHTML(result) {
  const a = result || {};
  return `<div><b>Job match: ${Number(a.score || 0)}/100</b>
    <p>Matched keywords: ${(a.matched || []).slice(0, 18).join(", ") || "None yet"}</p>
    <p>Missing keywords: ${(a.missing || []).slice(0, 18).join(", ") || "Great coverage"}</p></div>`;
}

async function analyze() {
  const score = document.querySelector("#score");
  try {
    const response = await fetch("/api/ats/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resume: data, jobDescription: data.jobDescription || "" })
    });
    if (!response.ok) throw new Error("ATS analysis unavailable");
    lastAnalysis = await response.json();
    if (score) score.textContent = lastAnalysis.score || 0;
    const analysis = document.querySelector("#analysis");
    if (analysis) analysis.innerHTML = analysisHTML(lastAnalysis);
  } catch (error) {
    if (score) score.textContent = "—";
  }
}

function updatePreview() {
  const preview = document.querySelector("#preview");
  if (!preview) return;
  preview.dataset.template = activeTemplate;
  preview.innerHTML = `
    <div class="resume-name">${esc(data.name || "Your Name")}</div>
    <div class="resume-title">${esc(data.title || "Professional Title")}</div>
    <div class="contact">${[data.email, data.phone, data.location, data.linkedin, data.website].filter(Boolean).map(esc).join(" · ") || "email@example.com · Location"}</div>
    ${data.summary ? `<section class="rsec"><h4>PROFILE</h4><p>${esc(data.summary)}</p></section>` : ""}
    ${data.experience?.length ? `<section class="rsec"><h4>EXPERIENCE</h4>${data.experience.map(item => `<div class="job"><div class="jobtop"><b>${esc(item.role)}</b><span>${esc(item.dates)}</span></div><em>${esc(item.company)}${item.location ? " · " + esc(item.location) : ""}</em><ul>${(item.bullets || []).filter(Boolean).map(b => `<li>${esc(b)}</li>`).join("")}</ul></div>`).join("")}</section>` : ""}
    ${data.education?.length ? `<section class="rsec"><h4>EDUCATION</h4>${data.education.map(item => `<div class="job"><div class="jobtop"><b>${esc(item.degree)}</b><span>${esc(item.dates)}</span></div><em>${esc(item.school)}${item.location ? " · " + esc(item.location) : ""}</em></div>`).join("")}</section>` : ""}
    ${data.skills?.length ? `<section class="rsec"><h4>SKILLS</h4><div class="chips">${data.skills.map(skill => `<span class="chip">${esc(skill)}</span>`).join("")}</div></section>` : ""}
    ${data.projects?.length ? `<section class="rsec"><h4>PROJECTS</h4>${data.projects.map(item => `<div class="job"><b>${esc(item.name)}</b><p>${esc(item.description)}</p><span>${esc((item.tech || []).join(" · "))}</span></div>`).join("")}</section>` : ""}
    ${data.certifications?.length ? `<section class="rsec"><h4>CERTIFICATIONS</h4><p>${data.certifications.map(esc).join(" · ")}</p></section>` : ""}
  `;
}

function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll(".tab").forEach(button => button.classList.toggle("active", button.dataset.tab === tab));
  renderForm();
}

function loadSample() {
  data = clone(SAMPLE_RESUME);
  save();
  switchTab("basics");
  toast("Sample resume loaded");
}

function resetResume() {
  if (!window.confirm("Clear the entire resume? This cannot be undone.")) return;
  data = clone(EMPTY_RESUME);
  localStorage.removeItem(STORAGE_KEY);
  save();
  switchTab("basics");
  toast("Resume cleared");
}

function exportPDF() {
  updatePreview();
  window.print();
}

function openModal(title, content) {
  const modal = document.querySelector("#modal");
  if (!modal) return;
  document.querySelector("#modalTitle").textContent = title;
  document.querySelector("#modalBody").innerHTML = content;
  modal.classList.remove("hidden");
}

function closeModal() {
  document.querySelector("#modal")?.classList.add("hidden");
}

async function aiAction(url, body, title) {
  openModal(title, `<p class="suggestion">Generating suggestions…</p>`);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "AI request failed");
    openModal(title, `<div class="suggestion">${esc(result.result || result.rewrittenResume || "No result returned")}</div>`);
  } catch (error) {
    openModal(title, `<p class="suggestion">${esc(error.message)}</p>`);
  }
}

function handleClick(event) {
  const tabButton = event.target.closest(".tab");
  if (tabButton) {
    switchTab(tabButton.dataset.tab);
    return;
  }

  const actionButton = event.target.closest("[data-action]");
  if (!actionButton) return;
  const action = actionButton.dataset.action;

  if (action === "add") addEntry(actionButton.dataset.type);
  else if (action === "remove") removeEntry(actionButton.dataset.type, Number(actionButton.dataset.index));
  else if (action === "analyze") analyze();
  else if (action === "clear-jd") {
    data.jobDescription = "";
    renderForm();
    save();
    toast("Job description cleared");
  }
}

function handleInput(event) {
  const target = event.target;
  if (target.matches("[data-key]") && !target.closest("[data-entry-type]")) {
    data[target.dataset.key] = target.value;
    save(false);
    return;
  }
  const card = target.closest("[data-entry-type]");
  if (card && target.matches("[data-key]")) {
    updateEntry(card.dataset.entryType, Number(card.dataset.entryIndex), target.dataset.key, target.value);
    return;
  }
  if (target.id === "skillsInput") {
    data.skills = target.value.split(",").map(v => v.trim()).filter(Boolean);
    save(false);
  } else if (target.id === "certInput") {
    data.certifications = target.value.split("\n").map(v => v.trim()).filter(Boolean);
    save(false);
  } else if (target.id === "jd") {
    data.jobDescription = target.value;
    save(false);
  }
}

function init() {
  document.addEventListener("click", handleClick);
  document.addEventListener("input", handleInput);

  document.querySelector("#sampleBtn")?.addEventListener("click", loadSample);
  document.querySelector("#exportBtn")?.addEventListener("click", exportPDF);
  document.querySelector("#summaryBtn")?.addEventListener("click", () => aiAction("/api/ai/summary", { resume: data, targetRole: data.title }, "AI summary options"));
  document.querySelector("#tailorBtn")?.addEventListener("click", () => {
    if (!data.jobDescription.trim()) {
      toast("Add a job description first");
      switchTab("target");
      return;
    }
    aiAction("/api/ai/tailor", { resume: data, jobDescription: data.jobDescription }, "Tailored resume recommendations");
  });
  document.querySelector("#closeModal")?.addEventListener("click", closeModal);
  document.querySelector("#modal")?.addEventListener("click", event => { if (event.target.id === "modal") closeModal(); });
  document.addEventListener("keydown", event => { if (event.key === "Escape") closeModal(); });

  const template = document.querySelector("#template");
  if (template) {
    template.value = activeTemplate;
    template.addEventListener("change", event => {
      activeTemplate = event.target.value;
      localStorage.setItem("resume-ai-template", activeTemplate);
      updatePreview();
      toast(`${event.target.options[event.target.selectedIndex].text} template selected`);
    });
  }

  renderForm();
  updatePreview();
  analyze();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
