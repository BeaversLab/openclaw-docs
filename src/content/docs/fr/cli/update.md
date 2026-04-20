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
les mises à jour se font via le flux du gestionnaire de paquets dans [Mise à jour](/fr/install/updating).

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
- `--json` : affiche le JSON `UpdateRunResult` lisible par une machine.
- `--timeout <seconds>` : délai d'attente par étape (par défaut 1200s).
- `--yes` : ignorer les invites de confirmation (par exemple confirmation de rétrogradation)

Remarque : les régradations nécessitent une confirmation car les versions antérieures peuvent casser la configuration.

## `update status`

Afficher le canal de mise à jour actif + l'étiquette/branche/SHA git (pour les installations source), ainsi que la disponibilité des mises à jour.

```bash
openclaw update status
openclaw update status --json
openclaw update status --timeout 10
```

Options :

- `--json` : afficher le statut JSON lisible par machine.
- `--timeout <seconds>` : délai d'expiration pour les vérifications (par défaut 3s).

## `update wizard`

Flux interactif pour choisir un canal de mise à jour et confirmer s'il faut redémarrer le Gateway
après la mise à jour (par défaut, redémarrage). Si vous sélectionnez `dev` sans un git checkout, il
propose d'en créer un.

Options :

- `--timeout <seconds>` : délai d'expiration pour chaque étape de mise à jour (par défaut `1200`)

## Ce qu'il fait

Lorsque vous changez de canal explicitement (`--channel ...`), OpenClaw maintient également
la méthode d'installation alignée :

- `dev` → assure un git checkout (par défaut : `~/openclaw`, remplacer par `OPENCLAW_GIT_DIR`),
  le met à jour, et installe le CLI global depuis ce checkout.
- `stable` → installe depuis npm en utilisant `latest`.
- `beta` → préfère le dist-tag npm `beta`, mais revient à `latest` si la version beta est
  manquante ou plus ancienne que la version stable actuelle.

Le moteur de mise à jour automatique du Gateway (lorsqu'il est activé via la configuration) réutilise ce même chemin de mise à jour.

## Flux Git checkout

Canaux :

- `stable` : checkout la dernière étiquette non-beta, puis build + doctor.
- `beta` : préfère la dernière étiquette `-beta`, mais revient à la dernière étiquette stable
  quand la version beta est manquante ou plus ancienne.
- `dev` : checkout `main`, puis fetch + rebase.

Vue d'ensemble :

1. Nécessite un worktree propre (pas de modifications non validées).
2. Bascule vers le canal sélectionné (étiquette ou branche).
3. Récupère en amont (dev uniquement).
4. Dev uniquement : lint préliminaire + build TypeScript dans un worktree temporaire ; si la pointe échoue, remonte jusqu'à 10 commits pour trouver le build propre le plus récent.
5. Effectue un rebase sur le commit sélectionné (dev uniquement).
6. Installe les dépendances avec le gestionnaire de paquets du dépôt. Pour les checkouts pnpm, le updater lance `pnpm` à la demande (via `corepack` d'abord, puis un `npm install pnpm@10` temporaire en repli) au lieu de lancer `npm run build` dans un espace de travail pnpm.
7. Build + construit l'interface de contrôle.
8. Exécute `openclaw doctor` comme vérification finale de « mise à jour sécurisée ».
9. Synchronise les plugins avec le channel actif (dev utilise les extensions groupées ; stable/beta utilise npm) et met à jour les plugins installés via npm.

Si le bootstrap pnpm échoue toujours, le updater s'arrête maintenant prématurément avec une erreur spécifique au gestionnaire de paquets au lieu d'essayer `npm run build` dans le checkout.

## Raccourci `--update`

`openclaw --update` est réécrit en `openclaw update` (utile pour les shells et les scripts de lanceur).

## Voir aussi

- `openclaw doctor` (propose de lancer la mise à jour en premier sur les checkouts git)
- [Canaux de développement](/fr/install/development-channels)
- [Mise à jour](/fr/install/updating)
- [Référence de la CLI](/fr/cli)
