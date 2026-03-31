---
summary: "Skills : gérées vs espace de travail, règles de filtrage et câblage config/env"
read_when:
  - Adding or modifying skills
  - Changing skill gating or load rules
title: "Skills"
---

# Skills (OpenClaw)

OpenClaw utilise des dossiers de compétences compatibles **[AgentSkills](https://agentskills.io)** pour enseigner à l'agent comment utiliser les outils. Chaque compétence est un répertoire contenant un `SKILL.md` avec des données frontmatter YAML et des instructions. OpenClaw charge les **compétences groupées** ainsi que des remplacements locaux optionnels, et les filtre au chargement en fonction de l'environnement, de la configuration et de la présence de binaires.

## Emplacements et priorité

OpenClaw charge les compétences à partir de ces sources :

1. **Dossiers de compétences supplémentaires** : configurés avec `skills.load.extraDirs`
2. **Compétences groupées** : fournies avec l'installation (paquet npm ou OpenClaw.app)
3. **Compétences gérées/locales** : `~/.openclaw/skills`
4. **Compétences de l'agent personnel** : `~/.agents/skills`
5. **Compétences de l'agent de projet** : `<workspace>/.agents/skills`
6. **Compétences de l'espace de travail** : `<workspace>/skills`

Si un nom de compétition entre en conflit, la priorité est la suivante :

`<workspace>/skills` (le plus élevé) → `<workspace>/.agents/skills` → `~/.agents/skills` → `~/.openclaw/skills` → compétences groupées → `skills.load.extraDirs` (le plus bas)

## Compétences par agent vs partagées

Dans les configurations **multi-agent**, chaque agent possède son propre espace de travail. Cela signifie :

- Les **compétences par agent** résident dans `<workspace>/skills` pour cet agent uniquement.
- **Les compétences de l'agent de projet** résident dans `<workspace>/.agents/skills` et s'appliquent
  à cet espace de travail avant le dossier normal d'espace de travail `skills/`.
- **Les compétences de l'agent personnel** résident dans `~/.agents/skills` et s'appliquent
  aux espaces de travail sur cette machine.
- **Les compétences partagées** résident dans `~/.openclaw/skills` (gérées/locales) et sont visibles
  par **tous les agents** sur la même machine.
- Des **dossiers partagés** peuvent également être ajoutés via `skills.load.extraDirs` (priorité la plus basse) si vous souhaitez utiliser un pack de compétences commun à plusieurs agents.

Si le même nom de compétence existe dans plusieurs emplacements, la priorité habituelle s'applique : l'espace de travail l'emporte, puis les compétences de l'agent de projet, puis les compétences de l'agent personnel, puis les compétences gérées/locales, puis les compétences groupées, puis les répertoires supplémentaires.

## Plugins + compétences

Les plugins peuvent fournir leurs propres compétences en répertoriant les répertoires `skills` dans
`openclaw.plugin.json` (chemins relatifs à la racine du plugin). Les compétences des plugins sont chargées
lorsque le plugin est activé. Aujourd'hui, ces répertoires sont fusionnés dans le même
chemin de faible priorité que `skills.load.extraDirs`, une compét intégrée,
gérée, d'agent ou d'espace de travail du même nom remplace donc ces compétences.
Vous pouvez les filtrer via `metadata.openclaw.requires.config` sur l'entrée de configuration
du plugin. Consultez [Plugins](/en/tools/plugin) pour la découverte/configuration et [Outils](/en/tools) pour
la surface outil que ces compétences enseignent.

## ClawHub (install + sync)

ClawHub est le registre public de compétences pour OpenClaw. Parcourez-le à
[https://clawhub.com](https://clawhub.com). Utilisez les commandes natives `openclaw skills`
pour découvrir/installer/mettre à jour des compétences, ou le CLI `clawhub` distinct lorsque
vous avez besoin de flux de travail de publication/synchronisation.
Guide complet : [ClawHub](/en/tools/clawhub).

Flux courants :

- Installer une compétence dans votre espace de travail :
  - `openclaw skills install <skill-slug>`
- Mettre à jour toutes les compétences installées :
  - `openclaw skills update --all`
- Synchroniser (analyser + publier les mises à jour) :
  - `clawhub sync --all`

Le `openclaw skills install` natif s'installe dans le répertoire de l'espace de travail actif `skills/`. L'interface `clawhub` CLI distincte s'installe également dans `./skills` sous votre répertoire de travail actuel (ou revient à l'espace de travail OpenClaw configuré). OpenClaw le récupère en tant que `<workspace>/skills` lors de la prochaine session.

## Notes de sécurité

- Traitez les compétences tierces comme du **code non fiable**. Lisez-les avant de les activer.
- Privilégiez les exécutions sandboxed pour les entrées non fiables et les outils risqués. Voir [Sandboxing](/en/gateway/sandboxing).
- La découverte de compétences dans l'espace de travail et les répertoires supplémentaires n'accepte que les racines de compétences et les fichiers `SKILL.md` dont le chemin réel résolu reste à l'intérieur de la racine configurée.
- `skills.entries.*.env` et `skills.entries.*.apiKey` injectent des secrets dans le processus **hôte**
  pour ce tour d'agent (pas le bac à sable). Gardez les secrets hors des invites et des journaux.
- Pour un modèle de menace plus large et des listes de contrôle, voir [Sécurité](/en/gateway/security).

## Format (AgentSkills + compatible Pi)

`SKILL.md` doit inclure au moins :

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
---
```

Notes :

- Nous suivons la spécification AgentSkills pour la mise en page/l'intention.
- L'analyseur utilisé par l'agent intégré prend en charge uniquement les clés de frontmatter **sur une seule ligne**.
- `metadata` doit être un **objet JSON sur une seule ligne**.
- Utilisez `{baseDir}` dans les instructions pour faire référence au chemin du dossier de compétences.
- Clés de frontmatter facultatives :
  - `homepage` — URL affichée en tant que « Site Web » dans l'interface utilisateur des Skills macOS (également prise en charge via `metadata.openclaw.homepage`).
  - `user-invocable` — `true|false` (par défaut : `true`). Lorsque `true`, la compétence est exposée en tant que commande barre oblique utilisateur.
  - `disable-model-invocation` — `true|false` (par défaut : `false`). Lorsque `true`, la compétence est exclue du prompt du modèle (toujours disponible via l'invocation de l'utilisateur).
  - `command-dispatch` — `tool` (facultatif). Lorsqu'il est défini sur `tool`, la commande de barre oblique contourne le modèle et envoie directement à un outil.
  - `command-tool` — nom de l'outil à appeler lorsque `command-dispatch: tool` est défini.
  - `command-arg-mode` — `raw` (par défaut). Pour la répartition des outils, transmet la chaîne d'arguments brute à l'outil (pas d'analyse principale).

    L'outil est appelé avec les paramètres :
    `{ command: "<raw args>", commandName: "<slash command>", skillName: "<skill name>" }`.

## Filtrage (filtres de chargement)

OpenClaw **filtre les compétences au moment du chargement** en utilisant `metadata` (JSON sur une seule ligne) :

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
metadata: { "openclaw": { "requires": { "bins": ["uv"], "env": ["GEMINI_API_KEY"], "config": ["browser.enabled"] }, "primaryEnv": "GEMINI_API_KEY" } }
---
```

Champs sous `metadata.openclaw` :

- `always: true` — toujours inclure la compétence (ignorer les autres filtres).
- `emoji` — emoji optionnel utilisé par l'interface macOS Skills.
- `homepage` — URL optionnel affiché en tant que « Site Web » dans l'interface macOS Skills.
- `os` — liste facultative de plateformes (`darwin`, `linux`, `win32`). Si définie, la compétence n'est éligible que sur ces systèmes d'exploitation.
- `requires.bins` — liste ; chacun doit exister sur `PATH`.
- `requires.anyBins` — liste ; au moins un doit exister sur `PATH`.
- `requires.env` — liste ; la env var doit exister **ou** être fournie dans la config.
- `requires.config` — liste des chemins `openclaw.json` qui doivent être véridiques.
- `primaryEnv` — nom de la env var associé à `skills.entries.<name>.apiKey`.
- `install` — tableau facultatif de spécifications d'installation utilisées par l'interface utilisateur Skills macOS (brew/node/go/uv/download).

Remarque sur le sandboxing :

- `requires.bins` est vérifié sur l'**hôte** au moment du chargement de la compétence.
- Si un agent est sandboxed, le binaire doit également exister **à l'intérieur du conteneur**.
  Installez-le via `agents.defaults.sandbox.docker.setupCommand` (ou une image personnalisée).
  `setupCommand` s'exécute une fois après la création du conteneur.
  Les installations de packages nécessitent également un accès réseau sortant, un système de fichiers racine accessible en écriture et un utilisateur root dans le sandbox.
  Exemple : la compétence `summarize` (`skills/summarize/SKILL.md`) a besoin du `summarize` CLI
  dans le conteneur sandbox pour s'exécuter.

Exemple d'installateur :

```markdown
---
name: gemini
description: Use Gemini CLI for coding assistance and Google search lookups.
metadata: { "openclaw": { "emoji": "♊️", "requires": { "bins": ["gemini"] }, "install": [{ "id": "brew", "kind": "brew", "formula": "gemini-cli", "bins": ["gemini"], "label": "Install Gemini CLI (brew)" }] } }
---
```

Notes :

- Si plusieurs installateurs sont répertoriés, la passerelle choisit une **seule** option préférée (brew si disponible, sinon node).
- Si tous les installateurs sont `download`, OpenClaw répertorie chaque entrée afin que vous puissiez voir les artefacts disponibles.
- Les spécifications de l'installateur peuvent inclure `os: ["darwin"|"linux"|"win32"]` pour filtrer les options par plateforme.
- Les installations Node respectent `skills.install.nodeManager` dans `openclaw.json` (par défaut : npm ; options : npm/pnpm/yarn/bun).
  Cela n'affecte que les **installations de compétences** ; l'exécution Gateway doit toujours être Node
  (Bun n'est pas recommandé pour WhatsApp/Telegram).
- Installations Go : si `go` est manquant et que `brew` est disponible, la passerelle installe d'abord Go via Homebrew et définit `GOBIN` sur le `bin` de Homebrew dans la mesure du possible.
- Installations par téléchargement : `url` (requis), `archive` (`tar.gz` | `tar.bz2` | `zip`), `extract` (par défaut : auto si une archive est détectée), `stripComponents`, `targetDir` (par défaut `~/.openclaw/tools/<skillKey>`).

Si aucun `metadata.openclaw` n'est présent, la compétence est toujours éligible (sauf si
désactivée dans la configuration ou bloquée par `skills.allowBundled` pour les compétences groupées).

## Remplacements de configuration (`~/.openclaw/openclaw.json`)

Les compétences groupées/gérées peuvent être activées et fournies avec des valeurs d'environnement :

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

Remarque : si le nom de la compétence contient des tirets, mettez la clé entre guillemets (JSON5 autorise les clés entre guillemets).

Si vous souhaitez une génération/édition d'images standard au sein même d'OpenClaw, utilisez l'outil central `image_generate` avec `agents.defaults.imageGenerationModel` au lieu d'une compétence groupée. Les exemples de compétences ici concernent des flux de travail personnalisés ou tiers.

Pour l'analyse d'image native, utilisez l'outil `image` avec `agents.defaults.imageModel`.
Pour la génération/édition d'image native, utilisez `image_generate` avec
`agents.defaults.imageGenerationModel`. Si vous choisissez `openai/*`, `google/*`,
`fal/*` ou un autre modèle d'image spécifique au fournisseur, ajoutez également la clé d'authentification/API de ce fournisseur.

Les clés de configuration correspondent au **nom de la compétence** par défaut. Si une compétence définit `metadata.openclaw.skillKey`, utilisez cette clé sous `skills.entries`.

Règles :

- `enabled: false` désactive la compétence même si elle est groupée/installée.
- `env` : injecté **uniquement si** la variable n'est pas déjà définie dans le processus.
- `apiKey` : commodité pour les compétences qui déclarent `metadata.openclaw.primaryEnv`.
  Prend en charge une chaîne en texte brut ou un objet SecretRef (`{ source, provider, id }`).
- `config` : sac facultatif pour les champs personnalisés par compétence ; les clés personnalisées doivent figurer ici.
- `allowBundled` : liste d'autorisation facultative pour les compétences **intégrées** uniquement. Si défini, seules les compétences intégrées de la liste sont éligibles (les compétences gérées/espace de travail ne sont pas concernées).

## Injection de l'environnement (par exécution d'agent)

Lorsqu'une exécution d'agent démarre, OpenClaw :

1. Lit les métadonnées des compétences.
2. Applique tout `skills.entries.<key>.env` ou `skills.entries.<key>.apiKey` à
   `process.env`.
3. Construit le prompt système avec les compétences **éligibles**.
4. Restaure l'environnement d'origine après la fin de l'exécution.

Cela est **délimité à l'exécution de l'agent**, et non à un environnement shell global.

## Instantané de session (performance)

OpenClaw capture les compétences éligibles **au démarrage d'une session** et réutilise cette liste pour les tours suivants de la même session. Les modifications apportées aux compétences ou à la configuration prennent effet lors de la prochaine nouvelle session.

Les compétences peuvent également être actualisées en cours de session lorsque l'observateur de compétences est activé ou lorsqu'un nouveau nœud distant éligible apparaît (voir ci-dessous). Considérez cela comme un **rechargement à chaud** : la liste actualisée est prise en compte lors du prochain tour de l'agent.

## Nœuds macOS distants (passerelle Linux)

Si le Gateway fonctionne sur Linux mais qu'un nœud **macOS** est connecté **avec `system.run` autorisé** (sécurité des approbations Exec non définie sur `deny`), OpenClaw peut considérer les compétences exclusives à macOS comme éligibles lorsque les binaires requis sont présents sur ce nœud. L'agent doit exécuter ces compétences via l'outil `nodes` (généralement `nodes.run`).

Cela repose sur le nœud signalant sa prise en charge des commandes et sur une sonde binaire via `system.run`. Si le nœud macOS se déconnecte par la suite, les compétences restent visibles ; les appels peuvent échouer jusqu'à ce que le nœud se reconnecte.

## Surveillant de compétences (actualisation automatique)

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

Lorsque les compétences sont éligibles, OpenClaw injecte une liste XML compacte des compétences disponibles dans le système de prompt (via `formatSkillsForPrompt` dans `pi-coding-agent`). Le coût est déterministe :

- **Surcharge de base (uniquement lorsqu'il y a ≥1 compétence) :** 195 caractères.
- **Par compétence :** 97 caractères + la longueur des valeurs XML-échappées `<name>`, `<description>` et `<location>`.

Formule (caractères) :

```
total = 195 + Σ (97 + len(name_escaped) + len(description_escaped) + len(location_escaped))
```

Notes :

- L'échappement XML transforme `& < > " '` en entités (`&amp;`, `&lt;`, etc.), augmentant ainsi la longueur.
- Les nombres de jetons varient selon le tokeniseur du modèle. Une estimation de style OpenAI est d'environ 4 caractères/jeton, donc **97 caractères ≈ 24 jetons** par compétence, plus vos longueurs de champ réelles.

## Cycle de vie des compétences gérées

OpenClaw fournit un ensemble de base de compétences en tant que **compétences intégrées** dans le cadre de l'installation (package npm ou OpenClaw.app). `~/.openclaw/skills` existe pour les substitutions locales (par exemple, épingler/patcher une compétence sans modifier la copie intégrée). Les compétences de l'espace de travail sont détenues par l'utilisateur et prévalent sur les deux en cas de conflit de noms.

## Référence de configuration

Voir [Configuration des compétences](/en/tools/skills-config) pour le schéma de configuration complet.

## Vous cherchez d'autres compétences ?

Parcourir [https://clawhub.com](https://clawhub.com).

---
