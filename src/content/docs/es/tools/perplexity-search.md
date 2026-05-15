---
summary: "API de Perplexity Search y compatibilidad con Sonar/OpenRouter para web_search"
read_when:
  - You want to use Perplexity Search for web search
  - You need PERPLEXITY_API_KEY or OPENROUTER_API_KEY setup
title: "Búsqueda Perplexity"
---

OpenClaw admite la API de búsqueda de Perplexity como proveedor `web_search`.
Devuelve resultados estructurados con los campos `title`, `url` y `snippet`.

Para la compatibilidad, OpenClaw también admite configuraciones heredadas de Perplexity Sonar/OpenRouter.
Si usa `OPENROUTER_API_KEY`, una clave `sk-or-...` en `plugins.entries.perplexity.config.webSearch.apiKey`, o establece `plugins.entries.perplexity.config.webSearch.baseUrl` / `model`, el proveedor cambia a la ruta de chat-completions y devuelve respuestas sintetizadas por IA con citas en lugar de los resultados estructurados de la API de búsqueda.

## Obtener una clave de API de Perplexity

1. Cree una cuenta de Perplexity en [perplexity.ai/settings/api](https://www.perplexity.ai/settings/api)
2. Genere una clave de API en el panel de control
3. Almacene la clave en la configuración o establezca `PERPLEXITY_API_KEY` en el entorno de Gateway.

## Compatibilidad con OpenRouter

Si ya estaba usando OpenRouter para Perplexity Sonar, mantenga `provider: "perplexity"` y establezca `OPENROUTER_API_KEY` en el entorno de Gateway, o almacene una clave `sk-or-...` en `plugins.entries.perplexity.config.webSearch.apiKey`.

Controles de compatibilidad opcionales:

- `plugins.entries.perplexity.config.webSearch.baseUrl`
- `plugins.entries.perplexity.config.webSearch.model`

## Ejemplos de configuración

### API de búsqueda de Perplexidad nativa

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

**A través de la configuración:** ejecute `openclaw configure --section web`. Almacena la clave en
`~/.openclaw/openclaw.json` bajo `plugins.entries.perplexity.config.webSearch.apiKey`.
Ese campo también acepta objetos SecretRef.

**A través del entorno:** establezca `PERPLEXITY_API_KEY` o `OPENROUTER_API_KEY`
en el entorno del proceso Gateway. Para una instalación de puerta de enlace, póngalo en
`~/.openclaw/.env` (o su entorno de servicio). Consulte [Variables de entorno](/es/help/faq#env-vars-and-env-loading).

Si `provider: "perplexity"` está configurado y el SecretRef de la clave de Perplexidad no se resuelve sin respaldo de entorno, el inicio/recarga falla rápidamente.

## Parámetros de la herramienta

Estos parámetros se aplican a la ruta de la API de búsqueda de Perplexidad nativa.

<ParamField path="query" type="string" required>
  Consulta de búsqueda.
</ParamField>

<ParamField path="count" type="number" default="5">
  Número de resultados a devolver (1-10).
</ParamField>

<ParamField path="country" type="string">
  Código de país ISO de 2 letras (p. ej., `US`, `DE`).
</ParamField>

<ParamField path="language" type="string">
  Código de idioma ISO 639-1 (p. ej., `en`, `de`, `fr`).
</ParamField>

<ParamField path="freshness" type="'day' | 'week' | 'month' | 'year'">
  Filtro de tiempo: `day` son 24 horas.
</ParamField>

<ParamField path="date_after" type="string">
  Solo resultados publicados después de esta fecha (`YYYY-MM-DD`).
</ParamField>

<ParamField path="date_before" type="string">
  Solo resultados publicados antes de esta fecha (`YYYY-MM-DD`).
</ParamField>

<ParamField path="domain_filter" type="string[]">
  Matriz de lista de permitidos/denegados de dominios (máx. 20).
</ParamField>

<ParamField path="max_tokens" type="number" default="25000">
  Presupuesto total de contenido (máx. 1000000).
</ParamField>

<ParamField path="max_tokens_per_page" type="number" default="2048">
  Límite de tokens por página.
</ParamField>

Para la ruta de compatibilidad heredada de Sonar/OpenRouter:

- `query`, `count` y `freshness` son aceptados
- `count` es solo para compatibilidad allí; la respuesta sigue siendo una respuesta sintetizada
  con citas en lugar de una lista de N resultados
- Filtros exclusivos de la API de búsqueda como `country`, `language`, `date_after`,
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

### Reglas de filtro de dominio

- Máximo 20 dominios por filtro
- No se puede mezclar la lista de permitidos y la de denegados en la misma solicitud
- Use el prefijo `-` para las entradas de lista de denegación (por ejemplo, `["-reddit.com"]`)

## Notas

- La API de búsqueda de Perplexity devuelve resultados de búsqueda web estructurados (`title`, `url`, `snippet`)
- OpenRouter o el uso explícito de `plugins.entries.perplexity.config.webSearch.baseUrl` / `model` hace que Perplexity vuelva a las finalizaciones de chat de Sonar por compatibilidad
- La compatibilidad con Sonar/OpenRouter devuelve una respuesta sintetizada con citas, no filas de resultados estructurados
- Los resultados se almacenan en caché durante 15 minutos de forma predeterminada (configurable mediante `cacheTtlMinutes`)

## Relacionado

<CardGroup cols={2}>
  <Card title="Resumen de búsqueda web" href="/es/tools/web" icon="globe">
    Todos los proveedores y reglas de detección automática.
  </Card>
  <Card title="Búsqueda de Brave" href="/es/tools/brave-search" icon="shield">
    Resultados estructurados con filtros de país e idioma.
  </Card>
  <Card title="Búsqueda de Exa" href="/es/tools/exa-search" icon="magnifying-glass">
    Búsqueda neuronal con extracción de contenido.
  </Card>
  <Card title="Documentación de la API de búsqueda de Perplexity" href="https://docs.perplexity.ai/docs/search/quickstart" icon="arrow-up-right-from-square">
    Guía de inicio rápido y referencia oficial de la API de búsqueda de Perplexity.
  </Card>
</CardGroup>
