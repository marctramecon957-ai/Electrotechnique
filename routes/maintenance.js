const express = require("express");
const router = express.Router();
const { readDB, writeDB } = require("../lib/db");
const { requireRole } = require("../middleware/auth");
const { getMaintenanceStatus } = require("../lib/maintenance");

/* ---- Statut public (utilisé par la page maintenance elle-même) ---- */
router.get("/status", async (req, res)=>{
  const db = await readDB();
  res.json(getMaintenanceStatus(db.maintenance));
});

/* ---- Configuration complète (admin) ---- */
router.get("/", requireRole("admin"), async (req, res)=>{
  const db = await readDB();
  res.json({ maintenance: db.maintenance, status: getMaintenanceStatus(db.maintenance) });
});

/* ---- Activer immédiatement ---- */
router.post("/activate-now", requireRole("admin"), async (req, res)=>{
  const { message, durationMinutes } = req.body;
  const db = await readDB();
  db.maintenance = {
    active: true,
    scheduledStart: null,
    scheduledEnd: durationMinutes ? Date.now() + Number(durationMinutes)*60000 : null,
    message: (message||"").trim()
  };
  await writeDB(db);
  res.json({ maintenance: db.maintenance });
});

/* ---- Programmer un créneau (date de début + durée) ---- */
router.post("/schedule", requireRole("admin"), async (req, res)=>{
  const { startAt, durationMinutes, message } = req.body;
  if(!startAt || !durationMinutes) return res.status(400).json({error:"Date de début et durée requises."});
  const start = new Date(startAt).getTime();
  const end = start + Number(durationMinutes)*60000;
  if(isNaN(start) || end <= start) return res.status(400).json({error:"Créneau invalide."});
  const db = await readDB();
  db.maintenance = {
    active: false,
    scheduledStart: start,
    scheduledEnd: end,
    message: (message||"").trim()
  };
  await writeDB(db);
  res.json({ maintenance: db.maintenance });
});

/* ---- Désactiver / annuler ---- */
router.post("/deactivate", requireRole("admin"), async (req, res)=>{
  const db = await readDB();
  db.maintenance = { active:false, scheduledStart:null, scheduledEnd:null, message:"" };
  await writeDB(db);
  res.json({ maintenance: db.maintenance });
});

module.exports = router;
