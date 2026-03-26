---
summary: "Schéma et exemples de configuration des Skills"
read_when:
  - Adding or modifying skills config
  - Adjusting bundled allowlist or install behavior
title: "Skills Config"
---

# Skills Config

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
plus le `image_generate` tool central. `skills.entries.*` est destiné uniquement aux flux de travail
de compétences personnalisés ou tiers.

Exemples :

- Configuration native de style Nano Banana : `agents.defaults.imageGenerationModel.primary: "google/gemini-3-pro-image-preview"`
- Configuration native de fal : `agents.defaults.imageGenerationModel.primary: "fal/fal-ai/flux/dev"`

## Champs

- `allowBundled` : liste d'autorisation (allowlist) facultative pour les compétences **intégrées** uniquement. Si définie, seules
  les compétences intégrées de la liste sont éligibles (les compétences gérées/espace de travail ne sont pas concernées).
- `load.extraDirs` : répertoires de compétences supplémentaires à scanner (priorité la plus basse).
- `load.watch` : surveiller les dossiers de compétences et actualiser l'instantané des compétences (par défaut : true).
- `load.watchDebounceMs` : délai (debounce) pour les événements de surveillance des compétences en millisecondes (par défaut : 250).
- `install.preferBrew` : privilégier les programmes d'installation brew lorsqu'ils sont disponibles (par défaut : true).
- `install.nodeManager` : préférence du programme d'installation de node (`npm` | `pnpm` | `yarn` | `bun`, par défaut : npm).
  Cela n'affecte que les **installations de compétences** (skill installs) ; l'exécution du Gateway doit toujours être Node
  (Bun non recommandé pour WhatsApp/Telegram).
- `entries.<skillKey>` : remplacements par compétence.

Champs par compétence :

- `enabled` : définissez `false` pour désactiver une compétence même si elle est groupée/installée.
- `env` : variables d'environnement injectées pour l'exécution de l'agent (seulement si pas déjà définies).
- `apiKey` : commodité optionnelle pour les compétences qui déclarent une env var principale. Prend en charge les chaînes en texte brut ou les objets SecretRef (`{ source, provider, id }`).

## Notes

- Les clés sous `entries` correspondent au nom de la compétence par défaut. Si une compétence définit `metadata.openclaw.skillKey`, utilisez cette clé à la place.
- Les modifications apportées aux compétences sont prises en compte au prochain tour de l'agent lorsque l'observateur est activé.

### Compétences sandboxed + env vars

Lorsqu'une session est **sandboxed**, les processus de compétence s'exécutent dans Docker. Le bac à sable n'hérite **pas** du `process.env` de l'hôte.

Utilisez l'une des options suivantes :

- `agents.defaults.sandbox.docker.env` (ou `agents.list[].sandbox.docker.env` par agent)
- intégrer l'env dans votre image de bac à sable personnalisée

Les `env` et `skills.entries.<skill>.env/apiKey` globaux s'appliquent uniquement aux exécutions sur l'**hôte**.

import fr from "/components/footer/fr.mdx";

<fr />
