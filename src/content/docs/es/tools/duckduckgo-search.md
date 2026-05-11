---
summary: "Búsqueda web DuckDuckGo -- proveedor alternativo sin clave (experimental, basado en HTML)"
read_when:
  - You want a web search provider that requires no API key
  - You want to use DuckDuckGo for web_search
  - You need a zero-config search fallback
title: "Búsqueda DuckDuckGo"
---

OpenClaw es compatible con DuckDuckGo como proveedor `web_search` **sin clave**. No se requiere
ninguna clave de API ni cuenta.

<Warning>DuckDuckGo es una integración **experimental y no oficial** que obtiene resultados de las páginas de búsqueda sin JavaScript de DuckDuckGo, no de una API oficial. Espere interrupciones ocasionales debido a páginas de desafío para bots o cambios en HTML.</Warning>

## Configuración

No se necesita clave de API — simplemente configure DuckDuckGo como su proveedor:

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

<ParamField path="query" type="string" required>
  Consulta de búsqueda.
</ParamField>

<ParamField path="count" type="number" default="5">
  Resultados a devolver (1–10).
</ParamField>

<ParamField path="region" type="string">
  Código de región de DuckDuckGo (p. ej., `us-en`, `uk-en`, `de-de`).
</ParamField>

<ParamField path="safeSearch" type="'strict' | 'moderate' | 'off'" default="moderate">
  Nivel de SafeSearch.
</ParamField>

La región y SafeSearch también se pueden configurar en la configuración del complemento (ver arriba) — los
parámetros de la herramienta anulan los valores de configuración por consulta.

## Notas

- **Sin clave de API** — funciona de inmediato, configuración cero
- **Experimental** — recopila resultados de las páginas de búsqueda HTML
  sin JavaScript de DuckDuckGo, no de una API o SDK oficial
- **Riesgo de desafío para bots** — DuckDuckGo puede mostrar CAPTCHAs o bloquear solicitudes
  bajo uso intenso o automatizado
- **Análisis de HTML** — los resultados dependen de la estructura de la página, la cual puede cambiar sin
  previo aviso
- **Orden de detección automática** — DuckDuckGo es la primera alternativa sin clave
  (orden 100) en la detección automática. Los proveedores con API y claves configuradas se ejecutan
  primero, luego Búsqueda web de Ollama (orden 110) y luego SearXNG (orden 200)
- **SafeSearch se establece en moderado por defecto** cuando no se configura

<Tip>Para uso en producción, considere [Brave Search](/es/tools/brave-search) (capa gratuita disponible) u otro proveedor con API.</Tip>

## Relacionado

- [Resumen de búsqueda web](/es/tools/web) -- todos los proveedores y detección automática
- [Brave Search](/es/tools/brave-search) -- resultados estructurados con nivel gratuito
- [Exa Search](/es/tools/exa-search) -- búsqueda neuronal con extracción de contenido
