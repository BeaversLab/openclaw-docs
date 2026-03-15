---
summary: "Écrire des outils d'agent dans un plugin (schémas, outils facultatifs, listes d'autorisation)"
read_when:
  - You want to add a new agent tool in a plugin
  - You need to make a tool opt-in via allowlists
title: "Outils d'agent de plugin"
---

# Outils d'agent de plugin

Les plugins OpenClaw peuvent enregistrer des **outils d'agent** (fonctions JSON‑schema) qui sont exposés
au LLM lors des exécutions d'agent. Les outils peuvent être **requis** (toujours disponibles) ou
**facultatifs** (opt‑in).

Les outils d'agent sont configurés sous `tools` dans la configuration principale, ou par agent sous
`agents.list[].tools`. La stratégie de liste d'autorisation/liste de refus contrôle les outils que l'agent
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

## Outil facultatif (opt‑in)

Les outils facultatifs ne sont **jamais** activés automatiquement. Les utilisateurs doivent les ajouter à une liste
d'autorisation d'agent.

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

Activer les outils facultatifs dans `agents.list[].tools.allow` (ou `tools.allow` global) :

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

- Les listes d'autorisation qui ne nomment que des outils de plugin sont traitées comme des opt-ins de plugin ; les outils de base restent
  activés sauf si vous incluez également des outils ou groupes de base dans la liste d'autorisation.
- `tools.profile` / `agents.list[].tools.profile` (liste d'autorisation de base)
- `tools.byProvider` / `agents.list[].tools.byProvider` (autorisation/refus spécifique au fournisseur)
- `tools.sandbox.tools.*` (stratégie d'outil de bac à sable lors de l'utilisation en bac à sable)

## Règles + astuces

- Les noms d'outils ne doivent **pas** entrer en conflit avec les noms des outils de base ; les outils en conflit sont ignorés.
- Les identifiants de plugin utilisés dans les listes d'autorisation ne doivent pas entrer en conflit avec les noms des outils de base.
- Privilégiez `optional: true` pour les outils qui déclenchent des effets secondaires ou nécessitent des
  binaires/identifiants supplémentaires.

import fr from '/components/footer/fr.mdx';

<fr />
