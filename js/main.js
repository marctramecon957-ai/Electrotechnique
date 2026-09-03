/* ============================================================
   main.js — commun à toutes les pages
   Thème (clair / sombre / système), toasts, init "base de données"
   locale (localStorage) partagée par tout le site.
   ============================================================ */

const DB_KEYS = {
  theme: "el_theme",
  notes: "el_notes",
  emails: "el_admin_emails",
  session: "el_session",
  posts: "el_posts",
  polls: "el_polls",
};

/* ---------- Thème ---------- */
function applyTheme(mode){
  const root = document.documentElement;
  let effective = mode;
  if(mode === "systeme"){
    effective = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "clair";
  }
  root.setAttribute("data-theme", effective === "sombre" || effective === "dark" ? "dark" : "light");
  document.querySelectorAll(".theme-switch button").forEach(b=>{
    b.classList.toggle("active", b.dataset.mode === mode);
  });
}

function initTheme(){
  const saved = localStorage.getItem(DB_KEYS.theme) || "systeme";
  applyTheme(saved);
  document.querySelectorAll(".theme-switch button").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      localStorage.setItem(DB_KEYS.theme, btn.dataset.mode);
      applyTheme(btn.dataset.mode);
    });
  });
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", ()=>{
    const cur = localStorage.getItem(DB_KEYS.theme) || "systeme";
    if(cur === "systeme") applyTheme("systeme");
  });
}

/* ---------- Toast ---------- */
function toast(msg){
  let el = document.querySelector(".toast");
  if(!el){
    el = document.createElement("div");
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(el._t);
  el._t = setTimeout(()=>el.classList.remove("show"), 2600);
}

/* ---------- Nav active ---------- */
function markActiveNav(){
  const path = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("nav.main-nav a").forEach(a=>{
    if(a.getAttribute("href") === path) a.classList.add("active");
  });
}

/* ---------- Init base : emails admin par défaut ---------- */
function initDefaults(){
  if(!localStorage.getItem(DB_KEYS.emails)){
    localStorage.setItem(DB_KEYS.emails, JSON.stringify([]));
  }
  if(!localStorage.getItem(DB_KEYS.posts)) localStorage.setItem(DB_KEYS.posts, "[]");
  if(!localStorage.getItem(DB_KEYS.polls)) localStorage.setItem(DB_KEYS.polls, "[]");
  if(!localStorage.getItem(DB_KEYS.notes)) localStorage.setItem(DB_KEYS.notes, "[]");
}

function getDB(key){ return JSON.parse(localStorage.getItem(key) || "[]"); }
function setDB(key, val){ localStorage.setItem(key, JSON.stringify(val)); }
function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

document.addEventListener("DOMContentLoaded", ()=>{
  initDefaults();
  initTheme();
  markActiveNav();
});
