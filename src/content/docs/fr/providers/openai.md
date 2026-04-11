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
- `"on"` : alias pour `"friendly"`.
- `"off"` : désactive la superposition et utilise uniquement l'invite de base OpenClaw.

Portée :

- S'applique aux modèles `openai/*`.
- S'applique aux modèles `openai-codex/*`.
- N'affecte pas les autres providers.

Ce comportement est activé par défaut. Conservez `"friendly"` explicitement si vous souhaitez qu'il survive aux futurs remaniements de la configuration locale :

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

### Désactiver la superposition de l'invite OpenAI

Si vous souhaitez l'invite de base OpenClaw non modifiée, définissez la superposition sur `"off"` :

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

Vous pouvez également la définir directement avec la CLI de configuration :

```bash
openclaw config set plugins.entries.openai.config.personality off
```

OpenClaw normalise ce paramètre sans tenir compte de la casse lors de l'exécution, donc des valeurs comme `"Off"` désactivent toujours la superposition conviviale.

## Option A : Clé OpenAI API (Plateforme OpenAI)

**Idéal pour :** accès direct à l'API et facturation à l'utilisation.
Obtenez votre clé API depuis le tableau de bord OpenAI.

Résumé de l'acheminement :

- `openai/gpt-5.4` = itinéraire direct de l'OpenAI de la plateforme API
- Nécessite `OPENAI_API_KEY` (ou configuration de provider OpenAI équivalente)
- Dans OpenClaw, la connexion ChatGPT/Codex est acheminée via `openai-codex/*`, et non `openai/*`

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

La documentation actuelle des modèles de l'OpenAI API de OpenAI répertorie `gpt-5.4` et `gpt-5.4-pro` pour l'utilisation directe de l'API OpenClaw. OpenClaw transfère les deux via le chemin de réponses `openai/*`.
OpenAI supprime intentionnellement la ligne obsolète `openai/gpt-5.3-codex-spark`,
car les appels directs à l'API API la rejettent dans le trafic en direct.

OpenClaw n'expose **pas** `openai/gpt-5.3-codex-spark` sur le chemin direct de l'OpenAI API. `pi-ai` inclut toujours une ligne intégrée pour ce modèle, mais les demandes directes à l'OpenAI API le rejettent actuellement. Spark est traité exclusivement Codex dans OpenClaw.

## Génération d'images

Le plugin `openai` inclus enregistre également la génération d'images via l'outil partagé `image_generate`.

- Modèle d'image par défaut : `openai/gpt-image-1`
- Générer : jusqu'à 4 images par demande
- Mode édition : activé, jusqu'à 5 images de référence
- Prend en charge `size`
- Réserve actuelle spécifique à OpenAI : OpenClaw ne transmet pas aujourd'hui les substitutions `aspectRatio` ou `resolution` à l'API d'images OpenAI

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

Voir [Génération d'images](/en/tools/image-generation) pour les paramètres d'outil partagés, la sélection du fournisseur et le comportement de basculement.

## Génération vidéo

Le plugin `openai` inclus enregistre également la génération vidéo via l'outil partagé `video_generate`.

- Modèle vidéo par défaut : `openai/sora-2`
- Modes : flux texte-vers-vidéo, image-vers-vidéo et référence/édition vidéo unique
- Limites actuelles : 1 image ou 1 référence vidéo en entrée
- Réserve actuelle spécifique à OpenAI : OpenClaw ne transmet actuellement que les substitutions `size` pour la génération vidéo native d'OpenAI. Les substitutions facultatives non prises en charge telles que `aspectRatio`, `resolution`, `audio` et `watermark` sont ignorées et renvoyées sous forme d'avertissement de l'outil.

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

Voir [Génération vidéo](/en/tools/video-generation) pour les paramètres d'outil partagés, la sélection du fournisseur et le comportement de basculement.

## Option B : Abonnement Code OpenAI (Codex)

**Idéal pour :** utiliser l'accès par abonnement ChatGPT/Codex au lieu d'une clé API. Le cloud Codex nécessite une connexion ChatGPT, tandis que la CLI Codex prend en charge la connexion ChatGPT ou par clé API.

Résumé de l'itinéraire :

- `openai-codex/gpt-5.4` = Itinéraire OAuth ChatGPT/Codex
- Utilise la connexion ChatGPT/Codex, et non une clé API directe de la plateforme OpenAI
- Les limites côté fournisseur pour `openai-codex/*` peuvent différer de l'expérience web/application ChatGPT

### Configuration CLI (OAuth Codex)

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

La documentation actuelle de Codex d'OpenAI répertorie `gpt-5.4` comme modèle Codex actuel. OpenClaw l'associe à `openai-codex/gpt-5.4` pour l'utilisation OAuth ChatGPT/Codex.

Cet itinéraire est intentionnellement séparé de `openai/gpt-5.4`. Si vous souhaitez le chemin direct de l'API de la plateforme OpenAI, utilisez `openai/*` avec une clé API. Si vous souhaitez la connexion ChatGPT/Codex, utilisez `openai-codex/*`.

Si l'intégration réutilise une connexion existante à la CLI Codex, ces identifiants restent
gérés par la CLI Codex. Lors de leur expiration, CLI relit d'abord la source Codex externe
et, lorsque le fournisseur peut l'actualiser, écrit l'identifiant actualisé
en retour dans le stockage Codex au lieu d'en prendre possession dans une copie distincte réservée à CLI.

Si votre compte Codex a droit à Codex Spark, OpenClaw prend également en charge :

- `openai-codex/gpt-5.3-codex-spark`

OpenClaw traite Codex Spark comme exclusif à Codex. Il n'expose pas de chemin direct
via clé API `openai/gpt-5.3-codex-spark`.

OpenClaw préserve également `openai-codex/gpt-5.3-codex-spark` lorsque `pi-ai`
le détecte. Considérez cela comme dépendant des droits et expérimental : Codex Spark est
séparé de `/fast` GPT-5.4, et sa disponibilité dépend du compte Codex /
ChatGPT connecté.

### Limite de la fenêtre de contexte Codex

OpenClaw traite les métadonnées du modèle Codex et la limite de contexte d'exécution comme des valeurs
séparées.

Pour `openai-codex/gpt-5.4` :

- `contextWindow` native : `1050000`
- limite d'exécution `contextTokens` par défaut : `272000`

Cela permet de garder les métadonnées du modèle exactes tout en préservant la plus petite fenêtre d'exécution
par défaut qui présente de meilleures caractéristiques de latence et de qualité en pratique.

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

Utilisez `contextWindow` uniquement lorsque vous déclarez ou remplacez les métadonnées natives du
modèle. Utilisez `contextTokens` lorsque vous souhaitez limiter le budget de contexte d'exécution.

### Transport par défaut

OpenClaw utilise `pi-ai` pour le streaming de modèle. Pour `openai/*` et
`openai-codex/*`, le transport par défaut est `"auto"` (WebSocket en priorité, puis repli
SSE).

En mode `"auto"`, OpenClaw réessaie également une défaillance WebSocket précoce réessayable
avant de passer au repli SSE. Le mode `"websocket"` forcé affiche toujours les erreurs de
directement au lieu de les masquer derrière le repli.

Après un échec de connexion ou de tour précoce via WebSocket en mode `"auto"`, OpenClaw marque
le chemin WebSocket de cette session comme dégradé pendant environ 60 secondes et envoie
les tours suivants via SSE pendant le refroidissement au lieu d'alterner entre les
transports.

Pour les points de terminaison natifs de la famille OpenAI (`openai/*`, `openai-codex/*` et Azure
OpenAI Responses), OpenClaw attache également un état d'identité de session et de tour stable
aux requêtes afin que les nouvelles tentatives, reconnexions et replis SSE restent alignés sur la même
identité de conversation. Sur les routes natives de la famille OpenAI, cela inclut des en-têtes d'identité de requête de session/tour stables ainsi que les métadonnées de transport correspondantes.

OpenClaw normalise également les compteurs d'utilisation OpenAI pour les variantes de transport avant
qu'ils n'atteignent les surfaces de session/statut. Le trafic natif OpenAI/Codex Responses peut
signaler l'utilisation sous la forme `input_tokens` / `output_tokens` ou
`prompt_tokens` / `completion_tokens` ; OpenClaw traite ces éléments comme les mêmes compteurs d'entrée
et de sortie pour `/status`, `/usage` et les journaux de session. Lorsque le trafic WebSocket natif
omet `total_tokens` (ou signale `0`), OpenClaw revient au
total entrée + sortie normalisé afin que les affichages de session/statut restent renseignés.

Vous pouvez définir `agents.defaults.models.<provider/model>.params.transport` :

- `"sse"` : forcer SSE
- `"websocket"` : forcer WebSocket
- `"auto"` : essayer WebSocket, puis revenir à SSE

Pour `openai/*` (API Responses), OpenClaw active également le préchauffage WebSocket par
défaut (`openaiWsWarmup: true`) lorsque le transport WebSocket est utilisé.

Documentation connexe OpenAI :

- [Realtime API avec WebSocket](https://platform.openai.com/docs/guides/realtime-websocket)
- [Réponses de l'API en streaming (SSE)](https://platform.openai.com/docs/guides/streaming-responses)

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

### Traitement prioritaire OpenAI et Codex

L'API d'OpenAI expose un traitement prioritaire via `service_tier=priority`. Dans
OpenClaw, définissez `agents.defaults.models["<provider>/<model>"].params.serviceTier`
pour transmettre ce champ via les points de terminaison OpenAI/Codex Responses natifs.

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

OpenClaw transfère `params.serviceTier` à la fois aux requêtes Responses `openai/*` directes
et aux requêtes Codex Responses `openai-codex/*` lorsque ces modèles pointent
vers les points de terminaison OpenAI/Codex natifs.

Comportement important :

- `openai/*` direct doit cibler `api.openai.com`
- `openai-codex/*` doit cibler `chatgpt.com/backend-api`
- si vous acheminez l'un ou l'autre fournisseur via une autre URL de base ou un proxy, OpenClaw laisse `service_tier` intact

### Mode rapide OpenAI

OpenClaw expose un commutateur de mode rapide partagé pour les sessions `openai/*` et
`openai-codex/*` :

- Chat/UI : `/fast status|on|off`
- Config : `agents.defaults.models["<provider>/<model>"].params.fastMode`

Lorsque le mode rapide est activé, OpenClaw le mappe au traitement prioritaire OpenAI :

- les appels Responses `openai/*` directs à `api.openai.com` envoient `service_tier = "priority"`
- les appels Responses `openai-codex/*` à `chatgpt.com/backend-api` envoient également `service_tier = "priority"`
- les valeurs `service_tier` de la charge utile existante sont conservées
- le mode rapide ne réécrit pas `reasoning` ou `text.verbosity`

Pour GPT 5.4 spécifiquement, la configuration la plus courante est :

- envoyer `/fast on` dans une session en utilisant `openai/gpt-5.4` ou `openai-codex/gpt-5.4`
- ou définir `agents.defaults.models["openai/gpt-5.4"].params.fastMode = true`
- si vous utilisez également Codex OAuth, définissez `agents.defaults.models["openai-codex/gpt-5.4"].params.fastMode = true` également

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
ramène la session à la valeur par défaut configurée.

### Routes OpenAI natives par rapport aux routes compatibles OpenAI

OpenClaw traite différemment les points de terminaison directs OpenAI, Codex et Azure OpenAI par rapport aux mandataires `/v1` compatibles OpenAI génériques :

- les itinéraires natifs `openai/*`, `openai-codex/*` et Azure OpenAI gardent
  `reasoning: { effort: "none" }` intacts lorsque vous désactivez explicitement le raisonnement
- les itinéraires de la famille native OpenAI définissent par défaut les schémas d'outils en mode strict
- les en-têtes d'attribution masqués d'OpenClaw (`originator`, `version` et
  `User-Agent`) ne sont attachés que sur les hôtes natifs vérifiés OpenAI
  (`api.openai.com`) et les hôtes natifs Codex (`chatgpt.com/backend-api`)
- les itinéraires natifs OpenAI/Codex conservent la mise en forme des demandes exclusives à OpenAI, telles que
  `service_tier`, Responses `store`, les charges utiles compatibles avec le raisonnement OpenAI, et
  les indications de cache de prompt
- les itinéraires compatibles OpenAI de type proxy conservent le comportement de compatibilité plus souple et ne
  forcent pas les schémas d'outils stricts, la mise en forme des demandes exclusivement native, ni les en-têtes
  d'attribution OpenAI/Codex masqués

Azure OpenAI reste dans le compartiment de routage natif pour le transport et le comportement de compatibilité,
mais il ne reçoit pas les en-têtes d'attribution masqués OpenAI/Codex.

Cela préserve le comportement actuel des réponses natives OpenAI sans forcer les
shim compatibles OpenAI plus anciens sur les backends `/v1` tiers.

### Compactage côté serveur des réponses OpenAI

Pour les modèles de réponses OpenAI directs (`openai/*` utilisant `api: "openai-responses"` avec
`baseUrl` sur `api.openai.com`), OpenClaw active désormais automatiquement les indications de charge utile de compactage côté serveur OpenAI :

- Force `store: true` (sauf si la compatibilité du modèle définit `supportsStore: false`)
- Injecte `context_management: [{ type: "compaction", compact_threshold: ... }]`

Par défaut, `compact_threshold` est `70%` du modèle `contextWindow` (ou `80000`
lorsqu'il n'est pas disponible).

### Activer explicitement le compactage côté serveur

Utilisez ceci lorsque vous souhaitez forcer l'injection de `context_management` sur les modèles de réponses compatibles
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
Les modèles OpenAI Responses directs forcent toujours `store: true` sauf si compat définit
`supportsStore: false`.

## Notes

- Les références de modèle utilisent toujours `provider/model` (voir [/concepts/models](/en/concepts/models)).
- Les détails d'authentification et les règles de réutilisation se trouvent dans [/concepts/oauth](/en/concepts/oauth).
