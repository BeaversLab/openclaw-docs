---
summary: "Utiliser OpenAI via des clés API ou un abonnement Codex dans OpenClaw"
read_when:
  - You want to use OpenAI models in OpenClaw
  - You want Codex subscription auth instead of API keys
title: "OpenAI"
---

# OpenAI

OpenAI fournit des API de développeur pour les modèles GPT. Codex prend en charge la **connexion ChatGPT** pour l'accès par abonnement ou la **connexion par clé API** pour un accès à l'utilisation. Le cloud Codex nécessite une connexion ChatGPT.
OpenAI prend explicitement en charge l'utilisation de l'abonnement OAuth dans des outils/workflows externes comme OpenClaw.

## Option A : clé OpenAI API (plateforme OpenAI)

**Idéal pour :** un accès direct à l'API et une facturation à l'utilisation.
Obtenez votre clé API à partir du tableau de bord OpenAI.

### Configuration CLI

```bash
openclaw onboard --auth-choice openai-api-key
# or non-interactive
openclaw onboard --openai-api-key "$OPENAI_API_KEY"
```

### Extrait de configuration

```json5
{
  env: { OPENAI_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "openai/gpt-5.4" } } },
}
```

La documentation actuelle sur les modèles d'OpenAI de API répertorie `gpt-5.4` et `gpt-5.4-pro` pour l'utilisation directe de l'OpenAI API. OpenClaw transmet les deux via le chemin Réponses `openai/*`.
OpenClaw supprime intentionnellement la ligne obsolète `openai/gpt-5.3-codex-spark`, car les appels directs à l'OpenAI API la rejettent dans le trafic en direct.

OpenClaw n'expose **pas** `openai/gpt-5.3-codex-spark` sur le chemin de l'OpenAI API direct. `pi-ai` inclut toujours une ligne intégrée pour ce modèle, mais les requêtes actuelles à l'OpenAI API la rejettent actuellement. Spark est traité comme exclusif à Codex dans OpenClaw.

## Option B : Abonnement Code OpenAI (Codex)

**Idéal pour :** utiliser l'accès par abonnement ChatGPT/Codex au lieu d'une clé API.
Le cloud Codex nécessite une connexion ChatGPT, tandis que la CLI Codex prend en charge la connexion ChatGPT ou par clé API.

### Configuration CLI (Codex OAuth)

```bash
# Run Codex OAuth in the wizard
openclaw onboard --auth-choice openai-codex

# Or run OAuth directly
openclaw models auth login --provider openai-codex
```

### Extrait de configuration (abonnement Codex)

```json5
{
  agents: { defaults: { model: { primary: "openai-codex/gpt-5.4" } } },
}
```

La documentation actuelle de Codex de OpenAI répertorie `gpt-5.4` comme le modèle Codex actuel. OpenClaw l'associe à `openai-codex/gpt-5.4` pour l'utilisation OAuth ChatGPT/Codex.

Si votre compte Codex a droit à Codex Spark, OpenClaw prend également en charge :

- `openai-codex/gpt-5.3-codex-spark`

OpenClaw traite Codex Spark comme exclusif à Codex. Il n'expose pas de chemin direct par clé API `openai/gpt-5.3-codex-spark`.

OpenClaw préserve également `openai-codex/gpt-5.3-codex-spark` lorsqu'il est découvert par `pi-ai`. Considérez cela comme dépendant des droits et expérimental : Codex Spark est distinct de GPT-5.4 `/fast`, et sa disponibilité dépend du compte Codex / ChatGPT connecté.

### Transport par défaut

OpenClaw utilise `pi-ai` pour le streaming de modèle. Pour `openai/*` comme pour `openai-codex/*`, le transport par défaut est `"auto"` (WebSocket en priorité, puis repli sur SSE).

Vous pouvez définir `agents.defaults.models.<provider/model>.params.transport` :

- `"sse"` : forcer SSE
- `"websocket"` : forcer WebSocket
- `"auto"` : essayer WebSocket, puis revenir à SSE

Pour `openai/*` (Responses API), OpenClaw active également le préchauffage WebSocket par défaut (`openaiWsWarmup: true`) lorsque le transport WebSocket est utilisé.

Documentation OpenAI connexe :

- [API temps réel avec WebSocket](https://platform.openai.com/docs/guides/realtime-websocket)
- [Réponses de l'API de streaming (SSE)](https://platform.openai.com/docs/guides/streaming-responses)

```json5
{
  agents: {
    defaults: {
      model: { primary: "openai-codex/gpt-5.4" },
      models: {
        "openai-codex/gpt-5.4": {
          params: {
            transport: "auto",
          },
        },
      },
    },
  },
}
```

### Préchauffage WebSocket OpenAI

La documentation OpenAI décrit le préchauffage comme optionnel. OpenClaw l'active par défaut pour `openai/*` afin de réduire la latence du premier tour lors de l'utilisation du transport WebSocket.

### Désactiver le préchauffage

```json5
{
  agents: {
    defaults: {
      models: {
        "openai/gpt-5.4": {
          params: {
            openaiWsWarmup: false,
          },
        },
      },
    },
  },
}
```

### Activer le préchauffage explicitement

```json5
{
  agents: {
    defaults: {
      models: {
        "openai/gpt-5.4": {
          params: {
            openaiWsWarmup: true,
          },
        },
      },
    },
  },
}
```

### Traitement prioritaire OpenAI

L'API d'OpenAI expose le traitement prioritaire via `service_tier=priority`. Dans OpenClaw, définissez `agents.defaults.models["openai/<model>"].params.serviceTier` pour transmettre ce champ lors des requêtes directes de réponses `openai/*`.

```json5
{
  agents: {
    defaults: {
      models: {
        "openai/gpt-5.4": {
          params: {
            serviceTier: "priority",
          },
        },
      },
    },
  },
}
```

Les valeurs prises en charge sont `auto`, `default`, `flex` et `priority`.

### Mode rapide OpenAI

OpenClaw expose un commutateur de mode rapide partagé pour les sessions `openai/*` et `openai-codex/*` :

- Chat/UI : `/fast status|on|off`
- Config : `agents.defaults.models["<provider>/<model>"].params.fastMode`

Lorsque le mode rapide est activé, OpenClaw applique un profil OpenAI à faible latence :

- `reasoning.effort = "low"` lorsque la charge utile ne spécifie pas déjà le raisonnement
- `text.verbosity = "low"` lorsque la charge utile ne spécifie pas déjà la verbosité
- `service_tier = "priority"` pour les appels directs `openai/*` Responses vers `api.openai.com`

Exemple :

```json5
{
  agents: {
    defaults: {
      models: {
        "openai/gpt-5.4": {
          params: {
            fastMode: true,
          },
        },
        "openai-codex/gpt-5.4": {
          params: {
            fastMode: true,
          },
        },
      },
    },
  },
}
```

Les redéfinitions de session prévalent sur la configuration. Effacer la redéfinition de session dans l'interface Sessions
ramène la session à la valeur par défaut configurée.

### Compactage côté serveur OpenAI Responses

Pour les modèles OpenAI Responses directs (`openai/*` utilisant `api: "openai-responses"` avec
`baseUrl` sur `api.openai.com`), OpenClaw active désormais automatiquement les indicateurs de charge utile de compactage côté serveur OpenAI :

- Force `store: true` (sauf si la compatibilité du modèle définit `supportsStore: false`)
- Injecte `context_management: [{ type: "compaction", compact_threshold: ... }]`

Par défaut, `compact_threshold` est `70%` du modèle `contextWindow` (ou `80000`
lorsqu'il est indisponible).

### Activer explicitement le compactage côté serveur

Utilisez ceci lorsque vous souhaitez forcer l'injection de `context_management` sur les modèles Responses compatibles
(par exemple Azure OpenAI Responses) :

```json5
{
  agents: {
    defaults: {
      models: {
        "azure-openai-responses/gpt-5.4": {
          params: {
            responsesServerCompaction: true,
          },
        },
      },
    },
  },
}
```

### Activer avec un seuil personnalisé

```json5
{
  agents: {
    defaults: {
      models: {
        "openai/gpt-5.4": {
          params: {
            responsesServerCompaction: true,
            responsesCompactThreshold: 120000,
          },
        },
      },
    },
  },
}
```

### Désactiver le compactage côté serveur

```json5
{
  agents: {
    defaults: {
      models: {
        "openai/gpt-5.4": {
          params: {
            responsesServerCompaction: false,
          },
        },
      },
    },
  },
}
```

`responsesServerCompaction` contrôle uniquement l'injection de `context_management`.
Les modèles OpenAI Responses directs forcent toujours `store: true` sauf si la compatibilité définit
`supportsStore: false`.

## Notes

- Les références de modèle utilisent toujours `provider/model` (voir [/concepts/models](/fr/concepts/models)).
- Les détails d'authentification + les règles de réutilisation sont dans [/concepts/oauth](/fr/concepts/oauth).
