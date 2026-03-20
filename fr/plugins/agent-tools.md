---
summary: "Écrire des outils d'agent dans un plugin (schémas, outils optionnels, listes d'autorisation)"
read_when:
  - Vous souhaitez ajouter un nouvel outil d'agent dans un plugin
  - Vous devez rendre un outil optionnel via des listes d'autorisation
title: "Plugin Agent Tools"
---

# Outils d'agent de plugin

Les plugins OpenClaw peuvent enregistrer des **outils d'agent** (fonctions JSON‑schema) qui sont exposés
au LLM lors des exécutions d'agent. Les outils peuvent être **requis** (toujours disponibles) ou
**optionnels** (opt‑in).

Les outils d'agent sont configurés sous `tools` dans la configuration principale, ou par agent sous
`agents.list[].tools`. La stratégie de liste d'autorisation/de refus contrôle les outils que l'agent
peut appeler.

## Outil de base

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

## Outil optionnel (opt-in)

Les outils optionnels ne sont **jamais** activés automatiquement. Les utilisateurs doivent les ajouter à une
liste d'autorisation d'agent.

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

Activer les outils optionnels dans `agents.list[].tools.allow` (ou `tools.allow` global) :

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

Autres paramètres de configuration affectant la disponibilité des outils :

- Les listes d'autorisation qui ne nomment que des outils de plugin sont traitées comme des opt-ins de plugin ; les outils principaux restent
activés sauf si vous incluez également des outils ou groupes principaux dans la liste d'autorisation.
- `tools.profile` / `agents.list[].tools.profile` (liste d'autorisation de base)
- `tools.byProvider` / `agents.list[].tools.byProvider` (autorisation/refus spécifique au provider)
- `tools.sandbox.tools.*` (stratégie d'outil de bac à sable lorsque sandboxed)

## Règles + conseils

- Les noms d'outils ne doivent **pas** entrer en conflit avec les noms des outils principaux ; les outils en conflit sont ignorés.
- Les IDs de plugin utilisés dans les listes d'autorisation ne doivent pas entrer en conflit avec les noms des outils principaux.
- Privilégiez `optional: true` pour les outils qui déclenchent des effets secondaires ou nécessitent des
binaires/identifiants supplémentaires.

import en from "/components/footer/en.mdx";

<en />
