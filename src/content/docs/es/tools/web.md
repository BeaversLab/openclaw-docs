---
title: "Búsqueda web"
sidebarTitle: "Búsqueda web"
summary: "web_search, x_search y web_fetch -- busca en la web, busca en publicaciones de X o obtén el contenido de la página"
read_when:
  - You want to enable or configure web_search
  - You want to enable or configure x_search
  - You need to choose a search provider
  - You want to understand auto-detection and provider fallback
---

# Búsqueda Web

La herramienta `web_search` busca en la web utilizando tu proveedor configurado y
devuelve resultados. Los resultados se almacenan en caché por consulta durante 15 minutos (configurable).

OpenClaw también incluye `x_search` para publicaciones de X (anteriormente Twitter) y
`web_fetch` para una recuperación de URL ligera. En esta fase, `web_fetch` se mantiene
local, mientras que `web_search` y `x_search` pueden utilizar xAI Responses internamente.

<Info>`web_search` es una herramienta HTTP ligera, no una automatización del navegador. Para sitios con mucho JS o inicios de sesión, use el [Navegador web](/en/tools/browser). Para recuperar una URL específica, use [Web Fetch](/en/tools/web-fetch).</Info>

## Inicio rápido

<Steps>
  <Step title="Obtén una clave de API">
    Elija un proveedor y obtenga una clave de API. Consulte las páginas del proveedor a continuación para
    enlaces de registro.
  </Step>
  <Step title="Configurar">
    ```bash
    openclaw configure --section web
    ```
    Esto almacena la clave y establece el proveedor. También puede configurar una variable de entorno
    (p. ej. `BRAVE_API_KEY`) y omitir este paso.
  </Step>
  <Step title="Úsalo">
    El agente ahora puede llamar a `web_search`:

    ```javascript
    await web_search({ query: "OpenClaw plugin SDK" });
    ```

    Para publicaciones de X, use:

    ```javascript
    await x_search({ query: "dinner recipes" });
    ```

  </Step>
</Steps>

## Elegir un proveedor

<CardGroup cols={2}>
  <Card title="Brave Search" icon="shield" href="/en/tools/brave-search">
    Resultados estructurados con fragmentos. Admite el modo `llm-context`, filtros de país/idioma. Plan gratuito disponible.
  </Card>
  <Card title="DuckDuckGo" icon="bird" href="/en/tools/duckduckgo-search">
    Alternativa sin clave. No se necesita clave de API. Integración no oficial basada en HTML.
  </Card>
  <Card title="Exa" icon="brain" href="/en/tools/exa-search">
    Búsqueda neuronal + por palabras clave con extracción de contenido (destacados, texto, resúmenes).
  </Card>
  <Card title="Firecrawl" icon="flame" href="/en/tools/firecrawl">
    Resultados estructurados. Mejor combinado con `firecrawl_search` y `firecrawl_scrape` para una extracción profunda.
  </Card>
  <Card title="Gemini" icon="sparkles" href="/en/tools/gemini-search">
    Respuestas sintetizadas por IA con citas mediante la vinculación con Google Search.
  </Card>
  <Card title="Grok" icon="zap" href="/en/tools/grok-search">
    Respuestas sintetizadas por IA con citas mediante la vinculación web de xAI.
  </Card>
  <Card title="Kimi" icon="moon" href="/en/tools/kimi-search">
    Respuestas sintetizadas por IA con citas mediante la búsqueda web de Moonshot.
  </Card>
  <Card title="Perplexity" icon="search" href="/en/tools/perplexity-search">
    Resultados estructurados con controles de extracción de contenido y filtrado de dominios.
  </Card>
  <Card title="SearXNG" icon="server" href="/en/tools/searxng-search">
    Metabuscador autoalojado. No se necesita clave de API. Agrega Google, Bing, DuckDuckGo y más.
  </Card>
  <Card title="Tavily" icon="globe" href="/en/tools/tavily">
    Resultados estructurados con profundidad de búsqueda, filtrado de temas y `tavily_extract` para la extracción de URL.
  </Card>
</CardGroup>

### Comparación de proveedores

| Proveedor                                 | Estilo de resultado        | Filtros                                                         | Clave de API                                |
| ----------------------------------------- | -------------------------- | --------------------------------------------------------------- | ------------------------------------------- |
| [Brave](/en/tools/brave-search)           | Fragmentos estructurados   | País, idioma, hora, modo `llm-context`                          | `BRAVE_API_KEY`                             |
| [DuckDuckGo](/en/tools/duckduckgo-search) | Fragmentos estructurados   | --                                                              | Ninguno (sin clave)                         |
| [Exa](/en/tools/exa-search)               | Estructurado + extraído    | Modo neuronal/por palabra clave, fecha, extracción de contenido | `EXA_API_KEY`                               |
| [Firecrawl](/en/tools/firecrawl)          | Fragmentos estructurados   | A través de la herramienta `firecrawl_search`                   | `FIRECRAWL_API_KEY`                         |
| [Gemini](/en/tools/gemini-search)         | Sintetizado por IA + citas | --                                                              | `GEMINI_API_KEY`                            |
| [Grok](/en/tools/grok-search)             | Sintetizado por IA + citas | --                                                              | `XAI_API_KEY`                               |
| [Kimi](/en/tools/kimi-search)             | Sintetizado por IA + citas | --                                                              | `KIMI_API_KEY` / `MOONSHOT_API_KEY`         |
| [Perplexity](/en/tools/perplexity-search) | Fragmentos estructurados   | País, idioma, hora, dominios, límites de contenido              | `PERPLEXITY_API_KEY` / `OPENROUTER_API_KEY` |
| [SearXNG](/en/tools/searxng-search)       | Fragmentos estructurados   | Categorías, idioma                                              | Ninguno (autohospedado)                     |
| [Tavily](/en/tools/tavily)                | Fragmentos estructurados   | A través de la herramienta `tavily_search`                      | `TAVILY_API_KEY`                            |

## Detección automática

## Búsqueda web nativa de Codex

Los modelos con capacidad para Codex pueden usar opcionalmente la herramienta Responses `web_search` nativa del proveedor en lugar de la función `web_search` administrada por OpenClaw.

- Configúrelo en `tools.web.search.openaiCodex`
- Solo se activa para modelos con capacidad para Codex (`openai-codex/*` o proveedores que usan `api: "openai-codex-responses"`)
- Managed `web_search` todavía se aplica a modelos que no son Codex
- `mode: "cached"` es la configuración predeterminada y recomendada
- `tools.web.search.enabled: false` deshabilita tanto la búsqueda administrada como la nativa

```json5
{
  tools: {
    web: {
      search: {
        enabled: true,
        openaiCodex: {
          enabled: true,
          mode: "cached",
          allowedDomains: ["example.com"],
          contextSize: "high",
          userLocation: {
            country: "US",
            city: "New York",
            timezone: "America/New_York",
          },
        },
      },
    },
  },
}
```

Si la búsqueda nativa de Codex está habilitada pero el modelo actual no es compatible con Codex, OpenClaw mantiene el comportamiento normal administrado de `web_search`.

## Configurar la búsqueda web

Las listas de proveedores en la documentación y los flujos de configuración son alfabéticas. La detección automática mantiene un orden de precedencia separado:

Si no se establece ningún `provider`, OpenClaw busca claves API en este orden y usa la primera que encuentre:

1. **Brave** -- `BRAVE_API_KEY` o `plugins.entries.brave.config.webSearch.apiKey`
2. **Gemini** -- `GEMINI_API_KEY` o `plugins.entries.google.config.webSearch.apiKey`
3. **Grok** -- `XAI_API_KEY` o `plugins.entries.xai.config.webSearch.apiKey`
4. **Kimi** -- `KIMI_API_KEY` / `MOONSHOT_API_KEY` o `plugins.entries.moonshot.config.webSearch.apiKey`
5. **Perplexity** -- `PERPLEXITY_API_KEY` / `OPENROUTER_API_KEY` o `plugins.entries.perplexity.config.webSearch.apiKey`
6. **Firecrawl** -- `FIRECRAWL_API_KEY` o `plugins.entries.firecrawl.config.webSearch.apiKey`
7. **Tavily** -- `TAVILY_API_KEY` o `plugins.entries.tavily.config.webSearch.apiKey`

Los proveedores sin clave se verifican después de los proveedores con API:

8. **DuckDuckGo** -- no se necesita clave (orden de autodetección 100)
9. **SearXNG** -- `SEARXNG_BASE_URL` o `plugins.entries.searxng.config.webSearch.baseUrl` (orden de autodetección 200)

Si no se detecta ningún proveedor, recurre a Brave (recibirá un error de clave faltante que le pedirá que configure uno).

<Note>Todos los campos de clave de proveedor admiten objetos SecretRef. En modo de detección automática, OpenClaw solo resuelve la clave del proveedor seleccionado; los SecretRef no seleccionados permanecen inactivos.</Note>

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

La configuración específica del proveedor (claves API, URLs base, modos) se encuentra en
`plugins.entries.<plugin>.config.webSearch.*`. Consulte las páginas del proveedor para ver
ejemplos.

Para `x_search`, configure `tools.web.x_search.*` directamente. Utiliza el mismo respaldo `XAI_API_KEY` que la búsqueda web de Grok.
Cuando eliges Grok durante `openclaw onboard` o `openclaw configure --section web`,
OpenClaw también puede ofrecer la configuración opcional de `x_search` con la misma clave.
Este es un paso de seguimiento separado dentro de la ruta de Grok, no una opción separada de proveedor de búsqueda web de nivel superior. Si eliges otro proveedor, OpenClaw no muestra el mensaje `x_search`.

### Almacenar claves API

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

    Para una instalación de puerta de enlace, póngala en `~/.openclaw/.env`.
    Vea [Vars de entorno](/en/help/faq#env-vars-and-env-loading).

  </Tab>
</Tabs>

## Parámetros de la herramienta

| Parámetro             | Descripción                                                            |
| --------------------- | ---------------------------------------------------------------------- |
| `query`               | Consulta de búsqueda (obligatorio)                                     |
| `count`               | Resultados a devolver (1-10, predeterminado: 5)                        |
| `country`             | Código de país ISO de 2 letras (ej. "US", "DE")                        |
| `language`            | Código de idioma ISO 639-1 (ej. "en", "de")                            |
| `freshness`           | Filtro de tiempo: `day`, `week`, `month` o `year`                      |
| `date_after`          | Resultados después de esta fecha (AAAA-MM-DD)                          |
| `date_before`         | Resultados antes de esta fecha (AAAA-MM-DD)                            |
| `ui_lang`             | Código de idioma de la interfaz de usuario (solo Brave)                |
| `domain_filter`       | Matriz de lista de permitidos/denegados de dominio (solo Perplexity)   |
| `max_tokens`          | Presupuesto total de contenido, predeterminado 25000 (solo Perplexity) |
| `max_tokens_per_page` | Límite de tokens por página, predeterminado 2048 (solo Perplexity)     |

<Warning>No todos los parámetros funcionan con todos los proveedores. El modo Brave `llm-context` rechaza `ui_lang`, `freshness`, `date_after` y `date_before`. Firecrawl y Tavily solo admiten `query` y `count` a través de `web_search` -- use sus herramientas dedicadas para opciones avanzadas.</Warning>

## x_search

`x_search` busca en publicaciones de X (anteriormente Twitter) usando xAI y devuelve
respuestas sintetizadas por IA con citas. Acepta consultas en lenguaje natural y
filtros estructurados opcionales. OpenClaw solo habilita la herramienta xAI `x_search`
integrada en la solicitud que atiende esta llamada de herramienta.

<Note>
  xAI documenta `x_search` como compatible con búsqueda de palabras clave, búsqueda semántica, búsqueda de usuario y obtención de hilos. Para estadísticas de interacción por publicación, como republicaciones, respuestas, marcadores o vistas, prefiera una búsqueda dirigida para la URL exacta de la publicación n o el ID de estado. Las búsquedas amplias de palabras clave pueden encontrar la
  publicación correcta, pero devuelven menos metadatos completos por publicación. Un buen patrón es: localizar primero la publicación y luego ejecutar una segunda consulta `x_search` centrada en esa publicación exacta.
</Note>

### configuración de x_search

```json5
{
  tools: {
    web: {
      x_search: {
        enabled: true,
        apiKey: "xai-...", // optional if XAI_API_KEY is set
        model: "grok-4-1-fast-non-reasoning",
        inlineCitations: false,
        maxTurns: 2,
        timeoutSeconds: 30,
        cacheTtlMinutes: 15,
      },
    },
  },
}
```

### parámetros de x_search

| Parámetro                    | Descripción                                                                         |
| ---------------------------- | ----------------------------------------------------------------------------------- |
| `query`                      | Consulta de búsqueda (obligatoria)                                                  |
| `allowed_x_handles`          | Restringir resultados a usuarios de X específicos                                   |
| `excluded_x_handles`         | Excluir usuarios de X específicos                                                   |
| `from_date`                  | Incluir solo publicaciones en o después de esta fecha (AAAA-MM-DD)                  |
| `to_date`                    | Incluir solo publicaciones en o antes de esta fecha (AAAA-MM-DD)                    |
| `enable_image_understanding` | Permitir que xAI inspeccione las imágenes adjuntas a las publicaciones coincidentes |
| `enable_video_understanding` | Permitir que xAI inspeccione los videos adjuntos a las publicaciones coincidentes   |

### ejemplo de x_search

```javascript
await x_search({
  query: "dinner recipes",
  allowed_x_handles: ["nytfood"],
  from_date: "2026-03-01",
});
```

```javascript
// Per-post stats: use the exact status URL or status ID when possible
await x_search({
  query: "https://x.com/huntharo/status/1905678901234567890",
});
```

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

Si usa perfiles de herramientas o listas de permitidos, agregue `web_search`, `x_search` o `group:web`:

```json5
{
  tools: {
    allow: ["web_search", "x_search"],
    // or: allow: ["group:web"]  (includes web_search, x_search, and web_fetch)
  },
}
```

## Relacionado

- [Web Fetch](/en/tools/web-fetch) -- obtiene una URL y extrae el contenido legible
- [Navegador Web](/en/tools/browser) -- automatización completa del navegador para sitios con mucho JS
- [Búsqueda Grok](/en/tools/grok-search) -- Grok como proveedor de `web_search`
