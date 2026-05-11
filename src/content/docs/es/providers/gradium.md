---
summary: "Usar la conversión de texto a voz de Gradium en OpenClaw"
read_when:
  - You want Gradium for text-to-speech
  - You need Gradium API key or voice configuration
title: "Gradium"
---

Gradium es un proveedor de conversión de texto a voz incluido con OpenClaw. Puede generar respuestas de audio normales, salida Opus compatible con notas de voz y audio u-law de 8 kHz para superficies de telefonía.

## Configuración

Cree una clave de API de Gradium y luego exponga a OpenClaw:

```bash
export GRADIUM_API_KEY="gsk_..."
```

También puede almacenar la clave en la configuración bajo `messages.tts.providers.gradium.apiKey`.

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

## Salida

- Las respuestas de archivos de audio usan WAV.
- Las respuestas de notas de voz usan Opus y están marcadas como compatibles con voz.
- La síntesis de telefonía usa `ulaw_8000` a 8 kHz.

## Relacionado

- [Conversión de texto a voz](/es/tools/tts)
- [Descripción general de medios](/es/tools/media-overview)
