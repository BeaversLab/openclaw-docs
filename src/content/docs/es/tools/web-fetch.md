---
summary: "herramienta web_fetch -- obtención HTTP con extracción de contenido legible"
read_when:
  - You want to fetch a URL and extract readable content
  - You need to configure web_fetch or its Firecrawl fallback
  - You want to understand web_fetch limits and caching
title: "Web fetch"
sidebarTitle: "Obtención web"
---

La herramienta `web_fetch` realiza un HTTP GET simple y extrae contenido legible
(de HTML a markdown o texto). **No** ejecuta JavaScript.

Para sitios con mucho JavaScript o páginas protegidas por inicio de sesión, utilice
[Navegador Web](/es/tools/browser) en su lugar.

## Inicio rápido

`web_fetch` está **habilitado de forma predeterminada** -- no se necesita configuración. El agente puede
llamarlo inmediatamente:

```javascript
await web_fetch({ url: "https://example.com/article" });
```

## Parámetros de la herramienta

<ParamField path="url" type="string" required>
  URL que se va a recuperar. Solo `http(s)`.
</ParamField>

<ParamField path="extractMode" type="'markdown' | 'text'" default="markdown">
  Formato de salida después de la extracción del contenido principal.
</ParamField>

<ParamField path="maxChars" type="number">
  Truncar la salida a esta cantidad de caracteres.
</ParamField>

## Cómo funciona

<Steps>
  <Step title="Fetch">Envía un HTTP GET con un User-Agent similar al de Chrome y el encabezado `Accept-Language` . Bloquea nombres de host privados/internos y vuelve a verificar las redirecciones.</Step>
  <Step title="Extract">Ejecuta Readability (extracción de contenido principal) en la respuesta HTML.</Step>
  <Step title="Fallback (optional)">Si Readability falla y Firecrawl está configurado, se reintentará a través de la API de Firecrawl con modo de evasión de bots.</Step>
  <Step title="Cache">Los resultados se almacenan en caché durante 15 minutos (configurable) para reducir las recuperaciones repetidas de la misma URL.</Step>
</Steps>

## Config

```json5
{
  tools: {
    web: {
      fetch: {
        enabled: true, // default: true
        provider: "firecrawl", // optional; omit for auto-detect
        maxChars: 50000, // max output chars
        maxCharsCap: 50000, // hard cap for maxChars param
        maxResponseBytes: 2000000, // max download size before truncation
        timeoutSeconds: 30,
        cacheTtlMinutes: 15,
        maxRedirects: 3,
        readability: true, // use Readability extraction
        userAgent: "Mozilla/5.0 ...", // override User-Agent
      },
    },
  },
}
```

## Respaldo de Firecrawl

Si la extracción de Readability falla, `web_fetch` puede recurrir a
[Firecrawl](/es/tools/firecrawl) para la evasión de bots y una mejor extracción:

```json5
{
  tools: {
    web: {
      fetch: {
        provider: "firecrawl", // optional; omit for auto-detect from available credentials
      },
    },
  },
  plugins: {
    entries: {
      firecrawl: {
        enabled: true,
        config: {
          webFetch: {
            apiKey: "fc-...", // optional if FIRECRAWL_API_KEY is set
            baseUrl: "https://api.firecrawl.dev",
            onlyMainContent: true,
            maxAgeMs: 86400000, // cache duration (1 day)
            timeoutSeconds: 60,
          },
        },
      },
    },
  },
}
```

`plugins.entries.firecrawl.config.webFetch.apiKey` es compatible con objetos SecretRef.
La configuración heredada `tools.web.fetch.firecrawl.*` se migra automáticamente mediante `openclaw doctor --fix`.

<Note>Si Firecrawl está habilitado y su SecretRef no está resuelto sin un respaldo de entorno `FIRECRAWL_API_KEY`, el inicio de la puerta de enlace falla rápidamente.</Note>

<Note>Las anulaciones de Firecrawl `baseUrl` están bloqueadas: deben usar `https://` y el host oficial de Firecrawl (`api.firecrawl.dev`).</Note>

Comportamiento actual en tiempo de ejecución:

- `tools.web.fetch.provider` selecciona explícitamente el proveedor de reserva de recuperación.
- Si se omite `provider`, OpenClaw detecta automáticamente el primer proveedor de recuperación web listo
  a partir de las credenciales disponibles. Hoy, el proveedor incluido es Firecrawl.
- Si Readability está deshabilitado, `web_fetch` salta directamente al proveedor de reserva
  seleccionado. Si no hay ningún proveedor disponible, falla de forma segura.

## Límites y seguridad

- `maxChars` está limitado a `tools.web.fetch.maxCharsCap`
- El cuerpo de la respuesta se limita a `maxResponseBytes` antes del análisis; las respuestas
  excesivamente grandes se truncan con una advertencia
- Los nombres de host privados/internos están bloqueados
- Las redirecciones se verifican y limitan mediante `maxRedirects`
- `web_fetch` se hace lo mejor posible: algunos sitios necesitan el [Navegador web](/es/tools/browser)

## Perfiles de herramientas

Si utiliza perfiles de herramientas o listas de permitidos, añada `web_fetch` o `group:web`:

```json5
{
  tools: {
    allow: ["web_fetch"],
    // or: allow: ["group:web"]  (includes web_fetch, web_search, and x_search)
  },
}
```

## Relacionado

- [Búsqueda web](/es/tools/web) -- busque en la web con varios proveedores
- [Navegador web](/es/tools/browser) -- automatización completa del navegador para sitios con mucho JS
- [Firecrawl](/es/tools/firecrawl) -- herramientas de búsqueda y extracción de Firecrawl
