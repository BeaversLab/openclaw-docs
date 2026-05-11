---
summary: "Skills : géré vs espace de travail, règles de filtrage, listes autorisées de l'agent et configuration"
read_when:
  - Adding or modifying skills
  - Changing skill gating, allowlists, or load rules
  - Understanding skill precedence and snapshot behavior
title: "Skills"
sidebarTitle: "Skills"
---

OpenClaw utilise des dossiers de compétences compatibles **[AgentSkills](https://agentskills.io)** pour enseigner à l'agent comment utiliser les outils. Chaque compétence est un répertoire contenant un `SKILL.md` avec des en-têtes YAML et des instructions. OpenClaw charge les compétences incluses ainsi que des remplacements locaux facultatifs, et les filtre au chargement en fonction de l'environnement, de la configuration et de la présence de binaires.

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

## Compétences par agent vs partagées

Dans les configurations **multi-agents**, chaque agent possède son propre espace de travail :

| Portée                               | Chemin                                           | Visible par                                |
| ------------------------------------ | ------------------------------------------------ | ------------------------------------------ |
| Par agent                            | `<workspace>/skills`                             | Seulement cet agent                        |
| Agent de projet                      | `<workspace>/.agents/skills`                     | Seulement l'agent de cet espace de travail |
| Agent personnel                      | `~/.agents/skills`                               | Tous les agents sur cette machine          |
| Géré/local partagé                   | `~/.openclaw/skills`                             | Tous les agents sur cette machine          |
| Répertoires supplémentaires partagés | `skills.load.extraDirs` (priorité la plus basse) | Tous les agents sur cette machine          |

Même nom dans plusieurs endroits → la source la plus haute l'emporte. L'espace de travail l'emporte sur l'agent de projet, qui l'emporte sur l'agent personnel, qui l'emporte sur géré/local, qui l'emporte sur inclus, qui l'emporte sur les répertoires supplémentaires.

## Listes autorisées des compétences de l'agent

L'**emplacement** de la compétence et la **visibilité** de la compétence sont des contrôles distincts.
L'emplacement/la priorité décide quelle copie d'une compétence du même nom l'emporte ; les listes autorisées de l'agent décident quelles compétences un agent peut réellement utiliser.

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
  <Accordion title="Allowlist rules">
    - Omettez `agents.defaults.skills` pour des compétences sans restriction par défaut. - Omettez `agents.list[].skills` pour hériter de `agents.defaults.skills`. - Définissez `agents.list[].skills: []` pour aucune compétence. - Une liste `agents.list[].skills` non vide est l'ensemble **final** pour cet agent — elle ne fusionne pas avec les valeurs par défaut. - La liste d'autorisation effective
    s'applique à la construction des invites, à la découverte des commandes slash de compétences, à la synchronisation du bac à sable et aux instantanés de compétences.
  </Accordion>
</AccordionGroup>

## Plugins et compétences

Les plugins peuvent fournir leurs propres compétences en listant les répertoires `skills` dans
`openclaw.plugin.json` (chemins relatifs à la racine du plugin). Les compétences du plugin
se chargent lorsque le plugin est activé. C'est le bon endroit pour les guides d'exploitation spécifiques à un outil qui sont trop longs pour la description de l'outil mais qui doivent être
disponibles chaque fois que le plugin est installé — par exemple, le plugin
navigateur fournit une compétence `browser-automation` pour le contrôle multi-étapes du navigateur.

Les répertoires de compétences des plugins sont fusionnés dans le même chemin de faible priorité que
`skills.load.extraDirs`, donc une compétence groupée, gérée, d'agent ou d'espace de travail du même nom les remplace. Vous pouvez les restreindre via
`metadata.openclaw.requires.config` sur l'entrée de configuration du plugin.

Voir [Plugins](/fr/tools/plugin) pour la découverte/configuration et [Tools](/fr/tools) pour
la surface outil que ces compétences enseignent.

## Atelier de compétences

Le plugin optionnel et expérimental **Skill Workshop** peut créer ou mettre à jour
les compétences de l'espace de travail à partir de procédures réutilisables observées lors du travail de l'agent. Il
est désactivé par défaut et doit être explicitement activé via
`plugins.entries.skill-workshop`.

Skill Workshop écrit uniquement dans `<workspace>/skills`, analyse le contenu
généré, prend en charge l'approbation en attente ou les écritures automatiques sûres, met en quarantaine
les propositions non sécurisées et actualise l'instantané des compétences après des
écritures réussies afin que les nouvelles compétences soient disponibles sans redémarrage du Gateway.

Utilisez-le pour des corrections telles que _"la prochaine fois, vérifiez l'attribution des GIF"_ ou
pour des processus laborieusement acquis tels que les listes de contrôle QA de médias. Commencez avec une approbation en attente ;
utilisez les écritures automatiques uniquement dans les espaces de travail de confiance après avoir examiné
ses propositions. Guide complet : [plugin Skill Workshop](/fr/plugins/skill-workshop).

## ClawHub (installation et synchronisation)

[ClawHub](https://clawhub.ai) est le registre public de compétences pour OpenClaw.
Utilisez les commandes natives `openclaw skills` pour découvrir/installer/mettre à jour, ou la
ligne de commande CLI distincte `clawhub` pour les flux de travail de publication/synchronisation. Guide complet :
[ClawHub](/fr/tools/clawhub).

| Action                                            | Commande                               |
| ------------------------------------------------- | -------------------------------------- |
| Installer une compétence dans l'espace de travail | `openclaw skills install <skill-slug>` |
| Mettre à jour toutes les compétences installées   | `openclaw skills update --all`         |
| Synchroniser (scanner + publier les mises à jour) | `clawhub sync --all`                   |

L'installation native de `openclaw skills install` se fait dans le répertoire `skills/` de l'espace de travail actif.
La CLI distincte `clawhub` installe également dans
`./skills` sous votre répertoire de travail actuel (ou revient à l'espace de travail
OpenClaw configuré). OpenClaw le détecte comme
`<workspace>/skills` lors de la prochaine session.

## Sécurité

<Warning>Traitez les compétences tierces comme du **code non fiable**. Lisez-les avant de les activer. Privilégiez les exécutions isolées (sandboxed) pour les entrées non fiables et les outils risqués. Voir [Sandboxing](/fr/gateway/sandboxing) pour les contrôles côté agent.</Warning>

- La découverte de compétences dans l'espace de travail et les répertoires supplémentaires n'accepte que les racines de compétences et les fichiers `SKILL.md` dont le chemin réel résolu reste à l'intérieur de la racine configurée.
- Les installations de dépendances de compétences soutenues par Gateway (`skills.install`, onboarding et l'interface utilisateur des paramètres des Skills) exécutent le scanneur de code dangereux intégré avant d'exécuter les métadonnées de l'installateur. Les résultats de `critical` bloquent par défaut à moins que l'appelant ne définisse explicitement la substitution dangereuse ; les résultats suspects n'avertissent toujours que.
- `openclaw skills install <slug>` est différent — il télécharge un dossier de compétences ClawHub dans l'espace de travail et n'utilise pas le chemin des métadonnées de l'installateur ci-dessus.
- `skills.entries.*.env` et `skills.entries.*.apiKey` injectent des secrets dans le processus **hôte** pour ce tour d'agent (et non dans le bac à sable). Gardez les secrets hors des invites et des journaux.

Pour un modèle de menace plus large et des listes de contrôle, voir [Sécurité](/fr/gateway/security).

## Format SKILL.md

`SKILL.md` doit inclure au moins :

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
---
```

OpenClaw suit la spécification AgentSkills pour la mise en page/l'intention. L'analyseur utilisé par l'agent embarqué prend uniquement en charge les clés de frontmatter **sur une seule ligne** ; `metadata` doit être un **objet JSON sur une seule ligne**. Utilisez `{baseDir}` dans les instructions pour référencer le chemin du dossier de compétence.

### Clés de frontmatter facultatives

<ParamField path="homepage" type="string">
  URL affichée en tant que « Site Web » dans l'interface utilisateur des Skills macOS. Également prise en charge via `metadata.openclaw.homepage`.
</ParamField>
<ParamField path="user-invocable" type="boolean" default="true">
  Lorsque `true`, la compétence est exposée en tant que commande slash utilisateur.
</ParamField>
<ParamField path="disable-model-invocation" type="boolean" default="false">
  Lorsque `true`, la compétence est exclue de l'invite du modèle (toujours disponible via l'invocation de l'utilisateur).
</ParamField>
<ParamField path="command-dispatch" type='"tool"'>
  Lorsqu'il est défini sur `tool`, la commande slash contourne le modèle et envoie directement à un outil.
</ParamField>
<ParamField path="command-tool" type="string">
  Nom de l'outil à invoquer lorsque `command-dispatch: tool` est défini.
</ParamField>
<ParamField path="command-arg-mode" type='"raw"' default="raw">
  Pour l'envoi à l'outil, transmet la chaîne d'arguments brute à l'outil (pas d'analyse principale). L'outil est invoqué avec `{ command: "<raw args>", commandName: "<slash command>", skillName: "<skill name>" }`.
</ParamField>

## Filtrage (filtres au chargement)

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
  Lorsque `true`, toujours inclure la compétence (ignorer les autres portes).
</ParamField>
<ParamField path="emoji" type="string">
  Emoji facultatif utilisé par l'interface utilisateur des macOS Skills.
</ParamField>
<ParamField path="homepage" type="string">
  URL facultative affichée en tant que "Site Web" dans l'interface utilisateur des macOS Skills.
</ParamField>
<ParamField path="os" type='"darwin" | "linux" | "win32"' >
  Liste facultative de plateformes. Si définie, la compétence n'est éligible que sur ces systèmes d'exploitation.
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
  Liste des chemins `openclaw.json` qui doivent être vérifiés.
</ParamField>
<ParamField path="primaryEnv" type="string">
  Nom de la variable d'environnement associée à `skills.entries.<name>.apiKey`.
</ParamField>
<ParamField path="install" type="object[]">
  Spécifications d'installation facultatives utilisées par l'interface utilisateur des macOS Skills (brew/node/go/uv/download).
</ParamField>

Si aucun `metadata.openclaw` n'est présent, la compétence est toujours éligible (sauf si elle est désactivée dans la configuration ou bloquée par `skills.allowBundled` pour les compétences groupées).

<Note>Les blocs `metadata.clawdbot` hérités sont toujours acceptés lorsque `metadata.openclaw` est absent, afin que les compétences installées plus anciennes conservent leurs portes de dépendance et leurs conseils d'installation. Les nouvelles compétences mises à jour devraient utiliser `metadata.openclaw`.</Note>

### Notes sur le Sandboxing

- `requires.bins` est vérifié sur l'**hôte** au moment du chargement de la compétence.
- Si un agent est en sandbox (sandboxed), le binaire doit également exister **à l'intérieur du conteneur**. Installez-le via `agents.defaults.sandbox.docker.setupCommand` (ou une image personnalisée). `setupCommand` s'exécute une fois après la création du conteneur. Les installations de packages nécessitent également un accès réseau sortant, un système de fichiers racine accessible en écriture et un utilisateur root dans le sandbox.
- Exemple : la compétence `summarize` (`skills/summarize/SKILL.md`) nécessite la `summarize` CLI dans le conteneur sandbox pour s'exécuter à cet endroit.

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
    - Si tous les installateurs sont `download`, OpenClaw répertorie chaque entrée pour que vous puissiez voir les artefacts disponibles.
    - Les spécifications de l'installateur peuvent inclure `os: ["darwin"|"linux"|"win32"]` pour filtrer les options par plateforme.
    - Les installations Node honorent `skills.install.nodeManager` dans `openclaw.json` (par défaut : npm ; options : npm/pnpm/yarn/bun). Cela n'affecte que les installations de compétences ; l'exécution de la Gateway doit toujours être Node — Bun n'est pas recommandé pour WhatsApp/Telegram.
    - La sélection de l'installateur soutenue par la Gateway est basée sur les préférences : lorsque les spécifications d'installation mélangent les types, OpenClaw préfère Homebrew lorsque `skills.install.preferBrew` est activé et que `brew` existe, puis `uv`, puis le gestionnaire de nœud configuré, puis d'autres replis comme `go` ou `download`.
    - Si chaque spécification d'installation est `download`, OpenClaw présente toutes les options de téléchargement au lieu de réduire à un seul installateur préféré.
  </Accordion>
  <Accordion title="Détails par installateur">
    - **Installations Go :** si `go` est manquant et que `brew` est disponible, la passerelle installe d'abord Go via Homebrew et définit `GOBIN` sur le `bin` de Homebrew lorsque cela est possible.
    - **Installations par téléchargement :** `url` (requis), `archive` (`tar.gz` | `tar.bz2` | `zip`), `extract` (par défaut : auto lorsqu'une archive est détectée), `stripComponents`, `targetDir` (par défaut `~/.openclaw/tools/<skillKey>`).
  </Accordion>
</AccordionGroup>

## Remplacements de configuration

Les compétences groupées et gérées peuvent être activées/désactivées et fournies avec des valeurs d'environnement
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
  `false` désactive la compétence même si elle est groupée ou installée.
</ParamField>
<ParamField path="apiKey" type="string | { source, provider, id }">
  Raccourci pour les compétences qui déclarent `metadata.openclaw.primaryEnv`. Prend en charge le texte brut ou SecretRef.
</ParamField>
<ParamField path="env" type="Record<string, string>">
  Injecté uniquement si la variable n'est pas déjà définie dans le processus.
</ParamField>
<ParamField path="config" type="object">
  Sac optionnel pour les champs personnalisés par compétence. Les clés personnalisées doivent se trouver ici.
</ParamField>
<ParamField path="allowBundled" type="string[]">
  Liste d'autorisation (allowlist) optionnelle pour les compétences **groupées** uniquement. Si définie, seules les compétences groupées de la liste sont éligibles (les compétences gérées/espace de travail ne sont pas affectées).
</ParamField>

Si le nom de la compétence contient des traits d'union, mettez la clé entre guillemets (JSON5 autorise les clés entre guillemets).
Les clés de configuration correspondent au **nom de la compétence** par défaut — si une compétence
définit `metadata.openclaw.skillKey`, utilisez cette clé sous `skills.entries`.

<Note>
  Pour la génération/édition d'images standard dans OpenClaw, utilisez l'outil `image_generate` principal avec `agents.defaults.imageGenerationModel` au lieu d'une compétence groupée. Les exemples de compétences ici sont pour les flux de travail personnalisés ou tiers. Pour l'analyse d'image native, utilisez l'outil `image` avec `agents.defaults.imageModel`. Si vous choisissez `openai/*`,
  `google/*`, `fal/*` ou un autre modèle d'image spécifique au fournisseur, ajoutez également la clé d'authentification/OpenClaw de ce fournisseur.
</Note>

## Injection d'environnement

Lorsqu'une exécution d'agent démarre, OpenClaw :

1. Lit les métadonnées des compétences.
2. Applique `skills.entries.<key>.env` et `skills.entries.<key>.apiKey` à `process.env`.
3. Construit le invite système avec les compétences **éligibles**.
4. Restaure l'environnement d'origine après la fin de l'exécution.

L'injection d'environnement est **limitée à l'exécution de l'agent**, et non à un environnement shell
global.

Pour le backend `claude-cli` fourni, OpenClaw matérialise également le même snapshot éligible en tant que plugin Claude Code temporaire et le passe avec `--plugin-dir`. Claude Code peut alors utiliser son résolveur de compétences natif tandis qu'OpenClaw conserve toujours la priorité, les listes d'autorisation par agent, le contrôle d'accès et l'injection de clés env/OpenClaw `skills.entries.*`. Les autres backends OpenClaw utilisent uniquement le catalogue de prompts.

## Instantanés et actualisation

OpenClaw crée un instantané des compétences éligibles **lorsqu'une session démarre** et
réutilise cette liste pour les tours suivants dans la même session. Les modifications de
compétences ou de configuration prennent effet lors de la prochaine nouvelle session.

Les compétences peuvent s'actualiser en cours de session dans deux cas :

- L'observateur de compétences est activé.
- Un nouveau nœud distant éligible apparaît.

Considérez cela comme un **rechargement à chaud** : la liste actualisée est reprise au tour
de l'agent suivant. Si la liste d'autorisation des compétences effectives de l'agent change pour cette
session, OpenClaw actualise l'instantané pour que les compétences visibles restent alignées
avec l'agent actuel.

### Observateur de compétences

Par défaut, OpenClaw surveille les dossiers de compétences et met à jour l'instantané des compétences
lorsque les fichiers `SKILL.md` changent. Configurez sous `skills.load` :

```json5
{
  skills: {
    load: {
      watch: true,
      watchDebounceMs: 250,
    },
  },
}
```

### Nœuds macOS distants (passerelle Linux)

Si la Gateway s'exécute sur Linux mais qu'un **nœud macOS** est connecté avec
`system.run` autorisé (la sécurité des approbations Exec n'est pas définie sur `deny`),
OpenClaw peut considérer les compétences exclusives macOS comme éligibles lorsque les binaires
requis sont présents sur ce nœud. L'agent doit exécuter ces compétences
via l'outil `exec` avec `host=node`.

Cela repose sur le rapport de support de commande du nœud et sur une sonde de binaire
via `system.which` ou `system.run`. Les nœuds hors ligne ne rendent **pas** les
compétences à distance visibles. Si un nœud connecté cesse de répondre aux sondes de
binaires, OpenClaw efface ses correspondances de binaires mises en cache afin que les agents ne voient plus
les compétences qui ne peuvent pas y être exécutées actuellement.

## Impact sur les jetons

Lorsque les compétences sont éligibles, OpenClaw injecte une liste XML compacte des compétences
disponibles dans le système d'invite (via `formatSkillsForPrompt` dans
`pi-coding-agent`). Le coût est déterministe :

- **Surcharge de base** (uniquement lorsque ≥1 compétence) : 195 caractères.
- **Par compétence :** 97 caractères + la longueur des valeurs `<name>`, `<description>` et `<location>` échappées en XML.

Formule (caractères) :

```text
total = 195 + Σ (97 + len(name_escaped) + len(description_escaped) + len(location_escaped))
```

L'échappement XML étend `& < > " '` en entités (`&amp;`, `&lt;`, etc.),
augmentant la longueur. Le nombre de jetons varie selon le tokeniseur du modèle. Une estimation
approximative de style OpenAI est d'environ 4 caractères/jeton, donc **97 caractères ≈ 24 jetons** par
compétence plus vos longueurs de champ réelles.

## Cycle de vie des compétences gérées

OpenClaw fournit un ensemble de base de compétences en tant que **compétences groupées** avec
l'installation (paquet npm ou OpenClaw.app). `~/.openclaw/skills` existe pour
les substitutions locales — par exemple, épingler ou corriger une compétence sans
modifier la copie groupée. Les compétences de l'espace de travail sont détenues par l'utilisateur et remplacent
les deux en cas de conflit de noms.

## Vous cherchez plus de compétences ?

Parcourez [https://clawhub.ai](https://clawhub.ai). Schéma de configuration
complet : [Skills config](/fr/tools/skills-config).

## Connexes

- [ClawHub](/fr/tools/clawhub) — registre public de compétences
- [Creating skills](/fr/tools/creating-skills) — créer des compétences personnalisées
- [Plugins](/fr/tools/plugin) — vue d'ensemble du système de plugins
- [Plugin Skill Workshop](/fr/plugins/skill-workshop) — générer des compétences à partir du travail de l'agent
- [Config Skills](/fr/tools/skills-config) — référence de la configuration des compétences
- [Commandes slash](/fr/tools/slash-commands) — toutes les commandes slash disponibles
