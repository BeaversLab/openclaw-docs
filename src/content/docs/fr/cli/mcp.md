---
summary: "Expose les conversations de canal OpenClaw via MCP et gérez les définitions de serveur MCP enregistrées"
read_when:
  - Connecting Codex, Claude Code, or another MCP client to OpenClaw-backed channels
  - Running `openclaw mcp serve`
  - Managing OpenClaw-saved MCP server definitions
title: "MCP"
sidebarTitle: "MCP"
---

`openclaw mcp` a deux tâches :

- exécuter OpenClaw en tant que serveur MCP avec `openclaw mcp serve`
- gérer les définitions de serveur MCP sortantes appartenant à OpenClaw avec `list`, `show`, `set` et `unset`

En d'autres termes :

- `serve` est OpenClaw agissant comme un serveur MCP
- `list` / `show` / `set` / `unset` est OpenClaw agissant comme un registre côté client MCP pour d'autres serveurs MCP que ses runtimes pourraient consommer plus tard

Utilisez [`openclaw acp`](/fr/cli/acp) lorsque OpenClaw doit héberger lui-même une session de harnais de codage et acheminer ce runtime via ACP.

## OpenClaw en tant que serveur MCP

C'est le chemin `openclaw mcp serve`.

### Quand utiliser `serve`

Utilisez `openclaw mcp serve` lorsque :

- Codex, Claude Code ou un autre client MCP doit communiquer directement avec les conversations de canal supportées par OpenClaw
- vous avez déjà une passerelle OpenClaw locale ou distante avec des sessions routées
- vous souhaitez un seul serveur MCP qui fonctionne sur les backends de canal de OpenClaw au lieu d'exécuter des ponts séparés par canal

Utilisez plutôt [`openclaw acp`](/fr/cli/acp) lorsque OpenClaw doit héberger lui-même le runtime de codage et garder la session de l'agent à l'intérieur de OpenClaw.

### Comment cela fonctionne

`openclaw mcp serve` démarre un serveur MCP stdio. Le client MCP possède ce processus. Tant que le client maintient la session stdio ouverte, le pont se connecte à une OpenClaw Gateway locale ou distante via WebSocket et expose les conversations de canal acheminées via MCP.

<Steps>
  <Step title="Le client lance le pont">Le client MCP lance `openclaw mcp serve`.</Step>
  <Step title="Le pont se connecte à la passerelle">Le pont se connecte à la Gateway OpenClaw via WebSocket.</Step>
  <Step title="Les sessions deviennent des conversations MCP">Les sessions acheminées deviennent des conversations MCP et des outils de transcription/historique.</Step>
  <Step title="File d'attente des événements en direct">Les événements en direct sont mis en file d'attente en mémoire tant que le pont est connecté.</Step>
  <Step title="Push Claude optionnel">Si le mode canal Claude est activé, la même session peut également recevoir des notifications de push spécifiques à Claude.</Step>
</Steps>

<AccordionGroup>
  <Accordion title="Comportement important">
    - l'état de la file d'attente en direct commence lorsque le pont se connecte
    - l'historique des transcripts plus ancien est lu avec `messages_read`
    - les notifications push de Claude n'existent que tant que la session MCP est active
    - lorsque le client se déconnecte, le pont se ferme et la file d'attente en direct disparaît
    - les points d'entrée d'agent à usage unique tels que `openclaw agent` et `openclaw infer model run` ferment tous les runtimes MCP groupés qu'ils ouvrent lorsque la réponse est terminée, afin que les exécutions scriptées répétées n'accumulent pas de processus enfants MCP stdio
    - les serveurs MCP stdio lancés par OpenClaw (groupés ou configurés par l'utilisateur) sont détruits en tant qu'arborescence de processus à l'arrêt, de sorte que les sous-processus enfants démarrés par le serveur ne survivent pas après la sortie du client stdio parent
    - la suppression ou la réinitialisation d'une session supprime les clients MCP de cette session via le chemin de nettoyage du runtime partagé, il n'y a donc aucune connexion stdio résiduelle liée à une session supprimée

  </Accordion>
</AccordionGroup>

### Choisir un mode client

Utilisez le même pont de deux manières différentes :

<Tabs>
  <Tab title="Clients MCP génériques">Outils MCP standard uniquement. Utilisez `conversations_list`, `messages_read`, `events_poll`, `events_wait`, `messages_send`, et les outils d'approbation.</Tab>
  <Tab title="Claude Code">Outils MCP standard plus l'adaptateur de canal spécifique à Claude. Activez `--claude-channel-mode on` ou laissez la valeur par défaut `auto`.</Tab>
</Tabs>

<Note>Aujourd'hui, `auto` se comporte de la même manière que `on`. Il n'y a pas encore de détection des capacités du client.</Note>

### Ce que `serve` expose

Le pont utilise les métadonnées de route de session Gateway existantes pour exposer des conversations soutenues par un channel. Une conversation apparaît lorsque OpenClaw possède déjà un état de session avec une route connue, telle que :

- `channel`
- métadonnées de destinataire ou de destination
- `accountId` facultatif
- `threadId` facultatif

Cela offre aux clients MCP un endroit unique pour :

- lister les conversations routées récentes
- lire l'historique des récents transcripts
- attendre les nouveaux événements entrants
- envoyer une réponse via la même route
- voir les demandes d'approbation qui arrivent tant que le pont est connecté

### Utilisation

<Tabs>
  <Tab title="Gateway Local">```bash openclaw mcp serve ```</Tab>
  <Tab title="Gateway distant (token)">```bash openclaw mcp serve --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token ```</Tab>
  <Tab title="Gateway distant (mot de passe)">```bash openclaw mcp serve --url wss://gateway-host:18789 --password-file ~/.openclaw/gateway.password ```</Tab>
  <Tab title="Détaillé / Claude désactivé">```bash openclaw mcp serve --verbose openclaw mcp serve --claude-channel-mode off ```</Tab>
</Tabs>

### Outils de pont

Le pont actuel expose ces outils MCP :

<AccordionGroup>
  <Accordion title="conversations_list">
    Liste les conversations récentes soutenues par une session qui possèdent déjà des métadonnées de route dans l'état de session Gateway.

    Filtres utiles :

    - `limit`
    - `search`
    - `channel`
    - `includeDerivedTitles`
    - `includeLastMessage`

  </Accordion>
  <Accordion title="conversation_get">
    Renvoie une conversation par `session_key` en utilisant une recherche de session Gateway directe.
  </Accordion>
  <Accordion title="messages_read">
    Lit les messages de transcript récents pour une conversation soutenue par une session.
  </Accordion>
  <Accordion title="attachments_fetch">
    Extrait les blocs de contenu de messages non textuels d'un message de transcription. Il s'agit d'une vue de métadonnées sur le contenu de la transcription, et non d'un stockage d'objets blob de pièces jointes autonome et durable.
  </Accordion>
  <Accordion title="events_poll">
    Lit les événements en direct mis en file d'attente depuis un curseur numérique.
  </Accordion>
  <Accordion title="events_wait">
    Effectue un polling long jusqu'à l'arrivée du prochain événement mis en file d'attente correspondant ou jusqu'à l'expiration du délai d'attente.

    Utilisez ceci lorsqu'un client MCP générique a besoin d'une livraison en temps quasi réel sans protocole de push spécifique à Claude.

  </Accordion>
  <Accordion title="messages_send">
    Renvoie du texte via la même route déjà enregistrée sur la session.

    Comportement actuel :

    - nécessite une route de conversation existante
    - utilise le canal, le destinataire, l'identifiant du compte et l'identifiant du fil de discussion de la session
    - envoie du texte uniquement

  </Accordion>
  <Accordion title="permissions_list_open">
    Liste les demandes d'approbation exec/plugin en attente que le pont a observées depuis sa connexion au Gateway.
  </Accordion>
  <Accordion title="permissions_respond">
    Résout une demande d'approbation exec/plugin en attente avec :

    - `allow-once`
    - `allow-always`
    - `deny`

  </Accordion>
</AccordionGroup>

### Modèle d'événement

Le pont maintient une file d'attente d'événements en mémoire tant qu'il est connecté.

Types d'événements actuels :

- `message`
- `exec_approval_requested`
- `exec_approval_resolved`
- `plugin_approval_requested`
- `plugin_approval_resolved`
- `claude_permission_request`

<Warning>
- la file d'attente est en direct uniquement ; elle commence lorsque le pont MCP démarre
- `events_poll` et `events_wait` ne rejouent pas par eux-mêmes l'historique Gateway plus ancien
- le backlog durable doit être lu avec `messages_read`

</Warning>

### Notifications du canal Claude

The bridge can also expose Claude-specific channel notifications. This is the OpenClaw equivalent of a Claude Code channel adapter: standard MCP tools remain available, but live inbound messages can also arrive as Claude-specific MCP notifications.

<Tabs>
  <Tab title="off">`--claude-channel-mode off`: standard MCP tools only.</Tab>
  <Tab title="on">`--claude-channel-mode on`: enable Claude channel notifications.</Tab>
  <Tab title="auto (default)">`--claude-channel-mode auto`: current default; same bridge behavior as `on`.</Tab>
</Tabs>

When Claude channel mode is enabled, the server advertises Claude experimental capabilities and can emit:

- `notifications/claude/channel`
- `notifications/claude/channel/permission`

Current bridge behavior:

- inbound `user` transcript messages are forwarded as `notifications/claude/channel`
- Claude permission requests received over MCP are tracked in-memory
- if the linked conversation later sends `yes abcde` or `no abcde`, the bridge converts that to `notifications/claude/channel/permission`
- these notifications are live-session only; if the MCP client disconnects, there is no push target

This is intentionally client-specific. Generic MCP clients should rely on the standard polling tools.

### MCP client config

Example stdio client config:

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

For most generic MCP clients, start with the standard tool surface and ignore Claude mode. Turn Claude mode on only for clients that actually understand the Claude-specific notification methods.

### Options

`openclaw mcp serve` supports:

<ParamField path="--url" type="string">
  URL WebSocket Gateway.
</ParamField>
<ParamField path="--token" type="string">
  Gateway token.
</ParamField>
<ParamField path="--token-file" type="string">
  Lire le jeton depuis un fichier.
</ParamField>
<ParamField path="--password" type="string">
  Mot de passe Gateway.
</ParamField>
<ParamField path="--password-file" type="string">
  Lire le mot de passe depuis un fichier.
</ParamField>
<ParamField path="--claude-channel-mode" type='"auto" | "on" | "off"'>
  Mode de notification Claude.
</ParamField>
<ParamField path="-v, --verbose" type="boolean">
  Journaux détaillés sur stderr.
</ParamField>

<Tip>Préférez `--token-file` ou `--password-file` aux secrets en ligne lorsque cela est possible.</Tip>

### Sécurité et limite de confiance

Le pont n'invente pas le routage. Il expose uniquement les conversations que la Gateway sait déjà router.

Cela signifie :

- les listes d'autorisation d'expéditeurs, l'appariement et la confiance au niveau du canal appartiennent toujours à la configuration du canal OpenClaw sous-jacent
- `messages_send` ne peut répondre que par une route stockée existante
- l'état d'approbation est uniquement en direct/en mémoire pour la session de pont actuelle
- l'authentification du pont doit utiliser les mêmes contrôles de jeton ou de mot de passe Gateway que vous feriez confiance pour tout autre client distant Gateway

Si une conversation est manquante dans `conversations_list`, la cause habituelle n'est pas la configuration MCP. Il s'agit de métadonnées de route manquantes ou incomplètes dans la session Gateway sous-jacente.

### Tests

OpenClaw fournit un test de fumée déterministe Docker pour ce pont :

```bash
pnpm test:docker:mcp-channels
```

Ce test de fumée :

- démarre un conteneur Gateway amorcé
- démarre un deuxième conteneur qui génère `openclaw mcp serve`
- vérifie la découverte de conversations, les lectures de transcriptions, les lectures de métadonnées de pièces jointes, le comportement de la file d'événements en direct et le routage d'envoi sortant
- valide les notifications de canal et d'autorisations de style Claude sur le pont MCP stdio réel

C'est le moyen le plus rapide de prouver que le pont fonctionne sans câbler un compte Telegram, Discord ou iMessage réel dans le test.

Pour un contexte de test plus large, consultez [Testing](/fr/help/testing).

### Dépannage

<AccordionGroup>
  <Accordion title="Aucune conversation retournée">
    Cela signifie généralement que la session Gateway n'est pas encore routable. Confirmez que la session sous-jacente a stocké les métadonnées de canal/fournisseur, de destinataire et de compte/fil de discussion facultatifs.
  </Accordion>
  <Accordion title="events_poll ou events_wait manque d'anciens messages">
    C'est attendu. La file d'attente en direct démarre lorsque le pont se connecte. Lisez l'historique des anciennes transcriptions avec `messages_read`.
  </Accordion>
  <Accordion title="Les notifications Claude n'apparaissent pas">
    Vérifiez tout cela :

    - le client a gardé la session MCP stdio ouverte
    - `--claude-channel-mode` est `on` ou `auto`
    - le client comprend réellement les méthodes de notification spécifiques à Claude
    - le message entrant s'est produit après la connexion du pont

  </Accordion>
  <Accordion title="Les approbations sont manquantes">
    `permissions_list_open` n'affiche que les demandes d'approbation observées alors que le pont était connecté. Ce n'est pas une API d'historique d'approbation durable.
  </Accordion>
</AccordionGroup>

## OpenClaw en tant que registre de client MCP

C'est le chemin `openclaw mcp list`, `show`, `status`, `probe`, `add`, `set`,
`configure`, `tools`, `login`, `reload` et `unset`.

Ces commandes n'exposent pas OpenClaw via MCP. Elles gèrent les définitions de serveur MCP appartenant à OpenClaw sous `mcp.servers` dans la configuration OpenClaw.

Ces définitions enregistrées sont destinées aux runtimes qu'OpenClaw lance ou configure ultérieurement, tels qu'OpenClaw intégré et autres adaptateurs de runtime. OpenClaw stocke les définitions de manière centralisée afin que ces runtimes n'aient pas besoin de conserver leurs propres listes de serveurs MCP en double.

<AccordionGroup>
  <Accordion title="Comportement important">
    - ces commandes lisent ou écrivent uniquement la configuration OpenClaw
    - `status`, `list`, `show`, `set`, `configure`, `tools`, `reload` et `unset` ne se connectent pas au serveur MCP cible
    - `probe` se connecte au serveur sélectionné ou à tous les serveurs configurés, liste les outils et signale les capacités/diagnostics
    - `add` construit une définition à partir des indicateurs et sonde avant l'enregistrement, sauf si `--no-probe` est défini ou si une autorisation OAuth est nécessaire au préalable
    - les adaptateurs d'exécution décident des formes de transport qu'ils prennent réellement en charge au moment de l'exécution
    - `enabled: false` conserve un serveur enregistré mais l'exclut de la découverte de l'exécution intégrée
    - `timeout` et `connectTimeout` définissent les délais d'expiration de requête et de connexion par serveur en secondes
    - `supportsParallelToolCalls: true` marque les serveurs que les adaptateurs peuvent appeler simultanément
    - les serveurs HTTP peuvent utiliser des en-têtes statiques, une connexion OAuth, un contrôle de vérification TLS et des chemins de certificat/clé mTLS
    - OpenClaw intégré expose les outils MCP configurés dans les profils d'outil normaux `coding` et `messaging` ; `minimal` les masque toujours, et `tools.deny: ["bundle-mcp"]` les désactive explicitement
    - les filtres `toolFilter.include` et `toolFilter.exclude` par serveur filtrent les outils MCP découverts avant qu'ils ne deviennent des outils OpenClaw
    - les serveurs qui annoncent des ressources ou des invites exposent également des outils utilitaires pour lister/lire les ressources et lister/récupérer les invites ; ces noms d'utilitaires générés (`resources_list`, `resources_read`, `prompts_list`, `prompts_get`) utilisent le même filtre d'inclusion/exclusion
    - les modifications dynamiques de la liste des outils MCP invalident le catalogue mis en cache pour cette session ; la prochaine découverte/utilisation actualise à partir du serveur
    - les échecs répétés de requête/protocole d'outil MCP mettent le serveur en pause brièvement pour qu'un serveur défaillant ne consomme pas tout le tour
    - les exécutions MCP groupées à portée de session sont récoltées après `mcp.sessionIdleTtlMs` millisecondes d'inactivité (par défaut 10 minutes ; définissez `0` pour désactiver) et les exécutions intégrées ponctuelles les nettoient à la fin de l'exécution

  </Accordion>
</AccordionGroup>

Les adaptateurs d'exécution peuvent normaliser ce registre partagé dans la forme attendue par leur client en aval. Par exemple, l'OpenClaw intégré consomme directement les valeurs `transport` de l'OpenClaw, tandis que Claude Code et Gemini reçoivent des valeurs natives CLI`type` telles que `http`, `sse` ou `stdio`.

Le serveur d'application Codex respecte également un bloc `codex` facultatif sur chaque serveur. Il s'agit de métadonnées de projection OpenClaw pour les threads du serveur d'application Codex uniquement ; cela ne modifie pas les sessions ACP, la configuration du harnais Codex générique ou d'autres adaptateurs d'exécution. Utilisez un `codex.agents` non vide pour projeter un serveur uniquement vers des ID d'agent OpenClaw spécifiques. Les listes d'agents vides, vides ou non valides sont rejetées par la validation de configuration et omises par le chemin de projection d'exécution au lieu de devenir globales. Utilisez `codex.defaultToolsApprovalMode` (`auto`, `prompt` ou `approve`) pour émettre la `default_tools_approval_mode` native de Codex pour un serveur approuvé. L'OpenClaw supprime les métadonnées `codex` avant de transmettre la configuration native `mcp_servers` à Codex.

### Définitions de serveur MCP enregistrées

OpenClaw stocke également un registre léger de serveurs MCP dans la configuration pour les surfaces qui souhaitent des définitions MCP gérées par OpenClaw.

Commandes :

- `openclaw mcp list`
- `openclaw mcp show [name]`
- `openclaw mcp status`
- `openclaw mcp probe [name]`
- `openclaw mcp add <name> [flags]`
- `openclaw mcp set <name> <json>`
- `openclaw mcp configure <name> [flags]`
- `openclaw mcp tools <name> [--include csv] [--exclude csv] [--clear]`
- `openclaw mcp login <name> [--code code]`
- `openclaw mcp reload`
- `openclaw mcp unset <name>`

Notes :

- `list` trie les noms des serveurs.
- `show` sans nom imprime l'objet complet du serveur MCP configuré.
- `status` classe les transports configurés sans se connecter.
- `probe` se connecte et signale le nombre de tools, le support des ressources/prompts, le support des changements de liste et les diagnostics.
- `add` accepte les indicateurs stdio tels que `--command`, `--arg`, `--env` et `--cwd`, ou les indicateurs HTTP tels que `--url`, `--transport`, `--header`, `--auth oauth`, TLS, le délai d'expiration et les indicateurs de sélection d'outils.
- `set` attend une valeur d'objet JSON sur la ligne de commande.
- `configure` met à jour l'activation, les filtres d'outils, les délais d'expiration, OAuth, TLS et les indices d'appel d'outils parallèles sans remplacer toute la définition du serveur.
- `tools` met à jour les filtres d'outils par serveur. Les entrées d'inclusion/exclusion sont des noms d'outils MCP et des motifs simples `*`.
- `login` exécute le flux OAuth pour les serveurs HTTP configurés avec `auth: "oauth"`. La première exécution imprime une URL d'autorisation ; relancez avec `--code` après approbation.
- `reload` supprime les runtimes MCP en processus mis en cache. Les processus Gateway ou d'agent dans un autre processus ont toujours besoin de leur propre chemin de rechargement ou de redémarrage.
- Utilisez `transport: "streamable-http"` pour les serveurs MCP HTTP diffusables. `openclaw mcp set` normalise également les `type: "http"` natifs à la CLI vers la même forme de configuration canonique pour la compatibilité.
- `unset` échoue si le serveur nommé n'existe pas.

Exemples :

```bash
openclaw mcp list
openclaw mcp show context7 --json
openclaw mcp status
openclaw mcp probe context7 --json
openclaw mcp add memory --command npx --arg -y --arg @modelcontextprotocol/server-memory
openclaw mcp set context7 '{"command":"uvx","args":["context7-mcp"]}'
openclaw mcp tools context7 --include 'resolve-library-id,get-library-docs'
openclaw mcp set docs '{"url":"https://mcp.example.com","transport":"streamable-http"}'
openclaw mcp configure docs --timeout 20 --connect-timeout 5 --include 'search,read_*'
openclaw mcp configure docs --auth oauth --oauth-scope 'docs.read'
openclaw mcp login docs
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
        "url": "https://mcp.example.com",
        "transport": "streamable-http",
        "timeout": 20,
        "connectTimeout": 5,
        "supportsParallelToolCalls": true,
        "auth": "oauth",
        "oauth": {
          "scope": "docs.read"
        },
        "sslVerify": true,
        "clientCert": "/path/to/client.crt",
        "clientKey": "/path/to/client.key",
        "toolFilter": {
          "include": ["search_*"],
          "exclude": ["admin_*"]
        }
      }
    }
  }
}
```

### Transport Stdio

Lance un processus enfant local et communique via stdin/stdout.

| Champ                      | Description                               |
| -------------------------- | ----------------------------------------- |
| `command`                  | Exécutable à lancer (requis)              |
| `args`                     | Tableau d'arguments de ligne de commande  |
| `env`                      | Variables d'environnement supplémentaires |
| `cwd` / `workingDirectory` | Répertoire de travail pour le processus   |

<Warning>
**Filtre de sécurité des variables d'environnement Stdio**

OpenClaw rejette les clés d'environnement de démarrage de l'interpréteur qui peuvent modifier la façon dont un serveur MCP stdio démarre avant le premier RPC, même si elles apparaissent dans le bloc `env` d'un serveur. Les clés bloquées incluent `NODE_OPTIONS`, `NODE_REDIRECT_WARNINGS`, `NODE_REPL_EXTERNAL_MODULE`, `NODE_REPL_HISTORY`, `NODE_V8_COVERAGE`, `PYTHONSTARTUP`, `PYTHONPATH`, `PERL5OPT`, `RUBYOPT`, `SHELLOPTS`, `PS4` et des variables de contrôle d'exécution similaires. Le démarrage rejette celles-ci avec une erreur de configuration pour qu'elles ne puissent pas injecter un prélude implicite, échanger l'interpréteur, activer un débogueur ou rediriger la sortie d'exécution contre le processus stdio. Les variables d'environnement ordinaires d'identification, de proxy et spécifiques au serveur (`GITHUB_TOKEN`, `HTTP_PROXY`, `*_API_KEY` personnalisées, etc.) ne sont pas affectées.

Si votre serveur MCP a réellement besoin de l'une des variables bloquées, définissez-la sur le processus hôte de la passerelle au lieu de sous le `env` du serveur stdio.

</Warning>

### Transport SSE / HTTP

Se connecte à un serveur MCP distant via HTTP Server-Sent Events.

| Champ                          | Description                                                                                      |
| ------------------------------ | ------------------------------------------------------------------------------------------------ |
| `url`                          | URL HTTP ou HTTPS du serveur distant (requis)                                                    |
| `headers`                      | Carte clé-valeur facultative d'en-têtes HTTP (par exemple, les jetons d'authentification)        |
| `connectionTimeoutMs`          | Délai de connexion par serveur en ms (facultatif)                                                |
| `connectTimeout`               | Délai de connexion par serveur en secondes (optionnel)                                           |
| `timeout` / `requestTimeoutMs` | Délai d'expiration de la requête MCP par serveur en secondes ou ms                               |
| `auth: "oauth"`                | Utiliser le stockage de jetons MCP OAuth et `openclaw mcp login`                                 |
| `sslVerify`                    | Définir sur false uniquement pour les points de terminaison HTTPS privés explicitement approuvés |
| `clientCert` / `clientKey`     | Chemins du certificat client et de la clé mTLS                                                   |
| `supportsParallelToolCalls`    | Indication que les appels simultanés sont sûrs pour ce serveur                                   |

Exemple :

```json
{
  "mcp": {
    "servers": {
      "remote-tools": {
        "url": "https://mcp.example.com",
        "auth": "oauth",
        "timeout": 20,
        "headers": {
          "Authorization": "Bearer <token>"
        }
      }
    }
  }
}
```

Les valeurs sensibles dans `url` (userinfo) et `headers` sont masquées dans les journaux et la sortie de statut.

### Transport HTTP fluxable

`streamable-http` est une option de transport supplémentaire à côté de `sse` et `stdio`. Il utilise le flux HTTP pour la communication bidirectionnelle avec les serveurs MCP distants.

| Champ                          | Description                                                                                                    |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `url`                          | URL HTTP ou HTTPS du serveur distant (requis)                                                                  |
| `transport`                    | Définissez sur `"streamable-http"` pour sélectionner ce transport ; lorsqu'il est omis, OpenClaw utilise `sse` |
| `headers`                      | Carte clé-valeur facultative d'en-têtes HTTP (par exemple, les jetons d'authentification)                      |
| `connectionTimeoutMs`          | Délai de connexion par serveur en ms (facultatif)                                                              |
| `connectTimeout`               | Délai de connexion par serveur en secondes (facultatif)                                                        |
| `timeout` / `requestTimeoutMs` | Délai d'expiration de requête MCP par serveur en secondes ou ms                                                |
| `auth: "oauth"`                | Utiliser le stockage de jetons OAuth MCP et `openclaw mcp login`                                               |
| `sslVerify`                    | Définissez à false uniquement pour les points de terminaison HTTPS privés explicitement approuvés              |
| `clientCert` / `clientKey`     | Chemins du certificat client et de la clé mTLS                                                                 |
| `supportsParallelToolCalls`    | Indication que les appels simultanés sont sûrs pour ce serveur                                                 |

La configuration OpenClaw utilise `transport: "streamable-http"` comme orthographe canonique. Les valeurs MCP `type: "http"` natives CLI sont acceptées lorsqu'elles sont enregistrées via `openclaw mcp set` et réparées par `openclaw doctor --fix` dans la configuration existante, mais `transport` est ce que OpenClaw intégré consomme directement.

Exemple :

```json
{
  "mcp": {
    "servers": {
      "streaming-tools": {
        "url": "https://mcp.example.com/stream",
        "transport": "streamable-http",
        "connectTimeout": 10,
        "timeout": 30,
        "headers": {
          "Authorization": "Bearer <token>"
        }
      }
    }
  }
}
```

<Note>Ces commandes gèrent uniquement la configuration enregistrée. Elles ne démarrent pas le pont de channel, n'ouvrent pas de session client MCP en direct et ne prouvent pas que le serveur cible est accessible.</Note>

## Limites actuelles

Cette page documente le pont tel qu'il est livré aujourd'hui.

Limites actuelles :

- la découverte de conversations dépend des métadonnées de route de session Gateway existantes
- pas de protocole de push générique au-delà de l'adaptateur spécifique à Claude
- pas encore d'outils d'édition ou de réaction aux messages
- le transport HTTP/SSE/streamable-http se connecte à un seul serveur distant ; pas encore d'amont multiplexé
- `permissions_list_open` inclut uniquement les approbations observées tant que le pont est connecté

## Connexe

- [Référence CLI](/fr/cli)
- [Plugins](/fr/cli/plugins)
