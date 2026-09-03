# Site Électrotechnique — Lycées Albert Londres

Site statique (HTML / CSS / JS, aucune dépendance) pour la filière électrotechnique.

## Fonctionnalités
- **Accueil** avec bannière (photo fournie) et accès rapides.
- **ENT / Pronote** : lien direct vers `https://www.ent.auvergnerhonealpes.fr`.
- **Normes** : fiches NFC 15-100 et EN 60204-1.
- **Pense-bête** personnel (stocké dans le navigateur de chacun, `localStorage`).
- **Sondages** publics (un vote par appareil).
- **Publications** (postes, nouvelles normes, infos) créées depuis l'admin.
- **Espace admin** protégé :
  - Le premier arrivant crée le compte **propriétaire** (e-mail + mot de passe).
  - Le propriétaire ajoute ensuite des **e-mails autorisés** (onglet « Accès ») qui peuvent se connecter sans mot de passe.
  - Création de sondages, de publications, suppression, etc.
- **Thème** clair / sombre / système, mémorisé par appareil.

## ⚠️ À savoir — sécurité
Ce site est **100 % statique** : il n'y a pas de serveur ni de base de données.
Tout (notes, sondages, publications, comptes admin) est stocké dans le
`localStorage` du navigateur de **chaque visiteur** — les données ne sont
donc **pas partagées entre les visiteurs** et disparaissent si quelqu'un vide
son navigateur. C'est suffisant pour une démo ou un usage en classe sur un
poste commun, mais **pas pour un vrai site multi-utilisateur avec des
données partagées en temps réel**.

Pour aller plus loin (données partagées pour de vrai, mot de passe
réellement sécurisé), il faudra ajouter un petit backend (par ex. Node.js +
base de données) — je peux vous aider à le faire dans un second temps si besoin.

## Structure du projet
```
├── index.html
├── normes.html
├── pense-bete.html
├── sondages.html
├── publications.html
├── admin.html
├── css/style.css
├── js/main.js
├── js/admin.js
└── img/
    ├── logo.png       (logo Lycées Albert Londres)
    └── banniere.jpg   (photo de la bannière d'accueil)
```

## 1. Mettre le site sur GitHub

1. Créez un dépôt sur [github.com](https://github.com/new), par exemple `electrotechnique-site`.
2. Sur votre ordinateur, dans le dossier du site :
   ```bash
   git init
   git add .
   git commit -m "Site électrotechnique - version initiale"
   git branch -M main
   git remote add origin https://github.com/VOTRE-COMPTE/electrotechnique-site.git
   git push -u origin main
   ```

## 2. Déployer sur Render

1. Allez sur [render.com](https://render.com) et connectez votre compte GitHub.
2. Cliquez sur **New +** → **Static Site**.
3. Sélectionnez le dépôt `electrotechnique-site`.
4. Configuration :
   - **Build Command** : *(laisser vide, aucun build nécessaire)*
   - **Publish directory** : `.` (racine du dépôt)
5. Cliquez sur **Create Static Site**.
6. Render vous donne une URL du type `https://electrotechnique-site.onrender.com`.

Chaque `git push` sur `main` redéploiera automatiquement le site.

## 3. Personnaliser
- Couleurs : variables CSS en haut de `css/style.css` (`--bleu`, `--rouge`, `--jaune`…).
- Textes des normes : directement dans `normes.html`.
- Logo / bannière : remplacez les fichiers dans `img/`.
