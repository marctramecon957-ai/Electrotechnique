const express = require("express");
const router = express.Router();
const { readDB, writeDB } = require("../lib/db");
const { requireRole } = require("../middleware/auth");
const { v4: uuid } = require("uuid");

/* Identifiant anonyme (cookie) pour empêcher le double-vote sans exiger de compte */
function getAnonId(req, res){
  let id = req.cookies && req.cookies.anon_id;
  if(!id){
    id = uuid();
    res.cookie("anon_id", id, { maxAge: 1000*60*60*24*365, httpOnly:true, sameSite:"lax" });
  }
  return id;
}

/* ===================== Publications ===================== */
router.get("/posts", async (req, res)=>{
  const db = await readDB();
  const posts = db.posts.slice().sort((a,b)=>b.date-a.date);
  res.json({ posts });
});

router.post("/posts", requireRole("admin","prof"), async (req, res)=>{
  const { title, content, category } = req.body;
  if(!title || !content) return res.status(400).json({error:"Titre et contenu requis."});
  const db = await readDB();
  const post = { id: uuid(), title:title.trim(), content:content.trim(), category: category||"Info", date: Date.now() };
  db.posts.push(post);
  await writeDB(db);
  res.json({ post });
});

router.delete("/posts/:id", requireRole("admin","prof"), async (req, res)=>{
  const db = await readDB();
  db.posts = db.posts.filter(p=>p.id !== req.params.id);
  await writeDB(db);
  res.json({ ok:true });
});

/* ===================== Documents (normes) ===================== */
router.get("/documents", async (req, res)=>{
  const db = await readDB();
  const documents = db.documents.slice().sort((a,b)=>b.date-a.date);
  res.json({ documents });
});

router.post("/documents", requireRole("admin","prof"), async (req, res)=>{
  const { title, norme, url, type } = req.body;
  if(!title || !url) return res.status(400).json({error:"Titre et lien requis."});
  const db = await readDB();
  const doc = { id: uuid(), title:title.trim(), norme:(norme||"").trim(), url:url.trim(), type: type==="officiel"?"officiel":"interne", date: Date.now() };
  db.documents.push(doc);
  await writeDB(db);
  res.json({ document: doc });
});

router.delete("/documents/:id", requireRole("admin","prof"), async (req, res)=>{
  const db = await readDB();
  db.documents = db.documents.filter(d=>d.id !== req.params.id);
  await writeDB(db);
  res.json({ ok:true });
});

/* ===================== Sondages ===================== */
router.get("/polls", async (req, res)=>{
  const anonId = getAnonId(req, res);
  const db = await readDB();
  const polls = db.polls.slice().sort((a,b)=>b.date-a.date).map(p=>({
    id: p.id, question: p.question, options: p.options,
    hasVoted: (p.voterIds||[]).includes(anonId)
  }));
  res.json({ polls });
});

router.post("/polls", requireRole("admin","prof"), async (req, res)=>{
  const { question, options } = req.body;
  if(!question || !Array.isArray(options) || options.filter(o=>o&&o.trim()).length < 2){
    return res.status(400).json({error:"Question et au moins 2 options requises."});
  }
  const db = await readDB();
  const poll = {
    id: uuid(), question: question.trim(),
    options: options.filter(o=>o&&o.trim()).map(label=>({label:label.trim(), votes:0})),
    voterIds: [], date: Date.now()
  };
  db.polls.push(poll);
  await writeDB(db);
  res.json({ poll });
});

router.post("/polls/:id/vote", async (req, res)=>{
  const anonId = getAnonId(req, res);
  const { optionIndex } = req.body;
  const db = await readDB();
  const poll = db.polls.find(p=>p.id === req.params.id);
  if(!poll) return res.status(404).json({error:"Sondage introuvable"});
  if((poll.voterIds||[]).includes(anonId)) return res.status(400).json({error:"Vous avez déjà voté."});
  if(!poll.options[optionIndex]) return res.status(400).json({error:"Option invalide."});
  poll.options[optionIndex].votes++;
  poll.voterIds = [...(poll.voterIds||[]), anonId];
  await writeDB(db);
  res.json({ ok:true });
});

router.delete("/polls/:id", requireRole("admin","prof"), async (req, res)=>{
  const db = await readDB();
  db.polls = db.polls.filter(p=>p.id !== req.params.id);
  await writeDB(db);
  res.json({ ok:true });
});

module.exports = router;
