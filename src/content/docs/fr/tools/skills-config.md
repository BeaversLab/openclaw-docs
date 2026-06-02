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
    workshop: {
      autonomous: {
        enabled: false,
      },
      approvalPolicy: "pending", // pending | auto
      maxPending: 50,
      maxSkillBytes: 40000,
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
- `workshop.autonomous.enabled` : autoriser les agents à créer des propositions de Skill Workshop en attente à partir de signaux de conversation durables après des tours réussis (par défaut : false). La création de compétences déclenchée par l'utilisateur passe toujours par Skill Workshop.
- `workshop.approvalPolicy` : stratégie de cycle de vie des propositions. `pending` nécessite une approbation avant les actions d'application/rejet/quarantaine initiées par l'agent ; `auto` autorise ces actions sans approbation.
- `workshop.maxPending` : nombre maximum de propositions en attente/quarantaine conservées par espace de travail (par défaut : 50).
- `workshop.maxSkillBytes` : taille maximale en octets du corps d'une proposition générée (par défaut : 40000). Les descriptions des propositions sont également plafonnées à 160 octets car elles peuvent être affichées dans la découverte de compétences et les listes de propositions.
- `entries.<skillKey>` : substitutions par compétence.
- `agents.defaults.skills` : liste d'autorisation de compétences par défaut facultative héritée par les agents qui omettent `agents.list[].skills`.
- `agents.list[].skills` : liste d'autorisation finale des compétences facultative par agent ; les listes explicites remplacent les valeurs par défaut héritées au lieu de fusionner.

## Dépôts frères symbolisés par lien

Par défaut, workspace, project-agent, extra-dir et bundled skill roots sont des limites de confinement. Si un dossier de compétence sous `<workspace>/skills` est un lien symbolique qui résout en dehors de `<workspace>/skills`, OpenClaw l'ignore et journalise `Skipping escaped skill path outside its configured root`.

Conservez la structure des liens symboliques et n'autorisez que la racine cible de confiance :

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
`<workspace>/skills/manager -> ~/Projects/manager/skills` est accepté après
la résolution du chemin réel (realpath). `extraDirs` analyse également directement le dépôt frère, tandis que
`allowSymlinkTargets` préserve le chemin lié pour les configurations d'espace de travail (workspace-skill)
existantes. Les répertoires gérés `~/.openclaw/skills` et personnels `~/.agents/skills`
acceptent déjà les liens symboliques de répertoires de compétences car ces racines sont
des surfaces locales du gestionnaire de compétences détenues par l'utilisateur ; le confinement `SKILL.md` par compétence
s'applique toujours. Gardez les entrées cibles étroites ; ne pointez pas vers des racines larges telles que `~` ou
`~/Projects` sauf si chaque arborescence de compétences sous cette racine est approuvée.

Champs par compétence :

- `enabled` : définissez `false` pour désactiver une compétence même si elle est fournie/installée.
- `env` : variables d'environnement injectées pour l'exécution de l'agent (uniquement si elles ne sont pas déjà définies).
- `apiKey` : commodité optionnelle pour les compétences qui déclarent une env var principale.
  Prend en charge les chaînes en texte clair ou les objets SecretRef (`{ source, provider, id }`).

## Notes

- Les clés sous `entries` correspondent au nom de la compétence par défaut. Si une compétence définit
  `metadata.openclaw.skillKey`, utilisez cette clé à la place.
- La priorité de chargement est `<workspace>/skills` → `<workspace>/.agents/skills` →
  `~/.agents/skills` → `~/.openclaw/skills` → compétences fournies →
  `skills.load.extraDirs`.
- Les modifications apportées aux compétences sont prises en compte au prochain tour de l'agent lorsque l'observateur (watcher) est activé.

### Compétences en bac à sable (sandboxed) et env vars

Lorsqu'une session est **sandboxed**, les processus de compétence s'exécutent à l'intérieur du backend de bac à sable configuré. Le bac à sable n'hérite **pas** du `process.env` de l'hôte.

<Warning>
  Les `env` globales et les `skills.entries.<skill>.env`/`apiKey` s'appliquent uniquement aux exécutions sur l'**hôte**. À l'intérieur d'un bac à sable, elles n'ont aucun effet, donc une compétence qui dépend de `GEMINI_API_KEY` échouera avec `apiKey not configured` sauf si la variable est fournie séparément au bac à sable.
</Warning>

Utilisez l'une des options suivantes :

- `agents.defaults.sandbox.docker.env`Docker pour le backend Docker (ou `agents.list[].sandbox.docker.env` par agent).
- Intégrez les variables d'environnement dans votre image de bac à sable personnalisée ou votre environnement de bac à sable distant.

Pour les bacs à sable Docker, les valeurs configurées Docker`sandbox.docker.env`DockerDocker deviennent des variables d'environnement de conteneur explicites. Les utilisateurs ayant accès au démon Docker peuvent les inspecter via les métadonnées Docker, utilisez donc un fichier de secrets monté, une image personnalisée ou un autre chemin de livraison si cette exposition n'est pas acceptable.

## Connexes

<CardGroup cols={2}>
  <Card title="Skills" href="/fr/tools/skills" icon="puzzle-piece">
    Ce que sont les skills et comment elles se chargent.
  </Card>
  <Card title="Creating skills" href="/fr/tools/creating-skills" icon="hammer">
    Création de packs de skills personnalisés.
  </Card>
  <Card title="Slash commands" href="/fr/tools/slash-commands" icon="terminal">
    Catalogue de commandes natives et directives de chat.
  </Card>
  <Card title="Configuration reference" href="/fr/gateway/configuration-reference" icon="gear">
    Schéma complet `skills` et `agents.skills`.
  </Card>
</CardGroup>
