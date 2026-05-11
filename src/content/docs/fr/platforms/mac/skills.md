---
summary: "Interface utilisateur des paramètres macOS Skills et état basé sur la passerelle"
read_when:
  - Updating the macOS Skills settings UI
  - Changing skills gating or install behavior
title: "Skills (macOS)"
---

L'application macOS expose les compétences OpenClaw via la passerelle ; elle n'analyse pas les compétences localement.

## Source de données

- `skills.status` (passerelle) renvoie toutes les compétences ainsi que l'éligibilité et les prérequis manquants
  (y compris les blocs de liste d'autorisation pour les compétences groupées).
- Les prérequis sont dérivés de `metadata.openclaw.requires` dans chaque `SKILL.md`.

## Actions d'installation

- `metadata.openclaw.install` définit les options d'installation (brew/node/go/uv).
- L'application appelle `skills.install` pour exécuter les installateurs sur l'hôte de la passerelle.
- Les résultats `critical` de code dangereux intégrés bloquent `skills.install` par défaut ; les résultats suspects n'avertissent que. La substitution dangereuse existe sur la requête de passerelle, mais le flux de l'application par défaut reste fermé par défaut (fail-closed).
- Si chaque option d'installation est `download`, la passerelle présente tous les choix de
  téléchargement.
- Sinon, la passerelle choisit un installateur préféré en utilisant les préférences d'installation actuelles et les binaires de l'hôte : Homebrew en premier lorsque
  `skills.install.preferBrew` est activé et que `brew` existe, puis `uv`, puis le
  gestionnaire de nœud configuré à partir de `skills.install.nodeManager`, puis plus tard
  des solutions de repli comme `go` ou `download`.
- Les étiquettes d'installation Node reflètent le gestionnaire de nœud configuré, y compris `yarn`.

## Clés Env/API

- L'application stocke les clés dans `~/.openclaw/openclaw.json` sous `skills.entries.<skillKey>`.
- `skills.update` corrige `enabled`, `apiKey` et `env`.

## Mode distant

- L'installation et les mises à jour de configuration ont lieu sur l'hôte de la passerelle (et non sur le Mac local).

## Connexes

- [Compétences](/fr/tools/skills)
- [Application macOS](/fr/platforms/macos)
