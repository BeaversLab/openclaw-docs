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
- `load.allowSymlinkTargets` : répertoires cibles réels approuvés vers lesquels les dossiers de compétences liés par lien symbolique de l'espace de travail, de l'agent de projet ou du répertoire supplémentaire peuvent être résolus, même lorsque le lien symbolique se trouve en dehors de cette racine cible. Utilisez ceci pour des dispositions intentionnelles de dépôts frères, telles que `<workspace>/skills/manager -> ~/Projects/manager/skills`. Les racines gérées `~/.openclaw/skills` et personnelles `~/.agents/skills` peuvent suivre les liens symboliques des répertoires de compétences provenant des gestionnaires de compétences locaux par défaut, mais chaque `SKILL.md` doit toujours être résolu à l'intérieur de son propre répertoire de compétences.
- `load.watch` : surveiller les dossiers de compétences et actualiser l'instantané des compétences (par défaut : true).
- `load.watchDebounceMs` : délai (debounce) pour les événements de surveillance des compétences en millisecondes (par défaut : 250).
- `install.preferBrew` : privilégier les installateurs brew lorsqu'ils sont disponibles (par défaut : true).
- `install.nodeManager` : préférence de l'installateur Node (`npm` | `pnpm` | `yarn` | `bun`, par défaut : npm).
  Cela n'affecte que **les installations de compétences** ; l'exécution Gateway doit toujours être Node
  (Bun non recommandé pour WhatsApp/Telegram).
  - `openclaw setup --node-manager` est plus restrictif et accepte actuellement `npm`,
    `pnpm` ou `bun`. Définissez `skills.install.nodeManager: "yarn"` manuellement si vous
    souhaitez des installations de compétences basées sur Yarn.
- `install.allowUploadedArchives` : autoriser les clients Gateway de confiance `operator.admin` à installer des archives zip privées mises en scène via `skills.upload.*`
  (par défaut : false). Cela n'active que le chemin de l'archive téléchargée ; les installations ClawHub normales ne l'exigent pas.
- `entries.<skillKey>` : substitutions spécifiques à chaque compétence.
- `agents.defaults.skills` : liste blanche de compétences par défaut facultative héritée par les agents
  qui omettent `agents.list[].skills`.
- `agents.list[].skills` : liste blanche finale de compétences par agent facultative ; les listes
  explicites remplacent les valeurs par défaut héritées au lieu de fusionner.

## Dépôts frères liés symboliquement

Par défaut, les racines des compétences workspace, project-agent, extra-dir et bundled sont des limites de confinement. Si un dossier de compétence sous `<workspace>/skills` est un lien symbolique qui se résout en dehors de `<workspace>/skills`, OpenClaw l'ignore et consigne `Skipping escaped skill path outside its configured root`.

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

Avec cette configuration, un lien symbolique tel que `<workspace>/skills/manager -> ~/Projects/manager/skills` est accepté après la résolution du chemin réel (realpath). `extraDirs` analyse également directement le dépôt frère, tandis que `allowSymlinkTargets` préserve le chemin symbolisé pour les configurations existantes de compétences d'espace de travail. Les répertoires gérés `~/.openclaw/skills` et personnels `~/.agents/skills` acceptent déjà les liens symboliques de répertoires de compétences car ces racines sont des surfaces locales du gestionnaire de compétences appartenant à l'utilisateur ; le confinement par compétence `SKILL.md` s'applique toujours. Gardez les entrées cibles étroites ; ne pointez pas vers des racines larges telles que `~` ou `~/Projects` sauf si chaque arborescence de compétences sous cette racine est approuvée.

Champs par compétence :

- `enabled` : définissez `false` pour désactiver une compétence même si elle est groupée/installée.
- `env` : variables d'environnement injectées pour l'exécution de l'agent (uniquement si elles ne sont pas déjà définies).
- `apiKey` : commodité facultative pour les compétences qui déclarent une variable d'environnement principale.
  Prend en charge une chaîne en texte clair ou un objet SecretRef (`{ source, provider, id }`).

## Notes

- Les clés sous `entries` correspondent au nom de la compétence par défaut. Si une compétence définit `metadata.openclaw.skillKey`, utilisez plutôt cette clé.
- La priorité de chargement est `<workspace>/skills` → `<workspace>/.agents/skills` →
  `~/.agents/skills` → `~/.openclaw/skills` → compétences groupées →
  `skills.load.extraDirs`.
- Les modifications apportées aux compétences sont prises en compte au prochain tour de l'agent lorsque l'observateur est activé.

### Compétences sandboxées et variables d'environnement

Lorsqu'une session est **sandboxed**, les processus de compétence s'exécutent à l'intérieur du backend de bac à sable configuré. Le bac à sable n'hérite **pas** du `process.env` de l'hôte.

<Warning>
  Global `env` and `skills.entries.<skill>.env`/`apiKey` apply to **host** runs only. Inside a sandbox they have no effect, so a skill that depends on `GEMINI_API_KEY` will fail with `apiKey not configured` unless the sandbox is given the variable separately.
</Warning>

Utilisez l'une des options suivantes :

- `agents.defaults.sandbox.docker.env` for the Docker backend (or per-agent `agents.list[].sandbox.docker.env`).
- Intégrez la variable d'environnement dans votre image de sandbox personnalisée ou votre environnement de sandbox distant.

For Docker sandboxes, configured `sandbox.docker.env` values become explicit container environment variables. Users with Docker daemon access can inspect them through Docker metadata, so use a mounted secret file, custom image, or another delivery path when that exposure is not acceptable.

## Related

<CardGroup cols={2}>
  <Card title="Skills" href="/fr/tools/skills" icon="puzzle-piece">
    What skills are and how they load.
  </Card>
  <Card title="Creating skills" href="/fr/tools/creating-skills" icon="hammer">
    Authoring custom skill packs.
  </Card>
  <Card title="Slash commands" href="/fr/tools/slash-commands" icon="terminal">
    Native command catalog and chat directives.
  </Card>
  <Card title="Configuration reference" href="/fr/gateway/configuration-reference" icon="gear">
    Full `skills` and `agents.skills` schema.
  </Card>
</CardGroup>
