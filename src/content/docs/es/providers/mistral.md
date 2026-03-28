---
summary: "Usa los modelos de Mistral y la transcripción de Voxtral con OpenClaw"
read_when:
  - You want to use Mistral models in OpenClaw
  - You need Mistral API key onboarding and model refs
title: "Mistral"
---

# Mistral

OpenClaw soporta Mistral tanto para el enrutamiento de modelos de texto/imagen (`mistral/...`) como para
la transcripción de audio mediante Voxtral en la comprensión de medios.
Mistral también se puede utilizar para incrustaciones de memoria (`memorySearch.provider = "mistral"`).

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
- La URL base del proveedor por defecto es `https://api.mistral.ai/v1`.
- El modelo predeterminado de incorporación es `mistral/mistral-large-latest`.
- El modelo de audio predeterminado de comprensión de medios para Mistral es `voxtral-mini-latest`.
- La ruta de transcripción de medios usa `/v1/audio/transcriptions`.
- La ruta de incrustaciones de memoria usa `/v1/embeddings` (modelo predeterminado: `mistral-embed`).
