---
summary: "Búsqueda web de Gemini con fundamentación en Google Search"
read_when:
  - You want to use Gemini for web_search
  - You need a GEMINI_API_KEY
  - You want Google Search grounding
title: "Búsqueda Gemini"
---

OpenClaw admite modelos de Gemini con
[grounding de Google Search](https://ai.google.dev/gemini-api/docs/grounding) integrado,
que devuelve respuestas sintetizadas por IA respaldadas por resultados en vivo de Google Search con
citaciones.

## Obtener una clave de API

<Steps>
  <Step title="Crear una clave">
    Ve a [Google AI Studio](https://aistudio.google.com/apikey) y crea una
    clave de API.
  </Step>
  <Step title="Guardar la clave">
    Establezca `GEMINI_API_KEY` en el entorno de Gateway, o configure mediante:

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
      google: {
        config: {
          webSearch: {
            apiKey: "AIza...", // optional if GEMINI_API_KEY is set
            model: "gemini-2.5-flash", // default
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "gemini",
      },
    },
  },
}
```

**Alternativa de entorno:** establezca `GEMINI_API_KEY` en el entorno de Gateway.
Para una instalación de gateway, póngalo en `~/.openclaw/.env`.

## Cómo funciona

A diferencia de los proveedores de búsqueda tradicionales que devuelven una lista de enlaces y fragmentos,
Gemini utiliza el grounding de Google Search para producir respuestas sintetizadas por IA con
citaciones en línea. Los resultados incluyen tanto la respuesta sintetizada como las URL de
fuente.

- Las URL de citación del grounding de Gemini se resuelven automáticamente desde las
  URL de redirección de Google a URL directas.
- La resolución de redireccionamientos utiliza la ruta de protección SSRF (HEAD + verificaciones de redirección +
  validación http/https) antes de devolver la URL de citación final.
- La resolución de redireccionamientos utiliza valores predeterminados SSRF estrictos, por lo que los redireccionamientos a
  objetivos privados/internos están bloqueados.

## Parámetros admitidos

La búsqueda de Gemini admite `query`.

Se acepta `count` para la compatibilidad compartida de `web_search`, pero el grounding de Gemini
aún devuelve una respuesta sintetizada con citas en lugar de una lista de
N resultados.

Los filtros específicos del proveedor como `country`, `language`, `freshness` y
`domain_filter` no son compatibles.

## Selección del modelo

El modelo predeterminado es `gemini-2.5-flash` (rápido y rentable). Cualquier modelo
de Gemini que admita grounding se puede utilizar mediante
`plugins.entries.google.config.webSearch.model`.

## Relacionado

- [Descripción general de Web Search](/es/tools/web) -- todos los proveedores y detección automática
- [Brave Search](/es/tools/brave-search) -- resultados estructurados con fragmentos
- [Perplexity Search](/es/tools/perplexity-search) -- resultados estructurados + extracción de contenido
