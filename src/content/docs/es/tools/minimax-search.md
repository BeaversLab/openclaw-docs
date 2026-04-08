---
summary: "Búsqueda MiniMax a través de la API de búsqueda Coding Plan"
read_when:
  - You want to use MiniMax for web_search
  - You need a MiniMax Coding Plan key
  - You want MiniMax CN/global search host guidance
title: "Búsqueda MiniMax"
---

# Búsqueda MiniMax

OpenClaw es compatible con MiniMax como proveedor `web_search` a través de la API de búsqueda Coding Plan de MiniMax. Devuelve resultados de búsqueda estructurados con títulos, URL, fragmentos y consultas relacionadas.

## Obtener una clave Coding Plan

<Steps>
  <Step title="Crear una clave">
    Cree o copie una clave MiniMax Coding Plan desde
    [MiniMax Platform](https://platform.minimax.io/user-center/basic-information/interface-key).
  </Step>
  <Step title="Guardar la clave">
    Establezca `MINIMAX_CODE_PLAN_KEY` en el entorno Gateway, o configure a través de:

    ```bash
    openclaw configure --section web
    ```

  </Step>
</Steps>

OpenClaw también acepta `MINIMAX_CODING_API_KEY` como un alias de entorno. `MINIMAX_API_KEY`
se sigue leyendo como alternativa de compatibilidad cuando ya apunta a un token coding-plan.

## Configuración

```json5
{
  plugins: {
    entries: {
      minimax: {
        config: {
          webSearch: {
            apiKey: "sk-cp-...", // optional if MINIMAX_CODE_PLAN_KEY is set
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

**Alternativa de entorno:** establezca `MINIMAX_CODE_PLAN_KEY` en el entorno Gateway.
Para una instalación de gateway, póngalo en `~/.openclaw/.env`.

## Selección de región

La Búsqueda MiniMax utiliza estos puntos finales:

- Global: `https://api.minimax.io/v1/coding_plan/search`
- CN: `https://api.minimaxi.com/v1/coding_plan/search`

Si `plugins.entries.minimax.config.webSearch.region` no está establecido, OpenClaw resuelve
la región en este orden:

1. `tools.web.search.minimax.region` / plugin-owned `webSearch.region`
2. `MINIMAX_API_HOST`
3. `models.providers.minimax.baseUrl`
4. `models.providers.minimax-portal.baseUrl`

Esto significa que el registro en CN o `MINIMAX_API_HOST=https://api.minimaxi.com/...`
mantiene automáticamente la Búsqueda MiniMax también en el host de CN.

Incluso cuando haya autenticado MiniMax a través de la ruta OAuth `minimax-portal`,
la búsqueda web aún se registra como ID de proveedor `minimax`; la URL base del proveedor OAuth
solo se utiliza como sugerencia de región para la selección de host CN/global.

## Parámetros compatibles

La Búsqueda MiniMax admite:

- `query`
- `count` (OpenClaw recorta la lista de resultados devuelta al conteo solicitado)

Los filtros específicos del proveedor no son compatibles actualmente.

## Relacionado

- [Resumen de búsqueda web](/en/tools/web) -- todos los proveedores y detección automática
- [MiniMax](/en/providers/minimax) -- configuración de modelo, imagen, voz y autenticación
