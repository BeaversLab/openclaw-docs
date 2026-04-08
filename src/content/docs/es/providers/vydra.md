---
summary: "Usar Vydra para imagen, video y voz en OpenClaw"
read_when:
  - You want Vydra media generation in OpenClaw
  - You need Vydra API key setup guidance
title: "Vydra"
---

# Vydra

El complemento Vydra incluido añade:

- generación de imágenes mediante `vydra/grok-imagine`
- generación de videos mediante `vydra/veo3` y `vydra/kling`
- síntesis de voz a través de la ruta TTS de Vydra respaldada por ElevenLabs

OpenClaw utiliza el mismo `VYDRA_API_KEY` para las tres capacidades.

## URL base importante

Use `https://www.vydra.ai/api/v1`.

El host apex de Vydra (`https://vydra.ai/api/v1`) actualmente redirige a `www`. Algunos clientes HTTP descartan `Authorization` en esa redirección entre hosts, lo que convierte una clave de API válida en un error de autenticación engañoso. El complemento incluido usa la URL base `www` directamente para evitar eso.

## Configuración

Incorporación interactiva:

```bash
openclaw onboard --auth-choice vydra-api-key
```

O establezca la variable de entorno directamente:

```bash
export VYDRA_API_KEY="vydra_live_..."
```

## Generación de imágenes

Modelo de imagen predeterminado:

- `vydra/grok-imagine`

Establézcalo como el proveedor de imágenes predeterminado:

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "vydra/grok-imagine",
      },
    },
  },
}
```

El soporte incluido actual es solo de texto a imagen. Las rutas de edición alojadas de Vydra esperan URLs de imágenes remotas, y OpenClaw aún no añade un puente de carga específico para Vydra en el complemento incluido.

Consulte [Image Generation](/en/tools/image-generation) para conocer el comportamiento compartido de la herramienta.

## Generación de videos

Modelos de video registrados:

- `vydra/veo3` para texto a video
- `vydra/kling` para imagen a video

Establecer Vydra como el proveedor de video predeterminado:

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "vydra/veo3",
      },
    },
  },
}
```

Notas:

- `vydra/veo3` se incluye solo como texto a video.
- `vydra/kling` actualmente requiere una referencia de URL de imagen remota. Las cargas de archivos locales se rechazan de inmediato.
- El complemento incluido se mantiene conservador y no reenvía controles de estilo no documentados, como la relación de aspecto, la resolución, la marca de agua o el audio generado.

Consulte [Video Generation](/en/tools/video-generation) para conocer el comportamiento compartido de la herramienta.

## Síntesis de voz

Establecer Vydra como proveedor de voz:

```json5
{
  messages: {
    tts: {
      provider: "vydra",
      providers: {
        vydra: {
          apiKey: "${VYDRA_API_KEY}",
          voiceId: "21m00Tcm4TlvDq8ikWAM",
        },
      },
    },
  },
}
```

Valores predeterminados:

- modelo: `elevenlabs/tts`
- id de voz: `21m00Tcm4TlvDq8ikWAM`

El complemento incluido actualmente expone una voz predeterminada comprobada y devuelve archivos de audio MP3.

## Relacionado

- [Directorio de proveedores](/en/providers/index)
- [Generación de imágenes](/en/tools/image-generation)
- [Generación de videos](/en/tools/video-generation)
