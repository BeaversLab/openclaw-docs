---
summary: "Usa modelos de Mistral y transcripción de Voxtral con OpenClaw"
read_when:
  - Quieres usar modelos de Mistral en OpenClaw
  - Necesitas la incorporación de la clave API de Mistral y referencias de modelos
title: "Mistral"
---

# Mistral

OpenClaw es compatible con Mistral tanto para el enrutamiento de modelos de texto/imagen (`mistral/...`) como para
la transcripción de audio a través de Voxtral en la comprensión de medios.
Mistral también se puede usar para incrustaciones de memoria (`memorySearch.provider = "mistral"`).

## Configuración de CLI

```bash
openclaw onboard --auth-choice mistral-api-key
# or non-interactive
openclaw onboard --mistral-api-key "$MISTRAL_API_KEY"
```

## Fragmento de configuración (proveedor LLM)

```json5
{
  env: { MISTRAL_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "mistral/mistral-large-latest" } } },
}
```

## Fragmento de configuración (transcripción de audio con Voxtral)

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

## Notas

- La autenticación de Mistral usa `MISTRAL_API_KEY`.
- La URL base del proveedor es `https://api.mistral.ai/v1` de forma predeterminada.
- El modelo predeterminado de incorporación es `mistral/mistral-large-latest`.
- El modelo de audio predeterminado para la comprensión de medios de Mistral es `voxtral-mini-latest`.
- La ruta de transcripción de medios usa `/v1/audio/transcriptions`.
- La ruta de incrustaciones de memoria usa `/v1/embeddings` (modelo predeterminado: `mistral-embed`).

import en from "/components/footer/en.mdx";

<en />
