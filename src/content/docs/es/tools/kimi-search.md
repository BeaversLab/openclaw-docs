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
  <Step title="Create a key">
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

Si usas el host de API de China para el chat (`models.providers.moonshot.baseUrl`:
`https://api.moonshot.cn/v1`), OpenClaw reutiliza ese mismo host para Kimi
`web_search` cuando se omite `tools.web.search.kimi.baseUrl`, por lo que las claves de
[platform.moonshot.cn](https://platform.moonshot.cn/) no golpean por error el
punto final internacional (que a menudo devuelve HTTP 401). Anula esto
con `tools.web.search.kimi.baseUrl` cuando necesites una URL base de búsqueda diferente.

**Alternativa de entorno:** establece `KIMI_API_KEY` o `MOONSHOT_API_KEY` en el
entorno de Gateway. Para una instalación de puerta de enlace, colócalo en `~/.openclaw/.env`.

Si omites `baseUrl`, OpenClaw usa por defecto `https://api.moonshot.ai/v1`.
Si omites `model`, OpenClaw usa por defecto `kimi-k2.6`.

## Cómo funciona

Kimi utiliza la búsqueda web de Moonshot para sintetizar respuestas con citas en línea,
similar al enfoque de respuesta fundamentada de Gemini y Grok.

OpenClaw trata la `web_search` de Kimi como exitosa solo después de que Moonshot devuelva
evidencia de fundamentación de búsqueda web nativa, como una carga útil de herramienta `$web_search` reproducible,
`search_results`, o URLs de cita. Si Kimi se detiene inmediatamente con una
respuesta de chat simple como "No puedo navegar por internet" y sin evidencia de fundamentación,
OpenClaw devuelve un error estructurado `kimi_web_search_ungrounded` en lugar de
envolver ese texto como resultado de búsqueda. Vuelve a intentar la consulta, cambia a un proveedor
ejecutado como Brave, o usa `web_fetch` / la herramienta del navegador cuando ya
tengas una URL objetivo.

## Parámetros compatibles

La búsqueda de Kimi es compatible con `query`.

Se acepta `count` para la compatibilidad compartida de `web_search`, pero Kimi aún
devuelve una respuesta sintetizada con citas en lugar de una lista de resultados de N.

Los filtros específicos del proveedor actualmente no son compatibles.

## Relacionado

- [Descripción general de la búsqueda web](/es/tools/web) -- todos los proveedores y detección automática
- [Moonshot AI](/es/providers/moonshot) -- documentación del proveedor del modelo Moonshot + Kimi Coding
- [Búsqueda Gemini](/es/tools/gemini-search) -- respuestas sintetizadas por IA mediante la fundamentación de Google
- [Búsqueda Grok](/es/tools/grok-search) -- respuestas sintetizadas por IA mediante la fundamentación de xAI
