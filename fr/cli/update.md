---
summary: "Référence CLI pour `openclaw update` (mise à jour plus ou moins sûre des sources + redémarrage automatique de la passerelle)"
read_when:
  - You want to update a source checkout safely
  - You need to understand `--update` shorthand behavior
title: "update"
---

# `openclaw update`

Mettre à jour OpenClaw en toute sécurité et basculer entre les canaux stable/beta/dev.

Si vous avez installé via **npm/pnpm** (installation globale, pas de métadonnées git), les mises à jour se font via le flux du gestionnaire de packages dans [Updating](/fr/install/updating).

## Utilisation

```bash
openclaw update
openclaw update status
openclaw update wizard
openclaw update --channel beta
openclaw update --channel dev
openclaw update --tag beta
openclaw update --dry-run
openclaw update --no-restart
openclaw update --json
openclaw --update
```

## Options

- `--no-restart` : sauter le redémarrage du service Gateway après une mise à jour réussie.
- `--channel <stable|beta|dev>` : définir le canal de mise à jour (git + npm ; persisté dans la configuration).
- `--tag <dist-tag|version>` : remplacer le dist-tag ou la version npm pour cette mise à jour uniquement.
- `--dry-run` : prévisualiser les actions de mise à jour planifiées (canal/tag/cible/flux de redémarrage) sans écrire la configuration, installer, synchroniser les plugins ou redémarrer.
- `--json` : afficher du JSON `UpdateRunResult` lisible par machine.
- `--timeout <seconds>` : délai d'attente par étape (par défaut 1200 s).

Remarque : les dégradations nécessitent une confirmation car les versions antérieures peuvent casser la configuration.

## `update status`

Afficher le canal de mise à jour actif + le tag/branche/SHA git (pour les sources extraites), ainsi que la disponibilité des mises à jour.

```bash
openclaw update status
openclaw update status --json
openclaw update status --timeout 10
```

Options :

- `--json` : afficher le JSON d'état lisible par machine.
- `--timeout <seconds>` : délai d'attente pour les vérifications (par défaut 3 s).

## `update wizard`

Flux interactif pour choisir un canal de mise à jour et confirmer s'il faut redémarrer la Gateway
après la mise à jour (par défaut, redémarrage). Si vous sélectionnez `dev` sans une extraction git, il
propose d'en créer une.

## Ce qu'il fait

Lorsque vous changez explicitement de canal (`--channel ...`), OpenClaw garde également
la méthode d'installation alignée :

- `dev` → garantit un checkout git (par défaut : `~/openclaw`, remplacé par `OPENCLAW_GIT_DIR`),
  le met à jour et installe le CLI global depuis ce checkout.
- `stable`/`beta` → installe depuis npm en utilisant le dist-tag correspondant.

Le module de mise à jour automatique du cœur du Gateway (lorsqu'il est activé via la configuration) réutilise ce même chemin de mise à jour.

## Flux de checkout Git

Canaux :

- `stable` : checkout de la dernière balise non-beta, puis build + doctor.
- `beta` : checkout de la dernière balise `-beta`, puis build + doctor.
- `dev` : checkout de `main`, puis fetch + rebase.

Vue d'ensemble :

1. Nécessite un arbre de travail propre (aucun changement non validé).
2. Bascule vers le canal sélectionné (balise ou branche).
3. Récupère l'amont (dev uniquement).
4. Dev uniquement : lint préliminaire + build TypeScript dans un arbre de travail temporaire ; si la pointe échoue, remonte jusqu'à 10 commits pour trouver le dernier build propre.
5. Effectue un rebase sur le commit sélectionné (dev uniquement).
6. Installe les dépendances (pnpm préféré ; npm en secours).
7. Effectue le build + build l'interface de contrôle.
8. Exécute `openclaw doctor` comme vérification finale de « mise à jour sûre ».
9. Synchronise les plugins vers le canal actif (dev utilise les extensions groupées ; stable/beta utilise npm) et met à jour les plugins installés via npm.

## Raccourci `--update`

`openclaw --update` se réécrit en `openclaw update` (utile pour les shells et les scripts de lancement).

## Voir aussi

- `openclaw doctor` (propose d'exécuter la mise à jour en premier sur les git checkouts)
- [Canaux de développement](/fr/install/development-channels)
- [Mise à jour](/fr/install/updating)
- [Référence CLI](/fr/cli)

import fr from '/components/footer/fr.mdx';

<fr />
