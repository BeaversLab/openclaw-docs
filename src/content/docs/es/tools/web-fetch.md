---
summary: "herramienta web_fetch: obtención HTTP con extracción de contenido legible"
read_when:
  - You want to fetch a URL and extract readable content
  - You need to configure web_fetch or its Firecrawl fallback
  - You want to understand web_fetch limits and caching
title: "Obtención web"
sidebarTitle: "Obtención Web"
---

La herramienta `web_fetch` realiza un HTTP GET sencillo y extrae el contenido legible
(de HTML a markdown o texto). **No** ejecuta JavaScript.

Para sitios con mucho JavaScript o páginas protegidas por inicio de sesión, utilice
[Navegador web](/es/tools/browser) en su lugar.

## Inicio rápido

`web_fetch` está **habilitado de forma predeterminada**; no se necesita configuración. El agente puede
invocarlo inmediatamente:

```javascript
await web_fetch({ url: "https://example.com/article" });
```

## Parámetros de la herramienta

<ParamField path="url" type="string" required>
  URL que se va a obtener. Solo `http(s)`.
</ParamField>

<ParamField path="extractMode" type="'markdown' | 'text'" default="markdown">
  Formato de salida después de la extracción del contenido principal.
</ParamField>

<ParamField path="maxChars" type="number">
  Truncar la salida a este número de caracteres.
</ParamField>

## Cómo funciona

<Steps>
  <Step title="Obtener">Envía un HTTP GET con un User-Agent similar al de Chrome y el encabezado `Accept-Language`. Bloquea nombres de host privados/internos y vuelve a verificar las redirecciones.</Step>
  <Step title="Extraer">Ejecuta Readability (extracción de contenido principal) en la respuesta HTML.</Step>
  <Step title="Alternativa (opcional)">Si Readability falla y Firecrawl está configurado, se reintentan a través de la API de Firecrawl con el modo de evasión de bots.</Step>
  <Step title="Caché">Los resultados se almacenan en caché durante 15 minutos (configurable) para reducir las obtenciones repetidas de la misma URL.</Step>
</Steps>

## Actualizaciones de progreso

`web_fetch` emite una línea de progreso pública solo cuando la obtención todavía está pendiente
después de cinco segundos:

```text
Fetching page content...
```

Los aciertos rápidos de caché y las respuestas rápidas de la red finalizan antes de que se active el temporizador, por lo que
no muestran una línea de progreso. Si se cancela la llamada, se borra el temporizador.
Cuando la obt最终mente se completa, el agente recibe el resultado normal de la herramienta;
la línea de progreso es solo un estado de la interfaz de usuario del canal y nunca contiene el contenido
de la página obtenida.

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
        useTrustedEnvProxy: false, // let a trusted HTTP(S) env proxy resolve DNS
        readability: true, // use Readability extraction
        userAgent: "Mozilla/5.0 ...", // override User-Agent
        ssrfPolicy: {
          allowRfc2544BenchmarkRange: true, // opt-in for trusted fake-IP proxies using 198.18.0.0/15
          allowIpv6UniqueLocalRange: true, // opt-in for trusted fake-IP proxies using fc00::/7
        },
      },
    },
  },
}
```

## Respaldo de Firecrawl

Si la extracción de Readability falla, `web_fetch` puede usar como respaldo
[Firecrawl](/es/tools/firecrawl) para evitar la detección de bots y mejorar la extracción:

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

`plugins.entries.firecrawl.config.webFetch.apiKey` admite objetos SecretRef.
La configuración heredada `tools.web.fetch.firecrawl.*` se migra automáticamente mediante `openclaw doctor --fix`.

<Note>Si Firecrawl está habilitado y su SecretRef no está resuelto sin un respaldo de entorno `FIRECRAWL_API_KEY`, el inicio de la puerta de enlace falla rápidamente.</Note>

<Note>Las anulaciones de `baseUrl` de Firecrawl están bloqueadas: el tráfico alojado utiliza `https://api.firecrawl.dev`; las anulaciones autohospedadas deben apuntar a puntos finales privados o internos, y `http://` se acepta solo para esos objetivos privados.</Note>

Comportamiento actual en tiempo de ejecución:

- `tools.web.fetch.provider` selecciona explícitamente el proveedor de respaldo de obtención.
- Si se omite `provider`, OpenClaw detecta automáticamente el primer proveedor web-fetch
  listo a partir de las credenciales disponibles. El `web_fetch` sin sandbox puede usar
  complementos instalados que declaren `contracts.webFetchProviders` y registren un
  proveedor coincidente en tiempo de ejecución. Hoy, el proveedor incluido es Firecrawl.
- Las llamadas `web_fetch` en sandbox se limitan a los proveedores incluidos.
- Si Readability está deshabilitado, `web_fetch` omite directamente el respaldo
  del proveedor seleccionado. Si no hay ningún proveedor disponible, falla de forma cerrada.

## Proxy de entorno de confianza

Si su implementación requiere que `web_fetch` pase a través de un proxy
HTTP(S) de salida de confianza, establezca `tools.web.fetch.useTrustedEnvProxy: true`.

En este modo, OpenClaw aún aplica comprobaciones SSRF basadas en el nombre de host antes de enviar
la solicitud, pero permite que el proxy resuelva el DNS en lugar de realizar la fijación de DNS
local. Habilite esto solo cuando el proxy esté controlado por el operador y haga cumplir
la política de salida después de la resolución del DNS.

<Note>Si no se configura ninguna variable de entorno de proxy HTTP(S), o el host de destino es excluido por `NO_PROXY`, `web_fetch` vuelve a la ruta estricta normal con fijación de DNS local.</Note>

## Límites y seguridad

- `maxChars` está limitado a `tools.web.fetch.maxCharsCap`
- El cuerpo de la respuesta se limita a `maxResponseBytes` antes del análisis; las respuestas
  excesivamente grandes se truncarán con una advertencia
- Los nombres de host privados/internos están bloqueados
- `tools.web.fetch.ssrfPolicy.allowRfc2544BenchmarkRange` y
  `tools.web.fetch.ssrfPolicy.allowIpv6UniqueLocalRange` son opt-ins reducidos
  para pilas de proxy de IP falsas de confianza; déjelos sin configurar a menos que su proxy sea propietario de
  esos rangos sintéticos y haga cumplir su propia política de destino
- Las redirecciones se verifican y limitan mediante `maxRedirects`
- `useTrustedEnvProxy` es una opción explícita y solo debe habilitarse para
  proxies controlados por el operador que aún hacen cumplir la política de salida después de la resolución de DNS
- `web_fetch` es de mejor esfuerzo -- algunos sitios necesitan el [Web Browser](/es/tools/browser)

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

- [Web Search](/es/tools/web) -- busque en la web con varios proveedores
- [Web Browser](/es/tools/browser) -- automatización completa del navegador para sitios con mucho JS
- [Firecrawl](/es/tools/firecrawl) -- herramientas de búsqueda y extracción de Firecrawl
