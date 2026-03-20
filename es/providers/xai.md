---
summary: "Usar modelos Grok de xAI en OpenClaw"
read_when:
  - Quieres usar modelos Grok en OpenClaw
  - Estás configurando la autenticación de xAI o los IDs de modelo
title: "xAI"
---

# xAI

OpenClaw incluye un complemento de proveedor integrado `xai` para modelos Grok.

## Configuración

1. Crea una clave API en la consola de xAI.
2. Establece `XAI_API_KEY`, o ejecuta:

```bash
openclaw onboard --auth-choice xai-api-key
```

3. Elige un modelo como:

```json5
{
  agents: { defaults: { model: { primary: "xai/grok-4" } } },
}
```

## Catálogo de modelos integrados actuales

OpenClaw ahora incluye estas familias de modelos de xAI de fábrica:

- `grok-4`, `grok-4-0709`
- `grok-4-fast-reasoning`, `grok-4-fast-non-reasoning`
- `grok-4-1-fast-reasoning`, `grok-4-1-fast-non-reasoning`
- `grok-4.20-experimental-beta-0304-reasoning`
- `grok-4.20-experimental-beta-0304-non-reasoning`
- `grok-code-fast-1`

El complemento también resuelve hacia adelante IDs más nuevos de `grok-4*` y `grok-code-fast*` cuando
siguen la misma forma de API.

## Búsqueda web

El proveedor de búsqueda web `grok` integrado también usa `XAI_API_KEY`:

```bash
openclaw config set tools.web.search.provider grok
```

## Límites conocidos

- Hoy la autenticación es solo mediante clave API. Todavía no hay flujo de OAuth/código de dispositivo de xAI en OpenClaw.
- `grok-4.20-multi-agent-experimental-beta-0304` no es compatible con la ruta del proveedor xAI normal porque requiere una superficie de API ascendente diferente a la del transporte xAI estándar de OpenClaw.
- Las herramientas nativas del lado del servidor de xAI, como `x_search` y `code_execution`, aún no son características de primera clase del proveedor de modelos en el complemento integrado.

## Notas

- OpenClaw aplica correcciones de compatibilidad de esquemas de herramientas y llamadas a herramientas específicas de xAI automáticamente en la ruta de ejecución compartida.
- Para una visión general más amplia de los proveedores, consulta [Proveedores de modelos](/es/providers/index).

import en from "/components/footer/en.mdx";

<en />
