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

## Catálogo actual de modelos incluidos

OpenClaw ahora incluye estas familias de modelos de xAI de fábrica:

- `grok-4`, `grok-4-0709`
- `grok-4-fast-reasoning`, `grok-4-fast-non-reasoning`
- `grok-4-1-fast-reasoning`, `grok-4-1-fast-non-reasoning`
- `grok-4.20-experimental-beta-0304-reasoning`
- `grok-4.20-experimental-beta-0304-non-reasoning`
- `grok-code-fast-1`

El complemento también resuelve hacia adelante los ids `grok-4*` y `grok-code-fast*` más recientes cuando
siguen la misma forma de API.

## Búsqueda web

El proveedor de búsqueda web `grok` incluido también usa `XAI_API_KEY`:

```bash
openclaw config set tools.web.search.provider grok
```

## Límites conocidos

- Hoy la autenticación es solo mediante clave de API. Aún no hay un flujo OAuth / código de dispositivo de xAI en OpenClaw.
- `grok-4.20-multi-agent-experimental-beta-0304` no es compatible con la ruta normal del proveedor xAI porque requiere una superficie de API upstream diferente que el transporte estándar de OpenClaw xAI.
- Las herramientas nativas del lado del servidor de xAI, como `x_search` y `code_execution`, aún no son funciones de primera clase del proveedor de modelos en el complemento incluido.

## Notas

- OpenClaw aplica correcciones de compatibilidad de esquemas de herramientas y llamadas a herramientas específicas de xAI automáticamente en la ruta de ejecución compartida.
- Para obtener una visión general más amplia de los proveedores, consulte [Proveedores de modelos](/es/providers/index).

import es from "/components/footer/es.mdx";

<es />
