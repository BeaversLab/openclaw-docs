---
summary: "Skills : géré vs espace de travail, règles de filtrage et câblage config/env"
read_when:
  - Adding or modifying skills
  - Changing skill gating or load rules
title: "Skills"
---

# Skills (OpenClaw)

OpenClaw utilise des dossiers de compétences compatibles **[AgentSkills](https://agentskills.io)** pour enseigner à l'agent comment utiliser les outils. Chaque compétence est un répertoire contenant un `SKILL.md` avec un frontmatter YAML et des instructions. OpenClaw charge les **compétences groupées** ainsi que des substitutions locales facultatives, et les filtre au chargement en fonction de l'environnement, de la configuration et de la présence des binaires.

## Emplacements et priorité

OpenClaw charge les compétences à partir de ces sources :

1. **Dossiers de compétences supplémentaires** : configurés avec `skills.load.extraDirs`
2. **Compétences groupées** : fournies avec l'installation (paquet npm ou OpenClaw.app)
3. **Compétences gérées/locales** : `~/.openclaw/skills`
4. **Compétences de l'agent personnel** : `~/.agents/skills`
5. **Compétences de l'agent de projet** : `<workspace>/.agents/skills`
6. **Compétences de l'espace de travail** : `<workspace>/skills`

Si un nom de compétition entre en conflit, la priorité est la suivante :

`<workspace>/skills` (la plus élevée) → `<workspace>/.agents/skills` → `~/.agents/skills` → `~/.openclaw/skills` → compétences groupées → `skills.load.extraDirs` (la plus basse)

## Compétences par agent vs partagées

Dans les configurations **multi-agent**, chaque agent possède son propre espace de travail. Cela signifie :

- Les **compétences par agent** résident dans `<workspace>/skills` pour cet agent uniquement.
- Les **compétences de l'agent de projet** résident dans `<workspace>/.agents/skills` et s'appliquent à
  cet espace de travail avant le dossier normal `skills/` de l'espace de travail.
- Les **compétences de l'agent personnel** résident dans `~/.agents/skills` et s'appliquent à travers
  les espaces de travail sur cette machine.
- Les **compétences partagées** résident dans `~/.openclaw/skills` (géré/local) et sont visibles
  par **tous les agents** sur la même machine.
- Des **dossiers partagés** peuvent également être ajoutés via `skills.load.extraDirs` (priorité la plus
  basse) si vous souhaitez un pack de compétences commun utilisé par plusieurs agents.

Si le même nom de compétence existe dans plusieurs emplacements, la priorité habituelle s'applique : l'espace de travail l'emporte, puis les compétences de l'agent de projet, puis les compétences de l'agent personnel, puis les compétences gérées/locales, puis les compétences groupées, puis les répertoires supplémentaires.

## Listes de contrôle d'accès des compétences de l'agent

L'**emplacement** de la compétence et la **visibilité** de la compétence sont des contrôles distincts.

- L'emplacement/la priorité détermine quelle copie d'une compétence du même nom l'emporte.
- Les listes de contrôle d'accès de l'agent déterminent quelles compétences visibles un agent peut réellement utiliser.

Utilisez `agents.defaults.skills` pour une base de référence partagée, puis remplacez par agent avec
`agents.list[].skills` :

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

Règles :

- Omettez `agents.defaults.skills` pour des compétences sans restriction par défaut.
- Omettez `agents.list[].skills` pour hériter de `agents.defaults.skills`.
- Définissez `agents.list[].skills: []` pour désactiver les compétences.
- Une liste `agents.list[].skills` non vide constitue l'ensemble final pour cet agent ; elle
  ne fusionne pas avec les valeurs par défaut.

OpenClaw applique l'ensemble de compétences effectif de l'agent lors de la construction des invites, de la découverte des commandes slash de compétences, de la synchronisation du bac à sable et des instantanés de compétences.

## Plugins + compétences

Les plugins peuvent fournir leurs propres compétences en listant les répertoires `skills` dans
`openclaw.plugin.json` (chemins relatifs à la racine du plugin). Les compétences des plugins sont
chargées lorsque le plugin est activé. Aujourd'hui, ces répertoires sont fusionnés dans le même
chemin de faible priorité que `skills.load.extraDirs`, donc une compétence groupée,
gérée, d'agent ou d'espace de travail du même nom les remplace.
Vous pouvez les conditionner via `metadata.openclaw.requires.config` sur l'entrée de configuration
du plugin. Voir [Plugins](/en/tools/plugin) pour la découverte/configuration et [Outils](/en/tools) pour
la surface outil que ces compétences enseignent.

## ClawHub (install + sync)

ClawHub est le registre public de compétences pour OpenClaw. Parcourez-le à
[https://clawhub.ai](https://clawhub.ai). Utilisez les commandes natives `openclaw skills`
pour découvrir/installer/mettre à jour les compétences, ou le `clawhub` CLI séparé lorsque
vous avez besoin des flux de travail de publication/synchronisation.
Guide complet : [ClawHub](/en/tools/clawhub).

Flux courants :

- Installer une compétence dans votre espace de travail :
  - `openclaw skills install <skill-slug>`
- Mettre à jour toutes les compétences installées :
  - `openclaw skills update --all`
- Synchroniser (scanner + publier les mises à jour) :
  - `clawhub sync --all`

L'installation native `openclaw skills install` se fait dans le répertoire `skills/`
de l'espace de travail actif. Le `clawhub` CLI séparé installe également dans `./skills` sous votre
répertoire de travail actuel (ou revient à l'espace de travail OpenClaw configuré).
OpenClaw le détecte en tant que `<workspace>/skills` lors de la prochaine session.

## Notes de sécurité

- Traitez les compétences tierces comme du **code non fiable**. Lisez-les avant de les activer.
- Préférez les exécutions en bac à sable (sandboxed) pour les entrées non fiables et les outils risqués. Voir [Bac à sable (Sandboxing)](/en/gateway/sandboxing).
- La découverte de compétences dans l'espace de travail et le répertoire supplémentaire n'accepte que les racines de compétences et les fichiers `SKILL.md` dont le chemin réel résolu reste à l'intérieur de la racine configurée.
- Les installations de dépendances de compétences basées sur le Gateway (`skills.install`, l'intégration et l'interface utilisateur des paramètres des Skills) exécutent l'analyseur de code dangereux intégré avant d'exécuter les métadonnées de l'installateur. Les résultats `critical` bloquent par défaut, sauf si l'appelant définit explicitement le substitut dangereux ; les résultats suspects génèrent tout de même un avertissement.
- `openclaw skills install <slug>` est différent : il télécharge un dossier de compétence ClawHub dans l'espace de travail et n'utilise pas le chemin des métadonnées de l'installateur mentionné ci-dessus.
- `skills.entries.*.env` et `skills.entries.*.apiKey` injectent des secrets dans le processus **hôte**
  pour ce tour d'agent (pas le bac à sable). Gardez les secrets hors des invites et des journaux.
- Pour un modèle de menace plus large et des listes de contrôle, voir [Sécurité](/en/gateway/security).

## Format (compatible AgentSkills + Pi)

`SKILL.md` doit inclure au moins :

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
---
```

Notes :

- Nous suivons la spécification AgentSkills pour la disposition et l'intention.
- L'analyseur utilisé par l'agent intégré ne prend en charge que les clés de frontmatter sur une **seule ligne**.
- `metadata` doit être un **objet JSON sur une seule ligne**.
- Utilisez `{baseDir}` dans les instructions pour référencer le chemin du dossier de la compétence.
- Clés de frontmatter facultatives :
  - `homepage` — URL affichée sous le nom « Site Web » dans l'interface utilisateur des Skills de macOS (également prise en charge via `metadata.openclaw.homepage`).
  - `user-invocable` — `true|false` (par défaut : `true`). Lorsqu'il est défini sur `true`, la compétence est exposée en tant que commande utilisateur avec une barre oblique.
  - `disable-model-invocation` — `true|false` (par défaut : `false`). Lorsqu'il est défini sur `true`, la compétence est exclue de l'invite du modèle (toujours disponible via l'invocation de l'utilisateur).
  - `command-dispatch` — `tool` (facultatif). Lorsqu'il est défini sur `tool`, la commande avec une barre oblique contourne le modèle et envoie directement à un outil.
  - `command-tool` — nom de l'outil à appeler lorsque `command-dispatch: tool` est défini.
  - `command-arg-mode` — `raw` (par défaut). Pour l'expédition de l'outil, transmet la chaîne d'arguments brute à l'outil (pas d'analyse centrale).

    L'outil est invoqué avec les paramètres :
    `{ command: "<raw args>", commandName: "<slash command>", skillName: "<skill name>" }`.

## Filtrage (filtres au chargement)

OpenClaw **filtre les compétences au moment du chargement** en utilisant `metadata` (JSON sur une seule ligne) :

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
metadata: { "openclaw": { "requires": { "bins": ["uv"], "env": ["GEMINI_API_KEY"], "config": ["browser.enabled"] }, "primaryEnv": "GEMINI_API_KEY" } }
---
```

Champs sous `metadata.openclaw` :

- `always: true` — toujours inclure la compétence (ignorer les autres barrières).
- `emoji` — emoji facultatif utilisé par l'interface utilisateur des compétences macOS.
- `homepage` — URL facultative affichée sous le nom « Site Web » dans l'interface utilisateur des compétences macOS.
- `os` — liste facultative de plateformes (`darwin`, `linux`, `win32`). Si défini, la compétence n'est éligible que sur ces systèmes d'exploitation.
- `requires.bins` — liste ; chacun doit exister sur `PATH`.
- `requires.anyBins` — liste ; au moins un doit exister sur `PATH`.
- `requires.env` — liste ; la variable d'environnement doit exister **ou** être fournie dans la configuration.
- `requires.config` — liste de chemins `openclaw.json` qui doivent être véridiques (truthy).
- `primaryEnv` — nom de la variable d'environnement associée à `skills.entries.<name>.apiKey`.
- `install` — tableau facultatif de spécifications d'installation utilisées par l'interface utilisateur des compétences macOS (brew/node/go/uv/download).

Note sur le bac à sable :

- `requires.bins` est vérifié sur l'**hôte** au moment du chargement de la compétence.
- Si un agent est en bac à sable, le binaire doit également exister **à l'intérieur du conteneur**.
  Installez-le via `agents.defaults.sandbox.docker.setupCommand` (ou une image personnalisée).
  `setupCommand` s'exécute une fois après la création du conteneur.
  Les installations de packages nécessitent également un accès sortant au réseau, un système de fichiers racine inscriptible et un utilisateur root dans le bac à sable.
  Exemple : la compétence `summarize` (`skills/summarize/SKILL.md`) a besoin du `summarize` CLI
  dans le conteneur du bac à sable pour s'exécuter.

Exemple d'installateur :

```markdown
---
name: gemini
description: Use Gemini CLI for coding assistance and Google search lookups.
metadata: { "openclaw": { "emoji": "♊️", "requires": { "bins": ["gemini"] }, "install": [{ "id": "brew", "kind": "brew", "formula": "gemini-cli", "bins": ["gemini"], "label": "Install Gemini CLI (brew)" }] } }
---
```

Remarques :

- Si plusieurs installateurs sont répertoriés, la passerelle choisit une **seule** option préférée (brew si disponible, sinon node).
- Si tous les programmes d'installation sont `download`, OpenClaw répertorie chaque entrée afin que vous puissiez voir les artefacts disponibles.
- Les spécifications du programme d'installation peuvent inclure `os: ["darwin"|"linux"|"win32"]` pour filtrer les options par plateforme.
- Les installations Node honorent `skills.install.nodeManager` dans `openclaw.json` (par défaut : npm ; options : npm/pnpm/yarn/bun).
  Cela n'affecte que les **installations de compétences** ; l'exécution Gateway doit toujours être Node
  (Bun n'est pas recommandé pour WhatsApp/Telegram).
- La sélection du programme d'installation basée sur Gateway est pilotée par les préférences, et non limitée à nœud :
  lorsque les spécifications d'installation mélangent les types, OpenClaw préfère Homebrew lorsque
  `skills.install.preferBrew` est activé et que `brew` existe, puis `uv`, puis le
  gestionnaire de nœuds configuré, puis d'autres solutions de repli comme `go` ou `download`.
- Si chaque spécification d'installation est `download`, OpenClaw affiche toutes les options de téléchargement
  au lieu de réduire à un seul programme d'installation préféré.
- Installations Go : si `go` est manquant et que `brew` est disponible, la passerelle installe Go via Homebrew en premier et définit `GOBIN` sur le `bin` de Homebrew lorsque cela est possible.
- Installations par téléchargement : `url` (requis), `archive` (`tar.gz` | `tar.bz2` | `zip`), `extract` (par défaut : auto lorsqu'une archive est détectée), `stripComponents`, `targetDir` (par défaut : `~/.openclaw/tools/<skillKey>`).

Si aucun `metadata.openclaw` n'est présent, la compétence est toujours éligible (sauf si
désactivée dans la configuration ou bloquée par `skills.allowBundled` pour les compétences groupées).

## Remplacements de configuration (`~/.openclaw/openclaw.json`)

Les compétences groupées/gérées peuvent être activées/désactivées et fournies avec des valeurs d'environnement :

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

Remarque : si le nom de la compétence contient des traits d'union, mettez la clé entre guillemets (JSON5 autorise les clés entre guillemets).

Si vous souhaitez la génération/édition d'images standard dans OpenClaw lui-même, utilisez l'outil
`image_generate` avec `agents.defaults.imageGenerationModel` au lieu d'une
compétence groupée. Les exemples de compétences ici concernent les flux de travail personnalisés ou tiers.

Pour l'analyse d'images native, utilisez l'outil `image` avec `agents.defaults.imageModel`.
Pour la génération/édition d'images native, utilisez `image_generate` avec
`agents.defaults.imageGenerationModel`. Si vous choisissez `openai/*`, `google/*`,
`fal/*`, ou un autre modèle d'image spécifique à un fournisseur, ajoutez également la clé d'authentification/API
de ce fournisseur.

Les clés de configuration correspondent au **nom de la compétence** par défaut. Si une compétence définit
`metadata.openclaw.skillKey`, utilisez cette clé sous `skills.entries`.

Règles :

- `enabled: false` désactive la compétence même si elle est groupée/installée.
- `env` : injecté **seulement si** la variable n'est pas déjà définie dans le processus.
- `apiKey` : commodité pour les compétences qui déclarent `metadata.openclaw.primaryEnv`.
  Prend en charge les chaînes en texte brut ou les objets SecretRef (`{ source, provider, id }`).
- `config` : sac (bag) optionnel pour les champs personnalisés par compétence ; les clés personnalisées doivent se trouver ici.
- `allowBundled` : liste d'autorisation (allowlist) optionnelle pour les compétences **groupées** uniquement. Si elle est définie, seules
  les compétences groupées de la liste sont éligibles (les compétences gérées/espace de travail ne sont pas concernées).

## Injection d'environnement (par exécution d'agent)

Lorsqu'une exécution d'agent démarre, OpenClaw :

1. Lit les métadonnées de la compétence.
2. Applique tous les `skills.entries.<key>.env` ou `skills.entries.<key>.apiKey` à
   `process.env`.
3. Construit le prompt système avec les compétences **éligibles**.
4. Restaure l'environnement d'origine après la fin de l'exécution.

Ceci est **délimité à l'exécution de l'agent**, et non à un environnement shell global.

Pour le backend `claude-cli` groupé, OpenClaw matérialise également le même
instantané éligible en tant que plugin Claude Code temporaire et le transmet avec
`--plugin-dir`. Claude Code peut alors utiliser son propre résolveur de compétences tandis
qu'OpenClaw possède toujours la priorité, les listes d'autorisation par agent, le filtrage et
l'injection de clé d'environnement/OpenClaw `skills.entries.*`. Les autres backends OpenClaw utilisent uniquement le
catalogue de prompt.

## Instantané de session (performance)

OpenClaw capture un instantané des compétences éligibles **lorsqu'une session démarre** et réutilise cette liste pour les tours suivants dans la même session. Les modifications des compétences ou de la configuration prennent effet lors de la prochaine nouvelle session.

Les compétences peuvent également s'actualiser en cours de session lorsque l'observateur de compétences est activé ou lorsqu'un nouveau nœud distant éligible apparaît (voir ci-dessous). Considérez cela comme un **rechargement à chaud** : la liste actualisée est prise en compte lors du prochain tour de l'agent.

Si la liste blanche effective des compétences de l'agent change pour cette session, OpenClaw
actualise l'instantané afin que les compétences visibles restent alignées avec l'agent
courant.

## Nœuds macOS distants (passerelle Linux)

Si le Gateway s'exécute sur Linux mais qu'un **nœud macOS** est connecté **avec `system.run` autorisé** (Sécurité des approbations d'exécution non définie sur `deny`), OpenClaw peut traiter les compétences exclusives à macOS comme éligibles lorsque les binaires requis sont présents sur ce nœud. L'agent doit exécuter ces compétences via l'outil `exec` avec `host=node`.

Cela repose sur la capacité du nœud à signaler sa prise en charge des commandes et sur une sonde de binaire via `system.run`. Si le nœud macOS se déconnecte par la suite, les compétences restent visibles ; les invocations peuvent échouer jusqu'à ce que le nœud se reconnecte.

## Observateur de compétences (actualisation automatique)

Par défaut, OpenClaw surveille les dossiers de compétences et met à jour l'instantané des compétences lorsque les fichiers `SKILL.md` changent. Configurez ceci sous `skills.load` :

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

## Impact sur les jetons (liste des compétences)

Lorsque les compétences sont éligibles, OpenClaw injecte une liste XML compacte des compétences disponibles dans le prompt système (via `formatSkillsForPrompt` dans `pi-coding-agent`). Le coût est déterministe :

- **Surcharge de base (uniquement lorsque ≥1 compétence) :** 195 caractères.
- **Par compétence :** 97 caractères + la longueur des valeurs `<name>`, `<description>` et `<location>` échappées en XML.

Formule (caractères) :

```
total = 195 + Σ (97 + len(name_escaped) + len(description_escaped) + len(location_escaped))
```

Notes :

- L'échappement XML développe `& < > " '` en entités (`&amp;`, `&lt;`, etc.), augmentant la longueur.
- Les nombres de jetons varient selon le tokeniseur du modèle. Une estimation de style OpenAI est d'environ ~4 caractères/jeton, donc **97 caractères ≈ 24 jetons** par compétence, plus vos longueurs de champ réelles.

## Cycle de vie des compétences gérées

OpenClaw fournit un ensemble de base de compétences en tant que **compétences groupées** dans le cadre de l'installation (package npm ou OpenClaw.app). `~/.openclaw/skills` existe pour les substitutions locales (par exemple, épingler/correctiver une compétence sans modifier la copie groupée). Les compétences de l'espace de travail sont détenues par l'utilisateur et remplacent les deux en cas de conflit de noms.

## Référence de configuration

Voir [Skills config](/en/tools/skills-config) pour le schéma de configuration complet.

## Vous cherchez plus de compétences ?

Parcourir [https://clawhub.ai](https://clawhub.ai).

---

## Connexes

- [Creating Skills](/en/tools/creating-skills) — créer des compétences personnalisées
- [Skills Config](/en/tools/skills-config) — référence de configuration des compétences
- [Slash Commands](/en/tools/slash-commands) — toutes les commandes slash disponibles
- [Plugins](/en/tools/plugin) — aperçu du système de plugins
