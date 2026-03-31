---
summary: "Usa la API unificada de OpenRouter para acceder a muchos modelos en OpenClaw"
read_when:
  - You want a single API key for many LLMs
  - You want to run models via OpenRouter in OpenClaw
title: "OpenRouter"
---

# OpenRouter

OpenRouter proporciona una **API unificada** que enruta las solicitudes a muchos modelos detrás de un único
endpoint y clave de API. Es compatible con OpenAI, por lo que la mayoría de los SDK de OpenAI funcionan simplemente cambiando la URL base.

## Configuración de CLI

```bash
openclaw onboard --auth-choice apiKey --token-provider openrouter --token "$OPENROUTER_API_KEY"
```

## Fragmento de configuración

```json5
{
  env: { OPENROUTER_API_KEY: "sk-or-..." },
  agents: {
    defaults: {
      model: { primary: "openrouter/anthropic/claude-sonnet-4-6" },
    },
  },
}
```

## Notas

- Las referencias de modelos son `openrouter/<provider>/<model>`.
- Para más opciones de modelos/proveedores, consulta [/concepts/model-providers](/en/concepts/model-providers).
- OpenRouter utiliza un token Bearer con tu clave de API entre bambalinas.
