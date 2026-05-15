---
summary: "SenseAudio conversión de voz a texto por lotes para notas de voz entrantes"
read_when:
  - You want SenseAudio speech-to-text for audio attachments
  - You need the SenseAudio API key env var or audio config path
title: "SenseAudio"
---

SenseAudio puede transcribir archivos de audio entrantes y notas de voz a través de la canalización compartida `tools.media.audio` de OpenClaw. OpenClaw envía audio multiparte al punto final de transcripción compatible con OpenAI e inyecta el texto devuelto como `{{Transcript}}` además de un bloque `[Audio]`.

| Propiedad                            | Valor                                            |
| ------------------------------------ | ------------------------------------------------ |
| ID del proveedor                     | `senseaudio`                                     |
| Complemento                          | incluido, `enabledByDefault: true`               |
| Contrato                             | `mediaUnderstandingProviders` (audio)            |
| Variable de entorno de autenticación | `SENSEAUDIO_API_KEY`                             |
| Modelo predeterminado                | `senseaudio-asr-pro-1.5-260319`                  |
| URL predeterminada                   | `https://api.senseaudio.cn/v1`                   |
| Sitio web                            | [senseaudio.cn](https://senseaudio.cn)           |
| Documentación                        | [senseaudio.cn/docs](https://senseaudio.cn/docs) |

## Introducción

<Steps>
  <Step title="Establezca su clave de API">
    ```bash
    export SENSEAUDIO_API_KEY="..."
    ```
  </Step>
  <Step title="Habilite el proveedor de audio">
    ```json5
    {
      tools: {
        media: {
          audio: {
            enabled: true,
            models: [{ provider: "senseaudio", model: "senseaudio-asr-pro-1.5-260319" }],
          },
        },
      },
    }
    ```
  </Step>
  <Step title="Envíe una nota de voz">
    Envíe un mensaje de audio a través de cualquier canal conectado. OpenClaw carga el
    audio en SenseAudio y utiliza la transcripción en la canalización de respuesta.
  </Step>
</Steps>

## Opciones

| Opción     | Ruta                                  | Descripción                          |
| ---------- | ------------------------------------- | ------------------------------------ |
| `model`    | `tools.media.audio.models[].model`    | ID del modelo ASR de SenseAudio      |
| `language` | `tools.media.audio.models[].language` | Pista de idioma opcional             |
| `prompt`   | `tools.media.audio.prompt`            | Prompt de transcripción opcional     |
| `baseUrl`  | `tools.media.audio.baseUrl` o modelo  | Anular la base compatible con OpenAI |
| `headers`  | `tools.media.audio.request.headers`   | Encabezados de solicitud adicionales |

<Note>SenseAudio es STT por lotes solamente en OpenClaw. La transcripción en tiempo real de llamadas de voz continúa utilizando proveedores con soporte de STT en streaming.</Note>

## Relacionado

- [Comprensión multimedia (audio)](/es/nodes/audio)
- [Proveedores de modelos](/es/concepts/model-providers)
