---
summary: "Configuration des agents ACP : config du harnais acpx, configuration des plugins, autorisations"
read_when:
  - Installing or configuring the acpx harness for Claude Code / Codex / Gemini CLI
  - Enabling the plugin-tools or OpenClaw-tools MCP bridge
  - Configuring ACP permission modes
title: "Agents ACP — configuration"
---

Pour consulter la vue d'ensemble, le guide de l'opérateur et les concepts, voir [ACP agents](/fr/tools/acp-agents).

Les sections ci-dessous couvrent la configuration du harnais acpx, la configuration des plugins pour les ponts MCP et la configuration des autorisations.

Utilisez cette page uniquement lorsque vous configurez la route ACP/acpx. Pour la configuration du runtime du serveur d'application Codex natif, utilisez [Codex harness](/fr/plugins/codex-harness). Pour
les clés OpenAI API ou la configuration du fournisseur de modèle OAuth Codex, utilisez
[OpenAI](/fr/providers/openai).

Codex possède deux routes OpenClaw :

| Route                             | Config/commande                                        | Page de configuration                      |
| --------------------------------- | ------------------------------------------------------ | ------------------------------------------ |
| Serveur d'application Codex natif | `/codex ...`, `agentRuntime.id: "codex"`               | [Codex harness](/fr/plugins/codex-harness) |
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

Lorsque OpenClaw utilise le backend acpx, privilégiez ces valeurs pour `agentId` sauf si votre configuration acpx définit des alias d'agents personnalisés.
Si votre installation locale de Cursor expose toujours l'ACP en tant que `agent acp`, remplacez la commande d'agent `cursor` dans votre configuration acpx au lieu de modifier la valeur par défaut intégrée.

L'utilisation directe du CLI acpx peut également cibler des adaptateurs arbitraires via `--agent <command>`, mais cette échappatoire brute est une fonctionnalité du CLI acpx (et non le chemin normal OpenClaw `agentId`).

Le contrôle du modèle dépend des capacités de l'adaptateur. Les références de modèle ACP Codex sont
normalisées par OpenClaw avant le démarrage. Les autres harnais nécessitent le support ACP `models` ainsi
que `session/set_model` ; si un harnais n'expose ni cette capacité ACP
ni son propre indicateur de modèle de démarrage, OpenClaw/acpx ne peut pas forcer une sélection de modèle.

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
        spawnAcpSessions: true,
      },
    },
  },
}
```

Si la création d'instances ACP liées à un fil ne fonctionne pas, vérifiez d'abord l'indicateur de fonctionnalité de l'adaptateur :

- Discord : `channels.discord.threadBindings.spawnAcpSessions=true`

Les liaisons à la conversation en cours ne nécessitent pas la création de fils enfants. Elles nécessitent un contexte de conversation actif et un adaptateur de canal qui expose les liaisons de conversation ACP.

Voir [Référence de configuration](/fr/gateway/configuration-reference).

## Configuration du plugin pour le backend acpx

Les nouvelles installations livrent le plugin d'exécution groupé `acpx` activé par défaut, donc l'ACP
fonctionne généralement sans étape d'installation manuelle du plugin.

Commencez par :

```text
/acp doctor
```

Si vous avez désactivé `acpx`, l'avez refusé via `plugins.allow` / `plugins.deny`, ou si vous souhaitez
passer à une extraction de développement locale, utilisez le chemin explicite du plugin :

```bash
openclaw plugins install acpx
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

Par défaut, le plugin groupé `acpx` enregistre le backend ACP intégré sans
lancer d'agent ACP pendant le démarrage de la Gateway. Exécutez `/acp doctor` pour une sonde
de vie explicite. Définissez `OPENCLAW_ACPX_RUNTIME_STARTUP_PROBE=1` uniquement lorsque vous avez besoin que
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

- `command` accepte un chemin absolu, un chemin relatif (résolu à partir de l'espace de travail OpenClaw) ou un nom de commande.
- `expectedVersion: "any"` désactive la correspondance stricte de version.
- Les chemons personnalisés `command` désactivent l'auto-installation locale du plugin.

Voir [Plugins](/fr/tools/plugin).

### Installation automatique des dépendances

Lorsque vous installez OpenClaw globalement avec `npm install -g openclaw`, les dépendances
runtime d'acpx (binaires spécifiques à la plateforme) sont installées automatiquement
via un hook postinstall. Si l'installation automatique échoue, la passerelle démarre
tout de même normalement et signale la dépendance manquante via `openclaw acp doctor`.

### Pont MCP des outils de plugin

Par défaut, les sessions ACPX n'exposent **pas** les outils enregistrés par le plugin
OpenClaw au harnais ACP.

Si vous souhaitez que des agents ACP tels que Codex ou Claude Code puissent appeler des
outils de plugin OpenClaw installés, tels que la rappel/le stockage de mémoire, activez le pont dédié :

```bash
openclaw config set plugins.entries.acpx.config.pluginToolsMcpBridge true
```

Ce que cela fait :

- Injecte un serveur MCP intégré nommé `openclaw-plugin-tools` dans l'amorçage
  de la session ACPX.
- Expose les outils de plugin déjà enregistrés par les plugins OpenClaw
  installés et activés.
- Garde la fonctionnalité explicite et désactivée par défaut.

Notes de sécurité et de confiance :

- Cela étend la surface des outils du harnais ACP.
- Les agents ACP n'ont accès qu'aux outils de plugin déjà actifs dans la passerelle.
- Traitez cela avec la même limite de confiance que celle consistant à laisser ces plugins s'exécuter
  dans OpenClaw lui-même.
- Examinez les plugins installés avant de l'activer.

Les `mcpServers` personnalisés fonctionnent toujours comme avant. Le pont intégré plugin-tools est une
commodité d'adhésion supplémentaire, et non un remplacement de la configuration générique du serveur MCP.

### Pont MCP des outils OpenClaw

Par défaut, les sessions ACPX n'exposent **pas** non plus les outils intégrés de OpenClaw via
MCP. Activez le pont core-tools distinct lorsqu'un agent ACP a besoin d'outils intégrés
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

Le plugin `acpx` inclus définit les délais d'exécution intégrés par défaut à 120 secondes.
Cela donne suffisamment de temps aux harnais plus lents tels que Gemini CLI pour terminer
le démarrage et l'initialisation de l'ACP. Modifiez cette valeur si votre hôte nécessite une
limite d'exécution différente :

```bash
openclaw config set plugins.entries.acpx.config.timeoutSeconds 180
```

Redémarrez la passerelle après avoir modifié cette valeur.

### Configuration de l'agent de sonde de santé

Lorsque `/acp doctor` ou la sonde de démarrage optionnelle vérifie le backend, le plugin `acpx` intégré sonde un agent du harnais. Si `acp.allowedAgents` est défini, il s'agit par défaut du premier agent autorisé ; sinon, il s'agit par défaut de `codex`. Si votre déploiement a besoin d'un agent ACP différent pour les contrôles de santé, définissez l'agent de sonde explicitement :

```bash
openclaw config set plugins.entries.acpx.config.probeAgent claude
```

Redémarrez la passerelle après avoir modifié cette valeur.

## Configuration des permissions

Les sessions ACP s'exécutent de manière non interactive — il n'y a pas de TTY pour approuver ou refuser les invites de permission d'écriture de fichiers et d'exécution de shell. Le plugin acpx fournit deux clés de configuration qui contrôlent la gestion des permissions :

Ces permissions de harnais ACPX sont distinctes des approbations d'exécution OpenClaw et distinctes des indicateurs de contournement du fournisseur backend CLI tels que `--permission-mode bypassPermissions` du CLI Claude. `approve-all` ACPX est le commutateur de bris de glace au niveau du harnais pour les sessions ACP.

### `permissionMode`

Contrôle les opérations que l'agent du harnais peut effectuer sans invite.

| Valeur          | Comportement                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------------ |
| `approve-all`   | Approuver automatiquement toutes les écritures de fichiers et les commandes shell.                           |
| `approve-reads` | Approuver automatiquement les lectures uniquement ; les écritures et les exécutions nécessitent des invites. |
| `deny-all`      | Refuser toutes les invites de permission.                                                                    |

### `nonInteractivePermissions`

Contrôle ce qui se passe lorsqu'une invite de permission devrait être affichée mais qu'aucun TTY interactif n'est disponible (ce qui est toujours le cas pour les sessions ACP).

| Valeur | Comportement                                                                |
| ------ | --------------------------------------------------------------------------- |
| `fail` | Interrompre la session avec `AcpRuntimeError`. **(par défaut)**             |
| `deny` | Refuser silencieusement la permission et continuer (dégradation gracieuse). |

### Configuration

Définir via la configuration du plugin :

```bash
openclaw config set plugins.entries.acpx.config.permissionMode approve-all
openclaw config set plugins.entries.acpx.config.nonInteractivePermissions fail
```

Redémarrez la passerelle après avoir modifié ces valeurs.

<Warning>
OpenClaw est par défaut réglé sur `permissionMode=approve-reads` et `nonInteractivePermissions=fail`. Dans les sessions ACP non interactives, toute écriture ou exécution qui déclenche une invite de permission peut échouer avec `AcpRuntimeError: Permission prompt unavailable in non-interactive mode`.

Si vous devez restreindre les permissions, définissez `nonInteractivePermissions` sur `deny` afin que les sessions se dégradent gracieusement au lieu de planter.

</Warning>

## Connexes

- [ACP agents](/fr/tools/acp-agents) — vue d'ensemble, guide de l'opérateur, concepts
- [Sous-agents](/fr/tools/subagents)
- [Routage multi-agent](/fr/concepts/multi-agent)
