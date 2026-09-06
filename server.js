const express = require("express");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const path = require("path");

const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const assignmentRoutes = require("./routes/assignments");
const gradeRoutes = require("./routes/grades");
const contentRoutes = require("./routes/content");
const maintenanceRoutes = require("./routes/maintenance");
const notificationRoutes = require("./routes/notifications");
const { readDB, writeDB, connect } = require("./lib/db");
const { getMaintenanceStatus } = require("./lib/maintenance");

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

/* ---- Mode maintenance : bloque tout le monde sauf l'administrateur ---- */
const MAINTENANCE_ALLOWED_PREFIXES = [
  "/api/auth", "/api/maintenance/status", "/api/classes-publiques",
  "/css/", "/js/", "/img/", "/icons/",
  "/manifest.json", "/service-worker.js",
  "/connexion.html", "/changer-mot-de-passe.html", "/complement-profil.html",
  "/maintenance.html", "/favicon.ico"
];
app.use(async (req, res, next)=>{
  try{
    if(req.session && req.session.role === "admin") return next();
    if(MAINTENANCE_ALLOWED_PREFIXES.some(p=>req.path.startsWith(p))) return next();

    const db = await readDB();
    const status = getMaintenanceStatus(db.maintenance);
    if(status.expired){
      db.maintenance = { active:false, scheduledStart:null, scheduledEnd:null, message:"" };
      await writeDB(db);
    }
    if(!status.isActive) return next();

    if(req.path.startsWith("/api/")){
      return res.status(503).json({ error:"Site en maintenance", maintenance:true, message: status.message, endsAt: status.endsAt });
    }
    return res.sendFile(path.join(__dirname, "public", "maintenance.html"));
  }catch(e){
    next(); // en cas de souci, on n'empêche pas l'accès au site
  }
});

app.use(express.static(path.join(__dirname, "public")));

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/grades", gradeRoutes);
app.use("/api/content", contentRoutes);
app.use("/api/maintenance", maintenanceRoutes);
app.use("/api/notifications", notificationRoutes);

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
