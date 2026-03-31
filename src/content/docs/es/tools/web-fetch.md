---
summary: "herramienta web_fetch -- obtención HTTP con extracción de contenido legible"
read_when:
  - You want to fetch a URL and extract readable content
  - You need to configure web_fetch or its Firecrawl fallback
  - You want to understand web_fetch limits and caching
title: "Obtención web"
sidebarTitle: "Obtención web"
---

# Obtención web

La herramienta `web_fetch` realiza un HTTP GET simple y extrae contenido legible
(de HTML a markdown o texto). **No** ejecuta JavaScript.

Para sitios con mucho JS o páginas protegidas por inicio de sesión, utilice
[Navegador web](/en/tools/browser) en su lugar.

## Inicio rápido

`web_fetch` está **habilitado de forma predeterminada**; no se requiere configuración. El agente puede
invocarlo inmediatamente:

```javascript
await web_fetch({ url: "https://example.com/article" });
```

## Parámetros de la herramienta

| Parámetro     | Tipo     | Descripción                                     |
| ------------- | -------- | ----------------------------------------------- |
| `url`         | `string` | URL para obtener (requerido, solo http/https)   |
| `extractMode` | `string` | `"markdown"` (predeterminado) o `"text"`        |
| `maxChars`    | `number` | Truncar la salida a esta cantidad de caracteres |

## Cómo funciona

<Steps>
  <Step title="Obtener">Envía un HTTP GET con un User-Agent similar a Chrome y el encabezado `Accept-Language` . Bloquea nombres de host privados/internos y vuelve a verificar los redireccionamientos.</Step>
  <Step title="Extraer">Ejecuta Readability (extracción de contenido principal) en la respuesta HTML.</Step>
  <Step title="Alternativa (opcional)">Si Readability falla y Firecrawl está configurado, se reintenta a través de la API de Firecrawl con el modo de evasión de bots.</Step>
  <Step title="Caché">Los resultados se almacenan en caché durante 15 minutos (configurable) para reducir las búsquedas repetidas de la misma URL.</Step>
</Steps>

## Configuración

```json5
{
  tools: {
    web: {
      fetch: {
        enabled: true, // default: true
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

## Alternativa de Firecrawl

Si la extracción con Readability falla, `web_fetch` puede usar como alternativa
[Firecrawl](/en/tools/firecrawl) para evasión de bots y una mejor extracción:

```json5
{
  tools: {
    web: {
      fetch: {
        firecrawl: {
          enabled: true,
          apiKey: "fc-...", // optional if FIRECRAWL_API_KEY is set
          baseUrl: "https://api.firecrawl.dev",
          onlyMainContent: true,
          maxAgeMs: 86400000, // cache duration (1 day)
          timeoutSeconds: 60,
        },
      },
    },
  },
}
```

`tools.web.fetch.firecrawl.apiKey` admite objetos SecretRef.

<Note>Si Firecrawl está habilitado y su SecretRef no está resuelto sin `FIRECRAWL_API_KEY` de respaldo env, el inicio de la puerta de enlace falla rápidamente.</Note>

## Límites y seguridad

- `maxChars` está limitado a `tools.web.fetch.maxCharsCap`
- El cuerpo de la respuesta está limitado a `maxResponseBytes` antes del análisis; las respuestas
  excesivamente grandes se truncan con una advertencia
- Los nombres de host privados/internos están bloqueados
- Las redirecciones se verifican y limitan mediante `maxRedirects`
- `web_fetch` es de mejor esfuerzo posible; algunos sitios necesitan el [Web Browser](/en/tools/browser)

## Perfiles de herramientas

Si utiliza perfiles de herramientas o listas de permitidos, agregue `web_fetch` o `group:web`:

```json5
{
  tools: {
    allow: ["web_fetch"],
    // or: allow: ["group:web"]  (includes both web_fetch and web_search)
  },
}
```

## Relacionado

- [Web Search](/en/tools/web) -- busca en la web con múltiples proveedores
- [Web Browser](/en/tools/browser) -- automatización completa del navegador para sitios con mucho JS
- [Firecrawl](/en/tools/firecrawl) -- herramientas de búsqueda y extracción de Firecrawl
