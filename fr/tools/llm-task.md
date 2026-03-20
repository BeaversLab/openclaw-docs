---
summary: "Tâches LLM en JSON uniquement pour les workflows (outil de plugin optionnel)"
read_when:
  - Vous souhaitez une étape LLM en JSON uniquement à l'intérieur des workflows
  - Vous avez besoin d'une sortie LLM validée par un schéma pour l'automatisation
title: "Tâche LLM"
---

# Tâche LLM

`llm-task` est un **outil de plugin optionnel** qui exécute une tâche LLM en JSON uniquement et
retourne une sortie structurée (validée en option contre un schéma JSON).

C'est idéal pour les moteurs de workflow comme Lobster : vous pouvez ajouter une seule étape LLM
sans écrire de code OpenClaw personnalisé pour chaque workflow.

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

`allowedModels` est une liste autorisée de chaînes `provider/model`. Si elle est définie, toute requête
en dehors de la liste est rejetée.

## Paramètres de l'outil

- `prompt` (chaîne, obligatoire)
- `input` (n'importe quel type, facultatif)
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

Retourne `details.json` contenant le JSON analysé (et valide par rapport à
`schema` lorsqu'il est fourni).

## Exemple : étape de workflow Lobster

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

- L'outil est **JSON uniquement** et instruit le modèle de ne produire que du JSON (sans
  blocs de code, sans commentaire).
- Aucun outil n'est exposé au modèle pour cette exécution.
- Traitez la sortie comme non fiable sauf si vous la validez avec `schema`.
- Placez les approbations avant toute étape avec effets de bord (send, post, exec).

import en from "/components/footer/en.mdx";

<en />
