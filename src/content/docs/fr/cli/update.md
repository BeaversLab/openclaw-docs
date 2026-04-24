---
summary: "Référence CLI pour `openclaw update` (mise à jour plus ou moins sûre des sources + redémarrage automatique de la passerelle)"
read_when:
  - You want to update a source checkout safely
  - You need to understand `--update` shorthand behavior
title: "update"
---

# `openclaw update`

Mettre à jour OpenClaw en toute sécurité et basculer entre les canaux stable/beta/dev.

Si vous avez installé via **npm/pnpm/bun** (installation globale, pas de métadonnées git),
les mises à jour se font via le flux du gestionnaire de packages dans [Updating](/fr/install/updating).

## Utilisation

```bash
openclaw update
openclaw update status
openclaw update wizard
openclaw update --channel beta
openclaw update --channel dev
openclaw update --tag beta
openclaw update --tag main
openclaw update --dry-run
openclaw update --no-restart
openclaw update --yes
openclaw update --json
openclaw --update
```

## Options

- `--no-restart` : sauter le redémarrage du service Gateway après une mise à jour réussie.
- `--channel <stable|beta|dev>` : définir le canal de mise à jour (git + npm ; persisté dans la configuration).
- `--tag <dist-tag|version|spec>` : remplace la cible du paquet pour cette mise à jour uniquement. Pour les installations de paquets, `main` correspond à `github:openclaw/openclaw#main`.
- `--dry-run` : prévisualise les actions de mise à jour planifiées (channel/tag/target/restart flow) sans écrire la configuration, installer, synchroniser les plugins ou redémarrer.
- `--json` : affiche le `UpdateRunResult` JSON lisible par machine, y compris
  `postUpdate.plugins.integrityDrifts` lorsqu'une dérive d'artefact de plugin npm
  est détectée lors de la synchronisation des plugins post-mise à jour.
- `--timeout <seconds>` : délai d'attente par étape (par défaut 1200s).
- `--yes` : ignore les invites de confirmation (par exemple confirmation de rétrogradation)

Remarque : les régradations nécessitent une confirmation car les versions antérieures peuvent casser la configuration.

## `update status`

Afficher le canal de mise à jour actif + l'étiquette/branche/SHA git (pour les installations source), ainsi que la disponibilité des mises à jour.

```bash
openclaw update status
openclaw update status --json
openclaw update status --timeout 10
```

Options :

- `--json` : affiche le JSON d'état lisible par machine.
- `--timeout <seconds>` : délai d'attente pour les vérifications (par défaut 3s).

## `update wizard`

Flux interactif pour choisir un channel de mise à jour et confirmer s'il faut redémarrer la Gateway
après la mise à jour (par défaut, redémarrage). Si vous sélectionnez `dev` sans un git checkout, il
propose d'en créer un.

Options :

- `--timeout <seconds>` : délai d'attente pour chaque étape de mise à jour (par défaut `1200`)

## Ce qu'il fait

Lorsque vous changez de channel explicitement (`--channel ...`), OpenClaw maintient également la
méthode d'installation alignée :

- `dev` → assure un git checkout (par défaut : `~/openclaw`, remplacer par `OPENCLAW_GIT_DIR`),
  le met à jour et installe le CLI global depuis ce checkout.
- `stable` → installe depuis npm en utilisant `latest`.
- `beta` → préfère le dist-tag npm `beta`, mais revient à `latest` si la version beta est
  manquante ou plus ancienne que la version stable actuelle.

Le moteur de mise à jour automatique du Gateway (lorsqu'il est activé via la configuration) réutilise ce même chemin de mise à jour.

Pour les installations via gestionnaire de packages, `openclaw update` résout la version du package
cible avant d'invoquer le gestionnaire de packages. Si la version installée correspond
exactement à la cible et qu'aucun changement de channel de mise à jour n'a besoin d'être persisté, la
commande se termine comme étant ignorée avant l'installation du package, la synchro des plugins, l'actualisation de l'auto-complétion,
ou le travail de redémarrage de la passerelle.

## Flux Git checkout

Channels :

- `stable` : checkout le dernier tag non-beta, puis build + doctor.
- `beta` : préférer la dernière balise `-beta`, mais revenir à la dernière balise stable
  lorsque la version bêta est manquante ou plus ancienne.
- `dev` : extraire `main`, puis fetch + rebase.

Vue d'ensemble :

1. Nécessite un arbre de travail propre (pas de modifications non validées).
2. Bascule vers le channel sélectionné (balise ou branche).
3. Récupère en amont (dev uniquement).
4. Dev uniquement : lint + construction TypeScript préliminaires dans un arbre de travail temporaire ; si la pointe échoue, remonte jusqu'à 10 validations pour trouver la plus récente construction propre.
5. Rebase sur la validation sélectionnée (dev uniquement).
6. Installe les dépendances avec le gestionnaire de paquets du dépôt. Pour les extraits pnpm, le programme d'amorçage télécharge `pnpm` à la demande (via `corepack` d'abord, puis un `npm install pnpm@10` temporaire de secours) au lieu d'exécuter `npm run build` dans un espace de travail pnpm.
7. Construit + construit l'interface utilisateur de contrôle.
8. Exécute `openclaw doctor` comme vérification finale de « mise à jour sûre ».
9. Synchronise les plugins vers le channel actif (dev utilise les plugins regroupés ; stable/beta utilise npm) et met à jour les plugins installés via npm.

Si une mise à jour épinglée exacte de plugin npm résout en un artefact dont l'intégrité
diffère de l'enregistrement d'installation stocké, `openclaw update` abandonne cette mise à jour
d'artefact de plugin au lieu de l'installer. Réinstallez ou mettez à jour le plugin
explicitement uniquement après avoir vérifié que vous faites confiance au nouvel artefact.

Si l'amorçage pnpm échoue toujours, le programme de mise à jour s'arrête désormais tôt avec une erreur spécifique au gestionnaire de paquets au lieu d'essayer `npm run build` dans l'extrait.

## Raccourci `--update`

`openclaw --update` se réécrit en `openclaw update` (utile pour les shells et les scripts de lanceur).

## Voir aussi

- `openclaw doctor` (propose d'exécuter d'abord la mise à jour sur les extraits git)
- [Canaux de développement](/fr/install/development-channels)
- [Mise à jour](/fr/install/updating)
- [Référence CLI](/fr/cli)
