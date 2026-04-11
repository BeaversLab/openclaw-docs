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

## Catálogo de LLM integrado

OpenClaw incluye actualmente este catálogo integrado de Mistral:

| Ref. de modelo                   | Entrada       | Contexto | Salida máxima | Notas                                                                         |
| -------------------------------- | ------------- | -------- | ------------- | ----------------------------------------------------------------------------- |
| `mistral/mistral-large-latest`   | texto, imagen | 262,144  | 16,384        | Modelo por defecto                                                            |
| `mistral/mistral-medium-2508`    | texto, imagen | 262,144  | 8,192         | Mistral Medium 3.1                                                            |
| `mistral/mistral-small-latest`   | texto, imagen | 128,000  | 16,384        | Mistral Small 4; razonamiento ajustable a través de la API `reasoning_effort` |
| `mistral/pixtral-large-latest`   | texto, imagen | 128,000  | 32,768        | Pixtral                                                                       |
| `mistral/codestral-latest`       | texto         | 256,000  | 4,096         | Codificación                                                                  |
| `mistral/devstral-medium-latest` | texto         | 262,144  | 32,768        | Devstral 2                                                                    |
| `mistral/magistral-small`        | texto         | 128,000  | 40,000        | Con razonamiento                                                              |

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

## Razonamiento ajustable (`mistral-small-latest`)

`mistral/mistral-small-latest` se asigna a Mistral Small 4 y es compatible con [razonamiento ajustable](https://docs.mistral.ai/capabilities/reasoning/adjustable) en la API de Chat Completions a través de `reasoning_effort` (`none` minimiza el pensamiento adicional en la salida; `high` muestra trazas de pensamiento completas antes de la respuesta final).

OpenClaw asigna el nivel de **pensamiento** de la sesión a la API de Mistral:

- **off** / **minimal** → `none`
- **low** / **medium** / **high** / **xhigh** / **adaptive** → `high`

Otros modelos del catálogo de Mistral no utilizan este parámetro; siga usando modelos `magistral-*` cuando desee el comportamiento nativo de razonamiento primero de Mistral.

## Notas

- La autenticación de Mistral usa `MISTRAL_API_KEY`.
- La URL base del proveedor por defecto es `https://api.mistral.ai/v1`.
- El modelo por defecto para la incorporación es `mistral/mistral-large-latest`.
- El modelo de audio por defecto para la comprensión de medios de Mistral es `voxtral-mini-latest`.
- La ruta de transcripción de medios usa `/v1/audio/transcriptions`.
- La ruta de incrustaciones de memoria usa `/v1/embeddings` (modelo por defecto: `mistral-embed`).
