---
summary: "Búsqueda web Grok mediante respuestas fundamentadas en la web de xAI"
read_when:
  - You want to use Grok for web_search
  - You need an XAI_API_KEY for web search
title: "Búsqueda de Grok"
---

OpenClaw admite Grok como proveedor de `web_search`, utilizando respuestas de xAI basadas en la web
para producir respuestas sintetizadas por IA respaldadas por resultados de búsqueda en vivo
con citas.

La misma clave de API de xAI también puede alimentar la herramienta integrada `x_search` para la búsqueda de publicaciones de X (antes Twitter) y la herramienta `code_execution`. Si almacena la clave bajo `plugins.entries.xai.config.webSearch.apiKey`, OpenClaw ahora la reutiliza como alternativa para el proveedor de modelo xAI incluido también.

Para métricas de X a nivel de publicación, como republicaciones, respuestas, marcadores o vistas, prefiera
`x_search` con la URL exacta de la publicación o el ID de estado en lugar de una
consulta de búsqueda amplia.

## Incorporación y configuración

Si elige **Grok** durante:

- `openclaw onboard`
- `openclaw configure --section web`

OpenClaw puede mostrar un paso de seguimiento separado para habilitar `x_search` con el mismo
`XAI_API_KEY`. Ese seguimiento:

- solo aparece después de elegir Grok para `web_search`
- no es una opción separada de proveedor de búsqueda web de nivel superior
- puede configurar opcionalmente el modelo `x_search` durante el mismo flujo

Si lo omite, puede habilitar o cambiar `x_search` más tarde en la configuración.

## Obtener una clave de API

<Steps>
  <Step title="Crear una clave">
    Obtenga una clave de API de [xAI](https://console.x.ai/).
  </Step>
  <Step title="Almacenar la clave">
    Establezca `XAI_API_KEY` en el entorno de Gateway, o configure vía:

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
            baseUrl: "https://api.x.ai/v1", // optional Responses API proxy/base URL override
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
Para una instalación de puerta de enlace, póngala en `~/.openclaw/.env`.

## Cómo funciona

Grok utiliza respuestas de xAI basadas en la web para sintetizar respuestas con
citas en línea, similar al enfoque de vinculación con la búsqueda de Google de Gemini.

## Parámetros admitidos

La búsqueda de Grok admite `query`.

Se acepta `count` para la compatibilidad compartida de `web_search`, pero Grok aún
devuelve una respuesta sintetizada con citas en lugar de una lista de N resultados.

Los filtros específicos del proveedor no son compatibles actualmente.

Grok utiliza un tiempo de espera predeterminado de 60 segundos específico del proveedor porque las búsquedas fundamentadas en la web de xAI Responses pueden tardar más que el valor predeterminado compartido `web_search`. Establezca `tools.web.search.timeoutSeconds` para anularlo.

## Anulaciones de URL base

Establezca `plugins.entries.xai.config.webSearch.baseUrl` cuando la búsqueda web de Grok deba enrutar a través de un proxy de operador o un punto de conexión de Responses compatible con xAI. OpenClaw publica en `<baseUrl>/responses` después de recortar las barras diagonales finales. `x_search` utiliza la misma alternativa `webSearch.baseUrl` a menos que se establezca `plugins.entries.xai.config.xSearch.baseUrl`.

## Relacionado

- [Descripción general de la búsqueda web](/es/tools/web) -- todos los proveedores y detección automática
- [x_search en la búsqueda web](/es/tools/web#x_search) -- búsqueda de X de primera clase a través de xAI
- [Gemini Search](/es/tools/gemini-search) -- respuestas sintetizadas por IA mediante fundamentación de Google
