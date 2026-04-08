---
summary: "Búsqueda, extracción y alternativa web_fetch de Firecrawl"
read_when:
  - You want Firecrawl-backed web extraction
  - You need a Firecrawl API key
  - You want Firecrawl as a web_search provider
  - You want anti-bot extraction for web_fetch
title: "Firecrawl"
---

# Firecrawl

OpenClaw puede usar **Firecrawl** de tres maneras:

- como el proveedor `web_search`
- como herramientas de complemento explícitas: `firecrawl_search` y `firecrawl_scrape`
- como un extractor de alternativa para `web_fetch`

Es un servicio alojado de extracción/búsqueda que admite la evasión de bots y el almacenamiento en caché,
lo cual ayuda con sitios con mucho JS o páginas que bloquean las recuperaciones HTTP simples.

## Obtener una clave de API

1. Cree una cuenta de Firecrawl y genere una clave de API.
2. Guárdela en la configuración o establezca `FIRECRAWL_API_KEY` en el entorno de la puerta de enlace.

## Configurar la búsqueda de Firecrawl

```json5
{
  tools: {
    web: {
      search: {
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
            apiKey: "FIRECRAWL_API_KEY_HERE",
            baseUrl: "https://api.firecrawl.dev",
          },
        },
      },
    },
  },
}
```

Notas:

- Elegir Firecrawl en la incorporación o `openclaw configure --section web` habilita automáticamente el complemento Firecrawl incluido.
- `web_search` con Firecrawl admite `query` y `count`.
- Para controles específicos de Firecrawl como `sources`, `categories`, o el raspado de resultados, use `firecrawl_search`.
- Las anulaciones de `baseUrl` deben permanecer en `https://api.firecrawl.dev`.
- `FIRECRAWL_BASE_URL` es el respaldo de entorno compartido para las URL base de búsqueda y extracción de Firecrawl.

## Configurar el respaldo de extracción (scrape) de Firecrawl + web_fetch

```json5
{
  plugins: {
    entries: {
      firecrawl: {
        enabled: true,
        config: {
          webFetch: {
            apiKey: "FIRECRAWL_API_KEY_HERE",
            baseUrl: "https://api.firecrawl.dev",
            onlyMainContent: true,
            maxAgeMs: 172800000,
            timeoutSeconds: 60,
          },
        },
      },
    },
  },
}
```

Notas:

- Los intentos de respaldo de Firecrawl se ejecutan solo cuando hay una clave API disponible (`plugins.entries.firecrawl.config.webFetch.apiKey` o `FIRECRAWL_API_KEY`).
- `maxAgeMs` controla la antigüedad máxima de los resultados en caché (ms). El valor predeterminado es 2 días.
- La configuración heredada de `tools.web.fetch.firecrawl.*` se migra automáticamente mediante `openclaw doctor --fix`.
- Las anulaciones de la URL base/extracción de Firecrawl están restringidas a `https://api.firecrawl.dev`.

`firecrawl_scrape` reutiliza la misma configuración y las mismas variables de entorno de `plugins.entries.firecrawl.config.webFetch.*`.

## Herramientas del complemento Firecrawl

### `firecrawl_search`

Use esto cuando desee controles de búsqueda específicos de Firecrawl en lugar de `web_search` genéricos.

Parámetros principales:

- `query`
- `count`
- `sources`
- `categories`
- `scrapeResults`
- `timeoutSeconds`

### `firecrawl_scrape`

Use esto para páginas con mucho JS o protegidas por bots donde el `web_fetch` simple es débil.

Parámetros principales:

- `url`
- `extractMode`
- `maxChars`
- `onlyMainContent`
- `maxAgeMs`
- `proxy`
- `storeInCache`
- `timeoutSeconds`

## Sigilo / evasión de bots

Firecrawl expone un parámetro de **modo de proxy** para la evasión de bots (`basic`, `stealth` o `auto`).
OpenClaw siempre usa `proxy: "auto"` más `storeInCache: true` para las solicitudes de Firecrawl.
Si se omite el proxy, Firecrawl usa por defecto `auto`. `auto` reintentará con proxies sigilosos si falla un intento básico, lo que puede usar más créditos
que la extracción solo básica.

## Cómo `web_fetch` usa Firecrawl

Orden de extracción de `web_fetch`:

1. Legibilidad (local)
2. Firecrawl (si se selecciona o se detecta automáticamente como la alternativa de recuperación web activa)
3. Limpieza básica de HTML (última alternativa)

El control de selección es `tools.web.fetch.provider`. Si lo omite, OpenClaw detecta automáticamente el primer proveedor de recuperación web listo a partir de las credenciales disponibles. Hoy, el proveedor incluido es Firecrawl.

## Relacionado

- [Información general de búsqueda web](/en/tools/web) -- todos los proveedores y detección automática
- [Recuperación web](/en/tools/web-fetch) -- herramienta web_fetch con alternativa a Firecrawl
- [Tavily](/en/tools/tavily) -- herramientas de búsqueda y extracción
