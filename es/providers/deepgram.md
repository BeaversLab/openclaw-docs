---
summary: "Transcripción de Deepgram para notas de voz entrantes"
read_when:
  - You want Deepgram speech-to-text for audio attachments
  - You need a quick Deepgram config example
title: "Deepgram"
---

# Deepgram (Transcripción de audio)

Deepgram es una API de voz a texto. En OpenClaw se utiliza para la **transcripción de audio/ notas de voz entrantes** a través de `tools.media.audio`.

Cuando está habilitado, OpenClaw carga el archivo de audio en Deepgram e inyecta la transcripción en la canalización de respuesta (bloque `{{Transcript}}` + `[Audio]`). Esto **no es streaming**; utiliza el punto final de transcripción pregrabada.

Sitio web: [https://deepgram.com](https://deepgram.com)  
Documentos: [https://developers.deepgram.com](https://developers.deepgram.com)

## Inicio rápido

1. Configure su clave API:

```
DEEPGRAM_API_KEY=dg_...
```

2. Habilite el proveedor:

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

## Opciones

- `model`: ID del modelo Deepgram (predeterminado: `nova-3`)
- `language`: sugerencia de idioma (opcional)
- `tools.media.audio.providerOptions.deepgram.detect_language`: habilitar la detección de idioma (opcional)
- `tools.media.audio.providerOptions.deepgram.punctuate`: habilitar puntuación (opcional)
- `tools.media.audio.providerOptions.deepgram.smart_format`: habilitar formato inteligente (opcional)

Ejemplo con idioma:

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

Ejemplo con opciones de Deepgram:

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

## Notas

- La autenticación sigue el orden de autenticación estándar del proveedor; `DEEPGRAM_API_KEY` es la ruta más sencilla.
- Anule los puntos finales o los encabezados con `tools.media.audio.baseUrl` y `tools.media.audio.headers` al utilizar un proxy.
- La salida sigue las mismas reglas de audio que otros proveedores (límites de tamaño, tiempos de espera, inyección de transcripción).

import es from "/components/footer/es.mdx";

<es />
