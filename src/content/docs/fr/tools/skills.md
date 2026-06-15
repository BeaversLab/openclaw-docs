---
title: "Compétences"
sidebarTitle: "Compétences"
summary: "Les compétences enseignent à votre agent comment utiliser les outils. Découvrez comment elles sont chargées, comment fonctionne la priorité, et comment configurer le filtrage, les listes d'autorisation et l'injection d'environnement."
read_when:
  - Adding or modifying skills
  - Changing skill gating, allowlists, or load rules
  - Understanding skill precedence and snapshot behavior
---

Les compétences sont des fichiers d'instructions Markdown qui enseignent à l'agent comment et quand utiliser les outils. Chaque compétence réside dans un répertoire contenant un fichier `SKILL.md` avec des en-têtes YAML et un corps Markdown. OpenClaw charge les compétences groupées ainsi que les redéfinitions locales, et les filtre au chargement en fonction de l'environnement, de la configuration et de la présence des binaires.

<CardGroup cols={2}>
  <Card title="Créer des compétences" href="/fr/tools/creating-skills" icon="hammer">
    Créez et testez une compétence personnalisée à partir de zéro.
  </Card>
  <Card title="Atelier des compétences" href="/fr/tools/skill-workshop" icon="flask">
    Examinez et approuvez les propositions de compétences rédigées par l'agent.
  </Card>
  <Card title="Config des compétences" href="/fr/tools/skills-config" icon="gear">
    Schéma de configuration `skills.*` complet et listes d'autorisation de l'agent.
  </Card>
  <Card title="ClawHub" href="/fr/clawhub" icon="cloud">
    Parcourez et installez des compétences communautaires.
  </Card>
</CardGroup>

## Ordre de chargement

OpenClaw se charge depuis ces sources, **par ordre de priorité décroissante**. Lorsque le même nom de compétence apparaît à plusieurs endroits, la source la plus élevée l'emporte.

| Priorité           | Source                             | Chemin                                          |
| ------------------ | ---------------------------------- | ----------------------------------------------- |
| 1 — la plus élevée | Compétences de l'espace de travail | `<workspace>/skills`                            |
| 2                  | Compétences de l'agent de projet   | `<workspace>/.agents/skills`                    |
| 3                  | Compétences de l'agent personnel   | `~/.agents/skills`                              |
| 4                  | Compétences gérées / locales       | `~/.openclaw/skills`                            |
| 5                  | Compétences groupées               | fournies avec l'installation                    |
| 6 — la plus basse  | Répertoires supplémentaires        | `skills.load.extraDirs` + compétences de plugin |

Les racines de compétences prennent en charge les dispositions groupées. OpenClaw découvre une compétence dès que `SKILL.md` apparaît n'importe où sous une racine configurée :

```text
<workspace>/skills/research/SKILL.md          ✓ found as "research"
<workspace>/skills/personal/research/SKILL.md ✓ also found as "research"
```

Le chemin du dossier sert uniquement à l'organisation. Le nom de la compétence, la commande barre oblique et la clé de liste d'autorisation proviennent tous du champ de frontmatter `name` (ou du nom du répertoire lorsque `name` est manquant).

<Note>Le répertoire natif `$CODEX_HOME/skills` du CLI de Codex n'est **pas** une racine de compétence OpenClaw. Utilisez `openclaw migrate plan codex` pour inventorier ces compétences, puis `openclaw migrate codex` pour les copier dans votre espace de travail OpenClaw.</Note>

## Compétences par agent vs partagées

Dans les configurations multi-agents, chaque agent possède son propre espace de travail. Utilisez le chemin qui correspond à la visibilité souhaitée :

| Portée                      | Chemin                       | Visible par                                |
| --------------------------- | ---------------------------- | ------------------------------------------ |
| Par agent                   | `<workspace>/skills`         | Seulement cet agent                        |
| Agent de projet             | `<workspace>/.agents/skills` | Seulement l'agent de cet espace de travail |
| Agent personnel             | `~/.agents/skills`           | Tous les agents sur cette machine          |
| Partagé géré                | `~/.openclaw/skills`         | Tous les agents sur cette machine          |
| Répertoires supplémentaires | `skills.load.extraDirs`      | Tous les agents sur cette machine          |

## Listes d'autorisation des agents

L'**emplacement** de la compétence (priorité) et la **visibilité** de la compétence (quel agent peut l'utiliser) sont des contrôles distincts. Utilisez les listes d'autorisation pour restreindre les compétences qu'un agent voit, indépendamment de l'endroit d'où elles sont chargées.

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

<AccordionGroup>
  <Accordion title="Règles de liste d'autorisation">
    - Omettez `agents.defaults.skills` pour laisser toutes les compétences non restreintes par défaut. - Omettez `agents.list[].skills` pour hériter de `agents.defaults.skills`. - Définissez `agents.list[].skills: []` pour n'exposer aucune compétence pour cet agent. - Une liste `agents.list[].skills` non vide est l'ensemble **final** — elle ne fusionne pas avec les valeurs par défaut. - La liste
    d'autorisation effective s'applique à la construction de l'invite, à la découverte des commandes barre oblique, à la synchronisation du bac à sable et aux instantanés de compétences.
  </Accordion>
</AccordionGroup>

## Plugins et compétences

Les plugins peuvent inclure leurs propres compétences en listant les répertoires `skills` dans `openclaw.plugin.json` (chemins relatifs à la racine du plugin). Les compétences du plugin se chargent lorsque le plugin est activé — par exemple, le plugin du navigateur inclut une compétence `browser-automation` pour le contrôle multi-étapes du navigateur.

Les répertoires de compétences des plugins fusionnent au même niveau de faible priorité que `skills.load.extraDirs`, donc une compétence groupée, gérée, d'agent ou d'espace de travail du même nom les remplace. Filtrez-les via `metadata.openclaw.requires.config` sur l'entrée de configuration du plugin.

Voir [Plugins](/fr/tools/plugin) et [Outils](/fr/tools) pour le système complet de plugins.

## Atelier de compétences

[L'Atelier de compétences](/fr/tools/skill-workshop) est une file de propositions entre l'agent et vos fichiers de compétences actifs. Lorsque l'agent repère un travail réutilisable, il rédige une proposition au lieu d'écrire directement dans `SKILL.md`. Vous examinez et approuvez avant tout changement.

```bash
openclaw skills workshop list
openclaw skills workshop inspect <proposal-id>
openclaw skills workshop apply <proposal-id>
```

Voir [Atelier de compétences](/fr/tools/skill-workshop) pour le cycle de vie complet, la référence CLI et la configuration.

## Installation depuis ClawHub

[ClawHub](https://clawhub.ai) est le registre public de compétences. Utilisez les commandes `openclaw skills` pour l'installation et la mise à jour, ou la `clawhub` CLI pour la publication et la synchronisation.

| Action                                                      | Commande                                               |
| ----------------------------------------------------------- | ------------------------------------------------------ |
| Installer une compétence dans l'espace de travail           | `openclaw skills install <slug>`                       |
| Installer depuis un dépôt Git                               | `openclaw skills install git:owner/repo@ref`           |
| Installer un répertoire de compétences local                | `openclaw skills install ./path/to/skill --as my-tool` |
| Installer pour tous les agents locaux                       | `openclaw skills install <slug> --global`              |
| Mettre à jour toutes les compétences de l'espace de travail | `openclaw skills update --all`                         |
| Mettre à jour une compétence gérée partagée                 | `openclaw skills update <slug> --global`               |
| Mettre à jour toutes les compétences gérées partagées       | `openclaw skills update --all --global`                |
| Vérifier l'enveloppe de confiance d'une compétence          | `openclaw skills verify <slug>`                        |
| Afficher la Carte de Compétence générée                     | `openclaw skills verify <slug> --card`                 |
| Publier / synchroniser via ClawHub CLI                      | `clawhub sync --all`                                   |

<AccordionGroup>
  <Accordion title="Install details">
    `openclaw skills install` s'installe par défaut dans le répertoire `skills/`
    de l'espace de travail actif. Ajoutez `--global` pour installer dans le
    répertoire partagé `~/.openclaw/skills`, visible par tous les agents locaux, sauf si
    les listes d'autorisation des agents le restreignent.

    Les installations Git et locales s'attendent à un `SKILL.md` à la racine de la source. Le slug provient
    du frontmatter `SKILL.md` `name` lorsqu'il est valide, puis revient par défaut au nom
    du répertoire ou du dépôt. Utilisez `--as <slug>` pour le remplacer.
    `openclaw skills update` ne suit que les installations ClawHub — réinstallez les sources Git ou
    locales pour les actualiser.

  </Accordion>
  <Accordion title="Verification and security scanning">
    `openclaw skills verify <slug>` demande à ClawHub l'enveloppe de confiance `clawhub.skill.verify.v1`
    de la compétence. Les compétences ClawHub installées sont vérifiées
    par rapport à la version et au registre enregistrés dans `.clawhub/origin.json`.

    Les pages de compétences ClawHub exposent le dernier état de l'analyse de sécurité avant l'installation,
    avec des pages détaillées pour VirusTotal, ClawScan et l'analyse statique. La commande
    renvoie un code non nul lorsque ClawHub marque la vérification comme échouée. Les éditeurs
    corrigent les faux positifs via le tableau de bord ClawHub ou
    `clawhub skill rescan <slug>`.

  </Accordion>
  <Accordion title="Private archive installs">
    Les clients Gateway qui ont besoin d'une distribution non-ClawHub peuvent préparer
    une archive de compétences zip avec `skills.upload.begin`, `skills.upload.chunk` et `skills.upload.commit`,
    puis installer avec `skills.install({ source: "upload", ... })`. Ce chemin est désactivé par défaut et nécessite `skills.install.allowUploadedArchives: true` dans
    `openclaw.json`. Les installations normales via ClawHub n'ont jamais besoin de ce paramètre.
  </Accordion>
</AccordionGroup>

## Security

<Warning>Treat third-party skills as **untrusted code**. Read them before enabling. Prefer sandboxed runs for untrusted inputs and risky tools. See [Sandboxing](/fr/gateway/sandboxing) for agent-side controls.</Warning>

<AccordionGroup>
  <Accordion title="Path containment">
    Workspace, project-agent, and extra-dir skill discovery only accepts skill
    roots whose resolved realpath stays inside the configured root, unless
    `skills.load.allowSymlinkTargets` explicitly trusts a target root.
    Managed `~/.openclaw/skills` and personal `~/.agents/skills` may contain
    symlinked skill folders, but every `SKILL.md` realpath must still stay
    inside its resolved skill directory.
  </Accordion>
  <Accordion title="Scan and scan overrides"Gateway>
    Gateway-backed skill installs (onboarding, Skills settings UI) run the
    built-in dangerous-code scanner before executing installer metadata.
    `critical` findings block by default; `suspicious` findings warn only.
    `openclaw skills install <slug>`ClawHub downloads a ClawHub skill folder directly
    and does not use the installer-metadata scanner.
  </Accordion>
  <Accordion title="Secret injection scope">
    `skills.entries.*.env` and `skills.entries.*.apiKey` inject secrets into the
    **host** process for that agent turn only — not into the sandbox. Keep
    secrets out of prompts and logs.
  </Accordion>
</AccordionGroup>

For the broader threat model and security checklists, see
[Security](/fr/gateway/security).

## SKILL.md format

Every skill needs at minimum a `name` and `description` in the frontmatter:

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
---

When the user asks to generate an image, use the `image_generate` tool...
```

<Note>OpenClaw follows the [AgentSkills](OpenClawhttps://agentskills.io) spec. The frontmatter parser supports **single-line keys only** — `metadata` must be a single-line JSON object. Use `{baseDir}` in the body to reference the skill folder path.</Note>

### Optional frontmatter keys

<ParamField path="homepage" type="string" macOS>
  URL affiché sous « Site Web » dans l'interface des Skills de macOS. Également pris en charge via `metadata.openclaw.homepage`.
</ParamField>

<ParamField path="user-invocable" type="boolean" default="true">
  Lorsque `true`, la skill est exposée en tant que commande slash invoquable par l'utilisateur.
</ParamField>

<ParamField path="disable-model-invocation" type="boolean" default="false">
  Lorsque `true`OpenClaw, OpenClaw garde les instructions de la skill en dehors du prompt normal de l'agent. La skill reste disponible en tant que commande slash lorsque `user-invocable` est également `true`.
</ParamField>

<ParamField path="command-dispatch" type='"tool"'>
  Lorsqu'il est défini à `tool`, la commande slash contourne le modèle et distribue directement à un tool enregistré.
</ParamField>

<ParamField path="command-tool" type="string">
  Nom du tool à invoquer lorsque `command-dispatch: tool` est défini.
</ParamField>

<ParamField path="command-arg-mode" type='"raw"' default="raw">
  Pour la distribution de tool, transmet la chaîne d'arguments brute au tool sans
  analyse principale. Le tool reçoit
  `{ command: "<raw args>", commandName: "<slash command>", skillName: "<skill name>" }`.
</ParamField>

## Filtrage

OpenClaw filtre les skills au chargement en utilisant OpenClaw`metadata.openclaw` (JSON
sur une seule ligne dans le frontmatter). Une skill sans bloc `metadata.openclaw` est toujours
éligible sauf si elle est explicitement désactivée.

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
metadata: { "openclaw": { "requires": { "bins": ["uv"], "env": ["GEMINI_API_KEY"], "config": ["browser.enabled"] }, "primaryEnv": "GEMINI_API_KEY" } }
---
```

<ParamField path="always" type="boolean">
  Lorsque `true`, incluez toujours la skill et ignorez toutes les autres portes.
</ParamField>

<ParamField path="emoji" type="string" macOS>
  Emoji optionnel affiché dans l'interface des Skills de macOS.
</ParamField>

<ParamField path="homepage" type="string" macOS>
  URL optionnelle affichée sous « Site Web » dans l'interface des Skills de macOS.
</ParamField>

<ParamField path="os" type='"darwin" | "linux" | "win32"'>
  Filtre de plateforme. Lorsqu'il est défini, la compétence n'est éligible que sur les systèmes d'exploitation répertoriés.
</ParamField>

<ParamField path="requires.bins" type="string[]">
  Chaque binaire doit exister sur `PATH`.
</ParamField>

<ParamField path="requires.anyBins" type="string[]">
  Au moins un binaire doit exister sur `PATH`.
</ParamField>

<ParamField path="requires.env" type="string[]">
  Chaque env var doit exister dans le processus ou être fourni via la configuration.
</ParamField>

<ParamField path="requires.config" type="string[]">
  Chaque chemin `openclaw.json` doit être vrai (truthy).
</ParamField>

<ParamField path="primaryEnv" type="string">
  Nom de l'env var associé à `skills.entries.<name>.apiKey`.
</ParamField>

<ParamField path="install" type="object[]">
  Spécifications d'installation optionnelles utilisées par l'interface Skills de macOS (brew / node / go / uv / download).
</ParamField>

<Note>Les blocs `metadata.clawdbot` obsolètes sont toujours acceptés lorsque `metadata.openclaw` est absent, afin que les compétences installées plus anciennes conservent leurs portes de dépendance et leurs indications d'installation. Les nouvelles compétences devraient utiliser `metadata.openclaw`.</Note>

### Spécifications d'installation

Les spécifications d'installation indiquent à l'interface Skills de macOS comment installer une dépendance :

```markdown
---
name: gemini
description: Use Gemini CLI for coding assistance and Google search lookups.
metadata: { "openclaw": { "emoji": "♊️", "requires": { "bins": ["gemini"] }, "install": [{ "id": "brew", "kind": "brew", "formula": "gemini-cli", "bins": ["gemini"], "label": "Install Gemini CLI (brew)" }] } }
---
```

<AccordionGroup>
  <Accordion title="Règles de sélection de l'installateur">
    - Lorsque plusieurs installateurs sont répertoriés, la passerelle choisit une option
      préférée (brew si disponible, sinon node).
    - Si tous les installateurs sont `download`OpenClaw, OpenClaw répertorie chaque entrée afin que vous puissiez
      voir tous les artefacts disponibles.
    - Les spécifications peuvent inclure `os: ["darwin"|"linux"|"win32"]` pour filtrer par plateforme.
    - Les installations Node respectent `skills.install.nodeManager` dans `openclaw.json`npmnpmGatewayGateway
      (par défaut : npm ; options : npm / pnpm / yarn / bun). Cela n'affecte que les installations de compétences ;
      l'exécution de la passerelle doit toujours être Node.
    - Préférence de l'installateur de la passerelle : Homebrew → uv → gestionnaire de nœuds configuré →
      go → download.
  </Accordion>
  <Accordion title="Détails par installateur"OpenClawLinux>
    - **Homebrew :** OpenClaw n'installe pas automatiquement Homebrew et ne traduit pas les formules
      brew en commandes de packages système. Dans les conteneurs Linux sans
      `brew`, les installateurs brew-only sont masqués ; utilisez une image personnalisée ou installez
      la dépendance manuellement.
    - **Go :** si `go` est manquant et `brew` est disponible, la passerelle installe
      d'abord Go via Homebrew et définit `GOBIN` sur le `bin` de Homebrew.
    - **Download :** `url` (requis), `archive` (`tar.gz` | `tar.bz2` | `zip`),
      `extract` (par défaut : auto lorsqu'une archive est détectée), `stripComponents`,
      `targetDir` (par défaut : `~/.openclaw/tools/<skillKey>`).
  </Accordion>
  <Accordion title="Notes de sandboxing">
    `requires.bins` est vérifié sur l'**hôte** au moment du chargement de la compétence. Si un agent
    s'exécute dans un bac à sable (sandbox), le binaire doit également exister **à l'intérieur du conteneur**.
    Installez-le via `agents.defaults.sandbox.docker.setupCommand` ou une
    image personnalisée. `setupCommand` s'exécute une fois après la création du conteneur et nécessite
    un accès réseau sortant, un système de fichiers racine inscriptible et un utilisateur root dans le bac à sable.
  </Accordion>
</AccordionGroup>

## Remplacements de configuration

Activez et configurez les compétences groupées ou gérées sous `skills.entries` dans
`~/.openclaw/openclaw.json` :

```json5
{
  skills: {
    entries: {
      "image-lab": {
        enabled: true,
        apiKey: { source: "env", provider: "default", id: "GEMINI_API_KEY" },
        env: { GEMINI_API_KEY: "GEMINI_KEY_HERE" },
        config: {
          endpoint: "https://example.invalid",
          model: "nano-pro",
        },
      },
      peekaboo: { enabled: true },
      sag: { enabled: false },
    },
  },
}
```

<ParamField path="enabled" type="boolean">
  `false` désactive la compétence même si elle est groupée ou installée. La compétence groupée `coding-agent` est optionnelle — définissez `skills.entries.coding-agent.enabled: true` et assurez-vous que l'un des CLI `claude`, `codex`, `opencode`, ou un autre pris en charge est installé et authentifié.
</ParamField>

<ParamField path="apiKey" type="string | { source, provider, id }">
  Champ de commodité pour les compétences qui déclarent `metadata.openclaw.primaryEnv`. Prend en charge une chaîne en texte brut ou un objet SecretRef.
</ParamField>

<ParamField path="env" type="Record<string, string>">
  Variables d'environnement injectées pour l'exécution de l'agent. Injectées uniquement lorsque la variable n'est pas déjà définie dans le processus.
</ParamField>

<ParamField path="config" type="object">
  Sac facultatif pour les champs de configuration personnalisés par compétence.
</ParamField>

<ParamField path="allowBundled" type="string[]">
  Liste d'autorisation (allowlist) facultative pour les compétences **groupées** uniquement. Lorsqu'elle est définie, seules les compétences groupées de la liste sont éligibles. Les compétences gérées et de l'espace de travail ne sont pas affectées.
</ParamField>

<Note>Les clés de configuration correspondent au **nom de la compétence** par défaut. Si une compétence définit `metadata.openclaw.skillKey`, utilisez cette clé sous `skills.entries`. Mettez entre guillemets les noms avec des traits d'union : JSON5 autorise les clés entre guillemets.</Note>

## Injection d'environnement

Lorsqu'une exécution d'agent démarre, OpenClaw :

<Steps>
  <Step title="Reads skill metadata"OpenClaw>
    OpenClaw résout la liste effective des compétences pour l'agent, en appliquant les règles de filtrage, les listes d'autorisation et les remplacements de configuration.
  </Step>
  <Step title="APIInjects env and API keys">
    `skills.entries.<key>.env` et `skills.entries.<key>.apiKey` sont appliqués à
    `process.env` pour la durée de l'exécution.
  </Step>
  <Step title="Builds the system prompt">
    Les compétences éligibles sont compilées en un bloc XML compact et injectées dans le
    invite système.
  </Step>
  <Step title="Restores the environment">
    Une fois l'exécution terminée, l'environnement d'origine est restauré.
  </Step>
</Steps>

<Warning>L'injection d'env est limitée à l'exécution de l'agent **hôte**, et non au bac à sable. À l'intérieur d'un bac à sable, `env` et `apiKey` n'ont aucun effet. Voir [Skills config](/fr/tools/skills-config#sandboxed-skills-and-env-vars) pour savoir comment transmettre des secrets aux exécutions en bac à sable.</Warning>

Pour le backend `claude-cli`OpenClaw inclus, OpenClaw matérialise également le même
instantané de compétences éligibles en tant que plugin Claude Code temporaire et le transmet via
`--plugin-dir`CLI. Les autres backends CLI n'utilisent que le catalogue d'invites.

## Instantanés et actualisation

OpenClaw crée des instantanés des compétences éligibles **lorsqu'une session démarre** et réutilise cette
liste pour tous les tours suivants de la session. Les modifications apportées aux compétences ou à la configuration prennent
effet lors de la prochaine nouvelle session.

Les compétences sont actualisées en cours de session dans deux cas :

- L'observateur de compétences détecte un changement `SKILL.md`.
- Un nouveau nœud distant éligible se connecte.

La liste actualisée est prise en compte au prochain tour de l'agent. Si la liste d'autorisation effective de l'agent
change, OpenClaw actualise l'instantané pour maintenir l'alignement des compétences visibles.

<AccordionGroup>
  <Accordion title="Surveillance des Skills">
    Par défaut, OpenClaw surveille les dossiers de compétences et met à jour l'instantané lorsque
    les fichiers `SKILL.md` changent. Configurez sous `skills.load` :

    ```json5
    {
      skills: {
        load: {
          extraDirs: ["~/Projects/agent-scripts/skills"],
          allowSymlinkTargets: ["~/Projects/manager/skills"],
          watch: true,
          watchDebounceMs: 250,
        },
      },
    }
    ```

    Utilisez `allowSymlinkTargets` pour les mises en page avec liens symboliques intentionnels où un
    lien symbolique racine pointe vers l'extérieur de la racine configurée, par exemple
    `<workspace>/skills/manager -> ~/Projects/manager/skills`.

  </Accordion>
  <Accordion title="Nœuds macOS distants (passerelle Linux)">
    Si le Gateway s'exécute sur Linux mais qu'un **nœud macOS** est connecté avec
    `system.run` autorisé, OpenClaw peut considérer les compétences exclusives à macOS comme éligibles lorsque
    les binaires requis sont présents sur ce nœud. L'agent doit exécuter ces
    compétences via l'outil `exec` avec `host=node`.

    Les nœuds hors ligne ne rendent **pas** les compétences à distance visibles. Si un nœud cesse
    de répondre aux sondages de binaires, OpenClaw efface ses correspondances de binaires mises en cache.

  </Accordion>
</AccordionGroup>

## Impact sur les jetons

Lorsque les compétences sont éligibles, OpenClaw injecte un bloc XML compact dans le
invite système. Le coût est déterministe :

```text
total = 195 + Σ (97 + len(name) + len(description) + len(filepath))
```

- **Surcharge de base** (uniquement lorsque ≥ 1 compétence) : ~195 caractères
- **Par compétence :** ~97 caractères + vos longueurs de champs `name`, `description` et `location`
- L'échappement XML développe `& < > " '` en entités, ajoutant quelques caractères par occurrence
- À ~4 caractères/jeton, 97 caractères ≈ 24 jetons par compétence avant les longueurs de champs

Gardez les descriptions courtes et descriptives pour minimiser la surcharge de l'invite.

## Connexes

<CardGroup cols={2}>
  <Card title="Création de Skills" href="/fr/tools/creating-skills" icon="hammer">
    Guide étape par étape pour rédiger une compétence personnalisée.
  </Card>
  <Card title="Skill Workshop" href="/fr/tools/skill-workshop" icon="flask">
    File d'attente de propositions pour les compétences rédigées par l'agent.
  </Card>
  <Card title="Skills config" href="/fr/tools/skills-config" icon="gear">
    Schéma de configuration `skills.*` complet et listes d'autorisation de l'agent.
  </Card>
  <Card title="Slash commands" href="/fr/tools/slash-commands" icon="terminal">
    Enregistrement et routage des commandes slash des compétences.
  </Card>
  <Card title="ClawHub" href="/fr/clawhub" icon="cloud">
    Parcourir et publier des compétences sur le registre public.
  </Card>
  <Card title="Plugins" href="/fr/tools/plugin" icon="plug">
    Les plugins peuvent inclure des compétences avec les outils qu'ils documentent.
  </Card>
</CardGroup>
