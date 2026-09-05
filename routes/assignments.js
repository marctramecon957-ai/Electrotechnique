const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const { readDB, writeDB } = require("../lib/db");
const { requireAuth, requireRole } = require("../middleware/auth");
const { v4: uuid } = require("uuid");

const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, "..", "uploads"),
    filename: (req, file, cb)=>{
      cb(null, uuid() + path.extname(file.originalname));
    }
  }),
  limits: { fileSize: 20 * 1024 * 1024 } // 20 Mo
});

function currentUser(req){
  const db = readDB();
  return db.users.find(u=>u.id === req.session.userId);
}

/* ---- Liste des devoirs/TP visibles par l'utilisateur connecté ---- */
router.get("/", requireAuth, (req, res)=>{
  const db = readDB();
  const user = currentUser(req);
  let list = db.assignments;
  if(user.role === "eleve"){
    list = list.filter(a=>a.classIds.includes(user.classId));
  } else if(user.role === "prof"){
    // le prof voit tout ce qu'il a créé (et pourrait voir tout, simple ici)
    list = list;
  }
  // tri du plus récent au plus ancien
  list = list.slice().sort((a,b)=>b.createdAt - a.createdAt);
  res.json({ assignments: list });
});

/* ---- Créer un devoir / TP (prof uniquement) ---- */
router.post("/", requireRole("prof","admin"), upload.single("document"), (req, res)=>{
  const { title, description, type, classIds, dueDate, coefficient, maxNote } = req.body;
  if(!title || !type || !classIds){
    return res.status(400).json({error:"Titre, type et au moins une classe sont requis."});
  }
  const ids = Array.isArray(classIds) ? classIds : [classIds];
  const db = readDB();
  const assignment = {
    id: uuid(),
    title: title.trim(),
    description: (description||"").trim(),
    type: type === "tp" ? "tp" : "devoir",
    classIds: ids,
    dueDate: dueDate ? new Date(dueDate).getTime() : null,
    coefficient: Number(coefficient) || 1,
    maxNote: Number(maxNote) || 20,
    documentPath: req.file ? "/uploads/" + req.file.filename : null,
    documentName: req.file ? req.file.originalname : null,
    createdBy: req.session.userId,
    createdAt: Date.now()
  };
  db.assignments.push(assignment);
  writeDB(db);
  res.json({ assignment });
});

router.delete("/:id", requireRole("prof","admin"), (req, res)=>{
  const db = readDB();
  db.assignments = db.assignments.filter(a=>a.id !== req.params.id);
  db.grades = db.grades.filter(g=>g.assignmentId !== req.params.id);
  writeDB(db);
  res.json({ ok:true });
});

module.exports = router;
