# CLAUDE.md — Travel Larper

## 1. Le projet en bref

- **Travel Larper** : application web pour préparer, vivre et faire le bilan de ses voyages, seul ou à plusieurs.
- **Accroche** : Avec l'appli, n'importe qui peut « larper » l'organisateur de voyage chevronné.
- **Double objectif** : un outil réellement utilisé pendant le voyage, et un projet portfolio solide.
- **Ambition** : usage personnel d'abord, ouvert à d'autres personnes sur validation d'un admin. Un éventuel aspect commercial ne viendra que très tard.

## 2. Principes directeurs

1. **Usage d'abord, commerce bien plus tard.**
2. **Coûts minimaux** : uniquement des API gratuites ; plus tard, un hébergement à petit prix (~5 €/mois) pour tout centraliser.
3. **Flexibilité maximale** : aucune règle imposée à l'utilisateur, des valeurs par défaut qu'il peut ignorer, et tout champ non essentiel reste optionnel.
4. **Saisie manuelle, aide automatique** : l'utilisateur ajoute ses lieux et ses estimations de prix ; les API servent à placer le pin et à estimer les trajets.
5. **Toutes les fonctionnalités sur toutes les plateformes** : tout doit être faisable sur ordinateur comme sur téléphone.
6. **Avancer petit à petit** : on construit une fonctionnalité à la fois et on n'anticipe pas trop (pas de routes, tables ou code d'exemple définis « au cas où »).

---

## 3. Fonctionnalités (décidées)

### Comptes et accès
- Inscription ouverte (e-mail + mot de passe). Un nouveau compte est **en attente** : il ne peut rien faire tant qu'un admin ne l'a pas validé et voit un message l'invitant à patienter ou à contacter l'admin.
- **Comptes admin et utilisateur séparés** : un compte = un seul rôle. Un compte utilisateur utilise l'appli ; un compte admin n'accède qu'au panneau d'administration. Une même personne peut avoir un compte de chaque. Les comptes admin sont créés à la main, jamais via l'inscription.
- Double authentification **obligatoire** pour les admins dès le départ, avec des sessions plus courtes. Elle sera optionnelle plus tard pour les utilisateurs.
- « Connexion avec Google » : idée pour un avenir lointain.

### Panneau d'administration
- **Comptes** : valider, refuser, suspendre, changer le rôle, ajuster les quotas.
- **Consommation des API externes** : pour chaque service, requêtes vs quota (jauge), évolution (courbe), part servie par le cache, erreurs. Les services comptent en requêtes, pas en tokens.
- **Consommation par utilisateur** : tableau avec les requêtes du jour, des 7 et 30 derniers jours et le total, l'espace photo et les quotas. Il est triable, avec une mini-courbe et le détail par service.
- **Alertes** : pic inhabituel sur la dernière heure, quota à 80 %.
- **Blocage temporaire automatique et progressif** des comptes à l'activité douteuse : ralentissement, puis 15 min, 1 h, 24 h. L'utilisateur voit un message avec l'heure de fin ; l'admin reçoit une alerte et peut lever, prolonger ou suspendre. Les seuils sont réglables, avec un historique par compte. Les comptes utilisateur des admins suivent les mêmes règles et se débloquent depuis le compte admin.
- **Journal des actions admin** (qui, quoi, quand).
- Alternative « pro » notée pour plus tard : Prometheus + Grafana.

### Voyages solo et partagés
- Un voyage = destination (pays ou ville), dates optionnelles, membres, sélection de lieux, itinéraire, dépenses.
- Solo (un membre) ou partagé : on invite d'autres comptes, et tous les membres voient et modifient lieux, itinéraire, estimations et dépenses.
- **Bibliothèque** : tous les lieux d'un utilisateur, tous voyages confondus. Hors voyage, la carte affiche la bibliothèque. Dans un voyage, elle n'affiche que les lieux du voyage, avec un bouton « afficher aussi ma bibliothèque ».
- Un lieu peut appartenir à plusieurs voyages. Dans un voyage partagé, on ne voit pas le reste de la bibliothèque des autres membres.
- Filtre « voyages solo / partagés ».

### Globe 3D et cartes
- Globe 3D : au survol, le pays se soulève et ses bordures passent en blanc ; un clic ouvre le pays. La recherche de pays est une alternative. Version allégée sur téléphone.
- Au clic : zoom, puis carte 2D détaillée où vivent les lieux.

### Fiche pays
- Automatique : drapeau, monnaie, langue, résumé Wikivoyage.
- Manuelle : moyens de transport, prix moyens constatés ou estimés, conseils. Il n'y a pas de barème de coûts.

### Lieux
- Ajout **manuel** uniquement, aucun lieu affiché par défaut.
- Trois façons d'ajouter : recherche par nom ou adresse (autocomplétion), lien Google Maps collé, clic sur la carte. Le **pin reste toujours déplaçable** pour confirmer la position.
- Obligatoire : nom, position, catégorie. Optionnel : priorité (« absolument » / « peut-être »), prix estimé, horaires, notes, lien, photos, statut « visité » + note.
- Horaires : simple information (OSM ou saisie), utilisée seulement pour alerter si un lieu risque d'être fermé.
- Filtres par catégorie et par priorité.
- **Explorer autour** : on coche des catégories et un lien ouvre Google Maps centré sur le lieu avec ces catégories autour (gratuit, sans API). Google Maps combine mal plusieurs catégories : à tester, sinon un lien par catégorie.

### Planner d'activités (à l'échelle d'une ville)
- **Pas de planning à l'heure** (abandonné : il faudrait des durées et des horaires qu'on n'a pas).
- L'utilisateur choisit les lieux et un **nombre d'activités par jour** ; l'algorithme forme des **groupes de lieux géographiquement proches** (un groupe = une journée).
- **Plusieurs propositions** (2 ou 3 regroupements) à chaque requête ; l'utilisateur en choisit une puis la retouche par glisser-déposer.
- Contraintes optionnelles : « absolument » avant « peut-être », épingler un lieu à un jour, garder deux lieux ensemble. Le nombre de jours est choisi ou calculé.
- Ordre conseillé dans la journée : chemin le plus court + règle souple par catégorie (visites en journée, restos aux heures des repas, clubs en fin de soirée).
- Moyens de transport suggérés entre deux activités (pied, transports, vélo, taxi) avec durée et coût. Préférences : modes autorisés, distance de marche maximale par jour.
- Indicateurs par journée : distance, temps de trajet, alerte de fermeture.
- Les formats courts (week-end) sont aussi bien gérés.
- Algorithme envisagé : k-means équilibré (groupes de taille N), plusieurs départs pour proposer des options, ordre par plus proche voisin + 2-opt ; on ne demande les vrais temps de trajet que pour l'ordre final.
- Trajets entre villes (trains, bus, ferries) : plus tard.

### Budget et dépenses
- Estimations de prix saisies par l'utilisateur (repas, trajet, nuit…) au niveau du pays ou du voyage ; un prix précis sur un lieu remplace l'estimation.
- Estimation possible à partir d'un ancien voyage dans le même pays.
- Coût estimé ventilé par jour, par catégorie et par lieu.
- Dépenses réelles : montant, devise, catégorie, jour, payeur, lieu optionnel. Catégories : repas, logement, transport, activités, sorties, courses, autre.
- **Filtres par catégorie et/ou par jour** partout.
- Partage façon **Tricount** (qui doit combien à qui).
- Multi-devises : devise d'origine + taux du jour ; **devise d'affichage configurable** en un clic.
- **Plafond de budget optionnel** par voyage. Avec plafond : « tu dépasses de 20 % sur les repas, il te reste 35 €/jour ». Sans plafond : « à ce rythme, le voyage coûtera 470 € ».

### Bilan financier
- Dépense moyenne par jour et par personne ; écart estimé/réel par catégorie et catégorie qui dérape le plus ; coût moyen par activité ; graphique des dépenses par jour (filtrable) ; comparaison avec les voyages précédents, dans le même pays et entre pays (« en Espagne 30 €/jour en repas, en Italie 45 €/jour »).

### Album photo partagé
- Un album par voyage, alimenté par tous les membres ; une photo peut être rattachée à un jour ou à un lieu.
- Compression dans le navigateur avant envoi (WebP/AVIF, ~2000 px, 300-500 Ko) + miniatures.
- La compression est irréversible : par défaut, seule la version compressée est envoyée (les originaux restent dans Google Photos ou iCloud). Une option « garder l'original », par photo ou par album, compte dans le quota.
- Stockage sur Cloudflare R2 (10 Go gratuits, sans frais de téléchargement). Les métadonnées GPS sont supprimées.

### Langue
- Français par défaut, anglais possible. **Aucun texte affiché en dur** : tout passe par react-i18next.

---

## 4. Stack technique

| Couche | Choix |
| --- | --- |
| Frontend | React + TypeScript + Vite (SPA, installable en PWA) |
| Style | Tailwind CSS + shadcn/ui (Radix) ; icônes Lucide ou Phosphor |
| Traduction | react-i18next |
| Carte 2D | MapLibre GL + tuiles OpenFreeMap |
| Globe | MapLibre seul d'abord (globe natif depuis la v5) ; repli : react-globe.gl |
| Backend | Go, architecture **MVC + couche services** ; chi, sqlc, pgx |
| Base de données | PostgreSQL + PostGIS (`postgis/postgis:17-3.5` via Docker Compose) |
| Contrat d'API | OpenAPI (`api/openapi.yaml`), écrit **avant** le code ; types générés avec oapi-codegen (Go) et openapi-typescript (TS) |
| Auth | Maison : argon2id + sessions côté serveur |
| Hébergement (plus tard) | VPS ~5 €/mois (Hetzner), Docker Compose, reverse proxy à choisir (Caddy, Nginx ou Traefik) ; photos et sauvegardes sur R2 |

SQLite et MongoDB ont été écartés. Le module Go sera `github.com/Minatr/travel-larper/backend`.

### Services externes (tous gratuits, aucune API Google payante)

| Besoin | Source |
| --- | --- |
| Infos pays | REST Countries, Wikivoyage |
| Frontières (globe) | Natural Earth (GeoJSON) |
| Géocodage | Photon ou Nominatim (OpenStreetMap) — Nominatim : 1 requête/s maximum |
| Horaires | OpenStreetMap ou saisie |
| Trajets pied/vélo/voiture | OpenRouteService |
| Transports en commun | Transitous (couverture variable selon les pays) |
| Taux de change | Frankfurter (BCE) |
| Explorer autour | Liens Google Maps (sans API) |
| Photos | Cloudflare R2 |

Pour les pays à alphabet non latin, on privilégie la recherche par nom et le lien Google Maps.

---

## 5. Architecture et arborescence

```
travel-larper/
├── api/openapi.yaml          # contrat d'API (source de vérité)
├── backend/
│   ├── cmd/server/           # point d'entrée (main)
│   ├── internal/
│   │   ├── config/           # lecture des variables d'environnement
│   │   ├── router/           # déclaration des routes (chi)
│   │   ├── middleware/       # auth, limitation de débit, logs, en-têtes de sécurité
│   │   ├── controllers/      # HTTP : lit la requête, appelle un service, renvoie une vue
│   │   ├── services/         # logique métier, ne connaît pas HTTP
│   │   ├── models/           # données + accès base (code sqlc)
│   │   ├── views/            # mise en forme du JSON de réponse
│   │   └── db/               # connexion pgx, transactions
│   ├── queries/              # requêtes SQL pour sqlc
│   └── migrations/           # migrations SQL versionnées
├── frontend/
│   ├── public/
│   └── src/{pages,components,hooks,services,models,i18n}/
└── data/{geo,reference,seeds}/   # GeoJSON (non versionné), données de référence, jeux de test
```

### Règles MVC (strictes)
- Un **contrôleur ne parle jamais directement à la base** : il appelle un service.
- Un **service** contient la logique métier et **ne connaît pas HTTP** (pas de `http.Request`, pas de codes de statut).
- Un **modèle** = données + accès base.
- Une **vue** = mise en forme du JSON. **Rien de privé ne sort d'une vue** (hash de mot de passe, jetons, données d'autres utilisateurs…) : on construit explicitement la réponse, on ne sérialise jamais un modèle tel quel.
- Côté React : `models/` = types, `pages/` et `components/` = vues, `hooks/` = contrôleurs, `services/` = appels à l'API.

### Conventions de données
- **UUID** pour tous les identifiants.
- **Dates en UTC** en base et dans l'API ; conversion en heure locale uniquement à l'affichage.
- **Montants en centimes entiers (`int64`) + code devise ISO 4217. Jamais de float** pour de l'argent (0.1 + 0.2 = 0.30000000000000004, et les erreurs s'accumulent sur les soldes Tricount).
- Les routes et les tables sont définies **dans le ticket qui en a besoin**, jamais à l'avance.
- Tables prévues, créées au fil des tickets : `users`, `sessions`, `trips`, `trip_members`, `places`, `trip_places`, `audit_log`, `api_calls` (agrégée par jour après 30 jours) ; `categories` et `geocode_cache` sont optionnelles (liste dans le code et cache mémoire au début).

---

## 6. Sécurité (non négociable)

- Mots de passe hachés en **argon2id**. Sessions en cookie **httpOnly, Secure, SameSite** (protection CSRF), stockées côté serveur pour pouvoir les couper.
- **Vérifier à chaque requête que l'utilisateur est membre du voyage.** Un voyage auquel on n'appartient pas renvoie **la même erreur qu'un voyage inexistant** (404), pour ne rien révéler.
- Limitation des requêtes par utilisateur et par IP, renforcée sur la connexion, l'inscription et les routes qui appellent des API externes. Quotas par utilisateur, cache serveur, file d'attente pour les services limités.
- **Clés API uniquement côté serveur**, secrets en variables d'environnement. **Jamais de secret dans le code ni dans Git** (`.env` est ignoré ; `.env.example` ne contient que des valeurs factices).
- HTTPS, en-têtes CSP et HSTS. Validation de **toutes** les entrées et des fichiers photo (type réel, taille).
- Requêtes SQL **toujours paramétrées** (sqlc) : jamais de concaténation de chaînes dans du SQL.
- Sauvegardes automatiques (base + photos) avec tests de restauration.
- Analyse des dépendances : Dependabot, govulncheck, npm audit.
- Bonus non prioritaire : chiffrement de quelques champs sensibles. Pas de chiffrement de bout en bout (incompatible avec le partage et le planner).

---

## 7. Règles de code

### Général
- **Code, noms, commentaires, commits et messages de log en anglais.** Textes affichés à l'utilisateur via i18n (français par défaut). Documentation du projet (README, ce fichier, PR) en français.
- Respecter `.editorconfig` : UTF-8, fins de ligne LF, 2 espaces (tabulations pour Go et Makefile), retour à la ligne final.
- Des noms explicites plutôt que des abréviations ; des fonctions courtes qui font une seule chose.
- **Pas de code mort ni de code commenté** : Git garde l'historique.
- **Pas de `TODO` orphelin** : toujours lié à un ticket, par exemple `// TODO(TL-12): handle expired invitations`.
- Pas de nombre ou de chaîne « magique » : les extraire en constantes nommées.
- Ne pas ajouter de dépendance sans raison : la justifier dans la PR.

### Commentaires
- **Tout ce qui est exporté est commenté** : en Go, le commentaire commence par le nom de l'élément (`// TripService manages…`), comme l'impose la règle `exported` de revive ; en TypeScript, JSDoc sur les fonctions, hooks, composants et types exportés.
- Un commentaire explique **le pourquoi**, pas le quoi : le code dit déjà ce qu'il fait. Commenter les choix non évidents, les contraintes externes (ex. « Nominatim limite à 1 req/s ») et les compromis.
- Les algorithmes (planner notamment) ont un commentaire d'en-tête qui décrit l'approche et sa complexité.

### Go
- Formatage `gofmt`/`goimports`, lint `golangci-lint` (avec revive).
- **Erreurs** : toujours traitées, jamais ignorées avec `_`. Les envelopper avec du contexte : `fmt.Errorf("create trip: %w", err)`. Erreurs métier définies comme variables (`ErrTripNotFound`) et comparées avec `errors.Is`. Pas de `panic` en dehors du démarrage.
- `context.Context` en premier paramètre de toute fonction qui fait de l'I/O, propagé jusqu'à la base.
- Les services reçoivent leurs dépendances par le constructeur (injection), pour pouvoir les tester. Pas de variable globale mutable.
- Les erreurs internes ne sont jamais renvoyées telles quelles au client : on les journalise et on renvoie un message générique.

### TypeScript / React
- TypeScript en mode **strict**, **pas de `any`** (utiliser `unknown` puis affiner).
- Lint ESLint (+ eslint-plugin-jsdoc), formatage Prettier.
- Composants fonctionnels et hooks uniquement. La logique (appels API, état) vit dans des hooks, pas dans les composants d'affichage.
- Les types de l'API viennent du code généré depuis `openapi.yaml` : on ne les réécrit pas à la main.
- Mobile d'abord : chaque écran est vérifié sur une largeur de téléphone.

### Tests
- Chaque fonctionnalité arrive avec ses tests : **le cas nominal et les accès refusés** (non connecté, compte en attente, non-membre du voyage, mauvais rôle).
- En Go, tests en tableau (table-driven) quand il y a plusieurs cas.
- La logique métier (services, planner, calculs Tricount et budget) est testée en priorité.

### Qualité automatisée (à mettre en place dans le ticket « qualité et pipeline »)
golangci-lint, ESLint, Prettier, eslint-plugin-jsdoc, Lefthook avant chaque commit, et une pipeline GitHub Actions (lint, tests, build, vérification que le code généré est à jour).

---

## 8. Direction artistique

Simple et minimaliste, inspirée de l'écosystème Apple : police système (SF Pro / Inter), gris neutres + une seule couleur d'accent, beaucoup d'espace, coins arrondis, ombres légères, panneaux translucides floutés sur la carte, modes clair et sombre automatiques, animations courtes. Composants Radix/shadcn + Tailwind.

---

## 9. Organisation et Git

- **Dépôt** : `github.com/Minatr/travel-larper`. Branche `main` protégée par le ruleset `protect-main` : PR obligatoire, 1 approbation, approbations annulées après un nouveau commit, conversations résolues, pas de force-push ni de suppression, aucune exception.
- **Tickets** : Jira (clé **TL**), relié à GitHub par l'app « GitHub for Jira » (à mettre en place).
- **Ticket `TL-0`** : tant que Jira n'est pas configuré, tout le travail de mise en place de base utilise le numéro `TL-0` (ex. branche et PR `chore/TL-0_github-rules`). Les vrais numéros commencent avec Jira.
- **Branches et titres de PR : même format** `<type>/TL-<numéro>_<description-courte>`, en minuscules avec des tirets, par exemple `feat/TL-12_connexion-utilisateur`. Types autorisés (les mêmes que pour les commits) : `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`. Le titre de la PR reprend en général le nom de la branche ; le type et le numéro de ticket doivent être identiques.
- **Vérifications** : le job `check-title` vérifie le titre, le job `check-branch` vérifie la branche et sa cohérence avec le titre. Un nom de branche ne se renomme pas sur une PR ouverte : en cas d'erreur, recréer la branche et ouvrir une nouvelle PR (le titre, lui, se corrige directement sur GitHub).
- **Commits** : Conventional Commits, en anglais (`feat: add trip invitation`, `fix: …`, `chore: …`, `docs: …`, `test: …`, `refactor: …`, `ci: …`).
- **Fusion** : squash merge uniquement, titre de la PR comme message, branche supprimée automatiquement.
- **Assignation automatique** : à l'ouverture d'une PR, le job `assign-author` assigne son auteur, et `.github/CODEOWNERS` (`@Minatr`, `@gonpass08`) demande la revue à l'autre développeur (GitHub n'ajoute jamais l'auteur comme reviewer). Le ruleset exige l'approbation d'un code owner.
- **Workflow** : `.github/workflows/pull-request.yml` regroupe `check-title`, `check-branch` (vérifications obligatoires du ruleset) et `assign-author`.
- **Une PR = un ticket = une fonctionnalité complète** (backend + frontend). Chaque ticket commence par ajouter ses routes à `api/openapi.yaml`.
- Avant d'ouvrir une PR : `make generate`, `make lint`, `make test`, `make dev` qui démarre sans étape manuelle (voir `.github/pull_request_template.md`).

### Commandes
`make help` liste tout. Aujourd'hui seules les commandes de base fonctionnent : `make dev`, `db-up`, `db-down`, `db-logs`, `db-psql`, `db-reset`. `test`, `lint`, `generate`, `migrate`, `backend` et `frontend` affichent « pas encore configuré ».

---

## 10. Comment travailler avec Claude sur ce projet

- **Répondre en français**, de façon concise, en **justifiant les choix** et en expliquant les termes techniques (« à quoi ça sert ? »).
- **Corriger franchement** les idées et proposer des améliorations, puis laisser l'équipe trancher. Ne pas prendre de décision d'architecture à sa place.
- **Une courte spec avant chaque fonctionnalité** (routes, tables, cas d'erreur), validée avant d'écrire le code.
- Avancer **petit à petit** : ne faire que ce que le ticket demande, sans sur-anticiper (pas de routes, de tables, de dépendances ou de code d'exemple « pour plus tard »).
- **Ne jamais modifier la configuration Git globale, les clés SSH ni les comptes** : les développeurs s'en occupent eux-mêmes. Proposer plutôt des réglages au niveau du dépôt.
- Ne jamais committer de secret ; ne jamais pousser directement sur `main`.
- Respecter toutes les règles ci-dessus (MVC, centimes entiers, vérification d'appartenance au voyage, i18n, commentaires) et le signaler quand une demande les contredit.
- Mettre à jour ce fichier quand une décision change.
