/* ============================================================
   app.js — logique commune aux pages authentifiées
   (connexion, changement de mot de passe, profil, redirection par rôle)
   ============================================================ */

const API = "/api";

async function apiGet(url){
  const r = await fetch(API + url, { credentials:"same-origin" });
  return r.json();
}
async function apiPost(url, body){
  const r = await fetch(API + url, {
    method:"POST", credentials:"same-origin",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify(body||{})
  });
  const data = await r.json();
  if(!r.ok) throw new Error(data.error || "Erreur");
  return data;
}
async function apiDelete(url){
  const r = await fetch(API + url, { method:"DELETE", credentials:"same-origin" });
  const data = await r.json();
  if(!r.ok) throw new Error(data.error || "Erreur");
  return data;
}
async function apiUpload(url, formData){
  const r = await fetch(API + url, { method:"POST", credentials:"same-origin", body: formData });
  const data = await r.json();
  if(!r.ok) throw new Error(data.error || "Erreur");
  return data;
}

/* Redirige vers la bonne page selon l'état du compte connecté */
async function routeByAuthState(){
  const { user } = await apiGet("/auth/me");
  const page = location.pathname.split("/").pop();

  if(!user){
    if(page !== "connexion.html") location.href = "connexion.html";
    return null;
  }
  if(user.mustChangePassword){
    if(page !== "changer-mot-de-passe.html") location.href = "changer-mot-de-passe.html";
    return user;
  }
  if(user.role === "eleve" && !user.profileComplete){
    if(page !== "complement-profil.html") location.href = "complement-profil.html";
    return user;
  }
  const target = user.role === "admin" ? "espace-admin.html" : user.role === "prof" ? "espace-prof.html" : "espace-eleve.html";
  if(["connexion.html","changer-mot-de-passe.html","complement-profil.html"].includes(page)){
    location.href = target;
  }
  return user;
}

function fmtDate(ts){
  if(!ts) return "—";
  return new Date(ts).toLocaleDateString('fr-FR', {day:"2-digit",month:"2-digit",year:"numeric"});
}
function escapeHtml(str){
  const d = document.createElement("div");
  d.textContent = str || "";
  return d.innerHTML;
}
