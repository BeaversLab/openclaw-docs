---
summary: "Notes sur le protocole RPC pour l'assistant de configuration et le schéma de configuration"
read_when: "Modification des étapes de l'assistant de configuration ou des points de terminaison du schéma de configuration"
title: "Onboarding et protocole de configuration"
---

# Onboarding + Protocole de configuration

Objectif : surfaces d'onboarding et de configuration partagées entre le CLI, l'application macOS et l'interface Web.

## Composants

- Moteur d'assistant (session partagée + invites + état de l'onboarding).
- L'onboarding CLI utilise le même flux d'assistant que les clients de l'interface utilisateur.
- Le Gateway RPC expose les points de terminaison de l'assistant et du schéma de configuration.
- L'onboarding macOS utilise le modèle d'étape de l'assistant.
- L'interface Web restitue les formulaires de configuration à partir du schéma JSON et des indices de l'interface utilisateur.

## Gateway RPC

- `wizard.start` params : `{ mode?: "local"|"remote", workspace?: string }`
- `wizard.next` params : `{ sessionId, answer?: { stepId, value? } }`
- `wizard.cancel` params : `{ sessionId }`
- `wizard.status` params : `{ sessionId }`
- `config.schema` params : `{}`
- `config.schema.lookup` params : `{ path }`
  - `path` accepte les segments de configuration standard ainsi que les ID de plugin délimités par des slashs, par exemple `plugins.entries.pack/one.config`.

Réponses (forme)

- Assistant : `{ sessionId, done, step?, status?, error? }`
- Schéma de configuration : `{ schema, uiHints, version, generatedAt }`
- Recherche dans le schéma de configuration : `{ path, schema, hint?, hintPath?, children[] }`

## Indices de l'interface utilisateur

- `uiHints` indexé par chemin ; métadonnées facultatives (label/help/group/order/advanced/sensitive/placeholder).
- Les champs sensibles sont restitués sous forme de saisies de mot de passe ; aucune couche de masquage.
- Les nœuds de schéma non pris en charge reviennent à l'éditeur JSON brut.

## Notes

- Ce document est l'endroit unique pour suivre les refactorisations du protocole pour l'onboarding/la configuration.

import fr from "/components/footer/fr.mdx";

<fr />
