---
summary: "Schéma et exemples de configuration des compétences"
read_when:
  - Adding or modifying skills config
  - Adjusting bundled allowlist or install behavior
title: "Configuration des Skills"
---

La plupart de la configuration du chargeur/d'installateur de skills réside sous `skills` dans
`~/.openclaw/openclaw.json`. La visibilité des skills spécifiques aux agents réside sous
`agents.defaults.skills` et `agents.list[].skills`.

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
plus l'outil core `image_generate`. `skills.entries.*` est uniquement destiné aux flux de travail de skills personnalisés ou tiers.

Si vous sélectionnez un provider/model d'image spécifique, configurez également la clé d'auth/API de ce provider.
Exemples typiques : `GEMINI_API_KEY` ou `GOOGLE_API_KEY` pour
`google/*`, `OPENAI_API_KEY` pour `openai/*`, et `FAL_KEY` pour `fal/*`.

Exemples :

- Configuration native style Nano Banana Pro : `agents.defaults.imageGenerationModel.primary: "google/gemini-3-pro-image-preview"`
- Configuration native fal : `agents.defaults.imageGenerationModel.primary: "fal/fal-ai/flux/dev"`

## Listes d'autorisation des skills de l'agent

Utilisez la configuration de l'agent lorsque vous souhaitez les mêmes racines de skills machine/espace de travail, mais un
ensemble de skills visible différent pour chaque agent.

```json5
{
  agents: {
    defaults: {
      skills: ["github", "weather"],
    },
    list: [
      { id: "writer" }, // inherits defaults -> github, weather
      { id: "docs", skills: ["docs-search"] }, // replaces defaults
      { id: "locked-down", skills: [] }, // no skills
    ],
  },
}
```

Règles :

- `agents.defaults.skills` : liste d'autorisation de base partagée pour les agents qui omettent
  `agents.list[].skills`.
- Omettez `agents.defaults.skills` pour laisser les skills sans restriction par défaut.
- `agents.list[].skills` : ensemble final explicite de skills pour cet agent ; il ne fusionne pas
  avec les valeurs par défaut.
- `agents.list[].skills: []` : n'expose aucun skill pour cet agent.

## Champs

- Les racines de skills intégrées incluent toujours `~/.openclaw/skills`, `~/.agents/skills`,
  `<workspace>/.agents/skills` et `<workspace>/skills`.
- `allowBundled` : liste d'autorisation optionnelle pour les skills **bundled** uniquement. Lorsqu'elle est définie, seuls
  les skills bundled dans la liste sont éligibles (les skills gérés, d'agent et d'espace de travail ne sont pas concernés).
- `load.extraDirs` : répertoires de skills supplémentaires à scanner (priorité la plus basse).
- `load.watch` : surveiller les dossiers de skills et rafraîchir l'instantané des skills (par défaut : true).
- `load.watchDebounceMs` : délai (debounce) pour les événements du surveillant de skills en millisecondes (par défaut : 250).
- `install.preferBrew` : privilégiez les installateurs brew lorsqu'ils sont disponibles (par défaut : true).
- `install.nodeManager` : préférence d'installateur node (`npm` | `pnpm` | `yarn` | `bun`, par défaut : npm).
  Cela n'affecte que les **installations de compétences** ; l'exécution du Gateway doit toujours être Node
  (Bun non recommandé pour WhatsApp/Telegram).
  - `openclaw setup --node-manager` est plus restrictif et accepte actuellement `npm`,
    `pnpm`, ou `bun`. Définissez `skills.install.nodeManager: "yarn"` manuellement si vous
    souhaitez des installations de compétences basées sur Yarn.
- `entries.<skillKey>` : substitutions spécifiques à chaque compétence.
- `agents.defaults.skills` : liste d'autorisation (allowlist) de compétences par défaut facultative héritée par les agents
  qui omettent `agents.list[].skills`.
- `agents.list[].skills` : liste d'autorisation (allowlist) finale de compétences par agent, facultative ; les listes
  explicites remplacent les valeurs par défaut héritées au lieu de fusionner.

Champs spécifiques à chaque compétence :

- `enabled` : définissez `false` pour désactiver une compétence même si elle est groupée/installée.
- `env` : variables d'environnement injectées pour l'exécution de l'agent (seulement si elles ne sont pas déjà définies).
- `apiKey` : commodité facultative pour les compétences qui déclarent une variable d'environnement principale.
  Prend en charge une chaîne en clair ou un objet SecretRef (`{ source, provider, id }`).

## Notes

- Les clés sous `entries` correspondent au nom de la compétence par défaut. Si une compétence définit
  `metadata.openclaw.skillKey`, utilisez plutôt cette clé.
- La priorité de chargement est `<workspace>/skills` → `<workspace>/.agents/skills` →
  `~/.agents/skills` → `~/.openclaw/skills` → compétences groupées →
  `skills.load.extraDirs`.
- Les modifications apportées aux compétences sont prises en compte au prochain tour de l'agent lorsque l'observateur (watcher) est activé.

### Compétences sandboxed + env vars

Lorsqu'une session est **sandboxed**, les processus de compétence s'exécutent dans le backend de bac à sable (sandbox) configuré. Le bac à sable n'hérite **pas** des variables d'hôte `process.env`.

Utilisez l'une des options suivantes :

- `agents.defaults.sandbox.docker.env` pour le backend Docker (ou `agents.list[].sandbox.docker.env` par agent)
- intégrer l'environnement dans votre image de bac à sable personnalisée ou l'environnement de bac à sable distant

Les `env` et `skills.entries.<skill>.env/apiKey` globaux s'appliquent uniquement aux exécutions **hôte**.

## Connexes

- [Skills](/fr/tools/skills)
- [Creating skills](/fr/tools/creating-skills)
- [Slash commands](/fr/tools/slash-commands)
