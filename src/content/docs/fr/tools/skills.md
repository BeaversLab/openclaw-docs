---
summary: "Skills : géré vs espace de travail, règles de filtrage, listes autorisées de l'agent et configuration"
read_when:
  - Adding or modifying skills
  - Changing skill gating, allowlists, or load rules
  - Understanding skill precedence and snapshot behavior
title: "Skills"
sidebarTitle: "Skills"
---

OpenClaw utilise des dossiers de compétences compatibles avec **[AgentSkills](https://agentskills.io)** pour enseigner à l'agent comment utiliser les outils. Chaque compétence est un répertoire contenant un `SKILL.md` avec un en-tête YAML et des instructions. OpenClaw charge les compétences groupées ainsi que des substitutions locales facultatives, et les filtre au chargement en fonction de l'environnement, de la configuration et de la présence des binaires.

## Emplacements et priorité

OpenClaw charge les compétences à partir de ces sources, **par ordre de priorité décroissant** :

| #   | Source                                  | Chemin                           |
| --- | --------------------------------------- | -------------------------------- |
| 1   | Compétences de l'espace de travail      | `<workspace>/skills`             |
| 2   | Compétences de l'agent de projet        | `<workspace>/.agents/skills`     |
| 3   | Compétences de l'agent personnel        | `~/.agents/skills`               |
| 4   | Compétences gérées/locales              | `~/.openclaw/skills`             |
| 5   | Compétences incluses                    | fournies avec l'installation     |
| 6   | Dossiers de compétences supplémentaires | `skills.load.extraDirs` (config) |

Si un nom de compétence est en conflit, la source la plus haute l'emporte.

Le répertoire natif CLI`$CODEX_HOME/skills`OpenClaw de Codex CLI n'est pas l'une de ces racines de compétences OpenClaw. En mode harnais Codex, les lancements de serveurs d'applications locaux utilisent des homes Codex isolés par agent, les compétences dans le `~/.codex/skills` personnel de l'opérateur ne sont donc pas chargées implicitement. La découverte native `.agents` de Codex utilise `HOME`OpenClaw hérité séparément ; les propres racines de compétences d'OpenClaw ci-dessus incluent déjà `~/.agents/skills`. Utilisez `openclaw migrate codex --dry-run` pour inventorier les compétences à partir du home Codex, puis `openclaw migrate codex`OpenClaw pour choisir les répertoires de compétences avec une invite à cases à cocher interactive avant de les copier dans l'espace de travail actuel de l'agent OpenClaw. Pour les exécutions non interactives, répétez `--skill <name>` pour les compétences exactes à copier.

## Compétences par agent vs partagées

Dans les configurations **multi-agents**, chaque agent possède son propre espace de travail :

| Portée                               | Chemin                                           | Visible pour                               |
| ------------------------------------ | ------------------------------------------------ | ------------------------------------------ |
| Par agent                            | `<workspace>/skills`                             | Seulement cet agent                        |
| Agent de projet                      | `<workspace>/.agents/skills`                     | Seulement l'agent de cet espace de travail |
| Agent personnel                      | `~/.agents/skills`                               | Tous les agents sur cette machine          |
| Partagé géré/local                   | `~/.openclaw/skills`                             | Tous les agents sur cette machine          |
| Répertoires supplémentaires partagés | `skills.load.extraDirs` (priorité la plus basse) | Tous les agents sur cette machine          |

Même nom dans plusieurs emplacements → la source la plus élevée l'emporte. L'espace de travail l'emporte sur
project-agent, qui l'emporte sur personal-agent, qui l'emporte sur managed/local, qui l'emporte sur bundled,
qui l'emporte sur les répertoires supplémentaires.

## Listes d'autorisation des compétences de l'agent

L'**emplacement** de la compétence et la **visibilité** de la compétence sont des contrôles distincts.
L'emplacement/la priorité détermine quelle copie d'une compétence du même nom l'emporte ; les listes d'autorisation de l'agent décident quelles compétences un agent peut réellement utiliser.

```json5
{
  agents: {
    defaults: {
      skills: ["github", "weather"],
    },
    list: [
      { id: "writer" }, // inherits github, weather
      { id: "docs", skills: ["docs-search"] }, // replaces defaults
      { id: "locked-down", skills: [] }, // no skills
    ],
  },
}
```

<AccordionGroup>
  <Accordion title="Règles de liste d'autorisation">
    - Omettez `agents.defaults.skills` pour des compétences sans restriction par défaut. - Omettez `agents.list[].skills` pour hériter de `agents.defaults.skills`. - Définissez `agents.list[].skills: []` pour aucune compétence. - Une liste `agents.list[].skills` non vide est l'ensemble **final** pour cet agent - elle ne fusionne pas avec les valeurs par défaut. - La liste d'autorisation effective
    s'applique à la construction du prompt, à la découverte des commandes slash de compétences, à la synchronisation du bac à sable et aux instantanés de compétences.
  </Accordion>
</AccordionGroup>

## Plugins et compétences

Les plugins peuvent fournir leurs propres compétences en listant les répertoires `skills` dans
`openclaw.plugin.json` (chemins relatifs à la racine du plugin). Les compétences du plugin
se chargent lorsque le plugin est activé. C'est l'endroit idéal pour les guides d'utilisation
de trop longs pour la description de l'outil mais qui doivent être
disponibles dès l'installation du plugin - par exemple, le plugin du navigateur
fournit une compétence `browser-automation` pour le contrôle multi-étapes du navigateur.

Les répertoires de compétences du plugin sont fusionnés dans le même chemin de faible priorité que
`skills.load.extraDirs`, donc une compétence intégrée, gérée, d'agent ou
de l'espace de travail du même nom les remplace. Vous pouvez les restreindre via
`metadata.openclaw.requires.config` sur l'entrée de configuration du plugin.

Consultez [Plugins](/fr/tools/plugin) pour la découverte/configuration et [Tools](/fr/tools) pour la surface tool que ces compétences enseignent.

## Atelier de compétences

Le plugin optionnel et expérimental **Skill Workshop** peut créer ou mettre à jour
les compétences de l'espace de travail à partir de procédures réutilisables observées pendant le travail de l'agent. Il
est désactivé par défaut et doit être explicitement activé via
`plugins.entries.skill-workshop`.

Skill Workshop écrit uniquement dans `<workspace>/skills`, analyse le contenu
généré, prend en charge l'approbation en attente ou les écritures automatiques sûres, met en quarantaine
les propositions non sécurisées et actualise l'instantané des compétences après des écritures
réussies, afin que les nouvelles compétences soient disponibles sans redémarrage de Gateway.

Utilisez-le pour des corrections telles que _"la prochaine fois, vérifiez l'attribution des GIF"_ ou pour des processus laborieux tels que les listes de contrôle QA média. Commencez avec une approbation en attente ; utilisez les écritures automatiques uniquement dans des espaces de travail approuvés après avoir revu ses propositions. Guide complet : [Skill Workshop plugin](/fr/plugins/skill-workshop).

## ClawHub (installation et synchronisation)

[ClawHub](https://clawhub.ai) est le registre public de compétences pour OpenClaw.
Utilisez les commandes natives `openclaw skills` pour découvrir/installer/mettre à jour, ou la
CLI distincte `clawhub` pour les flux de travail de publication/synchronisation. Guide complet :
[ClawHub](/fr/clawhub).

| Action                                                                   | Commande                                        |
| ------------------------------------------------------------------------ | ----------------------------------------------- |
| Installer une compétence dans l'espace de travail                        | `openclaw skills install <skill-slug>`          |
| Installer une compétence pour tous les agents locaux                     | `openclaw skills install <skill-slug> --global` |
| Mettre à jour toutes les compétences installées dans l'espace de travail | `openclaw skills update --all`                  |
| Mettre à jour une seule compétence gérée partagée                        | `openclaw skills update <skill-slug> --global`  |
| Mettre à jour toutes les compétences gérées partagées/locales            | `openclaw skills update --all --global`         |
| Synchroniser (scanner + publier les mises à jour)                        | `clawhub sync --all`                            |

Par défaut, `openclaw skills install` installe dans le répertoire de l'espace de travail actif `skills/`. Ajoutez `--global` pour installer dans le répertoire géré/local partagé (`~/.openclaw/skills` par défaut), qui est visible par tous les agents locaux, sauf si les listes d'autorisation de compétences des agents en restreignent la visibilité. Le `clawhub` CLI distinct installe également dans `./skills` sous votre répertoire de travail actuel (ou revient à l'espace de travail OpenClaw configuré). OpenClaw le récupère en tant que `<workspace>/skills` lors de la prochaine session.
Les racines de compétences configurées prennent également en charge un niveau de regroupement, tel que `skills/<group>/<skill>/SKILL.md`, afin que les compétences tierces associées puissent être conservées dans un dossier partagé sans analyse récursive approfondie.

Les clients Gateway qui ont besoin d'une livraison privée, non ClawHub, peuvent préparer une archive de compétences zip avec GatewayClawHub`skills.upload.begin`, `skills.upload.chunk` et `skills.upload.commit`, puis installer le téléversement validé avec `skills.install({ source: "upload", uploadId, slug, force?, sha256? })`. Il s'agit d'un chemin de téléversement administratif explicite pour les clients de confiance, et non du flux d'installation normal `openclaw skills install <slug>`ClawHub ou ClawHub. Il est désactivé par défaut et ne fonctionne que lorsque `skills.install.allowUploadedArchives: true` est défini dans `openclaw.json`. Le mode de téléversement installe toujours dans le répertoire de l'espace de travail de l'agent par défaut `skills/<slug>` ; le nom du dossier interne de l'archive est ignoré pour la cible d'installation finale.

Les pages de compétences ClawHub exposent l'état le plus récent de l'analyse de sécurité avant l'installation, avec des pages détaillées d'analyse pour VirusTotal, ClawScan et l'analyse statique. ClawHub`openclaw skills install <slug>`ClawHub reste le seul chemin d'installation ; les éditeurs peuvent récupérer les faux positifs via le tableau de bord ClawHub ou `clawhub skill rescan <slug>`.

## Sécurité

<Warning>Traitez les compétences tierces comme du **code non fiable**. Lisez-les avant de les activer. Privilégiez les exécutions en mode sandboxed pour les entrées non fiables et les outils risqués. Voir [Sandboxing](/fr/gateway/sandboxing) pour les contrôles côté agent.</Warning>

- La découverte de compétences dans l'espace de travail, l'agent de projet et le répertoire supplémentaire n'accepte que les racines de compétences dont le chemin réel résolu reste à l'intérieur de la racine configurée, sauf si `skills.load.allowSymlinkTargets` fait explicitement confiance à une racine cible. Les compétences groupées restent toujours contenues. Les racines gérées `~/.openclaw/skills` et personnelles `~/.agents/skills` peuvent contenir des dossiers de compétences liés par des liens symboliques installés par ClawHub ou un autre gestionnaire de compétences local, mais chaque chemin réel `SKILL.md` doit toujours rester à l'intérieur de son répertoire de compétences résolu.
- Gateway private archive installs are off by default. When explicitly enabled,
  they require a committed zip upload containing Gateway`SKILL.md`ClawHub and reuse the same
  archive extraction, path traversal, symlink, force, and rollback protections as
  ClawHub skill installs. They are gated by
  `skills.install.allowUploadedArchives`ClawHub; normal ClawHub installs do not require
  that setting.
- Gateway-backed skill dependency installs (Gateway`skills.install`, onboarding, and the Skills settings UI) run the built-in dangerous-code scanner before executing installer metadata. `critical` findings block by default unless the caller explicitly sets the dangerous override; suspicious findings still warn only.
- `openclaw skills install <slug>` est différent — il télécharge un dossier de compétences ClawHub dans l'espace de travail, ou dans des compétences partagées gérées/locales avec `--global`, et n'utilise pas le chemin des métadonnées de l'installateur ci-dessus.
- `skills.entries.*.env` et `skills.entries.*.apiKey` injectent des secrets dans le processus **hôte** pour ce tour d'agent (pas le bac à sable). Gardez les secrets hors des invites et des journaux.

Pour un modèle de menace plus large et des listes de contrôle, voir [Sécurité](/fr/gateway/security).

## Format SKILL.md

`SKILL.md` doit inclure au moins :

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
---
```

OpenClaw suit la spécification AgentSkills pour la disposition/l'intention. L'analyseur utilisé par l'agent intégré prend en charge uniquement les clés de frontmatter sur **une seule ligne** ; `metadata` doit être un **objet JSON sur une seule ligne**. Utilisez `{baseDir}` dans les instructions pour référencer le chemin du dossier de compétence.

### Clés de frontmatter facultatives

<ParamField path="homepage" type="string">
  URL affichée en tant que « Site Web » dans l'interface utilisateur Skills de macOS. Également pris en charge via `metadata.openclaw.homepage`.
</ParamField>
<ParamField path="user-invocable" type="boolean" default="true">
  Lorsque `true`, la compétence est exposée en tant que commande slash utilisateur.
</ParamField>
<ParamField path="disable-model-invocation" type="boolean" default="false">
  Lorsque `true`, OpenClaw garde les instructions de la compétence hors du prompt normal de l'agent. La compétence est toujours installée et peut toujours être exécutée explicitement en tant que commande slash lorsque `user-invocable` est également `true`.
</ParamField>
<ParamField path="command-dispatch" type='"tool"'>
  Lorsqu'il est défini sur `tool`, la commande slash contourne le modèle et envoie directement à un outil.
</ParamField>
<ParamField path="command-tool" type="string">
  Nom de l'outil à invoquer lorsque `command-dispatch: tool` est défini.
</ParamField>
<ParamField path="command-arg-mode" type='"raw"' default="raw">
  Pour l'envoi à l'outil, transfère la chaîne d'arguments brute à l'outil (pas d'analyse centrale). L'outil est invoqué avec `{ command: "<raw args>", commandName: "<slash command>", skillName: "<skill name>" }`.
</ParamField>

## Gating (filtres au chargement)

OpenClaw filtre les compétences au moment du chargement en utilisant `metadata` (JSON sur une seule ligne) :

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
metadata: { "openclaw": { "requires": { "bins": ["uv"], "env": ["GEMINI_API_KEY"], "config": ["browser.enabled"] }, "primaryEnv": "GEMINI_API_KEY" } }
---
```

Champs sous `metadata.openclaw` :

<ParamField path="always" type="boolean">
  Lorsque `true`, inclure toujours la compétence (ignorer les autres portes).
</ParamField>
<ParamField path="emoji" type="string">
  Emoji optionnel utilisé par l'interface utilisateur des Skills macOS.
</ParamField>
<ParamField path="homepage" type="string">
  URL optionnel affiché comme « Site Web » dans l'interface utilisateur des Skills macOS.
</ParamField>
<ParamField path="os" type='"darwin" | "linux" | "win32"' >
  Liste optionnelle de plateformes. Si défini, la compétence n'est éligible que sur ces systèmes d'exploitation.
</ParamField>
<ParamField path="requires.bins" type="string[]">
  Chacun doit exister sur `PATH`.
</ParamField>
<ParamField path="requires.anyBins" type="string[]">
  Au moins un doit exister sur `PATH`.
</ParamField>
<ParamField path="requires.env" type="string[]">
  La variable d'environnement doit exister ou être fournie dans la configuration.
</ParamField>
<ParamField path="requires.config" type="string[]">
  Liste des chemins `openclaw.json` qui doivent être véridiques.
</ParamField>
<ParamField path="primaryEnv" type="string">
  Nom de la variable d'environnement associée à `skills.entries.<name>.apiKey`.
</ParamField>
<ParamField path="install" type="object[]">
  Spécifications d'installation optionnelles utilisées par l'interface utilisateur des Skills macOS (brew/node/go/uv/download).
</ParamField>

Si aucun `metadata.openclaw` n'est présent, la compétence est toujours éligible (sauf si elle est désactivée dans la configuration ou bloquée par `skills.allowBundled` pour les compétences groupées).

<Note>Les blocs `metadata.clawdbot` hérités sont toujours acceptés lorsque `metadata.openclaw` est absent, afin que les compétences installées plus anciennes conservent leurs portes de dépendance et leurs indications d'installation. Les nouvelles compétences mises à jour doivent utiliser `metadata.openclaw`.</Note>

### Notes sur le sandboxing

- `requires.bins` est vérifié sur l'**hôte** au moment du chargement de la compétence.
- Si un agent est sandboxed, le binaire doit également exister **à l'intérieur du conteneur**. Installez-le via `agents.defaults.sandbox.docker.setupCommand` (ou une image personnalisée). `setupCommand` s'exécute une fois après la création du conteneur. Les installations de packages nécessitent également une sortie réseau, un système de fichiers racine inscriptible et un utilisateur root dans le sandbox.
- Exemple : la compétence `summarize` (`skills/summarize/SKILL.md`) a besoin du `summarize` CLI dans le conteneur de bac à sable (sandbox) pour s'exécuter.

### Spécifications de l'installateur

```markdown
---
name: gemini
description: Use Gemini CLI for coding assistance and Google search lookups.
metadata: { "openclaw": { "emoji": "♊️", "requires": { "bins": ["gemini"] }, "install": [{ "id": "brew", "kind": "brew", "formula": "gemini-cli", "bins": ["gemini"], "label": "Install Gemini CLI (brew)" }] } }
---
```

<AccordionGroup>
  <Accordion title="Règles de sélection de l'installateur">
    - Si plusieurs installateurs sont répertoriés, la passerelle choisit une option préférée unique (brew si disponible, sinon node).
    - Si tous les installateurs sont `download`, OpenClaw répertorie chaque entrée afin que vous puissiez voir les artefacts disponibles.
    - Les spécifications de l'installateur peuvent inclure `os: ["darwin"|"linux"|"win32"]` pour filtrer les options par plateforme.
    - Les installations Node honorent `skills.install.nodeManager` dans `openclaw.json` (par défaut : npm ; options : npm/pnpm/yarn/bun). Cela n'affecte que les installations de compétences ; l'exécution du Gateway doit toujours être Node - Bun n'est pas recommandé pour WhatsApp/Telegram.
    - La sélection de l'installateur soutenue par le Gateway est basée sur les préférences : lorsque les spécifications d'installation mélangent des types, OpenClaw préfère Homebrew lorsque `skills.install.preferBrew` est activé et que `brew` existe, puis `uv`, puis le gestionnaire de node configuré, puis autres solutions de repli comme `go` ou `download`.
    - Si chaque spécification d'installation est `download`, OpenClaw affiche toutes les options de téléchargement au lieu de réduire à un seul installateur préféré.

  </Accordion>
  <Accordion title="Détails par installateur"OpenClawLinux>
    - **Installations Homebrew :** OpenClaw n'installe pas automatiquement Homebrew et ne traduit pas les formules brew en commandes du gestionnaire de paquets du système. Dans les conteneurs Linux sans `brew`, l'intégration masque les programmes d'installation des dépendances exclusives à brew ; utilisez une image personnalisée ou installez la dépendance manuellement avant d'activer cette compétence.
    - **Installations Go :** si `go` est manquant et que `brew` est disponible, la passerelle installe d'abord Go via Homebrew et définit `GOBIN` sur le `bin` de Homebrew lorsque cela est possible.
    - **Installations par téléchargement :** `url` (requis), `archive` (`tar.gz` | `tar.bz2` | `zip`), `extract` (par défaut : auto lorsqu'une archive est détectée), `stripComponents`, `targetDir` (par défaut `~/.openclaw/tools/<skillKey>`).

  </Accordion>
</AccordionGroup>

## Remplacements de configuration

Les compétences groupées et gérées peuvent être activées et fournies avec des valeurs d'environnement
sous `skills.entries` dans `~/.openclaw/openclaw.json` :

```json5
{
  skills: {
    entries: {
      "image-lab": {
        enabled: true,
        apiKey: { source: "env", provider: "default", id: "GEMINI_API_KEY" }, // or plaintext string
        env: {
          GEMINI_API_KEY: "GEMINI_KEY_HERE",
        },
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
  `false` désactive la compétence même si elle est fournie ou installée. La compétence fournie `coding-agent` est optionnelle : définissez `skills.entries.coding-agent.enabled: true` avant de l'exposer aux agents, puis assurez-vous que l'un des éléments suivants `claude`, `codex`, `opencode`, ou `pi` est installé et authentifié pour son propre CLI.
</ParamField>
<ParamField path="apiKey" type="string | { source, provider, id }">
  Commodité pour les compétences qui déclarent `metadata.openclaw.primaryEnv`. Prend en charge le texte brut ou SecretRef.
</ParamField>
<ParamField path="env" type="Record<string, string>">
  Injecté uniquement si la variable n'est pas déjà définie dans le processus.
</ParamField>
<ParamField path="config" type="object">
  Sac facultatif pour les champs personnalisés par compétence. Les clés personnalisées doivent se trouver ici.
</ParamField>
<ParamField path="allowBundled" type="string[]">
  Liste d'autorisation facultative pour les compétences **fournies** uniquement. Si défini, seules les compétences fournies dans la liste sont éligibles (les compétences gérées/espace de travail ne sont pas concernées).
</ParamField>

Si le nom de la compétence contient des traits d'union, mettez la clé entre guillemets (JSON5 autorise les clés entre guillemets). Les clés de configuration correspondent au **nom de la compétence** par défaut - si une compétence définit `metadata.openclaw.skillKey`, utilisez cette clé sous `skills.entries`.

<Note>
  Pour la génération/édition d'images standard dans OpenClaw, utilisez l'outil principal `image_generate` avec `agents.defaults.imageGenerationModel` au lieu d'une compétence groupée. Les exemples de compétences ici concernent les flux de travail personnalisés ou tiers. Pour l'analyse d'images native, utilisez l'outil `image` avec `agents.defaults.imageModel`. Si vous choisissez `openai/*`,
  `google/*`, `fal/*` ou un autre modèle d'image spécifique à un fournisseur, ajoutez également la clé d'authentification/API de ce fournisseur.
</Note>

## Injection d'environnement

Lorsqu'une exécution d'agent démarre, OpenClaw :

1. Lit les métadonnées des compétences.
2. Applique `skills.entries.<key>.env` et `skills.entries.<key>.apiKey` à `process.env`.
3. Construit le prompt système avec les compétences **éligibles**.
4. Restaure l'environnement d'origine après la fin de l'exécution.

L'injection d'environnement est **limitée à l'exécution de l'agent**, et non à un environnement shell global.

Pour le backend `claude-cli` inclus, OpenClaw matérialise également le même snapshot éligible en tant que plugin Claude Code temporaire et le transmet avec `--plugin-dir`. Claude Code peut ensuite utiliser son résolveur de compétences natif tandis que OpenClaw conserve toujours la priorité, les listes d'autorisation par agent, le contrôle d'accès et l'injection de variables d'environnement/de clés `skills.entries.*`/API. Les autres backends CLI utilisent uniquement le catalogue de invites.

## Snapshots et actualisation

OpenClaw capture instantanément les compétences éligibles **lorsqu'une session démarre** et
réutilise cette liste pour les tours suivants de la même session. Les modifications apportées
aux compétences ou à la configuration prennent effet lors de la prochaine nouvelle session.

Les compétences peuvent être actualisées en cours de session dans deux cas :

- L'observateur de compétences est activé.
- Un nouveau nœud distant éligible apparaît.

Considérez cela comme un **rechargement à chaud (hot reload)** : la liste actualisée est récupérée lors du
tour suivant de l'agent. Si la liste d'autorisation effective des compétences de l'agent change pour cette
session, OpenClaw actualise l'instantané afin que les compétences visibles restent alignées
avec l'agent actuel.

### Observateur de compétences

Par défaut, OpenClaw surveille les dossiers de compétences et met à jour l'instantané des compétences
lorsque les fichiers `SKILL.md` sont modifiés. Configurez sous `skills.load` :

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

Utilisez `allowSymlinkTargets` pour les mises en page intentionnelles d'espace de travail, d'agent de projet ou de répertoire supplémentaire où une racine de compétences contient un lien symbolique, par exemple `<workspace>/skills/manager -> ~/Projects/manager/skills`. Les `~/.openclaw/skills` gérés et les `~/.agents/skills` personnels peuvent suivre les liens symboliques de répertoires de compétences à partir de gestionnaires de compétences locaux par défaut, mais la liste cible est toujours mise en correspondance après la résolution de realpath et doit rester étroite lorsqu'elle est configurée.

### Nœuds macOS distants (passerelle Linux)

Si le Gateway s'exécute sur Linux mais qu'un nœud **macOS** est connecté avec
`system.run` autorisé (la sécurité des approbations d'exécution n'est pas définie sur `deny`),
OpenClaw peut considérer les compétences exclusives à macOS comme éligibles lorsque les binaires
requis sont présents sur ce nœud. L'agent doit exécuter ces compétences
via l'outil `exec` avec `host=node`.

Cela repose sur la déclaration de la prise en charge des commandes par le nœud et sur une sonde de binaire
via `system.which` ou `system.run`. Les nœuds hors ligne ne rendent **pas** les
compétences à distance visibles. Si un nœud connecté cesse de répondre aux sondes de
binaires, OpenClaw efface ses correspondances de binaires mises en cache afin que les agents ne voient plus
les compétences qui ne peuvent pas actuellement y être exécutées.

## Impact sur les jetons

Lorsque les compétences sont éligibles, OpenClaw injecte une liste XML compacte des compétences disponibles dans le invite système (via OpenClaw`formatSkillsForPrompt` dans `pi-coding-agent`). Le coût est déterministe :

- **Frais généraux de base** (seulement lorsqu'il y a ≥1 compétence) : 195 caractères.
- **Par compétence :** 97 caractères + la longueur des valeurs `<name>`, `<description>` et `<location>` échappées en XML.

Formule (caractères) :

```text
total = 195 + Σ (97 + len(name_escaped) + len(description_escaped) + len(location_escaped))
```

L'échappement XML étend `& < > " '` en entités (`&amp;`, `&lt;`OpenAI, etc.),
augmentant la longueur. Les comptes de jetons varient selon le tokenizer du modèle. Une estimation approximative de style OpenAI est d'environ 4 caractères/jeton, donc **97 caractères ≈ 24 jetons** par
compétence plus vos longueurs de champ réelles.

## Cycle de vie des compétences gérées

OpenClaw fournit un ensemble de base de compétences en tant que **compétences groupées** avec l'installation (paquet npm ou OpenClaw.app). OpenClawnpmOpenClaw`~/.openclaw/skills` existe pour les remplacements locaux - par exemple, épingler ou corriger une compétence sans modifier la copie groupée. Les compétences de l'espace de travail sont détenues par l'utilisateur et remplacent les deux en cas de conflit de noms.

## Vous cherchez plus de compétences ?

Parcourez [https://clawhub.ai](https://clawhub.ai). Schéma de configuration complet : [Skills config](/fr/tools/skills-config).

## Connexes

- [ClawHub](ClawHub/en/clawhub) - registre public de compétences
- [Creating skills](/fr/tools/creating-skills) - créer des compétences personnalisées
- [Plugins](/fr/tools/plugin) - aperçu du système de plugins
- [Skill Workshop plugin](/fr/plugins/skill-workshop) - générer des compétences à partir du travail de l'agent
- [Configuration des Skills](/fr/tools/skills-config) - référence de configuration des compétences
- [Commandes slash](/fr/tools/slash-commands) - toutes les commandes slash disponibles
