---
summary: "Búsqueda web Grok mediante respuestas fundamentadas en la web de xAI"
read_when:
  - You want to use Grok for web_search
  - You need an XAI_API_KEY for web search
title: "Búsqueda Grok"
---

# Búsqueda Grok

OpenClaw admite Grok como proveedor `web_search`, utilizando respuestas fundamentadas en la web de xAI para producir respuestas sintetizadas por IA respaldadas por resultados de búsqueda en vivo con citas.

La misma `XAI_API_KEY` también puede alimentar la herramienta `x_search` integrada para la búsqueda de publicaciones de X
(anteriormente Twitter). Si almacena la clave en
`plugins.entries.xai.config.webSearch.apiKey`, OpenClaw ahora la reutiliza como
alternativa para el proveedor del modelo xAI incluido también.

Para métricas de X a nivel de publicación, como republicaciones, respuestas, marcadores o vistas, prefiera
`x_search` con la URL exacta de la publicación o el ID de estado en lugar de una consulta de búsqueda
amplia.

## Incorporación y configuración

Si elige **Grok** durante:

- `openclaw onboard`
- `openclaw configure --section web`

OpenClaw puede mostrar un paso de seguimiento separado para habilitar `x_search` con la misma
`XAI_API_KEY`. Ese seguimiento:

- solo aparece después de elegir Grok para `web_search`
- no es una opción separada de proveedor de búsqueda web de nivel superior
- puede establecer opcionalmente el modelo `x_search` durante el mismo flujo

Si lo omite, puede habilitar o cambiar `x_search` más tarde en la configuración.

## Obtener una clave de API

<Steps>
  <Step title="Crear una clave">
    Obtén una clave de API de [xAI](https://console.x.ai/).
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

**Alternativa de entorno:** establezca `XAI_API_KEY` en el entorno de Gateway.
Para una instalación de puerta de enlace, póngalo en `~/.openclaw/.env`.

## Cómo funciona

Grok utiliza respuestas fundamentadas en la web de xAI para sintetizar respuestas con citas
en línea, similar al enfoque de fundamentación en la búsqueda de Google de Gemini.

## Parámetros admitidos

La búsqueda de Grok admite `query`.

Se acepta `count` para la compatibilidad compartida de `web_search`, pero Grok todavía
devuelve una respuesta sintetizada con citas en lugar de una lista de N resultados.

Los filtros específicos del proveedor no son compatibles actualmente.

## Relacionado

- [Información general de la búsqueda web](/en/tools/web) -- todos los proveedores y detección automática
- [x_search en la búsqueda web](/en/tools/web#x_search) -- búsqueda de X de primera clase a través de xAI
- [Búsqueda de Gemini](/en/tools/gemini-search) -- respuestas sintetizadas por IA a través de Google grounding
