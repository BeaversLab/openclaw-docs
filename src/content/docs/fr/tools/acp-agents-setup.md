---
summary: "Configuration des agents ACP : configuration du harnais acpx, configuration des plugins, autorisations"
read_when:
  - Installing or configuring the acpx harness for Claude Code / Codex / Gemini CLI
  - Enabling the plugin-tools or OpenClaw-tools MCP bridge
  - Configuring ACP permission modes
title: "Agents ACP — configuration"
---

Pour la vue d'ensemble, le guide de l'opérateur et les concepts, consultez [ACP agents](/fr/tools/acp-agents).

Les sections ci-dessous couvrent la configuration du harnais acpx, la configuration des plugins pour les ponts MCP et la configuration des autorisations.

Utilisez cette page uniquement lorsque vous configurez la route ACP/acpx. Pour la configuration du runtime du serveur d'application natif de Codex, utilisez [Codex harness](/fr/plugins/codex-harness). Pour les clés OpenAI de API ou la configuration du OAuth OpenAI OpenAI de Codex, utilisez [OpenAI](/fr/providers/openai).

Codex possède deux routes OpenClaw :

| Route                             | Config/commande                                        | Page de configuration                      |
| --------------------------------- | ------------------------------------------------------ | ------------------------------------------ |
| Serveur d'application Codex natif | `/codex ...`, `openai/gpt-*` agent refs                | [Codex harness](/fr/plugins/codex-harness) |
| Adaptateur ACP Codex explicite    | `/acp spawn codex`, `runtime: "acp", agentId: "codex"` | Cette page                                 |

Préférez la route native sauf si vous avez explicitement besoin du comportement ACP/acpx.

## prise en charge du harnais acpx (actuel)

Alias de harnais intégrés acpx actuels :

- `claude`
- `codex`
- `copilot`
- `cursor` (Cursor CLI : `cursor-agent acp`)
- `droid`
- `gemini`
- `iflow`
- `kilocode`
- `kimi`
- `kiro`
- `openclaw`
- `opencode`
- `pi`
- `qwen`

Lorsque OpenClaw utilise le backend acpx, privilégiez ces valeurs pour `agentId`, sauf si votre configuration acpx définit des alias d'agent personnalisés.
Si votre installation locale de Cursor expose toujours l'ACP en tant que `agent acp`, remplacez la commande d'agent `cursor` dans votre configuration acpx au lieu de modifier la valeur par défaut intégrée.

L'utilisation directe de l'CLI acpx peut également cibler des adaptateurs arbitraires via `--agent <command>`, mais cette échappatoire brute est une fonctionnalité de l'CLI acpx (et non le chemin `agentId` normal de OpenClaw).

Le contrôle du modèle dépend de la capacité de l'adaptateur. Les références de modèle ACP Codex sont normalisées par OpenClaw avant le démarrage. Les autres harnais nécessitent la prise en charge d'ACP OpenClaw`models` ainsi que de `session/set_model`OpenClaw ; si un harnais n'expose ni cette capacité ACP ni son propre indicateur de modèle au démarrage, OpenClaw/acpx ne peut pas forcer une sélection de modèle.

## Configuration requise

Référentiel ACP de base :

```json5
{
  acp: {
    enabled: true,
    // Optional. Default is true; set false to pause ACP dispatch while keeping /acp controls.
    dispatch: { enabled: true },
    backend: "acpx",
    defaultAgent: "codex",
    allowedAgents: ["claude", "codex", "copilot", "cursor", "droid", "gemini", "iflow", "kilocode", "kimi", "kiro", "openclaw", "opencode", "pi", "qwen"],
    maxConcurrentSessions: 8,
    stream: {
      coalesceIdleMs: 300,
      maxChunkChars: 1200,
    },
    runtime: {
      ttlMinutes: 120,
    },
  },
}
```

La configuration de liaison de fil est spécifique à l'adaptateur de canal. Exemple pour Discord :

```json5
{
  session: {
    threadBindings: {
      enabled: true,
      idleHours: 24,
      maxAgeHours: 0,
    },
  },
  channels: {
    discord: {
      threadBindings: {
        enabled: true,
        spawnSessions: true,
      },
    },
  },
}
```

Si la création d'instances ACP liées à un fil ne fonctionne pas, vérifiez d'abord l'indicateur de fonctionnalité de l'adaptateur :

- Discord : Discord`channels.discord.threadBindings.spawnSessions=true`

Les liaisons à la conversation en cours ne nécessitent pas la création de fils enfants. Elles nécessitent un contexte de conversation actif et un adaptateur de canal qui expose les liaisons de conversation ACP.

Voir [Référence de configuration](/fr/gateway/configuration-reference).

## Configuration du plugin pour le backend acpx

Les installations packagées utilisent le plugin d'exécution `@openclaw/acpx` officiel pour ACP.
Installez-le et activez-le avant d'utiliser les sessions de harnais ACP :

```bash
openclaw plugins install @openclaw/acpx
openclaw config set plugins.entries.acpx.enabled true
```

Les extraits de source peuvent également utiliser le plugin de l'espace de travail local après `pnpm install`.

Commencez par :

```text
/acp doctor
```

Si vous avez désactivé `acpx`, l'avez refusé via `plugins.allow` / `plugins.deny`, ou si vous souhaitez
repasser au plugin packagé, utilisez le chemin d'accès explicite au package :

```bash
openclaw plugins install @openclaw/acpx
openclaw config set plugins.entries.acpx.enabled true
```

Installation de l'espace de travail local pendant le développement :

```bash
openclaw plugins install ./path/to/local/acpx-plugin
```

Vérifiez ensuite l'état du backend :

```text
/acp doctor
```

### Configuration de la commande et de la version acpx

Par défaut, le plugin `acpx`Gateway enregistre le backend ACP intégré sans
lancer un agent ACP lors du démarrage de la Gateway. Exécutez `/acp doctor` pour une
sonde de vie explicite. Définissez `OPENCLAW_ACPX_RUNTIME_STARTUP_PROBE=1`Gateway uniquement lorsque vous avez besoin que
la Gateway sonde l'agent configuré au démarrage.

Remplacez la commande ou la version dans la configuration du plugin :

```json
{
  "plugins": {
    "entries": {
      "acpx": {
        "enabled": true,
        "config": {
          "command": "../acpx/dist/cli.js",
          "expectedVersion": "any"
        }
      }
    }
  }
}
```

- `command`OpenClaw accepte un chemin absolu, un chemin relatif (résolu à partir de l'espace de travail OpenClaw), ou un nom de commande.
- `expectedVersion: "any"` désactive la correspondance stricte de version.
- Les chemins `command` personnalisés désactivent l'auto-installation locale du plugin.

Remplacez une commande d'agent ACP individuelle par des arguments structurés lorsqu'un chemin
ou une valeur d'indicateur doit rester un seul jeton argv :

```json
{
  "plugins": {
    "entries": {
      "acpx": {
        "enabled": true,
        "config": {
          "agents": {
            "claude": {
              "command": "node",
              "args": ["/path/to/custom adapter.mjs", "--verbose"]
            }
          }
        }
      }
    }
  }
}
```

- `agents.<id>.command` est l'exécutable ou la chaîne de commande existante pour cet agent ACP.
- `agents.<id>.args`OpenClaw est facultatif. Chaque élément du tableau est échappé par le shell avant qu'OpenClaw ne le transmette via le registre actuel de chaînes de commande acpx.

Voir [Plugins](/fr/tools/plugin).

### Installation automatique des dépendances

Lorsque vous installez OpenClaw globalement avec `npm install -g openclaw`, les dépendances
runtime d'acpx (binaires spécifiques à la plateforme) sont installées automatiquement
via un hook postinstall. Si l'installation automatique échoue, la passerelle démarre
normalement tout de même et signale la dépendance manquante via `openclaw acp doctor`.

### Pont MCP des outils de plugin

Par défaut, les sessions ACPX n'exposent **pas** les outils enregistrés par les plugins OpenClaw
au harnais ACP.

Si vous souhaitez que les agents ACP tels que Codex ou Claude Code puissent appeler des outils de plugin
OpenClaw installés, tels que la restitution/stockage de mémoire, activez le pont dédié :

```bash
openclaw config set plugins.entries.acpx.config.pluginToolsMcpBridge true
```

Ce que cela fait :

- Injecte un serveur MCP intégré nommé `openclaw-plugin-tools` dans l'amorçage
  de la session ACPX.
- Expose les outils de plugin déjà enregistrés par les plugins OpenClaw
  installés et activés.
- Rend cette fonctionnalité explicite et désactivée par défaut.

Notes de sécurité et de confiance :

- Cela étend la surface d'outils du harnais ACP.
- Les agents ACP n'accèdent qu'aux outils de plugin déjà actifs dans la passerelle.
- Traitez cela comme la même limite de confiance que d'autoriser ces plugins à s'exécuter dans
  OpenClaw lui-même.
- Examinez les plugins installés avant d'activer cette fonctionnalité.

Les `mcpServers` personnalisés fonctionnent toujours comme avant. Le pont intégré plugin-tools est une
commodité supplémentaire optionnelle, et non un remplacement de la configuration générique de serveur MCP.

### Pont MCP des outils OpenClaw

Par défaut, les sessions ACPX n'exposent pas non plus les outils intégrés de OpenClaw via
MCP. Activez le pont core-tools séparé lorsqu'un agent ACP a besoin d'outils intégrés
sélectionnés tels que `cron` :

```bash
openclaw config set plugins.entries.acpx.config.openClawToolsMcpBridge true
```

Ce que cela fait :

- Injecte un serveur MCP intégré nommé `openclaw-tools` dans l'amorçage
  de la session ACPX.
- Expose certains outils intégrés de OpenClaw. Le serveur initial expose `cron`.
- Rend l'exposition des outils principaux explicite et désactivée par défaut.

### Configuration du délai d'attente d'exécution

Le plugin `acpx` définit par défaut le délai d'expiration des exécutions intégrées (runtime turns) à 120 secondes. Cela donne aux harnais plus lents, tels que Gemini CLI, suffisamment de temps pour terminer le démarrage et l'initialisation de l'ACP. Modifiez cette valeur si votre hôte nécessite une limite d'exécution différente :

```bash
openclaw config set plugins.entries.acpx.config.timeoutSeconds 180
```

Redémarrez la passerelle après avoir modifié cette valeur.

### Configuration de l'agent de sonde de santé

Lorsque `/acp doctor` ou la sonde de démarrage facultative vérifie le backend, le plugin `acpx` intégré interroge un agent de harnais. Si `acp.allowedAgents` est défini, il correspond par défaut au premier agent autorisé ; sinon, il correspond par défaut à `codex`. Si votre déploiement nécessite un agent ACP différent pour les contrôles de santé, définissez l'agent de sonde explicitement :

```bash
openclaw config set plugins.entries.acpx.config.probeAgent claude
```

Redémarrez la passerelle après avoir modifié cette valeur.

## Configuration des autorisations

Les sessions ACP s'exécutent de manière non interactive — il n'y a pas de TTY pour approuver ou refuser les invites d'autorisation d'écriture de fichiers et d'exécution de shell. Le plugin acpx fournit deux clés de configuration qui contrôlent la gestion des autorisations :

Ces autorisations de harnais ACPX sont distinctes des approbations d'exécution OpenClaw et distinctes des indicateurs de contournement des fournisseurs de backend CLI tels que le CLI `--permission-mode bypassPermissions` de Claude. `approve-all` ACPX est le commutateur de rupture de verre (break-glass) au niveau du harnais pour les sessions ACP.

### `permissionMode`

Contrôle les opérations que l'agent de harnais peut effectuer sans invite.

| Valeur          | Comportement                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------------ |
| `approve-all`   | Approuver automatiquement toutes les écritures de fichiers et les commandes shell.                           |
| `approve-reads` | Approuver automatiquement les lectures uniquement ; les écritures et les exécutions nécessitent des invites. |
| `deny-all`      | Refuser toutes les invites d'autorisation.                                                                   |

### `nonInteractivePermissions`

Contrôle ce qui se passe lorsqu'une invite d'autorisation devrait être affichée mais qu'aucun TTY interactif n'est disponible (ce qui est toujours le cas pour les sessions ACP).

| Valeur | Comportement                                                                 |
| ------ | ---------------------------------------------------------------------------- |
| `fail` | Interrompre la session avec `AcpRuntimeError`. **(par défaut)**              |
| `deny` | Refuser silencieusement l'autorisation et continuer (dégradation gracieuse). |

### Configuration

Définir via la configuration du plugin :

```bash
openclaw config set plugins.entries.acpx.config.permissionMode approve-all
openclaw config set plugins.entries.acpx.config.nonInteractivePermissions fail
```

Redémarrez la passerelle après avoir modifié ces valeurs.

<Warning>
OpenClaw est réglé par défaut sur OpenClaw`permissionMode=approve-reads` et `nonInteractivePermissions=fail`. Dans les sessions ACP non interactives, toute opération d'écriture ou d'exécution qui déclenche une invite d'autorisation peut échouer avec `AcpRuntimeError: Permission prompt unavailable in non-interactive mode`.

Si vous devez restreindre les autorisations, définissez `nonInteractivePermissions` sur `deny` afin que les sessions se dégradent progressivement au lieu de planter.

</Warning>

## Connexes

- [ACP agents](/fr/tools/acp-agents) — vue d'ensemble, guide de l'opérateur, concepts
- [Sub-agents](/fr/tools/subagents)
- [Multi-agent routing](/fr/concepts/multi-agent)
