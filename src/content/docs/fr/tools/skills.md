---
summary: "Compétences : gérées vs espace de travail, règles de filtrage, listes d'autorisation de l'agent et câblage de la configuration"
read_when:
  - Adding or modifying skills
  - Changing skill gating, allowlists, or load rules
  - Understanding skill precedence and snapshot behavior
title: "Compétences"
sidebarTitle: "Compétences"
---

OpenClaw utilise des dossiers de compétences **compatibles avec [AgentSkills](https://agentskills.io)** pour enseigner à l'agent comment utiliser les outils. Chaque compétence est un répertoire contenant un `SKILL.md` avec un en-tête YAML et des instructions. OpenClaw charge les compétences groupées ainsi que des remplacements locaux facultatifs, et les filtre au moment du chargement en fonction de l'environnement, de la configuration et de la présence des binaires.

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

Les racines de compétences peuvent être organisées avec des dossiers. Une compétence est découverte lorsqu'un `SKILL.md` apparaît sous une racine de compétences configurée, donc ceux-ci sont tous deux valides :

```text
<workspace>/skills/research/SKILL.md
<workspace>/skills/personal/research/SKILL.md
```

Le chemin du dossier sert uniquement à l'organisation. Le nom visible de la compétence, la commande slash et la clé de liste d'autorisation proviennent de `SKILL.md` l'en-tête `name` (ou du nom du répertoire de la compétence lorsque `name` est manquant), donc une compétence imbriquée avec `name: research` est toujours invoquée comme `/research`, et non `/personal/research`.

Le répertoire natif `$CODEX_HOME/skills` de la Codex CLI n'est pas l'une de ces racines de compétences OpenClaw. En mode harnais Codex, les lancements de serveur d'application locaux utilisent des homes Codex isolés par agent, les compétences dans le `~/.codex/skills` personnel de l'opérateur ne sont donc pas chargées implicitement. La découverte de `.agents` native à Codex utilise les `HOME` héritées séparément ; les propres racines de compétences de OpenClaw ci-dessus incluent déjà les `~/.agents/skills`. Utilisez `openclaw migrate plan codex` pour inventorier les compétences depuis le home Codex, puis `openclaw migrate codex` pour choisir les répertoires de compétences avec une invite interactive à cases à cocher avant de les copier dans l'espace de travail de l'agent OpenClaw actuel. Pour les exécutions non interactives, répétez `--skill <name>` pour les compétences exactes à copier.

## Compétences par agent vs partagées

Dans les configurations **multi-agent**, chaque agent possède son propre espace de travail :

| Portée                               | Chemin                                           | Visible par                                |
| ------------------------------------ | ------------------------------------------------ | ------------------------------------------ |
| Par agent                            | `<workspace>/skills`                             | Seulement cet agent                        |
| Agent de projet                      | `<workspace>/.agents/skills`                     | Seulement l'agent de cet espace de travail |
| Agent personnel                      | `~/.agents/skills`                               | Tous les agents sur cette machine          |
| Partagé géré/local                   | `~/.openclaw/skills`                             | Tous les agents sur cette machine          |
| Répertoires supplémentaires partagés | `skills.load.extraDirs` (priorité la plus basse) | Tous les agents sur cette machine          |

Même nom dans plusieurs endroits → la source la plus élevée gagne. L'espace de travail bat l'agent de projet, qui bat l'agent personnel, qui bat géré/local, qui bat bundlé, qui bat les répertoires supplémentaires.

## Listes d'autorisation des compétences de l'agent

L'**emplacement** de la compétence et la **visibilité** de la compétence sont des contrôles distincts.
L'emplacement/la priorité décide quelle copie d'une compétence de même nom gagne ; les listes d'autorisation de l'agent décident quelles compétences un agent peut réellement utiliser.

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
    - Omettez `agents.defaults.skills` pour des compétences non restreintes par défaut. - Omettez `agents.list[].skills` pour hériter de `agents.defaults.skills`. - Définissez `agents.list[].skills: []` pour aucune compétence. - Une liste `agents.list[].skills` non vide est l'ensemble **final** pour cet agent - elle ne fusionne pas avec les valeurs par défaut. - La liste d'autorisation effective
    s'applique à la construction du prompt, à la découverte des commandes slash de compétences, à la synchronisation du bac à sable et aux instantanés de compétences.
  </Accordion>
</AccordionGroup>

## Plugins et compétences

Les plugins peuvent fournir leurs propres compétences en listant les répertoires `skills` dans
`openclaw.plugin.json` (chemins relatifs à la racine du plugin). Les compétences du plugin
sont chargées lorsque le plugin est activé. C'est l'endroit idéal pour les guides de fonctionnement spécifiques à un outil qui sont trop longs pour la description de l'outil mais qui devraient être disponibles dès que le plugin est installé - par exemple, le plugin du navigateur fournit une compétence `browser-automation` pour le contrôle multi-étapes du navigateur.

Les répertoires de compétences du plugin sont fusionnés dans le même chemin de faible priorité que
`skills.load.extraDirs`, une compétence groupée, gérée, d'agent ou
d'espace de travail portant le même nom les remplace donc. Vous pouvez les restreindre via
`metadata.openclaw.requires.config` sur l'entrée de configuration du plugin.

Voir [Plugins](/fr/tools/plugin) pour la découverte/configuration et [Outils](/fr/tools) pour
la surface de l'outil que ces compétences enseignent.

## Skill Workshop

Le plugin optionnel et expérimental **Skill Workshop** peut créer ou mettre à jour
les compétences de l'espace de travail à partir de procédures réutilisables observées lors du travail de l'agent. Il
est désactivé par défaut et doit être explicitement activé via
`plugins.entries.skill-workshop`.

Skill Workshop écrit uniquement dans `<workspace>/skills`, analyse le contenu
généré, prend en charge l'approbation en attente ou les écritures automatiques sûres, met en quarantaine
les propositions non sécurisées et actualise l'instantané des compétences après des écritures
réussies afin que les nouvelles compétences deviennent disponibles sans redémarrage du Gateway.

Utilisez-le pour des corrections telles que _"la prochaine fois, vérifiez l'attribution des GIF"_ ou des processus difficiles à acquérir tels que les listes de contrôle QA pour les médias. Commencez avec une approbation en attente ; utilisez les écritures automatiques uniquement dans les espaces de travail de confiance après avoir examiné ses propositions. Guide complet : [plugin Skill Workshop](/fr/plugins/skill-workshop).

## ClawHub (installation et synchronisation)

[ClawHub](ClawHubhttps://clawhub.aiOpenClaw) est le registre public de compétences pour OpenClaw.
Utilisez les commandes natives `openclaw skills` pour découvrir/installer/mettre à jour, ou le `clawhub`CLIClawHub CLI séparé pour les flux de travail de publication/synchronisation. Guide complet :
[ClawHub](/fr/clawhub).

| Action                                                                   | Commande                                               |
| ------------------------------------------------------------------------ | ------------------------------------------------------ |
| Installer une compétence ClawHub dans l'espace de travail                | `openclaw skills install <skill-slug>`                 |
| Installer une compétence Git dans l'espace de travail                    | `openclaw skills install git:owner/repo@ref`           |
| Installer une compétence locale dans l'espace de travail                 | `openclaw skills install ./path/to/skill --as my-tool` |
| Installer une compétence pour tous les agents locaux                     | `openclaw skills install <skill-slug> --global`        |
| Mettre à jour toutes les compétences installées dans l'espace de travail | `openclaw skills update --all`                         |
| Mettre à jour une seule compétence gérée partagée                        | `openclaw skills update <skill-slug> --global`         |
| Mettre à jour toutes les compétences gérées partagées/locales            | `openclaw skills update --all --global`                |
| Vérifier une compétence ClawHub                                          | `openclaw skills verify <skill-slug>`                  |
| Imprimer la Carte de Compétence (Skill Card) générée                     | `openclaw skills verify <skill-slug> --card`           |
| Synchroniser (scanner + publier les mises à jour)                        | `clawhub sync --all`                                   |

L'installation native `openclaw skills install` s'effectue par défaut dans le répertoire `skills/` de l'espace de travail actif. Ajoutez `--global` pour installer dans le répertoire géré/local partagé (`~/.openclaw/skills` par défaut), qui est visible pour tous les agents locaux, sauf si les listes d'autorisation de compétences des agents en restreignent la visibilité. L'interface `clawhub` CLI distincte installe également dans `./skills` sous votre répertoire de travail actuel (ou revient à l'espace de travail OpenClaw configuré). OpenClaw le détecte en tant que `<workspace>/skills` lors de la prochaine session. Les racines de compétences configurées prennent également en charge les dispositions groupées, telles que `skills/<group>/<skill>/SKILL.md`, afin que les compétences tierces connexes puissent être conservées dans des dossiers partagés sans analyse récursive étendue. Utilisez des noms d'en-tête plats lors du regroupement, par exemple `skills/imported/research/SKILL.md` avec `name: research`.

Les installations Git et de répertoires locaux s'attendent à trouver un `SKILL.md` à la racine de la source. Le slug d'installation provient du `name` de l'en-tête `SKILL.md` lorsqu'il s'agit d'un slug valide, puis revient au nom du répertoire source ou du référentiel. Utilisez `--as <slug>` pour remplacer le slug déduit. `--version` ne s'applique qu'aux installations ClawHub. Les installations de compétences ne prennent pas en charge les spécifications de packages npm ou les chemins d'archives zip. `openclaw skills update` met à jour uniquement les installations suivies par ClawHub ; réinstallez les sources Git ou locales pour les actualiser.

Utilisez `openclaw skills verify <slug>`ClawHub pour demander à ClawHub l'enveloppe de confiance `clawhub.skill.verify.v1` de la compétence. La sortie est JSON par défaut ; utilisez `--card`ClawHub pour afficher la Markdown de la Skill Card générée. Les compétences ClawHub installées sont vérifiées par rapport à la version et au registre enregistrés dans `.clawhub/origin.json` ; `--version` et `--tag`ClawHub ne remplacent que le sélecteur de version. La commande se termine avec un code non nul lorsque ClawHub marque la vérification comme ayant échoué. Un `skill-card.md`OpenClawClawHub généré peut être présent dans les bundles installés, mais OpenClaw le considère comme des métadonnées fournies par ClawHub et ne l'utilise pas comme instructions de modèle local ou comme porte de hachage locale.

Les clients Gateway qui ont besoin d'une livraison privée, hors ClawHub, peuvent préparer une archive de compétence zip avec GatewayClawHub`skills.upload.begin`, `skills.upload.chunk` et `skills.upload.commit`, puis installer le téléversement validé avec `skills.install({ source: "upload", uploadId, slug, force?, sha256? })`. Il s'agit d'un chemin de téléversement administratif explicite pour les clients de confiance, et non du flux d'installation normal `openclaw skills install <slug>`ClawHub ou ClawHub. Il est désactivé par défaut et ne fonctionne que lorsque `skills.install.allowUploadedArchives: true` est défini dans `openclaw.json`. Le mode téléversement installe toujours dans le répertoire de l'espace de travail de l'agent par défaut `skills/<slug>` ; le nom du dossier interne de l'archive est ignoré pour la cible d'installation finale.

Les pages de compétences ClawHub exposent le dernier état de l'analyse de sécurité avant l'installation, avec des pages de détail de l'analyseur pour VirusTotal, ClawScan et l'analyse statique. ClawHub`openclaw skills install <slug>`ClawHub reste le seul chemin d'installation ; les éditeurs résolvent les faux positifs via le tableau de bord ClawHub ou `clawhub skill rescan <slug>`.

## Sécurité

<Warning>Traitez les compétences tierces comme du **code non fiable**. Lisez-les avant de les activer. Privilégiez les exécutions en bac à sable (sandboxed) pour les entrées non fiables et les outils risqués. Consultez [Sandboxing](/fr/gateway/sandboxing) pour les contrôles côté agent.</Warning>

- La découverte de compétences dans l'espace de travail, l'agent de projet et le répertoire supplémentaire n'accepte que les racines de compétences dont le chemin réel résolu reste à l'intérieur de la racine configurée, sauf si `skills.load.allowSymlinkTargets` fait explicitement confiance à une racine cible. Les compétences groupées restent toujours contenues. Les racines gérées `~/.openclaw/skills` et personnelles `~/.agents/skills` peuvent contenir des dossiers de compétences liés par lien symbolique installés par ClawHub ou un autre gestionnaire de compétences local, mais chaque chemin réel `SKILL.md` doit toujours rester à l'intérieur de son répertoire de compétences résolu.
- La découverte imbriquée est limitée. OpenClaw analyse les dossiers de compétences groupés sous les racines de compétences telles que `<workspace>/skills`, `<workspace>/.agents/skills`, `~/.agents/skills` et `~/.openclaw/skills`, mais ignore les répertoires cachés, `node_modules`, les fichiers `SKILL.md` trop volumineux, les liens symboliques échappés et les arbres de répertoires suspectement grands.
- Les installations d'archives privées Gateway sont désactivées par défaut. Lorsqu'elles sont explicitement activées, elles nécessitent un téléchargement zip validé contenant `SKILL.md` et réutilisent les mêmes protections d'extraction d'archive, de traversée de chemin, de lien symbolique, de force et de retour en arrière que les installations de compétences ClawHub. Elles sont régies par `skills.install.allowUploadedArchives` ; les installations normales ClawHub ne nécessitent pas ce paramètre.
- Les installations de dépendances de compétences soutenues par Gateway (`skills.install`, onboarding et l'interface utilisateur des paramètres des Skills) exécutent l'analyse de code dangereux intégrée avant d'exécuter les métadonnées de l'installateur. Les résultats `critical` bloquent par défaut sauf si l'appelant définit explicitement le remplacement dangereux ; les résultats suspects ne font que générer un avertissement.
- `openclaw skills install <slug>` est différent — il télécharge un dossier de compétences ClawHub dans l'espace de travail, ou dans des compétences gérées/partagées locales avec `--global`, et n'utilise pas le chemin des métadonnées de l'installateur ci-dessus. Les installations depuis Git et les répertoires locaux copient un répertoire `SKILL.md` de confiance dans la même racine de compétences, mais ne sont pas suivies par `openclaw skills update`.
- `skills.entries.*.env` et `skills.entries.*.apiKey` injectent des secrets dans le processus **hôte** pour ce tour d'agent (et non dans le bac à sable). Gardez les secrets hors des invites et des journaux.

Pour un modèle de menace plus large et des listes de contrôle, consultez [Sécurité](/fr/gateway/security).

## Format SKILL.md

`SKILL.md` doit inclure au moins :

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
---
```

OpenClaw suit la spécification AgentSkills pour la disposition/l'intention. L'analyseur utilisé par l'agent intégré prend uniquement en charge les clés de frontmatter **sur une seule ligne** ; `metadata` doit être un **objet JSON sur une seule ligne**. Utilisez `{baseDir}` dans les instructions pour référencer le chemin du dossier de compétence.

### Clés de frontmatter facultatives

<ParamField path="homepage" type="string">
  URL affichée comme « Site Web » dans l'interface utilisateur Skills de macOS. Également prise en charge via `metadata.openclaw.homepage`.
</ParamField>
<ParamField path="user-invocable" type="boolean" default="true">
  Lorsque `true`, la compétence est exposée en tant que commande slash utilisateur.
</ParamField>
<ParamField path="disable-model-invocation" type="boolean" default="false">
  Lorsque `true`, OpenClaw garde les instructions de la compétence hors de l'invite normale de l'agent. La compétence est toujours installée et peut toujours être exécutée explicitement en tant que commande slash lorsque `user-invocable` est également `true`.
</ParamField>
<ParamField path="command-dispatch" type='"tool"'>
  Lorsqu'il est défini sur `tool`, la commande slash contourne le modèle et répartit directement vers un outil.
</ParamField>
<ParamField path="command-tool" type="string">
  Nom de l'outil à invoquer lorsque `command-dispatch: tool` est défini.
</ParamField>
<ParamField path="command-arg-mode" type='"raw"' default="raw">
  Pour la répartition des outils, transmet la chaîne d'arguments brute à l'outil (pas d'analyse centrale). L'outil est invoqué avec `{ command: "<raw args>", commandName: "<slash command>", skillName: "<skill name>" }`.
</ParamField>

## Filtrage (filtres de chargement)

OpenClaw filtre les compétences au chargement en utilisant OpenClaw`metadata` (JSON sur une seule ligne) :

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
<ParamField path="emoji" type="string"macOS>
  Emoji facultatif utilisé par l'interface des Skills de macOS.
</ParamField>
<ParamField path="homepage" type="string"macOS>
  URL facultative affichée sous « Site Web » dans l'interface des Skills de macOS.
</ParamField>
<ParamField path="os" type='"darwin" | "linux" | "win32"' >
  Liste facultative de plateformes. Si défini, la compétence n'est éligible que sur ces systèmes d'exploitation.
</ParamField>
<ParamField path="requires.bins" type="string[]">
  Chacun doit exister sur `PATH`.
</ParamField>
<ParamField path="requires.anyBins" type="string[]">
  Au moins l'un d'entre eux doit exister sur `PATH`.
</ParamField>
<ParamField path="requires.env" type="string[]">
  La variable d'environnement doit exister ou être fournie dans la configuration.
</ParamField>
<ParamField path="requires.config" type="string[]">
  Liste des chemins `openclaw.json` qui doivent être véridiques (truthy).
</ParamField>
<ParamField path="primaryEnv" type="string">
  Nom de la variable d'environnement associée à `skills.entries.<name>.apiKey`.
</ParamField>
<ParamField path="install" type="object[]"macOS>
  Spécifications d'installation facultatives utilisées par l'interface des Skills de macOS (brew/node/go/uv/download).
</ParamField>

Si aucun `metadata.openclaw` n'est présent, la compétence est toujours éligible (sauf
désactivation dans la configuration ou blocage par `skills.allowBundled` pour les compétences groupées).

<Note>Les blocs `metadata.clawdbot` hérités sont toujours acceptés lorsque `metadata.openclaw` est absent, afin que les compétences installées plus anciennes conservent leurs portes de dépendance et leurs indices d'installation. Les nouvelles compétences mises à jour doivent utiliser `metadata.openclaw`.</Note>

### Notes sur le bac à sable (Sandboxing)

- `requires.bins` est vérifié sur l'**hôte** au moment du chargement de la compétence.
- Si un agent est sandboxed, le binaire doit également exister **à l'intérieur du conteneur**. Installez-le via `agents.defaults.sandbox.docker.setupCommand` (ou une image personnalisée). `setupCommand` s'exécute une fois après la création du conteneur. Les installations de packages nécessitent également un accès réseau sortant, un système de fichiers racine inscriptible et un utilisateur root dans le sandbox.
- Exemple : la compétence `summarize` (`skills/summarize/SKILL.md`) a besoin de la CLI `summarize` CLI dans le conteneur sandbox pour s'y exécuter.

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
    - Si plusieurs installateurs sont listés, la passerelle choisit une option préférée unique (brew si disponible, sinon node).
    - Si tous les installateurs sont `download`, OpenClaw liste chaque entrée afin que vous puissiez voir les artefacts disponibles.
    - Les spécifications de l'installateur peuvent inclure `os: ["darwin"|"linux"|"win32"]` pour filtrer les options par plate-forme.
    - Les installations Node honorent `skills.install.nodeManager` dans `openclaw.json` (par défaut : npm ; options : npm/pnpm/yarn/bun). Cela n'affecte que les installations de compétences ; l'exécution du Gateway doit toujours être Node - Bun n'est pas recommandé pour WhatsApp/Telegram.
    - La sélection de l'installateur basée sur le Gateway est pilotée par les préférences : lorsque les spécifications d'installation mélangent les types, OpenClaw préfère Homebrew quand `skills.install.preferBrew` est activé et que `brew` existe, puis `uv`, puis le gestionnaire node configuré, puis d'autres solutions de repli comme `go` ou `download`.
    - Si chaque spécification d'installation est `download`, OpenClaw affiche toutes les options de téléchargement au lieu de réduire à un seul installateur préféré.

  </Accordion>
  <Accordion title="Détails par installateur">
    - **Installations Homebrew :** OpenClaw n'installe pas automatiquement Homebrew ni ne traduit
      les formules brew en commandes du gestionnaire de paquets du système. Dans les conteneurs Linux
      sans `brew`, l'onboarding masque les installateurs de dépendances exclusives à brew ; utilisez une
      image personnalisée ou installez la dépendance manuellement avant d'activer cette compétence.
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
  `false` désactive la compétence même si elle est groupée ou installée. La compétence groupée `coding-agent` est optionnelle : définissez `skills.entries.coding-agent.enabled: true` avant de l'exposer aux agents, puis assurez-vous que l'un des éléments suivants `claude`, `codex`, `opencode`, ou un autre CLI pris en charge est installé et authentifié pour son propre CLI.
</ParamField>
<ParamField path="apiKey" type="string | { source, provider, id }">
  Commodité pour les compétences qui déclarent `metadata.openclaw.primaryEnv`. Prend en charge le texte brut ou SecretRef.
</ParamField>
<ParamField path="env" type="Record<string, string>">
  Injecté uniquement si la variable n'est pas déjà définie dans le processus.
</ParamField>
<ParamField path="config" type="object">
  Sac optionnel pour les champs personnalisés par compétence. Les clés personnalisées doivent figurer ici.
</ParamField>
<ParamField path="allowBundled" type="string[]">
  Liste d'autorisation optionnelle pour les compétences **groupées** uniquement. Si elle est définie, seules les compétences groupées de la liste sont éligibles (les compétences gérées/d'espace de travail ne sont pas affectées).
</ParamField>

Si le nom de la compétence contient des tirets, mettez la clé entre guillemets (JSON5 autorise les clés entre guillemets).
Les clés de configuration correspondent au **nom de la compétence** par défaut - si une compétence
définit `metadata.openclaw.skillKey`, utilisez cette clé sous `skills.entries`.

<Note>
  Pour la génération/édition d'images standard dans OpenClaw, utilisez l'outil principal `image_generate` avec `agents.defaults.imageGenerationModel` au lieu d'une compétence groupée. Les exemples de compétences ici concernent les flux de travail personnalisés ou tiers. Pour l'analyse d'image native, utilisez l'outil `image` avec `agents.defaults.imageModel`. Si vous choisissez `openai/*`,
  `google/*`, `fal/*` ou un autre modèle d'image spécifique à un fournisseur, ajoutez également la clé d'auth/API de ce fournisseur.
</Note>

## Injection d'environnement

Lorsqu'une exécution d'agent démarre, OpenClaw :

1. Lit les métadonnées de la compétence.
2. Applique `skills.entries.<key>.env` et `skills.entries.<key>.apiKey` à `process.env`.
3. Construit le prompt système avec les compétences **éligibles**.
4. Restaure l'environnement d'origine après la fin de l'exécution.

L'injection d'environnement est **délimitée à l'exécution de l'agent**, et non à un environnement shell global.

Pour le backend `claude-cli` inclus, OpenClaw matérialise également le même instantané éligible en tant que plugin Claude Code temporaire et le transmet avec `--plugin-dir`. Claude Code peut ensuite utiliser son résolveur de compétences natif tandis que OpenClaw`skills.entries.*` conserve toujours la priorité, les listes d'autorisation par agent, le filtrage et l'injection de clés d'environnement/API. Les autres backends CLI utilisent uniquement le catalogue de prompts.

## Instantanés et actualisation

OpenClaw crée un instantané des compétences éligibles **au début d'une session** et réutilise cette liste pour les tours suivants de la même session. Les modifications apportées aux compétences ou à la configuration prennent effet lors de la prochaine nouvelle session.

Les compétences peuvent s'actualiser en cours de session dans deux cas :

- L'observateur de compétences est activé.
- Un nouveau nœud distant éligible apparaît.

Considérez cela comme un **rechargement à chaud** : la liste actualisée est reprise au prochain tour de l'agent. Si la liste d'autorisation effective des compétences de l'agent change pour cette session, OpenClaw actualise l'instantané afin que les compétences visibles restent alignées avec l'agent actuel.

### Observateur de compétences

Par défaut, OpenClaw surveille les dossiers de compétences et met à jour l'instantané des compétences lorsque les fichiers `SKILL.md` changent. Configurez sous `skills.load` :

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

Utilisez `allowSymlinkTargets` pour les mises en page intentionnelles d'espace de travail, d'agent de projet ou de répertoire supplémentaire où une racine de compétences contient un lien symbolique, par exemple `<workspace>/skills/manager -> ~/Projects/manager/skills`. Les `~/.openclaw/skills` gérés et les `~/.agents/skills` personnels peuvent suivre les liens symboliques de répertoire de compétences provenant de gestionnaires de compétences locaux par défaut, mais la liste cible est toujours correspondue après la résolution du chemin réel et doit rester étroite lorsqu'elle est configurée.

L'observateur couvre les fichiers `SKILL.md` imbriqués sous les racines de compétences groupées. L'ajout ou
la modification de `skills/personal/foo/SKILL.md` actualise l'instantané de la même manière que
la modification de `skills/foo/SKILL.md`.

### Nœuds macOS distants (passerelle Linux)

Si la Gateway s'exécute sur Linux mais qu'un **nœud macOS** est connecté avec
`system.run` autorisé (la sécurité des approbations d'exécution n'est pas réglée sur `deny`),
OpenClaw peut considérer les compétences exclusives à macOS comme éligibles lorsque les binaires
requis sont présents sur ce nœud. L'agent doit exécuter ces compétences
via l'outil `exec` avec `host=node`.

Cela repose sur la notification par le nœud de sa prise en charge des commandes et sur une sonde de binaire
via `system.which` ou `system.run`. Les nœuds hors ligne ne rendent **pas**
les compétences exclusives à distance visibles. Si un nœud connecté cesse de répondre aux sondes
de binaire, OpenClaw efface ses correspondances de binaires mises en cache afin que les agents ne voient plus
les compétences qui ne peuvent pas actuellement y être exécutées.

## Impact sur les jetons

Lorsque les compétences sont éligibles, OpenClaw injecte une liste XML compacte des compétences
disponibles dans le système d'invite (via `formatSkillsForPrompt` dans
`session runtime`). Le coût est déterministe :

- **Frais généraux de base** (uniquement lorsque ≥1 compétence) : 195 caractères.
- **Par compétence :** 97 caractères + la longueur des valeurs `<name>`, `<description>` et `<location>` échappées XML.

Formule (caractères) :

```text
total = 195 + Σ (97 + len(name_escaped) + len(description_escaped) + len(location_escaped))
```

L'échappement XML développe `& < > " '` en entités (`&amp;`, `&lt;`, etc.),
augmentant la longueur. Les nombres de jetons varient selon le tokeniseur du modèle. Une estimation
approximative de style OpenAI est d'environ 4 caractères/jeton, donc **97 caractères ≈ 24 jetons** par
compétence plus vos longueurs de champ réelles.

## Cycle de vie des compétences gérées

OpenClaw fournit un ensemble de compétences de base en tant que **compétences groupées** avec l'installation (paquet OpenClawnpmOpenClaw ou OpenClaw.app). `~/.openclaw/skills` existe pour les substitutions locales - par exemple, épingler ou corriger une compétence sans modifier la copie groupée. Les compétences de l'espace de travail sont détenues par l'utilisateur et prévalent sur les deux en cas de conflit de noms.

## Vous cherchez plus de compétences ?

Parcourir [https://clawhub.ai](https://clawhub.ai). Schéma de configuration complet : [Skills config](/fr/tools/skills-config).

## Connexes

- [ClawHub](/fr/clawhub) - registre public de compétences
- [Creating skills](/fr/tools/creating-skills) - créer des compétences personnalisées
- [Plugins](/fr/tools/plugin) - aperçu du système de plugins
- [Skill Workshop plugin](/fr/plugins/skill-workshop) - générer des compétences à partir du travail de l'agent
- [Skills config](/fr/tools/skills-config) - référence de configuration des compétences
- [Slash commands](/fr/tools/slash-commands) - toutes les commandes slash disponibles
