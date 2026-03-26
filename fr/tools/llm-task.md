---
summary: "Tâches LLM JSON uniquement pour les flux de travail (outil de plugin facultatif)"
read_when:
  - You want a JSON-only LLM step inside workflows
  - You need schema-validated LLM output for automation
title: "Tâche LLM"
---

# Tâche LLM

`llm-task` est un **outil de plugin facultatif** qui exécute une tâche LLM JSON uniquement et
renvoie une sortie structurée (éventuellement validée par rapport au schéma JSON).

C'est idéal pour les moteurs de flux de travail comme Lobster : vous pouvez ajouter une seule étape LLM
sans écrire de code OpenClaw personnalisé pour chaque flux de travail.

## Activer le plugin

1. Activer le plugin :

```json
{
  "plugins": {
    "entries": {
      "llm-task": { "enabled": true }
    }
  }
}
```

2. Ajouter l'outil à la liste autorisée (il est enregistré avec `optional: true`) :

```json
{
  "agents": {
    "list": [
      {
        "id": "main",
        "tools": { "allow": ["llm-task"] }
      }
    ]
  }
}
```

## Config (facultatif)

```json
{
  "plugins": {
    "entries": {
      "llm-task": {
        "enabled": true,
        "config": {
          "defaultProvider": "openai-codex",
          "defaultModel": "gpt-5.4",
          "defaultAuthProfileId": "main",
          "allowedModels": ["openai-codex/gpt-5.4"],
          "maxTokens": 800,
          "timeoutMs": 30000
        }
      }
    }
  }
}
```

`allowedModels` est une liste autorisée de chaînes `provider/model`. Si défini, toute demande
en dehors de la liste est rejetée.

## Paramètres de l'outil

- `prompt` (chaîne, requis)
- `input` (tout, facultatif)
- `schema` (objet, schéma JSON facultatif)
- `provider` (chaîne, facultatif)
- `model` (chaîne, facultatif)
- `thinking` (chaîne, facultatif)
- `authProfileId` (chaîne, facultatif)
- `temperature` (nombre, facultatif)
- `maxTokens` (nombre, facultatif)
- `timeoutMs` (nombre, facultatif)

`thinking` accepte les préréglages de raisonnement standard OpenClaw, tels que `low` ou `medium`.

## Sortie

Renvoie `details.json` contenant le JSON analysé (et valide par rapport à
`schema` lorsque fourni).

## Exemple : étape de flux de travail Lobster

```lobster
openclaw.invoke --tool llm-task --action json --args-json '{
  "prompt": "Given the input email, return intent and draft.",
  "thinking": "low",
  "input": {
    "subject": "Hello",
    "body": "Can you help?"
  },
  "schema": {
    "type": "object",
    "properties": {
      "intent": { "type": "string" },
      "draft": { "type": "string" }
    },
    "required": ["intent", "draft"],
    "additionalProperties": false
  }
}'
```

## Notes de sécurité

- L'outil est **JSON uniquement** et instruit le modèle pour qu'il ne produise que du JSON (pas
  de clôtures de code, pas de commentaire).
- Aucun outil n'est exposé au modèle pour cette exécution.
- Traitez la sortie comme non fiable sauf si vous la validez avec `schema`.
- Placez les approbations avant toute étape avec effets secondaires (envoyer, publier, exécuter).

import fr from "/components/footer/fr.mdx";

<fr />
