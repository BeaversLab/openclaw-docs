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
- `grok-4.20-reasoning`, `grok-4.20-non-reasoning`
- `grok-code-fast-1`

El complemento también resuelve directamente los ids más nuevos de `grok-4*` y `grok-code-fast*` cuando
siguen la misma forma de API.

## Búsqueda web

El proveedor de búsqueda web `grok` incluido también usa `XAI_API_KEY`:

```bash
openclaw config set tools.web.search.provider grok
```

## Límites conocidos

- Hoy la autenticación es solo mediante clave de API. Todavía no hay flujo OAuth/código de dispositivo de xAI en OpenClaw.
- `grok-4.20-multi-agent-experimental-beta-0304` no es compatible con la ruta del proveedor normal de xAI porque requiere una superficie de API upstream diferente al transporte estándar de OpenClaw xAI.
- Las herramientas del lado del servidor nativas de xAI, como `x_search` y `code_execution` , aún no son funciones de proveedor de modelo de primera clase en el complemento incluido.

## Notas

- OpenClaw aplica correcciones de compatibilidad específicas de xAI para esquemas de herramientas y llamadas a herramientas automáticamente en la ruta de ejecución compartida.
- Para obtener una visión general más amplia de los proveedores, consulte [Proveedores de modelos](/es/providers/index).

import es from "/components/footer/es.mdx";

<es />
