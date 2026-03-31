---
summary: "Exécutez le pont ACP pour les intégrations IDE"
read_when:
  - Setting up ACP-based IDE integrations
  - Debugging ACP session routing to the Gateway
title: "acp"
---

# acp

Exécutez le pont [Agent Client Protocol (ACP)](https://agentclientprotocol.com/) qui communique avec une OpenClaw Gateway.

Cette commande communique en ACP via stdio pour les IDE et transfère les invites au Gateway
via WebSocket. Elle maintient les sessions ACP mappées aux clés de session Gateway.

`openclaw acp` est un pont ACP pris en charge par Gateway, et non un environnement d'exécution d'éditeur entièrement natif ACP.
Il se concentre sur le routage des sessions, la livraison des invites et les mises à jour de
streaming de base.

Si vous souhaitez qu'un client MCP externe communique directement avec les conversations de la OpenClaw
au lieu d'héberger une session harnais ACP, utilisez
[`openclaw mcp serve`](/en/cli/mcp) à la place.

## Matrix de compatibilité

| Zone ACP                                                                           | Statut             | Notes                                                                                                                                                                                                                                                                                                                |
| ---------------------------------------------------------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `initialize`, `newSession`, `prompt`, `cancel`                                     | Implémenté         | Flux de pont principal via stdio vers chat/send + abort de la Gateway.                                                                                                                                                                                                                                               |
| `listSessions`, commandes slash                                                    | Implémenté         | La liste de session fonctionne avec l'état de session de la Gateway ; les commandes sont annoncées via `available_commands_update`.                                                                                                                                                                                  |
| `loadSession`                                                                      | Partiel            | Lie la session ACP à une clé de session Gateway et rejoue l'historique textuel stocké de l'utilisateur/assistant. L'historique des outils/système n'est pas encore reconstruit.                                                                                                                                      |
| Contenu du prompt (`text`, `resource` intégrés, images)                            | Partiel            | Le texte/les ressources sont aplatis dans l'entrée du chat ; les images deviennent des pièces jointes Gateway.                                                                                                                                                                                                       |
| Modes de session                                                                   | Partiel            | `session/set_mode` est pris en charge et le pont expose des contrôles de session initiaux basés sur Gateway pour le niveau de pensée, la verbosité des outils, le raisonnement, les détails d'utilisation et les actions élevées. Les surfaces de mode/configuration natives ACP plus larges restent hors de portée. |
| Informations de session et mises à jour de l'utilisation                           | Partiel            | Le pont émet des notifications `session_info_update` et `usage_update` de meilleur effort à partir de clichés de session Gateway mis en cache. L'utilisation est approximative et n'est envoyée que lorsque les totaux de jetons Gateway sont marqués comme frais.                                                   |
| Diffusion d'outils                                                                 | Partiel            | Les événements `tool_call` / `tool_call_update` incluent les E/S brutes, le contenu textuel et les meilleurs emplacements de fichiers possibles lorsque les arguments/résultats d'outil Gateway les exposent. Les terminaux intégrés et la sortie plus riche native aux différences ne sont toujours pas exposés.    |
| Serveurs MCP par session (`mcpServers`)                                            | Non pris en charge | Le mode pont rejette les requêtes de serveur MCP par session. Configurez plutôt MCP sur la passerelle OpenClaw ou l'agent.                                                                                                                                                                                           |
| Méthodes de système de fichiers client (`fs/read_text_file`, `fs/write_text_file`) | Non pris en charge | Le pont n'appelle pas les méthodes de système de fichiers client ACP.                                                                                                                                                                                                                                                |
| Méthodes de terminal client (`terminal/*`)                                         | Non pris en charge | Le pont ne crée pas de terminaux client ACP ni ne diffuse d'identifiants de terminal via les appels d'outils.                                                                                                                                                                                                        |
| Plans de session / diffusion des pensées                                           | Non pris en charge | Le pont émet actuellement du texte de sortie et le statut de l'outil, mais pas les plans ou les mises à jour de pensée de l'ACP.                                                                                                                                                                                     |

## Limitations connues

- `loadSession` rejoue l'historique du texte stocké de l'utilisateur et de l'assistant, mais il ne
  reconstruit pas les appels d'outil historiques, les avis système, ou les types d'événements
  plus riches natifs de l'ACP.
- Si plusieurs clients ACP partagent la même clé de session Gateway, le routage des événements et des annulations
  est au meilleur effort plutôt que strictement isolé par client. Préférez les
  sessions `acp:<uuid>` isolées par défaut lorsque vous avez besoin de tours
  propres et locaux à l'éditeur.
- Les états d'arrêt Gateway sont traduits en raisons d'arrêt ACP, mais ce mappage est
  moins expressif qu'un runtime entièrement natif ACP.
- Les contrôles de session initiaux exposent actuellement un sous-ensemble ciblé de boutons Gateway :
  niveau de pensée, verbosité de l'outil, raisonnement, détails d'utilisation et actions
  élevées. La sélection du modèle et les contrôles d'exécution hôte ne sont pas encore exposés en tant qu'options
  de configuration ACP.
- `session_info_update` et `usage_update` sont dérivés des instantanés de session Gateway, et non de la comptabilité d'exécution native ACP en temps réel. L'utilisation est approximative, ne contient aucune donnée de coût et n'est émise que lorsque le Gateway marque les données totales de jetons comme fraîches.
- Les données de suivi des outils sont sur la base du meilleur effort. Le pont peut afficher les chemins de fichiers qui apparaissent dans les arguments/résultats d'outils connus, mais il n'émet pas encore les terminaux ACP ni les diffs de fichiers structurés.

## Utilisation

```bash
openclaw acp

# Remote Gateway
openclaw acp --url wss://gateway-host:18789 --token <token>

# Remote Gateway (token from file)
openclaw acp --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token

# Attach to an existing session key
openclaw acp --session agent:main:main

# Attach by label (must already exist)
openclaw acp --session-label "support inbox"

# Reset the session key before the first prompt
openclaw acp --session agent:main:main --reset-session
```

## Client ACP (débogage)

Utilisez le client ACP intégré pour vérifier le pont sans IDE. Il lance le pont ACP et vous permet de saisir des invites de manière interactive.

```bash
openclaw acp client

# Point the spawned bridge at a remote Gateway
openclaw acp client --server-args --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token

# Override the server command (default: openclaw)
openclaw acp client --server "node" --server-args openclaw.mjs acp --url ws://127.0.0.1:19001
```

Modèle d'autorisation (mode de débogage client) :

- L'approbation automatique est basée sur une liste d'autorisation et ne s'applique qu'aux ID d'outils principaux de confiance.
- L'approbation automatique `read` est limitée au répertoire de travail actuel (`--cwd` lorsqu'il est défini).
- Les noms d'outils inconnus ou non principaux, les lectures hors portée et les outils dangereux nécessitent toujours une approbation explicite via une invite.
- Le `toolCall.kind` fourni par le serveur est traité comme des métadonnées non fiables (et non comme une source d'autorisation).

## Comment utiliser ceci

Utilisez ACP lorsqu'un IDE (ou un autre client) parle le protocole Agent Client Protocol et que vous souhaitez
qu'il pilote une session OpenClaw Gateway.

1. Assurez-vous que le Gateway est en cours d'exécution (local ou distant).
2. Configurez la cible du Gateway (config ou indicateurs).
3. Pointez votre IDE pour exécuter `openclaw acp` via stdio.

Exemple de configuration (persistante) :

```bash
openclaw config set gateway.remote.url wss://gateway-host:18789
openclaw config set gateway.remote.token <token>
```

Exemple d'exécution directe (sans écriture de configuration) :

```bash
openclaw acp --url wss://gateway-host:18789 --token <token>
# preferred for local process safety
openclaw acp --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token
```

## Sélection des agents

ACP ne choisit pas les agents directement. Il achemine par la clé de session Gateway.

Utilisez des clés de session avec portée d'agent pour cibler un agent spécifique :

```bash
openclaw acp --session agent:main:main
openclaw acp --session agent:design:main
openclaw acp --session agent:qa:bug-123
```

Chaque session ACP correspond à une seule clé de session Gateway. Un agent peut avoir plusieurs sessions ; ACP utilise par défaut une session `acp:<uuid>` isolée, sauf si vous remplacez la clé ou l'étiquette.

Les `mcpServers` par session ne sont pas prises en charge en mode pont. Si un client ACP les envoie pendant `newSession` ou `loadSession`, le pont renvoie une erreur claire au lieu de les ignorer silencieusement.

## Utilisation depuis `acpx` (Codex, Claude, autres clients ACP)

Si vous souhaitez qu'un agent de codage tel que Codex ou Claude Code communique avec votre bot OpenClaw via ACP, utilisez `acpx` avec sa cible `openclaw` intégrée.

Flux typique :

1. Lancez la Gateway et assurez-vous que le pont ACP peut l'atteindre.
2. Pointez `acpx openclaw` vers `openclaw acp`.
3. Ciblez la clé de session OpenClaw que vous souhaitez que l'agent de codage utilise.

Exemples :

```bash
# One-shot request into your default OpenClaw ACP session
acpx openclaw exec "Summarize the active OpenClaw session state."

# Persistent named session for follow-up turns
acpx openclaw sessions ensure --name codex-bridge
acpx openclaw -s codex-bridge --cwd /path/to/repo \
  "Ask my OpenClaw work agent for recent context relevant to this repo."
```

Si vous souhaitez que `acpx openclaw` cible un Gateway et une clé de session spécifiques à chaque fois, remplacez la commande agent `openclaw` dans `~/.acpx/config.json` :

```json
{
  "agents": {
    "openclaw": {
      "command": "env OPENCLAW_HIDE_BANNER=1 OPENCLAW_SUPPRESS_NOTES=1 openclaw acp --url ws://127.0.0.1:18789 --token-file ~/.openclaw/gateway.token --session agent:main:main"
    }
  }
}
```

Pour un checkout OpenClaw local au dépôt, utilisez le point d'entrée CLI direct au lieu du dev runner afin que le flux ACP reste propre. Par exemple :

```bash
env OPENCLAW_HIDE_BANNER=1 OPENCLAW_SUPPRESS_NOTES=1 node openclaw.mjs acp ...
```

C'est le moyen le plus simple de permettre à Codex, Claude Code ou un autre client compatible ACP d'extraire des informations contextuelles d'un agent OpenClaw sans avoir à scraper un terminal.

## Configuration de l'éditeur Zed

Ajoutez un agent ACP personnalisé dans `~/.config/zed/settings.json` (ou utilisez l'interface des paramètres de Zed) :

```json
{
  "agent_servers": {
    "OpenClaw ACP": {
      "type": "custom",
      "command": "openclaw",
      "args": ["acp"],
      "env": {}
    }
  }
}
```

Pour cibler un Gateway ou un agent spécifique :

```json
{
  "agent_servers": {
    "OpenClaw ACP": {
      "type": "custom",
      "command": "openclaw",
      "args": ["acp", "--url", "wss://gateway-host:18789", "--token", "<token>", "--session", "agent:design:main"],
      "env": {}
    }
  }
}
```

Dans Zed, ouvrez le panneau Agent et sélectionnez « OpenClaw ACP » pour démarrer une discussion.

## Mapping de session

Par défaut, les sessions ACP obtiennent une clé de session Gateway isolée avec un préfixe `acp:`.
Pour réutiliser une session connue, transmettez une clé ou une étiquette de session :

- `--session <key>` : utiliser une clé de session Gateway spécifique.
- `--session-label <label>` : résoudre une session existante par étiquette.
- `--reset-session` : créer un identifiant de session frais pour cette clé (même clé, nouveau transcript).

Si votre client ACP prend en charge les métadonnées, vous pouvez remplacer par session :

```json
{
  "_meta": {
    "sessionKey": "agent:main:main",
    "sessionLabel": "support inbox",
    "resetSession": true
  }
}
```

En savoir plus sur les clés de session sur [/concepts/session](/en/concepts/session).

## Options

- `--url <url>` : URL WebSocket du Gateway (par défaut gateway.remote.url lorsque configuré).
- `--token <token>` : jeton d'authentification du Gateway.
- `--token-file <path>` : lire le jeton d'authentification du Gateway depuis un fichier.
- `--password <password>` : mot de passe d'authentification du Gateway.
- `--password-file <path>` : lire le mot de passe d'authentification du Gateway depuis un fichier.
- `--session <key>` : clé de session par défaut.
- `--session-label <label>` : étiquette de session par défaut à résoudre.
- `--require-existing` : échoue si la clé/étiquette de session n'existe pas.
- `--reset-session` : réinitialise la clé de session avant la première utilisation.
- `--no-prefix-cwd` : ne pas préfixer les invites avec le répertoire de travail.
- `--verbose, -v` : journalisation détaillée vers stderr.

Note de sécurité :

- `--token` et `--password` peuvent être visibles dans les listes de processus locaux sur certains systèmes.
- Privilégiez `--token-file`/`--password-file` ou les variables d'environnement (`OPENCLAW_GATEWAY_TOKEN`, `OPENCLAW_GATEWAY_PASSWORD`).
- La résolution d'authentification du Gateway suit le contrat partagé utilisé par d'autres clients Gateway :
  - mode local : env (`OPENCLAW_GATEWAY_*`) -> `gateway.auth.*` -> `gateway.remote.*` repli uniquement lorsque `gateway.auth.*` n'est pas défini (les SecretRefs locaux configurés mais non résolus échouent en mode fermé)
  - mode distant : `gateway.remote.*` avec repli env/config selon les règles de priorité distantes
  - `--url` est sécurisé contre le remplacement et ne réutilise pas les identifiants implicites de config/env ; passez `--token`/`--password` explicites (ou variantes de fichier)
- Les processus enfants du backend d'exécution ACP reçoivent `OPENCLAW_SHELL=acp`, qui peut être utilisé pour des règles shell/profile spécifiques au contexte.
- `openclaw acp client` définit `OPENCLAW_SHELL=acp-client` sur le processus de pont généré.

### options `acp client`

- `--cwd <dir>` : répertoire de travail pour la session ACP.
- `--server <command>` : commande du serveur ACP (par défaut : `openclaw`).
- `--server-args <args...>` : arguments supplémentaires passés au serveur ACP.
- `--server-verbose` : activer la journalisation détaillée sur le serveur ACP.
- `--verbose, -v` : journalisation détaillée du client.
