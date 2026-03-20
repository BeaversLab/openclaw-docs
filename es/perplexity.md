---
summary: "API de búsqueda de Perplexity y compatibilidad con Sonar/OpenRouter para web_search"
read_when:
  - Deseas utilizar Perplexity Search para la búsqueda web
  - Necesitas configuración de PERPLEXITY_API_KEY o OPENROUTER_API_KEY
title: "Perplexity Search"
---

# API de búsqueda de Perplexity

OpenClaw es compatible con la API de búsqueda de Perplexity como proveedor `web_search`.
Devuelve resultados estructurados con los campos `title`, `url` y `snippet`.

Para compatibilidad, OpenClaw también admite configuraciones heredadas de Perplexity Sonar/OpenRouter.
Si usas `OPENROUTER_API_KEY`, una clave `sk-or-...` en `plugins.entries.perplexity.config.webSearch.apiKey`, o estableces `plugins.entries.perplexity.config.webSearch.baseUrl` / `model`, el proveedor cambia a la ruta de chat-completions y devuelve respuestas sintetizadas por IA con citas en lugar de resultados estructurados de la API de búsqueda.

## Obtener una clave de API de Perplexity

1. Crea una cuenta de Perplexity en [perplexity.ai/settings/api](https://www.perplexity.ai/settings/api)
2. Genera una clave de API en el panel de control
3. Almacena la clave en la configuración o establece `PERPLEXITY_API_KEY` en el entorno del Gateway.

## Compatibilidad con OpenRouter

Si ya estabas utilizando OpenRouter para Perplexity Sonar, mantén `provider: "perplexity"` y establece `OPENROUTER_API_KEY` en el entorno del Gateway, o almacena una clave `sk-or-...` en `plugins.entries.perplexity.config.webSearch.apiKey`.

Controles de compatibilidad opcionales:

- `plugins.entries.perplexity.config.webSearch.baseUrl`
- `plugins.entries.perplexity.config.webSearch.model`

## Ejemplos de configuración

### API de búsqueda de Perplexity nativa

```json5
{
  plugins: {
    entries: {
      perplexity: {
        config: {
          webSearch: {
            apiKey: "pplx-...",
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "perplexity",
      },
    },
  },
}
```

### Compatibilidad con OpenRouter / Sonar

```json5
{
  plugins: {
    entries: {
      perplexity: {
        config: {
          webSearch: {
            apiKey: "<openrouter-api-key>",
            baseUrl: "https://openrouter.ai/api/v1",
            model: "perplexity/sonar-pro",
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "perplexity",
      },
    },
  },
}
```

## Dónde establecer la clave

**A través de la configuración:** ejecuta `openclaw configure --section web`. Almacena la clave en
`~/.openclaw/openclaw.json` bajo `plugins.entries.perplexity.config.webSearch.apiKey`.
Ese campo también acepta objetos SecretRef.

**A través del entorno:** establece `PERPLEXITY_API_KEY` o `OPENROUTER_API_KEY`
en el entorno del proceso del Gateway. Para una instalación de puerta de enlace, colócala en
`~/.openclaw/.env` (o en el entorno de tu servicio). Consulta [Env vars](/es/help/faq#how-does-openclaw-load-environment-variables).

Si `provider: "perplexity"` está configurado y el SecretRef de la clave de Perplexity no está resuelto sin respaldo de entorno, el inicio/recarga falla rápidamente.

## Parámetros de la herramienta

Estos parámetros se aplican a la ruta de la API de búsqueda de Perplexity nativa.

| Parámetro             | Descripción                                                             |
| --------------------- | ----------------------------------------------------------------------- |
| `query`               | Consulta de búsqueda (obligatoria)                                      |
| `count`               | Número de resultados a devolver (1-10, predeterminado: 5)               |
| `country`             | Código de país ISO de 2 letras (por ejemplo, "US", "DE")                |
| `language`            | Código de idioma ISO 639-1 (por ejemplo, "en", "de", "fr")              |
| `freshness`           | Filtro de tiempo: `day` (24h), `week`, `month` o `year`                 |
| `date_after`          | Solo resultados publicados después de esta fecha (AAAA-MM-DD)           |
| `date_before`         | Solo resultados publicados antes de esta fecha (AAAA-MM-DD)             |
| `domain_filter`       | Lista de permitidos/denegados de dominios (máximo 20)                   |
| `max_tokens`          | Presupuesto total de contenido (predeterminado: 25000, máximo: 1000000) |
| `max_tokens_per_page` | Límite de tokens por página (predeterminado: 2048)                      |

Para la ruta de compatibilidad heredada de Sonar/OpenRouter, solo `query` y `freshness` son compatibles.
Los filtros exclusivos de la API de búsqueda, como `country`, `language`, `date_after`, `date_before`, `domain_filter`, `max_tokens` y `max_tokens_per_page`, devuelven errores explícitos.

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

// Domain filtering (allowlist)
await web_search({
  query: "climate research",
  domain_filter: ["nature.com", "science.org", ".edu"],
});

// Domain filtering (denylist - prefix with -)
await web_search({
  query: "product reviews",
  domain_filter: ["-reddit.com", "-pinterest.com"],
});

// More content extraction
await web_search({
  query: "detailed AI research",
  max_tokens: 50000,
  max_tokens_per_page: 4096,
});
```

### Reglas de filtro de dominio

- Máximo 20 dominios por filtro
- No se puede mezclar la lista de permitidos y la de denegados en la misma solicitud
- Use el prefijo `-` para las entradas de la lista de denegados (por ejemplo, `["-reddit.com"]`)

## Notas

- La API de búsqueda de Perplexity devuelve resultados de búsqueda web estructurados (`title`, `url`, `snippet`)
- OpenRouter o los interruptores explícitos `plugins.entries.perplexity.config.webSearch.baseUrl` / `model` hacen que Perplexity vuelva a las terminaciones de chat de Sonar para la compatibilidad
- Los resultados se almacenan en caché durante 15 minutos de forma predeterminada (configurable mediante `cacheTtlMinutes`)

Consulte [Web tools](/es/tools/web) para obtener la configuración completa de web_search.
Consulte [Perplexity Search API docs](https://docs.perplexity.ai/docs/search/quickstart) para obtener más detalles.

import es from "/components/footer/es.mdx";

<es />
