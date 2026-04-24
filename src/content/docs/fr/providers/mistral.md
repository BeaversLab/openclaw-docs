---
summary: "Utilisez les modèles Mistral et la transcription Voxtral avec OpenClaw"
read_when:
  - You want to use Mistral models in OpenClaw
  - You want Voxtral realtime transcription for Voice Call
  - You need Mistral API key onboarding and model refs
title: "Mistral"
---

# Mistral

OpenClaw prend en charge Mistral pour le routage de modèles texte/image (`mistral/...`) ainsi que
pour la transcription audio via Voxtral dans le cadre de la compréhension des médias.
Mistral peut également être utilisé pour les embeddings de mémoire (`memorySearch.provider = "mistral"`).

- Fournisseur : `mistral`
- Auth : `MISTRAL_API_KEY`
- API : Mistral Chat Completions (`https://api.mistral.ai/v1`)

## Getting started

<Steps>
  <Step title="Obtenez votre clé API">
    Créez une clé API dans la [Mistral Console](https://console.mistral.ai/).
  </Step>
  <Step title="Exécutez l'onboarding">
    ```bash
    openclaw onboard --auth-choice mistral-api-key
    ```

    Ou passez la clé directement :

    ```bash
    openclaw onboard --mistral-api-key "$MISTRAL_API_KEY"
    ```

  </Step>
  <Step title="Définir un modèle par défaut">
    ```json5
    {
      env: { MISTRAL_API_KEY: "sk-..." },
      agents: { defaults: { model: { primary: "mistral/mistral-large-latest" } } },
    }
    ```
  </Step>
  <Step title="Vérifiez que le modèle est disponible">
    ```bash
    openclaw models list --provider mistral
    ```
  </Step>
</Steps>

## Catalogue LLM intégré

OpenClaw fournit actuellement ce catalogue Mistral intégré :

| Modèle ref                       | Entrée       | Contexte | Max sortie | Notes                                                                 |
| -------------------------------- | ------------ | -------- | ---------- | --------------------------------------------------------------------- |
| `mistral/mistral-large-latest`   | texte, image | 262 144  | 16 384     | Modèle par défaut                                                     |
| `mistral/mistral-medium-2508`    | texte, image | 262 144  | 8 192      | Mistral Medium 3.1                                                    |
| `mistral/mistral-small-latest`   | texte, image | 128 000  | 16 384     | Mistral Small 4 ; raisonnement ajustable via l'API `reasoning_effort` |
| `mistral/pixtral-large-latest`   | texte, image | 128 000  | 32 768     | Pixtral                                                               |
| `mistral/codestral-latest`       | texte        | 256 000  | 4 096      | Codage                                                                |
| `mistral/devstral-medium-latest` | texte        | 262 144  | 32 768     | Devstral 2                                                            |
| `mistral/magistral-small`        | texte        | 128 000  | 40 000     | Activer le raisonnement                                               |

## Transcription audio (Voxtral)

Utilisez Voxtral pour la transcription audio par lots via le pipeline
de compréhension des médias.

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        models: [{ provider: "mistral", model: "voxtral-mini-latest" }],
      },
    },
  },
}
```

<Tip>Le chemin de transcription des médias utilise `/v1/audio/transcriptions`. Le modèle audio par défaut pour Mistral est `voxtral-mini-latest`.</Tip>

## STT en continu pour les appels vocaux

Le plugin `mistral` inclus enregistre Voxtral Realtime en tant que fournisseur
STT en continu pour les appels vocaux.

| Paramètre              | Chemin de configuration                                                | Par défaut                              |
| ---------------------- | ---------------------------------------------------------------------- | --------------------------------------- |
| Clé API                | `plugins.entries.voice-call.config.streaming.providers.mistral.apiKey` | Revient à `MISTRAL_API_KEY`             |
| Modèle                 | `...mistral.model`                                                     | `voxtral-mini-transcribe-realtime-2602` |
| Encodage               | `...mistral.encoding`                                                  | `pcm_mulaw`                             |
| Taux d'échantillonnage | `...mistral.sampleRate`                                                | `8000`                                  |
| Délai cible            | `...mistral.targetStreamingDelayMs`                                    | `800`                                   |

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          streaming: {
            enabled: true,
            provider: "mistral",
            providers: {
              mistral: {
                apiKey: "${MISTRAL_API_KEY}",
                targetStreamingDelayMs: 800,
              },
            },
          },
        },
      },
    },
  },
}
```

<Note>OpenClaw configure par défaut la STT temps réel Mistral sur `pcm_mulaw` à 8 kHz afin que Voice Call puisse transmettre directement les trames média Twilio. N'utilisez `encoding: "pcm_s16le"` et un `sampleRate` correspondant que si votre flux amont est déjà en PCM brut.</Note>

## Configuration avancée

<AccordionGroup>
  <Accordion title="Raisonnement ajustable (mistral-small-latest)">
    `mistral/mistral-small-latest` correspond à Mistral Small 4 et prend en charge le [raisonnement ajustable](https://docs.mistral.ai/capabilities/reasoning/adjustable) sur l'API de Chat Completions via `reasoning_effort` (`none` minimise la réflexion supplémentaire dans la sortie ; `high` affiche les traces de réflexion complètes avant la réponse finale).

    OpenClaw mappe le niveau de réflexion (**thinking**) de la session à l'API de Mistral :

    | Niveau de réflexion OpenClaw                          | `reasoning_effort` Mistral |
    | ------------------------------------------------ | -------------------------- |
    | **off** / **minimal**                            | `none`                     |
    | **low** / **medium** / **high** / **xhigh** / **adaptive** / **max** | `high`     |

    <Note>
    Les autres modèles du catalogue Mistral groupés n'utilisent pas ce paramètre. Continuez à utiliser les modèles `magistral-*` lorsque vous souhaitez le comportement natif privilégiant d'abord le raisonnement de Mistral.
    </Note>

  </Accordion>

  <Accordion title="Embeddings de mémoire">
    Mistral peut fournir des embeddings de mémoire via `/v1/embeddings` (modèle par défaut : `mistral-embed`).

    ```json5
    {
      memorySearch: { provider: "mistral" },
    }
    ```

  </Accordion>

  <Accordion title="Auth et URL de base">
    - L'authentification Mistral utilise `MISTRAL_API_KEY`.
    - L'URL de base du fournisseur est `https://api.mistral.ai/v1` par défaut.
    - Le modèle par défaut pour l'intégration est `mistral/mistral-large-latest`.
    - Z.AI utilise l'authentification Bearer avec votre clé API.
  </Accordion>
</AccordionGroup>

## Connexes

<CardGroup cols={2}>
  <Card title="Sélection de modèle" href="/fr/concepts/model-providers" icon="layers">
    Choix des providers, références de modèle et comportement de basculement.
  </Card>
  <Card title="Compréhension des médias" href="/fr/nodes/media-understanding" icon="microphone">
    Configuration de la transcription audio et sélection du provider.
  </Card>
</CardGroup>
