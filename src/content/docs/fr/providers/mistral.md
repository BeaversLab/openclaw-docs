---
summary: "Utiliser les modèles Mistral et la transcription Voxtral avec OpenClaw"
read_when:
  - You want to use Mistral models in OpenClaw
  - You want Voxtral realtime transcription for Voice Call
  - You need Mistral API key onboarding and model refs
title: "Mistral"
---

OpenClaw inclut un plugin Mistral intégré qui enregistre quatre contrats : complétions de chat, compréhension des médias (transcription par lots Voxtral), STT en temps réel pour les appels vocaux (Voxtral Realtime) et embeddings mémoire (`mistral-embed`).

| Propriété                | Valeur                                      |
| ------------------------ | ------------------------------------------- |
| ID du fournisseur        | `mistral`                                   |
| Plugin                   | intégré, `enabledByDefault: true`           |
| Variable d'env d'auth    | `MISTRAL_API_KEY`                           |
| Indicateur d'intégration | `--auth-choice mistral-api-key`             |
| Indicateur direct CLI    | `--mistral-api-key <key>`                   |
| API                      | Compatible OpenAI (`openai-completions`)    |
| URL de base              | `https://api.mistral.ai/v1`                 |
| model par défaut         | `mistral/mistral-large-latest`              |
| model d'intégration      | `mistral-embed`                             |
| Voxtral batch            | `voxtral-mini-latest` (transcription audio) |
| Voxtral realtime         | `voxtral-mini-transcribe-realtime-2602`     |

## Getting started

<Steps>
  <Step title="Obtenez votre clé API">
    Créez une clé API dans la [Mistral Console](https://console.mistral.ai/).
  </Step>
  <Step title="Lancer l'onboarding">
    ```bash
    openclaw onboard --auth-choice mistral-api-key
    ```

    Ou passez la clé directement :

    ```bash
    openclaw onboard --mistral-api-key "$MISTRAL_API_KEY"
    ```

  </Step>
  <Step title="Définir un model par défaut">
    ```json5
    {
      env: { MISTRAL_API_KEY: "sk-..." },
      agents: { defaults: { model: { primary: "mistral/mistral-large-latest" } } },
    }
    ```
  </Step>
  <Step title="Vérifier que le model est disponible">
    ```bash
    openclaw models list --provider mistral
    ```
  </Step>
</Steps>

## Catalogue LLM intégré

[Mistral Medium 3.5](https://docs.mistral.ai/models/model-cards/mistral-medium-3-5-26-04)
est le model Medium mixte actuel dans le catalogue inclus : 128B de poids denses,
entrée texte et image, contexte de 256K, appel de fonction, sortie structurée, codage,
et raisonnement ajustable via l'API de complétions de chat. Utilisez
`mistral/mistral-medium-3-5` lorsque vous souhaitez le model agentic/de codage unifié plus récent de Mistral
au lieu du `mistral/mistral-large-latest` par défaut.

OpenClaw fournit actuellement ce catalogue Mistral inclus :

| Réf model                        | Entrée       | Contexte | Sortie max | Remarques                                                             |
| -------------------------------- | ------------ | -------- | ---------- | --------------------------------------------------------------------- |
| `mistral/mistral-large-latest`   | texte, image | 262 144  | 16 384     | Modèle par défaut                                                     |
| `mistral/mistral-medium-2508`    | texte, image | 262 144  | 8 192      | Mistral Medium 3.1                                                    |
| `mistral/mistral-medium-3-5`     | texte, image | 262 144  | 8 192      | Mistral Medium 3.5 ; raisonnement ajustable                           |
| `mistral/mistral-small-latest`   | texte, image | 128 000  | 16 384     | Mistral Small 4 ; raisonnement ajustable via l'API `reasoning_effort` |
| `mistral/pixtral-large-latest`   | texte, image | 128 000  | 32 768     | Pixtral                                                               |
| `mistral/codestral-latest`       | texte        | 256 000  | 4 096      | Codage                                                                |
| `mistral/devstral-medium-latest` | texte        | 262 144  | 32 768     | Devstral 2                                                            |
| `mistral/magistral-small`        | texte        | 128 000  | 40 000     | Raisonnement activé                                                   |

Après l'onboarding, testez fumée le Medium 3.5 sans démarrer la Gateway :

```bash
openclaw infer model run --local \
  --model mistral/mistral-medium-3-5 \
  --prompt "Reply with exactly: mistral-ok" \
  --json
```

Pour parcourir la ligne du catalogue intégré avant de modifier la configuration :

```bash
openclaw models list --all --provider mistral --plain
```

## Transcription audio (Voxtral)

Utilisez Voxtral pour la transcription audio par lots via le pipeline
d compréhension des médias.

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

<Tip>Le chemin de transcription des médias utilise `/v1/audio/transcriptions`. Le model audio par défaut pour Mistral est `voxtral-mini-latest`.</Tip>

## STT en streaming pour appels vocaux

Le plugin `mistral` inclus enregistre Voxtral Realtime en tant que provider
STT en streaming pour appels vocaux.

| Paramètre              | Chemin de configuration                                                | Par défaut                              |
| ---------------------- | ---------------------------------------------------------------------- | --------------------------------------- |
| Clé API                | `plugins.entries.voice-call.config.streaming.providers.mistral.apiKey` | Revient à `MISTRAL_API_KEY`             |
| Model                  | `...mistral.model`                                                     | `voxtral-mini-transcribe-realtime-2602` |
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

<Note>OpenClaw configure par défaut la STT en temps réel de Mistral sur `pcm_mulaw` à 8 kHz afin que Voice Call puisse transmettre directement les trames médias Twilio. N'utilisez `encoding: "pcm_s16le"` et un `sampleRate` correspondant que si votre flux amont est déjà du PCM brut.</Note>

## Configuration avancée

<AccordionGroup>
  <Accordion title="Raisonnement ajustable">
    `mistral/mistral-small-latest` (Mistral Small 4) et `mistral/mistral-medium-3-5` prennent en charge le [raisonnement ajustable](https://docs.mistral.ai/studio-api/conversations/reasoning/adjustable) sur l'API des compléments de chat via `reasoning_effort` (`none` minimise la réflexion supplémentaire dans la sortie ; `high` affiche les traces complètes de réflexion avant la réponse finale). Mistral recommande `reasoning_effort="high"` pour les cas d'usage agents et code de Medium 3.5.

    OpenClaw mappe le niveau de réflexion (**thinking**) de session à l'API de Mistral :

    | Niveau de réflexion OpenClaw                          | `reasoning_effort` de Mistral |
    | ------------------------------------------------ | -------------------------- |
    | **off** / **minimal**                            | `none`                     |
    | **low** / **medium** / **high** / **xhigh** / **adaptive** / **max** | `high`     |

    <Warning>
    Ne combinez pas le mode de raisonnement Medium 3.5 avec `temperature: 0`. L'API HTTP de Mistral rejette `reasoning_effort="high"` plus `temperature: 0` avec une réponse
    400. Laissez la température non définie pour que Mistral utilise sa valeur par défaut, ou suivez
    les [paramètres recommandés pour Medium 3.5](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B)
    et utilisez `temperature: 0.7` pour un raisonnement élevé. Pour des réponses directes
    déterministes, désactivez ou minimisez la réflexion afin que OpenClaw envoie
    `reasoning_effort: "none"` avant que vous ne baissiez la température.
    </Warning>

    Exemple de configuration limitée au modèle pour le raisonnement Medium 3.5 :

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "mistral/mistral-medium-3-5" },
          models: {
            "mistral/mistral-medium-3-5": {
              params: { thinking: "high" },
            },
          },
        },
      },
    }
    ```

    <Note>
    Les autres modèles du catalogue Mistral inclus n'utilisent pas ce paramètre. Continuez à utiliser les modèles `magistral-*` lorsque vous souhaitez le comportement prioritaire au raisonnement natif de Mistral.
    </Note>

  </Accordion>

  <Accordion title="Memory embeddings">
    Mistral peut fournir des embeddings de mémoire via `/v1/embeddings` (modèle par défaut : `mistral-embed`).

    ```json5
    {
      memorySearch: { provider: "mistral" },
    }
    ```

  </Accordion>

  <Accordion title="Auth and base URL">
    - L'authentification Mistral utilise `MISTRAL_API_KEY` (en-tête Bearer).
    - L'URL de base du fournisseur est par défaut `https://api.mistral.ai/v1` et accepte le format de requête standard de complétion de chat compatible OpenAI.
    - Le modèle par défaut pour l'onboarding est `mistral/mistral-large-latest`.
    - Ne modifiez l'URL de base sous `models.providers.mistral.baseUrl` que lorsque Mistral publie explicitement un point de terminaison régional dont vous avez besoin.

  </Accordion>
</AccordionGroup>

## Related

<CardGroup cols={2}>
  <Card title="Sélection de modèle" href="/fr/concepts/model-providers" icon="layers">
    Choix des providers, références de modèle et comportement de basculement.
  </Card>
  <Card title="Compréhension des médias" href="/fr/nodes/media-understanding" icon="microphone">
    Configuration de la transcription audio et sélection du provider.
  </Card>
</CardGroup>
