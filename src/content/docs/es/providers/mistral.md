---
summary: "Usa los modelos de Mistral y la transcripción de Voxtral con OpenClaw"
read_when:
  - You want to use Mistral models in OpenClaw
  - You want Voxtral realtime transcription for Voice Call
  - You need Mistral API key onboarding and model refs
title: "Mistral"
---

OpenClaw incluye un complemento Mistral integrado que registra cuatro contratos: completiones de chat, comprensión de medios (transcripción por lotes de Voxtral), STT en tiempo real para Voice Call (Voxtral Realtime) y incrustaciones de memoria (`mistral-embed`).

| Propiedad                            | Valor                                          |
| ------------------------------------ | ---------------------------------------------- |
| ID del proveedor                     | `mistral`                                      |
| Complemento                          | integrado, `enabledByDefault: true`            |
| Variable de entorno de autenticación | `MISTRAL_API_KEY`                              |
| Indicador de incorporación           | `--auth-choice mistral-api-key`                |
| Indicador directo de CLI             | `--mistral-api-key <key>`                      |
| API                                  | Compatible con OpenAI (`openai-completions`)   |
| URL base                             | `https://api.mistral.ai/v1`                    |
| Modelo predeterminado                | `mistral/mistral-large-latest`                 |
| Modelo de incrustación               | `mistral-embed`                                |
| Lotes de Voxtral                     | `voxtral-mini-latest` (transcripción de audio) |
| Voxtral en tiempo real               | `voxtral-mini-transcribe-realtime-2602`        |

## Introducción

<Steps>
  <Step title="Obtén tu clave de API">
    Crea una clave de API en la [Consola de Mistral](https://console.mistral.ai/).
  </Step>
  <Step title="Ejecuta la incorporación">
    ```bash
    openclaw onboard --auth-choice mistral-api-key
    ```

    O pasa la clave directamente:

    ```bash
    openclaw onboard --mistral-api-key "$MISTRAL_API_KEY"
    ```

  </Step>
  <Step title="Establecer un modelo predeterminado">
    ```json5
    {
      env: { MISTRAL_API_KEY: "sk-..." },
      agents: { defaults: { model: { primary: "mistral/mistral-large-latest" } } },
    }
    ```
  </Step>
  <Step title="Verificar que el modelo esté disponible">
    ```bash
    openclaw models list --provider mistral
    ```
  </Step>
</Steps>

## Catálogo de LLM integrado

[Mistral Medium 3.5](https://docs.mistral.ai/models/model-cards/mistral-medium-3-5-26-04)
es el modelo mediano (Medium) mixto actual en el catálogo integrado: 128B de pesos densos,
entrada de texto e imagen, contexto de 256K, llamada de funciones, salida estructurada, codificación
y razonamiento ajustable a través de la API de Chat Completions. Use
`mistral/mistral-medium-3-5` cuando desee el modelo unificado más nuevo de Mistral
para agentes/codificación en lugar del modelo predeterminado `mistral/mistral-large-latest`.

OpenClaw actualmente envía este catálogo integrado de Mistral:

| Referencia del modelo            | Entrada       | Contexto | Salida máxima | Notas                                                                         |
| -------------------------------- | ------------- | -------- | ------------- | ----------------------------------------------------------------------------- |
| `mistral/mistral-large-latest`   | texto, imagen | 262,144  | 16,384        | Modelo predeterminado                                                         |
| `mistral/mistral-medium-2508`    | texto, imagen | 262,144  | 8,192         | Mistral Medium 3.1                                                            |
| `mistral/mistral-medium-3-5`     | texto, imagen | 262,144  | 8,192         | Mistral Medium 3.5; razonamiento ajustable                                    |
| `mistral/mistral-small-latest`   | texto, imagen | 128,000  | 16,384        | Mistral Small 4; razonamiento ajustable a través de la API `reasoning_effort` |
| `mistral/pixtral-large-latest`   | texto, imagen | 128,000  | 32,768        | Pixtral                                                                       |
| `mistral/codestral-latest`       | texto         | 256,000  | 4,096         | Codificación                                                                  |
| `mistral/devstral-medium-latest` | texto         | 262,144  | 32,768        | Devstral 2                                                                    |
| `mistral/magistral-small`        | texto         | 128,000  | 40,000        | Con razonamiento                                                              |

Después de la integración, realice una prueba de humo de Medium 3.5 sin iniciar la Gateway:

```bash
openclaw infer model run --local \
  --model mistral/mistral-medium-3-5 \
  --prompt "Reply with exactly: mistral-ok" \
  --json
```

Para examinar la fila del catálogo incluido antes de cambiar la configuración:

```bash
openclaw models list --all --provider mistral --plain
```

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

## STT de streaming para Voice Call

El complemento `mistral` incluido registra Voxtral Realtime como proveedor
STT de streaming para Voice Call.

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

<Note>OpenClaw establece de forma predeterminada el STT en tiempo real de Mistral en `pcm_mulaw` a 8 kHz para que Voice Call pueda reenviar los marcos de medios de Twilio directamente. Use `encoding: "pcm_s16le"` y una `sampleRate` coincidente solo si su flujo ascendente ya es PCM sin procesar.</Note>

## Configuración avanzada

<AccordionGroup>
  <Accordion title="Razonamiento ajustable">
    `mistral/mistral-small-latest` (Mistral Small 4) y `mistral/mistral-medium-3-5` admiten [razonamiento ajustable](https://docs.mistral.ai/studio-api/conversations/reasoning/adjustable) en la API de Chat Completions a través de `reasoning_effort` (`none` minimiza el pensamiento adicional en la salida; `high` muestra trazas de pensamiento completas antes de la respuesta final). Mistral recomienda `reasoning_effort="high"` para casos de uso de agente y código de Medium 3.5.

    OpenClaw asigna el nivel de **pensamiento** (thinking) de la sesión a la API de Mistral:

    | Nivel de pensamiento de OpenClaw                          | Mistral `reasoning_effort` |
    | ------------------------------------------------ | -------------------------- |
    | **off** / **minimal**                            | `none`                     |
    | **low** / **medium** / **high** / **xhigh** / **adaptive** / **max** | `high`     |

    <Warning>
    No combine el modo de razonamiento de Medium 3.5 con `temperature: 0`. La API
    HTTP de Mistral rechaza `reasoning_effort="high"` más `temperature: 0` con una respuesta
    400. Deje la temperatura sin establecer para que Mistral use su valor predeterminado, o siga
    la [configuración recomendada de Medium 3.5](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B)
    y use `temperature: 0.7` para un razonamiento alto. Para respuestas directas
    deterministas, desactive o minimice el pensamiento para que OpenClaw envíe
    `reasoning_effort: "none"` antes de que baje la temperatura.
    </Warning>

    Ejemplo de configuración con ámbito de modelo para el razonamiento de Medium 3.5:

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
    Otros modelos del catálogo incluidos de Mistral no usan este parámetro. Siga usando modelos `magistral-*` cuando desee el comportamiento nativo de razonamiento primero de Mistral.
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
    - Mistral auth uses `MISTRAL_API_KEY` (Bearer header).
    - Provider base URL defaults to `https://api.mistral.ai/v1` and accepts the standard OpenAI-compatible chat-completions request shape.
    - Onboarding default model is `mistral/mistral-large-latest`.
    - Override the base URL under `models.providers.mistral.baseUrl` only when Mistral explicitly publishes a regional endpoint you need.

  </Accordion>
</AccordionGroup>

## Relacionado

<CardGroup cols={2}>
  <Card title="Model selection" href="/es/concepts/model-providers" icon="layers">
    Elección de proveedores, referencias de modelos y comportamiento de conmutación por error.
  </Card>
  <Card title="Media understanding" href="/es/nodes/media-understanding" icon="microphone">
    Configuración de transcripción de audio y selección del proveedor.
  </Card>
</CardGroup>
