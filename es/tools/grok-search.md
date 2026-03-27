---
summary: "Búsqueda web Grok mediante respuestas fundamentadas en la web de xAI"
read_when:
  - You want to use Grok for web_search
  - You need an XAI_API_KEY for web search
title: "Búsqueda Grok"
---

# Búsqueda Grok

OpenClaw admite Grok como proveedor `web_search`, utilizando respuestas fundamentadas en la web de xAI para producir respuestas sintetizadas por IA respaldadas por resultados de búsqueda en vivo con citas.

## Obtener una clave de API

<Steps>
  <Step title="Crear una clave">
    Obtenga una clave de API de [xAI](https://console.x.ai/).
  </Step>
  <Step title="Almacenar la clave">
    Establezca `XAI_API_KEY` en el entorno de Gateway, o configure mediante:

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
      xai: {
        config: {
          webSearch: {
            apiKey: "xai-...", // optional if XAI_API_KEY is set
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "grok",
      },
    },
  },
}
```

**Alternativa de entorno:** establezca `XAI_API_KEY` en el entorno de Gateway.
Para una instalación de puerta de enlace, colóquela en `~/.openclaw/.env`.

## Cómo funciona

Grok utiliza respuestas fundamentadas en la web de xAI para sintetizar respuestas con citas en línea, similar al enfoque de fundamentación en la búsqueda de Google de Gemini.

## Parámetros admitidos

La búsqueda de Grok admite los parámetros estándar `query` y `count`.
Los filtros específicos del proveedor no son compatibles actualmente.

## Relacionado

- [Descripción general de la búsqueda web](/es/tools/web) -- todos los proveedores y detección automática
- [Búsqueda Gemini](/es/tools/gemini-search) -- respuestas sintetizadas por IA mediante la fundamentación de Google

import es from "/components/footer/es.mdx";

<es />
