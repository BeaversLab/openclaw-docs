---
summary: "Respaldo de Firecrawl para web_fetch (anti-bot + extracción en caché)"
read_when:
  - You want Firecrawl-backed web extraction
  - You need a Firecrawl API key
  - You want anti-bot extraction for web_fetch
title: "Firecrawl"
---

# Firecrawl

OpenClaw puede usar **Firecrawl** como un extractor de respaldo para `web_fetch`. Es un servicio de extracción de contenido alojado que admite la evasión de bots y el almacenamiento en caché, lo cual ayuda con sitios con mucho JS o páginas que bloquean las recuperaciones HTTP planas.

## Obtener una clave de API

1. Cree una cuenta de Firecrawl y genere una clave de API.
2. Guárdela en la configuración o establezca `FIRECRAWL_API_KEY` en el entorno de la puerta de enlace.

## Configurar Firecrawl

```json5
{
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

- `firecrawl.enabled` por defecto es `true` a menos que se establezca explícitamente en `false`.
- Los intentos de respaldo de Firecrawl se ejecutan solo cuando hay una clave de API disponible (`tools.web.fetch.firecrawl.apiKey` o `FIRECRAWL_API_KEY`).
- `maxAgeMs` controla cuántos pueden tener los resultados en caché (ms). El valor predeterminado es de 2 días.

## Sigilo / evasión de bots

Firecrawl expone un parámetro de **modo de proxy** para la evasión de bots (`basic`, `stealth`, o `auto`).
OpenClaw siempre usa `proxy: "auto"` más `storeInCache: true` para las solicitudes de Firecrawl.
Si se omite el proxy, Firecrawl usa por defecto `auto`. `auto` reintentará con proxies sigilosos si falla un intento básico, lo cual puede usar más créditos que el raspado solo básico.

## Cómo `web_fetch` usa Firecrawl

Orden de extracción de `web_fetch`:

1. Readability (local)
2. Firecrawl (si está configurado)
3. Limpieza básica de HTML (último recurso)

Consulte [Herramientas web](/es/tools/web) para la configuración completa de la herramienta web.

import es from "/components/footer/es.mdx";

<es />
