---
summary: "Skills : géré vs espace de travail, règles de filtrage, et câblage de config/env"
read_when:
  - Ajout ou modification de skills
  - Modification du filtrage ou des règles de chargement des skills
title: "Skills"
---

# Skills (OpenClaw)

OpenClaw utilise des dossiers de skills **compatibles avec [AgentSkills](https://agentskills.io)** pour enseigner à l'agent comment utiliser les outils. Chaque skill est un répertoire contenant un fichier `SKILL.md` avec des en-têtes YAML et des instructions. OpenClaw charge les **skills intégrés** ainsi que des remplacements locaux facultatifs, et les filtre au chargement en fonction de l'environnement, de la configuration et de la présence des binaires.

## Emplacements et priorité

Les skills sont chargés à partir de **trois** emplacements :

1. **Skills intégrés** : fournis avec l'installation (paquet npm ou OpenClaw.app)
2. **Skills gérés/locaux** : `~/.openclaw/skills`
3. **Skills de l'espace de travail** : `<workspace>/skills`

En cas de conflit de nom de skill, la priorité est la suivante :

`<workspace>/skills` (la plus haute) → `~/.openclaw/skills` → skills intégrés (la plus basse)

De plus, vous pouvez configurer des dossiers de skills supplémentaires (priorité la plus basse) via
`skills.load.extraDirs` dans `~/.openclaw/openclaw.json`.

## Skills par agent vs partagés

Dans les configurations **multi-agents**, chaque agent possède son propre espace de travail. Cela signifie :

- Les **skills par agent** résident dans `<workspace>/skills` pour cet agent uniquement.
- Les **skills partagés** résident dans `~/.openclaw/skills` (gérés/locaux) et sont visibles
  par **tous les agents** sur la même machine.
- Des **dossiers partagés** peuvent également être ajoutés via `skills.load.extraDirs` (priorité la plus basse)
  si vous souhaitez un pack de skills commun utilisé par plusieurs agents.

Si le même nom de skill existe dans plusieurs emplacements, la priorité habituelle
s'applique : l'espace de travail l'emporte, puis le géré/local, puis l'intégré.

## Plugins + skills

Les plugins peuvent fournir leurs propres skills en listant les répertoires `skills` dans
`openclaw.plugin.json` (chemins relatifs à la racine du plugin). Les skills de plugins se chargent
lorsque le plugin est activé et participent aux règles normales de priorité des skills.
Vous pouvez les filtrer via `metadata.openclaw.requires.config` sur l'entrée de configuration
du plugin. Voir [Plugins](/fr/tools/plugin) pour la découverte/configuration et [Outils](/fr/tools) pour la
surface outil que ces skills enseignent.

## ClawHub (installation + synchronisation)

ClawHub est le registre public de compétences pour OpenClaw. Parcourez-le sur
[https://clawhub.com](https://clawhub.com). Utilisez-le pour découvrir, installer, mettre à jour et sauvegarder des compétences.
Guide complet : [ClawHub](/fr/tools/clawhub).

Flux courants :

- Installer une compétence dans votre espace de travail :
  - `clawhub install <skill-slug>`
- Mettre à jour toutes les compétences installées :
  - `clawhub update --all`
- Synchroniser (scanner + publier les mises à jour) :
  - `clawhub sync --all`

Par défaut, `clawhub` installe dans `./skills` sous votre répertoire de
travail actuel (ou revient à l'espace de travail OpenClaw configuré). OpenClaw récupère
cela comme `<workspace>/skills` lors de la prochaine session.

## Notes de sécurité

- Traitez les compétences tierces comme un **code non fiable**. Lisez-les avant de les activer.
- Privilégiez les exécutions en bac à sable (sandboxed) pour les entrées non fiables et les outils risqués. Voir [Sandboxing](/fr/gateway/sandboxing).
- La découverte de compétences dans l'espace de travail et les répertoires supplémentaires n'accepte que les racines de compétences et les fichiers `SKILL.md` dont le chemin réel résolu reste à l'intérieur de la racine configurée.
- `skills.entries.*.env` et `skills.entries.*.apiKey` injectent des secrets dans le processus **hôte**
  pour ce tour d'agent (et non le bac à sable). Gardez les secrets hors des invites et des journaux.
- Pour un modèle de menace plus large et des listes de contrôle, voir [Sécurité](/fr/gateway/security).

## Format (AgentSkills + Compatible Pi)

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
  - `homepage` — URL affichée sous la forme « Site Web » dans l'interface utilisateur des compétences macOS (également prise en charge via `metadata.openclaw.homepage`).
  - `user-invocable` — `true|false` (par défaut : `true`). Lorsque `true`, la compétence est exposée en tant que commande slash utilisateur.
  - `disable-model-invocation` — `true|false` (par défaut : `false`). Lorsque `true`, la compétence est exclue du prompt du modèle (toujours disponible via invocation utilisateur).
  - `command-dispatch` — `tool` (facultatif). Lorsqu'il est défini à `tool`, la commande slash contourne le modèle et répartit directement vers un outil.
  - `command-tool` — nom de l'outil à invoquer lorsque `command-dispatch: tool` est défini.
  - `command-arg-mode` — `raw` (par défaut). Pour la répartition de l'outil, transfère la chaîne d'arguments brute à l'outil (pas d'analyse centrale).

    L'outil est invoqué avec les paramètres :
    `{ command: "<raw args>", commandName: "<slash command>", skillName: "<skill name>" }`.

## Filtrage (filtres de chargement)

OpenClaw **filtre les compétences au moment du chargement** en utilisant `metadata` (JSON sur une seule ligne) :

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
- `emoji` — emoji facultatif utilisé par l'interface utilisateur des Skills macOS.
- `homepage` — URL facultative affichée en tant que « Site Web » dans l'interface utilisateur des Skills macOS.
- `os` — liste facultative de plateformes (`darwin`, `linux`, `win32`). Si définie, la compétence n'est éligible que sur ces systèmes d'exploitation.
- `requires.bins` — liste ; chacun doit exister sur `PATH`.
- `requires.anyBins` — liste ; au moins un doit exister sur `PATH`.
- `requires.env` — liste ; la variable d'environnement doit exister **ou** être fournie dans la configuration.
- `requires.config` — liste de chemins `openclaw.json` qui doivent être véridiques.
- `primaryEnv` — nom de la variable d'environnement associée à `skills.entries.<name>.apiKey`.
- `install` — tableau facultatif de spécifications d'installateur utilisées par l'interface utilisateur des Skills macOS (brew/node/go/uv/download).

Remarque sur le sandboxing :

- `requires.bins` est vérifié sur l'**hôte** au moment du chargement de la compétence.
- Si un agent est sandboxed, le binaire doit également exister **à l'intérieur du conteneur**.
  Installez-le via `agents.defaults.sandbox.docker.setupCommand` (ou une image personnalisée).
  `setupCommand` s'exécute une fois après la création du conteneur.
  Les installations de packages nécessitent également un accès réseau (egress), un système de fichiers racine inscriptible et un utilisateur root dans le bac à sable.
  Exemple : la compétence `summarize` (`skills/summarize/SKILL.md`) a besoin du `summarize` CLI
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

- Si plusieurs installateurs sont répertoriés, la passerelle choisit une **seule** option préférée (brew si disponible, sinon node).
- Si tous les installateurs sont `download`, OpenClaw répertorie chaque entrée afin que vous puissiez voir les artefacts disponibles.
- Les spécifications de l'installateur peuvent inclure `os: ["darwin"|"linux"|"win32"]` pour filtrer les options par plateforme.
- Les installations Node respectent `skills.install.nodeManager` dans `openclaw.json` (par défaut : npm ; options : npm/pnpm/yarn/bun).
  Cela n'affecte que les **installations de compétences** ; l'exécution du Gateway doit toujours être Node
  (Bun n'est pas recommandé pour WhatsApp/Telegram).
- Installations Go : si `go` est manquant et `brew` est disponible, la passerelle installe d'abord Go via Homebrew et définit `GOBIN` sur le `bin` de Homebrew lorsque cela est possible.
- Installations par téléchargement : `url` (obligatoire), `archive` (`tar.gz` | `tar.bz2` | `zip`), `extract` (par défaut : auto lorsqu'une archive est détectée), `stripComponents`, `targetDir` (par défaut : `~/.openclaw/tools/<skillKey>`).

Si aucun `metadata.openclaw` n'est présent, la compétence est toujours éligible (sauf
si elle est désactivée dans la configuration ou bloquée par `skills.allowBundled` pour les compétences groupées).

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

Si vous souhaitez une génération/édition d'images standard dans OpenClaw lui-même, utilisez l'outil de base `image_generate` avec `agents.defaults.imageGenerationModel` au lieu d'une compétence groupée. Les exemples de compétences ici concernent les flux de travail personnalisés ou tiers.

Par défaut, les clés de configuration correspondent au **nom de la compétence**. Si une compétence définit `metadata.openclaw.skillKey`, utilisez cette clé sous `skills.entries`.

Règles :

- `enabled: false` désactive la compétence même si elle est groupée/installée.
- `env` : injecté **seulement si** la variable n'est pas déjà définie dans le processus.
- `apiKey` : commodité pour les compétences qui déclarent `metadata.openclaw.primaryEnv`.
  Prend en charge les chaînes en texte brut ou les objets SecretRef (`{ source, provider, id }`).
- `config` : sac optionnel pour les champs personnalisés par compétence ; les clés personnalisées doivent résider ici.
- `allowBundled` : liste d'autorisation optionnelle uniquement pour les compétences **groupées**. Si défini, seules
  les compétences groupées de la liste sont éligibles (les compétences gérées/espace de travail ne sont pas affectées).

## Injection d'environnement (par exécution d'agent)

Lorsqu'une exécution d'agent démarre, OpenClaw :

1. Lit les métadonnées de la compétence.
2. Applique tout `skills.entries.<key>.env` ou `skills.entries.<key>.apiKey` à
   `process.env`.
3. Construit le prompt système avec les compétences **éligibles**.
4. Restaure l'environnement d'origine après la fin de l'exécution.

Cela est **limité à l'exécution de l'agent**, et non à un environnement shell global.

## Instantané de session (performance)

OpenClaw prend un instantané des compétences éligibles **lorsqu'une session démarre** et réutilise cette liste pour les tours suivants de la même session. Les modifications des compétences ou de la configuration prennent effet lors de la prochaine nouvelle session.

Les compétences peuvent également s'actualiser en cours de session lorsque l'observateur de compétences est activé ou lorsqu'un nouveau nœud distant éligible apparaît (voir ci-dessous). Considérez cela comme un **rechargement à chaud** : la liste actualisée est reprise au prochain tour de l'agent.

## Nœuds macOS distants (passerelle Linux)

Si le Gateway fonctionne sur Linux mais qu'un **nœud macOS** est connecté **avec `system.run` autorisé** (la sécurité des approbations Exec n'est pas définie sur `deny`), OpenClaw peut considérer les skills exclusifs à macOS comme éligibles lorsque les binaires requis sont présents sur ce nœud. L'agent doit exécuter ces skills via l'outil `nodes` (généralement `nodes.run`).

Cela repose sur le fait que le nœud signale sa prise en charge des commandes et sur une sonde de binaire via `system.run`. Si le nœud macOS se déconnecte ultérieurement, les skills restent visibles ; les appels peuvent échouer jusqu'à ce que le nœud se reconnecte.

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

Lorsque les skills sont éligibles, OpenClaw injecte une liste XML compacte des skills disponibles dans le prompt système (via `formatSkillsForPrompt` dans `pi-coding-agent`). Le coût est déterministe :

- **Overhead de base (uniquement lorsque ≥1 skill) :** 195 caractères.
- **Par skill :** 97 caractères + la longueur des valeurs `<name>`, `<description>` et `<location>` échappées XML.

Formule (caractères) :

```
total = 195 + Σ (97 + len(name_escaped) + len(description_escaped) + len(location_escaped))
```

Notes :

- L'échappement XML développe `& < > " '` en entités (`&amp;`, `&lt;`, etc.), augmentant la longueur.
- Les nombres de jetons varient en fonction du tokenizer du modèle. Une estimation de style OpenAI est d'environ 4 caractères/jeton, donc **97 caractères ≈ 24 jetons** par skill plus vos longueurs de champ réelles.

## Cycle de vie des skills gérés

OpenClaw fournit un ensemble de base de skills en tant que **skills empaquetés** dans le cadre de l'installation (paquet npm ou OpenClaw.app). `~/.openclaw/skills` existe pour les substitutions locales (par exemple, épingler/patcher un skill sans modifier la copie empaquetée). Les skills de l'espace de travail sont détenus par l'utilisateur et remplacent les deux en cas de conflit de noms.

## Référence de configuration

Voir [Skills config](/fr/tools/skills-config) pour le schéma de configuration complet.

## Vous cherchez plus de skills ?

Parcourir [https://clawhub.com](https://clawhub.com).

---

import fr from "/components/footer/fr.mdx";

<fr />
