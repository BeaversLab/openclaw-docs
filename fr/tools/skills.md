---
summary: "Skills : gérées vs espace de travail, règles de filtrage et câblage config/env"
read_when:
  - Adding or modifying skills
  - Changing skill gating or load rules
title: "Skills"
---

# Skills (OpenClaw)

OpenClaw utilise des dossiers de compétences **compatibles avec [AgentSkills](https://agentskills.io)** pour enseigner à l'agent comment utiliser des outils. Chaque compétence est un répertoire contenant un `SKILL.md` avec des en-têtes YAML et des instructions. OpenClaw charge les **compétences groupées** ainsi que des remplacements locaux facultatifs, et les filtre au chargement en fonction de l'environnement, de la configuration et de la présence des binaires.

## Emplacements et priorité

Les compétences sont chargées à partir de **trois** emplacements :

1. **Compétences groupées** : fournies avec l'installation (paquet npm ou OpenClaw.app)
2. **Compétences gérées/locales** : `~/.openclaw/skills`
3. **Compétences de l'espace de travail** : `<workspace>/skills`

Si un nom de compétence est en conflit, la priorité est la suivante :

`<workspace>/skills` (la plus élevée) → `~/.openclaw/skills` → compétences groupées (la plus basse)

De plus, vous pouvez configurer des dossiers de compétences supplémentaires (priorité la plus basse) via
`skills.load.extraDirs` dans `~/.openclaw/openclaw.json`.

## Compétences par agent vs partagées

Dans les configurations **multi-agents**, chaque agent possède son propre espace de travail. Cela signifie :

- Les **compétences par agent** résident dans `<workspace>/skills` uniquement pour cet agent.
- Les **compétences partagées** résident dans `~/.openclaw/skills` (gérées/locales) et sont visibles
  par **tous les agents** sur la même machine.
- Des **dossiers partagés** peuvent également être ajoutés via `skills.load.extraDirs` (priorité
  la plus basse) si vous souhaitez un pack de compétences commun utilisé par plusieurs agents.

Si le même nom de compétence existe dans plusieurs endroits, la priorité habituelle
s'applique : l'espace de travail l'emporte, puis gérées/locales, puis groupées.

## Plugins + compétences

Les plugins peuvent fournir leurs propres compétences en listant les répertoires `skills` dans
`openclaw.plugin.json` (chemins relatifs à la racine du plugin). Les compétences des plugins sont
chargées lorsque le plugin est activé et participent aux règles normales de précédence des compétences.
Vous pouvez les filtrer via `metadata.openclaw.requires.config` sur l'entrée de configuration
du plugin. Consultez [Plugins](/fr/tools/plugin) pour la découverte/configuration et [Outils](/fr/tools) pour la
surface outil que ces compétences enseignent.

## ClawHub (install + sync)

ClawHub est le registre public de compétences pour OpenClaw. Parcourir sur
[https://clawhub.com](https://clawhub.com). Utilisez-le pour découvrir, installer, mettre à jour et sauvegarder des compétences.
Guide complet : [ClawHub](/fr/tools/clawhub).

Flux courants :

- Installer une compétence dans votre espace de travail :
  - `clawhub install <skill-slug>`
- Mettre à jour toutes les compétences installées :
  - `clawhub update --all`
- Synchroniser (scanner + publier les mises à jour) :
  - `clawhub sync --all`

Par défaut, `clawhub` installe dans `./skills` sous votre répertoire de travail
actuel (ou revient à l'espace de travail OpenClaw configuré). OpenClaw le détecte
en tant que `<workspace>/skills` lors de la prochaine session.

## Notes de sécurité

- Traitez les compétences tierces comme du **code non fiable**. Lisez-les avant de les activer.
- Préférez les exécutions en bac à sable (sandboxed) pour les entrées non fiables et les outils risqués. Voir [Sandboxing](/fr/gateway/sandboxing).
- La découverte de compétences dans l'espace de travail et les répertoires supplémentaires n'accepte que les racines de compétences et les fichiers `SKILL.md` dont le chemin réel résolu reste à l'intérieur de la racine configurée.
- `skills.entries.*.env` et `skills.entries.*.apiKey` injectent des secrets dans le processus **hôte**
  pour ce tour d'agent (pas le bac à sable). Gardez les secrets hors des invites et des journaux.
- Pour un modèle de menace plus large et des listes de contrôle, voir [Security](/fr/gateway/security).

## Format (AgentSkills + compatible Pi)

`SKILL.md` doit inclure au moins :

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
---
```

Notes :

- Nous suivons la spécification AgentSkills pour la disposition/l'intention.
- L'analyseur utilisé par l'agent intégré prend en charge uniquement les clés de frontmatter **sur une seule ligne**.
- `metadata` doit être un **objet JSON sur une seule ligne**.
- Utilisez `{baseDir}` dans les instructions pour faire référence au chemin du dossier de la compétence.
- Clés de frontmatter facultatives :
  - `homepage` — URL affichée sous le nom de « Site Web » dans l'interface utilisateur des Skills de macOS (également prise en charge via `metadata.openclaw.homepage`).
  - `user-invocable` — `true|false` (par défaut : `true`). Lorsque `true`, la compétence est exposée en tant que commande slash utilisateur.
  - `disable-model-invocation` — `true|false` (par défaut : `false`). Lorsque `true`, la compétence est exclue du prompt du modèle (toujours disponible via l'invocation de l'utilisateur).
  - `command-dispatch` — `tool` (facultatif). Lorsqu'il est défini sur `tool`, la commande slash contourne le modèle et envoie directement la commande à un outil.
  - `command-tool` — nom de l'outil à invoquer lorsque `command-dispatch: tool` est défini.
  - `command-arg-mode` — `raw` (par défaut). Pour l'envoi à l'outil, transmet la chaîne d'arguments brute à l'outil (pas d'analyse principale).

    L'outil est invoqué avec les paramètres :
    `{ command: "<raw args>", commandName: "<slash command>", skillName: "<skill name>" }`.

## Gating (filtres de chargement)

OpenClaw **filtre les compétences au moment du chargement** à l'aide de `metadata` (JSON sur une seule ligne) :

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
metadata:
  {
    "openclaw":
      {
        "requires": { "bins": ["uv"], "env": ["GEMINI_API_KEY"], "config": ["browser.enabled"] },
        "primaryEnv": "GEMINI_API_KEY",
      },
  }
---
```

Champs sous `metadata.openclaw` :

- `always: true` — toujours inclure la compétence (ignorer les autres portes).
- `emoji` — emoji facultatif utilisé par l'interface utilisateur des Skills de macOS.
- `homepage` — URL facultative affichée sous le nom de « Site Web » dans l'interface utilisateur des Skills de macOS.
- `os` — liste facultative de plateformes (`darwin`, `linux`, `win32`). Si défini, la compétence n'est éligible que sur ces systèmes d'exploitation.
- `requires.bins` — liste ; chacun doit exister sur `PATH`.
- `requires.anyBins` — liste ; au moins un doit exister sur `PATH`.
- `requires.env` — liste ; la env var doit exister **ou** être fournie dans la configuration.
- `requires.config` — liste de chemins `openclaw.json` qui doivent être véridiques.
- `primaryEnv` — nom de la env var associé à `skills.entries.<name>.apiKey`.
- `install` — tableau facultatif de spécifications d'installation utilisées par l'interface utilisateur Skills macOS (brew/node/go/uv/download).

Note sur le sandboxing :

- `requires.bins` est vérifié sur l'**hôte** au moment du chargement de la compétence.
- Si un agent est sandboxed, le binaire doit également exister **à l'intérieur du conteneur**.
  Installez-le via `agents.defaults.sandbox.docker.setupCommand` (ou une image personnalisée).
  `setupCommand` s'exécute une fois après la création du conteneur.
  Les installations de packages nécessitent également un accès réseau sortant, un système de fichiers racine inscriptible et un utilisateur root dans le sandbox.
  Exemple : la compétence `summarize` (`skills/summarize/SKILL.md`) a besoin du CLI `summarize`
  dans le conteneur sandbox pour s'exécuter.

Exemple d'installateur :

```markdown
---
name: gemini
description: Use Gemini CLI for coding assistance and Google search lookups.
metadata:
  {
    "openclaw":
      {
        "emoji": "♊️",
        "requires": { "bins": ["gemini"] },
        "install":
          [
            {
              "id": "brew",
              "kind": "brew",
              "formula": "gemini-cli",
              "bins": ["gemini"],
              "label": "Install Gemini CLI (brew)",
            },
          ],
      },
  }
---
```

Notes :

- Si plusieurs installateurs sont répertoriés, la gateway choisit une **seule** option préférée (brew si disponible, sinon node).
- Si tous les installateurs sont `download`, OpenClaw répertorie chaque entrée afin que vous puissiez voir les artefacts disponibles.
- Les spécifications de l'installateur peuvent inclure `os: ["darwin"|"linux"|"win32"]` pour filtrer les options par plate-forme.
- Les installations Node honorent `skills.install.nodeManager` dans `openclaw.json` (par défaut : npm ; options : npm/pnpm/yarn/bun).
  Cela n'affecte que les **installations de compétences** ; l'exécution Gateway doit toujours être Node
  (Bun n'est pas recommandé pour WhatsApp/Telegram).
- Installations Go : si `go` est manquant et que `brew` est disponible, la passerelle installe d'abord Go via Homebrew et définit `GOBIN` sur le `bin` de Homebrew lorsque cela est possible.
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

Si vous souhaitez une génération/édition d'image standard dans OpenClaw lui-même, utilisez l'outil principal
`image_generate` avec `agents.defaults.imageGenerationModel` au lieu d'une
compétence groupée. Les exemples de compétences ici sont pour des flux de travail personnalisés ou tiers.

Les clés de configuration correspondent au **nom de la compétence** par défaut. Si une compétence définit
`metadata.openclaw.skillKey`, utilisez cette clé sous `skills.entries`.

Règles :

- `enabled: false` désactive la compétence même si elle est fournie/installée.
- `env` : injecté **seulement si** la variable n'est pas déjà définie dans le processus.
- `apiKey` : commodité pour les compétences qui déclarent `metadata.openclaw.primaryEnv`.
  Prend en charge une chaîne en texte brut ou un objet SecretRef (`{ source, provider, id }`).
- `config` : conteneur optionnel pour les champs personnalisés par compétence ; les clés personnalisées doivent se trouver ici.
- `allowBundled` : liste d'autorisation optionnelle pour les compétences **fournies** uniquement. Si défini, seules
  les compétences fournies dans la liste sont éligibles (les compétences gérées/espace de travail ne sont pas concernées).

## Injection d'environnement (par exécution d'agent)

Lorsqu'une exécution d'agent démarre, OpenClaw :

1. Lit les métadonnées de la compétence.
2. Applique tout `skills.entries.<key>.env` ou `skills.entries.<key>.apiKey` à
   `process.env`.
3. Construit le prompt système avec les **éligibles** skills.
4. Restaure l'environnement d'origine après la fin de l'exécution.

Ceci est **délimité à l'exécution de l'agent**, et non à un environnement shell global.

## Instantané de session (performance)

OpenClaw crée un instantané des skills éligibles **lorsqu'une session démarre** et réutilise cette liste pour les tours suivants dans la même session. Les modifications apportées aux skills ou à la configuration prennent effet lors de la prochaine nouvelle session.

Les skills peuvent également être actualisés en cours de session lorsque l'observateur de skills est activé ou lorsqu'un nouveau nœud distant éligible apparaît (voir ci-dessous). Considérez cela comme un **rechargement à chaud** : la liste actualisée est prise en compte lors du prochain tour de l'agent.

## Nœuds distants macOS (passerelle Linux)

Si le Gateway s'exécute sur Linux mais qu'un nœud macOS est connecté **avec `system.run` autorisé** (sécurité des approbations Exec non définie sur `deny`), OpenClaw peut considérer les skills exclusifs à macOS comme éligibles lorsque les binaires requis sont présents sur ce nœud. L'agent doit exécuter ces skills via l'outil `nodes` (généralement `nodes.run`).

Cela repose sur la capacité du nœud à signaler sa prise en charge des commandes et sur une sonde de binaire via `system.run`. Si le nœud macOS se déconnecte par la suite, les skills restent visibles ; les appels peuvent échouer jusqu'à ce que le nœud se reconnecte.

## Skills watcher (auto-refresh)

Par défaut, OpenClaw surveille les dossiers de skills et met à jour l'instantané des skills lorsque les fichiers `SKILL.md` changent. Configurez ceci sous `skills.load` :

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

## Token impact (skills list)

Lorsque les compétences sont éligibles, OpenClaw injecte une liste XML compacte des compétences disponibles dans le prompt système (via `formatSkillsForPrompt` dans `pi-coding-agent`). Le coût est déterministe :

- **Surcharge de base (uniquement lorsqu'il y a ≥1 compétence) :** 195 caractères.
- **Par compétence :** 97 caractères + la longueur des valeurs `<name>`, `<description>` et `<location>` échappées en XML.

Formule (caractères) :

```
total = 195 + Σ (97 + len(name_escaped) + len(description_escaped) + len(location_escaped))
```

Notes :

- L'échappement XML développe `& < > " '` en entités (`&amp;`, `&lt;`, etc.), augmentant la longueur.
- Le nombre de tokens varie selon le tokeniseur du modèle. Une estimation approximative de style OpenAI est d'environ 4 caractères/token, donc **97 caractères ≈ 24 tokens** par compétence plus vos longueurs de champ réelles.

## Cycle de vie des compétences gérées

OpenClaw fournit un ensemble de base de compétences en tant que **compétences groupées** dans le cadre de l'installation (package npm ou OpenClaw.app). `~/.openclaw/skills` existe pour les substitutions locales (par exemple, épingler/patcher une compétence sans modifier la copie groupée). Les compétences de l'espace de travail sont détenues par l'utilisateur et remplacent les deux en cas de conflit de noms.

## Référence de configuration

Voir [Configuration des compétences](/fr/tools/skills-config) pour le schéma de configuration complet.

## Vous cherchez plus de compétences ?

Parcourir [https://clawhub.com](https://clawhub.com).

---

import fr from "/components/footer/fr.mdx";

<fr />
