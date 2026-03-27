---
summary: "herramienta web_search -- busca en la web con Brave, Firecrawl, Gemini, Grok, Kimi, Perplexity o Tavily"
read_when:
  - You want to enable or configure web_search
  - You need to choose a search provider
  - You want to understand auto-detection and provider fallback
title: "Búsqueda Web"
sidebarTitle: "Búsqueda Web"
---

# Búsqueda Web

La herramienta `web_search` busca en la web utilizando tu proveedor configurado y
devuelve resultados. Los resultados se almacenan en caché por consulta durante 15 minutos (configurable).

<Info>
  `web_search` es una herramienta HTTP ligera, no una automatización del navegador. Para sitios con
  mucho JS o inicios de sesión, usa el [Navegador Web](/es/tools/browser). Para obtener una URL
  específica, usa [Web Fetch](/es/tools/web-fetch).
</Info>

## Inicio rápido

<Steps>
  <Step title="Obtén una clave de API">
    Elige un proveedor y obtén una clave de API. Consulta las páginas del proveedor a continuación para
    los enlaces de registro.
  </Step>
  <Step title="Configurar">
    ```bash
    openclaw configure --section web
    ```
    Esto guarda la clave y establece el proveedor. También puedes establecer una variable de entorno
    (p. ej. `BRAVE_API_KEY`) y omitir este paso.
  </Step>
  <Step title="Úsalo">
    El agente ahora puede llamar a `web_search`:

    ```javascript
    await web_search({ query: "OpenClaw plugin SDK" });
    ```

  </Step>
</Steps>

## Elegir un proveedor

<CardGroup cols={2}>
  <Card title="Búsqueda Brave" icon="shield" href="/es/tools/brave-search">
    Resultados estructurados con fragmentos. Soporta el modo `llm-context`, filtros de país/idioma.
    Nivel gratuito disponible.
  </Card>
  <Card title="DuckDuckGo" icon="bird" href="/es/tools/duckduckgo-search">
    Alternativa sin clave. No se necesita clave de API. Integración no oficial basada en HTML.
  </Card>
  <Card title="Exa" icon="brain" href="/es/tools/exa-search">
    Búsqueda neuronal + por palabras clave con extracción de contenido (destacados, texto,
    resúmenes).
  </Card>
  <Card title="Firecrawl" icon="flame" href="/es/tools/firecrawl">
    Resultados estructurados. Mejor combinado con `firecrawl_search` y `firecrawl_scrape` para una
    extracción profunda.
  </Card>
  <Card title="Gemini" icon="sparkles" href="/es/tools/gemini-search">
    Respuestas sintetizadas por IA con citas a través de Google Search grounding.
  </Card>
  <Card title="Grok" icon="zap" href="/es/tools/grok-search">
    Respuestas sintetizadas por IA con citas a través de xAI web grounding.
  </Card>
  <Card title="Kimi" icon="moon" href="/es/tools/kimi-search">
    Respuestas sintetizadas por IA con citas a través de Moonshot web search.
  </Card>
  <Card title="Perplexity" icon="search" href="/es/tools/perplexity-search">
    Resultados estructurados con controles de extracción de contenido y filtrado de dominios.
  </Card>
  <Card title="Tavily" icon="globe" href="/es/tools/tavily">
    Resultados estructurados con profundidad de búsqueda, filtrado de temas y `tavily_extract` para
    la extracción de URL.
  </Card>
</CardGroup>

### Comparación de proveedores

| Proveedor                                 | Estilo de resultado        | Filtros                                                         | Clave de API                                |
| ----------------------------------------- | -------------------------- | --------------------------------------------------------------- | ------------------------------------------- |
| [Brave](/es/tools/brave-search)           | Fragmentos estructurados   | País, idioma, hora, modo `llm-context`                          | `BRAVE_API_KEY`                             |
| [DuckDuckGo](/es/tools/duckduckgo-search) | Fragmentos estructurados   | --                                                              | Ninguna (sin clave)                         |
| [Exa](/es/tools/exa-search)               | Estructurados + extraídos  | Modo neuronal/por palabra clave, fecha, extracción de contenido | `EXA_API_KEY`                               |
| [Firecrawl](/es/tools/firecrawl)          | Fragmentos estructurados   | A través de la herramienta `firecrawl_search`                   | `FIRECRAWL_API_KEY`                         |
| [Gemini](/es/tools/gemini-search)         | Sintetizado por IA + citas | --                                                              | `GEMINI_API_KEY`                            |
| [Grok](/es/tools/grok-search)             | Sintetizado por IA + citas | --                                                              | `XAI_API_KEY`                               |
| [Kimi](/es/tools/kimi-search)             | Sintetizado por IA + citas | --                                                              | `KIMI_API_KEY` / `MOONSHOT_API_KEY`         |
| [Perplexity](/es/tools/perplexity-search) | Fragmentos estructurados   | País, idioma, hora, dominios, límites de contenido              | `PERPLEXITY_API_KEY` / `OPENROUTER_API_KEY` |
| [Tavily](/es/tools/tavily)                | Fragmentos estructurados   | A través de la herramienta `tavily_search`                      | `TAVILY_API_KEY`                            |

## Detección automática

Las listas de proveedores en la documentación y los flujos de configuración están en orden alfabético. La detección automática mantiene un orden de precedencia separado:

Si no se establece ningún `provider`, OpenClaw busca claves de API en este orden y usa la primera que encuentre:

1. **Brave** -- `BRAVE_API_KEY` o `plugins.entries.brave.config.webSearch.apiKey`
2. **Gemini** -- `GEMINI_API_KEY` o `plugins.entries.google.config.webSearch.apiKey`
3. **Grok** -- `XAI_API_KEY` o `plugins.entries.xai.config.webSearch.apiKey`
4. **Kimi** -- `KIMI_API_KEY` / `MOONSHOT_API_KEY` o `plugins.entries.moonshot.config.webSearch.apiKey`
5. **Perplexity** -- `PERPLEXITY_API_KEY` / `OPENROUTER_API_KEY` o `plugins.entries.perplexity.config.webSearch.apiKey`
6. **Firecrawl** -- `FIRECRAWL_API_KEY` o `plugins.entries.firecrawl.config.webSearch.apiKey`
7. **Tavily** -- `TAVILY_API_KEY` o `plugins.entries.tavily.config.webSearch.apiKey`

Si no se encuentran claves, se recurre a Brave (obtendrá un error de clave faltante que le pedirá que configure una).

<Note>
  Todos los campos de clave de proveedor admiten objetos SecretRef. En modo de detección automática,
  OpenClaw resuelve solo la clave del proveedor seleccionado: los SecretRef no seleccionados
  permanecen inactivos.
</Note>

## Configuración

```json5
{
  tools: {
    web: {
      search: {
        enabled: true, // default: true
        provider: "brave", // or omit for auto-detection
        maxResults: 5,
        timeoutSeconds: 30,
        cacheTtlMinutes: 15,
      },
    },
  },
}
```

La configuración específica del proveedor (claves de API, URLs base, modos) se encuentra en
`plugins.entries.<plugin>.config.webSearch.*`. Consulte las páginas de proveedores para
ver ejemplos.

### Almacenar claves de API

<Tabs>
  <Tab title="Archivo de configuración">
    Ejecute `openclaw configure --section web` o establezca la clave directamente:

    ```json5
    {
      plugins: {
        entries: {
          brave: {
            config: {
              webSearch: {
                apiKey: "YOUR_KEY", // pragma: allowlist secret
              },
            },
          },
        },
      },
    }
    ```

  </Tab>
  <Tab title="Variable de entorno">
    Establezca la variable de entorno del proveedor en el entorno del proceso Gateway:

    ```bash
    export BRAVE_API_KEY="YOUR_KEY"
    ```

    Para una instalación de gateway, póngala en `~/.openclaw/.env`.
    Consulte [Variables de entorno](/es/help/faq#env-vars-and-env-loading).

  </Tab>
</Tabs>

## Parámetros de la herramienta

| Parámetro             | Descripción                                                            |
| --------------------- | ---------------------------------------------------------------------- |
| `query`               | Consulta de búsqueda (obligatoria)                                     |
| `count`               | Resultados a devolver (1-10, predeterminado: 5)                        |
| `country`             | Código de país ISO de 2 letras (ej. "US", "DE")                        |
| `language`            | Código de idioma ISO 639-1 (ej. "en", "de")                            |
| `freshness`           | Filtro de tiempo: `day`, `week`, `month` o `year`                      |
| `date_after`          | Resultados después de esta fecha (AAAA-MM-DD)                          |
| `date_before`         | Resultados antes de esta fecha (AAAA-MM-DD)                            |
| `ui_lang`             | Código de idioma de la interfaz de usuario (solo Brave)                |
| `domain_filter`       | Matriz de lista de permitidos/denegados de dominios (solo Perplexity)  |
| `max_tokens`          | Presupuesto total de contenido, predeterminado 25000 (solo Perplexity) |
| `max_tokens_per_page` | Límite de tokens por página, predeterminado 2048 (solo Perplexity)     |

<Warning>
  No todos los parámetros funcionan con todos los proveedores. El modo Brave `llm-context` rechaza
  `ui_lang`, `freshness`, `date_after` y `date_before`. Firecrawl y Tavily solo admiten `query` y
  `count` a través de `web_search` -- utilice sus herramientas dedicadas para opciones avanzadas.
</Warning>

## Ejemplos

```javascript
// Basic search
await web_search({ query: "OpenClaw plugin SDK" });

// German-specific search
await web_search({ query: "TV online schauen", country: "DE", language: "de" });

// Recent results (past week)
await web_search({ query: "AI developments", freshness: "week" });

// Date range
await web_search({
  query: "climate research",
  date_after: "2024-01-01",
  date_before: "2024-06-30",
});

// Domain filtering (Perplexity only)
await web_search({
  query: "product reviews",
  domain_filter: ["-reddit.com", "-pinterest.com"],
});
```

## Perfiles de herramientas

Si utiliza perfiles de herramientas o listas de permitidos, añada `web_search` o `group:web`:

```json5
{
  tools: {
    allow: ["web_search"],
    // or: allow: ["group:web"]  (includes both web_search and web_fetch)
  },
}
```

## Relacionado

- [Web Fetch](/es/tools/web-fetch) -- obtenga una URL y extraiga el contenido legible
- [Web Browser](/es/tools/browser) -- automatización completa del navegador para sitios con mucho JS

import es from "/components/footer/es.mdx";

<es />
