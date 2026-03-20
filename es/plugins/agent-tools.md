---
summary: "Escribir herramientas de agente en un complemento (esquemas, herramientas opcionales, listas de permitidos)"
read_when:
  - Desea agregar una nueva herramienta de agente en un complemento
  - Necesita hacer que una herramienta sea opcional mediante listas de permitidos
title: "Herramientas de agente de complemento"
---

# Herramientas de agente de complemento

Los complementos de OpenClaw pueden registrar **herramientas de agente** (funciones de esquema JSON) que se exponen
al LLM durante las ejecuciones de agentes. Las herramientas pueden ser **requeridas** (siempre disponibles) u
**opcionales** (optativas).

Las herramientas de agente se configuran en `tools` en la configuración principal, o por agente en
`agents.list[].tools`. La política de lista de permitidos/denegados controla qué herramientas puede invocar el agente.

## Herramienta básica

```ts
import { Type } from "@sinclair/typebox";

export default function (api) {
  api.registerTool({
    name: "my_tool",
    description: "Do a thing",
    parameters: Type.Object({
      input: Type.String(),
    }),
    async execute(_id, params) {
      return { content: [{ type: "text", text: params.input }] };
    },
  });
}
```

## Herramienta opcional (opt-in)

Las herramientas opcionales **nunca** se habilitan automáticamente. Los usuarios deben agregarlas a una
lista de permitidos del agente.

```ts
export default function (api) {
  api.registerTool(
    {
      name: "workflow_tool",
      description: "Run a local workflow",
      parameters: {
        type: "object",
        properties: {
          pipeline: { type: "string" },
        },
        required: ["pipeline"],
      },
      async execute(_id, params) {
        return { content: [{ type: "text", text: params.pipeline }] };
      },
    },
    { optional: true },
  );
}
```

Habilite herramientas opcionales en `agents.list[].tools.allow` (o en `tools.allow` global):

```json5
{
  agents: {
    list: [
      {
        id: "main",
        tools: {
          allow: [
            "workflow_tool", // specific tool name
            "workflow", // plugin id (enables all tools from that plugin)
            "group:plugins", // all plugin tools
          ],
        },
      },
    ],
  },
}
```

Otras opciones de configuración que afectan la disponibilidad de herramientas:

- Las listas de permitidos que nombran solo herramientas de complemento se tratan como activaciones opcionales de complementos; las herramientas principales permanecen
  habilitadas a menos que también incluya herramientas principales o grupos en la lista de permitidos.
- `tools.profile` / `agents.list[].tools.profile` (lista de permitidos base)
- `tools.byProvider` / `agents.list[].tools.byProvider` (permitir/denegar específico del proveedor)
- `tools.sandbox.tools.*` (política de herramienta de sandbox cuando se está en sandbox)

## Reglas + consejos

- Los nombres de las herramientas **no** deben entrar en conflicto con los nombres de las herramientas principales; las herramientas conflictivas se omiten.
- Los identificadores de complemento utilizados en las listas de permitidos no deben entrar en conflicto con los nombres de las herramientas principales.
- Prefiera `optional: true` para herramientas que desencadenan efectos secundarios o requieren
  binarios/credenciales adicionales.

import es from "/components/footer/es.mdx";

<es />
