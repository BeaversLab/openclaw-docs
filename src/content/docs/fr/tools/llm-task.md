---
summary: "Tâches LLM JSON uniquement pour les flux de travail (outil de plugin facultatif)"
read_when:
  - You want a JSON-only LLM step inside workflows
  - You need schema-validated LLM output for automation
title: "Tâche LLM"
---

`llm-task` est un **outil de plugin optionnel** qui exécute une tâche LLM JSON uniquement et
retourne une sortie structurée (éventuellement validée par JSON Schema).

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

2. Ajouter l'outil à la liste blanche (il est enregistré avec `optional: true`) :

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

## Config (optionnel)

```json
{
  "plugins": {
    "entries": {
      "llm-task": {
        "enabled": true,
        "config": {
          "defaultProvider": "openai-codex",
          "defaultModel": "gpt-5.5",
          "defaultAuthProfileId": "main",
          "allowedModels": ["openai/gpt-5.4"],
          "maxTokens": 800,
          "timeoutMs": 30000
        }
      }
    }
  }
}
```

`allowedModels` est une liste blanche de chaînes `provider/model`. Si défini, toute requête
en dehors de la liste est rejetée.

## Paramètres de l'outil

- `prompt` (chaîne, requis)
- `input` (n'importe quel type, optionnel)
- `schema` (objet, JSON Schema optionnel)
- `provider` (chaîne, optionnel)
- `model` (chaîne, optionnel)
- `thinking` (chaîne, optionnel)
- `authProfileId` (chaîne, optionnel)
- `temperature` (nombre, optionnel)
- `maxTokens` (nombre, optionnel)
- `timeoutMs` (nombre, optionnel)

`thinking` accepte les préréglages de raisonnement standard OpenClaw, tels que `low` ou `medium`.

## Sortie

Retourne `details.json` contenant le JSON analysé (et valide par rapport à
`schema` lorsque fourni).

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

## Remarques de sécurité

- L'outil est **JSON uniquement** et instruit le model pour qu'il ne sorte que du JSON (pas
  de clôtures de code, pas de commentaire).
- Aucun outil n'est exposé au model pour cette exécution.
- Traitez la sortie comme non fiable à moins que vous ne la validiez avec `schema`.
- Placez les approbations avant toute étape ayant des effets secondaires (send, post, exec).

## Connexes

- [Niveaux de réflexion](/fr/tools/thinking)
- [Sous-agents](/fr/tools/subagents)
- [Commandes slash](/fr/tools/slash-commands)
