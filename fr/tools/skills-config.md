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
      "nano-banana-pro": {
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

## Champs

- `allowBundled` : liste d'autorisation (allowlist) optionnelle pour les **bundled** skills uniquement. Lorsqu'elle est définie, seuls les bundled skills de la liste sont éligibles (les managed/workspace skills ne sont pas affectés).
- `load.extraDirs` : répertoires de skills supplémentaires à scanner (la priorité la plus basse).
- `load.watch` : surveiller les dossiers de skills et rafraîchir l'instantané des skills (par défaut : true).
- `load.watchDebounceMs` : délai (debounce) pour les événements du watcher de skills en millisecondes (par défaut : 250).
- `install.preferBrew` : préférer les installateurs brew lorsqu'ils sont disponibles (par défaut : true).
- `install.nodeManager` : préférence d'installateur node (`npm` | `pnpm` | `yarn` | `bun`, par défaut : npm).
  Cela n'affecte que les **installations de skills** ; le runtime du Gateway doit toujours être Node
  (Bun non recommandé pour WhatsApp/Telegram).
- `entries.<skillKey>` : substitutions par skill.

Champs par skill :

- `enabled` : définir `false` pour désactiver un skill même s'il est bundle/installed.
- `env` : variables d'environnement injectées pour l'exécution de l'agent (seulement si elles ne sont pas déjà définies).
- `apiKey` : commodité optionnelle pour les skills qui déclarent une env var primaire.
  Prend en charge une chaîne en clair ou un objet SecretRef (`{ source, provider, id }`).

## Notes

- Les clés sous `entries` correspondent au nom du skill par défaut. Si un skill définit
  `metadata.openclaw.skillKey`, utilisez plutôt cette clé.
- Les modifications apportées aux skills sont prises en compte au prochain tour de l'agent lorsque le watcher est activé.

### Sandboxed skills + env vars

Lorsqu'une session est **sandboxed**, les processus des compétences s'exécutent dans Docker. Le bac à sable n'hérite **pas** du `process.env` de l'hôte.

Utilisez l'une des options suivantes :

- `agents.defaults.sandbox.docker.env` (ou `agents.list[].sandbox.docker.env` par agent)
- intégrer les variables d'environnement dans votre image de bac à sable personnalisée

Les `env` et `skills.entries.<skill>.env/apiKey` globaux ne s'appliquent qu'aux exécutions sur l'**hôte**.

import fr from "/components/footer/fr.mdx";

<fr />
