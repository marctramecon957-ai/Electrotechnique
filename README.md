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
- **Publications, sondages, documents (normes)** : gérés depuis l'onglet
  correspondant de l'espace admin, stockés eux aussi dans MongoDB (donc
  visibles par tous, contrairement à la toute première version du site
  qui les gardait uniquement dans le navigateur). Le vote aux sondages
  est ouvert à tout visiteur (sans compte), avec un anti-double-vote par
  cookie anonyme.

## ⚠️ Persistance des données : MongoDB Atlas (gratuit)

Render en plan gratuit ne propose pas de disque persistant : sans base de
données externe, toutes les données seraient perdues à chaque redéploiement.
Le site utilise donc **MongoDB Atlas**, une base de données hébergée
gratuitement à vie (aucune carte bancaire requise sur le plan gratuit M0).

### Créer la base (5 minutes, une seule fois)

1. Allez sur [mongodb.com/cloud/atlas/register](https://www.mongodb.com/cloud/atlas/register) et créez un compte gratuit.
2. Créez un **cluster gratuit** (choisissez le plan **M0 Free**).
3. Dans **Database Access** : créez un utilisateur de base de données
   (nom d'utilisateur + mot de passe) — notez-les, ils vont dans l'URL de
   connexion.
4. Dans **Network Access** : ajoutez l'adresse IP `0.0.0.0/0` (autoriser
   depuis n'importe où) — nécessaire car l'IP de Render change.
5. Dans **Database** → votre cluster → **Connect** → **Drivers** :
   copiez la chaîne de connexion, du type :
   ```
   mongodb+srv://UTILISATEUR:MOTDEPASSE@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   Remplacez `UTILISATEUR` et `MOTDEPASSE` par ceux créés à l'étape 3.

### Brancher la base sur Render

1. Sur Render, ouvrez votre **Web Service** → **Environment**.
2. Ajoutez une variable d'environnement :
   - **Key** : `MONGODB_URI`
   - **Value** : la chaîne de connexion copiée ci-dessus
3. Ajoutez aussi (recommandé) :
   - **Key** : `SESSION_SECRET`
   - **Value** : une chaîne aléatoire longue, par exemple générée avec
     `openssl rand -hex 32`
4. Sauvegardez — Render redéploie automatiquement.

C'est tout : à partir de là, comptes, classes, devoirs/TP et notes sont
stockés sur MongoDB Atlas et **survivent** aux redéploiements, aux
redémarrages et à la mise en veille du plan gratuit Render (les
instances gratuites Render se mettent en veille après une période
d'inactivité et redémarrent à la requête suivante — un peu plus lent au
premier chargement, mais sans perte de données).

## Déployer sur Render (Web Service — pas Static Site)

1. Poussez ce dossier sur GitHub (voir plus bas).
2. Sur [render.com](https://render.com) : **New +** → **Web Service**.
3. Sélectionnez votre dépôt.
4. Configuration :
   - **Build Command** : `npm install`
   - **Start Command** : `npm start`
   - **Environment** : Node
5. Configurez les variables d'environnement `MONGODB_URI` et
   `SESSION_SECRET` comme expliqué ci-dessus (section MongoDB Atlas).
6. Créez le service. Render vous donne une URL du type
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
export MONGODB_URI="votre_chaine_de_connexion_atlas"
npm start
```
Le site est alors sur `http://localhost:3000`.
Sans `MONGODB_URI`, le serveur refuse de démarrer (message d'erreur explicite).

## Structure

```
server.js              Point d'entrée Express
lib/db.js              Accès MongoDB Atlas (base de données partagée, persistante)
lib/auth.js             Hachage des mots de passe, génération de mots de passe provisoires
lib/grading.js           Calcul des moyennes (avec 0 automatique si en retard)
middleware/auth.js       Vérification de connexion / rôle
routes/auth.js            Connexion, changement de mot de passe, choix de classe
routes/admin.js            Gestion des classes et des comptes
routes/assignments.js        Devoirs / TP (avec upload de document)
routes/grades.js              Notes, moyennes, tableau de suivi
public/                        Pages HTML/CSS/JS servies au navigateur
uploads/                        Documents joints aux devoirs/TP (créés à l'usage — voir
                                 note ci-dessous sur leur persistance)
```

## À savoir : les documents joints (uploads)

Les fichiers déposés par les profs (PDF de TP, etc.) sont eux enregistrés
directement sur le disque du service Render, **pas** dans MongoDB — donc
eux seront perdus en cas de redéploiement, contrairement au reste des
données. Pour un usage ponctuel/scolaire ça reste généralement acceptable,
mais dites-le-moi si vous voulez que je les stocke aussi de façon durable
(ex. sur MongoDB en base64, ou sur un service de stockage de fichiers
gratuit comme Cloudinary).
