---
summary: "Transcripción de Deepgram para notas de voz entrantes"
read_when:
  - You want Deepgram speech-to-text for audio attachments
  - You need a quick Deepgram config example
title: "Deepgram"
---

# Deepgram (Transcripción de audio)

Deepgram es una API de voz a texto. En OpenClaw se utiliza para la **transcripción de notas de voz/audio entrantes** a través de `tools.media.audio`.

Cuando está habilitado, OpenClaw sube el archivo de audio a Deepgram e inyecta la transcripción en la canalización de respuesta (bloque `{{Transcript}}` + `[Audio]`). Esto **no es streaming**; utiliza el punto final de transcripción pregrabada.

| Detalle               | Valor                                                      |
| --------------------- | ---------------------------------------------------------- |
| Sitio web             | [deepgram.com](https://deepgram.com)                       |
| Documentación         | [developers.deepgram.com](https://developers.deepgram.com) |
| Autenticación         | `DEEPGRAM_API_KEY`                                         |
| Modelo predeterminado | `nova-3`                                                   |

## Para empezar

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
    mediante Deepgram e inyecta la transcripción en la canalización de respuesta.
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
  <Tab title="With language hint">
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
  <Tab title="With Deepgram options">
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

## Notas

<AccordionGroup>
  <Accordion title="Autenticación">La autenticación sigue el orden de autenticación estándar de los proveedores. `DEEPGRAM_API_KEY` es la ruta más sencilla.</Accordion>
  <Accordion title="Proxy y puntos finales personalizados">Anule los puntos finales o encabezados con `tools.media.audio.baseUrl` y `tools.media.audio.headers` al utilizar un proxy.</Accordion>
  <Accordion title="Comportamiento de salida">La salida sigue las mismas reglas de audio que otros proveedores (límites de tamaño, tiempos de espera, inyección de transcripciones).</Accordion>
</AccordionGroup>

<Note>La transcripción de Deepgram es **solo pregrabada** (no streaming en tiempo real). OpenClaw sube el archivo de audio completo y espera la transcripción completa antes de inyectarla en la conversación.</Note>

## Relacionado

<CardGroup cols={2}>
  <Card title="Herramientas multimedia" href="/en/tools/media" icon="photo-film">
    Resumen de la canalización de procesamiento de audio, imagen y video.
  </Card>
  <Card title="Configuración" href="/en/configuration" icon="gear">
    Referencia completa de configuración, incluidos los ajustes de herramientas multimedia.
  </Card>
  <Card title="Solución de problemas" href="/en/help/troubleshooting" icon="wrench">
    Problemas comunes y pasos de depuración.
  </Card>
  <Card title="Preguntas frecuentes" href="/en/help/faq" icon="circle-question">
    Preguntas frecuentes sobre la configuración de OpenClaw.
  </Card>
</CardGroup>
