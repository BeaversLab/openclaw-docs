---
summary: "Schéma de configuration des Skills et exemples"
read_when:
  - Ajout ou modification de la configuration des Skills
  - Ajustement de la liste d'autorisation groupée ou du comportement d'installation
title: "Configuration des Skills"
---

# Configuration des Skills

Toute la configuration liée aux Skills se trouve sous `skills` dans `~/.openclaw/openclaw.json`.

```json5
{
  skills: {
    allowBundled: ["gemini", "peekaboo"],
    load: {
      extraDirs: ["~/Projects/agent-scripts/skills", "~/Projects/oss/some-skill-pack/skills"],
      watch: true,
      watchDebounceMs: 250,
    },
    install: {
      preferBrew: true,
      nodeManager: "npm", // npm | pnpm | yarn | bun (Gateway runtime still Node; bun not recommended)
    },
    entries: {
      "image-lab": {
        enabled: true,
        apiKey: { source: "env", provider: "default", id: "GEMINI_API_KEY" }, // or plaintext string
        env: {
          GEMINI_API_KEY: "GEMINI_KEY_HERE",
        },
      },
      peekaboo: { enabled: true },
      sag: { enabled: false },
    },
  },
}
```

Pour la génération/édition d'images intégrée, privilégiez `agents.defaults.imageGenerationModel`
plus l'outil central `image_generate`. `skills.entries.*` est réservé uniquement
aux workflows de Skills personnalisés ou tiers.

Exemples :

- Configuration native style Nano Banana : `agents.defaults.imageGenerationModel.primary: "google/gemini-3-pro-image-preview"`
- Configuration native fal : `agents.defaults.imageGenerationModel.primary: "fal/fal-ai/flux/dev"`

## Champs

- `allowBundled` : liste d'autorisation optionnelle uniquement pour les Skills **groupés**. Lorsqu'elle est définie, seuls
  les Skills groupés de la liste sont éligibles (les Skills gérés/espace de travail ne sont pas affectés).
- `load.extraDirs` : répertoires de Skills supplémentaires à scanner (priorité la plus basse).
- `load.watch` : surveiller les dossiers de Skills et actualiser l'instantané des Skills (par défaut : true).
- `load.watchDebounceMs` : délai anti-rebond pour les événements du watcher de Skills en millisecondes (par défaut : 250).
- `install.preferBrew` : privilégier les installateurs brew lorsqu'ils sont disponibles (par défaut : true).
- `install.nodeManager` : préférence d'installateur de nœud (`npm` | `pnpm` | `yarn` | `bun`, par défaut : npm).
  Cela n'affecte que les **installations de Skills** ; l'exécution du Gateway doit toujours être Node
  (Bun non recommandé pour WhatsApp/Telegram).
- `entries.<skillKey>` : remplacements par Skill.

Champs par Skill :

- `enabled` : définir `false` pour désactiver un Skill même s'il est groupé/installé.
- `env` : variables d'environnement injectées pour l'exécution de l'agent (uniquement si non déjà définies).
- `apiKey` : commodité optionnelle pour les Skills qui déclarent une env var principale.
  Prend en charge une chaîne en texte brut ou un objet SecretRef (`{ source, provider, id }`).

## Notes

- Les clés sous `entries` correspondent au nom du Skill par défaut. Si un Skill définit
  `metadata.openclaw.skillKey`, utilisez plutôt cette clé.
- Les modifications apportées aux compétences sont prises en compte au prochain tour de l'agent lorsque l'observateur est activé.

### Compétences sandboxed + env vars

Lorsqu'une session est **sandboxed**, les processus de compétence s'exécutent à l'intérieur de Docker. Le bac à sable **n'hérite pas** de la variable d'environnement hôte `process.env`.

Utilisez l'une des options suivantes :

- `agents.defaults.sandbox.docker.env` (ou `agents.list[].sandbox.docker.env` par agent)
- intégrer l'env dans votre image de bac à sable personnalisée

Le `env` global et le `skills.entries.<skill>.env/apiKey` global ne s'appliquent qu'aux exécutions sur l'**hôte**.

import en from "/components/footer/en.mdx";

<en />
