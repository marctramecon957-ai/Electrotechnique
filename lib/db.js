const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "..", "data", "db.json");

function defaultData(){
  return {
    users: [],       // {id,email,nom,prenom,role:'eleve'|'prof'|'admin',classId,passwordHash,mustChangePassword,firstLoginDone}
    classes: [],      // {id,name,option}
    assignments: [],  // {id,title,description,type:'devoir'|'tp',classIds:[],dueDate,coefficient,maxNote,documentPath,documentName,createdBy,createdAt}
    grades: []        // {id,assignmentId,studentId,note,gradedAt}
  };
}

function ensureFile(){
  if(!fs.existsSync(DB_PATH)){
    fs.mkdirSync(path.dirname(DB_PATH), {recursive:true});
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultData(), null, 2));
  }
}

function readDB(){
  ensureFile();
  const raw = fs.readFileSync(DB_PATH, "utf-8");
  try{ return JSON.parse(raw); }
  catch(e){ return defaultData(); }
}

function writeDB(data){
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

module.exports = { readDB, writeDB };
