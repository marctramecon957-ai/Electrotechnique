const express = require("express");
const router = express.Router();
const { readDB, writeDB } = require("../lib/db");
const { requireAuth, requireRole } = require("../middleware/auth");
const { computeStudentAverage } = require("../lib/grading");
const { createAdminNotification } = require("../lib/push");
const { v4: uuid } = require("uuid");

/* ---- Notes d'un devoir/TP (prof) : liste des élèves concernés + notes existantes ---- */
router.get("/assignment/:assignmentId", requireRole("prof","admin"), async (req, res)=>{
  const db = await readDB();
  const assignment = db.assignments.find(a=>a.id === req.params.assignmentId);
  if(!assignment) return res.status(404).json({error:"Devoir/TP introuvable"});
  const students = db.users.filter(u=>u.role==="eleve" && assignment.classIds.includes(u.classId));
  const rows = students.map(s=>{
    const g = db.grades.find(gr=>gr.assignmentId===assignment.id && gr.studentId===s.id);
    return { studentId:s.id, nom:s.nom, prenom:s.prenom, classId:s.classId, note: g ? g.note : null };
  });
  res.json({ assignment, rows });
});

/* ---- Enregistrer / mettre à jour une note ---- */
router.post("/", requireRole("prof","admin"), async (req, res)=>{
  const { assignmentId, studentId, note } = req.body;
  if(!assignmentId || !studentId) return res.status(400).json({error:"Devoir et élève requis."});
  const db = await readDB();
  const assignment = db.assignments.find(a=>a.id===assignmentId);
  if(!assignment) return res.status(404).json({error:"Devoir/TP introuvable"});
  let g = db.grades.find(gr=>gr.assignmentId===assignmentId && gr.studentId===studentId);
  const noteVal = note === "" || note === null || note === undefined ? null : Number(note);
  if(g){
    g.note = noteVal; g.gradedAt = Date.now();
  } else {
    g = { id: uuid(), assignmentId, studentId, note: noteVal, gradedAt: Date.now() };
    db.grades.push(g);
  }
  await writeDB(db);
  res.json({ grade: g });

  // Notifie l'administrateur uniquement quand un professeur saisit une vraie note
  if(noteVal !== null && req.session.role === "prof"){
    const prof = db.users.find(u=>u.id === req.session.userId);
    const student = db.users.find(u=>u.id === studentId);
    const profName = prof ? `${prof.prenom} ${prof.nom}` : "Un professeur";
    const studentName = student ? `${student.prenom} ${student.nom}` : "un élève";
    createAdminNotification(
      "Nouvelle note",
      `${profName} a noté ${studentName} : ${noteVal}/${assignment.maxNote} pour « ${assignment.title} »`,
      "/espace-admin.html"
    ).catch(()=>{});
  }
});

/* ---- Mes notes (élève connecté) ---- */
router.get("/me", requireAuth, async (req, res)=>{
  const db = await readDB();
  const user = db.users.find(u=>u.id===req.session.userId);
  if(user.role !== "eleve" || !user.classId) return res.json({ average:null, details:[] });
  const result = computeStudentAverage(user.id, user.classId, db.assignments, db.grades);
  res.json(result);
});

/* ---- Moyennes de toute une classe (prof/admin) ---- */
router.get("/class/:classId", requireRole("prof","admin"), async (req, res)=>{
  const db = await readDB();
  const classId = req.params.classId;
  const students = db.users.filter(u=>u.role==="eleve" && u.classId===classId);
  const results = students.map(s=>{
    const r = computeStudentAverage(s.id, classId, db.assignments, db.grades);
    return { studentId:s.id, nom:s.nom, prenom:s.prenom, average:r.average, details:r.details };
  });
  const withAvg = results.filter(r=>r.average !== null);
  const classAverage = withAvg.length ? Math.round((withAvg.reduce((s,r)=>s+r.average,0)/withAvg.length)*100)/100 : null;
  res.json({ students: results, classAverage });
});

/* ---- Tableau de suivi : devoirs/TP non faits par classe ---- */
router.get("/suivi/:classId", requireRole("prof","admin"), async (req, res)=>{
  const db = await readDB();
  const classId = req.params.classId;
  const students = db.users.filter(u=>u.role==="eleve" && u.classId===classId);
  const assignments = db.assignments.filter(a=>a.classIds.includes(classId));
  const now = Date.now();

  const rows = students.map(s=>{
    const nonFaits = [];
    assignments.forEach(a=>{
      const g = db.grades.find(gr=>gr.assignmentId===a.id && gr.studentId===s.id);
      const hasNote = g && g.note !== null && g.note !== undefined;
      const overdue = a.dueDate && a.dueDate < now;
      if(!hasNote && overdue){
        nonFaits.push({ id:a.id, title:a.title, type:a.type, dueDate:a.dueDate });
      }
    });
    return { studentId:s.id, nom:s.nom, prenom:s.prenom, nonFaits };
  });
  res.json({ classId, assignments, rows });
});

module.exports = router;
