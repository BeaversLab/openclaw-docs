---
title: "Checklist de publication"
summary: "Checklist de publication étape par étape pour npm + application macOS"
read_when:
  - Cutting a new npm release
  - Cutting a new macOS app release
  - Verifying metadata before publishing
---

# Checklist de publication (npm + macOS)

Utilisez `pnpm` depuis la racine du dépôt avec Node 24 par défaut. Node 22 LTS, actuellement `22.16+`, reste pris en charge pour la compatibilité. Gardez l'arbre de travail propre avant le balisage/publication.

## Déclencheur de l'opérateur

Lorsque l'opérateur dit « publier », faites immédiatement cette pré-vérification (pas de questions supplémentaires sauf blocage) :

- Lisez ce document et `docs/platforms/mac/release.md`.
- Chargez les variables d'environnement depuis `~/.profile` et confirmez que `SPARKLE_PRIVATE_KEY_FILE` + les variables App Store Connect sont définies (SPARKLE_PRIVATE_KEY_FILE doit se trouver dans `~/.profile`).
- Utilisez les clés Sparkle de `~/Library/CloudStorage/Dropbox/Backup/Sparkle` si nécessaire.

## Gestion des versions

Les versions actuelles d'OpenClaw utilisent un versionnement basé sur la date.

- Version stable : `YYYY.M.D`
  - Balise Git : `vYYYY.M.D`
  - Exemples de l'historique du dépôt : `v2026.2.26`, `v2026.3.8`
- Version bêta de pré-publication : `YYYY.M.D-beta.N`
  - Balise Git : `vYYYY.M.D-beta.N`
  - Exemples de l'historique du dépôt : `v2026.2.15-beta.1`, `v2026.3.8-beta.1`
- Utilisez la même chaîne de version partout, moins le `v` de tête là où les balises Git ne sont pas utilisées :
  - `package.json` : `2026.3.8`
  - Balise Git : `v2026.3.8`
  - Titre de la publication GitHub : `openclaw 2026.3.8`
- N'ajoutez pas de zéros devant le mois ou le jour. Utilisez `2026.3.8`, et non `2026.03.08`.
- Stable et bêta sont des dist-tags npm, et non des lignes de publication séparées :
  - `latest` = stable
  - `beta` = pré-publication/test
- Dev est la tête mobile de `main`, et non une publication balisée git normale.
- Le workflow de publication applique les formats de balises stables/bêta actuels et rejette les versions dont la date CalVer est à plus de 2 jours calendaires UTC de la date de publication.

Note historique :

- D'anciennes balises telles que `v2026.1.11-1`, `v2026.2.6-3` et `v2.0.0-beta2` existent dans l'historique du dépôt.
- Considérez-les comme des modèles de balises hérités. Les nouvelles publications doivent utiliser `vYYYY.M.D` pour les versions stables et `vYYYY.M.D-beta.N` pour les versions bêta.

1. **Version et métadonnées**

- [ ] Mettre à jour la version `package.json` (par exemple, `2026.1.29`).
- [ ] Exécuter `pnpm plugins:sync` pour aligner les versions des packages d'extension + les journaux des modifications.
- [ ] Mettre à jour les chaînes CLI/version dans [`src/version.ts`](https://github.com/openclaw/openclaw/blob/main/src/version.ts) et l'user agent Baileys dans [`src/web/session.ts`](https://github.com/openclaw/openclaw/blob/main/src/web/session.ts).
- [ ] Confirmer les métadonnées du package (nom, description, dépôt, mots-clés, licence) et que `bin` pointe vers [`openclaw.mjs`](https://github.com/openclaw/openclaw/blob/main/openclaw.mjs) pour `openclaw`.
- [ ] Si les dépendances ont changé, exécuter `pnpm install` afin que `pnpm-lock.yaml` soit à jour.

2. **Build et artefacts**

- [ ] Si les entrées A2UI ont changé, exécuter `pnpm canvas:a2ui:bundle` et valider toute mise à jour [`src/canvas-host/a2ui/a2ui.bundle.js`](https://github.com/openclaw/openclaw/blob/main/src/canvas-host/a2ui/a2ui.bundle.js).
- [ ] `pnpm run build` (régénère `dist/`).
- [ ] Vérifier que le package npm `files` inclut tous les dossiers `dist/*` requis (notamment `dist/node-host/**` et `dist/acp/**` pour le node headless + l'ACP CLI).
- [ ] Confirmer que `dist/build-info.json` existe et inclut le hachage `commit` attendu (la bannière CLI l'utilise pour les installations npm).
- [ ] Optionnel : `npm pack --pack-destination /tmp` après le build ; inspecter le contenu de l'archive et la garder sous la main pour la publication GitHub (ne **pas** la commiter).

3. **Journal des modifications et documentation**

- [ ] Mettez à jour `CHANGELOG.md` avec les points forts destinés aux utilisateurs (créez le fichier s'il manque) ; gardez les entrées strictement décroissantes par version.
- [ ] Assurez-vous que les exemples/indicateurs du README correspondent au comportement actuel de la CLI (notamment les nouvelles commandes ou options).

4. **Validation**

- [ ] `pnpm build`
- [ ] `pnpm check`
- [ ] `pnpm test` (ou `pnpm test:coverage` si vous avez besoin de la sortie de couverture)
- [ ] `pnpm release:check` (vérifie le contenu du pack npm)
- [ ] `OPENCLAW_INSTALL_SMOKE_SKIP_NONROOT=1 pnpm test:install:smoke` (test de fumée de l'installation Docker, chemin rapide ; requis avant la publication)
  - Si la publication npm précédente immédiate est connue pour être défectueuse, définissez `OPENCLAW_INSTALL_SMOKE_PREVIOUS=<last-good-version>` ou `OPENCLAW_INSTALL_SMOKE_SKIP_PREVIOUS=1` pour l'étape de préinstallation.
- [ ] (Optionnel) Test de fumée complet de l'installateur (ajoute une couverture non-root + CLI) : `pnpm test:install:smoke`
- [ ] (Optionnel) Installateur E2E (Docker, exécute `curl -fsSL https://openclaw.ai/install.sh | bash`, embarque, puis exécute de vrais appels d'outil) :
  - `pnpm test:install:e2e:openai` (nécessite `OPENAI_API_KEY`)
  - `pnpm test:install:e2e:anthropic` (nécessite `ANTHROPIC_API_KEY`)
  - `pnpm test:install:e2e` (nécessite les deux clés ; exécute les deux fournisseurs)
- [ ] (Optionnel) Vérification ponctuelle de la passerelle Web si vos modifications affectent les chemins d'envoi/réception.

5. **Application macOS (Sparkle)**

- [ ] Compilez et signez l'application macOS, puis compressez-la pour la distribution.
- [ ] Générez le canal d'application Sparkle (notes HTML via [`scripts/make_appcast.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/make_appcast.sh)) et mettez à jour `appcast.xml`.
- [ ] Gardez le zip de l'application (et le zip dSYM facultatif) prêt à être joint à la publication GitHub.
- [ ] Suivez les instructions de [publication macOS](/fr/platforms/mac/release) pour les commandes exactes et les variables d'environnement requises.
  - `APP_BUILD` doit être numérique et monotone (pas de `-beta`) afin que Sparkle compare correctement les versions.
  - Si vous notarisez, utilisez le profil de trousseau `openclaw-notary` créé à partir des variables d'environnement de l'API App Store Connect API (voir [publication macOS](/fr/platforms/mac/release)).

6. **Publication (npm)**

- [ ] Vérifiez que l'état de git est propre ; validez et poussez les modifications si nécessaire.
- [ ] Vérifiez que la publication de confiance npm est configurée pour le package `openclaw`.
- [ ] Poussez la balise git correspondante pour déclencher `.github/workflows/openclaw-npm-release.yml`.
  - Les balises stables sont publiées sur npm `latest`.
  - Les balises bêta sont publiées sur npm `beta`.
  - Le workflow rejette les balises qui ne correspondent pas à `package.json`, qui ne sont pas sur `main`, ou dont la date CalVer est éloignée de plus de 2 jours calendaires UTC de la date de sortie.
- [ ] Vérifiez le registre : `npm view openclaw version`, `npm view openclaw dist-tags` et `npx -y openclaw@X.Y.Z --version` (ou `--help`).

### Dépannage (notes de la version 2.0.0-beta2)

- **npm pack/publish se bloque ou produit une archive tar volumineuse** : le bundle d'application macOS dans `dist/OpenClaw.app` (et les zips de release) sont inclus dans le package. Corrigez cela en autorisant explicitement les contenus de publication via `package.json` `files` (incluez les sous-répertoires dist, docs, skills ; excluez les bundles d'application). Confirmez avec `npm pack --dry-run` que `dist/OpenClaw.app` n'est pas listé.
- **Boucle Web d'auth npm pour les dist-tags** : utilisez l'authentification héritée pour obtenir une invite OTP :
  - `NPM_CONFIG_AUTH_TYPE=legacy npm dist-tag add openclaw@X.Y.Z latest`
- **La vérification `npx` échoue avec `ECOMPROMISED: Lock compromised`** : réessayez avec un cache vierge :
  - `NPM_CONFIG_CACHE=/tmp/npm-cache-$(date +%s) npx -y openclaw@X.Y.Z --version`
- **La balise doit être redirigée après une correction tardive** : mettez à jour et poussez la balise de force, puis assurez-vous que les assets de release GitHub correspondent toujours :
  - `git tag -f vX.Y.Z && git push -f origin vX.Y.Z`

7. **Release GitHub + appcast**

- [ ] Tag et push : `git tag vX.Y.Z && git push origin vX.Y.Z` (ou `git push --tags`).
  - Le push de la balise déclenche également le workflow de release npm.
- [ ] Créer/mettre à jour la publication GitHub pour `vX.Y.Z` avec le **titre `openclaw X.Y.Z`** (pas seulement le tag) ; le corps doit inclure la section **complète** du journal des modifications pour cette version (Points forts + Modifications + Corrections), en ligne (pas de liens nus), et **ne doit pas répéter le titre dans le corps**.
- [ ] Joindre les artefacts : l'archive `npm pack` (facultatif), `OpenClaw-X.Y.Z.zip`, et `OpenClaw-X.Y.Z.dSYM.zip` (si généré).
- [ ] Valider la mise à jour `appcast.xml` et la pousser (Sparkle se nourrit de main).
- [ ] À partir d'un répertoire temporaire propre (pas de `package.json`), exécuter `npx -y openclaw@X.Y.Z send --help` pour confirmer que les points d'entrée d'installation/de CLI fonctionnent.
- [ ] Annonter/partager les notes de version.

## Portée de publication des plugins (npm)

Nous ne publions que les **plugins npm existants** sous la portée `@openclaw/*`. Les plugins
intégrés qui ne sont pas sur npm restent **uniquement sur le disque** (toujours livrés dans
`extensions/**`).

Processus pour établir la liste :

1. `npm search @openclaw --json` et capturer les noms des packages.
2. Comparer avec les noms `extensions/*/package.json`.
3. Ne publier que l'**intersection** (déjà sur npm).

Liste actuelle des plugins npm (mettre à jour si nécessaire) :

- @openclaw/bluebubbles
- @openclaw/diagnostics-otel
- @openclaw/discord
- @openclaw/feishu
- @openclaw/lobster
- @openclaw/matrix
- @openclaw/msteams
- @openclaw/nextcloud-talk
- @openclaw/nostr
- @openclaw/voice-call
- @openclaw/zalo
- @openclaw/zalouser

Les notes de version doivent également mentionner les **nouveaux plugins intégrés optionnels** qui ne sont **pas
activés par défaut** (exemple : `tlon`).

import fr from '/components/footer/fr.mdx';

<fr />
