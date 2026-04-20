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

<Warning>DuckDuckGo es una integración **experimental y no oficial** que obtiene resultados de las páginas de búsqueda de DuckDuckGo que no usan JavaScript — no de una API oficial. Espere interrupciones ocasionales debido a páginas de desafío de bots o cambios en el HTML.</Warning>

## Configuración

No se necesita clave de API: simplemente configure DuckDuckGo como su proveedor:

<Steps>
  <Step title="Configurar">```bash openclaw configure --section web # Select "duckduckgo" as the provider ```</Step>
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

Configuraciones opcionales a nivel de complemento para región y SafeSearch:

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

| Parámetro    | Descripción                                                        |
| ------------ | ------------------------------------------------------------------ |
| `query`      | Consulta de búsqueda (obligatoria)                                 |
| `count`      | Resultados a devolver (1-10, predeterminado: 5)                    |
| `region`     | Código de región de DuckDuckGo (ej. `us-en`, `uk-en`, `de-de`)     |
| `safeSearch` | Nivel de SafeSearch: `strict`, `moderate` (predeterminado) o `off` |

La región y SafeSearch también se pueden configurar en la configuración del complemento (ver arriba) — los parámetros de la herramienta anulan los valores de configuración por consulta.

## Notas

- **Sin clave de API** — funciona de inmediato, configuración cero
- **Experimental** — recopila resultados de las páginas de búsqueda HTML
  sin JavaScript de DuckDuckGo, no una API oficial ni SDK
- **Riesgo de desafío de bots** — DuckDuckGo puede mostrar CAPTCHAs o bloquear solicitudes
  bajo uso intensivo o automatizado
- **Análisis HTML** — los resultados dependen de la estructura de la página, la cual puede cambiar sin
  previo aviso
- **Orden de detección automática** — DuckDuckGo es el primer respaldo sin clave
  (orden 100) en la detección automática. Los proveedores con API y claves configuradas se ejecutan
  primero, luego Ollama Web Search (orden 110), luego SearXNG (orden 200)
- **SafeSearch se predetermina a moderado** cuando no está configurado

<Tip>Para uso en producción, considere [Brave Search](/es/tools/brave-search) (nivel gratuito disponible) u otro proveedor con API.</Tip>

## Relacionado

- [Resumen de Web Search](/es/tools/web) -- todos los proveedores y detección automática
- [Brave Search](/es/tools/brave-search) -- resultados estructurados con nivel gratuito
- [Exa Search](/es/tools/exa-search) -- búsqueda neuronal con extracción de contenido
