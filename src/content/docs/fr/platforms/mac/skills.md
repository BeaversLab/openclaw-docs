---
summary: "Interface utilisateur des paramètres macOS Skills et état basé sur la passerelle"
read_when:
  - Updating the macOS Skills settings UI
  - Changing skills gating or install behavior
title: "Skills (macOS)"
---

# Skills (macOS)

L'application macOS expose les skills OpenClaw via la passerelle ; elle ne les analyse pas localement.

## Source de données

- `skills.status` (passerelle) renvoie toutes les skills ainsi que l'éligibilité et les prérequis manquants
  (y compris les blocs de liste autorisée pour les skills groupées).
- Les prérequis sont dérivés de `metadata.openclaw.requires` dans chaque `SKILL.md`.

## Actions d'installation

- `metadata.openclaw.install` définit les options d'installation (brew/node/go/uv).
- L'application appelle `skills.install` pour exécuter les programmes d'installation sur l'hôte de la passerelle.
- Bloque `critical` les résultats de code dangereux `skills.install` par défaut ; les résultats suspects n'émettent toujours qu'un avertissement. La substitution dangereuse existe sur la demande de passerelle, mais le flux par défaut de l'application reste fermé par l'échec.
- Si chaque option d'installation est `download`, la passerelle présente toutes les options de téléchargement.
- Sinon, la passerelle choisit un installateur préféré en utilisant les préférences d'installation actuelles et les binaires de l'hôte : Homebrew en premier lorsque `skills.install.preferBrew` est activé et que `brew` existe, puis `uv`, puis le gestionnaire de nœuds configuré à partir de `skills.install.nodeManager`, puis plus tard des solutions de repli comme `go` ou `download`.
- Les étiquettes d'installation de nœud reflètent le gestionnaire de nœuds configuré, y compris `yarn`.

## Env/API keys

- L'application stocke les clés dans `~/.openclaw/openclaw.json` sous `skills.entries.<skillKey>`.
- `skills.update` modifie `enabled`, `apiKey` et `env`.

## Mode distant

- Les mises à jour d'installation et de configuration ont lieu sur l'hôte de la passerelle (et non sur le Mac local).
