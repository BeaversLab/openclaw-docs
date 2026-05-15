---
summary: "Búsqueda web de Gemini con fundamentación en Google Search"
read_when:
  - You want to use Gemini for web_search
  - You need a GEMINI_API_KEY or models.providers.google.apiKey
  - You want Google Search grounding
title: "Búsqueda Gemini"
---

OpenClaw es compatible con modelos Gemini con
[Google Search grounding](https://ai.google.dev/gemini-api/docs/grounding)
integrado, que devuelve respuestas sintetizadas por IA respaldadas por resultados
en vivo de Google Search con citas.

## Obtener una clave de API

<Steps>
  <Step title="Crear una clave">
    Ve a [Google AI Studio](https://aistudio.google.com/apikey) y crea una
    clave de API.
  </Step>
  <Step title="Guardar la clave">
    Establece `GEMINI_API_KEY` en el entorno de Gateway, reutiliza
    `models.providers.google.apiKey`, o configura una clave dedicada de búsqueda web mediante:

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
            apiKey: "AIza...", // optional if GEMINI_API_KEY or models.providers.google.apiKey is set
            baseUrl: "https://generativelanguage.googleapis.com/v1beta", // optional; falls back to models.providers.google.baseUrl
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

**Precedencia de credenciales:** La búsqueda web de Gemini utiliza
`plugins.entries.google.config.webSearch.apiKey` primero, luego `GEMINI_API_KEY`,
luego `models.providers.google.apiKey`. Para las URL base, la `plugins.entries.google.config.webSearch.baseUrl` dedicada
tiene prioridad sobre `models.providers.google.baseUrl`.

Para una instalación de gateway, coloca las claves de entorno en `~/.openclaw/.env`.

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

La búsqueda de Gemini admite `query`, `freshness`, `date_after` y `date_before`.

Se acepta `count` por compatibilidad con `web_search` compartida, pero el grounding
de Gemini aún devuelve una respuesta sintetizada con citas en lugar de una
lista de N resultados.

`freshness` acepta `day`, `week`, `month`, `year` y los accesos directos compartidos
`pd`, `pw`, `pm` y `py`. OpenClaw convierte estos valores, o un rango explícito
de `date_after`/`date_before`, en el `timeRangeFilter` del grounding de Google Search de Gemini.
`country`, `language` y `domain_filter` no son compatibles.

## Selección de modelo

El modelo predeterminado es `gemini-2.5-flash` (rápido y rentable). Cualquier modelo
Gemini que admita grounding se puede utilizar mediante
`plugins.entries.google.config.webSearch.model`.

## Invalidaciones de URL base

Configure `plugins.entries.google.config.webSearch.baseUrl` cuando la búsqueda web de Gemini deba enrutar a través de un proxy de operador o un punto final personalizado compatible con Gemini. Si no está configurado, la búsqueda web de Gemini reutiliza `models.providers.google.baseUrl`. Un valor simple `https://generativelanguage.googleapis.com` se normaliza a `https://generativelanguage.googleapis.com/v1beta`; las rutas de proxy personalizadas se mantienen tal como se proporcionan después de eliminar las barras diagonales finales.

## Relacionado

- [Resumen de búsqueda web](/es/tools/web) -- todos los proveedores y detección automática
- [Búsqueda Brave](/es/tools/brave-search) -- resultados estructurados con fragmentos
- [Búsqueda Perplexity](/es/tools/perplexity-search) -- resultados estructurados + extracción de contenido
