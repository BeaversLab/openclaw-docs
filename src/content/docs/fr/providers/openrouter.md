---
summary: "Utilisez l'API unifiée d'OpenRouterAPI pour accéder à de nombreux modèles dans OpenClaw"
read_when:
  - You want a single API key for many LLMs
  - You want to run models via OpenRouter in OpenClaw
  - You want to use OpenRouter for image generation
  - You want to use OpenRouter for music generation
  - You want to use OpenRouter for video generation
title: "OpenRouter"
---

OpenRouter fournit une **API unifiée** qui achemine les demandes vers de nombreux modèles derrière un seul point de terminaison et clé d'API. Elle est compatible avec OpenAI, donc la plupart des SDK OpenAI fonctionnent en changeant l'URL de base.

## Getting started

<Steps>
  <Step title="Obtenir votre clé API">
    Créez une clé API sur [openrouter.ai/keys](https://openrouter.ai/keys).
  </Step>
  <Step title="Exécuter l'onboarding">
    ```bash
    openclaw onboard --auth-choice openrouter-api-key
    ```
  </Step>
  <Step title="(Facultatif) Passer à un modèle spécifique">
    L'onboarding est réglé par défaut sur `openrouter/auto`. Choisissez un modèle concret plus tard :

    ```bash
    openclaw models set openrouter/<provider>/<model>
    ```

  </Step>
</Steps>

## Exemple de configuration

```json5
{
  env: { OPENROUTER_API_KEY: "sk-or-..." },
  agents: {
    defaults: {
      model: { primary: "openrouter/auto" },
    },
  },
}
```

## Références de modèles

<Note>
Les références de modèle suivent le modèle `openrouter/<provider>/<model>`. Pour la liste complète des fournisseurs et modèles disponibles, consultez [/concepts/model-providers](/fr/concepts/model-providers).
</Note>

Exemples de repli groupés :

| Réf de modèle                     | Notes                          |
| --------------------------------- | ------------------------------ |
| `openrouter/auto`                 | Routage automatique OpenRouter |
| `openrouter/moonshotai/kimi-k2.6` | Kimi K2.6 via MoonshotAI       |
| `openrouter/moonshotai/kimi-k2.5` | Kimi K2.5 via MoonshotAI       |

## Génération d'images

OpenRouter peut également prendre en charge l'outil `image_generate`. Utilisez un modèle d'image OpenRouter sous `agents.defaults.imageGenerationModel` :

```json5
{
  env: { OPENROUTER_API_KEY: "sk-or-..." },
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "openrouter/google/gemini-3.1-flash-image-preview",
        timeoutMs: 180_000,
      },
    },
  },
}
```

OpenClaw envoie les requêtes d'image à l'API de chat de complétion d'image d'OpenRouterAPI avec `modalities: ["image", "text"]`. Les modèles d'image Gemini reçoivent les indices `aspectRatio` et `resolution` pris en charge via le `image_config` d'OpenRouter. Utilisez `agents.defaults.imageGenerationModel.timeoutMs` pour les modèles d'image OpenRouter plus lents ; le paramètre `timeoutMs` par appel de l'outil `image_generate` prime toujours.

## Génération vidéo

OpenRouter peut également prendre en charge l'outil `video_generate``/videos` via son API asynchrone. Utilisez un modèle vidéo OpenRouter sous `agents.defaults.videoGenerationModel` :

```json5
{
  env: { OPENROUTER_API_KEY: "sk-or-..." },
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "openrouter/google/veo-3.1-fast",
      },
    },
  },
}
```

OpenClaw soumet des tâches text-to-video et image-to-video à OpenRouter, interroge le OpenClawOpenRouter`polling_url`OpenRouter renvoyé et télécharge la vidéo terminée depuis le `unsigned_urls` d'OpenRouter ou le point de terminaison de contenu de tâche documenté. Les images de référence sont envoyées en tant qu'images de première/dernière image par défaut ; les images balisées avec `reference_image`OpenRouter sont envoyées en tant que références d'entrée OpenRouter. Le `google/veo-3.1-fast` par défaut inclus annonce les durées de 4/6/8 secondes actuellement prises en charge, les résolutions `720P`/`1080P` et les rapports d'aspect `16:9`/`9:16`OpenRouterAPI. Video-to-video n'est pas enregistré pour OpenRouter car l'API de génération vidéo en amont accepte actuellement des références de texte et d'image.

## Génération de musique

OpenRouter peut également prendre en charge l'outil OpenRouter`music_generate`OpenRouter via la sortie audio des complétions de chat. Utilisez un modèle audio OpenRouter sous `agents.defaults.musicGenerationModel` :

```json5
{
  env: { OPENROUTER_API_KEY: "sk-or-..." },
  agents: {
    defaults: {
      musicGenerationModel: {
        primary: "openrouter/google/lyria-3-pro-preview",
        timeoutMs: 180_000,
      },
    },
  },
}
```

Le fournisseur de musique OpenRouter inclus par défaut utilise OpenRouter`google/lyria-3-pro-preview` et expose également `google/lyria-3-clip-preview`OpenClaw. OpenClaw envoie `modalities: ["text", "audio"]`, active le streaming, collecte les segments audio diffusés et enregistre le résultat en tant que média généré pour la diffusion sur le canal. Les images de référence sont acceptées pour les modèles Lyria via le paramètre partagé `music_generate image=...`.

## Synthèse vocale

OpenRouter peut également être utilisé comme fournisseur TTS via son point de terminaison OpenRouterOpenAI`/audio/speech` compatible OpenAI.

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "openrouter",
      providers: {
        openrouter: {
          model: "hexgrad/kokoro-82m",
          voice: "af_alloy",
          responseFormat: "mp3",
        },
      },
    },
  },
}
```

Si `messages.tts.providers.openrouter.apiKey` est omis, le TTS réutilise `models.providers.openrouter.apiKey`, puis `OPENROUTER_API_KEY`.

## Reconnaissance vocale (audio entrant)

OpenRouter peut transcrire les pièces jointes vocales/audio entrantes via le chemin partagé OpenRouter`tools.media.audio` en utilisant son point de terminaison STT (`/audio/transcriptions`). Cela s'applique à tout plugin de canal qui transfère la voix/audio entrante vers la préanalyse de compréhension des médias.

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        models: [{ provider: "openrouter", model: "openai/whisper-large-v3-turbo" }],
      },
    },
  },
}
```

OpenClaw envoie les requêtes STT OpenRouter au format JSON avec de l'audio base64 sous OpenClawOpenRouter`input_audio`OpenRouterOpenAI (contrat STT OpenRouter), et non sous forme de téléchargements de formulaire multipart OpenAI.

## Authentification et en-têtes

OpenRouter utilise un jeton Bearer avec votre clé API en arrière-plan.

Sur les vraies requêtes OpenRouter (OpenRouter`https://openrouter.ai/api/v1`OpenClawOpenRouter), OpenClaw ajoute également les en-têtes d'attribution d'application documentés d'OpenRouter :

| En-tête                   | Valeur                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------ |
| `HTTP-Referer`            | `https://openclaw.ai`                                                                                  |
| `X-OpenRouter-Title`      | `OpenClaw`                                                                                             |
| `X-OpenRouter-Categories` | `cli-agent,cloud-agent,programming-app,creative-writing,writing-assistant,general-chat,personal-agent` |

<Warning>Si vous redirigez le fournisseur OpenRouter vers un autre proxy ou une autre URL de base, OpenClaw n'injecte **pas** ces en-têtes spécifiques à OpenRouter ni les marqueurs de cache Anthropic.</Warning>

## Configuration avancée

<AccordionGroup>
  <Accordion title="Response caching"OpenRouterOpenRouter>
    La mise en cache des réponses OpenRouter est optionnelle. Activez-la pour chaque modèle OpenRouter avec les paramètres du modèle :

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openrouter/auto": {
              params: {
                responseCache: true,
                responseCacheTtlSeconds: 300,
              },
            },
          },
        },
      },
    }
    ```OpenClaw

    OpenClaw envoie `X-OpenRouter-Cache: true` et, si configuré, `X-OpenRouter-Cache-TTL`. `responseCacheClear: true` force une actualisation pour la requête actuelle et stocke la réponse de remplacement. Les alias en snake_case (`response_cache`, `response_cache_ttl_seconds` et `response_cache_clear`OpenRouterAnthropic) sont également acceptés.

    Ceci est distinct de la mise en cache des invites du fournisseur et des marqueurs `cache_control` d'Anthropic d'OpenRouter. Il n'est appliqué que sur les routes `openrouter.ai` vérifiées, et non sur les URL de base de proxy personnalisées.

  </Accordion>

<Accordion title="AnthropicAnthropic cache markers" OpenRouterAnthropicOpenRouterAnthropic>
  Sur les routes OpenRouter vérifiées, les références de modèles Anthropic conservent les marqueurs `cache_control`OpenClaw spécifiques à OpenRouter qu'OpenClaw utilise pour une meilleure réutilisation du cache d'invites sur les blocs d'invites système/développeur.
</Accordion>

<Accordion title="AnthropicPréremplissage du raisonnement Anthropic">
  Sur les routes OpenRouter vérifiées, les références de modèle Anthropic avec le raisonnement activé suppriment les tours de préremplissage de l'assistant finals avant que la demande n'atteigne OpenRouter, conformément à la exigence de Anthropic selon laquelle les conversations de raisonnement doivent se terminer par un tour utilisateur.
</Accordion>

<Accordion title="Injection de pensée / raisonnement">
  Sur les routes non-`auto` prises en charge, OpenClaw mappe le niveau de pensée sélectionné sur les payloads de raisonnement du proxy OpenRouter. Les indices de modèle non pris en charge et `openrouter/auto` ignorent cette injection de raisonnement. Hunter Alpha ignore également le raisonnement proxy pour les références de modèle configurées obsolètes car OpenRouter pourrait renvoyer du texte de
  réponse finale dans les champs de raisonnement pour cette route retirée.
</Accordion>

<Accordion title="Relecture du raisonnement DeepSeek V4">
  Sur les routes OpenRouter vérifiées, `openrouter/deepseek/deepseek-v4-flash` et `openrouter/deepseek/deepseek-v4-pro` remplissent le `reasoning_content` manquant sur les tours d'assistant relus afin que les conversations de pensée/outils conservent la forme de suivi requise par DeepSeek V4. OpenClaw envoie des valeurs `reasoning_effort` prises en charge par OpenRouter pour ces routes ; `xhigh`
  est le niveau le plus élevé annoncé, et les remplacements obsolètes `max` sont mappés vers `xhigh`.
</Accordion>

<Accordion title="Mise en forme des requêtes OpenAI uniquement">OpenRouter passe toujours par le chemin compatible OpenAI de style proxy, donc la mise en forme native des requêtes OpenAI uniquement telle que `serviceTier`, les réponses `store`, les payloads de raisonnement compatibles OpenAI et les indices de cache de prompt ne sont pas transmis.</Accordion>

<Accordion title="Gemini-backed routes" OpenRouterOpenClaw>
  Les références OpenRouter soutenues par Gemini restent sur le chemin proxy-Gemini : OpenClaw y maintient le nettoyage des signatures de pensée de Gemini, mais n'active pas la validation native de relecture Gemini ou les réécritures d'amorçage.
</Accordion>

  <Accordion title="Provider routing metadata"OpenRouter>
    OpenRouter prend en charge un objet de requête `provider`OpenRouter pour le routage du fournisseur sous-jacent. Configurez une stratégie par défaut pour toutes les requêtes de modèle texte OpenRouter avec `models.providers.openrouter.params.provider` :

    ```json5
    {
      models: {
        providers: {
          openrouter: {
            params: {
              provider: {
                sort: "latency",
                require_parameters: true,
                data_collection: "deny",
              },
            },
          },
        },
      },
    }
    ```OpenClawOpenRouter

    OpenClaw transmet cet objet à OpenRouter en tant que payload de requête `provider`OpenRouter. Utilisez les champs snake_case documentés d'OpenRouter, notamment `sort`,
    `only`, `ignore`, `order`, `allow_fallbacks`, `require_parameters`,
    `data_collection`, `quantizations`, `max_price`, `preferred_max_latency`,
    `preferred_min_throughput`, `zdr`, et `enforce_distillable_text`.

    Les paramètres par modèle remplacent toujours l'objet de routage à l'échelle du fournisseur :

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openrouter/anthropic/claude-sonnet-4-6": {
              params: {
                provider: {
                  order: ["anthropic"],
                  allow_fallbacks: false,
                },
              },
            },
          },
        },
      },
    }
    ```OpenRouterAnthropicOpenAIOpenRouter

    Cela s'applique uniquement aux routes de complétions de chat OpenRouter. Les routes directes Anthropic,
    Google, OpenAI ou de fournisseurs personnalisés ignorent les paramètres de routage OpenRouter.

  </Accordion>
</AccordionGroup>

## Connexes

<CardGroup cols={2}>
  <Card title="Model selection" href="/en/concepts/model-providers" icon="layers">
    Choix des fournisseurs, des références de modèle et du comportement de basculement.
  </Card>
  <Card title="Configuration reference" href="/en/gateway/configuration-reference" icon="gear">
    Référence de configuration complète pour les agents, les modèles et les fournisseurs.
  </Card>
</CardGroup>
