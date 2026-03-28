---
summary: "Búsqueda web de Gemini con fundamentación en Google Search"
read_when:
  - You want to use Gemini for web_search
  - You need a GEMINI_API_KEY
  - You want Google Search grounding
title: "Búsqueda de Gemini"
---

# Búsqueda de Gemini

OpenClaw es compatible con los modelos de Gemini con
[fundamentación en Google Search](https://ai.google.dev/gemini-api/docs/grounding) integrada,
que devuelve respuestas sintetizadas por IA respaldadas por resultados en vivo de Google Search con
citas.

## Obtener una clave de API

<Steps>
  <Step title="Crear una clave">
    Vaya a [Google AI Studio](https://aistudio.google.com/apikey) y cree una
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
Para una instalación de puerta de enlace, colóquelo en `~/.openclaw/.env`.

## Cómo funciona

A diferencia de los proveedores de búsqueda tradicionales que devuelven una lista de enlaces y fragmentos,
Gemini utiliza la fundamentación en Google Search para producir respuestas sintetizadas por IA con
citas en línea. Los resultados incluyen tanto la respuesta sintetizada como las URL de origen.

- Las URL de cita de la fundamentación de Gemini se resuelven automáticamente desde las URL de
  redirección de Google a URL directas.
- La resolución de redirecciones utiliza la ruta de protección SSRF (HEAD + comprobaciones de redirección +
  validación http/https) antes de devolver la URL de cita final.
- La resolución de redirecciones utiliza los valores predeterminados SSRF estrictos, por lo que las redirecciones a
  objetivos privados/internos están bloqueadas.

## Parámetros compatibles

La búsqueda de Gemini admite los parámetros estándar `query` y `count`.
Los filtros específicos del proveedor como `country`, `language`, `freshness` y
`domain_filter` no son compatibles.

## Selección del modelo

El modelo predeterminado es `gemini-2.5-flash` (rápido y rentable). Se puede utilizar cualquier modelo de Gemini
que admita la fundamentación mediante
`plugins.entries.google.config.webSearch.model`.

## Relacionado

- [Descripción general de Web Search](/es/tools/web) -- todos los proveedores y detección automática
- [Brave Search](/es/tools/brave-search) -- resultados estructurados con fragmentos
- [Perplexity Search](/es/tools/perplexity-search) -- resultados estructurados + extracción de contenido
