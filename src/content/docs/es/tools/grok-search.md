---
summary: "Búsqueda web Grok mediante respuestas fundamentadas en la web de xAI"
read_when:
  - You want to use Grok for web_search
  - You need an XAI_API_KEY for web search
title: "Búsqueda Grok"
---

# Búsqueda Grok

OpenClaw admite Grok como proveedor `web_search`, utilizando respuestas fundamentadas en la web de xAI para producir respuestas sintetizadas por IA respaldadas por resultados de búsqueda en vivo con citas.

La misma `XAI_API_KEY` también puede alimentar la herramienta integrada `x_search` para la búsqueda de publicaciones de X (anteriormente Twitter). Si almacena la clave bajo `plugins.entries.xai.config.webSearch.apiKey`, OpenClaw ahora la reutiliza como alternativa para el proveedor de modelo xAI incluido también.

Para métricas de X a nivel de publicación, como republicaciones, respuestas, marcadores o vistas, prefiera `x_search` con la URL exacta de la publicación o el ID de estado en lugar de una consulta de búsqueda amplia.

## Obtener una clave de API

<Steps>
  <Step title="Crear una clave">
    Obtenga una clave de API de [xAI](https://console.x.ai/).
  </Step>
  <Step title="Almacenar la clave">
    Establezca `XAI_API_KEY` en el entorno de Gateway, o configure a través de:

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

**Alternativa de entorno:** configure `XAI_API_KEY` en el entorno de Gateway.
Para una instalación de puerta de enlace, colóquela en `~/.openclaw/.env`.

## Cómo funciona

Grok utiliza respuestas fundamentadas en la web de xAI para sintetizar respuestas con
citas en línea, de manera similar al enfoque de fundamentación en Google Search de Gemini.

## Parámetros compatibles

La búsqueda de Grok admite los parámetros estándar `query` y `count`.
Actualmente no se admiten filtros específicos del proveedor.

## Relacionado

- [Información general de Web Search](/en/tools/web) -- todos los proveedores y detección automática
- [x_search en Web Search](/en/tools/web#x_search) -- búsqueda de X de primera clase a través de xAI
- [Gemini Search](/en/tools/gemini-search) -- respuestas sintetizadas por IA a través de Google grounding
