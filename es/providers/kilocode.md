---
title: "Kilo Gateway"
summary: "Use la API unificada de Kilo Gateway para acceder a muchos modelos en OpenClaw"
read_when:
  - Desea una sola clave API para muchos LLMs
  - Desea ejecutar modelos a través de Kilo Gateway en OpenClaw
---

# Kilo Gateway

Kilo Gateway proporciona una **API unificada** que enruta las solicitudes a muchos modelos detrás de un único
endpoint y clave API. Es compatible con OpenAI, por lo que la mayoría de los SDK de OpenAI funcionan simplemente cambiando la URL base.

## Obtener una clave API

1. Vaya a [app.kilo.ai](https://app.kilo.ai)
2. Inicie sesión o cree una cuenta
3. Navegue a API Keys y genere una nueva clave

## Configuración de CLI

```bash
openclaw onboard --kilocode-api-key <key>
```

O configure la variable de entorno:

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

El modelo predeterminado es `kilocode/kilo/auto`, un modelo de enrutamiento inteligente que selecciona automáticamente
el mejor modelo subyacente según la tarea:

- Las tareas de planificación, depuración y orquestación se enrutan a Claude Opus
- Las tareas de escritura y exploración de código se enrutan a Claude Sonnet

## Modelos disponibles

OpenClaw descubre dinámicamente los modelos disponibles desde Kilo Gateway al inicio. Use
`/models kilocode` para ver la lista completa de modelos disponibles con su cuenta.

Cualquier modelo disponible en la puerta de enlace se puede usar con el prefijo `kilocode/`:

```
kilocode/kilo/auto              (default - smart routing)
kilocode/anthropic/claude-sonnet-4
kilocode/openai/gpt-5.2
kilocode/google/gemini-3-pro-preview
...and many more
```

## Notas

- Las referencias de modelo son `kilocode/<model-id>` (p. ej., `kilocode/anthropic/claude-sonnet-4`).
- Modelo predeterminado: `kilocode/kilo/auto`
- URL base: `https://api.kilo.ai/api/gateway/`
- Para obtener más opciones de modelos/proveedores, consulte [/concepts/model-providers](/es/concepts/model-providers).
- Kilo Gateway utiliza un token Bearer con su clave API en segundo plano.

import en from "/components/footer/en.mdx";

<en />
