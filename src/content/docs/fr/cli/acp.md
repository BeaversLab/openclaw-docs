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

Si vous souhaitez qu'un client MCP externe communique directement avec les conversations du canal OpenClaw au lieu d'héberger une session de harnais ACP, utilisez plutôt [`openclaw mcp serve`](/fr/cli/mcp).

## Ce que ce n'est pas

Cette page est souvent confondue avec les sessions de harnais ACP.

`openclaw acp` signifie :

- OpenClaw agit comme un serveur ACP
- un IDE ou un client ACP se connecte à OpenClaw
- OpenClaw transfère ce travail vers une session Gateway

Cela est différent de [ACP Agents](/fr/tools/acp-agents), où OpenClaw exécute un harnais externe tel que Codex ou Claude Code via `acpx`.

Règle rapide :

- l'éditeur/le client souhaite parler ACP à OpenClaw : utilisez `openclaw acp`
- OpenClaw doit lancer Codex/Claude/Gemini en tant que harnais ACP : utilisez `/acp spawn` et [ACP Agents](/fr/tools/acp-agents)

## Matrix de compatibilité

| Zone ACP                                                                           | Statut             | Notes                                                                                                                                                                                                                                                                                                                                   |
| ---------------------------------------------------------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `initialize`, `newSession`, `prompt`, `cancel`                                     | Implémenté         | Flux de pont principal via stdio vers chat/envoi + abandon du Gateway.                                                                                                                                                                                                                                                                  |
| `listSessions`, commandes slash                                                    | Implémenté         | La liste de sessions fonctionne sur l'état de session du Gateway ; les commandes sont annoncées via `available_commands_update`.                                                                                                                                                                                                        |
| `loadSession`                                                                      | Partiel            | Relie la session ACP à une clé de session Gateway et rejoue l'historique du texte utilisateur/assistant stocké. L'historique des outils/système n'est pas encore reconstruit.                                                                                                                                                           |
| Contenu du prompt (`text`, `resource` intégré, images)                             | Partiel            | Le texte/les ressources sont aplatis dans l'entrée de chat ; les images deviennent des pièces jointes Gateway.                                                                                                                                                                                                                          |
| Modes de session                                                                   | Partiel            | `session/set_mode` est pris en charge et le pont expose des contrôles de session initiaux pris en charge par Gateway pour le niveau de réflexion, la verbosité des outils, le raisonnement, les détails d'utilisation et les actions élevées. Les surfaces de mode/configuration plus larges natives à l'ACP sont toujours hors portée. |
| Informations de session et mises à jour de l'utilisation                           | Partiel            | Le pont émet des notifications `session_info_update` et `usage_update` de meilleure qualité à partir d'instantanés de session Gateway mis en cache. L'utilisation est approximative et n'est envoyée que lorsque les totaux de jetons Gateway sont marqués comme frais.                                                                 |
| Streaming d'outils                                                                 | Partiel            | Les événements `tool_call` / `tool_call_update` incluent les E/S brutes, le contenu textuel et les emplacements de fichiers de meilleure qualité lorsque les arguments/résultats d'outil Gateway les exposent. Les terminaux intégrés et les sorties natives de diff plus riches ne sont toujours pas exposés.                          |
| Serveurs MCP par session (`mcpServers`)                                            | Non pris en charge | Le mode pont rejette les requêtes de serveur MCP par session. Configurez plutôt MCP sur la passerelle OpenClaw ou sur l'agent.                                                                                                                                                                                                          |
| Méthodes du système de fichiers client (`fs/read_text_file`, `fs/write_text_file`) | Non pris en charge | Le pont n'appelle pas les méthodes du système de fichiers client ACP.                                                                                                                                                                                                                                                                   |
| Méthodes de terminal client (`terminal/*`)                                         | Non pris en charge | Le pont ne crée pas de terminaux client ACP ni ne diffuse les identifiants de terminal via les appels d'outils.                                                                                                                                                                                                                         |
| Plans de session / diffusion des pensées                                           | Non pris en charge | Le pont émet actuellement du texte de sortie et l'état des outils, et non les mises à jour de plan ou de pensée ACP.                                                                                                                                                                                                                    |

## Limitations connues

- `loadSession` rejoue l'historique du texte stocké de l'utilisateur et de l'assistant, mais il ne reconstruit pas
  les appels d'outils historiques, les avis système ou les types d'événements
  plus riches natifs ACP.
- Si plusieurs clients ACP partagent la même clé de session Gateway, le routage des événements et des annulations
  est de meilleure qualité plutôt que strictement isolé par client. Préférez les
  sessions `acp:<uuid>` isolées par défaut lorsque vous avez besoin de tours locaux à l'éditeur
  propres.
- Les états d'arrêt Gateway sont traduits en motifs d'arrêt ACP, mais ce mappage est
  moins expressif qu'un runtime entièrement natif ACP.
- Les contrôles de session initiaux exposent actuellement un sous-ensemble concentré de paramètres Gateway :
  niveau de pensée, verbosité des outils, raisonnement, détails de l'utilisation et actions
  élevées. La sélection du modèle et les contrôles d'hôte d'exécution ne sont pas encore exposés en tant qu'options de configuration ACP.
- `session_info_update` et `usage_update` sont dérivés des instantanés de session
  Gateway, et non de la comptabilité runtime native ACP en direct. L'utilisation est approximative,
  ne contient aucune donnée de coût et n'est émise que lorsque le Gateway marque les données totales de jetons
  comme fraîches.
- Les données de suivi des outils sont sur la base du meilleur effort. Le pont peut afficher les chemins de fichiers qui apparaissent dans les arguments/résultats d'outils connus, mais il n'émet pas encore de terminaux ACP ou de diffs de fichiers structurés.

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

Modèle d'autorisation (mode débogage client) :

- L'approbation automatique est basée sur une liste blanche et ne s'applique qu'aux identifiants d'outils principaux de confiance.
- L'auto-approbation `read` est limitée au répertoire de travail actuel (`--cwd` lorsque défini).
- ACP n'approuve automatiquement que les classes en lecture seule étroites : les appels `read` délimités sous le cwd actif plus les outils de recherche en lecture seule (`search`, `web_search`, `memory_search`). Les outils inconnus/non principaux, les lectures hors portée, les outils capables d'exécution, les outils du plan de contrôle, les outils de mutation et les flux interactifs nécessitent toujours une approbation explicite de l'invite.
- Le `toolCall.kind` fourni par le serveur est traité comme des métadonnées non fiables (pas une source d'autorisation).
- Cette stratégie de pont ACP est distincte des autorisations du harnais ACPX. Si vous exécutez OpenClaw via le backend `acpx`, `plugins.entries.acpx.config.permissionMode=approve-all` est l'interrupteur « yolo » de brise-glace pour cette session de harnais.

## Comment utiliser ceci

Utilisez ACP lorsqu'un IDE (ou un autre client) parle l'Agent Client Protocol et que vous souhaitez qu'il pilote une session OpenClaw Gateway.

1. Assurez-vous que le Gateway est en cours d'exécution (local ou distant).
2. Configurez la cible du Gateway (configuration ou drapeaux).
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

ACP ne choisit pas directement les agents. Il achemine via la clé de session du Gateway.

Utilisez des clés de session délimitées par agent pour cibler un agent spécifique :

```bash
openclaw acp --session agent:main:main
openclaw acp --session agent:design:main
openclaw acp --session agent:qa:bug-123
```

Chaque session ACP correspond à une seule clé de session Gateway. Un agent peut avoir plusieurs sessions ; ACP utilise par défaut une session `acp:<uuid>` isolée, sauf si vous remplacez la clé ou l'étiquette.

Les `mcpServers` par session ne sont pas pris en charge en mode pont. Si un client ACP
les envoie pendant `newSession` ou `loadSession`, le pont renvoie une erreur
claire au lieu de les ignorer silencieusement.

Si vous souhaitez que les sessions prises en charge par ACPX voient les outils de plugin OpenClaw ou les outils intégrés sélectionnés tels que `cron`, activez les ponts MCP ACPX côté OpenClaw au lieu d'essayer de transmettre des `mcpServers` par session. Voir [ACP Agents](/fr/tools/acp-agents#plugin-tools-mcp-bridge) et [Pont MCP des outils OpenClaw](/fr/tools/acp-agents#openclaw-tools-mcp-bridge).

## Utilisation depuis `acpx` (Codex, Claude, autres clients ACP)

Si vous souhaitez qu'un agent de codage tel que Codex ou Claude Code communique avec votre bot OpenClaw via ACP, utilisez `acpx` avec sa cible intégrée `openclaw`.

Flux typique :

1. Exécutez le Gateway et assurez-vous que le pont ACP peut l'atteindre.
2. Faites pointer `acpx openclaw` vers `openclaw acp`.
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

Si vous souhaitez que `acpx openclaw` cible une Gateway et une clé de session spécifiques à chaque fois, remplacez la commande d'agent `openclaw` dans `~/.acpx/config.json` :

```json
{
  "agents": {
    "openclaw": {
      "command": "env OPENCLAW_HIDE_BANNER=1 OPENCLAW_SUPPRESS_NOTES=1 openclaw acp --url ws://127.0.0.1:18789 --token-file ~/.openclaw/gateway.token --session agent:main:main"
    }
  }
}
```

Pour un checkout OpenClaw local au dépôt, utilisez le point d'entrée CLI direct au lieu du
lanceur de développement afin que le flux ACP reste propre. Par exemple :

```bash
env OPENCLAW_HIDE_BANNER=1 OPENCLAW_SUPPRESS_NOTES=1 node openclaw.mjs acp ...
```

C'est le moyen le plus simple de permettre à Codex, Claude Code ou un autre client compatible ACP
de tirer des informations contextuelles d'un agent OpenClaw sans récupérer le contenu d'un terminal.

## Configuration de l'éditeur Zed

Ajoutez un agent ACP personnalisé dans `~/.config/zed/settings.json` (ou utilisez l'interface utilisateur des paramètres de Zed) :

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

Dans Zed, ouvrez le panneau Agent et sélectionnez « OpenClaw ACP » pour démarrer un fil de discussion.

## Mappage de session

Par défaut, les sessions ACP obtiennent une clé de session Gateway isolée avec un préfixe `acp:`.
Pour réutiliser une session connue, transmettez une clé de session ou une étiquette :

- `--session <key>` : utilisez une clé de session Gateway spécifique.
- `--session-label <label>` : résout une session existante par étiquette.
- `--reset-session` : génère un identifiant de session frais pour cette clé (même clé, nouveau transcript).

Si votre client ACP prend en charge les métadonnées, vous pouvez les remplacer par session :

```json
{
  "_meta": {
    "sessionKey": "agent:main:main",
    "sessionLabel": "support inbox",
    "resetSession": true
  }
}
```

En savoir plus sur les clés de session sur [/concepts/session](/fr/concepts/session).

## Options

- `--url <url>` : URL WebSocket de la Gateway (par défaut gateway.remote.url lorsque configuré).
- `--token <token>` : jeton d'authentification du Gateway.
- `--token-file <path>` : lire le jeton d'authentification du Gateway depuis un fichier.
- `--password <password>` : mot de passe d'authentification du Gateway.
- `--password-file <path>` : lire le mot de passe d'authentification du Gateway depuis un fichier.
- `--session <key>` : clé de session par défaut.
- `--session-label <label>` : label de session par défaut à résoudre.
- `--require-existing` : échoue si la clé/label de session n'existe pas.
- `--reset-session` : réinitialiser la clé de session avant la première utilisation.
- `--no-prefix-cwd` : ne pas préfixer les invites avec le répertoire de travail.
- `--provenance <off|meta|meta+receipt>` : inclure les métadonnées de provenance ACP ou les reçus.
- `--verbose, -v` : journalisation détaillée vers stderr.

Note de sécurité :

- `--token` et `--password` peuvent être visibles dans les listes de processus locaux sur certains systèmes.
- Privilégiez `--token-file`/`--password-file` ou les variables d'environnement (`OPENCLAW_GATEWAY_TOKEN`, `OPENCLAW_GATEWAY_PASSWORD`).
- La résolution d'authentification du Gateway suit le contrat partagé utilisé par les autres clients du Gateway :
  - mode local : env (`OPENCLAW_GATEWAY_*`) -> `gateway.auth.*` -> `gateway.remote.*` repli uniquement lorsque `gateway.auth.*` n'est pas défini (les SecretRefs locaux configurés mais non résolus échouent en mode fermé)
  - mode distant : `gateway.remote.*` avec repli env/config selon les règles de priorité distantes
  - `--url` est sécurisé contre le remplacement et ne réutilise pas les identifiants implicites config/env ; passez des `--token`/`--password` explicites (ou variantes de fichier)
- Les processus enfants du backend d'exécution ACP reçoivent `OPENCLAW_SHELL=acp`, qui peut être utilisé pour des règles shell/profil spécifiques au contexte.
- `openclaw acp client` définit `OPENCLAW_SHELL=acp-client` sur le processus de pont généré.

### options `acp client`

- `--cwd <dir>` : répertoire de travail pour la session ACP.
- `--server <command>` : commande du serveur ACP (par défaut : `openclaw`).
- `--server-args <args...>` : arguments supplémentaires passés au serveur ACP.
- `--server-verbose` : activer la journalisation détaillée sur le serveur ACP.
- `--verbose, -v` : journalisation détaillée du client.
