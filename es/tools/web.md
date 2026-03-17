---
summary: "Herramientas de búsqueda web + recuperación (proveedores Brave, Firecrawl, Gemini, Grok, Kimi y Perplexity)"
read_when:
  - You want to enable web_search or web_fetch
  - You need provider API key setup
  - You want to use Gemini with Google Search grounding
title: "Herramientas web"
---

# Herramientas web

OpenClaw incluye dos herramientas web ligeras:

- `web_search` — Busca en la web usando la API de Brave Search, Firecrawl Search, Gemini con Google Search grounding, Grok, Kimi o la API de Perplexity Search.
- `web_fetch` — Obtención HTTP + extracción legible (HTML → markdown/texto).

Estas **no** son herramientas de automatización del navegador. Para sitios con mucho JS o inicios de sesión, usa la
[herramienta Navegador](/es/tools/browser).

## Cómo funciona

- `web_search` llama a tu proveedor configurado y devuelve resultados.
- Los resultados se almacenan en caché por consulta durante 15 minutos (configurable).
- `web_fetch` hace un HTTP GET simple y extrae el contenido legible
  (HTML → markdown/texto). **No** ejecuta JavaScript.
- `web_fetch` está habilitado por defecto (a menos que se deshabilite explícitamente).
- El complemento Firecrawl incluido también añade `firecrawl_search` y `firecrawl_scrape` cuando está habilitado.

Consulta la [configuración de Brave Search](/es/brave-search) y la [configuración de Perplexity Search](/es/perplexity) para detalles específicos del proveedor.

## Elegir un proveedor de búsqueda

| Proveedor                    | Formato del resultado                   | Filtros específicos del proveedor                                         | Notas                                                                                           | Clave de API                                |
| ---------------------------- | --------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------- |
| **API de Brave Search**      | Resultados estructurados con fragmentos | `country`, `language`, `ui_lang`, tiempo                                  | Soporta el modo `llm-context` de Brave                                                          | `BRAVE_API_KEY`                             |
| **Firecrawl Search**         | Resultados estructurados con fragmentos | Usa `firecrawl_search` para opciones de búsqueda específicas de Firecrawl | Mejor para combinar la búsqueda con el scraping/extracción de Firecrawl                         | `FIRECRAWL_API_KEY`                         |
| **Gemini**                   | Respuestas sintetizadas por IA + citas  | —                                                                         | Usa Google Search grounding                                                                     | `GEMINI_API_KEY`                            |
| **Grok**                     | Respuestas sintetizadas por IA + citas  | —                                                                         | Usa respuestas con anclaje web de xAI                                                           | `XAI_API_KEY`                               |
| **Kimi**                     | Respuestas sintetizadas por IA + citas  | —                                                                         | Usa la búsqueda web de Moonshot                                                                 | `KIMI_API_KEY` / `MOONSHOT_API_KEY`         |
| **API de Perplexity Search** | Resultados estructurados con fragmentos | `country`, `language`, tiempo, `domain_filter`                            | Admite controles de extracción de contenido; OpenRouter utiliza la ruta de compatibilidad Sonar | `PERPLEXITY_API_KEY` / `OPENROUTER_API_KEY` |

### Detección automática

La tabla anterior está ordenada alfabéticamente. Si no se establece explícitamente ningún `provider`, la detección automática en tiempo de ejecución comprueba los proveedores en este orden:

1. **Brave** — variable de entorno `BRAVE_API_KEY` o configuración `tools.web.search.apiKey`
2. **Gemini** — variable de entorno `GEMINI_API_KEY` o configuración `tools.web.search.gemini.apiKey`
3. **Grok** — variable de entorno `XAI_API_KEY` o configuración `tools.web.search.grok.apiKey`
4. **Kimi** — variable de entorno `KIMI_API_KEY` / `MOONSHOT_API_KEY` o configuración `tools.web.search.kimi.apiKey`
5. **Perplexity** — configuración `PERPLEXITY_API_KEY`, `OPENROUTER_API_KEY` o `tools.web.search.perplexity.apiKey`
6. **Firecrawl** — variable de entorno `FIRECRAWL_API_KEY` o configuración `tools.web.search.firecrawl.apiKey`

Si no se encuentran claves, se recurre a Brave (obtendrá un error de clave faltante indicándole que configure una).

Comportamiento de SecretRef en tiempo de ejecución:

- Los SecretRefs de herramientas web se resuelven atómicamente al iniciar/recargar la puerta de enlace.
- En modo de detección automática, OpenClaw resuelve solo la clave del proveedor seleccionado. Los SecretRefs de proveedores no seleccionados permanecen inactivos hasta que se seleccionen.
- Si el SecretRef del proveedor seleccionado no está resuelto y no existe una alternativa de variable de entorno del proveedor, el inicio/recarga falla rápidamente.

## Configurar la búsqueda web

Use `openclaw configure --section web` para configurar su clave API y elegir un proveedor.

### Brave Search

1. Cree una cuenta de API de Brave Search en [brave.com/search/api](https://brave.com/search/api/)
2. En el panel, elija el plan **Search** y genere una clave API.
3. Ejecute `openclaw configure --section web` para guardar la clave en la configuración, o establezca `BRAVE_API_KEY` en su entorno.

Cada plan de Brave incluye **\$5/mes en crédito gratuito** (renovable). El plan
Search cuesta \$5 por cada 1,000 solicitudes, por lo que el crédito cubre 1,000 consultas/mes. Establezca
su límite de uso en el panel de Brave para evitar cargos inesperados. Consulte el
[portal de la API de Brave](https://brave.com/search/api/) para ver los planes y
precios actuales.

### Búsqueda Perplexity

1. Cree una cuenta de Perplexity en [perplexity.ai/settings/api](https://www.perplexity.ai/settings/api)
2. Genere una clave API en el panel de control
3. Ejecute `openclaw configure --section web` para almacenar la clave en la configuración, o establezca `PERPLEXITY_API_KEY` en su entorno.

Para la compatibilidad heredada con Sonar/OpenRouter, establezca `OPENROUTER_API_KEY` en su lugar, o configure `tools.web.search.perplexity.apiKey` con una clave `sk-or-...`. Establecer `tools.web.search.perplexity.baseUrl` o `model` también hace que Perplexity vuelva a la ruta de compatibilidad de chat-completions.

Consulte los [Documentos de la API de Búsqueda Perplexity](https://docs.perplexity.ai/guides/search-quickstart) para más detalles.

### Dónde almacenar la clave

**A través de la configuración:** ejecute `openclaw configure --section web`. Almacena la clave bajo la ruta de configuración específica del proveedor:

- Brave: `tools.web.search.apiKey`
- Firecrawl: `tools.web.search.firecrawl.apiKey`
- Gemini: `tools.web.search.gemini.apiKey`
- Grok: `tools.web.search.grok.apiKey`
- Kimi: `tools.web.search.kimi.apiKey`
- Perplexity: `tools.web.search.perplexity.apiKey`

Todos estos campos también admiten objetos SecretRef.

**A través del entorno:** establezca las variables de entorno del proveedor en el entorno del proceso Gateway:

- Brave: `BRAVE_API_KEY`
- Firecrawl: `FIRECRAWL_API_KEY`
- Gemini: `GEMINI_API_KEY`
- Grok: `XAI_API_KEY`
- Kimi: `KIMI_API_KEY` o `MOONSHOT_API_KEY`
- Perplexity: `PERPLEXITY_API_KEY` o `OPENROUTER_API_KEY`

Para una instalación de puerta de enlace, colóquelos en `~/.openclaw/.env` (o en el entorno de su servicio). Consulte [Variables de entorno](/es/help/faq#how-does-openclaw-load-environment-variables).

### Ejemplos de configuración

**Búsqueda Brave:**

```json5
{
  tools: {
    web: {
      search: {
        enabled: true,
        provider: "brave",
        apiKey: "YOUR_BRAVE_API_KEY", // optional if BRAVE_API_KEY is set // pragma: allowlist secret
      },
    },
  },
}
```

**Búsqueda Firecrawl:**

```json5
{
  plugins: {
    entries: {
      firecrawl: {
        enabled: true,
      },
    },
  },
  tools: {
    web: {
      search: {
        enabled: true,
        provider: "firecrawl",
        firecrawl: {
          apiKey: "fc-...", // optional if FIRECRAWL_API_KEY is set
          baseUrl: "https://api.firecrawl.dev",
        },
      },
    },
  },
}
```

Cuando elige Firecrawl en la incorporación o `openclaw configure --section web`, OpenClaw habilita automáticamente el complemento Firecrawl incluido, por lo que `web_search`, `firecrawl_search` y `firecrawl_scrape` están todos disponibles.

**Modo de contexto LLM de Brave:**

```json5
{
  tools: {
    web: {
      search: {
        enabled: true,
        provider: "brave",
        apiKey: "YOUR_BRAVE_API_KEY", // optional if BRAVE_API_KEY is set // pragma: allowlist secret
        brave: {
          mode: "llm-context",
        },
      },
    },
  },
}
```

`llm-context` devuelve fragmentos de página extraídos para el grounding en lugar de los fragmentos estándar de Brave.
En este modo, `country` y `language` / `search_lang` todavía funcionan, pero `ui_lang`,
`freshness`, `date_after` y `date_before` son rechazados.

**Búsqueda de Perplexity:**

```json5
{
  tools: {
    web: {
      search: {
        enabled: true,
        provider: "perplexity",
        perplexity: {
          apiKey: "pplx-...", // optional if PERPLEXITY_API_KEY is set
        },
      },
    },
  },
}
```

**Perplexity a través de OpenRouter / compatibilidad con Sonar:**

```json5
{
  tools: {
    web: {
      search: {
        enabled: true,
        provider: "perplexity",
        perplexity: {
          apiKey: "<openrouter-api-key>", // optional if OPENROUTER_API_KEY is set
          baseUrl: "https://openrouter.ai/api/v1",
          model: "perplexity/sonar-pro",
        },
      },
    },
  },
}
```

## Uso de Gemini (Google Search grounding)

Los modelos Gemini admiten [Google Search grounding](https://ai.google.dev/gemini-api/docs/grounding) integrado,
que devuelve respuestas sintetizadas por IA respaldadas por resultados en vivo de Google Search con citas.

### Obtención de una clave de API de Gemini

1. Vaya a [Google AI Studio](https://aistudio.google.com/apikey)
2. Cree una clave de API
3. Establezca `GEMINI_API_KEY` en el entorno de Gateway, o configure `tools.web.search.gemini.apiKey`

### Configuración de la búsqueda de Gemini

```json5
{
  tools: {
    web: {
      search: {
        provider: "gemini",
        gemini: {
          // API key (optional if GEMINI_API_KEY is set)
          apiKey: "AIza...",
          // Model (defaults to "gemini-2.5-flash")
          model: "gemini-2.5-flash",
        },
      },
    },
  },
}
```

**Alternativa de entorno:** establezca `GEMINI_API_KEY` en el entorno de Gateway.
Para una instalación de puerta de enlace, póngalo en `~/.openclaw/.env`.

### Notas

- Las URL de las citas del grounding de Gemini se resuelven automáticamente desde las
  URL de redirección de Google a las URL directas.
- La resolución de redireccionamientos utiliza la ruta de protección SSRF (HEAD + comprobaciones de redirección + validación http/https) antes de devolver la URL de la cita final.
- La resolución de redireccionamientos utiliza valores predeterminados SSRF estrictos, por lo que se bloquean los redireccionamientos a objetivos privados/internos.
- El modelo predeterminado (`gemini-2.5-flash`) es rápido y rentable.
  Se puede utilizar cualquier modelo Gemini que admita grounding.

## web_search

Busque en la web utilizando su proveedor configurado.

### Requisitos

- `tools.web.search.enabled` no debe ser `false` (predeterminado: habilitado)
- Clave de API para su proveedor elegido:
  - **Brave**: `BRAVE_API_KEY` o `tools.web.search.apiKey`
  - **Firecrawl**: `FIRECRAWL_API_KEY` o `tools.web.search.firecrawl.apiKey`
  - **Gemini**: `GEMINI_API_KEY` o `tools.web.search.gemini.apiKey`
  - **Grok**: `XAI_API_KEY` o `tools.web.search.grok.apiKey`
  - **Kimi**: `KIMI_API_KEY`, `MOONSHOT_API_KEY` o `tools.web.search.kimi.apiKey`
  - **Perplexity**: `PERPLEXITY_API_KEY`, `OPENROUTER_API_KEY`, o `tools.web.search.perplexity.apiKey`
- Todos los campos de clave de proveedor anteriores admiten objetos SecretRef.

### Config

```json5
{
  tools: {
    web: {
      search: {
        enabled: true,
        apiKey: "BRAVE_API_KEY_HERE", // optional if BRAVE_API_KEY is set
        maxResults: 5,
        timeoutSeconds: 30,
        cacheTtlMinutes: 15,
      },
    },
  },
}
```

### Parámetros de la herramienta

Los parámetros dependen del proveedor seleccionado.

La ruta de compatibilidad de Perplexity con OpenRouter / Sonar solo admite `query` y `freshness`.
Si establece `tools.web.search.perplexity.baseUrl` / `model`, usa `OPENROUTER_API_KEY`, o configura una clave `sk-or-...`, los filtros exclusivos de la API de búsqueda devuelven errores explícitos.

| Parámetro             | Descripción                                                            |
| --------------------- | ---------------------------------------------------------------------- |
| `query`               | Consulta de búsqueda (obligatorio)                                     |
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

Firecrawl `web_search` admite `query` y `count`. Para controles específicos de Firecrawl como `sources`, `categories`, el scraping de resultados o el tiempo de espera de scraping, use `firecrawl_search` del complemento Firecrawl incluido.

**Ejemplos:**

```javascript
// German-specific search
await web_search({
  query: "TV online schauen",
  country: "DE",
  language: "de",
});

// Recent results (past week)
await web_search({
  query: "TMBG interview",
  freshness: "week",
});

// Date range search
await web_search({
  query: "AI developments",
  date_after: "2024-01-01",
  date_before: "2024-06-30",
});

// Domain filtering (Perplexity only)
await web_search({
  query: "climate research",
  domain_filter: ["nature.com", "science.org", ".edu"],
});

// Exclude domains (Perplexity only)
await web_search({
  query: "product reviews",
  domain_filter: ["-reddit.com", "-pinterest.com"],
});

// More content extraction (Perplexity only)
await web_search({
  query: "detailed AI research",
  max_tokens: 50000,
  max_tokens_per_page: 4096,
});
```

Cuando el modo `llm-context` de Brave está habilitado, `ui_lang`, `freshness`, `date_after` y
`date_before` no son compatibles. Use el modo `web` de Brave para esos filtros.

## web_fetch

Obtiene una URL y extrae el contenido legible.

### requisitos de web_fetch

- `tools.web.fetch.enabled` no debe ser `false` (predeterminado: habilitado)
- Respaldo opcional de Firecrawl: configure `tools.web.fetch.firecrawl.apiKey` o `FIRECRAWL_API_KEY`.
- `tools.web.fetch.firecrawl.apiKey` admite objetos SecretRef.

### config de web_fetch

```json5
{
  tools: {
    web: {
      fetch: {
        enabled: true,
        maxChars: 50000,
        maxCharsCap: 50000,
        maxResponseBytes: 2000000,
        timeoutSeconds: 30,
        cacheTtlMinutes: 15,
        maxRedirects: 3,
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        readability: true,
        firecrawl: {
          enabled: true,
          apiKey: "FIRECRAWL_API_KEY_HERE", // optional if FIRECRAWL_API_KEY is set
          baseUrl: "https://api.firecrawl.dev",
          onlyMainContent: true,
          maxAgeMs: 86400000, // ms (1 day)
          timeoutSeconds: 60,
        },
      },
    },
  },
}
```

### parámetros de la herramienta web_fetch

- `url` (obligatorio, solo http/https)
- `extractMode` (`markdown` | `text`)
- `maxChars` (truncar páginas largas)

Notas:

- `web_fetch` usa Readability (extracción de contenido principal) primero, luego Firecrawl (si está configurado). Si ambos fallan, la herramienta devuelve un error.
- Las solicitudes de Firecrawl usan el modo de evasión de bots y almacenan en caché los resultados de forma predeterminada.
- Los SecretRefs de Firecrawl se resuelven solo cuando Firecrawl está activo (`tools.web.fetch.enabled !== false` y `tools.web.fetch.firecrawl.enabled !== false`).
- Si Firecrawl está activo y su SecretRef no está resuelto sin respaldo `FIRECRAWL_API_KEY`, el inicio/recarga falla rápidamente.
- `web_fetch` envía un User-Agent tipo Chrome y `Accept-Language` de forma predeterminada; anule `userAgent` si es necesario.
- `web_fetch` bloquea nombres de host privados/internos y vuelve a verificar las redirecciones (límite con `maxRedirects`).
- `maxChars` está limitado a `tools.web.fetch.maxCharsCap`.
- `web_fetch` limita el tamaño del cuerpo de respuesta descargado a `tools.web.fetch.maxResponseBytes` antes del análisis; las respuestas excesivamente grandes se truncan e incluyen una advertencia.
- `web_fetch` es una extracción de mejor esfuerzo; algunos sitios necesitarán la herramienta del navegador.
- Consulte [Firecrawl](/es/tools/firecrawl) para la configuración de claves y detalles del servicio.
- Las respuestas se almacenan en caché (15 minutos por defecto) para reducir las recuperaciones repetidas.
- Si usa perfiles/listas permitidas de herramientas, añada `web_search`/`web_fetch` o `group:web`.
- Si falta la clave de API, `web_search` devuelve un breve consejo de configuración con un enlace a la documentación.

import es from "/components/footer/es.mdx";

<es />
