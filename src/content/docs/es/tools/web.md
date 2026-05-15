---
summary: "web_search, x_search y web_fetch -- busca en la web, busca publicaciones en X o obtén el contenido de la página"
title: "Búsqueda web"
sidebarTitle: "Búsqueda Web"
read_when:
  - You want to enable or configure web_search
  - You want to enable or configure x_search
  - You need to choose a search provider
  - You want to understand auto-detection and provider fallback
---

La herramienta `web_search` busca en la web utilizando tu proveedor configurado y
devuelve resultados. Los resultados se almacenan en caché por consulta durante 15 minutos (configurable).

OpenClaw también incluye `x_search` para publicaciones de X (antes Twitter) y
`web_fetch` para la obtención ligera de URL. En esta fase, `web_fetch` se mantiene
local mientras que `web_search` y `x_search` pueden utilizar xAI Responses en segundo plano.

<Info>`web_search` es una herramienta HTTP ligera, no automatización del navegador. Para sitios con mucho JS o inicios de sesión, use [Web Browser](/es/tools/browser). Para recuperar una URL específica, use [Web Fetch](/es/tools/web-fetch).</Info>

## Inicio rápido

<Steps>
  <Step title="Elegir un proveedor">
    Elige un proveedor y completa la configuración necesaria. Algunos proveedores son
    sin clave, mientras que otros usan claves de API. Consulta las páginas de proveedores a continuación para
    obtener más detalles.
  </Step>
  <Step title="Configurar">
    ```bash
    openclaw configure --section web
    ```
    Esto almacena el proveedor y cualquier credencial necesaria. También puedes establecer una var de entorno
    (por ejemplo `BRAVE_API_KEY`) y omitir este paso para proveedores con API.
  </Step>
  <Step title="Usarlo">
    El agente ahora puede llamar a `web_search`:

    ```javascript
    await web_search({ query: "OpenClaw plugin SDK" });
    ```

    Para publicaciones de X, usa:

    ```javascript
    await x_search({ query: "dinner recipes" });
    ```

  </Step>
</Steps>

## Elegir un proveedor

<CardGroup cols={2}>
  <Card title="Brave Search" icon="shield" href="/es/tools/brave-search">
    Resultados estructurados con fragmentos. Soporta el modo `llm-context`, filtros de país/idioma. Plan gratuito disponible.
  </Card>
  <Card title="DuckDuckGo" icon="bird" href="/es/tools/duckduckgo-search">
    Alternativa sin clave. No se necesita clave de API. Integración no oficial basada en HTML.
  </Card>
  <Card title="Exa" icon="brain" href="/es/tools/exa-search">
    Búsqueda neuronal + por palabras clave con extracción de contenido (destacados, texto, resúmenes).
  </Card>
  <Card title="Firecrawl" icon="flame" href="/es/tools/firecrawl">
    Resultados estructurados. Se combina mejor con `firecrawl_search` y `firecrawl_scrape` para una extracción profunda.
  </Card>
  <Card title="Gemini" icon="sparkles" href="/es/tools/gemini-search">
    Respuestas sintetizadas por IA con citas a través de la vinculación con Google Search.
  </Card>
  <Card title="Grok" icon="zap" href="/es/tools/grok-search">
    Respuestas sintetizadas por IA con citas a través de la vinculación web de xAI.
  </Card>
  <Card title="Kimi" icon="moon" href="/es/tools/kimi-search">
    Respuestas sintetizadas por IA con citas a través de la búsqueda web Moonshot; los respaldos de chat sin base fallan explícitamente.
  </Card>
  <Card title="MiniMax Search" icon="globe" href="/es/tools/minimax-search">
    Resultados estructurados a través de la API de búsqueda del plan de tokens MiniMax.
  </Card>
  <Card title="Ollama Web Search" icon="globe" href="/es/tools/ollama-search">
    Búsqueda a través de un host local de Ollama con sesión iniciada o la API alojada de Ollama.
  </Card>
  <Card title="Perplexity" icon="search" href="/es/tools/perplexity-search">
    Resultados estructurados con controles de extracción de contenido y filtrado de dominios.
  </Card>
  <Card title="SearXNG" icon="server" href="/es/tools/searxng-search">
    Metabuscador autoalojado. No se necesita clave de API. Agrega Google, Bing, DuckDuckGo y más.
  </Card>
  <Card title="Tavily" icon="globe" href="/es/tools/tavily">
    Resultados estructurados con profundidad de búsqueda, filtrado de temas y `tavily_extract` para la extracción de URL.
  </Card>
</CardGroup>

### Comparación de proveedores

| Proveedor                                    | Estilo de resultado                                             | Filtros                                                      | Clave de API                                                                                                |
| -------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| [Brave](/es/tools/brave-search)              | Fragmentos estructurados                                        | País, idioma, hora, modo `llm-context`                       | `BRAVE_API_KEY`                                                                                             |
| [DuckDuckGo](/es/tools/duckduckgo-search)    | Fragmentos estructurados                                        | --                                                           | Ninguna (sin clave)                                                                                         |
| [Exa](/es/tools/exa-search)                  | Estructurado + extraído                                         | Modo neuronal/palabras clave, fecha, extracción de contenido | `EXA_API_KEY`                                                                                               |
| [Firecrawl](/es/tools/firecrawl)             | Fragmentos estructurados                                        | Vía herramienta `firecrawl_search`                           | `FIRECRAWL_API_KEY`                                                                                         |
| [Gemini](/es/tools/gemini-search)            | Sintetizado por IA + citas                                      | --                                                           | `GEMINI_API_KEY`                                                                                            |
| [Grok](/es/tools/grok-search)                | Sintetizado por IA + citas                                      | --                                                           | `XAI_API_KEY`                                                                                               |
| [Kimi](/es/tools/kimi-search)                | Sintetizado por IA + citas; falla en respaldos de chat sin base | --                                                           | `KIMI_API_KEY` / `MOONSHOT_API_KEY`                                                                         |
| [MiniMax Search](/es/tools/minimax-search)   | Fragmentos estructurados                                        | Región (`global` / `cn`)                                     | `MINIMAX_CODE_PLAN_KEY` / `MINIMAX_CODING_API_KEY` / `MINIMAX_OAUTH_TOKEN`                                  |
| [Ollama Web Search](/es/tools/ollama-search) | Fragmentos estructurados                                        | --                                                           | Ninguno para hosts locales con sesión iniciada; `OLLAMA_API_KEY` para búsqueda `https://ollama.com` directa |
| [Perplexity](/es/tools/perplexity-search)    | Fragmentos estructurados                                        | País, idioma, hora, dominios, límites de contenido           | `PERPLEXITY_API_KEY` / `OPENROUTER_API_KEY`                                                                 |
| [SearXNG](/es/tools/searxng-search)          | Fragmentos estructurados                                        | Categorías, idioma                                           | Ninguno (autohospedado)                                                                                     |
| [Tavily](/es/tools/tavily)                   | Fragmentos estructurados                                        | A través de la herramienta `tavily_search`                   | `TAVILY_API_KEY`                                                                                            |

## Detección automática

## Búsqueda web nativa de OpenAI

Los modelos Responses directos de OpenAI usan la herramienta `web_search` alojada de OpenAI automáticamente cuando la búsqueda web de OpenClaw está habilitada y no hay ningún proveedor administrado fijado. Este es un comportamiento del proveedor en el complemento OpenAI incluido y solo se aplica al tráfico de la API nativa de OpenAI, no a las URL base de proxy compatibles con OpenAI ni a las rutas de Azure. Establezca `tools.web.search.provider` en otro proveedor como `brave` para mantener la herramienta administrada `web_search` para los modelos de OpenAI, o establezca `tools.web.search.enabled: false` para deshabilitar tanto la búsqueda administrada como la búsqueda nativa de OpenAI.

## Búsqueda web nativa de Codex

Los modelos compatibles con Codex pueden usar opcionalmente la herramienta Responses `web_search` nativa del proveedor en lugar de la función administrada `web_search` de OpenClaw.

- Configúrela bajo `tools.web.search.openaiCodex`
- Solo se activa para modelos compatibles con Codex (`openai-codex/*` o proveedores que usan `api: "openai-codex-responses"`)
- La herramienta administrada `web_search` todavía se aplica a modelos que no son Codex
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

Si la búsqueda nativa de Codex está habilitada pero el modelo actual no es compatible con Codex, OpenClaw mantiene el comportamiento administrado normal `web_search`.

## Seguridad de red

Las llamadas al proveedor administrado `web_search` usan la ruta de recuperación protegida de OpenClaw. Para
hosts de API de proveedores confiables, OpenClaw permite respuestas DNS de IP falsa de Surge, Clash y sing-box
en `198.18.0.0/15` y `fc00::/7` solo para ese nombre de host del proveedor.
Otros destinos privados, de retorno, de enlace local y de metadatos permanecen bloqueados.

Esta autorización automática no se aplica a URL `web_fetch` arbitrarias. Para
`web_fetch`, habilite `tools.web.fetch.ssrfPolicy.allowRfc2544BenchmarkRange` y
`tools.web.fetch.ssrfPolicy.allowIpv6UniqueLocalRange` explícitamente solo cuando su
proxy de confianza posea esos rangos sintéticos.

## Configurar la búsqueda web

Las listas de proveedores en los documentos y flujos de configuración están en orden alfabético. La detección automática mantiene un
orden de precedencia separado.

Si no se establece ningún `provider`, OpenClaw verifica los proveedores en este orden y usa el
primero que esté listo:

Primero los proveedores con API:

1. **Brave** -- `BRAVE_API_KEY` o `plugins.entries.brave.config.webSearch.apiKey` (orden 10)
2. **MiniMax Search** -- `MINIMAX_CODE_PLAN_KEY` / `MINIMAX_CODING_API_KEY` / `MINIMAX_OAUTH_TOKEN` / `MINIMAX_API_KEY` o `plugins.entries.minimax.config.webSearch.apiKey` (orden 15)
3. **Gemini** -- `plugins.entries.google.config.webSearch.apiKey`, `GEMINI_API_KEY`, o `models.providers.google.apiKey` (orden 20)
4. **Grok** -- `XAI_API_KEY` o `plugins.entries.xai.config.webSearch.apiKey` (orden 30)
5. **Kimi** -- `KIMI_API_KEY` / `MOONSHOT_API_KEY` o `plugins.entries.moonshot.config.webSearch.apiKey` (orden 40)
6. **Perplexity** -- `PERPLEXITY_API_KEY` / `OPENROUTER_API_KEY` o `plugins.entries.perplexity.config.webSearch.apiKey` (orden 50)
7. **Firecrawl** -- `FIRECRAWL_API_KEY` o `plugins.entries.firecrawl.config.webSearch.apiKey` (orden 60)
8. **Exa** -- `EXA_API_KEY` o `plugins.entries.exa.config.webSearch.apiKey`; el `plugins.entries.exa.config.webSearch.baseUrl` opcional anula el endpoint de Exa (orden 65)
9. **Tavily** -- `TAVILY_API_KEY` o `plugins.entries.tavily.config.webSearch.apiKey` (orden 70)

Alternativas sin clave después:

10. **DuckDuckGo** -- alternativa HTML sin clave y sin cuenta ni clave de API (orden 100)
11. **Ollama Web Search** -- alternativa sin clave a través de su host local Ollama configurado cuando es accesible y ha iniciado sesión con `ollama signin`; puede reutilizar la autenticación portador del proveedor Ollama cuando el host la necesita, y puede llamar a la búsqueda directa `https://ollama.com` cuando se configura con `OLLAMA_API_KEY` (orden 110)
12. **SearXNG** -- `SEARXNG_BASE_URL` o `plugins.entries.searxng.config.webSearch.baseUrl` (orden 200)

Si no se detecta ningún proveedor, se recurre a Brave (obtendrá un error de clave faltante
que le pedirá que configure uno).

<Note>
  Todos los campos de clave de proveedor admiten objetos SecretRef. Los SecretRefs
  con ámbito de complemento bajo `plugins.entries.<plugin>.config.webSearch.apiKey` se resuelven para los
  proveedores de búsqueda web integrados con API, incluidos Brave, Exa, Firecrawl,
  Gemini, Grok, Kimi, MiniMax, Perplexity y Tavily,
  ya sea que el proveedor se elija explícitamente a través de `tools.web.search.provider` o
  se seleccione mediante autodetección. En modo de autodetección, OpenClaw resuelve solo la
  clave del proveedor seleccionado; los SecretRefs no seleccionados permanecen inactivos, por lo que puede
  mantener varios proveedores configurados sin pagar el costo de resolución de
  aquellos que no está utilizando.
</Note>

## Config

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

La configuración específica del proveedor (claves de API, URL base, modos) se encuentra en
`plugins.entries.<plugin>.config.webSearch.*`. Gemini también puede reutilizar
`models.providers.google.apiKey` y `models.providers.google.baseUrl` como alternativas
de menor prioridad después de su configuración dedicada de búsqueda web y `GEMINI_API_KEY`. Consulte las
páginas del proveedor para ver ejemplos.

`tools.web.search.provider` se valida contra los identificadores de proveedores de búsqueda web
declarados por los manifiestos de complementos instalados e integrados. Un error tipográfico como `"brvae"`
falla la validación de configuración en lugar de volver silenciosamente a la autodetección. Si un
proveedor configurado solo tiene evidencia de complemento obsoleta, como un bloque `plugins.entries.<plugin>` sobrante
después de desinstalar un complemento de terceros,
OpenClaw mantiene el inicio resistente e informa una advertencia para que pueda reinstalar el
complemento o ejecutar `openclaw doctor --fix` para limpiar la configuración obsoleta.

La selección del proveedor alternativo para `web_fetch` es independiente:

- elíjalo con `tools.web.fetch.provider`
- u omita ese campo y deje que OpenClaw detecte automáticamente el primer proveedor de
  obtención web listo a partir de las credenciales disponibles
- `web_fetch` sin sandbox puede usar proveedores de complementos instalados que declaren
  `contracts.webFetchProviders`; las obtenciones en sandbox se mantienen solo en los integrados
- hoy el proveedor de obtención web integrado es Firecrawl, configurado en
  `plugins.entries.firecrawl.config.webFetch.*`

Cuando elige **Kimi** durante `openclaw onboard` o
`openclaw configure --section web`, OpenClaw también puede solicitar:

- la región de la API de Moonshot (`https://api.moonshot.ai/v1` o `https://api.moonshot.cn/v1`)
- el modelo de búsqueda web predeterminado de Kimi (por defecto es `kimi-k2.6`)

Para `x_search`, configure `plugins.entries.xai.config.xSearch.*`. Utiliza el
mismo perfil de autenticación xAI que el chat, o la credencial `XAI_API_KEY` / plugin de búsqueda web
utilizada por la búsqueda web de Grok.
La configuración heredada `tools.web.x_search.*` se migra automáticamente mediante `openclaw doctor --fix`.
Cuando elige Grok durante `openclaw onboard` o `openclaw configure --section web`,
OpenClaw también puede ofrecer una configuración opcional de `x_search` con la misma clave.
Este es un paso separado dentro de la ruta de Grok, no una opción separada de
proveedor de búsqueda web de nivel superior. Si elige otro proveedor, OpenClaw no
muestra el mensaje `x_search`.

### Almacenamiento de claves API

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
    Consulte [Variables de entorno](/es/help/faq#env-vars-and-env-loading).

  </Tab>
</Tabs>

## Parámetros de la herramienta

| Parámetro             | Descripción                                                          |
| --------------------- | -------------------------------------------------------------------- |
| `query`               | Consulta de búsqueda (obligatorio)                                   |
| `count`               | Resultados a devolver (1-10, predeterminado: 5)                      |
| `country`             | Código de país ISO de 2 letras (ej. "US", "DE")                      |
| `language`            | Código de idioma ISO 639-1 (ej. "en", "de")                          |
| `search_lang`         | Código de idioma de búsqueda (solo Brave)                            |
| `freshness`           | Filtro de tiempo: `day`, `week`, `month` o `year`                    |
| `date_after`          | Resultados después de esta fecha (AAAA-MM-DD)                        |
| `date_before`         | Resultados antes de esta fecha (AAAA-MM-DD)                          |
| `ui_lang`             | Código de idioma de la interfaz (solo Brave)                         |
| `domain_filter`       | Matriz de lista de permitidos/denegados de dominio (solo Perplexity) |
| `max_tokens`          | Presupuesto total de contenido, por defecto 25000 (solo Perplexity)  |
| `max_tokens_per_page` | Límite de tokens por página, por defecto 2048 (solo Perplexity)      |

<Warning>
  No todos los parámetros funcionan con todos los proveedores. El modo Brave `llm-context` rechaza `ui_lang`; `date_before` también necesita `date_after` porque los rangos de actualidad personalizados de Brave requieren tanto la fecha de inicio como la de finalización. Gemini, Grok y Kimi devuelven una respuesta sintetizada con citas. Aceptan `count` para la compatibilidad de herramientas
  compartidas, pero esto no cambia la forma de la respuesta fundamentada. Gemini es compatible con `freshness`, `date_after` y `date_before` convirtiéndolos en rangos de tiempo de fundamentación de Google Search. Perplexity se comporta de la misma manera cuando se utiliza la ruta de compatibilidad Sonar/OpenRouter (`plugins.entries.perplexity.config.webSearch.baseUrl` / `model` o
  `OPENROUTER_API_KEY`). SearXNG acepta `http://` solo para hosts de red privada de confianza o loopback; los endpoints públicos de SearXNG deben usar `https://`. Firecrawl y Tavily solo admiten `query` y `count` a través de `web_search` -- use sus herramientas dedicadas para opciones avanzadas.
</Warning>

## x_search

`x_search` consulta publicaciones de X (anteriormente Twitter) usando xAI y devuelve
respuestas sintetizadas por IA con citas. Acepta consultas en lenguaje natural y
filtros estructurados opcionales. OpenClaw solo habilita la herramienta xAI `x_search`
incorporada en la solicitud que atiende esta llamada de herramienta.

<Note>
  xAI documenta `x_search` como compatible con búsqueda por palabras clave, búsqueda semántica, búsqueda de usuario y recuperación de hilos. Para estadísticas de participación por publicación, como republicaciones, respuestas, marcadores o visitas, se prefiere una búsqueda dirigida a la URL exacta de la publicación o al ID de estado. Las búsquedas amplias por palabras clave pueden encontrar la
  publicación correcta pero devolver metadatos por publicación menos completos. Un buen patrón es: localizar primero la publicación y luego ejecutar una segunda consulta `x_search` centrada en esa publicación exacta.
</Note>

### configuración de x_search

```json5
{
  plugins: {
    entries: {
      xai: {
        config: {
          xSearch: {
            enabled: true,
            model: "grok-4-1-fast-non-reasoning",
            baseUrl: "https://api.x.ai/v1", // optional, overrides webSearch.baseUrl
            inlineCitations: false,
            maxTurns: 2,
            timeoutSeconds: 30,
            cacheTtlMinutes: 15,
          },
          webSearch: {
            apiKey: "xai-...", // optional if an xAI auth profile or XAI_API_KEY is set
            baseUrl: "https://api.x.ai/v1", // optional shared xAI Responses base URL
          },
        },
      },
    },
  },
}
```

`x_search` publica en `<baseUrl>/responses` cuando
`plugins.entries.xai.config.xSearch.baseUrl` está configurado. Si se omite ese campo,
se recurre a `plugins.entries.xai.config.webSearch.baseUrl`, luego al
legado `tools.web.search.grok.baseUrl`, y finalmente al punto final público de xAI.

### Parámetros de x_search

| Parámetro                    | Descripción                                                                         |
| ---------------------------- | ----------------------------------------------------------------------------------- |
| `query`                      | Consulta de búsqueda (requerida)                                                    |
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

Si utiliza perfiles de herramientas o listas permitidas, añada `web_search`, `x_search` o `group:web`:

```json5
{
  tools: {
    allow: ["web_search", "x_search"],
    // or: allow: ["group:web"]  (includes web_search, x_search, and web_fetch)
  },
}
```

## Relacionado

- [Web Fetch](/es/tools/web-fetch) -- obtiene una URL y extrae contenido legible
- [Web Browser](/es/tools/browser) -- automatización completa del navegador para sitios con mucho JS
- [Grok Search](/es/tools/grok-search) -- Grok como proveedor de `web_search`
- [Ollama Web Search](/es/tools/ollama-search) -- búsqueda web sin clave a través de su host Ollama
