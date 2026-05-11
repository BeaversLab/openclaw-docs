---
summary: "Transcripción de Deepgram para notas de voz entrantes"
read_when:
  - You want Deepgram speech-to-text for audio attachments
  - You want Deepgram streaming transcription for Voice Call
  - You need a quick Deepgram config example
title: "Deepgram"
---

Deepgram es una API de voz a texto. En OpenClaw se utiliza para la transcripción
de audio/notas de voz entrantes a través de `tools.media.audio` y para STT de
streaming de llamadas de voz a través de `plugins.entries.voice-call.config.streaming`.

Para la transcripción por lotes, OpenClaw carga el archivo de audio completo en
Deepgram e inyecta la transcripción en la canalización de respuesta (bloque `{{Transcript}}` +
`[Audio]`). Para el streaming de llamadas de voz, OpenClaw reenvía tramas
u-law G.711 en vivo a través del endpoint WebSocket `listen` de Deepgram y emite transcripciones
parciales o finales a medida que Deepgram las devuelve.

| Detalle               | Valor                                                      |
| --------------------- | ---------------------------------------------------------- |
| Sitio web             | [deepgram.com](https://deepgram.com)                       |
| Documentación         | [developers.deepgram.com](https://developers.deepgram.com) |
| Autenticación         | `DEEPGRAM_API_KEY`                                         |
| Modelo predeterminado | `nova-3`                                                   |

## Primeros pasos

<Steps>
  <Step title="Establezca su clave de API">
    Añada su clave de API de Deepgram al entorno:

    ```
    DEEPGRAM_API_KEY=dg_...
    ```

  </Step>
  <Step title="Habilite el proveedor de audio">
    ```json5
    {
      tools: {
        media: {
          audio: {
            enabled: true,
            models: [{ provider: "deepgram", model: "nova-3" }],
          },
        },
      },
    }
    ```
  </Step>
  <Step title="Envíe una nota de voz">
    Envíe un mensaje de audio a través de cualquier canal conectado. OpenClaw lo transcribe
    a través de Deepgram e inyecta la transcripción en la canalización de respuesta.
  </Step>
</Steps>

## Opciones de configuración

| Opción            | Ruta                                                         | Descripción                                          |
| ----------------- | ------------------------------------------------------------ | ---------------------------------------------------- |
| `model`           | `tools.media.audio.models[].model`                           | ID del modelo de Deepgram (predeterminado: `nova-3`) |
| `language`        | `tools.media.audio.models[].language`                        | Sugerencia de idioma (opcional)                      |
| `detect_language` | `tools.media.audio.providerOptions.deepgram.detect_language` | Habilitar detección de idioma (opcional)             |
| `punctuate`       | `tools.media.audio.providerOptions.deepgram.punctuate`       | Habilitar puntuación (opcional)                      |
| `smart_format`    | `tools.media.audio.providerOptions.deepgram.smart_format`    | Habilitar formato inteligente (opcional)             |

<Tabs>
  <Tab title="Con sugerencia de idioma">
    ```json5
    {
      tools: {
        media: {
          audio: {
            enabled: true,
            models: [{ provider: "deepgram", model: "nova-3", language: "en" }],
          },
        },
      },
    }
    ```
  </Tab>
  <Tab title="Con opciones de Deepgram">
    ```json5
    {
      tools: {
        media: {
          audio: {
            enabled: true,
            providerOptions: {
              deepgram: {
                detect_language: true,
                punctuate: true,
                smart_format: true,
              },
            },
            models: [{ provider: "deepgram", model: "nova-3" }],
          },
        },
      },
    }
    ```
  </Tab>
</Tabs>

## STT de transmisión de llamada de voz

El complemento `deepgram` incluido también registra un proveedor de transcripción en tiempo real
para el complemento Voice Call.

| Configuración            | Ruta de configuración                                                   | Predeterminado              |
| ------------------------ | ----------------------------------------------------------------------- | --------------------------- |
| API key                  | `plugins.entries.voice-call.config.streaming.providers.deepgram.apiKey` | Recae en `DEEPGRAM_API_KEY` |
| Modelo                   | `...deepgram.model`                                                     | `nova-3`                    |
| Idioma                   | `...deepgram.language`                                                  | (sin establecer)            |
| Codificación             | `...deepgram.encoding`                                                  | `mulaw`                     |
| Tasa de muestreo         | `...deepgram.sampleRate`                                                | `8000`                      |
| Endpointing              | `...deepgram.endpointingMs`                                             | `800`                       |
| Resultados provisionales | `...deepgram.interimResults`                                            | `true`                      |

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          streaming: {
            enabled: true,
            provider: "deepgram",
            providers: {
              deepgram: {
                apiKey: "${DEEPGRAM_API_KEY}",
                model: "nova-3",
                endpointingMs: 800,
                language: "en-US",
              },
            },
          },
        },
      },
    },
  },
}
```

<Note>Voice Call recibe audio de telefonía a 8 kHz G.711 u-law. El proveedor de transmisión de Deepgram tiene por defecto `encoding: "mulaw"` y `sampleRate: 8000`, por lo que los marcos de medios de Twilio se pueden reenviar directamente.</Note>

## Notas

<AccordionGroup>
  <Accordion title="Autenticación">La autenticación sigue el orden de autenticación de proveedores estándar. `DEEPGRAM_API_KEY` es la ruta más sencilla.</Accordion>
  <Accordion title="Proxy y endpoints personalizados">Anule los endpoints o los encabezados con `tools.media.audio.baseUrl` y `tools.media.audio.headers` al usar un proxy.</Accordion>
  <Accordion title="Comportamiento de salida">La salida sigue las mismas reglas de audio que otros proveedores (límites de tamaño, tiempos de espera, inyección de transcripciones).</Accordion>
</AccordionGroup>

## Relacionado

<CardGroup cols={2}>
  <Card title="Herramientas multimedia" href="/es/tools/media-overview" icon="photo-film">
    Resumen de la canalización de procesamiento de audio, imagen y video.
  </Card>
  <Card title="Configuración" href="/es/gateway/configuration" icon="gear">
    Referencia completa de configuración, incluida la configuración de herramientas multimedia.
  </Card>
  <Card title="Solución de problemas" href="/es/help/troubleshooting" icon="wrench">
    Problemas comunes y pasos de depuración.
  </Card>
  <Card title="Preguntas frecuentes" href="/es/help/faq" icon="circle-question">
    Preguntas frecuentes sobre la configuración de OpenClaw.
  </Card>
</CardGroup>
