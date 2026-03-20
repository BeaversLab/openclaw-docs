---
summary: "Usa la API unificada de OpenRouter para acceder a muchos modelos en OpenClaw"
read_when:
  - Quieres una sola clave API para muchos LLM
  - Quieres ejecutar modelos a través de OpenRouter en OpenClaw
title: "OpenRouter"
---

# OpenRouter

OpenRouter proporciona una **API unificada** que enruta las solicitudes a muchos modelos detrás de un solo punto de conexión (endpoint) y clave API. Es compatible con OpenAI, por lo que la mayoría de los SDK de OpenAI funcionan cambiando la URL base.

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
      model: { primary: "openrouter/anthropic/claude-sonnet-4-5" },
    },
  },
}
```

## Notas

- Las referencias de modelo son `openrouter/<provider>/<model>`.
- Para más opciones de modelos/proveedores, consulta [/concepts/model-providers](/es/concepts/model-providers).
- OpenRouter utiliza un token Bearer con tu clave API internamente.

import en from "/components/footer/en.mdx";

<en />
