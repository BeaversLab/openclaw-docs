---
summary: "Hooks : automatisation basée sur les événements pour les commandes et les événements de cycle de vie"
read_when:
  - Vous souhaitez une automatisation basée sur les événements pour /new, /reset, /stop et les événements de cycle de vie de l'agent
  - Vous souhaitez créer, installer ou déboguer des hooks
title: "Hooks"
---

# Hooks

Les hooks fournissent un système évolutif basé sur les événements pour automatiser les actions en réponse aux commandes et événements de l'agent. Les hooks sont découverts automatiquement à partir des répertoires et peuvent être gérés via les commandes CLI, de manière similaire au fonctionnement des compétences dans OpenClaw.

## Getting Oriented

Les hooks sont de petits scripts qui s'exécutent lorsque quelque chose se produit. Il existe deux types :

- **Hooks** (cette page) : s'exécutent à l'intérieur du Gateway lorsque des événements d'agent se déclenchent, comme `/new`, `/reset`, `/stop`, ou des événements de cycle de vie.
- **Webhooks** : webhooks HTTP externes qui permettent à d'autres systèmes de déclencher des travaux dans OpenClaw. Voir [Webhook Hooks](/fr/automation/webhook) ou utilisez `openclaw webhooks` pour les commandes d'assistance Gmail.

Les hooks peuvent également être regroupés dans des plugins ; voir [Plugins](/fr/plugin#plugin-hooks).

Cas d'usage courants :

- Enregistrer un instantané de la mémoire lorsque vous réinitialisez une session
- Conserver une trace d'audit des commandes pour le troubleshooting ou la conformité
- Déclencher une automatisation de suivi lorsqu'une session commence ou se termine
- Écrire des fichiers dans l'espace de travail de l'agent ou appeler des API externes lorsque des événements se déclenchent

Si vous savez écrire une petite fonction TypeScript, vous pouvez écrire un hook. Les hooks sont découverts automatiquement et vous les activez ou les désactivez via le CLI.

## Overview

Le système de hooks vous permet de :

- Sauvegarder le contexte de la session en mémoire lorsque `/new` est émis
- Enregistrer toutes les commandes pour l'audit
- Déclencher des automations personnalisées sur les événements de cycle de vie de l'agent
- Étendre le comportement de OpenClaw sans modifier le code principal

## Getting Started

### Bundled Hooks

OpenClaw est fourni avec quatre hooks regroupés qui sont découverts automatiquement :

- **💾 session-memory** : Enregistre le contexte de la session dans votre espace de travail agent (par défaut `~/.openclaw/workspace/memory/`) lorsque vous émettez `/new`
- **📝 command-logger** : Enregistre tous les événements de commande dans `~/.openclaw/logs/commands.log`
- **🚀 boot-md** : Exécute `BOOT.md` lorsque la passerelle démarre (nécessite que les hooks internes soient activés)
- **😈 soul-evil** : Remplace le contenu `SOUL.md` injecté par `SOUL_EVIL.md` pendant une fenêtre de purge ou par hasard

Lister les hooks disponibles :

```bash
openclaw hooks list
```

Activer un hook :

```bash
openclaw hooks enable session-memory
```

Vérifier l'état du hook :

```bash
openclaw hooks check
```

Obtenir des informations détaillées :

```bash
openclaw hooks info session-memory
```

### Onboarding

Durant l'onboarding (`openclaw onboard`), il vous sera demandé d'activer les hooks recommandés. L'assistant découvre automatiquement les hooks éligibles et les présente pour sélection.

## Discovery de hooks

Les hooks sont découverts automatiquement à partir de trois répertoires (par ordre de priorité) :

1. **Hooks d'espace de travail** : `<workspace>/hooks/` (par agent, priorité la plus élevée)
2. **Hooks gérés** : `~/.openclaw/hooks/` (installés par l'utilisateur, partagés entre les espaces de travail)
3. **Hooks groupés** : `<openclaw>/dist/hooks/bundled/` (livrés avec OpenClaw)

Les répertoires de hooks gérés peuvent contenir soit un **hook unique** soit un **pack de hooks** (répertoire de package).

Chaque hook est un répertoire contenant :

```
my-hook/
├── HOOK.md          # Metadata + documentation
└── handler.ts       # Handler implementation
```

## Packs de hooks (npm/archives)

Les packs de hooks sont des packages npm standards qui exportent un ou plusieurs hooks via `openclaw.hooks` dans
`package.json`. Installez-les avec :

```bash
openclaw hooks install <path-or-spec>
```

Exemple `package.json` :

```json
{
  "name": "@acme/my-hooks",
  "version": "0.1.0",
  "openclaw": {
    "hooks": ["./hooks/my-hook", "./hooks/other-hook"]
  }
}
```

Chaque entrée pointe vers un répertoire de hook contenant `HOOK.md` et `handler.ts` (ou `index.ts`).
Les packs de hooks peuvent inclure des dépendances ; elles seront installées sous `~/.openclaw/hooks/<id>`.

## Structure du hook

### Format HOOK.md

Le fichier `HOOK.md` contient des métadonnées dans le frontmatter YAML ainsi que de la documentation Markdown :

```markdown
---
name: my-hook
description: "Short description of what this hook does"
homepage: https://docs.openclaw.ai/hooks#my-hook
metadata:
  { "openclaw": { "emoji": "🔗", "events": ["command:new"], "requires": { "bins": ["node"] } } }
---

# My Hook

Detailed documentation goes here...

## What It Does

- Listens for `/new` commands
- Performs some action
- Logs the result

## Requirements

- Node.js must be installed

## Configuration

No configuration needed.
```

### Champs de métadonnées

L'objet `metadata.openclaw` prend en charge :

- **`emoji`** : Emoji à afficher pour la CLI (ex. `"💾"`)
- **`events`** : Tableau des événements à écouter (ex. `["command:new", "command:reset"]`)
- **`export`** : Export nommé à utiliser (par défaut `"default"`)
- **`homepage`** : URL de documentation
- **`requires`** : Prérequis facultatifs
  - **`bins`** : Binaires requis dans le PATH (ex. `["git", "node"]`)
  - **`anyBins`** : Au moins l'un de ces binaires doit être présent
  - **`env`** : Variables d'environnement requises
  - **`config`** : Chemins de configuration requis (p. ex. `["workspace.dir"]`)
  - **`os`** : Plateformes requises (p. ex. `["darwin", "linux"]`)
- **`always`** : Contourner les vérifications d'éligibilité (booléen)
- **`install`** : Méthodes d'installation (pour les hooks intégrés : `[{"id":"bundled","kind":"bundled"}]`)

### Implémentation du gestionnaire

Le fichier `handler.ts` exporte une fonction `HookHandler` :

```typescript
import type { HookHandler } from "../../src/hooks/hooks.js";

const myHandler: HookHandler = async (event) => {
  // Only trigger on 'new' command
  if (event.type !== "command" || event.action !== "new") {
    return;
  }

  console.log(`[my-hook] New command triggered`);
  console.log(`  Session: ${event.sessionKey}`);
  console.log(`  Timestamp: ${event.timestamp.toISOString()}`);

  // Your custom logic here

  // Optionally send message to user
  event.messages.push("✨ My hook executed!");
};

export default myHandler;
```

#### Contexte de l'événement

Chaque événement comprend :

```typescript
{
  type: 'command' | 'session' | 'agent' | 'gateway',
  action: string,              // e.g., 'new', 'reset', 'stop'
  sessionKey: string,          // Session identifier
  timestamp: Date,             // When the event occurred
  messages: string[],          // Push messages here to send to user
  context: {
    sessionEntry?: SessionEntry,
    sessionId?: string,
    sessionFile?: string,
    commandSource?: string,    // e.g., 'whatsapp', 'telegram'
    senderId?: string,
    workspaceDir?: string,
    bootstrapFiles?: WorkspaceBootstrapFile[],
    cfg?: OpenClawConfig
  }
}
```

## Types d'événements

### Événements de commande

Déclenché lorsque des commandes d'agent sont émises :

- **`command`** : Tous les événements de commande (écouteur général)
- **`command:new`** : Lorsque la commande `/new` est émise
- **`command:reset`** : Lorsque la commande `/reset` est émise
- **`command:stop`** : Lorsque la commande `/stop` est émise

### Événements d'agent

- **`agent:bootstrap`** : Avant l'injection des fichiers d'amorçage de l'espace de travail (les hooks peuvent modifier `context.bootstrapFiles`)

### Événements Gateway

Déclenché lors du démarrage de la passerelle :

- **`gateway:startup`** : Après le démarrage des canaux et le chargement des hooks

### Hooks de résultats d'outil (Plugin API)

Ces hooks ne sont pas des écouteurs de flux d'événements ; ils permettent aux plugins d'ajuster de manière synchrone les résultats des outils avant que OpenClaw ne les persiste.

- **`tool_result_persist`** : transformer les résultats des outils avant qu'ils ne soient écrits dans la transcription de session. Doit être synchrone ; renvoyer la charge utile du résultat de l'outil mise à jour ou `undefined` pour la laisser telle quelle. Voir [Agent Loop](/fr/concepts/agent-loop).

### Événements futurs

Types d'événements prévus :

- **`session:start`** : Lorsqu'une nouvelle session commence
- **`session:end`** : Lorsqu'une session se termine
- **`agent:error`** : Lorsqu'un agent rencontre une erreur
- **`message:sent`** : Lorsqu'un message est envoyé
- **`message:received`** : Lorsqu'un message est reçu

## Créer des Hooks personnalisés

### 1. Choisir l'emplacement

- **Hooks de l'espace de travail** (`<workspace>/hooks/`) : Par agent, priorité la plus élevée
- **Hooks gérés** (`~/.openclaw/hooks/`) : Partagés entre les espaces de travail

### 2. Créer la structure des répertoires

```bash
mkdir -p ~/.openclaw/hooks/my-hook
cd ~/.openclaw/hooks/my-hook
```

### 3. Créer HOOK.md

```markdown
---
name: my-hook
description: "Does something useful"
metadata: { "openclaw": { "emoji": "🎯", "events": ["command:new"] } }
---

# My Custom Hook

This hook does something useful when you issue `/new`.
```

### 4. Créer handler.ts

```typescript
import type { HookHandler } from "../../src/hooks/hooks.js";

const handler: HookHandler = async (event) => {
  if (event.type !== "command" || event.action !== "new") {
    return;
  }

  console.log("[my-hook] Running!");
  // Your logic here
};

export default handler;
```

### 5. Activer et tester

```bash
# Verify hook is discovered
openclaw hooks list

# Enable it
openclaw hooks enable my-hook

# Restart your gateway process (menu bar app restart on macOS, or restart your dev process)

# Trigger the event
# Send /new via your messaging channel
```

## Configuration

### Nouveau format de configuration (Recommandé)

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

### Configuration par Hook

Les Hooks peuvent avoir une configuration personnalisée :

```json
{
  "hooks": {
    "internal": {
      "enabled": true,
      "entries": {
        "my-hook": {
          "enabled": true,
          "env": {
            "MY_CUSTOM_VAR": "value"
          }
        }
      }
    }
  }
}
```

### Répertoires supplémentaires

Charger les hooks depuis des répertoires supplémentaires :

```json
{
  "hooks": {
    "internal": {
      "enabled": true,
      "load": {
        "extraDirs": ["/path/to/more/hooks"]
      }
    }
  }
}
```

### Format de configuration hérité (Toujours pris en charge)

L'ancien format de configuration fonctionne toujours pour la rétrocompatibilité :

```json
{
  "hooks": {
    "internal": {
      "enabled": true,
      "handlers": [
        {
          "event": "command:new",
          "module": "./hooks/handlers/my-handler.ts",
          "export": "default"
        }
      ]
    }
  }
}
```

**Migration** : Utilisez le nouveau système basé sur la découverte pour les nouveaux hooks. Les gestionnaires hérités sont chargés après les hooks basés sur les répertoires.

## Commandes CLI

### Lister les Hooks

```bash
# List all hooks
openclaw hooks list

# Show only eligible hooks
openclaw hooks list --eligible

# Verbose output (show missing requirements)
openclaw hooks list --verbose

# JSON output
openclaw hooks list --json
```

### Informations sur le Hook

```bash
# Show detailed info about a hook
openclaw hooks info session-memory

# JSON output
openclaw hooks info session-memory --json
```

### Vérifier l'éligibilité

```bash
# Show eligibility summary
openclaw hooks check

# JSON output
openclaw hooks check --json
```

### Activer / Désactiver

```bash
# Enable a hook
openclaw hooks enable session-memory

# Disable a hook
openclaw hooks disable command-logger
```

## Hooks inclus

### session-memory

Sauvegarde le contexte de la session en mémoire lorsque vous émettez `/new`.

**Événements** : `command:new`

**Conditions requises** : `workspace.dir` doit être configuré

**Sortie** : `<workspace>/memory/YYYY-MM-DD-slug.md` (par défaut `~/.openclaw/workspace`)

**Ce qu'il fait** :

1. Utilise l'entrée de session pré-réinitialisation pour localiser la transcription correcte
2. Extrait les 15 dernières lignes de la conversation
3. Utilise le LLM pour générer un slug de nom de fichier descriptif
4. Sauvegarde les métadonnées de la session dans un fichier de mémoire daté

**Exemple de sortie** :

```markdown
# Session: 2026-01-16 14:30:00 UTC

- **Session Key**: agent:main:main
- **Session ID**: abc123def456
- **Source**: telegram
```

**Exemples de noms de fichiers** :

- `2026-01-16-vendor-pitch.md`
- `2026-01-16-api-design.md`
- `2026-01-16-1430.md` (horodatage de secours si la génération de slug échoue)

**Activer** :

```bash
openclaw hooks enable session-memory
```

### command-logger

Enregistre tous les événements de commande dans un fichier d'audit centralisé.

**Événements** : `command`

**Conditions requises** : Aucune

**Sortie** : `~/.openclaw/logs/commands.log`

**Ce qu'il fait** :

1. Capture les détails de l'événement (action de commande, horodatage, clé de session, ID de l'expéditeur, source)
2. Ajoute au fichier journal au format JSONL
3. S'exécute silencieusement en arrière-plan

**Exemples d'entrées de journal** :

```jsonl
{"timestamp":"2026-01-16T14:30:00.000Z","action":"new","sessionKey":"agent:main:main","senderId":"+1234567890","source":"telegram"}
{"timestamp":"2026-01-16T15:45:22.000Z","action":"stop","sessionKey":"agent:main:main","senderId":"user@example.com","source":"whatsapp"}
```

**Voir les journaux** :

```bash
# View recent commands
tail -n 20 ~/.openclaw/logs/commands.log

# Pretty-print with jq
cat ~/.openclaw/logs/commands.log | jq .

# Filter by action
grep '"action":"new"' ~/.openclaw/logs/commands.log | jq .
```

**Activer** :

```bash
openclaw hooks enable command-logger
```

### soul-evil

Échange le contenu `SOUL.md` injecté avec `SOUL_EVIL.md` pendant une fenêtre de purge ou par hasard.

**Événements** : `agent:bootstrap`

**Documentation** : [SOUL Evil Hook](/fr/hooks/soul-evil)

**Sortie** : Aucun fichier écrit ; les échanges se produisent uniquement en mémoire.

**Activer** :

```bash
openclaw hooks enable soul-evil
```

**Configuration** :

```json
{
  "hooks": {
    "internal": {
      "enabled": true,
      "entries": {
        "soul-evil": {
          "enabled": true,
          "file": "SOUL_EVIL.md",
          "chance": 0.1,
          "purge": { "at": "21:00", "duration": "15m" }
        }
      }
    }
  }
}
```

### boot-md

Exécute `BOOT.md` lorsque la passerelle démarre (après le démarrage des canaux).
Les hooks internes doivent être activés pour que cela s'exécute.

**Événements** : `gateway:startup`

**Prérequis** : `workspace.dir` doit être configuré

**Ce qu'il fait** :

1. Lit `BOOT.md` depuis votre espace de travail
2. Exécute les instructions via l'exécuteur d'agent
3. Envoie tous les messages sortants demandés via l'outil de messagerie

**Activer** :

```bash
openclaw hooks enable boot-md
```

## Bonnes pratiques

### Garder les gestionnaires rapides

Les hooks s'exécutent pendant le traitement des commandes. Gardez-les légers :

```typescript
// ✓ Good - async work, returns immediately
const handler: HookHandler = async (event) => {
  void processInBackground(event); // Fire and forget
};

// ✗ Bad - blocks command processing
const handler: HookHandler = async (event) => {
  await slowDatabaseQuery(event);
  await evenSlowerAPICall(event);
};
```

### Gérer les erreurs avec élégance

Enveloppez toujours les opérations risquées :

```typescript
const handler: HookHandler = async (event) => {
  try {
    await riskyOperation(event);
  } catch (err) {
    console.error("[my-handler] Failed:", err instanceof Error ? err.message : String(err));
    // Don't throw - let other handlers run
  }
};
```

### Filtrer les événements tôt

Retournez tôt si l'événement n'est pas pertinent :

```typescript
const handler: HookHandler = async (event) => {
  // Only handle 'new' commands
  if (event.type !== "command" || event.action !== "new") {
    return;
  }

  // Your logic here
};
```

### Utiliser des clés d'événement spécifiques

Spécifiez les événements exacts dans les métadonnées lorsque cela est possible :

```yaml
metadata: { "openclaw": { "events": ["command:new"] } } # Specific
```

Plutôt que :

```yaml
metadata: { "openclaw": { "events": ["command"] } } # General - more overhead
```

## Débogage

### Activer la journalisation des hooks

La passerelle consigne le chargement des hooks au démarrage :

```
Registered hook: session-memory -> command:new
Registered hook: command-logger -> command
Registered hook: boot-md -> gateway:startup
```

### Vérifier la découverte

Lister tous les hooks découverts :

```bash
openclaw hooks list --verbose
```

### Vérifier l'enregistrement

Dans votre gestionnaire, consignez quand il est appelé :

```typescript
const handler: HookHandler = async (event) => {
  console.log("[my-handler] Triggered:", event.type, event.action);
  // Your logic
};
```

### Vérifier l'éligibilité

Vérifiez pourquoi un hook n'est pas éligible :

```bash
openclaw hooks info my-hook
```

Recherchez les prérequis manquants dans la sortie.

## Tests

### Journaux de la Gateway

Surveillez les journaux de la passerelle pour voir l'exécution du hook :

```bash
# macOS
./scripts/clawlog.sh -f

# Other platforms
tail -f ~/.openclaw/gateway.log
```

### Tester les hooks directement

Testez vos gestionnaires en isolation :

```typescript
import { test } from "vitest";
import { createHookEvent } from "./src/hooks/hooks.js";
import myHandler from "./hooks/my-hook/handler.js";

test("my handler works", async () => {
  const event = createHookEvent("command", "new", "test-session", {
    foo: "bar",
  });

  await myHandler(event);

  // Assert side effects
});
```

## Architecture

### Composants principaux

- **`src/hooks/types.ts`** : Définitions de type
- **`src/hooks/workspace.ts`** : Analyse et chargement des répertoires
- **`src/hooks/frontmatter.ts`** : Analyse des métadonnées HOOK.md
- **`src/hooks/config.ts`** : Vérification de l'éligibilité
- **`src/hooks/hooks-status.ts`** : Rapport de statut
- **`src/hooks/loader.ts`** : Chargeur de modules dynamiques
- **`src/cli/hooks-cli.ts`** : Commandes CLI
- **`src/gateway/server-startup.ts`** : Charge les hooks au démarrage de la passerelle
- **`src/auto-reply/reply/commands-core.ts`** : Déclenche les événements de commande

### Flux de découverte

```
Gateway startup
    ↓
Scan directories (workspace → managed → bundled)
    ↓
Parse HOOK.md files
    ↓
Check eligibility (bins, env, config, os)
    ↓
Load handlers from eligible hooks
    ↓
Register handlers for events
```

### Flux d'événements

```
User sends /new
    ↓
Command validation
    ↓
Create hook event
    ↓
Trigger hook (all registered handlers)
    ↓
Command processing continues
    ↓
Session reset
```

## Dépannage

### Hook non découvert

1. Vérifiez la structure du répertoire :

   ```bash
   ls -la ~/.openclaw/hooks/my-hook/
   # Should show: HOOK.md, handler.ts
   ```

2. Vérifiez le format HOOK.md :

   ```bash
   cat ~/.openclaw/hooks/my-hook/HOOK.md
   # Should have YAML frontmatter with name and metadata
   ```

3. Lister tous les hooks découverts :
   ```bash
   openclaw hooks list
   ```

### Hook non éligible

Vérifiez les prérequis :

```bash
openclaw hooks info my-hook
```

Recherchez les éléments manquants :

- Binaires (vérifiez le PATH)
- Variables d'environnement
- Valeurs de configuration
- Compatibilité du système d'exploitation

### Hook ne s'exécutant pas

1. Vérifiez que le hook est activé :

   ```bash
   openclaw hooks list
   # Should show ✓ next to enabled hooks
   ```

2. Redémarrez votre processus passerelle afin que les hooks soient rechargés.

3. Vérifiez les journaux de la passerelle pour détecter les erreurs :
   ```bash
   ./scripts/clawlog.sh | grep hook
   ```

### Erreurs de gestionnaire

Vérifiez les erreurs TypeScript/d'importation :

```bash
# Test import directly
node -e "import('./path/to/handler.ts').then(console.log)"
```

## Guide de migration

### De la configuration héritée à la Discovery

**Avant** :

```json
{
  "hooks": {
    "internal": {
      "enabled": true,
      "handlers": [
        {
          "event": "command:new",
          "module": "./hooks/handlers/my-handler.ts"
        }
      ]
    }
  }
}
```

**Après** :

1. Créer le répertoire du hook :

   ```bash
   mkdir -p ~/.openclaw/hooks/my-hook
   mv ./hooks/handlers/my-handler.ts ~/.openclaw/hooks/my-hook/handler.ts
   ```

2. Créer HOOK.md :

   ```markdown
   ---
   name: my-hook
   description: "My custom hook"
   metadata: { "openclaw": { "emoji": "🎯", "events": ["command:new"] } }
   ---

   # My Hook

   Does something useful.
   ```

3. Mettre à jour la configuration :

   ```json
   {
     "hooks": {
       "internal": {
         "enabled": true,
         "entries": {
           "my-hook": { "enabled": true }
         }
       }
     }
   }
   ```

4. Vérifiez et redémarrez votre processus passerelle :
   ```bash
   openclaw hooks list
   # Should show: 🎯 my-hook ✓
   ```

**Avantages de la migration** :

- Découverte automatique
- Gestion CLI
- Vérification de l'éligibilité
- Meilleure documentation
- Structure cohérente

## Voir aussi

- [Référence CLI : hooks](/fr/cli/hooks)
- [Lisez-moi des Hooks fournis](https://github.com/openclaw/openclaw/tree/main/src/hooks/bundled)
- [Webhook Hooks](/fr/automation/webhook)
- [Configuration](/fr/gateway/configuration#hooks)

import en from "/components/footer/en.mdx";

<en />
