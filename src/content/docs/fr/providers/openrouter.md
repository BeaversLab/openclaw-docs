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
  <Step title="Exécuter l'intégration">
    ```bash
    openclaw onboard --auth-choice openrouter-api-key
    ```
  </Step>
  <Step title="(Facultatif) Passer à un modèle spécifique">
    L'intégration est définie par défaut sur `openrouter/auto`. Choisissez un modèle concret plus tard :

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
Les références de modèle suivent le modèle `openrouter/<provider>/<model>`. Pour la liste complète des
fournisseurs et modèles disponibles, consultez [/concepts/model-providers](/fr/concepts/model-providers).
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

OpenClaw envoie les demandes d'images à l'API de complétion de chat d'image de OpenRouterAPI avec `modalities: ["image", "text"]`. Les modèles d'image Gemini reçoivent les indices `aspectRatio` et `resolution` pris en charge via `image_config` de OpenRouter. Utilisez `agents.defaults.imageGenerationModel.timeoutMs` pour les modèles d'image OpenRouter plus lents ; le paramètre `timeoutMs` par appel de l'outil `image_generate` l'emporte toujours.

## Génération vidéo

OpenRouter peut également prendre en charge l'outil `video_generate` via son API `/videos` asynchrone API. Utilisez un modèle vidéo OpenRouter sous `agents.defaults.videoGenerationModel` :

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

OpenClaw soumet des tâches de synthèse vidéo et d'image vers vidéo à OpenRouter, interroge le OpenClawOpenRouter`polling_url`OpenRouter renvoyé, et télécharge la vidéo terminée depuis le `unsigned_urls` d'OpenRouter ou depuis le point de terminaison de contenu de tâche documenté. Par défaut, les images de référence sont envoyées en tant que première/dernière images ; les images marquées avec `reference_image`OpenRouter sont envoyées en tant que références d'entrée OpenRouter. Le `google/veo-3.1-fast` par défaut inclus annonce les durées de 4/6/8 secondes actuellement prises en charge, les résolutions `720P`/`1080P` et les rapports d'aspect `16:9`/`9:16`OpenRouterAPI. La vidéo vers vidéo n'est pas enregistrée pour OpenRouter car l'API de génération vidéo en amont accepte actuellement des références textuelles et image.

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

Le fournisseur de musique OpenRouter inclus par défaut est OpenRouter`google/lyria-3-pro-preview` et expose également `google/lyria-3-clip-preview`OpenClaw. OpenClaw envoie `modalities: ["text", "audio"]`, active le streaming, collecte les segments audio diffusés, et enregistre le résultat en tant que média généré pour la diffusion sur le channel. Les images de référence sont acceptées pour les modèles Lyria via le paramètre partagé `music_generate image=...`.

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

OpenRouter peut transcrire les pièces jointes vocales/audio entrantes via le chemin partagé OpenRouter`tools.media.audio` en utilisant son point de terminaison STT (`/audio/transcriptions`). Cela s'applique à tout plugin de canal qui transmet la voix/audio entrant dans la pré-vérification de compréhension des médias.

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

OpenClaw envoie les demandes STT OpenRouter au format JSON avec de l'audio en base64 sous OpenClawOpenRouter`input_audio`OpenRouterOpenAI (contrat STT OpenRouter), et non sous forme de téléchargements de formulaires multipart OpenAI.

## Authentification et en-têtes

OpenRouter utilise un jeton Bearer avec votre clé API en arrière-plan.

Sur les véritables demandes OpenRouter (OpenRouter`https://openrouter.ai/api/v1`OpenClawOpenRouter), OpenClaw ajoute également les en-têtes d'attribution d'application documentés d'OpenRouter :

| En-tête                   | Valeur                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------ |
| `HTTP-Referer`            | `https://openclaw.ai`                                                                                  |
| `X-OpenRouter-Title`      | `OpenClaw`                                                                                             |
| `X-OpenRouter-Categories` | `cli-agent,cloud-agent,programming-app,creative-writing,writing-assistant,general-chat,personal-agent` |

<Warning>Si vous redirigez le fournisseur OpenRouter vers un autre proxy ou une autre URL de base, OpenClaw n'injecte **pas** ces en-têtes spécifiques à OpenRouter ni les marqueurs de cache Anthropic.</Warning>

## Configuration avancée

<AccordionGroup>
  <Accordion title="Response caching">
    OpenRouter response caching est optionnel. Activez-le pour chaque modèle OpenRouter via
    les paramètres du modèle :

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
    ```

    OpenClaw envoie `X-OpenRouter-Cache: true` et, lorsqu'il est configuré,
    `X-OpenRouter-Cache-TTL`. `responseCacheClear: true` force une actualisation pour
    la demande actuelle et stocke la réponse de remplacement. Les alias snake_case
    (`response_cache`, `response_cache_ttl_seconds` et
    `response_cache_clear`) sont également acceptés.

    Ceci est distinct du cache des invites du fournisseur et des marqueurs
    `cache_control` d'OpenRouter Anthropic. Il n'est appliqué que sur les routes
    `openrouter.ai` vérifiées, et non sur les URL de base de proxy personnalisées.

  </Accordion>

<Accordion title="Anthropic cache markers">Sur les routes OpenRouter vérifiées, les références de modèle Anthropic conservent les marqueurs `cache_control` OpenRouter spécifiques à Anthropic que OpenClaw utilise pour une meilleure réutilisation du cache d'invites sur les blocs d'invites système/développeur.</Accordion>

<Accordion title="Anthropic reasoning prefill">Sur les routes OpenRouter vérifiées, les références de modèle Anthropic avec le raisonnement activé suppriment les tours de préremplissage de l'assistant à la fin avant que la demande n'atteigne OpenRouter, conformément à la exigence d'Anthropic selon laquelle les conversations de raisonnement doivent se terminer par un tour utilisateur.</Accordion>

<Accordion title="Thinking / reasoning injection">
  Sur les routes non `auto`OpenClawOpenRouter prises en charge, OpenClaw mappe le niveau de réflexion sélectionné aux payloads de raisonnement du proxy OpenRouter. Les indications de model non prises en charge et `openrouter/auto`OpenRouter ignorent cette injection de raisonnement. Hunter Alpha ignore également le raisonnement proxy pour les références de model configurées obsolètes car OpenRouter
  pourrait renvoyer du texte de réponse finale dans les champs de raisonnement pour cette route retirée.
</Accordion>

<Accordion title="DeepSeek V4 reasoning replay" OpenRouter>
  Sur les routes OpenRouter vérifiées, `openrouter/deepseek/deepseek-v4-flash` et `openrouter/deepseek/deepseek-v4-pro` remplissent les `reasoning_content`OpenClawOpenRouter manquantes sur les tours d'assistant rejoués pour que les conversations de réflexion/outil conservent la forme de suivi requise par DeepSeek V4. OpenClaw envoie les valeurs `reasoning_effort` prises en charge par OpenRouter
  pour ces routes ; `xhigh` est le niveau annoncé le plus élevé, et les `max` obsolètes sont mappées à `xhigh`.
</Accordion>

<Accordion title="OpenAIOpenAI-only request shaping" OpenRouterOpenAIOpenAI>
  OpenRouter passe toujours par le chemin compatible OpenAI de style proxy, donc le façonnement des requêtes natif uniquement OpenAI tel que `serviceTier`, Responses `store`OpenAI, les payloads de compatibilité de raisonnement OpenAI, et les indications de cache de prompt ne sont pas transmis.
</Accordion>

<Accordion title="Gemini-backed routes" OpenRouterOpenClaw>
  Les références OpenRouter soutenues par Gemini restent sur le chemin proxy-Gemini : OpenClaw y maintient le nettoyage des signatures de pensée Gemini, mais n'active pas la validation de rejouage natif Gemini ou les réécritures d'amorçage.
</Accordion>

  <Accordion title="Provider routing metadata"OpenRouterOpenClawOpenRouter>
    Si vous transmettez le routage du fournisseur OpenRouter sous les paramètres du modèle, OpenClaw le transfère
    en tant que métadonnées de routage OpenRouter avant l'exécution des wrappers de flux partagés.
  </Accordion>
</AccordionGroup>

## Connexes

<CardGroup cols={2}>
  <Card title="Model selection" href="/fr/concepts/model-providers" icon="layers">
    Choix des fournisseurs, références de modèles et comportement de basculement.
  </Card>
  <Card title="Configuration reference" href="/fr/gateway/configuration-reference" icon="gear">
    Référence complète de la configuration pour les agents, les modèles et les fournisseurs.
  </Card>
</CardGroup>
