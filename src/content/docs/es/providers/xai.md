---
summary: "Usar los modelos Grok de xAI en OpenClaw"
read_when:
  - You want to use Grok models in OpenClaw
  - You are configuring xAI auth or model ids
title: "xAI"
---

# xAI

OpenClaw incluye un complemento de proveedor `xai` para los modelos Grok.

## Configuración

1. Cree una clave de API en la consola de xAI.
2. Establezca `XAI_API_KEY`, o ejecute:

```bash
openclaw onboard --auth-choice xai-api-key
```

3. Elija un modelo como:

```json5
{
  agents: { defaults: { model: { primary: "xai/grok-4" } } },
}
```

OpenClaw ahora utiliza la API de Respuestas de xAI como el transporte xAI incluido. El mismo
`XAI_API_KEY` también puede potenciar `web_search` con respaldo de Grok, `x_search` de primera clase
y `code_execution` remotos.
Si almacena una clave de xAI en `plugins.entries.xai.config.webSearch.apiKey`,
el proveedor del modelo xAI incluido ahora reutiliza esa clave también como alternativa.
El ajuste de `code_execution` se encuentra en `plugins.entries.xai.config.codeExecution`.

## Catálogo de modelos incluidos actual

OpenClaw ahora incluye estas familias de modelos xAI de fábrica:

- `grok-3`, `grok-3-fast`, `grok-3-mini`, `grok-3-mini-fast`
- `grok-4`, `grok-4-0709`
- `grok-4-fast`, `grok-4-fast-non-reasoning`
- `grok-4-1-fast`, `grok-4-1-fast-non-reasoning`
- `grok-4.20-beta-latest-reasoning`, `grok-4.20-beta-latest-non-reasoning`
- `grok-code-fast-1`

El complemento también resuelve hacia adelante los IDs de los modelos más nuevos `grok-4*` y `grok-code-fast*` cuando
siguen la misma forma de API.

Notas de modelos rápidos:

- `grok-4-fast`, `grok-4-1-fast`, y las variantes `grok-4.20-beta-*` son las
  referencias de Grok con capacidad de imagen actuales en el catálogo incluido.
- `/fast on` o `agents.defaults.models["xai/<model>"].params.fastMode: true`
  reescribe las solicitudes nativas de xAI de la siguiente manera:
  - `grok-3` -> `grok-3-fast`
  - `grok-3-mini` -> `grok-3-mini-fast`
  - `grok-4` -> `grok-4-fast`
  - `grok-4-0709` -> `grok-4-fast`

Los alias de compatibilidad heredados todavía se normalizan a los IDs incluidos canónicos. Por
ejemplo:

- `grok-4-fast-reasoning` -> `grok-4-fast`
- `grok-4-1-fast-reasoning` -> `grok-4-1-fast`
- `grok-4.20-reasoning` -> `grok-4.20-beta-latest-reasoning`
- `grok-4.20-non-reasoning` -> `grok-4.20-beta-latest-non-reasoning`

## Búsqueda web

El proveedor de búsqueda web `grok` incluido también utiliza `XAI_API_KEY`:

```bash
openclaw config set tools.web.search.provider grok
```

## Generación de video

El complemento `xai` incluido también registra la generación de video a través de la herramienta
compartida `video_generate`.

- Modelo de video predeterminado: `xai/grok-imagine-video`
- Modos: texto a video, imagen a video y flujos de edición/extensión de video remotos
- Admite `aspectRatio` y `resolution`
- Límite actual: no se aceptan búferes de video locales; use URLs `http(s)`
  remotas para entradas de referencia/edición de video

Para usar xAI como el proveedor de video predeterminado:

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "xai/grok-imagine-video",
      },
    },
  },
}
```

Consulte [Generación de video](/en/tools/video-generation) para conocer los parámetros de la herramienta compartida,
la selección del proveedor y el comportamiento de conmutación por error.

## Límites conocidos

- Hoy la autenticación es solo mediante clave API. Aún no hay un flujo OAuth/código de dispositivo de xAI en OpenClaw.
- `grok-4.20-multi-agent-experimental-beta-0304` no es compatible con la ruta del proveedor xAI normal porque requiere una superficie API upstream diferente que el transporte estándar xAI de OpenClaw.

## Notas

- OpenClaw aplica automáticamente correcciones de compatibilidad de esquema de herramientas y llamadas a herramientas específicas de xAI en la ruta de ejecución compartida.
- Las solicitudes nativas de xAI usan `tool_stream: true` de forma predeterminada. Establezca
  `agents.defaults.models["xai/<model>"].params.tool_stream` en `false` para
  desactivarlo.
- El contenedor xAI incluido elimina las banderas de esquema de herramienta estrictas no compatibles y las claves de carga útil de razonamiento antes de enviar solicitudes nativas de xAI.
- `web_search`, `x_search` y `code_execution` se exponen como herramientas de OpenClaw. OpenClaw habilita la herramienta integrada específica de xAI que necesita dentro de cada solicitud de herramienta en lugar de adjuntar todas las herramientas nativas a cada turno de chat.
- `x_search` y `code_execution` son propiedad del complemento xAI incluido en lugar de estar codificadas en el tiempo de ejecución del modelo central.
- `code_execution` es ejecución remota en sandbox xAI, no [`exec`](/en/tools/exec) local.
- Para obtener una descripción general más amplia de los proveedores, consulte [Model providers](/en/providers/index).
