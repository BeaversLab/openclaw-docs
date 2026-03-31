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
2. Configure `XAI_API_KEY`, o ejecute:

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
`XAI_API_KEY` también puede impulsar `web_search` con respaldo de Grok, `x_search` de primera clase,
y `code_execution` remotos.
Si almacena una clave de xAI bajo `plugins.entries.xai.config.webSearch.apiKey`,
el proveedor de modelo xAI incluido ahora también reutiliza esa clave como alternativa.
El ajuste de `code_execution` se encuentra bajo `plugins.entries.xai.config.codeExecution`.

## Catálogo de modelos incluidos actual

OpenClaw ahora incluye estas familias de modelos xAI de forma predeterminada:

- `grok-4`, `grok-4-0709`
- `grok-4-fast-reasoning`, `grok-4-fast-non-reasoning`
- `grok-4-1-fast-reasoning`, `grok-4-1-fast-non-reasoning`
- `grok-4.20-reasoning`, `grok-4.20-non-reasoning`
- `grok-code-fast-1`

El complemento también resuelve hacia adelante los ids de `grok-4*` y `grok-code-fast*` más recientes cuando
siguen la misma forma de API.

## Búsqueda web

El proveedor de búsqueda web `grok` incluido también usa `XAI_API_KEY`:

```bash
openclaw config set tools.web.search.provider grok
```

## Límites conocidos

- Hoy la autenticación es solo mediante clave de API. Aún no hay un flujo OAuth / código de dispositivo de xAI en OpenClaw.
- `grok-4.20-multi-agent-experimental-beta-0304` no es compatible con la ruta del proveedor xAI normal porque requiere una superficie de API upstream diferente a la del transporte xAI estándar de OpenClaw.

## Notas

- OpenClaw aplica correcciones de compatibilidad específicas de xAI para esquemas de herramientas y llamadas a herramientas automáticamente en la ruta de ejecución compartida.
- `web_search`, `x_search` y `code_execution` se exponen como herramientas de OpenClaw. OpenClaw habilita la función integrada específica de xAI que necesita dentro de cada solicitud de herramienta en lugar de adjuntar todas las herramientas nativas a cada turno de chat.
- `x_search` y `code_execution` son propiedad del complemento xAI incluido en lugar de estar codificados en el tiempo de ejecución del modelo central.
- `code_execution` es la ejecución remota en el entorno seguro de xAI, no [`exec`](/en/tools/exec) local.
- Para obtener una descripción general más amplia de los proveedores, consulte [Proveedores de modelos](/en/providers/index).
