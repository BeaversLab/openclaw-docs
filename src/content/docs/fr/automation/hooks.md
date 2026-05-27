---
summary: "Hooks : automation basée sur les événements pour les commandes et les événements de cycle de vie"
read_when:
  - You want event-driven automation for /new, /reset, /stop, and agent lifecycle events
  - You want to build, install, or debug hooks
title: "Hooks"
---

Les Hooks sont de petits scripts qui s'exécutent lorsque quelque chose se produit à l'intérieur du Gateway. Ils peuvent être découverts à partir de répertoires et inspectés avec `openclaw hooks`. Le Gateway ne charge les hooks internes qu'après avoir activé les hooks ou configuré au moins une entrée de hook, un pack de hooks, un gestionnaire hérité ou un répertoire de hooks supplémentaire.

Il existe deux types de hooks dans OpenClaw :

- **Hooks internes** (cette page) : s'exécutent à l'intérieur du Gateway lorsque des événements d'agent se déclenchent, comme `/new`, `/reset`, `/stop`, ou des événements de cycle de vie.
- **Webhooks** : points de terminaison HTTP externes qui permettent à d'autres systèmes de déclencher des tâches dans OpenClaw. Voir [Webhooks](/fr/automation/cron-jobs#webhooks).

Les hooks peuvent également être regroupés dans des plugins. `openclaw hooks list` montre à la fois les hooks autonomes et les hooks gérés par des plugins.

## Choisir la bonne surface

OpenClaw propose plusieurs surfaces d'extension qui semblent similaires mais résolvent des problèmes différents :

| Si vous souhaitez...                                                                                                                                        | Utiliser...                             | Pourquoi                                                                                                                                        |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Enregistrer un instantané sur `/new`, consigner `/reset`, appeler une API externe après `message:sent`, ou ajouter une automatisation d'opérateur grossière | Hooks internes (`HOOK.md`, cette page)  | Les hooks basés sur des fichiers sont destinés aux effets secondaires gérés par l'opérateur et à l'automatisation des commandes/du cycle de vie |
| Réécrire des invites, bloquer des outils, annuler des messages sortants, ou ajouter un intergiciel/une stratégie ordonné(e)                                 | Hooks de plugin typés via `api.on(...)` | Les hooks typés ont des contrats explicites, des priorités, des règles de fusion et une sémantique de blocage/annulation                        |
| Ajouter un export ou une observabilité uniquement de télémétrie                                                                                             | Événements de diagnostic                | L'observabilité est un bus d'événements distinct, pas une surface de hook de stratégie                                                          |

Utilisez des hooks internes lorsque vous souhaitez une automatisation qui se comporte comme une petite intégration installée. Utilisez des hooks de plugin typés lorsque vous avez besoin d'un contrôle du cycle de vie d'exécution.

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

| Événement                | Lorsqu'il se déclenche                                              |
| ------------------------ | ------------------------------------------------------------------- |
| `command:new`            | Commande `/new` émise                                               |
| `command:reset`          | Commande `/reset` émise                                             |
| `command:stop`           | Commande `/stop` émise                                              |
| `command`                | Tout événement de commande (écouteur général)                       |
| `session:compact:before` | Avant que la compilation ne résume l'historique                     |
| `session:compact:after`  | Après la fin de la compilation                                      |
| `session:patch`          | Lorsque les propriétés de la session sont modifiées                 |
| `agent:bootstrap`        | Avant l'injection des fichiers d'amorçage de l'espace de travail    |
| `gateway:startup`        | Après le démarrage des canaux et le chargement des hooks            |
| `gateway:shutdown`       | Lorsque l'arrêt de la passerelle commence                           |
| `gateway:pre-restart`    | Avant un redémarrage prévu de la passerelle                         |
| `message:received`       | Message entrant de n'importe quel canal                             |
| `message:transcribed`    | Une fois la transcription audio terminée                            |
| `message:preprocessed`   | Une fois le prétraitement des médias et des liens terminé ou ignoré |
| `message:sent`           | Message sortant livré                                               |

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

| Champ      | Description                                          |
| ---------- | ---------------------------------------------------- |
| `emoji`    | Afficher l'emoji pour la CLI                         |
| `events`   | Tableau des événements à écouter                     |
| `export`   | Export nommé à utiliser (par défaut `"default"`)     |
| `os`       | Plateformes requises (ex. : `["darwin", "linux"]`)   |
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

  // Optionally send a reply on replyable surfaces
  event.messages.push("Hook executed!");
};

export default handler;
```

Chaque événement inclut : `type`, `action`, `sessionKey`, `timestamp`, `messages` (envoyer les réponses ici uniquement sur les surfaces répondantes) et `context` (données spécifiques à l'événement). Les contextes de hook des plugins d'agent et peuvent également inclure `trace`, un contexte de trace de diagnostic compatible W3C en lecture seule que les plugins peuvent transmettre aux journaux structurés pour la corrélation OTEL.

`event.messages` n'est livré automatiquement que sur les surfaces répondantes telles que `command:*` et `message:received`. Les événements de cycle de vie uniquement tels que `agent:bootstrap`, `session:*`, `gateway:*` ou `message:sent` n'ont pas de canal de réponse et ignorent les messages envoyés.

### Points forts du contexte d'événement

**Événements de commande** (`command:new`, `command:reset`) : `context.sessionEntry`, `context.previousSessionEntry`, `context.commandSource`, `context.workspaceDir`, `context.cfg`.

**Événements de message** (`message:received`) : `context.from`, `context.content`, `context.channelId`, `context.metadata` (données spécifiques au fournisseur, y compris `senderId`, `senderName`, `guildId`). `context.content` privilégie un corps de commande non vide pour les messages de type commande, puis revient au corps entrant brut et au corps générique ; il n'inclut pas l'enrichissement réservé à l'agent tel que l'historique des fils ou les résumés de liens.

**Événements de message** (`message:sent`) : `context.to`, `context.content`, `context.success`, `context.channelId`.

**Événements de message** (`message:transcribed`) : `context.transcript`, `context.from`, `context.channelId`, `context.mediaPath`.

**Événements de message** (`message:preprocessed`) : `context.bodyForAgent` (corps enrichi final), `context.from`, `context.channelId`.

**Événements d'amorçage** (`agent:bootstrap`) : `context.bootstrapFiles` (tableau modifiable), `context.agentId`.

**Événements de correctif de session** (`session:patch`) : `context.sessionEntry`, `context.patch` (uniquement les champs modifiés), `context.cfg`. Seuls les clients privilégiés peuvent déclencher des événements de correctif.

**Événements de compactage** : `session:compact:before` inclut `messageCount`, `tokenCount`. `session:compact:after` ajoute `compactedCount`, `summaryLength`, `tokensBefore`, `tokensAfter`.

`command:stop` observe l'utilisateur émettant `/stop` ; il s'agit du cycle de vie d'annulation/de commande, et non d'une porte de finalisation de l'agent. Les plugins qui doivent inspecter une réponse finale naturelle et demander à l'agent de faire un passage supplémentaire devraient plutôt utiliser le hook de plugin typé `before_agent_finalize`. Voir [Hooks de plugin](/fr/plugins/hooks).

**Événements du cycle de vie du Gateway** : `gateway:shutdown` inclut `reason` et `restartExpectedMs` et se déclenche lorsque l'arrêt du gateway commence. `gateway:pre-restart` inclut le même contexte mais ne se déclenche que lorsque l'arrêt fait partie d'un redémarrage attendu et qu'une valeur finie `restartExpectedMs` est fournie. Pendant l'arrêt, chaque attente de hook de cycle de vie est au mieux possible et bornée afin que l'arrêt se poursuive si un gestionnaire bloque. Le budget d'attente par défaut est de 5 secondes pour `gateway:shutdown` et de 10 secondes pour `gateway:pre-restart`.

Utilisez `gateway:pre-restart` pour de brèves notifications de redémarrage tant que les canaux sont encore disponibles :

```typescript
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export default async function handler(event) {
  if (event.type !== "gateway" || event.action !== "pre-restart") {
    return;
  }

  const restartInSeconds = Math.ceil(event.context.restartExpectedMs / 1000);
  await execFileAsync("openclaw", ["system", "event", "--mode", "now", "--text", `Gateway restarting in ~${restartInSeconds}s (${event.context.reason}). Checkpoint now.`]);
}
```

Entre l'événement `gateway:shutdown` (ou `gateway:pre-restart`) et le reste de la séquence d'arrêt, le gateway déclenche également un hook de plugin typé `session_end` pour chaque session qui était encore active lorsque le processus s'est arrêté. Le `reason` de l'événement est `shutdown` pour un arrêt SIGTERM/SIGINT simple et `restart` lorsque la fermeture a été planifiée dans le cadre d'un redémarrage attendu. Ce drainage est borné afin qu'un gestionnaire `session_end` lent ne puisse pas bloquer la sortie du processus, et les sessions qui ont déjà été finalisées par remplacement / réinitialisation / suppression / compactage sont ignorées pour éviter les doubles déclenchements.

## Découverte des hooks

Les hooks sont découverts à partir de ces répertoires, par ordre de priorité de remplacement croissante :

1. **Hooks fournis** : livrés avec OpenClaw
2. **Hooks de plugin** : hooks fournis dans les plugins installés
3. **Hooks gérés** : `~/.openclaw/hooks/` (installés par l'utilisateur, partagés entre les espaces de travail). Les répertoires supplémentaires de `hooks.internal.load.extraDirs` partagent cette priorité.
4. **Hooks de l'espace de travail** : `<workspace>/hooks/` (par agent, désactivés par défaut jusqu'à ce qu'ils soient explicitement activés)

Les hooks de l'espace de travail peuvent ajouter de nouveaux noms de hooks mais ne peuvent pas remplacer les hooks fournis, gérés ou fournis par un plugin portant le même nom.

Le Gateway ignore la découverte des hooks internes au démarrage jusqu'à ce que les hooks internes soient configurés. Activez un hook groupé ou géré avec `openclaw hooks enable <name>`, installez un pack de hooks, ou définissez `hooks.internal.enabled=true` pour opter. Lorsque vous activez un hook nommé, le Gateway ne charge que le gestionnaire de ce hook ; `hooks.internal.enabled=true`, les répertoires de hooks supplémentaires et les gestionnaires hérités optent pour une découverte large.

### Packs de hooks

Les packs de hooks sont des packages npm qui exportent des hooks via `openclaw.hooks` dans `package.json`. Installez avec :

```bash
openclaw plugins install <path-or-spec>
```

Les spécifications Npm sont uniquement pour le registre (nom du package + version exacte optionnelle ou dist-tag). Les spécifications Git/URL/fichier et les plages semver sont rejetées.

## Hooks groupés

| Hook                  | Événements                                        | Ce qu'il fait                                                                            |
| --------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| session-memory        | `command:new`, `command:reset`                    | Enregistre le contexte de la session dans `<workspace>/memory/`                          |
| bootstrap-extra-files | `agent:bootstrap`                                 | Injecte des fichiers d'amorçage supplémentaires à partir de modèles glob                 |
| command-logger        | `command`                                         | Enregistre toutes les commandes dans `~/.openclaw/logs/commands.log`                     |
| compaction-notifier   | `session:compact:before`, `session:compact:after` | Envoie des notifications de chat visibles lorsque la compaction de session commence/fini |
| boot-md               | `gateway:startup`                                 | Exécute `BOOT.md` lorsque la passerelle démarre                                          |

Activez n'importe quel hook groupé :

```bash
openclaw hooks enable <hook-name>
```

<a id="session-memory"></a>

### Détails de session-memory

Extrait les 15 derniers messages utilisateur/assistant et enregistre dans `<workspace>/memory/YYYY-MM-DD-HHMM.md` en utilisant la date locale de l'hôte. La capture de mémoire s'exécute en arrière-plan, de sorte que les accusés de réception `/new` et `/reset` ne sont pas retardés par les lectures de transcription ou la génération optionnelle de slugs. Définissez `hooks.internal.entries.session-memory.llmSlug: true` pour générer des slugs de fichier descriptifs avec le model configuré. Nécessite que `workspace.dir` soit configuré.

<a id="bootstrap-extra-files"></a>

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

Les chemins sont résolus par rapport à l'espace de travail. Seuls les noms de base d'amorçage reconnus sont chargés (`AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, `BOOTSTRAP.md`, `MEMORY.md`).

<a id="command-logger"></a>

### détails de command-logger

Enregistre chaque commande barre oblique dans `~/.openclaw/logs/commands.log`.

<a id="compaction-notifier"></a>

### détails de compaction-notifier

Envoie de courts messages de statut dans la conversation en cours lorsque OpenClaw commence et termine la compactage de la transcription de la session. Cela rend les longs tours moins confus sur les interfaces de chat car l'utilisateur peut voir que l'assistant résume le contexte et continuera après la compactage.

<a id="boot-md"></a>

### détails de boot-md

Exécute `BOOT.md` depuis l'espace de travail actif lorsque la passerelle démarre.

## Hooks de plugin

Les plugins peuvent enregistrer des hooks typés via le Plugin SDK pour une intégration plus poussée :
intercepter les appels d'outils, modifier les invites, contrôler le flux des messages, et plus encore.
Utilisez les hooks de plugin lorsque vous avez besoin de `before_tool_call`, `before_agent_reply`,
`before_install`, ou d'autres hooks de cycle de vie en cours de processus.

Les hooks internes gérés par des plugins sont différents : ils participent au système grossier d'événements de commande/cycle de vie de cette page et apparaissent dans `openclaw hooks list` comme
`plugin:<id>`. Utilisez-les pour les effets secondaires et la compatibilité avec les packs de hooks, et non
pour les intergiciels ordonnés ou les portes de stratégie.

Pour la référence complète des hooks de plugin, voir [Plugin hooks](/fr/plugins/hooks).

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

<Note>Le format de configuration de tableau `hooks.internal.handlers` obsolète est toujours pris en charge pour la rétrocompatibilité, mais les nouveaux hooks doivent utiliser le système basé sur la découverte.</Note>

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

- **Gardez les gestionnaires rapides.** Les hooks s'exécutent pendant le traitement des commandes. Effectuez les travaux lourds en mode tirer-et-oublier avec `void processInBackground(event)`.
- **Gérez les erreurs avec élégance.** Enveloppez les opérations risquées dans des blocs try/catch ; ne générez pas d'exceptions pour que les autres gestionnaires puissent s'exécuter.
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

### Hook ne s'exécute pas

1. Vérifiez que le hook est activé : `openclaw hooks list`
2. Redémarrez votre processus passerelle pour que les hooks soient rechargés.
3. Consultez les journaux de la passerelle : `./scripts/clawlog.sh | grep hook`

## Connexes

- [Référence CLI : hooks](/fr/cli/hooks)
- [Webhooks](/fr/automation/cron-jobs#webhooks)
- [Hooks de plugin](/fr/plugins/hooks) — hooks de cycle de vie de plugin en cours de processus
- [Configuration](/fr/gateway/configuration-reference#hooks)
