---
summary: "Référence CLI pour `openclaw update` (mise à jour plus ou moins sûre des sources + redémarrage automatique de la passerelle)"
read_when:
  - You want to update a source checkout safely
  - You need to understand `--update` shorthand behavior
title: "update"
---

# `openclaw update`

Mettre à jour OpenClaw en toute sécurité et basculer entre les canaux stable/beta/dev.

Si vous avez installé via **npm/pnpm** (installation globale, pas de métadonnées git), les mises à jour se font via le flux du gestionnaire de paquets dans [Mise à jour](/en/install/updating).

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

Remarque : les dégradations nécessitent une confirmation car les versions antérieures peuvent casser la configuration.

## `update status`

Afficher le canal de mise à jour actif + le tag/branche/SHA git (pour les sources extraites), ainsi que la disponibilité des mises à jour.

```bash
openclaw update status
openclaw update status --json
openclaw update status --timeout 10
```

Options :

- `--json` : affiche le JSON de statut lisible par une machine.
- `--timeout <seconds>` : délai d'attente pour les vérifications (par défaut 3s).

## `update wizard`

Flux interactif pour choisir un channel de mise à jour et confirmer s'il faut redémarrer la Gateway
après la mise à jour (par défaut, redémarrage). Si vous sélectionnez `dev` sans un checkout git, il
propose d'en créer un.

## Ce qu'il fait

Lorsque vous changez de channel explicitement (`--channel ...`), OpenClaw maintient également la
méthode d'installation alignée :

- `dev` → assure un checkout git (par défaut : `~/openclaw`, remplacer avec `OPENCLAW_GIT_DIR`),
  le met à jour, et installe le CLI global depuis ce checkout.
- `stable`/`beta` → installe depuis npm en utilisant le dist-tag correspondant.

Le module de mise à jour automatique du cœur du Gateway (lorsqu'il est activé via la configuration) réutilise ce même chemin de mise à jour.

## Flux de checkout Git

Canaux :

- `stable` : checkout le dernier tag non-beta, puis build + doctor.
- `beta` : checkout le dernier tag `-beta`, puis build + doctor.
- `dev` : checkout `main`, puis fetch + rebase.

Vue d'ensemble :

1. Nécessite un arbre de travail propre (aucun changement non validé).
2. Bascule vers le canal sélectionné (balise ou branche).
3. Récupère l'amont (dev uniquement).
4. Dev uniquement : lint préliminaire + build TypeScript dans un arbre de travail temporaire ; si la pointe échoue, remonte jusqu'à 10 commits pour trouver le dernier build propre.
5. Effectue un rebase sur le commit sélectionné (dev uniquement).
6. Installe les dépendances (pnpm préféré ; npm en secours).
7. Effectue le build + build l'interface de contrôle.
8. Exécute `openclaw doctor` comme vérification finale de « mise à jour sécurisée ».
9. Synchronise les plugins vers le canal actif (dev utilise les extensions groupées ; stable/beta utilise npm) et met à jour les plugins installés via npm.

## Raccourci `--update`

`openclaw --update` se réécrit en `openclaw update` (utile pour les shells et les scripts de lancement).

## Voir aussi

- `openclaw doctor` (propose de lancer la mise à jour d'abord sur les checkouts git)
- [Canaux de développement](/en/install/development-channels)
- [Mise à jour](/en/install/updating)
- [Référence CLI](/en/cli)
