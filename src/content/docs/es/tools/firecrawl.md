---
summary: "Búsqueda, extracción y alternativa web_fetch de Firecrawl"
read_when:
  - You want Firecrawl-backed web extraction
  - You need a Firecrawl API key
  - You want Firecrawl as a web_search provider
  - You want anti-bot extraction for web_fetch
title: "Firecrawl"
---

OpenClaw puede usar **Firecrawl** de tres maneras:

- como proveedor `web_search`
- como herramientas de complemento explícitas: `firecrawl_search` y `firecrawl_scrape`
- como un extractor de respaldo para `web_fetch`

Es un servicio de extracción/búsqueda alojado que admite la evasión de bots y el almacenamiento en caché,
lo cual ayuda con sitios con mucho JS o páginas que bloquean las recuperaciones HTTP simples.

## Obtener una clave de API

1. Cree una cuenta de Firecrawl y genere una clave de API.
2. Guárdela en la configuración o configure `FIRECRAWL_API_KEY` en el entorno de la puerta de enlace.

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

- Elegir Firecrawl en la incorporación o en `openclaw configure --section web` habilita automáticamente el complemento Firecrawl incluido.
- `web_search` con Firecrawl admite `query` y `count`.
- Para controles específicos de Firecrawl como `sources`, `categories`, o el scraping de resultados, use `firecrawl_search`.
- `baseUrl` utiliza por defecto Firecrawl alojado en `https://api.firecrawl.dev`. Las anulaciones autoalojadas solo se permiten para puntos finales privados/internos; HTTP solo se acepta para esos objetivos privados.
- `FIRECRAWL_BASE_URL` es la alternativa de entorno compartida para las URL base de búsqueda y scraping de Firecrawl.

## Configurar el scraping de Firecrawl + alternativa web_fetch

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

- Los intentos de alternativa de Firecrawl se ejecutan solo cuando hay una clave de API disponible (`plugins.entries.firecrawl.config.webFetch.apiKey` o `FIRECRAWL_API_KEY`).
- `maxAgeMs` controla la antigüedad máxima de los resultados en caché (ms). El valor predeterminado es 2 días.
- La configuración heredada de `tools.web.fetch.firecrawl.*` se migra automáticamente mediante `openclaw doctor --fix`.
- Las anulaciones de la URL base de raspado/scrape de Firecrawl siguen la misma regla alojado/privado que la búsqueda: el tráfico público alojado utiliza `https://api.firecrawl.dev`; las anulaciones autoalojadas deben resolver a puntos finales privados/internos.
- `firecrawl_scrape` rechaza las URL de destino obviamente privadas, de bucle invertido (loopback), de metadatos y no HTTP(S) antes de reenviarlas a Firecrawl, coincidiendo con el contrato de seguridad de destino de `web_fetch` para llamadas explícitas de raspado de Firecrawl.

`firecrawl_scrape` reutiliza la misma configuración y variables de entorno de `plugins.entries.firecrawl.config.webFetch.*`.

### Firecrawl autoalojado

Establezca `plugins.entries.firecrawl.config.webSearch.baseUrl`,
`plugins.entries.firecrawl.config.webFetch.baseUrl` o `FIRECRAWL_BASE_URL`
cuando ejecute Firecrawl usted mismo. OpenClaw acepta `http://` solo para objetivos de bucle invertido,
red privada, `.local`, `.internal` o `.localhost`. Se rechazan los hosts personalizados públicos para que las claves de API de Firecrawl no se envíen a puntos finales arbitrarios por
accidente.

## Herramientas de complemento de Firecrawl

### `firecrawl_search`

Use esto cuando desee controles de búsqueda específicos de Firecrawl en lugar de `web_search` genérico.

Parámetros principales:

- `query`
- `count`
- `sources`
- `categories`
- `scrapeResults`
- `timeoutSeconds`

### `firecrawl_scrape`

Use esto para páginas con mucho JS o protegidas por bots donde `web_fetch` simple es débil.

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

Firecrawl expone un parámetro de **modo proxy** para la omisión de bots (`basic`, `stealth` o `auto`).
OpenClaw siempre usa `proxy: "auto"` más `storeInCache: true` para las solicitudes a Firecrawl.
Si se omite el proxy, Firecrawl usa por defecto `auto`. `auto` reintentará con proxies sigilosos si falla un intento básico, lo que puede usar más créditos
que el scraping solo básico.

## Cómo `web_fetch` usa Firecrawl

Orden de extracción de `web_fetch`:

1. Readability (local)
2. Firecrawl (si está seleccionado o autodetectado como respaldo activo de web-fetch)
3. Limpieza básica de HTML (último respaldo)

El control de selección es `tools.web.fetch.provider`. Si lo omites, OpenClaw
autodetecta el primer proveedor de web-fetch listo a partir de las credenciales disponibles.
Hoy el proveedor incluido es Firecrawl.

## Relacionado

- [Resumen de búsqueda web](/es/tools/web) -- todos los proveedores y autodetección
- [Web Fetch](/es/tools/web-fetch) -- herramienta web_fetch con respaldo de Firecrawl
- [Tavily](/es/tools/tavily) -- herramientas de búsqueda + extracción
