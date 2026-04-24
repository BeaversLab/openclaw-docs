---
summary: "Skills : géré vs espace de travail, règles de filtrage et câblage config/env"
read_when:
  - Adding or modifying skills
  - Changing skill gating or load rules
title: "Skills"
---

# Skills (OpenClaw)

OpenClaw utilise des dossiers de compétences **compatibles avec [AgentSkills](https://agentskills.io)** pour apprendre à l'agent à utiliser les outils. Chaque compétence est un répertoire contenant un `SKILL.md` avec des en-têtes YAML et des instructions. OpenClaw charge les **compétences groupées** ainsi que des remplacements locaux facultatifs, et les filtre au chargement en fonction de l'environnement, de la configuration et de la présence des binaires.

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
`openclaw.plugin.json` (chemins relatifs à la racine du plugin). Les compétences du plugin se chargent
lorsque le plugin est activé. Aujourd'hui, ces répertoires sont fusionnés dans le même
chemin de faible priorité que `skills.load.extraDirs`, donc une compétence groupée,
gérée, d'agent ou d'espace de travail du même nom les remplace.
Vous pouvez les filtrer via `metadata.openclaw.requires.config` sur l'entrée de configuration
du plugin. Voir [Plugins](/fr/tools/plugin) pour la découverte/configuration et [Outils](/fr/tools) pour la
surface outil que ces compétences enseignent.

## Atelier de compétences

Le plugin optionnel et expérimental Atelier de compétences peut créer ou mettre à jour des compétences
d'espace de travail à partir de procédures réutilisables observées lors du travail de l'agent. Il est désactivé par
défaut et doit être explicitement activé via
`plugins.entries.skill-workshop`.

L'Atelier de compétences n'écrit que dans `<workspace>/skills`, analyse le contenu généré,
supporte l'approbation en attente ou les écritures automatiques sûres, met en quarantaine les propositions
non sécurisées, et actualise l'instantané des compétences après des écritures réussies afin que les nouvelles
compétences puissent être disponibles sans redémarrage de la Gateway.

Utilisez-le lorsque vous souhaitez que des corrections telles que « la prochaine fois, vérifiez l'attribution du GIF » ou
des processus laborieux tels que les listes de contrôle QA média deviennent des instructions
procédurales durables. Commencez par l'approbation en attente ; n'utilisez les écritures automatiques que dans les espaces de travail
de confiance après avoir examiné ses propositions. Guide complet :
[Plugin Atelier de compétences](/fr/plugins/skill-workshop).

## ClawHub (install + sync)

ClawHub est le registre public de compétences pour OpenClaw. Parcourez-le sur
[https://clawhub.ai](https://clawhub.ai). Utilisez les commandes natives `openclaw skills`
pour découvrir/installer/mettre à jour des compétences, ou la CLI `clawhub` séparée lorsque
vous avez besoin de flux de travail de publication/synchronisation.
Guide complet : [ClawHub](/fr/tools/clawhub).

Flux courants :

- Installez une compétence dans votre espace de travail :
  - `openclaw skills install <skill-slug>`
- Mettre à jour toutes les compétences installées :
  - `openclaw skills update --all`
- Synchroniser (analyser + publier les mises à jour) :
  - `clawhub sync --all`

L'installation native `openclaw skills install` se fait dans le répertoire `skills/`
de l'espace de travail actif. La `clawhub` CLI distincte installe également dans `./skills` sous votre
dossier de travail actuel (ou revient à l'espace de travail OpenClaw configuré).
OpenClaw la détecte en tant que `<workspace>/skills` lors de la prochaine session.

## Notes de sécurité

- Traitez les compétences tierces comme du **code non fiable**. Lisez-les avant de les activer.
- Préférez les exécutions en bac à sable (sandboxed) pour les entrées non fiables et les outils risqués. Voir [Sandboxing](/fr/gateway/sandboxing).
- La découverte de compétences dans l'espace de travail et le répertoire supplémentaire n'accepte que les racines de compétences et les fichiers `SKILL.md` dont le chemin réel résolu reste à l'intérieur de la racine configurée.
- Les installations de dépendances de compétences basées sur Gateway (`skills.install`, onboarding et l'interface utilisateur des paramètres Skills) exécutent le scanneur de code dangereux intégré avant d'exécuter les métadonnées de l'installateur. Les résultats `critical` bloquent par défaut sauf si l'appelant définit explicitement le remplacement dangereux ; les résultats suspects ne font que générer un avertissement.
- `openclaw skills install <slug>` est différent : il télécharge un dossier de compétence ClawHub dans l'espace de travail et n'utilise pas le chemin des métadonnées de l'installateur ci-dessus.
- `skills.entries.*.env` et `skills.entries.*.apiKey` injectent des secrets dans le processus **hôte**
  pour ce tour d'agent (pas le bac à sable). Gardez les secrets hors des invites et des journaux.
- Pour un modèle de menace plus large et des listes de contrôle, voir [Security](/fr/gateway/security).

## Format (compatible AgentSkills + Pi)

`SKILL.md` doit inclure au moins :

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
---
```

Notes :

- Nous suivons la spécification AgentSkills pour la mise en page/l'intention.
- L'analyseur utilisé par l'agent intégré prend uniquement en charge les clés de frontmatter **sur une seule ligne**.
- `metadata` doit être un **objet JSON sur une seule ligne**.
- Utilisez `{baseDir}` dans les instructions pour faire référence au chemin du dossier de la compétence.
- Clés de frontmatter optionnelles :
  - `homepage` — URL affichée sous le nom « Site Web » dans l'interface Skills de macOS (également pris en charge via `metadata.openclaw.homepage`).
  - `user-invocable` — `true|false` (par défaut : `true`). Lorsque `true`, la compétence est exposée en tant que commande slash utilisateur.
  - `disable-model-invocation` — `true|false` (par défaut : `false`). Lorsque `true`, la compétence est exclue du modèle (toujours disponible via invocation utilisateur).
  - `command-dispatch` — `tool` (facultatif). Lorsqu'il est défini sur `tool`, la commande slash contourne le modèle et envoie directement à un outil.
  - `command-tool` — nom de l'outil à invoquer lorsque `command-dispatch: tool` est défini.
  - `command-arg-mode` — `raw` (par défaut). Pour l'envoi vers l'outil, transmet la chaîne d'arguments brute à l'outil (pas d'analyse centrale).

    L'outil est invoqué avec les paramètres :
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

- `always: true` — toujours inclure la compétence (ignorer les autres portes).
- `emoji` — emoji facultatif utilisé par l'interface Skills de macOS.
- `homepage` — URL facultative affichée sous le nom « Site Web » dans l'interface Skills de macOS.
- `os` — liste facultative de plateformes (`darwin`, `linux`, `win32`). Si défini, la compétence n'est éligible que sur ces systèmes d'exploitation.
- `requires.bins` — liste ; chacun doit exister sur `PATH`.
- `requires.anyBins` — liste ; au moins un doit exister sur `PATH`.
- `requires.env` — liste ; la variable d'environnement doit exister **ou** être fournie dans la configuration.
- `requires.config` — liste de chemins `openclaw.json` qui doivent être vrais.
- `primaryEnv` — nom de la variable d'environnement associée à `skills.entries.<name>.apiKey`.
- `install` — tableau facultatif de spécifications d'installation utilisées par l'interface utilisateur Skills de macOS (brew/node/go/uv/download).

Note sur le sandboxing :

- `requires.bins` est vérifié sur l'**hôte** au moment du chargement de la compétence.
- Si un agent est sandboxé, le binaire doit également exister **à l'intérieur du conteneur**.
  Installez-le via `agents.defaults.sandbox.docker.setupCommand` (ou une image personnalisée).
  `setupCommand` s'exécute une fois après la création du conteneur.
  Les installations de packages nécessitent également un accès réseau sortant, un système de fichiers racine inscriptible et un utilisateur root dans le sandbox.
  Exemple : la compétence `summarize` (`skills/summarize/SKILL.md`) a besoin du `summarize` CLI
  dans le conteneur sandbox pour s'y exécuter.

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
  Cela n'affecte que les **installations de compétences** ; l'exécution du Gateway doit toujours être Node
  (Bun n'est pas recommandé pour WhatsApp/Telegram).
- La sélection de l'installateur prise en charge par Gateway est basée sur les préférences, et non uniquement sur node :
  lorsque les spécifications d'installation mélangent les types, OpenClaw préfère Homebrew lorsque
  `skills.install.preferBrew` est activé et que `brew` existe, puis `uv`, puis le
  gestionnaire de node configuré, puis autres solutions de repli comme `go` ou `download`.
- Si chaque spécification d'installation est `download`, OpenClaw affiche toutes les options de téléchargement
  au lieu de réduire à un seul installateur préféré.
- Installations Go : si `go` est manquant et que `brew` est disponible, la passerelle installe d'abord Go via Homebrew et définit `GOBIN` sur le `bin` de Homebrew lorsque cela est possible.
- Download installs: `url` (required), `archive` (`tar.gz` | `tar.bz2` | `zip`), `extract` (default: auto when archive detected), `stripComponents`, `targetDir` (default: `~/.openclaw/tools/<skillKey>`).

If no `metadata.openclaw` is present, the skill is always eligible (unless
disabled in config or blocked by `skills.allowBundled` for bundled skills).

## Config overrides (`~/.openclaw/openclaw.json`)

Bundled/managed skills can be toggled and supplied with env values:

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

Note: if the skill name contains hyphens, quote the key (JSON5 allows quoted keys).

If you want stock image generation/editing inside OpenClaw itself, use the core
`image_generate` tool with `agents.defaults.imageGenerationModel` instead of a
bundled skill. Skill examples here are for custom or third-party workflows.

For native image analysis, use the `image` tool with `agents.defaults.imageModel`.
For native image generation/editing, use `image_generate` with
`agents.defaults.imageGenerationModel`. If you pick `openai/*`, `google/*`,
`fal/*`, or another provider-specific image model, add that provider's auth/API
key too.

Config keys match the **skill name** by default. If a skill defines
`metadata.openclaw.skillKey`, use that key under `skills.entries`.

Rules:

- `enabled: false` disables the skill even if it’s bundled/installed.
- `env`: injected **only if** the variable isn’t already set in the process.
- `apiKey`: convenience for skills that declare `metadata.openclaw.primaryEnv`.
  Supports plaintext string or SecretRef object (`{ source, provider, id }`).
- `config`: optional bag for custom per-skill fields; custom keys must live here.
- `allowBundled` : liste d'autorisation (allowlist) facultative pour les **compétences regroupées (bundled)** uniquement. Si défini, seules les compétences regroupées de la liste sont éligibles (les compétences gérées/de l'espace de travail ne sont pas affectées).

## Injection d'environnement (par exécution d'agent)

Lorsqu'une exécution d'agent démarre, OpenClaw :

1. Lit les métadonnées des compétences.
2. Applique tous les `skills.entries.<key>.env` ou `skills.entries.<key>.apiKey` à
   `process.env`.
3. Construit le prompt système avec les compétences **éligibles**.
4. Restaure l'environnement d'origine après la fin de l'exécution.

Ceci est **limité à l'exécution de l'agent**, et non à un environnement shell global.

Pour le backend `claude-cli` inclus, OpenClaw matérialise également le même instantané éligible en tant que plugin temporaire Claude Code et le transmet avec
`--plugin-dir`. Claude Code peut alors utiliser son résolveur de compétences natif tandis que
OpenClaw conserve la priorité, les listes d'autorisation par agent, le filtrage (gating), et
l'injection de clé env/API `skills.entries.*`. Les autres backends CLI utilisent uniquement le catalogue de prompts.

## Instantané de session (performance)

%%PH:GLOSSARY:227:026e7181**capture un instantané des compétences éligibles **lorsqu'une session démarre\*\* et réutilise cette liste pour les tours suivants de la même session. Les modifications des compétences ou de la configuration prennent effet lors de la prochaine nouvelle session.

Les compétences peuvent également être actualisées en cours de session lorsque l'observateur de compétences (skills watcher) est activé ou lorsqu'un nouveau nœud distant éligible apparaît (voir ci-dessous). Considérez cela comme un **rechargement à chaud (hot reload)** : la liste actualisée est récupérée lors du prochain tour de l'agent.

Si la liste d'autorisation des compétences effectives pour l'agent change pour cette session, OpenClaw
actualise l'instantané afin que les compétences visibles restent alignées avec l'agent actuel.

## Nœuds distants %%PH:GLOSSARY:230:56359eb8** (passerelle %%PH:GLOSSARY:229:5a9795a1**)

Si le Gateway fonctionne sur Linux mais qu'un **nœud macOS** est connecté **avec `system.run` autorisé** (la sécurité des approbations d'exécution n'est pas définie sur `deny`), OpenClaw peut considérer les compétences exclusives à macOS comme éligibles lorsque les binaires requis sont présents sur ce nœud. L'agent doit exécuter ces compétences via l'outil `exec` avec `host=node`.

Ceci repose sur le rapport de support de commande du nœud et sur une sonde de binaire via `system.run`. Si le nœud %%PH:GLOSSARY:236:513f8fdd\*\* se déconnecte par la suite, les compétences restent visibles ; les invocations peuvent échouer jusqu'à ce que le nœud se reconnecte.

## Observateur de compétences (actualisation automatique)

Par défaut, OpenClaw surveille les dossiers de compétences et met à jour l'instantané des compétences lorsque les fichiers `SKILL.md` sont modifiés. Configurez ceci sous `skills.load` :

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

- **Surcharge de base (uniquement lorsqu'il y a ≥1 compétence) :** 195 caractères.
- **Par compétence :** 97 caractères + la longueur des valeurs `<name>`, `<description>` et `<location>` échappées en XML.

Formule (caractères) :

```
total = 195 + Σ (97 + len(name_escaped) + len(description_escaped) + len(location_escaped))
```

Remarques :

- L'échappement XML développe `& < > " '` en entités (`&amp;`, `&lt;`, etc.), augmentant la longueur.
- Le nombre de jetons varie selon le tokeniseur du modèle. Une estimation de style OpenAI est d'environ 4 caractères/jeton, donc **97 caractères ≈ 24 jetons** par compétence plus les longueurs réelles de vos champs.

## Cycle de vie des compétences gérées

OpenClaw fournit un ensemble de base de compétences en tant que **compétences groupées** dans le cadre de l'installation (package npm ou OpenClaw.app). `~/.openclaw/skills` existe pour les remplacements locaux (par exemple, épingler/corriger une compétence sans modifier la copie groupée). Les compétences de l'espace de travail sont détenues par l'utilisateur et remplacent les deux en cas de conflit de noms.

## Référence de configuration

Voir [Configuration des compétences](/fr/tools/skills-config) pour le schéma de configuration complet.

## Vous cherchez plus de compétences ?

Parcourez [https://clawhub.ai](https://clawhub.ai).

---

## Connexes

- [Création de compétences](/fr/tools/creating-skills) — création de compétences personnalisées
- [Configuration des compétences](/fr/tools/skills-config) — référence de configuration des compétences
- [Commandes slash](/fr/tools/slash-commands) — toutes les commandes slash disponibles
- [Plugins](/fr/tools/plugin) — aperçu du système de plugins
