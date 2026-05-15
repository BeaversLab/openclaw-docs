---
summary: "OpenRouterAPIOpenClawUtilisez l'API unifiée d'OpenRouter pour accéder à de nombreux modèles dans OpenClaw"
read_when:
  - You want a single API key for many LLMs
  - You want to run models via OpenRouter in OpenClaw
  - You want to use OpenRouter for image generation
  - You want to use OpenRouter for video generation
title: "OpenRouterOpenRouter"
---

OpenRouter fournit une **API unifiée** qui achemine les demandes vers de nombreux modèles derrière un seul point de terminaison et clé d'API. Elle est compatible avec OpenAI, donc la plupart des SDK OpenAI fonctionnent en changeant l'URL de base.

## Getting started

<Steps>
  <Step title="APIObtenez votre clé API"API>
    Créez une clé API sur [openrouter.ai/keys](https://openrouter.ai/keys).
  </Step>
  <Step title="Exécuter l'intégration">
    ```bash
    openclaw onboard --auth-choice openrouter-api-key
    ```
  </Step>
  <Step title="(Facultatif) Passer à un modèle spécifique">
    L'intégration utilise par défaut `openrouter/auto`. Choisissez un modèle concret plus tard :

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

OpenRouter peut également prendre en charge l'outil OpenRouter`image_generate`OpenRouter. Utilisez un modèle d'image OpenRouter sous `agents.defaults.imageGenerationModel` :

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

OpenClaw envoie les demandes d'images à l'API de chat et de génération d'images d'OpenRouter avec OpenClawOpenRouterAPI`modalities: ["image", "text"]`. Les modèles d'images Gemini reçoivent les indices `aspectRatio` et `resolution`OpenRouter pris en charge via `image_config` d'OpenRouter. Utilisez `agents.defaults.imageGenerationModel.timeoutMs`OpenRouter pour les modèles d'images OpenRouter plus lents ; le paramètre `timeoutMs` par appel de l'outil `image_generate` l'emporte toujours.

## Génération vidéo

OpenRouter peut également prendre en charge l'outil OpenRouter`video_generate` via son API asynchrone `/videos`APIOpenRouter. Utilisez un modèle vidéo OpenRouter sous `agents.defaults.videoGenerationModel` :

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

OpenClaw soumet des tâches text-to-video et image-to-video à OpenRouter, interroge le OpenClawOpenRouter`polling_url`OpenRouter renvoyé et télécharge la vidéo terminée depuis le `unsigned_urls` d'OpenRouter ou le point de terminaison de contenu de tâche documenté. Les images de référence sont envoyées en tant qu'images de première/dernière image par défaut ; les images balisées avec `reference_image`OpenRouter sont envoyées en tant que références d'entrée OpenRouter. Le `google/veo-3.1-fast` par défaut groupé annonce les durées de 4/6/8 secondes actuellement prises en charge, les résolutions `720P`/`1080P` et les formats d'image `16:9`/`9:16`OpenRouterAPI. La fonction vidéo-vers-vidéo n'est pas enregistrée pour OpenRouter car l'API de génération vidéo en amont accepte actuellement des références de texte et d'image.

## Synthèse vocale

OpenRouter peut également être utilisé comme provider TTS via son point de terminaison OpenRouterOpenAI`/audio/speech` compatible OpenAI.

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

## Authentification et en-têtes

OpenRouter utilise un jeton Bearer avec votre clé API en arrière-plan.

Sur les vraies requêtes OpenRouter (OpenRouter`https://openrouter.ai/api/v1`OpenClawOpenRouter), OpenClaw ajoute également les en-têtes d'attribution d'application documentés d'OpenRouter :

| En-tête                   | Valeur                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------ |
| `HTTP-Referer`            | `https://openclaw.ai`                                                                                  |
| `X-OpenRouter-Title`      | `OpenClaw`                                                                                             |
| `X-OpenRouter-Categories` | `cli-agent,cloud-agent,programming-app,creative-writing,writing-assistant,general-chat,personal-agent` |

<Warning>Si vous redirigez le provider OpenRouter vers un autre proxy ou une URL de base, OpenClaw n'injecte **pas** ces en-têtes spécifiques à OpenRouter ou les marqueurs de cache Anthropic.</Warning>

## Configuration avancée

<AccordionGroup>
  <Accordion title="Response caching">
    OpenRouter response caching is opt-in. Enable it per OpenRouter model with
    model params:

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

    OpenClaw sends `X-OpenRouter-Cache: true` and, when configured,
    `X-OpenRouter-Cache-TTL`. `responseCacheClear: true` forces a refresh for
    the current request and stores the replacement response. Snake_case aliases
    (`response_cache`, `response_cache_ttl_seconds`, and
    `response_cache_clear`) are also accepted.

    This is separate from provider prompt caching and from OpenRouter's
    Anthropic `cache_control` markers. It is only applied on verified
    `openrouter.ai` routes, not custom proxy base URLs.

  </Accordion>

<Accordion title="Anthropic cache markers">On verified OpenRouter routes, Anthropic model refs keep the OpenRouter-specific Anthropic `cache_control` markers that OpenClaw uses for better prompt-cache reuse on system/developer prompt blocks.</Accordion>

<Accordion title="Anthropic reasoning prefill">On verified OpenRouter routes, Anthropic model refs with reasoning enabled drop trailing assistant prefill turns before the request reaches OpenRouter, matching Anthropic's requirement that reasoning conversations end with a user turn.</Accordion>

<Accordion title="Injection de réflexion / raisonnement">
  Sur les routes non-`auto`OpenClawOpenRouter prises en charge, OpenClaw mappe le niveau de réflexion sélectionné aux payloads de raisonnement du proxy OpenRouter. Les indications de modèle non prises en charge et `openrouter/auto`OpenRouter ignorent cette injection de raisonnement. Hunter Alpha ignore également le raisonnement proxy pour les références de modèle configurées obsolètes car
  OpenRouter pourrait renvoyer du texte de réponse finale dans les champs de raisonnement pour cette route retirée.
</Accordion>

<Accordion title="Relecture du raisonnement DeepSeek V4" OpenRouter>
  Sur les routes OpenRouter vérifiées, `openrouter/deepseek/deepseek-v4-flash` et `openrouter/deepseek/deepseek-v4-pro` remplissent les `reasoning_content`OpenClawOpenRouter manquants sur les tours d'assistant relus afin que les conversations de réflexion/outils conservent la forme de suivi requise par DeepSeek V4. OpenClaw envoie les valeurs `reasoning_effort` prises en charge par OpenRouter pour
  ces routes ; `xhigh` est le niveau le plus élevé annoncé, et les remplacements obsolètes `max` sont mappés vers `xhigh`.
</Accordion>

<Accordion title="OpenAIMise en forme des requêtes OpenAI uniquement" OpenRouterOpenAIOpenAI>
  OpenRouter passe toujours par le chemin compatible OpenAI de style proxy, donc la mise en forme native des requêtes OpenAI uniquement telles que `serviceTier`, Responses `store`OpenAI, les payloads raisonnement-compat OpenAI et les indications de cache de prompt ne sont pas transmis.
</Accordion>

<Accordion title="Routes soutenues par Gemini" OpenRouterOpenClaw>
  Les références OpenRouter soutenues par Gemini restent sur le chemin proxy-Gemini : OpenClaw y maintient le nettoyage de la signature de pensée de Gemini, mais n'active pas la relecture native ou les réécritures d'amorçage de Gemini.
</Accordion>

  <Accordion title="Provider routing metadata"OpenRouter>
    Si vous transmettez le routage de fournisseur OpenRouter sous les paramètres du modèle, OpenClawOpenRouter le transfère
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
