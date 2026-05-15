---
summary: "Síntesis de texto a voz en streaming de Inworld para respuestas de OpenClaw"
read_when:
  - You want Inworld speech synthesis for outbound replies
  - You need PCM telephony or OGG_OPUS voice-note output from Inworld
title: "Inworld"
---

Inworld es un proveedor de texto a voz (TTS) en streaming. En OpenClaw,
sintetiza el audio de respuesta saliente (MP3 por defecto, OGG_OPUS para notas de voz)
y audio PCM para canales de telefonía como Llamada de voz.

OpenClaw envía una solicitud al punto final de TTS en streaming de Inworld, concatena los
trozos de audio base64 devueltos en un único búfer y entrega el resultado a
la canalización estándar de audio de respuesta.

| Propiedad                            | Valor                                                                   |
| ------------------------------------ | ----------------------------------------------------------------------- |
| ID del proveedor                     | `inworld`                                                               |
| Complemento                          | incluido, `enabledByDefault: true`                                      |
| Contrato                             | `speechProviders` (solo TTS)                                            |
| Variable de entorno de autenticación | `INWORLD_API_KEY` (HTTP Basic, credencial del panel en Base64)          |
| URL base                             | `https://api.inworld.ai`                                                |
| Voz predeterminada                   | `Sarah`                                                                 |
| Modelo predeterminado                | `inworld-tts-1.5-max`                                                   |
| Salida                               | MP3 (predeterminado), OGG_OPUS (notas de voz), PCM 22050 Hz (telefonía) |
| Sitio web                            | [inworld.ai](https://inworld.ai)                                        |
| Documentación                        | [docs.inworld.ai/tts/tts](https://docs.inworld.ai/tts/tts)              |

## Para empezar

<Steps>
  <Step title="Establezca su clave de API">
    Copie la credencial de su panel de Inworld (Espacio de trabajo > Claves de API)
    y configúrela como una variable de entorno. El valor se envía textualmente como la credencial
    HTTP Basic, por lo que no la codifique en Base64 nuevamente ni la convierta en un token
    de portador (bearer token).

    ```
    INWORLD_API_KEY=<base64-credential-from-dashboard>
    ```

  </Step>
  <Step title="Seleccione Inworld en messages.tts">
    ```json5
    {
      messages: {
        tts: {
          auto: "always",
          provider: "inworld",
          providers: {
            inworld: {
              voiceId: "Sarah",
              modelId: "inworld-tts-1.5-max",
            },
          },
        },
      },
    }
    ```
  </Step>
  <Step title="Envíe un mensaje">
    Envíe una respuesta a través de cualquier canal conectado. OpenClaw sintetiza el
    audio con Inworld y lo entrega como MP3 (o OGG_OPUS cuando el canal
    espera una nota de voz).
  </Step>
</Steps>

## Opciones de configuración

| Opción        | Ruta                                         | Descripción                                                                       |
| ------------- | -------------------------------------------- | --------------------------------------------------------------------------------- |
| `apiKey`      | `messages.tts.providers.inworld.apiKey`      | Credencial del panel en Base64. Recurre a `INWORLD_API_KEY`.                      |
| `baseUrl`     | `messages.tts.providers.inworld.baseUrl`     | Anula la URL base de la API de Inworld (predeterminado `https://api.inworld.ai`). |
| `voiceId`     | `messages.tts.providers.inworld.voiceId`     | Identificador de voz (predeterminado `Sarah`).                                    |
| `modelId`     | `messages.tts.providers.inworld.modelId`     | ID del modelo TTS (predeterminado `inworld-tts-1.5-max`).                         |
| `temperature` | `messages.tts.providers.inworld.temperature` | Temperatura de muestreo `0..2` (opcional).                                        |

## Notas

<AccordionGroup>
  <Accordion title="Authentication">
    Inworld utiliza autenticación básica HTTP con una única cadena de
    credenciales codificada en Base64. Cópiela tal cual del panel de
    control de Inworld. El proveedor la envía como `Authorization: Basic <apiKey>` sin ninguna codificación adicional,
    por lo que no debe codificarla en Base64 usted mismo ni pasar un token
    de estilo bearer. Consulte las [notas de autenticación de TTS](/es/tools/tts#inworld-primary) para la misma
    advertencia.
  </Accordion>
  <Accordion title="Models">
    IDs de modelos compatibles: `inworld-tts-1.5-max` (predeterminado),
    `inworld-tts-1.5-mini`, `inworld-tts-1-max`, `inworld-tts-1`.
  </Accordion>
  <Accordion title="Audio outputs">
    Las respuestas utilizan MP3 de forma predeterminada. Cuando el objetivo del
    canal es `voice-note`, OpenClaw solicita a Inworld `OGG_OPUS` para que el audio se
    reproduzca como un globo de voz nativo. La síntesis de telefonía utiliza `PCM`
    en bruto a 22050 Hz para alimentar el puente de telefonía.
  </Accordion>
  <Accordion title="Custom endpoints">
    Anule el host de la API con `messages.tts.providers.inworld.baseUrl`.
    Se eliminan las barras diagonales finales antes de enviar las solicitudes.
  </Accordion>
</AccordionGroup>

## Relacionado

<CardGroup cols={2}>
  <Card title="Text-to-speech" href="/es/tools/tts" icon="waveform-lines">
    Visión general de TTS, proveedores y configuración de `messages.tts`.
  </Card>
  <Card title="Configuration" href="/es/gateway/configuration" icon="gear">
    Referencia de configuración completa, incluida la configuración de `messages.tts`.
  </Card>
  <Card title="Providers" href="/es/providers" icon="grid">
    Todos los proveedores incluidos en OpenClaw.
  </Card>
  <Card title="Solución de problemas" href="/es/help/troubleshooting" icon="wrench">
    Problemas comunes y pasos de depuración.
  </Card>
</CardGroup>
