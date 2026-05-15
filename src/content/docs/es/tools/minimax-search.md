---
summary: "Búsqueda de MiniMax a través de la API de búsqueda del Plan de Token"
read_when:
  - You want to use MiniMax for web_search
  - You need a MiniMax Token Plan key or OAuth token
  - You want MiniMax CN/global search host guidance
title: "Búsqueda de MiniMax"
---

OpenClaw soporta MiniMax como proveedor de `web_search` a través de la API de búsqueda del Plan de Token de MiniMax. Devuelve resultados de búsqueda estructurados con títulos, URL, fragmentos y consultas relacionadas.

## Obtener una credencial del Plan de Token

<Steps>
  <Step title="Crear una clave">
    Cree o copie una clave del Plan de Token de MiniMax desde
    [Plataforma MiniMax](https://platform.minimax.io/user-center/basic-information/interface-key).
    Las configuraciones de OAuth pueden reutilizar `MINIMAX_OAUTH_TOKEN` en su lugar.
  </Step>
  <Step title="Guardar la clave">
    Establezca `MINIMAX_CODE_PLAN_KEY` en el entorno de Gateway, o configure a través de:

    ```bash
    openclaw configure --section web
    ```

  </Step>
</Steps>

OpenClaw también acepta `MINIMAX_CODING_API_KEY`, `MINIMAX_OAUTH_TOKEN` y
`MINIMAX_API_KEY` como alias de entorno. `MINIMAX_API_KEY` debe apuntar a una
credencial del Plan de Token con búsqueda habilitada; las claves de API del modelo ordinario de MiniMax pueden no
ser aceptadas por el endpoint de búsqueda del Plan de Token.

## Configuración

```json5
{
  plugins: {
    entries: {
      minimax: {
        config: {
          webSearch: {
            apiKey: "sk-cp-...", // optional if a MiniMax Token Plan env var is set
            region: "global", // or "cn"
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "minimax",
      },
    },
  },
}
```

**Alternativa de entorno:** establezca `MINIMAX_CODE_PLAN_KEY`, `MINIMAX_CODING_API_KEY`,
`MINIMAX_OAUTH_TOKEN` o `MINIMAX_API_KEY` en el entorno de Gateway.
Para una instalación de gateway, póngalo en `~/.openclaw/.env`.

## Selección de región

La búsqueda de MiniMax utiliza estos puntos finales:

- Global: `https://api.minimax.io/v1/coding_plan/search`
- CN: `https://api.minimaxi.com/v1/coding_plan/search`

Si `plugins.entries.minimax.config.webSearch.region` no está establecido, OpenClaw resuelve
la región en este orden:

1. `tools.web.search.minimax.region` / `webSearch.region` propiedad del complemento
2. `MINIMAX_API_HOST`
3. `models.providers.minimax.baseUrl`
4. `models.providers.minimax-portal.baseUrl`

Eso significa que la incorporación en CN o `MINIMAX_API_HOST=https://api.minimaxi.com/...`
mantiene automáticamente la Búsqueda de MiniMax en el host CN también.

Incluso cuando haya autenticado MiniMax a través de la ruta OAuth `minimax-portal`,
la búsqueda web todavía se registra como id de proveedor `minimax`; la URL base del proveedor OAuth
se utiliza como sugerencia de región para la selección de host CN/global, y `MINIMAX_OAUTH_TOKEN`
puede satisfacer la credencial de portador de MiniMax Search.

## Parámetros compatibles

La búsqueda de MiniMax es compatible con:

- `query`
- `count` (OpenClaw recorta la lista de resultados devueltos al número solicitado)

Los filtros específicos del proveedor actualmente no son compatibles.

## Relacionado

- [Descripción general de la búsqueda web](/es/tools/web) -- todos los proveedores y detección automática
- [MiniMax](/es/providers/minimax) -- modelo, imagen, voz y configuración de autenticación
