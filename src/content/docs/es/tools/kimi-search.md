---
summary: "Búsqueda web de Kimi mediante la búsqueda web de Moonshot"
read_when:
  - You want to use Kimi for web_search
  - You need a KIMI_API_KEY or MOONSHOT_API_KEY
title: "Kimi search"
---

OpenClaw es compatible con Kimi como un proveedor de `web_search`, utilizando la búsqueda web de Moonshot para producir respuestas sintetizadas por IA con citas.

## Obtener una clave de API

<Steps>
  <Step title="Crear una clave">
    Obtén una clave de API de [Moonshot AI](https://platform.moonshot.cn/).
  </Step>
  <Step title="Guardar la clave">
    Establece `KIMI_API_KEY` o `MOONSHOT_API_KEY` en el entorno de Gateway, o
    configura a través de:

    ```bash
    openclaw configure --section web
    ```

  </Step>
</Steps>

Cuando elijas **Kimi** durante `openclaw onboard` o
`openclaw configure --section web`, OpenClaw también puede solicitar:

- la región de la API de Moonshot:
  - `https://api.moonshot.ai/v1`
  - `https://api.moonshot.cn/v1`
- el modelo de búsqueda web de Kimi predeterminado (el valor predeterminado es `kimi-k2.6`)

## Configuración

```json5
{
  plugins: {
    entries: {
      moonshot: {
        config: {
          webSearch: {
            apiKey: "sk-...", // optional if KIMI_API_KEY or MOONSHOT_API_KEY is set
            baseUrl: "https://api.moonshot.ai/v1",
            model: "kimi-k2.6",
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "kimi",
      },
    },
  },
}
```

Si utilizas el host de la API de China para el chat (`models.providers.moonshot.baseUrl`:
`https://api.moonshot.cn/v1`), OpenClaw reutiliza el mismo host para Kimi
`web_search` cuando se omite `tools.web.search.kimi.baseUrl`, por lo que las claves de
[platform.moonshot.cn](https://platform.moonshot.cn/) no golpean el
punto final internacional por error (lo que a menudo devuelve HTTP 401). Anula
con `tools.web.search.kimi.baseUrl` cuando necesites una URL base de búsqueda diferente.

**Alternativa de entorno:** establece `KIMI_API_KEY` o `MOONSHOT_API_KEY` en el
entorno de Gateway. Para una instalación de puerta de enlace, colócalo en `~/.openclaw/.env`.

Si omites `baseUrl`, OpenClaw usa por defecto `https://api.moonshot.ai/v1`.
Si omites `model`, OpenClaw usa por defecto `kimi-k2.6`.

## Cómo funciona

Kimi utiliza la búsqueda web de Moonshot para sintetizar respuestas con citas en línea,
similar al enfoque de respuesta fundamentada de Gemini y Grok.

## Parámetros admitidos

La búsqueda de Kimi admite `query`.

Se acepta `count` para la compatibilidad compartida de `web_search`, pero Kimi todavía
devuelve una respuesta sintetizada con citas en lugar de una lista de N resultados.

Los filtros específicos del proveedor no son compatibles actualmente.

## Relacionado

- [Información general de la búsqueda web](/es/tools/web) -- todos los proveedores y detección automática
- [Moonshot AI](/es/providers/moonshot) -- Modelo Moonshot + documentación del proveedor Kimi Coding
- [Gemini Search](/es/tools/gemini-search) -- Respuestas sintetizadas por IA mediante grounding de Google
- [Grok Search](/es/tools/grok-search) -- Respuestas sintetizadas por IA mediante grounding de xAI
