---
summary: "Exposer les conversations de canal OpenClaw via MCP et gérer les définitions de serveur MCP enregistrées"
read_when:
  - Connecting Codex, Claude Code, or another MCP client to OpenClaw-backed channels
  - Running `openclaw mcp serve`
  - Managing OpenClaw-saved MCP server definitions
title: "mcp"
---

# mcp

`openclaw mcp` a deux fonctions :

- exécuter OpenClaw en tant que serveur MCP avec `openclaw mcp serve`
- gérer les définitions de serveur MCP sortantes appartenant à OpenClaw avec `list`, `show`,
  `set` et `unset`

En d'autres termes :

- `serve` est OpenClaw agissant comme un serveur MCP
- `list` / `show` / `set` / `unset` est OpenClaw agissant comme un registre côté client MCP
  pour d'autres serveurs MCP que ses environnements d'exécution peuvent consommer plus tard

Utilisez [`openclaw acp`](/fr/cli/acp) lorsqu'OpenClaw doit héberger lui-même une session de harnais de codage et acheminer ce runtime via ACP.

## OpenClaw en tant que serveur MCP

C'est le chemin `openclaw mcp serve`.

## Quand utiliser `serve`

Utilisez `openclaw mcp serve` lorsque :

- Codex, Claude Code ou un autre client MCP doit communiquer directement avec les conversations de canal prises en charge par OpenClaw
- vous avez déjà une passerelle OpenClaw locale ou distante avec des sessions routées
- vous voulez un seul serveur MCP qui fonctionne sur les backends de canal de OpenClaw au lieu d'exécuter des ponts séparés par canal

Utilisez plutôt [`openclaw acp`](/fr/cli/acp) lorsqu'OpenClaw doit héberger lui-même le runtime de codage et garder la session de l'agent à l'intérieur d'OpenClaw.

## Comment cela fonctionne

`openclaw mcp serve` démarre un serveur MCP stdio. Le client MCP possède ce processus.
Tant que le client garde la session stdio ouverte, le pont se connecte à une passerelle
OpenClaw locale ou distante via WebSocket et expose des conversations de canal acheminées via MCP.

Cycle de vie :

1. le client MCP lance `openclaw mcp serve`
2. le pont se connecte à la Gateway
3. les sessions routées deviennent des conversations MCP et des outils de transcription/historique
4. les événements en direct sont mis en file d'attente en mémoire tant que le pont est connecté
5. si le mode canal Claude est activé, la même session peut également recevoir
   des notifications push spécifiques à Claude

Comportement important :

- l'état de la file d'attente en direct commence lorsque le pont se connecte
- l'historique des anciennes transcriptions est lu avec `messages_read`
- les notifications push Claude n'existent que tant que la session MCP est active
- lorsque le client se déconnecte, le pont se ferme et la file d'attente en direct disparaît

## Choisir un mode client

Utilisez le même pont de deux manières différentes :

- Clients MCP génériques : uniquement les outils MCP standard. Utilisez `conversations_list`,
  `messages_read`, `events_poll`, `events_wait`, `messages_send` et les outils d'approbation.
- Claude Code : outils MCP standard plus l'adaptateur de canal spécifique à Claude.
  Activez `--claude-channel-mode on` ou laissez la valeur par défaut `auto`.

Aujourd'hui, `auto` se comporte de la même manière que `on`. Il n'y a pas encore de détection des capacités du client.

## Ce que `serve` expose

Le pont utilise les métadonnées de route de session Gateway existantes pour exposer des conversations
soutenues par des canaux. Une conversation apparaît lorsque OpenClaw possède déjà l'état de session
avec une route connue telle que :

- `channel`
- métadonnées du destinataire ou de la destination
- facultatif `accountId`
- facultatif `threadId`

Cela offre aux clients MCP un endroit unique pour :

- lister les conversations routées récentes
- lire l'historique des récentes transcriptions
- attendre de nouveaux événements entrants
- envoyer une réponse par la même route
- voir les demandes d'approbation qui arrivent tant que le pont est connecté

## Utilisation

```bash
# Local Gateway
openclaw mcp serve

# Remote Gateway
openclaw mcp serve --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token

# Remote Gateway with password auth
openclaw mcp serve --url wss://gateway-host:18789 --password-file ~/.openclaw/gateway.password

# Enable verbose bridge logs
openclaw mcp serve --verbose

# Disable Claude-specific push notifications
openclaw mcp serve --claude-channel-mode off
```

## Outils du pont

Le pont actuel expose ces outils MCP :

- `conversations_list`
- `conversation_get`
- `messages_read`
- `attachments_fetch`
- `events_poll`
- `events_wait`
- `messages_send`
- `permissions_list_open`
- `permissions_respond`

### `conversations_list`

Liste les conversations récentes basées sur des sessions qui possèdent déjà des métadonnées de routage dans
l'état de session du Gateway.

Filtres utiles :

- `limit`
- `search`
- `channel`
- `includeDerivedTitles`
- `includeLastMessage`

### `conversation_get`

Renvoie une conversation par `session_key`.

### `messages_read`

Lit les messages de transcription récents pour une conversation sauvegardée dans une session.

### `attachments_fetch`

Extrait les blocs de contenu de messages non textuels d'un message de transcription. Il s'agit d'une vue des métadonnées sur le contenu de la transcription, et non d'un stockage d'objets blob de pièces jointes durable et autonome.

### `events_poll`

Lit les événements en direct mis en file d'attente depuis un curseur numérique.

### `events_wait`

Effectue un appel long (long-poll) jusqu'à l'arrivée du prochain événement mis en file d'attente correspondant ou jusqu'à l'expiration du délai d'attente.

Utilisez ceci lorsqu'un client MCP générique a besoin d'une livraison en temps quasi réel sans protocole de poussée spécifique à Claude.

### `messages_send`

Renvoie le texte via la même route déjà enregistrée sur la session.

Comportement actuel :

- nécessite une route de conversation existante
- utilise le channel, le destinataire, l'identifiant du compte et l'identifiant du fil de la session
- envoie uniquement du texte

### `permissions_list_open`

Liste les demandes d'approbation d'exécution/plugin en attente que le pont a observées depuis sa connexion au Gateway.

### `permissions_respond`

Résout une demande d'approbation d'exécution/plugin en attente avec :

- `allow-once`
- `allow-always`
- `deny`

## Modèle d'événement

Le pont maintient une file d'attente d'événements en mémoire tant qu'il est connecté.

Types d'événements actuels :

- `message`
- `exec_approval_requested`
- `exec_approval_resolved`
- `plugin_approval_requested`
- `plugin_approval_resolved`
- `claude_permission_request`

Limites importantes :

- la file d'attente est en mode direct uniquement (live-only) ; elle démarre lorsque le pont MCP démarre
- `events_poll` et `events_wait` ne rejouent pas par eux-mêmes l'historique plus ancien du Gateway
- l'historique durable doit être lu avec `messages_read`

## Notifications du canal Claude

Le pont peut également exposer des notifications de canal spécifiques à Claude. Il s'agit de l'équivalent OpenClaw d'un adaptateur de canal Claude Code : les outils MCP standard restent disponibles, mais les messages entrants en direct peuvent également arriver sous forme de notifications MCP spécifiques à Claude.

Indicateurs (Flags) :

- `--claude-channel-mode off` : outils MCP standard uniquement
- `--claude-channel-mode on` : activer les notifications de channel Claude
- `--claude-channel-mode auto` : valeur par défaut actuelle ; même comportement de pont que `on`

Lorsque le mode canal Claude est activé, le serveur annonce des capacités expérimentales Claude et peut émettre :

- `notifications/claude/channel`
- `notifications/claude/channel/permission`

Comportement actuel du pont :

- les messages de transcription `user` entrants sont transférés en tant que `notifications/claude/channel`
- les demandes d'autorisation Claude reçues via MCP sont suivies en mémoire
- si la conversation liée envoie ultérieurement `yes abcde` ou `no abcde`, le pont convertit cela en `notifications/claude/channel/permission`
- ces notifications sont uniquement pour la session en cours ; si le client MCP se déconnecte,
  il n'y a pas de cible de notification (push)

Ceci est intentionnellement spécifique au client. Les clients MCP génériques devraient s'appuyer sur les
outils d'interrogation (polling) standard.

## Configuration du client MCP

Exemple de configuration de client stdio :

```json
{
  "mcpServers": {
    "openclaw": {
      "command": "openclaw",
      "args": ["mcp", "serve", "--url", "wss://gateway-host:18789", "--token-file", "/path/to/gateway.token"]
    }
  }
}
```

Pour la plupart des clients MCP génériques, commencez avec la surface d'outil standard et ignorez
le mode Claude. Activez le mode Claude uniquement pour les clients qui comprennent réellement les
méthodes de notification spécifiques à Claude.

## Options

`openclaw mcp serve` prend en charge :

- `--url <url>` : URL WebSocket Gateway
- `--token <token>` : jeton Gateway
- `--token-file <path>` : lire le jeton depuis un fichier
- `--password <password>` : mot de passe Gateway
- `--password-file <path>` : lire le mot de passe depuis un fichier
- `--claude-channel-mode <auto|on|off>` : mode de notification Claude
- `-v`, `--verbose` : journaux détaillés sur stderr

Privilégiez `--token-file` ou `--password-file` par rapport aux secrets en ligne lorsque cela est possible.

## Sécurité et limite de confiance

Le pont n'invente pas le routage. Il expose uniquement les conversations que le Gateway
sait déjà router.

Cela signifie :

- les listes d'autorisation des expéditeurs, l'appairage et la confiance au niveau du canal appartiennent toujours à la
  configuration du canal OpenClaw sous-jacente
- `messages_send` ne peut répondre que via une route stockée existante
- l'état d'approbation est en direct/en mémoire uniquement pour la session de pont actuelle
- l'auth du pont doit utiliser les mêmes contrôles de jeton ou de mot de passe Gateway que vous feriez confiance pour tout autre client distant Gateway

Si une conversation est manquante dans `conversations_list`, la cause habituelle n'est pas
la configuration MCP. Il s'agit de métadonnées de route manquantes ou incomplètes dans la session Gateway sous-jacente.

## Tests

OpenClaw inclut un smoke test déterministe Docker pour ce pont :

```bash
pnpm test:docker:mcp-channels
```

Ce smoke test :

- démarre un conteneur Gateway amorcé
- démarre un deuxième conteneur qui lance `openclaw mcp serve`
- vérifie la découverte de conversations, les lectures de transcripts, les lectures de métadonnées de pièces jointes, le comportement de la file d'attente d'événements en direct et le routage des envois sortants
- valide les notifications de canal et d'autorisation de style Claude sur le vrai pont MCP stdio

C'est le moyen le plus rapide de prouver que le pont fonctionne sans connecter de compte Telegram, Discord ou iMessage réel au test.

Pour un contexte de test plus large, voir [Testing](/fr/help/testing).

## Dépannage

### Aucune conversation retournée

Cela signifie généralement que la session Gateway n'est pas encore routable. Confirmez que la session sous-jacente a stocké les métadonnées de route channel/provider, recipient, et account/thread en option.

### `events_poll` ou `events_wait` manque des messages plus anciens

Attendu. La file d'attente en direct démarre lorsque le pont se connecte. Lisez l'historique des transcriptions plus anciennes
avec `messages_read`.

### Les notifications Claude n'apparaissent pas

Vérifiez tout ceci :

- le client a gardé la session MCP stdio ouverte
- `--claude-channel-mode` est `on` ou `auto`
- le client comprend réellement les méthodes de notification spécifiques à Claude
- le message entrant a eu lieu après la connexion du pont

### Les approbations sont manquantes

`permissions_list_open` affiche uniquement les demandes d'approbation observées pendant que le pont
était connecté. Ce n'est pas une API d'historique d'approbation durable API.

## OpenClaw en tant que registre de client MCP

C'est le chemin `openclaw mcp list`, `show`, `set` et `unset`.

Ces commandes n'exposent pas OpenClaw via MCP. Elles gèrent les définitions de serveur MCP détenues par OpenClaw
sous `mcp.servers` dans la configuration OpenClaw.

Ces définitions enregistrées sont destinées aux runtimes que OpenClaw lance ou configure
ultérieurement, tels que le Pi intégré et autres adaptateurs de runtime. OpenClaw stocke les
définitions de manière centralisée pour que ces runtimes n'aient pas besoin de conserver leurs propres listes
dupliquées de serveurs MCP.

Comportement important :

- ces commandes ne lisent ou n'écrivent que la configuration OpenClaw
- elles ne se connectent pas au serveur MCP cible
- elles ne valident pas si la commande, l'URL ou le transport distant est
  joignable maintenant
- les adaptateurs d'exécution décident des formes de transport qu'ils prennent réellement en charge au moment de l'exécution
- Pi intégré expose les outils MCP configurés dans les profils d'outil normaux `coding` et `messaging` ; `minimal` les masque toujours, et `tools.deny: ["bundle-mcp"]` les désactive explicitement

## Définitions de serveur MCP enregistrées

OpenClaw stocke également un registre léger de serveurs MCP dans la configuration pour les surfaces qui souhaitent des définitions MCP gérées par OpenClaw.

Commandes :

- `openclaw mcp list`
- `openclaw mcp show [name]`
- `openclaw mcp set <name> <json>`
- `openclaw mcp unset <name>`

Remarques :

- `list` trie les noms de serveur.
- `show` sans nom affiche l'objet complet du serveur MCP configuré.
- `set` attend une valeur d'objet JSON sur la ligne de commande.
- `unset` échoue si le serveur nommé n'existe pas.

Exemples :

```bash
openclaw mcp list
openclaw mcp show context7 --json
openclaw mcp set context7 '{"command":"uvx","args":["context7-mcp"]}'
openclaw mcp set docs '{"url":"https://mcp.example.com"}'
openclaw mcp unset context7
```

Exemple de forme de configuration :

```json
{
  "mcp": {
    "servers": {
      "context7": {
        "command": "uvx",
        "args": ["context7-mcp"]
      },
      "docs": {
        "url": "https://mcp.example.com"
      }
    }
  }
}
```

### Transport Stdio

Lance un processus enfant local et communique via stdin/stdout.

| Champ                      | Description                                |
| -------------------------- | ------------------------------------------ |
| `command`                  | Exécutable à lancer (requis)               |
| `args`                     | Tableau des arguments de ligne de commande |
| `env`                      | Variables d'environnement supplémentaires  |
| `cwd` / `workingDirectory` | Répertoire de travail pour le processus    |

#### Filtre de sécurité d'environnement Stdio

OpenClaw rejette les clés d'environnement de démarrage de l'interpréteur qui peuvent modifier la façon dont un serveur MCP stdio démarre avant le premier RPC, même si elles apparaissent dans le bloc `env` d'un serveur. Les clés bloquées incluent `NODE_OPTIONS`, `PYTHONSTARTUP`, `PYTHONPATH`, `PERL5OPT`, `RUBYOPT`, `SHELLOPTS`, `PS4` et des variables de contrôle d'exécution similaires. Le démarrage rejette ces éléments avec une erreur de configuration afin qu'ils ne puissent pas injecter un prélude implicite, échanger l'interpréteur ou activer un débogueur contre le processus stdio. Les variables d'environnement d'identification, de proxy et spécifiques au serveur ordinaires (`GITHUB_TOKEN`, `HTTP_PROXY`, `*_API_KEY` personnalisées, etc.) ne sont pas affectées.

Si votre serveur MCP a réellement besoin de l'une des variables bloquées, définissez-la sur le processus hôte de la passerelle au lieu de sous le `env` du serveur stdio.

### Transport SSE / HTTP

Se connecte à un serveur MCP distant via HTTP Server-Sent Events.

| Champ                 | Description                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------- |
| `url`                 | URL HTTP ou HTTPS du serveur distant (requis)                                               |
| `headers`             | Carte clé-valeur facultative des en-têtes HTTP (par exemple, les jetons d'authentification) |
| `connectionTimeoutMs` | Délai de connexion par serveur en ms (facultatif)                                           |

Exemple :

```json
{
  "mcp": {
    "servers": {
      "remote-tools": {
        "url": "https://mcp.example.com",
        "headers": {
          "Authorization": "Bearer <token>"
        }
      }
    }
  }
}
```

Les valeurs sensibles dans `url` (userinfo) et `headers` sont masquées dans les journaux et
la sortie de statut.

### Transport HTTP diffusable

`streamable-http` est une option de transport supplémentaire aux côtés de `sse` et `stdio`. Il utilise le flux HTTP pour la communication bidirectionnelle avec les serveurs MCP distants.

| Champ                 | Description                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------------- |
| `url`                 | URL HTTP ou HTTPS du serveur distant (requis)                                                                 |
| `transport`           | Définissez sur `"streamable-http"` pour sélectionner ce transport ; en cas d'omission, OpenClaw utilise `sse` |
| `headers`             | Carte clé-valeur facultative des en-têtes HTTP (par exemple, les jetons d'authentification)                   |
| `connectionTimeoutMs` | Délai de connexion par serveur en ms (facultatif)                                                             |

Exemple :

```json
{
  "mcp": {
    "servers": {
      "streaming-tools": {
        "url": "https://mcp.example.com/stream",
        "transport": "streamable-http",
        "connectionTimeoutMs": 10000,
        "headers": {
          "Authorization": "Bearer <token>"
        }
      }
    }
  }
}
```

Ces commandes gèrent uniquement la configuration enregistrée. Elles ne démarrent pas le pont de canal, n'ouvrent pas de session client MCP en direct et ne vérifient pas si le serveur cible est accessible.

## Limites actuelles

Cette page documente le pont tel qu'il est fourni aujourd'hui.

Limites actuelles :

- la découverte de conversation dépend des métadonnées de route de session Gateway existantes
- aucun protocole de push générique au-delà de l'adaptateur spécifique à Claude
- pas encore d'outils d'édition ou de réaction aux messages
- le transport HTTP/SSE/streamable-http se connecte à un seul serveur distant ; pas encore d'amont multiplexé
- `permissions_list_open` n'inclut que les approbations observées pendant que le pont est connecté
