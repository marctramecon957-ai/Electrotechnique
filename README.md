# Site Électrotechnique — Lycées Albert Londres (v2, avec comptes & classes)

⚠️ **Ce site n'est plus statique.** C'est maintenant une vraie application
(Node.js + Express) avec des comptes, des classes, des devoirs/TP et des
notes stockés côté serveur — partagés par tout le monde, contrairement à
la version précédente (localStorage).

## Fonctionnalités

- **Comptes créés par vous** (rôle admin) : vous créez chaque compte élève
  ou professeur avec un **mot de passe provisoire**, affiché une fois à la
  création — à transmettre vous-même. La personne doit le changer à sa
  première connexion.
- **Classes** : vous créez les classes (nom + option pédagogique). À sa
  première connexion, un élève choisit sa classe et indique son nom/prénom.
- **Rôles** : élève / professeur / administrateur (vous). Connexion prof =
  e-mail + mot de passe comme un élève.
- **Devoirs / TP** : un professeur les crée, les attache à une ou plusieurs
  classes (visibles uniquement par ces classes), avec document joint
  optionnel, date limite optionnelle, coefficient et note maximale.
  Passé la date limite, un devoir non noté compte automatiquement **0**
  dans la moyenne (sans qu'il soit nécessaire de le saisir).
- **Notes** : le professeur saisit les notes manuellement, élève par élève.
- **Moyennes** : moyenne pondérée par coefficient pour chaque élève, et
  moyenne de la classe entière.
- **Suivi par classe** : un bouton par classe affiche un tableau des
  élèves avec leurs devoirs/TP non faits (en retard, non notés).

## ⚠️ Point crucial — la persistance des données sur Render

Les données (comptes, classes, devoirs, notes) sont stockées dans un
fichier `data/db.json` sur le serveur. **Sur le plan gratuit de Render,
le système de fichiers est réinitialisé à chaque redéploiement ou
redémarrage du service** — vous perdriez alors tous les comptes et
toutes les notes.

**Pour éviter ça, deux solutions :**

1. **Ajouter un disque persistant Render** (payant, à partir de quelques
   dollars/mois) : Render → votre service → **Disks** → *Add Disk*, monté
   sur `/opt/render/project/src/data`. C'est la solution la plus simple
   avec ce projet tel quel.
2. **Migrer vers une vraie base de données** (ex. Render PostgreSQL,
   qui a un plan gratuit) — plus robuste mais demande d'adapter le code
   (`lib/db.js`). Dites-le-moi si vous voulez que je le fasse.

Tant que vous n'avez pas mis en place l'une des deux solutions, **ne
redéployez pas sans avoir noté/sauvegardé le contenu de `data/db.json`**
si vous avez des comptes/notes importants dedans.

## Déployer sur Render (Web Service, pas Static Site)

1. Poussez ce dossier sur GitHub (voir plus bas).
2. Sur [render.com](https://render.com) : **New +** → **Web Service**.
3. Sélectionnez votre dépôt.
4. Configuration :
   - **Build Command** : `npm install`
   - **Start Command** : `npm start`
   - **Environment** : Node
5. (Recommandé) Ajoutez une variable d'environnement `SESSION_SECRET`
   avec une valeur aléatoire longue (Render → Environment).
6. (Recommandé) Ajoutez un disque persistant comme expliqué ci-dessus.
7. Créez le service. Render vous donne une URL du type
   `https://electrotechnique-site.onrender.com`.

## Premier lancement

1. Ouvrez `/connexion.html` sur votre site : comme aucun compte n'existe
   encore, un formulaire de **configuration initiale** apparaît —
   créez votre compte administrateur.
2. Connectez-vous à `/espace-admin.html` (redirection automatique) :
   - Onglet **Classes** : créez vos classes.
   - Onglet **Comptes** : créez les comptes élèves et professeurs — le
     mot de passe provisoire s'affiche à l'écran, notez-le et transmettez-le.
3. Un élève se connecte avec son e-mail + mot de passe provisoire →
   doit choisir un nouveau mot de passe → doit choisir sa classe et
   entrer son nom/prénom → arrive sur son espace.
4. Un professeur se connecte avec son e-mail + mot de passe provisoire →
   doit changer son mot de passe → arrive directement sur son espace
   (devoirs/TP, notes, moyennes, suivi).

## Développement local

```bash
npm install
npm start
```
Le site est alors sur `http://localhost:3000`.

## Structure

```
server.js              Point d'entrée Express
lib/db.js              Stockage JSON (à remplacer par une vraie BDD si besoin)
lib/auth.js             Hachage des mots de passe, génération de mots de passe provisoires
lib/grading.js           Calcul des moyennes (avec 0 automatique si en retard)
middleware/auth.js       Vérification de connexion / rôle
routes/auth.js            Connexion, changement de mot de passe, choix de classe
routes/admin.js            Gestion des classes et des comptes
routes/assignments.js        Devoirs / TP (avec upload de document)
routes/grades.js              Notes, moyennes, tableau de suivi
public/                        Pages HTML/CSS/JS servies au navigateur
uploads/                        Documents joints aux devoirs/TP (créés à l'usage)
data/db.json                     Base de données (créée automatiquement)
```
