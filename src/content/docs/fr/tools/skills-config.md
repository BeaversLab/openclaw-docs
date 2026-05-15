---
summary: "Schéma et exemples de configuration de Skills"
read_when:
  - Adding or modifying skills config
  - Adjusting bundled allowlist or install behavior
title: "Configuration de Skills"
---

La plupart de la configuration du chargeur/de l'installation de Skills se trouve sous `skills` dans `~/.openclaw/openclaw.json`. La visibilité des Skills spécifiques aux agents se trouve sous `agents.defaults.skills` et `agents.list[].skills`.

```json5
{
  skills: {
    allowBundled: ["gemini", "peekaboo"],
    load: {
      extraDirs: ["~/Projects/agent-scripts/skills", "~/Projects/oss/some-skill-pack/skills"],
      allowSymlinkTargets: ["~/Projects/manager/skills"],
      watch: true,
      watchDebounceMs: 250,
    },
    install: {
      preferBrew: true,
      nodeManager: "npm", // npm | pnpm | yarn | bun (Gateway runtime still Node; bun not recommended)
      allowUploadedArchives: false,
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

Pour la génération/édition d'images intégrée, privilégiez `agents.defaults.imageGenerationModel` plus l'outil `image_generate` principal. `skills.entries.*` est uniquement destiné aux workflows de Skills personnalisés ou tiers.

Si vous sélectionnez un provider/model d'image spécifique, configurez également la clé d'auth/API de ce provider. Exemples typiques : `GEMINI_API_KEY` ou `GOOGLE_API_KEY` pour `google/*`, `OPENAI_API_KEY` pour `openai/*`, et `FAL_KEY` pour `fal/*`.

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

- `agents.defaults.skills` : liste d'autorisation de référence partagée pour les agents qui omettent `agents.list[].skills`.
- Omettez `agents.defaults.skills` pour laisser les Skills non restreints par défaut.
- `agents.list[].skills` : ensemble final explicite de Skills pour cet agent ; il ne fusionne pas avec les valeurs par défaut.
- `agents.list[].skills: []` : n'expose aucun Skill pour cet agent.

## Champs

- Les racines de Skills intégrées incluent toujours `~/.openclaw/skills`, `~/.agents/skills`, `<workspace>/.agents/skills` et `<workspace>/skills`.
- `allowBundled` : liste d'autorisation facultative pour les Skills **groupés** uniquement. Lorsqu'elle est définie, seuls les Skills groupés dans la liste sont éligibles (les Skills gérés, d'agent et d'espace de travail ne sont pas concernés).
- `load.extraDirs` : répertoires de Skills supplémentaires à analyser (la priorité la plus basse).
- `load.allowSymlinkTargets` : répertoires cibles réels approuvés vers lesquels les dossiers de Skills liés par lien symbolique peuvent être résolus, même lorsque le lien symbolique se trouve en dehors de cette racine cible. Utilisez ceci pour des dispositions intentionnelles de dépôts frères, comme `~/.agents/skills/manager -> ~/Projects/manager/skills`.
- `load.watch` : surveiller les dossiers de compétences et actualiser l'instantané des compétences (par défaut : true).
- `load.watchDebounceMs` : délai anti-rebond (debounce) pour les événements du surveillant de compétences en millisecondes (par défaut : 250).
- `install.preferBrew` : préférer les installateurs brew lorsqu'ils sont disponibles (par défaut : true).
- `install.nodeManager` : préférence d'installateur node (`npm` | `pnpm` | `yarn` | `bun`, par défaut : npm).
  Cela n'affecte que les **installations de compétences** ; le runtime Gateway doit toujours être Node
  (Bun n'est pas recommandé pour WhatsApp/Telegram).
  - `openclaw setup --node-manager` est plus restreint et accepte actuellement `npm`,
    `pnpm` ou `bun`. Définissez `skills.install.nodeManager: "yarn"` manuellement si vous
    souhaitez des installations de compétences basées sur Yarn.
- `install.allowUploadedArchives``operator.admin` : autoriser les clients Gateway de confiance
  à installer des archives zip privées mises en scène via `skills.upload.*`
  (par défaut : false). Cela n'active que le chemin des archives téléchargées ; les installations ClawHub
  normales ne l'exigent pas.
- `entries.<skillKey>` : remplacements par compétence.
- `agents.defaults.skills` : liste d'autorisation de compétences par défaut optionnelle héritée par les agents
  qui omettent `agents.list[].skills`.
- `agents.list[].skills` : liste d'autorisation finale des compétences par agent optionnelle ; les listes
  explicites remplacent les valeurs par défaut héritées au lieu de fusionner.

## Dépôts frères liés symboliquement

Par défaut, chaque racine de compétence est une limite de confinement. Si un dossier de compétence sous
`~/.agents/skills` est un lien symbolique qui résout en dehors de `~/.agents/skills`,
OpenClaw l'ignore et enregistre `Skipping escaped skill path outside its configured
root`.

Conservez la disposition des liens symboliques et n'autorisez que la racine cible de confiance :

```json5
{
  skills: {
    load: {
      extraDirs: ["~/Projects/manager/skills"],
      allowSymlinkTargets: ["~/Projects/manager/skills"],
    },
  },
}
```

Avec cette configuration, un lien symbolique tel que
`~/.agents/skills/manager -> ~/Projects/manager/skills` est accepté après
la résolution de realpath. `extraDirs` analyse également directement le dépôt frère, tandis que
`allowSymlinkTargets` préserve le chemin du lien symbolique pour les dispositions de compétences d'agent existantes. Gardez les entrées cibles étroites ; ne pointez pas vers des racines larges telles que `~` ou
`~/Projects` sauf si chaque arborescence de compétences sous cette racine est approuvée.

Champs par compétence :

- `enabled` : définissez `false` pour désactiver une compétence même si elle est groupée/installée.
- `env` : variables d'environnement injectées pour l'exécution de l'agent (seulement si elles ne sont pas déjà définies).
- `apiKey` : commodité facultative pour les compétences qui déclarent une variable d'environnement principale.
  Prend en charge une chaîne en texte brut ou un objet SecretRef (`{ source, provider, id }`).

## Notes

- Les clés sous `entries` correspondent au nom de la compétence par défaut. Si une compétence définit
  `metadata.openclaw.skillKey`, utilisez cette clé à la place.
- La priorité de chargement est `<workspace>/skills` → `<workspace>/.agents/skills` →
  `~/.agents/skills` → `~/.openclaw/skills` → compétences groupées →
  `skills.load.extraDirs`.
- Les modifications apportées aux compétences sont prises en compte au prochain tour de l'agent lorsque l'observateur est activé.

### Compétences sandboxées et variables d'environnement

Lorsqu'une session est **sandboxée**, les processus de compétence s'exécutent dans le backend de sandbox configuré. La sandbox **n'hérite pas** de `process.env` de l'hôte.

<Warning>
  Les `env` et `skills.entries.<skill>.env`/`apiKey` globaux s'appliquent uniquement aux exécutions sur l'**hôte**. À l'intérieur d'une sandbox, ils n'ont aucun effet, une compétence dépendant de `GEMINI_API_KEY` échouera donc avec `apiKey not configured` à moins que la variable ne soit fournie séparément à la sandbox.
</Warning>

Utilisez l'une des options suivantes :

- `agents.defaults.sandbox.docker.env` pour le backend Docker (ou `agents.list[].sandbox.docker.env` par agent).
- Intégrez la variable d'environnement dans votre image de sandbox personnalisée ou votre environnement de sandbox distant.

## Connexes

<CardGroup cols={2}>
  <Card title="Skills" href="/fr/tools/skills" icon="puzzle-piece">
    Ce que sont les compétences et comment elles se chargent.
  </Card>
  <Card title="Créer des compétences" href="/fr/tools/creating-skills" icon="hammer">
    Créer des packs de compétences personnalisés.
  </Card>
  <Card title="Commandes slash" href="/fr/tools/slash-commands" icon="terminal">
    Catalogue de commandes natives et directives de chat.
  </Card>
  <Card title="Référence de configuration" href="/fr/gateway/configuration-reference" icon="gear">
    Schéma complet `skills` et `agents.skills`.
  </Card>
</CardGroup>
