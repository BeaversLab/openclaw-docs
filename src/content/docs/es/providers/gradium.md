---
summary: "Usar la conversión de texto a voz de Gradium en OpenClaw"
read_when:
  - You want Gradium for text-to-speech
  - You need Gradium API key, voice, or directive token configuration
title: "Gradium"
---

[Gradium](https://gradium.ai) es un proveedor de conversión de texto a voz incluido en OpenClaw. El complemento puede procesar respuestas de audio normales (WAV), salida Opus compatible con notas de voz y audio u-law de 8 kHz para superficies de telefonía.

| Propiedad          | Valor                                     |
| ------------------ | ----------------------------------------- |
| ID del proveedor   | `gradium`                                 |
| Autenticación      | `GRADIUM_API_KEY` o config `apiKey`       |
| URL base           | `https://api.gradium.ai` (predeterminado) |
| Voz predeterminada | `Emma` (`YTpq7expH9539ERJ`)               |

## Configuración

Cree una clave de API de Gradium y luego exponga a OpenClaw mediante una variable de entorno o la clave de configuración.

<Tabs>
  <Tab title="Var. de entorno">
    ```bash
    export GRADIUM_API_KEY="gsk_..."
    ```
  </Tab>

  <Tab title="Clave de configuración">
    ```json5
    {
      messages: {
        tts: {
          auto: "always",
          provider: "gradium",
          providers: {
            gradium: {
              apiKey: "${GRADIUM_API_KEY}",
            },
          },
        },
      },
    }
    ```
  </Tab>
</Tabs>

El complemento comprueba primero el `apiKey` resuelto y recurre a la variable de entorno `GRADIUM_API_KEY`.

## Configuración

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "gradium",
      providers: {
        gradium: {
          voiceId: "YTpq7expH9539ERJ",
          // apiKey: "${GRADIUM_API_KEY}",
          // baseUrl: "https://api.gradium.ai",
        },
      },
    },
  },
}
```

| Clave                                    | Tipo            | Descripción                                                                                                                |
| ---------------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `messages.tts.providers.gradium.apiKey`  | cadena (string) | Clave de API resuelta. Admite `${ENV}` y referencias secretas.                                                             |
| `messages.tts.providers.gradium.baseUrl` | cadena (string) | Anula el origen de la API. Se eliminan las barras diagonales finales. De forma predeterminada es `https://api.gradium.ai`. |
| `messages.tts.providers.gradium.voiceId` | cadena (string) | ID de voz predeterminado utilizado cuando no hay ninguna anulación de directiva.                                           |

El formato de audio de salida se selecciona automáticamente según la superficie de destino y no se puede configurar desde `openclaw.json`. Consulte [Salida](#output) a continuación.

## Voces

| Nombre    | ID de voz          |
| --------- | ------------------ |
| Emma      | `YTpq7expH9539ERJ` |
| Kent      | `LFZvm12tW_z0xfGo` |
| Tiffany   | `Eu9iL_CYe8N-Gkx_` |
| Christina | `2H4HY2CBNyJHBCrP` |
| Sydney    | `jtEKaLYNn6iif5PR` |
| John      | `KWJiFWu2O9nMPYcR` |
| Arthur    | `3jUdJyOi9pgbxBTK` |

Voz predeterminada: Emma.

### Anulación de voz por mensaje

Cuando la política de voz activa permite las anulaciones de voz, puedes cambiar las voces en línea utilizando un token de directiva. Todos estos se resuelven en la misma anulación `voiceId`:

```text
/voice:LFZvm12tW_z0xfGo
/voice_id:LFZvm12tW_z0xfGo
/voiceid:LFZvm12tW_z0xfGo
/gradium_voice:LFZvm12tW_z0xfGo
/gradiumvoice:LFZvm12tW_z0xfGo
```

Si la política de voz deshabilita las anulaciones de voz, la directiva se consume pero se ignora.

## Salida

El tiempo de ejecución elige el formato de salida de la superficie de destino. El proveedor no sintetiza otros formatos hoy en día.

| Destino        | Formato     | Ext. de archivo | Frecuencia de muestreo | Indicador compatible con voz |
| -------------- | ----------- | --------------- | ---------------------- | ---------------------------- |
| Audio estándar | `wav`       | `.wav`          | proveedor              | no                           |
| Nota de voz    | `opus`      | `.opus`         | proveedor              | sí                           |
| Telefonía      | `ulaw_8000` | n/d             | 8 kHz                  | n/d                          |

## Orden de selección automática

Entre los proveedores de TTS configurados, el orden de selección automática de Gradium es `30`. Consulte [Texto a voz](/es/tools/tts) para ver cómo OpenClaw elige el proveedor activo cuando `messages.tts.provider` no está fijado.

## Relacionado

- [Texto a voz](/es/tools/tts)
- [Descripción general de medios](/es/tools/media-overview)
