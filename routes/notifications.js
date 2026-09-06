const express = require("express");
const router = express.Router();
const { readDB, writeDB } = require("../lib/db");
const { requireRole } = require("../middleware/auth");
const { getVapidKeys } = require("../lib/push");
const { v4: uuid } = require("uuid");

/* ---- Clé publique VAPID (nécessaire côté navigateur pour s'abonner) ---- */
router.get("/vapid-public-key", requireRole("admin"), async (req, res)=>{
  const keys = await getVapidKeys();
  res.json({ publicKey: keys.publicKey });
});

/* ---- Enregistrer l'abonnement push du navigateur de l'admin ---- */
router.post("/subscribe", requireRole("admin"), async (req, res)=>{
  const subscription = req.body;
  if(!subscription || !subscription.endpoint) return res.status(400).json({error:"Abonnement invalide."});
  const db = await readDB();
  db.pushSubscriptions = (db.pushSubscriptions || []).filter(s=>s.endpoint !== subscription.endpoint);
  db.pushSubscriptions.push(subscription);
  await writeDB(db);
  res.json({ ok:true });
});

router.post("/unsubscribe", requireRole("admin"), async (req, res)=>{
  const { endpoint } = req.body;
  const db = await readDB();
  db.pushSubscriptions = (db.pushSubscriptions || []).filter(s=>s.endpoint !== endpoint);
  await writeDB(db);
  res.json({ ok:true });
});

/* ---- Historique des notifications (visible dans l'espace admin) ---- */
router.get("/", requireRole("admin"), async (req, res)=>{
  const db = await readDB();
  const notifications = (db.notifications || []).slice().sort((a,b)=>b.createdAt-a.createdAt).slice(0,100);
  const unreadCount = notifications.filter(n=>!n.read).length;
  res.json({ notifications, unreadCount });
});

router.post("/:id/read", requireRole("admin"), async (req, res)=>{
  const db = await readDB();
  const n = (db.notifications || []).find(n=>n.id === req.params.id);
  if(n) n.read = true;
  await writeDB(db);
  res.json({ ok:true });
});

router.post("/read-all", requireRole("admin"), async (req, res)=>{
  const db = await readDB();
  (db.notifications || []).forEach(n=>n.read = true);
  await writeDB(db);
  res.json({ ok:true });
});

module.exports = router;
