---
summary: "Configuración de la API de Brave Search para web_search"
read_when:
  - You want to use Brave Search for web_search
  - You need a BRAVE_API_KEY or plan details
title: "Brave Search (ruta heredada)"
---

# API de Brave Search

OpenClaw admite la API de Brave Search como proveedor `web_search`.

## Obtener una clave de API

1. Cree una cuenta de API de Brave Search en [https://brave.com/search/api/](https://brave.com/search/api/)
2. En el panel, elija el plan **Search** y genere una clave de API.
3. Guarde la clave en la configuración o establezca `BRAVE_API_KEY` en el entorno de Gateway.

## Ejemplo de configuración

```json5
{
  plugins: {
    entries: {
      brave: {
        config: {
          webSearch: {
            apiKey: "BRAVE_API_KEY_HERE",
            mode: "web", // or "llm-context"
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "brave",
        maxResults: 5,
        timeoutSeconds: 30,
      },
    },
  },
}
```

La configuración de búsqueda de Brave específica del proveedor ahora se encuentra bajo `plugins.entries.brave.config.webSearch.*`.
El `tools.web.search.apiKey` heredado aún se carga a través del shim de compatibilidad, pero ya no es la ruta de configuración canónica.

`webSearch.mode` controla el transporte de Brave:

- `web` (predeterminado): búsqueda web normal de Brave con títulos, URL y fragmentos
- `llm-context`: API de contexto LLM de Brave con fragmentos de texto preextraídos y fuentes para grounding

## Parámetros de la herramienta

| Parámetro     | Descripción                                                                           |
| ------------- | ------------------------------------------------------------------------------------- |
| `query`       | Consulta de búsqueda (obligatorio)                                                    |
| `count`       | Número de resultados a devolver (1-10, predeterminado: 5)                             |
| `country`     | Código de país ISO de 2 letras (p. ej., "US", "DE")                                   |
| `language`    | Código de idioma ISO 639-1 para los resultados de búsqueda (p. ej., "en", "de", "fr") |
| `search_lang` | Código de idioma de búsqueda de Brave (p. ej., `en`, `en-gb`, `zh-hans`)              |
| `ui_lang`     | Código de idioma ISO para elementos de la interfaz de usuario                         |
| `freshness`   | Filtro de tiempo: `day` (24h), `week`, `month` o `year`                               |
| `date_after`  | Solo resultados publicados después de esta fecha (AAAA-MM-DD)                         |
| `date_before` | Solo resultados publicados antes de esta fecha (AAAA-MM-DD)                           |

**Ejemplos:**

```javascript
// Country and language-specific search
await web_search({
  query: "renewable energy",
  country: "DE",
  language: "de",
});

// Recent results (past week)
await web_search({
  query: "AI news",
  freshness: "week",
});

// Date range search
await web_search({
  query: "AI developments",
  date_after: "2024-01-01",
  date_before: "2024-06-30",
});
```

## Notas

- OpenClaw utiliza el plan **Search** de Brave. Si tiene una suscripción heredada (p. ej., el plan Free original con 2000 consultas/mes), sigue siendo válida pero no incluye funciones más recientes como LLM Context o límites de tasa más altos.
- Cada plan de Brave incluye **\$5/mes en crédito gratuito** (renovable). El plan Search cuesta \$5 por cada 1000 solicitudes, por lo que el crédito cubre 1000 consultas/mes. Establezca su límite de uso en el panel de Brave para evitar cargos inesperados. Consulte el [portal de la API de Brave](https://brave.com/search/api/) para conocer los planes actuales.
- El plan Search incluye el punto final de contexto LLM y derechos de inferencia de IA. Almacenar resultados para entrenar o ajustar modelos requiere un plan con derechos de almacenamiento explícitos. Consulte los [Términos de servicio](https://api-dashboard.search.brave.com/terms-of-service) de Brave.
- El modo `llm-context` devuelve entradas de fuente fundamentadas en lugar de la forma de fragmento de búsqueda web normal.
- El modo `llm-context` no admite `ui_lang`, `freshness`, `date_after` ni `date_before`.
- `ui_lang` debe incluir una subetiqueta de región como `en-US`.
- Los resultados se almacenan en caché durante 15 minutos de forma predeterminada (configurable a través de `cacheTtlMinutes`).

Consulte [Herramientas web](/es/tools/web) para obtener la configuración completa de web_search.
