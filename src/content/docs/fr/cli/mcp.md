---
summary: "OpenClawExposer les conversations de canal OpenClaw via MCP et gérer les définitions de serveur MCP enregistrées"
read_when:
  - Connecting Codex, Claude Code, or another MCP client to OpenClaw-backed channels
  - Running `openclaw mcp serve`
  - Managing OpenClaw-saved MCP server definitions
title: "MCP"
sidebarTitle: "MCP"
---

`openclaw mcp` a deux rôles :

- exécuter OpenClaw en tant que serveur MCP avec OpenClaw`openclaw mcp serve`
- gérer les définitions de serveur MCP sortantes appartenant à OpenClaw avec OpenClaw`list`, `show`, `status`, `doctor`, `probe`, `add`, `set`, `configure`, `tools`, `login`, `logout`, `reload` et `unset`

En d'autres termes :

- `serve`OpenClaw est OpenClaw agissant en tant que serveur MCP
- les autres sous-commandes sont OpenClaw agissant en tant que registre côté client MCP pour les serveurs MCP que ses runtimes pourraient consommer plus tard

Utilisez [`openclaw acp`](/fr/cli/acpOpenClaw) lorsqu'OpenClaw doit héberger lui-même une session de harnais de codage et acheminer ce runtime via ACP.

## Choisir le bon chemin MCP

OpenClaw propose plusieurs surfaces MCP. Choisissez celle qui correspond à celui qui possède le runtime de l'agent et à celui qui possède les outils.

| Objectif                                                                              | Utiliser                                                                  | Pourquoi                                                                                                                                                 |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Permettre à un client MCP externe de lire/envoyer des conversations de canal OpenClaw | `openclaw mcp serve`                                                      | OpenClaw est le serveur MCP et expose les conversations soutenues par Gateway via stdio.                                                                 |
| Enregistrer les serveurs MCP tiers pour les exécutions d'agents gérées par OpenClaw   | `openclaw mcp add`, `set`, `configure`, `tools`, `login`                  | OpenClaw est le registre côté client MCP et projette ensuite ces serveurs dans les runtimes éligibles.                                                   |
| Vérifier un serveur enregistré sans exécuter un tour d'agent                          | `openclaw mcp status`, `doctor`, `probe`                                  | `status` et `doctor` inspectent la configuration ; `probe` ouvre une connexion MCP active et répertorie les capacités.                                   |
| Modifier la configuration MCP depuis un navigateur                                    | Interface utilisateur de contrôle `/mcp`                                  | La page affiche l'inventaire, l'activation, les résumés OAuth/filtres, les indices de commande et un éditeur `mcp` délimité.                             |
| Fournir au serveur d'application Codex un serveur MCP natif délimité                  | `mcp.servers.<name>.codex`                                                | Le bloc `codex` affecte uniquement la projection de thread du serveur d'application Codex et est supprimé avant le transfert de la configuration native. |
| Exécuter des sessions de harnais hébergées par l'ACP                                  | [`openclaw acp`](/fr/cli/acp) et [Agents ACP](/fr/tools/acp-agents-setup) | Le mode pont ACP n'accepte pas l'injection de serveur MCP par session ; configurez plutôt les ponts de passerelle/plugin.                                |

<Tip>Si vous n'êtes pas sûr du chemin dont vous avez besoin, commencez par `openclaw mcp status --verbose`. Il montre ce que OpenClaw a enregistré sans démarrer de serveurs MCP.</Tip>

## OpenClaw en tant que serveur MCP

C'est le chemin `openclaw mcp serve`.

### Quand utiliser `serve`

Utilisez `openclaw mcp serve` lorsque :

- Codex, Claude Code ou un autre client MCP doit communiquer directement avec les conversations de canal prises en charge par OpenClaw
- vous avez déjà une passerelle OpenClawGateway locale ou distante avec des sessions routées
- vous voulez un seul serveur MCP qui fonctionne sur les backends de canal de OpenClaw au lieu d'exécuter des ponts distincts par canal

Utilisez plutôt [`openclaw acp`](/fr/cli/acp) lorsque OpenClaw doit héberger lui-même l'exécution du code et garder la session d'agent à l'intérieur de OpenClaw.

### Comment cela fonctionne

`openclaw mcp serve` démarre un serveur MCP stdio. Le client MCP possède ce processus. Tant que le client garde la session stdio ouverte, le pont se connecte à une passerelle OpenClawGateway locale ou distante via WebSocket et expose les conversations de canal acheminées via MCP.

<Steps>
  <Step title="Le client lance le pont">Le client MCP lance `openclaw mcp serve`.</Step>
  <Step title="Le pont se connecte à Gateway">Le pont se connecte à la OpenClaw Gateway via WebSocket.</Step>
  <Step title="Les sessions deviennent des conversations MCP">Les sessions acheminées deviennent des conversations MCP et des outils de transcription/historique.</Step>
  <Step title="File d'attente des événements en direct">Les événements en direct sont mis en file d'attente en mémoire tant que le pont est connecté.</Step>
  <Step title="Poussée Claude facultative">Si le mode de canal Claude est activé, la même session peut également recevoir des notifications de poussée spécifiques à Claude.</Step>
</Steps>

<AccordionGroup>
  <Accordion title="Comportement important">
    - l'état de la file d'attente en direct démarre lorsque le pont se connecte
    - l'historique des transcriptions plus ancien est lu avec `messages_read`
    - les notifications de poussée Claude n'existent que tant que la session MCP est active
    - lorsque le client se déconnecte, le pont se ferme et la file d'attente en direct disparaît
    - les points d'entrée d'agent ponctuels tels que `openclaw agent` et `openclaw infer model run` ferment tous les environnements d'exécution MCP groupés qu'ils ouvrent lorsque la réponse est terminée, de sorte que les exécutions scriptées répétées n'accumulent pas de processus enfants MCP stdio
    - les serveurs MCP stdio lancés par OpenClaw (groupés ou configurés par l'utilisateur) sont détruits en tant qu'arborescence de processus à l'arrêt, de sorte que les sous-processus enfants démarrés par le serveur ne survivent pas après la sortie du client stdio parent
    - la suppression ou la réinitialisation d'une session supprime les clients MCP de cette session via le chemin de nettoyage de l'exécution partagée, de sorte qu'il n'y a pas de connexions stdio persistantes liées à une session supprimée

  </Accordion>
</AccordionGroup>

### Choisir un mode client

Utiliser le même pont de deux manières différentes :

<Tabs>
  <Tab title="Clients MCP génériques">Outils MCP standard uniquement. Utilisez `conversations_list`, `messages_read`, `events_poll`, `events_wait`, `messages_send` et les outils d'approbation.</Tab>
  <Tab title="Claude Code">Outils MCP standard plus l'adaptateur de canal spécifique à Claude. Activez `--claude-channel-mode on` ou laissez la valeur par défaut `auto`.</Tab>
</Tabs>

<Note>Aujourd'hui, `auto` se comporte de la même manière que `on`. Il n'y a pas encore de détection des capacités du client.</Note>

### Ce que `serve` expose

Le pont utilise les métadonnées de route de session Gateway existantes pour exposer des conversations sauvegardées par channel. Une conversation apparaît lorsque OpenClaw possède déjà un état de session avec une route connue telle que :

- `channel`
- métadonnées de destinataire ou de destination
- `accountId` facultatif
- `threadId` facultatif

Cela offre aux clients MCP un endroit unique pour :

- lister les conversations routées récentes
- lire l'historique des récents transcrits
- attendre les nouveaux événements entrants
- envoyer une réponse via la même route
- voir les demandes d'approbation qui arrivent pendant que le pont est connecté

### Utilisation

<Tabs>
  <Tab title="Gateway local">```bash openclaw mcp serve ```</Tab>
  <Tab title="Gateway distant (token)">```bash openclaw mcp serve --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token ```</Tab>
  <Tab title="Gateway distant (mot de passe)">```bash openclaw mcp serve --url wss://gateway-host:18789 --password-file ~/.openclaw/gateway.password ```</Tab>
  <Tab title="Verbeux / Claude désactivé">```bash openclaw mcp serve --verbose openclaw mcp serve --claude-channel-mode off ```</Tab>
</Tabs>

### Outils du pont

Le pont actuel expose ces outils MCP :

<AccordionGroup>
  <Accordion title="conversations_list">
    Répertorie les conversations récentes basées sur des sessions qui disposent déjà de métadonnées de route dans l'état de session du Gateway.

    Filtres utiles :

    - `limit`
    - `search`
    - `channel`
    - `includeDerivedTitles`
    - `includeLastMessage`

  </Accordion>
  <Accordion title="conversation_get">
    Renvoie une conversation par `session_key` en utilisant une recherche directe dans la session du Gateway.
  </Accordion>
  <Accordion title="messages_read">
    Lit les messages de transcription récents pour une conversation basée sur une session.
  </Accordion>
  <Accordion title="attachments_fetch">
    Extrait les blocs de contenu de messages non textuels d'un message de transcription. Il s'agit d'une vue des métadonnées sur le contenu de la transcription, et non d'un stockage d'objets blob de pièces jointes autonome durable.
  </Accordion>
  <Accordion title="events_poll">
    Lit les événements en direct mis en file d'attente depuis un curseur numérique.
  </Accordion>
  <Accordion title="events_wait">
    Effectue un sondage long jusqu'à l'arrivée du prochain événement mis en file d'attente correspondant ou l'expiration du délai d'attente.

    Utilisez ceci lorsqu'un client MCP générique a besoin d'une livraison en temps quasi réel sans protocole de push spécifique à Claude.

  </Accordion>
  <Accordion title="messages_send">
    Renvoie le texte via la même route déjà enregistrée sur la session.

    Comportement actuel :

    - nécessite une route de conversation existante
    - utilise le canal, le destinataire, l'identifiant du compte et l'identifiant du fil de discussion de la session
    - envoie uniquement du texte

  </Accordion>
  <Accordion title="permissions_list_open">
    Répertorie les demandes d'approbation exec/plugin en attente que le pont a observées depuis sa connexion au Gateway.
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
- la file d'attente est en direct uniquement ; elle démarre lorsque le pont MCP démarre
- `events_poll` et `events_wait` ne rejouent pas par eux-mêmes l'historique plus ancien du Gateway
- l'arriéré durable doit être lu avec `messages_read`

</Warning>

### Notifications de canal Claude

Le pont peut également exposer des notifications de canal spécifiques à Claude. Il s'agit de l'équivalent OpenClaw d'un adaptateur de canal Claude Code : les outils MCP standard restent disponibles, mais les messages entrants en direct peuvent également arriver sous forme de notifications MCP spécifiques à Claude.

<Tabs>
  <Tab title="off">`--claude-channel-mode off` : outils MCP standard uniquement.</Tab>
  <Tab title="on">`--claude-channel-mode on` : activer les notifications de canal Claude.</Tab>
  <Tab title="auto (default)">`--claude-channel-mode auto` : valeur par défaut actuelle ; même comportement de pont que `on`.</Tab>
</Tabs>

Lorsque le mode de canal Claude est activé, le serveur annonce des capacités expérimentales Claude et peut émettre :

- `notifications/claude/channel`
- `notifications/claude/channel/permission`

Comportement actuel du pont :

- les messages de transcription entrants `user` sont transmis en tant que `notifications/claude/channel`
- les demandes d'autorisation Claude reçues via MCP sont suivies en mémoire
- si la conversation liée envoie ensuite `yes abcde` ou `no abcde`, le pont convertit cela en `notifications/claude/channel/permission`
- ceses notifications sont limitées à la session en cours ; si le client MCP se déconnecte, il n'y a aucune cible de notification push

Ceci est intentionnellement spécifique au client. Les clients MCP génériques doivent s'appuyer sur les outils de polling standard.

### Configuration du client MCP

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

Pour la plupart des clients MCP génériques, commencez par la surface d'outils standard et ignorez le mode Claude. Activez le mode Claude uniquement pour les clients qui comprennent réellement les méthodes de notification spécifiques à Claude.

### Options

`openclaw mcp serve` prend en charge :

<ParamField path="--url" type="string">
  Gateway URL WebSocket.
</ParamField>
<ParamField path="--token" type="string">
  Gateway token.
</ParamField>
<ParamField path="--token-file" type="string">
  Lire le token depuis un fichier.
</ParamField>
<ParamField path="--password" type="string">
  Gateway mot de passe.
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

<Tip>Privilégiez `--token-file` ou `--password-file` aux secrets en ligne lorsque cela est possible.</Tip>

### Sécurité et limite de confiance

Le pont n'invente pas le routage. Il expose uniquement les conversations que Gateway sait déjà router.

Cela signifie :

- les listes blanches d'expéditeurs, l'appairage et la confiance au niveau du canal appartiennent toujours à la configuration sous-jacente du canal OpenClaw
- `messages_send` ne peut répondre que via une route stockée existante
- l'état d'approbation est en direct/en mémoire uniquement pour la session de pont actuelle
- l'authentification du pont doit utiliser les mêmes contrôles de token ou de mot de passe Gateway que vous feriez confiance pour tout autre client distant Gateway

Si une conversation est manquante dans `conversations_list`, la cause habituelle n'est pas la configuration MCP. Il s'agit de métadonnées de route manquantes ou incomplètes dans la session Gateway sous-jacente.

### Tests

OpenClaw fournit un smoke test déterministe Docker pour ce pont :

```bash
pnpm test:docker:mcp-channels
```

Ce smoke test :

- démarre un conteneur Gateway amorcé
- démarre un deuxième conteneur qui génère `openclaw mcp serve`
- vérifie la découverte de conversations, la lecture des transcriptions, la lecture des métadonnées de pièces jointes, le comportement de la file d'attente d'événements en direct et le routage d'envoi sortant
- valide les notifications de canal et d'autorisation de style Claude sur le pont MCP stdio réel

C'est le moyen le plus rapide de prouver que le pont fonctionne sans intégrer un compte Telegram, Discord ou iMessage réel dans le test.

Pour un contexte de test plus large, consultez [Tests](/fr/help/testing).

### Dépannage

<AccordionGroup>
  <Accordion title="Aucune conversation renvoyée">
    Cela signifie généralement que la session Gateway n'est pas encore routable. Confirmez que la session sous-jacente a stocké les métadonnées de route canal/fournisseur, destinataire, et compte/fil de discussion optionnels.
  </Accordion>
  <Accordion title="events_poll ou events_wait manque des messages plus anciens">
    Comportement attendu. La file d'attente en direct démarre lorsque le pont se connecte. Lisez l'historique des transcriptions plus anciennes avec `messages_read`.
  </Accordion>
  <Accordion title="Les notifications Claude n'apparaissent pas">
    Vérifiez tous ces points :

    - le client a gardé la session MCP stdio ouverte
    - `--claude-channel-mode` est `on` ou `auto`
    - le client comprend réellement les méthodes de notification spécifiques à Claude
    - le message entrant s'est produit après la connexion du pont

  </Accordion>
  <Accordion title="Les approbations sont manquantes">
    `permissions_list_open` affiche uniquement les demandes d'approbation observées pendant que le pont était connecté. Ce n'est pas une API d'historique d'approbation durable.
  </Accordion>
</AccordionGroup>

## OpenClaw en tant que registre de clients MCP

Il s'agit du chemin `openclaw mcp list`, `show`, `status`, `doctor`, `probe`, `add`, `set`,
`configure`, `tools`, `login`, `logout`, `reload` et `unset`.

Ces commandes n'exposent pas OpenClaw via MCP. Elles gèrent les définitions de serveurs MCP appartenant à OpenClaw sous OpenClawOpenClaw`mcp.servers`OpenClaw dans la configuration d'OpenClaw.

Ces définitions enregistrées sont destinées aux runtimes qu'OpenClaw lance ou configure ultérieurement, tels qu'OpenClaw intégré et autres adaptateurs de runtime. OpenClaw stocke les définitions de manière centralisée afin que ces runtimes n'aient pas besoin de conserver leurs propres listes de serveurs MCP en double.

<AccordionGroup>
  <Accordion title="Comportement important">
    - ces commandes ne font que lire ou écrire la configuration OpenClaw
    - `status`, `list`, `show`, `doctor` sans `--probe`, `set`, `configure`, `tools`, `logout`, `reload`, et `unset` ne se connectent pas au serveur MCP cible
    - `login` effectue le flux réseau OAuth MCP pour le serveur HTTP configuré et enregistre les identifiants locaux résultants
    - `status --verbose` affiche les indices de transport, d'authentification, de délai d'attente, de filtre et d'appel d'outil parallèle résolus sans se connecter
    - `doctor` vérifie les définitions enregistrées pour les problèmes de configuration locale tels que les commandes stdio manquantes, les répertoires de travail non valides, les fichiers TLS manquants, les serveurs désactivés, les valeurs littérales sensibles d'en-tête/env, et l'autorisation OAuth incomplète
    - `doctor --probe` ajoute la même preuve de connexion en direct que `probe` après la réussite des vérifications statiques
    - `probe` se connecte au serveur sélectionné ou à tous les serveurs configurés, liste les outils et signale les capacités/diagnostic
    - `add` construit une définition à partir des indicateurs et des sondes avant de l'enregistrer, sauf si `--no-probe` est défini ou si l'autorisation OAuth est d'abord nécessaire
    - les adaptateurs d'exécution décident des formes de transport qu'ils prennent réellement en charge au moment de l'exécution
    - `enabled: false` conserve un serveur enregistré mais l'exclut de la découverte du runtime intégré
    - `timeout` et `connectTimeout` définissent les délais d'attente de demande et de connexion par serveur en secondes
    - `supportsParallelToolCalls: true` marque les serveurs que les adaptateurs peuvent appeler simultanément
    - les serveurs HTTP peuvent utiliser des en-têtes statiques, la connexion OAuth, le contrôle de vérification TLS, et les chemins de certificat/clé mTLS
    - OpenClaw intégré expose les outils MCP configurés dans les profils d'outils normaux `coding` et `messaging` ; `minimal` les masque toujours, et `tools.deny: ["bundle-mcp"]` les désactive explicitement
    - le `toolFilter.include` et `toolFilter.exclude` par serveur filtrent les outils MCP découverts avant qu'ils ne deviennent des outils OpenClaw
    - les serveurs qui annoncent des ressources ou des invites exposent également des outils utilitaires pour lister/lire les ressources et lister/récupérer les invites ; ces noms d'utilitaires générés (`resources_list`, `resources_read`, `prompts_list`, `prompts_get`) utilisent le même filtre d'inclusion/exclusion
    - les modifications dynamiques de la liste d'outils MCP invalident le catalogue mis en cache pour cette session ; la découverte/utilisation suivante l'actualise à partir du serveur
    - les échecs répétés de demande/protocole d'outil MCP mettent le serveur en pause brièvement pour qu'un serveur défaillant ne consomme pas tout le tour
    - les runtimes MCP regroupés délimités à la session sont nettoyés après `mcp.sessionIdleTtlMs` millisecondes d'inactivité (10 minutes par défaut ; définissez `0` pour désactiver) et les exécutions intégrées ponctuelles les nettoient à la fin de l'exécution

  </Accordion>
</AccordionGroup>

Les adaptateurs d'exécution peuvent normaliser ce registre partagé dans le format attendu par leur client en aval. Par exemple, OpenClaw intégré consomme directement les valeurs OpenClawOpenClaw`transport` d'OpenClaw, tandis que Claude Code et Gemini reçoivent les valeurs `type` natives du CLI, telles que `http`, `sse` ou `stdio`.

Codex app-server prend également en charge un bloc `codex` facultatif sur chaque serveur. Il s'agit de métadonnées de projection OpenClaw pour les fils de discussion de Codex app-server uniquement ; cela ne modifie pas les sessions ACP, la configuration du harnais Codex générique ou d'autres adaptateurs d'exécution.
Utilisez `codex.agents` non vide pour projeter un serveur uniquement vers des ID d'agent OpenClaw spécifiques. Les listes d'agents vides, vierges ou non valides sont rejetées par la validation de la configuration et omises par le chemin de projection d'exécution au lieu de devenir globales. Utilisez `codex.defaultToolsApprovalMode` (`auto`, `prompt` ou `approve`) pour émettre `default_tools_approval_mode` natif de Codex pour un serveur approuvé.
OpenClaw supprime les métadonnées `codex` avant de transmettre la configuration native `mcp_servers` à Codex.

### Définitions de serveur MCP enregistrées

OpenClaw stocke également un registre de serveur MCP léger dans la configuration pour les surfaces qui souhaitent des définitions MCP gérées par OpenClaw.

Commandes :

- `openclaw mcp list`
- `openclaw mcp show [name]`
- `openclaw mcp status [--verbose]`
- `openclaw mcp doctor [name] [--probe]`
- `openclaw mcp probe [name]`
- `openclaw mcp add <name> [flags]`
- `openclaw mcp set <name> <json>`
- `openclaw mcp configure <name> [flags]`
- `openclaw mcp tools <name> [--include csv] [--exclude csv] [--clear]`
- `openclaw mcp login <name> [--code code]`
- `openclaw mcp logout <name>`
- `openclaw mcp reload`
- `openclaw mcp unset <name>`

Remarques :

- `list` trie les noms des serveurs.
- `show` sans nom affiche l'objet de serveur MCP configuré complet.
- `status` classifie les transports configurés sans se connecter. `--verbose` inclut les détails résolus de lancement, le délai d'attente, OAuth, le filtre et les appels parallèles.
- `doctor` effectue des vérifications statiques sans se connecter. Ajoutez `--probe` lorsque la commande doit également vérifier que les serveurs activés se connectent.
- `probe` se connecte et signale les nombres d'outils, la prise en charge des ressources/invites, la prise en charge des modifications de liste et les diagnostics.
- `add` accepte les indicateurs stdio tels que `--command`, `--arg`, `--env` et `--cwd`, ou les indicateurs HTTP tels que `--url`, `--transport`, `--header`, `--auth oauth`, TLS, le délai d'attente et les indicateurs de sélection d'outils.
- `set` attend une valeur d'objet JSON sur la ligne de commande.
- `configure` met à jour l'activation, les filtres d'outils, les délais d'attente, OAuth, TLS et les indicateurs d'appels d'outils parallèles sans remplacer toute la définition du serveur.
- `tools` met à jour les filtres d'outils par serveur. Les entrées d'inclusion/exclusion sont des noms d'outils MCP et des modèles glob simples `*`.
- `login` exécute le flux OAuth pour les serveurs HTTP configurés avec `auth: "oauth"`. La première exécution imprime une URL d'autorisation ; réexécutez avec `--code` après approbation.
- `logout` efface les informations d'identification OAuth stockées pour le serveur nommé sans supprimer la définition du serveur enregistrée.
- `reload` supprime les runtimes MCP mis en cache en cours de processus. Les processus du Gateway ou de l'agent dans un autre processus ont toujours besoin de leur propre chemin de rechargement ou de redémarrage.
- Utilisez `transport: "streamable-http"` pour les serveurs MCP HTTP diffables. `openclaw mcp set` normalise également `type: "http"` natif CLI vers la même forme de configuration canonique pour la compatibilité.
- `unset` échoue si le serveur nommé n'existe pas.

Exemples :

```bash
openclaw mcp list
openclaw mcp show context7 --json
openclaw mcp status --verbose
openclaw mcp doctor --probe
openclaw mcp probe context7 --json
openclaw mcp add memory --command npx --arg -y --arg @modelcontextprotocol/server-memory
openclaw mcp set context7 '{"command":"uvx","args":["context7-mcp"]}'
openclaw mcp tools context7 --include 'resolve-library-id,get-library-docs'
openclaw mcp set docs '{"url":"https://mcp.example.com","transport":"streamable-http"}'
openclaw mcp configure docs --timeout 20 --connect-timeout 5 --include 'search,read_*'
openclaw mcp configure docs --auth oauth --oauth-scope 'docs.read'
openclaw mcp login docs
openclaw mcp logout docs
openclaw mcp unset context7
```

### Recettes courantes de serveur

Ces exemples enregistrent uniquement les définitions de serveur. Exécutez `openclaw mcp doctor --probe` ensuite pour vérifier que le serveur démarre et expose des outils.

<Tabs>
  <Tab title="Filesystem">
    ```bash
    openclaw mcp add files \
      --command npx \
      --arg -y \
      --arg @modelcontextprotocol/server-filesystem \
      --arg "$HOME/Documents" \
      --include 'read_file,list_directory,search_files'
    openclaw mcp doctor files --probe
    ```

    Limitez les serveurs de système de fichiers à la plus petite arborescence de répertoires que l'agent doit lire ou modifier.

  </Tab>
  <Tab title="Memory">
    ```bash
    openclaw mcp add memory \
      --command npx \
      --arg -y \
      --arg @modelcontextprotocol/server-memory
    openclaw mcp probe memory --json
    ```

    Utilisez un filtre d'outils si le serveur expose des outils d'écriture qui ne doivent pas être disponibles pour les agents normaux.

  </Tab>
  <Tab title="Local script">
    ```bash
    openclaw mcp add local-tools \
      --command node \
      --arg ./dist/mcp-server.js \
      --cwd /srv/openclaw-tools \
      --env API_BASE=https://internal.example
    openclaw mcp status --verbose
    ```

    `doctor` vérifie que `cwd` existe et que la commande est résolue depuis l'environnement configuré.

  </Tab>
  <Tab title="Remote HTTP">
    ```bash
    openclaw mcp add docs \
      --url https://mcp.example.com/mcp \
      --transport streamable-http \
      --auth oauth \
      --oauth-scope docs.read \
      --timeout 20 \
      --connect-timeout 5 \
      --include 'search,read_*'
    openclaw mcp doctor docs --probe
    ```

    Utilisez OAuth lorsque le serveur distant le prend en charge. Si le serveur nécessite des en-têtes statiques, évitez de valider des jetons porteur littéraux.

  </Tab>
  <Tab title="Desktop/CUA">
    ```bash
    openclaw mcp set cua-driver '{"command":"cua-driver","args":["mcp"]}'
    openclaw mcp tools cua-driver --include 'list_apps,observe,click,type'
    openclaw mcp doctor cua-driver --probe
    ```

    Les serveurs de contrôle de bureau direct héritent des autorisations du processus qu'ils lancent. Utilisez des filtres d'outils étroits et des invites d'autorisation au niveau du système d'exploitation.

  </Tab>
</Tabs>

### Formes de sortie JSON

Utilisez `--json` pour les scripts et les tableaux de bord. Les ensembles de champs peuvent augmenter au fil du temps, par conséquent, les consommateurs doivent ignorer les clés inconnues.

<AccordionGroup>
  <Accordion title="status --">
    ```json
    {
      "path": "/home/user/.openclaw/openclaw.json",
      "servers": [
        {
          "name": "docs",
          "configured": true,
          "enabled": true,
          "ok": true,
          "transport": "streamable-http",
          "launch": "streamable-http https://mcp.example.com/mcp",
          "auth": "oauth",
          "authStatus": {
            "hasTokens": true,
            "hasClientInformation": true,
            "hasCodeVerifier": false,
            "hasDiscoveryState": true,
            "hasLastAuthorizationUrl": false
          },
          "requestTimeoutMs": 20000,
          "connectionTimeoutMs": 5000,
          "toolFilter": {
            "include": ["search", "read_*"],
            "exclude": []
          },
          "supportsParallelToolCalls": true
        }
      ]
    }
    ```
  </Accordion>
  <Accordion title="doctor --">
    ```json
    {
      "ok": false,
      "path": "/home/user/.openclaw/openclaw.json",
      "servers": [
        {
          "name": "docs",
          "ok": false,
          "issues": [
            {
              "level": "error",
              "message": "OAuth credentials are not authorized; run openclaw mcp login docs"
            }
          ]
        }
      ]
    }
    ```

    `doctor --json` se termine avec un code non nul lorsque n'importe quel serveur activé vérifié présente une erreur. Les avertissements sont signalés mais ne provoquent pas l'échec de la commande par eux-mêmes.

  </Accordion>
  <Accordion title="probe --">
    ```json
    {
      "path": "/home/user/.openclaw/openclaw.json",
      "generatedAt": "2026-05-31T09:00:00.000Z",
      "servers": {
        "docs": {
          "launch": "streamable-http https://mcp.example.com/mcp",
          "tools": 2,
          "resources": true,
          "prompts": false,
          "listChanged": {
            "tools": true,
            "resources": false,
            "prompts": false
          }
        }
      },
      "tools": ["docs__read_page", "docs__search"],
      "diagnostics": []
    }
    ```

    `probe` ouvre une session de client MCP en direct. Utilisez-la pour vérifier l'accessibilité et les capacités, et non pour les audits de configuration statique.

  </Accordion>
</AccordionGroup>

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
**Filtre de sécurité d'environnement Stdio**

OpenClaw rejette les clés d'environnement de démarrage de l'interpréteur qui peuvent modifier la manière dont un serveur MCP stdio démarre avant le premier RPC, même si elles apparaissent dans le bloc `env` d'un serveur. Les clés bloquées incluent `NODE_OPTIONS`, `NODE_REDIRECT_WARNINGS`, `NODE_REPL_EXTERNAL_MODULE`, `NODE_REPL_HISTORY`, `NODE_V8_COVERAGE`, `PYTHONSTARTUP`, `PYTHONPATH`, `PERL5OPT`, `RUBYOPT`, `SHELLOPTS`, `PS4` et des variables similaires de contrôle d'exécution. Le démarrage rejette celles-ci avec une erreur de configuration afin qu'elles ne puissent pas injecter un prélude implicite, échanger l'interpréteur, activer un débogueur ou rediriger la sortie d'exécution vers le processus stdio. Les variables d'environnement ordinaires pour les identifiants, les proxies et celles spécifiques au serveur (`GITHUB_TOKEN`, `HTTP_PROXY`, `*_API_KEY` personnalisées, etc.) ne sont pas affectées.

Si votre serveur MCP a vraiment besoin de l'une des variables bloquées, définissez-la sur le processus hôte de la passerelle plutôt que sous le `env` du serveur stdio.

</Warning>

### Transport SSE / HTTP

Se connecte à un serveur MCP distant via HTTP Server-Sent Events.

| Champ                          | Description                                                                                    |
| ------------------------------ | ---------------------------------------------------------------------------------------------- |
| `url`                          | URL HTTP ou HTTPS du serveur distant (requis)                                                  |
| `headers`                      | Carte clé-valeur facultative d'en-têtes HTTP (par exemple, jetons d'authentification)          |
| `connectionTimeoutMs`          | Délai de connexion par serveur en ms (facultatif)                                              |
| `connectTimeout`               | Délai de connexion par serveur en secondes (facultatif)                                        |
| `timeout` / `requestTimeoutMs` | Délai de requête MCP par serveur en secondes ou ms                                             |
| `auth: "oauth"`                | Utiliser le stockage de jetons MCP OAuth et `openclaw mcp login`                               |
| `sslVerify`                    | Définir à false uniquement pour les points de terminaison HTTPS privés explicitement approuvés |
| `clientCert` / `clientKey`     | Chemins du certificat client et de la clé mTLS                                                 |
| `supportsParallelToolCalls`    | Indication que les appels simultanés sont sécurisés pour ce serveur                            |

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

Les valeurs sensibles dans `url` (userinfo) et `headers` sont masquées dans les journaux et la sortie d'état. `openclaw mcp doctor` avertit lorsque des entrées `headers` ou `env` semblant sensibles contiennent des valeurs littérales, afin que les opérateurs puissent déplacer ces valeurs hors de la configuration validée.

### Flux de travail OAuth

OAuth est destiné aux serveurs MCP HTTP qui annoncent le flux MCP OAuth. Les en-têtes `Authorization` statiques sont ignorés pour un serveur tant que `auth: "oauth"` est activé.

<Steps>
  <Step title="Save the server">
    Ajoutez ou mettez à jour le serveur avec `auth: "oauth"` et toutes les métadonnées OAuth facultatives.

    ```bash
    openclaw mcp set docs '{"url":"https://mcp.example.com/mcp","transport":"streamable-http","auth":"oauth","oauth":{"scope":"docs.read"}}'
    ```

  </Step>
  <Step title="Start login">
    Exécutez login pour créer la demande d'autorisation.

    ```bash
    openclaw mcp login docs
    ```

    OpenClaw imprime l'URL d'autorisation et stocke l'état du vérificateur OAuth temporaire sous le répertoire d'état OpenClaw.

  </Step>
  <Step title="Finish with the code">
    Après avoir approuvé dans le navigateur, renvoyez le code à OpenClaw.

    ```bash
    openclaw mcp login docs --code abc123
    ```

  </Step>
  <Step title="Vérifier l'autorisation">
    Utilisez status ou doctor pour confirmer que les jetons sont présents.

    ```bash
    openclaw mcp status --verbose
    openclaw mcp doctor docs --probe
    ```

  </Step>
  <Step title="Effacer les informations d'identification">
    Logout supprime les informations d'identification OAuth stockées mais conserve la définition de serveur enregistrée.

    ```bash
    openclaw mcp logout docs
    ```

  </Step>
</Steps>

Si le provider fait tourner les jetons ou si l'état d'autorisation reste bloqué, exécutez `openclaw mcp logout <name>`, puis répétez `login`. `logout` peut effacer les informations d'identification pour un serveur HTTP enregistré même après que `auth: "oauth"` a été supprimé de la configuration, tant que le nom du serveur et l'URL identifient toujours l'entrée du magasin d'informations d'identification.

### Transport HTTP diffusable

`streamable-http` est une option de transport supplémentaire à côté de `sse` et `stdio`. Il utilise le flux HTTP pour la communication bidirectionnelle avec les serveurs MCP distants.

| Champ                          | Description                                                                                                   |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `url`                          | URL HTTP ou HTTPS du serveur distant (requis)                                                                 |
| `transport`                    | Définissez sur `"streamable-http"` pour sélectionner ce transport ; en cas d'omission, OpenClaw utilise `sse` |
| `headers`                      | Carte clé-valeur facultative d'en-têtes HTTP (par exemple, des jetons d'auth)                                 |
| `connectionTimeoutMs`          | Délai de connexion par serveur en ms (facultatif)                                                             |
| `connectTimeout`               | Délai de connexion par serveur en secondes (facultatif)                                                       |
| `timeout` / `requestTimeoutMs` | Délai d'attente de requête MCP par serveur en secondes ou ms                                                  |
| `auth: "oauth"`                | Utiliser le stockage de jetons MCP OAuth et `openclaw mcp login`                                              |
| `sslVerify`                    | Définissez sur false uniquement pour les points de terminaison HTTPS privés explicitement fiables             |
| `clientCert` / `clientKey`     | Chemins du certificat client et de la clé mTLS                                                                |
| `supportsParallelToolCalls`    | Indication que les appels simultanés sont sûrs pour ce serveur                                                |

La configuration OpenClaw utilise `transport: "streamable-http"` comme orthographe canonique. Les valeurs MCP natives CLI`type: "http"` sont acceptées lors de l'enregistrement via `openclaw mcp set` et réparées par `openclaw doctor --fix` dans la configuration existante, mais `transport` est ce que OpenClaw intégré consomme directement.

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

<Note>Les commandes de registre ne démarrent pas le pont de canal. Seuls `probe` et `doctor --probe` ouvrent une session cliente MCP en direct pour prouver que le serveur cible est accessible.</Note>

## Interface de contrôle

L'interface de contrôle du navigateur comprend une page de paramètres MCP dédiée à `/mcp`. Elle affiche les comptes de serveurs configurés, les résumés activés/OAuth/filtres, les lignes de transport par serveur, les contrôles d'activation/désactivation, les commandes CLI courantes et un éditeur délimité pour la section de configuration `mcp`.

Utilisez la page pour les modifications de l'opérateur et l'inventaire rapide. Utilisez `openclaw mcp doctor --probe` ou `openclaw mcp probe` lorsque vous avez besoin d'une preuve en direct du serveur.

Flux de travail de l'opérateur :

1. Ouvrez l'interface de contrôle et choisissez **MCP**.
2. Examinez les cartes de résumé pour le total, les serveurs activés, OAuth et filtrés.
3. Utilisez chaque ligne de serveur pour le transport, l'authentification, le filtre, le délai d'attente et les indices de commande.
4. Basculez l'activation lorsque vous souhaitez conserver une définition mais l'exclure de la découverte lors de l'exécution.
5. Modifiez la section de configuration `mcp` délimitée pour les modifications structurelles telles que les nouveaux serveurs, les en-têtes, TLS, les métadonnées OAuth ou les filtres d'outils.
6. Choisissez **Save** pour enregistrer uniquement la configuration, ou **Save & Publish** pour appliquer via le chemin de configuration du Gateway.
7. Exécutez `openclaw mcp doctor --probe` lorsque vous avez besoin d'une preuve en direct que le serveur modifié démarre et répertorie les outils.

Notes :

- les extraits de commandes citent les noms de serveur pour que les noms inhabituels restent copiables dans un shell
- les valeurs de type URL affichées sont expurgées avant le rendu lorsqu'elles contiennent des identifiants intégrés
- la page ne démarre pas les transports MCP par elle-même
- les runtimes actifs peuvent nécessiter `openclaw mcp reload`, la publication de la configuration Gateway ou un redémarrage du processus, selon le processus qui possède les clients MCP

## Limites actuelles

Cette page documente le pont tel qu'il est fourni aujourd'hui.

Limites actuelles :

- la découverte de conversations dépend des métadonnées de route de session Gateway existantes
- pas de protocole de push générique au-delà de l'adaptateur spécifique à Claude
- pas encore d'outils d'édition ou de réaction aux messages
- le transport HTTP/SSE/streamable-http se connecte à un seul serveur distant ; pas encore de multiplexage en amont
- `permissions_list_open` n'inclut que les approbations observées pendant que le pont est connecté

## Connexes

- [Référence CLI](/fr/cli)
- [Plugins](/fr/cli/plugins)
