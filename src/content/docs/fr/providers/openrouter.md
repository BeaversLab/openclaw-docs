---
summary: "Utilisez l'API unifiée d'OpenRouterAPI pour accéder à de nombreux modèles dans OpenClaw"
read_when:
  - You want a single API key for many LLMs
  - You want to run models via OpenRouter in OpenClaw
  - You want to use OpenRouter for image generation
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
Les références de modèles suivent le modèle `openrouter/<provider>/<model>`. Pour la liste complète des
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

OpenClaw envoie des demandes d'image à l'API de complétion de chat d'image d'OpenRouterAPI avec `modalities: ["image", "text"]`. Les modèles d'image Gemini reçoivent des indices `aspectRatio` et `resolution` pris en charge via `image_config` d'OpenRouter. Utilisez `agents.defaults.imageGenerationModel.timeoutMs` pour les modèles d'image OpenRouter plus lents ; le paramètre `timeoutMs` par appel de l'outil `image_generate` l'emporte toujours.

## Génération vidéo

OpenRouter peut également prendre en charge l'outil `video_generate` via son API `/videos`. Utilisez un modèle vidéo OpenRouter sous `agents.defaults.videoGenerationModel` :

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

OpenClaw soumet des tâches de synthèse vidéo et de vidéo par image à OpenRouter, interroge le OpenClawOpenRouter`polling_url`OpenRouter renvoyé et télécharge la vidéo terminée depuis le `unsigned_urls` d'OpenRouter ou le point de terminaison de contenu de tâche documenté. Les images de référence sont envoyées en tant qu'images de première/dernière image par défaut ; les images balisées avec `reference_image`OpenRouter sont envoyées en tant que références d'entrée OpenRouter. La valeur par défaut du `google/veo-3.1-fast` inclus annonce les durées actuellement prises en charge de 4/6/8 secondes, les résolutions `720P`/`1080P` et les rapports d'aspect `16:9`/`9:16`OpenRouterAPI. La vidéo-à-vidéo n'est pas enregistrée pour OpenRouter car l'API de génération vidéo en amont accepte actuellement des références de texte et d'image.

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

## Speech-to-text (inbound audio)

OpenRouter peut transcrire les pièces jointes vocales/audio entrantes via le chemin partagé OpenRouter`tools.media.audio` en utilisant son point de terminaison STT (`/audio/transcriptions`). Cela s'applique à tout plugin de canal qui transfère la voix/audio entrant dans la prévol de compréhension des médias.

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

OpenClaw envoie les requêtes STT OpenRouter sous forme de JSON avec de l'audio en base64 sous OpenClawOpenRouter`input_audio`OpenRouterOpenAI (contrat STT OpenRouter), et non sous forme de téléchargements de formulaires multipart OpenAI.

## Authentication and headers

OpenRouter utilise un jeton Bearer avec votre clé API en arrière-plan.

Sur les vraies requêtes OpenRouter (OpenRouter`https://openrouter.ai/api/v1`OpenClawOpenRouter), OpenClaw ajoute également les en-têtes d'attribution d'application documentés d'OpenRouter :

| En-tête                   | Valeur                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------ |
| `HTTP-Referer`            | `https://openclaw.ai`                                                                                  |
| `X-OpenRouter-Title`      | `OpenClaw`                                                                                             |
| `X-OpenRouter-Categories` | `cli-agent,cloud-agent,programming-app,creative-writing,writing-assistant,general-chat,personal-agent` |

<Warning>Si vous redirigez le fournisseur OpenRouter vers un autre proxy ou une URL de base, OpenClaw n'injecte **pas** ces en-têtes spécifiques à OpenRouter ou les marqueurs de cache Anthropic.</Warning>

## Configuration avancée

<AccordionGroup>
  <Accordion title="Response caching">
    La mise en cache des réponses de OpenRouter est optionnelle. Activez-la pour chaque model OpenRouter avec
    les paramètres du model :

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

    OpenClaw envoie `X-OpenRouter-Cache: true` et, si configuré,
    `X-OpenRouter-Cache-TTL`. `responseCacheClear: true` force un rafraîchissement pour
    la requête actuelle et stocke la réponse de remplacement. Les alias en snake_case
    (`response_cache`, `response_cache_ttl_seconds` et
    `response_cache_clear`) sont également acceptés.

    Ceci est distinct de la mise en cache des invites du fournisseur et des marqueurs
    `cache_control` de OpenRouter Anthropic. Elle n'est appliquée que sur les routes
    `openrouter.ai` vérifiées, et non sur les URL de base de proxy personnalisées.

  </Accordion>

<Accordion title="Marqueurs de cache Anthropic">Sur les routes OpenRouter vérifiées, les références de model Anthropic conservent les marqueurs `cache_control` OpenRouter spécifiques à Anthropic que OpenClaw utilise pour une meilleure réutilisation du cache d'invite sur les blocs d'invite système/développeur.</Accordion>

<Accordion title="Préremplissage du raisonnement Anthropic">
  Sur les routes OpenRouter vérifiées, les références de model Anthropic avec le raisonnement activé suppriment les tours de préremplissage de l'assistant à la fin avant que la requête n'atteigne OpenRouter, conformément à la exigence de Anthropic selon laquelle les conversations de raisonnement doivent se terminer par un tour utilisateur.
</Accordion>

<Accordion title="Thinking / reasoning injection">
  Sur les routes non-`auto`OpenClawOpenRouter prises en charge, OpenClaw mappe le niveau de réflexion sélectionné sur les payloads de raisonnement de proxy OpenRouter. Les indications de model non prises en charge et `openrouter/auto`OpenRouter ignorent cette injection de raisonnement. Hunter Alpha ignore également le raisonnement proxy pour les références de model configurées obsolètes car
  OpenRouter pourrait renvoyer du texte de réponse finale dans les champs de raisonnement pour cette route retirée.
</Accordion>

<Accordion title="DeepSeek V4 reasoning replay" OpenRouter>
  Sur les routes OpenRouter vérifiées, `openrouter/deepseek/deepseek-v4-flash` et `openrouter/deepseek/deepseek-v4-pro` remplissent les `reasoning_content`OpenClawOpenRouter manquants sur les tours d'assistant rejoués afin que les conversations de réflexion/outils conservent la forme de suivi requise par DeepSeek V4. OpenClaw envoie des valeurs `reasoning_effort` prises en charge par OpenRouter
  pour ces routes ; `xhigh` est le niveau le plus élevé annoncé, et les substitutions obsolètes `max` sont mappées vers `xhigh`.
</Accordion>

<Accordion title="OpenAIOpenAI-only request shaping" OpenRouterOpenAIOpenAI>
  OpenRouter passe toujours par le chemin compatible OpenAI de style proxy, donc le façonnage de requête natif OpenAI-only tel que `serviceTier`, Responses `store`OpenAI, les payloads de raisonnement compatibles OpenAI, et les indications de cache de prompt ne sont pas transmis.
</Accordion>

<Accordion title="Gemini-backed routes" OpenRouterOpenClaw>
  Les références OpenRouter soutenues par Gemini restent sur le chemin proxy-Gemini : OpenClaw y conserve le nettoyage de la signature de pensée Gemini, mais n'active pas la validation de relecture native Gemini ni les réécritures d'amorçage.
</Accordion>

  <Accordion title="Provider routing metadata"OpenRouterOpenClawOpenRouter>
    Si vous transmettez le routage du fournisseur OpenRouter sous les paramètres du modèle, OpenClaw le transfère
    en tant que métadonnées de routage OpenRouter avant l'exécution des wrappers de flux partagés.
  </Accordion>
</AccordionGroup>

## Connexes

<CardGroup cols={2}>
  <Card title="Model selection" href="/fr/concepts/model-providers" icon="layers">
    Choix des fournisseurs, des références de modèles et du comportement de basculement.
  </Card>
  <Card title="Configuration reference" href="/fr/gateway/configuration-reference" icon="gear">
    Référence complète de la configuration pour les agents, les modèles et les fournisseurs.
  </Card>
</CardGroup>
