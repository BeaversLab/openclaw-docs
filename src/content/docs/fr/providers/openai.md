---
summary: "Utiliser OpenAI via des clés d'API ou l'abonnement Codex dans OpenClaw"
read_when:
  - You want to use OpenAI models in OpenClaw
  - You want Codex subscription auth instead of API keys
title: "OpenAI"
---

# OpenAI

OpenAI fournit des API de développeur pour les modèles GPT. Codex prend en charge la **connexion ChatGPT** pour l'accès par abonnement ou la **connexion par clé API** pour un accès à l'utilisation. Le cloud Codex nécessite une connexion ChatGPT.
OpenAI prend explicitement en charge l'utilisation de l'abonnement OAuth dans des outils/workflows externes comme OpenClaw.

## Style d'interaction par défaut

OpenClaw peut ajouter une petite superposition de prompt spécifique à OpenAI pour les exécutions `openai/*` et `openai-codex/*`. Par défaut, la superposition maintient l'assistant chaleureux, collaboratif, concis, direct et un peu plus expressif émotionnellement sans remplacer le prompt système de base d'OpenClaw. La superposition conviviale autorise également l'emoji occasionnel lorsqu'il s'intègre naturellement, tout en gardant la sortie globale concise.

Clé de configuration :

`plugins.entries.openai.config.personality`

Valeurs autorisées :

- `"friendly"` : par défaut ; activer la superposition spécifique à OpenAI.
- `"off"` : désactiver la superposition et utiliser uniquement le prompt de base d'OpenClaw.

Portée :

- S'applique aux modèles `openai/*`.
- S'applique aux modèles `openai-codex/*`.
- N'affecte pas les autres fournisseurs.

Ce comportement est activé par défaut. Conservez `"friendly"` explicitement si vous souhaitez qu'il survive aux futurs changements de configuration locale :

```json5
{
  plugins: {
    entries: {
      openai: {
        config: {
          personality: "friendly",
        },
      },
    },
  },
}
```

### Désactiver la superposition de prompt OpenAI

Si vous souhaitez le prompt de base non modifié d'OpenClaw, définissez la superposition sur `"off"` :

```json5
{
  plugins: {
    entries: {
      openai: {
        config: {
          personality: "off",
        },
      },
    },
  },
}
```

Vous pouvez également le définir directement avec la CLI de configuration :

```bash
openclaw config set plugins.entries.openai.config.personality off
```

## Option A : Clé d'API OpenAI (plateforme OpenAI)

**Idéal pour :** un accès direct à l'API et une facturation à l'utilisation.
Obtenez votre clé d'API depuis le tableau de bord OpenAI.

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

La documentation actuelle des modèles d'API d'OpenAI répertorie `gpt-5.4` et `gpt-5.4-pro` pour l'utilisation directe de l'API OpenAI. OpenClaw relaie les deux via le chemin Réponses `openai/*`.
OpenClaw supprime intentionnellement la ligne obsolète `openai/gpt-5.3-codex-spark`, car les appels directs à l'API OpenAI la rejettent en trafic réel.

OpenClaw n'expose **pas** `openai/gpt-5.3-codex-spark` sur le chemin direct de l'API OpenAI. `pi-ai` fournit toujours une ligne intégrée pour ce modèle, mais les requêtes API OpenAI en direct la rejettent actuellement. Spark est traité comme exclusif à Codex dans OpenClaw.

## Génération d'images

Le plugin `openai` inclus enregistre également la génération d'images via l'outil partagé `image_generate`.

- Modèle d'image par défaut : `openai/gpt-image-1`
- Générer : jusqu'à 4 images par requête
- Mode édition : activé, jusqu'à 5 images de référence
- Prend en charge `size`
- Avertissement actuel spécifique à OpenAI : OpenClaw ne transmet pas aujourd'hui les substitutions `aspectRatio` ou `resolution` à l'API Images OpenAI

Pour utiliser OpenAI comme fournisseur d'images par défaut :

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "openai/gpt-image-1",
      },
    },
  },
}
```

Consultez [Génération d'images](/en/tools/image-generation) pour les paramètres de l'outil partagé, la sélection du fournisseur et le comportement de basculement.

## Génération vidéo

Le plugin `openai` inclus enregistre également la génération vidéo via l'outil partagé `video_generate`.

- Modèle vidéo par défaut : `openai/sora-2`
- Modes : texte-vers-vidéo, image-vers-vidéo, et flux de référence/édition vidéo unique
- Limites actuelles : 1 image ou 1 référence vidéo en entrée
- Avertissement actuel spécifique à OpenAI : OpenClaw ne transmet actuellement que les substitutions `size` pour la génération vidéo native OpenAI. Les substitutions facultatives non prises en charge telles que `aspectRatio`, `resolution`, `audio` et `watermark` sont ignorées et renvoyées sous forme d'avertissement de l'outil.

Pour utiliser OpenAI comme fournisseur vidéo par défaut :

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "openai/sora-2",
      },
    },
  },
}
```

Consultez [Génération vidéo](/en/tools/video-generation) pour les paramètres de l'outil partagé, la sélection du fournisseur et le comportement de basculement.

## Option B : Abonnement Code OpenAI (Codex)

**Idéal pour :** utiliser l'accès par abonnement ChatGPT/Codex au lieu d'une clé API. Codex cloud nécessite une connexion ChatGPT, tandis que la CLI Codex prend en charge la connexion par ChatGPT ou par clé CLI.

### Configuration CLI (Codex OAuth)

```bash
# Run Codex OAuth in the wizard
openclaw onboard --auth-choice openai-codex

# Or run OAuth directly
openclaw models auth login --provider openai-codex
```

### Extrait de configuration (Abonnement Codex)

```json5
{
  agents: { defaults: { model: { primary: "openai-codex/gpt-5.4" } } },
}
```

La documentation actuelle de Codex de OpenAI liste `gpt-5.4` comme modèle Codex actuel. OpenClaw l'associe à `openai-codex/gpt-5.4` pour l'utilisation OAuth ChatGPT/Codex OAuth.

Si l'intégration réutilise une connexion existante à Codex CLI, ces identifiants restent gérés par Codex CLI. À l'expiration, OpenClaw relit d'abord la source Codex externe et, lorsque le fournisseur peut l'actualiser, réécrit l'identifiant actualisé dans le stockage Codex au lieu d'en prendre possession dans une copie distincte OpenClaw.

Si votre compte Codex a droit à Codex Spark, OpenClaw prend également en charge :

- `openai-codex/gpt-5.3-codex-spark`

OpenClaw traite Codex Spark comme étant exclusif à Codex. Il n'expose pas de chemin direct de clé d'API `openai/gpt-5.3-codex-spark`.

OpenClaw préserve également `openai-codex/gpt-5.3-codex-spark` lorsque `pi-ai` le détecte. Considérez cela comme dépendant des droits et expérimental : Codex Spark est distinct de GPT-5.4 `/fast`, et sa disponibilité dépend du compte Codex / ChatGPT connecté.

### Limite de la fenêtre de contexte Codex

OpenClaw traite les métadonnées du modèle Codex et la limite de contexte d'exécution comme des valeurs distinctes.

Pour `openai-codex/gpt-5.4` :

- `contextWindow` natif : `1050000`
- limite d'exécution `contextTokens` par défaut : `272000`

Cela permet de garder les métadonnées du modèle exactes tout en préservant la fenêtre d'exécution par défaut plus petite, qui offre de meilleures caractéristiques de latence et de qualité en pratique.

Si vous souhaitez une limite effective différente, définissez `models.providers.<provider>.models[].contextTokens` :

```json5
{
  models: {
    providers: {
      "openai-codex": {
        models: [
          {
            id: "gpt-5.4",
            contextTokens: 160000,
          },
        ],
      },
    },
  },
}
```

Utilisez `contextWindow` uniquement lorsque vous déclarez ou remplacez les métadonnées natives du modèle. Utilisez `contextTokens` lorsque vous souhaitez limiter le budget de contexte d'exécution.

### Transport par défaut

OpenClaw utilise `pi-ai` pour la diffusion en continu de modèles. Pour `openai/*` et `openai-codex/*`, le transport par défaut est `"auto"` (WebSocket en priorité, puis repli SSE).

En mode `"auto"`, OpenClaw réessaie également une défaillance WebSocket précoce et réessai avant de revenir au SSE. Le mode forcé `"websocket"` affiche toujours directement les erreurs de transport au lieu de les masquer derrière un repli.

Après un échec de connexion ou de tour précoce via WebSocket en mode `"auto"`, OpenClaw marque
le chemin WebSocket de cette session comme dégradé pendant environ 60 secondes et envoie
les tours suivants via SSE pendant la période de refroidissement au lieu de basculer de manière
frénétique entre les transports.

Pour les points de terminaison natifs de la famille OpenAI (`openai/*`, `openai-codex/*`, et Azure
OpenAI Responses), OpenClaw attache également un état d'identité stable de session et de tour
aux requêtes afin que les nouvelles tentatives, reconnexions et le repli SSE restent alignés sur la même
identité de conversation. Sur les routes natives de la famille OpenAI, cela inclut des en-têtes d'identité de requête de session/tour stables ainsi que les métadonnées de transport correspondantes.

OpenClaw normalise également les compteurs d'utilisation OpenAI sur les variantes de transport avant
qu'ils n'atteignent les surfaces de session/état. Le trafic natif OpenAI/Codex Responses peut
signaler l'utilisation soit comme `input_tokens` / `output_tokens` soit comme
`prompt_tokens` / `completion_tokens` ; OpenClaw les traite comme les mêmes compteurs
d'entrée et de sortie pour `/status`, `/usage`, et les journaux de session. Lorsque le trafic WebSocket natif
omet `total_tokens` (ou signale `0`), OpenClaw revient au
total entrée + sortie normalisé afin que les affichages de session/état restent renseignés.

Vous pouvez définir `agents.defaults.models.<provider/model>.params.transport` :

- `"sse"` : forcer SSE
- `"websocket"` : forcer WebSocket
- `"auto"` : essayer WebSocket, puis revenir à SSE

Pour `openai/*` (Responses API), OpenClaw active également le préchauffage WebSocket par
défaut (`openaiWsWarmup: true`) lorsque le transport WebSocket est utilisé.

Documentation connexe OpenAI :

- [Realtime API with WebSocket](https://platform.openai.com/docs/guides/realtime-websocket)
- [Streaming API responses (SSE)](https://platform.openai.com/docs/guides/streaming-responses)

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

La documentation OpenAI décrit le préchauffage comme optionnel. OpenClaw l'active par défaut pour
`openai/*` afin de réduire la latence du premier tour lors de l'utilisation du transport WebSocket.

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

### Activer explicitement le préchauffage

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

### Traitement prioritaire OpenAI et Codex

L'API d'OpenAI expose un traitement prioritaire via `service_tier=priority`. Dans
OpenClaw, définissez `agents.defaults.models["<provider>/<model>"].params.serviceTier`
pour transmettre ce champ via les points de terminaison de réponses natifs OpenAI/Codex.

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
        "openai-codex/gpt-5.4": {
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

OpenClaw transfère `params.serviceTier` à la fois aux demandes de réponses `openai/*` directes
et aux demandes de réponses Codex `openai-codex/*` lorsque ces modèles pointent
vers les points de terminaison natifs OpenAI/Codex.

Comportement important :

- `openai/*` direct doit cibler `api.openai.com`
- `openai-codex/*` doit cibler `chatgpt.com/backend-api`
- si vous acheminez l'un ou l'autre fournisseur via une autre URL de base ou un proxy, OpenClaw laisse `service_tier` intact

### Mode rapide OpenAI

OpenClaw expose un interrupteur de mode rapide partagé pour les sessions `openai/*` et
`openai-codex/*` :

- Chat/UI : `/fast status|on|off`
- Config : `agents.defaults.models["<provider>/<model>"].params.fastMode`

Lorsque le mode rapide est activé, OpenClaw le mappe au traitement prioritaire OpenAI :

- les appels de réponses `openai/*` directs vers `api.openai.com` envoient `service_tier = "priority"`
- les appels de réponses `openai-codex/*` vers `chatgpt.com/backend-api` envoient également `service_tier = "priority"`
- les valeurs `service_tier` de la charge utile existante sont conservées
- le mode rapide ne réécrit pas `reasoning` ou `text.verbosity`

Spécifiquement pour GPT 5.4, la configuration la plus courante est :

- envoyer `/fast on` dans une session en utilisant `openai/gpt-5.4` ou `openai-codex/gpt-5.4`
- ou définir `agents.defaults.models["openai/gpt-5.4"].params.fastMode = true`
- si vous utilisez également Codex OAuth, définissez `agents.defaults.models["openai-codex/gpt-5.4"].params.fastMode = true` aussi

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

Les remplacements de session l'emportent sur la configuration. Effacer le remplacement de session dans l'interface Sessions
renvoie la session à la valeur par défaut configurée.

### Routes natives OpenAI versus routes compatibles OpenAI

OpenClaw traite les points de terminaison directs OpenAI, Codex et Azure OpenAI différemment des proxys `/v1` compatibles avec OpenAI génériques :

- les itinéraires natifs `openai/*`, `openai-codex/*` et Azure OpenAI gardent `reasoning: { effort: "none" }` intact lorsque vous désactivez explicitement le raisonnement
- les itinéraires de la famille native OpenAI définissent par défaut les schémas d'outils en mode strict
- les en-têtes d'attribution cachés d'OpenClaw (`originator`, `version` et `User-Agent`) sont uniquement ajoutés sur les hôtes natifs OpenAI vérifiés (`api.openai.com`) et les hôtes natifs Codex (`chatgpt.com/backend-api`)
- les itinéraires natifs OpenAI/Codex conservent le façonnage des requêtes exclusif à OpenAI tel que `service_tier`, Réponses `store`, les payloads de compatibilité du raisonnement OpenAI et les indices de cache de prompt
- les itinéraires de style proxy compatibles avec OpenAI conservent le comportement de compatibilité plus souple et ne forcent pas les schémas d'outils stricts, le façonnage des requêtes natives uniquement, ou les en-têtes d'attribution cachés OpenAI/Codex

Azure OpenAI reste dans le compartiment du routage natif pour le transport et le comportement de compatibilité, mais il ne reçoit pas les en-têtes d'attribution cachés OpenAI/Codex.

Cela préserve le comportement actuel des Réponses OpenAI natives sans forcer les anciens shims compatibles avec OpenAI sur les backends `/v1` tiers.

### Compactage côté serveur des Réponses OpenAI

Pour les modèles de Réponses OpenAI directs (`openai/*` utilisant `api: "openai-responses"` avec `baseUrl` sur `api.openai.com`), OpenClaw active désormais automatiquement les indices de payload de compactage côté serveur d'OpenAI :

- Force `store: true` (sauf si la compatibilité du modèle définit `supportsStore: false`)
- Injecte `context_management: [{ type: "compaction", compact_threshold: ... }]`

Par défaut, `compact_threshold` est `70%` du modèle `contextWindow` (ou `80000` lorsqu'il n'est pas disponible).

### Activer explicitement le compactage côté serveur

Utilisez ceci lorsque vous souhaitez forcer l'injection de `context_management` sur les modèles Réponses compatibles (par exemple Azure OpenAI Réponses) :

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

### Désactiver la compactage côté serveur

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
Les modèles Direct OpenAI Responses forcent toujours `store: true` à moins que compat ne définisse
`supportsStore: false`.

## Notes

- Les références de modèle utilisent toujours `provider/model` (voir [/concepts/models](/en/concepts/models)).
- Les détails d'authentification et les règles de réutilisation se trouvent dans [/concepts/oauth](/en/concepts/oauth).
