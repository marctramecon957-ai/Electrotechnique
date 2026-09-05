const express = require("express");
const router = express.Router();
const { readDB, writeDB } = require("../lib/db");
const { hashPassword, genTempPassword } = require("../lib/auth");
const { requireRole } = require("../middleware/auth");
const { v4: uuid } = require("uuid");

router.use(requireRole("admin"));

/* ---- Classes ---- */
router.get("/classes", (req, res)=>{
  res.json({ classes: readDB().classes });
});

router.post("/classes", (req, res)=>{
  const { name, option } = req.body;
  if(!name) return res.status(400).json({error:"Nom de classe requis."});
  const db = readDB();
  const cls = { id: uuid(), name: name.trim(), option: (option||"").trim() };
  db.classes.push(cls);
  writeDB(db);
  res.json({ class: cls });
});

router.delete("/classes/:id", (req, res)=>{
  const db = readDB();
  db.classes = db.classes.filter(c=>c.id !== req.params.id);
  writeDB(db);
  res.json({ ok:true });
});

/* ---- Utilisateurs (création avec mot de passe provisoire) ---- */
router.get("/users", (req, res)=>{
  const db = readDB();
  const users = db.users.map(u=>({
    id:u.id, email:u.email, nom:u.nom, prenom:u.prenom, role:u.role,
    classId:u.classId, mustChangePassword:u.mustChangePassword,
    tempPassword: u.mustChangePassword ? u.tempPasswordPlain : null
  }));
  res.json({ users });
});

router.post("/users", (req, res)=>{
  const { email, role, classId, nom, prenom, password } = req.body;
  if(!email || !role) return res.status(400).json({error:"E-mail et rôle requis."});
  if(!["eleve","prof"].includes(role)) return res.status(400).json({error:"Rôle invalide."});
  const db = readDB();
  const cleanEmail = email.toLowerCase().trim();
  if(db.users.some(u=>u.email === cleanEmail)) return res.status(400).json({error:"Cet e-mail existe déjà."});

  const tempPass = password && password.length>=4 ? password : genTempPassword();
  const user = {
    id: uuid(), email: cleanEmail, role,
    nom: nom ? nom.trim() : "", prenom: prenom ? prenom.trim() : "",
    classId: role === "eleve" ? (classId || null) : null,
    passwordHash: hashPassword(tempPass),
    tempPasswordPlain: tempPass,
    mustChangePassword: true
  };
  db.users.push(user);
  writeDB(db);
  res.json({ user: { id:user.id, email:user.email, role:user.role, tempPassword: tempPass } });
});

router.delete("/users/:id", (req, res)=>{
  const db = readDB();
  db.users = db.users.filter(u=>u.id !== req.params.id);
  writeDB(db);
  res.json({ ok:true });
});

/* ---- Réinitialiser le mot de passe d'un utilisateur ---- */
router.post("/users/:id/reset-password", (req, res)=>{
  const db = readDB();
  const user = db.users.find(u=>u.id === req.params.id);
  if(!user) return res.status(404).json({error:"Utilisateur introuvable"});
  const tempPass = genTempPassword();
  user.passwordHash = hashPassword(tempPass);
  user.tempPasswordPlain = tempPass;
  user.mustChangePassword = true;
  writeDB(db);
  res.json({ tempPassword: tempPass });
});

module.exports = router;
