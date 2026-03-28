---
summary: "Diseño de una extensión opcional de Firecrawl que añade valor de búsqueda/extracción sin integrar Firecrawl en los valores predeterminados del núcleo"
read_when:
  - Designing Firecrawl integration work
  - Evaluating web_search/web_fetch plugin seams
  - Deciding whether Firecrawl belongs in core or as an extension
title: "Diseño de la extensión Firecrawl"
---

# Diseño de la extensión Firecrawl

## Objetivo

Lanzar Firecrawl como una **extensión opcional** que añade:

- herramientas explícitas de Firecrawl para agentes,
- integración opcional con `web_search` respaldada por Firecrawl,
- soporte autoalojado,
- valores predeterminados de seguridad más sólidos que la ruta de reserva del núcleo actual,

sin integrar Firecrawl en la configuración predeterminada ni en la ruta de incorporación.

## Por qué esta forma

Los problemas/PR recientes de Firecrawl se agrupan en tres categorías:

1. **Deriva de versión/esquema**
   - Varias versiones rechazaron `tools.web.fetch.firecrawl` a pesar de que la documentación y el código en tiempo de ejecución lo admitían.
2. **Refuerzo de seguridad**
   - El `fetchFirecrawlContent()` actual todavía publica en el punto final de Firecrawl con `fetch()` sin procesar, mientras que la ruta principal de recuperación web utiliza el guardia SSRF.
3. **Presión del producto**
   - Los usuarios quieren flujos de búsqueda/extracción nativos de Firecrawl, especialmente para configuraciones autoalojadas/privadas.
   - Los mantenedores rechazaron explícitamente integrar profundamente Firecrawl en los valores predeterminados del núcleo, el flujo de configuración y el comportamiento del navegador.

Esa combinación argumenta a favor de una extensión, no de más lógica específica de Firecrawl en la ruta predeterminada del núcleo.

## Principios de diseño

- **Opcional y con alcance de proveedor**: sin activación automática, sin secuestro de configuración, sin ampliación del perfil de herramientas predeterminado.
- **La extensión posee la configuración específica de Firecrawl**: preferir la configuración del complemento antes de volver a ampliar `tools.web.*`.
- **Útil desde el primer día**: funciona incluso si las costuras `web_search` / `web_fetch` del núcleo permanecen sin cambios.
- **Seguridad ante todo**: las recuperaciones de puntos finales utilizan la misma postura de red protegida que otras herramientas web.
- **Amigable para autoalojamiento**: configuración + respaldo de variables de entorno, URL base explícita, sin suposiciones solo para alojados.

## Extensión propuesta

ID del complemento: `firecrawl`

### Capacidades del MVP

Registrar herramientas explícitas:

- `firecrawl_search`
- `firecrawl_scrape`

Opcional más tarde:

- `firecrawl_crawl`
- `firecrawl_map`

**No** añadas la automatización del navegador de Firecrawl en la primera versión. Esa fue la parte del PR #32543 que llevó a Firecrawl demasiado hacia el comportamiento central y generó la mayor preocupación sobre el mantenimiento.

## Forma de la configuración

Usar configuración con alcance de complemento (plugin-scoped):

```json5
{
  plugins: {
    entries: {
      firecrawl: {
        enabled: true,
        config: {
          apiKey: "FIRECRAWL_API_KEY",
          baseUrl: "https://api.firecrawl.dev",
          timeoutSeconds: 60,
          maxAgeMs: 172800000,
          proxy: "auto",
          storeInCache: true,
          onlyMainContent: true,
          search: {
            enabled: true,
            defaultLimit: 5,
            sources: ["web"],
            categories: [],
            scrapeResults: false,
          },
          scrape: {
            formats: ["markdown"],
            fallbackForWebFetchLikeUse: false,
          },
        },
      },
    },
  },
}
```

### Resolución de credenciales

Precedencia:

1. `plugins.entries.firecrawl.config.apiKey`
2. `FIRECRAWL_API_KEY`

Precedencia de la URL base:

1. `plugins.entries.firecrawl.config.baseUrl`
2. `FIRECRAWL_BASE_URL`
3. `https://api.firecrawl.dev`

### Puente de compatibilidad

Para el primer lanzamiento, la extensión también puede **leer** la configuración central existente en `tools.web.fetch.firecrawl.*` como fuente alternativa para que los usuarios existentes no necesiten migrar de inmediato.

La ruta de escritura se mantiene local al complemento. No sigas expandiendo las superficies de configuración central de Firecrawl.

## Diseño de la herramienta

### `firecrawl_search`

Entradas:

- `query`
- `limit`
- `sources`
- `categories`
- `scrapeResults`
- `timeoutSeconds`

Comportamiento:

- Llama a `v2/search` de Firecrawl
- Devuelve objetos de resultado normalizados compatibles con OpenClaw:
  - `title`
  - `url`
  - `snippet`
  - `source`
  - `content` opcional
- Envuelve el contenido del resultado como contenido externo que no es de confianza
- La clave de caché incluye la consulta + parámetros relevantes del proveedor

Por qué primero una herramienta explícita:

- Funciona hoy sin cambiar `tools.web.search.provider`
- Evita las restricciones actuales de esquema/cargador
- Da a los usuarios el valor de Firecrawl inmediatamente

### `firecrawl_scrape`

Entradas:

- `url`
- `formats`
- `onlyMainContent`
- `maxAgeMs`
- `proxy`
- `storeInCache`
- `timeoutSeconds`

Comportamiento:

- Llama a `v2/scrape` de Firecrawl
- Devuelve markdown/texto más metadatos:
  - `title`
  - `finalUrl`
  - `status`
  - `warning`
- Envuelve el contenido extraído de la misma manera que lo hace `web_fetch`
- Comparte la semántica de caché con las expectativas de la herramienta web cuando sea práctico

Por qué una herramienta de scraping explícita:

- Evita el error de orden `Readability -> Firecrawl -> basic HTML cleanup` no resuelto en el núcleo `web_fetch`
- Proporciona a los usuarios una ruta determinista "siempre usar Firecrawl" para sitios con mucho JS/protegidos contra bots

## Lo que la extensión no debe hacer

- No agregar automáticamente `browser`, `web_search` o `web_fetch` a `tools.alsoAllow`
- Sin paso de incorporación predeterminado en `openclaw setup`
- Sin ciclo de vida de sesión del navegador específico de Firecrawl en el núcleo
- Sin cambios en la semántica de reserva `web_fetch` integrada en la MVP de la extensión

## Plan de fases

### Fase 1: solo extensión, sin cambios en el esquema central

Implementar:

- `extensions/firecrawl/`
- esquema de configuración del complemento
- `firecrawl_search`
- `firecrawl_scrape`
- pruebas para la resolución de configuración, selección de endpoint, almacenamiento en caché, manejo de errores y uso de protecciones SSRF

Esta fase es suficiente para ofrecer un valor real al usuario.

### Fase 2: integración opcional del proveedor `web_search`

Admitir `tools.web.search.provider = "firecrawl"` solo después de corregir dos restricciones principales:

1. `src/plugins/web-search-providers.ts` debe cargar los complementos de proveedor de búsqueda web configurados/instalados en lugar de una lista empaquetada codificada.
2. `src/config/types.tools.ts` y `src/config/zod-schema.agent-runtime.ts` deben dejar de codificar la enumeración del proveedor de una manera que bloquee los ids registrados por el complemento.

Forma recomendada:

- mantener los proveedores integrados documentados,
- permitir cualquier id de proveedor de complemento registrado en tiempo de ejecución,
- validar la configuración específica del proveedor a través del complemento del proveedor o una bolsa de proveedor genérica.

### Fase 3: costura opcional del proveedor `web_fetch`

Haga esto solo si los mantenedores quieren que los backends de búsqueda específicos del proveedor participen en `web_fetch`.

Adición necesaria en el núcleo:

- `registerWebFetchProvider` o costura de backend de búsqueda equivalente

Sin esa costura, la extensión debe mantener `firecrawl_scrape` como una herramienta explícita en lugar de intentar parchear `web_fetch` integrado.

## Requisitos de seguridad

La extensión debe tratar Firecrawl como un **endpoint configurado por el operador de confianza**, pero aun así fortalecer el transporte:

- Use SSRF-guarded fetch para la llamada al endpoint de Firecrawl, no raw `fetch()`
- Preserve la compatibilidad con alojamiento propio/red privada utilizando la misma política de endpoint de trusted-web-tools que se usa en otros lugares
- Nunca registre la clave de API
- Mantenga la resolución del endpoint/base URL explícita y predecible
- Trate el contenido devuelto por Firecrawl como contenido externo no confiable

Esto refleja la intención detrás de los PRs de endurecimiento SSRF sin asumir que Firecrawl es una superficie multiinquilino hostil.

## Por qué no una habilidad (skill)

El repositorio ya cerró un PR de habilidad (skill) de Firecrawl a favor de la distribución ClawHub. Eso está bien para flujos de trabajo de instalación opcional por el usuario, pero no resuelve:

- disponibilidad determinista de herramientas,
- manejo de configuración/credenciales de nivel de proveedor,
- soporte de endpoint alojado por uno mismo,
- caché,
- salidas tipadas estables,
- revisión de seguridad del comportamiento de red.

Esto pertenece como una extensión, no una habilidad (skill) solo de prompt.

## Criterios de éxito

- Los usuarios pueden instalar/habilitar una extensión y obtener una búsqueda/extracción (scrape) de Firecrawl confiable sin tocar los valores predeterminados del núcleo.
- Firecrawl alojado por uno mismo funciona con configuración/respaldo de entorno (env fallback).
- Las llamadas (fetches) al endpoint de la extensión utilizan redes protegidas.
- No hay un nuevo comportamiento de incorporación/predeterminado del núcleo específico de Firecrawl.
- El núcleo puede adoptar más adelante costuras (seams) `web_search` / `web_fetch` nativas de complementos sin rediseñar la extensión.

## Orden de implementación recomendado

1. Construir `firecrawl_scrape`
2. Construir `firecrawl_search`
3. Agregar documentación y ejemplos
4. Si se desea, generalizar la carga del proveedor `web_search` para que la extensión pueda respaldar `web_search`
5. Solo entonces considerar una verdadera costura (seam) de proveedor `web_fetch`
