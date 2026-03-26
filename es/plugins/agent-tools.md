---
summary: "Escribir herramientas de agente en un complemento (esquemas, herramientas opcionales, listas de permitidos)"
read_when:
  - You want to add a new agent tool in a plugin
  - You need to make a tool opt-in via allowlists
title: "Herramientas de agente de complemento"
---

# Herramientas de agente de complemento

Los complementos de OpenClaw pueden registrar **herramientas de agente** (funciones de esquema JSON) que se exponen
al LLM durante las ejecuciones del agente. Las herramientas pueden ser **obligatorias** (siempre disponibles) u
**opcionales** (optativas).

Las herramientas de agente se configuran bajo `tools` en la configuración principal, o por agente bajo
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

Habilite las herramientas opcionales en `agents.list[].tools.allow` (o global `tools.allow`):

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

Otros ajustes de configuración que afectan la disponibilidad de herramientas:

- Las listas de permitidos que solo nombran herramientas de complemento se tratan como optativas de complemento; las herramientas básicas permanecen
  habilitadas a menos que también incluya herramientas básicas o grupos en la lista de permitidos.
- `tools.profile` / `agents.list[].tools.profile` (lista de permitidos base)
- `tools.byProvider` / `agents.list[].tools.byProvider` (permitir/denegar específico del proveedor)
- `tools.sandbox.tools.*` (política de herramientas de espacio aislado cuando está en espacio aislado)

## Reglas + consejos

- Los nombres de las herramientas **no** deben entrar en conflicto con los nombres de las herramientas básicas; se omiten las herramientas conflictivas.
- Los ids de complemento utilizados en las listas de permitidos no deben entrar en conflicto con los nombres de las herramientas básicas.
- Prefiera `optional: true` para las herramientas que desencadenan efectos secundarios o requieren
  binarios/credenciales adicionales.

import es from "/components/footer/es.mdx";

<es />
