# 100bon

App perso pour gérer ma collection de parfums et choisir celui du jour selon la région (Dubaï / France), le mois, la météo réelle, le moment de la journée et le mood.

- **Aujourd'hui** : sélection automatique (scores mensuels × moment × occasion × météo Open-Meteo), layerings du moment, et un champ « mood » en texte libre analysé par Claude sur ta collection.
- **Collection** : grille filtrable (famille, saison, jour/soir, recherche par note/accord), fiche complète (pyramide, calendrier 12 mois pour les deux régions, application, perception, huile, similarités, layerings), édition, suppression, photo.
- **Layerings** : les combos filtrables par statut / mois / parfum, changement de statut en un clic.
- **Ajouter** : recherche web → fiche construite par Claude au format de la base (mois idéaux, occasions, perception, huile, similarités, layerings à tester) → choix de la photo officielle → vérification et enregistrement.

Stack : Next.js 16 (App Router) · Tailwind 4 · Supabase (Postgres, Auth, Storage) · API Claude · Vercel. PWA installable.

---

## Mise en route

### 1. Supabase

1. Crée un projet sur [supabase.com](https://supabase.com).
2. **SQL Editor** → colle et exécute `supabase/schema.sql` (tables, sécurité RLS, bucket `bottles` pour les photos).
3. **Authentication → URL Configuration**
   - *Site URL* : l'URL Vercel (ex. `https://100bon.vercel.app`)
   - *Redirect URLs* : `https://100bon.vercel.app/auth/confirm` et `http://localhost:3000/auth/confirm`
4. **Authentication → Emails → Magic Link** : ajoute le code dans le template pour pouvoir te connecter depuis l'app installée sur l'iPhone (le lien s'ouvre dans Safari, pas dans la PWA) :
   ```html
   <p>Ton code : <strong>{{ .Token }}</strong></p>
   <p><a href="{{ .ConfirmationURL }}">Ou clique ici pour te connecter</a></p>
   ```
5. Après ta première connexion : **Authentication → Sign In / Providers** → désactive *Allow new users to sign up*.

### 2. Variables d'environnement

Copie `.env.example` en `.env.local` et remplis :

| Variable | Où la trouver |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Idem (clé *service_role*) — **uniquement en local** pour le seed |
| `ALLOWED_EMAIL` | Ton email (seul autorisé à se connecter) |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) → API Keys |

### 3. Importer la base et les photos

```bash
npm install
npm run seed            # data/olfactotheque_db.json + photos listées dans seed/images.json
npm run seed -- --images  # relancer seulement les photos manquantes
npm run seed -- --force   # réécraser les données par le JSON
```

Les photos viennent de Fragrantica (URLs dans `seed/images.json`). Si l'une ne se télécharge pas, le visuel généré s'affiche : remplace-la depuis la fiche → *Ajouter une photo* (recherche des photos officielles, URL, ou fichier depuis le téléphone).

### 4. Déployer sur Vercel

1. Importe le repo sur [vercel.com/new](https://vercel.com/new).
2. Ajoute `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ALLOWED_EMAIL`, `ANTHROPIC_API_KEY` (pas la clé service_role).
3. Déploie. L'ajout de parfum peut prendre 1 à 3 minutes (recherche web) : les routes IA déclarent `maxDuration` jusqu'à 300 s, ce qui est couvert par Vercel (Fluid Compute).

### 5. Installer sur l'iPhone

Safari → l'URL de l'app → Partager → *Sur l'écran d'accueil*. Connexion avec le code reçu par email.

---

## Développement

```bash
npm run dev         # http://localhost:3000
npm run typecheck
npm run lint
```

**Mode démo** (sans Supabase, lecture seule, dev uniquement) : `DEMO_MODE=1` dans `.env.local` → l'app lit `data/olfactotheque_db.json` directement. Les actions d'écriture et l'IA nécessitent la vraie configuration.

### Organisation

```
data/olfactotheque_db.json   base d'origine (seed)
seed/images.json             URLs des photos de flacons
supabase/schema.sql          schéma Postgres + RLS + storage
scripts/seed.ts              import JSON → Supabase
src/lib/types.ts             types de la base (source de vérité)
src/lib/schemas.ts           validation zod (API + sorties IA)
src/lib/recommend.ts         moteur de suggestion déterministe + dérivés (best_months, seasons, wear des layerings)
src/lib/ai/                  suggestion par mood, recherche / enrichissement / photos (Claude + recherche web)
src/app/(app)/               pages : Aujourd'hui, Collection, Fiche, Modifier, Ajouter, Layerings
src/app/api/                 routes : suggest, import, images, perfumes, layerings
```

Les objets (parfum, huile, layering) sont stockés tels quels en `jsonb` : le format reste celui de `olfactotheque_db.json`. `best_months` et `seasons` sont recalculés à chaque enregistrement à partir des scores mensuels (score 3 = meilleur mois ; saison = au moins un mois ≥ 2), et le calendrier d'un layering = minimum de ses composants.

### IA

- Modèle : `claude-opus-5` (réflexion adaptative), avec bascule automatique côté serveur si une requête est refusée.
- Suggestion : la collection portable du mois + règles perso + météo + mood → 1 à 3 choix avec dosage, huile et conseil.
- Import : recherche web (`web_search` / `web_fetch`) puis fiche complète validée par zod ; rien n'est enregistré sans validation dans le formulaire.
