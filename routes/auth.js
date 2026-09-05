const express = require("express");
const router = express.Router();
const { readDB, writeDB } = require("../lib/db");
const { hashPassword, checkPassword } = require("../lib/auth");
const { v4: uuid } = require("uuid");

function publicUser(u){
  return {
    id:u.id, email:u.email, nom:u.nom, prenom:u.prenom, role:u.role,
    classId:u.classId, mustChangePassword:u.mustChangePassword,
    profileComplete: u.role !== "eleve" ? true : !!(u.classId && u.nom && u.prenom)
  };
}

/* ---- État : y a-t-il déjà un admin ? ---- */
router.get("/status", async (req, res)=>{
  const db = await readDB();
  const hasAdmin = db.users.some(u=>u.role==="admin");
  res.json({ hasAdmin });
});

/* ---- Bootstrap : création du 1er compte admin (propriétaire du site) ---- */
router.post("/bootstrap", async (req, res)=>{
  const db = await readDB();
  if(db.users.some(u=>u.role==="admin")){
    return res.status(400).json({error:"Un compte administrateur existe déjà."});
  }
  const { email, password, prenom, nom } = req.body;
  if(!email || !password) return res.status(400).json({error:"E-mail et mot de passe requis."});
  const user = {
    id: uuid(), email: email.toLowerCase().trim(), nom: nom||"Admin", prenom: prenom||"",
    role: "admin", classId: null,
    passwordHash: hashPassword(password), mustChangePassword: false
  };
  db.users.push(user);
  await writeDB(db);
  req.session.userId = user.id; req.session.role = user.role;
  res.json({ user: publicUser(user) });
});

/* ---- Connexion ---- */
router.post("/login", async (req, res)=>{
  const { email, password } = req.body;
  const db = await readDB();
  const user = db.users.find(u=>u.email === (email||"").toLowerCase().trim());
  if(!user || !checkPassword(password||"", user.passwordHash)){
    return res.status(401).json({error:"E-mail ou mot de passe incorrect."});
  }
  req.session.userId = user.id; req.session.role = user.role;
  res.json({ user: publicUser(user) });
});

router.post("/logout", async (req, res)=>{
  req.session.destroy(()=>res.json({ok:true}));
});

router.get("/me", async (req, res)=>{
  if(!req.session.userId) return res.json({ user:null });
  const db = await readDB();
  const user = db.users.find(u=>u.id === req.session.userId);
  if(!user) return res.json({ user:null });
  res.json({ user: publicUser(user) });
});

/* ---- Changement du mot de passe provisoire (obligatoire à la 1ère connexion) ---- */
router.post("/change-password", async (req, res)=>{
  if(!req.session.userId) return res.status(401).json({error:"Non connecté"});
  const { newPassword } = req.body;
  if(!newPassword || newPassword.length < 6) return res.status(400).json({error:"Mot de passe trop court (6 caractères minimum)."});
  const db = await readDB();
  const user = db.users.find(u=>u.id === req.session.userId);
  if(!user) return res.status(404).json({error:"Utilisateur introuvable"});
  user.passwordHash = hashPassword(newPassword);
  user.mustChangePassword = false;
  await writeDB(db);
  res.json({ user: publicUser(user) });
});

/* ---- Compléter le profil élève : classe + nom + prénom (1ère connexion) ---- */
router.post("/complete-profile", async (req, res)=>{
  if(!req.session.userId) return res.status(401).json({error:"Non connecté"});
  const { classId, nom, prenom } = req.body;
  if(!classId || !nom || !prenom) return res.status(400).json({error:"Classe, nom et prénom requis."});
  const db = await readDB();
  const user = db.users.find(u=>u.id === req.session.userId);
  if(!user) return res.status(404).json({error:"Utilisateur introuvable"});
  if(!db.classes.some(c=>c.id===classId)) return res.status(400).json({error:"Classe invalide."});
  user.classId = classId; user.nom = nom.trim(); user.prenom = prenom.trim();
  await writeDB(db);
  res.json({ user: publicUser(user) });
});

module.exports = router;
