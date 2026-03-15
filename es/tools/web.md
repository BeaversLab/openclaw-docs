---
summary: "Herramientas de búsqueda y obtención web (proveedores Brave, Gemini, Grok, Kimi y Perplexity)"
read_when:
  - You want to enable web_search or web_fetch
  - You need provider API key setup
  - You want to use Gemini with Google Search grounding
title: "Herramientas web"
---

# Herramientas web

OpenClaw incluye dos herramientas web ligeras:

- `web_search` — Busca en la web utilizando la API de Brave Search, Gemini con fundamentos de Google Search, Grok, Kimi o la API de Perplexity Search.
- `web_fetch` — Obtención HTTP + extracción legible (HTML → markdown/texto).

Estas **no** son automatizaciones de navegador. Para sitios con mucho JS o inicios de sesión, use la
[Herramienta de navegador](/es/tools/browser).

## Cómo funciona

- `web_search` llama a su proveedor configurado y devuelve resultados.
- Los resultados se almacenan en caché por consulta durante 15 minutos (configurable).
- `web_fetch` realiza una HTTP GET simple y extrae el contenido legible
  (HTML → markdown/texto). **No** ejecuta JavaScript.
- `web_fetch` está habilitado de forma predeterminada (a menos que se deshabilite explícitamente).

Vea la [Configuración de Brave Search](/es/brave-search) y la [Configuración de Perplexity Search](/es/perplexity) para detalles específicos del proveedor.

## Elegir un proveedor de búsqueda

| Proveedor                    | Formato del resultado                   | Filtros específicos del proveedor              | Notas                                                                                        | Clave API                                   |
| ---------------------------- | --------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------- |
| **API de Brave Search**      | Resultados estructurados con fragmentos | `country`, `language`, `ui_lang`, tiempo       | Soporta el modo `llm-context` de Brave                                                       | `BRAVE_API_KEY`                             |
| **Gemini**                   | Respuestas sintetizadas por IA + citas  | —                                              | Utiliza fundamentos de Google Search                                                         | `GEMINI_API_KEY`                            |
| **Grok**                     | Respuestas sintetizadas por IA + citas  | —                                              | Utiliza respuestas de xAI basadas en la web                                                  | `XAI_API_KEY`                               |
| **Kimi**                     | Respuestas sintetizadas por IA + citas  | —                                              | Utiliza la búsqueda web de Moonshot                                                          | `KIMI_API_KEY` / `MOONSHOT_API_KEY`         |
| **API de Perplexity Search** | Resultados estructurados con fragmentos | `country`, `language`, tiempo, `domain_filter` | Soporta controles de extracción de contenido; OpenRouter usa la ruta de compatibilidad Sonar | `PERPLEXITY_API_KEY` / `OPENROUTER_API_KEY` |

### Detección automática

La tabla anterior está ordenada alfabéticamente. Si no se establece explícitamente ningún `provider`, la detección automática en tiempo de ejecución comprueba los proveedores en este orden:

1. **Brave** — variable de entorno `BRAVE_API_KEY` o configuración `tools.web.search.apiKey`
2. **Gemini** — variable de entorno `GEMINI_API_KEY` o configuración `tools.web.search.gemini.apiKey`
3. **Grok** — variable de entorno `XAI_API_KEY` o configuración `tools.web.search.grok.apiKey`
4. **Kimi** — variable de entorno `KIMI_API_KEY` / `MOONSHOT_API_KEY` o configuración `tools.web.search.kimi.apiKey`
5. **Perplexity** — configuración `PERPLEXITY_API_KEY`, `OPENROUTER_API_KEY` o `tools.web.search.perplexity.apiKey`

Si no se encuentran claves, se recurre a Brave (obtendrá un error de clave faltante indicándole que configure una).

Comportamiento de SecretRef en tiempo de ejecución:

- Los SecretRefs de herramientas web se resuelven atómicamente al iniciar/recargar la puerta de enlace.
- En el modo de detección automática, OpenClaw solo resuelve la clave del proveedor seleccionado. Los SecretRefs de los proveedores no seleccionados permanecen inactivos hasta que se seleccionan.
- Si el SecretRef del proveedor seleccionado no está resuelto y no existe un entorno de reserva del proveedor, el inicio/recarga falla rápidamente.

## Configurar la búsqueda web

Use `openclaw configure --section web` para configurar su clave API y elegir un proveedor.

### Búsqueda Brave

1. Cree una cuenta de API de Brave Search en [brave.com/search/api](https://brave.com/search/api/)
2. En el panel, elija el plan **Search** y genere una clave API.
3. Ejecute `openclaw configure --section web` para almacenar la clave en la configuración o establezca `BRAVE_API_KEY` en su entorno.

Cada plan de Brave incluye **\$5/mes en crédito gratuito** (renovable). El plan
Search cuesta \$5 por cada 1000 solicitudes, por lo que el crédito cubre 1000 consultas/mes. Establezca
su límite de uso en el panel de Brave para evitar cargos inesperados. Consulte el
[portal de la API de Brave](https://brave.com/search/api/) para ver los planes actuales y
precios.

### Búsqueda Perplexity

1. Cree una cuenta de Perplexity en [perplexity.ai/settings/api](https://www.perplexity.ai/settings/api)
2. Genere una clave API en el panel
3. Ejecute `openclaw configure --section web` para almacenar la clave en la configuración o establezca `PERPLEXITY_API_KEY` en su entorno.

Para compatibilidad con Sonar/OpenRouter heredado, configure `OPENROUTER_API_KEY` en su lugar, o configure `tools.web.search.perplexity.apiKey` con una clave `sk-or-...`. Configurar `tools.web.search.perplexity.baseUrl` o `model` también hace que Perplexity vuelva a la ruta de compatibilidad de chat-completions.

Consulte la [Documentación de la API de búsqueda de Perplexity](https://docs.perplexity.ai/guides/search-quickstart) para más detalles.

### Dónde almacenar la clave

**A través de la configuración:** ejecute `openclaw configure --section web`. Almacena la clave en la ruta de configuración específica del proveedor:

- Brave: `tools.web.search.apiKey`
- Gemini: `tools.web.search.gemini.apiKey`
- Grok: `tools.web.search.grok.apiKey`
- Kimi: `tools.web.search.kimi.apiKey`
- Perplexity: `tools.web.search.perplexity.apiKey`

Todos estos campos también soportan objetos SecretRef.

**A través del entorno:** establezca las variables de entorno del proveedor en el entorno del proceso Gateway:

- Brave: `BRAVE_API_KEY`
- Gemini: `GEMINI_API_KEY`
- Grok: `XAI_API_KEY`
- Kimi: `KIMI_API_KEY` o `MOONSHOT_API_KEY`
- Perplexity: `PERPLEXITY_API_KEY` o `OPENROUTER_API_KEY`

Para una instalación de gateway, colóquelas en `~/.openclaw/.env` (o en el entorno de su servicio). Consulte [Variables de entorno](/es/help/faq#how-does-openclaw-load-environment-variables).

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

`llm-context` devuelve fragmentos de página extraídos para el "grounding" en lugar de los fragmentos estándar de Brave.
En este modo, `country` y `language` / `search_lang` todavía funcionan, pero `ui_lang`,
`freshness`, `date_after` y `date_before` son rechazados.

**Búsqueda Perplexity:**

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

**Perplexity a través de compatibilidad con OpenRouter / Sonar:**

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

## Usar Gemini (Google Search grounding)

Los modelos Gemini son compatibles con [Google Search grounding](https://ai.google.dev/gemini-api/docs/grounding) integrado,
que devuelve respuestas sintetizadas por IA respaldadas por resultados en vivo de Google Search con citas.

### Obtener una clave de API de Gemini

1. Vaya a [Google AI Studio](https://aistudio.google.com/apikey)
2. Cree una clave de API
3. Establezca `GEMINI_API_KEY` en el entorno de Gateway, o configure `tools.web.search.gemini.apiKey`

### Configurar la búsqueda de Gemini

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

- Las URL de cita de la base de Gemini se resuelven automáticamente desde las
  URL de redirección de Google a URL directas.
- La resolución de redireccionamientos utiliza la ruta de protección SSRF (HEAD + comprobaciones de redirección + validación http/https) antes de devolver la URL de cita final.
- La resolución de redireccionamientos utiliza valores predeterminados SSRF estrictos, por lo que se bloquean los redireccionamientos a objetivos privados/internos.
- El modelo predeterminado (`gemini-2.5-flash`) es rápido y rentable.
  Se puede usar cualquier modelo Gemini que admita el grounding.

## web_search

Busque en la web utilizando su proveedor configurado.

### Requisitos

- `tools.web.search.enabled` no debe ser `false` (predeterminado: habilitado)
- Clave de API para su proveedor elegido:
  - **Brave**: `BRAVE_API_KEY` o `tools.web.search.apiKey`
  - **Gemini**: `GEMINI_API_KEY` o `tools.web.search.gemini.apiKey`
  - **Grok**: `XAI_API_KEY` o `tools.web.search.grok.apiKey`
  - **Kimi**: `KIMI_API_KEY`, `MOONSHOT_API_KEY`, o `tools.web.search.kimi.apiKey`
  - **Perplexity**: `PERPLEXITY_API_KEY`, `OPENROUTER_API_KEY`, o `tools.web.search.perplexity.apiKey`
- Todos los campos de clave de proveedor anteriores admiten objetos SecretRef.

### Configuración

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

Todos los parámetros funcionan para Brave y para la API de búsqueda nativa de Perplexity, a menos que se indique lo contrario.

La ruta de compatibilidad de OpenRouter / Sonar de Perplexity solo admite `query` y `freshness`.
Si establece `tools.web.search.perplexity.baseUrl` / `model`, usa `OPENROUTER_API_KEY`, o configura una clave `sk-or-...`, los filtros solo de API de búsqueda devuelven errores explícitos.

| Parámetro             | Descripción                                                            |
| --------------------- | ---------------------------------------------------------------------- |
| `query`               | Consulta de búsqueda (obligatoria)                                     |
| `count`               | Resultados a devolver (1-10, predeterminado: 5)                        |
| `country`             | Código de país ISO de 2 letras (por ejemplo, "US", "DE")               |
| `language`            | Código de idioma ISO 639-1 (ej., "en", "de")                           |
| `freshness`           | Filtro de tiempo: `day`, `week`, `month` o `year`                      |
| `date_after`          | Resultados después de esta fecha (AAAA-MM-DD)                          |
| `date_before`         | Resultados antes de esta fecha (AAAA-MM-DD)                            |
| `ui_lang`             | Código de idioma de la interfaz de usuario (solo Brave)                |
| `domain_filter`       | Matriz de lista de permitidos/bloqueados de dominios (solo Perplexity) |
| `max_tokens`          | Presupuesto total de contenido, predeterminado 25000 (solo Perplexity) |
| `max_tokens_per_page` | Límite de tokens por página, predeterminado 2048 (solo Perplexity)     |

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

Obtener una URL y extraer el contenido legible.

### requisitos de web_fetch

- `tools.web.fetch.enabled` no debe ser `false` (predeterminado: habilitado)
- Respaldo opcional de Firecrawl: configure `tools.web.fetch.firecrawl.apiKey` o `FIRECRAWL_API_KEY`.
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
- Las solicitudes de Firecrawl usan el modo de evasión de bots y almacenan resultados en caché de manera predeterminada.
- Los SecretRefs de Firecrawl se resuelven solo cuando Firecrawl está activo (`tools.web.fetch.enabled !== false` y `tools.web.fetch.firecrawl.enabled !== false`).
- Si Firecrawl está activo y su SecretRef no está resuelto sin respaldo `FIRECRAWL_API_KEY`, el inicio/recarga falla rápidamente.
- `web_fetch` envía un User-Agent similar al de Chrome y `Accept-Language` de forma predeterminada; anule `userAgent` si es necesario.
- `web_fetch` bloquea nombres de host privados/internos y vuelve a verificar las redirecciones (limite con `maxRedirects`).
- `maxChars` está limitado a `tools.web.fetch.maxCharsCap`.
- `web_fetch` limita el tamaño del cuerpo de la respuesta descargada a `tools.web.fetch.maxResponseBytes` antes del análisis; las respuestas excesivamente grandes se truncan e incluyen una advertencia.
- `web_fetch` es una extracción de mejor esfuerzo; algunos sitios necesitarán la herramienta del navegador.
- Consulte [Firecrawl](/es/tools/firecrawl) para la configuración de la clave y los detalles del servicio.
- Las respuestas se almacenan en caché (15 minutos de forma predeterminada) para reducir las recuperaciones repetidas.
- Si utiliza perfiles de herramientas/listas permitidas, agregue `web_search`/`web_fetch` o `group:web`.
- Si falta la clave API, `web_search` devuelve una breve sugerencia de configuración con un enlace a la documentación.

import es from "/components/footer/es.mdx";

<es />
