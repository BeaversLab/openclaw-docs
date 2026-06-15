---
title: "Configuration des compétences"
sidebarTitle: "Configuration des compétences"
summary: "Référence complète du schéma de configuration skills.*, des listes d'autorisation des agents, des paramètres de l'atelier et de la gestion des env vars du bac à sable."
read_when:
  - Configuring skill loading, install, or gating behavior
  - Setting per-agent skill visibility
  - Adjusting Skill Workshop limits or approval policy
---

La plupart des configurations des compétences se trouvent sous `skills` dans
`~/.openclaw/openclaw.json`. La visibilité spécifique à l'agent se trouve sous
`agents.defaults.skills` et `agents.list[].skills`.

```json5
{
  skills: {
    allowBundled: ["gemini", "peekaboo"],
    load: {
      extraDirs: ["~/Projects/agent-scripts/skills"],
      allowSymlinkTargets: ["~/Projects/manager/skills"],
      watch: true,
      watchDebounceMs: 250,
    },
    install: {
      preferBrew: true,
      nodeManager: "npm",
      allowUploadedArchives: false,
    },
    workshop: {
      autonomous: { enabled: false },
      approvalPolicy: "pending",
      maxPending: 50,
      maxSkillBytes: 40000,
    },
    entries: {
      "image-lab": {
        enabled: true,
        apiKey: { source: "env", provider: "default", id: "GEMINI_API_KEY" },
        env: { GEMINI_API_KEY: "GEMINI_KEY_HERE" },
      },
      peekaboo: { enabled: true },
      sag: { enabled: false },
    },
  },
}
```

<Note>Pour la génération d'images intégrée, utilisez `agents.defaults.imageGenerationModel` ainsi que le tool central `image_generate` au lieu de `skills.entries`. Les entrées de compétences sont réservées aux workflows de compétences personnalisés ou tiers.</Note>

## Chargement (`skills.load`)

<ParamField path="skills.load.extraDirs" type="string[]">
  Répertoires de compétences supplémentaires à scanner, avec la priorité la plus faible (après les compétences groupées et les plugins). Les chemins sont développés avec le support de `~`.
</ParamField>

<ParamField path="skills.load.allowSymlinkTargets" type="string[]">
  Répertoires cibles réels approuvés vers lesquels les dossiers de compétences liés par lien symbolique peuvent être résolus,
  même lorsque le lien symbolique se trouve en dehors de la racine configurée. Utilisez ceci pour
  des dispositions intentionnelles de dépôts frères telles que
  `<workspace>/skills/manager -> ~/Projects/manager/skills`. Gardez cette liste
  restreinte — ne pointez pas vers des racines larges comme `~` ou `~/Projects`.
</ParamField>

<ParamField path="skills.load.watch" type="boolean" default="true">
  Surveiller les dossiers de compétences et actualiser l'instantané des compétences lorsque les fichiers `SKILL.md` changent. Couvre les fichiers imbriqués sous les racines de compétences groupées.
</ParamField>

<ParamField path="skills.load.watchDebounceMs" type="number" default="250">
  Fenêtre d'anti-rebond pour les événements de surveillance des compétences en millisecondes.
</ParamField>

## Installation (`skills.install`)

<ParamField path="skills.install.preferBrew" type="boolean" default="true">
  Préférer les programmes d'installation Homebrew lorsque `brew` est disponible.
</ParamField>

<ParamField path="skills.install.nodeManager" type='"npm" | "pnpm" | "yarn" | "bun"' default='"npm"'>
  Préférence du gestionnaire de packages Node pour l'installation des compétences. Cela n'affecte que l'installation des compétences — le runtime Gateway doit toujours utiliser Node (Bun n'est pas recommandé pour WhatsApp/Telegram). Utilisez `openclaw setup --node-manager` pour npm, pnpm, ou bun ; définissez `"yarn"` manuellement pour les installations de compétences basées sur Yarn.
</ParamField>

<ParamField path="skills.install.allowUploadedArchives" type="boolean" default="false">
  Autoriser les clients Gateway de confiance `operator.admin` à installer des archives zip privées mises en scène via `skills.upload.*`. Les installations normales via ClawHub n'ont pas besoin de ce paramètre.
</ParamField>

## Liste d'autorisation des compétences groupées

<ParamField path="skills.allowBundled" type="string[]">
  Liste d'autorisation optionnelle pour les compétences **groupées** uniquement. Lorsqu'elle est définie, seules les compétences groupées de la liste sont éligibles. Les compétences gérées, au niveau de l'agent et de l'espace de travail ne sont pas affectées.
</ParamField>

## Entrées par compétence (`skills.entries`)

Les clés sous `entries` correspondent à la `name` de la compétence par défaut. Si une compétence définit
`metadata.openclaw.skillKey`, utilisez plutôt cette clé. Mettez les noms avec des traits d'union entre guillemets
(JSON5 autorise les clés entre guillemets).

<ParamField path="skills.entries.<key>.enabled" type="boolean">
  `false` désactive la compétence même lorsqu'elle est groupée ou installée. La compétence groupée `coding-agent` est opt-in — définissez-la sur `true` et assurez-vous que l'un de `claude`, `codex`, `opencode`, ou un autre CLI pris en charge est installé et authentifié.
</ParamField>

<ParamField path="skills.entries.<key>.apiKey" type='string | { source, provider, id }'>
  Champ de commodité pour les compétences qui déclarent `metadata.openclaw.primaryEnv`.
  Prend en charge une chaîne en texte brut ou un SecretRef : `{ source: "env", provider: "default", id: "VAR_NAME" }`.
</ParamField>

<ParamField path="skills.entries.<key>.env" type="Record<string, string>">
  Variables d'environnement injectées pour l'exécution de l'agent. Injectées uniquement lorsque la variable n'est pas déjà définie dans le processus.
</ParamField>

<ParamField path="skills.entries.<key>.config" type="object">
  Sac optionnel pour les champs de configuration personnalisés par compétence.
</ParamField>

## Listes d'autorisation de l'agent (`agents`)

Utilisez la configuration de l'agent lorsque vous souhaitez les mêmes racines de compétence machine/espace de travail mais un
ensemble de compétences visible différent pour chaque agent.

```json5
{
  agents: {
    defaults: {
      skills: ["github", "weather"], // shared baseline
    },
    list: [
      { id: "writer" }, // inherits github, weather
      { id: "docs", skills: ["docs-search"] }, // replaces defaults entirely
      { id: "locked-down", skills: [] }, // no skills
    ],
  },
}
```

<ParamField path="agents.defaults.skills" type="string[]">
  Liste d'autorisation de base commune héritée par les agents qui omettent `agents.list[].skills`. Omettez entièrement pour laisser les compétences sans restriction par défaut.
</ParamField>

<ParamField path="agents.list[].skills" type="string[]">
  Ensemble final de compétences explicite pour cet agent. Les listes explicites **remplacent** les valeurs par défaut héritées — elles ne fusionnent pas. Définissez sur `[]` pour n'exposer aucune compétence pour cet agent.
</ParamField>

## Atelier (`skills.workshop`)

<ParamField path="skills.workshop.autonomous.enabled" type="boolean" default="false">
  Lorsque `true`, les agents peuvent créer des propositions en attente à partir de signaux de conversation durables après des tours réussis. La création de compétences par l'utilisateur passe toujours par l'atelier de compétences indépendamment de ce paramètre.
</ParamField>

<ParamField path="skills.workshop.approvalPolicy" type='"pending" | "auto"' default='"pending"'>
  `pending` nécessite l'approbation de l'opérateur avant l'application, le rejet ou la mise en quarantaine initiée par l'agent. `auto` permet ces actions sans approbation.
</ParamField>

<ParamField path="skills.workshop.maxPending" type="number" default="50">
  Nombre maximum de propositions en attente et mises en quarantaine conservées par espace de travail.
</ParamField>

<ParamField path="skills.workshop.maxSkillBytes" type="number" default="40000">
  Taille maximale du corps de la proposition en octets. Les descriptions des propositions sont limitées strictement à 160 octets car elles apparaissent dans la sortie de découverte et de listage.
</ParamField>

## Racines de compétences symboliques (symlinked)

Par défaut, les racines de skills d'espace de travail, d'agent de projet, de répertoire supplémentaire et groupées sont des limites de confinement. Un dossier de skill lié symboliquement sous `<workspace>/skills` qui résout en dehors de la racine est ignoré avec un message de journal.

Pour permettre une disposition intentionnelle de liens symboliques, déclarez la cible de confiance :

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

Avec cette configuration, `<workspace>/skills/manager -> ~/Projects/manager/skills` est accepté après la résolution realpath. `extraDirs` analyse directement le dépôt frère ; `allowSymlinkTargets` préserve le chemin du lien symbolique pour les dispositions existantes.

Les répertoires gérés `~/.openclaw/skills` et personnels `~/.agents/skills` acceptent déjà les liens symboliques de répertoires de skills (le confinement `SKILL.md` par skill s'applique toujours).

## Skills sandboxed et env vars

<Warning>
  `skills.entries.<skill>.env` et `apiKey` s'appliquent uniquement aux exécutions sur l'**hôte**. À l'intérieur d'un sandbox, ils n'ont aucun effet — un skill qui dépend de `GEMINI_API_KEY` échouera avec `apiKey not configured` à moins que la variable ne soit donnée séparément au sandbox.
</Warning>

Passez des secrets dans un sandbox Docker avec :

```json5
{
  agents: {
    defaults: {
      sandbox: {
        docker: {
          env: { GEMINI_API_KEY: "your-key-here" },
        },
      },
    },
  },
}
```

<Note>Les utilisateurs ayant accès au démon Docker peuvent inspecter les valeurs `sandbox.docker.env` via les métadonnées Docker. Utilisez un fichier de secret monté, une image personnalisée ou un autre chemin de livraison lorsque cette exposition n'est pas acceptable.</Note>

## Rappel de l'ordre de chargement

```text
workspace/skills      (highest)
workspace/.agents/skills
~/.agents/skills
~/.openclaw/skills
bundled skills
skills.load.extraDirs (lowest)
```

Les modifications apportées aux skills et à la configuration prennent effet lors de la prochaine nouvelle session lorsque l'observateur est activé, ou lors du prochain tour d'agent lorsque l'observateur détecte un changement.

## Connexes

<CardGroup cols={2}>
  <Card title="Référence des Skills" href="/fr/tools/skills" icon="puzzle-piece">
    Ce que sont les skills, l'ordre de chargement, le filtrage et le format SKILL.md.
  </Card>
  <Card title="Création de skills" href="/fr/tools/creating-skills" icon="hammer">
    Création de skills d'espace de travail personnalisés.
  </Card>
  <Card title="Atelier de compétences" href="/fr/tools/skill-workshop" icon="flask">
    File d'attente des propositions pour les compétences rédigées par l'agent.
  </Card>
  <Card title="Commandes slash" href="/fr/tools/slash-commands" icon="terminal">
    Catalogue natif de commandes slash et directives de chat.
  </Card>
</CardGroup>
