---
title: "Kilo Gateway"
summary: "Usa la API unificada de Kilo Gateway para acceder a muchos modelos en OpenClaw"
read_when:
  - You want a single API key for many LLMs
  - You want to run models via Kilo Gateway in OpenClaw
---

# Kilo Gateway

Kilo Gateway proporciona una **API unificada** que dirige las solicitudes a muchos modelos detrás de un solo punto de conexión y clave de API. Es compatible con OpenAI, por lo que la mayoría de los SDK de OpenAI funcionan cambiando la URL base.

## Obtener una clave de API

1. Ve a [app.kilo.ai](https://app.kilo.ai)
2. Inicia sesión o crea una cuenta
3. Navega a API Keys y genera una nueva clave

## Configuración de CLI

```bash
openclaw onboard --kilocode-api-key <key>
```

O establece la variable de entorno:

```bash
export KILOCODE_API_KEY="<your-kilocode-api-key>" # pragma: allowlist secret
```

## Fragmento de configuración

```json5
{
  env: { KILOCODE_API_KEY: "<your-kilocode-api-key>" }, // pragma: allowlist secret
  agents: {
    defaults: {
      model: { primary: "kilocode/kilo/auto" },
    },
  },
}
```

## Modelo predeterminado

El modelo predeterminado es `kilocode/kilo/auto`, un modelo de enrutamiento inteligente que selecciona automáticamente el mejor modelo subyacente basándose en la tarea:

- Las tareas de planificación, depuración y orquestación se dirigen a Claude Opus
- Las tareas de escritura y exploración de código se dirigen a Claude Sonnet

## Modelos disponibles

OpenClaw descubre dinámicamente los modelos disponibles desde Kilo Gateway al iniciarse. Usa
`/models kilocode` para ver la lista completa de modelos disponibles con tu cuenta.

Cualquier modelo disponible en la puerta de enlace se puede usar con el prefijo `kilocode/`:

```
kilocode/kilo/auto              (default - smart routing)
kilocode/anthropic/claude-sonnet-4
kilocode/openai/gpt-5.2
kilocode/google/gemini-3-pro-preview
...and many more
```

## Notas

- Las referencias de modelo son `kilocode/<model-id>` (por ejemplo, `kilocode/anthropic/claude-sonnet-4`).
- Modelo predeterminado: `kilocode/kilo/auto`
- URL base: `https://api.kilo.ai/api/gateway/`
- Para más opciones de modelos/proveedores, consulta [/concepts/model-providers](/es/concepts/model-providers).
- Kilo Gateway utiliza un token de Bearer con tu clave de API entre bastidores.

import es from "/components/footer/es.mdx";

<es />
