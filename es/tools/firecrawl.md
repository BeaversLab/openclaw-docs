---
summary: "Búsqueda Firecrawl, raspado y respaldo web_fetch"
read_when:
  - Deseas extracción web respaldada por Firecrawl
  - Necesitas una clave de API de Firecrawl
  - Deseas Firecrawl como proveedor de web_search
  - Deseas extracción anti-bot para web_fetch
title: "Firecrawl"
---

# Firecrawl

OpenClaw puede usar **Firecrawl** de tres maneras:

- como el proveedor `web_search`
- como herramientas de complemento explícitas: `firecrawl_search` y `firecrawl_scrape`
- como extractor de respaldo para `web_fetch`

Es un servicio de extracción/búsqueda alojado que admite la evasión de bots y el almacenamiento en caché,
lo cual ayuda con sitios con mucho JS o páginas que bloquean las recuperaciones HTTP simples.

## Obtener una clave de API

1. Crea una cuenta de Firecrawl y genera una clave de API.
2. Guárdala en la configuración o establece `FIRECRAWL_API_KEY` en el entorno de la pasarela.

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

- Elegir Firecrawl en la incorporación o en `openclaw configure --section web` habilita el complemento Firecrawl incluido automáticamente.
- `web_search` con Firecrawl admite `query` y `count`.
- Para controles específicos de Firecrawl como `sources`, `categories` o el raspado de resultados, usa `firecrawl_search`.

## Configurar el raspado de Firecrawl + respaldo web_fetch

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
      fetch: {
        firecrawl: {
          apiKey: "FIRECRAWL_API_KEY_HERE",
          baseUrl: "https://api.firecrawl.dev",
          onlyMainContent: true,
          maxAgeMs: 172800000,
          timeoutSeconds: 60,
        },
      },
    },
  },
}
```

Notas:

- `firecrawl.enabled` es `true` de forma predeterminada a menos que se establezca explícitamente en `false`.
- Los intentos de respaldo de Firecrawl se ejecutan solo cuando hay una clave de API disponible (`tools.web.fetch.firecrawl.apiKey` o `FIRECRAWL_API_KEY`).
- `maxAgeMs` controla la antigüedad máxima de los resultados en caché (ms). El valor predeterminado es 2 días.

`firecrawl_scrape` reutiliza la misma configuración y variables de entorno de `tools.web.fetch.firecrawl.*`.

## Herramientas del complemento Firecrawl

### `firecrawl_search`

Usa esto cuando desees controles de búsqueda específicos de Firecrawl en lugar de `web_search` genéricos.

Parámetros principales:

- `query`
- `count`
- `sources`
- `categories`
- `scrapeResults`
- `timeoutSeconds`

### `firecrawl_scrape`

Use esto para páginas con mucho JS o protegidas por bots donde el simple `web_fetch` es débil.

Parámetros principales:

- `url`
- `extractMode`
- `maxChars`
- `onlyMainContent`
- `maxAgeMs`
- `proxy`
- `storeInCache`
- `timeoutSeconds`

## Sigilo / omisión de bots

Firecrawl expone un parámetro de **modo de proxy** para la omisión de bots (`basic`, `stealth` o `auto`).
OpenClaw siempre usa `proxy: "auto"` más `storeInCache: true` para las solicitudes de Firecrawl.
Si se omite el proxy, Firecrawl usa por defecto `auto`. `auto` reintentará con proxies sigilosos si falla un intento básico, lo que puede usar más créditos
que el scraping solo básico.

## Cómo `web_fetch` usa Firecrawl

Orden de extracción de `web_fetch`:

1. Readability (local)
2. Firecrawl (si está configurado)
3. Limpieza básica de HTML (último recurso)

Consulte [Web tools](/es/tools/web) para obtener la configuración completa de la herramienta web.

import en from "/components/footer/en.mdx";

<en />
