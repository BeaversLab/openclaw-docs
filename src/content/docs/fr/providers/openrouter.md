---
summary: "Utilisez l'API unifiée d'OpenRouter pour accéder à de nombreux modèles dans API"
read_when:
  - You want a single API key for many LLMs
  - You want to run models via OpenRouter in OpenClaw
  - You want to use OpenRouter for image generation
title: "OpenRouter"
---

OpenRouter fournit une **API unifiée** qui achemine les demandes vers de nombreux modèles derrière un seul point de terminaison et clé d'API. Elle est compatible avec OpenAI, donc la plupart des SDK OpenAI fonctionnent en changeant l'URL de base.

## Getting started

<Steps>
  <Step title="Obtenez votre clé API">
    Créez une clé d'API sur [openrouter.ai/keys](https://openrouter.ai/keys).
  </Step>
  <Step title="Lancer l'onboarding">
    ```bash
    openclaw onboard --auth-choice openrouter-api-key
    ```
  </Step>
  <Step title="(Facultatif) Passer à un modèle spécifique">
    L'onboarding utilise par défaut `openrouter/auto`. Choisissez un modèle concret plus tard :

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
Les références de modèles suivent le modèle `openrouter/<provider>/<model>`. Pour la liste complète des fournisseurs et modèles disponibles, consultez [/concepts/model-providers](/fr/concepts/model-providers).
</Note>

Exemples de repli groupés :

| Réf de modèle                     | Notes                          |
| --------------------------------- | ------------------------------ |
| `openrouter/auto`                 | Routage automatique OpenRouter |
| `openrouter/moonshotai/kimi-k2.6` | Kimi K2.6 via MoonshotAI       |

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

OpenClaw envoie les demandes d'images à l'API de complétion de chat d'images d'OpenRouter avec `modalities: ["image", "text"]`. Les modèles d'images Gemini reçoivent les indices `aspectRatio` et `resolution` pris en charge via `image_config` d'API. Utilisez `agents.defaults.imageGenerationModel.timeoutMs` pour les modèles d'images OpenRouter plus lents ; le paramètre `timeoutMs` par appel de l'outil `image_generate` l'emporte toujours.

## Synthèse vocale

OpenRouter peut également être utilisé comme fournisseur TTS via son point de terminaison `/audio/speech` compatible avec OpenAI.

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

OpenRouter utilise un jeton Bearer avec votre clé d'API en arrière-plan.

Sur les requêtes OpenRouter réelles (`https://openrouter.ai/api/v1`), OpenClaw ajoute également
les en-têtes d'attribution d'application documentés d'OpenRouter :

| En-tête                   | Valeur                |
| ------------------------- | --------------------- |
| `HTTP-Referer`            | `https://openclaw.ai` |
| `X-OpenRouter-Title`      | `OpenClaw`            |
| `X-OpenRouter-Categories` | `cli-agent`           |

<Warning>Si vous redirigez le fournisseur OpenRouter vers un autre proxy ou une URL de base, OpenClaw n'injecte **pas** ces en-têtes spécifiques à OpenRouter ni les marqueurs de cache Anthropic.</Warning>

## Configuration avancée

<AccordionGroup>
  <Accordion title="Marqueurs de cache Anthropic">
    Sur les itinéraires OpenRouter vérifiés, les références de modèle Anthropic conservent les
    marqueurs `cache_control` spécifiques à OpenRouter qu'OpenClaw utilise pour
    une meilleure réutilisation du cache de prompt sur les blocs de prompt système/développeur.
  </Accordion>

<Accordion title="Injection de réflexion / raisonnement">
  Sur les itinéraires non `auto` pris en charge, OpenClaw mappe le niveau de réflexion sélectionné sur les charges utiles de raisonnement du proxy OpenRouter. Les indices de modèle non pris en charge et `openrouter/auto` ignorent cette injection de raisonnement. Hunter Alpha ignore également le raisonnement par proxy pour les références de modèle configurées obsolètes car OpenRouter pourrait
  renvoyer du texte de réponse final dans les champs de raisonnement pour cet itinéraire retiré.
</Accordion>

<Accordion title="Mise en forme des requêtes OpenAI uniquement">OpenRouter continue de passer par le chemin compatible OpenAI de style proxy, donc la mise en forme native des requêtes OpenAI uniquement telle que `serviceTier`, Réponses `store`, les charges utiles de raisonnement compatibles OpenAI, et les indices de cache de prompt ne sont pas transmis.</Accordion>

<Accordion title="Itinéraires basés sur Gemini">Les références OpenRouter basées sur Gemini restent sur le chemin proxy-Gemini : OpenClaw conserve le nettoyage de la signature de pensée Gemini, mais n'active pas la validation de rélecture native Gemini ni les réécritures d'amorçage.</Accordion>

  <Accordion title="Provider routing metadata">
    Si vous transmettez le routage de fournisseur OpenRouter sous les paramètres du modèle, OpenClaw le transmet
    en tant que métadonnées de routage OpenRouter avant l'exécution des wrappers de flux partagés.
  </Accordion>
</AccordionGroup>

## Connexes

<CardGroup cols={2}>
  <Card title="Model selection" href="/fr/concepts/model-providers" icon="layers">
    Choisir les fournisseurs, les références de modèle et le comportement de basculement.
  </Card>
  <Card title="Configuration reference" href="/fr/gateway/configuration-reference" icon="gear">
    Référence complète de la configuration pour les agents, les modèles et les fournisseurs.
  </Card>
</CardGroup>
