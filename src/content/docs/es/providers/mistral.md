---
summary: "Usa los modelos de Mistral y la transcripción de Voxtral con OpenClaw"
read_when:
  - You want to use Mistral models in OpenClaw
  - You want Voxtral realtime transcription for Voice Call
  - You need Mistral API key onboarding and model refs
title: "Mistral"
---

OpenClaw es compatible con Mistral tanto para el enrutamiento de modelos de texto/imagen (`mistral/...`) como para la transcripción de audio mediante Voxtral en la comprensión de medios.
Mistral también se puede utilizar para incrustaciones de memoria (`memorySearch.provider = "mistral"`).

- Proveedor: `mistral`
- Autenticación: `MISTRAL_API_KEY`
- API: Mistral Chat Completions (`https://api.mistral.ai/v1`)

## Introducción

<Steps>
  <Step title="Obtenga su clave de API">
    Cree una clave de API en la [Consola de Mistral](https://console.mistral.ai/).
  </Step>
  <Step title="Ejecute la incorporación">
    ```bash
    openclaw onboard --auth-choice mistral-api-key
    ```

    O pase la clave directamente:

    ```bash
    openclaw onboard --mistral-api-key "$MISTRAL_API_KEY"
    ```

  </Step>
  <Step title="Establezca un modelo predeterminado">
    ```json5
    {
      env: { MISTRAL_API_KEY: "sk-..." },
      agents: { defaults: { model: { primary: "mistral/mistral-large-latest" } } },
    }
    ```
  </Step>
  <Step title="Verifique que el modelo esté disponible">
    ```bash
    openclaw models list --provider mistral
    ```
  </Step>
</Steps>

## Catálogo de LLM integrado

Actualmente, OpenClaw incluye este catálogo empaquetado de Mistral:

| Ref. de modelo                   | Entrada       | Contexto | Salida máxima | Notas                                                              |
| -------------------------------- | ------------- | -------- | ------------- | ------------------------------------------------------------------ |
| `mistral/mistral-large-latest`   | texto, imagen | 262,144  | 16,384        | Modelo predeterminado                                              |
| `mistral/mistral-medium-2508`    | texto, imagen | 262,144  | 8,192         | Mistral Medium 3.1                                                 |
| `mistral/mistral-small-latest`   | texto, imagen | 128,000  | 16,384        | Mistral Small 4; razonamiento ajustable vía API `reasoning_effort` |
| `mistral/pixtral-large-latest`   | texto, imagen | 128,000  | 32,768        | Pixtral                                                            |
| `mistral/codestral-latest`       | texto         | 256,000  | 4,096         | Codificación                                                       |
| `mistral/devstral-medium-latest` | texto         | 262,144  | 32,768        | Devstral 2                                                         |
| `mistral/magistral-small`        | texto         | 128,000  | 40,000        | Con razonamiento                                                   |

## Transcripción de audio (Voxtral)

Use Voxtral para la transcripción de audio por lotes a través de la canalización
de comprensión de medios.

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

<Tip>La ruta de transcripción de medios usa `/v1/audio/transcriptions`. El modelo de audio predeterminado para Mistral es `voxtral-mini-latest`.</Tip>

## STT de streaming para llamadas de voz

El complemento `mistral` incluido registra Voxtral Realtime como proveedor
de STT de streaming para llamadas de voz.

| Configuración          | Ruta de configuración                                                  | Predeterminado                          |
| ---------------------- | ---------------------------------------------------------------------- | --------------------------------------- |
| Clave de API           | `plugins.entries.voice-call.config.streaming.providers.mistral.apiKey` | Recurre a `MISTRAL_API_KEY`             |
| Modelo                 | `...mistral.model`                                                     | `voxtral-mini-transcribe-realtime-2602` |
| Codificación           | `...mistral.encoding`                                                  | `pcm_mulaw`                             |
| Frecuencia de muestreo | `...mistral.sampleRate`                                                | `8000`                                  |
| Retraso objetivo       | `...mistral.targetStreamingDelayMs`                                    | `800`                                   |

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

<Note>OpenClaw establece por defecto el STT en tiempo real de Mistral en `pcm_mulaw` a 8 kHz para que Voice Call pueda reenviar los fotogramas de medios de Twilio directamente. Use `encoding: "pcm_s16le"` y un `sampleRate` coincidente solo si su flujo ascendente ya es PCM sin formato.</Note>

## Configuración avanzada

<AccordionGroup>
  <Accordion title="Razonamiento ajustable (mistral-small-latest)">
    `mistral/mistral-small-latest` se corresponde con Mistral Small 4 y admite [razonamiento ajustable](https://docs.mistral.ai/capabilities/reasoning/adjustable) en la API de Chat Completions a través de `reasoning_effort` (`none` minimiza el pensamiento adicional en la salida; `high` muestra trazas de pensamiento completas antes de la respuesta final).

    OpenClaw asigna el nivel de **pensamiento** (thinking) de la sesión a la API de Mistral:

    | Nivel de pensamiento de OpenClaw                          | Mistral `reasoning_effort` |
    | ------------------------------------------------ | -------------------------- |
    | **off** / **minimal**                            | `none`                     |
    | **low** / **medium** / **high** / **xhigh** / **adaptive** / **max** | `high`     |

    <Note>
    Otros modelos del catálogo de Mistral incluidos no utilizan este parámetro. Siga utilizando modelos `magistral-*` cuando desee el comportamiento nativo de razonamiento primero de Mistral.
    </Note>

  </Accordion>

  <Accordion title="Incrustaciones de memoria">
    Mistral puede servir incrustaciones de memoria a través de `/v1/embeddings` (modelo predeterminado: `mistral-embed`).

    ```json5
    {
      memorySearch: { provider: "mistral" },
    }
    ```

  </Accordion>

  <Accordion title="Auth and base URL">
    - La autenticación de Mistral usa `MISTRAL_API_KEY`.
    - La URL base del proveedor por defecto es `https://api.mistral.ai/v1`.
    - El modelo predeterminado de incorporación es `mistral/mistral-large-latest`.
    - Z.AI usa autenticación Bearer con tu clave de API.
  </Accordion>
</AccordionGroup>

## Relacionado

<CardGroup cols={2}>
  <Card title="Model selection" href="/es/concepts/model-providers" icon="layers">
    Elección de proveedores, referencias de modelo y comportamiento de conmutación por error.
  </Card>
  <Card title="Media understanding" href="/es/nodes/media-understanding" icon="microphone">
    Configuración de transcripción de audio y selección de proveedor.
  </Card>
</CardGroup>
