---
summary: "Configuración de la API de Brave Search para web_search"
read_when:
  - Desea utilizar Brave Search para web_search
  - Necesita un BRAVE_API_KEY o detalles del plan
title: "Brave Search"
---

# API de Brave Search

OpenClaw es compatible con la API de Brave Search como proveedor de `web_search`.

## Obtener una clave de API

1. Cree una cuenta de API de Brave Search en [https://brave.com/search/api/](https://brave.com/search/api/)
2. En el panel de control, elija el plan **Search** y genere una clave de API.
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

La configuración específica del proveedor de búsqueda de Brave ahora reside en `plugins.entries.brave.config.webSearch.*`.
El `tools.web.search.apiKey` heredado aún se carga a través de la capa de compatibilidad, pero ya no es la ruta de configuración canónica.

## Parámetros de la herramienta

| Parámetro     | Descripción                                                                                |
| ------------- | ------------------------------------------------------------------------------------------ |
| `query`       | Consulta de búsqueda (requerida)                                                           |
| `count`       | Número de resultados a devolver (1-10, predeterminado: 5)                                  |
| `country`     | Código de país ISO de dos letras (por ejemplo, "US", "DE")                                 |
| `language`    | Código de idioma ISO 639-1 para los resultados de búsqueda (por ejemplo, "en", "de", "fr") |
| `ui_lang`     | Código de idioma ISO para los elementos de la interfaz de usuario                          |
| `freshness`   | Filtro de tiempo: `day` (24h), `week`, `month` o `year`                                    |
| `date_after`  | Solo resultados publicados después de esta fecha (AAAA-MM-DD)                              |
| `date_before` | Solo resultados publicados antes de esta fecha (AAAA-MM-DD)                                |

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

- OpenClaw utiliza el plan **Search** de Brave. Si tiene una suscripción heredada (por ejemplo, el plan Free original con 2000 consultas/mes), sigue siendo válida pero no incluye funciones más nuevas como LLM Context o límites de tasa más altos.
- Cada plan de Brave incluye **\$5/mes en crédito gratuito** (renovable). El plan Search cuesta \$5 por cada 1000 solicitudes, por lo que el crédito cubre 1000 consultas/mes. Establezca su límite de uso en el panel de Brave para evitar cargos inesperados. Consulte el [portal de la API de Brave](https://brave.com/search/api/) para conocer los planes actuales.
- El plan de búsqueda incluye el punto de conexión de contexto LLM y derechos de inferencia de IA. Almacenar resultados para entrenar o ajustar modelos requiere un plan con derechos de almacenamiento explícitos. Consulte los Brave [Términos de servicio](https://api-dashboard.search.brave.com/terms-of-service).
- Los resultados se almacenan en caché durante 15 minutos de forma predeterminada (configurable a través de `cacheTtlMinutes`).

Consulte [Herramientas web](/es/tools/web) para obtener la configuración completa de web_search.

import es from "/components/footer/es.mdx";

<es />
