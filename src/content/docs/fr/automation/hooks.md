---
summary: "Hooks : automatisation basée sur les événements pour les commandes et les événements de cycle de vie"
read_when:
  - You want event-driven automation for /new, /reset, /stop, and agent lifecycle events
  - You want to build, install, or debug hooks
title: "Hooks"
---

# Hooks

Les hooks sont de petits scripts qui s'exécutent lorsque quelque chose se produit dans le Gateway. Ils sont découverts automatiquement à partir des répertoires et peuvent être inspectés avec `openclaw hooks`.

Il existe deux types de hooks dans OpenClaw :

- **Hooks internes** (cette page) : s'exécutent dans le Gateway lorsque des événements d'agent se déclenchent, comme `/new`, `/reset`, `/stop`, ou des événements de cycle de vie.
- **Webhooks** : points de terminaison HTTP externes qui permettent à d'autres systèmes de déclencher des travaux dans OpenClaw. Voir [Webhooks](/en/automation/cron-jobs#webhooks).

Les hooks peuvent également être regroupés dans des plugins. `openclaw hooks list` affiche à la fois les hooks autonomes et les hooks gérés par des plugins.

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

## Types d'événements

| Événement                | Lorsqu'il se déclenche                                           |
| ------------------------ | ---------------------------------------------------------------- |
| `command:new`            | Commande `/new` émise                                            |
| `command:reset`          | Commande `/reset` émise                                          |
| `command:stop`           | Commande `/stop` émise                                           |
| `command`                | Tout événement de commande (écouteur général)                    |
| `session:compact:before` | Avant que la compactage ne résume l'historique                   |
| `session:compact:after`  | Après la fin du compactage                                       |
| `session:patch`          | Lorsque les propriétés de session sont modifiées                 |
| `agent:bootstrap`        | Avant l'injection des fichiers d'amorçage de l'espace de travail |
| `gateway:startup`        | Après le démarrage des canaux et le chargement des hooks         |
| `message:received`       | Message entrant de n'importe quel canal                          |
| `message:transcribed`    | Après la fin de la transcription audio                           |
| `message:preprocessed`   | Après la fin de la compréhension de tous les médias et liens     |
| `message:sent`           | Message sortant livré                                            |

## Écriture de hooks

### Structure du hook

Chaque hook est un répertoire contenant deux fichiers :

```
my-hook/
├── HOOK.md          # Metadata + documentation
└── handler.ts       # Handler implementation
```

### Format HOOK.md

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

| Champ      | Description                                         |
| ---------- | --------------------------------------------------- |
| `emoji`    | Emoji d'affichage pour la CLI                       |
| `events`   | Tableau des événements à écouter                    |
| `export`   | Export nommé à utiliser (par défaut `"default"`)    |
| `os`       | Plateformes requises (ex. `["darwin", "linux"]`)    |
| `requires` | Chemins `bins`, `anyBins`, `env` ou `config` requis |
| `always`   | Ignorer les vérifications d'éligibilité (booléen)   |
| `install`  | Méthodes d'installation                             |

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

Chaque événement inclut : `type`, `action`, `sessionKey`, `timestamp`, `messages` (push pour envoyer à l'utilisateur) et `context` (données spécifiques à l'événement).

### Points saillants du contexte de l'événement

**Événements de commande** (`command:new`, `command:reset`) : `context.sessionEntry`, `context.previousSessionEntry`, `context.commandSource`, `context.workspaceDir`, `context.cfg`.

**Événements de message** (`message:received`) : `context.from`, `context.content`, `context.channelId`, `context.metadata` (données spécifiques au fournisseur incluant `senderId`, `senderName`, `guildId`).

**Événements de message** (`message:sent`) : `context.to`, `context.content`, `context.success`, `context.channelId`.

**Événements de message** (`message:transcribed`) : `context.transcript`, `context.from`, `context.channelId`, `context.mediaPath`.

**Événements de message** (`message:preprocessed`) : `context.bodyForAgent` (corps final enrichi), `context.from`, `context.channelId`.

**Événements d'amorçage** (`agent:bootstrap`) : `context.bootstrapFiles` (tableau modifiable), `context.agentId`.

**Événements de correctif de session** (`session:patch`) : `context.sessionEntry`, `context.patch` (seuls les champs modifiés), `context.cfg`. Seuls les clients privilégiés peuvent déclencher des événements de correctif.

**Événements de compactage** : `session:compact:before` inclut `messageCount`, `tokenCount`. `session:compact:after` ajoute `compactedCount`, `summaryLength`, `tokensBefore`, `tokensAfter`.

## Découverte de hooks

Les hooks sont découverts à partir de ces répertoires, par ordre de priorité de remplacement croissante :

1. **Hooks groupés** : livrés avec OpenClaw
2. **Hooks de plugin** : hooks groupés dans les plugins installés
3. **Hooks gérés** : `~/.openclaw/hooks/` (installés par l'utilisateur, partagés entre les espaces de travail). Les répertoires supplémentaires de `hooks.internal.load.extraDirs` partagent cette priorité.
4. **Hooks d'espace de travail** : `<workspace>/hooks/` (par agent, désactivés par défaut jusqu'à ce qu'ils soient explicitement activés)

Les hooks d'espace de travail peuvent ajouter de nouveaux noms de hooks mais ne peuvent pas remplacer les hooks groupés, gérés ou fournis par des plugins portant le même nom.

### Packs de hooks

Les packs de hooks sont des packages npm qui exportent des hooks via `openclaw.hooks` dans `package.json`. Installez avec :

```bash
openclaw plugins install <path-or-spec>
```

Les spécifications Npm sont uniquement pour le registre (nom du package + version exacte facultative ou dist-tag). Les spécifications Git/URL/fichier et les plages semver sont rejetées.

## Hooks groupés

| Hook                  | Événements                     | Ce qu'il fait                                                            |
| --------------------- | ------------------------------ | ------------------------------------------------------------------------ |
| session-memory        | `command:new`, `command:reset` | Enregistre le contexte de la session dans `<workspace>/memory/`          |
| bootstrap-extra-files | `agent:bootstrap`              | Injecte des fichiers d'amorçage supplémentaires à partir de modèles glob |
| command-logger        | `command`                      | Enregistre toutes les commandes dans `~/.openclaw/logs/commands.log`     |
| boot-md               | `gateway:startup`              | Exécute `BOOT.md` au démarrage de la passerelle                          |

Activer n'importe quel hook groupé :

```bash
openclaw hooks enable <hook-name>
```

### détails de session-memory

Extrait les 15 derniers messages utilisateur/assistant, génère un slug de nom de fichier descriptif via LLM, et enregistre dans `<workspace>/memory/YYYY-MM-DD-slug.md`. Nécessite que `workspace.dir` soit configuré.

### Configuration de bootstrap-extra-files

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

Les chemins sont résolus relativement à l'espace de travail. Seuls les noms de base bootstrap reconnus sont chargés (`AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, `BOOTSTRAP.md`, `MEMORY.md`).

## Hooks de plugin

Les plugins peuvent enregistrer des hooks via le Plugin SDK pour une intégration plus poussée : interception des appels d'outils, modification des prompts, contrôle du flux des messages, et plus encore. Le Plugin SDK expose 28 hooks couvrant la résolution de modèles, le cycle de vie des agents, le flux des messages, l'exécution d'outils, la coordination de sous-agents et le cycle de vie de la passerelle.

Pour la référence complète des hooks de plugin, y compris `before_tool_call`, `before_agent_reply`, `before_install` et tous les autres hooks de plugin, voir [Plugin Architecture](/en/plugins/architecture#provider-runtime-hooks).

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

- **Gardez les gestionnaires rapides.** Les hooks s'exécutent pendant le traitement des commandes. Déchargez le travail lourd en mode fire-and-forget avec `void processInBackground(event)`.
- **Gérez les erreurs avec élégance.** Enveloppez les opérations risquées dans des blocs try/catch ; ne levez pas d'exceptions pour que les autres gestionnaires puissent s'exécuter.
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

### Hook non exécuté

1. Vérifiez que le hook est activé : `openclaw hooks list`
2. Redémarrez votre processus de passerelle pour que les hooks se rechargent.
3. Consultez les journaux de la passerelle : `./scripts/clawlog.sh | grep hook`

## Connexes

- [Référence CLI : hooks](/en/cli/hooks)
- [Webhooks](/en/automation/cron-jobs#webhooks)
- [Architecture de Plugin](/en/plugins/architecture#provider-runtime-hooks) — référence complète des hooks de plugin
- [Configuration](/en/gateway/configuration-reference#hooks)
