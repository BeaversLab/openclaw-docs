---
summary: "Búsqueda web de Grok mediante respuestas fundamentadas en la web de xAI"
read_when:
  - You want to use Grok for web_search
  - You want to use xAI OAuth or an XAI_API_KEY for web search
title: "Búsqueda de Grok"
---

OpenClaw es compatible con Grok como proveedor `web_search`, utilizando respuestas fundamentadas en la web de xAI
para producir respuestas sintetizadas por IA respaldadas por resultados de búsqueda en vivo
con citas.

La búsqueda web de Grok prefiere tu inicio de sesión OAuth de xAI existente cuando hay uno disponible.
Si no existe ningún perfil OAuth, la misma clave de API de xAI también puede potenciar la herramienta incorporada
`x_search` para la búsqueda de publicaciones de X (anteriormente Twitter) y la herramienta `code_execution`.
Si almacenas la clave bajo `plugins.entries.xai.config.webSearch.apiKey`,
OpenClaw la reutiliza como alternativa para el proveedor de modelo xAI incluido también.

Para métricas de X a nivel de publicación, como republicaciones, respuestas, marcadores o vistas, prefiere
`x_search` con la URL exacta de la publicación o el ID de estado en lugar de una consulta de búsqueda
amplia.

## Incorporación y configuración

Si elige **Grok** durante:

- `openclaw onboard`
- `openclaw configure --section web`

OpenClaw puede utilizar un perfil OAuth de xAI existente sin solicitar una clave de
búsqueda web separada. Si OAuth no está disponible, recurre a la configuración de la clave de API de xAI.
OpenClaw también puede mostrar un paso de seguimiento separado para habilitar `x_search` con la
misma credencial xAI. Ese seguimiento:

- solo aparece después de elegir Grok para `web_search`
- no es una opción separada de proveedor de búsqueda web de nivel superior
- puede establecer opcionalmente el modelo `x_search` durante el mismo flujo

Si lo omites, puedes habilitar o cambiar `x_search` más tarde en la configuración.

## Inicia sesión u obtén una clave de API

<Steps>
  <Step title="Usar xAI OAuth">
    Si ya iniciaste sesión con xAI durante el proceso de incorporación o autenticación del modelo, elige
    Grok como proveedor `web_search`. No se requiere una clave de API separada:

    ```bash
    openclaw onboard --auth-choice xai-oauth
    openclaw config set tools.web.search.provider grok
    ```

  </Step>
  <Step title="Usar una alternativa de clave de API">
    Obtén una clave de API de [xAI](https://console.x.ai/) cuando OAuth no esté disponible
    o si deseas intencionalmente una configuración de búsqueda web respaldada por clave.
  </Step>
  <Step title="Almacenar la clave">
    Establece `XAI_API_KEY` en el entorno de Gateway, o configura a través de:

    ```bash
    openclaw configure --section web
    ```

  </Step>
</Steps>

## Config

```json5
{
  plugins: {
    entries: {
      xai: {
        config: {
          webSearch: {
            apiKey: "xai-...", // optional if xAI OAuth or XAI_API_KEY is available
            baseUrl: "https://api.x.ai/v1", // optional Responses API proxy/base URL override
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "grok",
      },
    },
  },
}
```

**Alternativas de credenciales:** inicie sesión con `openclaw models auth login
--provider xai --method oauth`, set `XAI_API_KEY` en el entorno de Gateway,
o almacene `plugins.entries.xai.config.webSearch.apiKey`. Para una instalación de puerta de enlace,
ponga las variables de entorno en `~/.openclaw/.env`.

## Cómo funciona

Grok utiliza respuestas basadas en la web de xAI para sintetizar respuestas con
citas en línea, similar al enfoque de fundamentación en la búsqueda de Google de Gemini.

## Parámetros admitidos

La búsqueda de Grok admite `query`.

Se acepta `count` para la compatibilidad compartida con `web_search`, pero Grok aún
devuelve una respuesta sintetizada con citas en lugar de una lista de N resultados.

Los filtros específicos del proveedor no son compatibles actualmente.

Grok utiliza un tiempo de espera predeterminado específico del proveedor de 60 segundos porque las búsquedas
basadas en la web de xAI Responses pueden tardar más que el predeterminado compartido de `web_search`. Establezca
`tools.web.search.timeoutSeconds` para anularlo.

## Invalidaciones de URL base

Establezca `plugins.entries.xai.config.webSearch.baseUrl` cuando la búsqueda web de Grok deba
enrutar a través de un proxy de operador o un extremo de Responses compatible con xAI. OpenClaw
publica en `<baseUrl>/responses` después de recortar las barras inclinadas finales. `x_search`
utiliza el mismo respaldo `webSearch.baseUrl` a menos que
se establezca `plugins.entries.xai.config.xSearch.baseUrl`.

## Relacionado

- [Descripción general de la búsqueda web](/es/tools/web) -- todos los proveedores y detección automática
- [x_search en Web Search](/es/tools/web#x_search) -- búsqueda X de primera clase a través de xAI
- [Gemini Search](/es/tools/gemini-search) -- respuestas sintetizadas por IA a través de la fundamentación de Google
