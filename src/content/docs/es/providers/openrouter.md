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
openclaw onboard --auth-choice openrouter-api-key
```

## Fragmento de configuración

```json5
{
  env: { OPENROUTER_API_KEY: "sk-or-..." },
  agents: {
    defaults: {
      model: { primary: "openrouter/auto" },
    },
  },
}
```

## Notas

- Las referencias de modelos son `openrouter/<provider>/<model>`.
- La integración por defecto es `openrouter/auto`. Cambie a un modelo concreto más tarde con
  `openclaw models set openrouter/<provider>/<model>`.
- Para más opciones de modelos/proveedores, consulte [/concepts/model-providers](/en/concepts/model-providers).
- OpenRouter utiliza un token Bearer con su clave de API entre bambalinas.
- En las solicitudes reales a OpenRouter (`https://openrouter.ai/api/v1`), OpenClaw también
  añade los encabezados de atribución de la aplicación documentados por OpenRouter:
  `HTTP-Referer: https://openclaw.ai`, `X-OpenRouter-Title: OpenClaw` y
  `X-OpenRouter-Categories: cli-agent`.
- En las rutas verificadas de OpenRouter, las referencias de modelos de Anthropic también mantienen
  los marcadores `cache_control` específicos de Anthropic de OpenRouter que OpenClaw utiliza para
  una mejor reutilización del caché de mensajes en los bloques de mensajes del sistema/desarrollador.
- Si redirecciona el proveedor OpenRouter a otro proxy/URL base, OpenClaw
  no inyecta esos encabezados específicos de OpenRouter ni los marcadores de caché de Anthropic.
- OpenRouter aún se ejecuta a través de la ruta compatible con OpenAI de estilo proxy, por lo que
  el modelado de solicitudes nativo solo de OpenAI, como `serviceTier`, Respuestas `store`,
  las cargas útiles de compatibilidad de razonamiento de OpenAI y las sugerencias de caché de mensajes no se reenvían.
- Las referencias de OpenRouter respaldadas por Gemini se mantienen en la ruta proxy-Gemini: OpenClaw mantiene
  allí la saneación de firmas de pensamiento de Gemini, pero no activa la validación
  de repetición nativa de Gemini ni las reescrituras de arranque.
- En las rutas admitidas que no son de `auto`, OpenClaw asigna el nivel de pensamiento seleccionado a
  las cargas útiles de razonamiento del proxy OpenRouter. Las sugerencias de modelo no admitidas y
  `openrouter/auto` omiten esa inyección de razonamiento.
- Si pasa el enrutamiento del proveedor OpenRouter bajo los parámetros del modelo, OpenClaw lo reenvía
  como metadatos de enrutamiento de OpenRouter antes de que se ejecuten los envoltorios de transmisión compartidos.
