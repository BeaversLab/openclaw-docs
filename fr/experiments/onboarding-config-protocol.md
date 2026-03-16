---
summary: "Notes du protocole RPC pour l'assistant d'onboarding et le schéma de configuration"
read_when: "Modification des étapes de l'assistant d'onboarding ou des points de terminaison du schéma de configuration"
title: "Protocole d'onboarding et de configuration"
---

# Protocole d'onboarding et de configuration

Objectif : surfaces d'onboarding et de configuration partagées entre le CLI, l'application macOS et l'interface Web.

## Composants

- Moteur d'assistant (session partagée + invites + état d'onboarding).
- L'onboarding CLI utilise le même flux d'assistant que les clients de l'interface utilisateur.
- Le Gateway du RPC expose les points de terminaison de l'assistant et du schéma de configuration.
- L'onboarding macOS utilise le modèle d'étape de l'assistant.
- L'interface Web rend les formulaires de configuration à partir de JSON Schema + indications de l'interface.

## Gateway RPC

- `wizard.start` paramètres : `{ mode?: "local"|"remote", workspace?: string }`
- `wizard.next` paramètres : `{ sessionId, answer?: { stepId, value? } }`
- `wizard.cancel` paramètres : `{ sessionId }`
- `wizard.status` paramètres : `{ sessionId }`
- `config.schema` paramètres : `{}`
- `config.schema.lookup` paramètres : `{ path }`
  - `path` accepte les segments de configuration standard ainsi que les identifiants de plugin délimités par des barres obliques, par exemple `plugins.entries.pack/one.config`.

Réponses (forme)

- Assistant : `{ sessionId, done, step?, status?, error? }`
- Schéma de configuration : `{ schema, uiHints, version, generatedAt }`
- Recherche de schéma de configuration : `{ path, schema, hint?, hintPath?, children[] }`

## Indications de l'interface utilisateur

- `uiHints` indexé par chemin ; métadonnées facultatives (label/help/group/order/advanced/sensitive/placeholder).
- Les champs sensibles sont rendus sous forme de saisies de mot de passe ; aucune couche de rédaction.
- Les nœuds de schéma non pris en charge reviennent à l'éditeur JSON brut.

## Notes

- Ce document est l'endroit unique pour suivre les refactorisations du protocole pour l'onboarding/la configuration.

import fr from "/components/footer/fr.mdx";

<fr />
