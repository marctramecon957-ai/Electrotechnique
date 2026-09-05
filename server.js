const express = require("express");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const path = require("path");

const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const assignmentRoutes = require("./routes/assignments");
const gradeRoutes = require("./routes/grades");
const contentRoutes = require("./routes/content");
const { readDB, connect } = require("./lib/db");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || "electrotechnique-albert-londres-secret",
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 30 } // 30 jours
}));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "public")));

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/grades", gradeRoutes);
app.use("/api/content", contentRoutes);

// Liste des classes, accessible à tout utilisateur connecté (choix de classe à la 1ère connexion)
app.get("/api/classes-publiques", async (req, res)=>{
  if(!req.session.userId) return res.status(401).json({error:"Non connecté"});
  const db = await readDB();
  res.json({ classes: db.classes.map(c=>({id:c.id, name:c.name, option:c.option})) });
});

// Toute route non-API renvoie index.html (routage géré côté client)
app.get(/^(?!\/api).*/, (req, res)=>{
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

connect()
  .then(()=>{
    app.listen(PORT, ()=>{
      console.log("Serveur démarré sur le port " + PORT);
    });
  })
  .catch(err=>{
    console.error("Impossible de se connecter à MongoDB :", err.message);
    process.exit(1);
  });
