---
summary: "Référence CLI pour `openclaw update` (mise à jour de source plus ou moins sûre + redémarrage automatique de la passerelle)"
read_when:
  - Vous souhaitez mettre à jour une extraction source en toute sécurité
  - Vous devez comprendre le comportement de la sténographie `--update`
title: "update"
---

# `openclaw update`

Mettez à jour OpenClaw en toute sécurité et passez des canaux stable/beta/dev.

Si vous avez installé via **npm/pnpm** (installation globale, pas de métadonnées git), les mises à jour se font via le flux du gestionnaire de packages dans [Mise à jour](/fr/install/updating).

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

- `--no-restart` : ignorer le redémarrage du service Gateway après une mise à jour réussie.
- `--channel <stable|beta|dev>` : définir le canal de mise à jour (git + npm ; persisté dans la configuration).
- `--tag <dist-tag|version|spec>` : remplacer la cible du package pour cette mise à jour uniquement. Pour les installations de package, `main` correspond à `github:openclaw/openclaw#main`.
- `--dry-run` : prévisualiser les actions de mise à jour planifiées (flux canal/tag/cible/redémarrage) sans écrire la configuration, installer, synchroniser les plugins ou redémarrer.
- `--json` : imprimer le JSON `UpdateRunResult` lisible par machine.
- `--timeout <seconds>` : délai d'attente par étape (par défaut 1200 s).

Remarque : les rétrogradations nécessitent une confirmation car les versions antérieures peuvent casser la configuration.

## `update status`

Afficher le canal de mise à jour actif + la balise/branche/SHA git (pour les extractions source), ainsi que la disponibilité des mises à jour.

```bash
openclaw update status
openclaw update status --json
openclaw update status --timeout 10
```

Options :

- `--json` : imprimer le JSON d'état lisible par machine.
- `--timeout <seconds>` : délai d'attente pour les vérifications (par défaut 3 s).

## `update wizard`

Flux interactif pour choisir un canal de mise à jour et confirmer s'il faut redémarrer le Gateway
après la mise à jour (par défaut, redémarrer). Si vous sélectionnez `dev` sans extraction git, il
propose d'en créer une.

## Ce qu'il fait

Lorsque vous changez de canal explicitement (`--channel ...`), OpenClaw maintient également
la méthode d'installation alignée :

- `dev` → garantit une extraction git (par défaut : `~/openclaw`, remplacer avec `OPENCLAW_GIT_DIR`),
  la met à jour et installe le CLI global à partir de cette extraction.
- `stable`/`beta` → installe à partir de npm en utilisant le dist-tag correspondant.

Le moteur de mise à jour automatique du cœur de Gateway (lorsqu'il est activé via la configuration) réutilise ce même chemin de mise à jour.

## Flux de checkout Git

Chaînes :

- `stable` : extraction du dernier tag non-bêta, puis build + doctor.
- `beta` : extraction du dernier tag `-beta`, puis build + doctor.
- `dev` : extraction de `main`, puis fetch + rebase.

Haut niveau :

1. Nécessite un arbre de travail propre (aucune modification non validée).
2. Bascule vers la chaîne sélectionnée (tag ou branche).
3. Récupère en amont (dev uniquement).
4. Dev uniquement : lint de pré-vol + build TypeScript dans un arbre de travail temporaire ; si la pointe échoue, remonte jusqu'à 10 commits pour trouver le dernier build propre.
5. Effectue un rebase sur le commit sélectionné (dev uniquement).
6. Installe les dépendances (pnpm préféré ; npm de repli).
7. Effectue le build + build l'interface de contrôle.
8. Exécute `openclaw doctor` comme vérification finale de « mise à jour sûre ».
9. Synchronise les plugins vers la chaîne active (dev utilise les extensions groupées ; stable/bêta utilise npm) et met à jour les plugins installés via npm.

## Raccourci `--update`

`openclaw --update` se réécrit en `openclaw update` (utile pour les shells et les scripts de lancement).

## Voir aussi

- `openclaw doctor` (propose d'exécuter la mise à jour en premier sur les checkouts git)
- [Chaînes de développement](/fr/install/development-channels)
- [Mise à jour](/fr/install/updating)
- [Référence CLI](/fr/cli)

import en from "/components/footer/en.mdx";

<en />
