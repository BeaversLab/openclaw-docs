---
summary: "LLMTâches LLM JSON uniquement pour les flux de travail (tool de plugin optionnel)"
read_when:
  - You want a JSON-only LLM step inside workflows
  - You need schema-validated LLM output for automation
title: "LLMTâche LLM"
---

`llm-task`LLM est un **tool de plugin optionnel** qui exécute une tâche LLM JSON uniquement et
renvoie une sortie structurée (éventuellement validée par rapport à un schéma JSON).

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

2. Autoriser le tool optionnel :

```json
{
  "tools": {
    "alsoAllow": ["llm-task"]
  }
}
```

Utilisez `tools.allow` uniquement lorsque vous souhaitez un mode de liste d'autorisation restrictif.

## Config (facultatif)

```json
{
  "plugins": {
    "entries": {
      "llm-task": {
        "enabled": true,
        "config": {
          "defaultProvider": "openai",
          "defaultModel": "gpt-5.5",
          "defaultAuthProfileId": "main",
          "allowedModels": ["openai/gpt-5.5"],
          "maxTokens": 800,
          "timeoutMs": 30000
        }
      }
    }
  }
}
```

`allowedModels` est une liste d'autorisation (allowlist) de chaînes `provider/model`. Si elle est définie, toute demande
en dehors de la liste est rejetée.

## Paramètres de l'outil

- `prompt` (chaîne, requis)
- `input` (any, facultatif)
- `schema` (objet, schéma JSON facultatif)
- `provider` (chaîne, facultatif)
- `model` (chaîne, facultatif)
- `thinking` (chaîne, facultatif)
- `authProfileId` (chaîne, facultatif)
- `temperature` (nombre, facultatif)
- `maxTokens` (nombre, facultatif)
- `timeoutMs` (nombre, facultatif)

`thinking`OpenClaw accepte les préréglages de raisonnement standard OpenClaw, tels que `low` ou `medium`.

## Sortie

Renvoie `details.json` contenant le JSON analysé (et valide par rapport à
`schema` lorsqu'il est fourni).

## Exemple : étape de flux de travail Lobster

### Limitation importante

L'exemple ci-dessous suppose que la **CLI Lobster autonome** est en cours d'exécution dans un environnement où LobsterCLI`openclaw.invoke` possède déjà le contexte d'URL de passerelle/d'authentification correct.

Pour l'exécuteur **intégré** (embedded) de Lobster inclus dans OpenClaw, ce modèle de CLI imbriqué n'est **pas actuellement fiable** :

```lobster
openclaw.invoke --tool llm-task --action json --args-json '{ ... }'
```

Jusqu'à ce que Lobster intégré dispose d'un pont pris en charge pour ce flux, préférez soit :

- des appels de tool `llm-task`Lobster directs en dehors de Lobster, soit
- Étapes Lobster qui ne reposent pas sur des appels Lobster`openclaw.invoke` imbriqués.

Exemple autonome de CLI LobsterCLI :

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

- L'outil est **uniquement JSON** et instruit le modèle de ne sortir que du JSON (sans
  blocs de code, sans commentaire).
- Aucun outil n'est exposé au modèle pour cette exécution.
- Traitez la sortie comme non fiable sauf si vous la validez avec `schema`.
- Placez les approbations avant toute étape avec effets de bord (send, post, exec).

## Connexes

- [Niveaux de réflexion](/fr/tools/thinking)
- [Sous-agents](/fr/tools/subagents)
- [Commandes slash](/fr/tools/slash-commands)
