---
title: "Politique de publication"
summary: "Canaux de publication publique, nommage des versions et cadence"
read_when:
  - Looking for public release channel definitions
  - Looking for version naming and cadence
---

# Politique de publication

OpenClaw dispose de trois canaux de publication publique :

- stable : versions taguées qui sont publiées sur npm `latest`
- beta : balises de prépublication qui sont publiées sur npm `beta`
- dev : la tête mobile de `main`

## Nommage des versions

- Version de publication stable : `YYYY.M.D`
  - Balise Git : `vYYYY.M.D`
- Version de prépublication beta : `YYYY.M.D-beta.N`
  - Balise Git : `vYYYY.M.D-beta.N`
- Ne pas compléter le mois ou le jour avec des zéros
- `latest` désigne la publication stable actuelle sur npm
- `beta` désigne la prépublication actuelle sur npm
- Les versions beta peuvent être publiées avant que l'application macOS ne soit à jour

## Cadence de publication

- Les publications se font d'abord en beta
- La version stable ne suit qu'après validation de la dernière beta
- La procédure détaillée de publication, les approbations, les identifiants et les notes de récupération sont
  réservés aux mainteneurs

## Références publiques

- [`.github/workflows/openclaw-npm-release.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-npm-release.yml)
- [`scripts/openclaw-npm-release-check.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/openclaw-npm-release-check.ts)

Les mainteneurs utilisent la documentation de publication privée dans
[`openclaw/maintainers/release/README.md`](https://github.com/openclaw/maintainers/blob/main/release/README.md)
pour le guide opérationnel.

- [ ] Si les entrées A2UI ont changé, exécutez `pnpm canvas:a2ui:bundle` et validez tout [`src/canvas-host/a2ui/a2ui.bundle.js`](https://github.com/openclaw/openclaw/blob/main/src/canvas-host/a2ui/a2ui.bundle.js) mis à jour.
- [ ] `pnpm run build` (régénère `dist/`).
- [ ] Vérifiez que le paquet npm `files` inclut tous les dossiers `dist/*` requis (notamment `dist/node-host/**` et `dist/acp/**` pour le nœud headless + l'CLI ACP).
- [ ] Confirmez que `dist/build-info.json` existe et inclut le hash `commit` attendu (la bannière CLI l'utilise pour les installations npm).
- [ ] Optionnel : `npm pack --pack-destination /tmp` après le build ; inspectez le contenu de l'archive et gardez-la sous la main pour la publication GitHub (ne **pas** la valider).

3. **Journal des modifications & docs**

- [ ] Mettez à jour `CHANGELOG.md` avec les points forts destinés aux utilisateurs (créez le fichier s'il est manquant) ; gardez les entrées strictement triées par version décroissante.
- [ ] Assurez-vous que les exemples/indicateurs du README correspondent au comportement actuel de la CLI (notamment les nouvelles commandes ou options).

4. **Validation**

- [ ] `pnpm build`
- [ ] `pnpm check`
- [ ] `pnpm test` (ou `pnpm test:coverage` si vous avez besoin de la sortie de couverture)
- [ ] `pnpm release:check` (vérifie le contenu du pack npm)
- [ ] Si `pnpm config:docs:check` échoue lors de la validation de la version et que le changement de surface de configuration est intentionnel, exécutez `pnpm config:docs:gen`, examinez `docs/.generated/config-baseline.json` et `docs/.generated/config-baseline.jsonl`, validez les lignes de base mises à jour, puis relancez `pnpm release:check`.
- [ ] `OPENCLAW_INSTALL_SMOKE_SKIP_NONROOT=1 pnpm test:install:smoke` (test de fumée de l'installation Docker, chemin rapide ; requis avant la publication)
  - Si la publication npm immédiate précédente est connue pour être défectueuse, définissez `OPENCLAW_INSTALL_SMOKE_PREVIOUS=<last-good-version>` ou `OPENCLAW_INSTALL_SMOKE_SKIP_PREVIOUS=1` pour l'étape de préinstallation.
- [ ] (Optionnel) Test complet de l'installateur (ajoute une couverture non-root + CLI) : `pnpm test:install:smoke`
- [ ] (Optionnel) E2E de l'installateur (Docker, exécute `curl -fsSL https://openclaw.ai/install.sh | bash`, effectue l'intégration, puis exécute de vrais appels d'outil) :
  - `pnpm test:install:e2e:openai` (requiert `OPENAI_API_KEY`)
  - `pnpm test:install:e2e:anthropic` (requiert `ANTHROPIC_API_KEY`)
  - `pnpm test:install:e2e` (requiert les deux clés ; exécute les deux fournisseurs)
- [ ] (Optionnel) Vérification ponctuelle de la passerelle Web si vos modifications affectent les chemins d'envoi/réception.

5. **Application macOS (Sparkle)**

- [ ] Générez + signez l'application macOS, puis compressez-la pour la distribution.
- [ ] Générer le flux appcast de Sparkle (notes HTML via [`scripts/make_appcast.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/make_appcast.sh)) et mettre à jour `appcast.xml`.
- [ ] Garder le fichier zip de l'application (et le fichier zip dSYM optionnel) prêt à être attaché à la release GitHub.
- [ ] Suivre les instructions de [release macOS](/fr/platforms/mac/release) pour les commandes exactes et les variables d'environnement requises.
  - `APP_BUILD` doit être numérique et monotone (pas de `-beta`) afin que Sparkle compare correctement les versions.
  - Si vous notarisez, utilisez le profil de trousseau `openclaw-notary` créé à partir des variables d'environnement de l'API App Store Connect (voir [release macOS](/fr/platforms/mac/release)).

6. **Publier (npm)**

- [ ] Confirmer que l'état de git est propre ; commitez et poussez si nécessaire.
- [ ] Confirmer que la publication de confiance npm est configurée pour le paquet `openclaw`.
- [ ] Ne comptez pas sur un secret `NPM_TOKEN` pour ce workflow ; le travail de publication utilise GitHub OIDC trusted publishing.
- [ ] Poussez la balise git correspondante pour déclencher l'exécution de prévisualisation dans `.github/workflows/openclaw-npm-release.yml`.
- [ ] Exécutez `OpenClaw NPM Release` manuellement avec la même balise pour publier après l'approbation de l'environnement `npm-release`.
  - Les balises stables sont publiées sur npm `latest`.
  - Les balises bêta sont publiées sur npm `beta`.
  - Les balises de correction de repli comme `v2026.3.13-1` correspondent à la version npm `2026.3.13`.
  - L'exécution de prévisualisation et l'exécution de publication manuelle rejettent toutes deux les balises qui ne correspondent pas à `package.json`, qui ne sont pas sur `main`, ou dont la date CalVer est éloignée de plus de 2 jours calendaires UTC de la date de publication.
  - Si `openclaw@YYYY.M.D` est déjà publié, un tag de correction de secours est toujours utile pour la publication GitHub et la récupération Docker, mais la publication npm ne publiera pas à nouveau cette version.
- [ ] Vérifiez le registre : `npm view openclaw version`, `npm view openclaw dist-tags` et `npx -y openclaw@X.Y.Z --version` (ou `--help`).

### Dépannage (notes de la version 2.0.0-beta2)

- **npm pack/publish se bloque ou produit une archive tar énorme** : le bundle d'application macOS dans `dist/OpenClaw.app` (et les zips de version) est entraîné dans le paquet. Corrigez en mettant sur liste blanche le contenu de la publication via `package.json` `files` (incluez les sous-répertoires dist, les docs, les compétences ; excluez les bundles d'application). Confirmez avec `npm pack --dry-run` que `dist/OpenClaw.app` n'est pas listé.
- **Boucle web d'auth npm pour les dist-tags** : utilisez l'authentification héritée pour obtenir une invite OTP :
  - `NPM_CONFIG_AUTH_TYPE=legacy npm dist-tag add openclaw@X.Y.Z latest`
- **`npx` la vérification échoue avec `ECOMPROMISED: Lock compromised`** : réessayez avec un cache fraîchement créé :
  - `NPM_CONFIG_CACHE=/tmp/npm-cache-$(date +%s) npx -y openclaw@X.Y.Z --version`
- **Tag a besoin d'une récupération après une correction tardive** : si le tag stable original est lié à une publication GitHub immuable, créez un tag de correction de secours comme `vX.Y.Z-1` au lieu d'essayer de forcer la mise à jour de `vX.Y.Z`.
  - Gardez la version du package npm à `X.Y.Z` ; le suffixe de correction est uniquement pour le tag git et la publication GitHub.
  - Utilisez ceci uniquement en dernier recours. Pour une itération normale, préférez les tags beta, puis créez une publication stable propre.

7. **Publication GitHub + appcast**

- [ ] Taguer et pousser : `git tag vX.Y.Z && git push origin vX.Y.Z` (ou `git push --tags`).
  - Pousser le tag déclenche également le workflow de publication npm.
- [ ] Créer/mettre à jour la release GitHub pour `vX.Y.Z` avec **le titre `openclaw X.Y.Z`** (pas seulement le tag) ; le corps doit inclure la section **complète** des notes de version pour cette version (Points forts + Changements + Corrections), en ligne (pas de liens nus), et **ne doit pas répéter le titre dans le corps**.
- [ ] Joindre les artefacts : l'archive `npm pack` (optionnelle), `OpenClaw-X.Y.Z.zip` et `OpenClaw-X.Y.Z.dSYM.zip` (si générés).
- [ ] Committer le `appcast.xml` mis à jour et le pousser (Sparkle se nourrit de main).
- [ ] Depuis un répertoire temporaire propre (sans `package.json`), lancer `npx -y openclaw@X.Y.Z send --help` pour confirmer que les points d'entrée d'installation/de CLI fonctionnent.
- [ ] Annoncer/partager les notes de version.

## Portée de publication des plugins (npm)

Nous ne publions que les **plugins npm existants** sous la portée `@openclaw/*`. Les plugins
inclus qui ne sont pas sur npm restent **uniquement sur l'arborescence disque** (toujours livrés dans
`extensions/**`).

Processus pour dériver la liste :

1. `npm search @openclaw --json` et capturez les noms des packages.
2. Comparez avec les noms `extensions/*/package.json`.
3. Ne publiez que l'**intersection** (déjà sur npm).

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

Les notes de version doivent également mentionner les **nouveaux plugins inclus optionnels** qui ne sont
**pas activés par défaut** (exemple : `tlon`).

import fr from "/components/footer/fr.mdx";

<fr />
