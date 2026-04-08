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

1. Vaya a [app.kilo.ai](https://app.kilo.ai)
2. Inicia sesión o crea una cuenta
3. Navega a API Keys y genera una nueva clave

## Configuración de CLI

```bash
openclaw onboard --auth-choice kilocode-api-key
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

El modelo predeterminado es `kilocode/kilo/auto`, un modelo de enrutamiento inteligente propiedad del proveedor
administrado por Kilo Gateway.

OpenClaw trata `kilocode/kilo/auto` como la referencia predeterminada estable, pero no
publica una asignación de tarea a modelo upstream respaldada por origen para esa ruta.

## Modelos disponibles

OpenClaw descubre dinámicamente los modelos disponibles desde Kilo Gateway al inicio. Use
`/models kilocode` para ver la lista completa de modelos disponibles con su cuenta.

Cualquier modelo disponible en la puerta de enlace se puede usar con el prefijo `kilocode/`:

```
kilocode/kilo/auto              (default - smart routing)
kilocode/anthropic/claude-sonnet-4
kilocode/openai/gpt-5.4
kilocode/google/gemini-3-pro-preview
...and many more
```

## Notas

- Las referencias de modelo son `kilocode/<model-id>` (por ejemplo, `kilocode/anthropic/claude-sonnet-4`).
- Modelo predeterminado: `kilocode/kilo/auto`
- URL base: `https://api.kilo.ai/api/gateway/`
- El catálogo de respaldo incluido siempre contiene `kilocode/kilo/auto` (`Kilo Auto`) con
  `input: ["text", "image"]`, `reasoning: true`, `contextWindow: 1000000`
  y `maxTokens: 128000`
- Al inicio, OpenClaw intenta `GET https://api.kilo.ai/api/gateway/models` y
  fusiona los modelos descubiertos antes del catálogo de respaldo estático
- El enrutamiento exacto upstream detrás de `kilocode/kilo/auto` es propiedad de Kilo Gateway,
  no está codificado en OpenClaw
- Kilo Gateway está documentado en el origen como compatible con OpenRouter, por lo que se mantiene en
  la ruta compatible con OpenAI de estilo proxy en lugar de la configuración de solicitudes nativa de OpenAI
- Las referencias de Kilo respaldadas por Gemini se mantienen en la ruta proxy-Gemini, por lo que OpenClaw mantiene
  la limpieza de firmas de pensamiento de Gemini allí sin habilitar la validación de repetición nativa de Gemini
  o reescrituras de arranque.
- El contenedor de flujo compartido de Kilo agrega el encabezado de la aplicación del proveedor y normaliza
  las cargas útiles de razonamiento del proxy para referencias de modelo concretas compatibles. `kilocode/kilo/auto`
  y otras sugerencias no compatibles con el razonamiento del proxy omiten esa inyección de razonamiento.
- Para obtener más opciones de modelo/proveedor, consulte [/concepts/model-providers](/en/concepts/model-providers).
- Kilo Gateway utiliza un token de portador (Bearer token) con su clave de API en segundo plano.
