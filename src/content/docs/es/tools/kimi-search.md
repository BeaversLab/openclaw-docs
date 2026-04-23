---
summary: "Búsqueda web de Kimi mediante la búsqueda web de Moonshot"
read_when:
  - You want to use Kimi for web_search
  - You need a KIMI_API_KEY or MOONSHOT_API_KEY
title: "Búsqueda Kimi"
---

# Búsqueda Kimi

OpenClaw soporta Kimi como proveedor `web_search`, utilizando la búsqueda web de Moonshot
para producir respuestas sintetizadas por IA con citas.

## Obtener una clave de API

<Steps>
  <Step title="Crear una clave">
    Obtén una clave de API de [Moonshot AI](https://platform.moonshot.cn/).
  </Step>
  <Step title="Guardar la clave">
    Establezca `KIMI_API_KEY` o `MOONSHOT_API_KEY` en el entorno de Gateway, o
    configure a través de:

    ```bash
    openclaw configure --section web
    ```

  </Step>
</Steps>

Cuando eliges **Kimi** durante `openclaw onboard` o
`openclaw configure --section web`, OpenClaw también puede pedir:

- la región de la API de Moonshot:
  - `https://api.moonshot.ai/v1`
  - `https://api.moonshot.cn/v1`
- el modelo de búsqueda web de Kimi predeterminado (por defecto es `kimi-k2.6`)

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

Si utilizas el host de API de China para el chat (`models.providers.moonshot.baseUrl`:
`https://api.moonshot.cn/v1`), OpenClaw reutiliza ese mismo host para Kimi
`web_search` cuando se omite `tools.web.search.kimi.baseUrl`, por lo que las claves de
[platform.moonshot.cn](https://platform.moonshot.cn/%%) no golpean por error el
punto de conexión internacional (que a menudo devuelve HTTP 401). Anula esto
con `tools.web.search.kimi.baseUrl` cuando necesites una URL base de búsqueda diferente.

**Alternativa de entorno:** establece `KIMI_API_KEY` o `MOONSHOT_API_KEY` en el
entorno de Gateway. Para una instalación de puerta de enlace, colócala en `~/.openclaw/.env`.

Si omite `baseUrl`, OpenClaw usa por defecto `https://api.moonshot.ai/v1`.
Si omite `model`, OpenClaw usa por defecto `kimi-k2.6`.

## Cómo funciona

Kimi utiliza la búsqueda web de Moonshot para sintetizar respuestas con citas en línea,
similar al enfoque de respuesta fundamentada de Gemini y Grok.

## Parámetros compatibles

La búsqueda de Kimi soporta `query`.

`count` se acepta por compatibilidad con `web_search` compartido, pero Kimi todavía
devuelve una respuesta sintetizada con citas en lugar de una lista de N resultados.

Los filtros específicos del proveedor actualmente no son compatibles.

## Relacionado

- [Resumen de búsqueda web](/es/tools/web) -- todos los proveedores y detección automática
- [Moonshot AI](/es/providers/moonshot) -- Modelo Moonshot + documentación del proveedor Kimi Coding
- [Búsqueda Gemini](/es/tools/gemini-search) -- respuestas sintetizadas por IA mediante grounding de Google
- [Búsqueda Grok](/es/tools/grok-search) -- respuestas sintetizadas por IA mediante grounding de xAI
