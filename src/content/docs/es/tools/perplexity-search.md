---
summary: "API de Perplexity Search y compatibilidad con Sonar/OpenRouter para web_search"
read_when:
  - You want to use Perplexity Search for web search
  - You need PERPLEXITY_API_KEY or OPENROUTER_API_KEY setup
title: "Perplexity Search"
---

# API de Perplexity Search

OpenClaw soporta la API de Perplexity Search como proveedor `web_search`.
Devuelve resultados estructurados con campos `title`, `url` y `snippet`.

Para la compatibilidad, OpenClaw también soporta configuraciones heredadas de Perplexity Sonar/OpenRouter.
Si usa `OPENROUTER_API_KEY`, una clave `sk-or-...` en `plugins.entries.perplexity.config.webSearch.apiKey`, o establece `plugins.entries.perplexity.config.webSearch.baseUrl` / `model`, el proveedor cambia a la ruta de chat-completions y devuelve respuestas sintetizadas por IA con citas en lugar de resultados estructurados de la API de Search.

## Obtener una clave de API de Perplexity

1. Cree una cuenta de Perplexity en [perplexity.ai/settings/api](https://www.perplexity.ai/settings/api)
2. Genere una clave API en el panel de control
3. Guarde la clave en la configuración o establezca `PERPLEXITY_API_KEY` en el entorno de Gateway.

## Compatibilidad con OpenRouter

Si ya estaba usando OpenRouter para Perplexity Sonar, mantenga `provider: "perplexity"` y establezca `OPENROUTER_API_KEY` en el entorno de Gateway, o guarde una clave `sk-or-...` en `plugins.entries.perplexity.config.webSearch.apiKey`.

Controles de compatibilidad opcionales:

- `plugins.entries.perplexity.config.webSearch.baseUrl`
- `plugins.entries.perplexity.config.webSearch.model`

## Ejemplos de configuración

### API nativa de Perplexity Search

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

**A través de la configuración:** ejecute `openclaw configure --section web`. Guarda la clave en
`~/.openclaw/openclaw.json` bajo `plugins.entries.perplexity.config.webSearch.apiKey`.
Ese campo también acepta objetos SecretRef.

**A través del entorno:** establezca `PERPLEXITY_API_KEY` o `OPENROUTER_API_KEY`
en el entorno del proceso de la puerta de enlace (Gateway). Para una instalación de puerta de enlace, póngalo en
`~/.openclaw/.env` (o en el entorno de su servicio). Consulte [Variables de entorno](/es/help/faq#env-vars-and-env-loading).

Si `provider: "perplexity"` está configurado y el SecretRef de la clave Perplexity no está resuelto sin respaldo de entorno, el inicio/recarga falla rápidamente.

## Parámetros de la herramienta

Estos parámetros se aplican a la ruta nativa de la API de Perplexity Search.

| Parámetro             | Descripción                                                             |
| --------------------- | ----------------------------------------------------------------------- |
| `query`               | Consulta de búsqueda (obligatoria)                                      |
| `count`               | Número de resultados a devolver (1-10, predeterminado: 5)               |
| `country`             | Código de país ISO de 2 letras (p. ej., "US", "DE")                     |
| `language`            | Código de idioma ISO 639-1 (p. ej., "en", "de", "fr")                   |
| `freshness`           | Filtro de tiempo: `day` (24h), `week`, `month` o `year`                 |
| `date_after`          | Solo resultados publicados después de esta fecha (AAAA-MM-DD)           |
| `date_before`         | Solo resultados publicados antes de esta fecha (AAAA-MM-DD)             |
| `domain_filter`       | Lista de permitidos/denegados de dominios (máximo 20)                   |
| `max_tokens`          | Presupuesto total de contenido (predeterminado: 25000, máximo: 1000000) |
| `max_tokens_per_page` | Límite de tokens por página (predeterminado: 2048)                      |

Para la ruta de compatibilidad heredada de Sonar/OpenRouter:

- Se aceptan `query`, `count` y `freshness`
- `count` es solo para compatibilidad allí; la respuesta sigue siendo una respuesta
  sintetizada con citas en lugar de una lista de N resultados
- Los filtros exclusivos de la API de búsqueda como `country`, `language`, `date_after`,
  `date_before`, `domain_filter`, `max_tokens` y `max_tokens_per_page`
  devuelven errores explícitos

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

### Reglas de filtrado de dominio

- Máximo 20 dominios por filtro
- No se puede mezclar lista de permitidos y lista de bloqueados en la misma solicitud
- Use el prefijo `-` para las entradas de lista de bloqueados (por ejemplo, `["-reddit.com"]`)

## Notas

- La API de búsqueda de Perplexity devuelve resultados de búsqueda web estructurados (`title`, `url`, `snippet`)
- OpenRouter o `plugins.entries.perplexity.config.webSearch.baseUrl` / `model` explícitos cambian Perplexity de nuevo a completaciones de chat Sonar para compatibilidad
- La compatibilidad con Sonar/OpenRouter devuelve una respuesta sintetizada con citas, no filas de resultados estructurados
- Los resultados se almacenan en caché durante 15 minutos de forma predeterminada (configurable mediante `cacheTtlMinutes`)

## Relacionado

- [Descripción general de búsqueda web](/es/tools/web) -- todos los proveedores y detección automática
- [Documentación de la API de búsqueda de Perplexity](https://docs.perplexity.ai/docs/search/quickstart) -- documentación oficial de Perplexity
- [Búsqueda Brave](/es/tools/brave-search) -- resultados estructurados con filtros de país/idioma
- [Búsqueda Exa](/es/tools/exa-search) -- búsqueda neuronal con extracción de contenido
