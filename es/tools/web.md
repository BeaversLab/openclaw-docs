---
summary: "Herramientas de búsqueda y recuperación web (proveedores Brave, Firecrawl, Gemini, Grok, Kimi y Perplexity)"
read_when:
  - Deseas habilitar web_search o web_fetch
  - Necesitas configurar la clave API del proveedor
  - Deseas usar Gemini con fundamentación en Google Search
title: "Herramientas web"
---

# Herramientas web

OpenClaw incluye dos herramientas web ligeras:

- `web_search` — Busca en la web usando la API de Brave Search, Firecrawl Search, Gemini con fundamentación en Google Search, Grok, Kimi o la API de Perplexity Search.
- `web_fetch` — Recuperación HTTP + extracción legible (HTML → markdown/texto).

Estas **no** son automatizaciones de navegador. Para sitios con mucho JS o inicios de sesión, usa la
[herramienta Navegador](/es/tools/browser).

## Cómo funciona

- `web_search` llama a tu proveedor configurado y devuelve resultados.
- Los resultados se almacenan en caché por consulta durante 15 minutos (configurable).
- `web_fetch` realiza un HTTP GET sencillo y extrae el contenido legible
  (HTML → markdown/texto). **No** ejecuta JavaScript.
- `web_fetch` está habilitado por defecto (a menos que se deshabilite explícitamente).
- El complemento Firecrawl incluido también añade `firecrawl_search` y `firecrawl_scrape` cuando está habilitado.

Consulta la [configuración de Brave Search](/es/brave-search) y la [configuración de Perplexity Search](/es/perplexity) para detalles específicos del proveedor.

## Elegir un proveedor de búsqueda

| Proveedor                         | Formato del resultado                   | Filtros específicos del proveedor                                         | Notas                                                                                       | Clave API                                   |
| --------------------------------- | --------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------- |
| **API de Brave Search**           | Resultados estructurados con fragmentos | `country`, `language`, `ui_lang`, tiempo                                  | Soporta el modo `llm-context` de Brave                                                      | `BRAVE_API_KEY`                             |
| **Búsqueda Firecrawl**            | Resultados estructurados con fragmentos | Usa `firecrawl_search` para opciones de búsqueda específicas de Firecrawl | Lo mejor para emparejar la búsqueda con el raspado/extracción de Firecrawl                  | `FIRECRAWL_API_KEY`                         |
| **Gemini**                        | Respuestas sintetizadas por IA + citas  | —                                                                         | Usa la fundamentación en Google Search                                                      | `GEMINI_API_KEY`                            |
| **Grok**                          | Respuestas sintetizadas por IA + citas  | —                                                                         | Usa respuestas con fundamentación web de xAI                                                | `XAI_API_KEY`                               |
| **Kimi**                          | Respuestas sintetizadas por IA + citas  | —                                                                         | Usa la búsqueda web de Moonshot                                                             | `KIMI_API_KEY` / `MOONSHOT_API_KEY`         |
| **API de búsqueda de Perplexity** | Resultados estructurados con fragmentos | `country`, `language`, hora, `domain_filter`                              | Admite controles de extracción de contenido; OpenRouter usa la ruta de compatibilidad Sonar | `PERPLEXITY_API_KEY` / `OPENROUTER_API_KEY` |

### Detección automática

La tabla anterior está en orden alfabético. Si no se establece explícitamente ningún `provider`, la detección automática en tiempo de ejecución comprueba los proveedores en este orden:

1. **Brave** — variable de entorno `BRAVE_API_KEY` o `plugins.entries.brave.config.webSearch.apiKey`
2. **Gemini** — variable de entorno `GEMINI_API_KEY` o `plugins.entries.google.config.webSearch.apiKey`
3. **Grok** — variable de entorno `XAI_API_KEY` o `plugins.entries.xai.config.webSearch.apiKey`
4. **Kimi** — variable de entorno `KIMI_API_KEY` / `MOONSHOT_API_KEY` o `plugins.entries.moonshot.config.webSearch.apiKey`
5. **Perplexity** — `PERPLEXITY_API_KEY`, `OPENROUTER_API_KEY` o `plugins.entries.perplexity.config.webSearch.apiKey`
6. **Firecrawl** — variable de entorno `FIRECRAWL_API_KEY` o `plugins.entries.firecrawl.config.webSearch.apiKey`

Si no se encuentra ninguna clave, se recurre a Brave (obtendrá un error de clave faltante que le pedirá que configure una).

Comportamiento de SecretRef en tiempo de ejecución:

- Los SecretRef de herramientas web se resuelven atómicamente al iniciar/recargar la puerta de enlace.
- En modo de detección automática, OpenClaw solo resuelve la clave del proveedor seleccionado. Los SecretRef de proveedores no seleccionados permanecen inactivos hasta que se seleccionan.
- Si el SecretRef del proveedor seleccionado no está resuelto y no existe ningún respaldo de entorno del proveedor, el inicio/recarga falla rápidamente.

## Configuración de la búsqueda web

Use `openclaw configure --section web` para configurar su clave API y elegir un proveedor.

### Búsqueda Brave

1. Cree una cuenta de API de Búsqueda Brave en [brave.com/search/api](https://brave.com/search/api/)
2. En el panel, elija el plan **Search** y genere una clave API.
3. Ejecute `openclaw configure --section web` para almacenar la clave en la configuración, o establezca `BRAVE_API_KEY` en su entorno.

Cada plan de Brave incluye **\$5/mes en crédito gratuito** (renovable). El plan de
Search cuesta \$5 por 1,000 solicitudes, por lo que el crédito cubre 1,000 consultas/mes. Establezca
su límite de uso en el panel de Brave para evitar cargos inesperados. Consulte el
[portal de la API de Brave](https://brave.com/search/api/) para conocer los planes actuales y
precios.

### Perplexity Search

1. Cree una cuenta de Perplexity en [perplexity.ai/settings/api](https://www.perplexity.ai/settings/api)
2. Genere una clave API en el panel
3. Ejecute `openclaw configure --section web` para almacenar la clave en la configuración, o establezca `PERPLEXITY_API_KEY` en su entorno.

Para la compatibilidad con Sonar/OpenRouter heredado, establezca `OPENROUTER_API_KEY` en su lugar, o configure `plugins.entries.perplexity.config.webSearch.apiKey` con una clave `sk-or-...`. Establecer `plugins.entries.perplexity.config.webSearch.baseUrl` o `model` también hace que Perplexity vuelva a optar por la ruta de compatibilidad de chat-completions.

La configuración de búsqueda web específica del proveedor ahora se encuentra en `plugins.entries.<plugin>.config.webSearch.*`.
Las rutas de proveedor `tools.web.search.*` heredadas todavía se cargan a través de una capa de compatibilidad por una versión, pero no deben usarse en nuevas configuraciones.

Consulte [Perplexity Search API Docs](https://docs.perplexity.ai/guides/search-quickstart) para obtener más detalles.

### Dónde almacenar la clave

**A través de la configuración:** ejecute `openclaw configure --section web`. Almacena la clave en la ruta de configuración específica del proveedor:

- Brave: `plugins.entries.brave.config.webSearch.apiKey`
- Firecrawl: `plugins.entries.firecrawl.config.webSearch.apiKey`
- Gemini: `plugins.entries.google.config.webSearch.apiKey`
- Grok: `plugins.entries.xai.config.webSearch.apiKey`
- Kimi: `plugins.entries.moonshot.config.webSearch.apiKey`
- Perplexity: `plugins.entries.perplexity.config.webSearch.apiKey`

Todos estos campos también admiten objetos SecretRef.

**A través del entorno:** establezca las variables de entorno del proveedor en el entorno del proceso Gateway:

- Brave: `BRAVE_API_KEY`
- Firecrawl: `FIRECRAWL_API_KEY`
- Gemini: `GEMINI_API_KEY`
- Grok: `XAI_API_KEY`
- Kimi: `KIMI_API_KEY` o `MOONSHOT_API_KEY`
- Perplexity: `PERPLEXITY_API_KEY` o `OPENROUTER_API_KEY`

Para una instalación de gateway, colóquelas en `~/.openclaw/.env` (o en su entorno de servicio). Consulte [Env vars](/es/help/faq#how-does-openclaw-load-environment-variables).

### Ejemplos de configuración

**Búsqueda de Brave:**

```json5
{
  plugins: {
    entries: {
      brave: {
        config: {
          webSearch: {
            apiKey: "YOUR_BRAVE_API_KEY", // optional if BRAVE_API_KEY is set // pragma: allowlist secret
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        enabled: true,
        provider: "brave",
      },
    },
  },
}
```

**Búsqueda de Firecrawl:**

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
      },
    },
  },
  plugins: {
    entries: {
      firecrawl: {
        enabled: true,
        config: {
          webSearch: {
            apiKey: "fc-...", // optional if FIRECRAWL_API_KEY is set
            baseUrl: "https://api.firecrawl.dev",
          },
        },
      },
    },
  },
}
```

Cuando eliges Firecrawl en la configuración inicial o en `openclaw configure --section web`, OpenClaw habilita automáticamente el complemento Firecrawl incluido, por lo que `web_search`, `firecrawl_search` y `firecrawl_scrape` están todos disponibles.

**Modo de contexto LLM de Brave:**

```json5
{
  plugins: {
    entries: {
      brave: {
        config: {
          webSearch: {
            apiKey: "YOUR_BRAVE_API_KEY", // optional if BRAVE_API_KEY is set // pragma: allowlist secret
            mode: "llm-context",
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        enabled: true,
        provider: "brave",
      },
    },
  },
}
```

`llm-context` devuelve fragmentos de página extraídos para la verificación en lugar de los fragmentos estándar de Brave.
En este modo, `country` y `language` / `search_lang` todavía funcionan, pero `ui_lang`,
`freshness`, `date_after` y `date_before` son rechazados.

**Búsqueda de Perplexity:**

```json5
{
  plugins: {
    entries: {
      perplexity: {
        config: {
          webSearch: {
            apiKey: "pplx-...", // optional if PERPLEXITY_API_KEY is set
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        enabled: true,
        provider: "perplexity",
      },
    },
  },
}
```

**Perplexity a través de OpenRouter / compatibilidad con Sonar:**

```json5
{
  plugins: {
    entries: {
      perplexity: {
        config: {
          webSearch: {
            apiKey: "<openrouter-api-key>", // optional if OPENROUTER_API_KEY is set
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
        enabled: true,
        provider: "perplexity",
      },
    },
  },
}
```

## Usar Gemini (verificación de Google Search)

Los modelos Gemini admiten [Google Search grounding](https://ai.google.dev/gemini-api/docs/grounding) integrado,
que devuelve respuestas sintetizadas por IA respaldadas por resultados en vivo de Google Search con citas.

### Obtener una clave API de Gemini

1. Ve a [Google AI Studio](https://aistudio.google.com/apikey)
2. Crear una clave API
3. Establezca `GEMINI_API_KEY` en el entorno de Gateway o configure `plugins.entries.google.config.webSearch.apiKey`

### Configurar la búsqueda de Gemini

```json5
{
  plugins: {
    entries: {
      google: {
        config: {
          webSearch: {
            // API key (optional if GEMINI_API_KEY is set)
            apiKey: "AIza...",
            // Model (defaults to "gemini-2.5-flash")
            model: "gemini-2.5-flash",
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "gemini",
      },
    },
  },
}
```

**Alternativa de entorno:** establezca `GEMINI_API_KEY` en el entorno de Gateway.
Para una instalación de puerta de enlace, póngalo en `~/.openclaw/.env`.

### Notas

- Las URL de las citas de la verificación de Gemini se resuelven automáticamente desde las
  URL de redireccionamiento de Google a URL directas.
- La resolución de redireccionamientos utiliza la ruta de guardia SSRF (HEAD + comprobaciones de redireccionamiento + validación http/https) antes de devolver la URL de la cita final.
- La resolución de redireccionamientos utiliza valores predeterminados SSRF estrictos, por lo que los redireccionamientos a objetivos privados/internos están bloqueados.
- El modelo predeterminado (`gemini-2.5-flash`) es rápido y rentable.
  Se puede usar cualquier modelo Gemini que admita la verificación.

## web_search

Busca en la web utilizando tu proveedor configurado.

### Requisitos

- `tools.web.search.enabled` no debe ser `false` (predeterminado: habilitado)
- Clave API para tu proveedor elegido:
  - **Brave**: `BRAVE_API_KEY` o `plugins.entries.brave.config.webSearch.apiKey`
  - **Firecrawl**: `FIRECRAWL_API_KEY` o `plugins.entries.firecrawl.config.webSearch.apiKey`
  - **Gemini**: `GEMINI_API_KEY` o `plugins.entries.google.config.webSearch.apiKey`
  - **Grok**: `XAI_API_KEY` o `plugins.entries.xai.config.webSearch.apiKey`
  - **Kimi**: `KIMI_API_KEY`, `MOONSHOT_API_KEY`, o `plugins.entries.moonshot.config.webSearch.apiKey`
  - **Perplexity**: `PERPLEXITY_API_KEY`, `OPENROUTER_API_KEY`, o `plugins.entries.perplexity.config.webSearch.apiKey`
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

La ruta de compatibilidad de OpenRouter / Sonar de Perplexity solo admite `query` y `freshness`.
Si establece `plugins.entries.perplexity.config.webSearch.baseUrl` / `model`, usa `OPENROUTER_API_KEY`, o configura una clave `sk-or-...` bajo `plugins.entries.perplexity.config.webSearch.apiKey`, los filtros exclusivos de la API de Search devolverán errores explícitos.

| Parámetro             | Descripción                                                            |
| --------------------- | ---------------------------------------------------------------------- |
| `query`               | Consulta de búsqueda (obligatoria)                                     |
| `count`               | Resultados a devolver (1-10, predeterminado: 5)                        |
| `country`             | Código de país ISO de 2 letras (ej., "US", "DE")                       |
| `language`            | Código de idioma ISO 639-1 (ej., "en", "de")                           |
| `freshness`           | Filtro de tiempo: `day`, `week`, `month`, o `year`                     |
| `date_after`          | Resultados después de esta fecha (AAAA-MM-DD)                          |
| `date_before`         | Resultados antes de esta fecha (AAAA-MM-DD)                            |
| `ui_lang`             | Código de idioma de la interfaz de usuario (solo Brave)                |
| `domain_filter`       | Matriz de lista de permitidos/bloqueados de dominio (solo Perplexity)  |
| `max_tokens`          | Presupuesto total de contenido, predeterminado 25000 (solo Perplexity) |
| `max_tokens_per_page` | Límite de tokens por página, predeterminado 2048 (solo Perplexity)     |

Firecrawl `web_search` admite `query` y `count`. Para controles específicos de Firecrawl como `sources`, `categories`, extracción de resultados o tiempo de espera de extracción, use `firecrawl_search` del complemento Firecrawl incluido.

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

Cuando el modo Brave `llm-context` está habilitado, `ui_lang`, `freshness`, `date_after` y
`date_before` no son compatibles. Use el modo Brave `web` para esos filtros.

## web_fetch

Recupera una URL y extrae el contenido legible.

### requisitos de web_fetch

- `tools.web.fetch.enabled` no debe ser `false` (predeterminado: habilitado)
- Alternativa opcional de Firecrawl: configure `tools.web.fetch.firecrawl.apiKey` o `FIRECRAWL_API_KEY`.
- `tools.web.fetch.firecrawl.apiKey` admite objetos SecretRef.

### configuración de web_fetch

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
- Las solicitudes de Firecrawl usan el modo de evasión de bots y almacenan los resultados en caché de forma predeterminada.
- Los SecretRefs de Firecrawl se resuelven solo cuando Firecrawl está activo (`tools.web.fetch.enabled !== false` y `tools.web.fetch.firecrawl.enabled !== false`).
- Si Firecrawl está activo y su SecretRef no se resuelve sin alternativa `FIRECRAWL_API_KEY`, el inicio/recarga falla rápidamente.
- `web_fetch` envía un User-Agent similar a Chrome y `Accept-Language` de forma predeterminada; anule `userAgent` si es necesario.
- `web_fetch` bloquea los nombres de host privados/internos y vuelve a verificar las redirecciones (limite con `maxRedirects`).
- `maxChars` se limita a `tools.web.fetch.maxCharsCap`.
- `web_fetch` limita el tamaño del cuerpo de la respuesta descargada a `tools.web.fetch.maxResponseBytes` antes del análisis; las respuestas demasiado grandes se truncan e incluyen una advertencia.
- `web_fetch` es una extracción de mejor esfuerzo; algunos sitios necesitarán la herramienta del navegador.
- Consulte [Firecrawl](/es/tools/firecrawl) para la configuración de la clave y los detalles del servicio.
- Las respuestas se almacenan en caché (por defecto 15 minutos) para reducir las recuperaciones repetidas.
- Si usa perfiles de herramientas/listas de permitidos, añada `web_search`/`web_fetch` o `group:web`.
- Si falta la clave de la API, `web_search` devuelve un breve consejo de configuración con un enlace a la documentación.

import es from "/components/footer/es.mdx";

<es />
