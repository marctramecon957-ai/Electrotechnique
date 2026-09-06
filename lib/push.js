const webpush = require("web-push");
const { readDB, writeDB } = require("./db");
const { v4: uuid } = require("uuid");

/**
 * Récupère les clés VAPID stockées en base, ou les génère et les
 * sauvegarde si c'est la toute première fois (aucune clé à configurer
 * manuellement, aucune variable d'environnement supplémentaire).
 */
async function getVapidKeys(){
  const db = await readDB();
  if(db.vapidKeys && db.vapidKeys.publicKey && db.vapidKeys.privateKey){
    return db.vapidKeys;
  }
  const keys = webpush.generateVAPIDKeys();
  db.vapidKeys = keys;
  await writeDB(db);
  return keys;
}

async function configureWebPush(){
  const keys = await getVapidKeys();
  webpush.setVapidDetails(
    "mailto:contact@electrotechnique.local",
    keys.publicKey,
    keys.privateKey
  );
  return keys;
}

/**
 * Envoie une notification push à tous les administrateurs abonnés.
 * N'échoue jamais bruyamment : une erreur d'envoi (abonnement expiré,
 * etc.) est simplement ignorée et le job est retiré.
 */
async function notifyAdmins(title, body, url){
  await configureWebPush();
  const db = await readDB();
  const subs = db.pushSubscriptions || [];
  const payload = JSON.stringify({ title, body, url: url || "/espace-admin.html" });

  const stillValid = [];
  for(const sub of subs){
    try{
      await webpush.sendNotification(sub, payload);
      stillValid.push(sub);
    }catch(e){
      // abonnement expiré ou invalide : on ne le garde pas
    }
  }
  if(stillValid.length !== subs.length){
    db.pushSubscriptions = stillValid;
    await writeDB(db);
  }
}

/**
 * Crée une entrée dans l'historique des notifications ET envoie une
 * notification push aux administrateurs abonnés.
 */
async function createAdminNotification(title, body, url){
  const db = await readDB();
  const notif = { id: uuid(), title, body, url: url || "/espace-admin.html", read:false, createdAt: Date.now() };
  db.notifications = db.notifications || [];
  db.notifications.push(notif);
  // Garde un historique raisonnable (200 dernières notifications)
  if(db.notifications.length > 200) db.notifications = db.notifications.slice(-200);
  await writeDB(db);
  await notifyAdmins(title, body, url);
  return notif;
}

module.exports = { getVapidKeys, configureWebPush, notifyAdmins, createAdminNotification };
