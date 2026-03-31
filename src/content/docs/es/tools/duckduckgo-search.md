---
summary: "Búsqueda web DuckDuckGo -- proveedor alternativo sin clave (experimental, basado en HTML)"
read_when:
  - You want a web search provider that requires no API key
  - You want to use DuckDuckGo for web_search
  - You need a zero-config search fallback
title: "Búsqueda DuckDuckGo"
---

# Búsqueda DuckDuckGo

OpenClaw soporta DuckDuckGo como proveedor **sin clave** `web_search`. No se requiere
cuenta ni clave de API.

<Warning>DuckDuckGo es una integración **experimental y no oficial** que obtiene resultados de las páginas de búsqueda sin JavaScript de DuckDuckGo — no de una API oficial. Espere fallos ocasionales debido a páginas de desafío de bots o cambios en HTML.</Warning>

## Configuración

No se necesita clave de API: simplemente configure DuckDuckGo como su proveedor:

<Steps>
  <Step title="Configure">```bash openclaw configure --section web # Select "duckduckgo" as the provider ```</Step>
</Steps>

## Configuración

```json5
{
  tools: {
    web: {
      search: {
        provider: "duckduckgo",
      },
    },
  },
}
```

Configuraciones opcionales a nivel de complemento para la región y Búsqueda Segura:

```json5
{
  plugins: {
    entries: {
      duckduckgo: {
        config: {
          webSearch: {
            region: "us-en", // DuckDuckGo region code
            safeSearch: "moderate", // "strict", "moderate", or "off"
          },
        },
      },
    },
  },
}
```

## Parámetros de la herramienta

| Parámetro    | Descripción                                                             |
| ------------ | ----------------------------------------------------------------------- |
| `query`      | Consulta de búsqueda (requerido)                                        |
| `count`      | Resultados a devolver (1-10, predeterminado: 5)                         |
| `region`     | Código de región de DuckDuckGo (ej. `us-en`, `uk-en`, `de-de`)          |
| `safeSearch` | Nivel de Búsqueda Segura: `strict`, `moderate` (predeterminado) o `off` |

La región y la Búsqueda Segura también se pueden establecer en la configuración del complemento (ver arriba) — los
parámetros de la herramienta anulan los valores de configuración por consulta.

## Notas

- **Sin clave de API** — funciona de inmediato, configuración cero
- **Experimental** — recopila resultados de las páginas de búsqueda HTML
  sin JavaScript de DuckDuckGo, no de una API o SDK oficial
- **Riesgo de desafío para bots** — DuckDuckGo puede mostrar CAPTCHAs o bloquear solicitudes
  bajo uso intensivo o automatizado
- **Análisis de HTML** — los resultados dependen de la estructura de la página, la cual puede cambiar sin
  previo aviso
- **Orden de detección automática** — DuckDuckGo se verifica en último lugar (orden 100) en
  la detección automática, por lo que cualquier proveedor con API que tenga una clave tiene prioridad
- **Búsqueda Segura se establece en moderada** de forma predeterminada cuando no se configura

<Tip>Para uso en producción, considere [Brave Search](/en/tools/brave-search) (capa gratuita disponible) u otro proveedor con API.</Tip>

## Relacionado

- [Descripción general de Web Search](/en/tools/web) -- todos los proveedores y detección automática
- [Brave Search](/en/tools/brave-search) -- resultados estructurados con nivel gratuito
- [Búsqueda Exa](/en/tools/exa-search) -- búsqueda neuronal con extracción de contenido
