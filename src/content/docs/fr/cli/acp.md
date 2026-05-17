---
summary: "Exécuter le pont ACP pour les intégrations IDE"
read_when:
  - Setting up ACP-based IDE integrations
  - Debugging ACP session routing to the Gateway
title: "ACP"
---

Exécutez le pont [Agent Client Protocol (ACP)](https://agentclientprotocol.com/) qui communique avec une passerelle OpenClaw Gateway.

Cette commande parle ACP via stdio pour les IDE et transfère les invites vers la Gateway
via WebSocket. Elle maintient les sessions ACP mappées aux clés de session Gateway.

`openclaw acp` est un pont ACP pris en charge par une Gateway, et non un environnement d'exécution d'éditeur entièrement natif ACP. Il se concentre sur le routage de session, la livraison de invites et les mises à jour de streaming de base.

Si vous souhaitez qu'un client MCP externe communique directement avec les conversations de canal OpenClaw au lieu d'héberger une session de harnais ACP, utilisez plutôt [`openclaw mcp serve`](/fr/cli/mcp).

## Ce que ce n'est pas

Cette page est souvent confondue avec les sessions de harnais ACP.

`openclaw acp` signifie :

- OpenClaw agit comme un serveur ACP
- un IDE ou un client ACP se connecte à OpenClaw
- OpenClaw transfère ce travail dans une session Gateway

Cela diffère des [ACP Agents](/fr/tools/acp-agents), où OpenClaw exécute un harnais externe tel que Codex ou Claude Code via `acpx`.

Règle rapide :

- éditeur/client souhaite parler ACP à OpenClaw : utilisez `openclaw acp`
- OpenClaw devrait lancer Codex/Claude/Gemini en tant que harnais ACP : utilisez `/acp spawn` et [ACP Agents](/fr/tools/acp-agents)

## Matrice de compatibilité

| Zone ACP                                                                           | Statut             | Notes                                                                                                                                                                                                                                                                                                                 |
| ---------------------------------------------------------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `initialize`, `newSession`, `prompt`, `cancel`                                     | Implémenté         | Flux de pont principal via stdio vers le chat/envoi + abandon de la Gateway.                                                                                                                                                                                                                                          |
| `listSessions`, commandes slash                                                    | Implémenté         | La liste de sessions fonctionne sur l'état de session du Gateway avec une pagination par curseur limitée et un filtrage `cwd` où les lignes de session du Gateway contiennent des métadonnées d'espace de travail ; les commandes sont annoncées via `available_commands_update`.                                     |
| Métadonnées de lignée de session                                                   | Implémenté         | Les listes de sessions et les instantanés d'informations de session incluent la lignée parent et enfant OpenClaw dans `_meta` afin que les clients ACP puissent restituer les graphiques de sous-agents sans canaux latéraux privés de Gateway.                                                                       |
| `resumeSession`, `closeSession`                                                    | Implémenté         | Resume relie une session ACP à une session Gateway existante sans rejouer l'historique. Close annule le travail actif du pont, résout les invites en attente comme annulées et libère l'état de la session du pont.                                                                                                   |
| `loadSession`                                                                      | Partiel            | Relie la session ACP à une clé de session Gateway et rejoue l'historique du registre des événements ACP pour les sessions créées par le pont. Les sessions plus anciennes ou sans registre reviennent au texte utilisateur/assistant stocké.                                                                          |
| Contenu de l'invite (`text`, `resource` intégré, images)                           | Partiel            | Le texte/les ressources sont aplaties dans la saisie du chat ; les images deviennent des pièces jointes Gateway.                                                                                                                                                                                                      |
| Modes de session                                                                   | Partiel            | `session/set_mode` est pris en charge et le pont expose des contrôles de session initiaux soutenus par Gateway pour le niveau de pensée, la verbosité de l'outil, le raisonnement, le détail d'utilisation et les actions élevées. Des surfaces de mode/configuration plus larges natives ACP restent hors de portée. |
| Informations de session et mises à jour d'utilisation                              | Partiel            | Le pont émet des notifications `session_info_update` et `usage_update` de meilleur effort à partir d'instantanés de session Gateway mis en cache. L'utilisation est approximative et envoyée uniquement lorsque les totaux de jetons Gateway sont marqués comme frais.                                                |
| Flux de tool                                                                       | Partiel            | Les événements `tool_call` / `tool_call_update` incluent les E/S brutes, le contenu textuel et les emplacements de fichiers de meilleur effort lorsque les arguments/résultats de tool Gateway les exposent. Les terminaux intégrés et les sorties plus riches natives aux différences ne sont toujours pas exposés.  |
| Approbations d'exécution                                                           | Partiel            | Les invites d'approbation d'exécution Gateway pendant les tours d'invite ACP actifs sont relayées au client ACP avec `session/request_permission`.                                                                                                                                                                    |
| Serveurs MCP par session (`mcpServers`)                                            | Non pris en charge | Le mode pont rejette les requêtes de serveur MCP par session. Configurez MCP sur la passerelle OpenClaw ou sur l'agent à la place.                                                                                                                                                                                    |
| Méthodes de système de fichiers client (`fs/read_text_file`, `fs/write_text_file`) | Non pris en charge | Le pont n'appelle pas les méthodes de système de fichiers du client ACP.                                                                                                                                                                                                                                              |
| Méthodes de terminal client (`terminal/*`)                                         | Non pris en charge | Le pont ne crée pas de terminaux client ACP ni ne diffuse les identifiants de terminal via les appels de tool.                                                                                                                                                                                                        |
| Plans de session / diffusion de pensées                                            | Non pris en charge | Le pont émet actuellement le texte de sortie et le statut du tool, et non les mises à jour du plan ou des pensées ACP.                                                                                                                                                                                                |

## Limitations connues

- `loadSession` peut rejouer l'historique complet du grand livre d'événements ACP uniquement pour
  les sessions créées par le pont. Les sessions plus anciennes ou sans grand livre utilisent toujours le mode de secours
  de la transcription et ne reconstruisent pas les appels de tool historiques ni les avis système.
- Si plusieurs clients ACP partagent la même clé de session Gateway, le routage des événements et des annulations
  est de meilleur effort plutôt que strictement isolé par client. Préférez les
  sessions isolées `acp:<uuid>` par défaut lorsque vous avez besoin de tours
  propres et locaux à l'éditeur.
- Les états d'arrêt Gateway sont traduits en motifs d'arrêt ACP, mais ce mappage est
  moins expressif qu'un environnement d'exécution entièrement natif ACP.
- Les contrôles de session initiaux exposent actuellement un sous-ensemble ciblé de paramètres du Gateway : niveau de réflexion, verbosité des outils, raisonnement, détails d'utilisation et actions élevées. La sélection de modèle et les contrôles de l'hôte d'exécution ne sont pas encore exposés en tant qu'options de configuration ACP.
- `session_info_update` et `usage_update` sont dérivés des instantanés de session du Gateway, et non de la comptabilité d'exécution native ACP en direct. L'utilisation est approximative, ne contient aucune donnée de coûts et n'est émise que lorsque le Gateway marque les données totales de jetons comme étant à jour.
- Les données de suivi des outils sont fournies au meilleur effort. Le pont peut afficher les chemins de fichiers qui apparaissent dans les arguments/résultats d'outils connus, mais il n'émet pas encore de terminaux ACP ni de diffs de fichiers structurés.
- Le relais d'approbation d'exécution est limité au tour d'invite ACP actif ; les approbations d'autres sessions du Gateway sont ignorées.

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

## Client ACP (debug)

Utilisez le client ACP intégré pour vérifier la santé du pont sans IDE. Il lance le pont ACP et vous permet de saisir des invites de manière interactive.

```bash
openclaw acp client

# Point the spawned bridge at a remote Gateway
openclaw acp client --server-args --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token

# Override the server command (default: openclaw)
openclaw acp client --server "node" --server-args openclaw.mjs acp --url ws://127.0.0.1:19001
```

Modèle d'autorisation (mode de débogage client) :

- L'auto-approbation est basée sur une liste blanche et s'applique uniquement aux ID d'outils principaux de confiance.
- L'auto-approbation `read` est limitée au répertoire de travail actuel (`--cwd` lorsque défini).
- ACP n'approuve automatiquement que les classes en lecture seule étroites : appels `read` délimités sous le cwd actif plus les outils de recherche en lecture seule (`search`, `web_search`, `memory_search`). Les outils inconnus/non principaux, les lectures hors portée, les outils capables d'exécution, les outils du plan de contrôle, les outils de mutation et les flux interactifs nécessitent toujours une approbation explicite de l'invite.
- Le `toolCall.kind` fourni par le serveur est traité comme des métadonnées non fiables (pas une source d'autorisation).
- Cette politique de pont ACP est distincte des autorisations du harnais ACPX. Si vous exécutez OpenClaw via le backend `acpx`, `plugins.entries.acpx.config.permissionMode=approve-all` est l'interrupteur de secours "yolo" pour cette session de harnais.

## Test de fumée du protocole

Pour le débogage au niveau du protocole, démarrez un Gateway avec un état isolé et pilotez `openclaw acp` via stdio avec un client ACP JSON-RPC. Couvrez `initialize`, `session/new`, `session/list` avec un `cwd` absolu, `session/resume`, `session/close`, une fermeture en double et une reprise manquante.

La preuve doit inclure les capacités de cycle de vie annoncées, une ligne de Gateway-backed session, les notifications de mise à jour et le journal `sessions.list` du Gateway :

```json
{
  "initialize": {
    "protocolVersion": 1,
    "agentCapabilities": {
      "sessionCapabilities": {
        "list": {},
        "resume": {},
        "close": {}
      }
    }
  },
  "listSessions": {
    "sessions": [
      {
        "sessionId": "agent:main:acp-smoke",
        "cwd": "/path/to/workspace",
        "_meta": {
          "sessionKey": "agent:main:acp-smoke",
          "kind": "direct"
        }
      }
    ],
    "nextCursor": null
  },
  "notifications": ["session_info_update", "available_commands_update", "usage_update"],
  "gatewayLogTail": ["[gateway] ready", "[ws] ⇄ res ✓ sessions.list 305ms"]
}
```

Évitez d'utiliser `openclaw gateway call sessions.list` comme seule preuve ACP. Ce chemin CLI peut demander une mise à niveau de l'étendue de l'opérateur avec un nouveau jeton ; la correction du pont ACP est prouvée par les trames stdio ACP ainsi que par le journal `sessions.list` du Gateway.

## Comment utiliser ceci

Utilisez ACP lorsqu'un IDE (ou un autre client) parle Agent Client Protocol et que vous souhaitez qu'il pilote une session OpenClaw Gateway.

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

ACP ne choisit pas les agents directement. Il achemine par la clé de session du Gateway.

Utilisez des clés de session avec portée d'agent pour cibler un agent spécifique :

```bash
openclaw acp --session agent:main:main
openclaw acp --session agent:design:main
openclaw acp --session agent:qa:bug-123
```

Chaque session ACP correspond à une seule clé de session Gateway. Un agent peut avoir plusieurs sessions ; ACP par défaut à une session `acp:<uuid>` isolée, sauf si vous remplacez la clé ou l'étiquette.

Les `mcpServers` par session ne sont pas prises en charge en mode pont. Si un client ACP les envoie pendant `newSession` ou `loadSession`, le pont renvoie une erreur claire au lieu de les ignorer silencieusement.

Si vous souhaitez que les sessions ACPX puissent voir les outils du plugin OpenClaw ou certains outils intégrés tels que `cron`, activez les ponts MCP ACPX côté Gateway au lieu d'essayer de passer des `mcpServers` par session. Voir [ACP Agents](/fr/tools/acp-agents-setup#plugin-tools-mcp-bridgeOpenClaw) et [OpenClaw tools MCP bridge](/fr/tools/acp-agents-setup#openclaw-tools-mcp-bridge).

## Utilisation depuis `acpx` (Codex, Claude, autres clients ACP)

Si vous souhaitez qu'un agent de codage tel que Codex ou Claude Code communique avec votre bot OpenClaw via ACP, utilisez `acpx` avec sa cible intégrée `openclaw`.

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

Si vous souhaitez que `acpx openclaw` cible une Gateway et une clé de session spécifiques à chaque fois, remplacez la commande de l'agent `openclaw` dans `~/.acpx/config.json` :

```json
{
  "agents": {
    "openclaw": {
      "command": "env OPENCLAW_HIDE_BANNER=1 OPENCLAW_SUPPRESS_NOTES=1 openclaw acp --url ws://127.0.0.1:18789 --token-file ~/.openclaw/gateway.token --session agent:main:main"
    }
  }
}
```

Pour un checkout OpenClaw local au dépôt, utilisez le point d'entrée CLI direct au lieu du lanceur de développement afin que le flux ACP reste propre. Par exemple :

```bash
env OPENCLAW_HIDE_BANNER=1 OPENCLAW_SUPPRESS_NOTES=1 node openclaw.mjs acp ...
```

C'est le moyen le plus simple de permettre à Codex, Claude Code ou à un autre client compatible ACP d'extraire des informations contextuelles d'un agent OpenClaw sans avoir à scraper un terminal.

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

Pour cibler une Gateway ou un agent spécifique :

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

Dans Zed, ouvrez le panneau Agent et sélectionnez "OpenClaw ACP" pour démarrer une discussion.

## Mappage de session

Par défaut, les sessions ACP obtiennent une clé de session Gateway isolée avec un préfixe `acp:`.
Pour réutiliser une session connue, passez une clé ou une étiquette de session :

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

En savoir plus sur les clés de session sur [/concepts/session](/fr/concepts/session).

## Options

- `--url <url>`Gateway : URL WebSocket du Gateway (par défaut gateway.remote.url lorsque configuré).
- `--token <token>`Gateway : jeton d'authentification du Gateway.
- `--token-file <path>`Gateway : lire le jeton d'authentification du Gateway depuis un fichier.
- `--password <password>`Gateway : mot de passe d'authentification du Gateway.
- `--password-file <path>`Gateway : lire le mot de passe d'authentification du Gateway depuis un fichier.
- `--session <key>` : clé de session par défaut.
- `--session-label <label>` : libellé de session par défaut à résoudre.
- `--require-existing` : échouer si la clé/libellé de session n'existe pas.
- `--reset-session` : réinitialiser la clé de session avant la première utilisation.
- `--no-prefix-cwd` : ne pas préfixer les invites avec le répertoire de travail.
- `--provenance <off|meta|meta+receipt>` : inclure les métadonnées de provenance ou les reçus ACP.
- `--verbose, -v` : journalisation détaillée vers stderr.

Note de sécurité :

- `--token` et `--password` peuvent être visibles dans les listes de processus locaux sur certains systèmes.
- Privilégiez `--token-file`/`--password-file` ou les variables d'environnement (`OPENCLAW_GATEWAY_TOKEN`, `OPENCLAW_GATEWAY_PASSWORD`).
- La résolution de l'authentification du Gateway suit le contrat partagé utilisé par d'autres clients du Gateway :
  - mode local : env (`OPENCLAW_GATEWAY_*`) -> `gateway.auth.*` -> `gateway.remote.*` repli uniquement lorsque `gateway.auth.*` n'est pas défini (les SecretRefs locaux configurés mais non résolus échouent en mode fermé)
  - mode distant : `gateway.remote.*` avec repli env/config selon les règles de priorité distantes
  - `--url` est sécurisé pour le remplacement et ne réutilise pas les identifiants implicites config/env ; passez des `--token`/`--password` explicites (ou variantes de fichier)
- Les processus enfants du backend d'exécution ACP reçoivent `OPENCLAW_SHELL=acp`, qui peut être utilisé pour des règles spécifiques au contexte du shell/profil.
- `openclaw acp client` définit `OPENCLAW_SHELL=acp-client` sur le processus de pont généré.

### options `acp client`

- `--cwd <dir>` : répertoire de travail pour la session ACP.
- `--server <command>` : commande du serveur ACP (par défaut : `openclaw`).
- `--server-args <args...>` : arguments supplémentaires transmis au serveur ACP.
- `--server-verbose` : activer la journalisation détaillée sur le serveur ACP.
- `--verbose, -v` : journalisation détaillée du client.

## Connexes

- [Référence CLI](/fr/cli)
- [Agents ACP](/fr/tools/acp-agents)
