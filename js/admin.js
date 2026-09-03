/* ============================================================
   admin.js — Espace admin (100% côté client, stocké en localStorage)
   ⚠️ Ceci n'est PAS une authentification serveur sécurisée.
   Voir README.md pour brancher un vrai backend si besoin.
   ============================================================ */

const OWNER_KEY = "el_owner"; // {email, passHash}
const SESSION_KEY = DB_KEYS.session;

function simpleHash(str){
  // Hash non cryptographique — suffisant pour une simple protection locale.
  let h = 0;
  for(let i=0;i<str.length;i++){ h = (h<<5) - h + str.charCodeAt(i); h |= 0; }
  return h.toString(36);
}

function getOwner(){ return JSON.parse(localStorage.getItem(OWNER_KEY) || "null"); }
function getSession(){ return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); }
function setSession(email, isOwner){ localStorage.setItem(SESSION_KEY, JSON.stringify({email, isOwner})); }
function clearSession(){ localStorage.removeItem(SESSION_KEY); }

function renderGate(){
  const owner = getOwner();
  const session = getSession();
  document.getElementById("setup-box").classList.add("hidden");
  document.getElementById("login-box").classList.add("hidden");
  document.getElementById("admin-panel").classList.add("hidden");

  if(session){
    document.getElementById("admin-panel").classList.remove("hidden");
    document.getElementById("admin-user-label").textContent =
      (session.isOwner ? "👑 " : "👤 ") + session.email;
    document.getElementById("tab-acces-btn").style.display = session.isOwner ? "" : "none";
    if(!session.isOwner){
      document.querySelectorAll('[data-tab="acces"]').forEach(b=>b.style.display="none");
    }
    renderPollsAdmin();
    renderPostsAdmin();
    renderAccessTable();
    return;
  }
  if(!owner){
    document.getElementById("setup-box").classList.remove("hidden");
  } else {
    document.getElementById("login-box").classList.remove("hidden");
  }
}

/* ---------- Setup propriétaire ---------- */
function initSetup(){
  document.getElementById("setup-btn").addEventListener("click", ()=>{
    const email = document.getElementById("setup-email").value.trim().toLowerCase();
    const pass = document.getElementById("setup-pass").value;
    if(!email || !pass){ toast("Renseignez un e-mail et un mot de passe"); return; }
    localStorage.setItem(OWNER_KEY, JSON.stringify({email, passHash: simpleHash(pass)}));
    setSession(email, true);
    toast("Accès propriétaire créé");
    renderGate();
  });
}

/* ---------- Connexion ---------- */
function initLogin(){
  document.getElementById("login-btn").addEventListener("click", ()=>{
    const email = document.getElementById("login-email").value.trim().toLowerCase();
    const pass = document.getElementById("login-pass").value;
    const owner = getOwner();
    const errEl = document.getElementById("login-error");
    errEl.textContent = "";

    if(owner && email === owner.email){
      if(simpleHash(pass) === owner.passHash){
        setSession(email, true);
        renderGate();
        return;
      }
      errEl.textContent = "Mot de passe incorrect.";
      return;
    }
    const allowed = getDB(DB_KEYS.emails).map(e=>e.toLowerCase());
    if(allowed.includes(email)){
      setSession(email, false);
      renderGate();
      return;
    }
    errEl.textContent = "Cette adresse n'a pas accès à l'espace admin.";
  });
  document.getElementById("logout-btn").addEventListener("click", ()=>{
    clearSession();
    renderGate();
  });
}

/* ---------- Onglets ---------- */
function initTabs(){
  document.querySelectorAll(".admin-tab-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      document.querySelectorAll(".admin-tab-btn").forEach(b=>b.classList.remove("active"));
      document.querySelectorAll(".admin-panel").forEach(p=>p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("panel-" + btn.dataset.tab).classList.add("active");
    });
  });
}

/* ---------- Gestion des accès (propriétaire) ---------- */
function renderAccessTable(){
  const body = document.getElementById("access-table-body");
  const emails = getDB(DB_KEYS.emails);
  if(emails.length === 0){
    body.innerHTML = '<tr><td colspan="3" class="empty-state">Aucun e-mail invité pour le moment.</td></tr>';
    return;
  }
  body.innerHTML = emails.map(e=>`
    <tr>
      <td>${e}</td>
      <td><span class="badge badge-ok">Autorisé</span></td>
      <td><button class="btn btn-ghost btn-sm remove-access" data-email="${e}">Retirer</button></td>
    </tr>
  `).join("");
  body.querySelectorAll(".remove-access").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const emails = getDB(DB_KEYS.emails).filter(e=>e !== btn.dataset.email);
      setDB(DB_KEYS.emails, emails);
      renderAccessTable();
      toast("Accès retiré");
    });
  });
}
function initAccessForm(){
  document.getElementById("add-access-btn").addEventListener("click", ()=>{
    const input = document.getElementById("new-access-email");
    const email = input.value.trim().toLowerCase();
    if(!email || !email.includes("@")){ toast("Adresse e-mail invalide"); return; }
    const emails = getDB(DB_KEYS.emails);
    if(!emails.includes(email)) emails.push(email);
    setDB(DB_KEYS.emails, emails);
    input.value = "";
    renderAccessTable();
    toast("Accès accordé à " + email);
  });
}

/* ---------- Sondages ---------- */
function optionRowHtml(){
  return `<div class="opt-input-row"><input type="text" class="poll-opt-input" placeholder="Libellé de l'option"><button type="button" class="btn btn-ghost btn-sm remove-opt">✕</button></div>`;
}
function initPollForm(){
  const optsWrap = document.getElementById("poll-options");
  optsWrap.insertAdjacentHTML("beforeend", optionRowHtml());
  optsWrap.insertAdjacentHTML("beforeend", optionRowHtml());
  optsWrap.addEventListener("click", e=>{
    if(e.target.classList.contains("remove-opt")){
      e.target.closest(".opt-input-row").remove();
    }
  });
  document.getElementById("add-option-btn").addEventListener("click", ()=>{
    optsWrap.insertAdjacentHTML("beforeend", optionRowHtml());
  });
  document.getElementById("create-poll-btn").addEventListener("click", ()=>{
    const question = document.getElementById("poll-question").value.trim();
    const options = [...document.querySelectorAll(".poll-opt-input")]
      .map(i=>i.value.trim()).filter(Boolean);
    if(!question || options.length < 2){ toast("Question + au moins 2 options requises"); return; }
    const polls = getDB(DB_KEYS.polls);
    polls.push({
      id: uid(),
      question,
      options: options.map(label=>({label, votes:0})),
      date: Date.now()
    });
    setDB(DB_KEYS.polls, polls);
    document.getElementById("poll-question").value = "";
    optsWrap.innerHTML = "";
    optsWrap.insertAdjacentHTML("beforeend", optionRowHtml());
    optsWrap.insertAdjacentHTML("beforeend", optionRowHtml());
    renderPollsAdmin();
    toast("Sondage publié");
  });
}
function renderPollsAdmin(){
  const polls = getDB(DB_KEYS.polls).slice().reverse();
  const wrap = document.getElementById("admin-polls-list");
  if(polls.length === 0){
    wrap.innerHTML = '<p class="empty-state">Aucun sondage publié.</p>';
    return;
  }
  wrap.innerHTML = polls.map(p=>{
    const total = p.options.reduce((s,o)=>s+o.votes,0);
    return `<div class="card" style="margin-bottom:14px;">
      <h3>${p.question}</h3>
      <p style="font-size:.82rem;">${total} vote(s) — ${p.options.map(o=>`${o.label}: ${o.votes}`).join(" · ")}</p>
      <button class="btn btn-rouge btn-sm delete-poll" data-id="${p.id}">Supprimer</button>
    </div>`;
  }).join("");
  wrap.querySelectorAll(".delete-poll").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      setDB(DB_KEYS.polls, getDB(DB_KEYS.polls).filter(p=>p.id !== btn.dataset.id));
      renderPollsAdmin();
      toast("Sondage supprimé");
    });
  });
}

/* ---------- Publications / Postes ---------- */
function initPostForm(){
  document.getElementById("create-post-btn").addEventListener("click", ()=>{
    const title = document.getElementById("post-title").value.trim();
    const content = document.getElementById("post-content").value.trim();
    const category = document.getElementById("post-cat").value;
    if(!title || !content){ toast("Titre et contenu requis"); return; }
    const session = getSession();
    const posts = getDB(DB_KEYS.posts);
    posts.push({id: uid(), title, content, category, author: session ? session.email : "Équipe", date: Date.now()});
    setDB(DB_KEYS.posts, posts);
    document.getElementById("post-title").value = "";
    document.getElementById("post-content").value = "";
    renderPostsAdmin();
    toast("Publication ajoutée");
  });
}
function renderPostsAdmin(){
  const posts = getDB(DB_KEYS.posts).slice().reverse();
  const wrap = document.getElementById("admin-posts-list");
  if(posts.length === 0){
    wrap.innerHTML = '<p class="empty-state">Aucune publication.</p>';
    return;
  }
  wrap.innerHTML = posts.map(p=>`
    <div class="card" style="margin-bottom:14px;">
      <span class="tag">${p.category}</span>
      <h3>${p.title}</h3>
      <p>${p.content}</p>
      <button class="btn btn-rouge btn-sm delete-post" data-id="${p.id}">Supprimer</button>
    </div>
  `).join("");
  wrap.querySelectorAll(".delete-post").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      setDB(DB_KEYS.posts, getDB(DB_KEYS.posts).filter(p=>p.id !== btn.dataset.id));
      renderPostsAdmin();
      toast("Publication supprimée");
    });
  });
}

document.addEventListener("DOMContentLoaded", ()=>{
  initSetup();
  initLogin();
  initTabs();
  initAccessForm();
  initPollForm();
  initPostForm();
  renderGate();
});
