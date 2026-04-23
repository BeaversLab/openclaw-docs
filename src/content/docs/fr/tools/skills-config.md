---
summary: "Schéma et exemples de configuration des compétences"
read_when:
  - Adding or modifying skills config
  - Adjusting bundled allowlist or install behavior
title: "Configuration des compétences"
---

# Skills Config

La plupart de la configuration du chargeur/d'installation des compétences se trouve sous `skills` dans
`~/.openclaw/openclaw.json`. La visibilité des compétences spécifiques à l'agent se trouve sous
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
plus l'outil central `image_generate`. `skills.entries.*` est uniquement pour les flux de travail
de compétences personnalisés ou tiers.

Si vous sélectionnez un fournisseur/modèle d'image spécifique, configurez également la clé d'authentification/API de ce fournisseur.
Exemples typiques : `GEMINI_API_KEY` ou `GOOGLE_API_KEY` pour
`google/*`, `OPENAI_API_KEY` pour `openai/*`, et `FAL_KEY` pour `fal/*`.

Exemples :

- Configuration native style Nano Banana : `agents.defaults.imageGenerationModel.primary: "google/gemini-3.1-flash-image-preview"`
- Configuration native fal : `agents.defaults.imageGenerationModel.primary: "fal/fal-ai/flux/dev"`

## Listes d'autorisation des compétences de l'agent

Utilisez la configuration de l'agent lorsque vous souhaitez les mêmes racines de compétences machine/espace de travail, mais un
ensemble de compétences visible différent pour chaque agent.

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
- Omettez `agents.defaults.skills` pour laisser les compétences non restreintes par défaut.
- `agents.list[].skills` : ensemble final explicite de compétences pour cet agent ; il ne fusionne pas
  avec les valeurs par défaut.
- `agents.list[].skills: []` : n'exposer aucune compétence pour cet agent.

## Champs

- Les racines de compétences intégrées incluent toujours `~/.openclaw/skills`, `~/.agents/skills`,
  `<workspace>/.agents/skills`, et `<workspace>/skills`.
- `allowBundled` : liste d'autorisation facultative pour les compétences **intégrées** uniquement. Lorsqu'elle est définie, seules
  les compétences intégrées de la liste sont éligibles (les compétences gérées, d'agent et d'espace de travail ne sont pas affectées).
- `load.extraDirs` : répertoires de compétences supplémentaires à analyser (priorité la plus basse).
- `load.watch` : surveiller les dossiers de compétences et actualiser l'instantané des compétences (par défaut : true).
- `load.watchDebounceMs` : délai d'attente (debounce) pour les événements du surveillant de compétences en millisecondes (par défaut : 250).
- `install.preferBrew` : préférer les installateurs brew lorsqu'ils sont disponibles (par défaut : true).
- `install.nodeManager` : préférence d'installateur node (`npm` | `pnpm` | `yarn` | `bun`, par défaut : npm).
  Cela n'affecte que les **installations de compétences** ; le runtime Gateway doit toujours être Node
  (Bun non recommandé pour WhatsApp/Telegram).
  - `openclaw setup --node-manager` est plus restreint et accepte actuellement `npm`,
    `pnpm` ou `bun`. Définissez `skills.install.nodeManager: "yarn"` manuellement si vous
    souhaitez des installations de compétences basées sur Yarn.
- `entries.<skillKey>` : substitutions par compétence.
- `agents.defaults.skills` : liste d'autorisation de compétences (allowlist) par défaut optionnelle héritée par les agents
  qui omettent `agents.list[].skills`.
- `agents.list[].skills` : liste d'autorisation de compétences finale par agent optionnelle ; les listes
  explicites remplacent les valeurs par défaut héritées au lieu de fusionner.

Champs par compétence :

- `enabled` : définissez `false` pour désactiver une compétence même si elle est groupée/installée.
- `env` : variables d'environnement injectées pour l'exécution de l'agent (seulement si non déjà définies).
- `apiKey` : commodité optionnelle pour les compétences qui déclarent une variable d'environnement principale.
  Prend en charge une chaîne en texte brut ou un objet SecretRef (`{ source, provider, id }`).

## Notes

- Les clés sous `entries` correspondent au nom de la compétence par défaut. Si une compétence définit
  `metadata.openclaw.skillKey`, utilisez plutôt cette clé.
- La priorité de chargement est `<workspace>/skills` → `<workspace>/.agents/skills` →
  `~/.agents/skills` → `~/.openclaw/skills` → compétences groupées (bundled) →
  `skills.load.extraDirs`.
- Les modifications apportées aux compétences sont prises en compte au prochain tour de l'agent lorsque le surveillant est activé.

### Compétences sandboxed + variables d'environnement

Lorsqu'une session est **sandboxed**, les processus de compétences s'exécutent dans le backend de sandbox configuré. La sandbox **n'hérite pas** de la variable d'environnement hôte `process.env`.

Utilisez l'une des options suivantes :

- `agents.defaults.sandbox.docker.env` pour le backend Docker (ou `agents.list[].sandbox.docker.env` par agent)
- intégrez l'environnement dans votre image de sandbox personnalisée ou dans l'environnement de sandbox distant

Les `env` et `skills.entries.<skill>.env/apiKey` globaux s'appliquent uniquement aux exécutions sur l'**hôte**.
