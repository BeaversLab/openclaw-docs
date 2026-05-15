---
summary: "Hooks : automatisation basée sur les événements pour les commandes et les événements de cycle de vie"
read_when:
  - You want event-driven automation for /new, /reset, /stop, and agent lifecycle events
  - You want to build, install, or debug hooks
title: "Hooks"
---

Les Hooks sont de petits scripts qui s'exécutent lorsqu'un événement se produit dans le Gateway. Ils peuvent être découverts depuis des répertoires et inspectés avec `openclaw hooks`. Le Gateway ne charge les hooks internes qu'après avoir activé les hooks ou configuré au moins une entrée de hook, un pack de hooks, un gestionnaire hérité ou un répertoire de hooks supplémentaire.

Il existe deux types de hooks dans OpenClaw :

- **Hooks internes** (cette page) : s'exécutent dans le Gateway lorsque les événements de l'agent se déclenchent, comme `/new`, `/reset`, `/stop`, ou les événements de cycle de vie.
- **Webhooks** : points de terminaison HTTP externes qui permettent à d'autres systèmes de déclencher des travaux dans OpenClaw. Voir [Webhooks](/fr/automation/cron-jobs#webhooks).

Les hooks peuvent également être regroupés dans des plugins. `openclaw hooks list` montre à la fois les hooks autonomes et les hooks gérés par des plugins.

## Quick start

```bash
# List available hooks
openclaw hooks list

# Enable a hook
openclaw hooks enable session-memory

# Check hook status
openclaw hooks check

# Get detailed information
openclaw hooks info session-memory
```

## Event types

| Event                    | When it fires                                                        |
| ------------------------ | -------------------------------------------------------------------- |
| `command:new`            | commande `/new` émise                                                |
| `command:reset`          | commande `/reset` émise                                              |
| `command:stop`           | commande `/stop` émise                                               |
| `command`                | Tout événement de commande (écouteur général)                        |
| `session:compact:before` | Avant que la compaction ne résume l'historique                       |
| `session:compact:after`  | Après la fin de la compaction                                        |
| `session:patch`          | Lorsque les propriétés de session sont modifiées                     |
| `agent:bootstrap`        | Avant l'injection des fichiers d'amorçage de l'espace de travail     |
| `gateway:startup`        | Après le démarrage des canaux et le chargement des hooks             |
| `gateway:shutdown`       | Lorsque l'arrêt de la passerelle commence                            |
| `gateway:pre-restart`    | Avant un redémarrage prévu de la passerelle                          |
| `message:received`       | Message entrant de n'importe quel canal                              |
| `message:transcribed`    | Après la fin de la transcription audio                               |
| `message:preprocessed`   | Après la fin ou l'ignorance du prétraitement des médias et des liens |
| `message:sent`           | Message sortant délivré                                              |

## Writing hooks

### Hook structure

Chaque hook est un répertoire contenant deux fichiers :

```
my-hook/
├── HOOK.md          # Metadata + documentation
└── handler.ts       # Handler implementation
```

### HOOK.md format

```markdown
---
name: my-hook
description: "Short description of what this hook does"
metadata: { "openclaw": { "emoji": "🔗", "events": ["command:new"], "requires": { "bins": ["node"] } } }
---

# My Hook

Detailed documentation goes here.
```

**Champs de métadonnées** (`metadata.openclaw`) :

| Field      | Description                                          |
| ---------- | ---------------------------------------------------- |
| `emoji`    | Afficher l'emoji pour la CLI                         |
| `events`   | Tableau des événements à écouter                     |
| `export`   | Export nommé à utiliser (par défaut `"default"`)     |
| `os`       | Plateformes requises (ex. `["darwin", "linux"]`)     |
| `requires` | Chemins `bins`, `anyBins`, `env` ou `config` requis  |
| `always`   | Contourner les vérifications d'éligibilité (booléen) |
| `install`  | Méthodes d'installation                              |

### Implémentation du gestionnaire

```typescript
const handler = async (event) => {
  if (event.type !== "command" || event.action !== "new") {
    return;
  }

  console.log(`[my-hook] New command triggered`);
  // Your logic here

  // Optionally send message to user
  event.messages.push("Hook executed!");
};

export default handler;
```

Chaque événement comprend : `type`, `action`, `sessionKey`, `timestamp`, `messages` (push pour envoyer à l'utilisateur) et `context` (données spécifiques à l'événement). Les contextes de hook des plugins d'agent et d'outil peuvent également inclure `trace`, un contexte de trace de diagnostic en lecture seule compatible W3C que les plugins peuvent transmettre aux journaux structurés pour la corrélation OTEL.

### Points forts du contexte d'événement

**Événements de commande** (`command:new`, `command:reset`) : `context.sessionEntry`, `context.previousSessionEntry`, `context.commandSource`, `context.workspaceDir`, `context.cfg`.

**Événements de message** (`message:received`) : `context.from`, `context.content`, `context.channelId`, `context.metadata` (données spécifiques au fournisseur incluant `senderId`, `senderName`, `guildId`). `context.content` préfère un corps de commande non vide pour les messages de type commande, puis revient au corps entrant brut et au corps générique ; il n'inclut pas l'enrichement réservé à l'agent tel que l'historique des fils ou les résumés de liens.

**Événements de message** (`message:sent`) : `context.to`, `context.content`, `context.success`, `context.channelId`.

**Événements de message** (`message:transcribed`) : `context.transcript`, `context.from`, `context.channelId`, `context.mediaPath`.

**Événements de message** (`message:preprocessed`) : `context.bodyForAgent` (corps enrichi final), `context.from`, `context.channelId`.

**Événements d'amorçage** (`agent:bootstrap`) : `context.bootstrapFiles` (tableau modifiable), `context.agentId`.

**Événements de correctif de session** (`session:patch`) : `context.sessionEntry`, `context.patch` (champs modifiés uniquement), `context.cfg`. Seuls les clients privilégiés peuvent déclencher des événements de correctif.

**Événements de compactage** : `session:compact:before` inclut `messageCount`, `tokenCount`. `session:compact:after` ajoute `compactedCount`, `summaryLength`, `tokensBefore`, `tokensAfter`.

`command:stop` observe l'utilisateur émettant `/stop` ; il s'agit d'un cycle de vie d'annulation/de commande,
pas d'une porte de finalisation d'agent. Les plugins qui doivent inspecter une
réponse finale naturelle et demander à l'agent un passage supplémentaire doivent utiliser le hook de plugin typé
`before_agent_finalize` à la place. Voir [Plugin hooks](/fr/plugins/hooks).

**Événements de cycle de vie du Gateway** : `gateway:shutdown` inclut `reason` et `restartExpectedMs` et se déclenche lorsque l'arrêt de la passerelle commence. `gateway:pre-restart` inclut le même contexte mais se déclenche uniquement lorsque l'arrêt fait partie d'un redémarrage attendu et qu'une valeur finie `restartExpectedMs` est fournie. Pendant l'arrêt, chaque attente de hook de cycle de vie est de meilleur effort et limitée afin que l'arrêt se poursuive si un gestionnaire bloque.

## Découverte de hooks

Les hooks sont découverts à partir de ces répertoires, par ordre de priorité de remplacement croissante :

1. **Bundled hooks** : fournis avec OpenClaw
2. **Plugin hooks** : hooks regroupés dans les plugins installés
3. **Hooks gérés** : `~/.openclaw/hooks/` (installés par l'utilisateur, partagés entre les espaces de travail). Les répertoires supplémentaires de `hooks.internal.load.extraDirs` partagent cette priorité.
4. **Hooks d'espace de travail** : `<workspace>/hooks/` (par agent, désactivés par défaut jusqu'à activation explicite)

Les hooks d'espace de travail peuvent ajouter de nouveaux noms de hooks mais ne peuvent pas remplacer les hooks regroupés, gérés ou fournis par des plugins portant le même nom.

Le Gateway ignore la découverte de hooks internes au démarrage jusqu'à ce que les hooks internes soient configurés. Activez un hook groupé ou géré avec `openclaw hooks enable <name>`, installez un pack de hooks ou définissez `hooks.internal.enabled=true` pour opter. Lorsque vous activez un hook nommé, le Gateway ne charge que le gestionnaire de ce hook ; `hooks.internal.enabled=true`, les répertoires de hooks supplémentaires et les gestionnaires hérités optent pour une découverte large.

### Packs de hooks

Les packs de hooks sont des packages npm qui exportent des hooks via npm`openclaw.hooks` dans `package.json`. Installez avec :

```bash
openclaw plugins install <path-or-spec>
```

Les specs npm sont exclusivement de registre (nom de package + version exacte facultative ou dist-tag). Les specs Git/URL/fichier et les plages semver sont rejetées.

## Hooks regroupés

| Hook                  | Événements                                        | Ce qu'il fait                                                                                  |
| --------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| session-memory        | `command:new`, `command:reset`                    | Enregistre le contexte de la session dans `<workspace>/memory/`                                |
| bootstrap-extra-files | `agent:bootstrap`                                 | Injecte des fichiers d'amorçage supplémentaires à partir de motifs glob                        |
| command-logger        | `command`                                         | Enregistre toutes les commandes dans `~/.openclaw/logs/commands.log`                           |
| compaction-notifier   | `session:compact:before`, `session:compact:after` | Envoie des notifications de chat visibles lorsque la compaction de session commence/se termine |
| boot-md               | `gateway:startup`                                 | Exécute `BOOT.md` lorsque la passerelle démarre                                                |

Activer n'importe quel hook intégré :

```bash
openclaw hooks enable <hook-name>
```

<a id="session-memory"></a>

### détails de session-memory

Extrait les 15 derniers messages utilisateur/assistant et les enregistre dans `<workspace>/memory/YYYY-MM-DD-HHMM.md` en utilisant la date locale de l'hôte. La capture de la mémoire s'exécute en arrière-plan, de sorte que les accusés de réception `/new` et `/reset` ne sont pas retardés par les lectures de transcription ou la génération optionnelle de slug. Définissez `hooks.internal.entries.session-memory.llmSlug: true` pour générer des slugs de noms de fichiers descriptifs avec le modèle configuré. Nécessite que `workspace.dir` soit configuré.

<a id="bootstrap-extra-files"></a>

### config bootstrap-extra-files

```json
{
  "hooks": {
    "internal": {
      "entries": {
        "bootstrap-extra-files": {
          "enabled": true,
          "paths": ["packages/*/AGENTS.md", "packages/*/TOOLS.md"]
        }
      }
    }
  }
}
```

Les chemins sont résolus par rapport à l'espace de travail. Seuls les noms de base d'amorçage reconnus sont chargés (`AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, `BOOTSTRAP.md`, `MEMORY.md`).

<a id="command-logger"></a>

### détails de command-logger

Enregistre chaque commande slash dans `~/.openclaw/logs/commands.log`.

<a id="compaction-notifier"></a>

### détails de compaction-notifier

Envoie des messages de statut courts dans la conversation en cours lorsque OpenClaw commence et termine la compaction de la transcription de session. Cela rend les tours longs moins déroutants sur les surfaces de chat car l'utilisateur peut voir que l'assistant résume le contexte et continuera après la compaction.

<a id="boot-md"></a>

### Détails de boot-md

Exécute `BOOT.md` depuis l'espace de travail actif lors du démarrage de la passerelle.

## Hooks de plugin

Les plugins peuvent enregistrer des hooks typés via le Plugin SDK pour une intégration plus profonde :
intercepter les appels d'outils, modifier les invites, contrôler le flux des messages, et plus encore.
Utilisez les hooks de plugin lorsque vous avez besoin de `before_tool_call`, `before_agent_reply`,
`before_install`, ou d'autres hooks de cycle de vie in-process.

Pour la référence complète des hooks de plugin, consultez [Hooks de plugin](/fr/plugins/hooks).

## Configuration

```json
{
  "hooks": {
    "internal": {
      "enabled": true,
      "entries": {
        "session-memory": { "enabled": true },
        "command-logger": { "enabled": false }
      }
    }
  }
}
```

Variables d'environnement par hook :

```json
{
  "hooks": {
    "internal": {
      "entries": {
        "my-hook": {
          "enabled": true,
          "env": { "MY_CUSTOM_VAR": "value" }
        }
      }
    }
  }
}
```

Répertoires de hooks supplémentaires :

```json
{
  "hooks": {
    "internal": {
      "load": {
        "extraDirs": ["/path/to/more/hooks"]
      }
    }
  }
}
```

<Note>Le format de configuration de tableau `hooks.internal.handlers` hérité est toujours pris en charge pour la rétrocompatibilité, mais les nouveaux hooks doivent utiliser le système basé sur la découverte.</Note>

## Référence CLI

```bash
# List all hooks (add --eligible, --verbose, or --json)
openclaw hooks list

# Show detailed info about a hook
openclaw hooks info <hook-name>

# Show eligibility summary
openclaw hooks check

# Enable/disable
openclaw hooks enable <hook-name>
openclaw hooks disable <hook-name>
```

## Bonnes pratiques

- **Gardez les gestionnaires rapides.** Les hooks s'exécutent pendant le traitement des commandes. Lancez en « fire-and-forget » les tâches lourdes avec `void processInBackground(event)`.
- **Gérez les erreurs avec élégance.** Enveloppez les opérations risquées dans des try/catch ; ne levez pas d'exception pour que les autres gestionnaires puissent s'exécuter.
- **Filtrez les événements tôt.** Retournez immédiatement si le type/action de l'événement n'est pas pertinent.
- **Utilisez des clés d'événement spécifiques.** Préférez `"events": ["command:new"]` à `"events": ["command"]` pour réduire la surcharge.

## Dépannage

### Hook non découvert

```bash
# Verify directory structure
ls -la ~/.openclaw/hooks/my-hook/
# Should show: HOOK.md, handler.ts

# List all discovered hooks
openclaw hooks list
```

### Hook non éligible

```bash
openclaw hooks info my-hook
```

Vérifiez les binaires manquants (PATH), les variables d'environnement, les valeurs de configuration ou la compatibilité du système d'exploitation.

### Hook ne s'exécutant pas

1. Vérifiez que le hook est activé : `openclaw hooks list`
2. Redémarrez votre processus de passerelle pour que les hooks se rechargent.
3. Vérifiez les journaux de la passerelle : `./scripts/clawlog.sh | grep hook`

## Connexes

- [Référence CLI : hooks](/fr/cli/hooks)
- [Webhooks](/fr/automation/cron-jobs#webhooks)
- [Hooks de plugin](/fr/plugins/hooks) — hooks de cycle de vie de plugin in-process
- [Configuration](/fr/gateway/configuration-reference#hooks)
