/* ============================================================
   app-prof.js — fonctionnalités partagées prof / admin :
   devoirs & TP, saisie des notes, moyennes, tableau de suivi.
   Nécessite que la page ait chargé js/app.js avant.
   ============================================================ */

let PROF_CLASSES = [];

async function loadClassesIntoSelects(){
  const { classes } = await apiGet("/classes-publiques").catch(()=>({classes:[]}));
  PROF_CLASSES = classes;
  return classes;
}

function classCheckboxes(containerId, classes){
  const el = document.getElementById(containerId);
  el.innerHTML = classes.map(c=>`
    <label style="display:inline-flex;align-items:center;gap:6px;margin:0 14px 8px 0;font-size:.86rem;">
      <input type="checkbox" class="class-check" value="${c.id}"> ${escapeHtml(c.name)}${c.option ? " — "+escapeHtml(c.option) : ""}
    </label>`).join("") || '<p class="empty-state">Aucune classe créée. Rendez-vous dans l\'onglet Classes.</p>';
}

/* ---------- Devoirs / TP ---------- */
function initAssignmentForm(){
  document.getElementById("as-create-btn").addEventListener("click", async ()=>{
    const title = document.getElementById("as-title").value.trim();
    const description = document.getElementById("as-desc").value.trim();
    const type = document.getElementById("as-type").value;
    const dueDate = document.getElementById("as-due").value;
    const coefficient = document.getElementById("as-coef").value || 1;
    const maxNote = document.getElementById("as-maxnote").value || 20;
    const checked = [...document.querySelectorAll(".class-check:checked")].map(c=>c.value);
    const fileInput = document.getElementById("as-doc");

    if(!title || checked.length===0){ toast("Titre et au moins une classe requis"); return; }

    const fd = new FormData();
    fd.append("title", title);
    fd.append("description", description);
    fd.append("type", type);
    checked.forEach(id=>fd.append("classIds", id));
    if(dueDate) fd.append("dueDate", dueDate);
    fd.append("coefficient", coefficient);
    fd.append("maxNote", maxNote);
    if(fileInput.files[0]) fd.append("document", fileInput.files[0]);

    try{
      await apiUpload("/assignments", fd);
      toast("Devoir / TP publié");
      document.getElementById("as-title").value = "";
      document.getElementById("as-desc").value = "";
      document.getElementById("as-due").value = "";
      fileInput.value = "";
      document.querySelectorAll(".class-check").forEach(c=>c.checked=false);
      renderAssignmentsAdmin();
    }catch(e){ toast(e.message); }
  });
}

async function renderAssignmentsAdmin(){
  const { assignments } = await apiGet("/assignments");
  const wrap = document.getElementById("as-list");
  if(assignments.length === 0){
    wrap.innerHTML = '<p class="empty-state">Aucun devoir/TP publié.</p>';
    return;
  }
  wrap.innerHTML = assignments.map(a=>{
    const classNames = a.classIds.map(id=>{
      const c = PROF_CLASSES.find(cl=>cl.id===id);
      return c ? c.name : "?";
    }).join(", ");
    return `
    <div class="card" style="margin-bottom:14px;">
      <span class="tag">${a.type==='tp'?'TP':'Devoir'} · ${classNames}</span>
      <h3>${escapeHtml(a.title)}</h3>
      <p>${escapeHtml(a.description)}</p>
      <p style="font-size:.8rem;">Échéance : ${fmtDate(a.dueDate)} · Coef ${a.coefficient} · /${a.maxNote}
      ${a.documentPath ? ' · <a href="'+a.documentPath+'" target="_blank">document joint</a>' : ''}</p>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-bleu btn-sm grade-btn" data-id="${a.id}" data-title="${escapeHtml(a.title)}">Saisir les notes</button>
        <button class="btn btn-rouge btn-sm delete-as" data-id="${a.id}">Supprimer</button>
      </div>
    </div>`;
  }).join("");

  wrap.querySelectorAll(".delete-as").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      await apiDelete("/assignments/" + btn.dataset.id);
      toast("Supprimé");
      renderAssignmentsAdmin();
    });
  });
  wrap.querySelectorAll(".grade-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>openGradeEditor(btn.dataset.id, btn.dataset.title));
  });
}

/* ---------- Saisie des notes pour un devoir/TP donné ---------- */
async function openGradeEditor(assignmentId, title){
  document.querySelectorAll(".admin-tab-btn").forEach(b=>b.classList.remove("active"));
  document.querySelectorAll(".admin-panel").forEach(p=>p.classList.remove("active"));
  document.querySelector('[data-tab="notes"]').classList.add("active");
  document.getElementById("panel-notes").classList.add("active");

  document.getElementById("notes-context-title").textContent = "Notes — " + title;
  const { assignment, rows } = await apiGet("/grades/assignment/" + assignmentId);
  const wrap = document.getElementById("notes-grade-table");
  if(rows.length === 0){
    wrap.innerHTML = '<p class="empty-state">Aucun élève dans les classes concernées.</p>';
    return;
  }
  wrap.innerHTML = `
    <div class="admin-table-wrap">
    <table class="admin-table">
      <thead><tr><th>Élève</th><th>Note (/${assignment.maxNote})</th></tr></thead>
      <tbody>
        ${rows.map(r=>`
          <tr>
            <td>${escapeHtml(r.prenom)} ${escapeHtml(r.nom)}</td>
            <td><input type="number" step="0.5" min="0" max="${assignment.maxNote}" class="note-input" data-student="${r.studentId}" value="${r.note !== null ? r.note : ''}" style="width:90px;padding:6px 8px;border:1px solid var(--line);border-radius:2px;background:var(--bg);color:var(--text);"></td>
          </tr>`).join("")}
      </tbody>
    </table>
    </div>
    <button class="btn btn-jaune btn-sm" id="save-grades-btn" style="margin-top:14px;">Enregistrer les notes</button>
  `;
  document.getElementById("save-grades-btn").addEventListener("click", async ()=>{
    const inputs = wrap.querySelectorAll(".note-input");
    for(const inp of inputs){
      await apiPost("/grades", { assignmentId, studentId: inp.dataset.student, note: inp.value === "" ? null : inp.value });
    }
    toast("Notes enregistrées");
  });
}

/* ---------- Moyennes par classe ---------- */
function initClassAverageButtons(){
  const wrap = document.getElementById("avg-class-buttons");
  wrap.innerHTML = PROF_CLASSES.map(c=>`<button class="btn btn-ghost btn-sm avg-class-btn" data-id="${c.id}" data-name="${escapeHtml(c.name)}">${escapeHtml(c.name)}</button>`).join("");
  wrap.querySelectorAll(".avg-class-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>loadClassAverages(btn.dataset.id, btn.dataset.name));
  });
}
async function loadClassAverages(classId, className){
  const { students, classAverage } = await apiGet("/grades/class/" + classId);
  const wrap = document.getElementById("avg-results");
  wrap.innerHTML = `
    <h3>${escapeHtml(className)} — moyenne de classe : ${classAverage !== null ? classAverage+"/20" : "—"}</h3>
    <div class="admin-table-wrap">
    <table class="admin-table">
      <thead><tr><th>Élève</th><th>Moyenne</th></tr></thead>
      <tbody>
        ${students.map(s=>`<tr><td>${escapeHtml(s.prenom)} ${escapeHtml(s.nom)}</td><td>${s.average !== null ? s.average+"/20" : "—"}</td></tr>`).join("") || '<tr><td colspan="2" class="empty-state">Aucun élève.</td></tr>'}
      </tbody>
    </table>
    </div>`;
}

/* ---------- Tableau de suivi (devoirs/TP non faits) ---------- */
function initSuiviButtons(){
  const wrap = document.getElementById("suivi-class-buttons");
  wrap.innerHTML = PROF_CLASSES.map(c=>`<button class="btn btn-ghost btn-sm suivi-class-btn" data-id="${c.id}" data-name="${escapeHtml(c.name)}">${escapeHtml(c.name)}</button>`).join("");
  wrap.querySelectorAll(".suivi-class-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>loadSuivi(btn.dataset.id, btn.dataset.name));
  });
}
async function loadSuivi(classId, className){
  const { rows } = await apiGet("/grades/suivi/" + classId);
  const wrap = document.getElementById("suivi-results");
  wrap.innerHTML = `
    <h3>${escapeHtml(className)} — devoirs / TP non faits</h3>
    <div class="admin-table-wrap">
    <table class="admin-table">
      <thead><tr><th>Élève</th><th>Non faits (compte 0)</th></tr></thead>
      <tbody>
        ${rows.map(r=>`
          <tr>
            <td>${escapeHtml(r.prenom)} ${escapeHtml(r.nom)}</td>
            <td>${r.nonFaits.length === 0 ? '<span class="badge badge-ok">À jour</span>' : r.nonFaits.map(nf=>`<span class="badge badge-warn" style="margin-right:6px;">${escapeHtml(nf.title)}</span>`).join("")}</td>
          </tr>`).join("") || '<tr><td colspan="2" class="empty-state">Aucun élève.</td></tr>'}
      </tbody>
    </table>
    </div>`;
}

async function initProfFeatures(){
  const classes = await loadClassesIntoSelects();
  classCheckboxes("as-classes", classes);
  initAssignmentForm();
  renderAssignmentsAdmin();
  initClassAverageButtons();
  initSuiviButtons();
}
