const { MongoClient } = require("mongodb");

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "electrotechnique";

let client = null;
let collection = null;

function defaultData(){
  return {
    _id: "main",
    users: [],
    classes: [],
    assignments: [],
    grades: [],
    posts: [],
    polls: [],
    documents: [],
    maintenance: { active:false, scheduledStart:null, scheduledEnd:null, message:"" }
  };
}

async function connect(){
  if(collection) return collection;
  if(!MONGODB_URI){
    throw new Error(
      "MONGODB_URI manquant. Ajoutez la variable d'environnement MONGODB_URI " +
      "(chaîne de connexion MongoDB Atlas) dans les paramètres Render."
    );
  }
  client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  collection = db.collection("app_state");

  // S'assure qu'un document initial existe
  const existing = await collection.findOne({ _id: "main" });
  if(!existing){
    await collection.insertOne(defaultData());
  }
  console.log("Connecté à MongoDB (" + DB_NAME + ")");
  return collection;
}

async function readDB(){
  const col = await connect();
  const doc = await col.findOne({ _id: "main" });
  if(!doc) return defaultData();
  // Complète les champs manquants si la base a été créée avant leur ajout
  const merged = { ...defaultData(), ...doc };
  return merged;
}

async function writeDB(data){
  const col = await connect();
  const toSave = { ...data, _id: "main" };
  await col.replaceOne({ _id: "main" }, toSave, { upsert: true });
}

module.exports = { readDB, writeDB, connect };
