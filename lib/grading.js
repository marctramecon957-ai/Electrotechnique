/**
 * Calcule, pour un élève donné, la liste des notes normalisées /20
 * et la moyenne pondérée, en tenant compte des devoirs/TP en retard
 * non notés (comptés comme 0).
 */
function computeStudentAverage(studentId, classId, assignments, grades){
  const relevant = assignments.filter(a=>a.classIds.includes(classId));
  const now = Date.now();
  let sumWeighted = 0, sumCoef = 0;
  const details = [];

  relevant.forEach(a=>{
    const g = grades.find(gr=>gr.assignmentId===a.id && gr.studentId===studentId);
    const overdue = a.dueDate && a.dueDate < now;
    let note = null, status = "en_attente";

    if(g && g.note !== null && g.note !== undefined){
      note = g.note; status = "note";
    } else if(overdue){
      note = 0; status = "non_fait";
    } else {
      status = "a_venir"; // pas encore de date limite dépassée, pas encore noté
    }

    if(note !== null){
      const score20 = (note / a.maxNote) * 20;
      sumWeighted += score20 * a.coefficient;
      sumCoef += a.coefficient;
    }
    details.push({ assignmentId:a.id, title:a.title, status, note, maxNote:a.maxNote, coefficient:a.coefficient, dueDate:a.dueDate });
  });

  const average = sumCoef > 0 ? Math.round((sumWeighted / sumCoef) * 100) / 100 : null;
  return { average, details };
}

module.exports = { computeStudentAverage };
