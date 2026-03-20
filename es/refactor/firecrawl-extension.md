---
summary: "Diseño para una extensión opcional de Firecrawl que añade valor de búsqueda/extracción sin integrar Firecrawl en los valores predeterminados principales"
read_when:
  - Diseño del trabajo de integración de Firecrawl
  - Evaluación de las costuras de los complementos web_search/web_fetch
  - Decidir si Firecrawl pertenece al núcleo o como una extensión
title: "Diseño de la extensión Firecrawl"
---

# Diseño de la extensión Firecrawl

## Objetivo

Entregar Firecrawl como una **extensión opcional** que añade:

- herramientas explícitas de Firecrawl para agentes,
- integración opcional de `web_search` respaldada por Firecrawl,
- soporte autoalojado,
- valores predeterminados de seguridad más sólidos que la ruta de reserva principal actual,

sin incorporar Firecrawl a la configuración predeterminada ni a la ruta de incorporación.

## Por qué esta forma

Los problemas/PR recientes de Firecrawl se agrupan en tres categorías:

1. **Deriva de versión/esquema**
   - Varias versiones rechazaron `tools.web.fetch.firecrawl` aunque la documentación y el código en tiempo de ejecución lo admitían.
2. **Endurecimiento de seguridad**
   - El `fetchFirecrawlContent()` actual sigue enviando al punto final de Firecrawl con `fetch()` sin procesar, mientras que la ruta principal de recuperación web utiliza el guardia SSRF.
3. **Presión del producto**
   - Los usuarios quieren flujos de búsqueda/extracción nativos de Firecrawl, especialmente para configuraciones autoalojadas/privadas.
   - Los mantenedores rechazaron explícitamente integrar profundamente Firecrawl en los valores predeterminados principales, el flujo de configuración y el comportamiento del navegador.

Esa combinación aboga por una extensión, no por más lógica específica de Firecrawl en la ruta principal predeterminada.

## Principios de diseño

- **Opcional y con ámbito de proveedor**: sin activación automática, sin secuestro de configuración, sin ampliación del perfil de herramientas predeterminado.
- **La extensión posee la configuración específica de Firecrawl**: preferir la configuración del complemento antes de volver a agrandar `tools.web.*`.
- **Útil desde el primer día**: funciona incluso si las costuras principales `web_search` / `web_fetch` permanecen sin cambios.
- **Seguridad primero**: las recuperaciones de puntos finales utilizan la misma postura de red protegida que otras herramientas web.
- **Amigable para autoalojamiento**: configuración + reserva de variables de entorno, URL base explícita, sin suposiciones solo para alojamiento.

## Extensión propuesta

Id. del complemento: `firecrawl`

### Capacidades MVP

Registrar herramientas explícitas:

- `firecrawl_search`
- `firecrawl_scrape`

Opcional más adelante:

- `firecrawl_crawl`
- `firecrawl_map`

**No** añadas automatización del navegador de Firecrawl en la primera versión. Esa fue la parte de la PR #32543 que incorporó Firecrawl demasiado en el comportamiento principal y generó la mayor preocupación sobre el mantenimiento.

## Forma de la configuración

Usa configuración con ámbito de complemento (plugin-scoped):

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

Para la primera versión, la extensión también puede **leer** la configuración principal existente en `tools.web.fetch.firecrawl.*` como fuente alternativa para que los usuarios existentes no necesiten migrar inmediatamente.

La ruta de escritura permanece local al complemento. No sigas expandiendo las superficies de configuración principal de Firecrawl.

## Diseño de herramientas

### `firecrawl_search`

Entradas:

- `query`
- `limit`
- `sources`
- `categories`
- `scrapeResults`
- `timeoutSeconds`

Comportamiento:

- Llama a Firecrawl `v2/search`
- Devuelve objetos de resultado normalizados compatibles con OpenClaw:
  - `title`
  - `url`
  - `snippet`
  - `source`
  - opcional `content`
- Envuelve el contenido del resultado como contenido externo que no es de confianza
- La clave de caché incluye la consulta + parámetros relevantes del proveedor

Por qué primero una herramienta explícita:

- Funciona hoy sin cambiar `tools.web.search.provider`
- Evita las restricciones actuales de esquema/cargador
- Proporciona a usuarios el valor de Firecrawl inmediatamente

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

- Llama a Firecrawl `v2/scrape`
- Devuelve markdown/texto más metadatos:
  - `title`
  - `finalUrl`
  - `status`
  - `warning`
- Envuelve el contenido extraído de la misma manera que lo hace `web_fetch`
- Comparte semánticas de caché con las expectativas de la herramienta web cuando sea práctico

Por qué una herramienta de scrape explícita:

- Evita el error de orden `Readability -> Firecrawl -> basic HTML cleanup` sin resolver en el núcleo `web_fetch`
- Ofrece a los usuarios una ruta determinista "siempre usar Firecrawl" para sitios con mucho JS/protegidos contra bots

## Lo que la extensión no debe hacer

- No agregar automáticamente `browser`, `web_search` o `web_fetch` a `tools.alsoAllow`
- Sin paso de incorporación predeterminado en `openclaw setup`
- Sin ciclo de vida de sesión del navegador específico de Firecrawl en el núcleo
- Sin cambio en las semánticas de reserva `web_fetch` integradas en la MVP de la extensión

## Plan de fases

### Fase 1: solo extensión, sin cambios en el esquema del núcleo

Implementar:

- `extensions/firecrawl/`
- esquema de configuración del complemento
- `firecrawl_search`
- `firecrawl_scrape`
- pruebas para la resolución de configuración, selección de endpoint, almacenamiento en caché, manejo de errores y uso de protección SSRF

Esta fase es suficiente para proporcionar un valor real al usuario.

### Fase 2: integración opcional del proveedor `web_search`

Soportar `tools.web.search.provider = "firecrawl"` solo después de corregir dos restricciones principales:

1. `src/plugins/web-search-providers.ts` debe cargar complementos de proveedor de búsqueda web configurados/instalados en lugar de una lista empaquetada codificada.
2. `src/config/types.tools.ts` y `src/config/zod-schema.agent-runtime.ts` deben dejar de codificar la enumeración del proveedor de una manera que bloquee los ids registrados por el complemento.

Forma recomendada:

- mantener los proveedores integrados documentados,
- permitir cualquier id de proveedor de complemento registrado en tiempo de ejecución,
- validar la configuración específica del proveedor a través del complemento del proveedor o un contenedor genérico de proveedor.

### Fase 3: costura opcional del proveedor `web_fetch`

Hacer esto solo si los mantenedores quieren que los backends de obtención específicos del proveedor participen en `web_fetch`.

Adición principal necesaria:

- `registerWebFetchProvider` o costura equivalente de backend de obtención

Sin esa costura, la extensión debe mantener `firecrawl_scrape` como una herramienta explícita en lugar de intentar parchear `web_fetch` integrado.

## Requisitos de seguridad

La extensión debe tratar a Firecrawl como un **endpoint configurado por el operador de confianza**, pero aun así endurecer el transporte:

- Use SSRF-guarded fetch para la llamada al endpoint de Firecrawl, no raw `fetch()`
- Preserve la compatibilidad con red autoalojada/privada usando la misma política de endpoint trusted-web-tools usada en otros lugares
- Nunca registre la API key
- Mantenga la resolución del endpoint/base URL explícita y predecible
- Trate el contenido devuelto por Firecrawl como contenido externo no confiable

Esto refleja la intención detrás de los PRs de endurecimiento SSRF sin asumir que Firecrawl es una superficie multi-tenant hostil.

## Por qué no una skill

El repo ya cerró un PR de skill de Firecrawl a favor de la distribución ClawHub. Eso está bien para flujos de trabajo de prompt instalados opcionalmente por el usuario, pero no resuelve:

- disponibilidad determinista de herramientas,
- manejo de configuración/credenciales de nivel de proveedor,
- soporte de endpoint autoalojado,
- caching,
- salidas tipadas estables,
- revisión de seguridad del comportamiento de la red.

Esto corresponde a una extensión, no a una skill solo de prompt.

## Criterios de éxito

- Los usuarios pueden instalar/habilitar una extensión y obtener búsqueda/scraping de Firecrawl confiable sin tocar los valores predeterminados del núcleo.
- Firecrawl autoalojado funciona con config/env fallback.
- Las recuperaciones de endpoint de extensión usan redes protegidas.
- Sin nuevo comportamiento de integración/valor predeterminado del núcleo específico de Firecrawl.
- El núcleo puede adoptar más adelante costuras `web_search` / `web_fetch` nativas del complemento sin rediseñar la extensión.

## Orden de implementación recomendado

1. Construir `firecrawl_scrape`
2. Construir `firecrawl_search`
3. Agregar documentación y ejemplos
4. Si se desea, generalizar la carga del proveedor `web_search` para que la extensión pueda respaldar `web_search`
5. Solo entonces considerar una verdadera costura de proveedor `web_fetch`

import en from "/components/footer/en.mdx";

<en />
