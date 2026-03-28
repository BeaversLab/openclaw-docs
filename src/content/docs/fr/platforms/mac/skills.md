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
- La passerelle n'expose qu'un seul programme d'installation préféré lorsque plusieurs sont fournis
  (brew si disponible, sinon le gestionnaire de nœud depuis `skills.install`, npm par défaut).

## Clés Env/API

- L'application stocke les clés dans `~/.openclaw/openclaw.json` sous `skills.entries.<skillKey>`.
- `skills.update` applique des correctifs à `enabled`, `apiKey` et `env`.

## Mode distant

- L'installation et les mises à jour de configuration se produisent sur l'hôte de la passerelle (et non sur le Mac local).
