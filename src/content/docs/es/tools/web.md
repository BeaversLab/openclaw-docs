---
title: "Búsqueda Web"
sidebarTitle: "Búsqueda Web"
summary: "web_search, x_search y web_fetch -- busca en la web, busca publicaciones de X u obtén el contenido de la página"
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
`web_fetch` para la obtención de URL ligera. En esta fase, `web_fetch` se mantiene
localmente, mientras que `web_search` y `x_search` pueden usar xAI Responses en segundo plano.

<Info>`web_search` es una herramienta HTTP ligera, no automatización del navegador. Para sitios con mucho JS o inicios de sesión, use [Navegador Web](/en/tools/browser). Para obtener una URL específica, use [Web Fetch](/en/tools/web-fetch).</Info>

## Inicio rápido

<Steps>
  <Step title="Obtener una clave de API">
    Elija un proveedor y obtenga una clave de API. Consulte las páginas del proveedor a continuación para obtener
    enlaces de registro.
  </Step>
  <Step title="Configurar">
    ```bash
    openclaw configure --section web
    ```
    Esto guarda la clave y establece el proveedor. También puede establecer una variable de entorno
    (por ejemplo, `BRAVE_API_KEY`) y omitir este paso.
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
    Resultados estructurados con fragmentos. Soporta el modo `llm-context`, filtros de país/idioma. Nivel gratuito disponible.
  </Card>
  <Card title="DuckDuckGo" icon="bird" href="/en/tools/duckduckgo-search">
    Fallback sin clave. No se necesita clave de API. Integración no oficial basada en HTML.
  </Card>
  <Card title="Exa" icon="brain" href="/en/tools/exa-search">
    Búsqueda neuronal + por palabras clave con extracción de contenido (destacados, texto, resúmenes).
  </Card>
  <Card title="Firecrawl" icon="flame" href="/en/tools/firecrawl">
    Resultados estructurados. Funciona mejor con `firecrawl_search` y `firecrawl_scrape` para extracción profunda.
  </Card>
  <Card title="Gemini" icon="sparkles" href="/en/tools/gemini-search">
    Respuestas sintetizadas por IA con citas a través de la fundamentación en Google Search.
  </Card>
  <Card title="Grok" icon="zap" href="/en/tools/grok-search">
    Respuestas sintetizadas por IA con citas mediante anclaje web de xAI.
  </Card>
  <Card title="Kimi" icon="moon" href="/en/tools/kimi-search">
    Respuestas sintetizadas por IA con citas mediante búsqueda web de Moonshot.
  </Card>
  <Card title="Perplexity" icon="search" href="/en/tools/perplexity-search">
    Resultados estructurados con controles de extracción de contenido y filtrado de dominios.
  </Card>
  <Card title="Tavily" icon="globe" href="/en/tools/tavily">
    Resultados estructurados con profundidad de búsqueda, filtrado de temas y `tavily_extract` para la extracción de URL.
  </Card>
</CardGroup>

### Comparación de proveedores

| Proveedor                                 | Estilo de resultado        | Filtros                                                          | Clave de API                                |
| ----------------------------------------- | -------------------------- | ---------------------------------------------------------------- | ------------------------------------------- |
| [Brave](/en/tools/brave-search)           | Fragmentos estructurados   | País, idioma, hora, modo `llm-context`                           | `BRAVE_API_KEY`                             |
| [DuckDuckGo](/en/tools/duckduckgo-search) | Fragmentos estructurados   | --                                                               | Ninguno (sin clave)                         |
| [Exa](/en/tools/exa-search)               | Estructurado + extraído    | Modo neuronal/por palabras clave, fecha, extracción de contenido | `EXA_API_KEY`                               |
| [Firecrawl](/en/tools/firecrawl)          | Fragmentos estructurados   | Vía la herramienta `firecrawl_search`                            | `FIRECRAWL_API_KEY`                         |
| [Gemini](/en/tools/gemini-search)         | Sintetizado por IA + citas | --                                                               | `GEMINI_API_KEY`                            |
| [Grok](/en/tools/grok-search)             | Sintetizado por IA + citas | --                                                               | `XAI_API_KEY`                               |
| [Kimi](/en/tools/kimi-search)             | Sintetizado por IA + citas | --                                                               | `KIMI_API_KEY` / `MOONSHOT_API_KEY`         |
| [Perplexity](/en/tools/perplexity-search) | Fragmentos estructurados   | País, idioma, hora, dominios, límites de contenido               | `PERPLEXITY_API_KEY` / `OPENROUTER_API_KEY` |
| [Tavily](/en/tools/tavily)                | Fragmentos estructurados   | Vía la herramienta `tavily_search`                               | `TAVILY_API_KEY`                            |

## Detección automática

Las listas de proveedores en los documentos y flujos de configuración son alfabéticas. La detección automática mantiene un orden de precedencia separado:

Si no se ha establecido ningún `provider`, OpenClaw busca claves de API en este orden y utiliza la primera que encuentre:

1. **Brave** -- `BRAVE_API_KEY` o `plugins.entries.brave.config.webSearch.apiKey`
2. **Gemini** -- `GEMINI_API_KEY` o `plugins.entries.google.config.webSearch.apiKey`
3. **Grok** -- `XAI_API_KEY` o `plugins.entries.xai.config.webSearch.apiKey`
4. **Kimi** -- `KIMI_API_KEY` / `MOONSHOT_API_KEY` o `plugins.entries.moonshot.config.webSearch.apiKey`
5. **Perplexity** -- `PERPLEXITY_API_KEY` / `OPENROUTER_API_KEY` o `plugins.entries.perplexity.config.webSearch.apiKey`
6. **Firecrawl** -- `FIRECRAWL_API_KEY` o `plugins.entries.firecrawl.config.webSearch.apiKey`
7. **Tavily** -- `TAVILY_API_KEY` o `plugins.entries.tavily.config.webSearch.apiKey`

Si no se encuentra ninguna clave, se recurre a Brave (obtendrá un error de clave faltante indicándole que configure una).

<Note>Todos los campos de clave de proveedor admiten objetos SecretRef. En el modo de detección automática, OpenClaw resuelve solo la clave del proveedor seleccionado: los SecretRefs no seleccionados permanecen inactivos.</Note>

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

La configuración específica del proveedor (claves de API, URL base, modos) se encuentra bajo
`plugins.entries.<plugin>.config.webSearch.*`. Consulte las páginas del proveedor para ver
ejemplos.

Para `x_search`, configure `tools.web.x_search.*` directamente. Utiliza el mismo
`XAI_API_KEY` de reserva que la búsqueda web de Grok.

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

    Para una instalación de puerta de enlace, colóquela en `~/.openclaw/.env`.
    Consulte [Variables de entorno](/en/help/faq#env-vars-and-env-loading).

  </Tab>
</Tabs>

## Parámetros de la herramienta

| Parámetro             | Descripción                                                            |
| --------------------- | ---------------------------------------------------------------------- |
| `query`               | Consulta de búsqueda (obligatoria)                                     |
| `count`               | Resultados a devolver (1-10, predeterminado: 5)                        |
| `country`             | Código de país ISO de 2 letras (por ejemplo, "US", "DE")               |
| `language`            | Código de idioma ISO 639-1 (por ejemplo, "en", "de")                   |
| `freshness`           | Filtro de tiempo: `day`, `week`, `month` o `year`                      |
| `date_after`          | Resultados después de esta fecha (AAAA-MM-DD)                          |
| `date_before`         | Resultados antes de esta fecha (AAAA-MM-DD)                            |
| `ui_lang`             | Código de idioma de la interfaz de usuario (solo Brave)                |
| `domain_filter`       | Matriz de lista de permitidos/bloqueados de dominio (solo Perplexity)  |
| `max_tokens`          | Presupuesto total de contenido, predeterminado 25000 (solo Perplexity) |
| `max_tokens_per_page` | Límite de tokens por página, predeterminado 2048 (solo Perplexity)     |

<Warning>No todos los parámetros funcionan con todos los proveedores. El modo Brave `llm-context` rechaza `ui_lang`, `freshness`, `date_after` y `date_before`. Firecrawl y Tavily solo admiten `query` y `count` a través de `web_search` -- use sus herramientas dedicadas para opciones avanzadas.</Warning>

## x_search

`x_search` consulta publicaciones de X (anteriormente Twitter) usando xAI y devuelve
respuestas sintetizadas por IA con citas. Acepta consultas en lenguaje natural y
filtros estructurados opcionales. OpenClaw solo habilita la herramienta xAI `x_search`
integrada en la solicitud que atiende esta llamada de herramienta.

<Note>
  xAI documenta `x_search` como compatible con búsqueda de palabras clave, búsqueda semántica, búsqueda de usuario y obtención de hilos. Para estadísticas de interacción por publicación, como republicaciones, respuestas, marcadores o visitas, prefiera una búsqueda específica de la URL exacta de la publicación n o del ID de estado. Las búsquedas amplias de palabras clave pueden encontrar la
  publicación correcta pero devolver menos metadatos completos por publicación. Un buen patrón es: ubicar primero la publicación y luego ejecutar una segunda consulta `x_search` centrada en esa publicación exacta.
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
| `allowed_x_handles`          | Restringir los resultados a identificadores de X específicos                        |
| `excluded_x_handles`         | Excluir identificadores de X específicos                                            |
| `from_date`                  | Incluir solo publicaciones en o después de esta fecha (AAAA-MM-DD)                  |
| `to_date`                    | Incluir solo publicaciones en o antes de esta fecha (AAAA-MM-DD)                    |
| `enable_image_understanding` | Permitir que xAI inspeccione las imágenes adjuntas a las publicaciones coincidentes |
| `enable_video_understanding` | Permitir que xAI inspeccione los videos adjuntos a las publicaciones coincidentes   |

### Ejemplo de x_search

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

Si utiliza perfiles de herramientas o listas de permitidos, agregue `web_search`, `x_search` o `group:web`:

```json5
{
  tools: {
    allow: ["web_search", "x_search"],
    // or: allow: ["group:web"]  (includes web_search, x_search, and web_fetch)
  },
}
```

## Relacionado

- [Web Fetch](/en/tools/web-fetch) -- recuperar una URL y extraer contenido legible
- [Web Browser](/en/tools/browser) -- automatización completa del navegador para sitios con mucho JS
- [Grok Search](/en/tools/grok-search) -- Grok como proveedor `web_search`
