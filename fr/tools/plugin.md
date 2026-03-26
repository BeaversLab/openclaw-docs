---
summary: "Plugins/extensions OpenClaw : découverte, configuration et sécurité"
read_when:
  - Adding or modifying plugins/extensions
  - Documenting plugin install or load rules
  - Working with Codex/Claude-compatible plugin bundles
title: "Plugins"
---

# Plugins (Extensions)

## Quick start

Un plugin est soit :

- un **plugin natif OpenClaw** (`openclaw.plugin.json` + module d'exécution), ou
- un **bundle** compatible (`.codex-plugin/plugin.json` ou `.claude-plugin/plugin.json`)

Les deux apparaissent sous `openclaw plugins`, mais seuls les plugins natifs OpenClaw exécutent
du code d'exécution en cours de processus.

1. Voir ce qui est déjà chargé :

```bash
openclaw plugins list
```

2. Installer un plugin officiel (exemple : Voice Call) :

```bash
openclaw plugins install @openclaw/voice-call
```

Les spécifications Npm sont limitées au registre. Voir [règles d'installation](/fr/cli/plugins#install) pour
des détails sur l'épinglage, le filtrage des préversions et les formats de spécification pris en charge.

3. Redémarrez le Gateway, puis configurez sous `plugins.entries.<id>.config`.

Voir [Voice Call](/fr/plugins/voice-call) pour un exemple concret de plugin.
Vous cherchez des listes tierces ? Voir [Plugins communautaires](/fr/plugins/community).
Vous avez besoin des détails de compatibilité des bundles ? Voir [Plugin bundles](/fr/plugins/bundles).

Pour les bundles compatibles, installez à partir d'un répertoire local ou d'une archive :

```bash
openclaw plugins install ./my-bundle
openclaw plugins install ./my-bundle.tgz
```

Pour les installations depuis le marketplace Claude, listez d'abord le marketplace, puis installez par
le nom d'entrée du marketplace :

```bash
openclaw plugins marketplace list <marketplace-name>
openclaw plugins install <plugin-name>@<marketplace-name>
```

OpenClaw résout les noms connus du marketplace Claude à partir de
`~/.claude/plugins/known_marketplaces.json`. Vous pouvez également passer une source explicite
de marketplace avec `--marketplace`.

## Plugins disponibles (officiels)

### Plugins installables

Ceux-ci sont publiés sur npm et installés avec `openclaw plugins install` :

| Plugin          | Package                | Docs                                    |
| --------------- | ---------------------- | --------------------------------------- |
| Matrix          | `@openclaw/matrix`     | [Matrix](/fr/channels/matrix)           |
| Microsoft Teams | `@openclaw/msteams`    | [Microsoft Teams](/fr/channels/msteams) |
| Nostr           | `@openclaw/nostr`      | [Nostr](/fr/channels/nostr)             |
| Voice Call      | `@openclaw/voice-call` | [Voice Call](/fr/plugins/voice-call)    |
| Zalo            | `@openclaw/zalo`       | [Zalo](/fr/channels/zalo)               |
| Zalo Personal   | `@openclaw/zalouser`   | [Zalo Personal](/fr/plugins/zalouser)   |

Microsoft Teams est en plugin uniquement depuis le 15.01.2026.

Les installations packagées incluent également des métadonnées d'installation à la demande pour les plugins officiels lourds. Aujourd'hui, cela inclut WhatsApp et `memory-lancedb` : onboarding, `openclaw channels add`, `openclaw channels login --channel whatsapp`, et d'autres flux de configuration de canaux qui invitent à les installer lors de leur première utilisation au lieu d'expédier leurs arbres d'exécution complets à l'intérieur du tarball principal npm.

### Plugins inclus

Ceux-ci sont fournis avec OpenClaw et sont activés par défaut, sauf indication contraire.

**Mémoire :**

- `memory-core` -- recherche de mémoire incluse (par défaut via `plugins.slots.memory`)
- `memory-lancedb` -- mémoire à long terme installable à la demande avec rappel/capture automatique (définir `plugins.slots.memory = "memory-lancedb"`)

**Fournisseurs de modèles** (tous activés par défaut) :

`anthropic`, `byteplus`, `cloudflare-ai-gateway`, `github-copilot`, `google`, `huggingface`, `kilocode`, `kimi-coding`, `minimax`, `mistral`, `modelstudio`, `moonshot`, `nvidia`, `openai`, `opencode`, `opencode-go`, `openrouter`, `qianfan`, `qwen-portal-auth`, `synthetic`, `together`, `venice`, `vercel-ai-gateway`, `volcengine`, `xiaomi`, `zai`

**Fournisseurs de synthèse vocale** (activés par défaut) :

`elevenlabs`, `microsoft`

**Autres intégrés :**

- `copilot-proxy` -- Pont proxy VS Code Copilot (désactivé par défaut)

## Bundles compatibles

OpenClaw reconnaît également les structures de bundles externes compatibles :

- Bundles style Codex : `.codex-plugin/plugin.json`
- Bundles style Claude : `.claude-plugin/plugin.json` ou la structure de composant Claude par défaut
  sans manifeste
- Bundles style Cursor : `.cursor-plugin/plugin.json`

Ils apparaissent dans la liste des plugins comme `format=bundle`, avec un sous-type de
`codex`, `claude` ou `cursor` dans la sortie verbose/inspect.

Consultez [Plugin bundles](/fr/plugins/bundles) pour connaître les règles de détection exactes, le comportement de
mappage et la matrice de support actuelle.

## Configuration

```json5
{
  plugins: {
    enabled: true,
    allow: ["voice-call"],
    deny: ["untrusted-plugin"],
    load: { paths: ["~/Projects/oss/voice-call-extension"] },
    entries: {
      "voice-call": { enabled: true, config: { provider: "twilio" } },
    },
  },
}
```

Champs :

- `enabled` : interrupteur principal (par défaut : true)
- `allow` : liste d'autorisation (optionnel)
- `deny` : liste de refus (optionnel ; le refus l'emporte)
- `load.paths` : fichiers/répertoires de plugins supplémentaires
- `slots` : sélecteurs de créneaux exclusifs tels que `memory` et `contextEngine`
- `entries.<id>` : interrupteurs + configuration par plugin

Les modifications de configuration **nécessitent un redémarrage de la passerelle**. Voir
[Référence de configuration](/fr/configuration) pour le schéma de configuration complet.

Règles de validation (strictes) :

- Les ids de plugins inconnus dans `entries`, `allow`, `deny` ou `slots` sont des **erreurs**.
- Les clés `channels.<id>` inconnues sont des **erreurs**, sauf si un manifeste de plugin déclare l'identifiant de channel.
- La configuration native du plugin est validée à l'aide du schéma JSON intégré dans `openclaw.plugin.json` (`configSchema`).
- Les bundles compatibles n'exposent actuellement pas les schémas de configuration natifs OpenClaw.
- Si un plugin est désactivé, sa configuration est conservée et un **avertissement** est émis.

### Désactivé vs manquant vs invalide

Ces états sont intentionnellement différents :

- **désactivé** : le plugin existe, mais les règles d'activation l'ont désactivé
- **manquant** : la configuration référence un identifiant de plugin que la Discovery n'a pas trouvé
- **invalide** : le plugin existe, mais sa configuration ne correspond pas au schéma déclaré

OpenClaw préserve la configuration des plugins désactivés afin que leur réactivation ne soit pas destructive.

## Découverte et précédence

OpenClaw analyse, dans l'ordre :

1. Chemins de configuration

- `plugins.load.paths` (fichier ou répertoire)

2. Extensions de l'espace de travail

- `<workspace>/.openclaw/extensions/*.ts`
- `<workspace>/.openclaw/extensions/*/index.ts`

3. Extensions globales

- `~/.openclaw/extensions/*.ts`
- `~/.openclaw/extensions/*/index.ts`

4. Extensions groupées (livrées avec OpenClaw ; mélange d'activées/désactivées par défaut)

- `<openclaw>/dist/extensions/*` dans les installations empaquetées
- `<workspace>/dist-runtime/extensions/*` dans les extractions de construction locales
- `<workspace>/extensions/*` dans les workflows source/Vitest

De nombreux plugins de provider groupés sont activés par défaut pour que les catalogues de modèles/hooks d'exécution restent disponibles sans configuration supplémentaire. D'autres nécessitent toujours une activation explicite via `plugins.entries.<id>.enabled` ou
`openclaw plugins enable <id>`.

Les dépendances d'exécution des plugins groupés sont la responsabilité de chaque paquet de plugin. Les versions empaquetées préparent les dépendances groupées optées sous `dist/extensions/<id>/node_modules` au lieu d'exiger des copies miroir dans le paquet racine. Les plugins officiels très volumineux peuvent être livrés en tant qu'entrées groupées métadonnées uniquement et installer leur paquet d'exécution à la demande. Les artefacts npm livrent l'arborescence `dist/extensions/*` construite ; les répertoires `extensions/*` source restent uniquement dans les extraits de source.

Les plugins installés sont activés par défaut, mais peuvent être désactivés de la même manière.

Les plugins de l'espace de travail sont **désactivés par défaut**, sauf si vous les activez explicitement ou les ajoutez à une liste d'autorisation. C'est intentionnel : un dépôt extrait ne doit pas devenir silencieusement du code de passerelle de production.

Si plusieurs plugins résolvent vers le même identifiant, la première correspondance dans l'ordre ci-dessus l'emporte et les copies de priorité inférieure sont ignorées.

### Règles d'activation

L'activation est résolue après la découverte :

- `plugins.enabled: false` désactive tous les plugins
- `plugins.deny` prime toujours
- `plugins.entries.<id>.enabled: false` désactive ce plugin
- les plugins d'origine workspace sont désactivés par défaut
- les listes d'autorisation restreignent l'ensemble actif lorsque `plugins.allow` n'est pas vide
- les listes d'autorisation sont basées sur l'**identifiant**, et non sur la source
- les plugins groupés sont désactivés par défaut sauf si :
  - l'identifiant groupé fait partie de l'ensemble par défaut activé intégré, ou
  - vous l'activez explicitement, ou
  - la configuration channel active implicitement le plugin channel groupé
- les emplacements exclusifs peuvent forcer l'activation du plugin sélectionné pour cet emplacement

## Emplacements de plugins (catégories exclusives)

Certaines catégories de plugins sont **exclusives** (une seule active à la fois). Utilisez
`plugins.slots` pour sélectionner quel plugin possède l'emplacement :

```json5
{
  plugins: {
    slots: {
      memory: "memory-core", // or "none" to disable memory plugins
      contextEngine: "legacy", // or a plugin id such as "lossless-claw"
    },
  },
}
```

Emplacements exclusifs pris en charge :

- `memory` : plugin de mémoire actif (`"none"` désactive les plugins de mémoire)
- `contextEngine` : plugin de moteur de contexte actif (`"legacy"` est celui par défaut intégré)

Si plusieurs plugins déclarent `kind: "memory"` ou `kind: "context-engine"`, seul
le plugin sélectionné se charge pour cet emplacement. Les autres sont désactivés avec des diagnostics.
Déclarez `kind` dans votre [manifeste de plugin](/fr/plugins/manifest).

## Identifiants de plugin

Identifiants de plugin par défaut :

- Paquets de packages : `package.json` `name`
- Fichier autonome : nom de base du fichier (`~/.../voice-call.ts` -> `voice-call`)

Si un plugin exporte `id`, OpenClaw l'utilise mais avertit lorsqu'il ne correspond pas à
l'identifiant configuré.

## Inspection

```bash
openclaw plugins inspect openai        # deep detail on one plugin
openclaw plugins inspect openai --json # machine-readable
openclaw plugins list                  # compact inventory
openclaw plugins status                # operational summary
openclaw plugins doctor                # issue-focused diagnostics
```

## CLI

```bash
openclaw plugins list
openclaw plugins inspect <id>
openclaw plugins install <path>                 # copy a local file/dir into ~/.openclaw/extensions/<id>
openclaw plugins install ./extensions/voice-call # relative path ok
openclaw plugins install ./plugin.tgz           # install from a local tarball
openclaw plugins install ./plugin.zip           # install from a local zip
openclaw plugins install -l ./extensions/voice-call # link (no copy) for dev
openclaw plugins install @openclaw/voice-call   # install from npm
openclaw plugins install @openclaw/voice-call --pin # store exact resolved name@version
openclaw plugins update <id-or-npm-spec>
openclaw plugins update --all
openclaw plugins enable <id>
openclaw plugins disable <id>
openclaw plugins doctor
```

Voir la [référence de la `openclaw plugins` CLI](/fr/cli/plugins) pour tous les détails sur chaque
commande (règles d'installation, inspection de la sortie, installations depuis la place de marché, désinstallation).

Les plugins peuvent également enregistrer leurs propres commandes de niveau supérieur (exemple :
`openclaw voicecall`).

## API des plugins (aperçu)

Les plugins exportent soit :

- Une fonction : `(api) => { ... }`
- Un objet : `{ id, name, configSchema, register(api) { ... } }`

`register(api)` est l'endroit où les plugins attachent des comportements. Les enregistrements courants incluent :

- `registerTool`
- `registerHook`
- `on(...)` pour les hooks de cycle de vie typés
- `registerChannel`
- `registerProvider`
- `registerSpeechProvider`
- `registerMediaUnderstandingProvider`
- `registerWebSearchProvider`
- `registerHttpRoute`
- `registerCommand`
- `registerCli`
- `registerContextEngine`
- `registerService`

Voir [Plugin manifest](/fr/plugins/manifest) pour le format du fichier manifeste.

## Pour aller plus loin

- [Plugin architecture and internals](/fr/plugins/architecture) -- modèle de capacité,
  modèle de propriété, contrats, pipeline de chargement, assistants d'exécution et référence de l'API
  développeur
- [Building extensions](/fr/plugins/building-extensions)
- [Plugin bundles](/fr/plugins/bundles)
- [Plugin manifest](/fr/plugins/manifest)
- [Plugin agent tools](/fr/plugins/agent-tools)
- [Capability Cookbook](/fr/tools/capability-cookbook)
- [Community plugins](/fr/plugins/community)

import fr from "/components/footer/fr.mdx";

<fr />
