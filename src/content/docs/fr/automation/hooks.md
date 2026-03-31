---
summary: "Hooks : automatisation basée sur les événements pour les commandes et les événements de cycle de vie"
read_when:
  - You want event-driven automation for /new, /reset, /stop, and agent lifecycle events
  - You want to build, install, or debug hooks
title: "Hooks"
---

# Hooks

Les Hooks fournissent un système évolutif basé sur les événements pour automatiser les actions en réponse aux commandes et événements des agents. Les Hooks sont découverts automatiquement à partir des répertoires et peuvent être inspectés avec `openclaw hooks`, tandis que l'installation et la mises à jour des packs de hooks se font désormais via `openclaw plugins`.

## Prise en main

Les Hooks sont de petits scripts qui s'exécutent lorsque quelque chose se produit. Il en existe deux types :

- **Hooks** (cette page) : s'exécutent à l'intérieur du Gateway lorsque des événements d'agent se déclenchent, comme `/new`, `/reset`, `/stop`, ou des événements de cycle de vie.
- **Webhooks** : webhooks HTTP externes qui permettent à d'autres systèmes de déclencher des tâches dans OpenClaw. Voir [Webhook Hooks](/en/automation/webhook) ou utilisez `openclaw webhooks` pour les commandes d'aide Gmail.

Les Hooks peuvent également être regroupés dans des plugins ; voir [Plugin hooks](/en/plugins/architecture#provider-runtime-hooks). `openclaw hooks list` affiche à la fois les hooks autonomes et les hooks gérés par des plugins.

Cas d'usage courants :

- Sauvegarder un instantané de la mémoire lorsque vous réinitialisez une session
- Garder une trace d'audit des commandes pour le dépannage ou la conformité
- Déclencher une automatisation de suivi lorsqu'une session commence ou se termine
- Écrire des fichiers dans l'espace de travail de l'agent ou appeler des API externes lorsque des événements se déclenchent

Si vous savez écrire une petite fonction TypeScript, vous pouvez écrire un hook. Les hooks gérés et regroupés sont du code local approuvé. Les hooks de l'espace de travail sont découverts automatiquement, mais OpenClaw les garde désactivés jusqu'à ce que vous les activiez explicitement via le CLI ou la configuration.

## Vue d'ensemble

Le système de Hooks vous permet de :

- Sauvegarder le contexte de la session dans la mémoire lorsque `/new` est émis
- Journaliser toutes les commandes pour l'audit
- Déclencher des automatisations personnalisées sur les événements de cycle de vie des agents
- Étendre le comportement de OpenClaw sans modifier le code central

## Getting Started

### Hooks fournis

OpenClaw est fourni avec quatre hooks regroupés qui sont automatiquement découverts :

- **💾 session-memory** : Enregistre le contexte de la session dans votre espace de travail agent (défaut `~/.openclaw/workspace/memory/`) lorsque vous émettez `/new` ou `/reset`
- **📎 bootstrap-extra-files** : Injecte des fichiers de démarrage d'espace de travail supplémentaires à partir de modèles glob/chemin configurés pendant `agent:bootstrap`
- **📝 command-logger** : Enregistre tous les événements de commande dans `~/.openclaw/logs/commands.log`
- **🚀 boot-md** : Exécute `BOOT.md` au démarrage de la passerelle (nécessite l'activation des hooks internes)

Lister les hooks disponibles :

```bash
openclaw hooks list
```

Activer un hook :

```bash
openclaw hooks enable session-memory
```

Vérifier le statut du hook :

```bash
openclaw hooks check
```

Obtenir des informations détaillées :

```bash
openclaw hooks info session-memory
```

### Onboarding

Pendant l'onboarding (`openclaw onboard`), il vous sera demandé d'activer les hooks recommandés. L'assistant découvre automatiquement les hooks éligibles et les présente pour sélection.

### Limite de confiance

Les Hooks s'exécutent dans le processus Gateway. Traitez les hooks regroupés, les hooks gérés et `hooks.internal.load.extraDirs` comme du code local de confiance. Les hooks de l'espace de travail sous `<workspace>/hooks/` sont du code local au dépôt, donc OpenClaw nécessite une étape d'activation explicite avant de les charger.

## Hook Discovery

Les hooks sont découverts automatiquement à partir de ces répertoires, par ordre de priorité de substitution croissante :

1. **Bundled hooks** : livrés avec OpenClaw ; situés à `<openclaw>/dist/hooks/bundled/` pour les installations npm (ou un `hooks/bundled/` adjacent pour les binaires compilés)
2. **Plugin hooks** : hooks regroupés dans les plugins installés (voir [Plugin hooks](/en/plugins/architecture#provider-runtime-hooks))
3. **Managed hooks** : `~/.openclaw/hooks/` (installés par l'utilisateur, partagés entre les espaces de travail ; peuvent remplacer les hooks intégrés et ceux des plugins). **Les répertoires de hooks supplémentaires** configurés via `hooks.internal.load.extraDirs` sont également considérés comme des hooks gérés et partagent la même priorité de remplacement.
4. **Workspace hooks** : `<workspace>/hooks/` (par agent, désactivés par défaut jusqu'à ce qu'ils soient explicitement activés ; ne peuvent pas remplacer les hooks d'autres sources)

Les hooks de l'espace de travail peuvent ajouter de nouveaux noms de hooks pour un dépôt, mais ils ne peuvent pas remplacer les hooks fournis, gérés ou fournis par un plugin portant le même nom.

Les répertoires de hooks gérés peuvent être soit un **hook unique** soit un **hook pack** (répertoire de package).

Chaque hook est un répertoire contenant :

```
my-hook/
├── HOOK.md          # Metadata + documentation
└── handler.ts       # Handler implementation
```

## Hook Packs (npm/archives)

Les hook packs sont des packages npm standard qui exportent un ou plusieurs hooks via `openclaw.hooks` dans
`package.json`. Installez-les avec :

```bash
openclaw plugins install <path-or-spec>
```

Les specs npm sont exclusivement pour le registre (nom du package + version exacte en option ou dist-tag).
Les specs Git/URL/fichier et les plages semver sont rejetées.

Les spécifications brutes et `@latest` restent sur la voie stable. Si npm résolve l'un de
ceux-ci vers une préversion, OpenClaw s'arrête et vous demande d'accepter explicitement avec une
tague de préversion telle que `@beta`/`@rc` ou une version de préversion exacte.

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

Chaque entrée pointe vers un répertoire de hooks contenant `HOOK.md` et `handler.ts` (ou `index.ts`).
Les hook packs peuvent inclure des dépendances ; elles seront installées sous `~/.openclaw/hooks/<id>`.
Chaque entrée `openclaw.hooks` doit rester à l'intérieur du répertoire du package après la résolution des liens symboliques ;
les entrées qui en sortent sont rejetées.

Note de sécurité : `openclaw plugins install` installe les dépendances des hook packs avec `npm install --ignore-scripts`
(pas de scripts de cycle de vie). Gardez les arbres de dépendances des hook packs "pur JS/TS" et évitez les packages qui reposent
sur des builds `postinstall`.

## Structure du Hook

### Format HOOK.md

Le fichier `HOOK.md` contient des métadonnées dans le frontmatter YAML plus la documentation Markdown :

```markdown
---
name: my-hook
description: "Short description of what this hook does"
homepage: https://docs.openclaw.ai/automation/hooks#my-hook
metadata: { "openclaw": { "emoji": "🔗", "events": ["command:new"], "requires": { "bins": ["node"] } } }
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

### Champs de Métadonnées

L'objet `metadata.openclaw` prend en charge :

- **`emoji`** : Emoji d'affichage pour la CLI (par exemple, `"💾"`)
- **`events`** : Tableau des événements à écouter (par ex., `["command:new", "command:reset"]`)
- **`export`** : Export nommé à utiliser (par défaut `"default"`)
- **`homepage`** : URL de la documentation
- **`os`** : Plateformes requises (par ex., `["darwin", "linux"]`)
- **`requires`** : Exigences optionnelles
  - **`bins`** : Binaires requis dans le PATH (par ex., `["git", "node"]`)
  - **`anyBins`** : Au moins l'un de ces binaires doit être présent
  - **`env`** : Variables d'environnement requises
  - **`config`** : Chemins de configuration requis (par ex., `["workspace.dir"]`)
- **`always`** : Contourner les vérifications d'éligibilité (booléen)
- **`install`** : Méthodes d'installation (pour les hooks regroupés : `[{"id":"bundled","kind":"bundled"}]`)

### Implémentation du Gestionnaire

Le fichier `handler.ts` exporte une fonction `HookHandler` :

```typescript
const myHandler = async (event) => {
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

#### Contexte de l'Événement

Chaque événement inclut :

```typescript
{
  type: 'command' | 'session' | 'agent' | 'gateway' | 'message',
  action: string,              // e.g., 'new', 'reset', 'stop', 'received', 'sent'
  sessionKey: string,          // Session identifier
  timestamp: Date,             // When the event occurred
  messages: string[],          // Push messages here to send to user
  context: {
    // Command events (command:new, command:reset):
    sessionEntry?: SessionEntry,       // current session entry
    previousSessionEntry?: SessionEntry, // pre-reset entry (preferred for session-memory)
    commandSource?: string,            // e.g., 'whatsapp', 'telegram'
    senderId?: string,
    workspaceDir?: string,
    cfg?: OpenClawConfig,
    // Command events (command:stop only):
    sessionId?: string,
    // Agent bootstrap events (agent:bootstrap):
    bootstrapFiles?: WorkspaceBootstrapFile[],
    // Message events (see Message Events section for full details):
    from?: string,             // message:received
    to?: string,               // message:sent
    content?: string,
    channelId?: string,
    success?: boolean,         // message:sent
  }
}
```

## Types d'Événements

### Événements de Commande

Déclenchés lorsque des commandes d'agent sont émises :

- **`command`** : Tous les événements de commande (écouteur général)
- **`command:new`** : Lorsque la commande `/new` est émise
- **`command:reset`** : Lorsque la commande `/reset` est émise
- **`command:stop`** : Lorsque la commande `/stop` est émise

### Événements de session

- **`session:compact:before`** : Juste avant que la compactage ne résume l'historique
- **`session:compact:after`** : Après la fin du compactage avec les métadonnées du résumé

Les payloads de hook internes émettent ceux-ci en tant que `type: "session"` avec `action: "compact:before"` / `action: "compact:after"` ; les écouteurs s'abonnent avec les clés combinées ci-dessus.
L'enregistrement spécifique du gestionnaire utilise le format de clé littéral `${type}:${action}`. Pour ces événements, enregistrez `session:compact:before` et `session:compact:after`.

### Événements d'agent

- **`agent:bootstrap`** : Avant l'injection des fichiers d'amorçage de l'espace de travail (les hooks peuvent modifier `context.bootstrapFiles`)

### Événements de Gateway

Déclenché au démarrage de la passerelle :

- **`gateway:startup`** : Une fois les channels démarrés et les hooks chargés

### Événements de correctif de session

Déclenché lorsque les propriétés de la session sont modifiées :

- **`session:patch`** : Lorsqu'une session est mise à jour

#### Contexte des événements de session

Les événements de session incluent un contexte riche sur la session et les modifications :

```typescript
{
  sessionEntry: SessionEntry, // The complete updated session entry
  patch: {                    // The patch object (only changed fields)
    // Session identity & labeling
    label?: string | null,           // Human-readable session label

    // AI model configuration
    model?: string | null,           // Model override (e.g., "claude-opus-4-5")
    thinkingLevel?: string | null,   // Thinking level ("off"|"low"|"med"|"high")
    verboseLevel?: string | null,    // Verbose output level
    reasoningLevel?: string | null,  // Reasoning mode override
    elevatedLevel?: string | null,   // Elevated mode override
    responseUsage?: "off" | "tokens" | "full" | null, // Usage display mode

    // Tool execution settings
    execHost?: string | null,        // Exec host (sandbox|gateway|node)
    execSecurity?: string | null,    // Security mode (deny|allowlist|full)
    execAsk?: string | null,         // Approval mode (off|on-miss|always)
    execNode?: string | null,        // Node ID for host=node

    // Subagent coordination
    spawnedBy?: string | null,       // Parent session key (for subagents)
    spawnDepth?: number | null,      // Nesting depth (0 = root)

    // Communication policies
    sendPolicy?: "allow" | "deny" | null,          // Message send policy
    groupActivation?: "mention" | "always" | null, // Group chat activation
  },
  cfg: OpenClawConfig            // Current gateway config
}
```

**Note de sécurité :** Seuls les clients privilégiés (y compris l'interface de contrôle) peuvent déclencher des événements `session:patch`. Les clients WebChat standard sont bloqués pour la modification des sessions (voir PR #20800), le hook ne se déclenchera donc pas depuis ces connexions.

Voir `SessionsPatchParamsSchema` dans `src/gateway/protocol/schema/sessions.ts` pour la définition complète du type.

#### Exemple : Hook de journalisation des correctifs de session

```typescript
const handler = async (event) => {
  if (event.type !== "session" || event.action !== "patch") {
    return;
  }
  const { patch } = event.context;
  console.log(`[session-patch] Session updated: ${event.sessionKey}`);
  console.log(`[session-patch] Changes:`, patch);
};

export default handler;
```

### Événements de message

Déclenché lors de la réception ou de l'envoi de messages :

- **`message`** : Tous les événements de message (écouteur général)
- **`message:received`** : Lorsqu'un message entrant est reçu de n'importe quel channel. Se déclenche tôt dans le traitement avant la compréhension des médias. Le contenu peut contenir des espaces réservés bruts comme `<media:audio>` pour les pièces jointes multimédias qui n'ont pas encore été traitées.
- **`message:transcribed`** : Lorsqu'un message a été entièrement traité, y compris la transcription audio et la compréhension des liens. À ce stade, `transcript` contient le texte complet de la transcription pour les messages audio. Utilisez ce hook lorsque vous devez accéder au contenu audio transcrit.
- **`message:preprocessed`** : Se déclenche pour chaque message après que toute la compréhension des médias et des liens est terminée, donnant aux hooks accès au corps entièrement enrichi (transcriptions, descriptions d'images, résumés de liens) avant que l'agent ne le voie.
- **`message:sent`** : Lorsqu'un message sortant est envoyé avec succès

#### Contexte de l'événement de message

Les événements de message incluent un contexte riche sur le message :

```typescript
// message:received context
{
  from: string,           // Sender identifier (phone number, user ID, etc.)
  content: string,        // Message content
  timestamp?: number,     // Unix timestamp when received
  channelId: string,      // Channel (e.g., "whatsapp", "telegram", "discord")
  accountId?: string,     // Provider account ID for multi-account setups
  conversationId?: string, // Chat/conversation ID
  messageId?: string,     // Message ID from the provider
  metadata?: {            // Additional provider-specific data
    to?: string,
    provider?: string,
    surface?: string,
    threadId?: string | number,
    senderId?: string,
    senderName?: string,
    senderUsername?: string,
    senderE164?: string,
    guildId?: string,     // Discord guild / server ID
    channelName?: string, // Channel name (e.g., Discord channel name)
  }
}

// message:sent context
{
  to: string,             // Recipient identifier
  content: string,        // Message content that was sent
  success: boolean,       // Whether the send succeeded
  error?: string,         // Error message if sending failed
  channelId: string,      // Channel (e.g., "whatsapp", "telegram", "discord")
  accountId?: string,     // Provider account ID
  conversationId?: string, // Chat/conversation ID
  messageId?: string,     // Message ID returned by the provider
  isGroup?: boolean,      // Whether this outbound message belongs to a group/channel context
  groupId?: string,       // Group/channel identifier for correlation with message:received
}

// message:transcribed context
{
  from?: string,          // Sender identifier
  to?: string,            // Recipient identifier
  body?: string,          // Raw inbound body before enrichment
  bodyForAgent?: string,  // Enriched body visible to the agent
  transcript: string,     // Audio transcript text
  timestamp?: number,     // Unix timestamp when received
  channelId: string,      // Channel (e.g., "telegram", "whatsapp")
  conversationId?: string,
  messageId?: string,
  senderId?: string,      // Sender user ID
  senderName?: string,    // Sender display name
  senderUsername?: string,
  provider?: string,      // Provider name
  surface?: string,       // Surface name
  mediaPath?: string,     // Path to the media file that was transcribed
  mediaType?: string,     // MIME type of the media
}

// message:preprocessed context
{
  from?: string,          // Sender identifier
  to?: string,            // Recipient identifier
  body?: string,          // Raw inbound body
  bodyForAgent?: string,  // Final enriched body after media/link understanding
  transcript?: string,    // Transcript when audio was present
  timestamp?: number,     // Unix timestamp when received
  channelId: string,      // Channel (e.g., "telegram", "whatsapp")
  conversationId?: string,
  messageId?: string,
  senderId?: string,      // Sender user ID
  senderName?: string,    // Sender display name
  senderUsername?: string,
  provider?: string,      // Provider name
  surface?: string,       // Surface name
  mediaPath?: string,     // Path to the media file
  mediaType?: string,     // MIME type of the media
  isGroup?: boolean,
  groupId?: string,
}
```

#### Exemple : Hook de journalisation de messages

```typescript
const isMessageReceivedEvent = (event: { type: string; action: string }) => event.type === "message" && event.action === "received";
const isMessageSentEvent = (event: { type: string; action: string }) => event.type === "message" && event.action === "sent";

const handler = async (event) => {
  if (isMessageReceivedEvent(event as { type: string; action: string })) {
    console.log(`[message-logger] Received from ${event.context.from}: ${event.context.content}`);
  } else if (isMessageSentEvent(event as { type: string; action: string })) {
    console.log(`[message-logger] Sent to ${event.context.to}: ${event.context.content}`);
  }
};

export default handler;
```

### Hooks de résultats d'outil (Plugin API)

Ces hooks ne sont pas des écouteurs de flux d'événements ; ils permettent aux plugins d'ajuster de manière synchrone les résultats des outils avant que OpenClaw ne les persiste.

- **`tool_result_persist`** : transformer les résultats des outils avant qu'ils ne soient écrits dans la transcription de session. Doit être synchrone ; renvoyez la charge utile du résultat de l'outil mise à jour ou `undefined` pour la laisser telle quelle. Voir [Agent Loop](/en/concepts/agent-loop).

### Événements de hook de plugin

#### before_tool_call

S'exécute avant chaque appel d'outil. Les plugins peuvent modifier les paramètres, bloquer l'appel ou demander une approbation utilisateur.

Champs de retour :

- **`params`** : Remplacer les paramètres de l'outil (fusionnés avec les paramètres d'origine)
- **`block`** : Définir sur `true` pour bloquer l'appel de l'outil
- **`blockReason`** : Raison affichée à l'agent lorsqu'il est bloqué
- **`requireApproval`** : Suspendre l'exécution et attendre l'approbation de l'utilisateur via les channels

Le champ `requireApproval` déclenche l'approbation native de la plateforme (boutons Telegram, composants Discord, commande `/approve`) au lieu de s'appuyer sur la coopération de l'agent :

```typescript
{
  requireApproval: {
    title: "Sensitive operation",
    description: "This tool call modifies production data",
    severity: "warning",       // "info" | "warning" | "critical"
    timeoutMs: 120000,         // default: 120s
    timeoutBehavior: "deny",   // "allow" | "deny" (default)
    onResolution: async (decision) => {
      // Called after the user resolves: "allow-once", "allow-always", "deny", "timeout", or "cancelled"
    },
  }
}
```

Le rappel `onResolution` est invoqué avec la chaîne de décision finale une fois l'approbation résolue, expirée ou annulée. Il s'exécute en processus au sein du plugin (non envoyé à la passerelle). Utilisez-le pour rendre les décisions persistantes, mettre à jour les caches ou effectuer un nettoyage.

Le champ `pluginId` est automatiquement ajouté par le lanceur de hooks à partir de l'enregistrement du plugin. Lorsque plusieurs plugins renvoient `requireApproval`, le premier (la priorité la plus élevée) l'emporte.

`block` a priorité sur `requireApproval` : si le résultat du hook fusionné a à la fois `block: true` et un champ `requireApproval`, l'appel d'outil est bloqué immédiatement sans déclencher le flux d'approbation. Cela garantit qu'un blocage d'un plugin de priorité supérieure ne peut pas être annulé par une demande d'approbation d'un plugin de priorité inférieure.

Si la passerelle n'est pas disponible ou ne prend pas en charge les approbations de plugins, l'appel d'outil revient à un blocage souple en utilisant le `description` comme raison du blocage.

#### Cycle de vie de compactage

Hooks du cycle de vie de compactage exposés via le lanceur de hooks de plugin :

- **`before_compaction`** : S'exécute avant le compactage avec les métadonnées de nombre/jeton
- **`after_compaction`** : S'exécute après le compactage avec les métadonnées du résumé de compactage

### Événements futurs

Types d'événements prévus :

- **`session:start`** : Lorsqu'une nouvelle session commence
- **`session:end`** : Lorsqu'une session se termine
- **`agent:error`** : Lorsqu'un agent rencontre une erreur

## Créer des Hooks personnalisés

### 1. Choisir l'emplacement

- **Hooks d'espace de travail** (`<workspace>/hooks/`) : Par agent ; peut ajouter de nouveaux noms de hooks mais ne peut pas remplacer les hooks groupés, gérés ou de plugin du même nom
- **Hooks gérés** (`~/.openclaw/hooks/`) : Partagés entre les espaces de travail ; peut remplacer les hooks groupés et de plugin

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
const handler = async (event) => {
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

Les hooks peuvent avoir une configuration personnalisée :

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

Chargez les hooks à partir de répertoires supplémentaires (traités comme des hooks gérés, même priorité de remplacement) :

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

### Format de configuration hérité (toujours pris en charge)

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

Note : `module` doit être un chemin relatif à l'espace de travail. Les chemins absolus et les traversées hors de l'espace de travail sont rejetés.

**Migration** : Utilisez le nouveau système basé sur la découverte pour les nouveaux hooks. Les gestionnaires hérités sont chargés après les hooks basés sur les répertoires.

## Commandes CLI

### Lister les hooks

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

### Informations sur le hook

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

### Activer/Désactiver

```bash
# Enable a hook
openclaw hooks enable session-memory

# Disable a hook
openclaw hooks disable command-logger
```

## Référence des hooks inclus

### session-memory

Enregistre le contexte de la session dans la mémoire lorsque vous émettez `/new` ou `/reset`.

**Événements** : `command:new`, `command:reset`

**Conditions requises** : `workspace.dir` doit être configuré

**Sortie** : `<workspace>/memory/YYYY-MM-DD-slug.md` (par défaut `~/.openclaw/workspace`)

**Ce qu'il fait** :

1. Utilise l'entrée de session pré-réinitialisation pour localiser la bonne transcription
2. Extrait les 15 derniers messages utilisateur/assistant de la conversation (configurable)
3. Utilise LLM pour générer un slug de nom de fichier descriptif
4. Enregistre les métadonnées de la session dans un fichier de mémoire daté

**Exemple de sortie** :

```markdown
# Session: 2026-01-16 14:30:00 UTC

- **Session Key**: agent:main:main
- **Session ID**: abc123def456
- **Source**: telegram

## Conversation Summary

user: Can you help me design the API?
assistant: Sure! Let's start with the endpoints...
```

**Exemples de noms de fichiers** :

- `2026-01-16-vendor-pitch.md`
- `2026-01-16-api-design.md`
- `2026-01-16-1430.md` (horodatage de secours si la génération de slug échoue)

**Activer** :

```bash
openclaw hooks enable session-memory
```

### bootstrap-extra-files

Injecte des fichiers d'amorçage supplémentaires (par exemple `AGENTS.md` / `TOOLS.md` locaux au monorepo) pendant `agent:bootstrap`.

**Événements** : `agent:bootstrap`

**Conditions requises** : `workspace.dir` doit être configuré

**Sortie** : Aucun fichier écrit ; le contexte d'amorçage est modifié uniquement en mémoire.

**Config** :

```json
{
  "hooks": {
    "internal": {
      "enabled": true,
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

**Options de configuration** :

- `paths` (string[]) : modèles glob/chemin à résoudre depuis l'espace de travail.
- `patterns` (string[]) : alias de `paths`.
- `files` (string[]) : alias de `paths`.

**Notes** :

- Les chemins sont résolus par rapport à l'espace de travail.
- Les fichiers doivent rester à l'intérieur de l'espace de travail (vérifiés par realpath).
- Seuls les noms de base d'amorçage reconnus sont chargés (`AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, `BOOTSTRAP.md`, `MEMORY.md`, `memory.md`).
- Pour les sessions de sous-agent/cron, une liste blanche plus stricte s'applique (`AGENTS.md`, `TOOLS.md`, `SOUL.md`, `IDENTITY.md`, `USER.md`).

**Activer** :

```bash
openclaw hooks enable bootstrap-extra-files
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

### boot-md

Exécute `BOOT.md` lorsque la passerelle démarre (après le démarrage des canaux).
Les hooks internes doivent être activés pour que cela s'exécute.

**Événements** : `gateway:startup`

**Conditions requises** : `workspace.dir` doit être configuré

**Ce qu'il fait** :

1. Lit `BOOT.md` depuis votre espace de travail
2. Exécute les instructions via l'exécuteur d'agent
3. Envoie tous les messages sortants demandés via l'outil de message

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

La passerelle enregistre le chargement des hooks au démarrage :

```
Registered hook: session-memory -> command:new
Registered hook: bootstrap-extra-files -> agent:bootstrap
Registered hook: command-logger -> command
Registered hook: boot-md -> gateway:startup
```

### Vérifier la découverte

Lister tous les hooks découverts :

```bash
openclaw hooks list --verbose
```

### Vérifier l'enregistrement

Dans votre gestionnaire, enregistrez lorsqu'il est appelé :

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

Recherchez les conditions requises manquantes dans la sortie.

## Tests

### Journaux de la Gateway

Surveillez les journaux de la passerelle pour voir l'exécution des hooks :

```bash
# macOS
./scripts/clawlog.sh -f

# Other platforms
tail -f ~/.openclaw/gateway.log
```

### Test Hooks Directly

Test your handlers in isolation:

```typescript
import { test } from "vitest";
import myHandler from "./hooks/my-hook/handler.js";

test("my handler works", async () => {
  const event = {
    type: "command",
    action: "new",
    sessionKey: "test-session",
    timestamp: new Date(),
    messages: [],
    context: { foo: "bar" },
  };

  await myHandler(event);

  // Assert side effects
});
```

## Architecture

### Core Components

- **`src/hooks/types.ts`**: Type definitions
- **`src/hooks/workspace.ts`**: Directory scanning and loading
- **`src/hooks/frontmatter.ts`**: HOOK.md metadata parsing
- **`src/hooks/config.ts`**: Eligibility checking
- **`src/hooks/hooks-status.ts`**: Status reporting
- **`src/hooks/loader.ts`**: Dynamic module loader
- **`src/cli/hooks-cli.ts`**: CLI commands
- **`src/gateway/server-startup.ts`**: Loads hooks at gateway start
- **`src/auto-reply/reply/commands-core.ts`**: Triggers command events

### Discovery Flow

```
Gateway startup
    ↓
Scan directories (bundled → plugin → managed + extra dirs → workspace)
    ↓
Parse HOOK.md files
    ↓
Sort by override precedence (bundled < plugin < managed < workspace)
    ↓
Check eligibility (bins, env, config, os)
    ↓
Load handlers from eligible hooks
    ↓
Register handlers for events
```

### Event Flow

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

## Troubleshooting

### Hook Not Discovered

1. Check directory structure:

   ```bash
   ls -la ~/.openclaw/hooks/my-hook/
   # Should show: HOOK.md, handler.ts
   ```

2. Verify HOOK.md format:

   ```bash
   cat ~/.openclaw/hooks/my-hook/HOOK.md
   # Should have YAML frontmatter with name and metadata
   ```

3. List all discovered hooks:

   ```bash
   openclaw hooks list
   ```

### Hook Not Eligible

Check requirements:

```bash
openclaw hooks info my-hook
```

Look for missing:

- Binaries (check PATH)
- Variables d'environnement
- Valeurs de configuration
- Compatibilité du système d'exploitation

### Le hook ne s'exécute pas

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

### De la configuration héritée à la découverte

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
- CLI management
- Vérification de l'éligibilité
- Meilleure documentation
- Structure cohérente

## Voir aussi

- [CLI Reference: hooks](/en/cli/hooks)
- [Bundled Hooks README](https://github.com/openclaw/openclaw/tree/main/src/hooks/bundled)
- [Webhook Hooks](/en/automation/webhook)
- [Configuration](/en/gateway/configuration-reference#hooks)
