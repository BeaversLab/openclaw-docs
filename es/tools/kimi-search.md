---
summary: "Búsqueda web de Kimi mediante la búsqueda web de Moonshot"
read_when:
  - You want to use Kimi for web_search
  - You need a KIMI_API_KEY or MOONSHOT_API_KEY
title: "Búsqueda Kimi"
---

# Búsqueda Kimi

OpenClaw soporta Kimi como proveedor `web_search`, utilizando la búsqueda web de Moonshot
para producir respuestas sintetizadas por IA con citas.

## Obtener una clave de API

<Steps>
  <Step title="Crear una clave">
    Obtenga una clave de API de [Moonshot AI](https://platform.moonshot.cn/).
  </Step>
  <Step title="Guardar la clave">
    Establezca `KIMI_API_KEY` o `MOONSHOT_API_KEY` en el entorno de Gateway, o
    configure a través de:

    ```bash
    openclaw configure --section web
    ```

  </Step>
</Steps>

## Configuración

```json5
{
  plugins: {
    entries: {
      moonshot: {
        config: {
          webSearch: {
            apiKey: "sk-...", // optional if KIMI_API_KEY or MOONSHOT_API_KEY is set
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "kimi",
      },
    },
  },
}
```

**Alternativa de entorno:** establezca `KIMI_API_KEY` o `MOONSHOT_API_KEY` en el
entorno de Gateway. Para una instalación de gateway, póngalo en `~/.openclaw/.env`.

## Cómo funciona

Kimi utiliza la búsqueda web de Moonshot para sintetizar respuestas con citas en línea,
similar al enfoque de respuesta fundamentada de Gemini y Grok.

## Parámetros admitidos

La búsqueda de Kimi admite los parámetros estándar `query` y `count`.
Los filtros específicos del proveedor no son compatibles actualmente.

## Relacionado

- [Descripción general de la búsqueda web](/es/tools/web) -- todos los proveedores y detección automática
- [Búsqueda Gemini](/es/tools/gemini-search) -- respuestas sintetizadas por IA mediante grounding de Google
- [Búsqueda Grok](/es/tools/grok-search) -- respuestas sintetizadas por IA mediante grounding de xAI

import es from "/components/footer/es.mdx";

<es />
